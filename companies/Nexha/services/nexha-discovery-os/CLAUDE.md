# nexha-discovery-os — DiscoveryOS (Federated Search + Ranking)

> **Port:** 4272
> **Version:** 0.1.0
> **Layer:** 4 (Nexha network services)
> **Status:** ✅ **PRODUCTION-READY MVP** — 24/24 tests pass, builds clean.

---

## What it is

**The federation's discovery + ranking engine.** DiscoveryOS combines two upstream services:
- **CapabilityOS** (port 4270) — what's offered across the federation
- **ReputationOS** (port 4271) — how much to trust each Nexha (ACI score)

The killer feature: **trust-boosted ranking**. A mediocre match from a high-trust Nexha can outrank a perfect match from a low-trust Nexha. This is what makes federated commerce safe — you never accidentally pick a scam operator just because they have a keyword match.

---

## Ranking Algorithm

```
matchScore = 0 (capped at 1.0)
  + 0.40  category match
  + 0.30  tag overlap (Jaccard)
  + 0.15  free-text overlap
  + 0.05  region match
  + 0.05  language match
  + 0.05  verified flag

finalScore = matchScore × (1 + trustBoost × ACI/1000)

# Default trustBoost = 0.3
# So platinum (ACI=900-1000) gets up to 30% boost
# Gold (ACI=800-899) gets up to ~27%
# Restricted (ACI<300) gets < 9% boost (still scored)
# Unknown trust (null) → finalScore = matchScore (no boost)
```

Every result is **explainable** — `reasons` array shows why it ranked where it did.

---

## Trust Bands (from ReputationOS)

| Band | ACI | Boost (default 0.3) |
|---|---|---|
| `platinum` | 900-1000 | +27% to +30% |
| `gold` | 800-899 | +24% to +27% |
| `silver` | 700-799 | +21% to +24% |
| `bronze` | 500-699 | +15% to +21% |
| `iron` | 300-499 | +9% to +15% |
| `restricted` | 0-299 | +0% to +9% (still scored) |
| `unknown` | null | +0% (no trust data) |

You can also **hard filter** by minimum band via `minAciBand`.

---

## Demo Federation (seed data)

7 capabilities across 6 Nexhas with varied trust profiles:

| Capability | Nexha | ACI | Band | Trust-Beat? |
|---|---|---|---|---|
| AI Fashion Negotiation | nexha-maya-collective | 990 | platinum | ⭐ high |
| AI Product Photography | nexha-maya-collective | 990 | platinum | ⭐ high |
| Mumbai Same-Day Delivery | nexha-logistics-mumbai | 767 | silver | good |
| AI Tax Advisor (SG/IN) | nexha-finance-singapore | 720 | silver | good |
| AI Contract Review | nexha-legal-london | 780 | silver | good |
| Indonesia Retail Prices | nexha-data-jakarta | 580 | bronze | ok |
| Ultra-Cheap AI Service | nexha-rogue-supplier | 80 | restricted | 🚩 demoted |

---

## Quick Start

```bash
cd companies/Nexha/services/nexha-discovery-os
npm install
npm run build
PORT=4272 node dist/index.js
# → Listening on :4272
```

```bash
# Health
curl http://localhost:4272/health

# Discover (POST body)
curl -X POST http://localhost:4272/api/v1/discover \
  -H 'Content-Type: application/json' \
  -d '{
    "q": "fashion negotiation",
    "region": "IN",
    "minAciBand": "silver",
    "trustBoost": 0.3
  }'

# Discover (GET query)
curl 'http://localhost:4272/api/v1/discover?category=agent&trustBoost=0.5'

# Index a capability (called by CapabilityOS or manually)
curl -X POST http://localhost:4272/api/v1/index \
  -H 'Content-Type: application/json' \
  -d '{
    "capability": {
      "id": "cap-x", "nexhaId": "nexha-x",
      "name": "AI Foo", "description": "does foo",
      "category": "agent", "tags": ["foo"],
      "pricing": { "model": "per-call", "amount": 1 },
      "trust": { "verified": true, "kycLevel": "full" },
      "regions": ["US"], "languages": ["en"],
      "status": "active"
    },
    "trust": { "subjectId": "nexha-x", "aci": 800, "band": "gold" }
  }'
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health + index stats |
| `GET` | `/ready` | Readiness probe |
| `GET` | `/api/v1/info` | Service metadata |
| `POST` | `/api/v1/discover` | **Search (body)** |
| `GET` | `/api/v1/discover` | **Search (query params)** |
| `GET` | `/api/v1/index/:capabilityId` | Get indexed capability |
| `POST` | `/api/v1/index` | Index/refresh a capability |
| `POST` | `/api/v1/index/bulk` | Bulk index (max 500) |
| `DELETE` | `/api/v1/index/:capabilityId` | Remove from index |
| `GET` | `/api/v1/stats` | Index stats |
| `GET` | `/rez-intel-status` | REZ Intelligence health |
| `POST` | `/api/enrich` | REZ Intelligence enrichment (graceful) |

---

## Discovery Query Params

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | — | Free-text search |
| `category` | string | — | Filter by category |
| `tags` | string \| string[] | — | Tags ALL must match |
| `nexhaId` | string | — | Restrict to one Nexha |
| `region` | string | — | ISO country code |
| `language` | string | — | ISO 639-1 code |
| `minAciBand` | enum | `any` | `platinum` / `gold` / `silver` / `bronze` / `iron` / `restricted` / `any` |
| `verifiedOnly` | bool | `false` | Only verified capabilities |
| `limit` | int (1-200) | 50 | Page size |
| `offset` | int | 0 | Page offset |
| `trustBoost` | number (0-2) | 0.3 | Boost factor for trusted results |

---

## Architecture

```
nexha-discovery-os (port 4272)
├── src/
│   ├── index.ts                       # Express server entry
│   ├── types/
│   │   └── index.ts                   # Capability, TrustScore, DiscoveryQuery, etc.
│   └── services/
│       └── discoveryService.ts        # Match + trust-boost ranking engine
├── __tests__/unit/
│   └── discoveryService.test.ts       # 24 tests
├── dist/                              # Compiled output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Storage:** In-memory `Map<capabilityId, IndexedCapability>` + per-Nexha indexes. Can swap to Redis cache + Postgres persistence without changing the API.

**Index lifecycle:** TTL = 60s (in-memory cache freshness). Production would periodically re-fetch from CapabilityOS + ReputationOS.

**Auth:** Optional JWT via dynamic `@rtmn/shared/auth` import.

**REZ Intelligence:** Wired (`/rez-intel-status` + `/api/enrich`). Graceful degradation.

---

## Integration with CapabilityOS + ReputationOS

```
┌─────────────┐    ┌────────────────┐    ┌─────────────────┐
│CapabilityOS │    ��  DiscoveryOS   │    │  ReputationOS   │
│  port 4270  │───▶│   port 4272    │◀───│   port 4271     │
│             │    │                │    │                 │
│ capabilities│    │  search + boost│    │  ACI scores    │
└─────────────┘    └────────────────┘    └─────────────────┘
       │                   │                      │
       └──── index ────────┘                      │
                              trust scores ──────┘
```

Two deployment patterns:
1. **Pull**: DiscoveryOS polls CapabilityOS + ReputationOS on TTL expiry
2. **Push**: CapabilityOS publishes events to DiscoveryOS on every capability change

This MVP ships with **local index + seed data**. Production deployment would wire the pull/push adapters.

---

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | 4272 | Service port |
| `DISCOVERY_OS_REQUIRE_AUTH` | `true` | Set to `false` to disable JWT auth in dev |
| `REZ_INTEL_URL` | `http://localhost:5370` | REZ Intelligence URL |
| `REZ_INTEL_ENABLED` | `true` | Disable REZ Intel wiring |
| `REZ_INTEL_TIMEOUT_MS` | `3000` | REZ Intel request timeout |

---

## Tests

24 unit tests covering:
- Seeding (idempotent + mixed trust bands)
- Discover (no trust boost, ranking, filters, pagination)
- **Trust boost (the killer feature)** — boost=0 vs 0.3, platinum > restricted for similar matches
- Trust band filtering (silver, gold, any)
- Index management (upsert, remove, stats)
- Performance — 100 capabilities searched in < 100ms

```bash
npm test
# ✓ 24 tests pass
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
nexha-discovery-os/
├── CLAUDE.md                # This file
├── package.json             # @nexha/discovery-os@0.1.0
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── index.ts             # Express server
│   ├── types/index.ts       # Type definitions
│   └── services/
│       └── discoveryService.ts  # Match + trust-boost engine
├── __tests__/unit/
│   └── discoveryService.test.ts # 24 tests
└── dist/                    # Built output
```

---

## Use Cases

**Federated search for a buyer:**
```ts
const results = await fetch('http://localhost:4272/api/v1/discover', {
  method: 'POST',
  body: JSON.stringify({
    q: 'logistics delivery',
    region: 'IN',
    minAciBand: 'silver',   // only trust verified Nexhas
    trustBoost: 0.4
  })
});
const top = (await results.json()).data.results[0];
// Always pick the top result — trust boost already filtered
```

**Marketplace directory:**
```ts
const all = await fetch('http://localhost:4272/api/v1/discover?verifiedOnly=true&limit=100');
```

**Cross-Nexha procurement safety:**
```ts
// Filter out restricted Nexhas entirely
const safe = await fetch('http://localhost:4272/api/v1/discover?minAciBand=bronze');
```

**AI agent auto-discovery:**
```ts
// An agent needs to find a tax advisor — uses trust boost to avoid rogue Nexhas
const advisor = await fetch('http://localhost:4272/api/v1/discover', {
  method: 'POST',
  body: JSON.stringify({
    category: 'agent',
    tags: ['tax', 'advisor'],
    trustBoost: 0.5  // high trust weight for financial decisions
  })
});
```

---

## Related Services

- **nexha-capability-os** (port 4270) — capability registry (data source)
- **nexha-reputation-os** (port 4271) — ACI scoring (trust signal)
- **nexha-business-directory** (port 4360) — company + agent registry (alternative discovery source)
- **nexha-gateway** (port 5002) — federation gateway
- **nexha-acp-messaging** — cross-Nexha agent communication (post-discovery execution)

---

*Built as part of Phase D-I roadmap (40-phase plan, item #4: DiscoveryOS v0.1).*