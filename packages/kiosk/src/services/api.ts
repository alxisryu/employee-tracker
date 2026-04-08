/**
 * Backend API service for the kiosk.
 *
 * All requests use the INTERNAL_API_SECRET for authentication.
 * Change config.apiBaseUrl and config.apiSecret to point at your backend.
 */

import { config } from '@/constants/config';
import type { GuestData } from '@/src/state/kiosk-machine';

export interface ScanResponse {
  outcome: string;
  scanEventId: string;
  employeeName?: string;
  employeeId?: string;
  message: string;
}

export interface GuestSignInResponse {
  message: string;
  visitedAt: string;
}

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiSecret}`,
  };
}

/** Submit a QR scan or manual sign-in by employee identifier (ID or email). */
export async function submitEmployeeScan(
  employeeId: string,
  source: 'qr' | 'manual' = 'qr',
): Promise<ScanResponse> {
  const url = `${config.apiBaseUrl}/api/scan-employee`;
  console.log('[api] POST', url, { employeeId, source, deviceId: config.deviceId });

  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      employeeId,
      deviceId: config.deviceId,
      scannedAt: new Date().toISOString(),
      source,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[api] non-OK response', res.status, text);
    let body: { error?: string; message?: string } = {};
    try { body = JSON.parse(text) as typeof body; } catch { /* not JSON */ }
    throw new ApiError(res.status, body.error ?? body.message ?? `HTTP ${res.status}: ${text.slice(0, 120)}`);
  }

  return res.json() as Promise<ScanResponse>;
}

/** Fetch the current count of checked-in employees. */
export async function fetchAttendanceCount(): Promise<number> {
  const res = await fetch(`${config.apiBaseUrl}/api/attendance-count`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }
  const body = await res.json() as { count: number };
  return body.count;
}

/** Submit a guest sign-in. */
export async function submitGuestSignIn(data: GuestData): Promise<GuestSignInResponse> {
  const res = await fetch(`${config.apiBaseUrl}/api/guest-signin`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      ...data,
      deviceId: config.deviceId,
      visitedAt: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unknown error' })) as { error?: string; message?: string };
    throw new ApiError(res.status, body.error ?? body.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<GuestSignInResponse>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isNetworkError(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}
