# HOJAI AI - COMPLETE PLATFORM DOCUMENTATION

**Version:** 1.0.0
**Last Updated:** May 27, 2026
**Status:** COMPLETE - READY FOR DEPLOYMENT

---

## 1. OVERVIEW

### What is Hojai AI?

Hojai AI is an **AI-native operational intelligence infrastructure company** that helps businesses:
- Understand customers
- Predict behavior
- Automate operations
- Run AI workflows
- Deploy AI agents
- Make decisions in real time
- Optimize growth automatically

### Mission Statement

> "Every business deserves an AI employee that works 24/7, never takes a day off, and gets smarter every day."

---

## 2. ARCHITECTURE

### High-Level Architecture

```
                         ┌─────────────────────────────────────────────────────────────┐
                         │                         HOJAI AI                            │
                         │               (AI Infrastructure Platform)                │
                         │                                                              │
                         │   ┌───────────────────────────────────────────────┐   │
                         │   │                  CORE LAYER                     │   │
                         │   │  API Gateway │ Event Bus │ Signal Validation │      │   │
                         │   └───────────────────────────────────────────────┘   │
                         │                                                              │
                         │   ┌───────────────────────────────────────────────┐   │
                         │   │               GOVERNANCE LAYER                   │   │
                         │   │       Authentication │ Policy │ Compliance │         │   │
                         │   └───────────────────────────────────────────────┘   │
                         │                                                              │
                         │   ┌───────────────────────────────────────────────┐   │
                         │   │             INTELLIGENCE LAYER                   │   │
                         │   │  Memory │ Intelligence │ ML │ Signal │ HITL │       │   │
                         │   └───────────────────────────────────────────────┘   │
                         │                                                              │
                         │   ┌───────────────────────────────────────────────┐   │
                         │   │              AUTOMATION LAYER                   │   │
                         │   │      Agents │ Flow │ Cost │ Trust │ HITL │        │   │
                         │   └───────────────────────────────────────────────┘   │
                         │                                                              │
                         │   ┌───────────────────────────────────────────────┐   │
                         │   │                PRODUCT LAYER                     │   │
                         │   │   WhatsApp AI │ Analytics │ Communications │        │   │
                         │   └───────────────────────────────────────────────┘   │
                         └─────────────────────────────────────────────────────────────┘

                                    ▲                              ▲
                                    │                              │
                    ┌───────────────┴───────────────┐  ┌─────────────┴─────────────┐
                    │    REZ INTELLIGENCE         │  │    EXTERNAL TENANTS       │
                    │      (Privileged)           │  │      (Isolated)           │
                    └─────────────────────────────┘  └─────────────────────────────┘
```

---

## 3. COMPLETE PLATFORM REGISTRY

### 16 Platforms Built

| # | Platform | Port | Type | Files | Description |
|---|----------|------|------|-------|-------------|
| 1 | **API Gateway** | 4500 | Gateway | 3 | Unified entry point |
| 2 | **Event Bus** | 4510 | Core | 9 | Event ingestion & streaming |
| 3 | **Governance** | 4501 | Governance | 11 | Auth, RBAC, tenant isolation |
| 4 | **Policy Engine** | 4505 | Governance | 4 | Consent, data rights, GDPR |
| 5 | **Signal Validation** | 4515 | Intelligence | 4 | Event normalization, dedup |
| 6 | **Memory** | 4520 | Intelligence | 8 | Profiles, timeline, context |
| 7 | **Intelligence** | 4530 | Intelligence | 10 | ML predictions, decisions |
| 8 | **ML Registry** | 4540 | Intelligence | 5 | Model hierarchy, routing |
| 9 | **HITL** | 4517 | Automation | 5 | Human review, escalation |
| 10 | **Cost** | 4516 | Automation | 5 | AI cost tracking, budgets |
| 11 | **Agents** | 4550 | Automation | 5 | Autonomous AI agents |
| 12 | **Flow** | 4560 | Automation | 5 | Workflow orchestration |
| 13 | **WhatsApp AI** | 4570 | Product | 8 | AI employee product |
| 14 | **Analytics** | 4580 | Product | 5 | Attribution, A/B testing |
| 15 | **Communications** | 4590 | Product | 5 | SMS, Email, Push, WhatsApp |
| 16 | **Trust Graph** | 4518 | Moat | 5 | Reputation, verification |

---

## 4. PLATFORM DETAILS

### 4.1 API Gateway (Port 4500)

**Purpose:** Single entry point for all Hojai services

**Routes:**
- `/api/events` - Event publishing
- `/api/memories` - Memory operations
- `/api/predict` - ML predictions
- `/api/recommend` - Recommendations
- `/api/decide` - Decisions
- `/api/agents` - Agent execution
- `/api/messages` - Communications
- `/api/workflows` - Workflow management

---

### 4.2 Event Bus (Port 4510)

**Purpose:** Event ingestion, streaming, and routing

**Event Categories (47 types):**
- Commerce (8) - orders, payments, refunds
- Identity (5) - login, signup, profile
- Loyalty (7) - points, tier, referral
- Engagement (8) - views, clicks, cart
- Intelligence (6) - intent, churn, LTV
- Support (6) - tickets, chat, CSAT
- Media (4) - impressions, conversions
- Delivery (3) - pickup, transit, delivered

**Features:** Redis Pub/Sub, Kafka support, Dead letter queue, Event replay, 30-day retention

---

### 4.3 Governance (Port 4501)

**Purpose:** Multi-tenant authentication and authorization

**Features:**
- JWT + API key auth
- RBAC (30+ permissions)
- Tenant isolation (DB, Redis, Event namespaces)
- Audit logging (2-year retention)
- Rate limiting

---

### 4.4 Policy Engine (Port 4505)

**Purpose:** Consent management and data rights

**Consent Types (11):** Data collection, Marketing, Analytics, AI processing, AI training, Data sharing, Third-party sharing, Profiling, Automated decisions, Location tracking, Custom

**Data Rights:** Access, Rectification, Erasure, Restriction, Portability, Objection, Human review

**Retention Policies (6):** Active user, Inactive user, Transaction, Consent-based, Legal hold, Anonymized

---

### 4.5 Signal Validation (Port 4515)

**Purpose:** Event quality, normalization, deduplication

**Features:**
- Schema validation (Zod)
- Deduplication (Redis, 5-min window)
- Identity resolution
- Anomaly detection
- Quality scoring (Excellent → Invalid)

---

### 4.6 Memory (Port 4520)

**Purpose:** Customer profiles, timeline, and context

**Memory Types:** Interaction, Preference, Behavior, Context, Knowledge, Conversation

---

### 4.7 Intelligence (Port 4530)

**Purpose:** ML predictions and decision engine

**Predictions:**
| Type | Description | Cache |
|------|-------------|-------|
| Churn | Will customer stop buying? | 24h |
| LTV | Lifetime value prediction | 7d |
| Revisit | Will customer return? | 24h |
| Conversion | Will user convert? | 1h |

**RFM Analysis:** Champions, Loyal, Potential, At Risk, Lost

**Decision Engine:** Cashback decisions, Fraud detection, Targeting, Offer eligibility

---

### 4.8 ML Registry (Port 4540)

**Purpose:** Model hierarchy and intelligent routing

**Model Tiers:**
| Tier | Examples | Access |
|------|---------|--------|
| GLOBAL | GPT-4, Claude, Llama | All tenants |
| VERTICAL | Hospitality, Healthcare | Selected |
| TENANT | Custom fine-tuned | Isolated |
| PRIVILEGED | Cross-app models | REZ only |

---

### 4.9 HITL (Port 4517)

**Purpose:** Human-in-the-loop approval and escalation

**Confidence Actions:**
- Auto-approve (>0.7)
- Review (0.3-0.7)
- Auto-block (<0.3)

---

### 4.10 Cost (Port 4516)

**Purpose:** AI cost tracking and budget management

**Cost Categories:** Inference, Storage, Compute, API calls, Vector operations, Event processing

---

### 4.11 Agents (Port 4550)

**Purpose:** Autonomous AI agents

**Agent Types (8):** Demand Signal, Scarcity, Personalization, Attribution, Adaptive Scoring, Feedback Loop, Network Effect, Revenue Attribution

---

### 4.12 Flow (Port 4560)

**Purpose:** Workflow orchestration

**Step Types:** Trigger, Action, Condition, Delay, HTTP Request, Transform, Notification

---

### 4.13 WhatsApp AI (Port 4570) - FIRST PRODUCT

**Purpose:** AI employee for WhatsApp

**Features:**
- WhatsApp webhook handler
- AI response generation
- Intent detection
- Knowledge base answers
- Automation rules
- Conversation management

---

### 4.14 Analytics (Port 4580)

**Purpose:** Attribution and experimentation

**Attribution Models (6):** First touch, Last touch, Linear, Time decay, Position based, Data-driven

---

### 4.15 Communications (Port 4590)

**Purpose:** Multi-channel messaging

**Channels:** SMS (Twilio), Email (SendGrid), WhatsApp (Meta API), Push (Firebase)

---

### 4.16 Trust Graph (Port 4518)

**Purpose:** Reputation and trust scoring

**Trust Levels:**
| Score | Level | Badge |
|-------|-------|-------|
| 90-100 | Elite | Platinum |
| 75-89 | Trusted | Gold |
| 50-74 | Verified | Silver |
| 25-49 | Basic | Bronze |
| 0-24 | Unverified | Gray |

---

## 5. DATA FLOW

```
USER ACTION
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    SIGNAL VALIDATION (4515)                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                       EVENT BUS (4510)                        │
└─────────────────────────────────────────────────────────────┘
    │
    ├──► MEMORY (4520)
    ├──► INTELLIGENCE (4530)
    ├──► COST (4516)
    └──► AGENTS (4550)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                       HITL CHECK (4517)                       │
│  If confidence < 0.7? → Pending Human Review                │
└─────────────────────────────────────────────────────────────┘
    │ (approved)
    ▼
┌─────────────────────────────────────────────────────────────┐
│                      FLOW ENGINE (4560)                        │
└─────────────────────────────────────────────────────────────┘
    │
    ├──► WHATSAPP AI (4570)
    ├──► COMMUNICATIONS (4590)
    └──► TRUST GRAPH (4518)
```

---

## 6. MODEL HIERARCHY

```
GLOBAL (Open)
├── GPT-4, Claude, Llama
└── Any tenant can use

VERTICAL (Industry)
├── Hospitality model
├── Healthcare model
├── Travel model
└── Commerce model

TENANT (Fine-tuned)
├── Merchant-specific intelligence
├── Custom workflows
└── Isolated training data

PRIVILEGED (REZ-only)
├── Cross-app behavioral models
├── Mobility + commerce graph
└── Ecosystem prediction models
```

---

## 7. REZ INTELLIGENCE CONNECTION

### Relationship

```
HOJAI AI (Infrastructure)
        │
        ├── REZ INTELLIGENCE (Privileged super-tenant)
        │   └── Full access + cross-app data
        │
        └── EXTERNAL TENANTS (Isolated)
            └── Own data only
```

### Strategic Value

> REZ Intelligence is the **privileged super-tenant** on Hojai AI.

**Benefits:**
- REZ keeps competitive moat
- External tenants trust isolation
- Network effects grow
- Data compounding increases

---

## 8. FILE STRUCTURE

```
hojai-ai/
├── packages/ (16 platforms)
│   ├── hojai-api-gateway/      # 4500
│   ├── hojai-event/            # 4510
│   ├── hojai-governance/       # 4501
│   ├── hojai-policy/          # 4505
│   ├── hojai-signal/          # 4515
│   ├── hojai-memory/          # 4520
│   ├── hojai-intelligence/    # 4530
│   ├── hojai-ml/             # 4540
│   ├── hojai-hitl/           # 4517
│   ├── hojai-cost/           # 4516
│   ├── hojai-agents/         # 4550
│   ├── hojai-flow/           # 4560
│   ├── hojai-analytics/       # 4580
│   ├── hojai-communications/  # 4590
│   └── hojai-trust/           # 4518
├── products/
│   └── hojai-whatsapp-ai/    # 4570 + Dashboard
│       └── dashboard/
│           ├── landing.html
│           ├── onboarding.html
│           ├── demo.html
│           └── index.html
├── sdk/typescript/
└── docs/
```

---

## 9. METRICS

### Platform Metrics

| Metric | Target |
|--------|--------|
| API Latency P99 | < 200ms |
| Event Processing | 10,000/sec |
| ML Inference | < 500ms |
| Uptime | 99.9% |
| Data Isolation | 100% |

### Product Metrics

| Metric | Target |
|--------|--------|
| AI Automation Rate | > 80% |
| Response Time | < 5 seconds |
| CSAT | > 90% |
| Time to Setup | < 10 minutes |

---

## 10. DEPLOYMENT

### Docker Compose

```bash
cd hojai-ai
docker-compose up -d
```

### Service Ports

| Service | Port |
|---------|------|
| API Gateway | 4500 |
| Event | 4510 |
| Governance | 4501 |
| Policy | 4505 |
| Signal | 4515 |
| Memory | 4520 |
| Intelligence | 4530 |
| ML | 4540 |
| HITL | 4517 |
| Cost | 4516 |
| Agents | 4550 |
| Flow | 4560 |
| WhatsApp AI | 4570 |
| Analytics | 4580 |
| Communications | 4590 |
| Trust | 4518 |

---

## 11. FILE COUNTS

| Category | Count |
|----------|-------|
| Packages | 16 |
| TypeScript Files | 73+ |
| Product Pages | 4 |
| Documentation Files | 5 |
| **Total** | **98+** |

---

**Hojai AI Status: READY FOR DEPLOYMENT**
**Version: 1.0.0**
**Date: May 27, 2026**
