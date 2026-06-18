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
| 4703 | memory-os | `services/memory-os/` | ✅ 200 |
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
| 4703 | memory-os | `services/memory-os/` |
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

| Port | Service | Path |
|------|---------|------|
| 4701 | genie-gateway | `services/genie-gateway/` |
| 4709 | genie-calendar-service | `services/genie-calendar-service/` |
| 4710 | genie-memory-inbox | `services/genie-memory-inbox/` |
| 4712 | genie-briefing-service | `services/genie-briefing-service/` |
| 4713 | genie-universal-search | `services/genie-universal-search/` |
| 4714 | genie-serendipity-service | `services/genie-serendipity-service/` |
| 4715 | genie-smart-forgetting-service | `services/genie-smart-forgetting-service/` |
| 4717 | genie-memory-graph | `services/genie-memory-graph/` |
| 4719 | genie-thinking-engine | `services/genie-thinking-engine/` |
| 4721 | genie-life-gps | `services/genie-life-gps/` |
| 4722 | genie-learning-os | `services/genie-learning-os/` |
| 4723 | genie-wellness-os | `services/genie-wellness-os/` |
| 4724 | genie-money-os | `services/genie-money-os/` |
| 4725 | genie-creation-os | `services/genie-creation-os/` |
| 4726 | genie-execution-engine | `services/genie-execution-engine/` |
| 4727 | genie-life-university | `services/genie-life-university/` |
| 4767 | genie-wake-word-service | `services/genie-wake-word-service/` |
| 4768 | genie-listening-modes | `services/genie-listening-modes/` |
| 4769 | genie-device-integration | `services/genie-device-integration/` |

### ⚠️ Genie Port Collisions to Resolve
Multiple services in `/services/` declare the same default port. These need fixing before they can run simultaneously:

| Port | Conflict | Action |
|------|----------|--------|
| 4716 | genie-companion-service vs genie-shopping-agent | Assign 4716 to one, move other |
| 4720 | genie-consultant-agent vs product-twin | Reassign product-twin to 4905 |
| 4725 | genie-creation-os vs razo-keyboard | Move razo-keyboard to 4755 |

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

### ⚠️ Support Port Collision
- **notification-service (4870)** vs **unified-inbox (4870)** — move unified-inbox → 4871

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
