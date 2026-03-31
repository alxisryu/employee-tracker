/**
 * tRPC server initialisation.
 *
 * Defines:
 *   - createTRPCContext  — builds the context for each request
 *   - publicProcedure   — open procedure (no auth required)
 *   - adminProcedure    — requires ADMIN_SECRET header (simple MVP auth)
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { env } from "~/env/server";

export async function createTRPCContext(opts: { req: NextRequest }) {
  return {
    db,
    req: opts.req,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// For the MVP, admin auth is a simple shared secret in the X-Admin-Secret
// header. This is intentionally low-friction — swap in NextAuth or similar
// for production.
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  const secret = ctx.req.headers.get("x-admin-secret");
  if (secret !== env.ADMIN_SECRET) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid admin secret." });
  }
  return next({ ctx });
});
