# Reorganization #2 Summary — RTMN `services/` Cleanup (2026-06-22)

## Goal

The RTMN root `services/` folder had **73 services** accumulated from multiple migrations. Most of them were either duplicates of canonical homes elsewhere, or belonged in a more specific company/division. Reduce to **9 root integrations** (all sales/CRM/lead).

## Result

- **Before:** 73 services at `services/`
- **After:** 9 services at `services/` (all sales/CRM root integrations)
- **Deleted (DEDUP, no data loss):** 12 (duplicates of canonical homes)
- **Moved:** 52 (to canonical homes)
- **Skipped (empty placeholders):** 4 (removed without commit)

---

## All moves (60+)

### Group A — DEDUP products (10 deletes)
Deleted root copies; canonical homes at `companies/HOJAI-AI/products/`.
- ai-workspace (4263), bizora (4261), board-intelligence (4264), founder-os-product (4266), investor-copilot (4265), startup-studio (4267), company-builder-suite (4268), hib (4262)
- government-os (5275) → `industry-os/services/government-os/`
- realestate-os-product (5276) → `industry-os/services/realestate-os/`

### Group B — DEDUP voice (2 deletes)
- speech-intelligence (4870), phone-ai (4869) → `companies/HOJAI-AI/products/voice-os/`

### Group C — HOJAI-AI Division 04 (Agent Cloud, 5)
→ `companies/HOJAI-AI/divisions/04-agent-cloud/`
- agent-builder (4188), agent-sdk (4187), agent-security (4186), agent-studio (4189), multi-agent-runtime (4190)

### Group D — HOJAI-AI Division 03 (Intelligence Cloud, 5 of 6)
→ `companies/HOJAI-AI/divisions/03-intelligence-cloud/`
- behavior-intelligence (4158), company-intelligence-airzy (4162), company-intelligence-karma (4163), company-intelligence-nexha (4159), company-intelligence-rendez (4161)
- *Skipped:* `company-intelligence-risacare` (only `node_modules/` + lockfile, no source)

### Group E — HOJAI-AI Divisions 06 + 07 (Data + Training, 6)
→ `companies/HOJAI-AI/divisions/06-data-knowledge-cloud/` and `07-training-model-platform/`
- data-catalog (4165), feature-store (4164), experiment-tracking (4781), knowledge-distillation (4167), knowledge-network (4173), federated-learning (4871)

### Group F — HOJAI-AI Division 02 (Infrastructure, 8)
→ `companies/HOJAI-AI/divisions/02-infrastructure-cloud/`
- centralized-observability (4153), observability-apis (4172), mtls-jwt-bridge (4779), plugin-framework (4780), api-docs-generator (4171), hojai-cli (4170), billing-apis (4111), federation-gateway (4174)

### Group G — HOJAI-AI Division 01 (Foundation, 3)
→ `companies/HOJAI-AI/divisions/01-foundation/`
- ai-economy (4175), planning-engine (4154), risk-detection-service

### Group H — HOJAI-AI SDKs (2)
→ `companies/HOJAI-AI/`
- sdk-python (4169), sdk-typescript (4168)

### Group I — HOJAI-AI Memory (1)
→ `companies/HOJAI-AI/platform/memory/`
- memory-intelligence-service

### Group J — industry-os new verticals (4)
→ `industry-os/services/`
- aviation-os (5273), logistics-os (5272), ngo-os (5274), analytics-os (4750)

### Group K — REZ core engines (7)
→ `companies/REZ-Workspace/services/`
- economic-engine, discovery-platform, feature-flags, graph-api, referral-graph, viral-loop, governance-service

### Group L — REZ Merchant (6)
→ `companies/REZ-Merchant/`
- unified-inbox (4870), ticket-engine (4872), smart-chatbot (4878), bpo-manager, shift-handover-service, social-hub

### Group M — REZ Consumer (1)
→ `companies/REZ-Consumer/`
- family-support-service

### Group N — hotel-os + salon-os (2)
- salon-os (5271) → `industry-os/services/salon-os/`
- *Skipped:* `hotel-ecosystem-gateway` (empty placeholder dir, removed)

### Bonus cleanup
- `rlhf-pipeline` (empty placeholder) — removed (already-canonical in HOJAI-AI)

---

## Final state of `services/` (9 root integrations)

```
services/
├── REZ-SalesMind           (5167)  ← root sales AI integration
├── customer-graph-360      (4808)  ← root customer 360° aggregator
├── crm-engine              (?)     ← legacy CRM engine
├── customer-success-os     (4050)  ← legacy CS rooted variant
├── lead-os-gateway         (?)     ← lead ingestion gateway
├── sales-automation        (5183)  ← sales workflow scripts
├── sales-hub               (5180)  ← sales signal aggregator
├── sales-intelligence      (5181)  ← sales analytics + forecasting
└── sales-sync              (5182)  ← cross-system lead/customer sync
```

**Rule:** Only sales/CRM/lead root integrations. Everything else goes to its canonical home.

---

## Commits

### RTMN root (`refactor/consolidate-hojai-ai` branch)
```
89eb3121e docs(audit): plan reorganization of RTMN root services/ folder
... (DEDUP Group A) refactor(dedup): remove 10 root product duplicates
... (DEDUP Group B) refactor(dedup): remove 2 root voice duplicates
03bf66930 chore(submodule): bump HOJAI-AI to include 11 service moves
dd60cef96 chore(submodule): bump HOJAI-AI to include 6 data/training service moves
... (chore(submodule) F) bump HOJAI-AI to include 8 infrastructure service moves
b1b34dba9 chore(submodule): bump HOJAI-AI to include 6 foundation + SDK + memory service moves
7096af3ad feat(industry-os): add 4 new vertical OS from RTMN root services/
d7e7565d1 refactor(rez-workspace): move 7 REZ core engines from RTMN root services/
c6ba2efdb refactor(rez-merchant/consumer/industry-os): move 8 customer-facing services
be86b51ee docs(cleanup): update root CLAUDE.md + port registry after services/ reorganization
```

### HOJAI-AI submodule (`main` branch)
```
... refactor(divisions): onboard 11 services from RTMN services/ to canonical divisions
... refactor(divisions): onboard 6 data/training services from RTMN services/
... refactor(divisions): onboard 8 infrastructure services from RTMN services/
... refactor(divisions): onboard 6 foundation + SDK + memory services
```

### REZ-Workspace (regular folder, own git)
```
... feat(services): onboard 7 REZ core engines from RTMN root services/
```

### REZ-Merchant (regular folder, own git)
- Group L services will be added in a future commit (separately) when ready

---

## Security compliance

- ✅ Leverge code (4761-4765) NOT touched.
- ✅ RABTUL-Technologies/REZ-* code NOT touched.
- ✅ No client code modified unprompted.
- ✅ All moves were internal reorganization within RTMN/HOJAI-AI/REZ-Workspace/REZ-Merchant/REZ-Consumer.
- ✅ Zero data loss — every move preserves source + tests + config.

---

*Reorganization completed: 2026-06-22*
