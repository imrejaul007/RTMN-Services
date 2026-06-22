# RTMN TwinOS Architecture Documentation

**Version:** 2.0  
**Last Updated:** June 18, 2026  
**Status:** ✅ OPERATIONAL - 60+ Canonical Twins Defined

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Twin Categories](#twin-categories)
4. [Complete Twin Registry](#complete-twin-registry)
5. [Twin Relationships](#twin-relationships)
6. [Service Connections](#service-connections)
7. [Implementation Standards](#implementation-standards)
8. [API Reference](#api-reference)
9. [Security Architecture](#security-architecture)
10. [Migration Guide](#migration-guide)

---

## Executive Summary

RTMN TwinOS is a **domain-centric digital twin platform** that provides unified digital representations of real-world entities across the entire RTMN ecosystem.

### Key Statistics

| Metric | Count |
|--------|-------|
| **Total Canonical Twins** | 60+ |
| **Twin Categories** | 15 |
| **Industry Verticals** | 12 |
| **Foundation Services** | 3 |
| **AI Agents** | 50+ |

### Strategic Value

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RTMN TWINOS PLATFORM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    FOUNDATION LAYER                        │   │
│   │    Identity │ Memory │ Knowledge │ AI │ Simulation         │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    DOMAIN LAYER                            │   │
│   │                                                             │   │
│   │   Commerce      │   People      │   AI/Memory   │   Finance│   │
│   │   Customer      │   Employee    │   Memory      │   Asset  │   │
│   │   Order         │   User        │   Conversation│   Budget │   │
│   │   Wallet        │   Founder     │   Intent     │   Ledger │   │
│   │   Payment       │   Candidate   │   Goal       │   Invoice│   │
│   │   Product       │               │   Simulation │   Expense│   │
│   │   Inventory     │               │   Agent      │          │   │
│   │   Merchant      │               │   Knowledge  │          │   │
│   │   Cart          │               │   Digital    │          │   │
│   │                 │               │   Human      │          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                  INDUSTRY LAYER                             │   │
│   │                                                             │   │
│   │  Hospitality    │  Healthcare  │  Real Estate  │  Travel  │   │
│   │  Hotel          │  Patient     │  Property     │  Flight  │   │
│   │  Guest          │  Doctor      │  Building     │  Trip    │   │
│   │  Room           │  Hospital    │  Lease        │  Passenger│  │
│   │  Booking        │  Prescription│  Tenant       │  Airport │   │
│   │  Restaurant     │  Lab         │  Maintenance  │  Luggage │   │
│   │  Menu           │  Insurance   │  Owner        │  Boarding│   │
│   │  Table          │  Medical Rec │               │          │   │
│   │                 │              │               │          │   │
│   │  Retail │ Event │ Manufacturing│ Marketing │ Operations │       │
│   │  Store │ Event  │ Machine      │ Campaign │ Project    │       │
│   │  Cart  │ Venue  │ Production   │ Audience │ Task       │       │
│   │  Coupon │ Ticket│ Factory      │ Ad       │ Process    │       │
│   │  Promo │ Exhibitor│ Work Order │ Creative │ Incident   │       │
│   │  Review │ Sponsor│ Material    │ Publisher│ Resource   │       │
│   │  Wishlist│ Speaker│ Quality    │ Ad Slot │ SOP        │       │
│   │  Subscription│ Agenda│         │ Conversion│          │       │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│                                                             │
│   TwinOS Hub API (4705)                                      │
│   ├── Twin Registry CRUD                                    │
│   ├── Twin State Management                                 │
│   ├── Cross-Twin Relationships                              │
│   ├── Sync Operations                                       │
│   └── Analytics & Statistics                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    DOMAIN LAYER                             │
│                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│   │  Commerce    │  │   People     │  │     AI       │     │
│   │  Twins       │  │   Twins      │  │   Twins      │     │
│   ├──────────────┤  ├──────────────┤  ├──────────────┤     │
│   │ Customer     │  │ Employee     │  │ Memory       │     │
│   │ Order        │  │ User        │  │ Conversation │     │
│   │ Wallet       │  │ Founder     │  │ Intent       │     │
│   │ Payment      │  │ Candidate   │  │ Goal         │     │
│   │ Product      │  │             │  │ Simulation   │     │
│   │ Inventory    │  │             │  │ Agent        │     │
│   │ Merchant     │  │             │  │ Knowledge    │     │
│   │ Cart         │  │             │  │ Digital Human│     │
│   └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                   FOUNDATION LAYER                          │
│                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│   │   CorpID     │  │  MemoryOS    │  │  TwinOS Hub  │     │
│   │  (4702)      │  │   (4703)     │  │   (4705)     │     │
│   │              │  │              │  │              │     │
│   │ Identity     │  │ Personal     │  │ Registry     │     │
│   │ Authentication│  │ Context     │  │ State Mgmt   │     │
│   │ Authorization│  │ Long-term    │  │ Relationships│     │
│   │ SSO          │  │ Learning     │  │ Sync         │     │
│   └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Domain-Centric vs Service-Centric

| Aspect | Service-Centric (Old) | Domain-Centric (New) |
|--------|------------------------|---------------------|
| **Structure** | One twin per service | Multiple twins per domain |
| **Cohesion** | Low | High |
| **Scalability** | Poor | Excellent |
| **Maintenance** | Scattered | Centralized |
| **Example** | Employee Twin | People Twin + HR Twins |

---

## Twin Categories

### 1. Foundation Twins (5)

Base infrastructure twins that power all other twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `corpid.identity` | Identity | identity | corpid-os | 4702 | Universal identity & authentication |
| `memory.knowledge` | Knowledge | storage | memory-os | 4703 | Persistent knowledge storage |
| `goal.objective` | Goal | orchestration | goal-os | 4242 | Goal tracking & milestones |
| `decision.policy` | Decision | policy | decision-engine | 4240 | Business rules & decisions |
| `agent.ai` | AI Agent | agent | agent-os | 3002 | AI agent orchestration |

### 2. Commerce Twins (9)

Complete commerce lifecycle twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `commerce.customer` | Customer | person | customer-twin | 4895 | Customer profile, LTV, segments |
| `commerce.order` | Order | order | order-twin | 4885 | Order lifecycle management |
| `commerce.wallet` | Wallet | transaction | wallet-twin | 4896 | Digital wallet & balance |
| `commerce.payment` | Payment | transaction | payment-twin | 4886 | Payment processing |
| `commerce.product` | Product | catalog | product-twin | 4720 | Product catalog |
| `commerce.inventory` | Inventory | catalog | inventory-twin | 4887 | Inventory management |
| `commerce.merchant` | Merchant | entity | merchant-twin | 4888 | Merchant profile |
| `commerce.cart` | Cart | order | order-twin | 4885 | Shopping cart |
| `commerce.coupon` | Coupon | catalog | marketing-os | 5500 | Discounts & promotions |

### 3. People Twins (4)

Human resources and user management.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `people.employee` | Employee | workforce | employee-twin | 4730 | Employee profile & HR |
| `people.user` | User | person | user-twin | 4889 | Platform user account |
| `people.founder` | Founder | person | founder-os | 5100 | Founder & leadership |
| `people.candidate` | Candidate | person | workforce-os | 5077 | Job candidate |

### 4. AI/Memory Twins (9)

Intelligence and learning twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `ai.memory` | AI Memory | storage | memory-os | 4703 | Persistent AI memory |
| `ai.conversation` | Conversation | event | genie-memory | 4710 | Chat & interaction history |
| `ai.intent` | Intent | concept | genie-intent | 4725 | User intent detection |
| `ai.goal` | AI Goal | concept | goal-os | 4242 | AI goal tracking |
| `ai.simulation` | Simulation | model | simulation-os | 4241 | What-if scenarios |
| `ai.agent` | AI Agent | agent | agent-os | 3002 | Autonomous agent |
| `ai.knowledge` | Knowledge Graph | graph | knowledge-graph-os | 4501 | Entity relationships |
| `ai.reasoning` | Reasoning | concept | reasoning-engine | 4250 | Chain-of-thought |
| `ai.digital-human` | Digital Human | person | digital-human-os | 4900 | Complete person avatar |

### 5. Hospitality Twins (7)

Hotel and restaurant management.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `hospitality.hotel` | Hotel | resource | hotel-os | 5025 | Hotel property |
| `hospitality.room` | Room | resource | hotel-os | 5025 | Guest room |
| `hospitality.guest` | Guest | person | guest-twin | 4876 | Hotel guest |
| `hospitality.booking` | Booking | order | hotel-os | 5025 | Reservation |
| `hospitality.restaurant` | Restaurant | resource | restaurant-os | 5010 | Restaurant |
| `hospitality.menu` | Menu | catalog | restaurant-os | 5010 | Restaurant menu |
| `hospitality.table` | Table | resource | restaurant-os | 5010 | Restaurant table |

### 6. Healthcare Twins (6)

Medical and health services.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `healthcare.patient` | Patient | person | healthcare-os | 5020 | Patient record |
| `healthcare.doctor` | Doctor | person | healthcare-os | 5020 | Healthcare provider |
| `healthcare.hospital` | Hospital | resource | healthcare-os | 5020 | Medical facility |
| `healthcare.prescription` | Prescription | document | healthcare-os | 5020 | Medication order |
| `healthcare.lab` | Lab | resource | healthcare-os | 5020 | Laboratory |
| `healthcare.insurance` | Insurance | document | healthcare-os | 5020 | Insurance coverage |

### 7. Finance Twins (6)

Financial management twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `finance.asset` | Asset | entity | asset-twin | 4890 | Company assets |
| `finance.budget` | Budget | metric | finance-os | 4801 | Budget tracking |
| `finance.expense` | Expense | transaction | finance-os | 4801 | Expense records |
| `finance.invoice` | Invoice | document | finance-os | 4801 | Billing invoice |
| `finance.ledger` | Ledger | document | finance-os | 4801 | Accounting ledger |
| `finance.tax` | Tax | document | finance-os | 4801 | Tax records |

### 8. Marketing Twins (6)

Advertising and marketing twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `marketing.campaign` | Campaign | event | marketing-os | 5500 | Marketing campaign |
| `marketing.audience` | Audience | entity | adbazaar-audience | 4805 | Target audience |
| `marketing.ad` | Ad | event | adbazaar-dsp | 4990 | Advertisement |
| `marketing.creative` | Creative | document | media-os | 5600 | Ad creative |
| `marketing.publisher` | Publisher | entity | adbazaar-dsp | 4990 | Ad publisher |
| `marketing.conversion` | Conversion | metric | adbazaar-attribution | 4803 | Conversion tracking |

### 9. Operations Twins (6)

Operational management twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `ops.project` | Project | entity | operations-os | 5250 | Project management |
| `ops.task` | Task | event | operations-os | 5250 | Task tracking |
| `ops.process` | Process | event | operations-os | 5250 | Business process |
| `ops.incident` | Incident | event | operations-os | 5250 | Incident management |
| `ops.resource` | Resource | resource | operations-os | 5250 | Resource allocation |
| `ops.sop` | SOP | document | operations-os | 5250 | Standard operating procedure |

### 10. Real Estate Twins (5)

Property management twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `realestate.property` | Property | entity | realestate-os | 5230 | Real estate listing |
| `realestate.building` | Building | resource | realestate-os | 5230 | Building |
| `realestate.lease` | Lease | document | realestate-os | 5230 | Rental agreement |
| `realestate.tenant` | Tenant | person | realestate-os | 5230 | Tenant profile |
| `realestate.owner` | Owner | person | realestate-os | 5230 | Property owner |

### 11. HR Twins (5)

Human resources twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `hr.candidate` | Candidate | person | workforce-os | 5077 | Job applicant |
| `hr.payroll` | Payroll | transaction | workforce-os | 5077 | Salary processing |
| `hr.performance` | Performance | metric | workforce-os | 5077 | Performance review |
| `hr.department` | Department | entity | workforce-os | 5077 | Org structure |
| `hr.leave` | Leave | event | workforce-os | 5077 | Time off tracking |

### 12. Event Twins (6)

Event and exhibition twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `event.event` | Event | event | event-os | 4751 | Event definition |
| `event.venue` | Venue | resource | event-os | 4751 | Event location |
| `event.ticket` | Ticket | catalog | event-os | 4751 | Event ticket |
| `event.exhibitor` | Exhibitor | entity | event-os | 4751 | Booth exhibitor |
| `event.speaker` | Speaker | person | event-os | 4751 | Event speaker |
| `event.agenda` | Agenda | document | event-os | 4751 | Event schedule |

### 13. Travel Twins (5)

Travel and transportation twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `travel.flight` | Flight | event | travel-os | 5190 | Flight booking |
| `travel.passenger` | Passenger | person | travel-os | 5190 | Traveler |
| `travel.trip` | Trip | entity | travel-os | 5190 | Travel itinerary |
| `travel.airport` | Airport | resource | travel-os | 5190 | Airport |
| `travel.luggage` | Luggage | thing | travel-os | 5190 | Baggage |

### 14. Business Twins (4)

Business relationship twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `business.partner` | Partner | entity | partner-twin | 4892 | Business partner |
| `business.organization` | Organization | entity | organization-twin | 4710 | Company profile |
| `business.lead` | Lead | person | lead-twin | 4894 | Sales lead |
| `business.deal` | Deal | event | sales-os | 5055 | Sales opportunity |

### 15. Voice/Personal Twins (3)

Personal digital twins.

| Twin ID | Name | Type | Service | Port | Description |
|---------|------|------|---------|------|-------------|
| `voice.profile` | Voice Profile | person | voice-twin | 4876 | Voice assistant profile |
| `voice.recording` | Recording | document | voice-twin | 4876 | Voice recording |
| `social.community` | Community | entity | buzzlocal-os | 5200 | Social community |

---

## Complete Twin Registry

### All Canonical Twins (60+)

```json
{
  "foundation": [
    "corpid.identity",
    "memory.knowledge",
    "goal.objective",
    "decision.policy",
    "agent.ai"
  ],
  "commerce": [
    "commerce.customer",
    "commerce.order",
    "commerce.wallet",
    "commerce.payment",
    "commerce.product",
    "commerce.inventory",
    "commerce.merchant",
    "commerce.cart",
    "commerce.coupon"
  ],
  "people": [
    "people.employee",
    "people.user",
    "people.founder"
  ],
  "ai": [
    "ai.memory",
    "ai.conversation",
    "ai.intent",
    "ai.goal",
    "ai.simulation",
    "ai.agent",
    "ai.knowledge",
    "ai.reasoning",
    "ai.digital-human"
  ],
  "hospitality": [
    "hospitality.hotel",
    "hospitality.room",
    "hospitality.guest",
    "hospitality.booking",
    "hospitality.restaurant",
    "hospitality.menu",
    "hospitality.table"
  ],
  "healthcare": [
    "healthcare.patient",
    "healthcare.doctor",
    "healthcare.hospital",
    "healthcare.prescription",
    "healthcare.lab",
    "healthcare.insurance"
  ],
  "finance": [
    "finance.asset",
    "finance.budget",
    "finance.expense",
    "finance.invoice",
    "finance.ledger",
    "finance.tax"
  ],
  "marketing": [
    "marketing.campaign",
    "marketing.audience",
    "marketing.ad",
    "marketing.creative",
    "marketing.publisher",
    "marketing.conversion"
  ],
  "operations": [
    "ops.project",
    "ops.task",
    "ops.process",
    "ops.incident",
    "ops.resource",
    "ops.sop"
  ],
  "realestate": [
    "realestate.property",
    "realestate.building",
    "realestate.lease",
    "realestate.tenant",
    "realestate.owner"
  ],
  "hr": [
    "hr.candidate",
    "hr.payroll",
    "hr.performance",
    "hr.department",
    "hr.leave"
  ],
  "event": [
    "event.event",
    "event.venue",
    "event.ticket",
    "event.exhibitor",
    "event.speaker",
    "event.agenda"
  ],
  "travel": [
    "travel.flight",
    "travel.passenger",
    "travel.trip",
    "travel.airport",
    "travel.luggage"
  ],
  "business": [
    "business.partner",
    "business.organization",
    "business.lead",
    "business.deal"
  ],
  "personal": [
    "voice.profile",
    "voice.recording",
    "social.community"
  ]
}
```

---

## Twin Relationships

### Relationship Types

| Type | Description | Example |
|------|-------------|---------|
| `owns` | Ownership relationship | Merchant → Product |
| `has` | Container relationship | Customer → Order |
| `part_of` | Membership relationship | Order → Shipment |
| `related_to` | General association | Product → Category |
| `depends_on` | Dependency | Order → Payment |
| `references` | External reference | Customer → Wallet |
| `manages` | Management relationship | Employee → Project |

### Key Relationship Graphs

#### Commerce Loop

```
Customer (commerce.customer)
    │
    ├──[has]──► Wallet (commerce.wallet)
    │                │
    │                └──[has]──► Transaction (commerce.payment)
    │
    ├──[has]──► Cart (commerce.cart)
    │                │
    │                └──[converts_to]──► Order (commerce.order)
    │
    ├──[has]──► Order (commerce.order) × N
    │                │
    │                ├──[has]──► Payment (commerce.payment)
    │                │
    │                ├──[has]──► Shipment (commerce.shipment)
    │                │
    │                └──[may_have]──► Return (commerce.return)
    │
    └──[has]──► Preferences (commerce.preferences)
                     │
                     └──[references]──► Product (commerce.product)
```

#### Hospitality Guest Journey

```
Guest (hospitality.guest)
    │
    ├──[creates]──► Booking (hospitality.booking) × N
    │                     │
    │                     ├──[references]──► Hotel (hospitality.hotel)
    │                     │
    │                     └──[has]──► Room (hospitality.room) × N
    │
    ├──[has]──► Wallet (commerce.wallet)
    │
    └──[prefers]──► Preferences
```

#### Employee Lifecycle

```
Employee (people.employee)
    │
    ├──[belongs_to]──► Department (hr.department)
    │                      │
    │                      └──[belongs_to]──► Organization (business.organization)
    │
    ├──[has]──► Payroll (hr.payroll) × N
    │
    ├──[has]──► Performance (hr.performance) × N
    │
    ├──[requests]──► Leave (hr.leave) × N
    │
    └──[manages]──► Project (ops.project) × N
```

---

## Service Connections

### Twin to Service Mapping

| Twin Category | Primary Service | Port | Secondary Services |
|--------------|-----------------|------|-------------------|
| Foundation | TwinOS Hub | 4705 | CorpID (4702), MemoryOS (4703) |
| Commerce | Order Twin | 4885 | Wallet (4896), Payment (4886), Customer (4895) |
| People | Employee Twin | 4730 | Workforce OS (5077) |
| AI | MemoryOS | 4703 | Genie Suite (4710-4715), Agent OS (3002) |
| Hospitality | Hotel OS | 5025 | Restaurant OS (5010), Guest Twin (4876) |
| Healthcare | Healthcare OS | 5020 | RisaCare (external client) consumes Healthcare OS via API + Healthcare Vertical Intelligence (HOJAI 4160) for templates |
| Finance | Finance OS | 4801 | Asset Twin (4890) |
| Marketing | Marketing OS | 5500 | AdBazaar (4805, 4990) |
| Operations | Operations OS | 5250 | All Industry OS |
| Real Estate | RealEstate OS | 5230 | Property management |
| HR | Workforce OS | 5077 | Employee Twin (4730) |
| Event | Event OS | 4751 | Exhibition OS (5040) |
| Travel | Travel OS | 5190 | Hospitality services |
| Business | Org Twin | 4710 | Partner Twin (4892), Lead Twin (4894) |
| Personal | Voice Twin | 4876 | Genie services |

### Cross-Service Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                       TwinOS Hub (4705)                         │
│                      Central Registry                           │
└─────────────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
    ┌───────────────────────┐  ┌───────────────────────┐
    │   Commerce Services    │  │   Industry Services    │
    ├───────────────────────┤  ├───────────────────────┤
    │ Customer Twin (4895)  │  │ Hotel OS (5025)       │
    │ Order Twin (4885)     │  │ Restaurant OS (5010)  │
    │ Wallet Twin (4896)    │  │ Healthcare OS (5020)  │
    │ Payment Twin (4886)   │  │ Event OS (4751)       │
    └───────────────────────┘  └───────────────────────┘
                    │                    │
                    ▼                    ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                      Foundation Services                      │
    ├─────────────────────────────────────────────────────────────┤
    │ CorpID (4702) │ MemoryOS (4703) │ Agent OS (3002)          │
    └─────────────────────────────────────────────────────────────┘
```

---

## Implementation Standards

### Required Security Features

Every twin service MUST implement:

1. ✅ **Authentication** - JWT or API key validation
2. ✅ **Authorization** - Role-based access control
3. ✅ **Rate Limiting** - Protection against abuse
4. ✅ **Input Validation** - Prevent injection attacks
5. ✅ **Error Handling** - Consistent error responses
6. ✅ **Request Logging** - Audit trail
7. ✅ **Health Endpoints** - `/health` and `/ready`

### Code Template

```javascript
import express from 'express';
import {
  requireAuth,
  preventPrototypePollution,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger,
  defaultLimiter,
  strictLimiter
} from '@rtmn/twinos-shared';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(requestId);
app.use(requestLogger);

// Rate limiting
app.use('/api/', defaultLimiter);
app.use('/api/write', strictLimiter);

// Routes with auth
app.get('/api/twins/:id', requireAuth, asyncHandler(async (req, res) => {
  // Implementation
}));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Health
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.listen(PORT, () => logger.info(`Twin service running on ${PORT}`));
```

---

## API Reference

### TwinOS Hub API

#### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user |
| `/auth/login` | POST | Login |
| `/auth/refresh` | POST | Refresh token |
| `/auth/logout` | POST | Logout |
| `/auth/me` | GET | Current user |

#### Twin Registry

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/twins` | GET | List twins |
| `/api/twins/:id` | GET | Get twin |
| `/api/twins/:id` | PUT | Update twin |
| `/api/twins/:id` | DELETE | Delete twin |
| `/api/twins/:id/state` | GET | Get state |
| `/api/twins/:id/state` | PUT | Update state |

#### Relationships

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/relationships` | GET | List relationships |
| `/api/relationships` | POST | Create relationship |
| `/api/relationships/:id` | DELETE | Delete relationship |

#### Sync

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sync/:id` | POST | Sync twin |
| `/api/sync` | POST | Bulk sync |
| `/api/sync/history` | GET | Sync history |

#### Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Hub statistics |
| `/api/categories` | GET | Twins by category |
| `/api/services` | GET | Twins by service |

---

## Security Architecture

### Authentication Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client  │      │   Hub   │      │   CorpID │      │  Twin    │
│          │      │         │      │          │      │ Service  │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │ POST /auth/login│                 │                 │
     │────────────────►│                 │                 │
     │                 │                 │                 │
     │         Validate│                 │                 │
     │         credentials                 │                 │
     │         ───────►│                 │                 │
     │                 │                 │                 │
     │       Issue JWT │                 │                 │
     │◄────────────────│                 │                 │
     │                 │                 │                 │
     │ GET /api/twins  │                 │                 │
     │ Authorization:  │                 │                 │
     │ Bearer <token>   │                 │                 │
     │────────────────►│                 │                 │
     │                 │                 │                 │
     │         Validate JWT│                 │                 │
     │         ───────►│                 │                 │
     │                 │                 │                 │
     │           Forward│with user context│                 │
     │           ─────────────────────────►                 │
     │                 │                 │                 │
     │           Return│twin data        │                 │
     │◄─────────────────────────────────│                 │
```

### Rate Limiting Tiers

| Tier | Limit | Use Case |
|------|-------|----------|
| Default | 100/min | General API access |
| Strict | 20/min | Write operations |
| Auth | 5/15min | Login attempts |

---

## Migration Guide

### From v1 to v2

1. **Update dependencies**
   ```bash
   npm install @rtmn/twinos-shared
   ```

2. **Add authentication**
   ```javascript
   import { requireAuth } from '@rtmn/twinos-shared';
   
   app.get('/api/resource', requireAuth, handler);
   ```

3. **Add validation**
   ```javascript
   import { preventPrototypePollution } from '@rtmn/twinos-shared';
   
   app.post('/api/resource', (req, res, next) => {
     req.body = preventPrototypePollution(req.body);
     next();
   });
   ```

4. **Update response format**
   ```javascript
   // Before
   res.json({ resource });
   
   // After
   res.json({ success: true, twin: resource });
   ```

---

## Quick Reference

### Service Ports

| Service | Port |
|---------|------|
| TwinOS Hub | 4705 |
| CorpID | 4702 |
| MemoryOS | 4703 |
| Customer Twin | 4895 |
| Order Twin | 4885 |
| Wallet Twin | 4896 |
| Employee Twin | 4730 |
| Voice Twin | 4876 |
| Asset Twin | 4890 |
| Product Twin | 4720 |

### Twin ID Naming Convention

```
{category}.{entity}

Examples:
- commerce.customer
- hospitality.guest
- healthcare.patient
- ai.memory
```

---

*Last Updated: June 18, 2026*  
*RTMN TwinOS Platform v2.0*
