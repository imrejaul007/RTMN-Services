# nexha-opportunity-os — OpportunityOS (Federation Demand-Side Broker)

> **Port:** 4274
> **Version:** 0.1.0
> **Layer:** 4 (Nexha network services)
> **Status:** ✅ **PRODUCTION-READY MVP** — 27/27 tests pass, builds clean.

---

## What it is

**The federation's demand-side broker.** OpportunityOS matches inbound opportunities (buyers posting RFQs, jobs, subscriptions, etc.) with the best-fit capabilities across the federation. The output is a **ranked list of candidate Nexhas** that could fulfill each opportunity, with trust-aware scoring.

This is the **demand-side counterpoint to DiscoveryOS**:
- **DiscoveryOS** (port 4272) — "What's out there? Find me a capability" (supply-side search)
- **OpportunityOS** (port 4274) — "I need X. Who can deliver it?" (demand-side matching)

Together they form the **full federation marketplace loop**.

---

## The Federation Loop

```
┌─────────────┐
│Buyer Nexha  │ posts demand
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  OpportunityOS   │ matches opportunity → capabilities
│   port 4274      │
└──────┬───────────┘
       │ queries
       ▼
┌──────────────────┐
│  CapabilityOS    │ what each Nexha offers
│   port 4270      │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  ReputationOS    │ trust filter
│   port 4271      │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  FederationOS    │ only active members
│   port 4273      │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│DiscoveryOS       │ ranked results
│   port 4272      │
└──────────────────┘
```

---

## Matching Algorithm

```
matchScore (0-1) =
  + 0.40  if any required category matches
  + 0.30  × Jaccard tag overlap (capped at 0.30)
  + 0.15  × free-text hits / 3 (saturate)
  + 0.05  if region matches
  + 0.05  if language matches
  + 0.05  if verified

finalScore = matchScore × (1 + trustBoost × ACI/1000)

# Default trustBoost = 0.3
# platinum (ACI=900-1000) → +27% to +30% boost
# silver (ACI=700-799)   → +21% to +24% boost
# restricted (ACI<300)   → <9% boost (still scored)
```

Plus **budget fit** assessment: `under` (capability much cheaper), `within` (similar range), `over` (capability much more expensive), `unknown` (different currency or quote-based).

---

## Opportunity Kinds

| Kind | Description | Example |
|---|---|---|
| `rfq` | Request for Quote | "Bulk T-Shirt Procurement 50K units" |
| `job` | One-off project | "B2C Same-Day Delivery Mumbai Pilot" |
| `subscription` | Recurring need | "Cross-Border Tax Advisory Monthly" |
| `partnership` | Strategic partnership | "Long-term Logistics Alliance" |
| `data-request` | Data feed / query | "Real-Time Commodity Price Feed" |
| `support` | Customer support ticket | "Help integrate Stripe" |
| `integration` | API/tech integration | "Connect to our ERP via webhook" |

---

## Quick Start

```bash
cd companies/Nexha/services/nexha-opportunity-os
npm install
npm run build
PORT=4274 node dist/index.js
# → Listening on :4274
```

```bash
# Health
curl http://localhost:4274/health

# Post a new opportunity
curl -X POST http://localhost:4274/api/v1/opportunities \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Need AI agents for our commerce ops",
    "description": "Looking for 5 SUTAR agents to power our Q3 commerce rollout",
    "kind": "job",
    "requiredCategories": ["agent"],
    "requiredTags": ["commerce", "sutar", "negotiation"],
    "region": "US",
    "budget": { "amount": 50000, "currency": "USD", "type": "fixed" },
    "priority": "high",
    "postedByNexhaId": "nexha-acme-commerce"
  }'

# Match a specific opportunity
curl -X POST http://localhost:4274/api/v1/opportunities/opp-fashion-rfq-001/match \
  -H 'Content-Type: application/json' \
  -d '{"trustBoost": 0.3}'

# Match all open opportunities
curl -X POST http://localhost:4274/api/v1/match \
  -H 'Content-Type: application/json' \
  -d '{"trustBoost": 0.5}'

# Federation stats
curl http://localhost:4274/api/v1/stats
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health + counts |
| `GET` | `/ready` | Readiness probe |
| `GET` | `/api/v1/info` | Service metadata |
| `POST` | `/api/v1/opportunities` | **Post a new opportunity** |
| `GET` | `/api/v1/opportunities` | List (filters: kind, status, postedByNexhaId, priority) |
| `GET` | `/api/v1/opportunities/:id` | Get one |
| `PATCH` | `/api/v1/opportunities/:id` | Update |
| `POST` | `/api/v1/opportunities/:id/bid` | Increment bid count |
| `POST` | `/api/v1/opportunities/:id/match` | **Match one opportunity** |
| `POST` | `/api/v1/match` | **Match all open opportunities** |
| `GET` | `/api/v1/stats` | Federation-wide stats |
| `GET` | `/rez-intel-status` | REZ Intelligence health |
| `POST` | `/api/enrich` | REZ Intelligence enrichment (graceful) |

---

## Demo Federation

6 seed opportunities across 4 open + 1 in-progress + 1 closed, mirrored against the 7 demo capabilities from DiscoveryOS.

**Opportunities (sample):**
- `opp-fashion-rfq-001` — Bulk T-Shirt Procurement (50K units, $250K, IN)
- `opp-mumbai-delivery-001` — B2C Same-Day Delivery Mumbai (urgent, ₹80/unit)
- `opp-sg-tax-001` — Cross-Border Tax Advisory ($499/hr, SG)
- `opp-contract-review-001` — M&A Contract Review (£50/unit, GB, in-progress)
- `opp-data-feed-001` — Real-Time Commodity Prices ($99/hr, ID)
- `opp-fashion-photo-001` — AI Product Photography ($2/unit, IN, closed)

**Capabilities (mirrored from DiscoveryOS):**
- 7 capabilities across 6 Nexhas with trust scores 80 (restricted) → 990 (platinum)

---

## Architecture

```
nexha-opportunity-os (port 4274)
├── src/
│   ├── index.ts                       # Express server entry
│   ├── types/
│   │   └── index.ts                   # Opportunity, CapabilityMatch, etc.
│   └── services/
│       └── opportunityService.ts      # CRUD + match engine
├── __tests__/unit/
│   └── opportunityService.test.ts     # 27 tests
├── dist/                              # Compiled output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Storage:** In-memory `Map<id, Opportunity>` + capability snapshot. Production would proxy to CapabilityOS + ReputationOS in real-time.

**Auth:** Optional JWT via dynamic `@rtmn/shared/auth` import.

**REZ Intelligence:** Wired (`/rez-intel-status` + `/api/enrich`). Graceful degradation.

---

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | 4274 | Service port |
| `OPPORTUNITY_OS_REQUIRE_AUTH` | `true` | Set to `false` to disable JWT auth in dev |
| `REZ_INTEL_URL` | `http://localhost:5370` | REZ Intelligence URL |
| `REZ_INTEL_ENABLED` | `true` | Disable REZ Intel wiring |
| `REZ_INTEL_TIMEOUT_MS` | `3000` | REZ Intel request timeout |

---

## Tests

27 unit tests covering:
- Seeding (idempotent + variety of kinds/statuses)
- Post + CRUD (validates required, generates IDs, increments bid count, updates)
- Listing + filtering (kind, status, priority, sort by date)
- Match (the killer feature) — single + all, trust boost, rogue demotion, budget fit
- Stats (aggregates, sums)

```bash
npm test
# ✓ 27 tests pass
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
nexha-opportunity-os/
├── CLAUDE.md                # This file
├── package.json             # @nexha/opportunity-os@0.1.0
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── index.ts             # Express server
│   ├── types/index.ts       # Type definitions
│   └── services/
│       └── opportunityService.ts  # CRUD + match engine
├── __tests__/unit/
│   └── opportunityService.test.ts # 27 tests
└── dist/                    # Built output
```

---

## Use Cases

**RFQ matching (most common):**
```ts
// Buyer posts RFQ
const opp = await fetch('http://localhost:4274/api/v1/opportunities', {
  method: 'POST',
  body: JSON.stringify({ title: '...', kind: 'rfq', requiredCategories: ['agent'], ... })
});

// Match against federation
const matches = await fetch(`http://localhost:4274/api/v1/opportunities/${opp.id}/match`, {
  method: 'POST',
  body: JSON.stringify({ trustBoost: 0.3 })
});
// Returns ranked candidates with trust scores
```

**Subscribe to all open opportunities (job board):**
```ts
const result = await fetch('http://localhost:4274/api/v1/match', { method: 'POST' });
const openOpps = result.data.matches;
for (const m of openOpps) {
  console.log(`${m.opportunity.title} (${m.opportunity.kind}) — top match: ${m.matches[0]?.nexhaName}`);
}
```

**Bid tracking:**
```ts
// After receiving a bid on your opportunity
await fetch(`http://localhost:4274/api/v1/opportunities/${oppId}/bid`, { method: 'POST' });
```

---

## Federation Network (the 5-service P0 stack)

| Service | Port | Purpose |
|---|---|---|
| **nexha-federation-os** | 4273 | Who is in the federation |
| **nexha-capability-os** | 4270 | What each Nexha offers |
| **nexha-reputation-os** | 4271 | How much to trust each Nexha |
| **nexha-discovery-os** | 4272 | Supply-side search |
| **nexha-opportunity-os** | 4274 | Demand-side matching ← this service |

---

## Related

- **nexha-capability-os** (port 4270) — capability data source
- **nexha-reputation-os** (port 4271) — trust signals
- **nexha-discovery-os** (port 4272) — supply-side search counterpart
- **nexha-federation-os** (port 4273) — membership filter
- **nexha-gateway** (port 5002) — federation entry point

---

*Built as part of Phase D-I roadmap (40-phase plan, item #8: OpportunityOS v0.1).*