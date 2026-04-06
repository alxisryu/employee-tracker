/**
 * Tag ID normalisation.
 *
 * All tag IDs are normalised before being stored or looked up.
 * UUID-based QR tokens (uppercase, no hyphens) pass through unchanged.
 *
 * Rules (applied in order):
 *   1. Trim leading/trailing whitespace
 *   2. Uppercase
 *   3. Collapse runs of internal whitespace to a single underscore
 *   4. Remove hyphens (common in UID representations like "04-A3-B2-...")
 */
export function normalizeTagId(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "");
}
