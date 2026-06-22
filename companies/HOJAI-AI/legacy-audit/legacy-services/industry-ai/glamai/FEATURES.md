# GlamAI Features & Services

**Version:** 1.0
**Date:** June 14, 2026
**Status:** ✅ Implemented

---

## Core Services

### 1. BeautyMemoryService

**Purpose:** Stores and retrieves beauty-specific customer data

**Features:**
- Hair color formulas with brand, developer, processing time
- Stylist notes (treatment, preference, allergy, concern, general)
- Product reactions (loved, liked, neutral, disliked, allergic)
- Service details with products used
- At-home regimen recommendations
- Allergy and sensitivity tracking

**API Endpoints:**
- `GET /api/customers/:id/profile` - Get beauty profile
- `PUT /api/customers/:id/profile` - Update beauty profile
- `POST /api/memory/hair-color` - Record hair color formula
- `POST /api/memory/stylist-note` - Add stylist note
- `POST /api/memory/product-reaction` - Record product reaction
- `GET /api/memory/:id/history` - Get memory history

**Data Model:**
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

interface HairColorFormula {
  color: string
  brand: string
  developer: string
  processingTime: number
  notes: string
}

interface StylistNote {
  noteId: string
  content: string
  category: 'treatment' | 'preference' | 'allergy' | 'concern' | 'general'
  stylistId: string
  stylistName: string
  createdAt: Date
}

interface ProductReaction {
  productId: string
  productName: string
  reaction: 'loved' | 'liked' | 'neutral' | 'disliked' | 'allergic'
  notes: string
  date: Date
}
```

---

### 2. ServicePlanService

**Purpose:** AI-generated personalized service plans

**Features:**
- Overdue service detection (haircut >28 days, color >21 days)
- Seasonal recommendations (wedding, monsoon, festive)
- Beauty profile-based recommendations
- Hair color maintenance tracking
- Maintenance scheduling
- Upsell suggestions

**API Endpoints:**
- `POST /api/customers/:id/service-plan` - Generate service plan

**Service Catalog:**
- Haircut, Hair Color, Balayage, Keratin
- Hair Spa, Scalp Treatment, Deep Conditioning
- Facial, Manicure, Pedicure
- Bridal Makeup, Party Makeup

**Maintenance Schedules:**
| Service | Frequency |
|---------|-----------|
| Haircut | Every 4 weeks |
| Hair Color | Every 3 weeks |
| Balayage | Every 12 weeks |
| Keratin | Every 3 months |
| Hair Spa | Every 4 weeks |
| Facial | Every 4 weeks |

---

### 3. CustomerService

**Purpose:** Unified customer intelligence from all sources

**Combines:**
- Salon CRM data (visit history, tier, preferences)
- Beauty Memory (hair profile, reactions)
- Mind Salon AI (churn, LTV, insights)

**API Endpoints:**
- `GET /api/customers/:id/intelligence` - Full customer context
- `GET /api/customers/:id/recommendations` - Personalized recommendations

**Intelligence Output:**
```typescript
interface CustomerIntelligence {
  customerId: string
  name: string
  phone: string
  customerTier: 'new' | 'regular' | 'vip' | 'at-risk' | 'churned'
  beautyProfile: BeautyProfile
  visitStats: VisitStats
  currentColorFormula: HairColorFormula | null
  activeNotes: StylistNote[]
  churnRisk: 'high' | 'medium' | 'low'
  lifetimeValue: number
  engagementLevel: 'minimal' | 'standard' | 'high' | 'vip'
  overdueServices: string[]
}
```

---

### 4. StylistService

**Purpose:** Stylist-facing APIs for service delivery

**Features:**
- Customer context for styling
- Service completion recording
- Hair color recording
- Product reaction tracking
- Stylist notes
- Today's appointments with customer context

**API Endpoints:**
- `GET /api/stylists/:id/customers` - Get stylist's customers
- `GET /api/stylists/:id/today` - Today's appointments
- `GET /api/stylists/:id/customer/:cid` - Customer context
- `POST /api/stylists/note` - Add note during service
- `POST /api/stylists/service-complete` - Record completion
- `POST /api/stylists/color` - Record hair color
- `POST /api/stylists/product-reaction` - Record reaction

---

### 5. RecommendationService

**Purpose:** Unified recommendation engine

**Combines:**
- Overdue services analysis
- Seasonal recommendations
- Profile-based suggestions
- Product recommendations
- Retention actions

**Recommendation Types:**
- Service recommendations (priority, reason, estimated price)
- Product recommendations (based on recent service)
- Retention recommendations (churn risk, offers)

---

### 6. InventoryService

**Purpose:** Inventory intelligence

**Features:**
- Low stock alerts (critical, high, medium, low)
- Reorder recommendations
- Product recommendations based on beauty profile
- Usage tracking from services

**API Endpoints:**
- `GET /api/inventory/alerts` - Get inventory alerts
- `GET /api/inventory/reorder` - Reorder recommendations
- `POST /api/inventory/reorder` - Trigger reorder

**Product Categories:**
- Shampoo, Color, Tool, Treatment, Equipment, Accessory, Skincare

---

### 7. BeautyGenieService

**Purpose:** Beauty-specific Genie extension

**Features:**
- Beauty domain understanding
- Personalized advice based on profile
- Service recommendations
- Product recommendations
- Beauty reminders

**Knowledge Base:**
- Dry Hair, Oily Scalp, Hair Loss
- Colored Hair, Curly Hair
- Acne Skin, Dry Skin

**Seasonal Advice:**
- New Year Refresh (January)
- Summer Prep (May)
- Monsoon Care (June)
- Wedding Season (September)
- Festive Glow (October)

---

### 8. TrainingAcademyService

**Purpose:** Stylist certification and training

**Features:**
- Course enrollment and progress tracking
- Module completion with scoring
- Certification management
- Skill profiling
- Training recommendations

**Courses:**
| Course | Level | Duration | Certification |
|--------|-------|----------|--------------|
| Basic Hair Cutting | Beginner | 480 min | Basic Hair Cutting Certified |
| Advanced Hair Styling | Advanced | 960 min | Advanced Hair Stylist |
| Hair Color | Intermediate | 720 min | Certified Colorist |
| Skincare Specialist | Intermediate | 600 min | Skincare Specialist |
| Bridal Makeup | Advanced | 480 min | Bridal Makeup Artist |
| Nail Art & Manicure | Beginner | 360 min | Nail Technician |
| Salon Safety & Hygiene | Beginner | 120 min | Salon Safety Certified |

---

## Bridges

### SalonBridge

**Purpose:** Connect to REZ Salon Ecosystem

**Services Connected:**
- REZ Salon CRM (port 4012/4903)
- REZ Salon Booking (port 4201)
- REZ Salon POS (port 4902)
- REZ Salon Inventory (port 4906)

**Capabilities:**
- Customer lookup (by ID, phone)
- Appointment management
- Order processing
- Inventory tracking
- Service sync

### MindSalonBridge

**Purpose:** Connect to REZ Mind Salon AI

**Capabilities:**
- Service recommendations
- Dynamic pricing
- Churn prediction
- Demand forecasting
- Customer insights
- Hair profile analysis
- Color recommendations

### GenieBridge

**Purpose:** Connect to Genie services

**Services Connected:**
- Genie Memory (port 4703)
- Genie Briefing (port 4704)

**Capabilities:**
- Memory storage and retrieval
- Briefing generation
- Beauty-specific memories
- Follow-up reminders

### NexhaBridge

**Purpose:** Connect to Nexha B2B Network

**Capabilities:**
- Supplier management
- Purchase orders
- Supplier negotiation
- Location analysis
- Trade finance

### TwinBridge

**Purpose:** Connect to TwinOS Hub

**Capabilities:**
- Beauty Twin sync
- Hair Color Twin
- Stylist Twin
- Product Twin
- Graph queries
- Similar customer matching

### NotificationBridge

**Purpose:** Connect to RABTUL Notification & WhatsApp

**Capabilities:**
- Beauty follow-up reminders
- Appointment reminders
- Product recommendations
- Birthday offers
- Loyalty updates
- Stylist notifications
- Inventory alerts
- Bulk notifications

### SutarBridge

**Purpose:** Connect to SUTAR GoalOS

**Capabilities:**
- Expansion goals
- Location analysis
- Flow execution
- Agent coordination
- Progress tracking
- Simulation

### AssetMindBridge

**Purpose:** Connect to AssetMind

**Capabilities:**
- Wealth tracking
- Investment recommendations
- LTV predictions
- Revenue forecasting
- Business insights
- Tax planning

---

## Salon AI Agents

### Treatment Advisor (Port 4813)

**Location:** `salon-ai/employees/treatment-advisor/`

**Features:**
- Bundle suggestions
- Upsell recommendations
- Package deals
- Conversion probability scoring

**Packages:**
- Bride Prep Package
- Monsoon Hair Care
- Color Care Package
- Relaxation Package
- Quick Groom Package

### Inventory Alert Agent (Port 4814)

**Location:** `salon-ai/employees/inventory-alert-agent/`

**Features:**
- Low stock alerts with priority
- Reorder recommendations
- Usage forecasting
- Days until stockout prediction

---

## Stylist Tablet App

**Location:** `glamai-stylist-app/`

**Features:**
- Dashboard with today's appointments
- Customer view with beauty profile
- Service history and notes
- Add notes during service
- Record hair colors and product reactions
- Service recommendations

**Screens:**
- Dashboard (stats, schedule)
- Appointments (grouped by status)
- Customer View (beauty profile, notes, recommendations)
---

## Integration Connectors (6 Connectors) ✅ NEW!

**Location:** `src/connectors/`

| Connector | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Beauty Discovery** | beauty-discovery-connector.ts | 450 | DO App → Salon discovery |
| **Procurement** | salon-procurement-connector.ts | 350 | Nexha → Product order |
| **Wealth** | salon-wealth-connector.ts | 280 | AssetMind → Profit transfer |
| **Expansion** | salon-expansion-connector.ts | 320 | SUTAR → Multi-location |
| **Scheduler** | stylist-scheduler-connector.ts | 350 | Auto-booking |
| **Inventory** | salon-inventory-connector.ts | 320 | Stock alerts |

### Beauty Discovery Connector

```typescript
import { beautyDiscoveryConnector } from './src/connectors';

const result = await beautyDiscoveryConnector.discoverSalons({
  query: "Best salon for hair coloring nearby",
  userId: "customer-123",
  latitude: 12.97,
  longitude: 77.59
});
```

### Procurement Connector

```typescript
const result = await salonProcurementConnector.sendInventorySignal({
  salonId: "salon-1",
  item: { name: "Hair Color", currentStock: 5, reorderPoint: 20 },
  severity: "high"
});
```

### Wealth Connector

```typescript
const result = await salonWealthConnector.transferDailyProfits({
  salonId: "salon-1",
  profitData: { revenue: 50000, netProfit: 15000 }
});
```

### Expansion Connector

```typescript
const plan = await salonExpansionConnector.createExpansionPlan({
  salonId: "salon-1",
  targetLocations: 5,
  timeline: "12 months"
});
```

### Scheduler Connector

```typescript
const slot = await stylistSchedulerConnector.autoBook({
  salonId: "salon-1",
  customerId: "customer-123",
  serviceId: "haircut",
  date: "2026-06-20"
});
```

### Inventory Connector

```typescript
const report = await salonInventoryConnector.checkInventory("salon-1");
```

---

## Story Flow

```
9:00 AM  → Customer asks Genie → "Best salon nearby"
           ↓
           beautyDiscoveryConnector.discoverSalons()
           ↓
           GlamAI recommended (based on preferences)

10:00 AM → Products running low
           ↓
           salonInventoryConnector.checkInventory()
           ↓
           salonProcurementConnector.processAlerts() → Nexha
           ↓
           Auto-order triggered

6:00 PM  → End of day
           ↓
           salonWealthConnector.transferDailyProfits()
           ↓
           Profits → AssetMind

8:00 PM  → Owner wants to expand
           ↓
           salonExpansionConnector.createExpansionPlan()
           ↓
           New locations found via RisnaEstate
```

---

**Last Updated:** June 15, 2026
