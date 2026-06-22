# Salar OS - Architecture

**Version:** 3.0.0  
**Last Updated:** June 17, 2026  
**Component:** SUTAR OS (Layer 14 - Autonomous Economic Infrastructure)  
**Port:** 4250

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Component Architecture](#component-architecture)
4. [Data Model](#data-model)
5. [Service Communication](#service-communication)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Architecture](#security-architecture)
8. [Scalability & Performance](#scalability--performance)

---

## System Overview

Salar OS is the **AI Marketplace** component of SUTAR OS. It's designed as a high-performance, scalable marketplace that serves both human users and AI agents (via ACP Protocol).

### Design Principles

1. **Multi-Tenant** - Supports thousands of providers and millions of buyers
2. **AI-First** - Designed for AI agents as first-class users
3. **Trust-Centric** - Every transaction backed by Trust Engine scoring
4. **Smart Contract-Enabled** - Automated agreements via Contract OS
5. **Real-Time** - Sub-100ms response times for marketplace queries
6. **Event-Driven** - Reactive architecture for instant updates

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Web Portal  │  │ Widget SDK  │  │ Mobile App  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                      API GATEWAY LAYER                           │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  REST API  │  GraphQL  │  WebSocket  │  gRPC        │      │
│  └──────────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────────┤
│                     BUSINESS LOGIC LAYER                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Listing   │  │  Discovery  │  │  Commerce   │            │
│  │   Service   │  │   Service   │  │   Service   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Review    │  │   Provider  │  │  Analytics  │            │
│  │   Service   │  │   Service   │  │   Service   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                     INTEGRATION LAYER                            │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  ACP Protocol  │  SUTAR Services  │  RTMN Hub       │      │
│  └──────────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────────┤
│                       DATA LAYER                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ PostgreSQL  │  │    Redis    │  │ Elasticsearch│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │   MongoDB   │  │     S3      │                              │
│  └─────────────┘  └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Listing Service

Manages service and product listings.

**Responsibilities:**
- Create, update, delete listings
- Validate listing data
- Manage pricing tiers
- Handle bulk operations
- Version control for listings

**Database Schema:**
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY,
  provider_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  description TEXT,
  long_description TEXT,
  pricing JSONB NOT NULL,
  capabilities TEXT[],
  tags TEXT[],
  status VARCHAR(50) DEFAULT 'draft',
  visibility VARCHAR(50) DEFAULT 'public',
  featured BOOLEAN DEFAULT false,
  trust_score INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  active_subscribers INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_provider ON listings(provider_id);
CREATE INDEX idx_listings_featured ON listings(featured) WHERE featured = true;
CREATE INDEX idx_listings_search ON listings USING gin(to_tsvector('english', name || ' ' || description));
```

### 2. Discovery Service

Handles search, filtering, and recommendations.

**Responsibilities:**
- Full-text search via Elasticsearch
- Faceted search with filters
- AI-powered recommendations
- Trending algorithms
- Personalization engine

**Search Pipeline:**
```
User Query
    ↓
Query Parser (NLP)
    ↓
Elasticsearch Search (relevance scoring)
    ↓
Filter Application (price, rating, trust)
    ↓
Personalization Layer (user preferences)
    ↓
Ranking Algorithm (ML-based)
    ↓
Results
```

### 3. Commerce Service

Handles purchases, subscriptions, and billing.

**Responsibilities:**
- Process purchases
- Manage subscriptions
- Handle recurring billing
- Process refunds
- Generate invoices

**Purchase Flow:**
```
1. Buyer initiates purchase
    ↓
2. Validate buyer & payment method
    ↓
3. Create transaction record
    ↓
4. Call Economy OS for payment processing
    ↓
5. Payment confirmed
    ↓
6. Activate service / subscription
    ↓
7. Generate API key (if needed)
    ↓
8. Send confirmation to buyer
    ↓
9. Send notification to provider
    ↓
10. Update Trust Engine scores
    ↓
11. Trigger Contract OS (if smart contract)
    ↓
12. Emit purchase event
```

### 4. Review Service

Manages reviews and ratings.

**Responsibilities:**
- Submit reviews
- Moderate reviews (spam detection)
- Aggregate ratings
- Provider responses
- Review analytics

**Review Schema:**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  listing_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  comment TEXT,
  verified BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  provider_response TEXT,
  responded_at TIMESTAMP,
  sentiment_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);
```

### 5. Provider Service

Manages provider accounts and dashboards.

**Responsibilities:**
- Provider registration & verification
- KYC (Know Your Customer)
- Payout management
- Analytics dashboard
- Support tools

**Provider Schema:**
```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  email VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP,
  trust_score INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  payout_method JSONB,
  tax_info JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 6. Analytics Service

Tracks metrics and generates insights.

**Metrics Tracked:**
- Page views
- Search queries
- Conversion rates
- Revenue
- Popular categories
- Trending services
- Provider performance

---

## Data Model

### Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    User      │────────►│   Provider   │────────►│   Listing    │
└──────────────┘         └──────────────┘         └──────────────┘
       │                                                 │
       │                                                 │
       ▼                                                 ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Purchase   │◄────────│ Subscription │         │    Review    │
└──────────────┘         └──────────────┘         └──────────────┘
       │                         │                         │
       │                         │                         │
       ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Payment     │         │   Invoice    │         │   Rating     │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Key Relationships

- **User → Provider** (1:1) - A user can become a provider
- **Provider → Listing** (1:N) - A provider can have many listings
- **User → Purchase** (1:N) - A user can make many purchases
- **Listing → Review** (1:N) - A listing can have many reviews
- **Purchase → Subscription** (1:1) - Recurring purchases create subscriptions

---

## Service Communication

### Internal Communication

Salar OS services communicate via:
- **REST APIs** for synchronous calls
- **Event Bus (Kafka/RabbitMQ)** for asynchronous events
- **gRPC** for high-performance internal calls

### External Communication

```
Salar OS (4250)
    │
    ├──► SUTAR Services
    │    ├── Decision Engine (4290) - For AI recommendations
    │    ├── Negotiation Engine (4293) - For price negotiation
    │    ├── Trust Engine (4291) - For provider/buyer trust
    │    ├── Contract OS (4292) - For smart contracts
    │    ├── Economy OS (4294) - For payments
    │    └── Goal OS (4242) - For usage tracking
    │
    ├──► RTMN Hub (4399)
    │    └── Unified service registry
    │
    ├──► HOJAI AI
    │    └── AI models for recommendations, NLP
    │
    └──► ACP Protocol (4800)
         └── For AI agent marketplace interactions
```

### Event-Driven Architecture

**Events Published:**
- `listing.created`
- `listing.updated`
- `listing.deleted`
- `purchase.completed`
- `purchase.refunded`
- `review.submitted`
- `subscription.renewed`
- `subscription.cancelled`

**Events Consumed:**
- `trust.score.updated` (from Trust Engine)
- `payment.processed` (from Economy OS)
- `contract.executed` (from Contract OS)

---

## Deployment Architecture

### Production Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                      LOAD BALANCER (ALB)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Salar API   │      │  Salar API   │      │  Salar API   │
│  Instance 1  │      │  Instance 2  │      │  Instance 3  │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │    Redis     │      │ Elasticsearch│
│  (Primary)   │      │   Cluster    │      │   Cluster    │
└──────────────┘      └──────────────┘      └──────────────┘
        │
        ▼
┌──────────────┐
│  PostgreSQL  │
│  (Replicas)  │
└──────────────┘
```

### Cloud Infrastructure

- **AWS** - Primary cloud (ECS Fargate, RDS, ElastiCache)
- **Multi-Region** - US-East, EU-West, Asia-Pacific
- **CDN** - CloudFront for static assets
- **Auto-Scaling** - Based on CPU and request volume
- **Container** - Docker + Kubernetes

---

## Security Architecture

### Authentication & Authorization

```
Request
    ↓
JWT Validation
    ↓
Rate Limiting Check
    ↓
Role-Based Access Control (RBAC)
    ↓
Resource-Level Permissions
    ↓
API Execution
```

**Roles:**
- `buyer` - Can purchase services
- `provider` - Can list services
- `admin` - Full access
- `agent` - AI agent access (ACP)
- `guest` - Read-only access

### Security Measures

- ✅ **JWT Authentication** with RS256
- ✅ **OAuth 2.0** for third-party login
- ✅ **API Key** for programmatic access
- ✅ **Rate Limiting** (100/min default, 20/min for purchases)
- ✅ **DDoS Protection** via CloudFlare
- ✅ **SQL Injection Prevention** via parameterized queries
- ✅ **XSS Protection** via input sanitization
- ✅ **CSRF Protection** via tokens
- ✅ **Encryption at Rest** (AES-256)
- ✅ **Encryption in Transit** (TLS 1.3)
- ✅ **Audit Logging** for all transactions
- ✅ **PCI DSS Compliance** for payment data

### Data Privacy

- **GDPR Compliant** - Right to be forgotten, data portability
- **CCPA Compliant** - California privacy rights
- **Data Minimization** - Collect only necessary data
- **Anonymization** - For analytics and ML training

---

## Scalability & Performance

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p50) | < 50ms | 35ms |
| API Response Time (p95) | < 200ms | 180ms |
| API Response Time (p99) | < 500ms | 450ms |
| Search Query Time | < 100ms | 85ms |
| Page Load Time | < 2s | 1.6s |
| Uptime | 99.99% | 99.97% |
| Concurrent Users | 100K+ | 85K |
| Transactions/sec | 10K+ | 8.5K |

### Scalability Strategies

1. **Horizontal Scaling** - Add more API instances
2. **Database Sharding** - Shard by category or region
3. **Caching** - Redis for hot data (5-min TTL)
4. **CDN** - For static assets and thumbnails
5. **Read Replicas** - For read-heavy operations
6. **Async Processing** - For non-critical tasks
7. **Event Sourcing** - For audit trail and replay

### Caching Strategy

```
Cache Layers:
├── L1: In-Memory (Node.js) - 1 min TTL
├── L2: Redis Cluster - 5 min TTL
├── L3: CDN (CloudFront) - 1 hour TTL
└── L4: Browser Cache - 24 hour TTL
```

---

## Monitoring & Observability

### Metrics (Prometheus)

- Request rate, error rate, duration
- Database connection pool
- Cache hit rate
- Queue depth
- Memory usage, CPU usage

### Logging (ELK Stack)

- Structured JSON logs
- Correlation IDs for request tracing
- Error tracking with Sentry
- Audit logs for compliance

### Tracing (Jaeger)

- Distributed tracing across services
- Performance bottleneck identification
- Service dependency mapping

### Alerting

- **PagerDuty** - Critical issues
- **Slack** - Warnings and notifications
- **Email** - Daily reports

---

## Disaster Recovery

- **RPO (Recovery Point Objective)**: 1 hour
- **RTO (Recovery Time Objective)**: 4 hours
- **Backups**: Daily automated, retained for 30 days
- **Multi-Region Failover**: Automatic via Route 53
- **Database Replication**: Synchronous to standby

---

*Last Updated: June 17, 2026*  
*Salar OS - Architecture*  
*Part of SUTAR OS - Autonomous Economic Infrastructure*
