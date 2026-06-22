# HOJAI AI - MASTER SOURCE OF TRUTH (SOT)
**Version:** 5.0 | **Date:** June 3, 2026 | **Status:** COMPLETE

---

# POSITIONING

```
HOJAI AI

Operational AI Infrastructure Company

Building AI Operating Systems
for organizations and individuals.
```

---

# WHAT IS HOJAI AI?

**HOJAI AI** is an **Operational AI Infrastructure Company** that builds AI Operating Systems for organizations and individuals.

HOJAI AI powers the entire **REZ ecosystem** (16 companies, 615+ services) while also selling AI capabilities externally to non-REZ businesses.

## Core Philosophy
> "AI employees should work for you, not the other way around."

---

# PRODUCTS & SERVICES

## 1. AI Infrastructure Products

| Product | Description | Ports |
|--------|-------------|-------|
| **HOJAI Core** | 12 core platforms (API Gateway, Event, Memory, Intelligence, Agents, Workflows, Communications, etc.) | 4500-4610 |
| **HOJAI Company Brain** | Organizational memory layer - SOPs, policies, org charts, training materials accessible to AI agents | Part of Memory |
| **Memory Infrastructure** | Multi-tier memory: conversation, preference, interaction, knowledge - with vector embeddings | 4520 |
| **TrustOS** | Trust scoring (0-100), fraud detection, identity verification, access control | 4518 |

## 2. AI-Native Service Platforms

| Product | Description | Ports |
|--------|-------------|-------|
| **AI-Native Compliance** | ZeroDrift AI Compliance Firewall - pre-send validation, policy engine, enforcement, PII detection | 4180-4185 |
| **AI-Native HR Services** | AI workforce management - agent teams, departments, marketplace, performance tracking | 4820 |
| **AI-Native Marketing** | Agent marketplace (86+ agents), enterprise search, campaign automation | 4620, 4860 |
| **AI-Native Customer Support** | REZ Care - Customer 360, sentiment tracking, auto-ticket, WhatsApp integration | 4058 |

## 3. REZ Intelligence (Privileged Tenant)

Built ON HOJAI Core, powers the entire REZ ecosystem.

| Category | Services | Ports |
|----------|----------|-------|
| **Intent & Memory** | Intent Predictor, Memory Engine, Memory Layer | 4018, 4201 |
| **AI Agents** | Agent Registry, Autonomous Agents, Commerce Agents | - |
| **Commerce** | Recommendation Engine, Personalization, Pricing | - |
| **Graphs** | Consumer Graph, Merchant Graph, Universal User Graph | 4055, 4170 |
| **ML Pipeline** | ML Engine, Feature Store, Model Registry | - |

**Total: 186+ services**

## 4. CorpID Trust Graph (CorpPerks)

Universal CI (Composite Index) scoring across the RTNM ecosystem.

| Aspect | Details |
|--------|---------|
| **CI Score** | 0-1000 composite trust score |
| **Factors** | Identity (15%), Employment (20%), Skills (15%), Reputation (25%), Compliance (10%), References (15%) |
| **Passports** | Career passport, Business passport |
| **Services** | 10 microservices | 4701-4710 |

## 5. Razo - Voice AI

**Razo** is the voice AI product for voice-based AI workforce.

| Feature | Description |
|---------|-------------|
| **Multi-channel** | Phone (Twilio, Exotel), WhatsApp Voice, Web, Mobile, Video |
| **STT** | Whisper, Sarvam, Google |
| **TTS** | ElevenLabs, Cartesia, Sarvam |
| **Languages** | English (active), Hindi, Tamil, Telugu, Bengali, Kannada (coming) |
| **Voice Agents** | Receptionist, SDR, Support, Booking, Collections, CFO, HR |

---

# ARCHITECTURE

```
HOJAI AI (PARENT COMPANY)
│
├── HOJAI CORE (12 platforms, 4500-4610)
│   ├── API Gateway (4500)
│   ├── Governance (4501)
│   ├── Event Bus (4510)
│   ├── Trust (4518)
│   ├── Memory (4520)
│   ├── Intelligence (4530)
│   ├── Agents (4550)
│   ├── Workflows (4560)
│   ├── Communications (4570)
│   ├── Hyperlocal (4580)
│   ├── Data (4590)
│   ├── Identity (4600)
│   └── Analytics (4610)
│
├── ML PLATFORM (10 services, 4710-4742)
│   ├── Feature Store (4710)
│   ├── Model Registry (4711)
│   ├── Model Router (4712)
│   ├── Embedding Service (4720)
│   ├── pgvector Service (4721)
│   ├── LLM Providers (4730)
│   ├── RAG Pipeline (4731)
│   ├── Churn Model (4740)
│   ├── LTV Model (4741)
│   └── Recommendation Engine (4742)
│
├── VOICE AI (Razo)
│   └── VoiceOS (4850+)
│
├── HOJAI INTELLIGENCE (5 services, 4750-4754) ← Commercial
│
├── REZ INTELLIGENCE (Privileged Tenant, 3000-4300) ← Built ON CORE
│
├── GENIE (Personal AI, 4702-4707)
│
├── UNIFIED PLATFORM (4850)
│
└── TRAINING PIPELINE (4880)
```

---

# 12 HOJAI CORE PLATFORMS

| Port | Platform | Purpose |
|------|----------|---------|
| 4500 | api-gateway | Routing, auth, rate limiting |
| 4501 | governance | RBAC, audit, permissions |
| 4510 | event | Event bus |
| 4518 | trust | Trust scoring, fraud detection |
| 4520 | memory | Vector store, organizational memory |
| 4530 | intelligence | ML predictions |
| 4550 | agents | AI employee orchestration |
| 4560 | workflows | Automation |
| 4570 | communications | SMS, Email, WhatsApp |
| 4580 | hyperlocal | Geo intelligence |
| 4590 | data | Feature store, canonical models |
| 4600 | identity | Identity resolution |
| 4610 | analytics | BI, dashboards |
| 4620 | enterprise-search | Glean competitor |

---

# ML PLATFORM - 10 SERVICES

## MLOps (3)

| Port | Service | Purpose |
|------|---------|---------|
| 4710 | feature-store | ML feature management |
| 4711 | model-registry | Model versioning |
| 4712 | model-router | Routing to right model |

## Vector (2)

| Port | Service | Purpose |
|------|---------|---------|
| 4720 | embedding-service | Text embeddings |
| 4721 | pgvector-service | Vector storage + similarity search |

## LLM (2)

| Port | Service | Purpose |
|------|---------|---------|
| 4730 | providers | LLM provider management |
| 4731 | rag | RAG pipeline |

## Models (3)

| Port | Service | Purpose |
|------|---------|---------|
| 4740 | churn-model | Churn prediction |
| 4741 | ltv-model | LTV prediction |
| 4742 | recommendation-engine | Product/user recommendations |

---

# VOICE AI (Razo)

## Architecture

```
Voice Gateway (Phone, WhatsApp, Web, Mobile, Video)
        ↓
Speech Engine (STT: Whisper, Sarvam / TTS: ElevenLabs, Cartesia)
        ↓
Voice Brain (Intent Engine, Context Engine, Memory Engine)
        ↓
Action Engine (Book, Cancel, Refund, Order, Payment, Reserve)
        ↓
Business Systems (RABTUL, REZ, Merchant, Ride, Care, Finance)
```

## Voice Agents

| Agent | Purpose |
|-------|---------|
| Receptionist | Answers calls, books appointments |
| SDR | Qualifies leads, schedules demos |
| Support Agent | Handles complaints, refunds |
| Booking Agent | Books tables, services, rides |
| Collections Agent | Payment follow-ups |
| CFO Agent | Financial queries |
| HR Agent | Employee queries |

---

# TRUST PRODUCTS

## TrustOS

**What it solves:** Trust scores, fraud detection, identity verification for the entire platform.

| Component | Purpose |
|-----------|---------|
| Identity Management | Create/manage individual and business identities |
| KYC Processing | Document submission, OCR extraction, verification |
| Trust Scoring | 5-component scoring (identity, documents, transactions, social, platform) |
| Fraud Detection | Velocity checks, anomaly detection, synthetic identity |
| Credential Management | Passwords, biometrics, MFA, passkeys |
| Compliance Auditing | AML, GDPR, PCI-DSS, SOC2 |

## CorpID Trust Graph

**What it solves:** Universal CI (Composite Index) scoring across RTNM ecosystem.

| Aspect | Details |
|--------|---------|
| **CI Score** | 0-1000 composite trust score |
| **Factors** | Identity (15%), Employment (20%), Skills (15%), Reputation (25%), Compliance (10%), References (15%) |
| **Tiers** | Elite (900-1000), Premium (750-899), Verified (500-749), Basic (300-499), Unverified (0-299) |
| **Passports** | Career passport, Business passport |

---

# INDUSTRY AI (15 Verticals)

HOJAI Industry AI sells AI layer to **non-REZ clients**, connecting to REZ-Merchant for REZ ecosystem clients.

## Available Industry AI

| Industry | AI Employees | Problem Solved |
|----------|--------------|---------------|
| **Restaurant** | AI Waiter, Growth Consultant | WhatsApp ordering, POS, reservations |
| **Salon** | Beauty Advisor, Campaign Manager | Booking, staff scheduling |
| **Fitness** | Fitness Coach, Nutrition Advisor | Member management, classes |
| **Hotel** | AI Front Desk, Revenue Manager | Check-in, PMS, concierge |
| **Retail** | Inventory AI, Merchandising AI | POS, demand forecasting |
| **Healthcare** | Care Manager, Pharmacist AI | Clinic management, pharmacy |
| **HR** | Recruiter, Onboarding Agent | Geo-attendance, payroll |
| **Real Estate** | Property Advisor, Lead Qualifier | Listings, site visits |
| **Society** | Visitor Manager, Complaint Resolver | Residents, maintenance |
| **Education** | Tutor AI, Counselor | LMS, assessments |
| **Finance** | Accountant AI, CFO Agent | Accounting, compliance |
| **Logistics** | Dispatch AI, Route Optimizer | Fleet, dispatch |
| **Manufacturing** | Production Planner, QA | MES, IoT |
| **Franchise** | Growth Manager | Multi-location, royalties |
| **Travel** | Travel Planner, Concierge | Trips, bookings |

---

# INDUSTRY OS (RTNM Ecosystem)

| OS | Company | Description | Ports |
|----|---------|-------------|-------|
| **Healthcare OS** | RisaCare | Health records vault, AI interpretation, doctor booking, pharmacy | 4700-4799 |
| **Hospitality OS** | StayOwn | Hotel booking, Room QR, digital check-in, concierge | 4016, 3000 |
| **Workforce OS** | CorpPerks | HRMS, geo-attendance, TalentAI, B2B procurement | 4700-4750 |
| **Commerce OS** | REZ | Restaurant POS, retail POS, multi-channel selling | 4200-4250 |
| **Travel OS** | Airzy | Flight booking, lounges, transfers, AI brain | 4500-4509 |
| **Distribution OS** | NeXha | Franchise, procurement, manufacturing, trade finance | 4300-4399 |

---

# AI EMPLOYEES (200+)

## By Autonomy Level

| Level | Name | Count |
|-------|------|-------|
| L1 | Assistants | 8+ |
| L2 | Specialists | 25+ |
| L3 | Autonomous | 15+ |
| L4 | Managers | 8+ |
| Industry | Experts | 35+ |
| **Total** | | **200+** |

## Voice Agents (Razo)

| Agent | Purpose |
|-------|---------|
| Receptionist | Answers calls, books appointments |
| SDR | Qualifies leads, schedules demos |
| Support Agent | Handles complaints, refunds |
| Booking Agent | Books tables, services, rides |
| Collections Agent | Payment follow-ups |
| CFO Agent | Financial queries |
| HR Agent | Employee queries |

---

# AI-NATIVE SERVICES

## Compliance Suite (Ports 4180-4185)

**ZeroDrift AI Compliance Firewall**

| Service | Port | Description |
|---------|------|-------------|
| communication-compliance-service | 4180 | Pre-send validation for emails, LinkedIn, documents |
| policy-engine-service | 4181 | NLP-based policy parsing and rule extraction |
| enforcement-gateway | 4182 | Real-time blocking, quarantine queue, advisory modes |
| llm-compliance-service | 4183 | AI-generated content validation, PII detection |
| agent-governance-service | 4184 | AI agent permissions, boundaries, approval workflow |
| audit-trail-service | 4185 | Complete compliance logging and reporting |

### Regulatory Coverage

| Framework | Coverage |
|-----------|----------|
| **SEC** | Rule 10b-5, 17a-4, Reg FD, Rule 207 |
| **FINRA** | Rules 3110, 3120, 2210, 4511, 2090 |
| **RBI** | KYC, AML/CFT, Digital Lending, NBFC |
| **Company Policy** | Data Privacy, Communications, Conflicts |

## AI-Native HR Services (Port 4820)

**@hojai/workforce** - AI Workforce Management

| Feature | Description |
|---------|-------------|
| AI Employee Management | Deploy, monitor, manage AI workers |
| AI Teams | Group agents by function |
| AI Departments | Organizational structure |
| Workforce Marketplace | Pre-built agent library |
| Performance Tracking | Tasks completed, satisfaction, revenue |
| Career Levels | Junior → Mid → Senior → Lead → Director |

## AI-Native Marketing (Ports 4620, 4860)

| Product | Description |
|---------|-------------|
| **Agent Marketplace** | 86+ pre-built AI agents for banking, healthcare, restaurant, etc. |
| **Enterprise Search** | Glean competitor - unified knowledge search with RBAC |

## AI-Native Customer Support (Port 4058)

**REZ Care** - Unified Customer Support

| Feature | Description |
|---------|-------------|
| Customer 360 | Unified customer profile |
| CSAT + Sentiment | Track satisfaction and sentiment |
| Proactive Detection | AI detects issues before reported |
| Self-service | Automated recovery options |
| Auto-ticket | Intelligent ticket creation |
| WhatsApp Integration | Channel integration |

---

# REZ INTELLIGENCE (Privileged Tenant)

Built ON HOJAI Core, powers the entire REZ ecosystem.

## Categories (186+ services)

| Category | Examples |
|----------|----------|
| **Intent & Memory** | rez-intent-graph, rez-intent-predictor, rez-memory-engine, rez-memory-layer |
| **AI Agents** | rez-agent-registry, rez-autonomous-agents, rez-commerce-agents, rez-support-agent |
| **Commerce** | rez-recommendation-engine, rez-personalization-engine, rez-pricing-engine |
| **Analytics** | rez-analytics-orchestrator, rez-attribution-system, rez-rfm-service |
| **Graphs** | rez-consumer-graph, rez-merchant-graph, rez-unified-identity |
| **ML Pipeline** | rez-ml-engine, rez-ml-feature-store, rez-ml-model-registry |
| **Decision** | rez-real-time-decision-engine, rez-predictive-engine |
| **Channels** | rez-whatsapp-orchestrator-bridge, rez-email-bridge |

---

# GENIE (Personal AI)

| Service | Port | Description |
|---------|------|-------------|
| GENIE Memory | 4703 | Personal memory |
| GENIE Relationship | 4704 | Relationship tracking |
| GENIE Briefing | 4706 | Daily briefings |
| GENIE Privacy | - | Privacy model |
| GENIE Sync | - | Cross-device sync |

---

# SERVICES RUNNING

| Service | Port | Status |
|---------|------|--------|
| Unified Platform | 4850 | ✅ |
| Training Pipeline | 4880 | ✅ |
| Event Bus | 4510 | ✅ |
| Memory | 4520 | ✅ |
| Commerce Intelligence | 4750 | ✅ |
| GENIE Memory | 4703 | ✅ |
| GENIE Relationship | 4704 | ✅ |
| GENIE Briefing | 4706 | ✅ |
| REZ Intent Predictor | 4018 | ✅ |
| REZ Predictive Engine | 4123 | ✅ |
| REZ Memory Layer | 4201 | ✅ |

---

# PORT REGISTRY

| Range | Service |
|-------|---------|
| 3000-3099 | RABTUL Core |
| 4000-4099 | RABTUL Extended |
| 4100-4199 | Industry Services |
| 4180-4185 | HOJAI Compliance |
| 4500-4610 | HOJAI Core |
| 4700-4799 | RisaCare / GENIE |
| 4750-4754 | HOJAI Intelligence |
| 4850-4899 | HOJAI VoiceOS |

---

# SERVICE COUNT

| Category | Count |
|---------|-------|
| HOJAI Core (12 platforms) | 15+ services |
| ML Platform (10) | 10 services |
| Voice AI (Razo) | 1 platform |
| REZ Intelligence | 186+ services |
| GENIE (5) | 5 services |
| AI Employees | 200+ agents |
| Industry AI | 15 verticals |
| **TOTAL** | **400+** |

---

# TWO INTELLIGENCE LAYERS

| Intelligence | Type | Target | Ports |
|-------------|------|--------|-------|
| **HOJAI Intelligence** | Commercial | External businesses | 4750-4754 |
| **REZ Intelligence** | Privileged | REZ ecosystem | 3000-4300 |

---

*Version: 5.0*
*Last Updated: June 3, 2026*
*Status: COMPLETE*

