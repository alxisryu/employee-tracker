/**
 * Kiosk configuration.
 *
 * Set EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_DEVICE_ID in your .env file.
 * Set EXPO_PUBLIC_API_SECRET to the INTERNAL_API_SECRET from the backend .env.
 */
export const config = {
  /** Base URL of the backend API, no trailing slash */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',

  /** Must match a Device.name in the DB with type IPAD_KIOSK */
  deviceId: process.env.EXPO_PUBLIC_DEVICE_ID ?? 'ipad_kiosk_1',

  /** Must match INTERNAL_API_SECRET in the backend .env */
  apiSecret: process.env.EXPO_PUBLIC_API_SECRET ?? '',

  /** Auto-reset timings (ms) */
  successResetMs: 3_000,
  errorResetMs: 25_000,
  inactivityResetMs: 75_000,

  /** Minimum ms between processing the same QR scan */
  scanDebounceMs: 2_000,
} as const;
