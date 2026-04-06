import { createTRPCRouter } from "./init";
import { employeeRouter } from "../routers/employee";
import { tagRouter } from "../routers/tag";
import { deviceRouter } from "../routers/device";
import { scanRouter } from "../routers/scan";
import { dashboardRouter } from "../routers/dashboard";
import { passesRouter } from "../routers/passes";
import { userRouter } from "../routers/user";
import { reportRouter } from "../routers/report";

export const appRouter = createTRPCRouter({
  employee: employeeRouter,
  tag: tagRouter,
  device: deviceRouter,
  scan: scanRouter,
  dashboard: dashboardRouter,
  passes: passesRouter,
  user: userRouter,
  report: reportRouter,
});

export type AppRouter = typeof appRouter;
