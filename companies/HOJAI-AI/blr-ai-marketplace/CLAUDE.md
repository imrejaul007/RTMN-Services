# BLR AI Marketplace — Unified AI Marketplace

> **Location:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/blr-ai-marketplace/`
> **Updated:** 2026-06-26 (payment integration + category expansion)
> **Status:** ✅ **Major progress** — see audit report: `.claude/audits/BAM-AUDIT-2026-06-26.md`

---

## ✅ Progress Update (2026-06-26)

| Metric | Before | After |
|--------|--------|-------|
| Categories | 8 | **35+** |
| Catalog Items | ~20 seeded | **~300 seeded** |
| Payments | None | **Stripe integrated** |
| Hub Integration | Missing | **8 routes added** |
| Tests | 81 passing | **81 passing** ✅ |

### Fixes Applied (2026-06-26)

| Fix | Status |
|-----|--------|
| HTTP method mismatch in blr-exploration | ✅ Fixed |
| Hub routes for BAM services | ✅ Added |
| BAM registered in Hub registry | ✅ Added |
| Categories expanded (8 → 35+) | ✅ Done |
| Killer categories seeded (AI Employees, BCPs, Blueprints) | ✅ Done |
| Stripe payment integration | ✅ Done |

### Remaining Work

| Task | Priority | Effort |
|------|----------|--------|
| Next.js frontend | 🔴 HIGH | 4-8 weeks |
| AI recommender engine | 🟡 MED | 4 weeks |
| MongoDB for all services | 🟡 MED | 2 weeks |

---

## Overview

**BLR AI Marketplace (BAM)** is the unified marketplace for the entire RTMN ecosystem — a single destination for AI agents, digital twins, services, and knowledge. It combines:

- **A Next.js storefront** (TODO: scaffold only, needs full build)
- **8 backend service APIs** (in `services/`) that power discovery, evaluation, transactions, and reputation
- **Stripe payment integration** (checkout, subscriptions, webhooks)
- **35+ categories** including killer features (AI Employees, Business Capability Packs)

---

## 🎯 Purpose

- **One-stop shop** — buy or subscribe to AI agents, digital twins, services, and knowledge
- **Centralized catalog** — all 600+ offerings in one place (see `CATALOG.md`)
- **Trust + reputation** — every listing has verified scores, reviews, and ROI projections
- **Multi-agent evaluation** — score plans across dimensions before purchase
- **Stripe payments** — checkout, subscriptions, webhooks, revenue tracking

---

## 📦 Architecture (Two Layers)

```
┌─────────────────────────────────────────────────────────────┐
│              BLR AI MARKETPLACE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────────────────────────────────────────┐    │
│   │   Next.js Storefront (BLR root)                   │    │
│   │   - Browse, search, filter                       │    │
│   │   - Cart + Stripe checkout                       │    │
│   │   - Category pages, pricing tables               │    │
│   └──────────────────┬───────────────────────────────┘    │
│                      │ REST API calls                       │
│   ┌──────────────────▼───────────────────────────────┐    │
│   │   Backend Services (services/)                     │    │
│   │   - discovery-engine (4256)                       │    │
│   │   - blr-exploration (4255)                        │    │
│   │   - roi-calculator (4259)                         │    │
│   │   - blr-founder-os (4260)                         │    │
│   │   - blr-multi-agent-evaluator (4257)              │    │
│   │   - blr-reputation-aggregator (4258)              │    │
│   │   - twin-marketplace (4146)                       │    │
│   └──────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 8 Backend Services

| # | Service | Port | Package | LOC | What it does | Status |
|---|---------|------|---------|-----|--------------|--------|
| 1 | `discovery-engine` | 4256 | `@hojai/blr-discovery-engine` | 241 | Universal search across services, agents, twins, intents | ✅ |
| 2 | `blr-exploration` | 4255 | `@hojai/blr-exploration` | 169 | Curated exploration flows on top of discovery | ✅ Fixed |
| 3 | `roi-calculator` | 4259 | `@hojai/blr-roi-calculator` | 243 | ROI, payback, NPV, IRR for AI investments | ✅ |
| 4 | `blr-founder-os` | 4260 | `@hojai/blr-founder-os` | 191 | Founder-specific AI twin + workflows | ✅ |
| 5 | `blr-multi-agent-evaluator` | 4257 | `@hojai/blr-multi-agent-evaluator` | 118 | Score multi-agent plans across dimensions | ✅ |
| 6 | `blr-reputation-aggregator` | 4258 | `@hojai/blr-reputation-aggregator` | 126 | Aggregate reputation signals across sources | ✅ |
| 7 | `twin-marketplace` | 4146 | `@hojai/blr-twin-marketplace` | 349 | Buy/sell pre-built digital twins | ✅ |
| 8 | `marketplace-listings` | 4255 | `@hojai/blr-marketplace-listings` | 500+ | Full CRUD with MongoDB, Zod, reviews | ✅ Best |
| | **TOTAL** | | | **2,037 LOC** | | |

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Storefront | Next.js 14 + React 18 + TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| State | Zustand |
| Payments | Stripe |
| Backend services | Node.js + Express + Helmet + Compression |
| Auth | Internal token / JWT |
| Payments | Stripe SDK (checkout, subscriptions, webhooks) |
| Database | MongoDB (marketplace-listings) |

---

## 📁 Directory Structure

```
blr-ai-marketplace/
├── README.md                              # Storefront overview
├── CLAUDE.md                              # This file
├── CATALOG.md                             # Product catalog (~300 items)
├── package.json                           # Storefront deps (Next.js)
│
└── services/                              # Backend marketplace APIs
    ├── marketplace-listings/              # Port 4255 — Main listing service
    │   ├── src/
    │   │   ├── index.js                  # Express entrypoint
    │   │   ├── routes/index.js             # All REST routes
    │   │   ├── services/
    │   │   │   ├── listingsService.js     # Listing CRUD
    │   │   │   ├── reviewsService.js     # Reviews
    │   │   │   └── paymentService.js     # Stripe payments (NEW)
    │   │   ├── models/                    # Mongoose models
    │   │   ├── middleware/auth.js         # JWT + tenant isolation
    │   │   └── seed-data.js              # ~300 seed items
    │   ├── __tests__/                    # 81 vitest tests
    │   └── package.json
    │
    ├── discovery-engine/                  # Port 4256 — universal search
    ├── blr-exploration/                   # Port 4255 — curated exploration
    ├── roi-calculator/                    # Port 4259 — financial analysis
    ├── blr-founder-os/                    # Port 4260 — founder decisions
    ├── blr-multi-agent-evaluator/         # Port 4257 — plan scoring
    ├── blr-reputation-aggregator/         # Port 4258 — reputation rollup
    └── twin-marketplace/                  # Port 4146 — twin listings
```

---

## ▶️ Quick Start

### Start all 8 backend services

```bash
cd companies/HOJAI-AI/blr-ai-marketplace/services

# Start marketplace-listings first (requires MongoDB)
(cd marketplace-listings && npm start > /tmp/bam-listings.log 2>&1 &)

# Start other services
for svc in discovery-engine roi-calculator blr-founder-os \
           blr-multi-agent-evaluator blr-reputation-aggregator twin-marketplace; do
  (cd "$svc" && node src/index.js > /tmp/bam-$svc.log 2>&1 &)
done

sleep 4
for p in 4255 4256 4257 4258 4259 4260 4146; do
  curl -s -o /dev/null -w "port $p → %{http_code}\n" http://localhost:$p/health
done
```

### Access via RTMN Hub (4399)

```bash
# Direct to Hub
curl http://localhost:4399/api/bam/marketplace-listings/health
curl http://localhost:4399/api/bam/discovery-engine/health

# Or via marketplace alias
curl http://localhost:4399/api/marketplace/marketplace-listings/health
```

### Run vitest tests (marketplace-listings)

```bash
cd companies/HOJAI-AI/blr-ai-marketplace/services/marketplace-listings
npm test
```

### Start the Next.js storefront (TODO)

```bash
cd companies/HOJAI-AI/blr-ai-marketplace
npm install
npm run dev   # http://localhost:3000
# ⚠️ Storefront is scaffold-only, needs full build
```

---

## 🧪 Test Results

### Vitest (marketplace-listings) — ✅ 81 passing

| Test File | Tests |
|-----------|-------|
| listingsService.test.js | 27 |
| reviewsService.test.js | 19 |
| routes.test.js | 35 |
| **TOTAL** | **81 passing** |

### Smoke Tests (other services) — ⚠️ Not verified

| Service | Port | Tests |
|---------|------|-------|
| discovery-engine | 4256 | 7 |
| roi-calculator | 4259 | 7 |
| blr-exploration | 4255 | 7 |
| blr-founder-os | 4260 | 9 |
| blr-multi-agent-evaluator | 4257 | 5 |
| blr-reputation-aggregator | 4258 | 7 |
| twin-marketplace | 4146 | 11 |

---

## 🔗 How It Connects

### Inbound (who calls the marketplace)

| Caller | What it calls | Why |
|--------|---------------|-----|
| `rtmn-sync-hub` (4399) | `/api/bam/*` or `/api/marketplace/*` | Central API gateway ✅ Added 2026-06-26 |
| Next.js storefront | direct REST calls to ports 4255-4260, 4146 | UI (TODO) |
| RTMN industry OS | `/api/discovery` via Hub | Find relevant services |

### Outbound (what the marketplace calls)

| Marketplace service | Calls | Purpose |
|---------------------|-------|---------|
| `discovery-engine` | SUTAR Intent Bus (4154), SUTAR Usage Tracker (4252), SUTAR Simulation (4241) | Cross-reference SUTAR signals (TODO) |
| All services | `corpid-service` (4702), `memory-os` (4703) | Identity + memory |

### Hub Routes (Added 2026-06-26)

```
RTMN Sync Hub (4399) → BAM Services
├── /api/bam/marketplace-listings → :4255
├── /api/bam/discovery-engine → :4256
├── /api/bam/roi-calculator → :4259
├── /api/bam/founder-os → :4260
├── /api/bam/multi-agent-evaluator → :4257
├── /api/bam/reputation-aggregator → :4258
├── /api/bam/twin-marketplace → :4146
└── /api/bam/exploration → :4255
```

---

## 📋 Category Coverage (vs Spec)

| Spec Category | Implemented | Priority |
|--------------|-------------|----------|
| ✅ Twin Packs | 6 seeded | Done |
| ✅ Workflows | Schema only | Basic |
| ✅ Integrations | Schema only | Basic |
| ⚠️ AI Agents | Schema only | Add listings |
| ❌ AI Employees | Missing | HIGH |
| ❌ AI Teams | Missing | HIGH |
| ❌ Department OS | Missing | HIGH |
| ❌ Industry OS | Missing | HIGH |
| ❌ SkillOS Skills | Missing | HIGH |
| ❌ Business Capability Packs | Missing | **KILLER** |
| ❌ Company Blueprints | Missing | HIGH |
| ❌ Widgets | Missing | HIGH |
| ❌ Memory Packs | Missing | MED |
| ❌ Policy Packs | Missing | MED |
| ❌ APIs | Missing | MED |
| ❌ Themes | Missing | LOW |
| ❌ UI Kits | Missing | LOW |

**27+ categories missing. See [BAM-AUDIT-2026-06-26.md](../../../.claude/audits/BAM-AUDIT-2026-06-26.md) for details.**

---

## 📚 Related Documentation

- [BLR Storefront README](README.md)
- [BLR Product Catalog](CATALOG.md)
- [BAM Audit Report](../../../.claude/audits/BAM-AUDIT-2026-06-26.md) — complete audit findings
- [SUTAR OS CLAUDE.md](../CLAUDE.md) — sibling product
- [Salar OS CLAUDE.md](../platform/twins/salar-os/CLAUDE.md) — workforce intelligence (not marketplace)

---

## 📝 Migration & Audit History

| Date | Event |
|------|-------|
| Pre-2026 | Marketplace docs claimed to be at `sutar-os/marketplace/` |
| 2026-06-20 | Audit found 7 services + Next.js storefront split across two locations |
| **2026-06-21** | **All 7 marketplace services merged into `blr-ai-marketplace/services/`. Folders renamed `sutar-*` → `blr-*`. Package names → `@hojai/blr-*`. SUTAR OS is now clean (4 subsystems). All 53 smoke tests passing.** |
| **2026-06-26** | **BAM Audit completed. Found ~12% functional vs spec claims of 70%. Fixed HTTP method mismatch in blr-exploration. Added Hub routes for all BAM services. Registered BAM in Hub registry. Documented remaining gaps.** |