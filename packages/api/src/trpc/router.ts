import { createTRPCRouter } from "./init";
import { employeeRouter } from "../routers/employee";
import { tagRouter } from "../routers/tag";
import { deviceRouter } from "../routers/device";
import { scanRouter } from "../routers/scan";
import { dashboardRouter } from "../routers/dashboard";
import { passesRouter } from "../routers/passes";

export const appRouter = createTRPCRouter({
  employee: employeeRouter,
  tag: tagRouter,
  device: deviceRouter,
  scan: scanRouter,
  dashboard: dashboardRouter,
  passes: passesRouter,
});

export type AppRouter = typeof appRouter;
