# genie-accounts — Connected Accounts (C9)

> **"Connect Gmail, Calendar, Photos, Health, Banking — Genie becomes yours."**
> 10 OAuth-style provider stubs. Real OAuth is out of scope for Phase A;
> the flow is mocked to demonstrate the integration shape and produce
> believable sample data that downstream specialists can consume.

| Aspect | Value |
|---|---|
| **Service name** | `genie-accounts` |
| **Port** | `4736` |
| **Category** | C9 — Connected Accounts (Phase C moat) |
| **Status** | ✅ Production-ready (mocked OAuth) |
| **Auth** | Bearer JWT + `x-internal-token` |
| **Persistence** | JSON-file store: `account-connections` |
| **Owner** | HOJAI-AI / genie product line |

## Quick start

```bash
npm install
JWT_SECRET=test PORT=4736 INTERNAL_SERVICE_TOKEN=demo node src/index.js
bash tests/smoke.sh
node tests/accounts-readiness.test.mjs
```

## Supported providers (10)

| Provider | Category | Sample data |
|---|---|---|
| **google_calendar** | productivity | events list with attendees |
| **gmail** | productivity | unread count + recent subjects |
| **google_photos** | media | recent photos + count this week |
| **apple_health** | health | steps, sleep, HR, workouts |
| **apple_photos** | media | photos + favorite this month |
| **bank_plaid** | finance | accounts + balances + transaction count |
| **contacts** | social | total + recent |
| **slack** | work | unread + channels |
| **github** | work | username + public repos + last commit |
| **notion** | productivity | page count + recent |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/accounts/providers` | List all 10 providers |
| GET | `/accounts/list/:userId` | List connected accounts (with providerMeta) |
| POST | `/accounts/connect/:userId/:provider` | Initiate OAuth (mocked — sets connected immediately) |
| POST | `/accounts/disconnect/:userId/:provider` | Disconnect |
| GET | `/accounts/data/:userId/:provider` | Fetch sample data from connected provider |
| POST | `/accounts/sync/:userId/:provider` | Trigger sync (updates lastSync) |

## Why C9 matters

Genie without your data is just a chatbot. With it, it's *yours*:

- **Calendar** → briefings include your next event
- **Health** → wellness screen shows real sleep/steps
- **Banking** → finance screen has real balances
- **Photos** → life replay can pull real memories
- **Contacts** → relationships screen has real names
- **GitHub** → founder dashboard shows real shipping velocity

The 10 providers cover the "first 80%" of personal data sources.
Each one enables multiple downstream specialists.

## Architecture

```
genie-accounts (4736)
├── src/index.js                       # Express + PersistentMap + seed
└── src/routes/accounts.js             # providers, list, connect, disconnect, data, sync
        │
        ├─→ @rtmn/shared/auth          # Bearer JWT (CorpID-backed)
        ├─→ @rtmn/shared/lib/genie-readiness  # installReadinessRoutes + autoSeed
        └─→ PersistentMap              # JSON-file-backed store
              └── account-connections/ # per-user connection records
```

## Seed data (Phase A)

2 connected accounts for `user-001`:
- `acc-google-001` — Google Calendar (30 days, last sync 1h ago)
- `acc-health-001` — Apple Health (14 days, last sync 30min ago)

## Tests

| Suite | File | Assertions | Status |
|---|---|---|---|
| Readiness (Node, in-process) | `tests/accounts-readiness.test.mjs` | 26 | ✅ |
| Smoke (curl) | `tests/smoke.sh` | 6 checks | ✅ |

## Roadmap (future)

- [ ] Real OAuth flows for top 5 providers (Gmail, Calendar, Health, Photos, Plaid)
- [ ] Background sync jobs (cron) — auto-pull fresh data every N hours
- [ ] Per-scope granular consent (e.g. "calendar.readonly only")
- [ ] Token refresh + revocation handling
- [ ] Read-only audit log of every API call Genie makes on the user's behalf

## Related

- `genie-briefing` — pulls from calendar + email
- `genie-finance` — pulls from bank_plaid
- `genie-wellness` — pulls from apple_health
- Web UI: `genie-os/frontend/web/src/screens/AccountsScreen.tsx`
