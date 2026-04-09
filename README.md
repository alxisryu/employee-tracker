# Employee Tracker

Office attendance system built for Lyra. Employees scan a QR code on an iPad kiosk at the entrance. The system records who's in, maintains a full audit log, and exposes a dashboard for admins to review.

---

## How it works

The iPad kiosk is the core of the system. It runs a fullscreen Expo app mounted at the office entrance. Employees scan their personal QR code (delivered via Apple/Google Wallet) and the kiosk records the check-in. The admin dashboard is a secondary web interface for reviewing attendance, managing employees, and configuring devices.

---

## Project structure

```
employee-tracker/
├── apps/
│   ├── web/               # Employee-facing web app
│   └── admin/             # Admin dashboard (Next.js)
│       ├── dashboard/     # Live presence + recent scans
│       ├── employees/     # Employee management + QR assignment
│       ├── devices/       # Device list + status
│       ├── reports/       # Attendance reports
│       └── simulator/     # Manual scan form for testing
├── packages/
│   ├── api/               # tRPC routers + business logic
│   ├── db/                # Prisma schema + migrations
│   ├── kiosk/             # iPad kiosk app (Expo)
│   ├── passes/            # Apple/Google Wallet pass generation
│   └── shared/            # Shared types and utilities
├── docker-compose.yml
└── .env.example
```

---

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for Postgres) or a local Postgres 14+ instance
- Expo Go or a physical iPad for the kiosk app

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

### 3. Configure environment

```bash
cp .env.example .env
# Fill in the required values — see .env.example for descriptions
```

### 4. Push schema and seed

```bash
pnpm db:push    # create tables
pnpm db:seed    # insert sample employees, QR tags, and devices
```

The seed output prints the plain API keys for seeded devices — you'll need these for the kiosk.

### 5. Run

```bash
pnpm dev
```

Admin dashboard: http://localhost:3000  
Kiosk app: run via Expo (`packages/kiosk`)

---

## iPad kiosk

The kiosk app is an Expo app designed to run in landscape on an iPad. It uses the device camera to scan QR codes and posts check-ins to the API.

```bash
cd packages/kiosk
pnpm install
pnpm start
```

Set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_API_SECRET` in `packages/kiosk/.env` before running.

---

## Simulating scans (without hardware)

### Option 1: Web simulator

Go to http://localhost:3000/simulator — submit a QR tag ID manually or use the quick-scan buttons.

### Option 2: curl

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-cli-dev-key-1234" \
  -d '{"tagId":"A1B2C3D4E5F64A5B8C9D0E1F2A3B4C5D","deviceId":"kiosk_front_door"}'
```

---

## Seeded data

| Resource | Details |
|----------|---------|
| Employees | Alexis Reed, Sam Patel, Jordan Kim |
| Devices | `manual_ui` (web UI), `kiosk_front_door` (kiosk) |
| QR tags | One per employee, linked to Wallet passes |

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for the domain model, scan flow, and security model

