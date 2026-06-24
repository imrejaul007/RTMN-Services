# RESUME INSTRUCTIONS - How to Continue the RTMN Autonomous Economy Plan

> **Purpose:** Quick-start guide for continuing work in a new chat session.
> **Created:** 2026-06-23
> **Status:** Planning complete. Execution in progress.

---

## The Plan (One Sentence)

**HOJAI is the Operating System for AI-Native Companies. Global Nexha is the Internet for Autonomous Businesses. BAM is the App Store. REZ is the economic layer. AgentFin is the financial OS. Together they form the infrastructure for the autonomous economy.**

## Files to Read FIRST (in priority order)

1. **`.claude/plans/40-phase-vs-6-phase-reconciliation.md`** - THE MASTER ROADMAP (7 phases, full mapping)
2. `.claude/plans/global-nexha-development-plan.md` - 18-month Phase D-I roadmap
3. `.claude/plans/hojai-platform-architecture-v2.md` - Blueprint + Compiler + Diff + Evolution
4. `.claude/plans/duplicate-prevention-audit.md` - 200+ services already built, do not duplicate
5. `.claude/plans/built-vs-needed-audit.md` - 75% built, 15-20% gap (the real work)
6. `.claude/plans/bam-complete-spec.md` - 35+ BAM categories
7. `.claude/plans/hojai-widget-spec.md` - Billion-dollar distribution channel

## All 22 Strategic Planning Docs (by tier)

### Tier 1: Core Roadmap (5 files)
- `40-phase-vs-6-phase-reconciliation.md` - THE MASTER ROADMAP
- `global-nexha-development-plan.md` - 18-month Phase D-I
- `global-nexha-addendum.md` - All spec gaps
- `hojai-platform-architecture-v2.md` - Blueprint + Compiler
- `hojai-platform-as-an-economy-5year-plan.md` - 5-year vision

### Tier 2: Component Specs (10 files)
- `hojai-developer-platform-spec.md` - 7 SDKs + CLI
- `hojai-widget-spec.md` - HOJAI Widget
- `developer-platform-gaps.md` - 12 developer platform pieces
- `bam-complete-spec.md` - 35+ BAM categories
- `phase3-startup-developer-plan.md` - HOJAI Studio for founders
- `rez-intelligence-local-economy.md` - REZ Intel + Local Nexha
- `blr-ai-marketplace-role.md` - BAM's role
- `skillos-usage.md` - SkillOS
- `strategic-moat-acp-positioning.md` - 5-layer moat + ACP
- `sample-marketplace-hojai-ai.md` - Sample hojai.ai.md

### Tier 3: Business + Audit (5 files)
- `d2c-agentic-commerce-model.md` - DO + REZ + ACS
- `agentic-marketing-playbook.md` - Marketing channels
- `built-vs-needed-audit.md` - 75% built, 15-20% gap
- `duplicate-prevention-audit.md` - What NOT to build
- `blr-marketplace-agent-inventory.md` - 1200+ items

### Tier 4: Investor + Samples (2 files)
- `hojai-investor-pitch-deck.md` - HOJAI pitch ($28M)
- `nexha-investor-pitch-deck.md` - Nexha pitch ($50M)

## The 7 Phases (Master Roadmap)

```
Phase 0: Internal Foundation (15 weeks, parallel with D) - HOJAI AI production-ready
Phase D: Network Foundation (M1-3)
Phase E: Reputation Flywheel (M4-6)
Phase F: Opportunity Engine (M7-9)
Phase G: Federation at Scale (M10-12)
Phase H: AIO Industry (M13-15)
Phase I: Autonomous Economy (M16-18)
```

See `40-phase-vs-6-phase-reconciliation.md` for the complete task-to-phase mapping.

## State of Work (as of 2026-06-24)

**Last commit:** see `git log --oneline -1` (in `companies/HOJAI-AI/`, branch `feat/killer-30min-demo`) — v1.1 real remote deploy

**Done (2026-06-23/24):**
- 22 strategic planning docs in `.claude/plans/` (all committed, all pushed to origin)
- REZ Intelligence Integration service (port 5370) - BUILT
- merchant-agents (port 4737) - WIRES to REZ Intelligence with 6 new endpoints, 10 tests passing
- REZ Intelligence wired into 9 foundation SUTAR services (closes loop)
- @hojai/reputation v1.0.0 SDK shipped
- HOJAI Widget backend wired to real SUTAR agents
- ✅ **REZ Intelligence wired into all 30+ HOJAI services** (item #2) **DONE 2026-06-25**:
  - **Dual-client architecture** at `@rtmn/shared/intel/dual-client` — tries **HOJAI Intelligence (port 4881) FIRST** (per user correction: "HOJAI is for non-REZ clients, REZ is for REZ ecosystem clients"), falls back to **REZ-Intel (port 5370)** for business predictions (churn, LTV, revenue, demand, pricing, merchant insights)
  - `INTEL_MODE=hojai|rez|dual` env var controls routing (default `dual`)
  - **`@rtmn/shared/intel/dual-client`** ships as both CJS (`.cjs`) and ESM (`.js`) + `.d.ts` for TS consumers — handles ESM/CJS coexistence in `shared/package.json` (which is `"type": "module"`)
  - **Shared test helper** at `@rtmn/shared/test/rez-intel-helpers.cjs` — 16 standard dual-client tests (mode dispatch, fallback chain, error handling, timeout, network failures, health checks per backend). Used by every service.
  - **7 copilots** wired (sales, support, finance, marketing, agent, business, executive) with 3-4 deep REZ-Intel-backed endpoints each (insights, forecast, next-best-action, churn-risk, ltv, pricing, recommend-pricing, classify-intent) — **112 tests, 0 failures** (16 × 7)
  - **18 CJS SUTAR shallow services** wired (acn-hub, acn-integration, acn-network, acp-protocol, agent-analytics, agent-contracts, agent-learning, agent-marketplace, agent-orchestration, agent-teaming, negotiation-ai, sutar-contracts, sutar-agent-id, sutar-agent-network, sutar-gateway, sutar-identity, sutar-memory-bridge, sutar-monitoring) with 2 endpoints each (`/api/intel/classify-intent`, `/api/intel/next-best-action`) — **270 tests, 0 failures** (15 × 18)
  - **1 ESM SUTAR service** (agent-twin) wired — was previously broken (CJS `module.exports` in ESM package); now uses ESM `dual-client.js` mirror — **9 tests, 0 failures**
  - **5 TypeScript SUTAR services** migrated to dual-client (sutar-decision-engine, sutar-trust-engine, sutar-contract-os, sutar-negotiation-engine, sutar-economy-os) — uses `import dual from '@rtmn/shared/intel/dual-client'` with `.d.ts` type declarations
  - **negotiation-ai** wired (had `rez-intel-client.js` file but it was never imported — now it is)
  - **Total: 391 new tests, 0 failures** across 31 services (7 copilots + 18 CJS SUTAR + 1 ESM SUTAR + 5 TS SUTAR using existing tests)
- ✅ **HOJAI Foundry v1.0 shipped** — 30-min killer demo (item #1 below) **DONE**:
  - `npx hojai create` + `npx hojai deploy` (local + preview + remote-stub) + `npx hojai add agent` + `npx hojai add integration`
  - 9 starter templates (marketplace, b2b, company, hotel, restaurant, logistics, crm, erp, pos)
  - **BaseAgent runtime** baked into every starter — local mode by default, remote mode via `HOJAI_SUTAR_URL` (forwards to SUTAR merchant-agents service)
  - 7-agent company starter has real strategies (CEO keyword routing, CXO KPIs, Finance double-entry, etc.)
  - **48 tests, 0 failures** (36 CLI + 12 company starter)
  - Lives at: `companies/HOJAI-AI/foundry/` on branch `feat/killer-30min-demo` in `imrejaul007/hojai-ai` repo
- ✅ **HOJAI Foundry v1.1 shipped** — real remote deploy (item #7 below) **DONE**:
  - **`hojai-cloud` service** at `companies/HOJAI-AI/products/hojai-cloud/` (port 4380)
  - Receives `npx hojai deploy --mode=remote`, provisions a per-tenant runtime on a free port, returns the public URL
  - Persistent storage at `STORAGE_DIR/<projectId>/` (re-deploys reuse port + projectId)
  - Bearer auth via `HOJAI_API_KEY` (disable with `HOJAI_CLOUD_REQUIRE_AUTH=false` for dev)
  - Wildcard route `/api/v1/route/:subdomain/*` for nginx/Caddy → hojai-cloud
  - **16 tests, 0 failures** (health, deploy happy + re-deploy, list/get/delete, auth, helpers)
  - **`npx hojai deploy --mode=remote`** wired to POST to `HOJAI_CLOUD_URL` when set, falls back to v1.0 stub otherwise
  - **5 new deploy tests** (mocked fetch: happy path, trailing-slash, 503 error, network error, no-key)
  - **Total: 69 tests, 0 failures** (41 foundry + 12 company + 16 hojai-cloud)
- Phase 0 planned (LLM billing, observability, eval pipeline - 40-phase #1-10)
- Master 40-phase vs 6-phase reconciliation complete

**Not yet done (priority order):**
1. ~~Build the 30-minute killer demo~~ ✅ **DONE 2026-06-24** (v0.5 → v1.0)
2. ~~Wire REZ Intelligence into OTHER SUTAR agents (sales, support, procurement, finance)~~ ✅ **DONE 2026-06-25** — dual-client (HOJAI + REZ), 31 services wired, 391 new tests
3. Build @hojai/foundation SDK v1 (2-3 weeks) - the foundation
4. Build HOJAI Widget MVP (8-12 weeks) - billion-dollar distribution
5. Build nexha-autonomous-logistics (8 weeks) - fills KHAIRMOVE gap
6. Build the 16 AI Employees (6 weeks) - the killer BAM category
7. ~~v1.1: real remote deploy (push to `*.hojai.app` hosting)~~ ✅ **DONE 2026-06-24**

## Quick Status Check Commands

```bash
# Branch and recent commits
git branch --show-current && git log --oneline -5

# Uncommitted changes
git status --short

# REZ Intel service (port 5370)
curl -s http://localhost:5370/api/v1/health

# merchant-agents (port 4737)
curl -s http://localhost:4737/info

# Run tests
cd companies/HOJAI-AI/sutar-os/agents/merchant-agents
node --test src/__tests__/rez-intel-client.test.js

# Run dual-client test for ANY service (31 services use shared helper)
cd companies/HOJAI-AI/products/copilots/sales-copilot
node --test src/__tests__/rez-intel-client.test.js
```

## How to Resume Work in a New Chat

### Option A: Quick Status Check

Use this prompt to get a status report:

```
Read these files and give me a status report:
- .claude/plans/40-phase-vs-6-phase-reconciliation.md
- .claude/plans/RESUME-INSTRUCTIONS.md
- Run: git log --oneline -10
- Run: git status
- Run: curl -s http://localhost:5370/api/v1/health
- Run: curl -s http://localhost:4737/info

Tell me:
1. What branch and last commit
2. What has been built vs what has not
3. Highest-leverage next step
4. Any blockers
```

### Option B: Continue Specific Work

Use this prompt:

```
I am working on the RTMN Autonomous Economy Plan. Planning is complete.

FIRST: Read these files in order:
1. .claude/plans/40-phase-vs-6-phase-reconciliation.md (master roadmap)
2. .claude/plans/built-vs-needed-audit.md (what is built)
3. .claude/plans/duplicate-prevention-audit.md (what NOT to build)

CURRENT STATE:
- Branch: feat/skill-os-app-store-parent
- Last commit: 9aa20878d (REZ Intel wired into merchant-agents)
- REZ Intelligence Integration service: BUILT at port 5370
- merchant-agents: WIRED with 10 tests passing

WHAT I WANT TO DO NOW:
[YOUR TASK HERE]

RULES:
- Do not re-plan, the plan is complete
- Read relevant docs before building
- Verify against duplicate-prevention audit
- Use Blueprint Engine + HOJAI Foundation SDK patterns
- Commit to git after each step
```

### Option C: Start a New Phase

```
I am starting Phase [D/E/F/G/H/I] of the RTMN Autonomous Economy Plan.

FIRST: Read these files in order:
1. .claude/plans/40-phase-vs-6-phase-reconciliation.md (master roadmap)
2. .claude/plans/built-vs-needed-audit.md

THEN: Start with [SPECIFIC TASK] in Phase [X].
```

## Code Locations (where things actually live)

| Path | What | Status |
|---|---|---|
| `companies/HOJAI-AI/` | HOJAI AI products (17+ products, 200+ services) | Built |
| `companies/Nexha/services/` | Nexha network services (19 services) | Built |
| `companies/RABTUL-Technologies/` | 200+ REZ services + AgentFin (15 services) | Built |
| `companies/HOJAI-AI/blr-ai-marketplace/` | BAM (8 backend services, 1200+ items) | Built |
| `companies/RABTUL-Technologies/rez-intelligence-integration/` | REZ Intel Integration (port 5370) | Built |
| `companies/HOJAI-AI/sutar-os/agents/merchant-agents/` | First REZ-Intelligence-wired SUTAR agent | Built |

## The Master Tagline

> HOJAI is the Operating System for AI-Native Companies. Global Nexha is the Internet for Autonomous Businesses. BAM is the App Store. REZ is the economic layer. AgentFin is the financial OS. Together they form the infrastructure for the autonomous economy.

## Common Pitfalls to Avoid

1. **Do not re-plan** - The plan is complete in the docs. Just execute.
2. **Do not build what is already built** - 200+ services exist. Read the duplicate-prevention audit.
3. **Do not skip tests** - Every new service needs tests from day 1.
4. **Do not commit half-done work** - Commit at logical milestones.
5. **Do not lose context** - Read the relevant planning doc before starting a task.
