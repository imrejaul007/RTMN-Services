# REE Integration Hub - Complete Audit

**Version:** 1.0 | **Date:** June 11, 2026

---

## OVERVIEW

**REE** (Real-time Ecosystem Engine) is a **separate system** from RTNM Digital/Group that handles cross-cutting operations like fraud detection, growth tracking, and trust scoring. It's NOT documented in the main ecosystem audit.

REE consists of:
- **12 External Services** - Remote APIs REE Integration Hub connects to
- **REE Clients** - Embedded in RABTUL services for feature flags, karma, cashback
- **Integration Hub** - Central bridge for cross-service communication

---

## REE ECOSYSTEM STRUCTURE

```
                    ┌─────────────────────────────────────────┐
                    │         REE INTEGRATION HUB              │
                    │  (RTNM-Digital, RABTUL-integration-hub) │
                    └───────────────┬─────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ REE CLIENTS   │         │ EXTERNAL REE    │         │ EVENT BUS       │
│ (in services) │         │ SERVICES (12)   │         │ (4025/4510)     │
└───────────────┘         └─────────────────┘         └─────────────────┘
        │                           │
        ▼                           ▼
┌───────────────┐         ┌─────────────────┐
│ Profile Svc   │         │ ops_center      │
│ Wallet Svc    │         │ trust_platform   │
│ (fraud, karma,│         │ growth_engine    │
│  features)    │         │ logistics_engine │
└───────────────┘         │ attribution      │
                          │ ... +8 more     │
                          └─────────────────┘
```

---

## REE SERVICES (Ports 3000-3011)

| Port | Service | Purpose | Status |
|------|---------|---------|--------|
| 3000 | ops_center | Operations dashboard, incident management | External |
| 3001 | trust_platform | Trust scores, fraud signals | External |
| 3002 | growth_engine | Referral tracking, viral coefficients | External |
| 3003 | logistics_engine | Route optimization, delivery risk | External |
| 3004 | attribution_engine | Marketing attribution, conversion tracking | External |
| 3005 | creative_studio | Ad creative generation | External |
| 3006 | franchise_mode | Franchise management | External |
| 3007 | ai_marketplace | AI agent marketplace | External |
| 3008 | mind_grocery | Grocery vertical AI | External |
| 3009 | mind_retail | Retail vertical AI | External |
| 3010 | rto_fraud | RTO fraud detection | External |
| 3011 | voice_ai | Voice AI interface | External |

---

## REE CLIENTS IN SERVICES

### 1. Profile Service REE Client
**File:** `RABTUL-Technologies/rez-profile-service/src/services/reeClient.ts`

**Features:**
- User feature flags (canEarnRez, canEarnBranded, etc.)
- Cashback calculation
- Karma info and events
- Fraud checks
- Subscription tiers
- Social sharing validation
- Merchant tiers and commission

**Endpoints Used:**
- `/api/features/user` - Get user features
- `/api/features/cashback` - Calculate cashback
- `/api/query/karma` - Get karma info
- `/api/events` - Record karma events
- `/api/query/fraud` - Fraud checks
- `/api/features/tier/user/:spend` - Get user tier
- `/api/features/tier/merchant/:tier` - Get merchant tier
- `/api/features/commission` - Calculate commission

### 2. Wallet Service REE Client
**File:** `RABTUL-Technologies/rez-wallet-service/src/utils/reeClient.ts`

**Features:**
- Coin economics validation
- Karma conversion to coins
- Feature flags
- Fraud detection
- Coin usage validation
- Merchant commission

**Endpoints Used:**
- `/api/features/user` - Get user features
- `/api/features/merchant` - Get merchant features
- `/api/features/cashback` - Calculate cashback
- `/api/query/karma` - Get karma info
- `/api/events` - Record karma events
- `/api/query/fraud` - Fraud checks
- `/api/features/commission` - Calculate commission

---

## REE INTEGRATION HUB

### Files
1. `RTNM-Digital/src/reeIntegration.ts`
2. `RTNM-Digital/REZ-integration-hub/src/reeIntegration.ts`
3. `RABTUL-Technologies/REZ-integration-hub/src/reeIntegration.ts`

### Core Functions

#### 1. Fraud Signal Sharing
```typescript
shareFraudSignals(data: {
  user_id: string;
  merchant_id?: string;
  risk_score: number;
  risk_factors: string[];
  transaction_amount?: number;
  transaction_type: string;
})
```
**Shares to:** trust_platform, rto_fraud, REZ Intelligence, Event Bus

#### 2. Unified Fraud Score
```typescript
getUnifiedFraudScore(params: {
  user_id: string;
  merchant_id?: string;
  transaction_amount?: number;
})
```
**Sources:** trust_platform (40%), rto_fraud (35%), intelligence (25%)

####3. Growth Event Sharing
```typescript
shareGrowthEvent(data: {
  user_id: string;
  event_type: 'referral' | 'signup' | 'purchase' | 'engagement';
  metadata?: Record<string, any>;
})
```
**Shares to:** growth_engine, attribution_engine, REZ Intelligence, Event Bus

#### 4. Logistics with Risk
```typescript
trackDeliveryWithRisk(params: {
  order_id: string;
  user_id: string;
  delivery_address: string;
})
```
**Combines:** fraud score + route optimization

#### 5. Trust Score Aggregation
```typescript
getTrustScore(params: {
  entity_type: 'user' | 'merchant';
  entity_id: string;
})
```
**Tiers:** trusted (>0.8), standard (>0.5), risky (>0.2), blocked

#### 6. Dashboard Summary
```typescript
getREEDashboard()
```
**Returns:** Service health, incidents, fraud stats, growth metrics

---

## GAPS & ISSUES

### CRITICAL

#### 1. REE Services Not Implemented
**Issue:** All 12 REE services (ports 3000-3011) are referenced but do NOT exist in codebase.

**Impact:** 
- REE Integration Hub calls will all fail
- Feature flags return null
- Fraud checks are bypassed
- Karma system doesn't work

**Recommendation:** Implement REE services or mark as external dependencies.

#### 2. No REE Service Discovery
**Issue:** No service registry entry for REE services.

**Impact:** No way to track which REE services are healthy.

**Recommendation:** Add REE services to service registry.

### HIGH PRIORITY

#### 3. Duplicate REE Integration Files
**Issue:** Same `reeIntegration.ts` exists in 3 locations:
- `RTNM-Digital/src/reeIntegration.ts`
- `RTNM-Digital/REZ-integration-hub/src/reeIntegration.ts`
- `RABTUL-Technologies/REZ-integration-hub/src/reeIntegration.ts`

**Impact:** Maintenance nightmare, potential drift.

**Recommendation:** Consolidate to single source in RTNM-Digital.

#### 4. No REE Authentication
**Issue:** Uses simple `X-Internal-Token` header for all REE calls.

**Impact:** Security risk if token exposed.

**Recommendation:** Implement proper mTLS or service mesh auth.

#### 5. REE Client URL Mismatch
**Issue:** Different URLs configured:
- Profile Service: `http://localhost:4000/api`
- Wallet Service: No default (uses env)
- Integration Hub: External Render URLs

**Impact:** Inconsistent behavior across services.

**Recommendation:** Standardize REE_SERVICE_URL in env config.

### MEDIUM PRIORITY

#### 6. No REE Health Checks
**Issue:** No health check endpoints for REE services.

**Impact:** No way to detect REE service failures.

**Recommendation:** Add `/health` endpoints to all REE services.

#### 7. No REE Circuit Breaker
**Issue:** If REE service is down, all calls fail.

**Impact:** Cascading failures across ecosystem.

**Recommendation:** Implement circuit breaker pattern.

#### 8. Missing REE Metrics
**Issue:** No metrics collection for REE calls.

**Impact:** No observability.

**Recommendation:** Add Prometheus metrics for REE calls.

---

## CONNECTIONS TO OTHER SYSTEMS

### REE → RABTUL Services
- Profile Service uses REE for features/karma
- Wallet Service uses REE for coins/fraud
- Auth Service (planned) for trust scores

### REE → Event Bus
- Publishes `ree.fraud_signal` events
- Publishes `ree.growth_event` events
- Subscribes to ecosystem events

### REE → REZ Intelligence
- Shares fraud signals for ML training
- Receives fraud scores
- Bidirectional trust data

### REE → SUTAR OS
- Uses Trust Engine for composite scores
- Shares intent signals
- Coordinates with Decision Engine

---

## RECOMMENDED ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    REE CONTROL PLANE                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Ops Center │  │Trust Engine │  │  Growth Engine      │  │
│  │   (3000)   │  │   (3001)   │  │     (3002)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────���───────────────────────────────────────┐
│                   REE DATA PLANE                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │Logistics   │  │ Attribution │  │  Franchise Mode     │  │
│  │  (3003)    │  │   (3004)    │  │     (3006)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   REE VERTICAL APPS                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Creative    │  │ AI Market   │  │  Mind (Grocery/     │  │
│  │  (3005)    │  │   (3007)    │  │   Retail)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   REE FRAUD LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ RTO Fraud  │  │ Voice AI    │  │  Integration Hub   │  │
│  │   (3010)   │  │   (3011)    │  │  (RTNM-Digital)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## ACTION ITEMS

| Priority | Item | Owner | Status |
|----------|------|-------|--------|
| Critical | Implement or document REE services as external | TBD | Pending |
| Critical | Add REE to service registry | TBD | Pending |
| High | Consolidate REE integration files | TBD | Pending |
| High | Standardize REE URLs in env config | TBD | Pending |
| Medium | Add REE health check endpoints | TBD | Pending |
| Medium | Implement circuit breaker for REE calls | TBD | Pending |
| Low | Add REE metrics to Prometheus | TBD | Pending |

---

## FILES TO UPDATE

1. [RTNM-GAP-ANALYSIS.md](RTNM-GAP-ANALYSIS.md) - Add REE section
2. [RTNM-COMPREHENSIVE-AUDIT.md](RTNM-COMPREHENSIVE-AUDIT.md) - Add REE overview
3. [ECOSYSTEM-REGISTRY.md](ECOSYSTEM-REGISTRY.md) - Add REE services
4. [CLAUDE.md](CLAUDE.md) - Add REE to company list

---

**License:** Proprietary - RTNM Digital
