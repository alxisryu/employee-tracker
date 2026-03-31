/**
 * BackendClient — HTTP client for submitting scan events to the web backend.
 *
 * Responsibilities:
 *   - Package the scan payload
 *   - Authenticate with the device API key
 *   - Retry transient failures with exponential backoff
 *   - Log outcomes to stdout
 */

import { config } from "./config";

export interface ScanPayload {
  tagId: string;
  deviceId: string;
  scannedAt?: string;
  rawPayload?: string | null;
}

export interface ScanResult {
  outcome: string;
  scanEventId: string;
  message: string;
  employeeName?: string;
}

const RETRY_DELAYS_MS = [1_000, 3_000, 10_000, 30_000]; // 4 attempts total

export class BackendClient {
  private readonly endpoint: string;

  constructor() {
    this.endpoint = `${config.backendUrl}/api/scan`;
  }

  async submit(payload: ScanPayload): Promise<ScanResult> {
    return this.submitWithRetry(payload, 0);
  }

  private async submitWithRetry(payload: ScanPayload, attempt: number): Promise<ScanResult> {
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.deviceApiKey}`,
        },
        body: JSON.stringify(payload),
        // Prevent hanging indefinitely on network issues.
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      const result = (await res.json()) as ScanResult;
      console.log(`[client] ✓ ${result.outcome} — ${result.message}`);
      return result;
    } catch (err) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) {
        // All retries exhausted — log and rethrow.
        console.error(`[client] ✗ All retries failed for tag ${payload.tagId}:`, err);
        throw err;
      }
      console.warn(
        `[client] ⚠ Submit failed (attempt ${attempt + 1}), retrying in ${delay}ms…`,
        err instanceof Error ? err.message : err,
      );
      await sleep(delay);
      return this.submitWithRetry(payload, attempt + 1);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
