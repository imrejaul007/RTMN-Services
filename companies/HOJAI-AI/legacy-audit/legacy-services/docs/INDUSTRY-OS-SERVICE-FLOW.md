# Industry OS - Service Connection Flow

**Version:** 1.0
**Date:** June 12, 2026

---

## How Services Connect in Industry OS

### Universal Flow (Applies to ALL 24 Industries)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER ACTION                                        │
│                     "Book a table at 7pm"                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 7: WORKSPACE                                       │
│              User chats with Copilot / Uses Dashboard                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 6: COPILOT + BOA                                 │
│         HotelOS Copilot → Intent Detection → Routes to Agent                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 5: AI AGENTS                                      │
│         Order Agent → Verifies availability → Checks resources              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 4: UNIFIED CONTEXT                                │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│    │ MemoryOS     │  │ Universal    │  │ REZ Identity│              │
│    │ (Context)    │  │ Twin Platform│  │ Hub          │              │
│    └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: VERTICAL APPS                                 │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│    │ REZ Merchant │  │ AdBazaar    │  │ CorpPerks   │              │
│    │ (Ops)        │  │ (CRM)        │  │ (HR)        │              │
│    └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: NETWORK SERVICES                               │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│    │ Nexha        │  │ AssetMind   │  │ BrandPulse  │              │
│    │ (Commerce)   │  │ (Finance)    │  │ (Intel)     │              │
│    └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: INFRASTRUCTURE                                │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│    │ HOJAI Core  │  │ RABTUL Core │  │ Event Bus   │              │
│    │ (4500-4590) │  │ (4001-4005)│  │ (4510)      │              │
│    └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL APIS                                      │
│         Payment Gateway │ Maps │ SMS Gateway │ WhatsApp                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RESPONSE                                           │
│                    "Table booked! See you at 7pm"                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## HotelOS - Complete Service Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOTEL GUEST                                     │
│                    WhatsApp / Website / App                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STAYBOT                                         │
│                         (Industry AI)                                       │
│         Guest Copilot │ Booking Agent │ Check-in Agent                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
┌───────────────────────────────┐    ┌───────────────────────────────────────┐
│       REZ MERCHANT           │    │           MEMORY + TWINS             │
│    (Hotel Operations)         │    │                                        │
│                               │    │  ┌─────────┐  ┌─────────┐          │
│  ┌─────────────────────────┐│    │  │ Guest   │  │ Hotel   │          │
│  │ REZ-hotel-admin-web     ││    │  │ Twin    │  │ Twin    │          │
│  │ (3001)                  ││    │  └─────────┘  └─────────┘          │
│  └─────────────────────────┘│    │                                        │
│                               │    │  ┌─────────┐  ┌─────────┐          │
│  Services:                   │    │  │ Room    │  │ Staff   │          │
│  • Room booking              │    │  │ Twin    │  │ Twin    │          │
│  • Check-in/out             │    │  └─────────┘  └─────────┘          │
│  • Housekeeping              │    │                                        │
│  • Billing                   │    │  MemoryOS ← Guest preferences stored │
│  • POS (restaurant)          │    │                                        │
└───────────────────────────────┘    └───────────────────────────────────────┘
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RABTUL SERVICES                                   │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Payment  │  │  Wallet  │  │   Auth   │  │   Notif  │              │
│  │ 4001     │  │  4004    │  │   4002   │  │   4005   │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                             │
│  • Room payment                                                            │
│  • Guest wallet                                                            │
│  • Staff payroll                                                           │
│  • Booking confirmations                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HOJAI CORE                                         │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Memory   │  │  Agents   │  │Workflows │  │ Comms    │              │
│  │ 4520     │  │  4550     │  │  4560    │  │  4570    │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                             │
│  • Guest conversation memory                                                │
│  • AI agent orchestration                                                   │
│  • Check-in workflow automation                                              │
│  • WhatsApp/SMS notifications                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NETWORK SERVICES                                     │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Nexha   │  │AssetMind │  │BrandPulse│  │ REZ Intel│              │
│  │Supplier  │  │Finance   │  │Competitor│  │ML Pred   │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                             │
│  • Hotel supplies procurement                                                │
│  • Revenue forecasting                                                      │
│  • Competitor pricing analysis                                              │
│  • Demand prediction                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## RestaurantOS - Complete Service Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RESTAURANT CUSTOMER                              │
│                    WhatsApp / App / Website / Walk-in                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WAITRON                                        │
│                         (Industry AI)                                       │
│         Order Agent │ Kitchen Agent │ Host Agent │ Delivery Agent          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
┌───────────────────────────────┐    ┌───────────────────────────────────────┐
│       REZ MERCHANT           │    │           MEMORY + TWINS             │
│   (Restaurant Operations)     │    │                                        │
│                               │    │  ┌─────────┐  ┌─────────┐          │
│  ┌─────────────────────────┐│    │  │Customer │  │Restaurant│          │
│  │ REZ-restaurant-admin   ││    │  │ Twin    │  │ Twin    │          │
│  │ (3000)                  ││    │  └─────────┘  └─────────┘          │
│  └─────────────────────────┘│    │                                        │
│                               │    │  ┌─────────┐  ┌─────────┐          │
│  Services:                   │    │  │ Menu    │  │ Staff   │          │
│  • POS (Order taking)        │    │  │ Twin    │  │ Twin    │          │
│  • KDS (Kitchen display)     │    │  └─────────┘  └─────────┘          │
│  • Table management           │    │                                        │
│  • Billing                    │    │  MemoryOS ← Order history stored     │
│  • Inventory                  │    │                                        │
└───────────────────────────────┘    └───────────────────────────────────────┘
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RABTUL SERVICES                                   │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Payment  │  │  Wallet  │  │   Auth   │  │   Notif  │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                             │
│  • Table billing                                                            │
│  • Customer wallet (loyalty)                                                │
│  • Staff authentication                                                      │
│  • Order confirmations                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NETWORK SERVICES                                     │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                              │
│  │  Nexha   │  │AssetMind │  │BrandPulse│                              │
│  │Food suppl│  │Margin    │  │Competitor│                              │
│  └──────────┘  └──────────┘  └──────────┘                              │
│                                                                             │
│  • Food supplier orders (auto-reorder)                                      │
│  • Food cost analysis                                                       │
│  • Competitor menu analysis                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADBAZAAR (Growth)                                   │
│                                                                             │
│  • Customer CRM                                                             │
│  • Loyalty program                                                          │
│  • Marketing campaigns                                                      │
│  • Review management                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## RetailOS - Complete Service Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RETAIL CUSTOMER                                 │
│                    WhatsApp / App / Website / POS / Walk-in                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RETAIL-AI                                        │
│                         (Industry AI)                                       │
│      Inventory AI │ Merchandising AI │ Customer AI │ Loyalty AI            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
┌───────────────────────────────┐    ┌───────────────────────────────────────┐
│       REZ MERCHANT           │    │           MEMORY + TWINS             │
│     (Retail Operations)       │    │                                        │
│                               │    │  ┌─────────┐  ┌─────────┐          │
│  ┌─────────────────────────┐│    │  │Customer │  │ Store   │          │
│  │ REZ-retail-admin-web   ││    │  │ Twin    │  │ Twin    │          │
│  │ (3003)                  ││    │  └─────────┘  └─────────┘          │
│  └─────────────────────────┘│    │                                        │
│                               │    │  ┌─────────┐  ┌─────────┐          │
│  Services:                   │    │  │Inventory│  │ Product │          │
│  • POS (Sales)               │    │  │ Twin    │  │ Twin    │          │
│  • Inventory management       │    │  └─────────┘  └─────────┘          │
│  • Multi-store sync           │    │                                        │
│  • Supplier orders            │    │  MemoryOS ← Purchase history stored  │
│  • Employee management        │    │                                        │
└───────────────────────────────┘    └───────────────────────────────────────┘
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RABTUL SERVICES                                   │
│                                                                             │
│  • Payment (for purchases)                                                  │
│  • Wallet (customer loyalty coins)                                          │
│  • Refunds and settlements                                                   │
│  • Staff payroll                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NETWORK SERVICES                                     │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                              │
│  │  Nexha   │  │AssetMind │  │BrandPulse│                              │
│  │Supplier  │  │Margin    │  │Competitor│                              │
│  │network   │  │analysis  │  │pricing   │                              │
│  └──────────┘  └──────────┘  └──────────┘                              │
│                                                                             │
│  • Supplier discovery and orders                                             │
│  • Profit margin analysis                                                    │
│  • Competitor pricing intelligence                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SalonOS - Complete Service Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SALON CUSTOMER                                 │
│                    WhatsApp / App / Walk-in                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SALON-AI                                        │
│                         (Industry AI)                                       │
│  Beauty Advisor │ Appointment Manager │ Campaign │ Retention │ Inventory │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SALON OPERATIONS                                    │
│                                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐              │
│  │ REZ-salon-admin-web     │  │       MEMORY + TWINS   │              │
│  │ (3004)                  │  │                         │              │
│  └─────────────────────────┘  │  ┌─────────┐  ┌───────┐│              │
│                               │  │Customer │  │ Staff ││              │
│  Services:                   │  │ Twin    │  │ Twin  ││              │
│  • Appointment booking       │  └─────────┘  └───────┘│              │
│  • Staff scheduling          │                         │              │
│  • Service catalog           │  ┌─────────┐  ┌───────┐│              │
│  • Product inventory         │  │ Service │  │Product││              │
│  • Customer profiles          │  │ Twin    │  │ Twin  ││              │
│  • Package management         │  └─────────┘  └───────┘│              │
└───────────────────────────────┘  MemoryOS ← Preferences│
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GROWTH (AdBazaar)                                  │
│                                                                             │
│  • Customer loyalty (points)                                                │
│  • Birthday campaigns                                                       │
│  • Win-back campaigns (inactive customers)                                  │
│  • Review requests                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FINANCE (RABTUL)                                    │
│                                                                             │
│  • Service payments                                                         │
│  • Staff payroll                                                            │
│  • Product purchases                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FitnessOS - Complete Service Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GYM MEMBER                                     │
│                    WhatsApp / App / Walk-in / Voice                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FITNESS-AI                                       │
│                         (Industry AI)                                       │
│  Membership Advisor │ Fitness Coach │ Nutrition │ Retention │ Class Sched │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FITNESS OPERATIONS                                  │
│                                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐              │
│  │ REZ-fitness-admin-web   │  │       MEMORY + TWINS   │              │
│  │ (3020)                  │  │                         │              │
│  └─────────────────────────┘  │  ┌─────────┐  ┌───────┐│              │
│                               │  │ Member  │  │ Trainer││              │
│  Services:                   │  │ Twin    │  │ Twin  ││              │
│  • Member check-in/out       │  └─────────┘  └───────┘│              │
│  • Class booking              │                         │              │
│  • Trainer management         │  ┌─────────┐  ┌───────┐│              │
│  • Membership plans          │  │ Fitness │  │Nutrition│              │
│  • Attendance tracking        │  │ Twin    │  │ Twin  ││              │
│  • Equipment tracking         │  └─────────┘  └───────┘│              │
└───────────────────────────────┘  MemoryOS ← Goals│
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GROWTH (AdBazaar)                                  │
│                                                                             │
│  • Member retention campaigns                                                │
│  • Upgrade offers (Basic → Premium)                                         │
│  • Referral program                                                          │
│  • Class reminders                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FINANCE (RABTUL)                                    │
│                                                                             │
│  • Membership payments                                                       │
│  • Class fees                                                               │
│  • Trainer payments                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What Each Industry Connects To

### Summary Table

| Industry | REZ Merchant | RABTUL | AdBazaar | CorpPerks | Nexha | AssetMind | BrandPulse | Memory |
|----------|-------------|---------|----------|-----------|-------|-----------|------------|--------|
| Hotel | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Restaurant | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Retail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Salon | ✅ | ✅ | ✅ | ✅ | - | ✅ | ✅ | ✅ |
| Fitness | ✅ | ✅ | ✅ | ✅ | - | ✅ | ✅ | ✅ |
| Spa | ✅ | ✅ | ✅ | ✅ | - | ✅ | ✅ | ✅ |
| Real Estate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HR | ✅ | ✅ | ✅ | ✅ | - | ✅ | - | ✅ |
| Manufacturing | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Logistics | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Grocery | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Education | ✅ | ✅ | ✅ | ✅ | - | ✅ | ✅ | ✅ |
| Pharmacy | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Travel | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Franchise | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Finance | ✅ | ✅ | ✅ | ✅ | - | ✅ | ✅ | ✅ |
| Society | ✅ | ✅ | ✅ | ✅ | - | ✅ | - | ✅ |
| Automotive | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| Events | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Laundry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Legal | ✅ | ✅ | - | ✅ | - | ✅ | - | ✅ |
| Healthcare | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| CRM | ✅ | ✅ | ✅ | - | - | ✅ | ✅ | ✅ |
| E-commerce | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:** ✅ = Connected | - = Not needed

---

## What Each Industry Gets

| Industry | L3: REZ Merchant | L5: AI Agents | L6: Copilot | L7: Workspace |
|----------|------------------|---------------|-------------|---------------|
| Hotel | 3001 | 4 agents | HotelOS Copilot | HotelOS Workspace |
| Restaurant | 3000 | 4 agents | RestaurantOS Copilot | RestaurantOS Workspace |
| Retail | 3003 | 4 agents | RetailOS Copilot | RetailOS Workspace |
| Salon | 3004 | 6 agents | SalonOS Copilot | SalonOS Workspace |
| Fitness | 3020 | 6 agents | FitnessOS Copilot | FitnessOS Workspace |
| Spa | 3015 | 2 agents | SpaOS Copilot | SpaOS Workspace |
| Real Estate | 3008 | 3 agents | RealEstateOS Copilot | RealEstateOS Workspace |
| HR | 3011 | 4 agents | HROS Copilot | HROS Workspace |
| Manufacturing | 3002 | 4 agents | ManufacturingOS Copilot | ManufacturingOS Workspace |
| Logistics | 3007 | 4 agents | LogisticsOS Copilot | LogisticsOS Workspace |
| Grocery | 3016 | 3 agents | GroceryOS Copilot | GroceryOS Workspace |
| Education | 3013 | 4 agents | EducationOS Copilot | EducationOS Workspace |
| Pharmacy | 3019 | 3 agents | PharmacyOS Copilot | PharmacyOS Workspace |
| Travel | 3006 | 4 agents | TravelOS Copilot | TravelOS Workspace |
| Franchise | 3021 | 4 agents | FranchiseOS Copilot | FranchiseOS Workspace |
| Finance | 3012 | 4 agents | FinanceOS Copilot | FinanceOS Workspace |
| Society | 3005 | 4 agents | SocietyOS Copilot | SocietyOS Workspace |
| Automotive | 3023 | 3 agents | AutoOS Copilot | AutoOS Workspace |
| Events | 3025 | 3 agents | EventsOS Copilot | EventsOS Workspace |
| Laundry | 3026 | 3 agents | LaundryOS Copilot | LaundryOS Workspace |
| Legal | new | 3 agents | LegalOS Copilot | LegalOS Workspace |
| Healthcare | new | 3 agents | ClinicOS Copilot | ClinicOS Workspace |
| CRM | new | 3 agents | CRMOS Copilot | CRMOS Workspace |
| E-commerce | new | 4 agents | CommerceOS Copilot | CommerceOS Workspace |

---

**Last Updated:** 2026-06-12
**RTNM Digital - Industry OS Service Flow**