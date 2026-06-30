# InternetOS Implementation Plan

**Status:** APPROVED - Ready to Build
**Date:** June 30, 2026
**Principle:** REUSE FIRST, BUILD SECOND

---

## SITUATION ANALYSIS

### Existing Code (Broken)
| Component | Status | Issues |
|-----------|--------|--------|
| `actor-runtime/` | ❌ BROKEN | No tsconfig.json, incomplete package.json, DOMParser won't work in Node.js |
| `watcher-runtime/` | ❌ BROKEN | No package.json, wrong import path, DOMParser |
| 7 Actors | ❌ BROKEN | No tsconfig, no package.json, zero tests |

### Existing Services to REUSE (35+)
| Service | Port | Use For |
|---------|------|---------|
| MemoryOS | 4703 | Store scraped data |
| Memory Substrate | 4782 | PostgreSQL + pgvector |
| TwinOS Hub | 4705 | Register entities as twins |
| Knowledge Extraction | 4784 | NER, entity linking |
| Entity Resolution | 4752 | Deduplicate entities |
| SkillOS | 4743 | Register skills |
| Flow OS | 4938 | Workflow orchestration |
| Webhook Bus | 4110 | Real-time notifications |
| AI Intelligence | 4881 | LLM analysis |
| SimulationOS | 4874 | What-if scenarios |

**See:** [INTERNETOS-REUSE-AUDIT.md](companies/HOJAI-AI/docs/INTERNETOS-REUSE-AUDIT.md)

---

## IMPLEMENTATION PHASES

### PHASE 0: Fix Existing Code (Week 1)

**Goal:** Make existing code compile and runnable

#### Task 0.1: Fix actor-runtime

```
platform/internet-os/actor-runtime/
├── tsconfig.json                          # NEW
├── package.json                           # FIX: Add dependencies
├── vitest.config.ts                       # NEW
└── src/
    ├── index.ts                           # FIX: Export classes
    └── utils/
        └── parseHtml.ts                   # NEW: Cheerio-based parser (replace DOMParser)
```

**Files to CREATE:**
- `tsconfig.json`
- `vitest.config.ts`
- `src/utils/parseHtml.ts`

**Files to FIX:**
- `package.json` - Add dependencies (cheerio, typescript, vitest)
- `src/index.ts` - Export ActorRuntime, Actor, fetchUrl, parseHtml

#### Task 0.2: Fix watcher-runtime

```
platform/internet-os/watcher-runtime/
├── tsconfig.json                          # NEW
├── package.json                           # NEW
├── vitest.config.ts                       # NEW
└── src/
    ├── index.ts                           # FIX: Import path, DOMParser
    └── bridges/
        └── memoryBridge.ts                # NEW: Bridge to MemoryOS (4703)
```

**Files to CREATE:**
- `tsconfig.json`
- `package.json`
- `vitest.config.ts`
- `src/bridges/memoryBridge.ts` → Uses MemoryOS (4703)

**Files to FIX:**
- `src/index.ts` - Fix import from `../actor-runtime` to proper path

#### Task 0.3: Add tests

```
platform/internet-os/
├── __tests__/
│   ├── actor-runtime.test.ts              # NEW
│   └── watcher-runtime.test.ts            # NEW
└── vitest.config.ts                      # Root config
```

### PHASE 1: API Server (Week 1-2)

**Goal:** HTTP endpoints for actors/watchers on port 4595

```
platform/internet-os/api-server/
├── tsconfig.json                          # NEW
├── package.json                           # NEW
├── vitest.config.ts                       # NEW
└── src/
    ├── index.ts                           # NEW: Express server
    ├── config.ts                          # NEW: Config
    ├── routes/
    │   ├── actors.ts                      # NEW: /api/actors/*
    │   ├── watchers.ts                    # NEW: /api/watchers/*
    │   └── history.ts                    # NEW: /api/history/*
    ├── middleware/
    │   ├── auth.ts                        # NEW: JWT validation
    │   └── rate-limit.ts                 # NEW: Rate limiting
    ├── integrations/                       # REUSE existing services
    │   ├── memory.ts                     # NEW: Bridge to MemoryOS (4703)
    │   ├── twin.ts                        # NEW: Bridge to TwinOS (4705)
    │   ├── knowledge.ts                    # NEW: Bridge to Knowledge Extraction (4784)
    │   ├── webhook.ts                     # NEW: Bridge to Webhook Bus (4110)
    │   └── skill.ts                       # NEW: Bridge to SkillOS (4743)
    └── services/
        ├── actorService.ts                # NEW: Actor execution
        └── watcherService.ts              # NEW: Watcher management
```

**Integrations (REUSE, don't rebuild):**
- `integrations/memory.ts` → MemoryOS (4703) - Store scraped data
- `integrations/twin.ts` → TwinOS Hub (4705) - Register entities
- `integrations/knowledge.ts` → Knowledge Extraction (4784) - NER, facts
- `integrations/webhook.ts` → Webhook Bus (4110) - Notifications
- `integrations/skill.ts` → SkillOS (4743) - Register skills

### PHASE 2: Fix + Expand Actors (Week 2-4)

#### Task 2.1: Fix 7 existing actors

```
platform/internet-os/actors/
├── google-maps-actor/
│   ├── tsconfig.json                      # NEW
│   ├── package.json                       # NEW
│   └── src/index.ts                       # FIX: Use cheerio, add error handling
├── zomato-actor/
│   ├── tsconfig.json                      # NEW
│   ├── package.json                       # NEW
│   └── src/index.ts                       # FIX: Use cheerio
├── airbnb-actor/
│   ├── tsconfig.json                      # NEW
│   ├── package.json                       # NEW
│   └── src/index.ts                       # FIX: Use cheerio, multi-currency
├── linkedin-actor/
│   ├── tsconfig.json                      # NEW
│   ├── package.json                       # NEW
│   └── src/index.ts                       # FIX: Add auth headers
├── news-actor/
│   ├── tsconfig.json                      # NEW
│   ├── package.json                       # NEW
│   └── src/index.ts                       # FIX: Use cheerio
├── company-intel-actor/
│   ├── tsconfig.json                      # NEW
│   ├── package.json                       # NEW
│   └── src/index.ts                       # FIX: Add API fallbacks
└── justdial-actor/
    ├── tsconfig.json                      # NEW
    ├── package.json                       # NEW
    └── src/index.ts                       # FIX: Use cheerio
```

#### Task 2.2: Add 10 new actors

```
platform/internet-os/actors/
├── shopify-actor/                        # NEW
│   ├── tsconfig.json
│   ├── package.json
│   └── src/index.ts
├── amazon-actor/                          # NEW
├── twitter-actor/                        # NEW
├── reddit-actor/                         # NEW
├── glassdoor-actor/                     # NEW
├── instagram-actor/                      # NEW
├── youtube-actor/                        # NEW
├── crunchbase-actor/                    # NEW
├── github-actor/                         # NEW
└── google-trends-actor/                 # NEW
```

### PHASE 3: Web-to-Twin Bridge (Week 5-6)

```
platform/internet-os/twin-bridge/
├── tsconfig.json                          # NEW
├── package.json                           # NEW
├── vitest.config.ts                       # NEW
└── src/
    ├── index.ts                           # NEW: Main bridge service
    ├── sync/
    │   ├── companySync.ts                 # NEW: Company → TwinOS (4705)
    │   ├── marketSync.ts                 # NEW: Market → TwinOS (4705)
    │   └── supplierSync.ts               # NEW: Supplier → TwinOS (4705)
    ├── schedulers/
    │   └── cronSync.ts                   # NEW: Scheduled sync
    └── tests/
```

**REUSE:**
- TwinOS Hub (4705) - For twin registration
- Entity Resolution (4752) - For deduplication
- MemoryOS (4703) - For storage

### PHASE 4: Skills Framework (Week 7-10)

```
platform/internet-os/skills/
├── lead-generation/                       # NEW
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── index.ts                       # Google Maps → LinkedIn → Email
│       ├── prompts.ts                     # Skill-specific prompts
│       └── tests/
├── competitor-intel/                     # NEW
├── restaurant-expansion/                 # NEW
├── supplier-discovery/                   # NEW
└── market-research/                      # NEW
```

**REUSE:**
- SkillOS (4743) - For skill registration
- Flow OS (4938) - For orchestration
- AI Intelligence (4881) - For analysis

### PHASE 5: Change Detection + Memorizers (Week 11-14)

```
platform/internet-os/
├── change-detection/
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── diffEngine.ts                  # Compare snapshots
│       ├── snapshotEngine.ts              # Take entity snapshots
│       ├── alertRouter.ts                # Route to Webhook Bus (4110)
│       └── tests/
└── memorizers/
    ├── tsconfig.json
    ├── package.json
    └── src/
        ├── priceHistory.ts               # → Memory Temporal (4794)
        ├── reviewTimeline.ts             # → MemoryOS (4703)
        ├── trendDetection.ts             # → Memory Observation (4785)
        └── tests/
```

**REUSE:**
- Webhook Bus (4110) - For notifications
- Memory Temporal (4794) - For historical timelines
- Memory Observation (4785) - For pattern detection

---

## COMPLETE FILE清单

### Config Files to CREATE

| File | Phase | Priority |
|------|-------|----------|
| `actor-runtime/tsconfig.json` | 0 | P0 |
| `actor-runtime/vitest.config.ts` | 0 | P0 |
| `actor-runtime/package.json` (fix) | 0 | P0 |
| `watcher-runtime/tsconfig.json` | 0 | P0 |
| `watcher-runtime/package.json` | 0 | P0 |
| `watcher-runtime/vitest.config.ts` | 0 | P0 |
| `api-server/tsconfig.json` | 1 | P0 |
| `api-server/package.json` | 1 | P0 |
| `api-server/vitest.config.ts` | 1 | P1 |
| Each actor: `tsconfig.json` | 2 | P0 |
| Each actor: `package.json` | 2 | P0 |
| `twin-bridge/tsconfig.json` | 3 | P1 |
| `twin-bridge/package.json` | 3 | P1 |
| Each skill: `tsconfig.json` | 4 | P1 |
| Each skill: `package.json` | 4 | P1 |
| `change-detection/tsconfig.json` | 5 | P2 |
| `change-detection/package.json` | 5 | P2 |
| `memorizers/tsconfig.json` | 5 | P2 |
| `memorizers/package.json` | 5 | P2 |

### Code Files to CREATE

| File | Phase | REUSE |
|------|-------|-------|
| `actor-runtime/src/utils/parseHtml.ts` | 0 | Uses cheerio |
| `watcher-runtime/src/bridges/memoryBridge.ts` | 0 | → MemoryOS (4703) |
| `api-server/src/index.ts` | 1 | - |
| `api-server/src/config.ts` | 1 | - |
| `api-server/src/routes/actors.ts` | 1 | - |
| `api-server/src/routes/watchers.ts` | 1 | - |
| `api-server/src/routes/history.ts` | 1 | - |
| `api-server/src/middleware/auth.ts` | 1 | - |
| `api-server/src/middleware/rate-limit.ts` | 1 | - |
| `api-server/src/integrations/memory.ts` | 1 | → MemoryOS (4703) |
| `api-server/src/integrations/twin.ts` | 1 | → TwinOS (4705) |
| `api-server/src/integrations/knowledge.ts` | 1 | → Knowledge Extraction (4784) |
| `api-server/src/integrations/webhook.ts` | 1 | → Webhook Bus (4110) |
| `api-server/src/integrations/skill.ts` | 1 | → SkillOS (4743) |
| `api-server/src/services/actorService.ts` | 1 | - |
| `api-server/src/services/watcherService.ts` | 1 | - |
| Each actor: `src/index.ts` | 2 | Uses actor-runtime |
| `twin-bridge/src/index.ts` | 3 | - |
| `twin-bridge/src/sync/companySync.ts` | 3 | → TwinOS (4705) |
| `twin-bridge/src/sync/marketSync.ts` | 3 | → TwinOS (4705) |
| `twin-bridge/src/sync/supplierSync.ts` | 3 | → TwinOS (4705) |
| `twin-bridge/src/schedulers/cronSync.ts` | 3 | - |
| Each skill: `src/index.ts` | 4 | → SkillOS (4743) |
| Each skill: `src/prompts.ts` | 4 | - |
| `change-detection/src/diffEngine.ts` | 5 | - |
| `change-detection/src/snapshotEngine.ts` | 5 | - |
| `change-detection/src/alertRouter.ts` | 5 | → Webhook Bus (4110) |
| `memorizers/src/priceHistory.ts` | 5 | → Memory Temporal (4794) |
| `memorizers/src/reviewTimeline.ts` | 5 | → MemoryOS (4703) |
| `memorizers/src/trendDetection.ts` | 5 | → Memory Observation (4785) |

---

## INTEGRATION WIRING

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNETOS (BUILD)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Actors    │    │  Watchers   │    │   Skills    │          │
│  │  (17 total) │    │  (basic)    │    │  (5 core)   │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                   │                   │                  │
│         └───────────────────┼───────────────────┘                  │
│                             │                                      │
│                             ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    API Server (4595)                          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                             │                                      │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   MemoryOS    │   │    TwinOS     │   │   Knowledge   │
│    (4703)     │   │    (4705)     │   │   (4784)     │
│               │   │               │   │               │
│ Store scraped │   │ Register       │   │ NER, entity   │
│ data          │   │ entities      │   │ linking       │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        │                     ▼                     │
        │             ┌───────────────┐             │
        │             │   Entity      │             │
        │             │ Resolution    │             │
        │             │   (4752)      │             │
        │             └───────────────┘             │
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │     SkillOS       │
                    │     (4743)        │
                    │                   │
                    │ Register skills  │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Webhook Bus     │
                    │    (4110)         │
                    │                   │
                    │ Notifications     │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  AI Intelligence │
                    │    (4881)        │
                    │                   │
                    │ LLM analysis     │
                    └───────────────────┘
```

---

## NO-DUPLICATE RULES

```
❌ DON'T BUILD                    ✅ REUSE INSTEAD
────────────────────────────────────────────────────────────────────
New storage layer            → MemoryOS (4703)
New database                 → Memory Substrate (4782)
New temporal storage         → Memory Temporal (4794)
New pattern detection        → Memory Observation (4785)
New twin registry            → TwinOS Hub (4705)
New entity deduplication      → Entity Resolution (4752)
New NER/extraction           → Knowledge Extraction (4784)
New skill registry           → SkillOS (4743)
New workflow engine          → Flow OS (4938)
New notification system       → Webhook Bus (4110)
New AI service               → AI Intelligence (4881)
New simulation                → SimulationOS (4874)
```

---

## TIMELINE

```
Week 1:    Phase 0 — Fix actor-runtime + watcher-runtime
           + Setup tsconfig, cheerio, tests
Week 1-2:  Phase 1 — API Server + integrations
Week 2-4:  Phase 2 — Fix 7 existing actors + Add 10 new actors
Week 5-6:  Phase 3 — Web-to-Twin Bridge
Week 7-10:  Phase 4 — Skills Framework (5 core skills)
Week 11-14: Phase 5 — Change Detection + Memorizers

Total: 14 weeks (~3.5 months)
```

---

## SUCCESS METRICS

| Metric | Week 4 | Week 8 | Week 14 |
|--------|--------|--------|---------|
| Actors | 7 fixed | 17 total | 17 |
| API Endpoints | 20+ | 30+ | 40+ |
| Skills | 0 | 3 | 5 |
| Twin Synchs | 0 | 2 | 3 |
| Integration Points | 5 | 10 | 15 |
| Test Coverage | 60% | 80% | 90% |

---

## STARTUP SCRIPT

```bash
#!/bin/bash
# start-internet-os.sh

echo "Starting InternetOS..."

# Start API Server (port 4595)
cd /platform/internet-os/api-server
npm start &
API_PID=$!

# Wait for services
sleep 2

# Health check
curl -s http://localhost:4595/health || echo "API Server failed"

echo "InternetOS started on port 4595"
echo "API PID: $API_PID"
```

---

## MD DOCUMENTATION FILES

| File | Content |
|------|---------|
| `docs/INTERNETOS-MASTER-PLAN.md` | Strategic overview |
| `docs/INTERNETOS-BUILD-PLAN.md` | Phase-by-phase build |
| `docs/INTERNETOS-INTEGRATION.md` | Service wiring |
| `docs/INTERNETOS-API.md` | API reference |
| `docs/INTERNETOS-SDKS.md` | SDK usage guide |

---

## KEY PRINCIPLES

1. **REUSE FIRST** - Every new file must ask "does this exist already?"
2. **WIRE NOT REBUILD** - Connect to existing services via SDKs/HTTP
3. **TESTS REQUIRED** - Every new file needs tests
4. **NO DUPLICATES** - Check 4703, 4705, 4784, 4743, 4110 before building
5. **PROGRESSIVE** - Phase 0 must complete before Phase 1

---

*Plan prepared: June 30, 2026*
*Ready for implementation*
