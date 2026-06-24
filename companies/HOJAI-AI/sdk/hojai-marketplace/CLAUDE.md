# CLAUDE.md - HOJAI Marketplace SDK (@hojai/marketplace)

> **Package:** `@hojai/marketplace` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (12/12 tests passing, 0 failures)

## What this SDK is

**The official client for BAM (BLR AI Marketplace).** Wraps the 8 BAM backend services into a single ergonomic TypeScript client. Use this SDK to publish listings, discover assets, write reviews, run founder journeys, compute ROI, evaluate candidates, and trade digital twins.

| Sub-client | Purpose | Wraps | Port |
|---|---|---|---|
| `listings` | CRUD over per-tenant listings (8 categories, 5 statuses, 5 pricing models) | marketplace-listings | 4250 |
| `reviews` | 1-per-tenant reviews with 4 dimensions + denormalized listing averages | marketplace-listings | 4250 |
| `discover` | Universal search + index management across 9+ kinds | discovery-engine | 4256 |
| `explore` | Curated founder journeys (multi-step sessions) | blr-exploration | 4255 |
| `evaluate` | Head-to-head candidate comparison with weighted criteria | blr-multi-agent-evaluator | 4257 |
| `reputation` | Cross-tenant reputation scores + public leaderboard | blr-reputation-aggregator | 4258 |
| `roi` | ROI/payback/NPV/IRR calculations + templates | roi-calculator | 4259 |
| `founder` | Founder profiles + KPIs + playbook runs | blr-founder-os | 4260 |
| `twins` | Digital twin marketplace (categories, listings, purchase, install) | twin-marketplace | 4146 |

## Architecture

```
@hojai/marketplace
├── Marketplace                  # Main client (facade)
│   ├── listings                 # ListingsClient      — 10 methods
│   ├── reviews                  # ReviewsClient       — 4 methods
│   ├── discover                 # DiscoverClient      — 7 methods
│   ├── explore                  # ExploreClient       — 5 methods
│   ├── evaluate                 # EvaluateClient      — 4 methods
│   ├── reputation               # ReputationClient    — 6 methods
│   ├── roi                      # RoiClient           — 7 methods
│   ├── founder                  # FounderClient       — 9 methods
│   └── twins                    # TwinsClient         — 10 methods
├── HojaiConfig                  # Shared config (apiKey, baseUrl, timeout, maxRetries, fetchImpl, logger)
└── resolveConfig()              # Apply defaults
```

Self-contained — does NOT import from `@hojai/foundation` or `@hojai/sutar`. Each SDK carries its own copy of `HojaiConfig` and the `request()` helper (~50 LOC), so it can be installed and used independently. This mirrors the pattern in `@hojai/sutar`.

## Quick Start

```ts
import { Marketplace } from '@hojai/marketplace';

const bam = new Marketplace({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// Browse public listings
const { items } = await bam.listings.search({ category: 'agent', sort: 'rating' });

// Universal search across BAM
const hits = await bam.discover.search({ q: 'negotiation agent', kind: 'listings' });

// Head-to-head evaluation
const winner = await bam.evaluate.compare({
  criteria: [{ id: 'price', direction: 'lower' }, { id: 'rating', direction: 'higher' }],
  candidates: [{ id: 'a', values: { price: 99, rating: 4.8 } }]
});

// ROI before subscribing
const roi = await bam.roi.quick({ upfrontCost: 50000, monthlyGain: 8000, months: 12 });

// Buy + install a twin
const featured = await bam.twins.featured();
await bam.twins.purchase({ listingId: featured[0].id, orgCorpId: 'corp-1' });
await bam.twins.install({ listingId: featured[0].id, orgCorpId: 'corp-1', namespace: 'default' });
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-marketplace
npm install
npm run build
npm test
```

## Files

```
hojai-marketplace/
├── CLAUDE.md                    # This file
├── README.md                    # Quick start
├── package.json                 # npm config with subpath exports for 9 clients
├── tsconfig.json
├── src/
│   ├── foundation-config.ts     # HojaiConfig + resolveConfig (copied from hojai-sutar)
│   ├── utils.ts                 # request() with retries, timeout, backoff (copied)
│   ├── listings.ts              # ListingsClient (10 methods)
│   ├── reviews.ts               # ReviewsClient (4 methods)
│   ├── discover.ts              # DiscoverClient (7 methods)
│   ├── explore.ts               # ExploreClient (5 methods)
│   ├── evaluate.ts              # EvaluateClient (4 methods)
│   ├── reputation.ts            # ReputationClient (6 methods)
│   ├── roi.ts                   # RoiClient (7 methods)
│   ├── founder.ts               # FounderClient (9 methods)
│   ├── twins.ts                 # TwinsClient (10 methods)
│   ├── index.ts                 # Main Marketplace class + re-exports
│   └── __tests__/index.test.ts  # 12 tests
└── dist/                        # Compiled output
```

## Tests (12/12 passing)

- Marketplace client instantiates with all 9 sub-clients
- ListingsClient.create
- ReviewsClient.addOrUpdate
- DiscoverClient.search
- ExploreClient.startJourney
- EvaluateClient.compare
- ReputationClient.leaderboard
- RoiClient.quick
- FounderClient.recordKpi
- TwinsClient.featured
- Retries on 5xx (calls mock 3 times before success)
- Throws on 4xx

## Related

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Core platform client
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agent runtime SDK (sister SDK)
- [BAM Complete Spec](../../../../.claude/plans/bam-complete-spec.md) — 35+ marketplace categories
- [BAM Backend Services](../../blr-ai-marketplace/services/) — the 8 services wrapped here
