import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TRPCContext } from "./context";
import type { Session } from "next-auth";

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

// Public — no auth required.
export const publicProcedure = t.procedure;

// Requires any valid signed-in session.
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
  }
  return next({
    ctx: { ...ctx, session: ctx.session as Session & { user: NonNullable<Session["user"]> } },
  });
});

// Requires ADMIN role.
export const adminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});

// Requires any signed-in user and injects their employeeId into context.
export const employeeProcedure = authedProcedure.use(({ ctx, next }) => {
  return next({
    ctx: { ...ctx, currentEmployeeId: ctx.session.user.employeeId },
  });
});
