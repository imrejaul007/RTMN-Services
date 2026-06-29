# 🗺️ GENIE INTEGRATION MAP
**Date:** June 29, 2026
**Architecture:** 14 services + Genie Runtime + RTMN Hub

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  External Request                                                │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  RTMN UNIFIED HUB (Port 4399)                                   │
│  /services/rtmn-unified-hub/                                    │
│                                                                  │
│  - Service Registry (25+ services)                              │
│  - Health Monitoring (every 30s)                                │
│  - Path Routing                                                  │
│  - Unified Dashboard Endpoint                                    │
└────────────────────────┬────────────────────────────────────────┘
                         ↓ /api/*
┌─────────────────────────────────────────────────────────────────┐
│  GENIE OS RUNTIME (Port 7100)                                   │
│  products/genie/genie-os/runtime/genie/                         │
│                                                                  │
│  - User Auth (MongoDB + JWT)                                    │
│  - Intent Detection (keyword + LLM)                            │
│  - Routing to 14 services via /api/genie/*                      │
│  - Conversation Memory                                           │
│  - Admin / PIOS / Voice OS integration                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
         ┌───────────────┴────────────────┐
         ↓                                ↓
┌─────────────────────┐      ┌──────────────────────┐
│  Genie Services     │      │  RTMN Foundation     │
│  4740-4755          │      │  MemoryOS/TwinOS/etc  │
└─────────────────────┘      └──────────────────────┘
```

---

## URL Routes

### RTMN Hub (4399) — Public Gateway

| Path | Routes To | Port |
|------|-----------|------|
| `/health` | Hub health | 4399 |
| `/ready` | All services ready? | 4399 |
| `/api/services` | Service registry | 4399 |
| `/api/health/all` | Check all 25+ services | 4399 |
| `/api/genie/dashboard/:userId` | **Unified dashboard** | 4399 |
| `/api/genie/*` | Genie OS Runtime | 7100 |
| `/api/services/decision/*` | Decision Intelligence | 4740 |
| `/api/services/learning/*` | Learning Loop | 4742 |
| `/api/services/anticipation/*` | Anticipation | 4745 |
| `/api/services/ambient/*` | Ambient | 4746 |
| `/api/services/constitution/*` | Constitution | 4743 |
| `/api/services/financial/*` | Financial Life | 4747 |
| `/api/services/health/*` | Health Intelligence | 4748 |
| `/api/services/household/*` | Household | 4749 |
| `/api/services/travel/*` | Travel | 4750 |
| `/api/services/spiritual/*` | Spiritual | 4751 |
| `/api/services/simulation/*` | Life Simulation | 4752 |
| `/api/services/focus/*` | Focus | 4753 |
| `/api/services/dreams/*` | Dreams | 4754 |
| `/api/services/legacy/*` | Legacy | 4755 |
| `/api/memory/*` | MemoryOS | 4703 |
| `/api/twin/*` | TwinOS | 4705 |
| `/api/corpid/*` | CorpID | 4702 |
| `/api/calendar/*` | Calendar | 4709 |
| `/api/wellness/*` | Wellness | 4723 |
| `/api/money/*` | Money | 4724 |
| `/api/sutar/*` | SUTAR | 4140 |
| `/api/razo/*` | RAZO | 4299 |
| `/api/genie-gateway/*` | Genie Gateway | 4701 |
| `/api/wishes/*` | Genie Wish Fulfillment | 4001 |
| `/api/fulfillments/*` | Genie Wish Fulfillment | 4001 |
| `/api/templates/*` | Genie Wish Fulfillment | 4001 |
| `/api/skills/*` | Genie Wish Fulfillment | 4001 |
| `/api/genie-twins/*` | Genie Wish Fulfillment (twins route) | 4001 |
| `/api/genie-agents/*` | Genie Wish Fulfillment (agents route) | 4001 |

---

### Genie OS Runtime (7100) — Internal Router

| Path | Service | Port |
|------|---------|------|
| `/api/genie/decisions/*` | Decision Intelligence | 4740 |
| `/api/genie/learning/*` | Learning Loop | 4742 |
| `/api/genie/anticipation/*` | Anticipation | 4745 |
| `/api/genie/ambient/*` | Ambient | 4746 |
| `/api/genie/constitution/*` | Constitution | 4743 |
| `/api/genie/financial/*` | Financial Life | 4747 |
| `/api/genie/health-intel/*` | Health Intelligence | 4748 |
| `/api/genie/household/*` | Household | 4749 |
| `/api/genie/travel/*` | Travel | 4750 |
| `/api/genie/spiritual/*` | Spiritual | 4751 |
| `/api/genie/simulation/*` | Life Simulation | 4752 |
| `/api/genie/focus/*` | Focus | 4753 |
| `/api/genie/dreams/*` | Dreams | 4754 |
| `/api/genie/legacy/*` | Legacy | 4755 |
| `/api/genie-services/all/status` | All 14 services status | internal |
| `/api/ask` | Genie AI ask endpoint | internal |
| `/api/auth/*` | User authentication | internal |
| `/api/admin/*` | Admin endpoints | internal |

---

## Service Dependencies

```
Genie OS Runtime (7100)
├── Depends on:
│   ├── Genie Gateway (4701) — Home screen
│   ├── MemoryOS (4703) — Memory persistence
│   ├── TwinOS (4705) — User twins
│   ├── CorpID (4702) — Identity
│   ├── Calendar (4709) — Calendar events
│   ├── Wellness (4723) — Health data
│   ├── Money (4724) — Financial data
│   ├── LLM (4520) — Language model
│   ├── RAZO (4299) — Communication
│   └── 14 Genie services (4740-4755)

Genie Wish Fulfillment (4001) [PRE-EXISTING]
├── Handles: wishes, fulfillments, templates, skills, twins, agents
├── Routes: /api/wishes, /api/fulfillments, /api/templates, /api/skills, /api/twins, /api/agents
└── Purpose: AI Wish Fulfillment (different from Personal Intelligence Genie)

RTMN Hub (4399)
└── Depends on:
    └── Genie OS Runtime (7100)
    └── Genie Wish Fulfillment (4001)
    └── All 14 Genie services (4740-4755)
    └── All RTMN foundation services
```

---

## End-to-End Flow Example

### User asks: "Why did we choose Dubai?"

```
1. User → POST http://localhost:4399/api/services/decision/why?userId=...
   (or via Genie OS: POST http://localhost:7100/api/genie/decisions/why)

2. Hub (4399) routes to Decision Intelligence (4740)

3. Decision Intelligence processes query

4. Returns: "On 2026-01-15, you decided: 'Launch in Dubai'. Reason: GCC market..."

5. Response back to user
```

### User dashboard:

```
GET http://localhost:4399/api/genie/dashboard/user_123

Returns aggregated data from:
- Decision Intelligence (recent decisions)
- Learning Loop (preferences)
- Anticipation (predictions)
- Constitution (rules)
- Financial (burn rate)
- Health (insights)
- Household (alerts)
- Focus (stats)
- Dreams (recent)
- Legacy (entries)
```

---

## Environment Variables

All services need:
```bash
REDIS_URL=redis://localhost:6379
PORT=<service_port>
INTERNAL_SERVICE_TOKEN=<shared_token>
```

Optional per-service:
```bash
# For Decision Intelligence, Learning, Dreams, Legacy (LLM-powered)
GENIE_LLM_URL=http://localhost:4520
GENIE_LLM_KEY=<key>

# For services that call other services
DECISION_INTELLIGENCE_URL=http://localhost:4740
LEARNING_LOOP_URL=http://localhost:4742
ANTICIPATION_URL=http://localhost:4745
# ... etc for all 14

# For Hub
GENIE_RUNTIME_URL=http://localhost:7100
RTMN_HUB_URL=http://localhost:4399
```

---

## Deployment Topology

```
┌─────────────────────────────────────┐
│  External Clients                    │
│  - DO App                            │
│  - RAZO Mobile                       │
│  - Web UI                            │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  RTMN UNIFIED HUB :4399              │ ← Single public entry
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  GENIE OS RUNTIME :7100              │ ← Internal orchestration
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  14 Genie Services :4740-4755       │ ← Domain services
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  Redis (state) + MongoDB (auth)     │
└─────────────────────────────────────┘
```

---

*Architecture designed and implemented — June 29, 2026*