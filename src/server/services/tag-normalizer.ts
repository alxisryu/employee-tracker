/**
 * Tag ID normalisation.
 *
 * All tag IDs are normalised before being stored or looked up.
 * This ensures that "tag_alexis_001", "TAG_ALEXIS_001 ", and "TAG ALEXIS 001"
 * all resolve to the same canonical value: "TAG_ALEXIS_001".
 *
 * Rules (applied in order):
 *   1. Trim leading/trailing whitespace
 *   2. Uppercase
 *   3. Collapse runs of internal whitespace to a single underscore
 *   4. Remove hyphens (common in UID representations like "04-A3-B2-...")
 *
 * If you later need different normalisation for specific reader types, swap
 * this function out — the rest of the stack just calls normalizeTagId().
 */
export function normalizeTagId(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "");
}
