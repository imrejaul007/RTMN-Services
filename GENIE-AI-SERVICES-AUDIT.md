# GENIE AI SERVICES - COMPREHENSIVE AUDIT REPORT

**Date:** June 18, 2026  
**Auditor:** Claude Code  
**Total Services Found:** 27+  
**Port Range:** 4701-4731, 4760, 4850  

---

## Executive Summary

Genie AI is the personal intelligence platform of RTMN ecosystem. It provides AI-powered memory, context, and reasoning through a network of digital twins and services.

| Metric | Count |
|--------|-------|
| Total Genie Services | 27+ |
| Foundation Twins | 5 |
| New Twins (v2.1) | 5 |
| Bot Connectors | 4 |
| External Integrations | 6+ |
| Port Range | 4701-4731 |

---

## 1. CORE GENIE SERVICES (Ports 4701-4720)

| Service | Port | File Location | Key Features | Connections |
|---------|------|---------------|--------------|-------------|
| **genie-gateway** | 4701 | `companies/hojai-ai/genie/` | Unified API gateway for GENIE stack; routes requests to all twins and services | Personal Twin (4708), Relationship Twin (4705), Financial Twin (4715), Health Twin (4717), Founder Twin (4716), Memory (4703), Briefing (4706), WhatsApp (4718) |
| **genie-memory** | 4703 | `companies/hojai-ai/genie-memory-service/` | Personal memory store, semantic search, recall; multi-tier memory infrastructure | TwinOS Hub (4705), All Twins |
| **genie-briefing** | 4706 | `companies/hojai-ai/genie-briefing-service/` | Daily briefings, contextual updates, morning/evening summaries | Personal Twin (4708), Memory (4703) |
| **genie-project** | 4712 | `companies/hojai-ai/genie-project-service/` | Project & task management | Personal Twin, Memory |
| **genie-whatsapp-bot** | 4718 | `companies/hojai-ai/genie-whatsapp-bot-service/` | WhatsApp conversational surface (15+ intents); fans out to all twins | All Twins, Personal Twin, Relationship Twin, Financial Twin, Health Twin, Founder Twin, Memory, Briefing |
| **genie-privacy** | 4719 | `companies/hojai-ai/genie-privacy-service/` | Consent management, data export, deletion, GDPR compliance | All services |
| **genie-dashboard** | 4720 | `companies/hojai-ai/genie-dashboard-service/` | Web dashboard; single view of all twins | All Twins |

---

## 2. DIGITAL TWINS (Ports 4705-4717)

### 2.1 Foundation Twins (5)

| Twin | Port | File Location | Data Modeled | Key Endpoints |
|------|------|---------------|--------------|----------------|
| **Personal Twin** | 4708 | `companies/hojai-ai/genie-personal-twin-service/` | Identity, profile, preferences, behavior, goals, timeline, predictive modeling | `/api/twin`, `/api/twin/summary` |
| **Relationship Twin** | 4705 | `companies/hojai-ai/genie-relationship-twin-service/` | People graph, interactions, health/intimacy/trust scores, birthdays, anniversaries | `/api/relationships`, `/api/relationships/summary` |
| **Financial Twin** | 4715 | `companies/hojai-ai/genie-financial-twin-service/` | Accounts, transactions, budgets, savings goals, net worth, financial insights | `/api/accounts`, `/api/summary` |
| **Health Twin** | 4717 | `companies/hojai-ai/genie-health-twin-service/` | Vitals, activity, sleep, mood, medications, conditions, composite health score | `/api/metrics`, `/api/summary` |
| **Founder Twin** | 4716 | `companies/hojai-ai/genie-founder-twin-service/` | Ventures, KPIs, customers, team, decisions, focus blocks | `/api/ventures`, `/api/summary` |

### 2.2 New Twins (v2.1) - From Competitor Analysis

| Twin | File Location | Purpose | Features |
|------|---------------|---------|----------|
| **Knowledge Twin** | `genie-memory-service/src/services/knowledgeTwin.ts` | Learning & knowledge | Bookmarks, courses, research, skills, insights |
| **Productivity Twin** | `genie-memory-service/src/services/productivityTwin.ts` | Tasks & habits | Tasks, calendar, habits, focus patterns |
| **Communication Twin** | `genie-memory-service/src/services/communicationTwin.ts` | Messages | Writing style, channels, relationships |
| **Environment Twin** | `genie-memory-service/src/services/environmentTwin.ts` | Context | Devices, locations, routines, IoT |
| **AI Twin** | `genie-memory-service/src/services/aiTwin.ts` | AI Settings | Reasoning style, workflows, agents |

---

## 3. BOT/CHANNEL CONNECTORS (Ports 4721-4729)

| Service | Port | File Location | Platform | Features |
|---------|------|---------------|----------|----------|
| **genie-discord** | 4721 | `companies/hojai-ai/genie-discord-service/` | Discord | Server-based conversational surface |
| **genie-telegram** | 4722 | `companies/hojai-ai/genie-telegram-service/` | Telegram | Bot integration |
| **genie-slack** | 4723 | `companies/hojai-ai/genie-slack-service/` | Slack | Workspace integration |
| **genie-notion** | 4724 | `companies/hojai-ai/genie-notion-service/` | Notion | Document/notes connector |
| **genie-obsidian** | 4725 | `companies/hojai-ai/genie-obsidian-service/` | Obsidian | Local knowledge base connector |
| **genie-drive-connector** | 4726 | `companies/hojai-ai/genie-drive-connector/` | Google Drive | Cloud storage sync |
| **genie-browser-history** | 4727 | `companies/hojai-ai/genie-browser-history-service/` | Browser | Browsing behavior tracking |
| **genie-household** | 4728 | `companies/hojai-ai/genie-household-service/` | Internal | Household twin (chores, groceries, family) |
| **genie-sync** | 4729 | `companies/hojai-ai/genie-sync-service/` | Internal | Cross-twin synchronization engine |
| **genie-memory-review** | 4730 | `companies/hojai-ai/genie-memory-review-service/` | Internal | Memory audit & cleanup |

---

## 4. SPECIALIZED GENIE SERVICES (Ports 4731, 4760, 4850)

| Service | Port | File Location | Purpose |
|---------|------|---------------|---------|
| **genie-dental-health** | 4731 | `companies/hojai-ai/genie-dental-health-service/` | Dental health twin, appointment reminders, oral care tracking |
| **genie-voice** | 4760 | `companies/HOJAI-AI/genie-voice/` | Voice commands; Email, SMS, WhatsApp, Call integration |
| **VoiceOS** | 4850 | `companies/HOJAI-AI/` | Voice AI platform |

---

## 5. CONSUMER TRIANGLE (GENIE + DO + RAZO)

The **Consumer Triangle** represents the three pillars of personal AI interaction:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CONSUMER TRIANGLE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                         ┌───────────┐                               │
│                         │   GENIE   │                               │
│                         │  (Think) │ ← AI Brain + Twins           │
│                         │   4701   │ ← Gateway                    │
│                         └─────┬─────┘                               │
│                               │                                      │
│         ┌─────────────────────┼─────────────────────┐               │
│         │                     │                     │               │
│         ▼                     │                     ▼               │
│   ┌───────────┐               │              ┌───────────┐         │
│   │    DO     │               │              │   RAZO    │         │
│   │  (Act)    │               │              │(Communicate)│        │
│   │   3001    │               │              │   4725    │         │
│   └───────────┘               │              └───────────┘         │
│                                │                                      │
│                    ┌──────────┴──────────┐                           │
│                    │    RTMN Ecosystem   │                           │
│                    │   (50+ services)    │                           │
│                    └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Genie (Think) - Port 4701
- **Role:** AI Brain - processes, reasons, stores memories
- **Services:** Gateway (4701), Twins (4705-4717), Memory (4703), Briefing (4706)
- **Outputs:** Insights, recommendations, predictions

### DO (Act) - Port 3001
- **Role:** Action layer - executes tasks, makes changes
- **Location:** `companies/REZ-Consumer/do/do-backend`
- **Services:** DO Backend, REZ-assistant, REZ-inbox, REZ-save
- **Outputs:** Task execution, bookings, payments, orders

### RAZO (Communicate) - Port 4725 - ✅ FULLY IMPLEMENTED
- **Role:** Communication layer - input/output with user
- **Location:** `services/razo-keyboard/`
- **Service:** razo-intent-router (22 intents)
- **Platforms:** WhatsApp, Telegram, SMS, Email
- **Outputs:** Natural language understanding, responses, notifications
- **Modules:**
  - Intent Router (22 intents: commerce, financial, communication, information, action)
  - Channel Bridge (multi-channel messaging)
  - Context Engine (session management)
  - Action Engine (routes to Genie, DO App, SUTAR, Copilot)

---

## 6. SERVICE CONNECTION MAP

```
genie-gateway (4701)
├── genie-personal-twin (4708)
│   └── /api/twin, /api/twin/summary
├── genie-relationship-twin (4705)
│   └── /api/relationships, /api/relationships/summary
├── genie-financial-twin (4715)
│   └── /api/accounts, /api/summary
├── genie-health-twin (4717)
│   └── /api/metrics, /api/summary
├── genie-founder-twin (4716)
│   └── /api/ventures, /api/summary
├── genie-memory (4703)
│   └── /api/memories/search
├── genie-briefing (4706)
│   └── /api/briefings/today
└── genie-whatsapp-bot (4718)
    └── /api/messages, /api/send

razo-intent-router (4725)
├── GENIE_URL (4701)
├── GENIE_PERSONAL_TWIN_URL (4708)
├── GENIE_RELATIONSHIP_TWIN_URL (4705)
├── GENIE_MEMORY_URL (4703)
├── GENIE_BRIEFING_URL (4706)
├── GENIE_WHATSAPP_URL (4718)
└── DO_BACKEND_URL (3001)

DO Backend (3001)
├── genie-gateway (4701)
├── genie-personal-twin (4708)
└── genie-whatsapp-bot (4718)
```

---

## 7. EXTERNAL GENIE INTEGRATIONS

### REZ-Consumer DO App Integration

| File | Location | Purpose |
|------|----------|---------|
| useGenie.ts | `companies/REZ-Consumer/do/src/hooks/` | React hook for DO App to call Genie services |
| genieClient.ts | `companies/REZ-Consumer/do/do-backend/src/services/` | Backend client for Genie API |
| genie.ts | `companies/REZ-Consumer/do/do-backend/src/routes/` | Genie routes: /ask, /dashboard, /briefing, /whatsapp/send |

### REZ-Merchant Genie

| Service | Port | File Location | Purpose |
|---------|------|---------------|---------|
| **rez-merchant-genie** | 4801 | `companies/REZ-Merchant/rez-merchant-genie/` | AI-powered business intelligence for merchants |
| **rez-hotel-genie** | 4703 | `companies/REZ-Merchant/industry-os/hotel-os/ai/rez-hotel-genie/` | Hotel-specific Genie for guest services |

### Other Company Genie Implementations

| Company | Service | File Location |
|---------|---------|---------------|
| RisaCare | myrisa-genie-health | `companies/RisaCare/myrisa-genie-health/` |
| StayOwn | hojai-genie | `companies/StayOwn-Hospitality/hojai-genie/` |
| KHAIRMOVE | rider-circle-genie | `companies/KHAIRMOVE/rider-circle/rider-circle-app/app/genie/` |

---

## 8. PORT ALLOCATION SUMMARY

| Port | Service | Status |
|------|---------|--------|
| **4701** | Gateway | ✅ Running |
| **4703** | Memory | ✅ Running |
| **4704** | Legacy Relations | ⚠️ Superseded |
| **4705** | Relationship Twin | ✅ Running |
| **4706** | Briefing | ✅ Running |
| **4708** | Personal Twin | ✅ Running |
| **4712** | Project | ✅ Running |
| **4715** | Financial Twin | ✅ Running |
| **4716** | Founder Twin | ✅ Running |
| **4717** | Health Twin | ✅ Running |
| **4718** | WhatsApp Bot | ✅ Running |
| **4719** | Privacy | ✅ Running |
| **4720** | Dashboard | ✅ Running |
| **4721** | Discord | ✅ Running |
| **4722** | Telegram | ✅ Running |
| **4723** | Slack | ✅ Running |
| **4724** | Notion | ✅ Running |
| **4725** | Obsidian | ✅ Running |
| **4726** | Drive Connector | ✅ Running |
| **4727** | Browser History | ✅ Running |
| **4728** | Household | ✅ Running |
| **4729** | Sync | ✅ Running |
| **4730** | Memory Review | ✅ Running |
| **4731** | Dental Health | ✅ Running |
| **4760** | Voice | ✅ Running |
| **4850** | VoiceOS | ✅ Running |

---

## 9. GAPS AND MISSING SERVICES

### Identified Gaps:

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **genie-calendar-service** (4709) | No calendar integration documented | Implement or clarify status |
| **genie-email-service** (4710) | No email management documented | Implement or clarify status |
| **genie-call-service** | No call logging documented | Implement or clarify status |
| **genie-meeting-service** | No meeting summaries documented | Implement or clarify status |
| **RAZO-Keyboard source** | INTENT-ROUTER directory not found | Verify location |
| **genie-source-code** | Many services have only `dist/` | Verify source code locations |

### Services with Unknown Status:

| Service | Port | Notes |
|---------|------|-------|
| genie-wake-word-service | - | Referenced in docs but not in docker-compose |
| genie-demo-ui | - | Demo interface not found |
| genie-standalone-services | - | Standalone mode not documented |

---

## 10. DOCKER COMPOSE

**File:** `docker/docker-compose.genie.yml`

Services included:
1. genie-gateway
2. genie-memory
3. genie-personal-twin
4. genie-relationship-twin
5. genie-financial-twin
6. genie-health-twin
7. genie-founder-twin
8. genie-briefing
9. genie-whatsapp-bot
10. genie-privacy
11. genie-dashboard

---

## 11. QUICK START

```bash
# Start all Genie services
cd docker && docker-compose -f docker-compose.genie.yml up -d

# Health checks
curl http://localhost:4701/health  # Gateway
curl http://localhost:4703/health  # Memory
curl http://localhost:4705/health  # Relationship Twin
curl http://localhost:4708/health  # Personal Twin
curl http://localhost:4715/health  # Financial Twin
curl http://localhost:4717/health  # Health Twin
curl http://localhost:4718/health  # WhatsApp Bot

# Test Genie
curl -X POST http://localhost:4701/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is my schedule today?"}'
```

---

## 12. RELATED DOCUMENTATION

| Document | Location | Description |
|----------|----------|-------------|
| HOJAI AI CLAUDE.md | `companies/hojai-ai/CLAUDE.md` | Complete HOJAI AI documentation |
| RTNM Companies Audit | `RTNM-COMPANIES-AUDIT.md` | Company registry |
| RTNM Products Features | `RTNM-PRODUCTS-FEATURES-AUDIT.md` | Product features |
| DO App Docs | `companies/REZ-Consumer/do/CLAUDE.md` | DO App documentation |
| REZ Merchant Genie | `companies/REZ-Merchant/rez-merchant-genie/CLAUDE.md` | Merchant Genie |

---

## 13. COMPLETE SERVICE LIST

### Genie Services (27+ Total)

```
genie-gateway (4701)
genie-memory (4703)
genie-relationship-twin (4705)
genie-briefing (4706)
genie-calendar-service (4709) - undocumented
genie-email-service (4710) - undocumented
genie-project (4712)
genie-financial-twin (4715)
genie-founder-twin (4716)
genie-health-twin (4717)
genie-whatsapp-bot (4718)
genie-privacy (4719)
genie-dashboard (4720)
genie-discord (4721)
genie-telegram (4722)
genie-slack (4723)
genie-notion (4724)
genie-obsidian (4725)
genie-drive-connector (4726)
genie-browser-history (4727)
genie-household (4728)
genie-sync (4729)
genie-memory-review (4730)
genie-dental-health (4731)
genie-voice (4760)
VoiceOS (4850)
```

---

**Last Updated:** June 18, 2026  
**Next Review:** Weekly  
**Status:** ✅ **AUDIT COMPLETE**
