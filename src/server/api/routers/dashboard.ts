import { createTRPCRouter, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { performAttendanceReset, getLastResetTime } from "~/server/services/attendance-reset";

export const dashboardRouter = createTRPCRouter({
  // Current presence: employees marked IN, with their last scan info.
  currentPresence: publicProcedure.query(async ({ ctx }) => {
    const lastReset = getLastResetTime();
    const present = await ctx.db.attendanceState.findMany({
      where: { status: "IN", statusChangedAt: { gte: lastReset } },
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
    const lastReset = getLastResetTime();
    const [totalEmployees, presentCount, todayScans, unknownScans] =
      await Promise.all([
        ctx.db.employee.count({ where: { isActive: true } }),
        ctx.db.attendanceState.count({
          where: { status: "IN", statusChangedAt: { gte: lastReset } },
        }),
        ctx.db.scanEvent.count({
          where: {
            scannedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        ctx.db.scanEvent.count({ where: { outcome: "UNKNOWN_TAG" } }),
      ]);

    return { totalEmployees, presentCount, todayScans, unknownScans };
  }),

  // Manually trigger the nightly attendance reset (admin only).
  triggerReset: adminProcedure.mutation(async () => {
    return performAttendanceReset();
  }),
});
