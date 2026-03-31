/**
 * REST scan ingestion endpoint — POST /api/scan
 *
 * This is the primary endpoint for Raspberry Pi clients.
 * It is intentionally a plain REST endpoint (not tRPC) because:
 *   - Pi clients are simple Node scripts, not browser apps
 *   - REST is easier to call from curl, scripts, and non-JS environments
 *   - No dependency on tRPC client library in the Pi package
 *
 * Authentication:
 *   Authorization: Bearer <device_api_key>
 *
 * Request body:
 *   {
 *     "tagId": "TAG_ALEXIS_001",
 *     "deviceId": "front_door_1",
 *     "scannedAt": "2024-01-01T09:00:00Z",   // optional
 *     "rawPayload": null                       // optional
 *   }
 *
 * Response:
 *   200: { outcome, scanEventId, employeeName?, message }
 *   400: { error: "..." }
 *   401: { error: "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice, extractBearerToken } from "~/server/services/device-auth";
import { ingestScan } from "~/server/services/scan-ingestion";
import { ScanOutcome } from "@prisma/client";

const scanBodySchema = z.object({
  tagId: z.string().min(1).max(256),
  deviceId: z.string().min(1).max(64),
  scannedAt: z.string().datetime().optional(),
  rawPayload: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization header." },
      { status: 401 },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = scanBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { tagId, deviceId, scannedAt, rawPayload } = parsed.data;

  // ── Authenticate device ───────────────────────────────────────────────────
  const authResult = await authenticateDevice(deviceId, token);
  if (!authResult.ok) {
    // Record the DEVICE_UNAUTHORISED outcome via a minimal path.
    // We cannot call ingestScan here because the device is not trusted,
    // but we log the attempt to stderr for ops visibility.
    console.warn(
      `[scan] Unauthorised scan attempt — device: ${deviceId}, tag: ${tagId}, reason: ${authResult.error}`,
    );
    return NextResponse.json({ error: authResult.error }, { status: 401 });
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
  return NextResponse.json(result, { status });
}
