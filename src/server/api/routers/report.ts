import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";

export const reportRouter = createTRPCRouter({
  /**
   * Attendance report for SOC2 compliance.
   * Returns per-employee, per-day summaries (first sign-in, last sign-out,
   * total accepted scans) within the requested date range.
   */
  attendanceReport: adminProcedure
    .input(
      z.object({
        from: z.date(),
        to: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Include the full `to` day.
      const toEndOfDay = new Date(input.to);
      toEndOfDay.setHours(23, 59, 59, 999);

      const events = await ctx.db.scanEvent.findMany({
        where: {
          scannedAt: { gte: input.from, lte: toEndOfDay },
          outcome: { in: ["ACCEPTED_IN", "ACCEPTED_OUT"] },
          employeeId: { not: null },
        },
        orderBy: { scannedAt: "asc" },
        include: {
          employee: { select: { id: true, name: true, email: true } },
          device: { select: { name: true } },
        },
      });

      // Aggregate per employee → per day.
      type DayRecord = {
        date: string; // YYYY-MM-DD
        firstIn: Date | null;
        lastOut: Date | null;
        totalScans: number;
      };

      type EmployeeRow = {
        employeeId: string;
        name: string;
        email: string | null;
        days: DayRecord[];
        totalScans: number;
      };

      const byEmployee = new Map<string, EmployeeRow>();

      for (const event of events) {
        if (!event.employee) continue;

        const { id: empId, name, email } = event.employee;

        if (!byEmployee.has(empId)) {
          byEmployee.set(empId, {
            employeeId: empId,
            name,
            email,
            days: [],
            totalScans: 0,
          });
        }

        const emp = byEmployee.get(empId)!;
        emp.totalScans++;

        // Use UTC date key so the report isn't affected by server timezone.
        const dateKey = event.scannedAt.toISOString().slice(0, 10);
        let day = emp.days.find((d) => d.date === dateKey);
        if (!day) {
          day = { date: dateKey, firstIn: null, lastOut: null, totalScans: 0 };
          emp.days.push(day);
        }

        day.totalScans++;

        if (event.outcome === "ACCEPTED_IN") {
          if (!day.firstIn || event.scannedAt < day.firstIn) {
            day.firstIn = event.scannedAt;
          }
        } else {
          if (!day.lastOut || event.scannedAt > day.lastOut) {
            day.lastOut = event.scannedAt;
          }
        }
      }

      return {
        employees: Array.from(byEmployee.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
        totalEvents: events.length,
        generatedAt: new Date(),
      };
    }),
});
