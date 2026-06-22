# HOJAI V2 PORT REGISTRY
**Version:** 2.1 | **Date:** June 2, 2026 | **Status:** OFFICIAL

---

## Overview

This document is the **authoritative source** for all port allocations in the Hojai v2 architecture.

**Port Range Allocation:**

| Range | Owner | Purpose |
|-------|-------|---------|
| 3000-3999 | REZ Domain | REZ ecosystem services |
| 4000-4499 | RABTUL | Shared platform |
| 4500-4599 | Hojai Core | Core infrastructure |
| 4600-4699 | Hojai Clients | Commercial intelligence |
| 4700-4799 | Hojai Industry | Industry brains |
| 4800-4899 | Hojai Communications | Communications & agents |
| 5000-5099 | REZ AI | REZ AI services |

---

## RABTUL SHARED PLATFORM (4000-4499)

> **Note:** RABTUL remains separate. Hojai uses RABTUL as any other client.

| Port | Service | Company | Purpose |
|------|---------|---------|---------|
| 4000 | API Gateway | RABTUL | Central routing |
| 4001 | Payment Service | RABTUL | Razorpay, UPI, Webhooks |
| 4002 | Auth Service | RABTUL | JWT, OTP, OAuth |
| 4004 | Wallet Service | RABTUL | Coins, Balance |
| 4006 | Order Service | RABTUL | Order lifecycle |
| 4007 | Catalog Service | RABTUL | Products, Inventory |
| 4008 | Creator QR Service | RABTUL | QR generator |
| 4009 | REZ-action-engine | RABTUL | Decision execution |
| 4011 | Notifications | RABTUL | Push, SMS, WhatsApp |
| 4013 | Profile Service | RABTUL | User profiles |
| 4016 | Analytics | RABTUL | Dashboards |
| 4017 | Insights | RABTUL | BI, Reports |
| 4018 | Intent Graph | REZ Intelligence | Intent prediction |
| 4020 | Booking Service | RABTUL | Reservations |
| 4025 | Event Bus | RABTUL | Event streaming |
| 4026 | AI Router | REZ Intelligence | Request routing |
| 4030 | Circuit Breaker | RABTUL | Fault tolerance |
| 4031 | Retry Service | RABTUL | Exponential backoff |
| 4032 | DLQ Service | RABTUL | Dead letter queue |
| 4033 | Idempotency | RABTUL | Deduplication |
| 4034 | Policy Engine | RABTUL | Access control |
| 4035 | Secrets Manager | RABTUL | Encryption |
| 4038 | Scheduler | RABTUL | Cron jobs |
| 4040 | Location Intel | REZ Intelligence | Hot zones |
| 4041 | Gamification | RABTUL | Karma points |
| 4045 | Workflow Builder | RABTUL | Visual workflows |
| 4046 | AI Agent Studio | RABTUL | Agent builder |
| 4050 | Checkout Optimization | RABTUL | 1-Click checkout |
| 4051 | WooCommerce | RABTUL | Connector |
| 4052 | Logistics | RABTUL | Multi-carrier |
| 4055 | Care Service | REZ Intelligence | Support OS |
| 4058 | Care Service (alt) | REZ Intelligence | Support OS |
| 4060 | Unified Identity | REZ Intelligence | Identity |
| 4062 | Autonomous Agents | REZ Intelligence | 8 agents |
| 4063 | Unified Notifications | RABTUL | Notifications |
| 4064 | DOOH Targeting | RABTUL | Targeting feed |
| 4065 | Bootstrap AI | REZ Intelligence | Cold start |
| 4068 | Ads QR Service | RABTUL | QR campaigns |
| 4075 | REZ Go Service | RABTUL | Scan & Go |

---

## HOJAI CORE INFRASTRUCTURE (4500-4599)

### Platform Services

| Port | Service | Platform | Purpose |
|------|---------|----------|---------|
| **4500** | Hojai Governance | Core | RBAC, Audit, Policy |
| **4510** | Hojai Event | Core | Event Bus, Streaming |
| **4520** | Hojai Memory | Core | Customer Memory, Vector |
| **4530** | Hojai Intelligence | Core | Predictions, ML |
| **4550** | Hojai Agents | Core | Agent Platform |
| **4560** | Hojai Workflow | Core | Flow Runtime |
| **4570** | Hojai Communications | Core | WhatsApp, SMS, Email |
| **4580** | Hojai Hyperlocal | Core | Geo, Footfall |
| **4580** | Hojai Analytics | Core | Insights, Attribution |
| **4590** | Hojai Data | Core | Feature Store, Pipeline |

---

### Hojai Core Services Detail

#### 4500 - Hojai Governance

```yaml
Service: hojai-governance
Port: 4500
Platform: hojai-core
Purpose: Multi-tenant RBAC, Audit, Policy Engine
Protocol: HTTP REST
Database: MongoDB (per-tenant schemas)
Dependencies: MongoDB, Redis
```

**Routes:**
- `/api/auth/*` - Authentication
- `/api/roles/*` - Role management
- `/api/permissions/*` - Permission management
- `/api/audit/*` - Audit logs
- `/api/policy/*` - Policy engine
- `/health` - Health check

---

#### 4510 - Hojai Event Platform

```yaml
Service: hojai-event
Port: 4510
Platform: hojai-core
Purpose: Event Bus, Streaming, Replay
Protocol: HTTP REST + WebSocket
Database: Redis (Pub/Sub), MongoDB (Event Store)
Dependencies: MongoDB, Redis, Kafka (optional)
```

**Routes:**
- `/api/events/*` - Event CRUD
- `/api/publish` - Publish event
- `/api/subscribe` - Subscribe to events
- `/api/schema/*` - Schema registry
- `/api/dlq/*` - Dead letter queue
- `/health` - Health check

**Event Categories:**
```typescript
customer.*     // customer.created, customer.updated
lead.*         // lead.created, lead.qualified
booking.*      // booking.confirmed, booking.cancelled
order.*        // order.placed, order.completed
churn.*        // churn.risk_detected
intent.*       // intent.expressed
prediction.*   // prediction.completed
message.*      // message.sent, message.delivered
campaign.*     // campaign.triggered
agent.*        // agent.action_completed
workflow.*     // workflow.triggered, workflow.completed
```

---

#### 4520 - Hojai Memory Platform

```yaml
Service: hojai-memory
Port: 4520
Platform: hojai-core
Purpose: Customer Memory, Vector Store, Timeline
Protocol: HTTP REST
Database: MongoDB, Redis, Vector DB
Dependencies: MongoDB, Redis, hojai-event
```

**Routes:**
- `/api/memory/*` - Memory CRUD
- `/api/timeline/*` - Timeline management
- `/api/embeddings/*` - Vector embeddings
- `/api/context/*` - Context management
- `/health` - Health check

---

#### 4530 - Hojai Intelligence Platform

```yaml
Service: hojai-intelligence
Port: 4530
Platform: hojai-core
Purpose: Predictions, Recommendations, ML
Protocol: HTTP REST
Database: MongoDB, Redis
Dependencies: hojai-event, hojai-memory, hojai-data
```

**Routes:**
- `/api/predict/*` - Predictions (churn, LTV, conversion)
- `/api/recommend/*` - Recommendations
- `/api/segments/*` - Segmentation
- `/api/decide/*` - Decision engine
- `/api/explain/*` - Explainability (SHAP/LIME)
- `/api/temporal/*` - Temporal intelligence
- `/health` - Health check

---

#### 4550 - Hojai Agent Platform

```yaml
Service: hojai-agents
Port: 4550
Platform: hojai-core
Purpose: AI Agent Runtime, Registry, Orchestration
Protocol: HTTP REST + WebSocket
Database: MongoDB, Redis
Dependencies: hojai-event, hojai-memory
```

**Routes:**
- `/api/agents/*` - Agent CRUD
- `/api/agents/:id/invoke` - Invoke agent
- `/api/agents/:id/memory` - Agent memory
- `/api/registry/*` - Agent registry
- `/api/orchestrate/*` - Orchestration
- `/health` - Health check

**Agent Types:**
```typescript
type AgentType = 'support' | 'sales' | 'booking' | 'marketing' | 'retention' | 'collection';
```

---

#### 4560 - Hojai Workflow Platform

```yaml
Service: hojai-workflow
Port: 4560
Platform: hojai-core
Purpose: Workflow Runtime, Builder, Execution
Protocol: HTTP REST + WebSocket
Database: MongoDB
Dependencies: hojai-event, hojai-agents
```

**Routes:**
- `/api/workflows/*` - Workflow CRUD
- `/api/executions/*` - Execution management
- `/api/triggers/*` - Trigger management
- `/api/dlq/*` - Dead letter queue
- `/api/builder/*` - Workflow builder
- `/health` - Health check

---

#### 4570 - Hojai Communications Platform

```yaml
Service: hojai-communications
Port: 4570
Platform: hojai-core
Purpose: Multi-channel: WhatsApp, SMS, Email, Voice
Protocol: HTTP REST + Webhooks
Database: MongoDB, Redis
Dependencies: Twilio, SendGrid, AWS, hojai-event
```

**Routes:**
- `/api/channels/*` - Channel management
- `/api/messages/*` - Message CRUD
- `/api/templates/*` - Template management
- `/api/webhooks/*` - Webhook handlers
- `/api/broadcast/*` - Broadcast campaigns
- `/health` - Health check

**Channels:**
```typescript
type Channel = 'whatsapp' | 'sms' | 'email' | 'voice' | 'instagram' | 'webchat';
```

---

#### 4580 - Hojai Hyperlocal & Analytics

```yaml
Service: hojai-hyperlocal
Port: 4580 (Hyperlocal)
Service: hojai-analytics
Port: 4580 (Analytics)
Platform: hojai-core
Purpose: Geo Intelligence, Footfall, Insights, Attribution
Protocol: HTTP REST
Database: MongoDB, Redis, PostGIS (optional)
Dependencies: hojai-event, Map APIs
```

**Routes (Hyperlocal):**
- `/api/zones/*` - Zone management
- `/api/hotspots/*` - Hotspot detection
- `/api/demand/*` - Demand intelligence
- `/api/footfall/*` - Footfall prediction
- `/api/geo/*` - Geo queries
- `/health` - Health check

**Routes (Analytics):**
- `/api/insights/*` - Business insights
- `/api/attribution/*` - Attribution modeling
- `/api/cohorts/*` - Cohort analysis
- `/api/reports/*` - Custom reports
- `/health` - Health check

---

#### 4590 - Hojai Data Platform

```yaml
Service: hojai-data
Port: 4590
Platform: hojai-core
Purpose: Feature Store, Data Pipeline, Governance
Protocol: HTTP REST
Database: MongoDB, Redis, Data Lake
Dependencies: hojai-event, hojai-memory
```

**Routes:**
- `/api/features/*` - Feature CRUD
- `/api/serve/*` - Feature serving
- `/api/pipeline/*` - Pipeline management
- `/api/quality/*` - Data quality
- `/api/governance/*` - Data governance
- `/health` - Health check

---

## REZ DOMAIN (3000-3999)

> **Note:** REZ Domain is the core REZ ecosystem.

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | REZ Gateway | Core API gateway |
| 3100 | REZ User Service | User management |
| 3200 | REZ Session Service | Session handling |
| 3300 | REZ Notification Hub | Unified notifications |

---

## REZ INTELLIGENCE (4100-4299)

> **Note:** REZ Intelligence is a privileged tenant on Hojai Core.

### REZ Graph Services

| Port | Service | Purpose |
|------|---------|---------|
| 4100 | REZ Identity Graph | Cross-platform identity |
| 4110 | REZ Commerce Graph | Commerce relationships |
| 4120 | REZ Mobility Graph | Ride/delivery patterns |
| 4130 | REZ Loyalty Graph | Loyalty networks |
| 4140 | REZ Trust Graph | Trust & verification |
| 4150 | REZ Behavioral Graph | Behavior patterns |
| 4160 | REZ Hyperlocal Graph | Location intelligence |
| 4170 | REZ Intent Graph | User intent prediction |
| 4180 | REZ Ecosystem Knowledge | REZ knowledge base |
| 4190 | REZ Recommendations | REZ recommendations |
| 4200 | REZ Predictions | REZ predictions |

---

### REZ Graph Services Detail

#### 4100 - REZ Identity Graph

```yaml
Service: rez-identity-graph
Port: 4100
Platform: rez-intelligence
Purpose: Cross-platform identity resolution
Dependencies: hojai-event, hojai-memory
```

**Relationships:**
```typescript
linked_to, device_shared, same_ip, household
same_payment_method, family, colleague, friend
```

---

#### 4110 - REZ Commerce Graph

```yaml
Service: rez-commerce-graph
Port: 4110
Platform: rez-intelligence
Purpose: Commerce relationship intelligence
Dependencies: hojai-event, hojai-memory, RABTUL Order
```

**Relationships:**
```typescript
purchased_from, reviewed, visited, rated
referred, follows, belongs_to, contains
converted_from, influenced, compared_with
```

---

#### 4120 - REZ Mobility Graph

```yaml
Service: rez-mobility-graph
Port: 4120
Platform: rez-intelligence
Purpose: Ride and delivery intelligence
Dependencies: hojai-event, hojai-memory, REZ Ride
```

**Relationships:**
```typescript
rides_from, delivered_to, nearby, routes_through
frequents, works_at, lives_at
```

---

#### 4130 - REZ Loyalty Graph

```yaml
Service: rez-loyalty-graph
Port: 4130
Platform: rez-intelligence
Purpose: Loyalty network intelligence
Dependencies: hojai-event, hojai-memory, RABTUL Wallet
```

**Relationships:**
```typescript
loyalty_member, earned_from, redeemed_at
referred_by, tier_upgraded, bonus_earned
```

---

#### 4140 - REZ Trust Graph

```yaml
Service: rez-trust-graph
Port: 4140
Platform: rez-intelligence
Purpose: Trust and verification
Dependencies: hojai-event, hojai-memory, Karma Foundation
```

**Relationships:**
```typescript
verified, rated, trusted, flagged
reported, blocked, endorsed
```

---

#### 4150 - REZ Behavioral Graph

```yaml
Service: rez-behavioral-graph
Port: 4150
Platform: rez-intelligence
Purpose: User behavior patterns
Dependencies: hojai-event, hojai-memory, REZ Signal Aggregator
```

**Relationships:**
```typescript
engaged_with, browsed, searched, clicked
converted, churned, retained
```

---

#### 4160 - REZ Hyperlocal Graph

```yaml
Service: rez-hyperlocal-graph
Port: 4160
Platform: rez-intelligence
Purpose: REZ-specific location intelligence
Dependencies: hojai-event, hojai-hyperlocal
```

**Zone Hierarchy:**
```typescript
City → District → Neighborhood → Micro-zone → Venue
```

---

#### 4170 - REZ Intent Graph

```yaml
Service: rez-intent-graph
Port: 4170
Platform: rez-intelligence
Purpose: User intent prediction
Dependencies: hojai-event, hojai-intelligence
```

**Intent Categories:**
```typescript
food, fitness, travel, shopping, entertainment
health, education, hospitality, retail, lifestyle
```

---

## REZ AI SERVICES (5000-5099)

> **Note:** REZ AI Services provide specialized ML/AI capabilities for the REZ ecosystem.

### REZ AI Services Overview

| Port | Service | Purpose |
|------|---------|---------|
| 5000 | REZ-graphql-federation | Unified GraphQL API gateway |
| 5001 | REZ-automl-pipeline | AutoML training & model selection |
| 5002 | REZ-invoice-ocr | Invoice scanning & extraction |
| 5003 | REZ-contract-management | Contract lifecycle & e-signatures |
| 5004 | REZ-legal-document-ai | Legal document analysis |
| 5005 | REZ-cosmic-twin | Digital twin for Company Brain |
| 5006 | REZ-ranking-service | Real-time ML ranking |

---

### REZ AI Services Detail

#### 5000 - REZ GraphQL Federation

```yaml
Service: rez-graphql-federation
Port: 5000
Platform: rez-ai
Purpose: Unified GraphQL API gateway
Protocol: GraphQL
Database: MongoDB
Dependencies: hojai-event, REZ Graph services
```

**Features:** Schema federation, query planning, data aggregation, auth middleware

#### 5001 - REZ AutoML Pipeline

```yaml
Service: rez-automl-pipeline
Port: 5001
Platform: rez-ai
Purpose: AutoML training & model selection
Protocol: HTTP REST
Database: MongoDB, Feature Store
Dependencies: hojai-data, REZ Graph services
```

**Features:** Model training, hyperparameter tuning, AutoML, model registry

#### 5002 - REZ Invoice OCR

```yaml
Service: rez-invoice-ocr
Port: 5002
Platform: rez-ai
Purpose: Invoice scanning & extraction
Protocol: HTTP REST
Database: MongoDB
Dependencies: Vision AI, hojai-event
```

**Features:** OCR, document parsing, field extraction, validation

#### 5003 - REZ Contract Management

```yaml
Service: rez-contract-management
Port: 5003
Platform: rez-ai
Purpose: Contract lifecycle & e-signatures
Protocol: HTTP REST
Database: MongoDB
Dependencies: hojai-event, Digital Signature Service
```

**Features:** Contract creation, workflow, e-signatures, compliance tracking

#### 5004 - REZ Legal Document AI

```yaml
Service: rez-legal-document-ai
Port: 5004
Platform: rez-ai
Purpose: Legal document analysis
Protocol: HTTP REST
Database: MongoDB, Vector Store
Dependencies: hojai-event, REZ Legal Graph
```

**Features:** Clause analysis, risk detection, compliance checking, summarization

#### 5005 - REZ Cosmic Twin

```yaml
Service: rez-cosmic-twin
Port: 5005
Platform: rez-ai
Purpose: Digital twin for Company Brain
Protocol: HTTP REST + WebSocket
Database: MongoDB, Redis
Dependencies: REZ Graph services, hojai-memory
```

**Features:** Company representation, simulation, what-if analysis, entity sync

#### 5006 - REZ Ranking Service

```yaml
Service: rez-ranking-service
Port: 5006
Platform: rez-ai
Purpose: Real-time ML ranking
Protocol: HTTP REST
Database: Redis
Dependencies: REZ Graph services, hojai-intelligence
```

**Features:** Personalization ranking, A/B test support, feature serving, low-latency inference

---

## HOJAI INDUSTRY INTELLIGENCE (4700-4799)

| Port | Service | Industry |
|------|---------|----------|
| **4700** | Jewellery Brain | Jewellery |
| **4710** | Healthcare Brain | Healthcare |
| **4720** | Hospitality Brain | Hospitality |
| **4730** | Retail Brain | Retail |
| **4740** | Education Brain | Education |
| **4750** | Finance Brain | Finance |
| **4760** | Real Estate Brain | Real Estate |

---

### Industry Brain Services Detail

#### 4700 - Jewellery Brain

```yaml
Service: jewellery-brain
Port: 4700
Platform: hojai-industry
Purpose: Jewellery industry patterns
Dependencies: hojai-event, hojai-intelligence
```

**Patterns Learned:**
- Bridal journeys
- Gold purchase cycles
- Festival demand
- Follow-up timing
- Conversion timelines

---

#### 4710 - Healthcare Brain

```yaml
Service: healthcare-brain
Port: 4710
Platform: hojai-industry
Purpose: Healthcare industry patterns
Dependencies: hojai-event, hojai-intelligence
```

**Patterns Learned:**
- Appointment behavior
- No-show patterns
- Treatment journeys
- Patient retention
- Seasonal health patterns

---

#### 4720 - Hospitality Brain

```yaml
Service: hospitality-brain
Port: 4720
Platform: hojai-industry
Purpose: Hospitality industry patterns
Dependencies: hojai-event, hojai-intelligence
```

**Patterns Learned:**
- Booking patterns
- Occupancy demand
- Upsell opportunities
- Cancellation patterns

---

#### 4730 - Retail Brain

```yaml
Service: retail-brain
Port: 4730
Platform: hojai-industry
Purpose: Retail industry patterns
Dependencies: hojai-event, hojai-intelligence
```

**Patterns Learned:**
- Basket behavior
- Repeat purchases
- Conversion journeys
- Promotion response

---

---

## HOJAI COMMUNICATIONS & AGENTS (4800-4899)

> **REVISED June 1, 2026 - Consolidated into Unified Platform**

### 🎯 UNIFIED PLATFORM (Primary - Use This First)

| Port | Service | Platform | Purpose |
|------|---------|----------|---------|
| **4850** | **Hojai Unified Platform** | hojai-unified-platform | **ALL IN ONE: WhatsApp + Support + Commerce** |

> **4850 replaces 16+ WhatsApp services, 15+ support services, 20+ marketing services**

### Communication Platform Services

| Port | Service | Platform | Purpose |
|------|---------|----------|---------|
| **4850** | Hojai Unified Platform | hojai-unified-platform | WhatsApp + Support + Commerce |
| **4860** | Hojai Agent Marketplace | hojai-agent-marketplace | Pre-built AI Agent Library |
| **4870** | Hojai Unified Inbox | hojai-unified-inbox | Multi-channel Contact Center |
| **4880** | Hojai Human Handoff | hojai-human-handoff | AI to Human Transfer |
| **4890** | Hojai WhatsApp BSP | hojai-whatsapp-bsp | Direct WhatsApp Business API |
| **4900** | Hojai RCS Service | hojai-rcs-service | Rich Communication Services |

### Contact Center Enhancement Services

| Port | Service | Platform | Purpose |
|------|---------|----------|---------|
| **4910** | Hojai Skills Routing | hojai-skills-routing | Skill-based Routing |
| **4920** | Hojai SLA Monitor | hojai-sla-monitor | SLA Monitoring |
| **4930** | Hojai Instagram Agent | hojai-instagram-agent | Instagram DM Automation |

### Communication Service Details

#### 4850 - Hojai Studio (Visual Conversation Builder)

```yaml
Service: hojai-studio
Port: 4850
Platform: hojai-ai
Purpose: Visual drag-drop bot builder
Database: MongoDB
Dependencies: hojai-agents, hojai-communications
```

**Features:** Drag-drop flow builder, 11+ node types, AI integration, testing

#### 4860 - Hojai Agent Marketplace

```yaml
Service: hojai-agent-marketplace
Port: 4860
Platform: hojai-ai
Purpose: Pre-built AI agent library
Database: MongoDB
Dependencies: hojai-studio
```

**Features:** 8 industry agents, one-click install, usage tracking, reviews

#### 4870 - Hojai Unified Inbox

```yaml
Service: hojai-unified-inbox
Port: 4870
Platform: hojai-ai
Purpose: Multi-channel contact center
Database: MongoDB
Protocol: HTTP REST + WebSocket
Dependencies: hojai-human-handoff
```

**Features:** WhatsApp, Instagram, Email, SMS, real-time updates

#### 4880 - Hojai Human Handoff

```yaml
Service: hojai-human-handoff
Port: 4880
Platform: hojai-ai
Purpose: AI to human agent transfer
Database: MongoDB
Dependencies: hojai-unified-inbox
```

**Features:** Queue management, offer/accept flow, rules engine

#### 4890 - Hojai WhatsApp BSP

```yaml
Service: hojai-whatsapp-bsp
Port: 4890
Platform: hojai-ai
Purpose: Direct WhatsApp Business API
Dependencies: Meta Graph API
```

**Features:** Direct Meta API, all message types, template management

#### 4900 - Hojai RCS Service

```yaml
Service: hojai-rcs-service
Port: 4900
Platform: hojai-ai
Purpose: RCS messaging for Jio, Airtel, Vi
Database: MongoDB
Dependencies: RCS providers
```

**Features:** RCS cards, carousels, suggestions, campaigns

#### 4910 - Hojai Skills Routing

```yaml
Service: hojai-skills-routing
Port: 4910
Platform: hojai-ai
Purpose: Skill-based contact center routing
Database: MongoDB
Dependencies: hojai-unified-inbox
```

**Features:** Skill definitions, agent matching, routing rules

#### 4920 - Hojai SLA Monitor

```yaml
Service: hojai-sla-monitor
Port: 4920
Platform: hojai-ai
Purpose: SLA monitoring and alerts
Database: MongoDB
Dependencies: hojai-unified-inbox
```

**Features:** Response/resolution tracking, violation alerts

#### 4930 - Hojai Instagram Agent

```yaml
Service: hojai-instagram-agent
Port: 4930
Platform: hojai-ai
Purpose: Instagram DM automation
Database: MongoDB
Dependencies: Instagram Graph API
```

**Features:** DM handling, auto-replies, story mentions, campaigns

---

## HOJAI CLIENTS (4600-4699)

> **Note:** Ports 4600-4699 are allocated to commercial clients.
> Each client gets a dedicated port range.

| Port | Service | Client | Industry |
|------|---------|--------|----------|
| **4399** | **Nexha Ecosystem Connector** | **Nexha** | **Commerce Network** |
| **4300** | **Nexha DistributionOS** | **Nexha** | **Distribution** |
| **4310** | **Nexha FranchiseOS** | **Nexha** | **Franchise** |
| **4320** | **Nexha ProcurementOS** | **Nexha** | **Procurement** |
| **4330** | **Nexha ManufacturingOS** | **Nexha** | **Manufacturing** |
| **4340** | **Nexha TradeFinance** | **Nexha** | **Finance** |
| **4350** | **Nexha Intelligence** | **Nexha** | **Commerce AI** |
| **4388** | **Nexha Portal** | **Nexha** | **B2B Marketplace** |
| 4600 | Client Gateway | XYZ Retail | Retail |
| 4610 | Client Gateway | ABC Hospital | Healthcare |
| 4620 | Client Gateway | Hotel Client | Hospitality |
| 4630 | Client Gateway | Clinic Client | Healthcare |
| 4640 | Client Gateway | TBD | TBD |
| 4650 | Client Gateway | TBD | TBD |

---

### Client Gateway Template

```yaml
Service: client-gateway
Port: 4600-4650 (per client)
Platform: hojai-clients
Purpose: Client-specific intelligence gateway
Dependencies: hojai-core (all platforms)
```

**Routes:**
- `/api/identity/*` - Client identity graph
- `/api/customers/*` - Client customer graph
- `/api/products/*` - Client product graph
- `/api/recommend/*` - Client recommendations
- `/api/agents/*` - Client AI agents
- `/api/workflows/*` - Client workflows
- `/health` - Health check

---

## DEPRECATED / MIGRATED SERVICES

| Old Port | Old Service | Status | New Port | New Service |
|----------|-------------|--------|----------|-------------|
| 4201 | REZ-memory-layer | Migrating | 4520 | hojai-memory |
| 4200 | REZ-flow-runtime | Migrating | 4560 | hojai-workflow |
| 4062 | REZ-autonomous-agents | Migrating | 4550 | hojai-agents |
| 4202 | REZ-whatsapp | Migrating | 4570 | hojai-communications |
| 4142 | REZ-signal-aggregator | Migrating | 4530 | hojai-intelligence |
| 4127 | REZ-feature-store | Migrating | 4590 | hojai-data |
| 4140 | REZ-geo-intelligence | Migrating | 4580 | hojai-hyperlocal |

---

## PORT CHECKLIST

### Hojai Core (Must Have)
- [ ] 4500 - Governance
- [ ] 4510 - Event
- [ ] 4520 - Memory
- [ ] 4530 - Intelligence
- [ ] 4550 - Agents
- [ ] 4560 - Workflow
- [ ] 4570 - Communications
- [ ] 4580 - Hyperlocal/Analytics
- [ ] 4590 - Data

### REZ Intelligence (Must Have)
- [ ] 4100 - Identity Graph
- [ ] 4110 - Commerce Graph
- [ ] 4120 - Mobility Graph
- [ ] 4130 - Loyalty Graph
- [ ] 4140 - Trust Graph
- [ ] 4150 - Behavioral Graph
- [ ] 4160 - Hyperlocal Graph
- [ ] 4170 - Intent Graph
- [x] 4180 - Communication Compliance ✅
- [x] 4181 - Policy Engine ✅
- [x] 4182 - Enforcement Gateway ✅
- [x] 4183 - LLM Compliance ✅
- [x] 4184 - Agent Governance ✅
- [x] 4185 - Audit Trail ✅
- [ ] 4190 - Recommendations
- [ ] 4200 - Predictions

### Compliance Suite (Ports 4180-4185)

| Port | Service | Platform | Purpose |
|------|---------|----------|---------|
| 4180 | Communication Compliance | hojai-compliance | Pre-send email/LinkedIn/document validation |
| 4181 | Policy Engine | hojai-compliance | NLP policy parsing, rule extraction |
| 4182 | Enforcement Gateway | hojali-compliance | Real-time blocking, quarantine, advisory |
| 4183 | LLM Compliance | hojai-compliance | AI content validation, PII detection |
| 4184 | Agent Governance | hojai-governance | Permission control, boundaries |
| 4185 | Audit Trail | hojai-governance | Compliance logging, reporting |

---

### Industry Intelligence (Phase 4)
- [ ] 4700 - Jewellery Brain
- [ ] 4710 - Healthcare Brain
- [ ] 4720 - Hospitality Brain
- [ ] 4730 - Retail Brain
- [ ] 4740 - Education Brain
- [ ] 4750 - Finance Brain
- [ ] 4760 - Real Estate Brain

### Hojai Clients (Phase 5)
- [ ] 4600 - XYZ Retail
- [ ] 4610 - ABC Hospital
- [ ] 4620 - Hotel Client
- [ ] 4630 - Clinic Client

### REZ AI Services (Phase 3)
- [ ] 5000 - REZ GraphQL Federation
- [ ] 5001 - REZ AutoML Pipeline
- [ ] 5002 - REZ Invoice OCR
- [ ] 5003 - REZ Contract Management
- [ ] 5004 - REZ Legal Document AI
- [ ] 5005 - REZ Cosmic Twin
- [ ] 5006 - REZ Ranking Service

---

*Document Version: 2.1*
*Last Updated: June 2, 2026*
