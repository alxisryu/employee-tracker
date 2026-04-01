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
import { getLastResetTime } from "~/server/services/attendance-reset";
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

  // ── 4. Compute the last 2am boundary that is ≤ scannedAt ─────────────────
  // We need the reset boundary relative to the *scan time*, not wall-clock now,
  // so that backdated simulator scans respect the correct reset epoch.
  const lastResetTime = getLastResetTime(scannedAt);

  // ── 5. Duplicate suppression (scoped to post-reset events) ────────────────
  // Only check the most recent scan for this tag that occurred after the last
  // reset — pre-reset scans are irrelevant to the current attendance cycle.
  const lastScan = await db.scanEvent.findFirst({
    where: { tagId, scannedAt: { gte: lastResetTime } },
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

  // ── 6. Determine attendance transition ────────────────────────────────────
  // Only look at accepted events that are strictly before this scan's timestamp.
  // This ensures backdated scans toggle correctly regardless of insertion order —
  // a 4:58 scan submitted after a 4:59 scan sees only events before 4:58.
  const lastAcceptedEvent = await db.scanEvent.findFirst({
    where: {
      employeeId: employee.id,
      outcome: { in: [ScanOutcome.ACCEPTED_IN, ScanOutcome.ACCEPTED_OUT] },
      scannedAt: { gte: lastResetTime, lt: scannedAt },
    },
    orderBy: { scannedAt: "desc" },
  });

  const currentStatus =
    lastAcceptedEvent?.outcome === ScanOutcome.ACCEPTED_IN
      ? PresenceStatus.IN
      : PresenceStatus.OUT;

  const newStatus =
    currentStatus === PresenceStatus.OUT ? PresenceStatus.IN : PresenceStatus.OUT;
  const outcome =
    newStatus === PresenceStatus.IN
      ? ScanOutcome.ACCEPTED_IN
      : ScanOutcome.ACCEPTED_OUT;

  // ── 7. Persist — scan event + attendance state (atomic) ───────────────────
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

    // Re-derive the true live state from the chronologically latest accepted
    // event (which now includes the one we just inserted). This keeps
    // AttendanceState correct even when scans arrive out of order — e.g.
    // inserting a backdated 4:58 IN after a 4:59 OUT leaves the live state OUT.
    const trueLatest = await tx.scanEvent.findFirst({
      where: {
        employeeId: employee.id,
        outcome: { in: [ScanOutcome.ACCEPTED_IN, ScanOutcome.ACCEPTED_OUT] },
        scannedAt: { gte: lastResetTime },
      },
      orderBy: { scannedAt: "desc" },
    });

    const liveStatus =
      trueLatest?.outcome === ScanOutcome.ACCEPTED_IN
        ? PresenceStatus.IN
        : PresenceStatus.OUT;

    await tx.attendanceState.upsert({
      where: { employeeId: employee.id },
      update: {
        status: liveStatus,
        lastScanEventId: trueLatest!.id,
        statusChangedAt: trueLatest!.scannedAt,
      },
      create: {
        employeeId: employee.id,
        status: liveStatus,
        lastScanEventId: trueLatest!.id,
        statusChangedAt: trueLatest!.scannedAt,
      },
    });

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

export interface IngestByEmployeeIdInput {
  employeeId: string;   // Employee.id (CUID) or email
  deviceId: string;
  scannedAt?: string;
  rawPayload?: string | null;
  device?: Device;
}

export async function ingestByEmployeeId(input: IngestByEmployeeIdInput): Promise<IngestScanResult> {
  const scannedAt = input.scannedAt ? new Date(input.scannedAt) : new Date();

  // Resolve device
  let device = input.device;
  if (!device) {
    const found = await db.device.findUnique({ where: { name: input.deviceId } });
    if (!found || !found.isActive) {
      return {
        outcome: ScanOutcome.DEVICE_UNAUTHORISED,
        scanEventId: "",
        message: `Device '${input.deviceId}' not found or inactive.`,
      };
    }
    device = found;
  }

  // Resolve employee — try by ID first, then by email
  const employee = await db.employee.findFirst({
    where: {
      OR: [
        { id: input.employeeId },
        { email: input.employeeId },
      ],
    },
  });

  if (!employee) {
    return {
      outcome: ScanOutcome.UNKNOWN_TAG,
      scanEventId: "",
      message: "Employee not found.",
    };
  }

  // Ensure a virtual "QR Pass" tag exists for this employee.
  // This gives the scan event a valid tagId FK without schema changes.
  const virtualTagId = `QR_${employee.id}`;
  await db.tag.upsert({
    where: { tagId: virtualTagId },
    create: {
      tagId: virtualTagId,
      label: "QR Pass",
      isActive: true,
      employeeId: employee.id,
    },
    update: {},
  });

  // Delegate to ingestScan with the virtual tag — all duplicate/toggle logic reused.
  return ingestScan({
    tagId: virtualTagId,
    deviceId: input.deviceId,
    scannedAt: input.scannedAt,
    rawPayload: input.rawPayload,
    device,
  });
}
