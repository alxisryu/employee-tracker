/**
 * REST scan ingestion handler — POST /api/scan
 *
 * Primary endpoint for kiosk and Pi clients.
 * Authentication: Authorization: Bearer <device_api_key>
 *
 * Request body:
 *   { tagId, deviceId, scannedAt?, rawPayload? }
 *
 * Response:
 *   200: { outcome, scanEventId, employeeName?, message }
 *   400: { error }
 *   401: { error }
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { ScanOutcome } from "@employee-tracker/db";
import { authenticateDevice, extractBearerToken } from "../services/device-auth";
import { ingestScan } from "../services/scan-ingestion";

const scanBodySchema = z.object({
  tagId: z.string().min(1).max(256),
  deviceId: z.string().min(1).max(64),
  scannedAt: z.string().datetime().optional(),
  rawPayload: z.string().optional().nullable(),
});

export async function handleScan(req: Request, res: Response): Promise<void> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: "Missing Authorization header." });
    return;
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const parsed = scanBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", details: parsed.error.flatten() });
    return;
  }

  const { tagId, deviceId, scannedAt, rawPayload } = parsed.data;

  // ── Authenticate device ───────────────────────────────────────────────────
  const authResult = await authenticateDevice(deviceId, token);
  if (!authResult.ok) {
    console.warn(
      `[scan] Unauthorised scan attempt — device: ${deviceId}, tag: ${tagId}, reason: ${authResult.error}`,
    );
    res.status(401).json({ error: authResult.error });
    return;
  }

  // ── Ingest ────────────────────────────────────────────────────────────────
  const result = await ingestScan({
    tagId,
    deviceId,
    scannedAt,
    rawPayload,
    device: authResult.device,
  });

  const status = result.outcome === ScanOutcome.DEVICE_UNAUTHORISED ? 401 : 200;
  res.status(status).json(result);
}
