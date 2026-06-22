# ReZ Ecosystem - Complete System Documentation

**Version**: 2.0.0
**Last Updated**: 2026-05-01
**Total Services**: 17

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Service Registry](#service-registry)
3. [Architecture Diagram](#architecture-diagram)
4. [Service Details](#service-details)
5. [Data Flow](#data-flow)
6. [Technology Stack](#technology-stack)
7. [Communication Patterns](#communication-patterns)

---

## System Overview

The ReZ Ecosystem is a comprehensive microservices architecture designed to handle order management, payments, wallet operations, AI-powered insights, and hotel booking services. The system processes thousands of transactions daily with high availability and scalability.

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Services | 17 |
| Active Microservices | 17 |
| API Endpoints | 150+ |
| Event Types | 45+ |
| SLA Uptime | 99.9% |
| Avg Response Time | <100ms |

---

## Service Registry

### Core Services (7)

| # | Service Name | Port | Purpose | Status |
|---|--------------|------|---------|--------|
| 1 | gateway-service | 3000 | API Gateway, routing, rate limiting | Active |
| 2 | auth-service | 3001 | Authentication, authorization, JWT | Active |
| 3 | user-service | 3002 | User management, profiles | Active |
| 4 | order-service | 3003 | Order processing, lifecycle | Active |
| 5 | payment-service | 3004 | Payment processing, reconciliation | Active |
| 6 | wallet-service | 3005 | Digital wallet, balances | Active |
| 7 | hotel-service | 3006 | Hotel inventory, rooms | Active |

### AI & Intelligence Services (3)

| # | Service Name | Port | Purpose | Status |
|---|--------------|------|---------|--------|
| 8 | rez-mind | 3007 | AI intent capture, NLU | Active |
| 9 | insights-service | 3008 | AI insight storage, delivery | Active |
| 10 | automation-service | 3009 | Rule engine, triggers | Active |

### Business Services (4)

| # | Service Name | Port | Purpose | Status |
|---|--------------|------|---------|--------|
| 11 | inventory-service | 3010 | Inventory management | Active |
| 12 | analytics-service | 3011 | Analytics, reporting | Active |
| 13 | booking-engine | 3012 | Booking orchestration | Active |
| 14 | notification-service | 3013 | Notifications, emails | Active |

### Support Services (3)

| # | Service Name | Port | Purpose | Status |
|---|--------------|------|---------|--------|
| 15 | logging-service | 3014 | Centralized logging | Active |
| 16 | monitoring-service | 3015 | Metrics, alerting | Active |
| 17 | config-service | 3016 | Configuration management | Active |

---

## Architecture Diagram

```
╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                 ReZ ECOSYSTEM - 17 SERVICES                                          ║
╠════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                                             ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                                                    EXTERNAL CLIENTS                                                │  ║
║  │                   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │  ║
║  │                   │   Mobile    │     │     Web     │     │   Admin     │     │  Partner    │                    │  ║
║  │                   │     App     │     │    App      │     │   Portal    │     │    APIs     │                    │  ║
║  │                   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                    │  ║
║  └───────────────────────────┼───────────────────┼───────────────────┼───────────────────┼──────────────────────────┘  ║
║                              │                   │                   │                   │                             ║
║                              └───────────────────┼───────────────────┘                   │                             ║
║                                                  ▼                                         │                             ║
║  ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║  ║                                              GATEWAY LAYER                                                        ║  ║
║  ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║                                                      │                                                                 ║
║                                              ┌───────┴───────┐                                                      ║
║                                              │               │                                                      ║
║                                       ┌──────┴─────┐  ┌──────┴─────┐                                               ║
║                                       │  Gateway   │  │   Auth     │                                               ║
║                                       │  Service   │  │  Service   │                                               ║
║                                       │   :3000    │  │   :3001    │                                               ║
║                                       └────────────┘  └──────┬─────┘                                               ║
║                                                              │                                                       ║
║  ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║  ║                                           CORE BUSINESS SERVICES                                                  ║  ║
║  ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║                                                              │                                                       ║
║          ┌───────────────────┐  ┌───────────────────┐  ┌──────┴──────┐  ┌───────────────────┐                        ║
║          │    User Service   │  │  Order Service   │  │   Payment  │  │  Wallet Service   │                        ║
║          │      :3002        │  │      :3003       │  │   Service  │  │      :3005        │                        ║
║          │                   │  │                   │  │    :3004   │  │                   │                        ║
║          │  ┌─────────────┐  │  │  ┌─────────────┐  │  │            │  │  ┌─────────────┐  │                        ║
║          │  │   Users    │  │  │  │   Orders   │  │  │  ┌──────┐  │  │  │  Balances  │  │                        ║
║          │  │   Profile  │  │  │  │   Items    │  │  │  │PayPal│  │  │  │  Tx History │  │                        ║
║          │  │  Addresses │  │  │  │  Shipping  │  │  │  │Stripe│  │  │  │  Transfers  │  │                        ║
║          │  │  Loyalty   │  │  │  │   Status   │  │  │  │Venmo │  │  │  │   Limits    │  │                        ║
║          │  └─────────────┘  │  │  └─────────────┘  │  │  └──────┘  │  │  └─────────────┘  │                        ║
║          └───────────────────┘  └───────────────────┘  └────────────┘  └───────────────────┘                        ║
║                   │                    │                    │                    │                               ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║  ║                                  AI & INTELLIGENCE LAYER                                                           ║  ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║                                              │                                                                        ║
║          ┌───────────────────┐  ┌────────────┴────────────┐  ┌───────────────────┐                                   ║
║          │    ReZ Mind      │  │   insights-service     │  │ automation-service │                                   ║
║          │      :3007       │  │        :3008            │  │       :3009        │                                   ║
║          │                  │  │                        │  │                    │                                   ║
║          │  ┌─────────────┐ │  │  ┌─────────────────┐  │  │  ┌─────────────┐  │                                   ║
║          │  │   Intent    │ │  │  │    Insights     │  │  │  │    Rules    │  │                                   ║
║          │  │   Capture   │ │  │  │    Storage     │  │  │  │   Engine   │  │                                   ║
║          │  │  NLU Engine │ │  │  │    Delivery    │  │  │  │   Executor  │  │                                   ║
║          │  │  Context    │ │  │  │    Analytics   │  │  │  │   Logging   │  │                                   ║
║          │  └─────────────┘ │  │  └─────────────────┘  │  │  └─────────────┘  │                                   ║
║          └────────┬─────────┘  └───────────┬──────────┘  └─────────┬─────────┘                                   ║
║                   │                        │                        │                                             ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║  ║                                     EVENT BUS                                                                       ║  ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║                                              │                                                                        ║
║          ┌───────────────────────────────────┼───────────────────────────────────────────────────────────────────┐    ║
║          │                                   │                                                                   │    ║
║          ▼                                   ▼                                                                   ▼    ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║  ║                                          BUSINESS SERVICES                                                        ║  ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║          │                                   │                                                                   │    ║
║          ▼                                   ▼                                                                   ▼    ║
║  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                    ║
║  │   Inventory   │  │   Analytics   │  │   Booking    │  │ Notification  │  │    Hotel      │                    ║
║  │   Service    │  │   Service     │  │   Engine     │  │   Service     │  │   Service     │                    ║
║  │    :3010     │  │    :3011     │  │    :3012     │  │    :3013     │  │    :3006     │                    ║
║  │               │  │               │  │               │  │               │  │               │                    ║
║  │  ┌─────────┐ │  │  ┌─────────┐ │  │  ┌─────────┐ │  │  ┌─────────┐ │  │  ┌─────────┐ │                    ║
║  │  │ Products│ │  │  │ Reports │ │  │  │ Bookings│ │  │  │  Email  │ │  │  │  Rooms   │ │                    ║
║  │  │  Stock  │ │  │  │ Metrics │ │  │  │ Calendar│ │  │  │   SMS   │ │  │  │  Pricing │ │                    ║
║  │  │ Suppliers│ │  │  │ Dashboard│ │  │  │  Guest  │ │  │  │  Push   │ │  │  │  Bookings│ │                    ║
║  │  │ Warehouses│ │  │  │  Export │ │  │  │  History│ │  │  │ Templates│ │  │  │  Check-in│ │                    ║
║  │  └─────────┘ │  │  └─────────┘ │  │  └─────────┘ │  │  └─────────┘ │  │  └─────────┘ │                    ║
║  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘                    ║
║                                                                                                                      ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║  ║                                        SUPPORT SERVICES                                                           ║  ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║          │                                   │                                                                   │    ║
║          ▼                                   ▼                                                                   ▼    ║
║  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                                                         ║
║  │   Logging     │  │   Monitoring  │  │    Config     │                                                         ║
║  │   Service     │  │   Service     │  │   Service     │                                                         ║
║  │    :3014     │  │    :3015     │  │    :3016     │                                                         ║
║  │               │  │               │  │               │                                                         ║
║  │  ┌─────────┐ │  │  ┌─────────┐ │  │  ┌─────────┐ │                                                         ║
║  │  │  Logs   │ │  │  │ Metrics │ │  │  │   Env   │ │                                                         ║
║  │  │ Traces │ │  │  │ Alerts  │  │  │  │ Secrets │ │                                                         ║
║  │  │Search  │ │  │  │Dashboard│ │  │  │Versions │ │                                                         ║
║  │  └─────────┘ │  │  └─────────┘ │  │  └─────────┘ │                                                         ║
║  └───────────────┘  └───────────────┘  └───────────────┘                                                         ║
║                                                                                                                      ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║  ║                                          DATA LAYER                                                                ║  ║
║  ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════  ║
║                                                                                                                      ║
║        ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐               ║
║        │   PostgreSQL    │     │     Redis        │     │   Elasticsearch │     │     MongoDB      │               ║
║        │                  │     │                  │     │                  │     │                  │               ║
║        │  ┌────────────┐ │     │  ┌────────────┐  │     │  ┌────────────┐  │     │  ┌────────────┐  │               ║
║        │  │  users_db  │ │     │  │   Cache    │  │     │  │  Logs      │  │     │  │ Sessions   │  │               ║
║        │  │  orders_db │ │     │  │  Sessions  │  │     │  │  Search    │  │     │  │  Analytics │  │               ║
║        │  │ payments_db│ │     │  │  Rate Limit │ │     │  │             │  │     │  │             │  │               ║
║        │  │ insights_db │ │     │  │  Queues     │  │     │  │             │  │     │  │             │  │               ║
║        │  │ hotel_db    │ │     │  └────────────┘  │     │  └────────────┘  │     │  └────────────┘  │               ║
║        │  └────────────┘ │     │                  │     │                  │     │                  │               ║
║        └──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘               ║
║                                                                                                                      ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Service Details

### 1. Gateway Service (Port 3000)

**Purpose**: Central API gateway handling routing, rate limiting, authentication, and request transformation.

**Responsibilities**:
- Request routing to appropriate services
- JWT token validation
- Rate limiting per user/IP
- Request/response logging
- SSL termination
- CORS handling

**Endpoints**: All external API traffic

### 2. Auth Service (Port 3001)

**Purpose**: Authentication and authorization service.

**Responsibilities**:
- User login/logout
- JWT token generation
- OAuth providers integration
- Password reset flow
- Session management
- Permission management

### 3. User Service (Port 3002)

**Purpose**: User management and profiles.

**Responsibilities**:
- User CRUD operations
- Profile management
- Address management
- Loyalty program
- User preferences

### 4. Order Service (Port 3003)

**Purpose**: Order processing and lifecycle management.

**Responsibilities**:
- Order creation
- Order updates
- Order status tracking
- Order history
- Cancellation handling
- Refund initiation

### 5. Payment Service (Port 3004)

**Purpose**: Payment processing and reconciliation.

**Responsibilities**:
- Payment initiation
- Payment confirmation
- Payment failure handling
- Refund processing
- Payment reconciliation
- Multiple payment gateway integration

### 6. Wallet Service (Port 3005)

**Purpose**: Digital wallet management.

**Responsibilities**:
- Balance management
- Fund transfers
- Transaction history
- Withdrawal processing
- Deposit handling
- Wallet limits

### 7. Hotel Service (Port 3006)

**Purpose**: Hotel inventory and room management.

**Responsibilities**:
- Room availability
- Pricing management
- Booking management
- Check-in/out processing
- Room status tracking
- Hotel profile management

### 8. ReZ Mind (Port 3007)

**Purpose**: AI-powered intent capture and natural language understanding.

**Responsibilities**:
- Intent detection
- Entity extraction
- Context management
- Conversation handling
- AI response generation
- Pattern analysis

### 9. Insights Service (Port 3008) - NEW

**Purpose**: Stores and delivers AI-generated insights from ReZ Mind.

**Responsibilities**:
- Insight storage and retrieval
- Insight categorization
- User notification
- Insight analytics
- Copilot UI integration
- Insight preferences

**Key Features**:
- Real-time insight delivery
- Personalized recommendations
- Predictive analytics storage
- Actionable insights

### 10. Automation Service (Port 3009) - NEW

**Purpose**: Rule-based automation engine for business process automation.

**Responsibilities**:
- Rule management
- Event processing
- Action execution
- Webhook handling
- Email automation
- Workflow triggers

**Built-in Rules**:
- Customer churn prevention
- Inventory alerts
- Dynamic pricing
- Payment failure recovery
- Loyalty points processing
- Fraud detection
- Welcome series
- Subscription reminders

### 11. Inventory Service (Port 3010)

**Purpose**: Inventory management and tracking.

**Responsibilities**:
- Product catalog
- Stock tracking
- Supplier management
- Reorder alerts
- Warehouse management
- Multi-location support

### 12. Analytics Service (Port 3011)

**Purpose**: Analytics, reporting, and business intelligence.

**Responsibilities**:
- Data aggregation
- Report generation
- Metrics calculation
- Dashboard data
- Data export
- Trend analysis

### 13. Booking Engine (Port 3012)

**Purpose**: Booking orchestration across services.

**Responsibilities**:
- Multi-service booking
- Calendar management
- Availability checking
- Booking conflicts
- Confirmation handling
- Booking modifications

### 14. Notification Service (Port 3013)

**Purpose**: Multi-channel notification delivery.

**Responsibilities**:
- Email notifications
- SMS messaging
- Push notifications
- In-app notifications
- Notification templates
- Delivery tracking

### 15. Logging Service (Port 3014)

**Purpose**: Centralized logging infrastructure.

**Responsibilities**:
- Log aggregation
- Log search
- Log retention
- Log analysis
- Compliance logging

### 16. Monitoring Service (Port 3015)

**Purpose**: System monitoring and alerting.

**Responsibilities**:
- Metrics collection
- Alerting
- Health checks
- Performance monitoring
- Uptime tracking
- SLA reporting

### 17. Config Service (Port 3016)

**Purpose**: Configuration management.

**Responsibilities**:
- Environment configuration
- Secret management
- Feature flags
- Configuration versioning
- Config distribution

---

## Data Flow

### Order-to-Payment Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│  Order  │───▶│ Payment │───▶│ Wallet  │───▶│  Order  │───▶│   User  │
│  Action  │    │ Service │    │ Service │    │ Service │    │ Update  │    │ Notified │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │              │              │                            │
                     │              │              │                            │
                     ▼              ▼              ▼                            ▼
              Event: order.created  Event: payment.initiated  Event: wallet.debited  Event: order.completed
```

### AI Insight Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│  ReZ     │───▶│Insights │───▶│Copilot  │───▶│Analytics │───▶│ User     │
│  Query   │    │  Mind    │    │ Service │    │   UI     │    │ Service  │    │ Dashboard│
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │              │                            │
                     │              │                            │
                     ▼              ▼                            ▼
              Intent captured  Insight stored  Insight displayed  Insight consumed
```

### Automation Trigger Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Business │───▶│  Event  │───▶│Automate │───▶│  Rule    │───▶│ Action   │───▶│External  │
│  Event   │    │   Bus    │    │ Service │    │  Engine  │    │ Executor │    │ Systems  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                          │
                                                                          ▼
                                                                   ┌──────────┐
                                                                   │  User    │
                                                                   │ Notified │
                                                                   └──────────┘
```

---

## Technology Stack

### Languages & Frameworks

| Service Category | Language | Framework |
|------------------|----------|-----------|
| Core Services | Node.js | Express.js |
| AI Services | Python | FastAPI |
| Event Processing | Node.js | NestJS |
| Data Services | Go | Fiber |
| Analytics | Python | Django |

### Databases

| Database | Purpose | Services Using |
|----------|---------|----------------|
| PostgreSQL | Primary datastore | All core services |
| Redis | Caching, sessions | Gateway, Auth, User |
| Elasticsearch | Search, logs | Logging, Analytics |
| MongoDB | Analytics, sessions | Analytics, User |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Container Orchestration | Kubernetes |
| Service Mesh | Istio |
| API Gateway | Kong/Nginx |
| Message Broker | RabbitMQ |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Logging | ELK Stack |
| Secrets | HashiCorp Vault |

---

## Communication Patterns

### Synchronous Communication (REST)

Used for:
- User-facing API calls
- Real-time responses required
- Simple queries

Pattern: HTTP/REST with JSON

### Asynchronous Communication (Events)

Used for:
- Cross-service notifications
- Event-driven workflows
- Analytics data

Pattern: Event Bus with JSON messages

### Event Schema Example

```json
{
  "eventId": "uuid-v4",
  "eventType": "order.created",
  "source": "order-service",
  "timestamp": "2026-05-01T10:00:00Z",
  "version": "1.0",
  "payload": {
    "orderId": "uuid",
    "userId": "uuid",
    "total": 150.00,
    "currency": "USD",
    "items": []
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-05-01 | Added insights-service and automation-service, updated to 17 services |
| 1.0.0 | 2025-12-15 | Initial 15 services documentation |

---

*Last updated: 2026-05-01*
*Maintained by: ReZ Engineering Team*
