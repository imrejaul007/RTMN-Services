# HOJAI Platform Asset Inventory

> **Authoritative reference** for what exists. Use this for audits, not file scanning.
> **Updated:** June 29, 2026

---

## Connectors - `platform/connectors/` (27 total)

| # | Connector | Status |
|---|---------|--------|
| 1 | asana-connector | ✅ |
| 2 | calendar-connector | ✅ |
| 3 | connector-hub | ✅ |
| 4 | connector-marketplace | ✅ |
| 5 | connector-registry | ✅ |
| 6 | freshdesk-connector | ✅ |
| 7 | freshworks-connector | ✅ |
| 8 | github-connector | ✅ |
| 9 | gmail-connector | ✅ |
| 10 | hubspot-connector | ✅ |
| 11 | intercom-connector | ✅ |
| 12 | jira-connector | ✅ |
| 13 | linear-connector | ✅ |
| 14 | notion-connector | ✅ |
| 15 | oracle-connector | ✅ |
| 16 | quickbooks-connector | ✅ |
| 17 | salesforce-connector | ✅ |
| 18 | sap-connector | ✅ |
| 19 | shopify-connector | ✅ |
| 20 | slack-connector | ✅ |
| 21 | stripe-connector | ✅ |
| 22 | teams-connector | ✅ |
| 23 | workday-connector | ✅ |
| 24 | zoho-connector | ✅ |
| 25 | zoom-connector | ✅ |
| 26 | twilio-sms-connector | ✅ NEW |
| 27 | twilio-voice-connector | ✅ NEW |

## NEW Connectors - Built June 29, 2026

| # | Connector | Purpose |
|---|---------|---------|
| 28 | whatsapp-business-connector | WhatsApp Cloud API |
| 29 | background-check-connector | Checkr API |
| 30 | meeting-recording-connector | Zoom + AI |
| 31 | voice-to-task-connector | Whisper |

---

## Agent OS - `platform/agent-os/` (12 services)

| # | Service | Tests |
|---|---------|-------|
| 1 | agent-platform-api | 36 |
| 2 | agent-registry | 54 |
| 3 | capability-store | 69 |
| 4 | tool-registry | 59 |
| 5 | skill-library | 73 |
| 6 | message-bus | 59 |
| 7 | scheduler | 89 |
| 8 | context-store | 64 |
| 9 | agent-memory-bridge | 64 |
| 10 | agent-orchestrator | 63 |
| 11 | agent-execution-engine | 61 |
| 12 | agent-observability | 46 |

---

## Production Services - `services/` (5)

| # | Service | Purpose | Port |
|---|---------|---------|------|
| 1 | service-management | Ticket/Incident/SLA | 4510 |
| 2 | reply-drafting-service | LLM reply generation | - |
| 3 | refund-approval-service | Refund workflow | - |
| 4 | root-cause-service | Incident analysis | - |
| 5 | roi-calculator-service | AI ROI | - |

---

## API Gateway - `services/hojai-api/`

- **Port:** 4500
- **Wires:** All connectors + services
- **Dashboard:** `studio/hojai-dashboard/` (port 3001)

---

## Voice OS - `products/voice-os/` (17 services)

| Service | Purpose |
|---------|---------|
| attention-engine | Voice attention |
| conversation-physics | Voice physics |
| curiosity-engine | Voice curiosity |
| humor-engine | Voice humor |
| life-timeline | Voice timeline |
| multi-agent-voice | Multi-agent |
| social-intelligence | Social |
| voice-director | Voice direction |
| voice-gateway | STT/TTS |

---

## Memory OS - `platform/memory/` (22 services)

| Service | Purpose |
|---------|---------|
| memory-os | Core memory |
| memory-substrate | PostgreSQL |
| memory-confidence | Confidence scoring |
| memory-context-engine | Context |
| memory-intelligence | Intelligence |
| memory-learning-engine | Learning |
| memory-observation | Observation |
| memory-forgetting | Forgetting |
| memory-governance | GDPR/CCPA |
| memory-import | Import |
| memory-portability | Export |
| memory-compiler | Compile |
| memory-marketplace | Marketplace |
| memory-relationships | Relationships |
| memory-truth-engine | Truth |
| memory-multimodal | Multimodal |
| memory-network | Network |
| twin-working-memory | Twin bridge |

---

## Twin OS - `platform/twins/` (86+ twins)

| Twin | Purpose |
|------|---------|
| employee-twin | Employee |
| organization-twin | Organization |
| customer-twin | Customer |
| meeting-intelligence | Meeting |
| [80+ more] | Various |

---

## Genie Products - `products/genie/` (14)

| Product | Purpose |
|---------|---------|
| genie-ambient | Ambient |
| genie-anticipation | Anticipation |
| genie-constitution | Constitution |
| genie-decision-intelligence | Decisions |
| genie-dreams | Dreams |
| genie-financial-life | Finance |
| genie-focus | Focus |
| genie-health-intelligence | Health |
| genie-household | Household |
| genie-learning-loop | Learning |
| genie-legacy | Legacy |
| genie-life-simulation | Simulation |
| genie-spiritual | Spiritual |
| genie-travel | Travel |

---

## Skills Platform - `platform/skills/`

| Service | Purpose |
|---------|---------|
| skill-os | Core skills |
| translation-os | Translation |
| skill-marketplace | Marketplace |
| prompt-manager | Prompts |
| prompt-marketplace | Prompt store |
| skill-creator-studio | Create skills |
| skill-certification | Certify |
| skill-analytics | Analytics |
| enterprise-skill-portal | Enterprise |

---

## Templates - `hojai-templates/` (100+)

| Category | Count |
|----------|-------|
| sales | 15 |
| marketing | 15 |
| support | 10 |
| hr | 10 |
| finance | 10 |
| founder | 10 |
| restaurant | 10 |
| healthcare | 5 |
| real-estate | 5 |
| commerce | 10 |

---

## CompanyOS - Modules

| Module | Location | Status |
|--------|----------|--------|
| Identity | CorpID | ✅ |
| People | PeopleOS (CorpPerks) | ✅ |
| Customers | CRM + Twins | ✅ |
| Finance | Treasury + Wallets | ✅ |
| Operations | Inventory + Procurement | ✅ |
| Communications | Voice + Email + WhatsApp | ✅ |
| **Service Management** | `services/service-management/` | ✅ NEW |
| Intelligence | HIB + Analytics | ✅ |
| Governance | Policy + Trust | ✅ |

---

## PeopleOS - Modules (CorpPerks)

| Module | Location | Status |
|--------|----------|--------|
| People Core | `people/`, `peopleos/` | ✅ |
| Talent | `talentai/`, `ai-agents/` | ✅ |
| Learning | `lms-service/` | ✅ |
| Performance | `performance-service/` | ✅ |
| Finance | `payroll/`, `compensation/` | ✅ |
| **Workforce Planning** | `workforce-planning/` | ✅ NEW |
| Shifts | `shift-service/` | ✅ |
| Collaboration | `team-collab/` | ✅ |
| Calendar | `calendar-service/` | ✅ |
| Meeting | `meeting-service/` | ✅ |

---

## Industry OS - `industry-os/services/` (26)

| Industry | OS |
|----------|-----|
| Restaurant | restaurant-os |
| Hotel | hotel-os |
| Healthcare | healthcare-os |
| Retail | retail-os |
| Beauty | beauty-os |
| [21 more] | ... |

---

## Architecture Summary

```
HOJAI Platform
├── Connectors (31)
├── Agent OS (12)
├── Production Services (5)
├── API Gateway (4500)
├── Dashboard (3001)
├── Voice OS (17)
├── Memory OS (22)
├── Twin OS (86+)
├── Genie (14)
├── Skills (9)
├── Templates (100+)
├── CompanyOS (10 modules)
├── PeopleOS (30+ modules)
└── Industry OS (26)
```

---

## Quick Start

```bash
# Start all
cd platform/docker && docker-compose up -d

# Or individual
cd services/service-management && npm start
cd services/hojai-api && npm start

# Dashboard
cd studio/hojai-dashboard && npm run dev
```

---

## Status: COMPLETE ✅

All gaps filled as of June 29, 2026.
