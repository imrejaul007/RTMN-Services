# Industry OS Anatomy - What Goes Into Each Industry

**Version:** 1.0
**Date:** June 12, 2026

---

## THE LAYER MODEL

Each Industry OS is built from **7 unified layers**:

```
┌─────────────────────────────────────────────────────────────┐
│                    INDUSTRY OS                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 7: WORKSPACE (User Interface)                │   │
│  │  Dashboard / Copilot Chat / BOA Insights / Tasks    │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 6: COPILOT + BOA (AI Orchestration)          │   │
│  │  Industry Copilot + Business Operating Agent        │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 5: AI AGENTS (Task Execution)               │   │
│  │  Industry-specific AI employees                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 4: UNIFIED CONTEXT (Memory + Twins)          │   │
│  │  MemoryOS + Universal Twin Platform                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 3: VERTICAL APPS (Operations)               │   │
│  │  REZ Merchant + AdBazaar + CorpPerks + RABTUL      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 2: NETWORK SERVICES (Shared)                │   │
│  │  Nexha + AssetMind + SkillNet + BrandPulse          │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 1: INFRASTRUCTURE (Foundation)               │   │
│  │  HOJAI Core + RABTUL Core + MemoryOS + TwinOS      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## LAYER 1: INFRASTRUCTURE (Foundation)

**Used by ALL industries - shared foundation**

| Service | Company | Purpose |
|---------|---------|---------|
| API Gateway | HOJAI Core (4500) | Routing, auth |
| Governance | HOJAI Core (4501) | RBAC, permissions |
| Event Bus | HOJAI Core (4510) | Pub/sub |
| Memory | HOJAI Core (4520) | Vector store |
| Intelligence | HOJAI Core (4530) | ML predictions |
| Agents | HOJAI Core (4550) | Agent orchestration |
| Workflows | HOJAI Core (4560) | Automation |
| Communications | HOJAI Core (4570) | WhatsApp, SMS |
| Hyperlocal | HOJAI Core (4580) | Geo intelligence |
| Data | HOJAI Core (4590) | Feature store |
| Auth | RABTUL (4002) | User authentication |
| Payment | RABTUL (4001) | Transactions |
| Wallet | RABTUL (4004) | Balances |
| Notification | RABTUL (4005) | Push, SMS, Email |

---

## LAYER 2: NETWORK SERVICES (Shared)

**Used by ALL industries - network effects**

| Service | Company | Purpose |
|---------|---------|---------|
| Nexha | Nexha | Commerce network (suppliers, distribution) |
| AssetMind | AssetMind | Financial intelligence |
| SkillNet | HOJAI | AI skill marketplace |
| BrandPulse | HOJAI | Brand intelligence |
| REZ Intelligence | REZ | ML predictions, recommendations |
| REZ Identity Hub | RTNM | Unified identity (25 sources) |

---

## LAYER 3: VERTICAL APPS (Operations)

**Specific to each industry**

| App | Industry | Purpose |
|-----|----------|---------|
| REZ-hotel-admin-web | Hotel | Hotel operations |
| REZ-restaurant-admin-web | Restaurant | Restaurant operations |
| REZ-retail-admin-web | Retail | Retail operations |
| REZ-salon-admin-web | Salon | Salon operations |
| ... | ... | ... |

**Components within each vertical app:**

| Component | Service | Purpose |
|-----------|---------|---------|
| Operations | REZ Merchant | Core business operations |
| CRM | AdBazaar | Customer management |
| Workforce | CorpPerks | Employee management |
| Finance | RABTUL | Payments, accounting |
| Commerce | Nexha | Suppliers, procurement |

---

## LAYER 4: UNIFIED CONTEXT (Memory + Twins)

**Shared across ALL industries**

| Service | Purpose | Shared? |
|---------|---------|---------|
| MemoryOS (4520) | Store memories | ✅ Yes - unified |
| Universal Twin Platform | Person + Business + Asset twins | ✅ Yes - unified |
| REZ Identity Hub (6000) | Unified identity | ✅ Yes - unified |

---

## LAYER 5: AI AGENTS (Industry-Specific)

**Different agents for each industry**

| Industry | Agents |
|----------|--------|
| Hotel | Front Desk, Housekeeping, Revenue Manager, Guest Experience |
| Restaurant | Order, Kitchen, Host, Delivery |
| Retail | Inventory, Merchandising, Customer, Loyalty |
| Salon | Beauty Advisor, Appointment Manager, Campaign Manager, Retention |
| Fitness | Membership Advisor, Fitness Coach, Nutrition Advisor, Retention |
| ... | ... |

---

## LAYER 6: COPILOT + BOA (Orchestration)

**Unified AI interface**

| Component | Purpose |
|-----------|---------|
| Industry Copilot | Natural language queries for specific industry |
| BOA | Business Operating Agent (CEO+CFO+COO reasoning) |

---

## LAYER 7: WORKSPACE (User Interface)

**Single interface for business owners**

| Component | Purpose |
|-----------|---------|
| BOA Insights | Today's priorities |
| AI Agent Panel | View all active agents |
| Task Panel | AI-recommended actions |
| Copilot Chat | Ask anything |

---

# EXAMPLE: HotelOS Anatomy

## What HotelOS Gets

```
HotelOS
│
├── LAYER 1: INFRASTRUCTURE
│   ├── HOJAI Core (4500-4590)
│   ├── RABTUL Core (4001-4005)
│   └── MemoryOS (4520)
│
├── LAYER 2: NETWORK SERVICES
│   ├── Nexha (suppliers, vendors)
│   ├── AssetMind (hotel financial intel)
│   ├── BrandPulse (competitor intel)
│   └── REZ Intelligence
│
├── LAYER 3: VERTICAL APPS
│   ├── REZ-hotel-admin-web (3001)
│   │   ├── Operations (REZ Merchant)
│   │   ├── CRM (AdBazaar)
│   │   ├── Workforce (CorpPerks)
│   │   └── Finance (RABTUL)
│   └── Booking System
│
├── LAYER 4: UNIFIED CONTEXT
│   ├── MemoryOS ← shared with ALL industries
│   ├── Universal Twin Platform
│   │   ├── Guest Twin ← Hotel-specific
│   │   ├── Hotel Twin ← Hotel-specific
│   │   ├── Room Twin ← Hotel-specific
│   │   └── Staff Twin ← Hotel-specific
│   └── REZ Identity Hub
│
├── LAYER 5: AI AGENTS
│   ├── Front Desk Agent
│   ├── Housekeeping Agent
│   ├── Revenue Manager
│   └── Guest Experience Agent
│
├── LAYER 6: COPILOT + BOA
│   ├── HotelOS Copilot
│   └── Hotel BOA
│
└── LAYER 7: WORKSPACE
    ├── BOA Insights
    ├── AI Agent Panel
    ├── Task Panel
    └── Copilot Chat
```

## How Services Connect in HotelOS

```
Guest books room
        ↓
REZ Merchant (booking) → RABTUL (payment)
        ↓                      ↓
MemoryOS ← stores booking memory
        ↓
Universal Twin Platform → Guest Twin updated
        ↓
HotelOS Copilot → "New booking! Notify housekeeping"
        ↓
Housekeeping Agent → schedules cleaning
        ↓
Room Twin updated
        ↓
Revenue Manager → updates forecast
        ↓
BOA → "Occupancy up 5%. Revenue forecast updated."
```

---

# EXAMPLE: RestaurantOS Anatomy

```
RestaurantOS
│
├── LAYER 1: INFRASTRUCTURE
│   ├── HOJAI Core
│   ├── RABTUL Core
│   └── MemoryOS
│
├── LAYER 2: NETWORK SERVICES
│   ├── Nexha (suppliers, food vendors)
│   ├── AssetMind (financial intel)
│   └── REZ Intelligence
│
├── LAYER 3: VERTICAL APPS
│   ├── REZ-restaurant-admin-web (3000)
│   │   ├── POS (REZ Merchant)
│   │   ├── Kitchen Display (KDS)
│   │   ├── CRM (AdBazaar)
│   │   ├── Workforce (CorpPerks)
│   │   └── Finance (RABTUL)
│   └── Delivery Integration
│
├── LAYER 4: UNIFIED CONTEXT
│   ├── MemoryOS
│   ├── Universal Twin Platform
│   │   ├── Customer Twin ← Restaurant-specific
│   │   ├── Restaurant Twin ← Restaurant-specific
│   │   ├── Menu Twin ← Restaurant-specific
│   │   └── Staff Twin ← Restaurant-specific
│   └── REZ Identity Hub
│
├── LAYER 5: AI AGENTS
│   ├── Order Agent (takes orders)
│   ├── Kitchen Agent (coordinates kitchen)
│   ├── Host Agent (manages waitlist)
│   └── Delivery Agent (coordinates delivery)
│
├── LAYER 6: COPILOT + BOA
│   ├── RestaurantOS Copilot
│   └── Restaurant BOA
│
└── LAYER 7: WORKSPACE
    ├── BOA Insights
    ├── AI Agent Panel
    ├── Task Panel
    └── Copilot Chat
```

## How Services Connect in RestaurantOS

```
Customer places order via WhatsApp
        ↓
RestaurantOS Copilot → understands intent
        ↓
Order Agent → creates order
        ↓
REZ Merchant (POS) → processes order
        ↓
RABTUL (payment) → handles payment
        ↓
Kitchen Agent → sends to KDS
        ↓
Inventory Twin → checks stock
        ↓
If low stock → Nexha (supplier) → auto-order
        ↓
MemoryOS → stores order memory
        ↓
Customer Twin → updated with preferences
        ↓
BOA → "Food cost up 3%. Consider menu adjustment."
```

---

# EXAMPLE: RetailOS Anatomy

```
RetailOS
│
├── LAYER 1: INFRASTRUCTURE
│   ├── HOJAI Core
│   ├── RABTUL Core
│   └── MemoryOS
│
├── LAYER 2: NETWORK SERVICES
│   ├── Nexha (suppliers, distributors)
│   ├── AssetMind (margin intel)
│   └── REZ Intelligence
│
├── LAYER 3: VERTICAL APPS
│   ├── REZ-retail-admin-web (3003)
│   │   ├── POS (REZ Merchant)
│   │   ├── Inventory (REZ Merchant)
│   │   ├── CRM (AdBazaar)
│   │   ├── Workforce (CorpPerks)
│   │   └── Finance (RABTUL)
│   └── E-commerce Integration
│
├── LAYER 4: UNIFIED CONTEXT
│   ├── MemoryOS
│   ├── Universal Twin Platform
│   │   ├── Customer Twin ← Retail-specific
│   │   ├── Store Twin ← Retail-specific
│   │   ├── Inventory Twin ← Retail-specific
│   │   └── Product Twin ← Retail-specific
│   └── REZ Identity Hub
│
├── LAYER 5: AI AGENTS
│   ├── Inventory AI (stock optimization)
│   ├── Merchandising AI (planogram)
│   ├── Customer AI (personalization)
│   └── Loyalty AI (retention)
│
├── LAYER 6: COPILOT + BOA
│   ├── RetailOS Copilot
│   └── Retail BOA
│
└── LAYER 7: WORKSPACE
    ├── BOA Insights
    ├── AI Agent Panel
    ├── Task Panel
    └── Copilot Chat
```

---

# ALL 24 INDUSTRIES - What They Get

## The Formula

```
IndustryOS = L1 (Infrastructure) + L2 (Network) + L3 (Vertical Apps) + L4 (Context) + L5 (Agents) + L6 (Copilot+BOA) + L7 (Workspace)
```

## What Each Industry Gets

| # | Industry | L3 Vertical App | L5 Agents | L6 Copilot | L7 Workspace |
|---|----------|---------------|-----------|------------|--------------|
| 1 | Hotel | REZ-hotel-admin-web | Front Desk, Housekeeping, Revenue, Guest | HotelOS Copilot | HotelOS Workspace |
| 2 | Restaurant | REZ-restaurant-admin-web | Order, Kitchen, Host, Delivery | RestaurantOS Copilot | RestaurantOS Workspace |
| 3 | Retail | REZ-retail-admin-web | Inventory, Merchandising, Customer, Loyalty | RetailOS Copilot | RetailOS Workspace |
| 4 | Salon | REZ-salon-admin-web | Beauty Advisor, Appointment, Campaign, Retention | SalonOS Copilot | SalonOS Workspace |
| 5 | Fitness | REZ-fitness-admin-web | Membership, Coach, Nutrition, Retention | FitnessOS Copilot | FitnessOS Workspace |
| 6 | Spa | REZ-spa-admin-web | Treatment Advisor, Inventory | SpaOS Copilot | SpaOS Workspace |
| 7 | Real Estate | REZ-real-estate-admin-web | Lead Qualifier, Property Advisor, Site Visit | RealEstateOS Copilot | RealEstateOS Workspace |
| 8 | HR | REZ-hr-admin-web | Recruiter, Interview, Helpdesk, Payroll | HROS Copilot | HROS Workspace |
| 9 | Manufacturing | REZ-manufacturing-admin-web | Production, Procurement, Quality, Maintenance | ManufacturingOS Copilot | ManufacturingOS Workspace |
| 10 | Logistics | REZ-fleet-admin-web | Dispatch, Route, Fleet, Driver | LogisticsOS Copilot | LogisticsOS Workspace |
| 11 | Grocery | REZ-grocery-admin-web | Inventory, Reorder, Expiry | GroceryOS Copilot | GroceryOS Workspace |
| 12 | Education | REZ-education-admin-web | Tutor, Admission, Placement, Grader | EducationOS Copilot | EducationOS Workspace |
| 13 | Pharmacy | REZ-pharmacy-admin-web | Inventory, Compliance, Advisor | PharmacyOS Copilot | PharmacyOS Workspace |
| 14 | Travel | REZ-travel-admin-web | Planner, Concierge, Visa, Airport | TravelOS Copilot | TravelOS Workspace |
| 15 | Franchise | REZ-franchise-admin-web | Growth, Compliance, Territory, Royalty | FranchiseOS Copilot | FranchiseOS Workspace |
| 16 | Finance | REZ-accounting-admin-web | Accountant, CFO, Invoice, Tax | FinanceOS Copilot | FinanceOS Workspace |
| 17 | Automotive | REZ-auto-admin-web | Service, Parts, Sales | AutoOS Copilot | AutoOS Workspace |
| 18 | Events | REZ-events-admin-web | Event Planner, Ticket, Catering | EventsOS Copilot | EventsOS Workspace |
| 19 | Laundry | REZ-laundry-admin-web | Pickup, Wash, Delivery | LaundryOS Copilot | LaundryOS Workspace |
| 20 | Society | REZ-society-admin-web | Society Manager, Visitor, Complaint, Event | SocietyOS Copilot | SocietyOS Workspace |
| 21 | Legal | (new) | Case Manager, Document, Compliance | LegalOS Copilot | LegalOS Workspace |
| 22 | Healthcare | (new) | Doctor Assistant, Receptionist, Care Coordinator | ClinicOS Copilot | ClinicOS Workspace |
| 23 | CRM | (new) | Lead, Sales, Support | CRMOS Copilot | CRMOS Workspace |
| 24 | E-commerce | (new) | Catalog, Cart, Order, Fulfillment | CommerceOS Copilot | CommerceOS Workspace |

---

## What ALL Industries Share

| Layer | Service | Shared? |
|-------|---------|---------|
| L1 | HOJAI Core | ✅ Yes |
| L1 | RABTUL Core | ✅ Yes |
| L1 | MemoryOS | ✅ Yes |
| L2 | Nexha | ✅ Yes |
| L2 | AssetMind | ✅ Yes |
| L2 | BrandPulse | ✅ Yes |
| L4 | Universal Twin Platform | ✅ Yes |
| L4 | REZ Identity Hub | ✅ Yes |
| L6 | BOA (CEO+CFO+COO modules) | ✅ Yes |

## What Each Industry Customizes

| Layer | What Changes |
|-------|-------------|
| L3 | Vertical App (21 already exist) |
| L5 | AI Agents (different per industry) |
| L6 | Industry Copilot (trained on industry data) |
| L7 | Workspace (same structure, different data) |

---

## The Connection Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALL 24 INDUSTRY OS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              SHARED INFRASTRUCTURE                       │   │
│  │  HOJAI Core │ RABTUL Core │ MemoryOS │ TwinOS        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              NETWORK SERVICES                            │   │
│  │  Nexha │ AssetMind │ BrandPulse │ REZ Intelligence    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              UNIFIED CONTEXT                             │   │
│  │  Memory │ Twins │ Identity │ Intelligence              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ HotelOS │ │ RestOS  │ │ RetailOS│ │ SalonOS │  ...     │
│  │ L3-L7   │ │ L3-L7   │ │ L3-L7   │ │ L3-L7   │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Business Owner Sees

```
┌─────────────────────────────────────────────────────────────────┐
│  HotelOS Workspace                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [BOA Insights]                                                │
│  "Good morning! 3 new bookings, 2 checkout today."           │
│  "Revenue up 8% vs last week. Food cost down 2%."             │
│                                                                 │
│  [AI Agent Panel]                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Revenue  │ │ House-   │ │ Guest    │ │ Front    │      │
│  │ Manager   │ │ keeping  │ │ Experience│ │ Desk     │      │
│  │ [Active] │ │ [Active] │ │ [Active] │ │ [Active] │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                                 │
│  [Task Panel]                                                  │
│  [ ] Approve 10% discount for VIP guest                       │
│  [ ] Launch weekend package campaign (draft ready)             │
│  [ ] Schedule deep cleaning for Room 305                       │
│                                                                 │
│  [Copilot Chat]                                                │
│  "Why did revenue drop this week?"                             │
│  "Schedule a staff meeting to discuss breakfast complaints"     │
│  "Should I add a new room type?"                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Last Updated:** 2026-06-12
**RTNM Digital - Industry OS Anatomy**