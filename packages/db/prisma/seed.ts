/**
 * Seed script: creates sample employees, tags, devices, and some
 * historical scan events to populate the dashboard for development and testing.
 *
 * To run:  pnpm db:seed
 */

import { PrismaClient, ScanOutcome, DeviceType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Devices ──────────────────────────────────────────────────────────────

  // The MANUAL_UI device has no API key — authenticated via INTERNAL_API_SECRET.
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

  // Mock CLI device for testing without hardware.
  const mockCliKeyPlain = "mock-cli-dev-key-1234";
  const mockCliDevice = await prisma.device.upsert({
    where: { name: "mock_cli_1" },
    update: {},
    create: {
      name: "mock_cli_1",
      location: "Dev machine (mock)",
      type: DeviceType.MOCK,
      isActive: true,
      apiKeyHash: await bcrypt.hash(mockCliKeyPlain, 10),
    },
  });

  // iPad kiosk at the front door.
  const kioskKeyPlain = "kiosk-front-door-dev-key-9012";
  const kioskDevice = await prisma.device.upsert({
    where: { name: "kiosk_front_door" },
    update: {},
    create: {
      name: "kiosk_front_door",
      location: "Main entrance",
      type: DeviceType.IPAD_KIOSK,
      isActive: true,
      apiKeyHash: await bcrypt.hash(kioskKeyPlain, 10),
    },
  });

  console.log("Devices seeded.");
  console.log(`  mock_cli_1         plain API key: ${mockCliKeyPlain}`);
  console.log(`  kiosk_front_door   plain API key: ${kioskKeyPlain}`);
  console.log("  (Store these in your .env — they are shown once only)");

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

  // ── Tags (QR wallet tokens) ───────────────────────────────────────────────

  // Each employee gets a QR wallet token (UUID-derived, uppercase, no hyphens).
  // These are the tagIds stored in the Tag table and encoded in wallet passes.
  const alexisToken = "A1B2C3D4E5F64A5B8C9D0E1F2A3B4C5D";
  const samToken    = "B2C3D4E5F6A74B5C9D0E1F2A3B4C5D6E";
  const jordanToken = "C3D4E5F6A7B84C5D0E1F2A3B4C5D6E7F";

  await prisma.tag.upsert({
    where: { tagId: alexisToken },
    update: {},
    create: {
      tagId: alexisToken,
      isActive: true,
      passType: "QR_WALLET",
      passIssuedAt: new Date(),
      employeeId: alexis.id,
    },
  });

  await prisma.tag.upsert({
    where: { tagId: samToken },
    update: {},
    create: {
      tagId: samToken,
      isActive: true,
      passType: "QR_WALLET",
      passIssuedAt: new Date(),
      employeeId: sam.id,
    },
  });

  await prisma.tag.upsert({
    where: { tagId: jordanToken },
    update: {},
    create: {
      tagId: jordanToken,
      isActive: true,
      passType: "QR_WALLET",
      passIssuedAt: new Date(),
      employeeId: jordan.id,
    },
  });

  // An unassigned tag — produces UNKNOWN_TAG outcomes until assigned.
  await prisma.tag.upsert({
    where: { tagId: "TAG_UNKNOWN_X" },
    update: {},
    create: {
      tagId: "TAG_UNKNOWN_X",
      label: null,
      isActive: true,
      employeeId: null,
    },
  });

  console.log("Tags (QR wallet tokens) seeded.");

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
      tagId: alexisToken,
      rawTagId: alexisToken,
      deviceId: kioskDevice.id,
      employeeId: alexis.id,
      scannedAt: new Date(yesterday.setHours(9, 0, 0, 0)),
      outcome: ScanOutcome.ACCEPTED_IN,
    },
    {
      tagId: alexisToken,
      rawTagId: alexisToken,
      deviceId: kioskDevice.id,
      employeeId: alexis.id,
      scannedAt: new Date(yesterday.setHours(17, 30, 0, 0)),
      outcome: ScanOutcome.ACCEPTED_OUT,
    },
    {
      tagId: samToken,
      rawTagId: samToken,
      deviceId: kioskDevice.id,
      employeeId: sam.id,
      scannedAt: new Date(yesterday.setHours(9, 15, 0, 0)),
      outcome: ScanOutcome.ACCEPTED_IN,
    },
    {
      tagId: samToken,
      rawTagId: samToken,
      deviceId: kioskDevice.id,
      employeeId: sam.id,
      scannedAt: new Date(yesterday.setHours(9, 15, 10, 0)),
      outcome: ScanOutcome.DUPLICATE_IGNORED,
    },
    {
      tagId: "TAG_UNKNOWN_X",
      rawTagId: "TAG_UNKNOWN_X",
      deviceId: mockCliDevice.id,
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
