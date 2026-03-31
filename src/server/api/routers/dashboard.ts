import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  // Current presence: employees marked IN, with their last scan info.
  currentPresence: publicProcedure.query(async ({ ctx }) => {
    const present = await ctx.db.attendanceState.findMany({
      where: { status: "IN" },
      include: {
        employee: {
          select: { id: true, name: true, email: true, isActive: true },
        },
      },
      orderBy: { statusChangedAt: "desc" },
    });
    return present;
  }),

  // High-level stats for the dashboard header.
  stats: publicProcedure.query(async ({ ctx }) => {
    const [totalEmployees, presentCount, todayScans, unknownScans] =
      await Promise.all([
        ctx.db.employee.count({ where: { isActive: true } }),
        ctx.db.attendanceState.count({ where: { status: "IN" } }),
        ctx.db.scanEvent.count({
          where: {
            scannedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        ctx.db.scanEvent.count({ where: { outcome: "UNKNOWN_TAG" } }),
      ]);

    return { totalEmployees, presentCount, todayScans, unknownScans };
  }),
});
