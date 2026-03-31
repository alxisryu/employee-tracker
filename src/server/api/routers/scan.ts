import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { ingestScan } from "~/server/services/scan-ingestion";
import { env } from "~/env/server";
import { TRPCError } from "@trpc/server";

// Shared input schema — mirrors the REST /api/scan body.
// The Pi client and the web UI simulator both use this shape.
export const scanInputSchema = z.object({
  tagId: z.string().min(1).max(256),
  deviceId: z.string().min(1).max(64),
  scannedAt: z.string().datetime().optional(),
  rawPayload: z.string().optional().nullable(),
});

export const scanRouter = createTRPCRouter({
  // Used by the web UI simulator. The UI authenticates via the
  // INTERNAL_API_SECRET sent as a custom header, validated below.
  ingestManual: adminProcedure
    .input(scanInputSchema)
    .mutation(async ({ ctx, input }) => {
      // For manual UI scans, look up and pass the manual_ui device.
      // The deviceId from the input is used to select which device to record.
      const result = await ingestScan({
        tagId: input.tagId,
        deviceId: input.deviceId,
        scannedAt: input.scannedAt,
        rawPayload: input.rawPayload,
      });
      return result;
    }),

  // Recent scan events for the dashboard.
  recent: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(({ ctx, input }) => {
      return ctx.db.scanEvent.findMany({
        take: input.limit,
        orderBy: { scannedAt: "desc" },
        include: {
          employee: { select: { id: true, name: true } },
          device: { select: { id: true, name: true, type: true } },
        },
      });
    }),

  // Delete all scan events recorded via the MANUAL_UI device (simulator).
  clearManual: adminProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.db.scanEvent.deleteMany({
      where: { device: { type: "MANUAL_UI" } },
    });
    return { deleted: result.count };
  }),

  // Unknown tag summary — unique unassigned tagIds with counts.
  unknownTags: publicProcedure.query(async ({ ctx }) => {
    // Group by tagId, count occurrences, return first/last seen.
    const rows = await ctx.db.scanEvent.groupBy({
      by: ["tagId"],
      where: { outcome: "UNKNOWN_TAG" },
      _count: { tagId: true },
      _min: { scannedAt: true },
      _max: { scannedAt: true },
    });

    return rows.map((r) => ({
      tagId: r.tagId,
      count: r._count.tagId,
      firstSeen: r._min.scannedAt,
      lastSeen: r._max.scannedAt,
    }));
  }),
});
