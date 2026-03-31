/**
 * Scan ingestion service — the authoritative domain logic layer.
 *
 * This is the single place where a raw scan payload is turned into an
 * outcome, an audit event, and (when appropriate) an attendance state change.
 *
 * Nothing in this file knows or cares how the scan arrived (web UI, mock CLI,
 * Pi hardware). That is the caller's concern.
 *
 * Attendance model: "toggle with debounce"
 *   - First valid scan marks employee IN (if currently OUT).
 *   - Scan within DUPLICATE_WINDOW_MS of the last scan for the same tag
 *     → DUPLICATE_IGNORED (no state change, no noise).
 *   - Scan after DUPLICATE_WINDOW_MS when already IN → ACCEPTED_OUT.
 *   - Scan after DUPLICATE_WINDOW_MS when already OUT → ACCEPTED_IN.
 *
 * The duplicate window is intentionally short (default 30s) and exists only
 * to absorb accidental double-taps. It is NOT a "cooldown before check-out"
 * — a deliberate second tap after 30s will toggle the state.
 */

import { db } from "~/server/db";
import { normalizeTagId } from "~/server/services/tag-normalizer";
import { ScanOutcome, PresenceStatus, type Device } from "@prisma/client";

// Default duplicate suppression window: 30 seconds.
// Can be overridden in tests or via env in a future iteration.
export const DUPLICATE_WINDOW_MS = 30_000;

export interface IngestScanInput {
  tagId: string;           // raw tag ID from the caller
  deviceId: string;        // Device.name (human-readable slug, e.g. "front_door_1")
  scannedAt?: string;      // ISO timestamp; defaults to now if omitted
  rawPayload?: string | null;
  // Pre-authenticated device row — passed by callers that have already
  // verified the device. If omitted, the service will look it up.
  device?: Device;
}

export interface IngestScanResult {
  outcome: ScanOutcome;
  scanEventId: string;
  employeeName?: string;
  employeeId?: string;
  message: string;
}

export async function ingestScan(input: IngestScanInput): Promise<IngestScanResult> {
  const rawTagId = input.tagId;
  const tagId = normalizeTagId(rawTagId);
  const scannedAt = input.scannedAt ? new Date(input.scannedAt) : new Date();

  // ── 1. Resolve device ─────────────────────────────────────────────────────
  let device = input.device;
  if (!device) {
    const found = await db.device.findUnique({ where: { name: input.deviceId } });
    if (!found || !found.isActive) {
      // We still try to record the event, but we need a valid deviceId.
      // If the device doesn't exist at all, we cannot record (FK constraint).
      // Return early with a structured error — caller should surface this.
      return {
        outcome: ScanOutcome.DEVICE_UNAUTHORISED,
        scanEventId: "",
        message: `Device '${input.deviceId}' not found or inactive.`,
      };
    }
    device = found;
  }

  // ── 2. Resolve tag ────────────────────────────────────────────────────────
  const tag = await db.tag.findUnique({
    where: { tagId },
    include: { employee: true },
  });

  if (!tag) {
    // Unknown tag — still record the event for audit / assignment workflow.
    const event = await db.scanEvent.create({
      data: {
        tagId,
        rawTagId,
        deviceId: device.id,
        employeeId: null,
        scannedAt,
        outcome: ScanOutcome.UNKNOWN_TAG,
        rawPayload: input.rawPayload ?? null,
      },
    });
    return {
      outcome: ScanOutcome.UNKNOWN_TAG,
      scanEventId: event.id,
      message: `Tag '${tagId}' is not registered.`,
    };
  }

  if (!tag.isActive) {
    const event = await db.scanEvent.create({
      data: {
        tagId,
        rawTagId,
        deviceId: device.id,
        employeeId: tag.employeeId ?? null,
        scannedAt,
        outcome: ScanOutcome.INACTIVE_TAG,
        rawPayload: input.rawPayload ?? null,
      },
    });
    return {
      outcome: ScanOutcome.INACTIVE_TAG,
      scanEventId: event.id,
      message: `Tag '${tagId}' is inactive.`,
    };
  }

  // ── 3. Resolve employee ───────────────────────────────────────────────────
  const employee = tag.employee;
  if (!employee) {
    // Tag exists but has no employee — treat as unknown.
    const event = await db.scanEvent.create({
      data: {
        tagId,
        rawTagId,
        deviceId: device.id,
        employeeId: null,
        scannedAt,
        outcome: ScanOutcome.UNKNOWN_TAG,
        rawPayload: input.rawPayload ?? null,
      },
    });
    return {
      outcome: ScanOutcome.UNKNOWN_TAG,
      scanEventId: event.id,
      message: `Tag '${tagId}' is not assigned to any employee.`,
    };
  }

  if (!employee.isActive) {
    const event = await db.scanEvent.create({
      data: {
        tagId,
        rawTagId,
        deviceId: device.id,
        employeeId: employee.id,
        scannedAt,
        outcome: ScanOutcome.INACTIVE_EMPLOYEE,
        rawPayload: input.rawPayload ?? null,
      },
    });
    return {
      outcome: ScanOutcome.INACTIVE_EMPLOYEE,
      scanEventId: event.id,
      employeeName: employee.name,
      employeeId: employee.id,
      message: `Employee '${employee.name}' is inactive.`,
    };
  }

  // ── 4. Duplicate suppression ──────────────────────────────────────────────
  // Check the most recent scan event for this tag.
  const lastScan = await db.scanEvent.findFirst({
    where: { tagId },
    orderBy: { scannedAt: "desc" },
  });

  if (lastScan) {
    const msSinceLast = scannedAt.getTime() - lastScan.scannedAt.getTime();
    if (msSinceLast >= 0 && msSinceLast < DUPLICATE_WINDOW_MS) {
      const event = await db.scanEvent.create({
        data: {
          tagId,
          rawTagId,
          deviceId: device.id,
          employeeId: employee.id,
          scannedAt,
          outcome: ScanOutcome.DUPLICATE_IGNORED,
          rawPayload: input.rawPayload ?? null,
        },
      });
      return {
        outcome: ScanOutcome.DUPLICATE_IGNORED,
        scanEventId: event.id,
        employeeName: employee.name,
        employeeId: employee.id,
        message: `Duplicate scan ignored for '${employee.name}' (within ${DUPLICATE_WINDOW_MS / 1000}s window).`,
      };
    }
  }

  // ── 5. Determine attendance transition ────────────────────────────────────
  let attendance = await db.attendanceState.findUnique({
    where: { employeeId: employee.id },
  });

  const currentStatus = attendance?.status ?? PresenceStatus.OUT;
  const newStatus =
    currentStatus === PresenceStatus.OUT ? PresenceStatus.IN : PresenceStatus.OUT;
  const outcome =
    newStatus === PresenceStatus.IN
      ? ScanOutcome.ACCEPTED_IN
      : ScanOutcome.ACCEPTED_OUT;

  // ── 6. Persist — scan event + attendance state (atomic) ───────────────────
  const [event] = await db.$transaction(async (tx) => {
    const newEvent = await tx.scanEvent.create({
      data: {
        tagId,
        rawTagId,
        deviceId: device!.id,
        employeeId: employee.id,
        scannedAt,
        outcome,
        rawPayload: input.rawPayload ?? null,
      },
    });

    if (attendance) {
      await tx.attendanceState.update({
        where: { employeeId: employee.id },
        data: {
          status: newStatus,
          lastScanEventId: newEvent.id,
          statusChangedAt: scannedAt,
        },
      });
    } else {
      await tx.attendanceState.create({
        data: {
          employeeId: employee.id,
          status: newStatus,
          lastScanEventId: newEvent.id,
          statusChangedAt: scannedAt,
        },
      });
    }

    return [newEvent];
  });

  return {
    outcome,
    scanEventId: event.id,
    employeeName: employee.name,
    employeeId: employee.id,
    message:
      outcome === ScanOutcome.ACCEPTED_IN
        ? `${employee.name} checked in.`
        : `${employee.name} checked out.`,
  };
}
