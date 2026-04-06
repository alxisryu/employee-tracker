import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router";
import { createTRPCContext } from "./trpc/context";
import { handleScan } from "./rest/scan";
import { performAttendanceReset } from "./services/attendance-reset";
import { env } from "./env";

export function createApp() {
  const app = express();

  // ── Middleware ─────────────────────────────────────────────────────────────
  const allowedOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(express.json());

  // ── Health check ───────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // ── REST: Device scan endpoint ─────────────────────────────────────────────
  app.post("/api/scan", (req, res, next) => {
    handleScan(req, res).catch(next);
  });

  // ── REST: Cron — nightly attendance reset ──────────────────────────────────
  app.get("/api/cron/reset-attendance", async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (token !== env.CRON_SECRET) {
        res.status(401).json({ error: "Unauthorised." });
        return;
      }
      const result = await performAttendanceReset();
      res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // ── REST: Admin audit export (CSV) ─────────────────────────────────────────
  app.get("/api/admin/audit-export", async (req, res, next) => {
    try {
      // Verify admin session via tRPC context helper.
      const ctx = await createTRPCContext({ req });
      if (!ctx.session?.user) {
        res.status(401).json({ error: "Sign in required." });
        return;
      }
      if (ctx.session.user.role !== "ADMIN") {
        res.status(403).json({ error: "Admin access required." });
        return;
      }

      const events = await ctx.db.scanEvent.findMany({
        orderBy: { scannedAt: "desc" },
        include: {
          employee: { select: { name: true, email: true } },
          device: { select: { name: true } },
        },
      });

      const header = "scannedAt,employee,email,device,tagId,outcome\n";
      const rows = events
        .map((e) =>
          [
            e.scannedAt.toISOString(),
            e.employee?.name ?? "",
            e.employee?.email ?? "",
            e.device?.name ?? "",
            e.tagId,
            e.outcome,
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(header + rows);
    } catch (err) {
      next(err);
    }
  });

  // ── tRPC ───────────────────────────────────────────────────────────────────
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req }) => createTRPCContext({ req }),
    }),
  );

  // ── Error handler ──────────────────────────────────────────────────────────
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("[api]", err);
      res.status(500).json({ error: "Internal server error." });
    },
  );

  return app;
}
