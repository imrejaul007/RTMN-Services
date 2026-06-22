# ReZ Ride — Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │   User App   │    │  Driver App  │    │ Vehicle Screen│             │
│  │ React Native │    │ React Native │    │ WebView/      │             │
│  │              │    │              │    │ Android App   │             │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘             │
│         │                   │                   │                      │
│         └───────────────────┼───────────────────┘                      │
│                             │                                          │
│                             ▼                                          │
│                    ┌─────────────────┐                                 │
│                    │  API Gateway    │                                 │
│                    │  (Kong/AWS)     │                                 │
│                    └────────┬────────┘                                 │
│                             │                                          │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
┌─────────────────────────────┼──────────────────────────────────────────┐
│                    SERVICES LAYER                                       │
├─────────────────────────────┼──────────────────────────────────────────┤
│                             ▼                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │    Ride      │    │   Driver     │    │     Ad       │             │
│  │   Service    │    │   Service    │    │   Service    │             │
│  │              │    │              │    │              │             │
│  │ • Booking    │    │ • Onboarding │    │ • Targeting  │             │
│  │ • Dispatch   │    │ • Matching   │    │ • Serving    │             │
│  │ • Fare Calc  │    │ • Status     │    │ • Tracking   │             │
│  │ • Routing    │    │ • Earnings   │    │ • Reporting  │             │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘             │
│         │                   │                   │                      │
│         └───────────────────┼───────────────────┘                      │
│                             │                                          │
│                             ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                    EVENT BUS (Kafka/Redis)                  │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                             │                                          │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
┌─────────────────────────────┼──────────────────────────────────────────┐
│                  EXTERNAL SERVICES LAYER                               │
├─────────────────────────────┼──────────────────────────────────────────┤
│                             ▼                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │   ReZ Auth   │    │ ReZ Wallet  │    │  Rez Mind   │             │
│  │              │    │              │    │              │             │
│  │ • Login      │    │ • Payments  │    │ • Intent    │             │
│  │ • Sessions   │    │ • Cashback  │    │ • Profiling │             │
│  │ • Tokens     │    │ • Payouts   │    │ • Matching  │             │
│  └──────────────┘    └──────────────┘    └──────┬───────┘             │
│                                                  │                      │
│  ┌──────────────┐    ┌──────────────┐           │                      │
│  │  AdsBazaar   │    │   Maps API   │◀──────────┘                      │
│  │              │    │              │                                  │
│  │ • Campaigns  │    │ • Routing   │                                  │
│  │ • Creatives  │    │ • ETA       │                                  │
│  │ • Reporting  │    │ • Geocoding │                                  │
│  └──────────────┘    └──────────────┘                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Core Services

### 1. Ride Service

**Responsibility:** End-to-end ride lifecycle management

```
┌─────────────────────────────────────────────────────────────────┐
│ RIDE SERVICE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ Core Responsibilities: │
│ • Create ride booking │
│ • Calculate fare │
│ • Manage ride state machine │
│ • Track ride in progress │
│ │
│ API Endpoints: │
│ ├── POST /rides              → Create ride │
│ ├── GET /rides/:id           → Get ride details │
│ ├── PATCH /rides/:id/status  → Update ride status │
│ ├── POST /rides/:id/cancel   → Cancel ride │
│ └── GET /rides/history        → User ride history │
│ │
│ Dependencies: │
│ ├── Driver Service (assignment) │
│ ├── Maps API (routing) │
│ ├── ReZ Wallet (payment) │
│ └── Event Bus (state changes) │
│ │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Driver Service

**Responsibility:** Driver management and matching

```
┌─────────────────────────────────────────────────────────────────┐
│ DRIVER SERVICE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ Core Responsibilities: │
│ • Driver onboarding │
│ • Driver status management │
│ • Ride assignment/matching │
│ • Driver earnings calculation │
│ │
│ API Endpoints: │
│ ├── POST /drivers              → Register driver │
│ ├── GET /drivers/:id           → Driver profile │
│ ├── PATCH /drivers/:id/status  → Go online/offline │
│ ├── POST /drivers/:id/rides    → Assigned rides │
│ ├── GET /drivers/:id/earnings  → Earnings │
│ └── POST /drivers/:id/payout   → Request payout │
│ │
│ State Machine: │
│ ├── offline → online → riding → online │
│ └── online → busy (temporary) │
│ │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Ad Service

**Responsibility:** Ad serving and impression tracking

```
┌─────────────────────────────────────────────────────────────────┐
│ AD SERVICE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ Core Responsibilities: │
│ • Integrate with Rez Mind for targeting │
│ • Query AdsBazaar for ad creatives │
│ • Push ads to vehicle screen │
│ • Track impressions │
│ • Calculate ad revenue │
│ │
│ API Endpoints: │
│ ├── POST /ads/target        → Get targeted ad for ride │
│ ├── POST /ads/impression    → Log impression │
│ ├── POST /ads/interaction   → Log interaction │
│ └── GET /ads/report/:rideId → Get ride ad report │
│ │
│ Ad Decision Flow: │
│ 1. Ride created │
│ 2. Pull user profile from Rez Mind │
│ 3. Analyze intent signals │
│ 4. Query AdsBazaar with targeting │
│ 5. Return ad creative + metadata │
│ 6. Push to vehicle screen │
│ │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Screen Service

**Responsibility:** Vehicle screen management

```
┌─────────────────────────────────────────────────────────────────┐
│ SCREEN SERVICE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ Core Responsibilities: │
│ • Screen device registration │
│ • Over-the-air updates │
│ • Screen state management │
│ • Connectivity monitoring │
│ │
│ API Endpoints: │
│ ├── POST /screens/register       → Register screen │
│ ├── PATCH /screens/:id/status   → Update status │
│ ├── POST /screens/:id/heartbeat  → Keep-alive │
│ └── GET /screens/:id/health      → Health check │
│ │
│ Device Communication: │
│ • WebSocket for real-time ad push │
│ • MQTT for low-latency commands │
│ • HTTP for periodic sync │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Event-Driven Architecture

### Event Bus

```
┌─────────────────────────────────────────────────────────────────┐
│ EVENT BUS (Kafka / Redis Streams) │
├─────────────────────────────────────────────────────────────────┤
│ │
│ Events Published: │
│ │
│ ride.created │
│ ├── ride_id │
│ ├── user_id │
│ ├── pickup_location │
│ ├── drop_location │
│ └── vehicle_type │
│ │
│ ride.assigned │
│ ├── ride_id │
│ ├── driver_id │
│ └── assigned_at │
│ │
│ ride.started │
│ ├── ride_id │
│ ├── driver_id │
│ ├── started_at │
│ └── ad_requested │
│ │
│ ride.completed │
│ ├── ride_id │
│ ├── fare_amount │
│ ├── distance │
│ ├── duration │
│ └── ad_served │
│ │
│ ad.impression │
│ ├── ride_id │
│ ├── ad_id │
│ ├── viewed_duration │
│ └── interacted │
│ │
│ cashback.credited │
│ ├── user_id │
│ ├── ride_id │
│ └── amount │
│ │
└─────────────────────────────────────────────────────────────────┘
```

### Event Consumers

```
┌─────────────────────────────────────────────────────────────────┐
│ EVENT CONSUMERS │
├─────────────────────────────────────────────────────────────────┤
│ │
│ Ad Service (subscribes to: ride.started) │
│ └── Triggers ad targeting and serving │
│ │
│ Wallet Service (subscribes to: ride.completed) │
│ └── Triggers cashback credit │
│ │
│ Analytics Service (subscribes to: all) │
│ └── Aggregates metrics │
│ │
│ Notification Service (subscribes to: ride.assigned, ride.completed) │
│ └── Sends user/driver notifications │
│ │
│ Audit Service (subscribes to: all) │
│ └── Maintains audit trail │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Gateway

### Rate Limiting

```
RATE_LIMITS:
├── User endpoints: 100 req/min
├── Driver endpoints: 200 req/min
├── Screen endpoints: 1000 req/min
└── Admin endpoints: 500 req/min

AUTHENTICATION:
├── User/Driver: JWT token (ReZ Auth)
├── Screen: Device token
└── Admin: ReZ admin auth
```

### Routing Rules

```
ROUTES:
├── /api/v1/users/*     → User Service
├── /api/v1/drivers/*   → Driver Service
├── /api/v1/rides/*     → Ride Service
├── /api/v1/ads/*       → Ad Service
├── /api/v1/screens/*   → Screen Service
├── /api/v1/admin/*     → Admin Service
└── /api/v1/health      → Health Check
```

---

## Data Flow: Ride Creation to Ad Serving

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FULL DATA FLOW │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ 1. USER CONFIRMS BOOKING │
│    └── User App → API Gateway → Ride Service │
│                                                                          │
│ 2. RIDE CREATED │
│    └── Ride Service → Create ride record (status: requested) │
│    └── Ride Service → Event: ride.created │
│                                                                          │
│ 3. DRIVER MATCHED │
│    └── Driver Service → Find nearest available driver │
│    └── Ride Service → Update ride (status: assigned) │
│    └── Driver Service → Notify driver │
│    └── Ride Service → Event: ride.assigned │
│                                                                          │
│ 4. DRIVER ACCEPTS │
│    └── Driver App → Driver Service → Accept ride │
│    └── Ride Service → Update ride (status: accepted) │
│    └── Notification → Notify user │
│                                                                          │
│ 5. DRIVER ARRIVES │
│    └── Driver App → "Arrived" │
│    └── Ride Service → Update ride (status: arrived) │
│    └── User notified: "Driver arrived" │
│                                                                          │
│ 6. RIDE STARTS │
│    └── Driver App → "Start Ride" │
│    └── Ride Service → Update (status: in_progress) │
│    └── Event: ride.started │
│                                                                          │
│ 7. AD DECISION TRIGGERED │
│    └── Ad Service ← ride.started event │
│    └── Ad Service → Rez Mind: Get user intent │
│    └── Rez Mind → Returns: top categories, urgency │
│    └── Ad Service → AdsBazaar: Query ads │
│    └── AdsBazaar → Returns: ad creative │
│                                                                          │
│ 8. AD PUSHED TO SCREEN │
│    └── Ad Service → Screen Service: Push ad │
│    └── Screen Service → Vehicle Screen: Display ad │
│                                                                          │
│ 9. IMPRESSIONS TRACKED │
│    └── Screen → Ad Service: Impression logged │
│    └── Ad Service → Event: ad.impression │
│                                                                          │
│ 10. RIDE COMPLETES │
│     └── Driver App → "End Ride" │
│     └── Ride Service → Calculate final fare │
│     └── Ride Service → Process payment (ReZ Wallet) │
│     └── Ride Service → Event: ride.completed │
│                                                                          │
│ 11. CASHBACK CREDITED │
│     └── Wallet Service ← ride.completed event │
│     └── Wallet Service → Calculate 10% cashback │
│     └── Wallet Service → Credit to user wallet │
│     └── Wallet Service → Event: cashback.credited │
│                                                                          │
│ 12. RATING │
│     └── User App → Submit rating │
│     └── Ride Service → Update ride │
│     └── Driver Service → Update driver rating │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend

```
LANGUAGES & FRAMEWORKS:
├── Node.js 20+ with TypeScript
├── Express.js or Fastify for APIs
└── NestJS for microservices (optional)

DATABASES:
├── PostgreSQL (primary data)
├── Redis (caching, sessions)
└── MongoDB (logs, events)

MESSAGE QUEUE:
├── Kafka (event streaming)
└── Redis Streams (lightweight)

SEARCH:
├── Elasticsearch (analytics)
└── PostgreSQL full-text (basic)
```

### Frontend

```
MOBILE APPS:
├── React Native 0.76+
├── TypeScript
├── React Navigation
├── Zustand (state management)
└── React Query (data fetching)

WEB:
├── Next.js 14+ (admin dashboard)
├── TypeScript
├── Tailwind CSS
└── shadcn/ui components
```

### Infrastructure

```
DEPLOYMENT:
├── AWS EKS (Kubernetes) or
├── Docker Compose (simple deployment)
└── Vercel (frontend)

STORAGE:
├── AWS S3 (images, videos)
└── Cloudflare R2 (CDN)

MONITORING:
├── Prometheus + Grafana
├── ELK Stack (logging)
└── Sentry (error tracking)

MAPS:
├── Google Maps Platform or
├── Mapbox
└── OSRM (self-hosted routing)
```

---

## Security Considerations

```
AUTHENTICATION:
├── JWT tokens from ReZ Auth
├── Token refresh mechanism
├── Screen device authentication
└── Admin role-based access

DATA PROTECTION:
├── Encryption at rest (AES-256)
├── Encryption in transit (TLS 1.3)
├── PII masking in logs
└── GDPR-style data retention

API SECURITY:
├── Rate limiting
├── Input validation (Zod)
├── SQL injection prevention
├── XSS prevention
└── CORS configuration
```

---

## Scalability Design

```
HORIZONTAL SCALING:

Ride Service:
├── Multiple instances
├── Session affinity not required
├── Stateless design
└── Auto-scaling based on request rate

Driver Service:
├── Multiple instances
├── Driver state in Redis
└── Consistent hashing for driver matching

Ad Service:
├── Cache ad decisions (5 min TTL)
├── CDN for ad creatives
└── Edge computing for targeting

DATABASE:
├── Read replicas for queries
├── Sharding by user_id/rider_id
└── Connection pooling (PgBouncer)
```
