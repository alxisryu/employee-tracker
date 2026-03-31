import { createTRPCRouter } from "~/server/api/trpc";
import { employeeRouter } from "~/server/api/routers/employee";
import { tagRouter } from "~/server/api/routers/tag";
import { deviceRouter } from "~/server/api/routers/device";
import { scanRouter } from "~/server/api/routers/scan";
import { dashboardRouter } from "~/server/api/routers/dashboard";

export const appRouter = createTRPCRouter({
  employee: employeeRouter,
  tag: tagRouter,
  device: deviceRouter,
  scan: scanRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
