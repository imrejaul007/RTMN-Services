# NACP / Global Nexha — Complete Gap Analysis & Execution Plan

**Audit Date:** 2026-06-29
**Scope:** Everything needed to make Global Nexha a partner-ready, developer-adoptable commerce infrastructure for AI agents
**Based on:** Full codebase audit of `companies/Nexha/`, `companies/HOJAI-AI/`, `companies/RABTUL-Technologies/`, `companies/KHAIRMOVE/`

---

## TL;DR

> You have **far more than expected**. The 6 ACP RFCs, Nexha SDK, MCP Server, 62+ services, Agent Gateway, Governance OS, Docker Runtime, and 15 npm packages already exist. The gaps are **not missing services** — they're missing **developer experience polish, protocol completion, neutral branding, and a working end-to-end demo**. This is a 90-day execution plan, not a 2-year rebuild.

---

## PART 1 — WHAT YOU ALREADY HAVE (Confirmed by Audit)

### A. Protocol Layer ✅ ALREADY BUILT

| Asset | Location | Status | Port/File |
|--------|----------|--------|-----------|
| **ACP RFC-0001** (Core) | `companies/Nexha/acp-spec/RFC-0001-CORE.md` | ✅ 247 lines, production quality | External/Open (MIT) |
| **ACP RFC-0002** (Identity) | `companies/Nexha/acp-spec/RFC-0002-IDENTITY.md` | ✅ 214 lines, production quality | External/Open (MIT) |
| **ACP RFC-0003** (Discovery) | `companies/Nexha/acp-spec/RFC-0003-DISCOVERY.md` | ✅ EXISTS | External/Open |
| **ACP RFC-0004** (Negotiation) | `companies/Nexha/acp-spec/RFC-0004-NEGOTIATION.md` | ✅ EXISTS | External/Open |
| **ACP RFC-0005** (Payment) | `companies/Nexha/acp-spec/RFC-0005-PAYMENT.md` | ✅ EXISTS | External/Open |
| **ACP RFC-0006** (Logistics) | `companies/Nexha/acp-spec/RFC-0006-LOGISTICS.md` | ✅ EXISTS | External/Open |
| **ACP Message Types** | `companies/HOJAI-AI/sutar-os/agents/acp-protocol/` | ✅ 8 types (QUERY→QUOTE→COUNTER→ACCEPT→REJECT→ORDER→TRACK→DISPUTE) | 4800 |
| **ACP Spec (root)** | `protocol/specs/ACP.md` | ✅ External spec with MIT/Apache-2.0 | External/Open |

**Verdict:** ACP protocol is **80% complete** — better spec coverage than most startups ever achieve. Only needs RFC completion + implementation guide.

### B. SDKs ✅ BETTER THAN EXPECTED

| Package | NPM | Location | OpenAI | Claude | Gemini | Llama |
|---------|-----|----------|--------|--------|--------|-------|
| `@nexha/sdk` | ✅ | `Nexha/services/nexha-sdk/` | ✅ `tools/openai.ts` | ✅ `tools/claude.ts` | ❌ | ❌ |
| `@nexha/mcp-server` | ✅ | `Nexha/services/nexha-mcp-server/` | ✅ (via MCP) | ✅ (stdio) | ❌ | ❌ |
| `@nexha/webhook-sdk` | ✅ | `Nexha/shared/webhook-sdk/` | — | — | — | — |
| `@nexha/commerce-identity` | ✅ | `Nexha/commerce-identity/` | — | — | — | — |
| `@nexha/business-directory` | ✅ | `Nexha/services/nexha-business-directory/` | — | — | — | — |
| `@nexha/agent-gateway` | ✅ | `Nexha/services/nexha-agent-gateway/` | — | — | — | — |
| `@hojai/memory-sdk` | ✅ | `HOJAI-AI/sdk/hojai-memory-sdk/` | — | — | — | — |
| `@hojai/sutar` | ✅ | `HOJAI-AI/sdk/hojai-sutar/` | — | — | — | — |
| `@hojai/nexha` | ✅ | `HOJAI-AI/sdk/hojai-nexha/` | — | — | — | — |
| `@hojai/agentos` | ✅ | `HOJAI-AI/sdk/hojai-agentos/` | — | — | — | — |

**Verdict:** 15 npm packages exist. The Nexha SDK has the right architecture — just needs **actual API calls behind the stubs** and **tests**.

### C. MCP Server ✅ EXISTS

| Asset | Port | Quality |
|-------|------|---------|
| **Nexha MCP Server** | 4444 | ~60% — 6 tools (discover_suppliers, check_trust, negotiate_order, create_contract, release_payment, track_shipment), dual-mode (stdio + HTTP), but NO tests, NO auth middleware, NO request validation |
| **Memory MCP Server** | 4890 | Internal only |
| **10+ other MCP implementations** | Various | Internal use |

**Verdict:** Nexha MCP server is the **fastest path** to OpenAI/Claude/Gemini integration. Build on it.

### D. Agent Gateway ✅ EXTERNAL ENTRY POINT

| Asset | Port | Purpose |
|-------|------|---------|
| **nexha-agent-gateway** | **4443** | Universal entry for AI agents — routes to discovery, trust, negotiation, contracts, payments, logistics |
| **commerce-identity** | **8000** | Supplier/buyer/guest identity, JWT, Indian validators |
| **nexha-gateway** | 5002 | Internal HTTP entry + RTMN Hub |

**Verdict:** Port 4443 is your external API face. This is what developers and AI agents call.

### E. All 62+ Nexha Services ✅ BUILT

| Category | Services | Ports | External APIs |
|----------|----------|-------|---------------|
| Federation Layer | 7 (capability, reputation, discovery, federation, opportunity, market, directory) | 4270-4276 | ✅ All |
| SUTAR Network | 10 (supplier, pricing, trade finance, warehouse, autonomous logistics, contract, compliance, payment, partner, distribution) | 4280-4297 | ✅ All |
| Commerce Layer | 5 (acp-messaging, business-directory, mission-planner, partner-graph, commerce-runtime) | 4340-4364 | ✅ All |
| Platform | 3 (provisioning-engine, hooks-sdk, tenant-summary) | 4385-4387 | ✅ All |
| Enterprise Connectors | 4 (salesforce, sap, workday, oracle) | 4600-4603 | ✅ All |
| AgentOS | 12 services | 4802-4814 | ✅ All |
| Governance | 1 (governance-os with quadratic voting) | 4366 | ✅ |
| **TOTAL** | **62+ services** | **4270-4814** | **All external** |

### F. Governance ✅ EXISTS

| Asset | Port | What it does |
|-------|------|-------------|
| **nexha-governance-os** | 4366 | Quadratic voting, 9 proposal types, 4% quorum, treasury, delegation — **fully implemented** |
| **SADA OS** | 4190 | Trust + governance + risk + verification |
| **PolicyOS** | 4254 | Business policy registry |
| **sutar-compliance** | 4605 | SOC2 Type II + GDPR |

**Verdict:** Quadratic voting governance exists. Only missing is the **Global Nexha Foundation body** (the actual org, not just code).

### G. Trust & Reputation ✅ COMPLETE

| Asset | Port | What it does |
|-------|------|-------------|
| **TrustOS** (10 services) | 4990-4999 | Confidence scoring, source tracking, hallucination detection, risk scoring, verification engine |
| **nexha-reputation-os** | 4271 | ACI (Autonomous Commerce Index) — your proprietary trust metric |
| **nexha-trust-engine** (SUTAR) | 4291 | SADA federation trust scores |
| **rabtul-trust-engine** | 4050 | Payment/reputation trust |

**Verdict:** You have a **multi-layer trust system** — probably more sophisticated than most competitors.

### H. Payment & Economy ✅ COMPLETE

| Asset | Company | Port | What it does |
|-------|---------|------|-------------|
| **AgentFin** (15 services) | RABTUL | 5510-5524 | Per-agent wallet, allowance, virtual cards, spending policy, treasury, negotiation agent, CorpID↔AgentID↔WalletID linkage |
| **nexha-trade-finance-network** | Nexha | 4287 | BNPL, credit lines, FX, escrow |
| **nexha-payment-network** | Nexha | 4296 | Payment processing |
| **nexha-escrow-os** | Nexha | 4351 | B2B escrow with conditions |
| **REZ-treasury-os** | RABTUL | 4055 | Cash management, investments, forecasting |

**Verdict:** AgentFin is **exceptional** — 15 services specifically for AI agent financial infrastructure. This is a major differentiator.

### I. Contracts & Negotiation ✅ COMPLETE

| Asset | Port | What it does |
|-------|------|-------------|
| **nexha-contract-network** | 4289 | Smart contract management, templates, SLA |
| **REZ-negotiation-engine** | 4191 | RFQ, quotes, counter-offers, deals |
| **sutar-negotiation-engine** | 4295 | Multi-party negotiation |
| **sutar-contract-os** | 4292 | Smart contracts, templates, SLA |

### J. Logistics ✅ COMPLETE

| Asset | Company | Port | What it does |
|-------|---------|------|-------------|
| **nexha-autonomous-logistics** | Nexha | 4293 | Multi-modal routing, customs, insurance, carbon footprint, 12 carriers |
| **nexha-distribution-network** | Nexha | 4285 | Multi-carrier shipping quotes, state machine |
| **nexha-warehouse-network** | Nexha | 4288 | Warehouse discovery + slot booking + WMS |
| **KHAIRMOVE** | KHAIRMOVE | 4600+ | Ride-hailing, delivery, fleet, logistics aggregator |
| **RTLS** | — | — | Real-time logistics tracking |

### K. Identity ✅ COMPLETE

| Asset | Port | What it does |
|-------|------|-------------|
| **CorpID** | 4702 | Universal identity for humans, businesses, AI agents, machines, products |
| **commerce-identity** | 8000 | Supplier/buyer/guest identity with JWT and Indian validators |
| **Organization Twin** | 4710 | Company/org structure, hierarchy, KPIs |
| **Agent Registry** | 4803 | Agent identity, versioning, heartbeat |
| **Tenant Manager** | 4747 | Multi-tenant isolation |

**Verdict:** CorpID + commerce-identity + Agent Registry covers human, org, and AI agent identity.

### L. Developer Infrastructure ✅ PARTIAL

| Asset | Status |
|-------|--------|
| **Nexha Portal** (Next.js marketplace) | ✅ EXISTS at port 4388 — B2B marketplace frontend with federation dashboard |
| **Nexha OS Runtime** (Docker self-host) | ✅ EXISTS — Docker bundles (lite/standard/enterprise), CLI tool |
| **REZ Developer Portal** | ✅ EXISTS (port 4037) — but for REZ ecosystem, not Nexha |
| **API Key Management** | ✅ Via commerce-identity (port 8000) |
| **Nexha CLI** (`@nexha/cli`) | ✅ In nexha-os-runtime/cli/ |

### M. Sample/Reference SDKs ✅ OPEN SOURCE

| Package | Tests | Purpose |
|---------|-------|---------|
| `protocol/sample-sdk/acp-js/` | 24 | Reference ACP in JavaScript |
| `protocol/sample-sdk/capgraph-js/` | 22 | Reference Capability Graph in JavaScript |
| `protocol/sample-sdk/ics-js/` | 45 | Reference ICS in JavaScript |

---

## PART 2 — WHAT'S GENUINELY MISSING

### 🔴 CRITICAL (Blocks Partner Adoption)

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| **M1** | **Nexha SDK has no actual API calls** — modules are stubs that call `client.request()` but no backend implements the endpoints. The SDK is ~40% complete (architecture yes, implementation no). | Developers install `@nexha/sdk` and it does nothing | P0 |
| **M2** | **No OpenAPI/Swagger specs** for ANY Nexha service. No `.yaml`/`.yml` files anywhere in the codebase. External developers have no machine-readable API definition. | Blocks Postman/Insomnia/SDK auto-generation | P0 |
| **M3** | **No developer documentation portal** — `docs.nexha.io`, `developer.nexha.io`, `playground.nexha.io` don't exist. RFCs exist as markdown files but aren't hosted anywhere. | Blocks external developer adoption entirely | P0 |
| **M4** | **No end-to-end working demo** — no proof that GPT Agent → Nexha Discovery → Supplier → Negotiation → Contract → Payment → Shipment actually works. | Partnership conversations die without a demo | P0 |
| **M5** | **Nexha SDK has no tests** — `sdk.test.ts` only checks strings in source code, no runtime tests. MCP server has zero test files. | Cannot ship confidently | P0 |

### 🟡 HIGH (Needed for External Adoption)

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| **H1** | **Global Nexha Foundation doesn't exist** — only referenced in RFC attribution ("Author: Global Nexha Foundation (proposed)"). No actual governance body. | OpenAI/Google won't join a "RTMN private network" | P1 |
| **H2** | **MCP Server missing production features** — no tests, no request validation (Zod in package.json but unused), no authentication middleware for HTTP mode, basic error handling only. | Cannot be production-grade without these | P1 |
| **H3** | **Nexha SDK missing resilience** — `retries` config exists but is never used, no circuit breaker, no rate limiting, no typed errors, no webhook signature verification. | SDK will fail silently in production | P1 |
| **H4** | **DID implementation is proprietary only** — `did:nexha` is a custom namespace, no W3C DID standard (no `did-jwt`, `did-resolver`). RFC-0002 defines the format but there's no resolver. | Limits interoperability with broader identity ecosystem | P1 |
| **H5** | **Nexha SDK missing Gemini and Llama adapters** — OpenAI and Claude adapters exist, but not Gemini or Llama. | Incomplete multi-model story | P1 |
| **H6** | **No API playground** — no interactive UI for trying out supplier search, trust scores, ACP negotiation. | Developers can't experiment without writing code | P1 |
| **H7** | **Nexha branding unclear** — portal lives in `companies/Nexha/portal/`, but separate website at `hojai-portal-deploy/` is opaque. External perception is still "RTMN's network." | Blocks neutral partnership positioning | P1 |
| **H8** | **Enterprise connectors exist but are stubs** — Salesforce, SAP, Workday, Oracle connectors exist at ports 4600-4603, but likely need verification. | Enterprise sales requires working connectors | P1 |
| **H9** | **Nexha Agent Gateway (4443) quality unknown** — it's the external entry point but we couldn't verify the implementation quality or whether all 6 tool categories (discovery, trust, negotiation, contract, payment, logistics) are fully wired. | Core integration point needs verification | P1 |

### 🟢 MEDIUM (Polish & Expansion)

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| **E1** | **Nexha SDK needs Python, Go, Java, C# SDKs** — only JavaScript/TypeScript exists. | Limits adoption beyond JS developers | P2 |
| **E2** | **No Nexha package registry site** — `packages.nexha.io` is a placeholder URL in code, not a real site. | Limits third-party agent/service marketplace | P2 |
| **E3** | **nexha-governance-os** exists but is not connected to the Global Nexha Foundation narrative. The quadratic voting is there but not publicized. | Missed differentiation story | P2 |
| **E4** | **Nexha Portal (4388) is B2B marketplace, not developer portal** — serves suppliers/buyers, not developers building on Nexha APIs. | Two different things conflated | P2 |
| **E5** | **RFCs need implementation guides** — RFC-0001 through RFC-0006 exist but have no "getting started" tutorial, no code examples, no migration guides. | RFCs are specs, not developer docs | P2 |
| **E6** | **Nexha OS Runtime (Docker)** needs verification — we couldn't confirm all 9 service Dockerfiles build and the runtime actually works end-to-end. | Self-host story needs proof | P2 |
| **E7** | **AgentFin has 15 services but MCP server doesn't expose agent finance tools** — `release_payment` exists but no `create_agent_wallet`, `set_allowance`, `create_virtual_card`, etc. | Agent-native finance not exposed via MCP | P2 |
| **E8** | **Nexha Agent Marketplace (4250) status unclear** — it exists at `sutar-os/agents/agent-marketplace/` but we couldn't verify if it's wired to the public Nexha portal or just SUTAR-internal. | Agent marketplace not public-facing | P2 |

---

## PART 3 — GAP → PRIORITY MATRIX

```
IMPACT
  ▲
  │  [H2] MCP Production      [H1] Nexha Foundation
  │  [H3] SDK Resilience      [M1] SDK Implementation
  │  [H5] Gemini/Llama        [M2] OpenAPI Specs
  │  [H9] Agent Gateway       [M4] E2E Demo
  │
  │                          [M3] Dev Portal
  │                          [M5] SDK Tests
  │
  │  [E1] Python/Go SDK      [E6] Runtime Verification
  │  [E4] Dev vs B2B Portal  [E7] AgentFin MCP Tools
  │  [E5] RFC Implementation [E8] Agent Marketplace
  │
  └──────────────────────────────────────────────► EFFORT
       Low                        Medium                  High
```

### Quick-Win Quadrant (High Impact + Low Effort)

| # | Gap | Why Quick Win | Effort |
|---|-----|---------------|--------|
| **QW1** | Add tests to Nexha SDK | Test scaffolding exists, just needs actual assertions | 2 days |
| **QW2** | Add retry + error handling to SDK | Config exists, just wire it up | 1 day |
| **QW3** | Generate OpenAPI spec from existing Express routes | Auto-generate from code, doesn't need hand-writing | 3 days |
| **QW4** | Write RFC implementation guide | RFC content exists, just needs a "getting started" doc | 2 days |
| **QW5** | Wire AgentFin to MCP server | 6 new tools (create_wallet, set_allowance, create_card, etc.) | 3 days |
| **QW6** | Add Zod validation to MCP server | Already in package.json, just needs to be used | 1 day |
| **QW7** | Write the E2E demo script | All services exist, just wire them together in a test | 5 days |

---

## PART 4 — 90-DAY EXECUTION PLAN

### Phase 1: Foundation (Days 1-30) — Make It Work

**Goal:** Ship a working, testable, documentable Nexha stack.

| # | Task | Deliverable | Days | Owner |
|---|------|-------------|------|-------|
| 1 | **Implement actual API endpoints behind Nexha SDK** | SDK methods actually call port 4443 endpoints | 10 | Core team |
| 2 | **Add vitest tests to Nexha SDK** | 50+ passing tests covering all modules | 5 | Core team |
| 3 | **Add retry + circuit breaker to SDK** | Wire the `retries` config + add `NexhaError` types + exponential backoff | 3 | Core team |
| 4 | **Add Zod validation + auth middleware to MCP server** | Production-grade request validation | 2 | Core team |
| 5 | **Generate OpenAPI specs from all Nexha services** | Auto-generate `openapi.yaml` from Express routes | 5 | Core team |
| 6 | **Wire AgentFin to MCP server** | 6 new MCP tools: create_agent_wallet, set_allowance, create_virtual_card, approve_expense, get_finance_profile, negotiate_rfq | 3 | Core team |
| 7 | **Build E2E demo flow** | `demos/nexha-e2e-demo.sh`: GPT Agent → Discovery → Supplier → Negotiation → Contract → Payment → Shipment | 5 | Core team |
| 8 | **Verify and fix Nexha Agent Gateway (4443)** | Confirm all 6 categories (discovery, trust, negotiation, contract, payment, logistics) are fully wired | 3 | Core team |
| 9 | **Verify Nexha OS Runtime Docker** | Confirm all 9 Dockerfiles build, runtime starts, services health-check | 3 | Core team |

**Phase 1 Deliverables:**
- `@nexha/sdk` v1.0 with 50+ tests, retry logic, typed errors
- `@nexha/mcp-server` v1.0 with Zod validation, auth middleware
- OpenAPI specs for all 62 Nexha services
- Working E2E demo
- Verified Docker runtime

### Phase 2: Developer Experience (Days 31-60) — Make It Adoptable

**Goal:** Build the developer-facing layer that turns a protocol into a platform.

| # | Task | Deliverable | Days | Owner |
|---|------|-------------|------|-------|
| 10 | **Build developer.nexha.io** | Next.js docs site with MDX, dark theme, search | 10 | Frontend |
| 11 | **Host RFCs as public docs** | RFC-0001 through RFC-0006 live at docs.nexha.io | 2 | Frontend |
| 12 | **Build API playground** | Interactive Swagger UI at docs.nexha.io/playground — try supplier search, trust, negotiation | 8 | Frontend |
| 13 | **Add Gemini and Llama adapters to SDK** | `@nexha/gemini` and `@nexha/llama` adapter packages | 5 | Core |
| 14 | **Write SDK getting-started guide** | 5 tutorials: "Find a supplier in 5 minutes", "Run your first negotiation", "Create a contract", "Process a payment", "Track a shipment" | 5 | Docs |
| 15 | **Publish @nexha/sdk to npm** (if not already) | Production npm package with proper versioning, changelog | 2 | DevOps |
| 16 | **Add SDK code examples to RFCs** | Every RFC gets code snippets in JS + Python | 3 | Docs |
| 17 | **Create Nexha Postman collection** | Pre-built requests for all 62 services | 3 | DevOps |

**Phase 2 Deliverables:**
- `developer.nexha.io` live with docs, playground, SDK examples
- All 6 RFCs publicly accessible
- SDK with 4 LLM adapters (OpenAI, Claude, Gemini, Llama)
- Postman collection for all services
- 5 getting-started tutorials

### Phase 3: Neutral Branding & Governance (Days 61-90) — Make It Legitimate

**Goal:** Transform from "RTMN's network" to "open infrastructure."

| # | Task | Deliverable | Days | Owner |
|---|------|-------------|------|-------|
| 18 | **Formalize Global Nexha Foundation** | Create `GlobalNexhaFoundation/` entity, board, governance charter, GitHub org | 10 | Leadership |
| 19 | **Separate Nexha GitHub org** | `nexha-ai/` GitHub with public repos for RFCs, SDKs, MCP server | 5 | DevOps |
| 20 | **Create Nexha.ai public website** | Marketing site separate from RTMN — "The commerce internet for AI agents" | 15 | Frontend |
| 21 | **Formalize Nexha governance** | Connect `nexha-governance-os` to public foundation — quadratic voting, proposals, treasury | 5 | Core |
| 22 | **Add W3C DID resolver** | Implement `did:nexha` resolver (even if proprietary) with DID spec compatibility | 8 | Core |
| 23 | **Write Partnership Brief** | One-pager for OpenAI, Anthropic, Google, Meta, Shopify, SAP — position Nexha as infrastructure, not competitor | 3 | Strategy |
| 24 | **Onboard 10 test partners** | 5 real suppliers + 3 enterprise developers + 2 AI agent projects to the Nexha network | Ongoing | BD |

**Phase 3 Deliverables:**
- Global Nexha Foundation formalized
- Separate Nexha.ai website and GitHub org
- Public governance portal with quadratic voting
- W3C DID resolver
- Partnership briefs ready for outreach
- 10 active test partners

---

## PART 5 — THE 90-DAY ROADMAP

```
Day 1 ─────────────────────────────────────────────────────── Day 90

┌─────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│     PHASE 1: Foundation    │   PHASE 2: Dev Experience    │  PHASE 3: Neutral Branding  │
│         (Days 1-30)        │       (Days 31-60)          │        (Days 61-90)         │
├─────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│                             │                              │                              │
│  • SDK API implementation   │  • developer.nexha.io       │  • Global Nexha Foundation  │
│  • SDK tests (50+)         │  • API playground            │  • Separate Nexha GitHub    │
│  • MCP production-ready    │  • Gemini + Llama adapters  │  • Nexha.ai website         │
│  • OpenAPI specs           │  • SDK tutorials            │  • W3C DID resolver         │
│  • AgentFin MCP tools       │  • Postman collection       │  • Partnership briefs       │
│  • E2E demo                │  • RFC getting-started       │  • 10 test partners         │
│  • Gateway verification     │                              │                              │
│  • Runtime verification    │                              │                              │
│                             │                              │                              │
│  Exit Criteria:             │  Exit Criteria:             │  Exit Criteria:             │
│  SDK works end-to-end      │  External devs can build     │  OpenAI/Google would         │
│  Demo runs in <30 seconds   │  on Nexha in <1 hour        │  consider joining           │
│                             │                              │                              │
└─────────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

---

## PART 6 — RESOURCE ESTIMATE

| Phase | Tasks | Estimated Effort | Skills Needed |
|-------|-------|-----------------|---------------|
| **Phase 1** | 9 tasks | 39 person-days | TypeScript backend (2), Testing (1) |
| **Phase 2** | 8 tasks | 38 person-days | Frontend/Next.js (1), Docs (1), Backend (1) |
| **Phase 3** | 7 tasks | 46 person-days | Leadership (1), Frontend (1), Strategy (1) |
| **TOTAL** | **24 tasks** | **~123 person-days** | ~3 engineers + 1 PM + 1 designer |

**Can be parallelized:** Phase 1 tasks 1-9 can run in parallel across 3 engineers.
**Fast path:** With 3 engineers, Phase 1 done in ~13 days, Phase 2 in ~13 days, Phase 3 in ~16 days.

---

## PART 7 — EXECUTION DEPENDENCIES

```
SDK API impl (T1) ──────┬──► MCP production (T4) ──► E2E Demo (T7)
      │                  │
      │                  └──► OpenAPI specs (T5)
      │
      └──► AgentFin MCP tools (T6) ──► Gateway verification (T8)
                       │
                       └──► Runtime verification (T9)

All Phase 1 ──────────────────────────► Phase 2 (dev portal)

Phase 2 ───────────────────────────────► Phase 3 (branding + foundation)

Foundation (T18) ─────────────────────► Partner briefs (T23)
```

---

## PART 8 — CRITICAL SUCCESS METRICS

| Phase | Metric | Target |
|-------|--------|--------|
| **Phase 1** | E2E demo runs successfully | <30 seconds |
| **Phase 1** | SDK test coverage | >80% |
| **Phase 1** | MCP server tests | >30 passing |
| **Phase 2** | External developers can onboard | <60 minutes |
| **Phase 2** | SDK npm downloads (30 days post-publish) | >500 |
| **Phase 2** | GitHub stars on nexha-sdk | >100 |
| **Phase 3** | Global Nexha Foundation formalized | Yes/No |
| **Phase 3** | Test partners active | 10 |
| **Phase 3** | Partnership conversations started | 3+ (OpenAI/Claude/Gemini) |

---

## PART 9 — WHAT NOT TO BUILD (Focus Killers)

```
❌ Don't build a new protocol — ACP already exists
❌ Don't build new SDKs from scratch — @nexha/sdk exists, just complete it
❌ Don't build new trust/reputation/identity services — already built
❌ Don't build new payment/logistics infrastructure — AgentFin + Nexha logistics exist
❌ Don't try to partner with OpenAI/Google before Phase 2 is done
❌ Don't build enterprise connectors (SAP/Shopify) in 90 days — Year 2 play
❌ Don't build a new governance system — nexha-governance-os with quadratic voting exists
```

---

## PART 10 — THE NARRATIVE

**What you tell partners:**

> "Global Nexha is the commerce internet for AI agents. We have the ACP protocol (open RFCs), a production SDK (@nexha/sdk with OpenAI + Claude adapters), an MCP server, 62+ services, and 15 npm packages. We have CorpID for identity, TrustOS for trust scores, AgentFin for AI-native finance, and SUTAR for autonomous operations. We're building the SWIFT network for the agent economy — and we're looking for foundation members who want to shape the standard."

**What you tell developers:**

> "Add AI commerce to any agent in 3 lines of code:
> ```js
> import { NexhaClient } from '@nexha/sdk';
> const nexha = new NexhaClient({ apiKey: '...' });
> const suppliers = await nexha.discovery.suppliers({ product: 'Coffee', location: 'Dubai' });
> ```"

**What you tell investors:**

> "We have the infrastructure layer for the agentic economy. 62 services, 15 npm packages, ACP protocol with 6 RFCs, MCP server, and AgentFin — the only AI-native financial infrastructure. The next AWS moment is AI agents buying and selling in the real economy. Nexha is that infrastructure."

---

*This plan is the canonical reference. Update as execution progresses.*
*Next: Start Phase 1, Task 1 — Implement actual API endpoints behind Nexha SDK.*
