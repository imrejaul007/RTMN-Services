# ReZ Mind QR Integration Guide

## Overview

ReZ Mind now supports unified intent capture across all QR code contexts, enabling intelligent recommendations and cross-context user profiling.

## QR Contexts

| Source | Description | Example Use Cases |
|--------|-------------|-------------------|
| `room_qr` | Hotel room service | Room service orders, housekeeping, checkout |
| `menu_qr` | Restaurant menus | Dish viewing, ordering, dietary preferences |
| `rez_now` | Store discovery | Service booking, appointments, gallery viewing |
| `ads_qr` | Campaign attribution | Offer claims, visit verification, conversions |

## Quick Start

### 1. Capture a QR Intent

```typescript
import { qrContextService } from '@rez/intent-graph';
import { QR_SIGNAL_WEIGHTS } from '@rez/shared-types';

const result = await qrContextService.captureQRIntent({
  userId: 'user_123',
  intent: {
    type: 'dish_ordered',
    dishId: 'pasta_001',
    customizations: ['extra_cheese', 'no_onion'],
    quantity: 1,
  },
  context: {
    source: 'menu_qr',
    entityId: 'restaurant_001',
    merchantId: 'merchant_001',
    visitTimestamp: new Date().toISOString(),
    locationContext: {
      latitude: 12.9716,
      longitude: 77.5946,
    },
  },
});

console.log(result.success); // true
console.log(result.recommendations); // [{ title: 'Save Room for Dessert', ... }]
```

### 2. Process Recommendations

```typescript
import { recommendationTriggersService } from '@rez/intent-graph';

const result = await recommendationTriggersService.processIntent(
  'user_123',
  { type: 'dish_viewed', dishId: 'steak_001', category: 'main_course', viewDuration: 8000 },
  { qrSource: 'menu_qr' }
);

console.log(result.recommendations);
// [
//   { type: 'intent', title: 'Perfect Pairings', ... },
//   { type: 'action', title: 'Our chocolate lava cake is a guest favorite!', ... }
// ]
```

### 3. QR-Aware Knowledge Search

```typescript
import { merchantKnowledgeService } from '@rez/intent-graph';

const knowledge = await merchantKnowledgeService.searchKnowledgeForQR(
  'merchant_001',
  'vegan options',
  'menu_qr',
  'dietary_filter_used'
);
```

## Intent Types

### Room QR Intents

| Intent | Description | Signal Weight |
|--------|-------------|---------------|
| `room_service_request` | Guest requests room service | 0.45 |
| `housekeeping_request` | Housekeeping service request | 0.30 |
| `checkout_request` | Guest initiates checkout | 0.60 |
| `feedback_submitted` | Guest provides feedback | 0.50 |
| `late_checkout_request` | Late checkout request | 0.35 |
| `minibar_order` | Minibar items ordered | 0.40 |
| `spa_booking` | Spa service booked | 0.55 |
| `transport_request` | Transport service request | 0.40 |

### Menu QR Intents

| Intent | Description | Signal Weight |
|--------|-------------|---------------|
| `dish_viewed` | User views a dish | 0.10 |
| `dish_ordered` | Dish is ordered | 0.70 |
| `dietary_filter_used` | Dietary filters applied | 0.25 |
| `waiter_called` | Waiter assistance requested | 0.30 |
| `split_bill_initiated` | Bill split started | 0.45 |
| `tip_given` | Tip provided | 0.55 |
| `recommendation_accepted` | Staff recommendation accepted | 0.35 |
| `allergy_reported` | Allergies reported | 0.40 |

### Store QR Intents

| Intent | Description | Signal Weight |
|--------|-------------|---------------|
| `store_viewed` | Store page viewed | 0.12 |
| `link_clicked` | Link clicked | 0.18 |
| `qr_scanned` | QR code scanned | 0.20 |
| `service_booked` | Service booked | 0.65 |
| `appointment_scheduled` | Appointment scheduled | 0.60 |
| `gallery_viewed` | Gallery viewed | 0.15 |
| `social_link_clicked` | Social link clicked | 0.20 |

### Campaign QR Intents

| Intent | Description | Signal Weight |
|--------|-------------|---------------|
| `campaign_scanned` | Campaign QR scanned | 0.30 |
| `offer_viewed` | Offer viewed | 0.25 |
| `reward_claimed` | Reward claimed | 0.70 |
| `sample_requested` | Sample requested | 0.45 |
| `consultation_booked` | Consultation booked | 0.55 |
| `purchase_attributed` | Purchase attributed to campaign | 0.85 |
| `visit_verified` | Store visit verified | 0.35 |

## API Endpoints

### Capture Intent

```
POST /api/qr/capture
```

```json
{
  "userId": "user_123",
  "intent": {
    "type": "dish_ordered",
    "dishId": "pasta_001",
    "customizations": ["extra_cheese"],
    "quantity": 1
  },
  "context": {
    "source": "menu_qr",
    "entityId": "restaurant_001",
    "merchantId": "merchant_001",
    "visitTimestamp": "2024-01-15T12:00:00Z"
  }
}
```

### Get User Intents

```
GET /api/qr/intents?userId=user_123&qrSource=menu_qr&limit=20
```

### Get Merchant Intents

```
GET /api/qr/merchant/:merchantId/intents
```

### Get Analytics

```
GET /api/qr/analytics?merchantId=merchant_001&since=2024-01-01T00:00:00Z
```

### Get Recommendations

```
POST /api/qr/recommendations
```

```json
{
  "userId": "user_123",
  "intent": { "type": "dish_viewed", "dishId": "steak_001", "category": "main" },
  "qrSource": "menu_qr"
}
```

## Recommendation Triggers

Pre-configured triggers automatically generate recommendations based on user actions:

### Room QR Triggers

- **Spa Suggestion After Room Service**: After room service order, suggest spa
- **Checkout Feedback Request**: Request feedback at checkout
- **Transport Suggestion**: Offer transport before checkout
- **Low Rating Follow-up**: Immediate follow-up for ratings < 3

### Menu QR Triggers

- **Dish Pairing**: Suggest pairings after viewing a dish
- **Dessert Suggestion**: Offer dessert after main course
- **Dietary Safe Options**: Highlight filtered items
- **Waiter Follow-up**: Confirm staff is on the way

### Store QR Triggers

- **Related Store Suggestion**: Show similar stores
- **Service Packages**: Highlight bundle deals
- **Appointment Confirmation**: Confirm booking details
- **Review Incentive**: Prompt for reviews

### Campaign QR Triggers

- **Nearby Location**: Suggest nearby stores
- **Purchase Follow-up**: Remind about offer after visit
- **Referral Incentive**: Encourage sharing
- **Related Campaigns**: Show similar offers

## Event Emissions

The QR Context Service emits the following events:

| Event | Description |
|-------|-------------|
| `qr_intent_captured` | Any QR intent captured |
| `qr_high_priority_intent` | High-signal intent (weight >= 0.5) |
| `room_qr_intent` | Room QR intent captured |
| `menu_qr_intent` | Menu QR intent captured |
| `rez_now_qr_intent` | Store QR intent captured |
| `ads_qr_intent` | Campaign QR intent captured |
| `room_feedback_received` | Feedback submitted |
| `menu_order_placed` | Order placed via menu |
| `dietary_alert` | Allergies reported |
| `spa_booking_created` | Spa appointment booked |
| `appointment_booked` | Store appointment booked |
| `campaign_attribution` | Campaign scan attributed |
| `conversion_recorded` | Purchase attributed |
| `recommendations_triggered` | Recommendations generated |

## Cross-Context Enrichment

The service enriches intents with:

1. **Recent Intents**: Last 10 intents across all QR sources
2. **User Affinities**: Computed from cross-app behavior
3. **Merchant Context**: Name, category, location from knowledge base
4. **Recommendation Context**: Suggested next actions

## Data Model

### QRIntentRecord

```typescript
interface QRIntentRecord {
  id: string;
  userId: string;
  qrSource: QRSource;
  intentType: string;
  intentData: Record<string, unknown>;
  context: QRContext;
  signalWeight: number;
  confidence: number;
  merchantId?: string;
  storeId?: string;
  hotelId?: string;
  campaignId?: string;
  capturedAt: Date;
  enrichedFrom?: {
    recentIntents: string[];
    preferences: Record<string, unknown>;
    affinities: Record<string, number>;
  };
}
```

## Knowledge Base Integration

QR contexts can be integrated with the merchant knowledge base:

```typescript
// Add QR-aware knowledge entry
await merchantKnowledgeService.addQRKnowledgeEntry('merchant_001', {
  type: 'menu',
  title: 'Vegan Pasta',
  content: 'Our signature vegan pasta with cashew cream...',
  qrSources: ['menu_qr'],
  triggerIntents: ['dish_viewed', 'dietary_filter_used'],
  priorityForIntent: {
    'dietary_filter_used': 1.0,
    'dish_viewed': 0.5,
  },
});

// Search with QR context
const results = await merchantKnowledgeService.searchKnowledgeForQR(
  'merchant_001',
  'vegan',
  'menu_qr',
  'dietary_filter_used'
);
```

## Webhooks

Configure webhooks to receive QR intent events:

```
POST /api/qr/webhook/capture
```

The webhook receives full intent data for integration with external systems.

## Performance

- Intent capture: < 50ms p99
- Recommendation generation: < 100ms p99
- Cache hit rate: > 80% for active users
- Cooldown tracking prevents recommendation spam

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "userId", "message": "Required" }
  ]
}
```

## Rate Limiting

- Capture endpoint: 100 requests/minute per user
- Query endpoints: 500 requests/minute per user
- Batch capture: 10 intents per request

## Next Steps

- [Configure Custom Triggers](../intent-graph/triggers.md)
- [Set Up Webhooks](../webhooks/setup.md)
- [Knowledge Base Setup](../knowledge-base/getting-started.md)
- [Analytics Dashboard](../analytics/qr-insights.md)
