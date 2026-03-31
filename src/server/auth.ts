import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { Role } from "@prisma/client";
import { db } from "~/server/db";
import { env } from "~/env/server";

const ALLOWED_DOMAIN = "lyratechnologies.com.au";

function isEmailAllowed(email: string): boolean {
  if (email.endsWith(`@${ALLOWED_DOMAIN}`)) return true;
  if (env.NODE_ENV !== "production" && env.TEST_EMAILS) {
    const testList = env.TEST_EMAILS.split(",").map((e) => e.trim()).filter(Boolean);
    if (testList.includes(email)) return true;
  }
  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,

  // JWT strategy is required when using Next.js middleware.
  // The Edge runtime (where middleware runs) cannot connect to Prisma/PostgreSQL,
  // so database sessions would always appear unauthenticated in the middleware.
  // With JWT, the session is a signed cookie that Edge can verify without a DB call.
  // The Prisma adapter still persists User + Account rows — only the Session table
  // is unused under this strategy.
  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  ],

  callbacks: {
    // Block non-company (and non-test) accounts before they hit the app.
    signIn({ account, profile }) {
      if (account?.provider === "google") {
        return !!profile?.email && isEmailAllowed(profile.email);
      }
      return false;
    },

    // Populate the JWT with our custom fields on every sign-in.
    // `user` is only present when the user actually signs in (not on every request).
    // ADMIN_EMAILS is treated as authoritative here — if an email is listed, the
    // token always gets ADMIN regardless of what's in the DB. This means changes
    // to ADMIN_EMAILS take effect on the user's next sign-in without a DB migration.
    async jwt({ token, user }) {
      if (user) {
        const dbUser = user as unknown as { id: string; role: Role; employeeId: string | null };
        const adminEmails = env.ADMIN_EMAILS.split(",").map((e) => e.trim()).filter(Boolean);
        const role: Role = adminEmails.includes(user.email ?? "") ? "ADMIN" : dbUser.role;

        // Keep the DB in sync so queries against the User table reflect reality.
        if (dbUser.role !== role) {
          await db.user.update({ where: { id: dbUser.id }, data: { role } });
        }

        token.id = dbUser.id;
        token.role = role;
        token.employeeId = dbUser.employeeId ?? null;
      }
      return token;
    },

    // Expose the JWT fields to the client-side session object.
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as Role,
          employeeId: (token.employeeId as string | null) ?? null,
        },
      };
    },
  },

  events: {
    // Fires once when a brand-new User row is created (first sign-in).
    // Links the user to an existing Employee or creates one from their Google profile.
    async createUser({ user }) {
      if (!user.email || !user.id) return;

      const adminEmails = env.ADMIN_EMAILS.split(",").map((e) => e.trim()).filter(Boolean);
      const isAdmin = adminEmails.includes(user.email);

      const existingEmployee = await db.employee.findUnique({
        where: { email: user.email },
      });

      if (existingEmployee) {
        await db.user.update({
          where: { id: user.id },
          data: { employeeId: existingEmployee.id, role: isAdmin ? "ADMIN" : "EMPLOYEE" },
        });
      } else {
        const employee = await db.employee.create({
          data: {
            name: user.name ?? user.email.split("@")[0]!,
            email: user.email,
            isActive: true,
            attendance: { create: { status: "OUT" } },
          },
        });
        await db.user.update({
          where: { id: user.id },
          data: { employeeId: employee.id, role: isAdmin ? "ADMIN" : "EMPLOYEE" },
        });
      }
    },
  },
});
