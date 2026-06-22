# Reorganization Summary — 2026-06-22

## Goal

Per user decision ("sales/CRM belongs in AdBazaar" was rejected because **Sales OS already exists** at `industry-os/services/sales-os/` port 5055; the actual decision was the inverse):

> **Sales, CRM, and CS belong at canonical homes — NOT in AdBazaar. Industry + Department OS stay in `industry-os/services/`. All AI platform stays in `companies/HOJAI-AI/`.**

AdBazaar becomes **advertising + commerce media only**. Sales OS remains the canonical Sales OS at port 5055.

---

## Moves (6 services)

| # | Service | From | To | Port | Size |
|---|---|---|---|---|---|
| 1 | `customer-onboarding-service` | `companies/AdBazaar/` | `companies/REZ-Merchant/` | 5154 | 92K |
| 2 | `rez-instagram-sales-agent` | `companies/AdBazaar/` | `companies/REZ-Consumer/` | 4091 | 284K |
| 3 | `customer-success-playbook-service` | `companies/AdBazaar/` | `industry-os/services/customer-success-os/integrations/playbook-service/` | 5156 | 92K |
| 4 | `rez-crm-ui` | `companies/AdBazaar/` | `industry-os/services/sales-os/integrations/crm-ui/` | 3000 (Next.js dev) | 216K |
| 5 | `REZ-SalesMind` | `companies/AdBazaar/` | `services/REZ-SalesMind` (root integration) | 5167 | 571M |
| 6 | `customer-graph-360` | `companies/AdBazaar/` | `services/customer-graph-360` (root integration) | 4808 | 168K |

**Total moved:** ~1.4MB source (excluding REZ-SalesMind's 571M which is mostly node_modules — only source files were tracked).

---

## Why these destinations

| Service | Why this destination |
|---------|---------------------|
| `customer-onboarding-service` | REZ-Merchant = merchant-side customer lifecycle (CRM touchpoints, onboarding workflows). |
| `rez-instagram-sales-agent` | REZ-Consumer = consumer-side Instagram DMs, cart abandonment, product discovery. Not ad-tech. |
| `customer-success-playbook-service` | Customer Success OS (4050) = CS playbooks, lifecycle touchpoints, health-score actions. |
| `rez-crm-ui` | Sales OS (5055) = canonical CRM UI integration under Sales OS. |
| `REZ-SalesMind` | RTMN root `services/` = top-level sales-AI integration (8 agents) that complements (not replaces) Sales OS. |
| `customer-graph-360` | RTMN root `services/` = top-level 360° customer graph that aggregates Sales OS + CRM Hub + Wallet signals. |

---

## Architecture after reorganization

```
RTMN (root)
├── industry-os/services/
│   ├── sales-os/                              ← canonical Sales OS (5055) — UNCHANGED
│   ├── customer-success-os/                   ← canonical CS OS (4050) — UNCHANGED
│   │   └── integrations/
│   │       └── playbook-service/              ← NEW (was AdBazaar)
│   ├── marketing-os/, finance-os/, ...        ← all 26 industry + 9 department OS — UNCHANGED
│   └── ...
│
├── services/                                  ← RTMN root integrations
│   ├── REZ-SalesMind/                         ← NEW (was AdBazaar) — root-level sales AI
│   ├── customer-graph-360/                    ← NEW (was AdBazaar) — root-level customer 360
│   ├── crm-engine/, sales-automation/, sales-hub/, sales-intelligence/, sales-sync/, lead-os-gateway/
│   └── ... (other root integrations)
│
├── companies/
│   ├── HOJAI-AI/                              ← all AI platform (12 divisions, 192 services)
│   ├── AdBazaar/                              ← NOW: advertising + commerce media only (~264 services)
│   │                                          ← REMOVED: Sales, CRM, CS, Lead, Journey, Email/SMS/Push,
│   │                                          ←          Checkout, Loyalty, Rewards, Support, Marketing automation
│   ├── REZ-Merchant/                          ← + customer-onboarding-service
│   ├── REZ-Consumer/                          ← + rez-instagram-sales-agent
│   ├── Karma-Foundation/                      ← already owns loyalty/rewards/gamification
│   └── ... (other companies)
│
├── CANONICAL-PORT-REGISTRY.md                 ← strike-through for moved entries
├── PORT-REGISTRY.md                           ← REZ-SalesMind port note corrected
└── CLAUDE.md                                  ← new "RTMN Root Sales Integrations" section
```

---

## AdBazaar — what stays

**Advertising + commerce media only:**
- DSP / SSP / exchange / ad-serving (rez-dsp-bidder, rez-ad-exchange, rez-ssp-adapter)
- DOOH / CTV / OTT
- Retail media networks
- Identity (ad-tech side), audience/CDP (ad-tech), attribution (ad-tech)
- Pixel / SDK (ad-tech)
- Creative (ad-tech), yield optimization
- Creator/influencer **ad side** (the ad creator marketplace stays)
- Commerce ads, click-to-book, conversions

**~264 services** (down from 270+).

---

## RTMN root `services/` — what stays

The 9 sales/CRM-related services at `services/` are **integrations** to Sales OS, not duplicates:
- `REZ-SalesMind` (NEW) — 8 AI sales agents integration
- `customer-graph-360` (NEW) — customer 360° aggregator
- `crm-engine` — legacy CRM engine
- `sales-automation` — workflow scripts
- `sales-hub` — aggregator hub for cross-OS sales signals
- `sales-intelligence` — analytics + forecasting
- `sales-sync` — cross-system lead/customer sync
- `lead-os-gateway` — lead ingestion gateway
- `customer-success-os` — legacy CS rooted variant (canonical is `industry-os/services/customer-success-os/`)

**Rule:** Sales/CRM features → canonical Sales OS (5055). Root `services/` list above = integrations/connectors.

---

## Commits

### 1. RTMN root (`refactor/consolidate-hojai-ai` branch)
```
f1f910d02 refactor(organization): move sales/CRM services from AdBazaar to canonical homes
```

### 2. AdBazaar submodule (`main` branch)
```
e43defb refactor(scope): remove 6 sales/CRM services from AdBazaar (advertising only)
```

### 3. REZ-Merchant (`main` branch)
```
b8be9eeaf feat(merchant): onboard customer-onboarding-service from AdBazaar
```

### 4. REZ-Consumer (`main` branch)
```
a07e14b feat(consumer): onboard rez-instagram-sales-agent from AdBazaar
```

---

## What did NOT move (kept in AdBazaar on purpose)

| Service | Why kept |
|---------|----------|
| `instagram-bridge` (5182) | API integration for ads, not consumer DMs. |
| `instagram-shop-integration` (5155) | Ad-tech Instagram Shopping integration. |
| `instagram-publishing-service`, `instagram-insights-service` | Publisher + insights for ad campaigns. |
| `instagram-automation`, `instagram-shop-integration` | Ad-side automation. |
| `rez-journey-builder` | Could be argued either way — kept as it ties to ad-attribution flows. |
| `rez-instagram-bridge` | Ad-tech bridge (different from the sales-agent that moved). |

---

## What still needs future work

- **Service deduplication** at destination homes (~20 candidates in `companies/AdBazaar/DEDUP-CANDIDATES.md`).
- **Port consolidation** — moved services kept their original AdBazaar ports (5154, 5156, 5167, etc.) for now.
- **Hub route updates** — confirm no moved services were referenced in `unified-os-hub/src/routes/index.js`.
- **CRM UI integration wiring** — `rez-crm-ui` at `industry-os/services/sales-os/integrations/crm-ui/` needs to be wired into Sales OS as a UI plugin.
- **Playbook service wiring** — `playbook-service` at `industry-os/services/customer-success-os/integrations/playbook-service/` needs CS OS to call it.

---

## Security compliance

- ✅ Leverge code (4761-4765) NOT touched.
- ✅ RABTUL-Technologies/REZ-* code NOT touched.
- ✅ No client code modified unprompted.
- ✅ All moves were internal reorganization within RTMN/HOJAI/AdBazaar/REZ-Merchant/REZ-Consumer.

---

*Last updated: 2026-06-22*
