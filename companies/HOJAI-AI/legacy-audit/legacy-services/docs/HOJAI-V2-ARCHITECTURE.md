# HOJAI AI V2 ARCHITECTURE
**Version:** 2.0 | **Date:** May 29, 2026 | **Status:** OFFICIAL MASTER ARCHITECTURE

---

## Executive Summary

**Hojai AI** is the parent AI infrastructure company.

It owns and operates:

1. **Core AI Infrastructure** (Hojai Core)
2. **Industry Intelligence Networks** (Hojai Industry)
3. **Internal Ecosystem Intelligence** (REZ Intelligence)
4. **External Customer Intelligence** (Hojai Intelligence)

Everything runs on one shared infrastructure stack.

The intelligence layers are separated.

The data is separated.

The learning framework is shared.

---

## Architecture Principles

### Principle 1: Hojai is the Platform

```
OLD Architecture:
  REZ Intelligence → Everything Else

NEW Architecture:
  Hojai AI
    ├── Hojai Core Infrastructure
    ├── Industry Intelligence
    ├── REZ Intelligence (Privileged Tenant)
    └── Hojai Intelligence (Commercial Tenant)
```

### Principle 2: 10 Platforms, Not 100 Services

```
IMPORTANT: Do NOT create hundreds of microservices again.

Design large modular platforms:
  ✅ hojai-governance (not: auth-service, audit-service, policy-service)
  ✅ hojai-event (not: event-bus, event-store, event-schema)
  ✅ hojai-memory (not: customer-memory, session-memory, vector-store)
  ✅ hojai-workflow (not: workflow-runtime, workflow-builder, workflow-optimizer)
  ✅ hojai-agents (not: agent-registry, agent-runtime, agent-evaluator)

NOT:
  ❌ 50 microservices per platform
  ❌ 170+ total services
```

### Principle 3: Multi-Tenant from Day 1

Every service includes:
- tenant_id on all data
- tenant_id on all events
- tenant_id on all queries
- tenant isolation at database level

### Principle 4: RABTUL Stays Separate

```
Hojai uses RABTUL like any other client:
  - RABTUL Auth (4002)
  - RABTUL Payment (4001)
  - RABTUL Wallet (4004)

DO NOT duplicate auth, payments, wallet inside Hojai.
```

---

## Architecture Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOJAI AI (PARENT COMPANY)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    HOJAI CORE INFRASTRUCTURE                        │   │
│  │                                                                     │   │
│  │  1. Governance Platform     (4500)  Multi-tenant RBAC, Audit       │   │
│  │  2. Event Platform          (4510)  Event Bus, Streaming             │   │
│  │  3. Memory Platform         (4520)  Customer Memory, Vector Store    │   │
│  │  4. Workflow Platform       (4560)  Flow Runtime, Builder           │   │
│  │  5. Agent Platform          (4550)  AI Agents, Orchestration         │   │
│  │  6. Intelligence Platform   (4530)  Predictions, Recommendations    │   │
│  │  7. Communication Platform  (4570)  WhatsApp, SMS, Email, Voice     │   │
│  │  8. Hyperlocal Platform     (4580)  Geo Intelligence, Footfall      │   │
│  │  9. Analytics Platform     (4580)  Insights, Attribution            │   │
│  │  10. Data Platform         (4590)  Feature Store, Pipeline          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│           ┌───────────────────────┼───────────────────────┐               │
│           │                       │                       │               │
│           ▼                       ▼                       ▼               │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐      │
│  │ INDUSTRY          │  │ REZ               │  │ HOJAI             │      │
│  │ INTELLIGENCE      │  │ INTELLIGENCE      │  │ INTELLIGENCE      │      │
│  │                   │  │                   │  │                   │      │
│  │ (4700-4799)       │  │ (4100-4299)       │  │ (4600-4699)       │      │
│  │                   │  │                   │  │                   │      │
│  │ • Jewellery Brain │  │ • Identity Graph  │  │ • XYZ Retail      │      │
│  │ • Healthcare Brain│  │ • Commerce Graph  │  │ • ABC Hospital    │      │
│  │ • Hospitality Brain│  │ • Mobility Graph  │  │ • Hotel Client   │      │
│  │ • Retail Brain    │  │ • Loyalty Graph   │  │ • Clinic Client  │      │
│  │ • Education Brain │  │ • Trust Graph    │  │                   │      │
│  │ • Finance Brain   │  │ • Hyperlocal     │  │                   │      │
│  │ • Real Estate     │  │ • Intent Graph   │  │                   │      │
│  │                   │  │                   │  │                   │      │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
hojai-ai/
│
├── README.md                     # Main README
├── CLAUDE.md                     # This document
│
├── hojai-core/                   # Core Infrastructure Platform
│   ├── hojai-governance/         # Port 4500 - RBAC, Audit, Policy
│   ├── hojai-event/              # Port 4510 - Event Bus
│   ├── hojai-memory/             # Port 4520 - Memory Platform
│   ├── hojai-intelligence/       # Port 4530 - Predictions, ML
│   ├── hojai-agents/             # Port 4550 - Agent Platform
│   ├── hojai-workflow/           # Port 4560 - Workflow Platform
│   ├── hojai-communications/     # Port 4570 - Multi-channel Comms
│   ├── hojai-hyperlocal/         # Port 4580 - Geo Intelligence
│   ├── hojai-analytics/          # Port 4580 - Analytics
│   ├── hojai-data/               # Port 4590 - Data Platform
│   ├── hojai-api-gateway/        # API Gateway
│   ├── hojai-bridge/             # REZ Bridge
│   └── shared/                    # Shared utilities
│
├── hojai-industry/               # Industry Intelligence (4700-4799)
│   ├── jewellery-brain/          # Jewellery patterns
│   ├── healthcare-brain/          # Healthcare patterns
│   ├── hospitality-brain/         # Hospitality patterns
│   ├── retail-brain/             # Retail patterns
│   ├── education-brain/          # Education patterns
│   ├── finance-brain/             # Finance patterns
│   └── real-estate-brain/         # Real estate patterns
│
├── rez-intelligence/              # REZ Ecosystem Intelligence (4100-4299)
│   │                              # (Privileged Tenant)
│   ├── rez-identity-graph/        # Cross-platform identity
│   ├── rez-commerce-graph/        # Commerce relationships
│   ├── rez-mobility-graph/        # Ride/delivery mobility
│   ├── rez-loyalty-graph/         # Loyalty networks
│   ├── rez-trust-graph/           # Trust & verification
│   ├── rez-behavioral-graph/       # Behavior patterns
│   ├── rez-hyperlocal-graph/      # Location intelligence
│   ├── rez-intent-graph/           # User intent prediction
│   ├── rez-ecosystem-knowledge/    # REZ knowledge base
│   ├── rez-recommendations/        # REZ recommendation layer
│   ├── rez-predictions/            # REZ prediction layer
│   └── shared/                     # REZ shared packages
│
├── hojai-clients/                 # Commercial Clients (4600-4699)
│   ├── xyz-retail/               # Example: XYZ Retail
│   ├── abc-hospital/              # Example: ABC Hospital
│   ├── hotel-client/              # Example: Hotel chain
│   ├── clinic-client/             # Example: Clinic network
│   └── template/                   # Client template
│
├── products/                      # Frontend products
│   ├── hojai-whatsapp-ai/       # WhatsApp AI product
│   ├── admin-panel/               # Tenant admin
│   ├── monitoring-dashboard/       # System monitoring
│   ├── audit-dashboard/           # Audit logs
│   ├── governance-ui/              # RBAC UI
│   └── consent-ui/                 # Consent management
│
├── packages/                      # NPM packages
│   ├── unified-sdk/               # @hojai/sdk
│   ├── hojai-client-sdk/          # Client SDK
│   └── industry-sdk/               # Industry brain SDK
│
├── docs/                          # Documentation
│   ├── HOJAI-V2-ARCHITECTURE.md  # This file
│   ├── MIGRATION-GUIDE.md        # Migration steps
│   ├── PORT-REGISTRY.md           # Port allocations
│   ├── MULTI-TENANT.md            # Multi-tenant guide
│   ├── LEARNING-LAYER.md          # Learning architecture
│   ├── MERCHANT-AI-OS.md          # Merchant AI OS spec
│   ├── DATA-MODEL.md              # Canonical data model
│   ├── IDENTITY-RESOLUTION.md      # Identity resolution platform
│   ├── CONSENT-PLATFORM.md        # Consent management
│   ├── AGENT-LIFECYCLE.md        # Agent lifecycle spec
│   ├── HYPERLOCAL-PLATFORM.md     # Hyperlocal platform
│   ├── INDUSTRY-INTELLIGENCE-GOVERNANCE.md  # Industry brain governance
│   └── API-STANDARDS.md           # API standards
│
├── scripts/                       # Deployment scripts
├── .github/                       # CI/CD workflows
└── docker/                        # Docker configurations
```

---

## Port Registry

| Range | Owner | Purpose | Port |
|-------|-------|---------|------|
| **3000-3999** | REZ Domain | REZ ecosystem services | - |
| **4000-4499** | RABTUL | Shared platform (Auth, Payment, Wallet) | 4002, 4001, 4004 |
| **4500-4599** | Hojai Core | Core infrastructure | - |
| 4500 | Hojai | Governance | 4500 |
| 4510 | Hojai | Event Platform | 4510 |
| 4520 | Hojai | Memory Platform | 4520 |
| 4530 | Hojai | Intelligence Platform | 4530 |
| 4550 | Hojai | Agent Platform | 4550 |
| 4560 | Hojai | Workflow Platform | 4560 |
| 4570 | Hojai | Communications | 4570 |
| 4580 | Hojai | Hyperlocal + Analytics | 4580 |
| 4590 | Hojai | Data Platform | 4590 |
| **4600-4699** | Hojai Clients | Commercial intelligence | - |
| 4600 | Client | XYZ Retail | 4600 |
| 4610 | Client | ABC Hospital | 4610 |
| **4700-4799** | Hojai Industry | Industry brains | - |
| 4700 | Industry | Jewellery Brain | 4700 |
| 4710 | Industry | Healthcare Brain | 4710 |
| 4720 | Industry | Hospitality Brain | 4720 |
| 4730 | Industry | Retail Brain | 4730 |
| **4100-4299** | REZ Intelligence | REZ ecosystem | - |
| 4100 | REZ | Identity Graph | 4100 |
| 4110 | REZ | Commerce Graph | 4110 |
| 4120 | REZ | Mobility Graph | 4120 |
| 4130 | REZ | Loyalty Graph | 4130 |
| 4140 | REZ | Trust Graph | 4140 |
| 4150 | REZ | Behavioral Graph | 4150 |
| 4160 | REZ | Hyperlocal Graph | 4160 |
| 4170 | REZ | Intent Graph | 4170 |
| 4180 | REZ | Ecosystem Knowledge | 4180 |
| 4190 | REZ | Recommendations | 4190 |
| 4200 | REZ | Predictions | 4200 |

---

## LEVEL 1: HOJAI CORE INFRASTRUCTURE

### 1.1 What is Hojai Core?

Hojai Core is the **shared infrastructure platform** that powers:

- **Industry Intelligence** (jewellery, healthcare, etc.)
- **REZ Intelligence** (internal ecosystem)
- **Hojai Intelligence** (commercial clients)

---

### 1.2 Core Platforms

#### 1.2.1 Governance Platform (Port 4500)

**Purpose:** Trust, security, and control

**Components:**

| Component | Description |
|-----------|-------------|
| **Identity & Access** | RBAC, ABAC, tenant roles, service accounts |
| **Security** | Encryption, secrets management, key rotation |
| **Audit** | Audit logs, event history, AI decision logs |
| **Policy Engine** | Cross-tenant policies (e.g., "Health data cannot be used for ads") |

**Multi-Tenant Requirements:**
```typescript
interface TenantContext {
  tenant_id: string;
  organization_id: string;
  namespace: string;
  user_id: string;
  roles: string[];
  permissions: string[];
}

// Every request must include tenant context
// Middleware validates tenant access
```

---

#### 1.2.2 Event Platform (Port 4510)

**Purpose:** Nervous system - everything becomes an event

**Event Categories:**
```typescript
// Core events
customer.*      // customer.created, customer.updated
lead.*          // lead.created, lead.qualified
booking.*       // booking.confirmed, booking.cancelled
order.*         // order.placed, order.completed

// Intelligence events
churn.*         // churn.risk_detected
intent.*        // intent.expressed
prediction.*    // prediction.completed

// Communication events
message.*       // message.sent, message.delivered
campaign.*      // campaign.triggered

// System events
agent.*         // agent.action_completed
workflow.*      // workflow.triggered, workflow.completed
```

**Capabilities:**
- Event Bus
- Event Store
- Event Replay
- Event Streaming
- Event Routing
- Dead Letter Queue
- Schema Registry

---

#### 1.2.3 Memory Platform (Port 4520)

**Purpose:** Persistent operational memory

**Memory Types:**

| Type | Description |
|------|-------------|
| **Customer Memory** | Preferences, history, lifecycle, intents |
| **Merchant Memory** | Business rules, SOPs, escalation policies |
| **Agent Memory** | Previous actions, outcomes, context |
| **Session Memory** | Current conversation state |

**Features:**
- Vector embeddings
- Timeline storage
- Cross-tenant isolation
- Real-time updates

---

#### 1.2.4 Workflow Platform (Port 4560)

**Purpose:** Automate operations

**Workflow Example:**
```
Lead Created
    ↓
Wait 24 Hours
    ↓
No Reply
    ↓
Send Reminder
    ↓
No Reply
    ↓
Escalate Human
    ↓
Create Task
```

**Components:**
- Workflow Runtime
- Workflow Builder (Visual)
- Triggers (Event, Schedule, Webhook)
- Actions (Send, Notify, Update, API)
- State Machines

---

#### 1.2.5 Agent Platform (Port 4550)

**Purpose:** AI Employees

**Agent Types:**
| Type | Purpose |
|------|---------|
| **Support Agent** | Customer support |
| **Sales Agent** | Lead conversion |
| **Booking Agent** | Reservations |
| **Marketing Agent** | Campaigns |
| **Retention Agent** | Churn prevention |
| **Collection Agent** | Payment recovery |

**Capabilities:**
- Agent Registry
- Agent Orchestration
- Agent Handoffs
- Agent Memory
- Agent Permissions
- Human-in-the-loop

---

#### 1.2.6 Intelligence Platform (Port 4530)

**Purpose:** Reasoning and prediction

**Components:**
| Component | Description |
|-----------|-------------|
| **Recommendation Engine** | Personalized recommendations |
| **Prediction Engine** | Churn, LTV, conversion |
| **Segmentation Engine** | Dynamic customer segments |
| **Decision Engine** | Real-time decisions |
| **Explainability Engine** | SHAP/LIME explanations |
| **Temporal Intelligence** | Habit detection, lifecycle |

---

#### 1.2.7 Communication Platform (Port 4570)

**Channels:**
- WhatsApp
- Voice
- SMS
- Email
- Instagram
- Web Chat

**Important:**
```
WhatsApp is an interface.
Not the product.
```

**Features:**
- Template management
- Session handling
- Multi-channel routing
- Preference handling

---

#### 1.2.8 Hyperlocal Platform (Port 4580)

**Purpose:** Real-world intelligence

**Capabilities:**
| Capability | Description |
|------------|-------------|
| **Demand Intelligence** | Area-based demand prediction |
| **Geo Intelligence** | Location clustering |
| **Footfall Prediction** | Physical traffic forecasting |
| **Merchant Density** | Competition analysis |
| **Event Impact** | Event-driven demand shifts |
| **Area Scoring** | Hot zone identification |

---

#### 1.2.9 Analytics Platform (Port 4580)

**Purpose:** Insights and attribution

**Features:**
- Real-time dashboards
- Attribution modeling
- Cohort analysis
- Funnel analytics
- Custom reports

---

#### 1.2.10 Data Platform (Port 4590)

**Purpose:** Feature store and data pipeline

**Features:**
- Feature engineering
- Feature serving
- Batch processing
- Data quality
- Governance

---

## LEVEL 2: INDUSTRY INTELLIGENCE (4700-4799)

### 2.1 Purpose

Industry Intelligence learns patterns across multiple tenants WITHOUT storing tenant data.

**Learns:**
- Patterns
- Workflows
- Benchmarks
- Models

**Never Stores:**
- Customer names
- Customer phone numbers
- Tenant data
- Raw personal information

---

### 2.2 Industry Brains

#### 2.2.1 Jewellery Brain (Port 4700)

**Learns:**
- Bridal journeys
- Gold purchase cycles
- Festival demand
- Follow-up patterns
- Conversion timelines

---

#### 2.2.2 Healthcare Brain (Port 4710)

**Learns:**
- Appointment behavior
- No-show patterns
- Treatment journeys
- Patient retention
- Seasonal health patterns

---

#### 2.2.3 Hospitality Brain (Port 4720)

**Learns:**
- Booking patterns
- Occupancy demand
- Upsell opportunities
- Seasonal variations
- Cancellation patterns

---

#### 2.2.4 Retail Brain (Port 4730)

**Learns:**
- Basket behavior
- Repeat purchases
- Conversion journeys
- Promotion response
- Category affinity

---

#### 2.2.5 Education Brain (Port 4740)

**Learns:**
- Learning patterns
- Course completion
- Dropout signals
- Engagement rhythms

---

#### 2.2.6 Finance Brain (Port 4750)

**Learns:**
- Payment patterns
- Credit behavior
- Investment cycles
- Financial goals

---

#### 2.2.7 Real Estate Brain (Port 4760)

**Learns:**
- Purchase timelines
- Lead nurturing
- Site visit behavior
- Budget cycles

---

## LEVEL 3: REZ INTELLIGENCE (4100-4299)

### 3.1 Overview

REZ Intelligence is a **privileged tenant** on Hojai Core.

It uses:
- All Hojai Core infrastructure
- REZ-specific privileged data

---

### 3.2 Data Sources

| Source | Signals |
|--------|---------|
| **REZ Consumer** | Commerce, shopping, QR scans |
| **REZ Ride** | Mobility, ride patterns |
| **BuzzLocal** | Local intelligence |
| **Z Events** | Event bookings |
| **RisaCare** | Health signals |
| **RidZa** | Finance signals |
| **CorpPerks** | Workforce signals |
| **MyTalent** | Career signals |
| **StayOwn** | Hospitality signals |
| **RisnaEstate** | Real estate signals |
| **Karma** | Trust signals |
| **Rendez** | Relationship signals |

---

### 3.3 REZ Graphs

#### 3.3.1 REZ Identity Graph (Port 4100)

Cross-platform user identity resolution

**Features:**
- Unified identity
- Device linking
- Cross-app journey
- Privacy controls

---

#### 3.3.2 REZ Commerce Graph (Port 4110)

Commerce relationship intelligence

**Relationships:**
```
purchased_from, reviewed, visited
referred, follows, located_at
targeted_by, viewed, contains
converted_from, influenced, competed_with
```

---

#### 3.3.3 REZ Mobility Graph (Port 4120)

Ride and delivery intelligence

**Features:**
- Route patterns
- Driver behavior
- Demand zones
- ETA prediction

---

#### 3.3.4 REZ Loyalty Graph (Port 4130)

Loyalty network intelligence

**Features:**
- Point balances
- Tier progression
- Coalition loyalty
- Reward optimization

---

#### 3.3.5 REZ Trust Graph (Port 4140)

Trust and verification

**Features:**
- KYC verification
- Rating systems
- Fraud signals
- Safety scores

---

#### 3.3.6 REZ Behavioral Graph (Port 4150)

User behavior patterns

**Features:**
- Session analysis
- Engagement scoring
- Preference mapping
- Intent signals

---

#### 3.3.7 REZ Hyperlocal Graph (Port 4160)

Location intelligence

**Zone Hierarchy:**
```
City → District → Neighborhood → Micro-zone → Venue
bangalore → koramangala → ngb_* → mz_* → vc_*
```

---

#### 3.3.8 REZ Intent Graph (Port 4170)

User intent prediction

**Features:**
- Real-time intent
- Next action prediction
- Search intent
- Purchase intent

---

#### 3.3.9 REZ Ecosystem Knowledge (Port 4180)

REZ-specific knowledge base

**Features:**
- Merchant knowledge
- Product knowledge
- FAQ knowledge
- Policy knowledge

---

#### 3.3.10 REZ Recommendations (Port 4190)

REZ-specific recommendation layer

**Features:**
- Product recommendations
- Merchant recommendations
- Offer recommendations
- Content recommendations

---

#### 3.3.11 REZ Predictions (Port 4200)

REZ-specific prediction layer

**Features:**
- Churn prediction
- LTV prediction
- Conversion prediction
- Demand prediction

---

## LEVEL 4: HOJAI INTELLIGENCE (4600-4699)

### 4.1 Overview

Hojai Intelligence is the **commercial division** for external clients.

Same architecture as REZ Intelligence, but:
- Separate data
- Separate namespace
- No privileged REZ data

---

### 4.2 Client Structure

Each client (XYZ, ABC) gets:

```
Client Intelligence
├── Client Identity Graph
├── Client Customer Graph
├── Client Product Graph
├── Client Commerce Graph
├── Client Recommendations
├── Client AI Employees
├── Client Workflows
├── Client Analytics
└── Client Memory
```

---

### 4.3 Example Clients

| Client | Industry | Port |
|--------|----------|------|
| XYZ Retail | Retail | 4600 |
| ABC Hospital | Healthcare | 4610 |
| Hotel Client | Hospitality | 4620 |
| Clinic Client | Healthcare | 4630 |

---

## LEVEL 5: LEARNING LAYER

### 5.1 Three-Layer Learning Model

#### Layer 1: Tenant Learning

**Scope:** Per tenant (REZ, XYZ, ABC)

**Characteristics:**
- Private ML models
- No data sharing
- Full control

**Example:**
```
XYZ Retail learns XYZ customers
REZ learns REZ users
```

---

#### Layer 2: Industry Learning

**Scope:** Per industry (Jewellery, Healthcare, etc.)

**Characteristics:**
- Anonymous patterns only
- No raw customer data
- Aggregated insights

**Allowed:**
```
Average bridal conversion time: 45-90 days
Common appointment no-show rate: 15%
Hotel cancellation rate by season
```

**Not Allowed:**
```
Customer X purchased gold ring
Patient Y missed appointment
Guest Z cancelled booking
```

**Technical Implementation:**
- Federated learning (later)
- Anonymous metrics (Day 1)
- Model distillation
- Pattern aggregation

---

#### Layer 3: Global Learning

**Scope:** Platform-wide

**Characteristics:**
- Platform metrics
- Workflow patterns
- Agent behaviors

**Examples:**
```
Average workflow completion rate: 85%
Support agent resolution rate: 78%
Most common automation: Order confirmation
```

---

### 5.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        TIER 1: TENANT LEARNING                  │
│                                                                  │
│  REZ → Trains → REZ-specific models (private)                   │
│  XYZ → Trains → XYZ-specific models (private)                   │
│  ABC → Trains → ABC-specific models (private)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Anonymous metrics only)
┌─────────────────────────────────────────────────────────────────┐
│                        TIER 2: INDUSTRY LEARNING                 │
│                                                                  │
│  All Jewellery Clients → Jewellery Brain (patterns only)        │
│  All Healthcare Clients → Healthcare Brain (patterns only)       │
│  All Hospitality Clients → Hospitality Brain (patterns only)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Aggregated platform metrics)
┌─────────────────────────────────────────────────────────────────┐
│                        TIER 3: GLOBAL LEARNING                   │
│                                                                  │
│  Platform-wide → Workflow optimizations                          │
│  Platform-wide → Agent behavior patterns                         │
│  Platform-wide → Best practices                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## MULTI-TENANT ARCHITECTURE

### 6.1 Tenant Isolation

Every Hojai Core service supports:

```typescript
// Every request includes tenant context
interface TenantContext {
  tenant_id: string;       // Unique tenant identifier
  organization_id: string; // Organization within tenant
  namespace: string;      // Data namespace
  user_id?: string;       // Optional user ID
  roles: string[];        // User roles
  permissions: string[];   // User permissions
}

// Middleware validates tenant access
// Database queries are tenant-scoped
// Events are tenant-tagged
```

---

### 6.2 Database Isolation

**Option A: Separate databases (Strongest)**
```typescript
// Each tenant gets own database
tenant_xyz_retail_db
tenant_abc_hospital_db
tenant_rez_intelligence_db
```

**Option B: Separate schemas (Moderate)**
```typescript
// PostgreSQL schemas
xyz_retail_schema
abc_hospital_schema
rez_intelligence_schema
```

**Option C: Tenant ID column (Simplest)**
```typescript
// All tables have tenant_id
{ tenant_id: 'xyz_retail', ... }
```

**Recommendation:** Option C for Day 1, migrate to Option A/B based on compliance needs.

---

### 6.3 API Isolation

```typescript
// All API endpoints require tenant context
app.use('/api/*', tenantMiddleware());

// Tenant-scoped queries
const customers = await db.customers.findMany({
  where: { tenant_id: context.tenant_id }
});
```

---

## RABTUL INTEGRATION

### 7.1 RABTUL Remains Separate

```
DO NOT duplicate auth, payments, wallet inside Hojai.
```

---

### 7.2 RABTUL Services

| Service | Port | Purpose |
|---------|------|---------|
| **RABTUL Auth** | 4002 | JWT, OTP, OAuth |
| **RABTUL Payment** | 4001 | Razorpay, UPI |
| **RABTUL Wallet** | 4004 | Coins, Balance |
| **RABTUL Order** | 4006 | Order lifecycle |
| **RABTUL Catalog** | 4007 | Products, Inventory |
| **RABTUL Notifications** | 4011 | Push, SMS, WhatsApp |

---

### 7.3 Hojai Uses RABTUL

```
Customer Books
    ↓
RABTUL Booking
    ↓
Hojai Event (enriched with tenant context)
    ↓
Hojai Workflow
    ↓
AI Decision
    ↓
RABTUL CRM Action
```

---

## MIGRATION PLAN

### Phase 1: Foundation (NOW)

**Duration:** 2 weeks

**Services to migrate to hojai-core:**
| Service | From | To | Port |
|---------|------|-----|------|
| Governance | hojai-governance | hojai-core/hojai-governance | 4500 |
| Event Bus | REZ-event-bus | hojai-core/hojai-event | 4510 |
| Memory | REZ-memory-layer | hojai-core/hojai-memory | 4520 |
| Workflow | REZ-flow-runtime | hojai-core/hojai-workflow | 4560 |
| Agents | REZ-autonomous-agents | hojai-core/hojai-agents | 4550 |

**Actions:**
1. Create hojai-core directory structure
2. Move hojai-governance → hojai-core/hojai-governance
3. Create hojai-event from REZ-event-bus
4. Create hojai-memory from REZ-memory-layer
5. Create hojai-workflow from REZ-flow-runtime
6. Create hojai-agents from REZ-autonomous-agents
7. Add tenant_id to all services
8. Update port registry

---

### Phase 2: Intelligence & Comms

**Duration:** 2 weeks

**Services:**
| Service | From | To | Port |
|---------|------|-----|------|
| Intelligence | REZ-predictive-engine | hojai-core/hojai-intelligence | 4530 |
| Communications | REZ-whatsapp | hojai-core/hojai-communications | 4570 |
| Analytics | REZ-insights-service | hojai-core/hojai-analytics | 4580 |
| Data | REZ-feature-store | hojai-core/hojai-data | 4590 |

---

### Phase 3: REZ Intelligence Restructure

**Duration:** 2 weeks

**Create rez-intelligence folder:**
```
rez-intelligence/
├── rez-identity-graph/
├── rez-commerce-graph/
├── rez-mobility-graph/
├── rez-loyalty-graph/
├── rez-trust-graph/
├── rez-behavioral-graph/
├── rez-hyperlocal-graph/
├── rez-intent-graph/
├── rez-ecosystem-knowledge/
├── rez-recommendations/
└── rez-predictions/
```

**Ports:** 4100-4200

---

### Phase 4: Industry Intelligence

**Duration:** 3 weeks

**Create hojai-industry folder:**
```
hojai-industry/
├── jewellery-brain/
├── healthcare-brain/
├── hospitality-brain/
├── retail-brain/
├── education-brain/
├── finance-brain/
└── real-estate-brain/
```

**Ports:** 4700-4799

---

### Phase 5: Client Template

**Duration:** 1 week

**Create hojai-clients template:**
```
hojai-clients/
├── template/
│   ├── client-identity/
│   ├── client-memory/
│   ├── client-recommendations/
│   ├── client-agents/
│   └── client-workflows/
├── xyz-retail/
└── abc-hospital/
```

**Ports:** 4600-4699

---

## API STANDARDS

### Response Envelope
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
    latencyMs?: number;
  };
}
```

### Event Schema
```typescript
interface HojaiEvent {
  id: string;
  tenant_id: string;
  type: string;
  source: string;
  timestamp: string;
  data: Record<string, any>;
  correlationId?: string;
}
```

---

## TEAM OWNERSHIP

| Component | Owner | Team |
|-----------|-------|------|
| Hojai Core Platform | Core Team | Hojai |
| Industry Intelligence | Industry Team | Hojai |
| REZ Intelligence | REZ Team | REZ |
| Hojai Intelligence | Client Team | Hojai |

---

## DOCUMENT VERSION

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 29, 2026 | Hojai AI | Initial architecture |
| 2.0 | May 29, 2026 | Hojai AI | Added migration plan |

---

*This is the official Hojai AI v2 Architecture. All development must follow this structure.*
