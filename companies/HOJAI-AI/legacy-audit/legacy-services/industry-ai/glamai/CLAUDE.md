# GlamAI - Salon Intelligence OS

**The brain that makes the salon know you better than you know yourself.**

---

## Integration Connectors (8 Connectors) ✅ NEW!

| Connector | Purpose | File |
|----------|---------|------|
| **Beauty Discovery** | DO App → Salon discovery | `src/connectors/beauty-discovery-connector.ts` |
| **Procurement** | Nexha → Product order | `src/connectors/salon-procurement-connector.ts` |
| **Wealth** | AssetMind → Profit transfer | `src/connectors/salon-wealth-connector.ts` |
| **Expansion** | SUTAR → Multi-location | `src/connectors/salon-expansion-connector.ts` |
| **Scheduler** | Auto-booking | `src/connectors/stylist-scheduler-connector.ts` |
| **Inventory** | Stock alerts | `src/connectors/salon-inventory-connector.ts` |

### GlamAI Story Flow

```
9:00 AM - Customer asks Genie → "Best salon nearby"
         ↓
beautyDiscoveryConnector.discoverSalons()
         ↓
MTR recommended (based on preferences)

10:00 AM - Products running low
         ↓
salonInventoryConnector.checkInventory()
         ↓
salonProcurementConnector.processAlerts() → Nexha
         ↓
Auto-order triggered

6:00 PM - End of day
         ↓
salonWealthConnector.transferDailyProfits()
         ↓
Profits → AssetMind

8:00 PM - Owner wants to expand
         ↓
salonExpansionConnector.createExpansionPlan()
         ↓
New locations found via RisnaEstate
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GLAMAI (Port 3000)                              │
│                         Salon Intelligence OS                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SERVICES LAYER                                │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │   │
│  │  │   Beauty     │ │  Service     │ │  Stylist     │               │   │
│  │  │  MemoryOS    │ │    Plan      │ │  Service     │               │   │
│  │  │  Hair Color  │ │  Generator   │ │              │               │   │
│  │  │  Notes       │ │              │ │              │               │   │
│  │  │  Reactions   │ │              │ │              │               │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘               │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │   │
│  │  │  Customer    │ │Recommendation│ │ Inventory    │               │   │
│  │  │ Intelligence│ │   Service    │ │ Service     │               │   │
│  │  │             │ │              │ │              │               │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘               │   │
│  │  ┌──────────────┐ ┌──────────────┐                                  │   │
│  │  │   Beauty    │ │  Training    │                                  │   │
│  │  │   Genie    │ │  Academy     │                                  │   │
│  │  └──────────────┘ └──────────────┘                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        BRIDGES LAYER                                 │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐│   │
│  │  │   Salon     │ │  Mind Salon   │ │    Genie     │ │  Nexha   ││   │
│  │  │   Bridge    │ │    Bridge    │ │    Bridge    │ │  Bridge  ││   │
│  │  │  CRM/Booking│ │      AI      │ │  Memory     │ │Commerce  ││   │
│  │  │  POS/Inv   │ │  Churn/Prix  │ │  Briefing   │ │Supply    ││   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Services

### 1. BeautyMemoryService (Port 3000)
**Purpose:** Stores beauty-specific customer data

**Features:**
- Hair color formulas with brand, developer, processing time
- Stylist notes (treatment, preference, allergy, concern, general)
- Product reactions (loved, liked, neutral, disliked, allergic)
- Service history with products used
- At-home regimen recommendations
- Allergy and sensitivity tracking

**Stored Data:**
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

### 2. ServicePlanService (Port 3000)
**Purpose:** AI-generated personalized service plans

**Features:**
- Overdue service detection
- Seasonal recommendations (wedding, monsoon, festive)
- Beauty profile-based recommendations
- Hair color maintenance tracking
- Maintenance scheduling
- Upsell suggestions

### 3. CustomerService (Port 3000)
**Purpose:** Unified customer intelligence from all sources

**Combines:**
- Salon CRM data (visit history, tier, preferences)
- Beauty Memory (hair profile, reactions)
- Mind Salon AI (churn, LTV, insights)

### 4. StylistService (Port 3000)
**Purpose:** Stylist-facing APIs for service delivery

**Features:**
- Customer context for styling
- Service completion recording
- Hair color recording
- Product reaction tracking
- Stylist notes

### 5. RecommendationService (Port 3000)
**Purpose:** Unified recommendation engine

**Combines:**
- Overdue services analysis
- Seasonal recommendations
- Profile-based suggestions
- Product recommendations
- Retention actions

### 6. InventoryService (Port 3000)
**Purpose:** Inventory intelligence

**Features:**
- Low stock alerts
- Reorder recommendations
- Product recommendations based on beauty profile
- Usage tracking from services

### 7. BeautyGenieService (Port 3000)
**Purpose:** Beauty-specific Genie extension

**Features:**
- Beauty domain understanding
- Personalized advice based on profile
- Service recommendations
- Product recommendations
- Beauty reminders

### 8. TrainingAcademyService (Port 3000)
**Purpose:** Stylist certification and training

**Features:**
- Course enrollment
- Module progress tracking
- Certification management
- Skill profiling
- Training recommendations

## Bridges

### 1. SalonBridge
Connects to REZ Salon Ecosystem:
- `SALON_CRM_URL` (port 4012)
- `SALON_BOOKING_URL` (port 4201)
- `SALON_POS_URL` (port 4902)
- `SALON_INVENTORY_URL` (port 4906)

### 2. MindSalonBridge
Connects to REZ Mind Salon AI:
- Service recommendations
- Dynamic pricing
- Churn prediction
- Demand forecasting
- Customer insights
- Hair profile analysis
- Color recommendations

### 3. GenieBridge
Connects to Genie services:
- Memory storage
- Briefing generation
- Beauty-specific memories
- Follow-up reminders

### 4. NexhaBridge
Connects to Nexha B2B Network:
- Supplier management
- Purchase orders
- Supplier negotiation
- Location analysis
- Trade finance

## API Endpoints

### Customer Profile
- `GET /api/customers/:id/profile` - Get beauty profile
- `PUT /api/customers/:id/profile` - Update beauty profile

### Service Plan
- `POST /api/customers/:id/service-plan` - Generate service plan

### Beauty Memory
- `POST /api/memory/hair-color` - Record hair color
- `POST /api/memory/stylist-note` - Add stylist note
- `POST /api/memory/product-reaction` - Record reaction
- `GET /api/memory/:id/history` - Get memory history

### Stylist Operations
- `GET /api/stylists/:id/customers` - Get stylist's customers
- `GET /api/stylists/:id/today` - Today's appointments
- `GET /api/stylists/:id/customer/:cid` - Customer context
- `POST /api/stylists/note` - Add note during service
- `POST /api/stylists/service-complete` - Record completion
- `POST /api/stylists/color` - Record hair color
- `POST /api/stylists/product-reaction` - Record reaction

### Customer Intelligence
- `GET /api/customers/:id/intelligence` - Full intelligence
- `GET /api/customers/:id/recommendations` - Recommendations

### Inventory
- `GET /api/inventory/alerts` - Get alerts
- `GET /api/inventory/reorder` - Reorder recommendations
- `POST /api/inventory/reorder` - Trigger reorder

### Salon
- `GET /api/salon/:id/dashboard` - Salon dashboard
- `POST /api/session/checkin` - Customer check-in

### Training
- `GET /api/training/courses` - List courses
- `GET /api/training/courses/:id` - Course details
- `POST /api/training/enroll` - Enroll in course
- `GET /api/training/progress/:employeeId` - Employee progress
- `GET /api/training/skills/:employeeId` - Skill profile

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/glamai

# Redis
REDIS_URL=redis://localhost:6379

# REZ Salon Services
SALON_CRM_URL=http://localhost:4012
SALON_BOOKING_URL=http://localhost:4201
SALON_POS_URL=http://localhost:4902
SALON_INVENTORY_URL=http://localhost:4906

# REZ Mind Salon
MIND_SALON_URL=http://localhost:4010

# Genie
GENIE_MEMORY_URL=http://localhost:4703
GENIE_BRIEFING_URL=http://localhost:4704

# Nexha
NEXHA_URL=http://localhost:5000
```

## Related Services

### Salon AI Agents
- **Treatment Advisor** (Port 4813): Bundle suggestions, upsells
- **Inventory Alert Agent** (Port 4814): Stock alerts, forecasting

### Stylist Tablet App
- **glamai-stylist-app/**: React tablet app for stylists

## Running

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Start production
npm start
```

## Docker

```bash
docker-compose up
```
