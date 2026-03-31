/**
 * Seed script: creates sample employees, tags, devices, and some
 * historical scan events to populate the dashboard for MVP development and testing.
 *
 * To run:  pnpm db:seed
 */

import { PrismaClient, ScanOutcome, DeviceType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Devices ──────────────────────────────────────────────────────────────

  // The MANUAL_UI device has no API key — it is authenticated via
  // INTERNAL_API_SECRET env var in the ingestion endpoint.
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

  // The mock CLI device used by the pi-client in MOCK_MODE.
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

  // A placeholder for the future physical Pi at the front door.
  const frontDoorKeyPlain = "front-door-dev-key-5678";
  const frontDoorDevice = await prisma.device.upsert({
    where: { name: "front_door_1" },
    update: {},
    create: {
      name: "front_door_1",
      location: "Main entrance",
      type: DeviceType.PI_READER,
      isActive: true,
      apiKeyHash: await bcrypt.hash(frontDoorKeyPlain, 10),
    },
  });

  console.log("Devices seeded.");
  console.log(`  mock_cli_1   plain API key: ${mockCliKeyPlain}`);
  console.log(`  front_door_1 plain API key: ${frontDoorKeyPlain}`);
  console.log("  (Store these in your .env for the pi-client — they are shown once only)");

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

  // ── Tags ─────────────────────────────────────────────────────────────────

  // Tags are stored in their normalised form (uppercase, trimmed).
  await prisma.tag.upsert({
    where: { tagId: "TAG_ALEXIS_001" },
    update: {},
    create: {
      tagId: "TAG_ALEXIS_001",
      label: "Main card",
      isActive: true,
      employeeId: alexis.id,
    },
  });

  await prisma.tag.upsert({
    where: { tagId: "TAG_SAM_001" },
    update: {},
    create: {
      tagId: "TAG_SAM_001",
      label: "Main card",
      isActive: true,
      employeeId: sam.id,
    },
  });

  await prisma.tag.upsert({
    where: { tagId: "TAG_JORDAN_001" },
    update: {},
    create: {
      tagId: "TAG_JORDAN_001",
      label: "Main card",
      isActive: true,
      employeeId: jordan.id,
    },
  });

  // An unassigned tag — will produce UNKNOWN_TAG outcomes until assigned.
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

  // These are synthetic past events so the "recent scans" table is not empty.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const makeTime = (hoursAgo: number) =>
    new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  const historicalEvents = [
    // Alexis arrived yesterday morning
    {
      tagId: "TAG_ALEXIS_001",
      rawTagId: "TAG_ALEXIS_001",
      deviceId: frontDoorDevice.id,
      employeeId: alexis.id,
      scannedAt: new Date(yesterday.setHours(9, 0, 0, 0)),
      outcome: ScanOutcome.ACCEPTED_IN,
    },
    // Alexis left yesterday afternoon
    {
      tagId: "TAG_ALEXIS_001",
      rawTagId: "TAG_ALEXIS_001",
      deviceId: frontDoorDevice.id,
      employeeId: alexis.id,
      scannedAt: new Date(yesterday.setHours(17, 30, 0, 0)),
      outcome: ScanOutcome.ACCEPTED_OUT,
    },
    // Sam arrived yesterday
    {
      tagId: "TAG_SAM_001",
      rawTagId: "TAG_SAM_001",
      deviceId: frontDoorDevice.id,
      employeeId: sam.id,
      scannedAt: new Date(yesterday.setHours(9, 15, 0, 0)),
      outcome: ScanOutcome.ACCEPTED_IN,
    },
    // Sam duplicate within cooldown (ignored)
    {
      tagId: "TAG_SAM_001",
      rawTagId: "TAG_SAM_001",
      deviceId: frontDoorDevice.id,
      employeeId: sam.id,
      scannedAt: new Date(yesterday.setHours(9, 15, 10, 0)),
      outcome: ScanOutcome.DUPLICATE_IGNORED,
    },
    // Unknown tag seen recently
    {
      tagId: "TAG_UNKNOWN_X",
      rawTagId: "tag_unknown_x", // intentionally un-normalised to show normalisation works
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
