# HOJAI AI - Brand & Marketing Layer

> **The AI Infrastructure Company** - Powering the RTMN Ecosystem

---

## ⚠️ Important - Where Things Actually Live

This folder is the **HOJAI AI company root**. As of 2026-06-21, services are organized by **product** (what users recognize) and **platform** (shared infrastructure), not by technical layer.

**The real, working HOJAI AI services now live in `./products/`, `./platform/`, and `./sutar-os/`:**

| Original HOJAI name | Now lives at | Port |
|---------------------|--------------|------|
| HOJAI Memory | [./platform/memory/memory-os/](./platform/memory/memory-os/) | 4703 |
| HOJAI Memory Confidence | [./platform/memory/memory-confidence/](./platform/memory/memory-confidence/) | 4152 |
| HOJAI Memory Context Engine | [./platform/memory/memory-context-engine/](./platform/memory/memory-context-engine/) | 4790 |
| HOJAI Twin Memory Bridge | [./platform/twins/twin-memory-bridge/](./platform/twins/twin-memory-bridge/) | 4704 |
| HOJAI TwinOS | [./platform/twins/twinos-hub/](./platform/twins/twinos-hub/) | 4705 |
| HOJAI Intelligence | [./platform/intelligence/ai-intelligence/](./platform/intelligence/ai-intelligence/) | 4881 |
| HOJAI Customer Intelligence | [./products/bizora/customer-intelligence/](./products/bizora/customer-intelligence/) | 4885 |
| HOJAI Identity / CorpID | [./platform/identity/corpid-service/](./platform/identity/corpid-service/) | 4702 |

See [SERVICE-CLASSIFICATION.md](./SERVICE-CLASSIFICATION.md) for the full product-to-service map.

A pre-rebrand snapshot of the original HOJAI AI tree (with real TypeScript source) is preserved at `companies/HOJAI-AI-restored/` for reference. See [HOJAI-AI-restored/RECOVERY-NOTES.md](../HOJAI-AI-restored/RECOVERY-NOTES.md).

### 📋 REZ-Workspace Audit (2026-06-22)

Audited `companies/REZ-Workspace/` which contained a parallel HOJAI AI tree with ~470+ services. Most are duplicates or scaffold. See:
- [./REZ-WORKSPACE-AUDIT.md](./REZ-WORKSPACE-AUDIT.md) — Full audit report
- [./REZ-WORKSPACE-DEDUP-LIST.md](./REZ-WORKSPACE-DEDUP-LIST.md) — 34 deduplication candidates (NOT YET DELETED)

5 new products were imported from REZ-Workspace on 2026-06-22: Voice OS, BrandPulse, Energy OS, Hojai WhatsApp AI. Originals remain in REZ-Workspace per "don't lose anything" constraint.

---

## 📦 Product Organization (NEW 2026-06-21)

### 🧠 Personal AI Products
- **Genie** — Personal AI Assistant ([./products/genie/](./products/genie/)) — 23 services
- **Razo** — Smart Keyboard ([./products/razo/](./products/razo/)) — 1 service
- **Voice OS** — Enterprise voice AI platform ([./products/voice-os/](./products/voice-os/)) — 5 services (TTS/STT/NLU/telecom/studio) ✅ Imported 2026-06-22 from REZ-Workspace

### 🚀 Founder AI Products
- **Founder OS Product** — OKRs + journal ([./products/founder-os/](./products/founder-os/)) — 1 service ✅ v1.0 (port 4266, 19/19 tests)
- **Board Intelligence** — Meetings + resolutions ([./products/board-intelligence/](./products/board-intelligence/)) — 1 service
- **Investor Copilot** — Rounds + cap-table ([./products/investor-copilot/](./products/investor-copilot/)) — ✅ v1.0 (port 4265, 18/18 tests)
- **Startup Studio** — Cohorts + mentors ([./products/startup-studio/](./products/startup-studio/)) — ✅ v1.0 (port 4267, 19/19 tests)
- **Company Builder Suite** — Entity formation ([./products/company-builder/](./products/company-builder/)) — ✅ v1.0 (port 4268, 20/20 tests)

### 💼 Enterprise AI Products
- **Bizora** — Enterprise BI ([./products/bizora/](./products/bizora/)) — 2 services
- **HIB** — Human-In-the-Loop ([./products/hib/](./products/hib/)) — 5 services
- **AI Workspace** — Docs + threads ([./products/ai-workspace/](./products/ai-workspace/)) — 6 services
- **Copilots** — Role-based AI assistants ([./products/copilots/](./products/copilots/)) — 7 services
- **BrandPulse** — Brand intelligence ([./products/brandpulse/](./products/brandpulse/)) — 2 services ✅ Imported 2026-06-22 from REZ-Workspace
- **Energy OS** — Smart grid + renewables + carbon ([./products/energy-os/](./products/energy-os/)) — 1 service ✅ Imported 2026-06-22 from REZ-Workspace
- **Hojai WhatsApp AI** — Genie-style WhatsApp bot ([./products/hojai-whatsapp-ai/](./products/hojai-whatsapp-ai/)) — 1 service ✅ Imported 2026-06-22 from REZ-Workspace

### 🏗️ Platform (shared by all products)
- **Identity** ([./platform/identity/](./platform/identity/)) — 3 services
- **Twins** ([./platform/twins/](./platform/twins/)) — 23 services (twinos-hub + 21 twin services)
- **Memory** ([./platform/memory/](./platform/memory/)) — 3 services (memory-os 4703 + memory-confidence 4152 + memory-context-engine 4790 — see [docs/MEMORY-LAYER.md](./docs/MEMORY-LAYER.md), 124/124 tests)
- **Intelligence** ([./platform/intelligence/](./platform/intelligence/)) — 12 services
- **Flow** ([./platform/flow/](./platform/flow/)) — 12 services
- **Skills** ([./platform/skills/](./platform/skills/)) — 7 services
- **Connectors** ([./platform/connectors/](./platform/connectors/)) — 2 services
- **Training** ([./platform/training/](./platform/training/)) — 5 services
- **Observability** ([./platform/observability/](./platform/observability/)) — 6 services
- **Infra** ([./platform/infra/](./platform/infra/)) — 9 services (gateway, secrets, billing, etc.)

### 💰 SUTAR OS — Autonomous Economic Infrastructure
- **Core** ([./sutar-os/core/](./sutar-os/core/)) — 7 services
- ~~Marketplace~~ — **Moved to BLR AI Marketplace on 2026-06-21** ([./blr-ai-marketplace/services/](./blr-ai-marketplace/services/)) — 7 services
- **Contracts** ([./sutar-os/contracts/](./sutar-os/contracts/)) — 3 services
- **Agents** ([./sutar-os/agents/](./sutar-os/agents/)) — 14 services
- **Economy** ([./sutar-os/economy/](./sutar-os/economy/)) — 1 service

### 🏪 BLR AI Marketplace — Unified AI Marketplace
- **Discovery** ([./blr-ai-marketplace/services/discovery-engine/](./blr-ai-marketplace/services/discovery-engine/)) — port 4256
- **Exploration** ([./blr-ai-marketplace/services/blr-exploration/](./blr-ai-marketplace/services/blr-exploration/)) — port 4255
- **ROI Calculator** ([./blr-ai-marketplace/services/roi-calculator/](./blr-ai-marketplace/services/roi-calculator/)) — port 4259
- **Founder OS** ([./blr-ai-marketplace/services/blr-founder-os/](./blr-ai-marketplace/services/blr-founder-os/)) — port 4260
- **Multi-Agent Evaluator** ([./blr-ai-marketplace/services/blr-multi-agent-evaluator/](./blr-ai-marketplace/services/blr-multi-agent-evaluator/)) — port 4257
- **Reputation Aggregator** ([./blr-ai-marketplace/services/blr-reputation-aggregator/](./blr-ai-marketplace/services/blr-reputation-aggregator/)) — port 4258
- **Twin Marketplace** ([./blr-ai-marketplace/services/twin-marketplace/](./blr-ai-marketplace/services/twin-marketplace/)) — port 4146

### Total: 159 services across 11 products + 10 platform subsystems + 4 SUTAR subsystems + 1 BLR AI Marketplace (7 services)

---

## Architecture v2 (June 20, 2026)

After the audit, **5 architectural principles** were identified and implemented as 8 new services wired into ai-intelligence (4881) and the RTMN Hub (4399):

| # | Principle | New Service(s) |
|---|-----------|----------------|
| 1 | Everything has a Twin | TwinOS Hub v3.0 (already shipped) |
| 2 | Each Twin owns its Memory | **Twin Memory Bridge (4704)** |
| 3 | MemoryOS is consumed BY Intelligence | (Documentation enforced; MemoryOS no longer imports Intelligence) |
| 4 | Intelligence Layer consumes Twin + Memory + Skills | **ai-intelligence (4881) now exposes 37 agents** including Twin, Memory, Skill, Vector, RAG, Graph, Knowledge, TwinMemoryBridge |
| 5 | FlowOS is the orchestration layer | **[Flow Orchestrator (4244)](./platform/flow/flow-orchestrator/)** — single canonical FlowOS. 13 step types (`twin.resolve`, `memory.read`/`write`, `intelligence.call`, `policy.check`, `skill.execute`, `hook.pre`/`post`, `parallel`, `condition`, `fan-out`, `fan-in`, `debug.fail`), 5 seeded templates (`answer-question`, `decide-and-act`, `simulate-then-recommend`, `negotiate-and-execute`, `personal-assistant`), per-step retry with exponential backoff, plan versioning + rollback, flow learning + analytics, audit log, `policy.check` fail-CLOSED by default. Subscribes to `event-bus@4510` for `goal.created` events. The old `flowos@7007` (genie-os) and `flow-os-canonical@4156` are both deprecated. |

### New Services (June 20, 2026)

| Service | Port | Purpose |
|---------|------|---------|
| [./platform/flow/flow-orchestrator/](./platform/flow/flow-orchestrator/) | 4244 | ✅ **Built and running** — single canonical FlowOS. Architecture v2 target achieved. 13 step types + 5 templates + per-step retry + flow learning + analytics + audit. Replaces the deprecated `flowos@7007` and `flow-os-canonical@4156`. |
| [./services/reasoning-runtime/](./services/reasoning-runtime/) | 4253 | ReAct / Chain-of-Thought / Tree-of-Thought reasoning with auditable traces |
| [./services/twin-memory-bridge/](./services/twin-memory-bridge/) | 4704 | Binds twin IDs to memory partitions — "Each Twin owns its Memory" |
| [./services/connector-hub/](./services/connector-hub/) | 4785 | 8 SaaS connectors (Salesforce, HubSpot, Stripe, Shopify, Slack, Notion, Sheets, Twilio) |
| [./services/sandbox/](./services/sandbox/) | 4100 | Free isolated test environment with API key + namespace + TTL |
| [./services/webhook-bus/](./services/webhook-bus/) | 4110 | Event subscriptions + delivery with exponential backoff |
| [./services/skill-marketplace/](./services/skill-marketplace/) | 4120 | Buy/sell skills separately from agents |
| [./services/prompt-marketplace/](./services/prompt-marketplace/) | 4130 | Buy/sell prompt templates |

### Consumer → Executor → Foundation Flow (today)

```
Genie (7 foundation + 3 runtime) ──┐
CoPilot (6)                       ──┤
SUTAR agents (25)                 ──┼──►  Flow Orchestrator@4244  ──► TwinOS@4705
RTMN OS (40+)                     ──┤    (single canonical)        ──► MemoryOS@4703
3rd-party Products                ──┘                                ──► Twin-Memory Bridge@4704
                                                                        ──► PolicyOS@4254
                                                                        ──► SkillOS@4743
                                                                        ──► ai-intelligence@4881
```

[Flow Orchestrator@4244](./platform/flow/flow-orchestrator/) is the **single canonical entry point** for plan-based composition. Consumers send a `Plan` (DAG of step types) or a `Template` name; the orchestrator instantiates the plan, iterates the steps, calls the right foundation per step-type, applies per-step retry with exponential backoff, records a per-step trace, and returns the execution record. Step types map to foundations: `twin.resolve`→TwinOS, `memory.read`/`write`→Twin-Memory Bridge (with MemoryOS fallback), `intelligence.call`→ai-intelligence, `policy.check`→PolicyOS (fail-CLOSED by default), `skill.execute`→SkillOS. Composites (`parallel`, `condition`, `fan-out`, `fan-in`) and user-defined `hook.pre`/`hook.post` are also supported. Subscribes to `event-bus@4510` for `goal.created` events. Replaces the deprecated `flowos@7007` (genie-os) and `flow-os-canonical@4156`.

See [./divisions/02-infrastructure-cloud/CLAUDE.md](./divisions/02-infrastructure-cloud/CLAUDE.md) for the full Architecture v2 spec.

---

## External Clients Policy

### Leverge - External Client (NOT Part of HOJAI AI or RTMN)

**Leverge is a CLIENT of HOJAI AI, NOT part of the HOJAI AI or RTMN ecosystem.**

| Aspect | Rule |
|--------|------|
| **Ownership** | Leverge code belongs to Leverge, not HOJAI AI |
| **Location** | [leverge/](./leverge/) folder (client-folder stub only) |
| **Audits** | NEVER audit Leverge unless specifically requested by client |
| **Modifications** | NEVER modify Leverge code unless client explicitly requests |
| **Documentation** | Only maintain the `leverge/` folder for client docs |
| **Support** | Only assist when Leverge comes to us as a client |

**General Rule for ALL External Clients:**
- ✅ Only touch client code when they REQUEST something
- ❌ Never audit, modify, or improve client code unprompted
- ❌ Never include client code in HOJAI AI / RTMN architecture discussions
- ❌ Never add client services to the service registry unless integrated

**Reserved port ranges for external clients (do not use internally):**
- Ports 4761-4765: Leverge (analytics, memory, twin, agents, copilot)
- See [CANONICAL-PORT-REGISTRY.md](../../CANONICAL-PORT-REGISTRY.md) for the full reserved list

---

## What This Folder Contains

| Item | Purpose | State |
|------|---------|-------|
| [README.md](./README.md) | Public marketing copy for the HOJAI AI brand | ✅ |
| [platform/](./platform/) | **190+ runtime services across the HOJAI AI ecosystem** (organised by subsystem: `flow/`, `twins/`, `memory/`, `intelligence/`, `skills/`, `trust/`, `identity/`, `observability/`, `infra/`, `training/`, `connectors/`, `knowledge-graph/`, `economy/`). Includes TwinOS, MemoryOS, Twin-Memory Bridge, Genie, ACN, SUTAR, Copilots, [Flow Orchestrator (4244, single canonical FlowOS)](./platform/flow/flow-orchestrator/), and all 12 division backings. | ✅ |
| [divisions/](./divisions/) | 12-division strategic architecture docs (Architecture v2) | ✅ |
| [shared/](./shared/) | Shared library (auth, lib, templates) used by all services | ✅ |
| [blr-ai-marketplace/](./blr-ai-marketplace/) | Flagship marketplace (Next.js + Stripe) | ⚠️ **No source** - only `package.json` + 3 docs. Future work. |
| [leverge/](./leverge/) | Client-folder stub for Leverge docs | ✅ per policy |

## What This Folder Does NOT Contain

- ❌ No services in `/services/` (all moved to [./services/](./services/) 2026-06-19)
- ❌ No services in `industry-os/shared/` (all moved 2026-06-19)

---

## Connections

HOJAI AI (as a company) connects to:
- RABTUL Technologies (Payment, Auth)
- REZ-Merchant (POS, Orders)
- REZ-Consumer (DO App)
- AdBazaar (CRM, Ads)
- NeXha (Procurement)
- CorpPerks (HR)
- CorpID (Identity) → [./services/corpid-service/](./services/corpid-service/)
- MemoryOS (Memory) → [./services/memory-os/](./services/memory-os/)
- TwinOS Hub (Digital Twins) → [./services/twinos-hub/](./services/twinos-hub/)
- Event Bus (Events) → [./services/event-bus/](./services/event-bus/)
- All RTMN Department OS + Industry OS (consume HOJAI AI services via HTTP)

---

## Production Readiness Status (2026-06-22) ✅

> **All 5 phases complete.** See [PRODUCTION-READINESS-SUMMARY.md](./PRODUCTION-READINESS-SUMMARY.md) for the full breakdown.

### What "Production-Ready" Means Here

A service is production-ready when it has:
1. **Auth on every mutating route** — `requireAuth` from `@rtmn/shared/auth`
2. **No hardcoded secret fallbacks** — `process.env.X` with no `|| 'default'`
3. **Fail-fast env validation** — `requireEnv(['PORT'])` at startup
4. **Persistent storage** — `PersistentMap` from `@rtmn/shared/lib/persistent-map` (or `PersistentStore` for high-write)
5. **Health vs Ready split** — `/health` for liveness, `/ready` for readiness
6. **Graceful shutdown** — `installGracefulShutdown(server)` from `@rtmn/shared/lib/shutdown`
7. **Structured logging** — winston via `@rtmn/shared/lib/logger.js`
8. **Typed errors** — `NotFoundError`, `ValidationError`, etc., via `@rtmn/shared/lib/errors.js`
9. **Smoke tests with specific assertions** — `expect_code="404"`, not `expect_code="any"`

### Current metrics (verified 2026-06-22)

| Metric | Count | Audit script |
|---|---|---|
| Listening services | 182 | — |
| With `/ready` endpoint | 182 (100%) | `node scripts/audit-ready-endpoints.mjs` |
| With `installGracefulShutdown` | 182 (100%) | (custom check) |
| With `requireAuth` on mutating routes | 181 (99.4%) | `node scripts/audit-auth.mjs` |
| With `requireEnv` fail-fast | 176 (96.7%) | (custom check) |
| Using `PersistentMap` | 113 (62.1%) | (custom check) |
| With no hardcoded secret fallbacks | 182 (100%) | `node scripts/audit-secrets.mjs` |
| Total `PersistentMap` instances | 404 | (custom check) |

The 1 unprotected route is in a newly-added untracked service (`platform/flow/compliance-engine`). Will be patched when that service moves from scaffold to tracked.

### Shared Library: `@rtmn/shared`

Located at [./shared/](./shared/). Provides:

| Module | Purpose | Used by |
|---|---|---|
| `lib/persistent-store.js` | Async file-backed JSON storage (Mongoose-like API) | corpid-service |
| `lib/persistent-map.js` | Drop-in `Map` with file persistence (sync API) | 113 services, 404 maps |
| `lib/shutdown.js` | `installGracefulShutdown(server, cleanup)` | 182 services |
| `lib/env.js` | `requireEnv(['PORT'], { allowDev: true })` | 176 services |
| `lib/logger.js` | Winston structured logger | all services |
| `lib/errors.js` | Typed errors + Express middleware | all services |
| `auth/index.cjs` | `requireAuth` middleware (pre-configured) | all services |

**Migration guide:** [./shared/MIGRATION-GUIDE.md](./shared/MIGRATION-GUIDE.md)

### Services by Production Readiness Tier

| Tier | Count | Description |
|---|---|---|
| ✅ Production | 1 | corpid-service v3.0.0 — persistent storage, 23 tests, full shared lib integration |
| 🟡 Migrated | 0 | (in progress) |
| ⚠️ Functional | 160 | Currently use in-memory Map; work but lose data on restart |
| ❌ Scaffold | varies | Empty/stub directories; need build-or-delete decision |

### Migration Tracker

| Service | Status | Notes |
|---|---|---|
| corpid-service (4702) | ✅ v3.0.0 | Template for all others |
| twinos-hub (4705) | ⏳ Next | High-traffic foundation |
| memory-os (4703) | ⏳ Planned | Used by Genie |
| customer-intelligence | ⏳ Planned | High value |
| All other 157 services | ⏳ Batched | ~2 hours each, prioritize by usage |

---

## 🔍 TwinOS Re-Audit (2026-06-21)

A comprehensive audit was performed on the entire TwinOS platform. **All 15 twin services are now healthy and the cross-service auth works end-to-end.**

### File Locations (Canonical)

```
/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/
├── twinos-hub/          # Central registry on port 4705 (v3.0.0, 70 twins registered)
├── twinos-shared/       # Shared library: @rtmn/twinos-shared v2.0.0
├── organization-twin/   # Port 4710
├── product-twin/        # Port 4720
├── employee-twin/       # Port 4730
├── voice-twin/          # Port 4876
├── order-twin/          # Port 4885
├── payment-twin/        # Port 4886
├── inventory-twin/      # Port 4887
├── merchant-twin/       # Port 4888
├── user-twin/           # Port 4889
├── asset-twin/          # Port 4890
├── partner-twin/        # Port 4892
├── lead-twin/           # Port 4894
├── customer-twin/       # Port 4895
├── wallet-twin/         # Port 4896
├── area-twin/           # Port 4964 (geo/area data)
├── buyer-twin/          # Port 3000 (buyer profiles)
├── deal-twin/           # Port 3000 (sales deals)
├── property-twin/       # Port 3000 (real estate)
├── referral-twin/       # Port 4965 (referral tracking)
├── twin-capability-profile/   # Port 4150
├── twin-memory-bridge/        # Port 4704
└── salar-os/            # Workforce intelligence (different structure)
```

### Startup Script

```bash
/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/start-twins.sh
```

This starts all 15 main twin services in dependency order, with health checks.

### Issues Found and Fixed

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | All 15 services' POST/PATCH/DELETE returned `next is not a function` | `preventPrototypePollution` was a body-cleaner in v1 but became middleware in v2; 14 services still called it as a function | Made it **polymorphic** in `twinos-shared`: middleware form `(req,res,next)` OR legacy form `(obj)→cleanedObj` |
| 2 | `user-twin` wouldn't start at all | Imported `TWIN_STATUS` from shared lib but it wasn't exported; also `createBaseTwinService` used `express` without importing it | Removed `TWIN_STATUS` import, added local constant; added `import express from 'express'` to shared lib |
| 3 | `lead-twin` health check returned "next is not a function" | Called `preventPrototypePollution(req.body)` as a function inside a wrapper middleware | Replaced wrapper with `app.use(preventPrototypePollution)` directly |
| 4 | Hub `/auth/register` issued UUID-shaped tokens (`access-<uuid>-<ts>`) that other services rejected | Hub used its own ad-hoc `generateTokens` function; shared lib's `requireAuth` expects JWTs | Hub now delegates to shared lib's `generateTokens` (added `signToken`, `verifyJwt`, `generateTokens` exports); all tokens are now proper JWTs |
| 5 | `twinos-hub` was missing `bcryptjs` and `jsonwebtoken` | Not declared in `package.json` (used `import('bcryptjs')` dynamically) | Installed via `npm install` |

### What Now Works (End-to-End)

```bash
# 1. Register a user (issues a JWT)
curl -X POST http://localhost:4705/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"Test1234!","businessId":"biz-1","businessName":"Biz","role":"owner"}'
# → { "accessToken": "eyJhbGc...", "refreshToken": "eyJhbGc..." }

# 2. Use the token to call any twin service
curl -X POST http://localhost:4895/api/twins/customer \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@x.com"}'
# → { "success": true, "twin": {...} }
```

All 15 services accept the same JWT issued by the hub. The cross-service auth chain is verified.

### Services Health Status (Post-Audit)

| Service | Port | Status | Version |
|---------|------|--------|---------|
| twinos-hub | 4705 | ✅ Healthy | 3.0.0 |
| organization-twin | 4710 | ✅ Healthy | 2.0.0 |
| product-twin | 4720 | ✅ Healthy | 2.0.0 |
| employee-twin | 4730 | ✅ Healthy | 2.0.0 |
| voice-twin | 4876 | ✅ Healthy | 2.0.0 |
| order-twin | 4885 | ✅ Healthy | 1.0.0 |
| payment-twin | 4886 | ✅ Healthy | 1.0.0 |
| inventory-twin | 4887 | ✅ Healthy | 1.0.0 |
| merchant-twin | 4888 | ✅ Healthy | 1.0.0 |
| user-twin | 4889 | ✅ Healthy | 1.0.0 |
| asset-twin | 4890 | ✅ Healthy | 2.0.0 |
| partner-twin | 4892 | ✅ Healthy | — |
| lead-twin | 4894 | ✅ Healthy | 2.0.0 |
| customer-twin | 4895 | ✅ Healthy | 1.0.0 |
| wallet-twin | 4896 | ✅ Healthy | 1.0.0 |

### Notes

- **`/Users/rejaulkarim/Documents/RTMN/services copy/`** is a **temporary working copy** of twin services (1.4 GB) — it is NOT the canonical home. The canonical home is `companies/HOJAI-AI/platform/twins/`. The `services copy/` folder can be safely deleted once verified.
- All twins are pure ESM (`"type": "module"`).
- All twins use `@rtmn/twinos-shared` v2.0.0 via `file:../twinos-shared`.
- Storage is in-memory (`Map`s) — fine for demos, swap for `@rtmn/shared/lib/persistent-store.js` for production.

---

## Three Product Groups (Planned Organization)

The HOJAI AI vision describes three product groups. Code is currently flat under `services/`. Future reorganization:

### HOJAI Core — Foundation
Identity, memory, digital twins. Used by every other service.

**Services:** corpid-service (4702), memory-os (4703), twinos-hub (4705), twin-memory-bridge (4704), event-bus, area-twin, asset-twin, customer-twin, employee-twin, lead-twin, order-twin, organization-twin, partner-twin, product-twin, voice-twin, wallet-twin, buyer-twin, deal-twin, property-twin, referral-twin

### HOJAI Intelligence — AI Layer
Agents, copilots, reasoning, RAG, knowledge graphs.

**Services:** ai-intelligence (4881), agent-copilot, business-copilot, agent-analytics, agent-contracts, agent-learning, agent-marketplace, agent-orchestration, agent-reputation, agent-wallets, agent-twin, agent-economy, multi-agent-runtime, reasoning-runtime, planning-engine, knowledge-network, behavior-intelligence, context-engine, feature-store, rlhf-pipeline, knowledge-distillation

### HOJAI Cloud — Products
Genie assistants, SUTAR OS marketplace, industry OS, marketplaces.

**Services:** genie-* (15 services), sutar-* (12 services), industry-twin, flow-orchestrator, connector-hub, connector-marketplace, skill-marketplace, prompt-marketplace, blr-ai-marketplace, acn-*, customer-support-service, billing, ai-safety, sandbox, webhook-bus

### Why not reorganize now?

Reorganization is a **physical move** (git mv) that breaks imports in 161 places. Until the shared library adoption is complete, services depend on relative paths like `../../../shared/lib/...`. Reorganization will be a Phase 5 task in the production-readiness roadmap — see [plans/toasty-singing-sunrise.md](../.claude/plans/toasty-singing-sunrise.md).

---

*Last Updated: 2026-06-24 (**Phase 38 SHIPPED**: AI Studio Visual Builder — 10 services, ports 4900-4909, 83 tests passing; ai-studio-api gateway + studio-projects + studio-playground + studio-workflow + studio-agent + studio-twin + studio-rag + studio-eval + studio-deployment + studio-collab + marketplace with 5 starter templates. See [PHASE-38-AUDIT.md](../../PHASE-38-AUDIT.md) for full audit. **Phase 40 SHIPPED 2026-06-24**: Agent Lifecycle — 7 services, ports 4910-4916, 124 tests passing. **Phase 32 SHIPPED 2026-06-24**: Agent OS — 12 services, 737 tests passing. **Phase 31 SHIPPED 2026-06-24**: Eval Platform — 8 services, 163 tests passing. **Phase 14 SHIPPED**: Planning Engine — 6 services, 115 tests passing. **Phase 27 SHIPPED 2026-06-25**: AIOps — 6 services, 88 tests (aiops-api, escalation-engine, incident-detector, oncall-rotation, postmortem-service, runbook-engine). **Phase 25 SHIPPED 2026-06-25**: Multi-Modal — 14 services, 168 tests (9 foundation services ports 5342-5350 + 5 capability services ports 5351-5355). **Remaining in 40-phase plan**: Phase 30 (Foundation Models — stubs only), Phase 39 (Memory Lifecycle — partial).*)*
