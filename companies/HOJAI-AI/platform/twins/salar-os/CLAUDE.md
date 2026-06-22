# CLAUDE.md — Salar OS (Workforce Intelligence)

> **Status:** ✅ Moved to HOJAI AI on 2026-06-21
> **Old path:** `companies/CorpPerks/salar-os/`
> **New path:** `companies/HOJAI-AI/platform/twins/salar-os/`
> **Package name:** `@hojai/salar-os`
> **Port:** 4710 (default)

---

## What Salar OS is

**Salar OS is the Workforce Intelligence layer of HOJAI AI.** It manages digital twins for **humans, AI agents, and human-agent hybrid teams** — and maps organizational capabilities to the entities that can deliver them.

It is **not** an AI marketplace. The earlier RTMN root CLAUDE.md misclassified it as "the AI Marketplace with 600+ services." That description referred to the planned `HOJAI-AI/blr-ai-marketplace/` (a different service, currently docs-only) and to the `sutar-os/marketplace/` services. Both have been kept; Salar is something else.

### One-line definition

> Given a capability (e.g. "negotiate SaaS contracts") and a context (industry, urgency, language), Salar OS finds the **best matching entity** — a human, an AI agent, or a hybrid team — and provides a digital twin describing their skills, history, and current capacity.

---

## Modules (13)

| # | Module | Purpose |
|---|--------|---------|
| 1 | `capabilityRegistry.ts` | Maps capabilities (TECHNICAL, BUSINESS, OPERATIONS, CREATIVE, ANALYTICS, SUPPORT, HR, LEADERSHIP, DOMAIN) to humans, agents, and teams |
| 2 | `agentTwin.ts` | Digital twin for AI agents (capabilities, performance, trust, capacity) |
| 3 | `hybridTwin.ts` | Digital twin for human-agent hybrid teams |
| 4 | `organizationTwin.ts` | Digital twin for organizations |
| 5 | `vectorStore.ts` | Embeddings + similarity search across capability profiles |
| 6 | `salarSutarBridge.ts` | Integration with SUTAR OS decision engine |
| 7 | `sadaTrustIntegration.ts` | Pulls trust scores from Sada OS (4190) |
| 8 | `aiEmployeeSeeder.ts` | Seeds sample AI employee profiles |
| 9 | `aiEmployeeLLM.ts` | LLM-backed AI employee behavior |
| 10 | `dataConnectors.ts` | External data connectors (HRIS, CRM, ATS) |
| 11 | `integrationScripts.ts` | Migration + bootstrap scripts |
| 12 | `paymentIntegration.ts` | Pay-for-work tracking (uses REZ Wallet) |
| 13 | `mlTrainingPipeline.ts` | ML training pipelines for capability matching |

Total: ~9,000 lines TypeScript across 13 modules + entry point.

---

## API Surface (selected)

| Path | Method | Purpose |
|------|--------|---------|
| `/health` | GET | Liveness check |
| `/health/ready` | GET | Readiness (checks MongoDB) |
| `/capabilities` | * | Capability registry CRUD |
| `/agent-twin` | * | AI agent twin CRUD |
| `/human-twin` | * | Human twin CRUD |
| `/hybrid-team` / `/hybrid-twin` | * | Hybrid team twin CRUD |
| `/organization-twin` | * | Organization twin CRUD |
| `/sutar/*` | * | SUTAR OS bridge (decision requests) |
| `/sada-trust/*` | * | Pull trust scores from Sada |
| `/workforce/find` | POST | Find best entity for a capability |
| `/network` | GET | Workforce network state |

---

## Architecture & Dependencies

```
┌─────────────────────────────────────────┐
│  HOJAI AI Platform / Twins / Salar OS   │
│  Port 4710                              │
└─────────────────────────────────────────┘
              │
              ├── reads → CorpID (4702) — universal identity
              ├── reads → Sada OS (4190) — trust scores
              ├── reads → SUTAR OS (4240) — decision engine
              └── writes → REZ Wallet (4004) — pay-for-work
```

**Stack:** Node.js 20+ · Express 4 · TypeScript · MongoDB · Mongoose · Helmet · Compression · Pino logger (via `@rtmn/shared/lib/logger`)

---

## Configuration (env vars)

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | 4710 | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/salaros` | Mongo connection |
| `INTERNAL_SERVICE_TOKEN` | (required) | Service-to-service auth |
| `CORPID_SERVICE_URL` | `http://localhost:4702` | CorpID for identity |
| `ASSERTION_SERVICE_URL` | `http://localhost:4707` | CorpID assertions |
| `AGENT_REGISTRY_URL` | `http://localhost:4708` | Agent registry |
| `ALLOWED_ORIGINS` | `*` | CORS allow-list |

---

## What changed in the move (2026-06-21)

| Before (CorpPerks/salar-os) | After (HOJAI-AI/platform/twins/salar-os) |
|---|---|
| `@corpperks/shared` (file: `../shared`) | `@rtmn/shared` (file: `../../shared`) |
| `secureCors()` from corpperks/shared | `cors({ origin, credentials: true })` |
| `console.log` style debug | `createLogger('salar-os')` via `@rtmn/shared/lib/logger` |
| `authMiddleware` bypassed all requests | Now requires `x-internal-token` OR `Authorization: Bearer ...` |
| `dataConnectorsRouter` used but never imported (build-breaker) | Import added at line 37 |
| Package name `salar-os` | Package name `@hojai/salar-os` |
| No tsconfig.json | tsconfig.json created with path mapping |
| Orphan: `salar-sutar-integration.ts` (501 LOC) | Still present (consider consolidating into `salarSutarBridge.ts`) |

---

## What's still TODO (not in this move)

- Replace in-memory mock data in `salarSutarBridge.ts` with real SUTAR OS calls (currently returns hardcoded responses)
- Consolidate `salar-sutar-integration.ts` (orphaned) into `salarSutarBridge.ts` (active)
- Add real test suite (currently zero tests)
- Wire JWT verification against CorpID public key (currently trusts `Bearer` header presence)

---

## How to run

```bash
cd companies/HOJAI-AI/platform/twins/salar-os
npm install
npm run dev       # tsx watch src/index.ts
# or
npm start         # tsx src/index.ts (production-style)

# Health check
curl http://localhost:4710/health
```

---

## Related services

- **`platform/identity/corpid-service`** (4702) — Universal identity
- **`platform/trust/sada-os`** (4190) — Trust scoring (Salar pulls trust from here)
- **`sutar-os/core/sutar-decision-engine`** (4240) — Decision support
- **`platform/twins/employee-twin`** (4730) — Employee twin (complementary to Salar's human twin)
- **`products/copilots/agent-copilot`** (4920) — Uses Salar's workforce matching

---

*Last updated: 2026-06-21 — moved from `companies/CorpPerks/salar-os/` to its canonical HOJAI AI home.*