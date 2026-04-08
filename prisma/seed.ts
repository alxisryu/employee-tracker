/**
 * Seed script: creates sample employees, tags, devices, and some
 * historical scan events to populate the dashboard for development and testing.
 *
 * To run:  pnpm db:seed
 */

import { PrismaClient, ScanOutcome, DeviceType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Devices ──────────────────────────────────────────────────────────────

  // The MANUAL_UI device has no API key — it is authenticated via the
  // admin session in the web UI simulator.
  const manualDevice = await prisma.device.upsert({
    where: { name: "manual_ui" },
    update: {},
    create: {
      name: "manual_ui",
      location: "Web UI",
      type: DeviceType.MANUAL_UI,
      isActive: true,
    },
  });

  // iPad kiosk at the main entrance — authenticates via INTERNAL_API_SECRET.
  const kioskDevice = await prisma.device.upsert({
    where: { name: "ipad_kiosk_1" },
    update: {},
    create: {
      name: "ipad_kiosk_1",
      location: "Main entrance",
      type: DeviceType.IPAD_KIOSK,
      isActive: true,
    },
  });

  console.log("Devices seeded.");

  // ── Employees ─────────────────────────────────────────────────────────────

  const alexis = await prisma.employee.upsert({
    where: { email: "alexis@example.com" },
    update: {},
    create: { name: "Alexis Reed", email: "alexis@example.com", isActive: true },
  });

  const sam = await prisma.employee.upsert({
    where: { email: "sam@example.com" },
    update: {},
    create: { name: "Sam Patel", email: "sam@example.com", isActive: true },
  });

  const jordan = await prisma.employee.upsert({
    where: { email: "jordan@example.com" },
    update: {},
    create: { name: "Jordan Kim", email: "jordan@example.com", isActive: true },
  });

  console.log("Employees seeded.");

  // ── Tags (QR code identifiers) ────────────────────────────────────────────

  // Each tag represents the QR credential for one employee.
  // The tagId will eventually be a TOTP-derived value; for seeding we use
  // a static placeholder so the simulator and history events work out of the box.
  await prisma.tag.upsert({
    where: { tagId: "QR_ALEXIS_001" },
    update: {},
    create: {
      tagId: "QR_ALEXIS_001",
      label: "Wallet pass",
      isActive: true,
      employeeId: alexis.id,
    },
  });

  await prisma.tag.upsert({
    where: { tagId: "QR_SAM_001" },
    update: {},
    create: {
      tagId: "QR_SAM_001",
      label: "Wallet pass",
      isActive: true,
      employeeId: sam.id,
    },
  });

  await prisma.tag.upsert({
    where: { tagId: "QR_JORDAN_001" },
    update: {},
    create: {
      tagId: "QR_JORDAN_001",
      label: "Wallet pass",
      isActive: true,
      employeeId: jordan.id,
    },
  });

  // Placeholder for an unrecognised tag (used in historical scan events below)
  await prisma.tag.upsert({
    where: { tagId: "QR_UNKNOWN_X" },
    update: {},
    create: {
      tagId: "QR_UNKNOWN_X",
      label: "Unknown / unregistered",
      isActive: false,
    },
  });

  console.log("Tags seeded.");

  // ── Attendance states (all start OUT) ─────────────────────────────────────

  for (const employee of [alexis, sam, jordan]) {
    await prisma.attendanceState.upsert({
      where: { employeeId: employee.id },
      update: {},
      create: {
        employeeId: employee.id,
        status: "OUT",
      },
    });
  }

  // ── Historical scan events ────────────────────────────────────────────────

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const makeTime = (hoursAgo: number) =>
    new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  const historicalEvents = [
    {
      tagId: "QR_ALEXIS_001",
      rawTagId: "QR_ALEXIS_001",
      deviceId: kioskDevice.id,
      employeeId: alexis.id,
      scannedAt: new Date(yesterday.setHours(9, 0, 0, 0)),
      outcome: ScanOutcome.ACCEPTED_IN,
    },
    {
      tagId: "QR_ALEXIS_001",
      rawTagId: "QR_ALEXIS_001",
      deviceId: kioskDevice.id,
      employeeId: alexis.id,
      scannedAt: new Date(yesterday.setHours(17, 30, 0, 0)),
      outcome: ScanOutcome.ACCEPTED_OUT,
    },
    {
      tagId: "QR_SAM_001",
      rawTagId: "QR_SAM_001",
      deviceId: kioskDevice.id,
      employeeId: sam.id,
      scannedAt: new Date(yesterday.setHours(9, 15, 0, 0)),
      outcome: ScanOutcome.ACCEPTED_IN,
    },
    {
      tagId: "QR_SAM_001",
      rawTagId: "QR_SAM_001",
      deviceId: kioskDevice.id,
      employeeId: sam.id,
      scannedAt: new Date(yesterday.setHours(9, 15, 10, 0)),
      outcome: ScanOutcome.DUPLICATE_IGNORED,
    },
    // An unrecognised QR seen recently
    {
      tagId: "QR_UNKNOWN_X",
      rawTagId: "QR_UNKNOWN_X",
      deviceId: manualDevice.id,
      employeeId: null,
      scannedAt: makeTime(3),
      outcome: ScanOutcome.UNKNOWN_TAG,
    },
  ];

  for (const event of historicalEvents) {
    await prisma.scanEvent.create({ data: event });
  }

  console.log("Historical scan events seeded.");
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
