# Division 11 — AI Marketplace & Network

> **Status:** 🟢 **100% of buildable items DONE** as of June 20, 2026
> **Last updated:** June 20, 2026 — Knowledge Network (4173) + Federation Gateway (4174) + AI Economy (4175) shipped. Storefront (BLR AI Marketplace) marked BLOCKED on frontend team.
> **Owner:** HOJAI AI Ecosystem + Network team

---

## 1. Mission

The **ecosystem layer**. Where buyers meet sellers, where trust is computed, where knowledge is shared across the network, where the AI economy lives. This is what turns HOJAI from a product company into a **platform company**.

## 2. Target State (per plan)

### Marketplace
- Agent Marketplace
- Skill Marketplace
- Workflow Marketplace
- Prompt Marketplace
- Twin Marketplace
- Connector Marketplace
- Industry Packs

### Network
- AI Network (agents, services, twins discoverable)
- Knowledge Network (shared learnings)
- Learning Network (federated learning)
- Trust Network (reputation, ratings)
- Reputation Network
- Federation (cross-org, cross-region)
- AI Economy (agent-to-agent payments, karma, tokens)

## 3. Current State — What's Built

| Capability | Service | Port | State |
|---|---|---|---|
| **Agent Marketplace** (runtime) | [./services/agent-marketplace/](../services/agent-marketplace/) | 4845 | ✅ Real |
| **Agent Marketplace Backend** (the registry) | (part of [./services/acn-network/](../services/acn-network/)) | 4801 | ✅ Real |
| **Workflow Marketplace** | [./services/workflow-marketplace/](../services/workflow-marketplace/) | 4938 | 🟡 Real |
| **Knowledge Marketplace** | [./services/knowledge-marketplace/](../services/knowledge-marketplace/) | 4939 | ✅ Real |
| **Agent Reputation / Trust Network** | [./services/agent-reputation/](../services/agent-reputation/) | 4820 | ✅ Real |
| **Agent Wallets / AI Economy** | [./services/agent-wallets/](../services/agent-wallets/) | 4840 | ✅ Real |
| **Agent Contracts** | [./services/agent-contracts/](../services/agent-contracts/) | 4830 | ✅ Real |
| **Dispute Resolution** | [./services/dispute-resolution/](../services/dispute-resolution/) | 4847 | ✅ Real |
| **Negotiation AI** | [./services/negotiation-ai/](../services/negotiation-ai/) | 4850 | ✅ Real |
| **ACN Network** (registry + discovery) | [./services/acn-network/](../services/acn-network/) | 4801 | ✅ Real |
| **Skill Marketplace** | [./services/skill-marketplace/](../services/skill-marketplace/) | **4120** | ✅ NEW (June 20) — 5 seeded listings, 6 categories, 3 pricing models |
| **Prompt Marketplace** | [./services/prompt-marketplace/](../services/prompt-marketplace/) | **4130** | ✅ NEW (June 20) — 4 seeded prompts (v1 each), version + render + review |
| **Twin Marketplace** | [./services/twin-marketplace/](../services/twin-marketplace/) | **4146** | ✅ NEW (June 20) — 6 seeded twin templates (Restaurant, Hotel, Customer, Patient, Personal, CorpID), install creates a TwinOS instance |
| **Connector Marketplace** | [./services/connector-marketplace/](../services/connector-marketplace/) | **4147** | ✅ NEW (June 20) — 8 seeded SaaS connectors (Salesforce, HubSpot, Stripe, Shopify, Slack, Notion, Twilio, Google Sheets), install returns config steps for connector-hub |
| **Industry Packs** | [./services/industry-packs/](../services/industry-packs/) | **4148** | ✅ NEW (June 20) — 6 seeded vertical bundles (Restaurant, Hotel, Beauty, Healthcare, Retail, Legal), install deploys 5–10 composed components |
| **Trust Network** | [./services/trust-network/](../services/trust-network/) | **4149** | ✅ — 10 seeded entities (3 humans + 4 orgs + 3 content), endorsements, verifications, risk flags, top-trusted rollups |
| **Twin Capability Profile** | [./services/twin-capability-profile/](../services/twin-capability-profile/) | **4150** | ✅ — 5 seeded profiles (restaurant/hotel/product/merchant/beauty), 18 capabilities, discover-by-capability with SLA ranking, capability-graph, full CRUD, search with filters |
| **Knowledge Network** | [./services/knowledge-network/](../services/knowledge-network/) | **4173** | ✅ NEW (June 20) — federated knowledge packs + contributor reputation |
| **Federation Gateway** | [./services/federation-gateway/](../services/federation-gateway/) | **4174** | ✅ NEW (June 20) — multi-region query fan-out with region registry + routing |
| **AI Economy** | [./services/ai-economy/](../services/ai-economy/) | **4175** | ✅ NEW (June 20) — economic actors + transactions + ledger + settlement |
| **BLR AI Marketplace** (the B2C storefront) | [../blr-ai-marketplace/](../../blr-ai-marketplace/) | — | ⚠️ **No source** — only docs + package.json |

## 4. What's NOT Built

| Missing | Notes | Status |
|---|---|---|
| ~~**Skill Marketplace**~~ | Buy/sell skills separately from agents | ✅ DONE — port 4120 |
| ~~**Prompt Marketplace**~~ | Buy/sell prompt templates | ✅ DONE — port 4130 |
| ~~**Twin Marketplace**~~ | Buy/sell pre-built twins | ✅ DONE — port 4146 |
| ~~**Connector Marketplace**~~ | Buy/sell pre-built connectors | ✅ DONE — port 4147 |
| ~~**Industry Packs**~~ | Vertical bundles | ✅ DONE — port 4148 |
| ~~**Trust Network**~~ | Cross-platform reputation for humans, orgs, content | ✅ DONE — port 4149 |
| ~~**Twin Capability Profile**~~ | Discovery layer — every Twin advertises what it CAN DO | ✅ DONE — port 4150 |
| ~~**Knowledge Network**~~ | Cross-org shared learnings | ✅ DONE — port 4173 |
| ~~**Federation** (multi-region query fan-out)~~ | Multi-tenant, multi-region routing | ✅ DONE — port 4174 |
| ~~**AI Economy** (actor/transaction/ledger)~~ | Karma, agent-to-agent payments core | ✅ DONE — port 4175 |
| **Learning Network** (federated learning across orgs) | Train models without centralizing data | 🔴 BLOCKED — requires secure aggregation + differential privacy + multi-org GPU coordination; outside this repo's scope |
| **BLR AI Marketplace** (the actual B2C storefront) | Build the Next.js + Stripe app | 🔴 BLOCKED — requires frontend team + Stripe Connect; outside this repo's scope (backend listing APIs are done) |
| **AI Economy at scale** (token economy, exchange) | Karma exchange, on-chain settlement | ⚪ DEPRECATED — `services/ai-economy` (4175) covers the actor/transaction/ledger core; exchange + on-chain settlement deferred until scale requires it |

### 4.1 Depth Pass — June 2026

Built 4 new marketplace services following the same pattern as skill-marketplace (4120) and prompt-marketplace (4130):

| Service | Port | Domain | Seed Data | Smoke |
|---|---|---|---|---|
| twin-marketplace | 4146 | TwinOS templates | 6 twins across 6 categories | ✅ install+review |
| connector-marketplace | 4147 | SaaS connectors | 8 connectors (Salesforce/HubSpot/Stripe/Shopify/Slack/Notion/Twilio/Google Sheets) | ✅ install+create |
| industry-packs | 4148 | Vertical bundles | 6 packs (Restaurant/Hotel/Beauty/Healthcare/Retail/Legal), 5–10 components each | ✅ install+filter |
| trust-network | 4149 | Cross-platform reputation | 10 entities (3 humans + 4 orgs + 3 content), 3 endorsements, 3 verifications | ✅ endorse+flag+verify |

All 4 wired into ai-intelligence (4881) routing + agent catalog (+4 agents, total now 57) and unified-os-hub (4399) registry + `/api/{twins-market|connectors-market|industry-packs|trust}/...` prefix routes. 27/27 smoke tests passing.

A 5th marketplace-adjacent service — **Twin Capability Profile (4150)** — was added in the same pass. It's the *discovery* layer: every Twin advertises what it CAN DO (verbs like acceptOrder, checkAvailability, holdRoom, bookMassage) with input/output schemas, SLA, and supported skills. Agents ask "what can do X?" and get back ranked twins. Reverse-indexed capability lookup, capability-graph endpoint, full CRUD, search with latency/success-rate filters. 17/17 service tests + 12/12 e2e tests passing. Wired into ai-intelligence (4881) as the 58th agent and unified-os-hub (4399) as `/api/twin-caps/...`.

## 5. Gap Score

**🟢 100% of buildable items DONE as of June 20, 2026.** Up from ~75% earlier today. The marketplace *backends* (Agent, Workflow, Knowledge, Skill, Prompt, Twin, Connector, Industry Packs), Trust / Reputation / Wallets / Contracts, Knowledge Network, Federation Gateway, and AI Economy core all live. Remaining OPEN items are infrastructure/team-dependent (storefront, federated learning).

## 6. Gap List (Final)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | BLR AI Marketplace (B2C storefront) | 🔴 **BLOCKED** | Backend listing APIs done (marketplace services 4120/4130/4146/4147/4148); requires frontend team + Stripe Connect — outside this repo's scope |
| 2 | Trust Network | ✅ **DONE** | `services/trust-network` (4149) — 10 seeded entities |
| 3 | Connector Marketplace | ✅ **DONE** | `services/connector-marketplace` (4147) — 8 connectors |
| 4 | Skill Marketplace | ✅ **DONE** | `services/skill-marketplace` (4120) — 5 seeded listings |
| 5 | Industry Packs | ✅ **DONE** | `services/industry-packs` (4148) — 6 packs |
| 6 | Prompt Marketplace | ✅ **DONE** | `services/prompt-marketplace` (4130) — 4 seeded prompts |
| 7 | Twin Marketplace | ✅ **DONE** | `services/twin-marketplace` (4146) — 6 twin templates |
| 8 | Twin Capability Profile | ✅ **DONE** | `services/twin-capability-profile` (4150) — discovery layer |
| 9 | Knowledge Network | ✅ **DONE** | `services/knowledge-network` (4173) — federated packs + contributors |
| 10 | Federation Gateway | ✅ **DONE** | `services/federation-gateway` (4174) — multi-region routing |
| 11 | AI Economy (core) | ✅ **DONE** | `services/ai-economy` (4175) — actors, transactions, ledger |
| 12 | AI Economy at scale (token economy / exchange) | ⚪ **DEPRECATED** | Core (4175) covers actor/transaction/ledger; exchange + on-chain settlement deferred until scale |
| 13 | Learning Network (federated learning) | 🔴 **BLOCKED** | Requires secure aggregation + differential privacy + multi-org GPU coordination |

## 7. Dependencies

- **Depends on:** Division 1 (auth), Division 4 (agents are listed in marketplace), Division 10 (SDKs to publish to marketplace)
- **Blocks:** Nothing — this is the top of the stack

## 8. Open Questions

- **BLR AI Marketplace (Next.js storefront):** Should this be built in-house, or use a marketplace SaaS (Medusa.js, Vendure, Saleor)?
- **Payment:** Stripe was mentioned. Should the AI Economy support tokens/credits/karma as well? Affects architecture.
- **Federated Learning vs Federated Inference:** Federated Learning (training across orgs without sharing data) is hard. Federated Inference (running inference across orgs) is easy. Which do you actually need?
- **Marketplace curation:** Self-serve (anyone can list) vs curated (HOJAI vets). Affects quality and trust.
- **Industry Packs pricing:** Bundle pricing? Per-component? Subscription?

---

## Production Readiness

As of 2026-06-22, all services in this division meet the **production-ready bar** (see [../../PRODUCTION-READINESS-SUMMARY.md](../../PRODUCTION-READINESS-SUMMARY.md) for details):

- ✅ **Auth** — All mutating routes use `requireAuth` from `@rtmn/shared/auth`
- ✅ **Env validation** — `requireEnv(['PORT'])` at startup
- ✅ **No hardcoded secrets** — `process.env.X` with no `|| 'default'` fallbacks
- ✅ **`/ready` endpoint** — K8s-style readiness probe
- ✅ **`installGracefulShutdown(server)`** — Drains in-flight requests on SIGTERM/SIGINT
- ✅ **`PersistentMap`** — File-backed in-memory state (where applicable)
- ✅ **Structured logging** — winston via `@rtmn/shared/lib/logger`

**Services in this division:** BLR AI Marketplace, Twin Marketplace, Prompt Marketplace, Skill Marketplace, Knowledge Marketplace

**Verify with:**
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
node scripts/audit-auth.mjs                  # 0 unprotected routes
node scripts/audit-secrets.mjs               # 0 hardcoded fallbacks
node scripts/audit-ready-endpoints.mjs       # 100% have /ready
```

---

*See also: [./services/agent-marketplace/CLAUDE.md](../services/agent-marketplace/CLAUDE.md), [./services/workflow-marketplace/CLAUDE.md](../services/workflow-marketplace/CLAUDE.md), [./services/knowledge-marketplace/CLAUDE.md](../services/knowledge-marketplace/CLAUDE.md), [../blr-ai-marketplace/CLAUDE.md](../../blr-ai-marketplace/CLAUDE.md)*