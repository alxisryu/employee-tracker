/**
 * Guest sign-in endpoint — POST /api/guest-signin
 *
 * Records a guest visit. Currently logs to stdout; a GuestVisit table
 * can be added in a future migration.
 *
 * Authentication:
 *   Authorization: Bearer <INTERNAL_API_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractBearerToken } from "~/server/services/device-auth";
import { env } from "~/env/server";

const bodySchema = z.object({
  fullName: z.string().min(1).max(128),
  company: z.string().max(128).optional(),
  host: z.string().max(128).optional(),
  reason: z.string().max(256).optional(),
  deviceId: z.string().min(1).max(64),
  visitedAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token || token !== env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
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

  const { fullName, company, host, reason, deviceId, visitedAt } = parsed.data;

  // TODO: Persist to a GuestVisit table (requires a Prisma migration).
  console.log("[guest-signin]", {
    fullName,
    company,
    host,
    reason,
    deviceId,
    visitedAt: visitedAt ?? new Date().toISOString(),
  });

  return NextResponse.json({
    message: `Welcome, ${fullName}. Your visit has been recorded.`,
    visitedAt: visitedAt ?? new Date().toISOString(),
  });
}
