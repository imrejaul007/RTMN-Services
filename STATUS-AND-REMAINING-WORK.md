# RTMN Ecosystem — Status & Remaining Work

> **Date:** 2026-06-22 (post-architecture-audit)
> **Audience:** Engineering, product, leadership
> **Purpose:** Honest inventory of what runs, what is scaffold, what is missing — and the roadmap to fill the gaps.
> **Supersedes:** older aspirational claims about "all 50+ services" running. Those are aspirational — this doc tells you what actually works today.

---

## TL;DR

| Layer | Status | Production-grade count |
|---|---|---|
| **RTMN Unified Hub** (port 4399) | ✅ Running | 1 (REZ-ecosystem-connector v1.1.0) |
| **HOJAI Foundation** | ✅ Running | 4 of 6 (CorpID 4702, MemoryOS 4703, Twin Memory Bridge 4704, TwinOS Hub 4705) |
| **HOJAI Foundation** | 🟡 Scaffold | 2 (Memory Confidence 4152, Memory Context Engine 4790) |
| **HOJAI SUTAR OS** | 🟡 Scaffold | 23 services, ~12k LOC, mostly text-matchers and CRUD — gateway 4140 is real |
| **HOJAI BLR Marketplace** | 🟡 Scaffold | 7 services, ~1.5k LOC |
| **HOJAI SADA / TrustOS** (4190) | 🟡 Real code, not wired | 2.5k LOC, real models, not in do-app |
| **do-app backend** (port 3001) | ✅ Running | 18 route files, 69 endpoints, 137 tests |
| **do-app mobile** | ✅ Running | 12 tabs, 45 tests, voice input (v1.5) |
| **Genie Voice services** (6 services) | 🟡 Stubs | All return canned text — no real STT/TTS |
| **Nexha portal** (Next.js 16) | ✅ Real | 20.5k LOC, 3 deployable services |
| **Nexha commerce-identity** (port 8000) | ✅ Real | 2.9k LOC, JWT auth, GSTIN |
| **Nexha network** (suppliers/warehouses/logistics/banking) | ❌ **Does not exist** | The "autonomous business network" the vision describes is 0% built |
| **ACN** (15 services, 4716, 4800-4851) | 🟡 Scaffold | ~10k LOC, mostly CRUD |

**Bottom line:** the consumer side (do-app + Hub + 4 foundation services) is production-grade. Everything else is either scaffold or doesn't exist.

---

## What runs today (verified at audit time)

### Tier 1 — Production-grade ✅

| Service | Port | LOC | Evidence |
|---|---:|---:|---|
| **REZ-ecosystem-connector** (Hub) | 4399 | ~600 | `curl localhost:4399/health` → 200; 22 endpoints including `/api/sutar/*` proxy |
| **CorpID** | 4702 | 2,244 | 200 on /health, MongoDB-backed |
| **MemoryOS** | 4703 | 1,815 | 200 on /health, 15 memory types, knowledge graph |
| **Twin Memory Bridge** | 4704 | 976 | 200 on /health, twin ↔ memory partition links |
| **TwinOS Hub** | 4705 | 2,854 | 200 on /health, 86+ twins |
| **Customer Twin** | 4895 | 767 | 200 on /health |
| **do-app backend** | 3001 | ~5,000 | 18 routes, 69 endpoints, 137 tests pass |
| **do-app mobile** | n/a | ~3,000 | 12 tabs, voice input, 45 tests pass |
| **Nexha portal** | 3000 | 20,543 | Next.js 16, deployed to Vercel |
| **Nexha commerce-identity** | 8000 | 2,899 | JWT auth, GSTIN validation, deployed to Render |

### Tier 2 — Real code, scaffold-shape (200-3000 LOC each) 🟡

These have actual business logic, just not at production scale:

| Service | Port | LOC | Notes |
|---|---:|---:|---|
| Salar OS (workforce intelligence) | 4710 | 9,179 | 13 modules, capability registry — was mis-labeled as marketplace until 2026-06-21 |
| SADA (trust, governance, risk) | 4190 | 2,508 | TrustScore + Policy + Risk + Verification models, 4 routes. Not wired into do-app. |
| SUTAR Gateway | 4140 | 261 | Real service registry + capability map |
| SUTAR Monitoring | 3100 | 367 | Health probes, metrics, alerts |
| Negotiation AI | 4850 | 489 | Strategy map (5 strategies), session CRUD |
| Twin services (18 others) | various | 231-2,076 | Mostly CRUD; only customer-twin confirmed running |
| BLR Marketplace services (7) | various | 132-363 | Discovery, twin-marketplace, reputation aggregator |
| Industry-OS (24) | various | varies | Restaurant, Hotel, Healthcare, etc. — mixed states |

### Tier 3 — Scaffolds (~100-300 LOC, no real logic) 🟡

SUTAR OS agents/contracts layers: 16 services totalling ~10k LOC. Each is essentially an Express app with 5-10 routes returning hardcoded JSON or simple CRUD over a `PersistentMap` (file-backed JSON).

### Tier 4 — Stubs (no real functionality) 🟡

| "Voice" service | Port | Reality |
|---|---:|---|
| Voice Twin | 4876 | CRUD over voice profiles, TTS returns fake MP3 URL, STT returns `"[Simulated transcription]"` |
| Genie Wake Word | 4767 | Text matcher: `text.toLowerCase().includes('hey genie')` |
| Genie Listening Modes | 4768 | Mode state map, 4 modes |
| Genie Device Integration | 4769 | Device registry with `Math.random()` pairing codes |
| Speech Intelligence | 4870 | Mock ASR: `audioUrl.split('').reduce(...)` selects a canned phrase |
| RAZO Keyboard | 4725 | Communication OS, no voice at all |

### Tier 5 — Missing entirely ❌

| Capability | Vision | Reality |
|---|---|---|
| **Nexha Supplier Registry** | Network of suppliers with capability matching | 0 LOC |
| **Nexha Warehouse Network** | Geo-search, slot booking | 0 LOC |
| **Nexha Logistics** | Multi-carrier rate shopping, tracking | 0 LOC |
| **Nexha Banking** | UPI, BNPL, escrow, FX | 0 LOC |
| **Nexha Orchestrator** (ExecutionOS) | Workflow + retry + rollback | 0 LOC |
| **Real wake-word** (on-device) | "Hey Genie" continuous listen | 0 LOC — would need Picovoice or openWakeWord |
| **Real STT backend** (server-side) | Whisper / Deepgram integration | 0 LOC — Voice Twin returns mock |
| **CoPilot for merchants** | Merchant-side Genie | 0 LOC |
| **Cross-border trade** | Customs, FX hedging | 0 LOC |
| **Multi-language UI** | Hindi/Arabic etc. | English only |

---

## What works end-to-end today

The following data flows are real and tested:

### Flow 1 — User logs in and chats with Genie
```
Mobile (do-app) → POST /api/auth/login (do-app backend) → JWT
Mobile → POST /api/llm/chat → do-app → POST /api/genie/ask → HOJAI Genie (7100)
Genie → fetches MemoryOS, TwinOS, GoalOS, PolicyOS context
Genie → LLM call → reply
Mobile → renders chat bubble
```
✅ **Real**. Tested end-to-end. Falls back to "degraded" gracefully if Genie is down.

### Flow 2 — User browses merchants and sees trust scores
```
Mobile → GET /api/merchants/popular → do-app → HOJAI Merchant (8003)
For each merchant: do-app → GET /trust/v2/:merchantId → SADA (4190)
Mobile → renders merchant card with trust badge
```
✅ **Real** (since v1.5.0). SADA is wired into hojaiClient. Mobile UI will be updated in v1.5.x.

### Flow 3 — User updates a twin (e.g. logs a mood)
```
Mobile → PATCH /api/twins/:id/state → do-app → HOJAI TwinOS (7002)
TwinOS → persists state
On focus, Mobile re-fetches /api/twins → updated state
```
✅ **Real** (since v1.4.0). 14 backend tests + 5 mobile tests.

### Flow 4 — User dictates a message via voice
```
Mobile → tap mic button → expo-speech-recognition (on-device STT)
Final transcript → setInputText() in Genie tab
User presses Send → existing /api/llm/chat flow
```
✅ **Real** (since v1.5.0). Uses iOS SFSpeechRecognizer / Android SpeechRecognizer.

### Flow 5 — User buys groceries autonomously
```
(What should happen per vision)
Genie → classify intent → SUTAR Decision Engine → SUTAR Negotiation
SUTAR → Nexha Supplier Registry → find best supplier
Nexha Warehouse Network → book slot
Nexha Logistics → get carrier quotes
Nexha Banking → open escrow
SUTAR Contracts → draft purchase contract
Nexha Orchestrator → execute workflow with retry/rollback
Order placed

(What actually happens today)
Genie → reply + suggested merchant → Mobile → manual order placement
```
❌ **0% autonomous**. The consumer half works; the agent economy half is blueprint only.

---

## Phase Plan to Fill the Gaps

See [ROADMAP-TO-VISION.md](ROADMAP-TO-VISION.md) for the full 10-week plan.

Quick summary (updated 2026-06-22):
- **Phase A** (✅ done): Foundation — Hub start, SADA wire-up, voice input, **body-forwarding bug fix in `proxyToUpstream()`**
- **Phase B** (✅ done): SUTAR OS Real — Decision/Negotiation/Economy/Trust/Contracts all hardened with 321 new tests + a real bug fix in `sutar-contract-os/versions.ts`
- **Phase C** (🟡 partial): Nexha Network — **routes wired through Hub** for 8 services + **C.1 sutar-supplier-registry** (20 tests, 8 seeded Indian suppliers, 6-dim match scoring) + **C.2 sutar-logistics** (22 tests, 4 carriers, cold-chain filtering) shipped. do-app autopilot re-pointed at the new services. C.3 warehouse-network / C.4 banking / C.5 orchestrator still to build.
- **Phase D** (✅ done): End-to-End — do-app autopilot now calls SUTAR + Nexha for "buy groceries" Step 5; mobile autopilot tab shipped
- **Phase E** (🟡 in progress): Production polish — `scripts/dev-stack.sh`, `docker-compose.dev.yml`, `demos/full-stack-demo.sh`, this status doc, ADRs, root README

Verified today (2026-06-22):
- `bash scripts/dev-stack.sh start && bash demos/full-stack-demo.sh` → all 2xx checks pass
- **376 vitest tests** across 6 SUTAR services (economy-os 105, contract-os 179, trust-engine 29, decision-engine 21, logistics 22, supplier-registry 20), **0 failures**
- 7 new unit tests for do-app `nexha` client
- **2 real service bugs** found and fixed via tests:
  1. `sutar-contract-os/src/services/versions.ts` — versionIndex optional-chaining no-op on first push
  2. `sutar-logistics/src/services/logistics.service.ts` — quote IDs were regenerated on every getQuotes() call, so bookShipment(quote.id) always returned null
- All 5 git repos in sync with origin

---

## How to start the stack today

### One command (Phase A+B+C+D dev stack)

```bash
cd /Users/rejaulkarim/Documents/RTMN
bash scripts/dev-stack.sh start     # Hub + 3 SUTAR services
bash demos/full-stack-demo.sh        # verify end-to-end
```

`scripts/dev-stack.sh` brings up exactly the four services the demo script exercises: Hub (:4399), Trust Engine (:4291), Decision Engine (:4290), Economy OS (:4251). Logs land in `/tmp/rtmn-dev/*.log`.

### Manual per-service start (legacy)

```bash
# 1. Hub (port 4399)
cd /Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/REZ-ecosystem-connector
PORT=4399 npm start

# 2. Foundation (ports 4702-4705)
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
./start-all.sh   # starts everything; first ~30s while it boots

# 3. do-app backend
cd /Users/rejaulkarim/Documents/RTMN/companies/do-app/backend
npm run dev      # port 3001

# 4. do-app mobile
cd /Users/rejaulkarim/Documents/RTMN/companies/do-app/mobile
npx expo start   # press 'i' for iOS, 'a' for Android
```

For SADA, Memory Confidence, Memory Context Engine — these need to be started manually. Add to `start-all.sh` or run:
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/trust/sada-os
PORT=4190 npm start
```

---

## Out of scope (not in this audit, by CLAUDE.md policy)

The following are EXTERNAL CLIENTS of HOJAI AI / RTMN. We do not audit, modify, or improve them unprompted:
- **Leverge** (company) — Leverge code is not RTMN
- **StayOwn-Hospitality** — not RTMN
- **REZ-Merchant** — external client
- **Nexha as a whole** — debated. Per `NEXHA-AUDIT.md`, Nexha is currently classified as internal RTMN. The two real Nexha services (portal + commerce-identity) are real. New Nexha services in Phase C are RTMN-owned.

---

*Last updated: 2026-06-22*
*Audit performed by Claude on the request: "do everything and make full complete ready"*
