# RTMN Architecture — As Built (2026-06-22)

> **Purpose:** Document the architecture that **actually runs today**, not the aspirational vision.
> **Companion to:** [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md) (what's missing) and [ROADMAP-TO-VISION.md](ROADMAP-TO-VISION.md) (how to fill the gaps).
> **Supersedes:** the architecture diagrams in [CLAUDE.md](CLAUDE.md) (those describe a vision; this is reality).

---

## Top-Level Map

```
┌────────────────────────────────────────────────────────────────────┐
│              DO APP — Consumer (the only product)                  │
│  ┌────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ do-app mobile (Expo)   │  │ do-app backend (Express, :3001)  │  │
│  │ 12 tabs + voice input  │──│ 18 routes, 69 endpoints, 137 tests│  │
│  │ v1.5.0 (45 tests)      │  │ 16 HOJAI client modules wired     │  │
│  └────────────────────────┘  └──────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                       │ hojaiClient
                                       ▼
┌────────────────────────────────────────────────────────────────────┐
│              HOJAI Foundation (production-grade subset)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ CorpID :4702 │  │ MemoryOS     │  │ TwinOS Hub   │               │
│  │ 20,339 LOC   │  │ :4703        │  │ :4705        │               │
│  │ JWT, KYC,    │  │ 1,815 LOC    │  │ 2,854 LOC    │               │
│  │ RBAC, agent  │  │ 15 memory    │  │ 70 twin      │               │
│  │ registry     │  │ types        │  │ types        │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│  ┌──────────────┐                                                  │
│  │ Twin Memory  │ ← Twin ↔ memory partition links                 │
│  │ Bridge :4704 │                                                  │
│  │ 976 LOC      │                                                  │
│  └──────────────┘                                                  │
│                                                                    │
│  Scaffolds (code exists, not running by default):                  │
│   • Memory Confidence :4152 (637 LOC)                              │
│   • Memory Context Engine :4790 (375 LOC)                          │
│   • SADA :4190 (2,508 LOC) — NOT WIRED into do-app until v1.5.0   │
└────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────┐
│              RTMN Unified Hub :4399                                │
│  REZ-ecosystem-connector v1.1.0 (RABTUL Technologies)              │
│  22 endpoints, SUTAR proxy, service registry                       │
│  Currently routes: /health, /api/services, /api/messages,          │
│                    /api/subscriptions, /api/transactions,          │
│                    /api/sutar/capabilities, /api/sutar/:svc/*      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Layers That Are Not Connected (yet)

```
┌────────────────────────────────────────────────────────────────────┐
│  SUTAR OS  (21 services, 10,930 LOC) — declared in Hub, not used  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│  │ Gateway :4140   │ │ Monitoring :3100│ │ Negotiation :4850│      │
│  │ (real)          │ │ (real)          │ │ (real logic)     │      │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘      │
│  + 18 more scaffolded services (decision, economy, trust, ...)     │
│  → All declared in start-all.sh but not invoked from do-app.      │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  BLR AI Marketplace (7 services, 1,545 LOC) — not connected        │
│  Discovery Engine :4256, Twin Marketplace, ROI Calculator, ...     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  Nexha Network — MIXED state                                       │
│  ✅ Deployed (Render/Vercel):                                      │
│     • commerce-identity :8000 (5,991 LOC) — JWT, GSTIN             │
│     • portal :3000 (1,461 LOC) — Next.js 16, 11 pages              │
│     • sutar-mock :4799 (343 LOC) — in-memory                       │
│  🟡 L2 (in REZ-Workspace, not deployed):                           │
│     • procurement-os (5,117 LOC), distribution-os (2,884),         │
│       franchise-os (1,930), trade-finance (1,501),                 │
│       ecosystem-connector (1,563), intelligence-layer (1,283)      │
│  ❌ MISSING (the "autonomous business network"):                   │
│     • Supplier Registry (0 LOC)                                   │
│     • Warehouse Network (0 LOC)                                   │
│     • Logistics (0 LOC)                                           │
│     • Banking (0 LOC)                                             │
│     • Orchestrator / ExecutionOS (0 LOC)                          │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  Department OS + Industry OS (industry-os/services/, ~67 dirs)      │
│  ✅ Real: Sales (9,162), Marketing (2,769), Operations (2,786),   │
│     Finance (4,320), Revenue Intelligence (4,993)                 │
│  🟡 Mixed: Hotel (2,703), Restaurant (2,933 template), Healthcare  │
│  ❌ Template clones (2,933 LOC each, identical scaffold):         │
│     agriculture-os, automotive-os, construction-os, education-os,  │
│     entertainment-os, exhibition-os, fashion-os, financial-os,     │
│     fitness-os, gaming-os, government-os, healthcare-os,           │
│     home-services-os, manufacturing-os, non-profit-os,            │
│     professional-os, realestate-os, restaurant-os, retail-os,      │
│     sports-os, transport-os, travel-os                            │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  TwinOS (24 services) — 18 of 24 in registry are CRUD              │
│  ✅ Real: TwinOS Hub (2,854), inventory-twin (2,108), lead-twin,  │
│     merchant-twin, payment-twin, organization-twin, user-twin,     │
│     product-twin, partner-twin, order-twin, asset-twin,            │
│     customer-twin (verified running)                              │
│  🟡 Small CRUD: voice-twin (STUB!), employee-twin, property-twin, │
│     deal-twin, buyer-twin, area-twin, referral-twin, wallet-twin   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  Genie Products (24 services) — voice-related are stubs            │
│  ✅ Real: genie-os (3,601), genie-gateway (7100, 459),            │
│     genie-memory-inbox (2,116), genie-shopping-agent (894),       │
│     genie-briefing-service (391), genie-calendar (991),           │
│     genie-universal-search (1,257), genie-serendipity (496),      │
│     genie-smart-forgetting (1,324), and 14 more                   │
│  ❌ STUB:                                                         │
│     • genie-wake-word-service :4767 (319 LOC) — text.includes()   │
│     • genie-listening-modes :4768 (225 LOC) — mode state map      │
│     • genie-device-integration :4769 (247 LOC) — random pairing   │
│     • voice-twin :4876 (615 LOC) — mock STT/TTS                   │
└────────────────────────────────────────────────────────────────────┘
```

---

## What Talks to What (Today)

```
Mobile (Expo)
  │
  ├── /api/llm/chat → do-app backend
  ├── /api/genie/*  → do-app backend
  ├── /api/twins/*  → do-app backend
  ├── /api/merchants/* → do-app backend
  ├── /api/orders/*  → do-app backend
  ├── /api/wallet/*  → do-app backend
  └── ... (12+ route families)

do-app backend (Express, :3001)
  │
  ├── hojaiClient.ts wraps 16 services:
  │     corpId, twins, memory, memoryConfidence, memoryContext,
  │     goals, policy, skills, flows, genie, sutar, agentOs,
  │     wallet, merchant, sada
  │
  ├── MongoDB (local or Atlas) for do-app's own data
  │
  └── Outbound HTTP:
        ├── localhost:4702 (CorpID)            ← when HOJAI_ENABLED=true
        ├── localhost:4703 (MemoryOS)
        ├── localhost:4704 (Twin Memory Bridge)
        ├── localhost:4705 (TwinOS Hub)
        ├── localhost:4190 (SADA)              ← wired v1.5.0
        ├── localhost:4152 (Memory Confidence) ← wired v1.5.0
        ├── localhost:4790 (Memory Context)    ← wired v1.5.0
        ├── localhost:7100 (Genie)
        ├── localhost:8003 (Merchant)
        └── ... (10 more)

Optional: do-app can route through Hub at :4399
  ├── /api/sutar/:service/* (any SUTAR service — works when services run)
  ├── /api/services, /api/messages, /api/transactions (registry + bus)
  └── But do-app does NOT currently use Hub routes — direct HOJAI calls.
```

---

## Data Flow: A Real User Action Today

### "User logs in"
```
1. Mobile → POST /api/auth/login (do-app :3001)
2. do-app → bcrypt.compare password
3. do-app → POST /api/identity/login → CorpID :4702
   (or: hojaiClient.corpId.login() — TBD; current code uses local JWT)
4. CorpID → verify + return corpId
5. do-app → JWT.sign({ userId, corpId })
6. Return { token } to Mobile
7. Mobile stores JWT in expo-secure-store
```

### "User chats with Genie"
```
1. Mobile → POST /api/llm/chat { user: "Buy milk" }
2. do-app → intentClassifier.classify("Buy milk")  ← local rule
3. do-app → hojaiClient.genie.ask(userId, { question, context })
4. do-app → POST :7100/api/ask
5. Genie service → fetch MemoryOS, TwinOS, GoalOS context
6. Genie → LLM call (OpenAI / Anthropic)
7. Return { reply, action? }
8. do-app → respond to Mobile
9. Mobile → render chat bubble
   (If action: also render AgentActionCard for user to confirm)
```

### "User browses merchants" (with trust score)
```
1. Mobile → GET /api/merchants/popular
2. do-app → hojaiClient.merchant.popular() → POST :8003/...
3. For each merchant: hojaiClient.sada.getTrustScore(merchantId)
   → GET :4190/trust/v2/:merchantId
4. Attach trustScore + trustLevel to each item
5. Return enriched list
6. Mobile renders merchant cards with trust badges
```

### "User updates a twin (logs mood)"
```
1. Mobile → PATCH /api/twins/:twinId/state { lastMood: { mood: "happy", score: 8 } }
2. do-app → hojaiClient.twins.updateState(twinId, patch)
3. do-app → PATCH :7002/api/twins/:twinId/state
4. TwinOS Hub → persist state
5. Return updated twin
6. Mobile → on focus, re-fetches /api/twins → mood reflected
```

### "User dictates a message"
```
1. Mobile → tap mic button
2. useVoiceInput.startListening()
3. expo-speech-recognition → iOS SFSpeechRecognizer / Android SpeechRecognizer
4. Interim transcripts → setTranscript()
5. Final transcript → composer.setInputText()
6. User presses Send → existing /api/llm/chat flow
```

---

## What Does NOT Happen Today (per vision)

### "User says 'Buy groceries'" — full vision
1. Genie classifies intent (✅ works)
2. SUTAR Decision Engine evaluates (❌ not called)
3. SUTAR Negotiation opens session with merchant (❌ not called)
4. Nexha Supplier Registry finds best supplier (❌ service doesn't exist)
5. Nexha Warehouse Network books slot (❌ service doesn't exist)
6. Nexha Logistics gets carrier quotes (❌ service doesn't exist)
7. Nexha Banking opens escrow (❌ service doesn't exist)
8. SUTAR Contracts drafts purchase order (❌ not called)
9. Nexha Orchestrator executes workflow (❌ service doesn't exist)
10. Order placed (✅ works, but manually)

**Today, step 1 happens, then steps 10a (suggest merchant) + 10b (manual confirm) happen.** Steps 2-9 are not implemented.

### "User gets trust score on a merchant"
1. do-app fetches merchants (✅)
2. do-app enriches with SADA trust (✅ since v1.5.0)
3. Mobile renders trust badge (✅ backend ready, mobile UI pending)

---

## Code Statistics Summary (verified)

| Component | Services | LOC | Real-running | Real-wired-into-do-app |
|---|---:|---:|---:|---:|
| HOJAI platform/ | 89 | 107,778 | 4 | 4 (CorpID, MemoryOS, Twin Memory Bridge, TwinOS Hub) |
| SUTAR OS | 21 | 10,930 | 0-1 (gateway works) | 0 (do-app doesn't call) |
| BLR Marketplace | 7 | 1,545 | 0 | 0 |
| HOJAI products/genie | 24 | ~35,000 | a few | genie-gateway :7100 |
| HOJAI products/ (rest) | ~16 | varies | a few | none |
| industry-os/services | ~67 | ~150,000 | 4-5 (Sales, Marketing, Ops, Finance, Revenue) | 0 |
| HOJAI platform/twins | 24 | 31,492 | ~12 | 1 (TwinOS Hub via twins client) |
| RABTUL Technologies | 231 | 594,018 | Hub only | 0 (Hub at 4399) |
| AdBazaar | 294 | 1,167,161 | 5-7 | 0 |
| do-app | 3 | 17,697 | both | itself |
| Nexha L1 | 6 | 7,795 | 3 (portal, commerce-identity, sutar-mock) | 0 |
| Nexha L2 (in REZ-Workspace) | ~10 | 80,328 | 0 | 0 |
| **TOTAL** | **~750+** | **~2.2M** | **~30-40** | **~7-10** |

---

## Verified-Running Services (just these)

Per actual HTTP probes in this audit and prior:

| Service | Port | Verified by |
|---|---:|---|
| REZ-ecosystem-connector | 4399 | `curl localhost:4399/health` → 200 (started by us) |
| CorpID | 4702 | Started via start-all.sh, 200 on /health |
| MemoryOS | 4703 | 200 on /health |
| Twin Memory Bridge | 4704 | 200 on /health |
| TwinOS Hub | 4705 | 200 on /health |
| Customer Twin | 4895 | 200 on /health |
| do-app backend | 3001 | 137 tests pass |
| do-app mobile | n/a | 45 tests pass; voice hook works (stub provider) |
| Nexha commerce-identity | 8000 | Deployed to Render |
| Nexha portal | 3000 | Deployed to Vercel |

**Everything else is either scaffold, stub, or not running.**

---

*Last updated: 2026-06-22*
*Audit performed by Claude (deep audit) + companion SUTAR/RABTUL/Voice audits*
