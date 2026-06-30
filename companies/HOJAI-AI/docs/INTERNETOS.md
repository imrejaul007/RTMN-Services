# InternetOS — Web Intelligence Platform

> **Port:** 4595 (planned)
> **Status:** ✅ BUILT
> **Purpose:** The "eyes and ears" of the AI workforce — scrapes and monitors the internet

---

## Overview

InternetOS is HOJAI's web intelligence platform that provides:

1. **Actor Runtime** — Standardized framework for web data extraction
2. **7 Web Actors** — Pre-built scrapers for common sources
3. **Watcher Runtime** — Continuous monitoring for changes

Think of it as **HOJAI's Apify** — a platform for building and running web intelligence agents.

---

## Architecture

```
InternetOS
├── actor-runtime/          (6,561 LOC)
│   └── src/index.ts       — Actor framework
├── watcher-runtime/        (8,071 LOC)
│   └── src/index.ts       — Monitoring framework
└── actors/
    ├── google-maps-actor/    — Business discovery
    ├── zomato-actor/        — Restaurant data
    ├── airbnb-actor/        — Hospitality data
    ├── linkedin-actor/      — Professional network
    ├── news-actor/          — News extraction
    ├── company-intel-actor/  — Company research
    └── justdial-actor/       — Local business
```

---

## Actor Runtime

The Actor Runtime is a standardized framework for web data extraction.

### Core Types

```typescript
// Actor configuration
export interface ActorConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  rateLimit?: {
    requests: number;
    window: number; // in ms
  };
}

// Actor input
export interface ActorInput {
  actor: string;      // Actor ID
  action: string;      // Action to perform
  params?: Record<string, any>;
  options?: {
    timeout?: number;
    retries?: number;
    proxy?: boolean;
  };
}

// Actor output
export interface ActorOutput {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    scrapedAt: string;
    source: string;
    itemsFound: number;
    duration: number;
  };
}
```

### Base Actor Class

```typescript
export abstract class Actor {
  public config: ActorConfig;
  
  abstract scrape(input: any): Promise<ActorOutput>;
  abstract validate(input: any): Promise<boolean>;
  
  protected async rateLimit(): Promise<void>;
}
```

### Actor Registry

```typescript
export class ActorRegistry {
  register(actor: Actor): void;
  get(id: string): Actor | undefined;
  list(): ActorConfig[];
  search(query: string): ActorConfig[];
}
```

### Actor Runtime

```typescript
export class ActorRuntime extends EventEmitter {
  async execute(input: ActorInput): Promise<ActorOutput>;
  async executeBatch(inputs: ActorInput[]): Promise<ActorOutput[]>;
  async executeBatchParallel(inputs: ActorInput[], concurrency?: number): Promise<ActorOutput[]>;
  getRegistry(): ActorRegistry;
}
```

### HTTP Fetcher Utility

```typescript
export async function fetchUrl(
  url: string,
  options?: {
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
    proxy?: string;
  }
): Promise<string>
```

---

## Web Actors (7)

### Google Maps Actor

**Extracts business information from Google Maps.**

```typescript
import GoogleMapsActor from './google-maps-actor';

const actor = new GoogleMapsActor();

const result = await actor.scrape({
  query: 'restaurants in Bangalore',
  location: 'Bangalore, India',
  maxResults: 10,
  includeReviews: true
});

// Returns: { name, address, phone, website, rating, reviews, hours, category, photos, coordinates }
```

**Capabilities:**
- `business_search` — Search for businesses
- `reviews` — Extract reviews
- `directions` — Route information
- `places` — Place details

### Zomato Actor

**Extracts restaurant data from Zomato.**

```typescript
import ZomatoActor from './zomato-actor';

const actor = new ZomatoActor();

// Search restaurants
const search = await actor.scrape({
  type: 'search',
  query: 'pizza',
  location: 'bangalore',
  limit: 10
});

// Get restaurant details
const details = await actor.scrape({
  type: 'restaurant',
  url: 'https://zomato.com/...'
});

// Get reviews
const reviews = await actor.scrape({
  type: 'reviews',
  url: 'https://zomato.com/...',
  limit: 20
});

// Get menu
const menu = await actor.scrape({
  type: 'menu',
  url: 'https://zomato.com/...'
});
```

**Capabilities:**
- `restaurant_search` — Search restaurants
- `menu_extraction` — Extract menu items
- `review_scrape` — Get reviews
- `pricing` — Pricing information

### Airbnb Actor

**Extracts hospitality data from Airbnb.**

```typescript
import AirbnbActor from './airbnb-actor';

const actor = new AirbnbActor();

const result = await actor.scrape({
  type: 'search',
  location: 'Goa, India',
  checkIn: '2024-06-01',
  checkOut: '2024-06-05',
  guests: 4
});
```

### LinkedIn Actor

**Extracts professional network data.**

```typescript
import LinkedInActor from './linkedin-actor';

const actor = new LinkedInActor();

const result = await actor.scrape({
  type: 'profile',
  url: 'https://linkedin.com/in/...'
});
```

### News Actor

**Extracts news articles and trends.**

```typescript
import NewsActor from './news-actor';

const actor = new NewsActor();

// Search news
const search = await actor.scrape({
  type: 'search',
  query: 'AI startups',
  limit: 20
});

// Get trending
const trending = await actor.scrape({
  type: 'trending',
  limit: 10
});

// Company news
const company = await actor.scrape({
  type: 'company',
  query: 'Swiggy',
  dateRange: '30d'
});

// Industry news
const industry = await actor.scrape({
  type: 'industry',
  query: 'food delivery',
  dateRange: '7d'
});
```

**Features:**
- Sentiment analysis (positive/negative/neutral)
- Relevance scoring
- Categorization (funding, product, leadership, regulatory, market)

### Company Intel Actor

**Researches companies for intelligence.**

```typescript
import CompanyIntelActor from './company-intel-actor';

const actor = new CompanyIntelActor();

const result = await actor.scrape({
  type: 'company',
  name: 'Zomato',
  includeNews: true,
  includeFunding: true,
  includeCompetitors: true
});
```

### JustDial Actor

**Extracts local business data from JustDial.**

```typescript
import JustDialActor from './justdial-actor';

const actor = new JustDialActor();

const result = await actor.scrape({
  query: 'restaurants near me',
  location: 'Mumbai',
  limit: 20
});
```

---

## Watcher Runtime

Continuous monitoring for changes in web resources.

### Core Classes

```typescript
export interface WatcherConfig {
  id: string;
  name: string;
  url: string;
  type: 'price' | 'review' | 'competitor' | 'job' | 'news' | 'custom';
  interval: number; // in milliseconds
  selector?: string; // CSS selector to watch
  transform?: (data: any) => any;
  onChange?: (newValue: any, oldValue: any) => void;
}

export interface WatcherState {
  id: string;
  currentValue: any;
  previousValue: any;
  lastChecked: string;
  changes: ChangeRecord[];
  status: 'active' | 'paused' | 'error';
  error?: string;
}
```

### Watcher Runtime

```typescript
export class WatcherRuntime extends EventEmitter {
  addWatcher(config: WatcherConfig): void;
  removeWatcher(id: string): void;
  start(): void;
  stop(): void;
  startWatcher(id: string): void;
  stopWatcher(id: string): void;
  getState(id: string): WatcherState | undefined;
  getAllStates(): Map<string, WatcherState>;
  listWatchers(): WatcherConfig[];
  pauseWatcher(id: string, duration?: number): void;
  resumeWatcher(id: string): void;
  async forceCheck(id: string): Promise<WatcherState | undefined>;
  clearHistory(id: string): void;
}

// Events
watcher.on('watcher:added', ({ id, config }) => {});
watcher.on('watcher:removed', ({ id }) => {});
watcher.on('watcher:started', ({ id }) => {});
watcher.on('watcher:stopped', ({ id }) => {});
watcher.on('watcher:change', ({ id, change }) => {});
watcher.on('watcher:error', ({ id, error }) => {});
```

### Pre-built Watchers

#### Price Watcher

```typescript
import { WatcherRuntime, PriceWatcher } from './watcher-runtime';

const watcher = new WatcherRuntime();
const priceWatcher = new PriceWatcher(watcher);

// Monitor competitor prices
priceWatcher.create(
  'competitor-1',
  'https://amazon.com/product/...',
  '.price',
  3600000 // Check every hour
);

watcher.on('watcher:change', ({ id, change }) => {
  console.log(`Price changed for ${id}:`, {
    old: change.oldValue,
    new: change.newValue
  });
});

watcher.start();
```

#### Review Watcher

```typescript
import { WatcherRuntime, ReviewWatcher } from './watcher-runtime';

const watcher = new WatcherRuntime();
const reviewWatcher = new ReviewWatcher(watcher);

// Monitor reviews
reviewWatcher.create(
  'my-brand-google',
  'https://google.com/maps/place/...',
  '.rating',
  86400000 // Check daily
);

watcher.start();
```

#### Competitor Watcher

```typescript
import { WatcherRuntime, CompetitorWatcher } from './watcher-runtime';

const watcher = new WatcherRuntime();
const competitorWatcher = new CompetitorWatcher(watcher);

// Monitor multiple competitors
competitorWatcher.create(
  'competitor-monitoring',
  [
    'https://swiggy.com',
    'https://zomato.com',
    'https://ubereats.com'
  ],
  43200000 // Check every 12 hours
);

watcher.start();
```

---

## Complete Example

```typescript
import { ActorRuntime } from './actor-runtime';
import { WatcherRuntime, PriceWatcher } from './watcher-runtime';

// Initialize runtimes
const actorRuntime = new ActorRuntime();
const watcherRuntime = new WatcherRuntime();

// 1. Initial research using actors
const competitorData = await actorRuntime.executeBatchParallel([
  { actor: 'google_maps', action: 'scrape', params: { query: 'restaurants near Koramangala' } },
  { actor: 'zomato', action: 'scrape', params: { type: 'search', query: 'pizza', location: 'bangalore' } },
  { actor: 'news', action: 'scrape', params: { type: 'industry', query: 'restaurant industry trends' } }
]);

// 2. Set up continuous monitoring
const priceWatcher = new PriceWatcher(watcherRuntime);
competitorData.data.results.forEach((competitor, i) => {
  priceWatcher.create(
    `competitor-${i}`,
    competitor.website,
    '.price',
    3600000
  );
});

// 3. Listen for changes
watcherRuntime.on('watcher:change', ({ id, change }) => {
  console.log(`Change detected for ${id}:`, change);
});

// 4. Start monitoring
watcherRuntime.start();
```

---

## Integration with Other Services

### With MemoryOS

```typescript
// Save scraped data to memory
import { MemoryOS } from '@hojai/memory-sdk';

const memory = new MemoryOS();
await memory.remember({
  type: 'competitor_research',
  data: competitorData,
  timestamp: new Date().toISOString()
});
```

### With TwinOS

```typescript
// Update competitor twin
import { TwinOS } from '@hojai/twin';

const twin = new TwinOS();
await twin.update('competitor::zomato', {
  pricing: latestPrice,
  lastChecked: new Date().toISOString()
});
```

### With SUTAR

```typescript
// Trigger negotiation if price changes
import { SUTAR } from '@hojai/sutar';

const sutar = new SUTAR();
if (priceDrop > 10) {
  await sutar.negotiate({
    supplier: 'competitor-1',
    product: 'similar-product',
    targetPrice: competitorPrice * 0.9
  });
}
```

---

## API Endpoints (Future)

When deployed as a service:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/actors` | List available actors |
| GET | `/api/actors/:id` | Get actor config |
| POST | `/api/scrape` | Execute actor |
| POST | `/api/scrape/batch` | Batch execution |
| GET | `/api/watchers` | List watchers |
| POST | `/api/watchers` | Create watcher |
| DELETE | `/api/watchers/:id` | Remove watcher |
| GET | `/api/watchers/:id/state` | Get watcher state |
| POST | `/api/watchers/:id/check` | Force check |

---

## Environment Variables

```bash
# Actor Runtime
ACTOR_TIMEOUT=30000
ACTOR_MAX_RETRIES=3
ACTOR_DEFAULT_RATE_LIMIT=10  # requests per minute

# Watcher Runtime
WATCHER_DEFAULT_INTERVAL=3600000  # 1 hour
WATCHER_MAX_HISTORY=100

# Proxy (optional)
ACTOR_PROXY_URL=http://proxy:8080
```

---

## Dependencies

```json
{
  "typescript": "^5.0.0",
  "cheerio": "^1.0.0",
  "node-fetch": "^3.0.0",
  "puppeteer": "^21.0.0"
}
```

---

## Quick Start

```bash
# Install dependencies
cd platform/internet-os/actor-runtime
npm install

# Build
npm run build

# Run a specific actor
cd ../actors/google-maps-actor
npm start

# Or use programmatically
import { actorRuntime } from '../actor-runtime';
import GoogleMapsActor from './google-maps-actor';

actorRuntime.getRegistry().register(new GoogleMapsActor());

const result = await actorRuntime.execute({
  actor: 'google_maps',
  action: 'scrape',
  params: { query: 'pizza in Bangalore' }
});
```

---

## Related Documents

- [BrandPulse](products/brandpulse/) — Brand intelligence
- [REZ-SalesMind](services/REZ-SalesMind/) — Sales intelligence
- [MemoryOS](platform/memory/) — Memory integration
- [TwinOS](platform/twins/) — Digital twin integration

---

*Built: June 2026*
*Maintainer: HOJAI AI Platform Team*
