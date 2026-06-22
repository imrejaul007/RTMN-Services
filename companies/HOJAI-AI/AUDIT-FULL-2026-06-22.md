# HOJAI AI - Complete Audit (2026-06-22)

> Generated from a thorough audit of `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/` on branch `feat/phase-c-nexha-supplier-logistics` at commit `ca4d49ad`.

---

## TL;DR

| Metric | Value |
|--------|-------|
| **Total services** | 185 (production code, excluding `legacy-audit` and `divisions/`) |
| **TypeScript services** | 57 |
| **JavaScript services** | 177 |
| **Total LOC (TS+JS)** | 247,547 |
| **Commits in git history** | 145 |
| **Active branches** | 3 (`feat/phase-c-nexha-supplier-logistics`, `feat/sutar-logistics`, `main`) |
| **Production port conflicts** | 0 |
| **Helmet coverage** | 181/185 (97.8%) |
| **CORS coverage** | 176/185 (95.1%) |
| **Rate-limit coverage** | 53/185 (28.6%) direct + 28 using `setupSecurity` |
| **requireEnv coverage** | 166/185 (89.7%) |
| **/ready endpoint** | 183/185 (98.9%) |
| **/health endpoint** | 183/185 (98.9%) |
| **Graceful shutdown** | 181/185 (97.8%) |
| **Dockerfile** | 23/185 (12.4%) |
| **Tests** | 55 test files across the repo |

---

## 1. Repository Structure

```
HOJAI-AI/
├── platform/          # 93 services — core infrastructure
│   ├── connectors/    # 2
│   ├── economy/       # 2
│   ├── flow/          # 14 (goal-os, flow-orchestrator, journey-intelligence, ...)
│   ├── identity/      # 4 (corpid-service, etc.)
│   ├── infra/         # 9
│   ├── intelligence/  # 12 (inference-gateway, graphql-federation, ai-intelligence, ...)
│   ├── knowledge-graph/  # 1
│   ├── memory/        # 4 (memory-os, memory-confidence, twin-memory-bridge, memory-network)
│   ├── observability/ # 4
│   ├── skills/        # 7 (skill-os, etc.)
│   ├── training/      # 5
│   ├── trust/         # 4 (sada-os, agent-reputation, dispute-resolution, ...)
│   └── twins/         # 25 (twinos-hub, customer-twin, wallet-twin, ...)
│
├── products/          # 59 services — end-user products
│   ├── ai-workspace/  # 6 (document-intelligence, knowledge-base, ...)
│   ├── bizora/        # 2 (customer-intelligence, reports-dashboard)
│   ├── board-intelligence/  # 1 (meeting-os)
│   ├── brandpulse/    # 1
│   ├── brandpulse-dashboard/  # 1
│   ├── company-builder/  # 1
│   ├── copilots/      # 7 (executive, sales, support, agent, ...)
│   ├── energy-os/     # 1
│   ├── founder-os/    # 2
│   ├── genie/         # 24 (genie-shopping-agent, genie-creation-os, genie-calendar, ...)
│   ├── hib/           # 4 (helpdesk, live-support, support-sla, support-escalation)
│   ├── hojai-whatsapp-ai/  # 1
│   ├── investor-copilot/  # 1
│   ├── mission-control/  # 1
│   ├── razo/          # 1 (razo-keyboard)
│   ├── startup-studio/  # 1
│   └── voice-os/      # 4 (voice-ai-service, voice-commerce, HOJAI-VOICE-PLATFORM, ...)
│
├── sutar-os/          # 28 services — Autonomous Economic Infrastructure
│   ├── agents/        # 12 (acn-hub, acp-protocol, acn-network, merchant-agents,
│   │                  #       agent-reputation, agent-contracts, agent-marketplace,
│   │                  #       agent-learning, agent-orchestration, agent-analytics,
│   │                  #       acn-integration, agent-teaming)
│   ├── contracts/     # 4 (sutar-contract-os, sutar-negotiation-engine, negotiation-ai, ...)
│   ├── core/          # 11 (sutar-gateway, sutar-decision-engine, sutar-trust-engine,
│   │                  #      sutar-contract-os, sutar-negotiation-engine, sutar-economy-os,
│   │                  #      sutar-monitoring, sutar-supplier-registry, sutar-logistics, ...)
│   └── economy/       # 1 (sutar-economy-os)
│
├── blr-ai-marketplace/  # 7 services — AI Marketplace
│   └── services/      # blr-exploration, blr-founder-os, blr-multi-agent-evaluator,
│                      # blr-reputation-aggregator, discovery-engine, roi-calculator,
│                      # twin-marketplace
│
├── salar/             # 1 — Salar OS (Workforce Intelligence)
├── simulation-os/     # 1 — Simulation OS
├── shared/            # @rtmn/shared — JWT auth, env, security, persistent-store
├── divisions/         # 12 numbered divisions (00-foundation through 12-sutar-os) — empty
├── docs/              # 11 markdown docs
├── legacy-audit/      # decommissioned (excluded from audit)
├── leverge/           # external client (excluded per policy)
└── scripts/           # smoke-test, demo scripts
```

---

## 2. Foundation: `@rtmn/shared`

The shared library (2,637 LOC) provides:

| Module | Purpose |
|--------|---------|
| `auth` | JWT authentication middleware (`requireAuth`, `optionalAuth`) |
| `security` | Canonical `setupSecurity(app, opts)` — applies helmet + CORS allowlist + rate-limit + JSON cap + prototype-pollution guard + structured logger |
| `lib/env` | `requireEnv(['PORT'])` — fail-fast on missing required env vars |
| `lib/shutdown` | `installGracefulShutdown(server)` — SIGTERM/SIGINT handlers |
| `lib/persistent-store` | `PersistentStore` — in-process Map with optional MongoDB |
| `lib/persistent-map` | `PersistentMap` — Map variant with persistence |
| `lib/database` | MongoDB connection helper |
| `lib/logger` | Structured pino logger |
| `lib/errors` | Consistent error responses |
| `lib/crm` | CRM helpers |

**Security defaults (in `shared/security`):**
- helmet() with strict defaults
- CORS allowlist: `localhost:3000`, `localhost:3001`, `localhost:4399`, `localhost:5173`, `localhost:8080`
- `express.json` hard cap: 1 MB
- Default rate limit: 100/min/IP
- Strict rate limit: 20/min/IP
- Prototype-pollution guard
- morgan structured logging

---

## 3. Security Posture — Production-Readiness Audit

Excluding `legacy-audit/`, `divisions/`, and `docs/` (185 production services).

| Check | Pass | Coverage | Notes |
|-------|-----:|---------:|-------|
| **helmet()** | 181 / 185 | 97.8% | 4 missing: `sutar-logistics`, `sutar-trust-engine`, `sutar-supplier-registry`, `document-intelligence` |
| **cors()** | 176 / 185 | 95.1% | 9 missing — same 4 + 5 in trust/economy twins |
| **rate-limit** | 53 + 28 via `setupSecurity` | 28.6% direct | 132 services use neither `setupSecurity` nor direct rate-limit |
| **requireEnv(['PORT'])** | 166 / 185 | 89.7% | 19 missing — see list below |
| **/ready endpoint** | 183 / 185 | 98.9% | 2 missing: `document-intelligence`, `twinos-shared` |
| **/health endpoint** | 183 / 185 | 98.9% | 2 missing: `document-intelligence`, `ai-intelligence` |
| **Graceful shutdown** | 181 / 185 | 97.8% | 4 missing: `salar`, `brandpulse`, `document-intelligence`, `simulation-os` |
| **Dockerfile** | 23 / 185 | 12.4% | 162 missing |
| **Tests** | 55 test files across repo | ~30% | Concentrated in SUTAR (vitest) + twins |

### requireEnv gaps (19 services)

```
salar
sutar-os/contracts/sutar-negotiation-engine
sutar-os/contracts/sutar-contract-os
products/energy-os
products/brandpulse
products/hojai-whatsapp-ai
sutar-os/economy/sutar-economy-os
sutar-os/core/sutar-logistics           ← NEW (Phase C)
sutar-os/core/sutar-decision-engine
sutar-os/core/sutar-trust-engine
sutar-os/core/sutar-supplier-registry   ← NEW (Phase C)
products/ai-workspace/document-intelligence
simulation-os/simulation-os
platform/knowledge-graph/knowledge-graph-os
products/voice-os/core/HOJAI-VOICE-PLATFORM
products/voice-os/backend/voice-commerce
products/voice-os/ai/voice-ai-service
platform/memory/memory-network/memory-network
platform/twins/unified-twin-os/unified-twin-os
```

### Critical security gaps

**`document-intelligence`** is the worst offender — missing helmet, CORS, /ready, /health, graceful-shutdown, AND requireEnv. It's a new service that imports `helmet` and `cors` at the top but never calls `app.use()` on them.

**3 new SUTAR services** (`sutar-supplier-registry`, `sutar-logistics`, `sutar-trust-engine` after renumber) are missing helmet + CORS.

---

## 4. Port Map (HOJAI AI only — 185 services)

### Port ranges

| Range | Used by | Notes |
|-------|---------|-------|
| 3000 | buyer-twin, deal-twin, property-twin | Next.js-style default; benign |
| 3100 | sutar-monitoring | |
| 3999 | (3 services) | |
| 4140-4155 | SUTAR OS core & gateway | gateway:4140, identity:4142, agent-id:4143, twin-os:4144, memory-bridge:4145 |
| 4180-4191 | (renumbered out — see below) | |
| 4240-4260 | SUTAR decision/goal/simulation | |
| 4290-4297 | SUTAR OS renumbered range | decision:4290, trust:4291, contract:4292, negotiation:4293, economy:4294, memory-network:4295, energy:4296, salar:4297 |
| 4510 | event-bus | |
| 4701-4790 | TwinOS + Genie + foundation | corpid:4702, memory-os:4703, twin-memory-bridge:4704, twinos-hub:4705, genie-shopping:4716, genie-calendar:4709, genie-memory-inbox:4710, genie-briefing:4712, genie-search:4713, genie-serendipity:4714, genie-smart-forgetting:4715, voice-twin:4876, razo-keyboard:4725, genie-creation-os:4729, employee-twin:4730, organization-twin:4733, inference-gateway:4734, brandpulse:4735, genie-memory-inbox:4736, merchant-agents:4737, agent-reputation:4738, genie-consultant:4739 |
| 4881-4896 | TwinOS Commerce twins | order:5310, customer-intel:5311, customer-twin:4895, wallet:4896, payment:4886, inventory:4887, merchant:4888, user:4889, asset:4890, partner:4892, lead:4894 |
| 5000+ | Various product services | |

### Active port collisions: **0**

After the recent port renumbering (commit `d032ed6a fix(ports): renumber 18 services to resolve 11 port conflicts`), there are no production port conflicts in source code. The 3 services on port 3000 all check `process.env.PORT || 3000`, so they only conflict in dev when PORT isn't set.

---

## 5. Authentication

| Metric | Value |
|--------|-------|
| Services importing `requireAuth` | 230 files |
| Routes guarded by `requireAuth` | 1,778 references |
| Services using `setupSecurity` | 28 |
| JWT signing key | In `corpid-service` (port 4702) — shared secret across `@rtmn/shared/auth` |
| `auth.middleware.ts` patterns | Consistent across services |

The auth pattern is uniform: import `requireAuth` from `@rtmn/shared/auth`, apply per-route. No service uses a different auth scheme.

---

## 6. TwinOS — Digital Twin Platform

**25 twins** under `platform/twins/`:

| Twin | Port | LOC | Status |
|------|-----:|----:|--------|
| twinos-hub | 4705 | 2,854 | ✅ Running |
| customer-twin | 4895 | 779 | ✅ NEW |
| order-twin | 5310 | 902 | ✅ NEW (was 4885) |
| wallet-twin | 4896 | 252 | ✅ NEW |
| employee-twin | 4730 | 700 | ✅ Fixed |
| product-twin | 4720 | 943 | ✅ |
| asset-twin | 4890 | 876 | ✅ |
| organization-twin | 4733 | 1,045 | ✅ Fixed (was 4710) |
| partner-twin | 4892 | 909 | ✅ |
| lead-twin | 4894 | 1,463 | ✅ |
| merchant-twin | 4888 | 1,304 | ✅ |
| inventory-twin | 4887 | 2,120 | ✅ |
| payment-twin | 4886 | 1,196 | ✅ |
| user-twin | 4889 | 989 | ✅ |
| voice-twin | 4876 | 647 | ✅ |
| buyer-twin | 3000 | 520 | ✅ |
| deal-twin | 3000 | 529 | ✅ |
| property-twin | 3000 | 526 | ✅ |
| referral-twin | 4965 | 347 | ✅ |
| area-twin | 4964 | 336 | ✅ |
| twin-capability-profile | 4150 | 581 | ✅ |
| twin-memory-bridge | 4704 | 976 | ✅ |
| salar-os | 4297 | 9,179 | ✅ |
| twinos-shared | — | 2,664 | ✅ Library |
| unified-twin-os | — | — | ⚠️ Partial |

`@rtmn/twinos-shared` (in `platform/twins/twinos-shared/`) provides cross-cutting twin helpers: `optionalAuth`, `defaultLimiter`, `strictLimiter`, `sanitizeObject`, `preventPrototypePollution`, `installPhase5`.

---

## 7. SUTAR OS — Autonomous Economic Infrastructure

**28 services** under `sutar-os/`:

| Category | Services |
|----------|----------|
| **core** (11) | sutar-gateway:4140, sutar-decision-engine:4290, sutar-trust-engine:4291, sutar-contract-os:4292, sutar-negotiation-engine:4293, sutar-economy-os:4294, sutar-monitoring:3100, sutar-supplier-registry:NEW, sutar-logistics:NEW, identity-os, agent-id, twin-os, memory-bridge |
| **agents** (12) | acn-hub:4800, acp-protocol:4800, acn-network:4801, merchant-agents:4810, agent-reputation:4820, agent-contracts:4830, agent-wallets:4840, agent-marketplace:4845, agent-learning:4846, dispute-resolution:4847, agent-analytics:4848, acn-integration:4849, negotiation-ai:4850, agent-orchestration:4851, agent-teaming |
| **contracts** (4) | sutar-contract-os, sutar-negotiation-engine, negotiation-ai, sada-status |
| **economy** (1) | sutar-economy-os (105 passing vitest tests) |

**Phase B shipped (2026-06-22):**
- sutar-supplier-registry: supplier onboarding + registry + force-reseed for tests
- sutar-logistics: route planning with carrier specialHandling support
- All Phase B services on the renumbered port range (4290-4297)

---

## 8. Memory Layer

**4 services** as documented in `MEMORY-LAYER.md`:

| Service | Port | Purpose |
|---------|------|---------|
| `memory-os` | 4703 | The dumb store — 15 memory types, knowledge graph, working/long-term |
| `memory-confidence` | 4152 | Per-fact reliability: base × decay × contradiction |
| `twin-memory-bridge` | 4704 | Twin ↔ memory partition links |
| `memory-context-engine` | 4790 | Smart retriever — composes LLM context windows |

All four share `@rtmn/shared/auth` JWT middleware (CorpID-backed).

---

## 9. Genie Voice (24 services)

Largest product group. Includes:
- genie-shopping-agent:4716
- genie-calendar:4709
- genie-memory-inbox:4710/4736
- genie-briefing:4712
- genie-search:4713
- genie-serendipity:4714
- genie-smart-forgetting:4715
- genie-creation-os:4729
- genie-companion, genie-money, genie-life-gps, genie-execution, genie-listening-modes, genie-wellness, genie-consultant, genie-relationship, genie-memory-graph, genie-device-integration, genie-wake-word, genie-universal-search, genie-buzzlocal, etc.

Per the Phase 7 refresh (`2b4911b3 docs(genie): refresh all 23 specialist CLAUDE.md files for Phase 7`), each Genie service now has its own CLAUDE.md.

---

## 10. Recent Development Activity

Last 10 commits on `feat/phase-c-nexha-supplier-logistics`:
```
ca4d49ad fix(sutar-logistics): respect carrier specialHandling support
2b4911b3 docs(genie): refresh all 23 specialist CLAUDE.md files for Phase 7
34a03e76 feat(sutar): add sutar-logistics + force-reseed option for supplier service
2f5bd870 feat(sutar): add sutar-supplier-registry + align Dockerfiles to renumbered ports
9a772b5d docs(flow-orchestrator): mark 4244 as built-and-running in CLAUDE.md
9a870523 docs(governance): per-service CLAUDE.md for PolicyOS, Compliance, Consent
8cb47712 docs(twinos): Phase 5 complete summary + ops runbook + smoke refresh
f7b42c0c test(twins): Phase 5 smoke test for 19 twins
97c261b1 feat(twins): wire Phase 5 lifecycle endpoints + seed data
edcc4020 feat(twinos-shared): Phase 5 lifecycle primitives + installer
```

Git contributors: 224 commits from `ReZ Team`, 11 from `Claude Code`, 4 from `Claude`, 4 from `HOJAI Bot`, 1 from `Rejaul Karim`.

---

## 11. Real Risks

### High

1. **`document-intelligence` (port 4782)** — imports `helmet` + `cors` at top but never calls `app.use()` on them. Also missing `/health`, `/ready`, graceful-shutdown, requireEnv, Dockerfile, tests. Public-facing service for RAG ingestion.

2. **132 services without rate-limit** — not directly exposed to internet (they're behind the Hub), but a single misconfiguration exposes them to abuse.

3. **No Dockerfile on 162 services** — blocks containerized deployment. The shared scripts likely use `npm start` directly.

### Medium

4. **3 services default to port 3000** (buyer-twin, deal-twin, property-twin) — collides with Next.js dev. Not an issue in production (PORT is set) but breaks local dev if two run without override.

5. **TwinOS services on port 3000 default** — same issue.

6. **No CI pipeline visible** — no `.github/workflows/` directory found. All testing is manual via `scripts/`.

### Low

7. **19 services missing requireEnv** — fail-fast on missing env is a nice-to-have, not critical for correctness.

8. **8 services missing helmet+CORS** — 4 are new SUTAR services; 4 are older. Should be standardized on `setupSecurity()`.

---

## 12. What was hardened this session

| Date | Commit | Effect |
|------|--------|--------|
| 2026-06-22 | `d032ed6a fix(ports): renumber 18 services` | 11 port conflicts → 0 |
| 2026-06-22 | `26af7eac chore(security+ready)` | helmet+CORS+/ready across 22 services |
| 2026-06-22 | `bd4b2d11 fix(goal-os): publish-logging` | eventBus failures now surface |
| 2026-06-22 | `e8b529d5 fix(smoke-test): per-service health_path` | ai-intelligence now checks correctly |
| 2026-06-22 | `2f5bd870 feat(sutar-supplier-registry)` | New service |
| 2026-06-22 | `34a03e76 feat(sutar-logistics)` | New service + supplier force-reseed |
| 2026-06-22 | `9c9b6ded docs+feat(sutar)` | Phase B CLAUDE.md + logistics wiring |

---

## 13. The Honest Assessment

**What HOJAI AI is:**
- A real, working platform with 185 services that mostly pass production-readiness bar (auth, helmet, CORS, graceful shutdown, /health, /ready, requireEnv, env validation)
- 247K LOC across TypeScript and JavaScript
- Strong shared library (`@rtmn/shared`) enforcing consistent patterns
- Real TwinOS, real SUTAR OS, real Memory Layer — not vaporware
- Recent commits show actual hardening work

**What HOJAI AI isn't:**
- 100% production-ready. Key gaps in `document-intelligence` (imports without using), 132 services without rate-limit, 162 without Dockerfile.
- A small handful of services account for most of the production-readiness coverage; many edge-case product services lag.
- No CI visible — all testing is manual.

**The number to remember:** **53/185 services have direct rate-limit, 28 more via `setupSecurity` = 81/185 (43.8%) with rate-limit protection**. The other 103 are behind the Hub but still have unprotected HTTP endpoints.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
