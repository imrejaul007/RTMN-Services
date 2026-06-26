# Phase II: 12 Missing Pieces — Audit & Upgrade Plan

> **Date:** 2026-06-26
> **Context:** Audit of all 12 missing/underdeveloped pieces from strategic docs.

---

## TL;DR

| # | Piece | Current State | Priority | Gap |
|---|-------|-------------|----------|-----|
| 1 | ACP Protocol | 🟡 Layer 5/12 done (messaging only) | 🔴 10/10 | 90% |
| 2 | DiscoveryOS | 🟡 Basic search | 🔴 10/10 | 60% |
| 3 | ReputationOS | 🟡 ACI scoring done | 🔴 10/10 | 65% |
| 4 | CapabilityOS | 🟢 Schema exists (4270) | 🔴 10/10 | 50% |
| 5 | CatalogOS | 🟢 Product catalog exists (4370) | 🟡 9/10 | 45% |
| 6 | MarketplaceOS | 🟡 Basic scaffold | 🟡 9/10 | 85% |
| 7 | **ApprovalOS** | 🔴 **NOT EXISTS** | 🟡 9/10 | 100% |
| 8 | OpportunityOS | 🟢 Exists (4274) | 🟡 9/10 | 55% |
| 9 | CreatorOS | 🟡 BAM exists | 🟡 9/10 | 60% |
| 10 | SimulationOS | 🟡 Fragmented | 🟡 8/10 | 75% |
| 11 | Federation Governance | 🟡 Registry exists | 🟡 8/10 | 50% |
| 12 | **AIO Platform** | 🔴 **NOT EXISTS** | 🟡 8/10 | 100% |

**7 exist in some form, 5 missing/underdeveloped. Biggest gap: ACP (1/12 layers built).**

---

## Audit Results

### 1. ACP — MOST CRITICAL 🔴

**Current:** `nexha-acp-messaging` (4340) - 8 message types + state machine + MongoDB

**12 Layers:**

| Layer | Status |
|-------|--------|
| L0: Transport | ❌ |
| L1: Identity | ❌ |
| L2: Trust | ❌ |
| L3: Discovery | ❌ |
| L4: Capability | ⚠️ Schema exists |
| **L5: Messaging** | ✅ **Done** |
| L6: Knowledge Exchange | ❌ |
| L7: Workflow | ❌ |
| L8: Negotiation | ⚠️ Basic |
| L9: Contracts | ❌ |
| L10: Finance | ⚠️ Basic escrow |
| L11: Federation | ⚠️ Registry only |

**Gap:** 90% — Only 1 of 12 layers built.

**Plan:**
- ACP v1.0 (months 1-3): SDK + L1 Identity + L4 Capability native
- ACP v1.1 (months 4-5): L3 Discovery + L6 Knowledge + L7 Workflow
- ACP v1.2 (months 6-7): L8 Negotiation + L9 Contracts
- ACP v2.0 (months 10-12): L0 Transport + L10 Finance + L11 Federation + RFC

---

### 2. DiscoveryOS 🟡

**Current:** `nexha-discovery-os` (4272) - search + ranking + basic filters

**Gap:** 60% — Basic search, AI-powered multi-dimensional discovery missing.

**Plan:**
- v1.1: Natural language + multi-dimensional (certifications, lead time, compliance)
- v1.2: AI matching (vectors + LLM reranking) + real-time availability
- v2.0: Cross-border compliance + audit trails

---

### 3. ReputationOS 🟡

**Current:** `nexha-reputation-os` (4271) - ACI scoring 0-1000 + signal ingestion

**Gap:** 65% — 8 trust dimensions + fraud + TrustOS unification missing.

**Plan:**
- v1.1: 8 trust dimensions + decay algorithm
- v1.2: Continuous monitoring (fraud, sanctions) + SADA integration
- TrustOS v2.0: Unify ReputationOS + SADA

---

### 4. CapabilityOS 🟢

**Current:** `nexha-capability-os` (4270) - JSON-LD schema + attestation + matching

**Gap:** 50% — AIO platform missing.

**Plan:**
- v1.1: Weighted matching + versioning + dependencies
- **AIO Platform** (3 months): "SEO for AI" - optimize capabilities for AI discoverability

---

### 5. CatalogOS 🟢

**Current:** `nexha-catalog-os` (4370) - products + variants + pricing + inventory

**Gap:** 45% — All catalog types + cross-channel publishing missing.

**Plan:**
- v1.1: All types (services, skills, agents, APIs, experiences, events, hotels, restaurants, movies)
- v1.2: Multi-channel (website, DO, marketplace, AI agents, voice)

---

### 6. MarketplaceOS 🟡

**Current:** `industry-os/services/marketplace-os` (5290) - very basic hotel app store

**Gap:** 85% — Most features missing.

**Plan:**
- v1.0: Wire CatalogOS + CommerceRuntime + Escrow + ReputationOS
- v1.1: RFQ + auction + tender + vendor management
- v2.0: `hojai create marketplace` + loyalty + wallet integration

---

### 7. ApprovalOS — CRITICAL MISSING ❌

**Current:** NOT EXISTS

**Why Critical:**
> "One of the biggest mistakes: letting AI do everything automatically."

Without it:
- No human approval for large purchases
- No contract sign-off
- Liability + compliance issues

**Gap:** 100% — Must exist before real commerce.

**Plan:**
- v1.0 (6 weeks): Approval routing (<$100 auto, $100-$5k manager, $5k-$100k director, >$100k CEO/board)
- v1.1: Delegation + escalation + override + audit trail
- v2.0: Wire to SUTAR Decision Engine + ACP contract layer

---

### 8. OpportunityOS 🟢

**Current:** `nexha-opportunity-os` (4274) - demand posting + matching + bidding

**Gap:** 55% — Proactive demand generation missing.

**Plan:**
- v1.1: Proactive generation (idle capacity → find demand → proposals)
- v1.2: AI proposals + auto-bidding with ApprovalOS hooks

---

### 9. CreatorOS 🟡

**Current:** `HOJAI-AI/blr-ai-marketplace/` - 1,200+ items + 35 categories + 7 services

**Gap:** 60% — Full creator economy missing.

**Plan:**
- v1.0 (6 weeks): Creator dashboard (revenue, downloads, MRR, payouts) + profiles
- v1.1: Licensing tiers + royalties + revenue sharing + certifications
- v1.2: Creator reviews + verified badges + analytics

---

### 10. SimulationOS 🟡

**Current:** FRAGMENTED - Revenue Intelligence (5400) has ScenarioPlanner + REZ-Workspace has basic

**Gap:** 75% — No unified platform.

**Plan:**
- v1.0 (6 weeks): Consolidate into unified service
- v1.1: Cross-domain scenarios (expansion, hiring, suppliers, pricing)

---

### 11. FederationOS Governance 🟡

**Current:** `nexha-federation-os` (4273) - registration + handshakes + policies + membership tiers

**Gap:** 50% — RFC process + certification missing.

**Plan:**
- v1.1 (4 weeks): RFC process + certification workflow + badges
- v1.2: ACP Foundation + dispute resolution + compliance audits

---

### 12. AIO Platform — MISSING ❌

**Current:** NOT EXISTS

**Why Huge:**
> "SEO created Google. AIO could create Global Nexha."

**Gap:** 100%

**Plan:**
- v1.0 (6 weeks): AIO scoring (how discoverable is this company's AI footprint?)
- v1.1: Optimization recommendations + AIO audit + competitive benchmarking
- v2.0: AIO agency marketplace (entire companies will emerge)

---

## Consolidated Roadmap

### Month 1-2: Critical Path
| Week | Work |
|------|------|
| 1-2 | **ApprovalOS v1.0** — MUST DO FIRST |
| 3-4 | **ACP v1.0** — Identity + Capability native |
| 5-6 | **Discovery v1.1** — Natural language + multi-dimensional |
| 7-8 | **Marketplace v1.0** — Wire existing pieces |

### Month 3-4: Foundation
| Week | Work |
|------|------|
| 9-10 | **ACP v1.1** — Discovery + Knowledge + Workflow |
| 11-12 | **Reputation v1.1** — 8 dimensions + decay |
| 13-14 | **Opportunity v1.1** — Proactive demand |
| 15-16 | **AIO v1.0** — AI optimization scoring |

### Month 5-6: Polish & Scale
| Week | Work |
|------|------|
| 17-18 | **ACP v1.2** — Negotiation + Contracts |
| 19-20 | **CreatorOS v1.0** — Dashboard + profiles |
| 21-22 | **SimulationOS v1.0** — Unified simulation |
| 23-24 | **Federation v1.1** — RFC + certification |

### Month 7-12: Global Nexha Launch
| Month | Work |
|-------|------|
| 7-8 | **ACP v2.0** — Full protocol |
| 9-10 | **Catalog v1.1** — All catalog types |
| 11-12 | **Integration** — Wire everything + E2E testing |

---

## Dependencies

```
ApprovalOS ──► SUTAR Decision Engine ──► ACP Contracts
                                    │
ACP Identity ◄── CorpID ───────────┤
ACP Trust ◄──── ReputationOS ───────┤
ACP Discovery ◄─ CapabilityOS ───────┤
ACP Finance ◄── EconomyOS ─────────┤
ACP Federation ◄─ FederationOS ───────┤
                                    │
OpportunityOS ─► DiscoveryOS ◄───────┤
                            │       │
CatalogOS ──────────────────┴─► MarketplaceOS
                                  │
CreatorOS ◄─── BAM ────────────────┘
```

---

## Top 3 Priorities

1. **ACP** — Foundation of Global Nexha. Only 1/12 layers exist.
2. **ApprovalOS** — Without human oversight, no enterprise trust.
3. **AIO Platform** — The SEO-equivalent. Biggest long-term moat.

---

## Open Questions

1. ACP ownership: Separate HOJAI-AI service or inside Nexha?
2. ApprovalOS: Inside SUTAR Decision Engine or standalone?
3. AIO: Part of DiscoveryOS or its own service?
4. SimulationOS: Consolidate or keep separate?
5. CreatorOS: Part of BAM or standalone?

---

*Last Updated: 2026-06-26*
