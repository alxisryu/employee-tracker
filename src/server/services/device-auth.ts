/**
 * Device authentication helpers.
 *
 * All devices (IPAD_KIOSK and MANUAL_UI) authenticate using the shared
 * INTERNAL_API_SECRET environment variable.
 *
 *   Authorization: Bearer <INTERNAL_API_SECRET>
 */

import { db } from "~/server/db";
import { env } from "~/env/server";
import type { Device } from "@prisma/client";

export interface AuthResult {
  ok: boolean;
  device?: Device;
  error?: string;
}

/**
 * Authenticate a device by name + bearer token.
 *
 * @param deviceName  Device.name value (e.g. "ipad_kiosk_1")
 * @param bearerToken Raw value from Authorization: Bearer <token>
 */
export async function authenticateDevice(
  deviceName: string,
  bearerToken: string,
): Promise<AuthResult> {
  const device = await db.device.findUnique({ where: { name: deviceName } });

  if (!device) {
    return { ok: false, error: `Device '${deviceName}' not found.` };
  }
  if (!device.isActive) {
    return { ok: false, error: `Device '${deviceName}' is inactive.` };
  }

  if (bearerToken === env.INTERNAL_API_SECRET) {
    return { ok: true, device };
  }

  return { ok: false, error: "Invalid API secret." };
}

/**
 * Extract bearer token from an Authorization header value.
 * Returns null if the header is missing or malformed.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") return null;
  return parts[1] ?? null;
}
