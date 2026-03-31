/**
 * NfcTagReader — STUB for real hardware integration.
 *
 * This class will integrate a physical NFC reader (PN532 via I2C/UART/SPI,
 * or a USB HID reader) on a Raspberry Pi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * IMPLEMENTATION PLAN (complete this when hardware arrives)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RECOMMENDED LIBRARY
 * ───────────────────
 * nfc-pcsc (npm) — works with most USB CCID NFC readers (ACR122U, ACR1252U,
 *   etc.) via PC/SC. Tested on Raspberry Pi + Raspbian. No native bindings
 *   beyond pcscd (system package).
 *
 *   Install:  sudo apt-get install pcscd pcsc-tools libnfc-dev
 *             pnpm add nfc-pcsc
 *
 * For PN532 via I2C/SPI/UART (cheaper, no USB needed):
 *   nfc-nci or nfc-nodejs-driver — lower-level, requires more config.
 *   Alternatively use Python libnfc bindings and call out to a child process.
 *
 * WIRING (PN532 breakout board via I2C)
 * ──────────────────────────────────────
 *   PN532 VCC  → Pi 3.3V (pin 1)
 *   PN532 GND  → Pi GND  (pin 6)
 *   PN532 SDA  → Pi GPIO 2 / SDA1 (pin 3)
 *   PN532 SCL  → Pi GPIO 3 / SCL1 (pin 5)
 *   Set PN532 DIP switches: I2C mode (SW1=OFF, SW2=ON)
 *
 * READING LOGIC
 * ─────────────
 * 1. Initialise the NFC reader.
 * 2. Poll for ISO14443A tags (covers Mifare Classic, Mifare Ultralight,
 *    NTAG2xx — most office-issue keyfobs and cards).
 * 3. When a tag is detected:
 *    a. Extract the UID (typically 4 or 7 bytes, e.g. "04:A3:B2:11:22:33:44").
 *    b. Normalise: join hex bytes, uppercase, no separators → "04A3B211223344"
 *       This format is what will be stored as tagId in the database.
 *    c. Store the raw hex UID as rawPayload for debugging.
 *    d. Call onScan(normalisedUid, rawHex).
 * 4. Implement a minimum scan-to-scan interval (e.g. 500ms) at the reader
 *    level to prevent mechanical double-scans from a single tap.
 * 5. The backend handles authoritative duplicate suppression (30s window).
 *
 * MULTI-READER SUPPORT
 * ────────────────────
 * If multiple USB readers are plugged into one Pi, enumerate connected
 * readers via nfc-pcsc's NFC.on('reader', ...) and create one NfcTagReader
 * instance per reader, each with its own deviceId.
 *
 * SERIAL / UART PN532 ALTERNATIVE
 * ─────────────────────────────────
 * If using serial (e.g. /dev/ttyAMA0):
 *   - Install nfc-pcsc's UART bridge or use direct UART commands.
 *   - Set baud rate: 115200.
 *   - Same tag reading logic applies once the transport layer is initialised.
 *
 * OFFLINE RESILIENCE
 * ──────────────────
 * If this.client.submit() throws due to network error:
 *   - Log the failed scan to a local queue file (e.g. /tmp/scan-queue.jsonl).
 *   - Start a background retry loop (see BackendClient.submitWithRetry).
 *   - On reconnection, flush the queue in order.
 *   - This ensures no scans are lost during network blips.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { TagReader } from "./interface";

export class NfcTagReader implements TagReader {
  /**
   * @param readerDevice Optional device identifier hint (e.g. USB device path).
   *                     If null, the library will auto-detect the first reader.
   */
  constructor(private readonly readerDevice?: string) {}

  async start(_onScan: (tagId: string, rawPayload?: string) => Promise<void>): Promise<void> {
    // ── STUB ──────────────────────────────────────────────────────────────
    // Replace this block with real hardware initialisation.
    //
    // Example with nfc-pcsc:
    //
    //   import { NFC } from "nfc-pcsc";
    //
    //   const nfc = new NFC();
    //   nfc.on("reader", (reader) => {
    //     console.log(`[NfcTagReader] Reader attached: ${reader.reader.name}`);
    //     reader.on("card", async (card) => {
    //       const rawUid = card.uid;  // e.g. "04a3b211223344"
    //       const tagId = rawUid.toUpperCase().replace(/:/g, "");
    //       await _onScan(tagId, rawUid);
    //     });
    //     reader.on("card.off", () => {
    //       // Tag removed — no action needed for attendance use case.
    //     });
    //     reader.on("error", (err: Error) => {
    //       console.error(`[NfcTagReader] Reader error: ${err.message}`);
    //     });
    //   });
    //   nfc.on("error", (err: Error) => {
    //     console.error(`[NfcTagReader] NFC error: ${err.message}`);
    //   });
    //
    // The above is event-driven and never resolves (runs until stop()).
    // ──────────────────────────────────────────────────────────────────────

    throw new Error(
      "NfcTagReader is not yet implemented. " +
      "Set MOCK_MODE=true in .env, or implement hardware integration. " +
      "See the comment block in packages/pi-client/src/readers/nfc.ts for a complete plan.",
    );
  }

  async stop(): Promise<void> {
    // Teardown: close NFC context, release port, etc.
  }
}
