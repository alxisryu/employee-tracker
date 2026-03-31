# Employee Tracker

SOC2-style office attendance and check-in system. Employees tap NFC tags on a reader; the system records who is in the office and maintains a full audit log.

**MVP status**: fully functional without hardware — use the web simulator or the Pi mock client to test all flows.

---

## Project structure

```
employee-tracker/
├── src/
│   ├── app/                    # Next.js App Router pages + REST routes
│   │   ├── api/scan/           # POST /api/scan — Pi REST endpoint
│   │   ├── api/trpc/           # tRPC HTTP handler
│   │   ├── dashboard/          # Live presence + recent scans
│   │   ├── employees/          # Employee CRUD + tag assignment
│   │   ├── devices/            # Device list + status
│   │   └── simulator/          # Manual scan form + unknown tags
│   ├── server/
│   │   ├── api/routers/        # tRPC routers (employee, tag, device, scan, dashboard)
│   │   ├── services/
│   │   │   ├── scan-ingestion.ts   # Core domain logic
│   │   │   ├── device-auth.ts      # Device authentication
│   │   │   └── tag-normalizer.ts   # Tag ID normalisation
│   │   └── db.ts               # Prisma client singleton
│   ├── components/ui/          # Shared UI components
│   ├── trpc/                   # tRPC React + server helpers
│   ├── lib/                    # Shared utilities (formatting)
│   └── env/                    # Environment variable validation
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Sample data
├── packages/
│   └── pi-client/              # Raspberry Pi scanner client
│       └── src/
│           ├── index.ts        # Entry point + debounce logic
│           ├── client.ts       # HTTP client with retry
│           ├── config.ts       # Env config
│           └── readers/
│               ├── interface.ts  # TagReader interface
│               ├── mock.ts       # MockTagReader (stdin)
│               └── nfc.ts        # NfcTagReader (stub + implementation plan)
├── docs/
│   └── architecture.md         # Domain model, scan flow, hardware plan
├── docker-compose.yml
└── .env.example
```

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres) — or a local Postgres 14+ instance

---

## Local setup

### 1. Clone and install

```bash
git clone <repo>
cd employee-tracker
pnpm install
```

### 2. Start Postgres

```bash
docker compose up -d
```

Or configure a local Postgres instance and update `DATABASE_URL`.

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env if needed — defaults work with docker-compose
```

Key env vars:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `ADMIN_SECRET` | Shared secret for admin tRPC procedures |
| `INTERNAL_API_SECRET` | Secret for MANUAL_UI device (web simulator) |
| `NEXT_PUBLIC_ADMIN_SECRET` | Same value as `ADMIN_SECRET` — sent by the browser |

> **Note on NEXT_PUBLIC_ADMIN_SECRET**: For MVP the admin secret is sent in every browser request. This is intentional for simplicity — replace with a proper session/cookie auth before exposing to the internet.

### 4. Push schema and seed

```bash
pnpm db:push      # create tables
pnpm db:seed      # insert sample employees, tags, devices, events
```

The seed output includes the **plain API keys** for seeded devices — copy these for the Pi client.

### 5. Run

```bash
pnpm dev
```

Open http://localhost:3000 — it redirects to the dashboard.

---

## Seeded data

| Resource | Details |
|----------|---------|
| Employees | Alexis Reed, Sam Patel, Jordan Kim |
| Tags | TAG_ALEXIS_001, TAG_SAM_001, TAG_JORDAN_001, TAG_UNKNOWN_X |
| Devices | `manual_ui` (web UI), `mock_cli_1` (mock), `front_door_1` (Pi placeholder) |
| Events | A handful of historical scans so the dashboard isn't empty |

---

## Simulating scans

### Option 1: Web UI simulator

Go to http://localhost:3000/simulator. Submit a tag ID and device, or click a quick-scan button for a seeded employee.

### Option 2: Pi mock client (CLI)

```bash
cp packages/pi-client/.env.example packages/pi-client/.env
# Set DEVICE_API_KEY to the value printed during pnpm db:seed
pnpm --filter @employee-tracker/pi-client dev
# Type tag IDs and press Enter
```

### Option 3: curl

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-cli-dev-key-1234" \
  -d '{"tagId":"TAG_ALEXIS_001","deviceId":"mock_cli_1"}'
```

---

## Adding a real NFC reader later

1. Set `MOCK_MODE=false` in `packages/pi-client/.env`
2. Implement `NfcTagReader.start()` in `packages/pi-client/src/readers/nfc.ts`
   - See the detailed plan in that file's comment block
   - Recommended library: `nfc-pcsc` for USB readers
3. Install system packages on Pi: `sudo apt-get install pcscd pcsc-tools`
4. Nothing else changes — same backend, same API, same audit log

---

## Pages

| Path | Description |
|------|-------------|
| `/dashboard` | Live presence count + recent scans (auto-refreshes every 10s) |
| `/employees` | Employee list, create, assign/remove tags |
| `/devices` | Device list + status |
| `/simulator` | Manual scan form, quick-scan buttons, unknown tag assignment |

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for:
- Domain model
- Scan flow diagram
- Attendance logic decision
- Security model
- Detailed hardware integration plan
