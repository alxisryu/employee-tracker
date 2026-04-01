# Kiosk — iPad Sign-In App

An Expo app for iPad that acts as a physical employee sign-in kiosk. Employees scan a QR code (Apple Wallet pass), tap "Sign in manually", or register as a guest.

## Tech stack

- Expo SDK 54, Expo Router (single `index` screen)
- React Native Reanimated 4 for all animations (no Moti)
- expo-camera for QR scanning
- react-hook-form + zod for form validation
- Dark-mode-only UI, landscape orientation

## Environment variables

Create `packages/kiosk/.env` (or set via EAS Secrets for production builds):

```
EXPO_PUBLIC_API_BASE_URL=https://your-backend.example.com
EXPO_PUBLIC_DEVICE_ID=ipad_kiosk_1
EXPO_PUBLIC_API_SECRET=your_internal_api_secret_here
```

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Base URL of the Next.js backend, no trailing slash |
| `EXPO_PUBLIC_DEVICE_ID` | Must match a `Device.name` row in the DB with `type = IPAD_KIOSK` |
| `EXPO_PUBLIC_API_SECRET` | Must match `INTERNAL_API_SECRET` in the backend `.env` |

## Backend setup

### 1. Create the IPAD_KIOSK device in the database

Run this in your backend's Prisma Studio or via a seed script:

```sql
INSERT INTO "Device" (id, name, type, "isActive", "apiKeyHash", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'ipad_kiosk_1', 'IPAD_KIOSK', true, NULL, now(), now());
```

Or with Prisma Client:

```typescript
await prisma.device.create({
  data: {
    name: 'ipad_kiosk_1',
    type: 'IPAD_KIOSK',
    isActive: true,
  },
});
```

The device uses `INTERNAL_API_SECRET` for auth (same as `MANUAL_UI` devices) — no per-device bcrypt key needed.

### 2. Available API endpoints

| Endpoint | Description |
|---|---|
| `POST /api/scan-employee` | QR / manual sign-in by employee CUID or email |
| `POST /api/guest-signin` | Guest visit logging (stdout only until a GuestVisit table is added) |

## QR code format

Encode any of these in your Apple Wallet pass:

| Format | Example |
|---|---|
| Raw CUID | `clxxxxxxxxxxxxxxxxxxxxxxx` |
| Raw UUID | `550e8400-e29b-41d4-a716-446655440000` |
| JSON | `{"employeeUuid":"clxxx..."}` |
| URL query param | `https://yourapp.com/checkin?employeeUuid=clxxx...` |
| URL path segment | `https://yourapp.com/employee/clxxx.../checkin` |

The recommended approach is to encode the employee's CUID directly. The `qr-parser.ts` utility normalises all formats into a single `employeeUuid` string before submitting.

## Running the app

```bash
# From the monorepo root
pnpm install

# Start the dev server
cd packages/kiosk
pnpm start

# Run on a connected iPad
pnpm ios
```

For a production kiosk build use EAS Build:

```bash
eas build --platform ios --profile production
```

## Screen flow

```
idle  --(QR scan)--> processing --(success)--> success --(3s)--> idle
  |                      |
  +--(manual btn)--> manual      +--(error)---> error --(25s)--> idle
  +--(guest btn)---> guest
```

- **Idle**: Camera active, shows "Scan your pass" with secondary buttons.
- **Processing**: Fires the API call; shows spinner. Auto-transitions to success or error.
- **Success**: Haptic notification, employee name displayed. Auto-resets after 3 s.
- **Error**: Categorised error message (network / backend / unknown). Auto-resets after 25 s. Manual sign-in escape hatch available.
- **Manual**: Email or employee ID form with 75 s inactivity timeout.
- **Guest**: Full guest registration form with 75 s inactivity timeout.

## Assumptions and trade-offs

- **No Moti**: Animations use Reanimated 4 directly (`useSharedValue`, `withTiming`, `withSpring`, etc.) since Moti has not been updated for Reanimated 4.
- **Guest visits not persisted**: `POST /api/guest-signin` logs to stdout. A `GuestVisit` Prisma model and migration are needed for real persistence.
- **Virtual QR tags**: `ingestByEmployeeId` upserts a `Tag` row with `tagId = QR_<employeeId>` so the `ScanEvent` FK constraint is satisfied without a schema change. This tag is inert to NFC flows.
- **IPAD_KIOSK auth**: Uses the same `INTERNAL_API_SECRET` as `MANUAL_UI`. For production you may want per-device bcrypt keys (the existing PI_READER flow) and key rotation.
- **Landscape only**: `app.json` sets `orientation: landscape`. Tested on iPad Pro 12.9" layout. You may need to adjust `paddingHorizontal` for smaller iPad models.
