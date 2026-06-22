# HOJAI AI - Complete Platform Reference

**Last Updated:** May 27, 2026
**Version:** 1.0.0

---

## Platform Architecture

```
                          HOJAI AI
              (AI Infrastructure Platform)

┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE LAYER                                      │
│  API Gateway (4500) │ Event Bus (4510) │ Signal Validation (4515)         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          GOVERNANCE LAYER                                    │
│  Authentication (4501) │ Policy Engine (4505) │ Compliance (Future)       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTELLIGENCE LAYER                                   │
│  Memory (4520) │ Intelligence (4530) │ ML Registry (4540) │ HITL (4517)  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTOMATION LAYER                                   │
│  Agents (4550) │ Flow (4560) │ Cost (4516)                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCT LAYER                                     │
│  WhatsApp AI (4570) │ Analytics (4580) │ Communications (4590)            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            MOAT LAYER                                      │
│  Trust Graph (4518) │ Reputation │ Cross-App Identity                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Platform Registry

| # | Platform | Port | Type | Purpose |
|---|----------|------|------|---------|
| 1 | API Gateway | 4500 | Gateway | Unified entry point |
| 2 | Event Bus | 4510 | Core | Event ingestion & streaming |
| 3 | Governance | 4501 | Governance | Auth, RBAC, tenant isolation |
| 4 | Policy Engine | 4505 | Governance | Consent, data rights |
| 5 | Memory | 4520 | Intelligence | Customer profiles, timeline |
| 6 | Intelligence | 4530 | Intelligence | ML predictions, decisions |
| 7 | ML Registry | 4540 | Intelligence | Model hierarchy, routing |
| 8 | Signal Validation | 4515 | Intelligence | Event normalization, dedup |
| 9 | HITL | 4517 | Automation | Human review, escalation |
| 10 | Cost Governance | 4516 | Automation | AI cost tracking |
| 11 | Agents | 4550 | Automation | Autonomous AI agents |
| 12 | Flow | 4560 | Automation | Workflow orchestration |
| 13 | WhatsApp AI | 4570 | Product | AI employee for businesses |
| 14 | Analytics | 4580 | Product | Attribution, A/B testing |
| 15 | Communications | 4590 | Product | Multi-channel messaging |
| 16 | Trust Graph | 4518 | Moat | Reputation, verification |

---

## Platform Details

### 1. API Gateway (Port 4500)

Unified entry point for all Hojai services.

**Features:**
- Service routing
- Authentication
- Rate limiting
- Request logging

### 2. Event Bus (Port 4510)

Event ingestion and streaming infrastructure.

**Features:**
- 47 event types
- Redis Pub/Sub
- Kafka support
- Dead letter queue
- Event replay

### 3. Governance (Port 4501)

Multi-tenant authentication and authorization.

**Features:**
- JWT + API keys
- RBAC (30+ permissions)
- Tenant isolation
- Audit logging

### 4. Policy Engine (Port 4505)

Consent management and data rights.

**Features:**
- 11 consent types
- GDPR/DPDPA compliance
- Data right requests
- Retention policies
- Policy rules engine

### 5. Memory (Port 4520)

Customer profiles and timeline.

**Features:**
- Customer memories
- Session context
- Conversation history
- User profiles

### 6. Intelligence (Port 4530)

ML predictions and decision engine.

**Features:**
- Churn prediction
- LTV prediction
- RFM analysis
- Recommendations
- Decision engine (cashback, fraud)

### 7. ML Registry (Port 4540)

Model hierarchy and routing.

**Features:**
- 4 model tiers (Global, Vertical, Tenant, Privileged)
- Rule-based routing
- Cost tracking
- Prompt templates

### 8. Signal Validation (Port 4515)

Event normalization and quality.

**Features:**
- Schema validation
- Deduplication
- Identity resolution
- Anomaly detection
- Quality metrics

### 9. HITL (Port 4517)

Human-in-the-loop approval.

**Features:**
- Confidence thresholds
- Review workflows
- Escalation rules
- SLA tracking

### 10. Cost Governance (Port 4516)

AI cost tracking and budgets.

**Features:**
- Cost tracking per operation
- Budget limits
- Alert thresholds
- Cost attribution

### 11. Agents (Port 4550)

Autonomous AI agents.

**Features:**
- 8 agent types
- Tool integration
- Knowledge base
- Insights generation

### 12. Flow (Port 4560)

Workflow orchestration.

**Features:**
- Workflow CRUD
- Step execution
- BullMQ jobs
- Run history

### 13. WhatsApp AI (Port 4570)

AI employee product.

**Features:**
- WhatsApp webhook
- AI responses
- Intent detection
- Automation rules
- Knowledge base

### 14. Analytics (Port 4580)

Attribution and experimentation.

**Features:**
- Multi-touch attribution (6 models)
- A/B testing
- Audience targeting
- Reports

### 15. Communications (Port 4590)

Multi-channel messaging.

**Features:**
- SMS (Twilio)
- Email (SendGrid)
- WhatsApp
- Push (Firebase)
- Templates & campaigns

### 16. Trust Graph (Port 4518)

Reputation and verification.

**Features:**
- Trust scores (0-100)
- Trust levels (Unverified → Elite)
- Reviews & ratings
- Verifications
- Trust edges
- Badges

---

## Data Flow

```
USER ACTION
    │
    ▼
┌─────────────────┐
│  Signal (4515)  │ ── Validation
│  Validation     │ ── Deduplication
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Event Bus      │
│  (4510)         │
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  Memory (4520)  │  │  ML (4530)      │
│  Profiles       │  │  Predictions    │
└────────┬────────┘  └────────┬────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐  ┌─────────────────┐
│  Intelligence    │  │  Cost (4516)    │
│  (4530)         │  │  Tracking       │
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│  HITL (4517)    │ ── If confidence < threshold
│  Review         │
└────────┬────────┘
         │ (approved)
         ▼
┌─────────────────┐
│  Flow (4560)    │ ── Workflow execution
│  Automation     │
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  WhatsApp (4570)│  │  Comms (4590)    │
│  AI Response    │  │  SMS/Email/Push  │
└─────────────────┘  └─────────────────┘
```

---

## Model Hierarchy

```
GLOBAL (Open)
├── GPT-4, Claude, Llama
├── Language, embedding, vision
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

## Trust Level System

| Level | Score Range | Badge | Features |
|-------|-------------|-------|----------|
| UNVERIFIED | 0-24 | Gray | No verification |
| BASIC | 25-49 | Bronze | Basic info verified |
| VERIFIED | 50-74 | Silver | ID verified |
| TRUSTED | 75-89 | Gold | Multi-factor verified |
| ELITE | 90-100 | Platinum | Premium verified + high activity |

---

## Gap Filling Summary

| Gap | Platform | Status |
|-----|----------|--------|
| Consent & Data Rights | Policy (4505) | ✅ Done |
| Model Strategy | ML Registry (4540) | ✅ Done |
| Signal Validation | Signal (4515) | ✅ Done |
| Cost Governance | Cost (4516) | ✅ Done |
| Human-in-Loop | HITL (4517) | ✅ Done |
| Trust/Reputation | Trust Graph (4518) | ✅ Done |
| Distribution | Product | ⏳ Execute |

---

## Next Steps

1. **Deploy** all 16 platforms
2. **Connect** to REZ Intelligence
3. **Build** WhatsApp AI product wedge
4. **Acquire** first merchants
5. **Iterate** based on ROI

---

## Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Overview |
| [PLATFORM-CONSOLIDATION.md](PLATFORM-CONSOLIDATION.md) | REZ mapping |
| This document | Complete reference |
