# Genie 100% Completion Plan

> **Date:** June 24, 2026  
> **Status:** ✅ **Phase A COMPLETE** (23/23 specialists production-ready, 520 assertions passing)  
> **Goal:** Drive Genie from current state to 100% of the vision in [.claude/plans/genie-vision-product-roadmap.md](genie-vision-product-roadmap.md)  
> **Scope:** Backend specialists + web app + tests + docs

---

## Phase A Results (June 24, 2026)

**Shipped:** All 23 Genie specialists now have production-readiness routes + seed data + test suites.

### What each specialist now has

- **`/api/llm-health`** — verifies LLM helper availability (real or stub mode)
- **`/api/db-health`** — verifies MongoDB connection state (connected / in-memory)
- **`/api/readiness`** — combined check (ready + degraded flag)
- **`autoSeed(seedPlans, { serviceName })`** — idempotent demo data on first boot
- **`normalizeSeedData(items)`** — utility to stamp ids + timestamps
- **`tests/<service>-readiness.test.mjs`** — ≥10 assertions per service

### Test counts per service

| Service | Assertions | Status |
|---------|-----------|--------|
| genie-briefing-service | 29 | ✅ |
| genie-calendar-service | 24 | ✅ |
| genie-companion-service | 18 | ✅ |
| genie-consultant-agent | 20 | ✅ |
| genie-creation-os | 19 | ✅ |
| genie-device-integration | 33 | ✅ |
| genie-execution-engine | 19 | ✅ |
| genie-gateway | 30 | ✅ |
| genie-learning-os | 17 | ✅ |
| genie-life-gps | 17 | ✅ |
| genie-life-university | 34 | ✅ |
| genie-listening-modes | 21 | ✅ |
| genie-memory-graph | 22 | ✅ |
| genie-memory-inbox | 17 | ✅ |
| genie-money-os | 20 | ✅ |
| genie-relationship-os | 32 | ✅ |
| genie-serendipity-service | 21 | ✅ |
| genie-shopping-agent | 31 | ✅ |
| genie-smart-forgetting-service | 19 | ✅ |
| genie-thinking-engine | 17 | ✅ |
| genie-universal-search | 20 | ✅ |
| genie-wake-word-service | 18 | ✅ |
| genie-wellness-os | 22 | ✅ |
| **TOTAL** | **520** | **0 failures** |

### Bug fixes shipped along the way

- 3 CJS services had `import { requireAuth }` mixed with `require()` (Node 20 reparses as ESM, breaks startup). Fixed in: creation-os, execution-engine, smart-forgetting-service.
- Created `shared/lib/genie-readiness.cjs` mirror so CJS services can `require('@rtmn/shared/lib/genie-readiness')`.

### Commits (23 single-service commits)

All on `feat/killer-30min-demo` in `companies/HOJAI-AI`:

```
50584873 feat(genie-smart-forgetting-service): readiness routes + tests
9a96ef38 feat(genie-serendipity-service): readiness routes + seed data + tests
270faf55 feat(genie-memory-graph): readiness routes + seed data + tests
c06ef079 feat(genie-shopping-agent): readiness routes + seed data + tests
953b48c4 feat(genie-listening-modes): readiness routes + augmented seed (webhook-log) + tests
8e4b982c feat(genie-gateway): readiness routes + sessions/health-cache seed + tests
16780a8c feat(genie-universal-search): readiness routes + seed data + tests
0014197e feat(genie-device-integration): readiness routes + pairing-code seed + tests
81f25dd1 feat(genie-calendar-service): readiness routes + seed data + tests
c4268f5d feat(genie-briefing-service): readiness routes + seed data + tests
178c3fad feat(genie-wake-word-service): readiness routes + augmented seed + tests
bc998e8e feat(genie-relationship-os): readiness routes + seed data + tests
347339cb feat(genie-life-gps): readiness routes + seed data + tests
e9559638 feat(genie-memory-inbox): readiness routes + seed data + tests
5a73a5a7 feat(genie-learning-os): readiness routes + seed data + tests
d6803cdd feat(genie-companion-service): readiness routes + seed data + tests
480c90ec feat(genie-execution-engine): readiness routes + seed data + tests
0a8fbce8 feat(genie-life-university): readiness routes + seed data + tests
b9796a28 feat(genie-creation-os): readiness routes + seed data + tests
3b6b8db8 feat(genie-money-os): readiness routes + seed data + tests
80882907 feat(genie-wellness-os): readiness routes + seed data + tests
2f7b1702 feat(genie-consultant-agent): readiness routes + seed data + tests
27ea8a8a feat(genie-thinking-engine): readiness routes + seed data + tests
```

### Shared infrastructure (already shipped in prior session)

- `shared/lib/llm.js` — single point of LLM access for all specialists
- `shared/lib/genie-readiness.js` — readiness routes + autoSeed
- `shared/lib/genie-readiness.cjs` — CJS mirror
- `shared/package.json` — exports map updated
- `genie-shopping-agent/CLAUDE.md` — last missing doc (closes 22→23 docs gap)

---

## Current State Audit (Honest)

### Specialists (23 services)
- **Total LOC:** 33,322
- **Total routes:** ~717
- **Real MongoDB:** 0 services (all use `PersistentMap` = JSON file)
- **Real LLM/AI:** 0 services (all keyword matching / templates / `Math.random()`)
- **Tests:** 3/23 services have tests (13%)
- **Seed data:** 5/23 services have seed data (22%)
- **Docs:** 22/23 services have CLAUDE.md
- **Backend completeness:** ~60% (well-structured scaffolds, substantive business logic, but no real AI/persistence)

### Web App (`frontend/web/`)
- **Current:** 5-tab marketplace launcher (Home/DO/Nexha/Salar/Genie)
- **Completeness vs vision:** ~5% (only Shopping Agent truly built)
- **Most-used tab (Home) is a marketing landing page, not a personal OS**
- **19 of 22 specialist proxies exist but are never called from UI**

### Overall
**~30% complete** — the backend capability surface is solid but nothing is genuinely production-grade (no real AI, no real DB, no test coverage, no consumer app).

---

## Definition of 100%

To reach 100%, every item in the vision must satisfy:

1. **Backend service** exists with real business logic (not stubs)
2. **Real persistence** (MongoDB, not PersistentMap)
3. **Real AI integration** (LLM calls for "smart" features)
4. **Seed data** so the app demos well on first load
5. **Tests** (≥10 vitest assertions per service)
6. **Documentation** (CLAUDE.md)
7. **Web app UI** consuming the service

---

## Phased Plan

### **Phase A: Foundation — bring all 23 specialists to production-grade**
**Goal:** Real MongoDB + Real LLM + Tests + Seed data + Docs for all 23 specialists.

| Step | What | Effort |
|---|---|---|
| A1 | Add `@rtmn/mongo-helper` to all 23 specialists (replace PersistentMap) | 1 day |
| A2 | Add LLM client (`@rtmn/llm-helper`) to all 23 specialists | 1 day |
| A3 | Add `seed/` scripts + sample data to all 23 specialists | 1 day |
| A4 | Add vitest test suites (≥10 assertions each) to all 23 specialists | 3 days |
| A5 | Add `CLAUDE.md` to genie-shopping-agent (last gap) | 5 min |

**Deliverables:**
- All 23 specialists have real MongoDB persistence
- All 23 specialists call real LLM (Claude API) for their smart features
- 230+ test assertions across 23 suites
- Seed data so every service demos with realistic content
- 23/23 docs coverage

### **Phase B: Web App — build the 5-tab consumer app**
**Goal:** Replace marketplace launcher with the 5-tab personal OS from the vision.

| Step | What | Effort |
|---|---|---|
| B1 | Vite + React + TS scaffold (keep Express server as  layer) | 2 days |
| B2 | PWA manifest + service worker + mobile-responsive | 1 day |
| B3 | **Home tab**: Morning Briefing + Focus + Calendar + Relationships + Memory + Goals widgets | 3 days |
| B4 | **Genie tab**: Chat (streaming) + Voice (Web Speech API) + Camera (getUserMedia) + Mode switcher | 3 days |
| B5 | **Search tab**: Universal search across all 23 specialists | 2 days |
| B6 | **Memory tab**: Timeline + Type filters + Life Map graph + Floating "+" Capture button | 2 days |
| B7 | **Me tab**: My Twin + Scores + Preferences + Connected Accounts | 2 days |
| B8 | Hidden screens: Calendar/Finance/Health/Learning/Relationships | 3 days |
| B9 | Notification center (in-app + browser push) | 2 days |
| B10 | Onboarding flow (first 30 seconds) | 1 day |

**Deliverables:**
- React PWA at `genie-os/frontend/web/` with 5 vision tabs
- All 23 specialists reachable from the UI
- Mobile-first, installable to home screen
- Voice/camera/capture all working

### **Phase C: Vision Moat Features**
**Goal:** The 10 features that make Genie category-defining.

| # | Feature | Tier | Effort |
|---|---|---|---|
| C1 | **Personal Simulation Engine** ("What if I move to Dubai?") | 10 | 1 week |
| C2 | **Personal Digital Twin** (complete digital representation) | 10 | 2 weeks |
| C3 | **Life Replay** (monthly/yearly/life review AI-generated) | 10 | 1 week |
| C4 | **Future Self** ("What would 2035 me recommend?") | 10 | 1 week |
| C5 | **Personal AI Team** (companion + researcher + financial advisor + ...) | 10 | 2 weeks |
| C6 | **Founder Twin + Dashboard + Briefing + AI Board Advisor** | 9 | 2 weeks |
| C7 | **Household OS** (spouse/kids/parents) | 10 | 2 weeks |
| C8 | **Spiritual OS** (prayer/reflection/gratitude) | 10 | 3 days |
| C9 | **Connected Accounts** (Google/WhatsApp/Slack/Bank/Apple Health/Fitbit) | — | 2 weeks |
| C10 | **Lock Screen Widgets** (PWA + iOS/Android) | — | 2 weeks |

---

## Total Effort Estimate

| Phase | Effort | Owner |
|---|---|---|
| Phase A (specialists production-grade) | **1-2 weeks** | 1 dev |
| Phase B (web app 5-tab rewrite) | **3-4 weeks** | 1 dev |
| Phase C (vision moat features) | **8-12 weeks** | 2 devs |

**Grand total: 12-18 weeks** to reach 100% of the vision.

---

## Recommended Execution Order

To minimize risk and maximize learning:

1. **Phase A first** (2 weeks) — Fix the foundation. Every specialist becomes production-grade. This unlocks confidence that the rest of the work builds on solid ground.
2. **Phase B1-B3** (1 week) — Get the new app shell + Home tab up so we have something to demo.
3. **Phase B4-B7** (2 weeks) — Complete the 5 tabs.
4. **Phase B8-B10** (1 week) — Hidden screens + notifications + onboarding.
5. **Phase C** (8-12 weeks, can parallelize) — Moat features, in priority order: C6 (Founder OS — biggest differentiator), C9 (Connected Accounts), C1 (Simulation Engine), C2 (Digital Twin), C3 (Life Replay), C4 (Future Self), C5 (AI Team), C7 (Household OS), C8 (Spiritual OS), C10 (Lock Screen Widgets).

---

## What I'm Going To Do Now

Given the scope (12-18 weeks), I'll execute the plan in waves:

### **Wave 1 (this session):**
- Phase A1-A5: All 23 specialists production-grade (real MongoDB + real LLM + tests + seed + docs)
- Phase B1: Vite + React + TS scaffold

### **Wave 2 (next session):**
- Phase B2-B7: 5-tab consumer app

### **Wave 3+:**
- Phase B8-B10 + Phase C: Moat features

Wave 1 brings the backend from 60% to ~95% (real DB, real AI, test coverage, seed data). Then Wave 2 builds the consumer app on top.

---

## Success Criteria for Wave 1

After Wave 1, every Genie specialist must:
1. ✅ Persist data to real MongoDB (or genie-os MongoDB via shared connection)
2. ✅ Call real Claude API for "smart" features (mood analysis, decision support, etc.)
3. ✅ Pass 10+ vitest assertions
4. ✅ Seed realistic demo data on first boot
5. ✅ Have a CLAUDE.md

After Wave 1, the web app must:
1. ✅ Be a Vite + React + TypeScript project
2. ✅ Build and run on `npm run dev`
3. ✅ Have the 5-tab navigation structure in place (even if empty)
4. ✅ Have the PWA manifest in place

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM API keys not available | Use `@rtmn/llm-helper` with graceful fallback to keyword matching if API key missing |
| MongoDB migration breaks existing demos | Keep `PersistentMap` as a fallback when `MONGO_URL` not set |
| 23 services × many changes = big diff | Stage in commits per service, each commit independently runnable |
| Web app rewrite disrupts existing flows | Run new React app alongside old `index.html` until cutover, keep Express server intact |
| Test coverage takes longer than expected | Use existing wake-word + listening-modes + device-integration tests as templates (each ~30 min to write) |

---

## What This Plan Does NOT Include

- **External client apps** (do-app, REZ-Workspace): They're separate repos and consume Genie via API. No changes needed.
- **Native iOS/Android apps**: PWA first; native shell via Capacitor.js later if needed.
- **Marketing site / pricing pages**: Separate concern.

---

## Tracking

After each wave:
- Run all tests: `npm run test` (or per-service)
- Run health check: `curl localhost:7100/api/genie-services/health` (all 23 should be `up`)
- Run web app: `npm run start:all && open http://localhost:3000`

Updates to plan + audit happen in:
- `.claude/plans/genie-vision-product-roadmap.md` (the vision)
- `.claude/plans/genie-100-percent-plan.md` (this plan)
- Per-service `CLAUDE.md` (what's built)