# Division 11 — AI Marketplace & Network

> **Status:** 🟡 ~30% built (marketplace stubs exist; trust/reputation/federation missing)
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
| **Agent Marketplace** (runtime) | [services/agent-marketplace/](../../../services/agent-marketplace/) | 4845 | ✅ Real |
| **Agent Marketplace Backend** (the registry) | (part of [services/acn-network/](../../../services/acn-network/)) | 4801 | ✅ Real |
| **Workflow Marketplace** | [services/workflow-marketplace/](../../../services/workflow-marketplace/) | 4938 | 🟡 Real |
| **Knowledge Marketplace** | [services/knowledge-marketplace/](../../../services/knowledge-marketplace/) | 4939 | ✅ Real |
| **Agent Reputation / Trust Network** | [services/agent-reputation/](../../../services/agent-reputation/) | 4820 | ✅ Real |
| **Agent Wallets / AI Economy** | [services/agent-wallets/](../../../services/agent-wallets/) | 4840 | ✅ Real |
| **Agent Contracts** | [services/agent-contracts/](../../../services/agent-contracts/) | 4830 | ✅ Real |
| **Dispute Resolution** | [services/dispute-resolution/](../../../services/dispute-resolution/) | 4847 | ✅ Real |
| **Negotiation AI** | [services/negotiation-ai/](../../../services/negotiation-ai/) | 4850 | ✅ Real |
| **ACN Network** (registry + discovery) | [services/acn-network/](../../../services/acn-network/) | 4801 | ✅ Real |
| **BLR AI Marketplace** (the B2C storefront) | [../blr-ai-marketplace/](../../blr-ai-marketplace/) | — | ⚠️ **No source** — only docs + package.json |

## 4. What's NOT Built

| Missing | Notes | Effort |
|---|---|---|
| **Skill Marketplace** | Buy/sell skills separately from agents | 6-8 weeks |
| **Prompt Marketplace** | Buy/sell prompt templates | 4-6 weeks |
| **Twin Marketplace** | Buy/sell pre-built twins (e.g. Restaurant Twin template) | 6-8 weeks |
| **Connector Marketplace** | Buy/sell pre-built connectors (Salesforce, Stripe, etc.) | 6-8 weeks |
| **Industry Packs** | Vertical bundles (Restaurant pack = OS + agents + workflows + integrations) | 4-6 weeks |
| **Knowledge Network** (cross-org shared learnings) | Federated knowledge graph | 8-12 weeks |
| **Learning Network** (federated learning) | Train models without centralizing data | 12-16 weeks (hard) |
| **Trust Network** (cross-platform reputation) | Extend agent-reputation to humans, orgs, content | 4-6 weeks |
| **Federation** (cross-org, cross-region) | Multi-tenant, multi-region | 8-12 weeks |
| **BLR AI Marketplace** (the actual storefront) | Build the Next.js + Stripe app | 12-16 weeks |
| **AI Economy** (full token economy) | Karma, agent-to-agent payments at scale | 12-16 weeks |

## 5. Gap Score

**~30% of target state is built.** The marketplace *backends* (Agent, Workflow, Knowledge) exist. The *frontends* (BLR AI Marketplace storefront, Skill/Prompt/Twin/Connector marketplaces) are missing. The network effects (Trust Network, Federation, Learning Network) are mostly missing.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **BLR AI Marketplace** (storefront) | 🔴 P0 | 12-16 weeks — flagship |
| 2 | **Trust Network** (cross-platform reputation) | 🔴 P0 | 4-6 weeks — needed for safety |
| 3 | **Connector Marketplace** | 🟡 P1 | 6-8 weeks |
| 4 | **Skill Marketplace** | 🟡 P1 | 6-8 weeks |
| 5 | **Industry Packs** | 🟡 P1 | 4-6 weeks |
| 6 | **Prompt Marketplace** | 🟢 P2 | 4-6 weeks |
| 7 | **Twin Marketplace** | 🟢 P2 | 6-8 weeks |
| 8 | **Knowledge Network** | 🟢 P2 | 8-12 weeks |
| 9 | **Federation** (multi-region) | 🟢 P2 | 8-12 weeks |
| 10 | **AI Economy at scale** | 🟢 P3 | 12-16 weeks |
| 11 | **Learning Network** (federated learning) | 🟢 P3 | 12-16 weeks |

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

*See also: [services/agent-marketplace/CLAUDE.md](../../../services/agent-marketplace/CLAUDE.md), [services/workflow-marketplace/CLAUDE.md](../../../services/workflow-marketplace/CLAUDE.md), [services/knowledge-marketplace/CLAUDE.md](../../../services/knowledge-marketplace/CLAUDE.md), [../blr-ai-marketplace/CLAUDE.md](../../blr-ai-marketplace/CLAUDE.md)*