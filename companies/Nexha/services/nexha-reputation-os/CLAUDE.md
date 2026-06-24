# nexha-reputation-os — ReputationOS (ACI Scoring Engine)

> **Port:** 4271
> **Version:** 0.1.0
> **Layer:** 4 (Nexha network services)
> **Status:** ✅ **PRODUCTION-READY MVP** — 23/23 tests pass, builds clean.

---

## What it is

**The ACI (Autonomous Commerce Index) scoring engine for the Nexha federation.** Ingests reputation signals (transactions, disputes, endorsements, verifications, risk events) and computes a single **0-1000 score** per Nexha, agent, merchant, or other entity.

This is the **trust backbone** of the Global Nexha network — every cross-Nexha transaction, federation handshake, and capability match uses the ACI score to decide whether to trust a counterparty.

---

## ACI Score (0-1000)

| Score range | Band | Badge |
|---|---|---|
| 900-1000 | **platinum** | 🏆 |
| 800-899 | **gold** | ⭐ |
| 700-799 | **silver** | 🥈 |
| 500-699 | **bronze** | 🥉 |
| 300-499 | **iron** | ⚙️ |
| 0-299 | **restricted** | ⚠️ |

Base score = **500** (neutral). Signals push the score up or down. Dimensions are **capped** to prevent gaming.

---

## Scoring Dimensions

```
Base ACI: 500

+ Transactions  : ±300  (success +10/failure -15, capped)
+ Disputes      : ±200  (raised -5, resolved_in_favor +20, resolved_against -25)
+ Endorsements  : +200  (received +8, given +2)
+ Verifications : +150  (KYC +50, business +60)
+ Risk events   : -150  (low -3, medium -10, high -30, critical -75)
+ Compliance    : -150  (violation -50)

= Final ACI (clamped 0-1000)
```

All signal weights can be customized per ingest via the `weight` parameter.

---

## Signal Kinds (14)

| Kind | Direction | Weight |
|---|---|---|
| `transaction_success` | + | +10 |
| `transaction_failure` | - | -15 |
| `dispute_raised` | - | -5 |
| `dispute_resolved_in_favor` | + | +20 |
| `dispute_resolved_against` | - | -25 |
| `endorsement_received` | + | +8 |
| `endorsement_given` | + | +2 |
| `verification_kyc` | + | +50 |
| `verification_business` | + | +60 |
| `risk_event_low` | - | -3 |
| `risk_event_medium` | - | -10 |
| `risk_event_high` | - | -30 |
| `risk_event_critical` | - | -75 |
| `compliance_violation` | - | -50 |

---

## Subject Types

ACI scores can be computed for any of these:
- `nexha` — federation participants
- `agent` — SUTAR agents
- `merchant` — sellers
- `user` — consumers
- `asset` — products, capabilities, listings
- `service` — services

---

## Quick Start

```bash
cd companies/Nexha/services/nexha-reputation-os
npm install
npm run build
PORT=4271 node dist/index.js
# → Listening on :4271
```

```bash
# Health
curl http://localhost:4271/health

# Get a score
curl http://localhost:4271/api/v1/scores/nexha-maya-collective

# Ingest a signal
curl -X POST http://localhost:4271/api/v1/ingest \
  -H 'Content-Type: application/json' \
  -d '{
    "subjectId": "agent-maya-merchant",
    "subjectType": "agent",
    "signal": {
      "kind": "transaction_success",
      "weight": 1,
      "amount": 1500,
      "counterpartyId": "buyer-x",
      "occurredAt": "2026-06-24T10:00:00Z"
    }
  }'

# Query scores by band
curl 'http://localhost:4271/api/v1/scores?band=gold&limit=20'

# Get signal log for a subject
curl http://localhost:4271/api/v1/scores/nexha-maya-collective/signals

# Federation stats
curl http://localhost:4271/api/v1/stats
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health + counts |
| `GET` | `/ready` | Readiness probe |
| `GET` | `/api/v1/info` | Service metadata |
| `POST` | `/api/v1/ingest` | **Ingest a reputation signal** |
| `GET` | `/api/v1/scores/:subjectId` | **Get one score** |
| `GET` | `/api/v1/scores` | **Query scores** (filters: subjectId, subjectType, minAci, maxAci, band, limit, offset) |
| `GET` | `/api/v1/scores/:subjectId/signals` | Get signal log |
| `GET` | `/api/v1/scores/:subjectId/signals/:kind` | Filter signals by kind |
| `GET` | `/api/v1/stats` | **Federation-wide stats** |
| `GET` | `/rez-intel-status` | REZ Intelligence health |
| `POST` | `/api/enrich` | REZ Intelligence enrichment (graceful) |

---

## Architecture

```
nexha-reputation-os (port 4271)
├── src/
│   ├── index.ts                       # Express server entry
│   ├── types/
│   │   └── index.ts                   # ReputationScore, ReputationSignal, TrustBand, etc.
│   └── services/
│       └── reputationService.ts       # ACI scoring engine + ingest + query + stats
├── __tests__/unit/
│   └── reputationService.test.ts      # 23 tests
├── dist/                              # Compiled output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Storage:** In-memory `Map<subjectId, ReputationScore>` + `Map<subjectId, ReputationSignal[]>`. Can be swapped for Postgres / Redis Streams without changing the API.

**Auth:** Optional JWT via dynamic `@rtmn/shared/auth` import. Set `REPUTATION_OS_REQUIRE_AUTH=false` to disable in dev.

**REZ Intelligence:** Wired (`/rez-intel-status` + `/api/enrich`). Gracefully degrades when REZ Intel is unreachable.

---

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | 4271 | Service port |
| `REPUTATION_OS_REQUIRE_AUTH` | `true` | Set to `false` to disable JWT auth in dev |
| `REZ_INTEL_URL` | `http://localhost:5370` | REZ Intelligence URL |
| `REZ_INTEL_ENABLED` | `true` | Set to `false` to disable REZ Intel wiring |
| `REZ_INTEL_TIMEOUT_MS` | `3000` | REZ Intel request timeout |

---

## Tests

23 unit tests covering:
- Seeding (idempotent + correct band derivation)
- Ingest + recompute (transactions, failures, verifications, risk events)
- Composite signals (balanced score)
- Bands (platinum at 900+, restricted at <300, bronze default at 500)
- Queries (filter by subjectType, band, minAci)
- Pagination (limit + offset)
- Signal retrieval + kind filtering
- Federation stats (totals, byBand, bySubjectType, topPerformers)
- Versioning (increments on each ingest)
- SignalCount accuracy

```bash
npm test
# ✓ 23 tests pass
```

---

## Build

```bash
npm install
npm run build    # tsc → dist/
npm start        # node dist/index.js
npm run dev      # tsx watch src/index.ts
```

---

## Files

```
nexha-reputation-os/
├── CLAUDE.md                # This file
├── package.json             # @nexha/reputation-os@0.1.0
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── index.ts             # Express server
│   ├── types/index.ts       # Type definitions
│   └── services/
│       └── reputationService.ts  # ACI scoring engine
├── __tests__/unit/
│   └── reputationService.test.ts # 23 tests
└── dist/                    # Built output
```

---

## Use Cases

**Cross-Nexha transaction trust check:**
```ts
const trust = await fetch('http://localhost:4271/api/v1/scores/nexha-counterparty');
const { aci, band } = await trust.json();
if (aci < 500) throw new Error('Trust too low');
```

**Auto-block high-risk actors:**
```ts
const score = await fetch('http://localhost:4271/api/v1/scores/agent-x');
if ((await score.json()).band === 'restricted') {
  // block this agent from federation
}
```

**Federation leaderboard:**
```ts
const top = await fetch('http://localhost:4271/api/v1/scores?minAci=700&limit=20');
```

**Bulk risk ingestion (after a security incident):**
```ts
for (const offender of offenders) {
  await fetch('http://localhost:4271/api/v1/ingest', {
    method: 'POST',
    body: JSON.stringify({
      subjectId: offender,
      subjectType: 'nexha',
      signal: { kind: 'compliance_violation', weight: 1, occurredAt: new Date().toISOString() }
    })
  });
}
```

---

## Integration Points

- **CapabilityOS** (port 4270) — pre-flight trust check before cross-Nexha capability match
- **nexha-business-directory** (port 4360) — surface ACI alongside company listings
- **agent-reputation** (HOJAI-AI) — sub-scores for agent-specific signals
- **SADA** (HOJAI-AI) — trust verification proofs (KYC, business)
- **dispute-resolution** — emits `dispute_raised`, `dispute_resolved_in_favor/against` signals
- **risk-detection-service** — emits `risk_event_low/medium/high/critical` signals
- **Trust Bootstrap journey** (Phase 1 of 40-phase plan) — uses ReputationOS for early trust signals

---

*Built as part of Phase E (Reputation Flywheel) and Phase D-I roadmap (40-phase plan, item #3: ReputationOS v0.1).*