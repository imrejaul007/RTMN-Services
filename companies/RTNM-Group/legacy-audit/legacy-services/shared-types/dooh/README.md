# @rez/dooh-shared

**Canonical DOOH (Digital Out of Home) Type Definitions**

> **"Turn every screen into a smart advertising channel."**

This is the single source of truth for all DOOH-related types, validation schemas, and utilities used across the ReZ platform.

---

## Installation

```bash
npm install @rez/dooh-shared
```

## Usage

```typescript
import {
  // Types
  Screen,
  DOOHCampaign,
  ScreenFilter,
  DeliveryRequest,

  // Schemas (for validation)
  ScreenRegistrationSchema,
  ScreenHeartbeatSchema,
  DeliveryRequestSchema,

  // State machines
  isValidScreenStatusTransition,
  assertValidCampaignStatusTransition,

  // Money utilities
  money,
  calculateCPMCost,
  formatMoney,
} from '@rez/dooh-shared';
```

---

## Package Structure

```
dooh/
├── src/
│   ├── types.ts          # All type definitions (CANONICAL)
│   ├── schemas.ts        # Zod validation schemas
│   ├── state-machines.ts # Status transition validation
│   ├── money.ts          # Financial calculations
│   ├── index.ts          # Package exports
│   └── services/         # Core services
├── package.json
└── README.md
```

---

## Ecosystem Overview

```
ReZ Mind (Context Signals)
        ↓
AdOS (Decision Engine)
        ↓
DOOH Services
        ↓
┌─────────────────────────────────────────┐
│           Screen Network                │
│  ├── Cab Tablets                       │
│  ├── Restaurant TVs                   │
│  ├── Mall Kiosks                      │
│  ├── Gym Screens                      │
│  ├── Airport Displays                 │
│  └── Digital Billboards               │
└─────────────────────────────────────────┘
        ↓
User Interaction (QR / Visit)
        ↓
Attribution → AdOS
```

---

## Type Categories

### Screen Types

| Type | Description |
|------|-------------|
| `ScreenType` | 25+ screen types (cab, bus, flight, airport, hotel, etc.) |
| `ScreenStatus` | active, inactive, offline, maintenance |
| `ScreenNetworkType` | '1:1' (personalized) or 'mass' (broadcast) |
| `Screen` | Full screen entity with location, hardware, earnings |
| `ScreenRegistration` | Registration request payload |
| `ScreenHeartbeat` | Screen health ping with playlist version |
| `ScreenHealth` | Health status with uptime, connection quality |

### Campaign Types

| Type | Description |
|------|-------------|
| `DOOHCampaign` | Full campaign entity |
| `Creative` | Ad creative (image, video, html5, interactive, audio) |
| `DOOHTargeting` | Targeting configuration (location, audience, time) |
| `CampaignMetrics` | Performance metrics (impressions, scans, visits) |

### Playlist Types

| Type | Description |
|------|-------------|
| `Playlist` | Screen playlist with version |
| `PlaylistSlot` | Individual slot with timing |
| `PlaylistRequest` | Generation request |

### Delivery Types

| Type | Description |
|------|-------------|
| `DeliveryRequest` | Ad delivery request with context |
| `DeliveryContext` | Context for ad decision (time, weather, audience) |
| `DeliveryResponse` | Delivery result with ranked slots |

### Revenue Types

| Type | Description |
|------|-------------|
| `Money` | Amount in smallest unit + currency (no floating point) |
| `RevenueModel` | CPM, slot, performance, or hybrid |
| `RevenueShare` | Owner/platform/provider split |
| `PayoutRecord` | Payout tracking |

---

## Screen Types

| Type | Location | Audience | Best For |
|------|----------|----------|----------|
| `cab_tablet` | Cabs | Office workers | Fintech, Food |
| `restaurant_tv` | Restaurants | Foodies | Food, Delivery |
| `mall_kiosk` | Malls | Shoppers | Retail, Fashion |
| `gym_screen` | Gyms | Fitness enthusiasts | Health, Supplements |
| `salon_display` | Salons | Premium users | Beauty, Wellness |
| `hotel_lobby` | Hotels | Travelers | Travel, Tourism |
| `hotel_room` | Hotel rooms | Guests | Hospitality |
| `airport_display` | Airports | Business travelers | Premium brands |
| `airport_gate` | Airport gates | Travelers | Travel services |
| `office_lobby` | Offices | Office workers | B2B, Services |
| `bus_shelter` | Street | Commuters | Local businesses |
| `billboard_digital` | Outdoor | General | Brand awareness |

---

## Validation Schemas

All schemas are built with [Zod](https://zod.dev) for runtime validation:

```typescript
import { ScreenRegistrationSchema, DeliveryRequestSchema } from '@rez/dooh-shared';

// Validate incoming request
const result = ScreenRegistrationSchema.safeParse(requestBody);
if (!result.success) {
  return res.status(400).json({
    success: false,
    error: 'Invalid input',
    details: result.error.flatten(),
  });
}

// Use validated data
const screen = result.data;
```

### Available Schemas

- `ScreenRegistrationSchema` - Screen registration validation
- `ScreenFilterSchema` - Query parameter validation
- `ScreenHeartbeatSchema` - Heartbeat validation
- `DOOHCampaignSchema` - Campaign validation
- `DeliveryRequestSchema` - Delivery request validation
- `ImpressionEventSchema` - Analytics event validation
- `ApiErrorResponseSchema` - Error response format

---

## State Machines

Prevent invalid state transitions:

```typescript
import {
  isValidScreenStatusTransition,
  assertValidScreenStatusTransition,
  isValidCampaignStatusTransition,
  getAllowedScreenTransitions,
} from '@rez/dooh-shared';

// Check before transition
if (isValidScreenStatusTransition(currentStatus, newStatus)) {
  // Safe to transition
} else {
  return res.status(400).json({ error: 'Invalid transition' });
}

// Or throw on invalid
assertValidScreenStatusTransition(currentStatus, newStatus);

// Get allowed transitions
const allowed = getAllowedScreenTransitions('active');
// Returns: ['inactive', 'offline', 'maintenance']
```

### Screen Status Transitions

```
unregistered → pending → active → inactive → suspended
                    ↘         ↘
                     offline  maintenance
```

### Campaign Status Transitions

```
draft → active → paused → completed
  ↘              ↘
   budget_exhausted
```

---

## Money Utilities

Handle financial calculations without floating-point errors:

```typescript
import {
  money,
  moneyFromCents,
  calculateCPMCost,
  formatMoney,
  formatMoneyCompact,
  addMoney,
  multiplyMoney,
} from '@rez/dooh-shared';

// Create money amounts (stored as cents internally)
const cpm = money(25, 'INR');  // ₹25.00 stored as 2500 cents
const impressions = 10000;

// Calculate cost
const cost = calculateCPMCost(cpm, impressions);

// Format for display
console.log(formatMoney(cost));        // "₹25.00"
console.log(formatMoneyCompact(cost)); // "₹25"

// Arithmetic
const total = addMoney(cost, cpm);
const discounted = multiplyMoney(total, 0.9);
```

---

## Integration with Ecosystem

| Package | Purpose | Location |
|---------|---------|----------|
| `@rez/dooh-shared` | **Canonical types** | RTNM-Group/shared-types/dooh |
| `rez-dooh-service` | Unified backend service | REZ-Media/rez-dooh-service |
| `dooh-screen-app` | Next.js screen display | REZ-Media/dooh-screen-app |
| `dooh-mobile` | React Native owner app | REZ-Media/dooh-mobile |

### External Integrations

```
DOOH
 ├── AdOS → Decision engine
 ├── AdBazaar → Campaign inventory
 ├── AdsQR → Attribution layer
 └── ReZ Mind → Context signals
```

---

## Quick Start

```typescript
import { createDOOHNetwork } from '@rez/dooh-shared';

const dooh = createDOOHNetwork();

// Get ads for a screen
const ads = dooh.getAds(screenId, campaigns);

// Generate playlist
const playlist = dooh.generatePlaylist(screenId, campaigns);

// Get network stats
const stats = dooh.getStats();
```

---

## Security Features

- **Input Validation**: All API inputs validated with Zod schemas
- **State Machine Validation**: Prevents invalid status transitions
- **Money Precision**: Integer cents avoid floating-point errors
- **Rate Limiting**: Built-in rate limiting middleware
- **Authentication**: Token-based auth for all protected endpoints
- **Per-Screen API Keys**: Each screen has unique authentication

---

## Contributing

When adding new types:

1. Add types to `src/types.ts`
2. Add corresponding Zod schema to `src/schemas.ts`
3. Add state machine transitions to `src/state-machines.ts` if applicable
4. Update this README
5. Export from `src/index.ts`

---

## API Endpoints

### Screen Management
```
POST   /api/screens/register      - Register new screen
GET    /api/screens               - List screens
GET    /api/screens/:id           - Get screen details
PATCH  /api/screens/:id           - Update screen
DELETE /api/screens/:id           - Remove screen
POST   /api/screens/:id/status   - Update status
POST   /api/screens/:id/heartbeat - Process heartbeat
GET    /api/screens/:id/apikey    - Get API key
POST   /api/screens/:id/apikey/rotate - Rotate API key
```

### Analytics
```
POST   /api/analytics/impressions - Record impressions
GET    /api/analytics/screen/:id - Screen analytics
GET    /api/analytics/campaign/:id - Campaign analytics
```

### Health
```
GET    /health                   - Service health
GET    /ready                     - Readiness check
```

---

## Revenue Model

### CPM (Cost Per Mille)
```typescript
const cost = impressions * (cpmRate / 1000)
```

### Slot Pricing
| Slot Type | Time | Multiplier |
|-----------|------|------------|
| Prime | 6-9 AM, 12-2 PM, 6-9 PM | 2x |
| Standard | Other hours | 1x |
| Off-peak | Late night | 0.5x |

### Screen Owner Revenue Share
| Model | Owner | Platform |
|-------|-------|----------|
| CPM | 60% | 40% |
| Performance | 70% | 30% |
| Hybrid | 65% | 35% |

---

## Positioning

> **"DOOH turns every screen into a measurable advertising channel."**
