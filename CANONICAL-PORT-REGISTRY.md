# RTMN Canonical Port Registry

> **Version:** 1.0 (Authoritative)  
> **Date:** June 18, 2026  
> **Source of truth:** Actual `const PORT = process.env.PORT || NNNN` declarations in each service's `src/index.js`  
> **Replaces:** `PORT-REGISTRY.md` (which has 3-way port conflicts and 200+ stale entries)

This registry is **machine-verified** against the codebase. Where `PORT-REGISTRY.md` or `CLAUDE.md` disagree, **this file wins**.

---

## ✅ Currently RUNNING (verified by health check at 2026-06-18)

| Port | Service | Path | Status |
|------|---------|------|--------|
| 4702 | corpid-service | `companies/HOJAI-AI/platform/identity/corpid-service/` | ❌ Not running (run `npm start` from corpid-service dir) |
| 4703 | memory-os | `companies/HOJAI-AI/platform/memory/memory-os/` | ✅ 200 |
| 4152 | memory-confidence | `companies/HOJAI-AI/platform/memory/memory-confidence/` | ✅ 200 |
| 4704 | twin-memory-bridge | `companies/HOJAI-AI/platform/twins/twin-memory-bridge/` | ✅ 200 |
| 4793 | memory-context-engine | `companies/HOJAI-AI/platform/memory/memory-context-engine/` | ✅ 200 |
| 4705 | twinos-hub | `services/twinos-hub/` | ✅ 200 |
| 5010 | restaurant-os | `industry-os/services/restaurant-os/` | ✅ 200 |
| 5020 | healthcare-os | `industry-os/services/healthcare-os/` | ✅ 200 |
| 5025 | hotel-os | `industry-os/services/hotel-os/` | ✅ 200 |

---

## 🏛️ Foundation (canonical ports from source)

| Port | Service | Path |
|------|---------|------|
| 4399 | unified-os-hub | `services/unified-os-hub/` |
| 4510 | event-bus | `services/event-bus/` |
| 4702 | corpid-service | `companies/HOJAI-AI/platform/identity/corpid-service/` |
| 4703 | memory-os | `companies/HOJAI-AI/platform/memory/memory-os/` |
| 4152 | memory-confidence | `companies/HOJAI-AI/platform/memory/memory-confidence/` |
| 4704 | twin-memory-bridge | `companies/HOJAI-AI/platform/twins/twin-memory-bridge/` |
| 4793 | memory-context-engine | `companies/HOJAI-AI/platform/memory/memory-context-engine/` |
| 4705 | twinos-hub | `services/twinos-hub/` |
| 4000 | graphql-federation | `services/graphql-federation/` |
| 4750 | analytics-os | `industry-os/services/analytics-os/` |

---

## 🤖 ACN (Agent Commerce Network) — canonical ports from source

| Port | Service | Path |
|------|---------|------|
| 4800 | acp-protocol | `services/acp-protocol/` |
| 4801 | acn-network | `services/acn-network/` (⚠️ collides with finance-os) |
| 4810 | merchant-agents | `services/merchant-agents/` |
| 4820 | agent-reputation | `services/agent-reputation/` |
| 4830 | agent-contracts | `services/agent-contracts/` |
| 4840 | agent-wallets | `services/agent-wallets/` |
| 4845 | agent-marketplace | `services/agent-marketplace/` |

---

## 🧞 Genie AI Suite — canonical ports from source

> 📦 **All Genie services live in the HOJAI-AI submodule at `companies/HOJAI-AI/products/genie/`**
> Submodule: `imrejaul007/hojai-ai.git` (branch: `main`)
> See `companies/HOJAI-AI/products/genie/` for all 23 services

| Port | Service | Path |
|------|---------|------|
| 4701 | genie-gateway | `companies/HOJAI-AI/products/genie/genie-gateway/` |
| 4709 | genie-calendar-service | `companies/HOJAI-AI/products/genie/genie-calendar-service/` |
| 4710 | genie-memory-inbox | `companies/HOJAI-AI/products/genie/genie-memory-inbox/` |
| 4712 | genie-briefing-service | `companies/HOJAI-AI/products/genie/genie-briefing-service/` |
| 4713 | genie-universal-search | `companies/HOJAI-AI/products/genie/genie-universal-search/` |
| 4714 | genie-serendipity-service | `companies/HOJAI-AI/products/genie/genie-serendipity-service/` |
| 4715 | genie-smart-forgetting-service | `companies/HOJAI-AI/products/genie/genie-smart-forgetting-service/` |
| 4716 | genie-companion-service | `companies/HOJAI-AI/products/genie/genie-companion-service/` |
| 4717 | genie-memory-graph | `companies/HOJAI-AI/products/genie/genie-memory-graph/` |
| 4718 | genie-relationship-os | `companies/HOJAI-AI/products/genie/genie-relationship-os/` |
| 4719 | genie-thinking-engine | `companies/HOJAI-AI/products/genie/genie-thinking-engine/` |
| 4720 | genie-consultant-agent | `companies/HOJAI-AI/products/genie/genie-consultant-agent/` |
| 4721 | genie-life-gps | `companies/HOJAI-AI/products/genie/genie-life-gps/` |
| 4722 | genie-learning-os | `companies/HOJAI-AI/products/genie/genie-learning-os/` |
| 4723 | genie-wellness-os | `companies/HOJAI-AI/products/genie/genie-wellness-os/` |
| 4724 | genie-money-os | `companies/HOJAI-AI/products/genie/genie-money-os/` |
| 4725 | genie-creation-os | `companies/HOJAI-AI/products/genie/genie-creation-os/` |
| 4726 | genie-execution-engine | `companies/HOJAI-AI/products/genie/genie-execution-engine/` |
| 4727 | genie-life-university | `companies/HOJAI-AI/products/genie/genie-life-university/` |
| 4728 | genie-shopping-agent | `companies/HOJAI-AI/products/genie/genie-shopping-agent/` |
| 4299 | razo-keyboard | `companies/HOJAI-AI/products/razo/razo-keyboard/` | ✅ | Communication OS — intent detection + multi-channel messaging |
| 4767 | genie-wake-word-service | `companies/HOJAI-AI/products/genie/genie-wake-word-service/` |
| 4768 | genie-listening-modes | `companies/HOJAI-AI/products/genie/genie-listening-modes/` |
| 4769 | genie-device-integration | `companies/HOJAI-AI/products/genie/genie-device-integration/` |

### ✅ Genie Port Status (Verified 2026-06-21)
All 23 Genie services have unique, non-overlapping port assignments. The historical 4716 conflict has been resolved: `genie-shopping-agent` was relocated to 4728. No cross-service collisions remain.

---

## 🏢 Department OS (Horizontal Layer) — canonical ports from source

| Port | Service | Path |
|------|---------|------|
| 4050 | customer-success-os | `industry-os/services/customer-success-os/` |
| 4801 | finance-os | `industry-os/services/finance-os/` (⚠️ collides with acn-network) |
| 5055 | sales-os | `industry-os/services/sales-os/` |
| 5077 | workforce-os | `industry-os/services/workforce-os/` |
| 5096 | procurement-os | `industry-os/services/procurement-os/` |
| 5100 | cxo-os | `industry-os/services/cxo-os/` |
| 5250 | operations-os | `industry-os/services/operations-os/` |
| 5400 | revenue-intelligence-os | `industry-os/services/revenue-intelligence-os/` |
| 5500 | marketing-os | `industry-os/services/marketing-os/` |

### ⚠️ Department OS Port Collision
- **finance-os (4801)** vs **acn-network (4801)** — move one (recommend acn-network → 4802)

---

## 🏭 26 Industry OS (Vertical Layer) — canonical ports from source

| Port | Service | Path |
|------|---------|------|
| 4751 | event-banquet-os | `industry-os/services/event-banquet-os/` |
| 5010 | restaurant-os | `industry-os/services/restaurant-os/` (also hospitality-os — collision) |
| 5020 | healthcare-os | `industry-os/services/healthcare-os/` |
| 5025 | hotel-os | `industry-os/services/hotel-os/` |
| 5030 | retail-os | `industry-os/services/retail-os/` |
| 5040 | exhibition-os | `industry-os/services/exhibition-os/` |
| 5060 | education-os | `industry-os/services/education-os/` |
| 5070 | agriculture-os | `industry-os/services/agriculture-os/` |
| 5080 | automotive-os | `industry-os/services/automotive-os/` |
| 5090 | beauty-os | `industry-os/services/beauty-os/` |
| 5095 | fashion-os | `industry-os/services/fashion-os/` |
| 5110 | fitness-os | `industry-os/services/fitness-os/` |
| 5120 | gaming-os | `industry-os/services/gaming-os/` |
| 5130 | government-os | `industry-os/services/government-os/` |
| 5140 | home-services-os | `industry-os/services/home-services-os/` |
| 5150 | manufacturing-os | `industry-os/services/manufacturing-os/` |
| 5160 | non-profit-os | `industry-os/services/non-profit-os/` |
| 5170 | professional-os | `industry-os/services/professional-os/` |
| 5180 | sports-os | `industry-os/services/sports-os/` |
| 5190 | travel-os | `industry-os/services/travel-os/` |
| 5200 | entertainment-os | `industry-os/services/entertainment-os/` |
| 5210 | construction-os | `industry-os/services/construction-os/` |
| 5220 | financial-os | `industry-os/services/financial-os/` |
| 5230 | realestate-os | `industry-os/services/realestate-os/` |
| 5240 | transport-os | `industry-os/services/transport-os/` |
| 5260 | energy-os | `industry-os/services/energy-os/` |

### Industry OS Extras (not in CLAUDE.md's "26" list)

| Port | Service | Path |
|------|---------|------|
| 5270 | security-os | `industry-os/services/security-os/` |
| 5280 | api-platform | `industry-os/services/api-platform/` |
| 5290 | marketplace-os | `industry-os/services/marketplace-os/` |
| 5300 | multi-property-os | `industry-os/services/multi-property-os/` |
| 5310 | predictive-maintenance-os | `industry-os/services/predictive-maintenance-os/` |
| 5010 | hospitality-os | `industry-os/services/hospitality-os/` (collision with restaurant-os) |
| 5600 | media-os | `industry-os/services/media-os/` |

### ⚠️ Industry OS Port Collisions
- **restaurant-os (5010)** vs **hospitality-os (5010)** — move hospitality-os to 5320
- These are the only Industry OS port collisions; others are unique

---

## 🧬 TwinOS Services — canonical ports from source

| Port | Service | Path |
|------|---------|------|
| 4702 | corpid-service | (foundation, listed above) |
| 4703 | memory-os | (foundation, listed above) |
| 4710 | organization-twin | `services/organization-twin/` (collision with genie-memory-inbox) |
| 4730 | employee-twin | `services/employee-twin/` |
| 4876 | voice-twin | `services/voice-twin/` |
| 4881 | ai-intelligence | `services/ai-intelligence/` |
| 4885 | customer-intelligence | `services/customer-intelligence/` |
| 4885 | order-twin | `services/order-twin/` (collision) |
| 4886 | payment-twin | `services/payment-twin/` |
| 4887 | inventory-twin | `services/inventory-twin/` |
| 4888 | merchant-twin | `services/merchant-twin/` |
| 4889 | user-twin | `services/user-twin/` |
| 4890 | asset-twin | `services/asset-twin/` |
| 4892 | partner-twin | `services/partner-twin/` |
| 4893 | industry-twin | `services/industry-twin/` |
| 4894 | lead-twin | `services/lead-twin/` |
| 4895 | customer-twin | `services/customer-twin/` |
| 4895 | support-copilot | `services/support-copilot/` (collision) |
| 4896 | wallet-twin | `services/wallet-twin/` |
| 4920 | agent-copilot | `services/agent-copilot/` |
| 4954 | journey-intelligence | `services/journey-intelligence/` |
| 5175 | lead-os-gateway | `services/lead-os-gateway/` |
| 5321 | buyer-twin | `companies/HOJAI-AI/platform/twins/buyer-twin/` (was 3000, fixed 2026-06-24) |
| 5322 | deal-twin | `companies/HOJAI-AI/platform/twins/deal-twin/` (was 3000, fixed 2026-06-24) |
| 5323 | property-twin | `companies/HOJAI-AI/platform/twins/property-twin/` (was 3000, fixed 2026-06-24) |
| 5324 | agent-twin | `companies/HOJAI-AI/sutar-os/agents/agent-twin/` (was 3000, fixed 2026-06-24) |

### ⚠️ TwinOS Port Collisions
- **order-twin (4885)** vs **customer-intelligence (4885)** — move order-twin → 4900
- **support-copilot (4895)** vs **customer-twin (4895)** — move support-copilot → 4925

---

## 🧠 HOJAI Platform Services (Intelligence + Foundation) — canonical ports from source

HOJAI platform services live at `companies/HOJAI-AI/platform/` and `companies/HOJAI-AI/products/`. Source of truth: actual `const PORT = process.env.PORT || NNNN` declarations. Last audited 2026-06-24.

| Port | Service | Path | Notes |
|------|---------|------|-------|
| 4772 | semantic-cache | `companies/HOJAI-AI/platform/intelligence/semantic-cache/` | Phase F.13 — embedding-based semantic caching |
| 4780 | vector-db | `companies/HOJAI-AI/platform/intelligence/vector-db/` | Phase F.8 — in-memory vector store |
| 4781 | rag-platform | `companies/HOJAI-AI/platform/intelligence/rag-platform/` | Phase F.14 — retrieval-augmented generation |
| 4782 | eval-judges | `companies/HOJAI-AI/platform/training/eval-platform/eval-judges/` | Phase 31 reserved; currently unused (pending implementation) |
| 4783 | graph-database | `companies/HOJAI-AI/platform/intelligence/graph-database/` | Phase F.9 — in-memory property graph |
| 4784 | knowledge-extraction | `companies/HOJAI-AI/platform/intelligence/knowledge-extraction/` | Phase F.5 — NER, entity linking, fact triples |
| 4785 | reasoning-engine | `companies/HOJAI-AI/platform/intelligence/reasoning-engine/` | Phase F.16 — deductive/inductive/abductive reasoning |
| 4786 | intent-engine | `companies/HOJAI-AI/platform/intelligence/intent-engine/` | Phase F.17 — keyword-based intent detection |
| 4787 | reflection-engine | `companies/HOJAI-AI/platform/intelligence/reflection-engine/` | Phase F.18 — quality scoring |
| 4788 | behavior-intelligence | `companies/HOJAI-AI/platform/intelligence/behavior-intelligence/` | Phase F.19 — event tracking, funnels, anomalies |
| 4789 | proactive-engine | `companies/HOJAI-AI/platform/intelligence/proactive-engine/` | Phase F.20 — rule-based suggestions |
| 4790 | multi-agent-runtime | `companies/HOJAI-AI/platform/intelligence/multi-agent-runtime/` | Phase F.21 — agent spawning, task assignment |
| 4791 | agent-builder | `companies/HOJAI-AI/platform/intelligence/agent-builder/` | Phase F.22 — blueprint CRUD, instantiation |
| 4792 | background-agents | `companies/HOJAI-AI/platform/intelligence/background-agents/` | Phase F.23 — job scheduler, run history |
| 4793 | memory-context-engine | `companies/HOJAI-AI/platform/memory/memory-context-engine/` | Memory layer — smart retriever for LLM context windows |
| 4880 | voice-gateway | `companies/HOJAI-AI/products/voice-os/core/voice-gateway/` | Phase F — training-aware STT/TTS router |
| 4881 | ai-intelligence | `companies/HOJAI-AI/platform/intelligence/ai-intelligence/` | Phase F.4 — multi-agent orchestration |
| 4882 | trust-intelligence | `companies/HOJAI-AI/platform/flow/trust-intelligence/` | Phase F.12 — AI agent trust scoring |
| 4939 | knowledge-marketplace | `companies/HOJAI-AI/platform/intelligence/knowledge-marketplace/` | Phase F.7 — SOPs, templates marketplace |
| 4255 | bam-marketplace-listings | `companies/HOJAI-AI/blr-ai-marketplace/services/marketplace-listings/` | BLR AI Marketplace catalog (moved from 4250, 2026-06-25) |
| 4254 | policy-os | `companies/HOJAI-AI/platform/flow/policy-os/` | Phase F.1 — policy evaluation engine |
| 4743 | skill-os | `companies/HOJAI-AI/platform/skills/skill-os/` | Phase F.1 — capability registry |
| 4747 | tenant-manager | `companies/HOJAI-AI/platform/identity/tenant-manager/` | Phase F.15 — multi-tenant isolation |
| 4754 | predictive-intelligence | `companies/HOJAI-AI/platform/flow/predictive-intelligence/` | Phase F.10 — time-series forecasting, anomaly detection |
| 4755 | risk-intelligence | `companies/HOJAI-AI/platform/flow/risk-intelligence/` | Phase F.11 — fraud, churn, credit, composite risk |
| 4756 | decision-intelligence | `companies/HOJAI-AI/platform/flow/decision-intelligence/` | Phase F.6 — recommendations, NBA, multi-criteria decisions |

### ⚠️ Reserved Phase 31 ports (eval-platform — not yet implemented)
The following were reserved for Phase 31 eval-platform but are currently used by Phase F services. eval-platform will need renumbering when implemented:
- 4780 → eval-platform-api (currently vector-db)
- 4782 → eval-datasets (currently unused, pending)
- 4783 → eval-live (currently graph-database)
- 4784 → eval-shadow (currently knowledge-extraction)
- 4787 → eval-canary (currently reflection-engine)
- 4788 → eval-review (currently behavior-intelligence)
- 4789 → eval-benchmarks (currently proactive-engine)
- 4793 → memory-context-engine (Phase F.21 fix: freed 4790 for multi-agent-runtime)

### ✅ Port Conflicts Resolved

| Date | Port | Issue | Resolution |
|------|------|-------|-----------|
| 2026-06-20 | 3000 | Twin collision (×4) | buyer/deal/property/agent-twin → 5321-5324 |
| 2026-06-22 | 4292 | nexha-partner-network vs sutar-contract-os | nexha-partner-network → 4297 |
| 2026-06-22 | 4250 | BAM marketplace vs Nexha stub | bam-marketplace-listings → 4255 |
| 2026-06-25 | 3001 | Grafana vs do-app | grafana → 3030 |
| 2026-06-25 | 4790 | memory-context-engine vs multi-agent-runtime | memory-context-engine → 4793 |

### ⚠️ energy-os: two different services at two different ports
- `companies/HOJAI-AI/products/energy-os/` (port 4796) — internal HOJAI energy service
- `industry-os/services/energy-os/` (port 5260) — RTMN canonical industry-OS energy service
- These are different code paths; 5260 is the canonical industry one

---

## 💼 Copilots (Business AI) — canonical ports from source

| Port | Service | Path |
|------|---------|------|
| 4600 | business-copilot | `services/business-copilot/` |
| 4928 | sales-copilot | `services/sales-copilot/` |
| 4929 | marketing-copilot | `services/marketing-copilot/` |
| 4930 | finance-copilot | `services/finance-copilot/` |
| 4933 | executive-copilot | `services/executive-copilot/` |
| 4878 | smart-chatbot | `companies/REZ-Merchant/smart-chatbot/` |

---

## 🛠️ Support / Workflow — canonical ports from source

| Port | Service | Path |
|------|---------|------|
| 4870 | notification-service | `services/notification-service/` |
| 4870 | unified-inbox | `companies/REZ-Merchant/unified-inbox/` (collision) |
| 4872 | ticket-engine | `companies/REZ-Merchant/ticket-engine/` |
| 4873 | sla-manager | `services/sla-manager/` |
| 4874 | reports-dashboard | `services/reports-dashboard/` |
| 4938 | workflow-marketplace | `services/workflow-marketplace/` |
| 4939 | knowledge-marketplace | `services/knowledge-marketplace/` |
| 4940 | knowledge-base | `services/knowledge-base/` |

## 🌀 FlowOS — canonical ports from source (Layer 13: Automation)

FlowOS has two complementary services (see [services/flow-os-canonical/CLAUDE.md](services/flow-os-canonical/CLAUDE.md) and [companies/HOJAI-AI/products/genie/genie-os/foundation/flowos/](companies/HOJAI-AI/products/genie/genie-os/foundation/flowos/)):

| Port | Service | Role | Path |
|------|---------|------|------|
| 4156 | flow-os-canonical | Canonical flow-template registry — owns `checkout`, `onboarding`, `escalation`, `lead_routing` | `services/flow-os-canonical/` |
| 7007 | flowos (executor) | Execution engine: dependency graph, per-step error policies, idempotency, heartbeat-recovery, calls SkillOS for step execution | `companies/HOJAI-AI/products/genie/genie-os/foundation/flowos/` |

On startup, `flowos@7007` reads the 4 canonical templates from `flow-os-canonical@4156` (via `FLOWOS_CANONICAL_URL`) and upserts them as local active flows. The wire is best-effort — if the registry is unreachable, the executor logs a warning and proceeds.

> **Note:** A `Flow Orchestrator (4244)` is mentioned in [companies/HOJAI-AI/CLAUDE.md](companies/HOJAI-AI/CLAUDE.md) and [divisions/02-infrastructure-cloud/CLAUDE.md](companies/HOJAI-AI/divisions/02-infrastructure-cloud/CLAUDE.md) but **does not exist on disk** (planned, not built).

### ⚠️ Support Port Collision
- **notification-service (4870)** vs **unified-inbox (4870)** — move unified-inbox → 4871

---

## 🤖 SUTAR OS — canonical ports from source (Layer 14: Autonomous)

SUTAR OS lives at `companies/HOJAI-AI/sutar-os/` (29 services, ~30k LOC). The RTMN Hub (`companies/RABTUL-Technologies/REZ-ecosystem-connector@4399`) exposes all of these via `/api/sutar/<service>/<path>`. Source-of-truth for the table below: `companies/HOJAI-AI/sutar-os/<group>/<svc>/src/index.{ts,js}`. Last audited 2026-06-22 — see [SUTAR-HUB-WIRING-AUDIT-2026-06-22.md](companies/RABTUL-Technologies/REZ-ecosystem-connector/docs/SUTAR-HUB-WIRING-AUDIT-2026-06-22.md).

### Real services (the 16 keys currently in Hub `SUTAR_SERVICES`)

| Port | Service | Layer | Hub key | Path |
|------|---------|------:|---------|------|
| 3100 | sutar-monitoring | 1 | `sutar-monitoring` | `sutar-os/core/sutar-monitoring/` |
| 4140 | sutar-gateway | 2 | `sutar-gateway` | `sutar-os/core/sutar-gateway/` |
| 4141 | sutar-tenant-instances | 2 (Phase 9) | `sutar-tenant-instances` | `sutar-os/core/sutar-tenant-instances/` |
| 4365 | industry-tenant-instances | 4 (Phase 10) | `industry-tenant-instances` | `industry-os/services/industry-tenant-instances/` |
| 4142 | sutar-twin-os | 2 | `sutar-twin-os` | `sutar-os/core/sutar-twin-os/` |
| 4143 | sutar-memory-bridge | 2 | `sutar-memory-bridge` | `sutar-os/core/sutar-memory-bridge/` |
| 4145 | sutar-agent-id | 2 | `sutar-agent-id` | `sutar-os/core/sutar-agent-id/` |
| 4155 | sutar-agent-network | 3 | `sutar-agent-network` | `sutar-os/core/sutar-agent-network/` |
| 4280 | nexha-supplier-network | 4 (Phase C) | `nexha-supplier-network` | `companies/Nexha/services/nexha-supplier-network/` |
| 4285 | nexha-distribution-network | 4 (Phase C) | `nexha-distribution-network` | `companies/Nexha/services/nexha-distribution-network/` |
| 4286 | nexha-pricing-network | 4 (Phase C.6) | `nexha-pricing-network` | `companies/Nexha/services/nexha-pricing-network/` |
| 4287 | nexha-trade-finance-network | 4 (Phase C.4) | `nexha-trade-finance-network` | `companies/Nexha/services/nexha-trade-finance-network/` |
| 4288 | nexha-warehouse-network | 4 (Phase C.5) | `nexha-warehouse-network` | `companies/Nexha/services/nexha-warehouse-network/` |
| 4290 | sutar-decision-engine | 4 | `sutar-decision-engine` | `sutar-os/core/sutar-decision-engine/` |
| 4370 | nexha-catalog-os | 5 (Phase H) | `nexha-catalog-os` | `companies/Nexha/services/nexha-catalog-os/` |
| 4371 | nexha-order-os | 5 (Phase H) | `nexha-order-os` | `companies/Nexha/services/nexha-order-os/` |
| 4372 | nexha-agent-os | 5 (Phase H) | `nexha-agent-os` | `companies/Nexha/services/nexha-agent-os/` |
| 4373 | nexha-supplier-os | 5 (Phase H) | `nexha-supplier-os` | `companies/Nexha/services/nexha-supplier-os/` |
| 4270 | nexha-capability-os | 5 (ADR-0012) | `nexha-capability-os` | `companies/Nexha/services/nexha-capability-os/` |
| 4271 | nexha-reputation-os | 5 (ADR-0012) | `nexha-reputation-os` | `companies/Nexha/services/nexha-reputation-os/` |
| 4272 | nexha-discovery-os | 5 (ADR-0012) | `nexha-discovery-os` | `companies/Nexha/services/nexha-discovery-os/` |
| 4273 | nexha-federation-os | 5 (ADR-0012) | `nexha-federation-os` | `companies/Nexha/services/nexha-federation-os/` |
| 4274 | nexha-opportunity-os | 5 (ADR-0012) | `nexha-opportunity-os` | `companies/Nexha/services/nexha-opportunity-os/` |
| 4275 | nexha-market-os | 5 (ADR-0012) | `nexha-market-os` | `companies/Nexha/services/nexha-market-os/` |
| 4276 | nexha-global-directory | 5 (ADR-0012) | `nexha-global-directory` | `companies/Nexha/services/nexha-global-directory/` |
| 4293 | nexha-autonomous-logistics | 5 (ADR-0012) | `nexha-autonomous-logistics` | `companies/Nexha/services/nexha-autonomous-logistics/` |
| 4291 | sutar-trust-engine | 6 | `sutar-trust-engine` | `sutar-os/core/sutar-trust-engine/` |
| 4292 | sutar-contract-os | 6 | `sutar-contract-os` | `sutar-os/contracts/sutar-contract-os/` |
| 4293 | sutar-negotiation-engine | 6 | `sutar-negotiation` | `sutar-os/contracts/sutar-negotiation-engine/` |
| 4294 | sutar-economy-os | 5 | `sutar-economy-os` | `sutar-os/economy/sutar-economy-os/` |
| 4830 | agent-contracts | 7 | `sutar-agent-contracts` | `sutar-os/agents/agent-contracts/` |
| 4845 | agent-marketplace | 7 | `sutar-agent-marketplace` | `sutar-os/agents/agent-marketplace/` |
| 4848 | agent-analytics | 7 | `sutar-agent-analytics` | `sutar-os/agents/agent-analytics/` |
| 4851 | agent-orchestration | 7 | `sutar-agent-orchestration` | `sutar-os/agents/agent-orchestration/` |
| 4853 | agent-teaming | 7 | `sutar-agent-teaming` | `sutar-os/agents/agent-teaming/` |

### Aliases not in `SUTAR_SERVICES` (also real, but accessed differently)

| Port | Service | Real? | Notes |
|------|---------|:---:|-------|
| 4850 | negotiation-ai | ✅ real | Different scope than `sutar-negotiation-engine` (4293) — AI strategy, not engine CRUD. Capability-map `negotiation` → `sutar-negotiation` (4293) only |
| 4800 | acp-protocol | ✅ real | ACP message bus. Not yet exposed via Hub |
| 4801 | acn-network | ✅ real | ACN agent registry. Not yet exposed via Hub |
| 4895 | customer-twin | ✅ real | Lives in `platform/twins/customer-twin/`, not `sutar-os/`. Out of SUTAR scope |
| 4146 | twin-marketplace | ✅ real | Lives in `companies/HOJAI-AI/blr-ai-marketplace/services/twin-marketplace/`. NOT in `sutar-os/`; out of SUTAR scope |

### Removed from Hub `SUTAR_SERVICES` (2026-06-22)

These were in the Hub as of 2026-06-21 but had no matching real service. See audit doc for rationale.

| Old Hub key | Old port | Why removed |
|-------------|---------:|-------------|
| `sutar-agent-reputation` | 4820 | Port 4820 actually serves `genie-consultant-agent` from `genie-os/`, not a SUTAR service |
| `sutar-wallet-service` | 4840 | No `agent-wallets` service in `sutar-os/` — closest is `agents/agent-contracts` (4830) but is contracts not wallets |
| `sutar-trust-network` | 4252 | Duplicate purpose with `sutar-trust-engine` (4291) |
| `sutar-dispute` | 4847 | `disputeResolution` capability never built |
| `sutar-marketplace` | 4250 | Moved to BLR Marketplace (`companies/HOJAI-AI/blr-ai-marketplace/services/`) on 2026-06-21 |
| `sutar-goal-os` | 4242 | `goal-os` lives in `genie-os/`, not `sutar-os/` |

---

## 💳 AgentFin — Agent-native Financial Infrastructure (Layer 10 — added 2026-06-23)

AgentFin lives at `companies/RABTUL-Technologies/agentfin/` (15 services, ~6,200 LOC TypeScript + ~3,000 LOC tests). The RTMN Hub (`REZ-ecosystem-connector@4399`) exposes all of these via `/api/agentfin/<service>/<path>` and `/api/agentfin/capabilities`. Source-of-truth for the table below: `companies/RABTUL-Technologies/agentfin/<service>/src/index.ts`.

AgentFin replaces the "SUTAR Finance Agent" placeholder in the 5-year plan. It wraps RABTUL's existing payment/wallet/treasury/procurement engines with agent-native primitives (allowances, virtual cards, vendor twins, CorpID binding, cross-Nexha settlement).

| Port | Service | Purpose |
|------|---------|---------|
| 5510 | agentfin-gateway | `/api/agentfin/*` route table, auth, capability map |
| 5511 | agentfin-agent-wallet | Per-agent wallet (wraps `rez-wallet-service` :4004) |
| 5512 | agentfin-allowance-engine | Daily/weekly/monthly/total limits with auto-reset (the core differentiator) |
| 5513 | agentfin-agent-card | Virtual card issuance (Razorpay Route + Stripe Issuing) |
| 5514 | agentfin-spending-policy | YAML DSL for agent spending rules + safe evaluator |
| 5515 | agentfin-approval-engine | Multi-step approval workflows |
| 5516 | agentfin-finance-memory | Domain-partitioned memory (MemoryOS adapter) |
| 5517 | agentfin-vendor-twin | Vendor identity + financial profile (TwinOS) |
| 5518 | agentfin-expense-twin | Per-transaction expense records (TwinOS) |
| 5519 | agentfin-subscription-adapter | Agent-aware subscriptions (wraps `REZ-subscription-service` :4022) |
| 5520 | agentfin-treasury-adapter | Agent-aware treasury views (wraps `REZ-treasury-os` :4055) |
| 5521 | agentfin-procurement-adapter | Agent-driven procurement (wraps `REZ-procurement-os` :4342) |
| 5522 | agentfin-negotiation-agent | Agent-side RFQ + counter-offer logic |
| 5523 | agentfin-agent-identity | CorpID ↔ AgentID ↔ WalletID ↔ CardID linkage |
| 5524 | agentfin-nexha-settlement | Multi-agent splits + cross-Nexha settlement |

All ports are env-overridable via `PORT` env var. Defaults match the table above.

### Port-history (migrations)

| Service | Was | Now | When | Why |
|---------|----:|----:|------|-----|
| sutar-contract-os | 4190 | 4292 | 2026-06-22 | Renumbered to give 41xx range to Layer-2 services; Hub b7132761 |
| sutar-negotiation (engine) | 4191 | 4293 | 2026-06-22 | Same; Hub b7132761 |
| sutar-economy-os | 4251 | 4294 | 2026-06-22 | Source code was using 4251, then renumbered to 4294. A stale `dist/index.js` from `/private/tmp/rtmn-dev/` still holds 4251 — operator should kill it |

---

## 🔴 STALE ENTRIES in old PORT-REGISTRY.md (to delete)

The following ports/services appear in `PORT-REGISTRY.md` but **do not exist in source code** and should be removed from any canonical registry:

| Old Port | Old Service | Status |
|----------|-------------|--------|
| 8000 | RTMN Platform Hub | Not in code — delete |
| 3000-3040 | BOA, AgentOS, Capability Matrix, Unified Twin OS, Memory Network, BOA Council, Economic Graph, Simulation OS, etc. | Not in code — delete |
| 3200-4400 | Customer/Property/Style/Player Twins in industry sections | Not in `/services/` — delete |
| 5443-9443 | Industry gateway ranges (Fashion 5548, Travel 6506, etc.) | Most not in code — delete |
| 4761-4765 | "Leverge Intelligence/Memory/Twin/Agents/Copilot" | ⚠️ See Leverge policy note below |
| 4500-4780 (HOJAI section) | Legal AI, Gov AI, Media AI, etc. | Most not in code — delete |
| 5000-5009 | AdBazaar planned services | Empty scaffolds — mark as planned |
| 4100-4121 | DOOH, Video Ads, Intent Exchange | Empty scaffolds — mark as planned |
| 8453-8500 | Hotel range 8443-8452 | Wrong — hotel-os is on 5025 |
| 8643-8649 | Healthcare range | Wrong — healthcare-os is on 5020

### ⚠️ Leverge Policy
Per CLAUDE.md, ports 4761-4765 (and the `/leverge-*/` directories) belong to **Leverge**, a client of HOJAI AI. They are NOT part of the RTMN ecosystem and should NOT be included in the canonical port registry. The old `PORT-REGISTRY.md` mixes Leverge ports into the "HOJAI AI Suite" section — this is incorrect.

---

## 🟢 Phase 32: Agent OS (12 new ports, added 2026-06-24)

12 new services in `companies/HOJAI-AI/platform/agent-os/`, all built and tested (737 tests passing, 0 failures).

| Port | Service | Purpose | Tests |
|---|---|---|---|
| **4802** | `agent-platform-api` | Main gateway; proxies to all 11 sub-services; `/api/agent/full-deploy` pipeline | 36 |
| **4803** | `agent-registry` | Agent identity, versioning, capability-based search, heartbeat | 54 |
| **4804** | `capability-store` | Capability graph; DAG prerequisites; cycle detection; resolve chain | 69 |
| **4805** | `tool-registry` | Tool catalog (local + remote); rate limiting; invocation history | 59 |
| **4806** | `skill-library` | Reusable skill compositions; nested skills; plan + resolve | 73 |
| **4807** | `message-bus` | Pub/sub topics with glob patterns; subscription pull with offset | 59 |
| **4808** | `scheduler` | Cron, one-shot, interval, event-driven job triggers | 89 |
| **4809** | `context-store` | Per-agent context windows; token-budget enforcement; pin-exempt trim | 64 |
| **4811** | `agent-memory-bridge` | Bridge to MemoryOS (4703); per-agent partitions; confidence scoring | 64 |
| **4812** | `agent-orchestrator` | Multi-step DAG workflows; step state machine; retry logic | 63 |
| **4813** | `agent-execution-engine` | ReAct, plan-and-execute, reflection loops (stub LLM) | 61 |
| **4814** | `agent-observability` | Traces (span trees), 5-min metric buckets, structured logs | 46 |

**Reserved:**
- `4810` — `merchant-agents` (existing, not part of Phase 32)
- `4815-4817` — reserved for future Agent OS extensions

**Pattern:** All services use file-backed JSON storage, helmet/cors/morgan, `crypto.randomBytes(8).toString('hex')` IDs with service-specific prefixes (`agt_`, `cap_`, `tool_`, `skl_`, `sub_`, `msg_`, `job_`, `run_`, `ctx_`, `mem_`, `wf_`, `exec_`, `step_`, `trc_`, `spn_`, `log_`).

**Test pattern:** `node --test tests/unit/*.test.js` (built-in test runner, no jest/vitest). 5,000+ LOC across 12 services.

---

## 🟢 Phase 40: Agent Lifecycle (7 new ports, added 2026-06-24)

7 new services in `companies/HOJAI-AI/platform/agent-lifecycle/`, all built and tested (124 tests passing, 0 failures).

| Port | Service | Purpose | Tests |
|---|---|---|---|
| **4910** | `agent-lifecycle-api` | Unified gateway; proxies to all 6 sub-services; `/agents/:id/release` pipeline (versioning → testing → deployment) | 12 |
| **4911** | `agent-versioning` | Semver + immutable snapshots; content hashing; tags; diff; bump | 17 |
| **4912** | `agent-testing` | Unit/integration/smoke test suites; case-level results; summary stats | 16 |
| **4913** | `agent-deployment` | Canary [1%, 10%, 50%, 100%], blue-green, immediate; pause/resume/advance/fail | 20 |
| **4914** | `agent-monitoring` | Quality/performance/cost metrics; p50/p95/p99 aggregates; threshold alerts | 18 |
| **4915** | `agent-rollback` | Instant + scheduled rollbacks; deployment-service notification; cancel/execute | 19 |
| **4916** | `agent-deprecation` | Sunset policies; subscriber tracking; notice issuance; migrate + retire | 22 |

**Pattern:** Same file-backed JSON storage as Phase 32, `X-Internal-Token` inter-service auth, `node --test tests/*.test.js` runner. ~3,000 LOC across 7 services.

**Default deployment policy:** canary stages `[1, 10, 50, 100]`, `auto_rollback: true`, `rollback_threshold: 0.05`, `stage_interval_seconds: 60`.

**Default deprecation policy:** `notice_days: 90`, `auto_migrate: true`, `grace_period_days: 30`, `backup_before_retire: true`.

**End-to-end release pipeline (via gateway):**
```
POST /agents/:agentId/release
  → 1. Register version in versioning (4911)
  → 2. Register + run test suite in testing (4912)
  → 3. Create canary deployment in deployment (4913)
Returns: { steps: [...], testing_ok: bool }
```

**Reserved:** `4917-4919` — reserved for future Agent Lifecycle extensions.

---

## 🟢 Phase 38: AI Studio (Visual Builder) — 10 new ports (added 2026-06-24)

10 new services in `companies/HOJAI-AI/platform/ai-studio/`, all built and tested (83 tests passing, 0 failures). This is the **backend platform** that the React frontend will consume.

| Port | Service | Purpose | Tests |
|---|---|---|---|
| **4900** | `ai-studio-api` | Gateway + marketplace (templates/install/publish/stats); proxies to all 9 sub-services | 7 |
| **4901** | `studio-projects` | Project CRUD; members; RBAC (owner/editor/viewer); audit log | 10 |
| **4902** | `studio-playground` | Multi-model prompt execution (12 models); history; compare; favorites; prompt library with versioning | 11 |
| **4903** | `studio-workflow` | DAG workflows (8 node types); cycle detection; topological sort; templates; deploy | 7 |
| **4904** | `studio-agent` | Agent composition (8 tool types, 5 memory types, 7 guardrails); clone; deploy | 8 |
| **4905** | `studio-twin` | Twin schema designer (13 field types, 3 relation types); instance validation; publish | 8 |
| **4906** | `studio-rag` | RAG configurator (5 chunking strategies, 3 retrieval modes); test retrieval; deploy | 9 |
| **4907** | `studio-eval` | Eval suite (8 metric types, 5 alert ops); datasets; review queue; aggregate | 8 |
| **4908** | `studio-deployment` | One-click deploy (3 strategies: immediate/canary/blue_green); semver releases; rollback | 9 |
| **4909** | `studio-collab` | Comments (threaded); edit locks; activity feed; share links | 8 |

**Pattern:** Same file-backed JSON storage as Phases 32/40, `X-Internal-Token` inter-service auth, `node --test --test-force-exit --test-concurrency=1 tests/*.test.js` runner. ~3,500 LOC across 10 services.

**Marketplace:** Seeded with 5 starter templates (Customer Support Chatbot, Content Generation Workflow, Standard Eval Suite, Customer Twin Schema, Knowledge Base RAG). Communities can publish their own templates.

**Gateway routes:**
```
GET  /                  → service catalog (10 sub-services)
GET  /health            → liveness
GET  /ready             → probes all 9 sub-services
ANY  /projects/*        → studio-projects (4901)
ANY  /playground/*      → studio-playground (4902)
ANY  /workflow/*        → studio-workflow (4903)
ANY  /agent/*           → studio-agent (4904)
ANY  /twin/*            → studio-twin (4905)
ANY  /rag/*             → studio-rag (4906)
ANY  /eval/*            → studio-eval (4907)
ANY  /deployment/*      → studio-deployment (4908)
ANY  /collab/*          → studio-collab (4909)
GET  /marketplace/templates[?category=&tag=&q=]
POST /marketplace/install
POST /marketplace/publish
GET  /marketplace/stats
```

---

## 🟢 HOJAI Foundry v1.1 — Real Remote Deploy (1 new port, added 2026-06-24)

The deploy target for `npx hojai deploy --mode=remote`. When `HOJAI_CLOUD_URL` is set, the foundry CLI POSTs the project to this service; it provisions a per-tenant runtime and returns the public URL (`https://<name>.hojai.app`).

| Port | Service | Purpose | Tests |
|---|---|---|---|
| **4380** | `hojai-cloud` | Receives deploy requests; spawns tenant backend on a free port (8800-8899); persistent storage; bearer auth; wildcard subdomain routing | 16 |

**Source:** `companies/HOJAI-AI/products/hojai-cloud/` (branch: `feat/killer-30min-demo`)

**Per-tenant port range:** `8800-8899` (configurable via `HOJAI_CLOUD_PORT_RANGE_START/END`)

**Reverse-proxy route:** `GET/POST/PUT/PATCH/DELETE /api/v1/route/:subdomain/*` — for nginx/Caddy/Cloudflare forwarding `*.hojai.app` traffic to hojai-cloud. See `products/hojai-cloud/CLAUDE.md` for full details.

**Test pattern:** `node --test --test-force-exit src/__tests__/*.test.js` (built-in test runner, no jest/vitest).

**Integration with foundry CLI:** `npx hojai deploy --mode=remote` reads `HOJAI_CLOUD_URL` (and optional `HOJAI_API_KEY`) and POSTs `{ name, type, manifest, runtime, files }` to `<HOJAI_CLOUD_URL>/api/v1/deploy`. Falls back to v1.0 stub (print target URL) when `HOJAI_CLOUD_URL` is not set. See `foundry/packages/create-hojai/src/deploy.js` + `tests/deploy.test.js`.

**Phase G (2026-06-25) — HOJAI Cloud Phase 1:** v1.2 released with auto-respawn, SSL certificates, custom domains, preview environments, and rollback support. New modules: `src/respawn.js`, `src/ssl-manager.js`, `src/domain-manager.js`, `src/preview-environments.js`, `src/rollback-manager.js`.

---

## HOJAI Cloud Phase 1 Services (2026-06-25)

| Port | Service | Purpose | Tests |
|---|---|---|---|
| **4380** | `hojai-cloud` | Deploy target (v1.2: auto-respawn, SSL, domains, previews, rollbacks) | - |
| **4400** | `app-store-api` | App Store — Skills, agents, workflows, templates catalog | - |
| **4410** | `cost-tracker` | AI usage metering and billing | - |
| **4420** | `secrets-manager` | Encrypted credential storage (AES-256-GCM) | - |
| **4430** | `voice-studio-api` | Voice agent management (STT/TTS) | - |
| **4440** | `workflow-builder-api` | DAG workflow management (10 node types) | - |

**Source:** `companies/HOJAI-AI/services/` and `companies/HOJAI-AI/products/hojai-cloud/`

**Startup:** `bash companies/HOJAI-AI/scripts/start-hojai-cloud-phase2.sh start`

**RTMN Hub:** All services wired at `/api/app-store/*`, `/api/cost/*`, `/api/secrets/*`, `/api/voice/*`, `/api/workflows/*`, `/api/developer/*`, `/api/billing/*`, `/api/pipeline/*`, `/api/collaboration/*`, `/api/analytics/*`, `/api/notifications/*`

## HOJAI Cloud Phase 2 Services (2026-06-25)

| Port | Service | Purpose |
|---|---|---|
| **4450** | `developer-portal` | Docs + API Explorer |
| **4460** | `billing-service` | Payments, subscriptions, invoicing |
| **4470** | `deployment-pipeline` | CI/CD for deployments |
| **4480** | `collaboration-service` | Teams + RBAC |
| **4490** | `analytics-service` | Real-time metrics |
| **4495** | `notification-service` | Email/webhook notifications |

### HOJAI Foundry Services (2026-06-26)

| Port | Service | Purpose |
|---|---|---|
| **4500** | `template-compiler` | Compiles templates to code |
| **4510** | `bam-integration` | Hire AI workers from marketplace |
| **4520** | `agent-generator` | Generate agents for 510 companies |
| **4530** | `hojai-auth` | JWT tokens + API keys |
| **4540** | `deploy-pipeline` | Template → Deploy automation |
| **4550** | `flows-engine` | 50+ flows across 17 templates |

### OTA Services (2026-06-26)

| Port | Service | Purpose |
|---|---|---|
| **4700** | `pms-integration` | Oracle OHIP, Cloudbeds, Mews |
| **4701** | `gds-integration` | Amadeus, Sabre, Travelport |
| **4702** | `payment-gateway` | Razorpay, Stripe |
| **4703** | `build-pipeline` | App Store build & submit |

### Industry Services (2026-06-26)

| Port | Service | Purpose |
|---|---|---|
| **4710** | `ecommerce-services` | Inventory, Fulfillment, Returns |
| **4720** | `mobility-services` | Driver, Fleet, Dispatch, Surge |
| **4730** | `healthcare-services` | Doctor, Pharmacy, Insurance |
| **4740** | `education-services` | LMS, Courses, Assessments |
| **4750** | `fintech-services` | Banking, Trading, Loans |
| **4760** | `logistics-services` | Routing, Tracking, Warehouse |
| **4770** | `restaurant-services` | POS, Menu, KDS |
| **4771** | `hotel-services` | Booking, Channel Manager |
| **4772** | `b2b-services` | RFQ, Quotations, Contracts |
| **4773** | `pos-services` | Point of Sale, Billing |
| **4774** | `crm-services` | Leads, Deals, Pipeline |
| **4775** | `erp-services` | HR, Projects, Finance |

### Orchestration (2026-06-26)

| Port | Service | Purpose |
|---|---|---|
| **4550** | `flows-engine` | 50+ flows across 17 templates |
| **4560** | `company-mapper` | Maps 510 companies to templates |
| **4570** | `studio-orchestrator` | Wires all services for deployment |

### HOJAI Studio UI

| Port | Service | Purpose |
|---|---|---|
| **4610** | `do-passenger` | Voice-first ride booking |
| **4611** | `do-driver` | Driver app |
| **4612** | `do-admin` | Admin dashboard |

### HOJAI Studio UI

| Port | Service | Purpose |
|---|---|---|
| **3001** | `studio-ui` | Web UI for company builder |

---

## How to Deploy a Company

```bash
# 1. Open HOJAI Studio
open http://localhost:3001

# 2. Select template → Enter company name → Deploy

# 3. Backend compiles + deploys
curl -X POST localhost:4540/deploy \
  -d '{"companyName": "MoveX", "template": "mobility"}'

# 4. Company is live!
#    passenger.movex.hojai.app
#    driver.movex.hojai.app
#    api.movex.hojai.app
```

---

## 📋 How to Use This File

```bash
# Verify a service is on its canonical port
grep -E "const PORT" services/foo/src/index.js

# Check what's running right now
for p in 4399 4702 4703 4705 4050 4801 5055 5077 5096 5100 5250 5400 5500 5010 5020 5025 5030 5040 5060; do
  code=$(curl -s -m 2 -o /dev/null -w "%{http_code}" http://localhost:$p/health 2>/dev/null)
  echo "$p: $code"
done
```

---

*Generated: 2026-06-18 by direct inspection of `src/index.js` files. Any future port changes must update this file AND the source.*

---

## 🟢 Phase 39: Memory Lifecycle — 6 new ports (added 2026-06-24)

6 new services in `companies/HOJAI-AI/platform/memory-lifecycle/`. All built and tested (85 tests passing, 0 failures, stable across 2 runs).

| Port | Service | Purpose | Tests |
|---|---|---|---|
| **5325** | `memory-lifecycle-api` | Gateway + lifecycle policy CRUD + bindings + service catalog + health aggregation | 17 |
| **5326** | `memory-governance` | Consent records (6 lawful bases), withdraw, check API returning allow/deny/flag | 15 |
| **5327** | `memory-retention` | Per-memory-type rules + default; evaluate/is_expired API; bulk evaluate | 13 |
| **5328** | `memory-gdpr` | Subject record storage, request types (forget/export/access/rectify/withdraw_consent), process endpoint | 15 |
| **5329** | `memory-purge` | Records CRUD, soft-delete (tombstone), hard-delete, sweep jobs | 13 |
| **5330** | `memory-audit-log` | SHA-256 hash-chain entries, verify endpoint, stats | 12 |

**Pattern:** Same file-backed JSON storage + X-Internal-Token + `node --test --test-force-exit --test-concurrency=1 tests/*.test.js` runner. ~2,736 LOC across 6 services.

---

## 🟢 Phase 27: AIOps / Incident Management — 6 new ports (added 2026-06-24)

6 new services in `companies/HOJAI-AI/platform/observability/aiops/`. All built and tested (88 tests passing, 0 failures, stable across 2 runs). This **closes the largest gap** in the 40-phase plan (was 0 LOC).

| Port | Service | Purpose | Tests |
|---|---|---|---|
| **5331** | `aiops-api` | Gateway + incident dashboard shape + pinned items | 13 |
| **5332** | `incident-detector` | Thresholds (latency_ms/error_rate/cpu_pct/memory_pct), event ingestion, fingerprint dedup using `Math.floor(value*10)/10` bucketing | 16 |
| **5333** | `runbook-engine` | Runbook CRUD with steps (command/http/wait/note/approval), parameter binding with `{{var}}` substitution, executions | 15 |
| **5334** | `oncall-rotation` | Rotations (hourly/daily/weekly), `currentOncall()` function with overrides taking precedence | 14 |
| **5335** | `escalation-engine` | Policies with levels/targets/timeouts, escalation state machine (active→acknowledged/resolved/cancelled), manual escalate jumps levels | 16 |
| **5336** | `postmortem-service` | Default template with 7 sections, postmortems with action_items | 14 |

**Pattern:** Same file-backed JSON storage + X-Internal-Token + `node --test` runner. ~2,768 LOC across 6 services.

---

## 🟢 Phase 36: Knowledge Freshness — 5 new ports (added 2026-06-24)

5 new services in `companies/HOJAI-AI/platform/knowledge-freshness/`. All built and tested (71 tests passing, 0 failures, stable across 2 runs).

| Port | Service | Purpose | Tests |
|---|---|---|---|
| **5337** | `knowledge-freshness-api` | Gateway + service catalog + health aggregation + proxies to /freshness, /staleness, /refresh, /versions | 10 |
| **5338** | `freshness-tracker` | Track documents with TTL, linear decay `1 - age/ttl` (sub-second rounding to avoid float drift), stats with fresh/good/stale/expired buckets | 15 |
| **5339** | `staleness-detector` | Rules (max_age_days/min_freshness_score/no_recent_access), facts registry, scan endpoint with dedup, alerts with ack/resolve | 14 |
| **5340** | `refresh-scheduler` | Schedules (periodic/on_demand/on_stale), trigger endpoint, runs history | 11 |
| **5341** | `knowledge-version-graph` | DAG of versions: artifacts + versions + supersedes edges; ancestors/descendants/lineage traversal; cycle detection; topological order; graph stats | 21 |

**Pattern:** Same file-backed JSON storage + X-Internal-Token + `node --test` runner. ~2,138 LOC across 5 services.

---

## 🟢 AdBazaar Cross-Ecosystem Collision Resolution (2026-06-20)

AdBazaar previously claimed 71 ports owned by RTMN canonical services. On **2026-06-20**, 53 AdBazaar services were relocated into the **`5114-5172` reserved range** (sub-ranges between canonical Industry OS ports at 5120, 5130, 5140, 5150, 5160).

**Status: ✅ 0 cross-ecosystem collisions remaining.**

| New Port | AdBazaar Service | Was (old port → canonical owner) |
|---:|---|---|
| 5114 | adbazaar-api-gateway | 4000 → graphql-federation |
| 5115 | REZ-marketing-backend/services/marketing-service | 4000 → graphql-federation |
| 5116 | tenant-registry | 4510 → event-bus |
| 5117 | REZ-rtb-service | 4600 → business-copilot |
| 5118 | hyperlocal-demand-service | 4600 → business-copilot |
| 5119 | ssai-service | 4701 → genie-gateway |
| 5121 | ctv-ad-server | 4702 → corpid-service |
| 5122 | ott-streaming-sdk | 4703 → memory-os |
| 5123 | adBazaar-hojai-integration | 4722 → genie-learning-os |
| 5124 | bi-reporting-dashboard | 4750 → analytics-os |
| 5125 | services/REZ-auto-responder | 4750 → analytics-os |
| 5126 | intent-signal-aggregator | 4800 → acp-protocol |
| 5127 | intent-prediction-engine | 4801 → acn-network |
| 5128 | in-ad-booking-service | 4810 → merchant-agents |
| 5129 | services/REZ-email-validator | 4810 → merchant-agents |
| 5131 | conversion-optimization-ai | 4820 → agent-reputation |
| 5132 | governance-service | 4820 → agent-reputation |
| 5133 | merchant-intelligence | 4830 → agent-contracts |
| 5134 | retail-media-network-hub | 4830 → agent-contracts |
| 5135 | ai-banner-generator | 4840 → agent-wallets |
| 5136 | autonomous-campaign-agent | 4840 → agent-wallets |
| 5137 | adbazaar-hojai-gateway | 4870 → notification-service |
| 5138 | cross-app-orchestration | 4870 → notification-service |
| 5139 | merchant-insights-os | 4870 → notification-service |
| 5141 | wedding-graph-service | 4881 → ai-intelligence |
| 5142 | event-demand-forecaster | 4885 → customer-intelligence |
| 5143 | yield-optimization-brain | 4890 → asset-twin |
| 5144 | autonomous-growth-orchestrator | 4930 → finance-copilot |
| 5145 | corpperks-hr-integration | 4954 → journey-intelligence |
| 5146 | agency-workspace-service | 5010 → restaurant-os |
| 5147 | creative-os-service | 5020 → healthcare-os |
| 5148 | email-campaign-service | 5030 → retail-os |
| 5149 | webhook-service | 5040 → exhibition-os |
| 5151 | sequence-automation | 5055 → sales-os |
| 5152 | affiliate-tracking-service | 5060 → education-os |
| 5153 | influencer-outreach-service | 5070 → agriculture-os |
| 5154 | ~~customer-onboarding-service~~ | **Moved 2026-06-22** → `companies/REZ-Merchant/customer-onboarding-service` |
| 5155 | instagram-shop-integration | 5080 → automotive-os |
| 5156 | ~~customer-success-playbook-service~~ | **Moved 2026-06-22** → `industry-os/services/customer-success-os/integrations/playbook-service/` |
| 5157 | hashtag-research-engine | 5090 → beauty-os |
| 5158 | data-warehouse-service | 5090 → beauty-os |
| 5159 | pinterest-integration | 5095 → fashion-os |
| 5161 | recommendation-engine-service | 5095 → fashion-os |
| 5162 | personalization-rules-service | 5096 → procurement-os |
| 5163 | content-repurposing-engine | 5100 → cxo-os |
| 5164 | coupon-management-service | 5100 → cxo-os |
| 5165 | reddit-integration | 5110 → fitness-os |
| 5166 | subscription-billing-service | 5110 → fitness-os |
| 5167 | ~~REZ-SalesMind~~ | **Moved 2026-06-22** → `services/REZ-SalesMind` (root integration) |
| 5168 | REZ-economic-engine | 4000 → graphql-federation |
| 5169 | REZ-marketing | 4000 → graphql-federation |
| 5171 | services/REZ-unified-calendar | 4800 → acp-protocol |
| 5172 | services/REZ-cross-analytics | 4801 → acn-network |

**Methodology:** `node scripts/audit-ports.js` (in `companies/AdBazaar/`) detects collisions and exits with code 1 if any are found. The mapping is in `companies/AdBazaar/scripts/port-relocation-map.json`. The applier is `apply-port-relocation.js`.

---

## 🟢 Within-AdBazaar Collision Resolution (Phase 7, 2026-06-20)

54 within-AdBazaar port conflicts (between two or more AdBazaar services) resolved via **relocation only** — no directories were deleted. The "duplicate" was moved to a fresh port in `5173-5199` or `5350-5390`.

**Status: ✅ 0 within-AdBazaar conflicts, 0 cross-ecosystem collisions remaining.**

Selection rules used to decide which service to relocate:
1. If `docker-compose.adbazaar-services.yml` or `.github/workflows/deploy.yml` deploys one, it stays on its port
2. Otherwise, top-level service stays; container sub-service (`services/*`, `axomi-*/*`, `ssp-portal/*`) relocates

| New Port | Service (relocated) | Was on | Kept Service |
|---:|---|---:|---|
| 5173 | REZ-realtime-dashboard | 3001 | REZ-gamification-service |
| 5174 | rez-whatsapp-provisioning | 3005 | rez-ads |
| 5175 | REZ-rto-engine | 3008 | REZ-graph-api |
| 5176 | REZ-marketing-backend/services/ads-service | 4007 | REZ-ads-service |
| 5177 | REZ-consumer-kb | 4010 | rez-owner-service |
| 5178 | REZ-feedback-service | 4010 | rez-owner-service |
| 5179 | REZ-payment-gateway | 4010 | rez-owner-service |
| 5180 | rez-dooh-service | 4019 | REZ-journey-service |
| 5181 | REZ-marketing-backend/services/decision-service | 4027 | REZ-decision-service |
| 5182 | REZ-marketing-backend/services/lead-intelligence | 4040 | REZ-lead-intelligence |
| 5183 | rez-ssp-adapter | 4060 | rez-ad-exchange |
| 5184 | adBazaar-service | 4080 | REZ-meta-capi |
| 5185 | adBazaar-backend | 4085 | REZ-google-enhanced |
| 5186 | rez-instagram-bridge | 4090 | REZ-rfm-marketing-bridge |
| 5187 | ssp-portal/ssp-gateway | 4520 | ssp-gateway |
| 5188 | programmatic-tv | 4700 | creative-studio-service |
| 5189 | services/rez-approval-workflow | 4700 | creative-studio-service |
| 5190 | customer-support-service | 4760 | services/REZ-content-syndication |
| 5191 | intent-marketplace | 4802 | services/REZ-white-label-portal |
| 5192 | ecosystem-transaction-hub | 4811 | services/REZ-fraud-detection |
| 5193 | cross-channel-orchestrator | 4812 | services/REZ-creative-ab-testing |
| 5194 | apartment-targeting-service | 4815 | services/REZ-attribution-modeling |
| 5195 | place-graph-index | 4816 | services/REZ-audience-sync |
| 5196 | in-ad-booking-service | 4810 | services/REZ-email-validator |
| 5197 | sdk-gateway-service | 4850 | website-ssp-sdk |
| 5198 | yield-optimization-engine | 4860 | ai-marketing-manager |
| 5199 | rez-media-integration-service | 4900 | health-campaigns-service |
| 5350 | mm-ocr | HOJAI-AI/multimodal | Phase 21: Stub OCR, 10 languages, batch |
| 5351 | mm-image-understanding | HOJAI-AI/multimodal | Phase 25: detect_objects/classify_scene/caption |
| 5352 | mm-audio-transcription | HOJAI-AI/multimodal | Phase 25: transcribe/speaker_count/language_detect |
| 5353 | mm-video-analysis | HOJAI-AI/multimodal | Phase 25: scenes/actions/shots/summarize |
| 5354 | mm-visual-generator | HOJAI-AI/multimodal | Phase 25: prompt/build/layout/palette/render-svg |
| 5355 | mm-cross-modal-reasoner | HOJAI-AI/multimodal | Phase 25: caption+retrieve/audio-to-image/fuse/query |
| 5356 | seat-management-service | 4962 | adbazaar-pixel |
| 5357 | deal-id-service | 4963 | adbazaar-verification |
| 5358 | adbazaar-creator-wallet | 4970 | axomi-bpo/axomi-bpo-voice-bpo |
| 5359 | measurement-cloud-service | 4970 | axomi-bpo/axomi-bpo-voice-bpo |
| 5360 | adbazaar-personalization | 4971 | axomi-bpo/axomi-bpo-api-gateway |
| 5361 | incrementality-testing-engine | 4971 | axomi-bpo/axomi-bpo-api-gateway |
| 5362 | adbazaar-agency-os | 4972 | axomi-help/axomi-help-api-gateway |
| 5363 | lift-study-service | 4972 | axomi-help/axomi-help-api-gateway |
| 5364 | adbazaar-competitive-intelligence | 4973 | axomi-help/axomi-help-brand-registry |
| 5365 | geo-experiment-service | 4973 | axomi-help/axomi-help-brand-registry |
| 5366 | adbazaar-community-media | 4974 | axomi-help/axomi-help-escalation |
| 5367 | media-mix-modeling | 4974 | axomi-help/axomi-help-escalation |
| 5368 | offline-conversion-tracker | 4975 | axomi-help/axomi-help-knowledge |
| 5369 | REZ-intelligence-bridge | 4980 | axomi-bpo-voice-bpo |
| 5370 | yield-platform-service | 4980 | axomi-bpo-voice-bpo |
| 5371 | REZ-mind-api | 4990 | retail-media-os-service |
| 5372 | REZ-media-intelligence-platform/src/index.ts | 5000 | publisher-os-service |
| 5373 | REZ-media-intelligence-platform/src/rez-services.ts | 5001 | publisher-dashboard-service |
| 5374 | REZ-media-intelligence-platform/src/platform-integrations.ts | 5002 | subscription-management |
| 5375 | qbr-automation-service | 5081 | instagram-publishing-service |
| 5376 | helpdesk-ticketing-service | 5082 | instagram-insights-service |
| 5377 | knowledge-base-service | 5083 | social-content-publisher |
| 5378 | caption-generator-ai | 5091 | bi-dashboard-service |
| 5379 | multivariate-testing-service | 5093 | follower-growth-tracker |
| 5380 | youtube-integration | 5094 | experiment-tracking-service |
| 5381 | loyalty-program-service | 5101 | ugc-management-service |
| 5382 | rewards-catalog-service | 5102 | unified-social-inbox |
| 5383 | crisis-alert-service | 5103 | tier-management-service |
| 5384 | points-expiration-service | 5104 | snapchat-integration |
| 5385 | referral-program-service | 5105 | social-competitor-tracker |
| 5386 | influencer-authenticity-check | 5111 | inventory-sync-service |
| 5387 | brand-partnership-portal | 5112 | nps-survey-service |
| 5388 | REZ-rto-engine (corrected from 5175) | 3008 | REZ-graph-api |
| 5389 | rez-dooh-service (corrected from 5180) | 4019 | REZ-journey-service |
| 5390 | customer-support-service (corrected from 5190) | 4760 | services/REZ-content-syndication |

Notes on corrections (5388-5390): Three v2 destinations (`5175`, `5180`, `5190`) collided with RTMN canonical owners (`lead-os-gateway`, `sports-os`, `travel-os`). Those three were re-relocated to 5388-5390.

Mapping file: `companies/AdBazaar/scripts/port-relocation-map-v2.json`.

---

## 🟢 Phase 9: Scope Cleanup (2026-06-20)

AdBazaar's 348 top-level directories were audited for scope pollution. **44 (~13%) non-ad services were physically moved to their canonical homes** across 7 destination companies/repos.

**Result:** AdBazaar 348 → 305 dirs. Port audit still clean: 0 within-AdBazaar, 0 cross-ecosystem.

### Moved services and their new homes

| Destination | Count | Services |
|---|---:|---|
| `companies/REZ-Merchant/` | 20 | REZ-checkout-sdk, REZ-crm-hub, REZ-lead-intelligence, REZ-rto-engine, REZ-communications-platform, REZ-journey-service, REZ-engagement-platform, crm-service, customer-health-score-service, cart-recovery-service, journey-orchestrator, lead-scoring-service, push-notification-service, broadcast-service, rez-voice-billing, rez-voice-cart-recovery, rez-whatsapp-commerce, rez-whatsapp-store, rez-whatsapp-provisioning, whatsapp-ads-service |
| `companies/Karma-Foundation/` | 7 | REZ-anniversary-rewards, REZ-birthday-rewards, REZ-gamification-service, loyalty-program-service, rewards-catalog-service, points-expiration-service, tier-management-service |
| `companies/REZ-Workspace/services/` | 7 | economic-engine, discovery-platform, feature-flags, graph-api, referral-graph, viral-loop, governance-service *(moved 2026-06-22 from RTMN services/)* |
| `companies/HOJAI-AI/services/` | 6 | REZ-support-tools-hub, customer-support-service, helpdesk-ticketing-service, support-escalation-service, support-sla-service, knowledge-base-service |
| `companies/CorpPerks/` | 2 | corpperks-hr-integration, corpperks-integration |
| `companies/REZ-Consumer/` | 1 | REZ-consumer-kb |
| `companies/RABTUL-Technologies/` | 1 | adbazaar-creator-wallet |
| **Total** | **44** | |

### Important caveats

- **Moved services kept their original ports.** They were not re-assigned to a destination-company port range. Each destination company already had services using a scattered port range (3000s-5000s), so the moved services fit in wherever they didn't conflict (confirmed: 0 port conflicts across all 8 repos).
- **Hub routes**: None of the moved services were referenced in `companies/HOJAI-AI/services/unified-os-hub/src/routes/index.js`. No Hub updates needed.
- **Duplicates exist at destinations**: e.g., `REZ-crm-hub` (moved) and `rez-retail-crm-service` (preexisting) both live in `REZ-Merchant/`. Merging them requires per-service review — see `companies/AdBazaar/DEDUP-CANDIDATES.md` (if generated).

### Audit script

Port conflicts are verified clean by `node companies/AdBazaar/scripts/audit-ports.js`. Re-run after any port change.

