/**
 * MockTagReader — reads tag IDs from stdin.
 *
 * Run:  pnpm --filter @employee-tracker/pi-client dev
 * Then type tag IDs and press Enter.
 *
 * This is the primary testing interface before real NFC hardware arrives.
 * It exercises the exact same backend submission path as the real reader.
 */

import * as readline from "readline";
import type { TagReader } from "./interface";

export class MockTagReader implements TagReader {
  private rl: readline.Interface | null = null;
  private stopped = false;

  async start(onScan: (tagId: string, rawPayload?: string) => Promise<void>): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    console.log("[MockTagReader] Ready. Enter a tag ID and press Enter:");
    console.log('  Examples: TAG_ALEXIS_001 | TAG_SAM_001 | TAG_UNKNOWN_X');
    console.log("  Ctrl+C to exit.\n");

    // Emit a prompt character for interactive use.
    process.stdout.write("> ");

    for await (const line of this.rl) {
      if (this.stopped) break;
      const tagId = line.trim();
      if (!tagId) {
        process.stdout.write("> ");
        continue;
      }
      console.log(`[MockTagReader] Scanned: ${tagId}`);
      await onScan(tagId);
      if (!this.stopped) {
        process.stdout.write("> ");
      }
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.rl?.close();
  }
}
