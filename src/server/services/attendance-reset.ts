import { db } from "~/server/db";

const TIMEZONE = "Australia/Sydney";
const RESET_HOUR = 2; // 2am Sydney time

/**
 * Returns the most recent 2am Sydney time boundary that has already passed,
 * relative to `now`. DST-aware: uses the en-US locale trick to do arithmetic
 * in Sydney time without manual offset math.
 *
 * Examples:
 *   now = 2024-07-15 18:00 AEST  →  2024-07-15 02:00 AEST
 *   now = 2024-07-15 00:30 AEST  →  2024-07-14 02:00 AEST
 */
export function getLastResetTime(now = new Date()): Date {
  // Reinterpret `now` in Sydney local time. The resulting Date object's
  // local getters (getHours, getDate, …) reflect Sydney time components,
  // letting us do calendar arithmetic without manual offset handling.
  const sydneyNow = new Date(
    now.toLocaleString("en-US", { timeZone: TIMEZONE }),
  );

  const sydneyReset = new Date(sydneyNow);
  sydneyReset.setHours(RESET_HOUR, 0, 0, 0);
  if (sydneyNow < sydneyReset) {
    sydneyReset.setDate(sydneyReset.getDate() - 1);
  }

  // Convert the Sydney-local reset time back to a real UTC Date.
  // The difference (now − sydneyNow) is Sydney's UTC offset in ms.
  const utcOffsetMs = now.getTime() - sydneyNow.getTime();
  return new Date(sydneyReset.getTime() + utcOffsetMs);
}

/**
 * Sets all IN employees to OUT and records the reset time.
 * Called by the cron endpoint at 2am each day.
 */
export async function performAttendanceReset(): Promise<{ resetCount: number }> {
  const result = await db.attendanceState.updateMany({
    where: { status: "IN" },
    data: { status: "OUT", statusChangedAt: new Date() },
  });
  return { resetCount: result.count };
}
