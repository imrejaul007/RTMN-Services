# InternetOS Build Plan — No Duplicates

**Date:** June 30, 2026
**Status:** 30% Infrastructure + 35 Reusable Services = 65% Leverage
**Goal:** Build only what's NEW, reuse everything else

---

## REUSE FIRST! (35+ Existing Services)

### Memory & Storage Layer

| Existing Service | Port | Reuse For | DON'T Build |
|-----------------|------|-----------|-------------|
| **MemoryOS** | 4703 | Store scraped data, entity history | ❌ New memory layer |
| **Memory Intelligence** | 4786 | Remember, forget, importance | ❌ New memory logic |
| **Memory Context Engine** | 4793 | Compose context for AI | ❌ New context builder |
| **Memory Temporal** | 4794 | Store temporal/entity history | ❌ New timeline |
| **Memory Substrate** | 4782 | PostgreSQL + pgvector backend | ❌ New database |
| **Memory Import** | 4780 | Multi-source ingestion | ❌ New ingestion |

### Twin & Entity Layer

| Existing Service | Port | Reuse For | DON'T Build |
|-----------------|------|-----------|-------------|
| **TwinOS Hub** | 4705 | Register scraped entities as twins | ❌ New twin registry |
| **Twin Memory Bridge** | 4704 | Link twins to memory | ❌ New bridge |
| **Organization Twin** | 4710 | Company/business entities | ❌ New company twin |
| **Product Twin** | 4720 | Product entities | ❌ New product twin |
| **Asset Twin** | 4750 | Store assets | ❌ New asset twin |

### Knowledge & Graph Layer

| Existing Service | Port | Reuse For | DON'T Build |
|-----------------|------|-----------|-------------|
| **Knowledge Extraction** | 4784 | NER, entity linking, facts | ❌ New extraction |
| **Ontology Engine** | 4751 | Schema validation | ❌ New ontology |
| **Entity Resolution** | 4752 | Deduplicate scraped entities | ❌ New dedup |
| **Reasoning Engine** | 4753 | Rule-based reasoning | ❌ New reasoner |
| **Knowledge Network** | 4796 | Cross-service graph | ❌ New graph |

### Skills & Workflow Layer

| Existing Service | Port | Reuse For | DON'T Build |
|-----------------|------|-----------|-------------|
| **SkillOS** | 4743 | Register scraping as skills | ❌ New skill registry |
| **Skill Library** | 4806 | Reusable agent skills | ❌ New skill library |
| **Flow OS** | 4938 | Workflow orchestration | ❌ New workflow engine |

### Notification & Webhook Layer

| Existing Service | Port | Reuse For | DON'T Build |
|-----------------|------|-----------|-------------|
| **Webhook Bus** | 4110 | Real-time change notifications | ❌ New webhook system |
| **Notification OS** | 4750 | Multi-channel notifications | ❌ New notification |
| **Emotion Alerts** | 4765 | Alert escalation | ❌ New alerts |
| **Unified Inbox** | 4870 | Notification management | ❌ New inbox |

### Intelligence Layer

| Existing Service | Port | Reuse For | DON'T Build |
|-----------------|------|-----------|-------------|
| **AI Intelligence** | 4881 | LLM-powered analysis | ❌ New AI service |
| **Review Scrapers** | 5456 | Review aggregation + sentiment | ❌ New scraper |
| **BrandPulse** | - | Brand sentiment monitoring | ❌ New brand monitor |
| **SimulationOS** | 4874 | What-if scenarios | ❌ New simulation |

### Connector & Integration Layer

| Existing Service | Port | Reuse For | DON'T Build |
|-----------------|------|-----------|-------------|
| **Connector OS** | 4110 | API connectors | ❌ New connector |
| **Unified Support Bridge** | 4885 | Cross-channel integration | ❌ New bridge |

---

## WHAT TO ACTUALLY BUILD (Only NEW Stuff)

### Gap 1: InternetOS API Server + TypeScript Fix

**DON'T Build:**
- Database layer (use MemoryOS 4703)
- Storage (use Memory Substrate 4782)

**DO Build:**
```
internet-os/
├── api-server/           # NEW: HTTP endpoints
│   ├── src/
│   │   ├── index.ts      # Express server
│   │   ├── routes/
│   │   │   ├── actors.ts  # /api/actors/*
│   │   │   ├── watchers.ts # /api/watchers/*
│   │   │   └── history.ts # /api/history/*
│   │   └── middleware/
│   │       ├── auth.ts    # JWT validation
│   │       └── rate-limit.ts
│   └── tsconfig.json
├── actor-runtime/        # FIX: Add tsconfig, cheerio
│   ├── tsconfig.json     # NEW
│   ├── package.json      # FIX: Add dependencies
│   └── src/
│       ├── index.ts      # FIX: Replace DOMParser with cheerio
│       └── utils/
│           └── parseHtml.ts # NEW: Cheerio-based parser
└── watcher-runtime/     # FIX: Add tsconfig, MongoDB bridge
    ├── tsconfig.json     # NEW
    └── src/
        └── index.ts      # FIX: Bridge to MemoryOS
```

### Gap 2: Actor Enhancements

**DON'T Build:**
- NER/extraction (use Knowledge Extraction 4784)
- Entity storage (use TwinOS Hub 4705)
- Memory (use MemoryOS 4703)

**DO Build:**
```
actors/
├── shopify-actor/        # NEW
├── amazon-actor/         # NEW
├── twitter-actor/        # NEW
├── reddit-actor/         # NEW
├── glassdoor-actor/      # NEW
├── instagram-actor/       # NEW
├── youtube-actor/         # NEW
├── crunchbase-actor/      # NEW
├── github-actor/          # NEW
└── google-trends-actor/   # NEW
```

### Gap 3: Web-to-Twin Bridge

**DON'T Build:**
- Twin registry (use TwinOS Hub 4705)
- Twin storage (use MemoryOS 4703)
- Entity resolution (use Entity Resolution 4752)

**DO Build:**
```
internet-os/
├── twin-bridge/           # NEW: Glue code only
│   ├── src/
│   │   ├── companyTwinSync.ts   # Scraped → Company Twin
│   │   ├── marketTwinSync.ts    # Scraped → Market Twin
│   │   └── supplierTwinSync.ts  # Scraped → Supplier Twin
│   └── tests/
│       ├── companyTwinSync.test.ts
│       └── marketTwinSync.test.ts
```

### Gap 4: Skills Framework

**DON'T Build:**
- Skill registry (use SkillOS 4743)
- Workflow engine (use Flow OS 4938)
- Agent framework (use AgentOS 4802)

**DO Build:**
```
internet-os/
├── skills/               # NEW: Compositions only
│   ├── lead-generation/
│   │   ├── src/
│   │   │   ├── index.ts    # Orchestrates actors
│   │   │   └── prompt.ts   # Skill-specific prompts
│   │   └── tests/
│   ├── competitor-intel/
│   ├── restaurant-expansion/
│   ├── supplier-discovery/
│   ├── market-research/
│   └── pricing-intel/
```

### Gap 5: Memorizers (Historical Memory)

**DON'T Build:**
- Memory storage (use MemoryOS 4703)
- Temporal graph (use Memory Temporal 4794)
- Pattern detection (use Memory Observation 4785)

**DO Build:**
```
internet-os/
├── memorizers/           # NEW: Historical tracking
│   ├── src/
│   │   ├── priceHistory.ts      # Track price changes
│   │   ├── reviewTimeline.ts    # Track review changes
│   │   ├── competitorTimeline.ts # Track competitor changes
│   │   └── trendDetection.ts    # Detect trends from history
│   └── tests/
```

### Gap 6: Change Detection Engine

**DON'T Build:**
- Notification delivery (use Webhook Bus 4110)
- Alert system (use Emotion Alerts 4765)

**DO Build:**
```
internet-os/
├── change-detection/     # NEW: Algorithm + routing
│   ├── src/
│   │   ├── diffEngine.ts     # Compare snapshots
│   │   ├── snapshotEngine.ts # Take entity snapshots
│   │   ├── alertRouter.ts    # Route to Webhook Bus
│   │   └── thresholds.ts     # Configurable thresholds
│   └── tests/
```

---

## INTEGRATION ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INTERNETOS (NEW STUFF)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐                                                    │
│  │ API Server  │  ← NEW: HTTP endpoints (4595)                     │
│  │   (4595)    │     + TypeScript fixes                            │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │
│  │   Actors    │     │  Watchers   │     │   Skills    │          │
│  │  (7 built)  │     │  (3 built)  │     │  (0 built)  │          │
│  │ +10 new     │     │  +more      │     │  +5 core    │          │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘          │
│         │                    │                    │                  │
│         └────────────────────┼────────────────────┘                  │
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              REUSE EXISTING SERVICES                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                        │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                  │
│         ▼                    ▼                    ▼                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │
│  │  MemoryOS   │     │   TwinOS    │     │  Knowledge  │          │
│  │   (4703)    │     │   (4705)    │     │ Extraction  │          │
│  └─────────────┘     └─────────────┘     │   (4784)    │          │
│                                           └─────────────┘          │
│                              │                    │                  │
│                              ▼                    ▼                  │
│                      ┌─────────────┐     ┌─────────────┐          │
│                      │  Entity     │     │   AI        │          │
│                      │ Resolution  │     │ Intelligence │          │
│                      │  (4752)    │     │   (4881)    │          │
│                      └─────────────┘     └─────────────┘          │
│                                                                     │
│                              │                                        │
│                              ▼                                        │
│                      ┌─────────────┐                                │
│                      │  Webhook    │                                │
│                      │    Bus      │                                │
│                      │  (4110)     │                                │
│                      └─────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## BUILD ORDER (No Duplicates)

### Phase 0: Fix Current (Week 1)

**Goal:** Make existing code compile and work

| Task | DON'T Build | DO Build |
|------|-------------|----------|
| TypeScript setup | New compiler | `tsconfig.json` for each package |
| HTML parsing | New parser | Replace DOMParser with cheerio |
| Storage | New database | Bridge to Memory Substrate (4782) |
| Testing | New test framework | Add vitest + tests |
| API Server | New server | Express server wired to existing services |

**Files to Create:**
```
internet-os/
├── tsconfig.json                    # Root config
├── api-server/
│   ├── tsconfig.json
│   ├── package.json
│   └── src/index.ts
└── packages/
    ├── actor-runtime/
    │   ├── tsconfig.json           # NEW
    │   └── src/utils/parseHtml.ts  # NEW: cheerio-based
    └── watcher-runtime/
        ├── tsconfig.json           # NEW
        └── src/bridges/           # NEW: MemoryOS bridge
            └── memoryBridge.ts
```

### Phase 1: Actor Expansion (Week 2-4)

**Goal:** 17 actors total (7 existing + 10 new)

**Reuse:**
- Rate limiting (actor-runtime built-in)
- Error handling (actor-runtime built-in)
- Retry logic (actor-runtime built-in)

**New Actors:**
```
actors/
├── shopify-actor/          # NEW: Products, orders, customers
├── amazon-actor/          # NEW: Product listings, reviews
├── twitter-actor/         # NEW: Social monitoring, sentiment
├── reddit-actor/          # NEW: Community trends
├── glassdoor-actor/       # NEW: Company reviews, salaries
├── instagram-actor/       # NEW: Influencers, engagement
├── youtube-actor/         # NEW: Videos, comments
├── crunchbase-actor/       # NEW: Funding, acquisitions
├── github-actor/          # NEW: Open source activity
└── google-trends-actor/   # NEW: Search trends
```

### Phase 2: Web-to-Twin Bridge (Week 5-6)

**Goal:** Automatic twin creation from scraped data

**Reuse:**
- TwinOS Hub (4705) for registration
- Entity Resolution (4752) for deduplication
- MemoryOS (4703) for storage

**Build:**
```
internet-os/twin-bridge/
├── src/
│   ├── companySync.ts      # Scrape → Company Twin
│   ├── marketSync.ts      # Scrape → Market Twin
│   ├── supplierSync.ts     # Scrape → Supplier Twin
│   └── schedule.ts        # Cron-based sync
└── tests/
```

### Phase 3: Skills Framework (Week 7-10)

**Goal:** 5 core skills

**Reuse:**
- SkillOS (4743) for registry
- Flow OS (4938) for orchestration
- AI Intelligence (4881) for analysis

**Build:**
```
internet-os/skills/
├── lead-generation/
│   ├── src/index.ts        # Google Maps → LinkedIn → Email
│   └── tests/
├── competitor-intel/
│   ├── src/index.ts        # Multi-source analysis
│   └── tests/
├── restaurant-expansion/
│   ├── src/index.ts        # Market + supplier + location
│   └── tests/
└── [2 more core skills]
```

### Phase 4: Change Detection + Memorizers (Week 11-14)

**Goal:** Historical tracking and alerts

**Reuse:**
- Webhook Bus (4110) for notifications
- Emotion Alerts (4765) for escalation
- Memory Temporal (4794) for timeline
- Memory Observation (4785) for patterns

**Build:**
```
internet-os/
├── change-detection/
│   ├── src/
│   │   ├── diffEngine.ts
│   │   ├── snapshotEngine.ts
│   │   └── alertRouter.ts
│   └── tests/
└── memorizers/
    ├── src/
    │   ├── priceHistory.ts
    │   ├── reviewTimeline.ts
    │   └── trendDetection.ts
    └── tests/
```

### Phase 5: Integration + Testing (Week 15-16)

**Goal:** Production-ready with full integration

**Reuse:**
- All existing services (35+)
- Unified Support Bridge (4885) for monitoring
- Review Scrapers (5456) for review intelligence

**Build:**
```
internet-os/
├── integration/
│   ├── src/
│   │   ├── memoryIntegration.ts
│   │   ├── twinIntegration.ts
│   │   ├── webhookIntegration.ts
│   │   └── skillIntegration.ts
│   └── tests/
└── e2e/
    └── tests/
```

---

## COMPLETE BUILD清单

### What to CREATE (NEW)

| # | File/Directory | Type | Priority |
|---|----------------|------|----------|
| 1 | `internet-os/tsconfig.json` | Config | P0 |
| 2 | `internet-os/api-server/` | Directory | P0 |
| 3 | `actor-runtime/tsconfig.json` | Config | P0 |
| 4 | `actor-runtime/package.json` (fix) | Config | P0 |
| 5 | `actor-runtime/src/utils/parseHtml.ts` | Code | P0 |
| 6 | `watcher-runtime/tsconfig.json` | Config | P0 |
| 7 | `watcher-runtime/src/bridges/` | Directory | P1 |
| 8 | `actors/shopify-actor/` | Actor | P1 |
| 9 | `actors/amazon-actor/` | Actor | P1 |
| 10 | `actors/twitter-actor/` | Actor | P1 |
| 11 | `actors/reddit-actor/` | Actor | P1 |
| 12 | `actors/glassdoor-actor/` | Actor | P1 |
| 13 | `actors/instagram-actor/` | Actor | P2 |
| 14 | `actors/youtube-actor/` | Actor | P2 |
| 15 | `actors/crunchbase-actor/` | Actor | P2 |
| 16 | `actors/github-actor/` | Actor | P2 |
| 17 | `actors/google-trends-actor/` | Actor | P2 |
| 18 | `twin-bridge/` | Bridge | P2 |
| 19 | `skills/lead-generation/` | Skill | P2 |
| 20 | `skills/competitor-intel/` | Skill | P2 |
| 21 | `skills/restaurant-expansion/` | Skill | P2 |
| 22 | `skills/supplier-discovery/` | Skill | P3 |
| 23 | `skills/market-research/` | Skill | P3 |
| 24 | `change-detection/` | Engine | P3 |
| 25 | `memorizers/` | Engine | P3 |
| 26 | `__tests__/` directories | Tests | P0 |

**Total NEW Files:** ~50 files, ~5,000 LOC

### What to REUSE (EXISTING)

| Category | Services | Ports | Purpose |
|----------|----------|-------|---------|
| **Memory** | MemoryOS, Memory Intelligence, Memory Substrate, Memory Temporal, Memory Import | 4703, 4786, 4782, 4794, 4780 | Store all scraped data |
| **Twins** | TwinOS Hub, Organization Twin, Product Twin | 4705, 4710, 4720 | Register entities |
| **Knowledge** | Knowledge Extraction, Entity Resolution, Reasoning | 4784, 4752, 4753 | Extract & deduplicate |
| **Skills** | SkillOS, Flow OS, Skill Library | 4743, 4938, 4806 | Skills framework |
| **Notifications** | Webhook Bus, Emotion Alerts, Notification OS | 4110, 4765, 4750 | Alerts |
| **Intelligence** | AI Intelligence, SimulationOS | 4881, 4874 | AI analysis |
| **Review** | Review Scrapers, BrandPulse | 5456, - | Review intelligence |

**Total REUSE:** 35+ existing services

---

## NO-DUPLICATE RULES

```
❌ DON'T Build                    ✅ DO Instead
─────────────────────────────────────────────────────────────
New memory layer                 Use MemoryOS (4703)
New twin registry                Use TwinOS Hub (4705)
New database                     Use Memory Substrate (4782)
New NER/extraction              Use Knowledge Extraction (4784)
New entity deduplication        Use Entity Resolution (4752)
New skill registry              Use SkillOS (4743)
New workflow engine             Use Flow OS (4938)
New webhook system              Use Webhook Bus (4110)
New notification                Use Notification OS (4750)
New AI service                  Use AI Intelligence (4881)
New sentiment analysis          Use Review Scrapers (5456)
New simulation                   Use SimulationOS (4874)
```

---

## PORT REGISTRY (InternetOS)

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| **InternetOS API Server** | 4595 | ❌ Build | Express server |
| **Actor Runtime** | - | ⚠️ Fix | Add tsconfig, cheerio |
| **Watcher Runtime** | - | ⚠️ Fix | Add MongoDB bridge |
| **Review Scrapers** | 5456 | ✅ Existing | Reuse |
| **Knowledge Extraction** | 4784 | ✅ Existing | Reuse |

---

## TIMELINE

```
Week 1:   Phase 0 — Fix current (tsconfig, cheerio, tests)
Week 2-4: Phase 1 — 10 new actors
Week 5-6: Phase 2 — Twin bridge
Week 7-10: Phase 3 — 5 core skills
Week 11-14: Phase 4 — Change detection + memorizers
Week 15-16: Phase 5 — Integration + testing

Total: 16 weeks (~4 months)
```

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Actors | 17 (7 existing + 10 new) |
| Skills | 5 core skills |
| Twin Syncs | 3 (Company, Market, Supplier) |
| Tests | 100% coverage on new code |
| Integration | All 35+ existing services connected |
| API Endpoints | 20+ endpoints on port 4595 |

---

*Last Updated: June 30, 2026*
*InternetOS Build Plan — No Duplicates — HOJAI AI*
