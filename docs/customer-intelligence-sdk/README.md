# Customer Intelligence SDK - Complete Documentation

**Product:** `@hojai/customer-intelligence-sdk`  
**Version:** 1.0.0  
**Date:** June 29, 2026  
**Status:** ✅ Production Ready

---

## Overview

A unified SDK providing D2C brands with customer intelligence signals — trust scores, COD recommendations, return risk, support intelligence, and more.

**Core Promise:** Privacy-safe signals only — never expose raw data, only scores and recommendations.

---

## Architecture

```
@hojai/customer-intelligence-sdk
│
├── SDK Package (@hojai/customer-intelligence-sdk)
│   └── 12 modules, 1 unified analyze() call
│
├── Customer Intelligence Gateway (4896)
│   └── Single entry point, orchestrates all services
│
└── 12 Microservices
    ├── trust-score-service (4897)      — Customer trust scoring
    ├── cod-intelligence (4898)       — COD recommendations ⭐
    ├── return-risk-engine (4899)      — Return abuse detection ⭐
    ├── support-intelligence (4900)     — Support profiling
    ├── sales-intelligence (4901)       — Selling preferences
    ├── recommendation-engine (4902)    — Next best action
    ├── customer-graph (4903)          — Relationship graph
    ├── loyalty-intelligence (4904)     — LTV + churn + retention
    ├── communication-preference (4905)  — Channel + tone
    ├── customer-twin (4895)           — Digital twin (existing)
    └── risk-engine (4755)             — Fraud/churn (existing)
```

---

## Quick Start

### 1. Install SDK

```bash
npm install @hojai/customer-intelligence-sdk
```

### 2. Initialize

```typescript
import { CustomerIntelligenceSDK } from '@hojai/customer-intelligence-sdk';

const sdk = new CustomerIntelligenceSDK({
  gatewayUrl: 'http://localhost:4896',
  apiKey: 'your-api-key'
});
```

### 3. Full Analysis

```typescript
const result = await sdk.analyze({
  phone: '+919876543210'
});

// result.data contains:
{
  customer_id: "cust_abc123",
  trust_score: 87,
  cod_recommendation: { allowed: true, confidence: 94 },
  return_risk: { risk: 'low', policy: 'free_returns' },
  support_profile: { priority: 'normal', preferred_channel: 'whatsapp' },
  selling_preferences: { premium_buyer: true, next_best_offer: 'membership' },
  loyalty: { ltv_tier: 'gold', churn_risk: { probability: 0.15 } },
  communication: { preferred_channel: 'whatsapp', preferred_tone: 'friendly' },
  risk: { fraud_probability: 0.02, churn_probability: 0.15 },
  segments: { value: 'high_value', behavior: 'frequent' }
}
```

---

## All 12 Modules

### 1. Trust Score (4897)

Calculate customer trust for commerce.

```typescript
const trust = await sdk.trust.score({
  orderHistory: { total: 10, completed: 9, returned: 1 },
  accountAge: 180,
  paymentHistory: { successful: 9, failed: 1 }
});
// Returns: { score: 85, level: 'high', badge: 'trusted' }
```

### 2. COD Intelligence (4898) ⭐ Killer Feature

**The feature D2C brands will pay ₹25,000/month for.**

```typescript
const cod = await sdk.cod.recommend({
  orderHistory: { total: 10, completed: 9, returned: 1 },
  addressHistory: { changes90d: 0, verified: true },
  deviceHistory: { changes30d: 0 },
  purchaseAmount: 2500
});
// Returns: { allowed: true, confidence: 94, recommendation: 'allow' }
```

### 3. Return Risk Engine (4899)

Detect return abuse and recommend policies.

```typescript
const returns = await sdk.returns.risk({
  orderHistory: { orders: 20, returns: 2 },
  returnVelocity: { returns7d: 0, returns30d: 1 }
});
// Returns: { risk: 'low', policy: 'free_returns', abuse_probability: 0.04 }
```

### 4. Support Intelligence (4900)

Profile support behavior.

```typescript
const support = await sdk.support.profile({
  ticketHistory: { total: 5, last90d: 2, escalations: 0 },
  sentiment: 'neutral'
});
// Returns: { priority: 'normal', recommended_tone: 'friendly', preferred_channel: 'whatsapp' }
```

### 5. Sales Intelligence (4901)

Understand buying preferences.

```typescript
const sales = await sdk.sales.preferences({
  purchaseHistory: {
    totalSpend: 50000,
    orderCount: 20,
    avgOrderValue: 2500
  }
});
// Returns: { customer_segment: 'premium_explorer', premium_buyer: true }
```

### 6. Loyalty Intelligence (4904)

Calculate LTV and churn.

```typescript
const loyalty = await sdk.loyalty.profile({
  purchaseHistory: { orders: 50, totalSpend: 50000 },
  engagementHistory: { logins: 100, referrals: 5 }
});
// Returns: { ltv_tier: 'gold', churn_risk: { probability: 0.15 } }
```

### 7. Communication Preference (4905)

Best channel and tone.

```typescript
const comm = await sdk.communication.preferences({
  channelHistory: { whatsapp: 50, email: 30 }
});
// Returns: { preferred_channel: 'whatsapp', preferred_tone: 'friendly', best_time: 'evening' }
```

### 8. Risk Engine (4755) — Existing

Fraud and churn scoring.

```typescript
const risk = await sdk.risk.scores('cust_123');
// Returns: { fraud_probability: 0.02, churn_probability: 0.15 }
```

### 9. Recommendations (4902)

Next best actions.

```typescript
const recs = await sdk.recommendations.get({
  context: 'checkout',
  limit: 5
});
// Returns: { recommendations: [...], next_best_action: { action: 'offer_membership' } }
```

### 10. Customer Graph (4903)

Relationship graph.

```typescript
const graph = await sdk.graph.resolve({ phone: '+919876543210' });
// Returns: { customerId: 'cust_abc123', confidence: 0.95 }
```

### 11. Customer Twin (4895) — Existing

Digital twin data.

```typescript
const twin = await sdk.twin.profile('cust_abc123');
// Returns: full customer profile
```

### 12. Identity (Gateway)

Identity resolution.

```typescript
const identity = await sdk.identity.resolve({
  phone: '+919876543210',
  email: 'customer@example.com'
});
// Returns: { customerId: 'cust_abc123', confidence: 0.95 }
```

---

## Pricing Model

| Tier | Price | Includes |
|------|-------|----------|
| Starter | ₹5,000/mo | Identity, basic trust score |
| Growth | ₹25,000/mo | + COD, return risk, support, sales |
| Enterprise | ₹1L+/mo | + Custom models, shared trust network |

**Usage-based (Stripe pattern):**
- ₹2 per trust check
- ₹1 per COD recommendation
- ₹5 per fraud investigation

---

## Privacy Architecture

```
Input: phone / email / deviceId
                    │
                    ▼
┌─────────────────────────────────────┐
│  Identity Resolution                │
│  (phone/email → unified customer)  │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  Per-Merchant Data Isolation        │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  Signal Generation                  │
│  (raw data → scores/recommendations)│
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  Privacy Filter                    │
│  (strip raw data, return signals)   │
└─────────────────────────────────────┘
                    │
                    ▼
Output: signals only
```

**Never exposed:**
- Order history details
- Merchant names
- Addresses
- Transaction details

**Always exposed:**
- Trust scores (0-100)
- Risk levels (low/medium/high)
- Recommendations (allow/block/review)

---

## API Reference

### Gateway (4896)

```
POST /api/customer/analyze     — Full customer analysis
GET  /api/customer/:id       — Get customer profile
POST /api/customer/:id/events — Track event
```

### Trust (4897)

```
POST /api/trust/score        — Calculate trust score
GET  /api/trust/history/:id   — Trust history
```

### COD (4898)

```
POST /api/cod/recommend      — COD recommendation
POST /api/cod/recommend/batch — Batch recommendations
POST /api/cod/return-risk    — Return risk for COD
```

### Returns (4899)

```
POST /api/returns/risk       — Return risk assessment
POST /api/returns/patterns   — Abuse pattern detection
```

### Support (4900)

```
POST /api/support/profile    — Support profile
GET  /api/support/history/:id — Support history
```

### Sales (4901)

```
POST /api/sales/preferences  — Selling preferences
GET  /api/sales/segment/:id  — Customer segment
```

### Loyalty (4904)

```
POST /api/loyalty/profile   — Loyalty profile
GET  /api/loyalty/retention/:id — Retention recommendations
```

### Communication (4905)

```
POST /api/communication/preferences — Communication preferences
GET  /api/communication/best-time/:id — Best contact time
```

### Recommendations (4902)

```
POST /api/recommend         — All recommendations
POST /api/recommend/next-best-action — NBA only
```

### Graph (4903)

```
POST /api/graph/resolve     — Resolve customer
POST /api/graph/relate      — Add relationship
GET  /api/graph/:id/connections — Get connections
GET  /api/graph/:id/network — Get network
```

---

## Port Registry

| Service | Port | Status |
|---------|------|--------|
| customer-intelligence-gateway | 4896 | ✅ NEW |
| trust-score-service | 4897 | ✅ NEW |
| cod-intelligence | 4898 | ✅ NEW |
| return-risk-engine | 4899 | ✅ NEW |
| support-intelligence | 4900 | ✅ NEW |
| sales-intelligence | 4901 | ✅ NEW |
| recommendation-engine | 4902 | ✅ NEW |
| customer-graph | 4903 | ✅ NEW |
| loyalty-intelligence | 4904 | ✅ NEW |
| communication-preference | 4905 | ✅ NEW |
| customer-twin | 4895 | ✅ Existing |
| risk-engine | 4755 | ✅ Existing |

---

## Files Created

```
SDK Package:
companies/HOJAI-AI/sdk/hojai-customer-intelligence-sdk/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── src/
│   ├── index.ts        (main SDK)
│   ├── client.ts       (base HTTP client)
│   └── types.ts        (all TypeScript interfaces)
└── __tests__/
    └── unit/
        └── client.test.ts

Backend Services:
companies/HOJAI-AI/services/
├── customer-intelligence-gateway/ (4896)
├── trust-score-service/            (4897)
├── cod-intelligence/             (4898)
├── return-risk-engine/           (4899)
├── support-intelligence/         (4900)
├── sales-intelligence/           (4901)
├── recommendation-engine/         (4902)
├── customer-graph/               (4903)
├── loyalty-intelligence/         (4904)
└── communication-preference/     (4905)
```

---

## Next Steps

1. **Run tests:** `npm test` in each service directory
2. **Start gateway:** `cd services/customer-intelligence-gateway && npm start`
3. **Build SDK:** `cd sdk/hojai-customer-intelligence-sdk && npm run build`
4. **Publish SDK:** `npm publish --access public`

---

**Questions?** Contact HOJAI AI Engineering
