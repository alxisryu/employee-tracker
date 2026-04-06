/**
 * REST scan endpoint for iPad kiosk — POST /api/scan-employee
 *
 * Accepts an employee identifier (CUID or email) instead of an NFC tag ID.
 * Used by the iPad kiosk app for QR code and manual sign-in flows.
 *
 * Authentication:
 *   Authorization: Bearer <INTERNAL_API_SECRET>
 *   Device must exist in DB with type IPAD_KIOSK.
 *
 * Request body:
 *   {
 *     "employeeId": "clxxxxxxxxx",   // Employee CUID or email
 *     "deviceId": "ipad_kiosk_1",
 *     "scannedAt": "2024-01-01T09:00:00Z",  // optional
 *     "source": "qr" | "manual"              // optional, for audit
 *   }
 *
 * Response:
 *   200: { outcome, scanEventId, employeeName?, employeeId?, message }
 *   400: { error: "..." }
 *   401: { error: "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateDevice, extractBearerToken } from "~/server/services/device-auth";
import { ingestByEmployeeId } from "~/server/services/scan-ingestion";
import { ScanOutcome } from "@prisma/client";

const bodySchema = z.object({
  employeeId: z.string().min(1).max(256),
  deviceId: z.string().min(1).max(64),
  scannedAt: z.string().datetime().optional(),
  source: z.enum(["qr", "manual"]).optional(),
});

export async function POST(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { employeeId, deviceId, scannedAt } = parsed.data;

  const authResult = await authenticateDevice(deviceId, token);
  if (!authResult.ok) {
    console.warn(`[scan-employee] Unauthorised attempt — device: ${deviceId}, reason: ${authResult.error}`);
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const result = await ingestByEmployeeId({
    employeeId,
    deviceId,
    scannedAt,
    device: authResult.device,
  });

  const status = result.outcome === ScanOutcome.DEVICE_UNAUTHORISED ? 401 : 200;
  return NextResponse.json(result, { status });
}
