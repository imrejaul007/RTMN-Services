# RTNM-Group Source of Truth (SOT)

> **Last Updated:** 2026-05-13
> **Version:** 3.0.0
> **Status:** Active

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Service Catalog](#2-service-catalog)
3. [Security Architecture](#3-security-architecture)
4. [Database Schemas](#4-database-schemas)
5. [API Reference](#5-api-reference)
6. [Service Connections](#6-service-connections)
7. [Deployment Guide](#7-deployment-guide)
8. [Environment Variables](#8-environment-variables)
9. [Troubleshooting](#9-troubleshooting)
10. [Cross-Platform References](#10-cross-platform-references)
11. [Documentation Index](#11-documentation-index)

---

## 1. Platform Overview

### 1.1 What is RTNM-Group?

**RTNM-Group** is the **Controls & Financial Layer** of the ReZ Commerce OS, providing:
- Identity management across all apps
- Access control (RBAC/ABAC)
- Merchant capital lending
- Buy Now Pay Later (BNPL)
- Compliance & GDPR
- Operations monitoring

### 1.2 Ecosystem Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         9-COMPANY ECOSYSTEM                                │
├─────────────┬─────────────┬─────────────┬─────────────┬───────────────────┤
│ RTNM-Group │RABTUL-Tech │REZ-Intel.  │ REZ-Media  │ 7 More           │
│ Controls   │Auth/Gateway │AI/ML       │Ads/Loyalty │                   │
│ + Finance  │Payments     │Intelligence │            │                   │
├─────────────┴─────────────┴─────────────┴─────────────┴───────────────────┤
│                                                                           │
│   150+ Services  •  200+ Deployments  •  10 Industry Verticals           │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Service Count

| Company | Services | Documentation |
|---------|----------|---------------|
| **RTNM-Group** | 22 | `SOT/SOURCE_OF_TRUTH.md` |
| **RABTUL-Technologies** | 40 | `RABTUL-Technologies/docs/SERVICES.md` |
| **REZ-Intelligence** | 60+ | `REZ-Intelligence/docs/SERVICES.md` | | Controls + Financial |
| RABTUL-Technologies | 30 | Infrastructure |
| REZ-Intelligence | 60+ | AI/ML Platform |
| REZ-Media | 15+ | Advertising |
| REZ-Merchant | 25+ | Industry OS |
| REZ-Consumer | 10+ | Consumer Apps |
| StayOwn-Hospitality | 20+ | Hotels |
| CorpPerks | 15+ | Enterprise |
| RTNM-Digital | 10+ | Trust/Ops |

---

## 2. Service Catalog

### 2.1 Identity & Security Services

#### REZ-identity-service
| Attribute | Value |
|-----------|-------|
| **Port** | 3003 |
| **Database** | MongoDB (rez_identity_service) |
| **Cache** | Redis |
| **Purpose** | Unified identity across all apps |

**API Endpoints:**
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/v1/identity` | Create identity |
| GET | `/api/v1/identity/:id` | Get identity |
| PUT | `/api/v1/identity/:id` | Update identity |
| DELETE | `/api/v1/identity/:id` | Soft delete |
| POST | `/api/v1/resolve` | Resolve by email/phone |
| POST | `/api/v1/link` | Link identities |
| GET | `/api/v1/identity/trust/:clusterId` | Trust score |
| POST | `/api/v1/identity/fraud/check` | Fraud check |

**Identity Types:**
- `app_user` - App user
- `whatsapp` - WhatsApp user
- `web` - Web user
- `qr` - QR code scan
- `device` - Device fingerprint
- `wallet` - Wallet user
- `phone` - Phone number
- `email` - Email address
- `merchant` - Merchant
- `staff` - Staff member
- `admin` - Admin user

---

#### REZ-access-control-service
| Attribute | Value |
|-----------|-------|
| **Port** | 3000 |
| **Database** | In-Memory + Redis |
| **Purpose** | RBAC/ABAC permission engine |

**API Endpoints:**
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/v1/access/check` | Check permission |
| GET | `/api/v1/users/:id/permissions` | Get permissions |
| GET | `/api/v1/roles` | List roles |
| GET | `/api/v1/policies` | List policies |
| POST | `/api/v1/policies` | Create policy |
| GET | `/api/v1/audit/logs` | Query audit |

**Default Roles:**
| Role | Permissions |
|------|-------------|
| `superadmin` | All resources, all actions |
| `admin` | Explicit per-resource permissions |
| `editor` | read, write, update on docs/media |
| `viewer` | read only |
| `guest` | limited read |

---

#### REZ-central-permissions
| Attribute | Value |
|-----------|-------|
| **Port** | 3001 |
| **Database** | Redis |
| **Purpose** | Hybrid RBAC/ABAC with API keys |

**Features:**
- Multi-tenant support (Merchant/Consumer/Staff/Admin)
- API key authentication
- Redis caching
- 10+ Policy templates

---

### 2.2 Finance Services

#### REZ-capital-service
| Attribute | Value |
|-----------|-------|
| **Port** | 3005 |
| **Database** | MongoDB (rez_capital) |
| **Purpose** | Merchant working capital lending |

**API Endpoints:**
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/credit/:merchantId` | Credit profile |
| GET | `/api/credit/:merchantId/score` | Credit score (300-900) |
| GET | `/api/credit/:merchantId/limit` | Credit limit |
| POST | `/api/loans/apply` | Apply for loan |
| POST | `/api/loans/:id/approve` | Approve loan |
| POST | `/api/loans/:id/disburse` | Disburse funds |
| POST | `/api/repayments/process` | Process repayment |

**Loan Types:**
- `revenue_advance` - Short-term advance
- `term_loan` - Fixed term loan
- `credit_line` - Revolving credit

**NBFC Partners:**
- Capital Float
- PineLabs
- Indifi
- LendingKart

**Credit Score Formula:**
```
Base: 500
+ Payment history: 0-200 points
+ Revenue impact: 0-100 points
- High utilization (>80%): -50
- Each default: -30
- Each late payment: -5
```

---

#### REZ-bnpl-service
| Attribute | Value |
|-----------|-------|
| **Port** | 3080 |
| **Database** | MongoDB (rez_bnpl) |
| **Queue** | BullMQ/Redis |
| **Purpose** | Buy Now Pay Later |

**API Endpoints:**
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/bnpl/apply` | Apply for BNPL |
| POST | `/api/bnpl/repay` | Make repayment (idempotent) |
| POST | `/api/bnpl/calculate` | EMI calculator |
| GET | `/api/bnpl/status/:id` | Check status |

**Tenures & Rates:**
| Tenure | Interest Rate |
|--------|--------------|
| 3 months | 12% APR |
| 6 months | 15% APR |
| 9 months | 18% APR |
| 12 months | 21% APR |

**EMI Formula:**
```
EMI = [P × R × (1+R)^N] / [(1+R)^N - 1]

Where:
P = Principal
R = Monthly rate (annual/12/100)
N = Tenure in months
```

**Auto-Approval:** Credit score ≥ 700

---

#### REZ-financial-ledger-platform
| Attribute | Value |
|-----------|-------|
| **Purpose** | Double-entry accounting |

**Features:**
- ASC 606/IFRS 15 revenue recognition
- Multi-currency support (Decimal.js)
- Payout management
- Settlement reconciliation

---

#### rez-payment-links-service
| Attribute | Value |
|-----------|-------|
| **Port** | 4018 |
| **Database** | MongoDB |
| **Purpose** | UPI payment links |

**API Endpoints:**
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/v1/links` | Create payment link |
| GET | `/api/v1/links/:id/status` | Check status |
| GET | `/api/v1/links/:id/qrcode` | Get QR code |
| POST | `/api/v1/links/:id/share` | Share via SMS/WhatsApp |
| POST | `/api/v1/links/:id/refund` | Initiate refund |

---

### 2.2 Finance Services (Continued)

#### RidZa Platform (Lead Distribution)
| Attribute | Value |
|-----------|-------|
| **Port** | 4500-4504 |
| **Location** | `RTNM-Group/rez-ridza-platform/` |
| **Purpose** | Lead distribution like PolicyBazaar + Paisabazaar |

**Services:**
| Service | Port | Description |
|---------|------|-------------|
| `ridza-core` | 4500 | Lead engine, eligibility, matching |
| `ridza-partner-api` | 4501 | Partner integrations (banks/NBFCs) |
| `ridza-agent-portal` | 4502 | DSA/agent dashboard |
| `ridza-corpperks-hub` | 4503 | CorpPerks employee finance |
| `ridza-intelligence` | 4504 | REZ Intelligence integration |

**API Endpoints (ridza-core:4500):**
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/ridza/leads` | Create lead |
| GET | `/api/ridza/leads` | List leads |
| GET | `/api/ridza/leads/:id` | Get lead |
| GET | `/api/ridza/products` | List products |
| GET | `/api/ridza/products/match/:userId` | Match products |
| GET | `/api/ridza/eligibility/:userId` | Check eligibility |

**Revenue Model:**
| Product | Agent Commission |
|---------|----------------|
| Personal Loan | 0.5-2% of loan |
| Credit Card | ₹200-500/approval |
| Insurance | 15-40% of first year premium |

**Uses Existing:**
- `rez-wallet-service:4004` → Credit scoring
- `REZ Signal Aggregator:4142` → User signals
- `REZ Fraud Agent:3007` → Risk scoring

---

### 2.3 Admin & Operations

#### rez-admin-service
| Attribute | Value |
|-----------|-------|
| **Port** | 4003 |
| **Database** | MongoDB |
| **Purpose** | Admin authentication & management |

**API Endpoints:**
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/register` | Register admin |
| GET | `/api/auth/me` | Current user |
| GET | `/api/users` | List admins |
| GET | `/api/audit-logs` | Query logs |
| GET | `/api/stats` | System statistics |

---

#### REZ-ops-dashboard
| Attribute | Value |
|-----------|-------|
| **Port** | 4032 |
| **Database** | MongoDB |
| **Purpose** | Feature flags & monitoring |

**Feature Flags:**
```javascript
learning_enabled       // ML features
adaptive_enabled       // Adaptive decisions
personalization_enabled // Personalization
ads_enabled           // Targeted ads
auto_execute_safe      // Auto-execute SAFE decisions
```

---

#### REZ-compliance-platform
| Attribute | Value |
|-----------|-------|
| **Purpose** | GDPR/DPDP compliance |

**Features:**
- Consent management
- Data subject rights
- Audit trails
- Data retention policies

---

### 2.4 REE (ReZ Economic Engine)

#### Overview
REE is the business rule engine managing economic calculations:

| Component | Purpose |
|-----------|---------|
| REE-Admin | Rule management UI |
| REE-Dashboard | Unified dashboard |
| REZ-Admin-REE-Dashboard | Mobile admin |
| REE-Monitoring | System monitor |

#### Rule Types
| Type | Example |
|------|---------|
| `commission` | 12% platform fee |
| `cashback` | 10% order cashback |
| `reward` | Referral bonus |
| `karma` | Behavior scoring |
| `fraud_check` | Risk assessment |

#### Coin Types
- **REZ** - Platform currency
- **CASHBACK** - User rewards
- **PROMO** - Promotional
- **KARMA** - Behavior points
- **BRANDED** - Partner coins

---

## 3. Security Architecture

### 3.1 Authentication

#### User Authentication (JWT)
```
Bearer Token Format:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature

Payload:
{
  sub: "user_id",
  role: "user",
  iat: 1234567890,
  exp: 1234571490,
  iss: "rez-auth"
}
```

#### Service Authentication (Internal Token)
```
Header: X-Internal-Token: <service-token>

Service Tokens Format:
INTERNAL_SERVICE_TOKENS_JSON={
  "admin-panel": "token-here",
  "payment-service": "token-here"
}
```

### 3.2 Security Headers Applied

| Header | Value |
|--------|-------|
| `helmet()` | Enabled (X-Frame-Options, CSP, etc.) |
| `HSTS` | max-age=31536000; includeSubDomains; preload |
| `CORS` | Explicit origins only, no wildcards |
| `Rate Limit` | 100 req/min global, per-endpoint limits |

### 3.3 Rate Limits

| Service | Limit | Window |
|---------|-------|--------|
| Global | 100 | 1 minute |
| OTP Send | 5 | 1 minute |
| OTP Verify | 5 | 1 minute |
| BNPL Repay | 60 | 1 minute |
| Publish Events | 50 | 1 minute |

### 3.4 Security Fixes Applied (2026-05-12)

| Issue | File | Fix |
|-------|------|-----|
| JWT signature verification | jwtValidation.ts | Added jose library verification |
| Hardcoded MongoDB credentials | ops-dashboard | Removed, now env var |
| Default identity salt | identity-service | Fails in production if missing |
| CORS wildcard | multiple | Rejects `*` in production |
| ReDoS vulnerability | identity.service.ts | Regex escaping |
| Webhook stubbed | partnerService.ts | HMAC-SHA256 verification |
| Redis KEYS blocking | EventBusService.ts | SCAN instead of KEYS |
| Timing attacks | multiple | timingSafeEqual comparison |

---

## 4. Database Schemas

### 4.1 MongoDB Collections

#### Identity Service
```javascript
// identities collection
{
  _id: ObjectId,
  identityId: String,        // Unique identity ID
  type: String,             // app_user, phone, email, etc.
  hashIdentifier: String,    // SHA256(identifier + salt)
  clusterId: String,        // Links to cluster
  status: String,           // active, inactive, deleted
  metadata: {
    source: String,
    platform: String,
    appVersion: String,
    traits: Object
  },
  createdAt: Date,
  updatedAt: Date
}

// clusters collection
{
  _id: ObjectId,
  clusterId: String,
  primaryIdentityId: String,
  status: String,            // active, merged, flagged
  identityCount: Number,
  confidence: String,        // high, medium, low
  createdAt: Date
}

// trust_scores collection
{
  _id: ObjectId,
  clusterId: String,
  score: Number,            // 0-100
  level: String,            // VERY_HIGH, HIGH, MEDIUM, LOW, VERY_LOW
  factors: {
    identityVerification: Number,
    kycStatus: Number,
    transactionHistory: Number,
    karmaScore: Number
  },
  lastCalculated: Date
}
```

#### Capital Service
```javascript
// loans collection
{
  _id: ObjectId,
  loanId: String,
  merchantId: String,
  type: String,             // revenue_advance, term_loan, credit_line
  amount: Number,
  disbursedAmount: Number,
  interestRate: Number,
  tenure: Number,
  status: String,           // pending, approved, disbursed, repaid, defaulted
  repaymentSchedule: [{
    dueDate: Date,
    amount: Number,
    principal: Number,
    interest: Number,
    status: String
  }],
  partnerRef: String,
  createdAt: Date
}

// merchant_health collection
{
  _id: ObjectId,
  merchantId: String,
  healthScore: Number,      // 0-100
  creditScore: Number,      // 300-900
  creditLimit: Number,
  utilizedAmount: Number,
  availableCredit: Number,
  riskRating: String,      // LOW, MEDIUM, HIGH, VERY_HIGH
  monthlyRevenue: Number,
  orderCount: Number,
  avgOrderValue: Number,
  onTimePayments: Number,
  latePayments: Number,
  defaults: Number
}
```

#### BNPL Service
```javascript
// bnpl_applications collection
{
  _id: ObjectId,
  applicationId: String,
  userId: String,
  merchantId: String,
  orderId: String,
  amount: Number,
  tenure: Number,           // 3, 6, 9, 12
  status: String,          // pending, approved, active, repaid, defaulted
  interestRate: Number,
  emiSchedule: [{
    emiNumber: Number,
    dueDate: Date,
    amount: Number,
    principal: Number,
    interest: Number,
    status: String,
    paidAt: Date
  }],
  payments: [{
    emiNumber: Number,
    amount: Number,
    transactionId: String,
    paidAt: Date
  }],
  createdAt: Date
}
```

### 4.2 Redis Keys

| Pattern | Type | Purpose |
|---------|------|---------|
| `ratelimit:*` | Sorted Set | Rate limiting |
| `idempotency:*` | String | Idempotency keys |
| `session:*` | Hash | User sessions |
| `token:blacklist:*` | String | JWT blacklist |
| `subscription:*` | Hash | Event subscriptions |
| `events:*` | String | Event history |

---

## 5. API Reference

### 5.1 OpenAPI Specification

**Location:** `docs/openapi.yaml`

**Quick Import:**
```bash
# Import into Postman
postman import docs/openapi.yaml

# Generate client SDK
npx @openapitools/openapi-generator-cli generate -i docs/openapi.yaml
```

### 5.2 Postman Collection

**Location:** `docs/postman-collection.json`

**Collections:**
- Health Checks (6 services)
- Identity Service (10 requests)
- Access Control (8 requests)
- Capital Service (10 requests)
- BNPL Service (6 requests)
- Payment Links (6 requests)
- Ops Dashboard (4 requests)

### 5.3 Common Response Formats

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestId": "req_xxx"
}
```

### 5.4 Error Codes

| Code | Description |
|------|-------------|
| `MISSING_TOKEN` | X-Internal-Token header missing |
| `INVALID_TOKEN` | Token not recognized |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `VALIDATION_ERROR` | Invalid request parameters |
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Authentication required |

---

## 6. Service Connections

### 6.1 Dependency Graph

```
API Gateway
    │
    ├──► Auth Service (RABTUL)
    │        │
    │        └──► Redis (sessions)
    │        └──► MongoDB (users)
    │
    ├──► Identity Service
    │        │
    │        ├──► MongoDB (identities)
    │        └──► Redis (cache)
    │
    ├──► Access Control
    │        │
    │        ├──► Redis (permissions)
    │        └──► MongoDB (audit logs)
    │
    ├──► Capital Service
    │        │
    │        ├──► MongoDB (loans)
    │        ├──► NBFC Partners (Capital Float, PineLabs, etc.)
    │        └──► Wallet Service
    │
    ├──► BNPL Service
    │        │
    │        ├──► MongoDB (applications)
    │        └──► Redis (queues)
    │
    └──► Payment Service (RABTUL)
             │
             └──► Razorpay/Stripe
```

### 6.2 Internal Communication

**Header Format:**
```http
X-Internal-Token: <service-token>
X-Request-Id: <uuid>
X-Calling-Service: <service-name>
```

**Feature Flags:**
```bash
USE_NEW_INTENT_SERVICE=false
USE_NEW_COPILOT=false
USE_NEW_DECISION_SERVICE=false
USE_NEW_AD_PLATFORM=false
```

---

## 7. Deployment Guide

### 7.1 Docker

```bash
# Build image
docker build -t rtnm-identity-service .

# Run container
docker run -p 3003:3003 \
  -e MONGODB_URI=mongodb://... \
  -e REDIS_URL=redis://... \
  rtnm-identity-service
```

### 7.2 Docker Compose

```bash
# Start all services
docker-compose -f deploy/docker-compose.yml up -d

# Stop services
docker-compose -f deploy/docker-compose.yml down
```

### 7.3 Kubernetes

```bash
# Deploy identity service
kubectl apply -f deploy/k8s/identity-deployment.yaml

# Scale service
kubectl scale deployment identity-service --replicas=5

# Check pods
kubectl get pods -n rtnm-group
```

### 7.4 Render

```bash
# Deploy via blueprint
render blueprint apply -f deploy/render.yaml
```

### 7.5 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `INTERNAL_SERVICE_TOKENS_JSON` | Yes | Service authentication |
| `ALLOWED_ORIGINS` | Prod | CORS allowed origins |
| `IDENTITY_SALT` | Prod | Identity hashing salt |
| `JWT_SECRET` | Yes | JWT signing secret |
| `LOG_LEVEL` | No | Log level (default: info) |
| `NODE_ENV` | Yes | Environment (production/development) |

---

## 8. Environment Variables

### 8.1 Identity Service
```bash
IDENTITY_SALT=your-secure-random-salt
CORS_ORIGIN=https://rez.money,https://admin.rez.money
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 8.2 Capital Service
```bash
CAPITAL_FLOAT_API_KEY=xxx
CAPITAL_FLOAT_API_URL=https://api.capitalfloat.com/v2
PINELABS_API_KEY=xxx
INDIFI_API_KEY=xxx
LENDINGKART_API_KEY=xxx
```

### 8.3 Ops Dashboard
```bash
OPS_ADMIN_TOKEN=your-admin-token
MONGODB_URI=mongodb://...
```

---

## 9. Troubleshooting

### 9.1 Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check X-Internal-Token header |
| CORS error | Add origin to ALLOWED_ORIGINS |
| Rate limited | Wait and retry, check limit config |
| MongoDB connection | Check MONGODB_URI format |
| Redis connection | Check REDIS_URL format |

### 9.2 Health Check

```bash
curl http://localhost:3003/health
# Response: { "status": "ok", "service": "identity-service" }
```

### 9.3 Logs

```bash
# View recent logs
kubectl logs -n rtnm-group -l app=identity-service --tail=100

# Search for errors
kubectl logs -n rtnm-group -l app=identity-service | grep ERROR
```

---

## Appendix A: Port Reference

| Service | Port | Protocol |
|---------|------|----------|
| Identity Service | 3003 | HTTP |
| Access Control | 3000 | HTTP |
| Central Permissions | 3001 | HTTP |
| Capital Service | 3005 | HTTP |
| BNPL Service | 3080 | HTTP |
| Ops Dashboard | 4032 | HTTP |
| Payment Links | 4018 | HTTP |

## Appendix B: Related Documents

| Document | Location |
|----------|----------|
| Architecture Diagrams | `docs/ARCHITECTURE_DIAGRAMS.md` |
| OpenAPI Spec | `docs/openapi.yaml` |
| Postman Collection | `docs/postman-collection.json` |
| Security Audit | `docs/SECURITY_AUDIT.md` |
| Runbooks | `docs/RUNBOOKS.md` |
| Onboarding Guide | `docs/ONBOARDING.md` |
| Test Suite | `test/*.test.ts` |
| RABTUL-Technologies Docs | `RABTUL-Technologies/docs/SERVICES.md` |
| REZ-Intelligence Docs | `REZ-Intelligence/docs/SERVICES.md` |

## Appendix C: Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-05-13 | 3.0.0 | Full documentation complete, cross-platform refs added |
| 2026-05-12 | 2.0.0 | Security fixes, RBAC improvements |
| 2026-01-01 | 1.0.0 | Initial documentation |

---

## 10. Cross-Platform References

### 10.1 RABTUL-Technologies

**Location:** `/RABTUL-Technologies/`

**Full Documentation:** `RABTUL-Technologies/docs/SERVICES.md`

| Service | Port | Purpose |
|---------|------|---------|
| rez-auth-service | 4002 | Authentication (OTP, JWT, MFA) |
| rez-payment-service | 4001 | Payment processing (Razorpay, Stripe) |
| rez-wallet-service | 4004 | Digital wallet |
| rez-order-service | 4005 | Order management |
| rez-catalog-service | 4006 | Product catalog |
| rez-search-service | 4007 | Elasticsearch search |
| rez-profile-service | 4008 | User profiles |
| rez-notifications-service | 4009 | Push, SMS, Email |
| rez-analytics-service | 4010 | Business intelligence |
| REZ-observability-platform | 4015 | Monitoring & alerts |
| REZ-policy-engine | 4016 | Business rules |
| REZ-secrets-manager | 4017 | API key management |
| REZ-scheduler-service | 4020 | Cron jobs |

### 10.2 REZ-Intelligence

**Location:** `/REZ-Intelligence/`

**Full Documentation:** `REZ-Intelligence/docs/SERVICES.md`

| Service | Port | Purpose |
|---------|------|---------|
| REZ-reorder-engine | 4040 | Reorder predictions |
| REZ-taste-profile | 4041 | User preferences |
| REZ-demand-forecast | 4042 | Demand prediction |
| REZ-price-predictor | 4043 | Price optimization |
| REZ-identity-graph | 4050 | Identity resolution |
| REZ-memory-engine | 4051 | Agent memory |
| REZ-ai-router | 4052 | AI routing |
| REZ-knowledge-graph | 4060 | Knowledge base |
| REZ-merchant-brain | 4061 | Merchant insights |
| REZ-autonomous-agents | 4062 | 30 AI agents |
| REZ-payments-brain | 4070 | Payment intelligence |
| REZ-inventory-sync | 4071 | Inventory management |
| REZ-creator-network | 4072 | Creator marketplace |
| REZ-merchant-os | 4073 | Merchant OS |
| REZ-event-bus | 4031 | Event distribution |
| REZ-integration-sdk | 4091 | Unified SDK |
| REZ-unified-recommendations | 4090 | All recommendations |

### 10.3 Service Communication

```
Client Apps
    │
    ▼
API Gateway (RABTUL) ────────► Auth, Payment, Wallet, Order
    │
    ▼
RTNM-Group Services ◄───────── Identity, Capital, BNPL, Compliance
    │
    ▼
REZ-Intelligence ◄────────────── AI/ML, Recommendations, Events
```

### 10.4 Shared Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| MongoDB | Atlas | Primary database |
| Redis | Cloud | Cache, sessions, pub/sub |
| Sentry | sentry.io | Error tracking |
| Prometheus | Metrics | Metrics collection |
| Grafana | Dashboards | Visualization |

---

## 11. Documentation Index

### 11.1 RTNM-Group

| Document | Path |
|---------|------|
| Source of Truth | `SOT/SOURCE_OF_TRUTH.md` |
| Architecture Diagrams | `SOT/ARCHITECTURE_DIAGRAMS.md` |
| Security Audit | `docs/SECURITY_AUDIT.md` |
| Runbooks | `docs/RUNBOOKS.md` |
| Onboarding | `docs/ONBOARDING.md` |
| API Specification | `docs/openapi.yaml` |
| Postman Collection | `docs/postman-collection.json` |

### 11.2 RABTUL-Technologies

| Document | Path |
|---------|------|
| Services | `RABTUL-Technologies/docs/SERVICES.md` |

### 11.3 REZ-Intelligence

| Document | Path |
|---------|------|
| Services | `REZ-Intelligence/docs/SERVICES.md` |
| Complete Features | `REZ-Intelligence/docs/COMPLETE_FEATURES.md` |

### 11.4 Complete App Inventory

| Document | Path |
|----------|------|
| Complete Inventory | `docs/COMPLETE_APP_INVENTORY.md` |

### 11.5 Missing Services (TODO)

| Service | Status |
|---------|--------|
| REZ-trust-service | Scaffold - needs implementation |
| REZ-compliance-platform | Scaffold - needs implementation |
| REZ-financial-ledger-platform | Scaffold - needs implementation |

---

## 12. Security Fixes Applied (2026-05-14)

### 12.1 Summary

| Category | Services Fixed |
|----------|---------------|
| CORS explicit origins | 60+ |
| Rate limiting | 40+ |
| JWT validation | 15+ |
| MongoDB validation | 30+ |
| Input validation | 20+ |
| Circuit breakers | Implemented |
| Unit tests | 39+ |

### 12.2 Files Fixed

#### RTNM-Group (35+ files)
| Service | Fixes |
|---------|-------|
| `rez-corpperks-service` | CORS explicit origins |
| `REZ-identity-service` | Production CORS validation |
| `REZ-capital-service` | NBFC API validation |
| `shared-types/rez-automation-service` | CORS, rate limiting |
| `rez-support-dashboard` | CORS, credentials |
| `rez-admin-service` | JWT validation, MongoDB |

#### RABTUL-Technologies (45+ files)
| Service | Fixes |
|---------|-------|
| `api-gateway` | JWT validation, CORS |
| `rez-auth-service` | CORS wildcard check |
| All buzzlocal services | CORS, MongoDB validation |
| All major services | Rate limiting |

#### REZ-Intelligence (20+ files)
| Service | Fixes |
|---------|-------|
| `REZ-identity-bridge` | Env validation, rate limiting |
| `REZ-identity-graph` | Input sanitization |

### 12.3 New Security Components

| Component | Purpose |
|-----------|---------|
| `shared-types/src/utils/circuitBreaker.ts` | Fault tolerance |
| `shared-types/tsconfig.secure.json` | Strict TypeScript |
| `test/security.circuitBreaker.test.ts` | Security tests |
| `test/security.validation.test.ts` | Validation tests |

### 12.4 Security Patterns Implemented

```typescript
// CORS with explicit origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (!isProduction && origin.includes('localhost')) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error('Origin not allowed'));
};

// Circuit breaker
const breaker = new CircuitBreaker({ failureThreshold: 5, timeout: 1000 });
const result = await breaker.execute(() => callExternalService());
```

### 12.5 Test Coverage

| Category | Tests |
|----------|-------|
| Timing-safe comparison | 5 |
| Input validation | 8 |
| Rate limiting | 4 |
| CORS validation | 4 |
| JWT validation | 4 |
| Password strength | 4 |
| Circuit breaker | 10 |
| **Total** | **39+** |

---

**Document Owner:** Engineering Team
**Review Cycle:** Monthly
**Next Review:** 2026-06-13
**Security Audit Date:** 2026-05-14
**Status:** ALL CRITICAL ISSUES FIXED
