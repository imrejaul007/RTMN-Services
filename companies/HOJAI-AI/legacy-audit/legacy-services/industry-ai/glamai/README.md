# GlamAI - Salon Intelligence OS

**Status:** ✅ Implemented
**Category:** Commerce / Beauty
**Type:** Industry AI Vertical
**Port:** 3000
**Tagline:** "The brain that makes the salon know you better than you know yourself."

---

## Overview

GlamAI is the unified AI orchestration layer for salon operations that connects:
- **Beauty Memory** - Hair color formulas, stylist notes, product reactions
- **REZ Mind Salon AI** - Recommendations, pricing, churn prediction
- **REZ Salon Ecosystem** - CRM, Booking, POS, Inventory
- **Genie services** - Personal AI memory and briefings
- **Nexha** - Supplier/procurement network
- **TwinOS Hub** - Digital twin graph relationships
- **SUTAR** - Goal orchestration for expansion
- **AssetMind** - Wealth analytics and forecasting

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GLAMAI (Port 3000)                              │
│                         Salon Intelligence OS                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SERVICES LAYER                                │   │
│  │  BeautyMemory │ ServicePlan │ Stylist │ Customer │ Inventory        │   │
│  │  Recommendation │ BeautyGenie │ TrainingAcademy                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        BRIDGES LAYER                                 │   │
│  │  SalonBridge │ MindSalonBridge │ GenieBridge │ NexhaBridge         │   │
│  │  TwinBridge │ NotificationBridge │ SutarBridge │ AssetMindBridge   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Services Built

| Service | Purpose |
|---------|---------|
| **BeautyMemoryService** | Beauty-specific memory (hair color, notes, reactions) |
| **ServicePlanService** | AI service plan generation |
| **CustomerService** | Unified customer intelligence |
| **StylistService** | Stylist-facing APIs |
| **InventoryService** | Inventory intelligence |
| **RecommendationService** | Personalized recommendations |
| **BeautyGenieService** | Beauty-specific Genie |
| **TrainingAcademyService** | Stylist certification |

---

## Bridges

| Bridge | Connects To | Purpose |
|--------|-------------|---------|
| **SalonBridge** | REZ Salon CRM (4903), Booking (4201), POS (4902), Inventory | Data sync |
| **MindSalonBridge** | REZ Mind Salon AI (4010) | AI recommendations |
| **GenieBridge** | Genie Memory (4703), Genie Briefing (4704) | Personal AI |
| **NexhaBridge** | Nexha (5000) | Supplier/procurement |
| **TwinBridge** | TwinOS Hub (4142), CorpID (4702) | Digital twins |
| **NotificationBridge** | RABTUL Notification, WhatsApp | Follow-ups |
| **SutarBridge** | SUTAR GoalOS (4242) | Expansion goals |
| **AssetMindBridge** | AssetMind (5001) | Wealth analytics |

---

## Beauty Memory Schema

```typescript
interface BeautyMemory {
  hairType: 'straight' | 'wavy' | 'curly' | 'coily'
  hairTexture: 'fine' | 'medium' | 'coarse'
  scalpCondition: 'normal' | 'oily' | 'dry' | 'sensitive'
  skinType: 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal'
  hairColorHistory: HairColorFormula[]
  currentColorFormula: HairColorFormula
  stylistNotes: StylistNote[]
  productReactions: ProductReaction[]
  allergies: string[]
}
```

---

## API Endpoints

### Customer Profile
- `GET /api/customers/:id/profile` - Get beauty profile
- `PUT /api/customers/:id/profile` - Update beauty profile

### Service Plan
- `POST /api/customers/:id/service-plan` - Generate service plan

### Beauty Memory
- `POST /api/memory/hair-color` - Record hair color formula
- `POST /api/memory/stylist-note` - Add stylist note
- `POST /api/memory/product-reaction` - Record product reaction
- `GET /api/memory/:id/history` - Get memory history

### Stylist Operations
- `GET /api/stylists/:id/customers` - Get stylist's customers
- `GET /api/stylists/:id/today` - Today's appointments
- `GET /api/stylists/:id/customer/:cid` - Customer context
- `POST /api/stylists/note` - Add note during service
- `POST /api/stylists/service-complete` - Record service completion
- `POST /api/stylists/color` - Record hair color
- `POST /api/stylists/product-reaction` - Record reaction

### Customer Intelligence
- `GET /api/customers/:id/intelligence` - Full customer context
- `GET /api/customers/:id/recommendations` - Personalized recommendations

### Inventory
- `GET /api/inventory/alerts` - Get inventory alerts
- `GET /api/inventory/reorder` - Reorder recommendations
- `POST /api/inventory/reorder` - Trigger reorder

### Salon
- `GET /api/salon/:id/dashboard` - Salon dashboard
- `POST /api/session/checkin` - Customer check-in

---

## Related Services

### REZ Salon Bridge (Port 4905)
**Location:** `REZ-Merchant/industry-os/salon-os/integrations/glamai-bridge/`

Bridges REZ Salon ecosystem to GlamAI:
- Appointment sync
- Customer profile sync
- QR check-in sync
- Inventory alerts
- Hair color sync
- Stylist notes
- Beauty follow-ups

### Salon AI Agents

| Agent | Port | Purpose |
|-------|------|---------|
| **Treatment Advisor** | 4813 | Bundle suggestions, upsells |
| **Inventory Alert Agent** | 4814 | Stock alerts, forecasting |
| Beauty Advisor | 4810 | Service recommendations |
| Appointment Manager | 4810 | Booking automation |
| Campaign Manager | 4810 | Marketing, loyalty |
| Retention Manager | 4810 | Churn prediction |

---

## Integration Flow

### Story Moments Connected

| Time | Story | Integration |
|------|-------|-------------|
| 7:00 AM | Beauty Twin predictions | TwinBridge → TwinOS Hub |
| 8:00 AM | Genie briefing | GenieBridge → Genie Memory |
| 10:00 AM | Sarah books | SalonBridge → Booking |
| 11:00 AM | QR check-in | REZ Salon Bridge → GlamAI |
| 11:05 AM | Stylist sees profile | SalonBridge → GlamAI |
| 11:15 AM | AI service plan | MindSalonBridge → REZ Mind Salon |
| 12:00 PM | Inventory alert | InventoryBridge → Nexha |
| 3:00 PM | Memory stores color | BeautyMemoryService → GenieBridge |
| 4:00 PM | Genie follows up | NotificationBridge → WhatsApp |
| 6:00 PM | Expansion | SutarBridge → SUTAR GoalOS |
| 8:00 PM | Wealth tracking | AssetMindBridge → AssetMind |

---

## Environment Variables

```env
# Server
PORT=3000
MONGODB_URI=mongodb://localhost:27017/glamai
REDIS_URL=redis://localhost:6379

# REZ Salon Services
SALON_CRM_URL=http://localhost:4903
SALON_BOOKING_URL=http://localhost:4201
SALON_POS_URL=http://localhost:4902
SALON_INVENTORY_URL=http://localhost:4906

# REZ Mind Salon
MIND_SALON_URL=http://localhost:4010

# Genie
GENIE_MEMORY_URL=http://localhost:4703
GENIE_BRIEFING_URL=http://localhost:4704

# TwinOS
TWINOS_URL=http://localhost:4142
CORPID_URL=http://localhost:4702

# Nexha
NEXHA_URL=http://localhost:5000

# SUTAR
GOAL_OS_URL=http://localhost:4242
FLOW_OS_URL=http://localhost:4244
SIMULATION_URL=http://localhost:4241

# AssetMind
ASSETMIND_URL=http://localhost:5001

# Notifications
NOTIFICATION_URL=http://localhost:4005
WHATSAPP_URL=http://localhost:4006
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
```

---

## Running All Services

```bash
# 1. Start REZ Salon Services
cd REZ-Merchant/industry-os/salon-os/integrations/glamai-bridge
npm install && npm run dev  # Port 4905

# 2. Start GlamAI
cd glamai && npm run dev  # Port 3000

# 3. Start Treatment Advisor
cd salon-ai/employees/treatment-advisor && npm start  # Port 4813

# 4. Start Inventory Alert Agent
cd salon-ai/employees/inventory-alert-agent && npm start  # Port 4814
```

---

## Docker

```bash
docker-compose up
```

---

**Last Updated:** 2026-06-14
