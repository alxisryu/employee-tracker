/**
 * Pi client entry point.
 *
 * Usage:
 *   pnpm --filter @employee-tracker/pi-client dev
 *
 * In MOCK_MODE=true (default for dev):
 *   Starts MockTagReader — type tag IDs manually to simulate hardware scans.
 *
 * In MOCK_MODE=false:
 *   Starts NfcTagReader — reads from real NFC hardware (requires hardware +
 *   driver setup; see packages/pi-client/src/readers/nfc.ts for the plan).
 *
 * The only difference between modes is which TagReader is instantiated.
 * All scan submission, retry, and debounce logic is shared.
 */

import { config } from "./config";
import { BackendClient } from "./client";
import { MockTagReader } from "./readers/mock";
import { NfcTagReader } from "./readers/nfc";
import type { TagReader } from "./readers/interface";

// Per-tag debounce: track the last submission time for each tagId.
// This is a client-side convenience layer — the backend remains the
// authoritative duplicate suppressor.
const lastSubmitAt = new Map<string, number>();

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Employee Tracker — Pi Client");
  console.log(`  Device:   ${config.deviceId}`);
  console.log(`  Backend:  ${config.backendUrl}`);
  console.log(`  Mode:     ${config.mockMode ? "MOCK (stdin)" : "NFC hardware"}`);
  console.log(`  Debounce: ${config.clientDebounceMs}ms`);
  console.log("═══════════════════════════════════════════\n");

  const client = new BackendClient();

  const reader: TagReader = config.mockMode
    ? new MockTagReader()
    : new NfcTagReader();

  // Graceful shutdown on Ctrl+C
  process.on("SIGINT", async () => {
    console.log("\n[pi-client] Shutting down…");
    await reader.stop();
    process.exit(0);
  });

  await reader.start(async (tagId: string, rawPayload?: string) => {
    // ── Client-side debounce ──────────────────────────────────────────────
    const now = Date.now();
    const lastMs = lastSubmitAt.get(tagId);
    if (lastMs !== undefined && now - lastMs < config.clientDebounceMs) {
      const remaining = config.clientDebounceMs - (now - lastMs);
      console.log(
        `[pi-client] Debounced ${tagId} (${Math.ceil(remaining / 1000)}s remaining in client window)`,
      );
      return;
    }
    lastSubmitAt.set(tagId, now);

    // ── Submit to backend ─────────────────────────────────────────────────
    try {
      await client.submit({
        tagId,
        deviceId: config.deviceId,
        scannedAt: new Date().toISOString(),
        rawPayload: rawPayload ?? null,
      });
    } catch (err) {
      // Errors are already logged by BackendClient after all retries fail.
      // Future improvement: persist to local queue file here for offline resilience.
      console.error("[pi-client] Scan lost after all retries:", err);
    }
  });
}

main().catch((err) => {
  console.error("[pi-client] Fatal error:", err);
  process.exit(1);
});
