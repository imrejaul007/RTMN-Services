# @hojai/marketplace

> The official TypeScript SDK for the **BLR AI Marketplace (BAM)** — the global marketplace for AI-native business assets.

[![npm version](https://img.shields.io/npm/v/@hojai/marketplace.svg)](https://www.npmjs.com/package/@hojai/marketplace)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

BAM is the world's largest marketplace for AI-native business assets — agents, skills, workflows, blueprints, twins, themes, integrations, AI Employees, and more. 1,200+ catalog items today, targeting 100,000+ by Year 5. This SDK wraps BAM's 8 backend services into a single ergonomic TypeScript client.

## Install

```bash
npm install @hojai/marketplace
```

## Quick start

```ts
import { Marketplace } from '@hojai/marketplace';

const bam = new Marketplace({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Browse public listings
const { items } = await bam.listings.search({ category: 'agent', sort: 'rating', limit: 10 });

// 2. Read reviews + write your own
await bam.reviews.addOrUpdate(items[0].listingId, {
  rating: 5,
  title: 'Saved us 20 hours/week',
  dimensions: { easeOfUse: 5, valueForMoney: 5 }
});

// 3. Universal search across all of BAM
const hits = await bam.discover.search({ q: 'negotiation agent', kind: 'listings' });

// 4. Compare candidates head-to-head
const winner = await bam.evaluate.compare({
  criteria: [
    { id: 'price', direction: 'lower' },
    { id: 'rating', direction: 'higher' }
  ],
  candidates: [
    { id: 'a', values: { price: 99, rating: 4.8 } },
    { id: 'b', values: { price: 149, rating: 4.9 } }
  ]
});
console.log(`Winner: ${winner.winnerId}`);

// 5. Compute ROI before subscribing
const roi = await bam.roi.quick({ upfrontCost: 50000, monthlyGain: 8000, months: 12 });
console.log(`Payback in ${roi.paybackMonths} months, NPV ${roi.npv}`);

// 6. Check publisher reputation
const board = await bam.reputation.leaderboard({ kind: 'publisher', limit: 10 });

// 7. Walk a founder onboarding journey
const journey = await bam.explore.startJourney('onboard-restaurant');
await bam.explore.step(journey.id, { choiceId: 'restaurant-fine-dining' });

// 8. Buy + install a digital twin
const twin = await bam.twins.featured();
const purchase = await bam.twins.purchase({ listingId: twin[0].id, orgCorpId: 'corp-1' });
await bam.twins.install({ listingId: twin[0].id, orgCorpId: 'corp-1', namespace: 'default' });
```

## What's inside

| Sub-client | Wraps service | Port | Methods |
|---|---|---|---|
| `listings` | marketplace-listings | 4250 | create, search, get, update, publish, unpublish, recordView, recordInstall, validate, stats |
| `reviews` | marketplace-listings | 4250 | addOrUpdate, list, hide, getMine |
| `discover` | discovery-engine | 4256 | search, searchKind, index, indexBulk, remove, listIndexes, getIndex |
| `explore` | blr-exploration | 4255 | listJourneys, getJourney, startJourney, step, getSession |
| `evaluate` | blr-multi-agent-evaluator | 4257 | create, list, get, compare |
| `reputation` | blr-reputation-aggregator | 4258 | create, list, get, addScore, sync, leaderboard |
| `roi` | roi-calculator | 4259 | calculate, list, get, remove, compare, quick, templates |
| `founder` | blr-founder-os | 4260 | list, get, create, recordKpi, getLatestKpis, getKpiTrend, listPlaybooks, getPlaybook, runPlaybook |
| `twins` | twin-marketplace | 4146 | categories, listings, featured, trending, get, publish, purchase, install, listPurchases, listInstalls |

## Subpath imports

For tree-shaking and smaller bundles, import individual clients:

```ts
import { ListingsClient } from '@hojai/marketplace/listings';
import { TwinsClient } from '@hojai/marketplace/twins';
```

## Configuration

```ts
const bam = new Marketplace({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 10_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional, for testing/proxies
  logger: (level, msg, meta) => {}  // optional
});
```

## Error handling

```ts
try {
  await bam.listings.get('missing');
} catch (err) {
  // err.message = "HTTP 404: ..."
  // SDK retries 5xx automatically (up to maxRetries)
  // SDK throws on 4xx immediately
}
```

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-marketplace
npm install
npm run build
npm test
```

## See also

- [@hojai/foundation](../hojai-foundation/) — CorpID, Memory, Twin, Trust, Flow, Policy
- [@hojai/sutar](../hojai-sutar/) — SUTAR agent runtime SDK
- [BAM Complete Spec](../../../../.claude/plans/bam-complete-spec.md) — 35+ marketplace categories
- [BAM Backend Services](../../blr-ai-marketplace/services/) — the 8 services wrapped here
