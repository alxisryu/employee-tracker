import { NextResponse } from "next/server";
import { env } from "~/env/server";
import { performAttendanceReset } from "~/server/services/attendance-reset";

/**
 * GET /api/cron/reset-attendance
 *
 * Triggered by Vercel Cron at 15:00 UTC and 16:00 UTC daily, covering both
 * AEDT (UTC+11, daylight saving) and AEST (UTC+10, standard time) so the
 * reset always fires at 2am Sydney time regardless of the season.
 * The second call is a no-op — performAttendanceReset only updates IN rows.
 *
 * Vercel automatically sets the `authorization: Bearer <CRON_SECRET>` header
 * when invoking cron routes, so no manual secret management is needed in prod.
 * The same header can be sent manually for ad-hoc triggering.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await performAttendanceReset();
  return NextResponse.json({ ok: true, ...result });
}
