# ADR-0009 — Canonical Architecture: HOJAI = Intelligence, Nexha = Commerce Network

> **Date:** 2026-06-22
> **Status:** Accepted
> **Deciders:** RTMN architecture
> **Supersedes:** None (clarifies and extends ADR-0001 through ADR-0008)
> **Related:** [NEXHA-VS-SUTAR-ARCHITECTURE-AUDIT.md](../NEXHA-VS-SUTAR-ARCHITECTURE-AUDIT.md)

---

## Context

The RTMN ecosystem has grown to **80+ services across 5 git repos**. Over 4 prior architectural discussions (5 documents), a clear boundary has emerged:

| Company | What it builds | What it doesn't build |
|---|---|---|
| **HOJAI AI** | Intelligence infrastructure (memory, twins, AI agents, models) | Commerce networks, supplier registries, warehouses, logistics |
| **Nexha** | Commerce network (supplier discovery, warehouses, distribution, trade finance) | AI agents, memory, twins, intelligence |

But the **code currently violates this boundary**:

```
HOJAI-AI/sutar-os/core/
├── sutar-supplier-registry       ← network service, should be in Nexha
├── sutar-warehouse-network       ← network service, should be in Nexha
├── sutar-logistics               ← network service, should be in Nexha
├── sutar-trade-finance           ← network service, should be in Nexha
└── sutar-pricing-intelligence    ← network service, should be in Nexha
```

**5 services, ~160 tests, all in the wrong repo.** This ADR fixes that.

---

## Decision

We adopt the following canonical architecture across the entire ecosystem:

### Companies and their products

#### 🧠 HOJAI AI — Intelligence Infrastructure Company

> **"The AWS + OpenAI + Anthropic of your ecosystem."**

| Product | Purpose | Repo location |
|---|---|---|
| **CorpID** | Universal identity | `companies/HOJAI-AI/platform/identity/` |
| **MemoryOS** | Knowledge + working/long-term memory | `companies/HOJAI-AI/platform/memory/` |
| **TwinOS** | Digital twins (86+ twins) | `companies/HOJAI-AI/platform/twins/` |
| **SkillOS** | Capability registry | `companies/HOJAI-AI/platform/skills/skill-os/` |
| **PolicyOS** | Business rules | `companies/HOJAI-AI/platform/flow/policy-os/` |
| **GoalOS** | Goal decomposition | `companies/HOJAI-AI/platform/flow/goal-os/` |
| **FlowOS** | Multi-step orchestration | `companies/HOJAI-AI/platform/flow/flow-orchestrator/` |
| **Knowledge Graph** | RAG, embeddings | `companies/HOJAI-AI/platform/knowledge-graph/` |
| **TrustOS / SADA** | Reputation + dispute resolution | `companies/HOJAI-AI/platform/trust/sada-os/` |
| **SUTAR OS** | Per-company AI workforce runtime | `companies/HOJAI-AI/sutar-os/` |
| **Genie** | Consumer personal AI | `companies/HOJAI-AI/products/genie/` |
| **AI SDK** | TypeScript + Python SDKs | `companies/HOJAI-AI/sdk-typescript/`, `sdk-python/` |
| **AI Models** | LLM-backed agents | (TBD) |

#### 🌐 Nexha — Commerce Network Company

> **"The operating network that businesses connect to."**

| Product | Purpose | Repo location |
|---|---|---|
| **nexha-gateway** | Single front door for Nexha services | `companies/Nexha/services/nexha-gateway/` |
| **nexha-supplier-network** | Capability-matched supplier discovery | `companies/Nexha/services/nexha-supplier-network/` (moved from HOJAI) |
| **nexha-warehouse-network** | Warehouse discovery + slot booking + WMS | `companies/Nexha/services/nexha-warehouse-network/` (moved) |
| **nexha-distribution-network** | Multi-carrier shipping quotes | `companies/Nexha/services/nexha-distribution-network/` (moved) |
| **nexha-trade-finance-network** | Credit offers, loans, BNPL, FX | `companies/Nexha/services/nexha-trade-finance-network/` (moved) |
| **nexha-pricing-network** | Market price aggregation + dynamic pricing | `companies/Nexha/services/nexha-pricing-network/` (moved) |
| **nexha-business-directory** | Companies + capabilities + agents + trust | (Phase B, port 4360) |
| **nexha-agent-marketplace** | Cross-company agent rental | (Phase C, port 4361) |
| **nexha-mission-planner** | Multi-company mission coordination | (Phase C, port 4362) |
| **nexha-partner-graph** | B2B relationship graph | (Phase C, port 4363) |
| **nexha-event-bus** | Cross-company event streaming | (Phase B, port 4364) |
| **nexha-commerce-runtime** | Negotiation → Contract → Shipment → Payment | (Phase D, port 4365) |
| **nexha-procurement-os** | RFQ + bidding + award workflow | `companies/Nexha/services/procurement-os/` (L1 workflow, kept) |
| **nexha-franchise-os** | Franchise network | (L2 stub, port 4310) |
| **nexha-manufacturing-os** | Manufacturing network | (L2 stub, port 4330) |
| **nexha-intelligence-layer** | Demand forecasting + analytics | (L2 stub, port 4350) |
| **nexha-commerce-identity** | JWT auth, GSTIN | `companies/Nexha/commerce-identity/` |
| **nexha-portal** | B2B web portal (Next.js 16) | `companies/Nexha/portal/` |
| **nexha-mobile** | Mobile apps | `companies/Nexha/mobile/` |

### The boundary rule (non-negotiable)

```
┌─────────────────────────────────────────────────────────────────┐
│ HOJAI AI (Intelligence)                                          │
│                                                                  │
│  CorpID, MemoryOS, TwinOS, SkillOS, PolicyOS, GoalOS, FlowOS,  │
│  Knowledge Graph, TrustOS/SADA, SUTAR OS, Genie, AI SDK         │
│                                                                  │
│  • Never owns supplier data                                      │
│  • Never owns warehouse data                                     │
│  • Never owns logistics data                                     │
│  • Never owns financial transaction records                      │
│  • Only sees private company data through its own SUTAR         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Calls via Hub (4399) + ACP
                              │
┌─────────────────────────────────────────────────────────────────┐
│ Nexha (Commerce Network)                                        │
│                                                                  │
│  Supplier Network, Warehouse Network, Distribution Network,    │
│  Trade Finance Network, Pricing Network, Business Directory,   │
│  Agent Marketplace, Mission Planner, Partner Graph,            │
│  Event Bus, Commerce Runtime                                    │
│                                                                  │
│  • Never calls MemoryOS directly                                │
│  • Never reads TwinOS directly                                  │
│  • Only receives public projections via ACP                    │
│  • Sees: capabilities, trust scores, RFQs, public offers       │
│  • Doesn't see: customer data, internal pricing, private memory │
└─────────────────────────────────────────────────────────────────┘
```

### The 4-doc synthesis

This ADR synthesizes the 5 prior architectural discussions:

| Doc | Contribution |
|---|---|
| **Doc 1** (Nexha positioning) | "SUTAR = private AI per company, Nexha = public network" |
| **Doc 2** (What you have vs vision) | "Don't rewrite, build network layer above" |
| **Doc 3** (Disagreement with audit) | "Per-company SUTAR is the right end-state" |
| **Doc 4** (Nexha is its own company) | "SUTAR is HOJAI's product, Nexha is separate" |
| **Doc 5** (HOJAI = intelligence, Nexha = commerce) | "SUTAR thinks, Nexha connects" |

---

## Consequences

### Positive

1. **Clear company identity.** HOJAI = "We make AI smart." Nexha = "We connect you to the network." Each company can be valued, marketed, and built independently.

2. **Architectural privacy enforcement.** With SUTAR in HOJAI-AI and Nexha in its own repo, Nexha **physically cannot** access a company's private MemoryOS, TwinOS, etc. The privacy boundary becomes a repo boundary, not just a code convention.

3. **Independent roadmaps.** HOJAI can ship AI features (new LLM, new Twin types, new Genie capabilities) without coordinating with Nexha. Nexha can ship commerce features (new network, new country, new vertical) without coordinating with HOJAI.

4. **Investor narrative.** HOJAI = "AI infrastructure" ($1T+ TAM). Nexha = "Commerce network" ($1T+ TAM). Different markets, different multiples, different acquirers.

5. **Easier M&A.** If you want to sell Nexha, the code is already separated. Same for HOJAI.

### Negative

1. **Phase 0 refactor (3 weeks).** 5 services need to physically move from HOJAI-AI to Nexha, get renamed, and have their dependencies updated. Zero new functionality, pure refactor.

2. **Cross-repo coordination overhead.** When SUTAR needs a new Nexha capability, it goes through the Hub + ACP. That's more moving parts than a single-company monolith.

3. **Two PRs for cross-boundary changes.** A change that affects both HOJAI's SUTAR and Nexha's network requires two PRs (one in each repo), not one.

4. **Documentation must be split.** The current `docs/sutar-os/*` and `companies/HOJAI-AI/sutar-os/*` mix HOJAI concerns with Nexha concerns. We'll need to clean that up.

### Neutral

- **No impact on end users.** The Hub at :4399 keeps the same URL structure. Consumers don't see a difference.
- **No impact on the demo.** The full-stack demo continues to work; service URLs are the same, just renamed in Nexha.

---

## Implementation: Phased Upgrade Plan

This is the canonical, week-by-week build plan. It implements this ADR and supersedes all prior build plans.

### Phase 0: Move 5 network services from HOJAI to Nexha (3 weeks)

**Goal:** Fix the ownership violation. 5 services live in the wrong repo today.

| # | Action | Effort | Owner |
|---|---|---|---|
| 0.1 | Create `nexha-supplier-network` from `sutar-supplier-registry` | 1 day | HOJAI team |
| 0.2 | Create `nexha-warehouse-network` from `sutar-warehouse-network` | 1 day | HOJAI team |
| 0.3 | Create `nexha-distribution-network` from `sutar-logistics` | 1 day | HOJAI team |
| 0.4 | Create `nexha-trade-finance-network` from `sutar-trade-finance` | 1 day | HOJAI team |
| 0.5 | Create `nexha-pricing-network` from `sutar-pricing-intelligence` | 1 day | HOJAI team |
| 0.6 | Update Hub `NEXHA_SERVICES` map (new names + deprecation aliases) | 1 day | RTMN team |
| 0.7 | Update do-app `nexha` client to use new names | 1 day | do-app team |
| 0.8 | Update RTMN root docs (CLAUDE.md, README.onepager.md, ROADMAP, STATUS, docs/sutar-os/*) | 2 days | RTMN team |
| 0.9 | Re-run full-stack demo, fix any breakage | 1 day | RTMN team |
| 0.10 | Bump HOJAI-AI submodule (drops 5 services) | 1 day | RTMN team |
| 0.11 | Delete 3 L1 stubs in Nexha (`procurement-os`, `distribution-os`, `trade-finance`) | 1 day | Nexha team |
| 0.12 | Move `sutar-mock` from Nexha to HOJAI-AI as `sutar-dev-mock` (or delete) | 1 day | HOJAI + Nexha teams |
| 0.13 | Cut initial release in Nexha repo with 5 new services | 1 day | Nexha team |

**Acceptance criteria:**
- All 5 services run in Nexha repo with their original tests passing
- Hub at :4399 returns 200 for both `nexha-supplier-network` and `sutar-supplier-registry` (deprecation alias)
- do-app autopilot calls new names and works end-to-end
- Full-stack demo passes
- All RTMN docs reference new names

**Total: 3 weeks, 2-3 engineers.**

### Phase 1: Multi-tenant SUTAR with future single-tenant capability (4 weeks)

**Goal:** Make SUTAR support per-company data isolation, while keeping the option to deploy per-tenant instances later.

| # | Action | Effort | Owner |
|---|---|---|---|
| 1.1 | Add `companyId` to all SUTAR data models (economy, trust, contract, negotiation, decision) | 1 week | HOJAI team |
| 1.2 | Implement row-level security in every SUTAR service query | 1 week | HOJAI team |
| 1.3 | Per-company Karma wallets (replace global wallet) | 3 days | HOJAI team |
| 1.4 | Per-company trust scores (replace global trust) | 3 days | HOJAI team |
| 1.5 | Add "tenant context" middleware to all SUTAR services | 2 days | HOJAI team |
| 1.6 | Write multi-tenancy tests (10+ per service) | 3 days | HOJAI team |
| 1.7 | Document the "fork tenant to private instance" path | 2 days | HOJAI team |

**Acceptance criteria:**
- 2 test companies can use SUTAR concurrently without seeing each other's data
- All 13 real SUTAR services support `companyId` filtering
- "Tenant fork" documentation explains how to extract one company's data into a private SUTAR instance

**Total: 4 weeks, 2 engineers.**

### Phase 2: Event Bus via Redis Streams (2 weeks)

**Goal:** Replace direct REST polling with event-driven architecture. Foundation for everything else.

| # | Action | Effort | Owner |
|---|---|---|---|
| 2.1 | Set up Redis Streams infrastructure (1 Redis instance, 5 streams: rfq-events, contract-events, shipment-events, payment-events, trust-events) | 2 days | RTMN team |
| 2.2 | Add `emit(eventType, payload)` helper to all SUTAR services | 2 days | HOJAI team |
| 2.3 | Add `subscribe(eventType, handler)` helper to all Nexha services | 2 days | Nexha team |
| 2.4 | Wire existing state changes to emit events (RFQ created, contract signed, shipment delivered, payment cleared) | 3 days | HOJAI + Nexha teams |
| 2.5 | Build event replay tool (replay past events for debugging) | 1 day | RTMN team |
| 2.6 | Document event schema (JSON Schema for each event type) | 1 day | RTMN team |

**Acceptance criteria:**
- Every state change in SUTAR + Nexha emits an event
- Subscribers receive events in near-real-time (<1s latency)
- Replay tool can reconstruct any past state from event log

**Total: 2 weeks, 2 engineers.**

### Phase 3: Business Directory — One service, 4 endpoints (3 weeks)

**Goal:** Build the foundation for cross-company discovery. Solves 4 doc items at once.

| # | Action | Effort | Owner |
|---|---|---|---|
| 3.1 | Design `nexha-business-directory` schema (companies, capabilities, agents, trust_scores tables) | 2 days | Nexha team |
| 3.2 | Build core service (port 4360, Express + PostgreSQL or MongoDB) | 1 week | Nexha team |
| 3.3 | Implement 4 endpoints: `/companies`, `/capabilities`, `/agents`, `/trust` | 3 days | Nexha team |
| 3.4 | Add company onboarding flow (self-service registration) | 2 days | Nexha team |
| 3.5 | Add capability search ("laser cutting" → list of companies) | 1 day | Nexha team |
| 3.6 | Add trust score integration with SADA | 1 day | Nexha + HOJAI teams |
| 3.7 | Write 30+ unit tests | 2 days | Nexha team |
| 3.8 | Update Hub `NEXHA_SERVICES` map to include new service | 1 day | RTMN team |

**Acceptance criteria:**
- Company can register via API
- Search "laser cutting" returns companies with that capability
- Trust scores come from SADA, not stored locally
- 30+ tests passing

**Total: 3 weeks, 2 engineers.**

### Phase 4: Real ACP-Messaging (3 weeks)

**Goal:** Build a real cross-organization communication protocol on top of the existing 8 message types.

| # | Action | Effort | Owner |
|---|---|---|---|
| 4.1 | Choose transport: HTTP + JSON (simple) vs gRPC (performant) | 1 day | HOJAI team |
| 4.2 | Add JWT auth (CorpID-signed) to all ACP messages | 2 days | HOJAI team |
| 4.3 | Add cross-org routing via Hub (Company A → Hub → Company B's SUTAR) | 1 week | RTMN team |
| 4.4 | Add capability exchange (agents advertise what they can do) | 3 days | HOJAI team |
| 4.5 | Add ACP discovery service (find agents by capability) | 3 days | HOJAI team |
| 4.6 | Replace existing 14 agent service stubs with real ACP implementations | 1 week | HOJAI team |
| 4.7 | Write 50+ tests (interoperability between 2+ companies) | 1 week | HOJAI team |

**Acceptance criteria:**
- 2 test companies can exchange QUERY/QUOTE/COUNTER/ACCEPT messages via ACP
- JWT auth prevents unauthorized cross-org access
- Capability discovery returns relevant agents across companies
- 50+ tests passing

**Total: 3 weeks, 3 engineers.**

### Phase 5: Agent Marketplace (4 weeks)

**Goal:** Companies can discover and rent AI agents from each other.

| # | Action | Effort | Owner |
|---|---|---|---|
| 5.1 | Design `nexha-agent-marketplace` schema (listings, rentals, reviews) | 1 week | Nexha team |
| 5.2 | Build marketplace service (port 4361) | 2 weeks | Nexha team |
| 5.3 | Build listing flow (SUTAR publishes "Marketing Agent for rent") | 3 days | HOJAI + Nexha teams |
| 5.4 | Build rental flow (Company B's SUTAR rents Marketing Agent from Company A) | 1 week | HOJAI + Nexha teams |
| 5.5 | Build review/feedback system | 3 days | Nexha team |
| 5.6 | Add payment integration (rental fees flow through Nexha Trade Finance Network) | 1 week | Nexha team |
| 5.7 | Write 50+ tests | 1 week | Nexha team |

**Acceptance criteria:**
- SUTAR can list its agents for rent on the marketplace
- Other SUTARs can discover, rent, and pay for those agents
- Reviews and ratings flow into trust network
- 50+ tests passing

**Total: 4 weeks, 3 engineers.**

### Phase 6: Mission Planner (4 weeks)

**Goal:** Multi-company mission coordination ("Open Restaurant" needs Builder + Bank + Insurance + 5 other companies).

| # | Action | Effort | Owner |
|---|---|---|---|
| 6.1 | Design `nexha-mission-planner` schema (missions, subtasks, participants) | 1 week | Nexha team |
| 6.2 | Build mission service (port 4362) | 2 weeks | Nexha team |
| 6.3 | Build mission templates ("Open Restaurant", "Build Apartment") | 1 week | Nexha team |
| 6.4 | Build subtask assignment (find best company for each subtask) | 1 week | Nexha team |
| 6.5 | Build progress tracking and reporting | 1 week | Nexha team |
| 6.6 | Write 50+ tests (full mission lifecycle) | 1 week | Nexha team |

**Acceptance criteria:**
- "Open Restaurant" mission can be created and assigned to 7+ companies
- Progress is tracked in real-time via Event Bus
- Payment flows through Trade Finance Network
- 50+ tests passing

**Total: 4 weeks, 3 engineers.**

### Phase 7: Partner Graph (4 weeks)

**Goal:** B2B relationship graph for fraud detection, partner recommendations, and analytics.

| # | Action | Effort | Owner |
|---|---|---|---|
| 7.1 | Choose graph database: Neo4j (rich queries) or Memgraph (faster) or PostgreSQL with pgvector (simpler) | 2 days | Nexha team |
| 7.2 | Build `nexha-partner-graph` service (port 4363) | 2 weeks | Nexha team |
| 7.3 | Define node types (Company, Agent, Product, Service) and edge types (buys-from, supplies-to, manufactures-for, ships-for, finances) | 1 week | Nexha team |
| 7.4 | Build graph ingestion (auto-populate from trade finance + RFQ + shipment events) | 1 week | Nexha team |
| 7.5 | Build query API ("Who supplies cement to companies in Mumbai?") | 1 week | Nexha team |
| 7.6 | Write 50+ tests | 1 week | Nexha team |

**Acceptance criteria:**
- Graph is auto-populated from Event Bus
- Complex queries (3+ hops) return results in <1s
- 50+ tests passing

**Total: 4 weeks, 2 engineers.**

### Phase 8: Commerce Runtime (4 weeks)

**Goal:** Orchestrate the full commerce cycle: Negotiation → Contract → Shipment → Payment → Settlement.

| # | Action | Effort | Owner |
|---|---|---|---|
| 8.1 | Design `nexha-commerce-runtime` state machine | 1 week | Nexha team |
| 8.2 | Build runtime service (port 4365) | 2 weeks | Nexha team |
| 8.3 | Wire to existing services (negotiation, contract, distribution, trade-finance) | 1 week | Nexha team |
| 8.4 | Add auto-rollback on failure (compensating transactions) | 1 week | Nexha team |
| 8.5 | Write 50+ tests (happy path + 5 failure modes) | 1 week | Nexha team |

**Acceptance criteria:**
- Full commerce cycle can be initiated via single API call
- State is tracked across all 5 phases
- Failures auto-rollback with proper compensation
- 50+ tests passing

**Total: 4 weeks, 3 engineers.**

### Phase 9: Per-Tenant SUTAR Instances (4 weeks) — PREMIUM TIER

**Goal:** Allow enterprise customers (banks, hospitals, governments) to deploy their own private SUTAR instance.

| # | Action | Effort | Owner |
|---|---|---|---|
| 9.1 | Design "tenant fork" script (extract one company's data into a new repo) | 1 week | HOJAI team |
| 9.2 | Add tenant-aware deployment configs (Helm chart or docker-compose) | 1 week | HOJAI team |
| 9.3 | Build tenant onboarding flow (provision new instance, migrate data) | 1 week | HOJAI team |
| 9.4 | Document compliance certifications (SOC 2, GDPR, HIPAA) | 1 week | HOJAI team |
| 9.5 | Write 20+ tests (fork, deploy, migrate) | 1 week | HOJAI team |

**Acceptance criteria:**
- Any tenant can be forked to a private instance in <1 hour
- Private instance is identical to multi-tenant (same codebase)
- Compliance docs are ready for enterprise sales

**Total: 4 weeks, 2 engineers.**

### Phase 10: Industry OS Split (8 weeks) — OPTIONAL

**Goal:** Decide where the 24 Industry OS (Restaurant, Hotel, Healthcare, etc.) live. Split if necessary.

| # | Action | Effort | Owner |
|---|---|---|---|
| 10.1 | Audit all 24 Industry OS — list which services are AI vs commerce | 1 week | RTMN team |
| 10.2 | Design split: AI parts → HOJAI, commerce parts → Nexha | 1 week | RTMN team |
| 10.3 | Implement split for Restaurant OS (template) | 2 weeks | RTMN team |
| 10.4 | Implement split for Hotel OS, Healthcare OS (3 more templates) | 4 weeks | RTMN team |
| 10.5 | Migrate remaining 20 Industry OS | (TBD, 6+ months) | RTMN team |

**Acceptance criteria:**
- Restaurant OS clearly split between HOJAI (menu AI, demand forecasting) and Nexha (supplier ordering, payment)
- Pattern documented for other 23 Industry OS
- 3 Industry OS fully migrated

**Total: 8 weeks for first 3, then 6+ months for the rest.**

---

## Grand Total

| Phase | Weeks | Engineers | What ships |
|---|---|---|---|
| 0. Move 5 services | 3 | 2-3 | Ownership fix |
| 1. Multi-tenant SUTAR | 4 | 2 | Per-company data isolation |
| 2. Event Bus | 2 | 2 | Cross-service events |
| 3. Business Directory | 3 | 2 | Company/agent/capability discovery |
| 4. Real ACP | 3 | 3 | Cross-org messaging |
| 5. Agent Marketplace | 4 | 3 | Rent AI agents across companies |
| 6. Mission Planner | 4 | 3 | Multi-company missions |
| 7. Partner Graph | 4 | 2 | B2B relationship graph |
| 8. Commerce Runtime | 4 | 3 | Full commerce cycle |
| 9. Per-Tenant SUTAR | 4 | 2 | Premium tier (banks, hospitals) |
| 10. Industry OS Split | 8 | 3+ | Optional — split 24 OS |
| **TOTAL** | **43 weeks** | **2-3 avg** | **Full canonical architecture** |

**At 2-3 engineers working in parallel, this is ~6-9 months of focused work.**

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 0 breaks the demo | Medium | High | Run demo after every step; keep deprecation aliases |
| Multi-tenancy work is bigger than expected | High | High | Phase 1 is internal; can ship to 1 customer first |
| ACP design is controversial | Medium | Medium | Start with 2 message types, add more based on usage |
| Industry OS split is too disruptive | High | High | Phase 10 is optional; can defer |
| Nexha repo doesn't have right CI/CD | Medium | Medium | Set up GitHub Actions, Render, Docker before Phase 5 |
| HOJAI and Nexha teams disagree on architecture | Medium | High | This ADR is the canonical reference; escalate to RTMN |

---

## Decision

**Accepted.** This is the canonical architecture going forward. All future work in HOJAI-AI or Nexha repos must comply with the boundary rule: HOJAI builds intelligence, Nexha builds the commerce network.

**Effective date:** 2026-06-22 (immediately).
**Supersedes:** All prior build plans from Docs 1-5.
**Next review:** After Phase 0 ships (target: 2026-07-13).

---

## References

- [NEXHA-VS-SUTAR-ARCHITECTURE-AUDIT.md](../NEXHA-VS-SUTAR-ARCHITECTURE-AUDIT.md) — the code audit that triggered this ADR
- [ADR-0001](../ADR/0001-hub-as-single-frontend-proxy.md) — Hub as single front door
- [ADR-0007](../ADR/0007-sutar-warehouse-network-as-c5.md) — sutar-warehouse-network as Phase C.5
- [ADR-0008](../ADR/0008-nexha-os-real-services.md) — procurement-os/distribution-os/trade-finance as real Nexha services
- [CLAUDE.md](../../CLAUDE.md) — top-level architecture
- [docs/sutar-os/](../sutar-os/) — SUTAR OS documentation (will be split/renamed in Phase 0)

---

*Adopted 2026-06-22 by RTMN architecture*
*Next review: 2026-07-13 (after Phase 0)*
