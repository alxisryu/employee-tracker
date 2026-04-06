import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { Role } from "@employee-tracker/db";
import { db } from "@employee-tracker/db";
import { env } from "~/env";

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
  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  ],

  callbacks: {
    // Block non-company (and non-test) accounts before they hit the app.
    // Also allow any email that has been pre-registered as an active Employee.
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        if (!profile?.email) return false;
        if (isEmailAllowed(profile.email)) return true;
        const employee = await db.employee.findUnique({
          where: { email: profile.email },
          select: { isActive: true },
        });
        return employee?.isActive === true;
      }
      return false;
    },

    async jwt({ token, user }) {
      if (user) {
        const dbUser = user as unknown as { id: string; role: Role; employeeId: string | null };
        const adminEmails = env.ADMIN_EMAILS.split(",").map((e) => e.trim()).filter(Boolean);
        const role: Role = adminEmails.includes(user.email ?? "") ? "ADMIN" : dbUser.role;

        if (dbUser.role !== role) {
          await db.user.update({ where: { id: dbUser.id }, data: { role } });
        }

        token.id = dbUser.id;
        token.role = role;
        token.employeeId = dbUser.employeeId ?? null;
      }
      return token;
    },

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
