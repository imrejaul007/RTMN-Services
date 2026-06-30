# InternetOS Master Plan — Complete

**Date:** June 30, 2026
**Status:** READY TO BUILD
**Philosophy:** REUSE FIRST, BUILD SECOND

---

## THE SITUATION

### What We Have
- 7 actors (Google Maps, Zomato, Airbnb, LinkedIn, News, Company Intel, JustDial)
- Actor runtime framework (~266 LOC)
- Watcher runtime framework (~346 LOC)
- **35+ existing HOJAI services to reuse**

### What's Broken
- No TypeScript compilation (missing tsconfig.json)
- DOMParser is browser-only (won't work in Node.js)
- No tests
- In-memory only (no MongoDB)
- No API server

### What We Need
- 10 more actors
- Skills framework
- Web-to-Twin bridge
- Change detection
- Memorizers

---

## THE RULE: REUSE FIRST

### DON'T Rebuild These (Use Existing Services)

| Category | Use This | Port | For |
|----------|----------|------|-----|
| **Memory** | MemoryOS | 4703 | Store scraped data |
| **Memory DB** | Memory Substrate | 4782 | PostgreSQL + pgvector |
| **Temporal** | Memory Temporal | 4794 | Historical timelines |
| **Twins** | TwinOS Hub | 4705 | Register entities |
| **Twins** | Organization Twin | 4710 | Company entities |
| **Twins** | Product Twin | 4720 | Product entities |
| **Extraction** | Knowledge Extraction | 4784 | NER, entity linking |
| **Deduplication** | Entity Resolution | 4752 | Deduplicate entities |
| **Skills** | SkillOS | 4743 | Skill registry |
| **Workflows** | Flow OS | 4938 | Workflow orchestration |
| **Webhooks** | Webhook Bus | 4110 | Real-time notifications |
| **Alerts** | Emotion Alerts | 4765 | Alert escalation |
| **AI** | AI Intelligence | 4881 | LLM analysis |
| **Reviews** | Review Scrapers | 5456 | Review aggregation |
| **Simulation** | SimulationOS | 4874 | What-if scenarios |

**Full list:** [INTERNETOS-REUSE-AUDIT.md](INTERNETOS-REUSE-AUDIT.md)

---

## WHAT TO BUILD (Only New Stuff)

### Phase 0: Fix Current (Week 1)

```
internet-os/
├── tsconfig.json                    # FIX: Add TypeScript
├── api-server/                       # NEW: Express server (port 4595)
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── routes/
│       │   ├── actors.ts
│       │   ├── watchers.ts
│       │   └── history.ts
│       └── middleware/
│           ├── auth.ts
│           └── rate-limit.ts
├── actor-runtime/
│   ├── tsconfig.json               # FIX: Add TypeScript
│   ├── package.json                # FIX: Add dependencies
│   └── src/
│       └── utils/
│           └── parseHtml.ts        # FIX: Replace DOMParser with cheerio
└── watcher-runtime/
    ├── tsconfig.json               # FIX: Add TypeScript
    └── src/
        └── bridges/
            └── memoryBridge.ts     # NEW: Bridge to MemoryOS
```

**Don't build:** Database, storage, extraction - use existing services

### Phase 1: Actor Expansion (Week 2-4)

| Actor | Priority | Why |
|-------|----------|-----|
| Shopify | P0 | Commerce, products, orders |
| Amazon | P0 | Products, pricing, reviews |
| Twitter/X | P1 | Social monitoring, sentiment |
| Reddit | P1 | Community trends, discussions |
| Glassdoor | P1 | Company reviews, salaries |
| Instagram | P2 | Influencers, engagement |
| YouTube | P2 | Videos, comments |
| Crunchbase | P2 | Funding, acquisitions |
| GitHub | P2 | Open source activity |
| Google Trends | P2 | Search trends |

**Don't build:** Rate limiting, retry logic, error handling - reuse actor-runtime

### Phase 2: Web-to-Twin Bridge (Week 5-6)

```
internet-os/twin-bridge/
├── src/
│   ├── companySync.ts      # Scrape → Company Twin (use TwinOS Hub 4705)
│   ├── marketSync.ts      # Scrape → Market Twin (use Organization Twin 4710)
│   └── supplierSync.ts     # Scrape → Supplier Twin
└── tests/
```

**Don't build:** Twin registry, twin storage - use existing TwinOS Hub (4705)

### Phase 3: Skills Framework (Week 7-10)

| Skill | Actors Used | Output |
|-------|-------------|--------|
| **Lead Generation** | Google Maps → LinkedIn → Email Finder | Qualified leads |
| **Competitor Intel** | Google Maps → Reviews → News → Social | Competitor report |
| **Restaurant Expansion** | Maps → Zomato → Reviews → Suppliers | Location analysis |
| **Supplier Discovery** | Maps → LinkedIn → Reviews → Tenders | Supplier shortlist |
| **Market Research** | News → Reddit → Trends | Market report |

**Don't build:** Skill registry, workflow engine - use SkillOS (4743) + Flow OS (4938)

### Phase 4: Change Detection + Memorizers (Week 11-14)

```
internet-os/
├── change-detection/
│   ├── src/
│   │   ├── diffEngine.ts        # Compare snapshots
│   │   ├── snapshotEngine.ts    # Take entity snapshots
│   │   └── alertRouter.ts       # Route to Webhook Bus (4110)
│   └── tests/
└── memorizers/
    ├── src/
    │   ├── priceHistory.ts      # Store in Memory Temporal (4794)
    │   ├── reviewTimeline.ts
    │   └── trendDetection.ts    # Use Memory Observation (4854)
    └── tests/
```

**Don't build:** Notifications, storage - use Webhook Bus (4110) + MemoryOS (4703)

---

## INTEGRATION MAP

```
SCRAPE (Actors)
    ↓
EXTRACT (Knowledge Extraction 4784)
    ↓
STORE (MemoryOS 4703)
    ↓
TWIN (TwinOS Hub 4705)
    ↓
ANALYZE (AI Intelligence 4881)
    ↓
NOTIFY (Webhook Bus 4110)
    ↓
ACTION (Flow OS 4938)
```

---

## NO-DUPLICATE CHECKLIST

Before building anything, ask:

```
❌ Is there already a service for this?
   ✅ Check ports: 4703 (Memory), 4705 (Twin), 4784 (Knowledge), 4743 (Skills)

❌ Is there already a database?
   ✅ Use Memory Substrate (4782) - PostgreSQL + pgvector

❌ Is there already an API?
   ✅ Use existing HTTP clients to call existing services

❌ Is there already a notification system?
   ✅ Use Webhook Bus (4110) for events

❌ Is there already AI/ML?
   ✅ Use AI Intelligence (4881) for LLM calls
```

---

## BUILD清单 (What to Create)

### Config Files (P0)
- [ ] `internet-os/tsconfig.json`
- [ ] `internet-os/api-server/tsconfig.json`
- [ ] `internet-os/actor-runtime/tsconfig.json`
- [ ] `internet-os/actor-runtime/package.json` (fix)
- [ ] `internet-os/watcher-runtime/tsconfig.json`

### API Server (P0)
- [ ] `internet-os/api-server/src/index.ts`
- [ ] `internet-os/api-server/src/routes/actors.ts`
- [ ] `internet-os/api-server/src/routes/watchers.ts`
- [ ] `internet-os/api-server/src/routes/history.ts`
- [ ] `internet-os/api-server/src/middleware/auth.ts`
- [ ] `internet-os/api-server/src/middleware/rate-limit.ts`

### Actor Fixes (P0)
- [ ] `internet-os/actor-runtime/src/utils/parseHtml.ts` (cheerio)
- [ ] `actor-runtime/__tests__/` (add tests)

### New Actors (P1-P2)
- [ ] `actors/shopify-actor/`
- [ ] `actors/amazon-actor/`
- [ ] `actors/twitter-actor/`
- [ ] `actors/reddit-actor/`
- [ ] `actors/glassdoor-actor/`
- [ ] `actors/instagram-actor/`
- [ ] `actors/youtube-actor/`
- [ ] `actors/crunchbase-actor/`
- [ ] `actors/github-actor/`
- [ ] `actors/google-trends-actor/`

### Twin Bridge (P2)
- [ ] `internet-os/twin-bridge/src/companySync.ts`
- [ ] `internet-os/twin-bridge/src/marketSync.ts`
- [ ] `internet-os/twin-bridge/src/supplierSync.ts`

### Skills (P2-P3)
- [ ] `internet-os/skills/lead-generation/`
- [ ] `internet-os/skills/competitor-intel/`
- [ ] `internet-os/skills/restaurant-expansion/`
- [ ] `internet-os/skills/supplier-discovery/`
- [ ] `internet-os/skills/market-research/`

### Change Detection (P3)
- [ ] `internet-os/change-detection/src/diffEngine.ts`
- [ ] `internet-os/change-detection/src/snapshotEngine.ts`
- [ ] `internet-os/change-detection/src/alertRouter.ts`

### Memorizers (P3)
- [ ] `internet-os/memorizers/src/priceHistory.ts`
- [ ] `internet-os/memorizers/src/reviewTimeline.ts`
- [ ] `internet-os/memorizers/src/trendDetection.ts`

---

## TIMELINE

```
Week 1:    Phase 0 — Fix current (tsconfig, cheerio, API server, tests)
Week 2-4:  Phase 1 — 10 new actors
Week 5-6:  Phase 2 — Twin bridge
Week 7-10: Phase 3 — 5 core skills
Week 11-14: Phase 4 — Change detection + memorizers
Week 15-16: Phase 5 — Integration + testing

Total: 16 weeks (~4 months)
```

---

## SUCCESS CRITERIA

| Metric | Target |
|--------|--------|
| Actors | 17 (7 existing + 10 new) |
| Skills | 5 core skills |
| Twin Synchs | 3 (Company, Market, Supplier) |
| Tests | 100% coverage on new code |
| API Endpoints | 20+ endpoints |
| Existing Services Used | 15+ services reused |

---

## KEY DOCUMENTS

| Document | Purpose |
|----------|---------|
| [INTERNETOS-MASTER-PLAN.md](INTERNETOS-MASTER-PLAN.md) | ← YOU ARE HERE |
| [INTERNETOS-NON-DUPLICATE-PLAN.md](INTERNETOS-NON-DUPLICATE-PLAN.md) | Detailed build plan with code |
| [INTERNETOS-REUSE-AUDIT.md](INTERNETOS-REUSE-AUDIT.md) | All 35+ reusable services |
| [INTERNETOS-CODE-AUDIT.md](INTERNETOS-CODE-AUDIT.md) | What's broken and why |
| [INTERNETOS-AUDIT.md](INTERNETOS-AUDIT.md) | What's built vs missing |
| [INTERNETOS-EXECUTIVE-SUMMARY.md](INTERNETOS-EXECUTIVE-SUMMARY.md) | Strategic overview |

---

## THE BOTTOM LINE

```
BEFORE:  "Build everything from scratch"
AFTER:   "Build only what's new, reuse everything else"

Savings: ~70% of work already done via existing services
Time:    ~4 months instead of ~12 months
Quality: Leverages 35+ battle-tested services
```

---

*Last Updated: June 30, 2026*
*InternetOS Master Plan — HOJAI AI*
