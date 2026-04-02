import { NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

// Proxies the cron reset call to the Express API.
// The Express API owns the attendance-reset service.
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiUrl}/api/cron/reset-attendance`, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
