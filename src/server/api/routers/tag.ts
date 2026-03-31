import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { normalizeTagId } from "~/server/services/tag-normalizer";

export const tagRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db.tag.findMany({
      orderBy: { createdAt: "desc" },
      include: { employee: true },
    });
  }),

  // Unassigned tags — useful for the "assign unknown tag" workflow.
  listUnassigned: publicProcedure.query(({ ctx }) => {
    return ctx.db.tag.findMany({
      where: { employeeId: null },
      orderBy: { createdAt: "desc" },
    });
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        label: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
        employeeId: z.string().cuid().optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.tag.update({ where: { id }, data });
    }),

  // Quick-assign an unknown tag to an employee (from the unknown scans view).
  assignToEmployee: adminProcedure
    .input(
      z.object({
        tagId: z.string().min(1),  // can be the raw tagId string
        employeeId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalised = normalizeTagId(input.tagId);
      return ctx.db.tag.upsert({
        where: { tagId: normalised },
        update: { employeeId: input.employeeId, isActive: true },
        create: {
          tagId: normalised,
          employeeId: input.employeeId,
          isActive: true,
        },
        include: { employee: true },
      });
    }),
});
