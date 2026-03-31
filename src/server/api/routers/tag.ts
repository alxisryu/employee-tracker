import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure, employeeProcedure } from "~/server/api/trpc";
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

  // An employee claims a physical tag as their own.
  // They enter the tag ID (e.g. from the back of their fob) or scan it
  // via the simulator, then submit here. No admin needed.
  claimTag: employeeProcedure
    .input(
      z.object({
        tagId: z.string().min(1),
        label: z.string().max(64).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentEmployeeId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No employee profile linked to your account.",
        });
      }

      const normalised = normalizeTagId(input.tagId);

      // Prevent claiming a tag that already belongs to someone else.
      const existing = await ctx.db.tag.findUnique({ where: { tagId: normalised } });
      if (existing?.employeeId && existing.employeeId !== ctx.currentEmployeeId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That tag is already registered to another employee.",
        });
      }

      return ctx.db.tag.upsert({
        where: { tagId: normalised },
        update: {
          employeeId: ctx.currentEmployeeId,
          label: input.label ?? undefined,
          isActive: true,
        },
        create: {
          tagId: normalised,
          employeeId: ctx.currentEmployeeId,
          label: input.label ?? null,
          isActive: true,
        },
        include: { employee: true },
      });
    }),
});
