/**
 * Attendance count endpoint — GET /api/attendance-count
 *
 * Returns the number of employees currently checked in. Used by the iPad
 * kiosk idle screen to display a live count.
 *
 * Authentication:
 *   Authorization: Bearer <INTERNAL_API_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { extractBearerToken } from "~/server/services/device-auth";
import { getLastResetTime } from "~/server/services/attendance-reset";
import { env } from "~/env/server";

export async function GET(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token || token !== env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  // An employee counts as "in" only if their attendance state is IN AND
  // it was last changed after the most recent 2am reset boundary.
  const lastReset = getLastResetTime();
  const count = await db.attendanceState.count({
    where: {
      status: "IN",
      statusChangedAt: { gte: lastReset },
    },
  });

  return NextResponse.json({ count });
}
