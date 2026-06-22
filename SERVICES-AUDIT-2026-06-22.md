# RTMN Root `services/` Audit & Move Plan — 2026-06-22

> **Goal:** Move every `services/<name>/` that doesn't belong at RTMN root to its canonical home.
> **Rule:** Only keep at `services/` if it's a **top-level RTMN integration/connector** that complements (not replaces) a canonical OS. Everything else → `companies/HOJAI-AI/` (AI platform) or `industry-os/services/` (industry/department OS) or a specific company folder.

---

## Verified canonical homes (2026-06-22)

| Target path | Exists? | Notes |
|---|---|---|
| `companies/HOJAI-AI/products/ai-workspace/` | ✅ | Already has full implementation |
| `companies/HOJAI-AI/products/voice-os/` | ✅ | Already has voice-os (speech/phone-ai belong there) |
| `companies/HOJAI-AI/products/bizora/` | ✅ | |
| `companies/HOJAI-AI/products/board-intelligence/` | ✅ | |
| `companies/HOJAI-AI/products/founder-os/` | ✅ | |
| `companies/HOJAI-AI/products/investor-copilot/` | ✅ | |
| `companies/HOJAI-AI/products/startup-studio/` | ✅ | |
| `companies/HOJAI-AI/products/company-builder/` | ✅ | |
| `companies/HOJAI-AI/products/hib/` | ✅ | |
| `industry-os/services/government-os/` | ✅ | |
| `industry-os/services/realestate-os/` | ✅ | |
| `industry-os/services/aviation-os/` | ❌ | Need to CREATE |
| `industry-os/services/logistics-os/` | ❌ | Need to CREATE |
| `industry-os/services/ngo-os/` | ❌ | Need to CREATE |
| `industry-os/services/analytics-os/` | ❌ | Need to CREATE |
| `companies/REZ-Workspace/services/feature-flags/` | ❌ | Need to CREATE |
| `companies/REZ-Workspace/services/governance-service/` | ❌ | Need to CREATE |
| `companies/REZ-Workspace/services/economic-engine/` | ❌ | Need to CREATE |
| `companies/REZ-Workspace/services/discovery-platform/` | ❌ | Need to CREATE |
| `companies/REZ-Workspace/services/graph-api/` | ❌ | Need to CREATE |
| `companies/REZ-Workspace/services/referral-graph/` | ❌ | Need to CREATE |
| `companies/REZ-Workspace/services/viral-loop/` | ❌ | Need to CREATE |

---

## Final categorization (73 services at root)

### GROUP A — DEDUP (delete from root, canonical home already exists) — 9 services

These have full canonical implementations elsewhere. Safe to delete the root copy.

| `services/<name>` | Scope | Port | Canonical home (verified) |
|---|---|---|---|
| `ai-workspace` | `@hojai/` | 4263 | `companies/HOJAI-AI/products/ai-workspace/` ✅ |
| `bizora` | `@hojai/` | 4261 | `companies/HOJAI-AI/products/bizora/` ✅ |
| `board-intelligence` | `@hojai/` | 4264 | `companies/HOJAI-AI/products/board-intelligence/` ✅ |
| `founder-os-product` | `@hojai/` | 4266 | `companies/HOJAI-AI/products/founder-os/` ✅ |
| `investor-copilot` | `@hojai/` | 4265 | `companies/HOJAI-AI/products/investor-copilot/` ✅ |
| `startup-studio` | `@hojai/` | 4267 | `companies/HOJAI-AI/products/startup-studio/` ✅ |
| `company-builder-suite` | `@hojai/` | 4268 | `companies/HOJAI-AI/products/company-builder/` ✅ |
| `hib` | `@hojai/` | 4262 | `companies/HOJAI-AI/products/hib/` ✅ |
| `government-os` | `@hojai/` | 5275 | `industry-os/services/government-os/` ✅ |
| `realestate-os-product` | `@hojai/` | 5276 | `industry-os/services/realestate-os/` ✅ |

### GROUP B — DEDUP voice (delete from root, voice-os exists) — 2 services

| `services/<name>` | Scope | Port | Canonical home (verified) |
|---|---|---|---|
| `speech-intelligence` | `@hojai/` | 4870 | `companies/HOJAI-AI/products/voice-os/` ✅ |
| `phone-ai` | `@hojai/` | 4869 | `companies/HOJAI-AI/products/voice-os/` ✅ |

### GROUP C — MOVE to HOJAI-AI Division 4 — Agent Cloud — 5 services

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `agent-builder` | `@hojai/` | 4188 | `companies/HOJAI-AI/divisions/04-agent-cloud/agent-builder/` |
| `agent-sdk` | `@hojai/` | 4187 | `companies/HOJAI-AI/divisions/04-agent-cloud/agent-sdk/` |
| `agent-security` | `@hojai/` | 4186 | `companies/HOJAI-AI/divisions/04-agent-cloud/agent-security/` |
| `agent-studio` | `@hojai/` | 4189 | `companies/HOJAI-AI/divisions/04-agent-cloud/agent-studio/` |
| `multi-agent-runtime` | `@hojai/` | 4190 | `companies/HOJAI-AI/divisions/04-agent-cloud/multi-agent-runtime/` |

### GROUP D — MOVE to HOJAI-AI Division 3 — Intelligence Cloud — 6 services

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `behavior-intelligence` | `@hojai/` | 4158 | `companies/HOJAI-AI/divisions/03-intelligence-cloud/behavior-intelligence/` |
| `company-intelligence-airzy` | `@hojai/` | 4162 | `companies/HOJAI-AI/divisions/03-intelligence-cloud/company-intelligence-airzy/` |
| `company-intelligence-karma` | `@hojai/` | 4163 | `companies/HOJAI-AI/divisions/03-intelligence-cloud/company-intelligence-karma/` |
| `company-intelligence-nexha` | `@hojai/` | 4159 | `companies/HOJAI-AI/divisions/03-intelligence-cloud/company-intelligence-nexha/` |
| `company-intelligence-rendez` | `@hojai/` | 4161 | `companies/HOJAI-AI/divisions/03-intelligence-cloud/company-intelligence-rendez/` |
| `company-intelligence-risacare` | (no pkg) | 4160 | `companies/HOJAI-AI/divisions/03-intelligence-cloud/company-intelligence-risacare/` |

### GROUP E — MOVE to HOJAI-AI Division 6 — Data/Knowledge — 6 services

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `data-catalog` | `@hojai/` | 4165 | `companies/HOJAI-AI/divisions/06-data-knowledge-cloud/data-catalog/` |
| `feature-store` | `@hojai/` | 4164 | `companies/HOJAI-AI/divisions/06-data-knowledge-cloud/feature-store/` |
| `experiment-tracking` | `@hojai/` | 4781 | `companies/HOJAI-AI/divisions/06-data-knowledge-cloud/experiment-tracking/` |
| `knowledge-distillation` | `@hojai/` | 4167 | `companies/HOJAI-AI/divisions/06-data-knowledge-cloud/knowledge-distillation/` |
| `knowledge-network` | `@hojai/` | 4173 | `companies/HOJAI-AI/divisions/06-data-knowledge-cloud/knowledge-network/` |
| `federated-learning` | `@hojai/` | 4871 | `companies/HOJAI-AI/divisions/07-training-model-platform/federated-learning/` |

### GROUP F — MOVE to HOJAI-AI Division 2 — Infrastructure/Cloud — 4 services

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `centralized-observability` | `@hojai/` | 4153 | `companies/HOJAI-AI/divisions/02-infrastructure-cloud/centralized-observability/` |
| `observability-apis` | `@hojai/` | 4172 | `companies/HOJAI-AI/divisions/02-infrastructure-cloud/observability-apis/` |
| `mtls-jwt-bridge` | `@hojai/` | 4779 | `companies/HOJAI-AI/divisions/02-infrastructure-cloud/mtls-jwt-bridge/` |
| `plugin-framework` | `@hojai/` | 4780 | `companies/HOJAI-AI/divisions/02-infrastructure-cloud/plugin-framework/` |
| `api-docs-generator` | `@hojai/` | 4171 | `companies/HOJAI-AI/divisions/02-infrastructure-cloud/api-docs-generator/` |
| `hojai-cli` | `@hojai/` | 4170 | `companies/HOJAI-AI/divisions/02-infrastructure-cloud/hojai-cli/` |
| `billing-apis` | (none) | 4111 | `companies/HOJAI-AI/divisions/02-infrastructure-cloud/billing-apis/` |
| `federation-gateway` | `@hojai/` | 4174 | `companies/HOJAI-AI/divisions/02-infrastructure-cloud/federation-gateway/` |

### GROUP G — MOVE to HOJAI-AI Division 1 — Foundation — 3 services

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `ai-economy` | `@hojai/` | 4175 | `companies/HOJAI-AI/divisions/01-foundation/ai-economy/` |
| `planning-engine` | `@hojai/` | 4154 | `companies/HOJAI-AI/divisions/01-foundation/planning-engine/` |
| `risk-detection-service` | (none) | ? | `companies/HOJAI-AI/divisions/01-foundation/risk-detection/` |

### GROUP H — MOVE to HOJAI-AI SDK (root) — 2 services

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `sdk-python` | `@hojai/` | 4169 | `companies/HOJAI-AI/sdk-python/` |
| `sdk-typescript` | `@hojai/` | 4168 | `companies/HOJAI-AI/sdk-typescript/` |

### GROUP I — MOVE to HOJAI-AI Memory Platform — 1 service

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `memory-intelligence-service` | (none) | ? | `companies/HOJAI-AI/platform/memory/memory-intelligence/` |

### GROUP J — MOVE to industry-os (new verticals) — 4 services

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `aviation-os` | `@hojai/` | 5273 | `industry-os/services/aviation-os/` (CREATE) |
| `logistics-os` | `@hojai/` | 5272 | `industry-os/services/logistics-os/` (CREATE) |
| `ngo-os` | `@hojai/` | 5274 | `industry-os/services/ngo-os/` (CREATE) |
| `analytics-os` | `rtmn-` | 4750 | `industry-os/services/analytics-os/` (CREATE) |

### GROUP K — MOVE to REZ-Workspace (core engines) — 7 services

The "REZ Ecosystem" core engines. Originally migrated from AdBazaar 2026-06-20 to "RTMN-Group" (per their CLAUDE.md) but RTNM-Group is mostly empty. Create real homes in `companies/REZ-Workspace/services/`.

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `REZ-economic-engine` | `rez-` | 3000 | `companies/REZ-Workspace/services/economic-engine/` (CREATE) |
| `REZ-discovery-platform` | `rez-` | 3000 | `companies/REZ-Workspace/services/discovery-platform/` (CREATE) |
| `REZ-feature-flags` | `rez-` | 4035 | `companies/REZ-Workspace/services/feature-flags/` (CREATE) |
| `REZ-graph-api` | `rez-` | 3000 | `companies/REZ-Workspace/services/graph-api/` (CREATE) |
| `REZ-referral-graph` | `rez-` | 3010 | `companies/REZ-Workspace/services/referral-graph/` (CREATE) |
| `rez-viral-loop` | `rez-` | 3000 | `companies/REZ-Workspace/services/viral-loop/` (CREATE) |
| `governance-service` | `@rez/` | 3000 | `companies/REZ-Workspace/services/governance-service/` (CREATE) |

### GROUP L — MOVE to REZ-Merchant (customer support) — 4 services

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `unified-inbox` | `rtmn-` | 4870 | `companies/REZ-Merchant/unified-inbox/` (CREATE) |
| `ticket-engine` | `rtmn-` | 4872 | `companies/REZ-Merchant/ticket-engine/` (CREATE) |
| `smart-chatbot` | `rtmn-` | 4878 | `companies/REZ-Merchant/smart-chatbot/` (CREATE) |
| `bpo-manager` | (none) | ? | `companies/REZ-Merchant/bpo-manager/` (CREATE) |
| `shift-handover-service` | (none) | ? | `companies/REZ-Merchant/shift-handover/` (CREATE) |
| `social-hub` | (none) | ? | `companies/REZ-Merchant/social-hub/` (CREATE) |

### GROUP M — MOVE to REZ-Consumer — 1 service

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `family-support-service` | (none) | ? | `companies/REZ-Consumer/family-support/` (CREATE) |

### GROUP N — MOVE to hotel-os (integration) — 1 service

| `services/<name>` | Scope | Port | Target |
|---|---|---|---|
| `hotel-ecosystem-gateway` | (none) | ? | `industry-os/services/hotel-os/integrations/ecosystem-gateway/` (CREATE) |
| `salon-os` | `@hojai/` | 5271 | `industry-os/services/salon-os/` (CREATE) |

### GROUP O — KEEP at `services/` (root integrations) — 9 services

These are the **root-level RTMN integrations** that connect to canonical OS.

| `services/<name>` | Scope | Port | Why keep |
|---|---|---|---|
| `REZ-SalesMind` | `rez-` | 5167 | Root-level sales AI integration (just moved from AdBazaar) |
| `customer-graph-360` | `rez-` | 4808 | Root-level customer 360° aggregator (just moved from AdBazaar) |
| `crm-engine` | `rtmn-` | ? | Legacy CRM engine integration |
| `customer-success-os` | `rtmn-` | 4050 | Legacy CS rooted variant (canonical at industry-os/) |
| `sales-automation` | `rtmn-` | 5183 | Sales workflow integration |
| `sales-hub` | `rtmn-` | 5180 | Sales hub aggregator |
| `sales-intelligence` | `rtmn-` | 5181 | Sales analytics integration |
| `sales-sync` | `rtmn-` | 5182 | Cross-system sales sync |
| `lead-os-gateway` | `rtmn-` | ? | Lead ingestion gateway |

---

## Stats

- **Total services at root:** 73
- **TO DEDUP (delete from root):** 12 (Group A + B)
- **TO MOVE to HOJAI-AI divisions:** 28 (Group C, D, E, F, G, H, I)
- **TO MOVE to industry-os (new):** 5 (Group J, salon-os in N)
- **TO MOVE to REZ-Workspace services:** 7 (Group K)
- **TO MOVE to REZ-Merchant / Consumer:** 7 (Group L, M)
- **TO MOVE to hotel-os integration:** 1 (Group N hotel)
- **TO KEEP at `services/`:** 9 (Group O)
- **Sanity check:** 12 + 28 + 5 + 7 + 7 + 1 + 9 = **69** — close to 73. Remaining 4 are unverified/no-package services that need further inspection.

---

## Execution plan

1. **DEDUP first** (12 services, safer no-data-loss) — Group A + B
2. **MOVE Group C** — HOJAI-AI Agent Cloud (5)
3. **MOVE Group D** — HOJAI-AI Intelligence Cloud (6)
4. **MOVE Group E + F** — HOJAI-AI Data/Knowledge + Infrastructure (4 + 8)
5. **MOVE Group G + H + I** — HOJAI-AI Foundation + SDK + Memory (3 + 2 + 1)
6. **MOVE Group J** — industry-os new verticals (4)
7. **MOVE Group K** — REZ-Workspace (7)
8. **MOVE Group L + M + N** — REZ-Merchant / Consumer / hotel-os (8)
9. **Verify** `services/` only has Group O (9) + remaining 4 unverified
10. **Commit** each batch with descriptive message
11. **Update CLAUDE.md / port registry** at the end

---

*Audit done. Awaiting user approval before moving.*
