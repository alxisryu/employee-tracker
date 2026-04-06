import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { DeviceType } from "@employee-tracker/db";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../trpc/init";

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
    .mutation(async ({ ctx, input }) => {
      // KIOSK (and PI_READER / MOCK) devices use a per-device API key.
      // Generate a plain key, hash it for storage, and return it once.
      const needsApiKey =
        input.type === DeviceType.IPAD_KIOSK ||
        input.type === DeviceType.PI_READER ||
        input.type === DeviceType.MOCK;

      let plainApiKey: string | null = null;
      let apiKeyHash: string | null = null;

      if (needsApiKey) {
        plainApiKey = crypto.randomUUID();
        apiKeyHash = await bcrypt.hash(plainApiKey, 10);
      }

      const device = await ctx.db.device.create({
        data: {
          name: input.name,
          location: input.location ?? null,
          type: input.type,
          apiKeyHash,
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

      return { ...device, apiKey: plainApiKey };
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

  rotateApiKey: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const device = await ctx.db.device.findUnique({ where: { id: input.id } });
      if (!device) throw new TRPCError({ code: "NOT_FOUND" });
      if (device.type === DeviceType.MANUAL_UI) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MANUAL_UI devices use the shared INTERNAL_API_SECRET, not a per-device key.",
        });
      }

      const plainApiKey = crypto.randomUUID();
      const apiKeyHash = await bcrypt.hash(plainApiKey, 10);

      await ctx.db.device.update({ where: { id: input.id }, data: { apiKeyHash } });

      return { id: device.id, name: device.name, apiKey: plainApiKey };
    }),
});
