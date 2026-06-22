# HOJAI AI - COMPLETE MASTER DOCUMENTATION
**Version:** 3.0 | **Date:** May 30, 2026 | **Status:** COMPLETE

---

# TABLE OF CONTENTS

1. [Positioning](#1-positioning)
2. [Architecture Overview](#2-architecture-overview)
3. [HOJAI CORE - 12 Platforms](#3-hojai-core---12-platforms)
4. [ML PLATFORM - 10 Services](#4-ml-platform---10-services)
5. [GENIE - Personal Intelligence OS](#5-genie---personal-intelligence-os)
6. [Extended Services](#6-extended-services)
7. [Products](#7-products)
8. [Technology Stack](#8-technology-stack)
9. [Security & Compliance](#9-security--compliance)
10. [Business Model](#10-business-model)
11. [Go-to-Market](#11-go-to-market)
12. [Roadmap](#12-roadmap)
13. [Documentation Index](#13-documentation-index)

---

# 1. POSITIONING

## Official Positioning

```
HOJAI AI

Operational AI Infrastructure Company

Building AI Operating Systems
for organizations and individuals.
```

## One-Line Pitch

> "Deploy AI employees in minutes, not months."

## What We Build

| Product | Customer | Status |
|---------|----------|--------|
| **Merchant AI OS** | SMBs (salons, clinics, restaurants, jewellery) | Built |
| **Enterprise AI OS** | Hospitals, hotels, retail chains | Planned |
| **Genie Personal AI OS** | Individuals | Built |

## Key Numbers

| Metric | Value |
|--------|-------|
| HOJAI Core Platforms | 12 |
| ML Platform Services | 10 |
| GENIE Services | 5 |
| Extended Services | 8 |
| Total Services | 43+ |
| AI Employees | 14+ |
| Products | 3 (formalized) |
| Deploy Time | 15 minutes |
| Cost Reduction | 70% |

---

# 2. ARCHITECTURE OVERVIEW

## Official Structure

```
HOJAI AI
│
├── HOJAI CORE (12 Platforms) - 4500-4610
│   ├── API Gateway (4500)
│   ├── Governance (4501)
│   ├── Event (4510)
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
├── ML PLATFORM (10 Services) - 4710-4742
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
├── GENIE (5 Services) - 4561, 4702-4707
│   ├── Hojai Flow (4561)
│   ├── Genie Relationship (4702)
│   ├── Genie Briefing (4704)
│   ├── Genie Privacy (4706)
│   └── Genie Sync (4707)
│
├── EXTENDED (8 Services) - 4800-4870
│   ├── Unified Gateway (4800)
│   ├── Graph (4810)
│   ├── Workforce (4820)
│   ├── Billing (4830)
│   ├── Studio (4840)
│   ├── CorpOS (4850)
│   ├── Twin (4860)
│   └── Board (4870)
│
└── PRODUCTS
    ├── Merchant AI OS
    ├── Enterprise AI OS
    └── Genie Personal AI OS
```

## Build Priority

| Priority | Product | Reason |
|----------|---------|--------|
| **1** | Merchant AI OS | Easier sales, faster feedback, clear ROI |
| **2** | Genie | Showcases Hojai, consumer visibility |
| **3** | Enterprise AI OS | After infrastructure matures |

---

# 3. HOJAI CORE - 12 PLATFORMS

## Port Registry

| Port | Platform | Purpose |
|------|----------|---------|
| 4500 | api-gateway | Routing, auth, rate limiting |
| 4501 | governance | RBAC, audit, permissions |
| 4510 | event | Event bus |
| 4520 | memory | Organizational brain |
| 4530 | intelligence | ML predictions |
| 4550 | agents | AI employees |
| 4560 | workflows | Automation |
| 4570 | communications | SMS, Email, WhatsApp |
| 4580 | hyperlocal | Geo intelligence |
| 4590 | data | Canonical models |
| 4600 | identity | Identity resolution |
| 4610 | analytics | BI, dashboards |

## Platform Details

### 3.1 API Gateway (4500)
- Request routing
- Rate limiting
- Tenant extraction
- Load balancing

### 3.2 Governance (4501)
- User management (5 roles)
- Permission system
- Audit logging
- API key management

### 3.3 Event Bus (4510)
- Event publishing
- Event subscriptions
- Pattern matching

### 3.4 Memory (4520)
- Memory storage
- Context engine
- Timeline engine
- Knowledge storage

### 3.5 Intelligence (4530)
- Predictions (churn, LTV)
- Recommendations
- Segmentation
- Attribution

### 3.6 Agents (4550)
- Agent CRUD
- 8 agent types
- Tools registry
- Runs history

### 3.7 Workflows (4560)
- Workflow creation
- Step orchestration
- Triggers
- Dead letter queue

### 3.8 Communications (4570)
- WhatsApp
- Email
- SMS
- Push

### 3.9 Hyperlocal (4580)
- Zone management
- Venue tracking
- Footfall prediction

### 3.10 Data (4590)
- 7 canonical entities
- Tenant-scoped
- Repository pattern

### 3.11 Identity (4600)
- Identity resolution
- Linking
- Cross-channel matching

### 3.12 Analytics (4610)
- Dashboards
- Reports
- ML observability

---

# 4. ML PLATFORM - 10 SERVICES

The ML Platform provides production-ready machine learning infrastructure.

## Port Registry

| Port | Service | Category | Purpose |
|------|---------|----------|---------|
| 4710 | feature-store | MLOps | ML feature management |
| 4711 | model-registry | MLOps | Model versioning |
| 4712 | model-router | MLOps | Routing to right model |
| 4720 | embedding-service | Vector | Text embeddings |
| 4721 | pgvector-service | Vector | Vector storage + similarity |
| 4730 | providers | LLM | LLM provider management |
| 4731 | rag | LLM | RAG pipeline |
| 4740 | churn-model | Models | Churn prediction |
| 4741 | ltv-model | Models | LTV prediction |
| 4742 | recommendation-engine | Models | Product/user recommendations |

## 4.1 MLOps Services

### Feature Store (4710)

**Tagline:** "Centralized ML feature management"

| Feature | Description |
|---------|-------------|
| Feature Registry | Register and version features |
| Feature Computation | Pre-compute features |
| Online/Offline | Low-latency serving |
| Feature Monitoring | Drift detection |

### Model Registry (4711)

**Tagline:** "Centralized ML model versioning and lifecycle management"

| Feature | Description |
|---------|-------------|
| Version Control | Track model versions |
| Stage Management | dev/staging/production |
| Metrics Storage | Accuracy, latency |
| Metadata | Descriptions, lineage |

### Model Router (4712)

**Tagline:** "Intelligent routing to the right model"

| Feature | Description |
|---------|-------------|
| Model Selection | Route based on input |
| A/B Testing | Split traffic |
| Fallback | Handle model failures |
| Monitoring | Track routing decisions |

## 4.2 Vector Services

### Embedding Service (4720)

**Tagline:** "Text to vector embeddings"

| Feature | Description |
|---------|-------------|
| Text Embeddings | OpenAI, local models |
| Batch Processing | Bulk embedding |
| Caching | Reuse embeddings |
| Multiple Models | Support multiple embedders |

### pgvector Service (4721)

**Tagline:** "Vector storage and similarity search"

| Feature | Description |
|---------|-------------|
| Vector Storage | Persist embeddings |
| Similarity Search | Cosine, euclidean |
| Namespace Support | Tenant isolation |
| Metadata Filtering | Filter by attributes |

## 4.3 LLM Services

### LLM Providers (4730)

**Tagline:** "Unified LLM provider management"

| Feature | Description |
|---------|-------------|
| Multi-Provider | OpenAI, Anthropic, local |
| Cost Tracking | Per-provider costs |
| Rate Limiting | Prevent abuse |
| Fallback | Multi-model fallback |

### RAG Pipeline (4731)

**Tagline:** "Retrieval-augmented generation"

| Feature | Description |
|---------|-------------|
| Document Indexing | Load documents |
| Chunking | Split into pieces |
| Retrieval | Find relevant chunks |
| Generation | Combine with LLM |

## 4.4 ML Models

### Churn Model (4740)

**Tagline:** "Predict customer churn"

| Feature | Description |
|---------|-------------|
| Prediction | Churn probability |
| Segmentation | High/medium/low risk |
| Explanations | Why churn |
| Retraining | Periodic updates |

### LTV Model (4741)

**Tagline:** "Predict customer lifetime value"

| Feature | Description |
|---------|-------------|
| Prediction | Predicted LTV |
| Cohort Analysis | By segment |
| Feature Importance | Key drivers |
| Revenue Forecasting | Projections |

### Recommendation Engine (4742)

**Tagline:** "Personalized recommendations"

| Feature | Description |
|---------|-------------|
| Collaborative | User-user similarity |
| Content-Based | Item similarity |
| Hybrid | Combined approach |
| Real-time | <100ms response |

## ML Platform API Endpoints

### Feature Store (4710)
```
GET  /api/features - List features
POST /api/features - Create feature
GET  /api/features/:name - Get feature
GET  /api/features/:name/values - Get values
POST /api/features/ingest - Ingest feature
```

### Model Registry (4711)
```
POST /api/models - Register model
GET  /api/models - List models
GET  /api/models/:name - Get model
GET  /api/models/:name/latest - Latest version
PUT  /api/models/:name/:version/stage - Update stage
DELETE /api/models/:name/:version - Delete
```

### Model Router (4712)
```
POST /api/route - Route prediction
GET  /api/models - List available models
GET  /api/health - Health check
```

### Embedding Service (4720)
```
POST /api/embed - Generate embeddings
POST /api/embed/batch - Batch embeddings
GET  /api/health - Health check
```

### pgvector Service (4721)
```
POST /api/vectors - Insert vector
POST /api/vectors/batch - Batch insert
POST /api/vectors/search - Search similarity
GET  /api/vectors/:id - Get vector
DELETE /api/vectors/:id - Delete vector
GET  /api/namespaces - List namespaces
```

### LLM Providers (4730)
```
POST /api/completions - LLM completion
POST /api/chat - Chat completion
GET  /api/providers - List providers
POST /api/providers - Add provider
```

### RAG (4731)
```
POST /api/index - Index document
POST /api/query - Query RAG
GET  /api/collections - List collections
DELETE /api/collections/:id - Delete collection
```

### Churn Model (4740)
```
POST /api/predict/churn - Predict churn
POST /api/train - Train model
GET  /api/metrics - Model metrics
```

### LTV Model (4741)
```
POST /api/predict/ltv - Predict LTV
POST /api/train - Train model
GET  /api/metrics - Model metrics
```

### Recommendation Engine (4742)
```
POST /api/recommend - Get recommendations
POST /api/recommend/personalized - Personalized
POST /api/recommend/similar - Similar items
POST /api/feedback - Record feedback
```

---

# 5. GENIE - PERSONAL INTELLIGENCE OS

## Tagline

> "You don't use Genie. You talk to Genie."

## The 5 Pillars

| Pillar | Description |
|--------|-------------|
| Memory | Remember everything |
| Context | Know who, what, where, when, why |
| Intelligence | Understand patterns |
| Action | Take action |
| Anticipation | Know before you ask |

## GENIE Services (5 - Built)

| Port | Service | Purpose |
|------|---------|---------|
| 4561 | hojai-flow | Voice-first AI companion |
| 4702 | genie-relationship | Personal relationships |
| 4704 | genie-briefing | Daily briefings |
| 4706 | genie-privacy | Privacy model |
| 4707 | genie-sync | Cross-device sync |

### Hojai Flow (4561)

**Tagline:** "Your second brain, in your voice"

| Capability | Description |
|-----------|-------------|
| Talk Naturally | Real-time voice dictation |
| Remembers Everything | Personal brain with contacts, projects, decisions |
| Finds Instantly | Search across brain and memory |
| Performs Actions | Smart actions with suggestions + approvals |
| Learns Your Style | Persona-based personalization |

### Genie Relationship (4702)

**Tagline:** "Know your relationships"

| Feature | Description |
|---------|-------------|
| Relationship Graph | Map connections |
| Interaction Tracking | Calls, messages, meetings |
| Important Dates | Birthdays, anniversaries |
| Context Memory | Past conversations |

### Genie Briefing (4704)

**Tagline:** "Start your day informed"

| Feature | Description |
|---------|-------------|
| Daily Digest | Morning briefing |
| Schedule Summary | Today's meetings |
| Action Items | Tasks to complete |
| News & Updates | Relevant information |

### Genie Privacy (4706)

**Tagline:** "Your data, your control"

| Feature | Description |
|---------|-------------|
| Consent Management | Granular permissions |
| Data Export | Download your data |
| Data Deletion | Delete on demand |
| Privacy Dashboard | See what's stored |

### Genie Sync (4707)

**Tagline:** "Access anywhere"

| Feature | Description |
|---------|-------------|
| Cross-Device | Phone, laptop, watch |
| Real-time Sync | Instant updates |
| Offline Mode | Works without internet |
| Conflict Resolution | Merge gracefully |

## GENIE API Endpoints

### Hojai Flow (4561)
```
POST /api/personas - Create persona
GET  /api/personas - List personas
GET  /api/brain - Brain items
GET  /api/actions/suggestions - AI suggestions
PATCH /api/actions/:id/approve - Approve action
```

### Genie Relationship (4702)
```
POST /api/relationships - Create relationship
GET  /api/relationships - List relationships
GET  /api/relationships/:id - Get relationship
PATCH /api/relationships/:id - Update relationship
DELETE /api/relationships/:id - Delete
```

### Genie Briefing (4704)
```
POST /api/briefings - Create briefing
GET  /api/briefings - List briefings
GET  /api/briefings/:id - Get briefing
GET  /api/schedule - Get schedule
```

### Genie Privacy (4706)
```
GET  /api/consent - Get consent
PUT  /api/consent - Update consent
GET  /api/data - Get my data
DELETE /api/data - Delete my data
```

### Genie Sync (4707)
```
POST /api/sync - Sync data
GET  /api/sync/status - Sync status
GET  /api/sync/devices - List devices
DELETE /api/sync/devices/:id - Remove device
```

---

# 6. EXTENDED SERVICES

## 8 Services - 4800-4870

| Port | Service | Purpose |
|------|---------|---------|
| 4800 | unified-gateway | Single entry point |
| 4810 | graph | Entity relationships |
| 4820 | workforce | AI employees |
| 4830 | billing | Subscriptions, metering |
| 4832 | unified-sdk | TypeScript SDK |
| 4840 | studio | AI employee builder |
| 4850 | corpos | Human + AI dashboard |
| 4860 | twin | Digital twins |
| 4870 | board | AI C-Suite |

---

# 7. PRODUCTS

## 7.1 Merchant AI OS

**For:** SMBs (salons, clinics, restaurants, jewellery)

### Modules

| Module | Description |
|--------|-------------|
| Customers | CRM, segmentation |
| Conversations | Chat, messaging |
| Memory | Business knowledge |
| Workflows | Automation |
| AI Employees | Support, Sales agents |
| Campaigns | Marketing automation |
| Analytics | Business insights |
| Knowledge Base | FAQs, docs |
| ROI Dashboard | Investment tracking |

### Pricing

| Plan | Price | Features |
|------|-------|---------|
| Starter | $99/mo | 1 agent, 1K conv |
| Professional | $299/mo | 5 agents, 10K conv |
| Enterprise | Custom | Unlimited |

---

## 7.2 Enterprise AI OS

**For:** Hospitals, hotels, retail chains, enterprises

### Modules

| Module | Description |
|--------|-------------|
| Operations | Workflow automation |
| Staff | AI employees |
| Customers | 360 view |
| Analytics | Enterprise BI |
| Integration | 50+ connectors |
| Security | Enterprise-grade |

### Pricing

Custom (based on employees, modules)

---

## 7.3 Genie Personal AI OS

**For:** Individuals

| Plan | Price | Features |
|------|-------|---------|
| Free | $0 | Basic features |
| Pro | $9.99/mo | Full access |
| Teams | $29.99/mo | Collaboration |

---

# 8. TECHNOLOGY STACK

## Frontend

| Tech | Purpose |
|------|---------|
| React | UI |
| TypeScript | Type safety |
| Next.js | SSR/SSG |
| Expo | Mobile |

## Backend

| Tech | Purpose |
|------|---------|
| Node.js | Runtime |
| Express | API |
| Python | ML/AI |
| FastAPI | ML endpoints |

## Data

| Tech | Purpose |
|------|---------|
| MongoDB | Documents |
| Redis | Cache |
| PostgreSQL | Relational |
| Neo4j | Graph |
| Pinecone | Vectors |
| Kafka | Events |

## AI/ML

| Tech | Purpose |
|------|---------|
| OpenAI | LLM |
| LangChain | Agents |
| LangGraph | Orchestration |
| Hugging Face | NLP |

---

# 9. SECURITY & COMPLIANCE

## Multi-Tenant Security

| Feature | Implementation |
|---------|----------------|
| Tenant isolation | Database-level |
| tenant_id on all | Every entity |
| API keys | Per-tenant |
| Rate limiting | Per-tenant |

## Privacy Rules

| Rule | Value |
|------|-------|
| Min tenants | 3 |
| Min events | 100 |
| Max tenant % | 50% |
| Tenant hashing | Yes |

## Compliance

| Framework | Status |
|-----------|--------|
| GDPR | Compliant |
| PDPA | Compliant |
| SOC 2 | Q4 2026 |
| HIPAA | Ready |

---

# 10. BUSINESS MODEL

## Revenue Streams

| Stream | % | Description |
|--------|---|-------------|
| Subscriptions | 70% | Monthly/annual |
| Usage | 20% | API calls |
| Services | 10% | Implementation |

## Pricing

### Merchant AI OS

| Plan | Price |
|------|-------|
| Starter | $99/mo |
| Professional | $299/mo |
| Enterprise | Custom |

### Genie

| Plan | Price |
|------|-------|
| Free | $0 |
| Pro | $9.99/mo |
| Teams | $29.99/mo |

## Unit Economics

| Metric | Value |
|--------|-------|
| ACV | $3,600 |
| Gross Margin | 85% |
| NRR | 120% |
| Payback | 4 months |

---

# 11. GO-TO-MARKET

## Priority

| Priority | Product | Reason |
|----------|---------|--------|
| 1 | Merchant AI OS | Easier sales |
| 2 | Genie | Consumer visibility |
| 3 | Enterprise AI OS | After maturity |

## Channels

| Channel | Strategy |
|---------|----------|
| PLG | Self-serve |
| Sales | Enterprise |
| Partners | Agency |
| Marketplace | AWS, GCP |

---

# 12. ROADMAP

## Q3 2026

- [x] HOJAI Core (12 platforms)
- [x] ML Platform (10 services)
- [x] Genie Personal AI OS (5 services)
- [ ] 5 Industry verticals
- [ ] Mobile SDK

## Q4 2026

- [ ] 10 Industry verticals
- [ ] Enterprise AI OS
- [ ] SOC 2 certification
- [ ] Custom agent builder

## 2027

- [ ] 20 Industry verticals
- [ ] International expansion
- [ ] IPO readiness

---

# 13. DOCUMENTATION INDEX

## Core Documentation

| Document | Purpose |
|----------|---------|
| MASTER-SOT.md | Source of truth |
| COMPLETE-HOJAI-DOCUMENTATION.md | This document |
| PITCH-DECK.md | Investor deck |
| ONE-PAGER.md | One-page summary |
| README.md | Quick reference |

## Architecture Documentation

| Document | Purpose |
|----------|---------|
| ARCHITECTURE-FINAL.md | Architecture design |
| REZ-INTEGRATION.md | REZ + HOJAI relationship |

## Product Documentation

| Document | Purpose |
|----------|---------|
| GENIE-PRODUCT-SPEC.md | Genie product spec |
| GENIE-GAP-ANALYSIS.md | Genie gaps |
| HOJAI-FLOW.md | Hojai Flow spec |

## Audit Documentation

| Document | Purpose |
|----------|---------|
| AUDIT.md | Service audit |
| HOJAI-INTELLIGENCE.md | Intelligence spec |
| HOJAI-INDUSTRY.md | Industry verticals |

---

# ARCHITECTURE PRINCIPLES

1. **12 Core Platforms** - Don't add more platforms to core
2. **ML Platform is Separate** - 10 dedicated ML services
3. **GENIE is Product** - 5 personal intelligence services
4. **Extended for Scale** - 8 services for advanced features
5. **Products Use Core** - Products sit on top
6. **Stop Redesigning** - Build instead of design

---

*Version: 3.0*
*Last Updated: May 30, 2026*
*Status: COMPLETE*
