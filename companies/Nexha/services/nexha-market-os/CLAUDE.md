# nexha-market-os — MarketOS (Federation Market Intelligence)

> **Port:** 4275
> **Version:** 0.1.0
> **Layer:** 4 (Nexha network services)
> **Status:** ✅ **PRODUCTION-READY MVP** — 32/32 tests pass, builds clean.

---

## What it is

**The federation's market intelligence layer.** MarketOS aggregates data from CapabilityOS (supply), OpportunityOS (demand), and ReputationOS (trust) to produce actionable insights:

1. **Market prices** — median, mean, distribution per (category × region × currency)
2. **Demand signals** — what's being asked for, by category/region
3. **Supply signals** — what's being offered, with trust + capacity
4. **Supply/demand gaps** — where to enter the market, where to compete
5. **Price trends** — historical pricing direction
6. **Federation report** — top-line intelligence summary

This is the **decision support** layer for the federation — answers "Where should I focus?" for buyers, sellers, and federation operators.

---

## What It Answers

| Question | Answer |
|---|---|
| **What's the market price for X in Y?** | `GET /prices/:cat/:region/:cur` → median, mean, p25, p75, stddev |
| **Is X's price going up or down?** | `GET /trends/:cat/:region/:cur` → up/down/flat + change% |
| **Where is there unmet demand?** | `GET /gaps` → list of underserved markets, ranked by gapScore |
| **What categories are most in-demand?** | `GET /report` → topDemandedCategories |
| **What's my competitive position?** | `GET /supply/:cat/:region` → count, avgTrust, totalCapacity |
| **Is agent/IN a good market to enter?** | `GET /gaps/agent/IN` → status, gapScore, recommendation |

---

## The Gap Algorithm (the killer feature)

```
demand_ratio = openOpportunities / max(activeCapabilities, 1)

if demand_ratio >= 2:
  status = "underserved"
  gapScore = (ratio - 1) * 100
  recommendation = "X opportunities competing for only Y capabilities. New providers would face high demand."
elif demand_ratio >= 0.5:
  status = "balanced"
  gapScore = 0
  recommendation = "Steady demand (X opps) meets supply (Y caps). Healthy competition."
else:
  status = "saturated"
  gapScore = (ratio - 1) * 100  # negative
  recommendation = "Y capabilities compete for only X opportunities. Consider differentiation or new regions."

if no supply at all:
  status = "no-supply"
  gapScore = opportunities * 100
  recommendation = "High demand but no supply. Strong opportunity for new Nexha to enter this market."
```

Every gap includes a **plain-English recommendation** so non-technical users can act on it.

---

## Quick Start

```bash
cd companies/Nexha/services/nexha-market-os
npm install
npm run build
PORT=4275 node dist/index.js
# → Listening on :4275
```

```bash
# Health
curl http://localhost:4275/health

# Market price (median, mean, distribution)
curl http://localhost:4275/api/v1/prices/agent/IN/USD

# Price trend
curl http://localhost:4275/api/v1/trends/agent/IN/USD

# Top supply/demand gaps
curl http://localhost:4275/api/v1/gaps

# Specific gap with recommendation
curl http://localhost:4275/api/v1/gaps/agent/IN

# Federation-wide report
curl http://localhost:4275/api/v1/report
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health + counts |
| `GET` | `/api/v1/info` | Service metadata |
| `GET` | `/api/v1/prices` | List all market prices (filterable) |
| `GET` | `/api/v1/prices/:category/:region/:currency` | One price cell |
| `GET` | `/api/v1/trends/:category/:region/:currency` | Price trend |
| `GET` | `/api/v1/demand` | List demand signals |
| `GET` | `/api/v1/demand/:category/:region` | One demand cell |
| `GET` | `/api/v1/supply` | List supply signals |
| `GET` | `/api/v1/supply/:category/:region` | One supply cell |
| `GET` | `/api/v1/gaps` | All supply/demand gaps (sorted) |
| `GET` | `/api/v1/gaps/:category/:region` | One gap with recommendation |
| `GET` | `/api/v1/report` | Federation-wide report |
| `POST` | `/api/v1/prices` | Record price observation |
| `POST` | `/api/v1/demand` | Add demand snapshot |
| `POST` | `/api/v1/supply` | Add supply snapshot |
| `GET` | `/rez-intel-status` | REZ Intelligence health |
| `POST` | `/api/enrich` | REZ Intelligence enrichment (graceful) |

---

## Demo Federation (seed data)

**17 price observations** across 7 capabilities (4 trend series):
- Fashion Agent / IN / USD: **0.45 → 0.52 (UP +15.56%)** ↑
- Photography / IN / USD: 2.00 → 2.00 (FLAT)
- Mumbai Delivery / IN / INR: 70 → 80 (UP)
- Tax Advisor / SG / USD: 499 → 499 (FLAT)
- Contract Review / GB / GBP: 50 → 50 (FLAT)
- Indonesia Data / ID / USD: **99 → 80 (DOWN -19.19%)** ↓
- Rogue Service: (low trust, included for contrast)

**5 demand cells** (from OpportunityOS demographics):
- agent/IN (2 opps, $250K total) ← biggest
- service/IN (2 opps, $1K)
- agent/SG (1 opp, $499)
- service/GB (1 opp, $2.5K)
- data/ID (1 opp, $99)

**5 supply cells** (from CapabilityOS + ReputationOS):
- service/IN: 2 caps, ACI 879 ← biggest
- agent/IN: 1 cap, ACI 990 (platinum)
- agent/SG: 1 cap, ACI 720
- service/GB: 1 cap, ACI 780
- data/ID: 1 cap, ACI 580

**5 supply/demand gaps:**
- agent/IN: **underserved (gapScore=100)** ← biggest opportunity
- service/IN: balanced
- agent/SG: balanced
- service/GB: balanced
- data/ID: balanced

---

## Architecture

```
nexha-market-os (port 4275)
├── src/
│   ├── index.ts                       # Express server entry
│   ├── types/
│   │   └── index.ts                   # MarketPrice, MarketGap, DemandSignal, etc.
│   └── services/
│       └── marketService.ts           # Aggregation + gap analysis + trends
├── __tests__/unit/
│   └── marketService.test.ts          # 32 tests
├── dist/                              # Compiled output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Storage:** In-memory `PriceObservation[]` + `DemandSignal[]` + `SupplySignal[]`. Production would pull from CapabilityOS + OpportunityOS + ReputationOS in real-time.

**Auth:** Optional JWT via dynamic `@rtmn/shared/auth` import.

**REZ Intelligence:** Wired (`/rez-intel-status` + `/api/enrich`). Graceful degradation.

---

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | 4275 | Service port |
| `MARKET_OS_REQUIRE_AUTH` | `true` | Set to `false` to disable JWT auth in dev |
| `REZ_INTEL_URL` | `http://localhost:5370` | REZ Intelligence URL |
| `REZ_INTEL_ENABLED` | `true` | Disable REZ Intel wiring |
| `REZ_INTEL_TIMEOUT_MS` | `3000` | REZ Intel request timeout |

---

## FX Rates (for budget aggregation)

MarketOS converts all opportunity budgets to USD using static FX rates:

| Currency | To USD |
|---|---|
| USD | 1.00 |
| EUR | 1.08 |
| GBP | 1.27 |
| INR | 0.012 |
| IDR | 0.000063 |
| SGD | 0.74 |
| AED | 0.272 |
| JPY | 0.0066 |
| AUD | 0.66 |

---

## Tests

32 unit tests covering:
- Seeding (idempotent + correct cell counts)
- Price aggregation (median, mean, p25/p75, stddev, window)
- Price trends (rising/falling/flat detection, change% calculation)
- Demand + supply signals (lookup, filter, list)
- Supply/demand gaps (underserved, balanced, saturated, no-supply classification)
- Federation report (aggregates, topDemanded, topSupplied, biggestGaps)
- Ingest endpoints (recordPrice, addDemandSnapshot, addSupplySnapshot)

```bash
npm test
# ✓ 32 tests pass
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
nexha-market-os/
├── CLAUDE.md                # This file
├── package.json             # @nexha/market-os@0.1.0
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── index.ts             # Express server
│   ├── types/index.ts       # Type definitions
│   └── services/
│       └── marketService.ts # Market intelligence engine
├── __tests__/unit/
│   └── marketService.test.ts # 32 tests
└── dist/                    # Built output
```

---

## Use Cases

**Where to enter the market?**
```ts
const gaps = await fetch('http://localhost:4275/api/v1/gaps').then(r => r.json());
const biggest = gaps.data.gaps[0]; // agent/IN with gapScore=100
// "agent in IN is underserved. 2 opportunities competing for only 1 capabilities."
```

**What should I charge for my new service?**
```ts
const price = await fetch('http://localhost:4275/api/v1/prices/service/IN/USD');
// { median: 2.00, p25: 2.00, p75: 41, mean: 41, sampleSize: 2 }
// Charge within p25-p75 (i.e. $2-$41)
```

**Is this market's price rising or falling?**
```ts
const trend = await fetch('http://localhost:4275/api/v1/trends/agent/IN/USD');
// { direction: 'up', changePercent: 15.56, observations: [...] }
// Raise prices — market is hot
```

**What does the federation look like?**
```ts
const report = await fetch('http://localhost:4275/api/v1/report');
// { totalCapabilities: 6, totalOpportunities: 7, totalBudgetUsd: 254608,
//   averageAci: 790, topDemandedCategories: [...], topSuppliedCategories: [...], ... }
```

---

## Federation Network (the 6-service P0/P1 stack)

| Service | Port | Purpose |
|---|---|---|
| **FederationOS** | 4273 | Who is in the federation |
| **CapabilityOS** | 4270 | What each Nexha offers |
| **ReputationOS** | 4271 | How much to trust each Nexha |
| **DiscoveryOS** | 4272 | Supply-side search |
| **OpportunityOS** | 4274 | Demand-side matching |
| **MarketOS** | 4275 | **Federation market intelligence** ← this service |

---

## Related

- **nexha-capability-os** (port 4270) — supply data source
- **nexha-opportunity-os** (port 4274) — demand data source
- **nexha-reputation-os** (port 4271) — trust signals
- **nexha-discovery-os** (port 4272) — supply-side search
- **nexha-federation-os** (port 4273) — membership filter

---

*Built as part of Phase D-I roadmap (40-phase plan, item #9: MarketOS v0.1).*