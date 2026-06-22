# Common Services Architecture Overview

## System Architecture

```
                                    ┌─────────────────┐
                                    │   Client Apps   │
                                    │ (Web, Mobile)   │
                                    └────────┬────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / LOAD BALANCER                        │
│                        (CORS, Rate Limiting, Auth)                           │
└──────────────────────────────────────────────────────────────────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌────────────────┐      ┌─────────────────┐      ┌────────────────┐
           │  Auth Service │      │  Payment Service│      │ Wallet Service │
           │   (Port 4002) │      │   (Port 4001)  │      │ (Port 3010)   │
           └────────┬───────┘      └────────┬────────┘      └────────┬───────┘
                    │                       │                       │
                    └───────────────────────┼───────────────────────┘
                                            │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌────────────────┐      ┌─────────────────┐      ┌────────────────┐
           │ Profile Service│      │ Order Service   │      │Catalog Service │
           │   (Port 3000) │      │  (Port 4003)   │      │  (Port 3005)  │
           └────────┬───────┘      └────────┬────────┘      └────────┬───────┘
                    │                       │                       │
                    └───────────────────────┼───────────────────────┘
                                            │
                                           ▼
                                 ┌────────────────────┐
                                 │  Notification Svc  │
                                 │  (BullMQ Worker)   │
                                 └────────────────────┘
                                            │
           ┌────────────────────────────────┼────────────────────────────────┐
           │                                │                                │
           ▼                                ▼                                ▼
    ┌────────────┐                  ┌────────────┐                  ┌────────────┐
    │  MongoDB   │                  │   Redis    │                  │  Razorpay  │
    │  (Primary) │                  │  (Cache/   │                  │  (Payment  │
    │            │                  │   Queues)  │                  │   Gateway) │
    └────────────┘                  └────────────┘                  └────────────┘
```

---

## Service Responsibilities

### Authentication Layer
| Service | Responsibility | Key Features |
|---------|---------------|--------------|
| **Auth Service** | Identity, JWT, OTP, MFA | OTP via Redis, TOTP for MFA, OAuth2 partners |

### Transaction Layer
| Service | Responsibility | Key Features |
|---------|---------------|--------------|
| **Payment Service** | Payment processing, Razorpay integration | Webhooks, refunds, reconciliation |
| **Wallet Service** | Digital wallet, coin management | Multi-coin support, BNPL, payouts |

### Data Layer
| Service | Responsibility | Key Features |
|---------|---------------|--------------|
| **Profile Service** | User profiles, preferences | Extended profile (REE), features |
| **Order Service** | Order management | BullMQ workers, CQRS pattern |
| **Catalog Service** | Product catalog | Restaurant/food catalog |

### Communication Layer
| Service | Responsibility | Key Features |
|---------|---------------|--------------|
| **Notification Service** | Multi-channel notifications | Push, SMS, Email, WhatsApp, In-App |

---

## Data Flow Examples

### User Registration Flow
```
Client → Auth Service → OTP Generation → Redis (TTL 5min)
                              ↓
                         Email/SMS sent
                              ↓
Client → Verify OTP → Auth Service → Create User → MongoDB
                              ↓
                        JWT Token Generated
                              ↓
Client → Profile Service (create profile)
```

### Payment Flow
```
Client → Order Service → Create Order → MongoDB
                              ↓
Client → Payment Service → Initiate Payment → Razorpay
                              ↓
Razorpay → Webhook → Payment Service → Update Payment Status
                              ↓
Payment Service → Wallet Service → Credit Wallet (if success)
                              ↓
Notification Service → Send Confirmation
```

### Checkout Flow
```
Client → Catalog Service (browse products)
         ↓
Client → Auth Service (login/JWT)
         ↓
Client → Order Service (create order)
         ↓
Client → Payment Service (pay)
         ↓
Payment Service → Wallet Service (deduct/credit)
         ↓
Order Service → Update order status
         ↓
Notification Service → Send confirmation
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 20.x | Server runtime |
| Framework | Express.js | HTTP server |
| Database | MongoDB 8.x | Primary data store |
| Cache | Redis 5.x | Caching, sessions, rate limiting |
| Queue | BullMQ | Job queues |
| Auth | JWT, bcrypt | Authentication |
| Validation | Zod | Request validation |
| Observability | Sentry, OpenTelemetry, Prometheus | Monitoring |

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│ 1. CORS     │ Whitelist of specific origins (no wildcards) │
│ 2. Helmet   │ Security headers                              │
│ 3. Rate Lim │ Per-IP and per-user limits                   │
│ 4. Mongo San│ NoSQL injection prevention                    │
│ 5. JWT      │ Token-based authentication                    │
│ 6. Internal │ Service-to-service token auth                │
│ 7. XFF Valid│ Spoofed IP detection                          │
│ 8. Input    │ Zod schema validation                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Dependency Graph

```
                    ┌─────────────────┐
                    │  Auth Service   │
                    │  (Port 4002)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   Profile   │ │   Payment   │ │   Wallet    │
    │   Service   │ │   Service   │ │   Service   │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │  Notification   │
                 │    Service      │
                 └────────┬────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
           ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   MongoDB  │ │    Redis    │ │   External  │
    │            │ │  (Cache/    │ │  (Twilio,   │
    │            │ │   Queue)    │ │  Firebase,  │
    │            │ │             │ │  SMTP)       │
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Service Communication Patterns

### Synchronous (REST)
- Auth verification (JWT check)
- Profile data retrieval
- Wallet balance queries

### Asynchronous (BullMQ)
- OTP processing
- Email/SMS sending
- Payment webhook handling
- Wallet credits

### Event-Driven (Redis Pub/Sub)
- Real-time notifications
- Cross-service updates

---

## Environment Architecture

```
┌────────────────────────────────────────────┐
│            Development Environment           │
│  - Local MongoDB/Redis                      │
│  - Ports: 4001-4004, 3000, 3005            │
│  - No Sentry                               │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│            Staging Environment              │
│  - MongoDB Atlas                           │
│  - Redis Cloud                             │
│  - Sentry enabled                          │
│  - OnRender deployment                     │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│            Production Environment           │
│  - MongoDB Atlas Cluster                  │
│  - Redis Cloud (TLS)                     │
│  - Sentry full observability              │
│  - OnRender auto-scaling                  │
└────────────────────────────────────────────┘
```
