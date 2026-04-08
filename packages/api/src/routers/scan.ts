import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../trpc/init";
import { ingestScan } from "../services/scan-ingestion";

export const scanInputSchema = z.object({
  tagId: z.string().min(1).max(256),
  deviceId: z.string().min(1).max(64),
  scannedAt: z.string().datetime().optional(),
  rawPayload: z.string().optional().nullable(),
});

export const scanRouter = createTRPCRouter({
  // Used by the web UI simulator (admin only).
  ingestManual: adminProcedure
    .input(scanInputSchema)
    .mutation(async ({ input }) => {
      return ingestScan({
        tagId: input.tagId,
        deviceId: input.deviceId,
        scannedAt: input.scannedAt,
        rawPayload: input.rawPayload,
      });
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
    const rows = await ctx.db.scanEvent.groupBy({
      by: ["tagId"],
      where: { outcome: "UNKNOWN_TAG" },
      _count: { tagId: true },
      _min: { scannedAt: true },
      _max: { scannedAt: true },
    });

    return rows.map((r: { tagId: any; _count: { tagId: any; }; _min: { scannedAt: any; }; _max: { scannedAt: any; }; }) => ({
      tagId: r.tagId,
      count: r._count.tagId,
      firstSeen: r._min.scannedAt,
      lastSeen: r._max.scannedAt,
    }));
  }),
});
