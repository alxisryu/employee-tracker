/**
 * Scan ingestion service — the authoritative domain logic layer.
 *
 * Attendance model: "toggle with debounce"
 *   - First valid scan marks employee IN (if currently OUT).
 *   - Scan within DUPLICATE_WINDOW_MS of the last scan for the same tag
 *     → DUPLICATE_IGNORED (no state change, no noise).
 *   - Scan after DUPLICATE_WINDOW_MS when already IN → ACCEPTED_OUT.
 *   - Scan after DUPLICATE_WINDOW_MS when already OUT → ACCEPTED_IN.
 */

import { db, ScanOutcome, PresenceStatus, type Device } from "@employee-tracker/db";
import { normalizeTagId } from "./tag-normalizer";
import { getLastResetTime } from "./attendance-reset";

export const DUPLICATE_WINDOW_MS = 30_000;

export interface IngestScanInput {
  tagId: string;
  deviceId: string;
  scannedAt?: string;
  rawPayload?: string | null;
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
    // Unknown tag — record a placeholder Tag row (inactive, unassigned) so the
    // ScanEvent FK is satisfied, then log the event for audit/assignment workflow.
    await db.tag.upsert({
      where: { tagId },
      create: {
        tagId,
        label: "Unregistered",
        isActive: false,
      },
      update: {},
    });
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

  // ── 4. Compute the last 2am boundary ──────────────────────────────────────
  const lastResetTime = getLastResetTime(scannedAt);

  // ── 5. Duplicate suppression ──────────────────────────────────────────────
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

  // ── 7. Persist atomically ─────────────────────────────────────────────────
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
    // Not an employee ID or email — try treating it as a tag ID (e.g. NFC/QR hex UID).
    return ingestScan({
      tagId: input.employeeId,
      deviceId: input.deviceId,
      scannedAt: input.scannedAt,
      rawPayload: input.rawPayload,
      device,
    });
  }

  // Ensure a virtual "QR Pass" tag exists for this employee.
  // This gives the scan event a valid tagId FK without schema changes.
  // normalizeTagId is applied here so the stored tagId matches what ingestScan
  // will look up after normalisation (which uppercases, etc.).
  const virtualTagId = normalizeTagId(`QR_${employee.id}`);
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
