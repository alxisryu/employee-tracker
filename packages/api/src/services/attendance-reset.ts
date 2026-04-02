import { db } from "@employee-tracker/db";

const TIMEZONE = "Australia/Sydney";
const RESET_HOUR = 2; // 2am Sydney time

/**
 * Returns the most recent 2am Sydney time boundary that has already passed,
 * relative to `now`. DST-aware.
 */
export function getLastResetTime(now = new Date()): Date {
  const sydneyNow = new Date(
    now.toLocaleString("en-US", { timeZone: TIMEZONE }),
  );

  const sydneyReset = new Date(sydneyNow);
  sydneyReset.setHours(RESET_HOUR, 0, 0, 0);
  if (sydneyNow < sydneyReset) {
    sydneyReset.setDate(sydneyReset.getDate() - 1);
  }

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
