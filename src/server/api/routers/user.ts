import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ),

  setRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["ADMIN", "EMPLOYEE"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id && input.role === "EMPLOYEE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot remove your own admin role.",
        });
      }
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: { id: true, name: true, role: true },
      });
    }),
});
