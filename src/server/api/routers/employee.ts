import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { normalizeTagId } from "~/server/services/tag-normalizer";

const createEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
});

const updateEmployeeSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const employeeRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db.employee.findMany({
      orderBy: { name: "asc" },
      include: {
        tags: true,
        attendance: true,
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const employee = await ctx.db.employee.findUnique({
        where: { id: input.id },
        include: { tags: true, attendance: true },
      });
      if (!employee) throw new TRPCError({ code: "NOT_FOUND" });
      return employee;
    }),

  create: adminProcedure
    .input(createEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.employee.create({
        data: {
          name: input.name,
          email: input.email ?? null,
          // Automatically create an OUT attendance state for new employees.
          attendance: { create: { status: "OUT" } },
        },
        include: { attendance: true },
      });
    }),

  update: adminProcedure
    .input(updateEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.employee.update({
        where: { id },
        data,
        include: { tags: true, attendance: true },
      });
    }),

  // Assign an existing (or newly created) tag to an employee.
  // If the tag doesn't exist yet, it will be created.
  assignTag: adminProcedure
    .input(
      z.object({
        employeeId: z.string().cuid(),
        tagId: z.string().min(1),
        label: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalised = normalizeTagId(input.tagId);

      await ctx.db.employee.findUniqueOrThrow({ where: { id: input.employeeId } });

      return ctx.db.tag.upsert({
        where: { tagId: normalised },
        update: {
          employeeId: input.employeeId,
          label: input.label ?? undefined,
          isActive: true,
        },
        create: {
          tagId: normalised,
          employeeId: input.employeeId,
          label: input.label ?? null,
          isActive: true,
        },
      });
    }),

  removeTag: adminProcedure
    .input(z.object({ tagId: z.string().cuid() }))
    .mutation(({ ctx, input }) => {
      // Unassign the tag (set employeeId null) rather than deleting —
      // scan history references the tag row.
      return ctx.db.tag.update({
        where: { id: input.tagId },
        data: { employeeId: null },
      });
    }),
});
