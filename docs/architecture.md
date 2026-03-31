# Architecture Notes

## Domain model

```
Employee  1──*  Tag
Employee  1──1  AttendanceState
Tag       1──*  ScanEvent
Device    1──*  ScanEvent
```

An **Employee** is a person. They can hold one or more physical NFC tags/fobs.

A **Tag** maps a physical object's UID to an employee. Tags can be unassigned (employeeId null) — these produce UNKNOWN_TAG outcomes until assigned.

A **Device** is a scanner endpoint. Each deployed Pi has one row. The web UI simulator is also a device (type MANUAL_UI). Device rows carry a bcrypt-hashed API key for PI_READER and MOCK devices.

A **ScanEvent** is an immutable audit record of every scan attempt, regardless of outcome. Never delete these — they are the audit log.

An **AttendanceState** is the materialised current presence per employee (IN/OUT). Updated transactionally when an ACCEPTED_IN or ACCEPTED_OUT outcome occurs.

---

## Scan flow

```
[Source] ──raw tagId──▶ [Ingestion] ──normalised──▶ [Domain logic] ──▶ [DB]
  - Web UI form             POST /api/scan             tag lookup         ScanEvent (append)
  - Mock CLI                tRPC ingestManual          employee lookup    AttendanceState (upsert)
  - Pi NFC reader                                      dupe check
                                                       state transition
```

Every scan attempt results in exactly one `ScanOutcome` value stored in `ScanEvent.outcome`.

---

## Attendance model — "toggle with debounce"

Chosen over simpler "first scan = IN, no toggle" because the office has a single reader at the door (no separate exit reader):

| Condition | Outcome |
|-----------|---------|
| Tag unknown | `UNKNOWN_TAG` |
| Tag inactive | `INACTIVE_TAG` |
| Employee inactive | `INACTIVE_EMPLOYEE` |
| Same tag within 30s of last scan | `DUPLICATE_IGNORED` |
| Employee currently OUT | `ACCEPTED_IN` |
| Employee currently IN | `ACCEPTED_OUT` |

The **30-second duplicate window** absorbs accidental double-taps. After 30s, a second scan toggles the state. This is documented explicitly so operators know the expected behaviour.

**Trade-off**: toggle model can drift if someone scans without entering (e.g. accidentally while walking past). For a SOC2-style system you will want periodic manual reconciliation or an explicit "check-out all" end-of-day operation. The audit log always has the ground truth.

---

## Tag ID normalisation

Function: `src/server/services/tag-normalizer.ts`

Rules applied in order:
1. Trim leading/trailing whitespace
2. Uppercase
3. Collapse internal whitespace to `_`
4. Remove hyphens

So `"04-a3-b2 11 22"` → `"04A3B21122"`.

UID format for real NFC hardware: concatenate hex bytes without separators, e.g. a 7-byte UID `04:A3:B2:11:22:33:44` becomes `04A3B211223344`.

---

## API design

Two ingestion surfaces:

### POST /api/scan (REST)
Used by Pi clients. Simpler to call from non-browser environments (curl, Python, etc.). Authentication: `Authorization: Bearer <device_api_key>`.

### tRPC `scan.ingestManual`
Used by the web UI simulator. Same domain logic, different auth (admin secret header).

Both paths call the same `ingestScan()` service function. The only difference is the auth mechanism and how the device row is resolved.

---

## Security model (MVP)

| Concern | MVP approach | Production upgrade |
|---------|-------------|-------------------|
| Admin UI auth | `x-admin-secret` header | NextAuth session |
| Pi device auth | Per-device bcrypt API key | Rotate keys + mTLS |
| API key storage | bcrypt hash in DB | Key management service |
| Transport | HTTP (dev), HTTPS (deploy) | HTTPS + cert pinning on Pi |

---

## Future hardware integration

### Pi-side service startup

On Raspberry Pi OS:
```bash
# Install pcscd for USB NFC readers
sudo apt-get install pcscd pcsc-tools

# Or for I2C PN532
sudo raspi-config  # enable I2C
sudo apt-get install libnfc-dev
```

### plugging in NfcTagReader

In `packages/pi-client/src/index.ts`, the only change needed:

```diff
- const reader: TagReader = config.mockMode ? new MockTagReader() : new NfcTagReader();
+ // NfcTagReader is now fully implemented — MOCK_MODE=false in .env
```

Then implement the body of `NfcTagReader.start()` using `nfc-pcsc` (see the detailed plan in `packages/pi-client/src/readers/nfc.ts`).

### Provisioning a new Pi

1. Create a Device row: `INSERT INTO devices (name, location, type, api_key_hash) VALUES (...)`
2. Generate a random API key: `openssl rand -hex 32`
3. Hash it: `bcrypt.hash(key, 10)`
4. Store the hash in the DB row
5. Set `DEVICE_API_KEY=<plain_key>` in `/etc/pi-client/.env` on the Pi
6. Run the service (systemd unit file example in `packages/pi-client/`)

### Offline resilience (stretch)

When the Pi cannot reach the backend:
1. Write failed scans to `/var/lib/pi-client/queue.jsonl`
2. Background retry loop reads from queue and resubmits
3. On success, remove from queue
4. Backend handles duplicates — safe to replay
