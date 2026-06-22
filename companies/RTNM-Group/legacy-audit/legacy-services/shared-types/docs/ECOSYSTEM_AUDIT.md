# REZ Ecosystem — Technical & Business Audit

**Date:** 2026-04-29
**Status:** Internal Review
**Classification:** Confidential

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Strengths](#strengths)
4. [Critical Issues](#critical-issues)
5. [Technical Debt](#technical-debt)
6. [Security Assessment](#security-assessment)
7. [Scalability Risks](#scalability-risks)
8. [Missing Infrastructure](#missing-infrastructure)
9. [Business Risks](#business-risks)
10. [Recommendations](#recommendations)
11. [Priority Roadmap](#priority-roadmap)

---

## Executive Summary

REZ is a super-app infrastructure platform connecting multiple consumer and business-facing apps through shared backend services. It currently powers:

- **6 consumer/business apps:** REZ Now, NextaBiZ, Hotel OTA, Hotel Panel, Hotel PMS, Rendez
- **5 shared backend services:** Auth, Wallet, Payment, Merchant, Intent Graph
- **3 databases:** MongoDB (merchant/OTA), PostgreSQL (Rendez), Redis (sessions/cache)
- **6 OAuth2 partner integrations** enabling cross-app SSO

The architecture decisions are sound. The implementation has significant operational fragility. The ecosystem is held together by convention rather than discipline.

**Bottom line:** The product vision is strong. The infrastructure does not yet match the ambition.

---

## Architecture Overview

### Service Map

```
                    ┌─────────────────────────┐
                    │      REZ AUTH SERVICE    │
                    │  (OAuth2 · JWT · OTP)    │
                    │  rez-auth-service        │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   REZ WALLET    │   │   REZ PAYMENT    │   │ REZ INTENT GRAPH │
│   SERVICE       │   │   SERVICE        │   │   (AI RECS)      │
│                 │   │                 │   │                 │
│ wallet-holds    │   │ Razorpay/UPI    │   │ Flask + Render   │
│ transfers       │   │ refunds         │   │ (FRAGILE)        │
│ cashback        │   │ webhooks        │   │                  │
└────────┬────────┘   └────────┬────────┘   └─────────────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │  REZ MERCHANT SVC   │
         │  (Multi-tenant)     │
         │  Products · Orders  │
         │  Stores · Analytics │
         └──────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
REZ Now        NextaBiZ       Hotel OTA
(Consumer)     (Merchant SaaS)  (Business)
    │               │               │
    │               │         ┌────┴────┐
    │               │         │         │
    │          Hotel Panel  Hotel PMS  Hotel OTA Web
    │          (Owner)      (Staff)    (Consumer)
    │
    ▼
  Rendez (Dating)
  Prisma + PostgreSQL
```

### Database Topology

| Database | Tech | Used By | Data |
|----------|------|---------|------|
| MongoDB | MongoDB | Auth, Merchant, Hotel OTA | Users, Merchants, Products, Bookings |
| PostgreSQL | Prisma | Rendez | Profiles, Matches, Gifts |
| Redis | Redis | All services | Sessions, OAuth state, cache, rate limits |

### OAuth2 Partner Ecosystem

| Partner App | Auth Method | Callback Route | Scopes |
|-------------|-------------|----------------|--------|
| NextaBiZ | REZ OAuth2 | `/api/auth/callback` | profile |
| Hotel Panel | REZ OAuth2 | `/api/auth/callback` | profile, merchant |
| Hotel PMS | REZ OAuth2 | `/auth/rez-callback` | profile, bookings |
| Rendez | REZ OAuth2 | `/api/auth/oauth/callback` | profile, wallet:read, wallet:hold |
| REZ Now | REZ OAuth2 | `/api/auth/callback` | profile, wallet:read |
| REZ Merchant | REZ OAuth2 | `/api/merchant/oauth/callback` | all |

---

## Strengths

### 1. Unified Identity Layer
One REZ account works across all 6 apps. No separate logins, no separate user tables per app. The OAuth2 implementation is RFC-compliant: authorization code flow, state parameter, httpOnly cookies, scope validation, token blacklisting.

### 2. Shared Wallet as Ecosystem Unifier
The wallet is not just a payment method — it's the transactional spine of the ecosystem:
- Hotel booking holds (escrow)
- Wallet-to-wallet transfers
- Cashback across apps
- Rendez premium gifting

### 3. OAuth2 Partner SSO is Well-Architected
- 8 partners registered in auth service (3 required, 5 optional)
- `rezUserId` sparse unique index links merchants to REZ users across apps
- Token refresh, revocation, and blacklisting implemented
- Clear redirect URI validation

### 4. Multi-Tenant Merchant Service
Complete restaurant/retail POS backend:
- Products with variants, categories, galleries, restore/restore
- Multiple stores/outlets per merchant
- Webhook integrations (RestoPapa, Hotel PMS)
- Bank detail encryption at rest

### 5. Hotel OTA Ecosystem is Comprehensive
- Owner dashboard (Hotel Panel)
- Staff management (Hotel PMS)
- Consumer booking site (Hotel OTA Web)
- QR-based room services
- Socket.io real-time updates

### 6. Intent Graph Shows Vision
Capturing cross-app user intent signals for AI-powered recommendations is the right long-term bet. A user who books hotels and orders food creates a richer signal than either app alone.

---

## Critical Issues

### CRITICAL-1: Intent Graph is Inadequate for Production

**Location:** `rez-intent-graph`
**Severity:** Critical
**Impact:** AI personalization, cross-app recommendations

**Finding:**
The Intent Graph is a Flask app on Render's free tier. No described:
- Vector database (pgvector / Pinecone / Qdrant) for embedding similarity search
- Real-time signal ingestion pipeline (Kafka / Redis Streams)
- Redis-backed signal storage and caching
- Scalable inference layer for recommendations
- A/B testing framework for recommendation models

**If this service goes down:** Cross-app personalization breaks. If it's the moat, it's made of paper.

**Recommendation:** Rebuild as a proper ML pipeline with:
1. Redis Streams for real-time signal ingestion
2. pgvector extension on PostgreSQL for embedding storage
3. Scheduled batch job for model retraining
4. API with caching and circuit breakers

---

### CRITICAL-2: Socket.io Without Redis Adapter

**Location:** Hotel OTA
**Severity:** Critical
**Impact:** Real-time booking updates fail in multi-instance production

**Finding:**
Socket.io is used for live booking status updates but there is no mention of a Redis adapter. Socket.io requires a Redis adapter for multi-instance deployments — without it, only the instance that received the event can broadcast it.

**In production:** Two Render instances behind a load balancer. Booking made on instance 1. Instance 2 never gets the event. Hotel staff on instance 2 sees stale data.

**Recommendation:** Add `@socket.io/redis-adapter` with Redis Pub/Sub. Configure `socket.io-redis` with Redis URL from `REDIS_URL` env var.

---

### CRITICAL-3: No API Gateway

**Location:** All services
**Severity:** Critical
**Impact:** Security, rate limiting, observability

**Finding:**
Services call each other directly via env vars:
```
REZ_MERCHANT_SERVICE_URL
REZ_WALLET_SERVICE_URL
REZ_PAYMENT_SERVICE_URL
REZ_AUTH_SERVICE_URL
```

Every service handles auth, rate limiting, and logging independently. No centralized:
- Request routing
- Auth token validation
- Rate limiting per consumer
- Circuit breakers
- Request/response logging
- API versioning

**If any service is compromised:** The attack chains to every service it can reach.

**Recommendation:** Deploy an API Gateway (Kong, AWS API Gateway, or self-hosted NGINX + Lua) as the single entry point. All internal service calls go through it.

---

### CRITICAL-4: No Deployment Pipeline

**Location:** All services
**Severity:** Critical
**Impact:** Deployment risk, no rollback capability

**Finding:**
No described:
- CI/CD pipeline per service
- Canary deployment strategy
- Automated rollback on failure
- Feature flags
- Environment parity (dev vs prod)

**With 8+ services on Render, Vercel, and other providers:** A broken deploy on `rez-merchant-service` silently breaks Hotel OTA's merchant lookups. No alerts, no rollbacks, no visibility.

**Recommendation:** Implement per-service CI/CD using GitHub Actions:
1. Lint → Type check → Unit tests → Integration tests
2. Docker image build
3. Canary deploy (10% → 50% → 100%) with health checks
4. Auto-rollback on error rate spike

---

## Technical Debt

### TD-1: Hotel OTA Has 168 Routes, 108 Controllers

**Location:** `hotel-ota-api`
**Severity:** High
**Impact:** Maintainability, onboarding new engineers

A flat MVC structure with 168 routes is a red flag. Recommended structure:
```
src/
  modules/
    bookings/
      routes.ts
      controllers/
      services/
      models/
    rooms/
      routes.ts
      controllers/
      services/
      models/
  shared/
    middleware/
    utils/
    errors/
```

### TD-2: Hotel PMS Frontend — 200 Pages, 423 Components

**Location:** `hotel-pms/hotel-management-master/frontend`
**Severity:** High
**Impact:** Bundle size, performance, developer experience

No described code splitting or lazy loading. With 200 pages in a single React app:
- Initial load time will be slow
- Tree shaking is harder to maintain
- Feature isolation is difficult

**Recommendation:** Implement lazy loading per route, add React.lazy() with Suspense, measure bundle size with webpack-bundle-analyzer.

### TD-3: Two Separate Hotel Frontends

**Location:** Hotel Panel (Next.js) + Hotel PMS (React/Vite)
**Severity:** Medium
**Impact:** Code duplication, maintenance overhead

Both are hotel management tools with significant overlap. Consider whether they could share a component library (e.g., `@rez/rez-ui`).

### TD-4: No Request Pagination Consistency

**Location:** Multiple services
**Severity:** Medium
**Impact:** Performance with large datasets

Hotel PMS CLAUDE.md explicitly mandates server-side pagination, but the mandate exists because the problem is acknowledged. Verify all endpoints in all services enforce pagination defaults.

### TD-5: NextaBiZ OAuth2 Has Manual REZ User Linking

**Location:** NextaBiZ
**Severity:** Low
**Impact:** User experience

When a NextaBiZ merchant logs in via OAuth2, a new merchant account is created. If they already have a NextaBiZ account, they end up with two. The linkage flow (Settings → Link REZ Account) is manual and opt-in.

**Recommendation:** Auto-detect existing account by phone/email match and prompt to link, rather than creating a duplicate.

---

## Security Assessment

### SEC-1: OAuth2 Redirect URI Validation

**Finding:** The auth service validates redirect URIs against registered values. This is correct.

**Positive:** Partner registration is validated, scope requests are checked against registered scopes.

### SEC-2: Token Security

**Finding:** JWTs signed with `JWT_MERCHANT_SECRET`, httpOnly cookies for web, Bearer tokens for APIs.

**Positive:** Token blacklisting via Redis for logout and password-change events. Refresh token hashing with SHA-256.

**Gap:** No described token rotation on refresh (refresh token rotation — issuing a new refresh token with each use, invalidating the old one). This is optional but recommended for high-security flows.

### SEC-3: Bank Detail Encryption

**Finding:** Merchant bank details are encrypted at rest using `utils/encryption.ts` with `ENCRYPTION_KEY`.

**Positive:** The pre-save hook throws if `ENCRYPTION_KEY` is missing, preventing accidental plaintext storage.

### SEC-4: No Described Input Validation Framework

**Finding:** No described centralized input validation (e.g., Zod, Joi, class-validator) across services.

**Gap:** Input validation is per-route, inconsistent. Risk of injection, malformed data entering the system.

### SEC-5: No Described WAF / DDoS Protection

**Finding:** No described Web Application Firewall or DDoS mitigation layer.

**Gap:** Render and Vercel provide basic DDoS protection, but for a financial super-app, dedicated WAF (Cloudflare, AWS WAF) is recommended.

---

## Scalability Risks

### SCALE-1: Rendez PostgreSQL — No Connection Pooling Described

**Finding:** Prisma with PostgreSQL for Rendez. No described connection pooler (PgBouncer, Supabase's pooler).

**Risk:** Under load, PostgreSQL connection exhaustion. Default Prisma connection pool is 5.

**Recommendation:** Add PgBouncer for connection pooling in production.

### SCALE-2: MongoDB — No Described Sharding or Read Replicas

**Finding:** MongoDB for Auth, Merchant, Hotel OTA. No described replica set configuration.

**Risk:** Single-node MongoDB is a single point of failure. No read replica for reporting queries.

**Recommendation:** Configure MongoDB replica set (3 nodes minimum) in production.

### SCALE-3: Redis — No Cluster Configuration Described

**Finding:** Redis used for sessions, OAuth state, caching, rate limiting. No described cluster configuration.

**Risk:** Single Redis instance is a single point of failure. Session loss = all users logged out.

**Recommendation:** Redis Sentinel or Redis Cluster for HA.

### SCALE-4: Hotel OTA API — Unbounded Queries

**Finding:** Hotel PMS rules mandate pagination. Not all Hotel OTA endpoints have been audited for pagination.

**Risk:** Unbounded `.find()` on bookings/rooms collections with millions of records will cause memory exhaustion.

### SCALE-5: Intent Graph — No Described Scaling Strategy

**Finding:** Flask app on Render. No described horizontal scaling, caching, or rate limiting.

**Risk:** If the Intent Graph becomes the recommendation engine for all apps, it will be queried on every page load. One Flask instance will not handle production load.

---

## Missing Infrastructure

| Item | Priority | Impact |
|------|----------|--------|
| API Gateway | Critical | Security, observability, rate limiting |
| CI/CD Pipeline | Critical | Safe deployments, rollback |
| Redis Adapter for Socket.io | Critical | Real-time reliability in production |
| Intent Graph Rebuild | Critical | AI moat |
| WAF / DDoS Protection | High | Security for financial app |
| MongoDB Replica Set | High | Data durability |
| Redis Sentinel/Cluster | High | Session reliability |
| Token Rotation on Refresh | Medium | Security hardening |
| Centralized Input Validation | Medium | Security consistency |
| Connection Pooling (PostgreSQL) | Medium | Database reliability |
| Observability / APM | Medium | Debugging in production |
| Feature Flags | Low | Safe rollouts |

---

## Business Risks

### BR-1: Single Point of Failure at Auth Service

**Risk:** REZ Auth Service is the SSO hub for 6 apps. If it goes down, all 6 apps cannot authenticate users.

**Business Impact:** Complete login outage across the entire ecosystem. Every app shows "Sign in unavailable."

**Mitigation needed:** Auth service must be highly available (multiple instances, Redis Sentinel, database replication). Circuit breakers in all consumer apps so they can gracefully degrade.

### BR-2: Single Point of Failure at Wallet Service

**Risk:** REZ Wallet holds real money. If it goes down during a hotel booking, transactions fail.

**Business Impact:** Failed bookings, lost revenue, user trust erosion. Financial service requires 99.9%+ uptime SLA.

**Mitigation needed:** Wallet service needs dedicated HA infrastructure, financial-grade monitoring, and a disaster recovery plan.

### BR-3: Partner Registration is Manual

**Risk:** Adding a new OAuth2 partner requires a developer to manually update env vars in the auth service and the partner app.

**Business Impact:** Partner onboarding takes days instead of minutes. No self-service portal means the ecosystem cannot scale beyond a handful of partners.

**Mitigation needed:** Self-service partner portal with automatic redirect URI validation, scope negotiation, and OAuth2 client credential generation.

### BR-4: No Monetization Model Visible in Code

**Finding:** The code does not describe how REZ makes money.

**Questions:** Is REZ taking a commission on wallet transfers? Hotel bookings? Merchant transactions? Subscription fees for NextaBiZ?

**Business Impact:** Without a clear revenue model, the ecosystem value cannot be quantified.

### BR-5: No Described Compliance Posture

**Finding:** Hotel OTA handles payment card data (Razorpay). Rendez handles user profiles.

**Risks:**
- PCI-DSS compliance for payment handling
- GDPR/data residency for user data
- KYC/AML for wallet services (regulatory risk in some jurisdictions)

**Mitigation needed:** Compliance audit, data retention policy, KYC flow for wallet users.

### BR-6: No Described SLA / SLO

**Finding:** No described uptime commitments, incident response plan, or customer support SLAs.

**Business Impact:** No accountability framework for service reliability.

---

## Recommendations

### Immediate (0-30 Days)

1. **Add Redis adapter to Socket.io** — one-line change, prevents silent production failures
2. **Audit all MongoDB queries for pagination** — prevent unbounded queries
3. **Add PgBouncer to Rendez PostgreSQL** — prevent connection exhaustion
4. **Document all OAuth2 redirect URIs** — prevent misconfiguration failures

### Short-term (30-90 Days)

5. **Deploy API Gateway** — Kong or AWS API Gateway as single entry point
6. **Add GitHub Actions CI/CD** — per-service pipelines with canary deploys
7. **Configure MongoDB replica set** — 3-node minimum for production
8. **Add Redis Sentinel** — HA Redis for session reliability
9. **Fix Intent Graph** — rebuild with Redis Streams + pgvector

### Medium-term (90-180 Days)

10. **Self-service OAuth2 partner portal** — enable ecosystem scaling
11. **Feature flag system** — LaunchDarkly or Unleash for safe rollouts
12. **Observability stack** — Datadog or Grafana + Prometheus + Loki
13. **Token rotation on refresh** — security hardening for OAuth2
14. **WAF configuration** — Cloudflare or AWS WAF

### Long-term (180+ Days)

15. **Rez Now micro-frontend architecture** — lazy load features, reduce bundle
16. **Hotel OTA modular rewrite** — domain-based module structure
17. **KYC flow for wallet users** — regulatory compliance
18. **Monetization layer** — commission engine, subscription billing

---

## Priority Roadmap

```
WEEK 1-2:       [CRITICAL]
├── Fix Socket.io Redis adapter
├── Audit MongoDB pagination
└── Add PgBouncer to Rendez

WEEK 3-4:       [CRITICAL]
├── Deploy API Gateway skeleton
├── Configure MongoDB replica set
└── Set up Redis Sentinel

WEEK 5-8:       [CRITICAL + HIGH]
├── GitHub Actions CI/CD per service
├── Intent Graph rebuild (Phase 1)
├── OAuth2 partner portal (Phase 1)
└── WAF configuration

WEEK 9-12:      [HIGH]
├── Intent Graph rebuild (Phase 2)
├── Feature flag system
├── Observability stack
└── Token rotation on refresh

WEEK 13-24:     [MEDIUM]
├── Hotel OTA modular rewrite
├── REZ Now micro-frontend
├── KYC flow
└── Monetization layer
```

---

*Document prepared by Claude Code. All findings are based on static code analysis of the REZ ecosystem codebase as of 2026-04-29.*
