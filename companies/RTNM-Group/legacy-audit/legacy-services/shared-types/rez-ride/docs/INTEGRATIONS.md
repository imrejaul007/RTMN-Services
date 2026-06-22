# ReZ Ride — Integrations

## Integration Overview

ReZ Ride connects with existing ReZ services and external APIs to provide a complete ride-hailing experience.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ REZ RIDE SERVICES │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                     ┌─────────────────────┐                             │
│                     │   External APIs    │                             │
│                     └─────────┬─────────┘                             │
│                               │                                         │
│         ┌─────────────────────┼─────────────────────┐                  │
│         │                     │                     │                  │
│         ▼                     ▼                     ▼                  │
│ ┌───────────────┐    ┌───────────────┐    ┌───────────────┐          │
│ │   ReZ Auth   │    │  ReZ Wallet  │    │  Rez Mind    │          │
│ │              │    │              │    │              │          │
│ │ • Login     │    │ • Payments  │    │ • Intent    │          │
│ │ • Register  │    │ • Cashback  │    │ • Profiling │          │
│ │ • Sessions  │    │ • Payouts   │    │ • Matching  │          │
│ │ • Verify    │    │ • Balance   │    │             │          │
│ └───────┬───────┘    └───────┬───────┘    └───────┬───────┘          │
│         │                     │                     │                  │
│         └─────────────────────┼─────────────────────┘                  │
│                               │                                         │
│                               ▼                                         │
│                     ┌─────────────────────┐                            │
│                     │    AdsBazaar       │                             │
│                     │                     │                             │
│                     │ • Ad marketplace   │                             │
│                     │ • Campaigns        │                             │
│                     │ • Creatives        │                             │
│                     │ • Targeting        │                             │
│                     └─────────┬─────────┘                             │
│                               │                                         │
│                               ▼                                         │
│                     ┌─────────────────────┐                            │
│                     │   Maps / Routing   │                             │
│                     │                     │                             │
│                     │ • Route calc       │                             │
│                     │ • ETA               │                             │
│                     │ • Geocoding        │                             │
│                     └─────────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ReZ Auth Integration

**Purpose:** User and driver authentication

### API Endpoints

```
BASE_URL: {REZ_AUTH_SERVICE_URL}

POST /auth/login
POST /auth/register
POST /auth/verify-otp
POST /auth/refresh-token
POST /auth/logout
GET  /auth/me
```

### Authentication Flow

```typescript
// User wants to book ride
const response = await fetch(`${REZ_AUTH_URL}/auth/me`, {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

// Response
{
  "user_id": "uuid",
  "phone": "+91...",
  "email": "user@example.com",
  "name": "User Name",
  "wallet_balance": 1500.00,
  "role": "user"
}
```

### Driver Authentication

```typescript
// Driver login
const response = await fetch(`${REZ_AUTH_URL}/auth/login`, {
  method: 'POST',
  body: JSON.stringify({
    phone: '+91...',
    password: '...',
    role: 'driver'
  })
});

// Response includes driver-specific data
{
  "driver_id": "uuid",
  "user_id": "uuid",
  "status": "online",
  "vehicle_id": "uuid",
  "token": "jwt..."
}
```

---

## ReZ Wallet Integration

**Purpose:** Payments, cashback, driver payouts

### API Endpoints

```
BASE_URL: {REZ_WALLET_SERVICE_URL}

POST /wallet/pay              → Pay for ride
POST /wallet/cashback        → Credit cashback
GET  /wallet/balance/:userId → Get balance
GET  /wallet/transactions     → Transaction history
POST /wallet/payout          → Driver payout
```

### Payment Flow

```typescript
// User pays for ride
interface PaymentRequest {
  user_id: string;
  amount: number;
  ride_id: string;
  payment_method: 'wallet' | 'upi' | 'card';
}

const response = await fetch(`${REZ_WALLET_URL}/wallet/pay`, {
  method: 'POST',
  body: JSON.stringify({
    user_id: user.id,
    amount: fare,
    ride_id: ride.id,
    payment_method: 'wallet'
  })
});

// Response
{
  "success": true,
  "transaction_id": "txn_...",
  "balance_after": 1350.00,
  "message": "Payment successful"
}
```

### Cashback Credit

```typescript
// System credits cashback after ride
interface CashbackRequest {
  user_id: string;
  ride_id: string;
  amount: number;
  source: 'ride_cashback';
  expires_in_days: 90;
}

const response = await fetch(`${REZ_WALLET_URL}/wallet/cashback`, {
  method: 'POST',
  body: JSON.stringify({
    user_id: user.id,
    ride_id: ride.id,
    amount: cashbackAmount, // 10% of fare
    source: 'ride_cashback',
    expires_in_days: 90
  })
});

// Response
{
  "success": true,
  "transaction_id": "...",
  "new_balance": 1365.00,
  "cashback_expires_at": "2026-08-01T00:00:00Z"
}
```

### Driver Payout

```typescript
// Driver requests payout
interface PayoutRequest {
  driver_id: string;
  amount: number;
  method: 'upi' | 'bank_transfer';
  upi_id?: string;
  bank_account?: {
    account_number: string;
    ifsc: string;
  };
}

const response = await fetch(`${REZ_WALLET_URL}/wallet/payout`, {
  method: 'POST',
  body: JSON.stringify({
    driver_id: driver.id,
    amount: 5000,
    method: 'upi',
    upi_id: 'driver@upi'
  })
});
```

---

## Rez Mind Integration

**Purpose:** User intent analysis for ad targeting

### API Endpoints

```
BASE_URL: {REZ_MIND_URL}

POST /intent/profile/:userId  → Get user intent profile
POST /intent/targeting        → Get targeting params
POST /intent/ads              → Get ads for targeting
```

### Get User Intent Profile

```typescript
interface IntentRequest {
  user_id: string;
  context?: {
    current_activity?: string;
    location?: { lat: number; lng: number };
    time_of_day?: string;
  };
}

interface IntentProfile {
  user_id: string;

  // Top categories (from browsing/order history)
  top_categories: Array<{
    category: string;
    score: number; // 0-100
  }>;

  // Purchase intent signals
  purchase_intent: {
    level: 'none' | 'low' | 'medium' | 'high';
    timeframe?: 'immediate' | 'week' | 'month';
    categories?: string[];
  };

  // Demographics (inferred)
  inferred_demographics: {
    spending_level: 'budget' | 'mid' | 'premium';
    lifestyle: string;
    travel_frequency: 'occasional' | 'regular' | 'frequent';
  };

  // Recent activity (last 7 days)
  recent_activity: Array<{
    action: string;
    item?: string;
    timestamp: string;
  }>;

  // Current trip context
  trip_context?: {
    destination?: string;
    purpose?: 'business' | 'personal' | 'travel';
  };

  generated_at: string;
}
```

### Get Ad Targeting Parameters

```typescript
// Based on ride booking + user profile
interface TargetingRequest {
  user_id: string;
  ride_id: string;
  context: {
    pickup_location: { lat: number; lng: number; city: string };
    drop_location: { lat: number; lng: number; city: string };
    vehicle_type: string;
  };
}

interface TargetingResponse {
  targeting_params: {
    categories: string[];      // Primary ad categories
    exclude_categories: string[];
    price_range: { min: number; max: number };
    urgency: 'low' | 'medium' | 'high';
    brands?: string[];
    location_relevance: 'local' | 'destination' | 'any';
  };

  intent_signals: Array<{
    signal: string;
    weight: number;
    source: string;
  }>;
}
```

---

## AdsBazaar Integration

**Purpose:** Ad marketplace, creative serving, campaign management

### API Endpoints

```
BASE_URL: {ADSBAZAAR_URL}

GET  /ads/targeting        → Query ads for targeting params
POST /ads/serve            → Record ad impression
GET  /ads/campaign/:id     → Get campaign details
POST /ads/report           → Batch report impressions
```

### Query Ads for Targeting

```typescript
interface AdQueryRequest {
  targeting_params: {
    categories: string[];
    exclude_categories: string[];
    price_range: { min: number; max: number };
    urgency: 'low' | 'medium' | 'high';
  };

  context: {
    ride_id: string;
    user_id: string;
    vehicle_type: string;
    screen_format: 'hero' | 'video' | 'card';
  };

  limit?: number; // Default 5
}

interface AdQueryResponse {
  ads: Array<{
    ad_id: string;
    campaign_id: string;
    creative: {
      type: 'image' | 'video' | 'card';
      url: string;
      thumbnail_url?: string;
      title: string;
      description: string;
      cta_text?: string;
      cta_url?: string;
    };
    bid_amount: number;
    targeting_match: number; // 0-100 score
  }>;

  selected_ad: {
    ad_id: string;
    impression_id: string;
    cpm: number;
  };
}
```

### Record Impression

```typescript
interface ImpressionRequest {
  impression_id: string;
  ad_id: string;
  ride_id: string;
  served_at: string;
}

const response = await fetch(`${ADSBAZAAR_URL}/ads/serve`, {
  method: 'POST',
  body: JSON.stringify({
    impression_id: impression.id,
    ad_id: ad.ad_id,
    ride_id: ride.id,
    served_at: new Date().toISOString()
  })
});
```

### Record Interaction

```typescript
interface InteractionRequest {
  impression_id: string;
  interaction_type: 'view' | 'tap' | 'link_click' | 'call';
  view_duration?: number; // seconds
  interaction_data?: object;
}

await fetch(`${ADSBAZAAR_URL}/ads/interact`, {
  method: 'POST',
  body: JSON.stringify({
    impression_id: impression.id,
    interaction_type: 'tap',
    view_duration: 15,
    interaction_data: { destination: '/app/product/123' }
  })
});
```

---

## Maps Integration

**Purpose:** Routing, ETA, geocoding

### Supported Providers

```
PRIMARY: Google Maps Platform
ALTERNATIVE: Mapbox
OPEN_SOURCE: OSRM (self-hosted)
```

### API Endpoints

```
POST /maps/route        → Calculate route
POST /maps/eta          → Get ETA
GET  /maps/geocode      → Address to coordinates
GET  /maps/reverse-geocode → Coordinates to address
```

### Route Calculation

```typescript
interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  vehicle_type: 'car' | 'auto' | 'bike';
}

interface RouteResponse {
  distance: number; // meters
  duration: number; // seconds
  polyline: string; // encoded polyline
  route_geometry: GeoJSON;
}
```

### ETA Calculation

```typescript
interface ETARequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

interface ETAResponse {
  eta: number; // seconds
  distance: number; // meters
  traffic_multiplier?: number;
}
```

---

## WebSocket (Real-time Communication)

### Screen Communication

```typescript
// Vehicle Screen ↔ Backend

// Connection
const ws = new WebSocket(`wss://${API_URL}/screens/${screenId}/connect`);

// Messages from Server
interface ServerMessage {
  type: 'ride_update' | 'ad_content' | 'command';
  payload: object;
  timestamp: string;
}

// Ad Content Message
{
  "type": "ad_content",
  "payload": {
    "ad_id": "...",
    "creative": {
      "type": "image",
      "url": "https://...",
      "title": "...",
      "description": "...",
      "duration": 30 // seconds
    },
    "targeting_context": {
      "user_intent": ["travel", "hotels"],
      "personalized": true
    }
  }
}

// Messages from Screen
interface ScreenMessage {
  type: 'heartbeat' | 'impression' | 'interaction' | 'status';
  payload: object;
}

// Heartbeat
{
  "type": "heartbeat",
  "payload": {
    "screen_status": "online",
    "battery_level": 85,
    "network": "4g"
  }
}

// Impression Log
{
  "type": "impression",
  "payload": {
    "ad_id": "...",
    "started_at": "...",
    "viewed_duration": 25,
    "interacted": true
  }
}
```

---

## Event Webhooks

### Outgoing Webhooks (ReZ Ride → External)

```typescript
// Register webhook endpoint in external services

interface WebhookPayload {
  event_type: string;
  event_id: string;
  timestamp: string;
  data: object;
}

// Event Types:
// - ride.created
// - ride.completed
// - cashback.credited
// - driver.payout.processed
```

---

## Configuration

### Environment Variables

```env
# ReZ Services
REZ_AUTH_SERVICE_URL=https://auth.rezapp.com
REZ_WALLET_SERVICE_URL=https://wallet.rezapp.com
REZ_MIND_URL=https://mind.rezapp.com
ADSBAZAAR_URL=https://ad-bazaar.vercel.app

# Maps
GOOGLE_MAPS_API_KEY=xxx
MAPBOX_ACCESS_TOKEN=xxx

# Internal
REZ_INTERNAL_KEY=xxx
ADBAZAAR_WEBHOOK_SECRET=xxx
```

---

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: {
    code: string;       // "WALLET_INSUFFICIENT_BALANCE"
    message: string;    // "User wallet balance insufficient"
    details?: object;
  };
  request_id: string;
}
```

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `AUTH_INVALID_TOKEN` | Token expired/invalid | Re-authenticate |
| `WALLET_INSUFFICIENT` | Low balance | Prompt to add funds |
| `DRIVER_UNAVAILABLE` | No drivers nearby | Retry later |
| `RIDE_NOT_FOUND` | Invalid ride ID | Check request |
| `AD_SERVICE_UNAVAILABLE` | Ads down | Serve fallback ad |
| `MAPS_ERROR` | Routing failed | Use straight-line estimate |
