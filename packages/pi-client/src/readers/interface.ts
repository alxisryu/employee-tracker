/**
 * TagReader — the single abstraction point for scan input sources.
 *
 * Everything above this interface (backend submission, debounce, retry) is
 * source-agnostic. The only thing that changes when swapping from mock to
 * real hardware is which TagReader implementation is instantiated.
 *
 * Implementations provided:
 *   MockTagReader  — reads tag IDs from stdin (CLI mode for local testing)
 *   NfcTagReader   — stub with implementation plan for real PN532/USB hardware
 */
export interface TagReader {
  /**
   * Start listening for scans. For each scan detected, call onScan.
   *
   * @param onScan  Called with the raw tag ID and optional raw payload bytes.
   *                Async — implementations should await this before reading the
   *                next tag to allow per-scan processing (retry, debounce, etc.).
   */
  start(onScan: (tagId: string, rawPayload?: string) => Promise<void>): Promise<void>;

  /**
   * Gracefully stop the reader (close port, stop polling, etc.).
   */
  stop(): Promise<void>;
}
