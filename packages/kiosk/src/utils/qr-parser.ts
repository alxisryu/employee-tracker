/**
 * QR code content parser.
 *
 * Normalises all supported QR formats into a consistent shape.
 *
 * Supported formats:
 *   1. raw UUID — "550e8400-e29b-41d4-a716-446655440000"
 *   2. JSON payload — { "employeeUuid": "..." } or { "employeeId": "..." }
 *   3. URL query param — https://example.com/checkin?employeeUuid=...
 *   4. URL path segment — https://example.com/employee/clxxxxxxx/checkin
 *   5. CUID — starts with "cl" followed by alphanumeric
 */

export type QrFormat = 'raw_uuid' | 'raw_cuid' | 'json' | 'url_query' | 'url_path' | 'unknown';

export interface ScanParseResult {
  employeeUuid: string | null;
  rawValue: string;
  format: QrFormat;
  isValid: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_RE = /^c[a-z0-9]{24,}$/i;

function isUuidOrCuid(value: string): boolean {
  return UUID_RE.test(value) || CUID_RE.test(value);
}

export function parseQrCode(raw: string): ScanParseResult {
  const trimmed = raw.trim();

  // 1. Raw UUID or CUID
  if (UUID_RE.test(trimmed)) {
    return { employeeUuid: trimmed, rawValue: raw, format: 'raw_uuid', isValid: true };
  }
  if (CUID_RE.test(trimmed)) {
    return { employeeUuid: trimmed, rawValue: raw, format: 'raw_cuid', isValid: true };
  }

  // 2. JSON payload
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const id = (obj.employeeUuid ?? obj.employeeId ?? obj.id) as string | undefined;
      if (id && typeof id === 'string' && isUuidOrCuid(id)) {
        return { employeeUuid: id, rawValue: raw, format: 'json', isValid: true };
      }
    } catch {
      // not valid JSON — fall through
    }
  }

  // 3 & 4. URL-based formats
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);

      // 3. Query param: ?employeeUuid=... or ?employeeId=...
      const queryId = url.searchParams.get('employeeUuid') ?? url.searchParams.get('employeeId');
      if (queryId && isUuidOrCuid(queryId)) {
        return { employeeUuid: queryId, rawValue: raw, format: 'url_query', isValid: true };
      }

      // 4. Path segment: /employee/<id>/... or /checkin/<id>
      const segments = url.pathname.split('/').filter(Boolean);
      for (const seg of segments) {
        if (isUuidOrCuid(seg)) {
          return { employeeUuid: seg, rawValue: raw, format: 'url_path', isValid: true };
        }
      }
    } catch {
      // not a valid URL — fall through
    }
  }

  return { employeeUuid: null, rawValue: raw, format: 'unknown', isValid: false };
}
