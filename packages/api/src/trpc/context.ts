import type { Request } from "express";
import { db } from "@employee-tracker/db";
import type { Session } from "next-auth";
import { decode } from "next-auth/jwt";
import { env } from "../env";

export interface TRPCContext {
  db: typeof db;
  session: Session | null;
  req: Request;
}

export async function createTRPCContext({ req }: { req: Request }): Promise<TRPCContext> {
  // NextAuth v5 cookie name differs between HTTP and HTTPS environments.
  const cookieToken =
    req.cookies?.["authjs.session-token"] ??
    req.cookies?.["__Secure-authjs.session-token"] ??
    null;

  // Also accept a raw JWT via Authorization: Bearer <token> for server-to-server calls.
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : null;

  const rawToken = cookieToken ?? bearerToken ?? null;

  let session: Session | null = null;
  if (rawToken) {
    try {
      // `decode` verifies the NextAuth JWT (JWE-encrypted with AUTH_SECRET).
      const decoded = await decode({ token: rawToken, secret: env.AUTH_SECRET });
      if (decoded) {
        session = {
          user: {
            id: decoded.id as string,
            name: (decoded.name as string) ?? null,
            email: (decoded.email as string) ?? null,
            image: (decoded.picture as string | null) ?? null,
            role: decoded.role as "ADMIN" | "EMPLOYEE",
            employeeId: (decoded.employeeId as string | null) ?? null,
          },
          expires: new Date((decoded.exp ?? 0) * 1000).toISOString(),
        } as Session;
      }
    } catch {
      // Invalid or expired token — treat as unauthenticated.
    }
  }

  return { db, session, req };
}
