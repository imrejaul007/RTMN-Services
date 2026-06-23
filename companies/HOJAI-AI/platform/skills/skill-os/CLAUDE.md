# SkillOS — The Universal AI Capability Marketplace

**Version:** 1.1.0
**Port:** 4743
**Status:** ✅ **PHASE 1 SHIPPED** — June 23, 2026
**Tests:** 140/140 passing, 0 failures
**Routes:** 53 (up from 37 pre-Phase-1)
**Documentation:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) · [docs/ROADMAP.md](./docs/ROADMAP.md)

---

## Overview

**SkillOS** is the **Universal AI Capability Marketplace** — the registry, runtime, and storefront for every AI capability in the HOJAI ecosystem. Genie, CoPilot, SUTAR, Industry AI, and third-party AIs all use SkillOS to find, install, and execute capabilities.

```
TwinOS   (4705) = Identity & Representation    "What am I?"
MemoryOS (4703) = Knowledge & Experience      "What do I know?"
SkillOS  (4743) = Capability Layer            "What can I do?"   ← you are here
```

**Think of it as:** App Store + npm + GitHub + HuggingFace for AI capabilities.

---

## Phase 1 (this release) — "App Store for AI" foundation

| What | Status | Evidence |
|---|---|---|
| **Multi-asset registry** (10 types) | ✅ | `/api/assets` — skills, agent-templates, workflow-templates, prompt-packs, knowledge-packs, tool-connectors, model-adapters, automation-packs, industry-packs, enterprise-packs |
| **Install registry** (per-tenant) | ✅ | `/api/installed` + `POST /api/assets/:id/install` |
| **Rich metadata** (30+ fields) | ✅ | creatorId, publisher, ownerType, certification, compliance, pricing, languages, industries, etc. |
| **Certification scaffolding** (5 levels) | ✅ | `community → verified → enterprise → government → hojai-certified` |
| **Billing scaffold** (15/85 revenue share) | ✅ | transactions record + payout calc, no real money yet |
| **Governance** (deprecation, compliance, audit) | ✅ | 5-state lifecycle, 6 compliance frameworks, persistent audit log |
| **Event-bus activation** (16 topics) | ✅ | All write actions emit events; consumers can subscribe |
| **Hub route at :4500** | ✅ | `/api/skill-os/*` proxied via api-gateway |
| **Persistence: PersistentMap or MongoDB** | ✅ | Opt-in MongoDB via `MONGODB_URI`; PersistentMap default |
| **OpenAPI 3.0 spec** | ✅ | `GET /openapi.json` |
| **All 4 stub features → real** | ✅ | `/memory`, `/twin`, `/flow`, `/test` all actually call something |

### Previously-stub features (now real)

| Feature | Before | After |
|---|---|---|
| `POST /api/skills/:id/memory` | `{proxied: true}` | Real HTTP call to MemoryOS (4703); 503 if unreachable |
| `POST /api/skills/:id/twin` | `{proxied: true}` | Real HTTP call to TwinOS (4705); 503 if unreachable |
| `POST /api/skills/:id/flow` | `{proxied: true}` | Real HTTP call to FlowOS (4244); 503 if unreachable |
| `POST /api/skills/:id/test` | Echoed input | Runs the actual skill code in the VM sandbox |

---

## All 53 routes (Phase 1 surface)

### Health
- `GET /` — service metadata + counts
- `GET /health`
- `GET /ready`
- `GET /openapi.json`

### Skills (16)
- `POST/GET /api/skills`
- `GET/PUT/DELETE /api/skills/:id`
- `POST /api/skills/:id/execute`
- `POST /api/skills/:id/learn` + `GET`
- `POST /api/skills/:id/versions` + `GET`
- `POST /api/skills/:id/permissions` + `GET`
- `GET /api/skills/:id/analytics`
- `POST /api/skills/:id/dependencies` + `GET`
- `GET /api/skills/:id/events`
- `PUT /api/skills/:id/policies`
- `POST /api/skills/:id/memory` (real MemoryOS call)
- `POST /api/skills/:id/twin` (real TwinOS call)
- `POST /api/skills/:id/flow` (real FlowOS call)
- `POST /api/skills/:id/test` (real VM execution)
- `GET /api/skills/:id/tests`
- `GET /api/skills/:id/monitoring`
- `POST /api/skills/compose`
- `POST/GET /api/skills/categories`
- `GET /api/skills/discover` (ranked)
- `POST/GET /api/skills/marketplace`
- `POST/GET /api/skill-templates`
- `POST /api/skill-templates/:id/instantiate`
- `GET /api/skill-events`
- `GET /api/analytics`

### Multi-Asset (10)
- `GET/POST /api/assets` (filter by type, category, q, visibility)
- `GET/PUT/DELETE /api/assets/:id`
- `POST /api/assets/:id/install`
- `POST /api/assets/:id/certify`
- `GET /api/assets/:id/certify`
- `POST /api/assets/:id/deprecate`
- `GET /api/installed` (filter by tenant, type)
- `DELETE /api/installed/:id`

### Billing (3)
- `POST /api/billing/charge`
- `GET /api/billing/transactions`
- `GET /api/billing/payouts/:publisherId`

### Governance (1)
- `GET /api/audit`

---

## Quick start

```bash
cd companies/HOJAI-AI/platform/skills/skill-os
npm install
npm start

# Health
curl http://localhost:4743/health

# List all assets (multi-type)
curl http://localhost:4743/api/assets

# Install an asset
curl -X POST http://localhost:4743/api/assets/ast-agent-salesbot/install \
  -H 'Content-Type: application/json' \
  -d '{"tenantId": "acme-corp"}'

# Charge (records transaction)
curl -X POST http://localhost:4743/api/billing/charge \
  -H 'Content-Type: application/json' \
  -d '{"kind":"install","assetId":"ast-agent-salesbot","tenantId":"acme","publisherId":"hojai","amount":49,"status":"completed"}'

# Payout for a publisher
curl http://localhost:4743/api/billing/payouts/hojai
```

### Through the Hub (api-gateway at :4500)
```bash
curl http://localhost:4500/api/skill-os/health
curl http://localhost:4500/api/skill-os/api/assets
```

### With MongoDB (instead of PersistentMap)
```bash
MONGODB_URI=mongodb://localhost:27017/skill-os npm start
```

### Tests
```bash
npm test                    # all 140 tests
npm run test:integration    # 47 HTTP integration tests
npm run test:unit           # 93 unit tests
```

---

## Architecture

```
                    SkillOS (port 4743)
                    ───────────────────
  ┌────────────┐  ┌────────────┐  ┌──────────────┐
  │   Skills   │  │  Multi-    │  │   Installs   │
  │  (CRUD +   │  │  Asset     │  │   per-tenant │
  │  Runtime)  │  │  Registry  │  │              │
  └────────────┘  └────────────┘  └──────────────┘
       │              │                │
       └──────────────┼────────────────┘
                      │
       ┌──────────────┼────────────────┐
       │              │                │
       ▼              ▼                ▼
  ┌─────────┐   ┌──────────┐   ┌──────────────┐
  │ Cert.   │   │ Billing  │   │ Governance   │
  │ 5-level │   │ tx +     │   │ deprecate,   │
  │ scaffold│   │ payout   │   │ compliance,  │
  └─────────┘   └──────────┘   │ audit log    │
                               └──────────────┘
                                      │
       ┌──────────────────────────────┼──────────────┐
       ▼              ▼               ▼              ▼
   PersistentMap  Event bus      HTTP client   Auth
   or MongoDB     16 topics      for upstream  requireAuth
                  (publishes)    services      + bypass
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full breakdown.

---

## What Phase 1 did NOT ship (honest)

These are documented in [docs/ROADMAP.md](./docs/ROADMAP.md) as Phase 2+:

- ❌ Real money (Stripe, REZ Wallet) — Phase 2
- ❌ Real certification queue (reviewer workflow) — Phase 2
- ❌ Per-tenant isolation enforcement — Phase 2
- ❌ TypeScript / Python SDKs — Phase 2
- ❌ CLI (`hojai skill ...`) — Phase 2
- ❌ Semantic vector search / recommendations — Phase 2
- ❌ Public marketplace web UI — Phase 3
- ❌ Cross-tenant federation — Phase 3
- ❌ AI Credits economy — Phase 3
- ❌ Skill-as-IP marketplace — Phase 4

---

*Phase 1 shipped June 23, 2026. See [ROADMAP.md](./docs/ROADMAP.md) for what's next.*
