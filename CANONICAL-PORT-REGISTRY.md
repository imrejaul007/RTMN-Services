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
| 4702 | corpid-service | `services/corpid-service/` | ✅ 200 |
| 4703 | memory-os | `companies/HOJAI-AI/platform/memory/memory-os/` | ✅ 200 |
| 4152 | memory-confidence | `companies/HOJAI-AI/platform/memory/memory-confidence/` | ✅ 200 |
| 4704 | twin-memory-bridge | `companies/HOJAI-AI/platform/twins/twin-memory-bridge/` | ✅ 200 |
| 4790 | memory-context-engine | `companies/HOJAI-AI/platform/memory/memory-context-engine/` | ✅ 200 |
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
| 4702 | corpid-service | `services/corpid-service/` |
| 4703 | memory-os | `companies/HOJAI-AI/platform/memory/memory-os/` |
| 4152 | memory-confidence | `companies/HOJAI-AI/platform/memory/memory-confidence/` |
| 4704 | twin-memory-bridge | `companies/HOJAI-AI/platform/twins/twin-memory-bridge/` |
| 4790 | memory-context-engine | `companies/HOJAI-AI/platform/memory/memory-context-engine/` |
| 4705 | twinos-hub | `services/twinos-hub/` |
| 4000 | graphql-federation | `services/graphql-federation/` |
| 4750 | analytics-os | `services/analytics-os/` |

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

### ⚠️ TwinOS Port Collisions
- **order-twin (4885)** vs **customer-intelligence (4885)** — move order-twin → 4900
- **support-copilot (4895)** vs **customer-twin (4895)** — move support-copilot → 4925

---

## 💼 Copilots (Business AI) — canonical ports from source

| Port | Service | Path |
|------|---------|------|
| 4600 | business-copilot | `services/business-copilot/` |
| 4928 | sales-copilot | `services/sales-copilot/` |
| 4929 | marketing-copilot | `services/marketing-copilot/` |
| 4930 | finance-copilot | `services/finance-copilot/` |
| 4933 | executive-copilot | `services/executive-copilot/` |
| 4878 | smart-chatbot | `services/smart-chatbot/` |

---

## 🛠️ Support / Workflow — canonical ports from source

| Port | Service | Path |
|------|---------|------|
| 4870 | notification-service | `services/notification-service/` |
| 4870 | unified-inbox | `services/unified-inbox/` (collision) |
| 4872 | ticket-engine | `services/ticket-engine/` |
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
| 4142 | sutar-twin-os | 2 | `sutar-twin-os` | `sutar-os/core/sutar-twin-os/` |
| 4143 | sutar-memory-bridge | 2 | `sutar-memory-bridge` | `sutar-os/core/sutar-memory-bridge/` |
| 4145 | sutar-agent-id | 2 | `sutar-agent-id` | `sutar-os/core/sutar-agent-id/` |
| 4155 | sutar-agent-network | 3 | `sutar-agent-network` | `sutar-os/core/sutar-agent-network/` |
| 4280 | sutar-supplier-registry | 4 (Phase C) | `sutar-supplier-registry` (Nexha alias) | `sutar-os/core/sutar-supplier-registry/` |
| 4285 | sutar-logistics | 4 (Phase C) | `sutar-logistics` (Nexha alias) | `sutar-os/core/sutar-logistics/` |
| 4288 | sutar-warehouse-network | 4 (Phase C.5) | `sutar-warehouse-network` (Nexha alias) | `sutar-os/core/sutar-warehouse-network/` |
| 4290 | sutar-decision-engine | 4 | `sutar-decision-engine` | `sutar-os/core/sutar-decision-engine/` |
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
| 4155 | twin-marketplace | ⚠️ not in sutar-os | Listed in `PORT-REGISTRY.md` but no source. Possibly confused with `sutar-agent-marketplace` (4845) |

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
| 5154 | customer-onboarding-service | 5077 → workforce-os |
| 5155 | instagram-shop-integration | 5080 → automotive-os |
| 5156 | customer-success-playbook-service | 5080 → automotive-os |
| 5157 | hashtag-research-engine | 5090 → beauty-os |
| 5158 | data-warehouse-service | 5090 → beauty-os |
| 5159 | pinterest-integration | 5095 → fashion-os |
| 5161 | recommendation-engine-service | 5095 → fashion-os |
| 5162 | personalization-rules-service | 5096 → procurement-os |
| 5163 | content-repurposing-engine | 5100 → cxo-os |
| 5164 | coupon-management-service | 5100 → cxo-os |
| 5165 | reddit-integration | 5110 → fitness-os |
| 5166 | subscription-billing-service | 5110 → fitness-os |
| 5167 | REZ-SalesMind | 5170 → professional-os |
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
| 5350 | data-clean-room-service | 4950 | REZ-ads-api |
| 5351 | privacy-preserving-compute | 4951 | airzy-travel-integration |
| 5352 | stayown-hotel-integration | 4952 | identity-matching-engine |
| 5353 | openrtb-exchange-service | 4960 | adbazaar-marketing-os |
| 5354 | auction-engine-service | 4961 | adbazaar-cdp |
| 5355 | REZ-pixel | 4962 | adbazaar-pixel |
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
| `/services/` (RTMN-Group) | 7 | REZ-discovery-platform, REZ-economic-engine, REZ-feature-flags, REZ-graph-api, REZ-referral-graph, rez-viral-loop, governance-service |
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

