import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { DeviceType } from "@prisma/client";

export const deviceRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db.device.findMany({
      orderBy: { name: "asc" },
      // Never expose apiKeyHash to the client.
      select: {
        id: true,
        name: true,
        location: true,
        type: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { scanEvents: true } },
      },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/, {
          message: "Device name must be lowercase alphanumeric, underscores, or hyphens.",
        }),
        location: z.string().optional().nullable(),
        type: z.nativeEnum(DeviceType),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.device.create({
        data: {
          name: input.name,
          location: input.location ?? null,
          type: input.type,
        },
        select: {
          id: true,
          name: true,
          location: true,
          type: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.string().cuid(), isActive: z.boolean() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.device.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
        select: { id: true, name: true, isActive: true },
      });
    }),
});
