import bcrypt from "bcryptjs";
import { db } from "@employee-tracker/db";
import type { Device } from "@employee-tracker/db";
import { env } from "../env";

export interface AuthResult {
  ok: boolean;
  device?: Device;
  error?: string;
}

/**
 * Authenticate a device by name + bearer token.
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

  // MANUAL_UI devices use the internal API secret (shared env var).
  if (device.type === "MANUAL_UI") {
    if (bearerToken === env.INTERNAL_API_SECRET) {
      return { ok: true, device };
    }
    return { ok: false, error: "Invalid internal API secret." };
  }

  // KIOSK, PI_READER, and MOCK devices use a per-device hashed key.
  if (!device.apiKeyHash) {
    return { ok: false, error: `Device '${deviceName}' has no API key configured.` };
  }

  const match = await bcrypt.compare(bearerToken, device.apiKeyHash);
  if (!match) {
    return { ok: false, error: "Invalid API key." };
  }

  return { ok: true, device };
}

/**
 * Extract bearer token from an Authorization header value.
 * Returns null if the header is missing or malformed.
 */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") return null;
  return parts[1] ?? null;
}
