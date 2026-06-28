# Customer Intelligence SDK — Full Implementation Plan

**Date:** June 29, 2026
**Status:** PLANNING
**Goal:** Build all 12 modules production-ready

---

## Executive Summary

Build a unified Customer Intelligence SDK that provides D2C brands with:
- Trust scores and fraud probability
- COD (Cash on Delivery) recommendations
- Return risk assessment
- Support intelligence
- Sales intelligence
- Customer twin profiles
- Recommendation engine
- Customer graph API
- Risk engine
- Loyalty intelligence
- Communication preferences
- Identity intelligence

**Architecture:** Privacy-safe signals only — never expose raw data, only scores and recommendations.

---

## 12 Modules — Status & Plan

| # | Module | Existing | Status | Action |
|---|--------|----------|--------|--------|
| 1 | Identity Intelligence | CorpID (4702) | Partial | Extend with unified resolution |
| 2 | Trust Score Engine | SUTAR Trust (4291) | Partial | Build customer-specific trust |
| 3 | COD Intelligence | — | Missing | **Build new service** |
| 4 | Return Risk Engine | — | Missing | **Build new service** |
| 5 | Support Intelligence | live-support-os (4884) | Partial | Build support profile |
| 6 | Sales Intelligence | segment-brain (4310) | Partial | Build selling preferences |
| 7 | Customer Twin | customer-twin (4895) | Complete | Keep as-is |
| 8 | Recommendation Engine | customer-twin-full (5460) | Partial | Build unified NBA |
| 9 | Customer Graph API | customer-intelligence (4885) | Partial | Build unified graph |
| 10 | Risk Engine | risk-intelligence (4755) | Partial | Build fraud probability |
| 11 | Loyalty Intelligence | customer-twin (4895) | Partial | Build LTV + churn |
| 12 | Communication Preference | communication-twin | Partial | Build channel + tone |

---

## Architecture

```
@hojai/customer-intelligence-sdk
│
├── Orchestration Layer (gateway-service)
│   └── Single API: POST /analyze → all signals
│
├── Backend Services (12 microservices)
│   ├── identity-service (4702) — reuse CorpID
│   ├── trust-score-service (4897) — NEW
│   ├── cod-intelligence (4898) — NEW
│   ├── return-risk-engine (4899) — NEW
│   ├── support-intelligence (4900) — NEW
│   ├── sales-intelligence (4901) — NEW
│   ├── customer-twin (4895) — existing
│   ├── recommendation-engine (4902) — NEW
│   ├── customer-graph (4903) — NEW
│   ├── risk-engine (4755) — existing
│   ├── loyalty-intelligence (4904) — NEW
│   └── communication-preference (4905) — NEW
│
└── SDK Package
    └── @hojai/customer-intelligence-sdk
```

---

## Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| customer-intelligence-gateway | 4896 | Single entry point, orchestrator |
| trust-score-service | 4897 | Customer trust scoring |
| cod-intelligence | 4898 | COD recommendations |
| return-risk-engine | 4899 | Return abuse detection |
| support-intelligence | 4900 | Support profiling |
| sales-intelligence | 4901 | Selling preferences |
| customer-twin | 4895 | Existing — keep |
| recommendation-engine | 4902 | Next best action |
| customer-graph | 4903 | Unified graph queries |
| risk-engine | 4755 | Existing — fraud/churn/credit |
| loyalty-intelligence | 4904 | LTV + churn + retention |
| communication-preference | 4905 | Channel + tone preferences |

---

## Service Specifications

### 1. Customer Intelligence Gateway (4896) — Orchestrator

**Purpose:** Single entry point that aggregates all 12 modules into one response.

**Endpoints:**
```
POST /api/customer/analyze
  Input: { phone?, email?, deviceId? }
  Output: {
    customer_id: string,
    trust_score: number (0-100),
    cod_recommendation: { allowed: boolean, confidence: number, factors: string[] },
    return_risk: { risk: string, policy: string },
    support_profile: { tickets_90d: number, escalation_probability: number, tone: string },
    selling_preferences: { price_sensitive: boolean, premium_buyer: boolean },
    loyalty: { ltv: number, tier: string, churn_risk: string },
    communication: { preferred_channel: string, tone: string },
    risk: { fraud_probability: number, churn_probability: number },
    segments: { value: string, behavior: string }
  }

GET /api/customer/:id/profile — Full customer profile
POST /api/customer/:id/events — Track behavior event
GET /api/customer/:id/recommendations — Next best actions
```

### 2. Trust Score Service (4897) — NEW

**Purpose:** Calculate customer trust score for commerce.

**Algorithm:**
```
trust_score = 
  (order_completion_rate * 0.3) +
  (return_rate * -0.2) +
  (support_ticket_rate * -0.15) +
  (account_age_factor * 0.15) +
  (payment_history * 0.2)
```

**Endpoints:**
```
POST /api/trust/score
  Input: { customerId, orderHistory, returnHistory, supportHistory, accountAge }
  Output: {
    score: number (0-100),
    level: 'low' | 'medium' | 'high' | 'trusted',
    factors: { name: string, contribution: number }[],
    badge: 'new' | 'verified' | 'trusted' | 'vip'
  }
```

### 3. COD Intelligence Service (4898) — NEW

**Purpose:** Determine if COD should be allowed for a customer.

**Algorithm:**
```
cod_score =
  (cod_success_rate * 0.35) +
  (address_stability * 0.2) +
  (device_consistency * 0.1) +
  (order_value_risk * 0.15) +
  (account_age_factor * 0.1) +
  (velocity_risk * 0.1)

recommendation = cod_score >= 0.7 ? 'allow' : cod_score >= 0.4 ? 'review' : 'block'
```

**Endpoints:**
```
POST /api/cod/recommend
  Input: {
    customerId?,
    phone?,
    email?,
    orderHistory: { total: number, completed: number, returned: number },
    addressHistory: { changes_90d: number },
    deviceHistory: { changes_30d: number },
    purchaseAmount: number,
    category: string
  }
  Output: {
    allowed: boolean,
    confidence: number (0-100),
    recommendation: 'allow' | 'review' | 'block',
    factors: { name: string, impact: number, value: string }[]
  }
```

### 4. Return Risk Engine (4899) — NEW

**Purpose:** Detect return abuse and recommend return policies.

**Algorithm:**
```
return_risk =
  (return_rate * 0.4) +
  (velocity_of_returns * 0.25) +
  (reason_pattern * 0.2) +
  (order_value_vs_return_value * 0.15)

abuse_probability =
  (same_day_returns * 0.3) +
  (multiple_accounts * 0.3) +
  (high_return_rate * 0.25) +
  (expensive_items * 0.15)
```

**Endpoints:**
```
POST /api/returns/risk
  Input: {
    customerId?,
    phone?,
    orderHistory: { orders: number, returns: number, returnReasons: string[] },
    returnVelocity: { returns_7d: number, returns_30d: number },
    itemValues: { avg_order_value: number, avg_return_value: number }
  }
  Output: {
    risk: 'low' | 'medium' | 'high',
    abuse_probability: number (0-1),
    policy_recommendation: 'free_returns' | 'standard' | 'manual_review' | 'exchange_only',
    factors: string[]
  }
```

### 5. Support Intelligence Service (4900) — NEW

**Purpose:** Profile customer support behavior and recommend handling.

**Endpoints:**
```
POST /api/support/profile
  Input: {
    customerId?,
    phone?,
    ticketHistory: { total: number, last_90d: number, escalations: number },
    refundRequests: { total: number, approved: number },
    sentiment: 'positive' | 'neutral' | 'negative',
    channelHistory: string[]
  }
  Output: {
    tickets_90d: number,
    refund_rate: number,
    sentiment: string,
    escalation_probability: number,
    priority: 'low' | 'normal' | 'high' | 'vip',
    recommended_tone: 'friendly' | 'formal' | 'empathetic' | 'direct',
    preferred_channel: 'whatsapp' | 'email' | 'chat' | 'phone',
    recommended_agent: 'ai' | 'human' | 'specialist',
    likely_resolution: 'refund' | 'exchange' | 'credit' | 'apology'
  }
```

### 6. Sales Intelligence Service (4901) — NEW

**Purpose:** Understand customer buying preferences and recommend actions.

**Endpoints:**
```
POST /api/sales/preferences
  Input: {
    customerId?,
    purchaseHistory: { total_spend: number, order_count: number, avg_order_value: number },
    browsingHistory: { views: number, cart_adds: number },
    responseHistory: { email_opens: number, campaign_clicks: number, offer_acceptances: number }
  }
  Output: {
    customer_segment: string, // 'premium_explorer' | 'value_hunter' | 'loyal_brand' | etc.
    price_sensitivity: 'low' | 'medium' | 'high',
    discount_responsiveness: number (0-1),
    premium_buyer: boolean,
    preferred_categories: string[],
    buying_frequency: 'daily' | 'weekly' | 'monthly' | 'occasional',
    next_best_offer: string,
    recommended_channel: string,
    recommended_time: 'morning' | 'evening' | 'night'
  }
```

### 7. Customer Twin (4895) — Existing

Keep as-is. Provides:
- Customer profile (identity, demographics)
- Behavior twin (orders, spend, favorites)
- Segment twin (value, behavior, demographic, engagement)
- LTV analysis (current, predicted)
- Churn risk (score, level, factors)
- Family/household relationships

**Integration:** Extend with new endpoints for SDK.

### 8. Recommendation Engine (4902) — NEW

**Purpose:** Unified next best action engine across all touchpoints.

**Endpoints:**
```
POST /api/recommend
  Input: {
    customerId?,
    context: 'checkout' | 'cart' | 'browse' | 'support' | 'marketing',
    available: string[] // available products/offers/actions
  }
  Output: {
    recommendations: {
      action: string,
      score: number,
      reason: string,
      personalization: { [key: string]: any }
    }[]
  }

POST /api/recommend/next-best-action
  Input: { customerId?, context?: any }
  Output: {
    action: string,
    confidence: number,
    alternatives: string[]
  }
```

### 9. Customer Graph API (4903) — NEW

**Purpose:** Graph-based customer data model for complex queries.

**Endpoints:**
```
POST /api/graph/resolve
  Input: { phone?, email?, deviceId? }
  Output: { customerId, confidence, merged_ids: string[] }

POST /api/graph/relate
  Input: { customerId, entityType, entityId, relationship }
  Output: { relationshipId }

GET /api/graph/:customerId/connections
  Output: { connections: { type: string, entity: any, strength: number }[] }

GET /api/graph/:customerId/network
  Output: { network: { nodes: any[], edges: any[] } }
```

### 10. Risk Engine (4755) — Existing

Keep as-is. Provides fraud, churn, credit scoring.

**Extend:** Add fraud probability endpoint optimized for SDK.

### 11. Loyalty Intelligence Service (4904) — NEW

**Purpose:** LTV calculation, churn prediction, retention strategies.

**Endpoints:**
```
POST /api/loyalty/profile
  Input: {
    customerId?,
    purchaseHistory: { orders: number, total_spend: number, first_order_date: string },
    engagementHistory: { logins: number, referrals: number, reviews: number }
  }
  Output: {
    ltv: { current: number, predicted_1yr: number, predicted_3yr: number },
    ltv_tier: 'bronze' | 'silver' | 'gold' | 'platinum',
    churn_risk: { probability: number, level: string, factors: string[] },
    retention_recommendations: string[],
    upsell_opportunities: string[]
  }
```

### 12. Communication Preference Service (4905) — NEW

**Purpose:** Determine best channel and tone for each customer.

**Endpoints:**
```
POST /api/communication/preferences
  Input: {
    customerId?,
    interactionHistory: { opens: number, clicks: number, responses: number },
    channelHistory: { whatsapp: number, email: number, sms: number, push: number },
    sentimentHistory: { positive: number, neutral: number, negative: number }
  }
  Output: {
    preferred_channel: 'whatsapp' | 'email' | 'sms' | 'push',
    secondary_channel: string,
    preferred_tone: 'friendly' | 'formal' | 'empathetic' | 'direct',
    best_time: 'morning' | 'afternoon' | 'evening',
    language: string,
    personalization: { greeting_style: string, emoji_usage: 'low' | 'medium' | 'high' }
  }
```

---

## SDK Package Structure

```
@hojai/customer-intelligence-sdk/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts              # Main export
│   ├── types.ts              # All TypeScript interfaces
│   ├── client.ts             # Base client class
│   ├── gateway.ts            # Gateway orchestrator
│   ├── identity.ts           # Identity module
│   ├── trust.ts              # Trust score module
│   ├── cod.ts                # COD intelligence module
│   ├── returns.ts            # Return risk module
│   ├── support.ts            # Support intelligence module
│   ├── sales.ts              # Sales intelligence module
│   ├── twin.ts               # Customer twin module
│   ├── recommendations.ts   # Recommendation engine module
│   ├── graph.ts              # Customer graph module
│   ├── risk.ts               # Risk engine module
│   ├── loyalty.ts            # Loyalty intelligence module
│   └── communication.ts      # Communication preference module
├── __tests__/
│   ├── unit/
│   │   ├── client.test.ts
│   │   ├── gateway.test.ts
│   │   ├── identity.test.ts
│   │   ├── trust.test.ts
│   │   ├── cod.test.ts
│   │   ├── returns.test.ts
│   │   ├── support.test.ts
│   │   ├── sales.test.ts
│   │   ├── twin.test.ts
│   │   ├── recommendations.test.ts
│   │   ├── graph.test.ts
│   │   ├── risk.test.ts
│   │   ├── loyalty.test.ts
│   │   └── communication.test.ts
│   └── integration/
│       └── sdk.test.ts
└── README.md
```

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Create SDK package structure
2. Implement base client class
3. Build Customer Intelligence Gateway (4896)
4. Build Identity Resolution service

### Phase 2: Core Intelligence (Week 2)
5. Build Trust Score Service (4897)
6. Build COD Intelligence Service (4898) — **Killer feature**
7. Build Return Risk Engine (4899)

### Phase 3: Customer Intelligence (Week 3)
8. Build Support Intelligence (4900)
9. Build Sales Intelligence (4901)
10. Build Loyalty Intelligence (4904)

### Phase 4: Advanced (Week 4)
11. Build Recommendation Engine (4902)
12. Build Customer Graph API (4903)
13. Build Communication Preference (4905)

### Phase 5: SDK Polish (Week 5)
14. Complete SDK with all modules
15. Add comprehensive tests
16. Create documentation and examples

---

## Test Coverage Requirements

| Component | Unit Tests | Integration Tests | Coverage Target |
|-----------|------------|-------------------|-----------------|
| Gateway | 20 | 10 | 90% |
| Trust Score | 15 | 5 | 85% |
| COD Intelligence | 20 | 10 | 90% |
| Return Risk | 20 | 10 | 90% |
| Support Intelligence | 15 | 5 | 85% |
| Sales Intelligence | 15 | 5 | 85% |
| Loyalty Intelligence | 15 | 5 | 85% |
| Recommendation Engine | 15 | 5 | 85% |
| Customer Graph | 15 | 5 | 85% |
| Communication Preference | 15 | 5 | 85% |
| SDK Package | 30 | 15 | 90% |
| **Total** | **220** | **85** | **87%** |

---

## API Response Examples

### Full Customer Analysis

```typescript
// Input
const result = await sdk.analyze({
  phone: '+91XXXXXXXXXX',
  email: 'customer@example.com'
});

// Output
{
  customer_id: 'cust_abc123',
  trust_score: 87,
  
  cod_recommendation: {
    allowed: true,
    confidence: 94,
    recommendation: 'allow',
    factors: [
      { name: 'cod_success_rate', impact: 0.35, value: '98%' },
      { name: 'address_stability', impact: 0.20, value: 'stable' },
      { name: 'device_consistency', impact: 0.10, value: 'consistent' }
    ]
  },
  
  return_risk: {
    risk: 'low',
    abuse_probability: 0.04,
    policy_recommendation: 'free_returns',
    factors: ['low return rate', 'consistent sizing purchases']
  },
  
  support_profile: {
    tickets_90d: 2,
    escalation_probability: 0.12,
    sentiment: 'neutral',
    priority: 'normal',
    recommended_tone: 'friendly',
    preferred_channel: 'whatsapp',
    recommended_agent: 'ai',
    likely_resolution: 'apology'
  },
  
  selling_preferences: {
    customer_segment: 'premium_explorer',
    price_sensitivity: 'low',
    discount_responsiveness: 0.3,
    premium_buyer: true,
    preferred_categories: ['electronics', 'fashion'],
    buying_frequency: 'monthly',
    next_best_offer: 'membership_upgrade',
    recommended_channel: 'whatsapp',
    recommended_time: 'evening'
  },
  
  loyalty: {
    ltv: { current: 45000, predicted_1yr: 60000, predicted_3yr: 180000 },
    ltv_tier: 'gold',
    churn_risk: { probability: 0.15, level: 'low', factors: ['frequent buyer'] }
  },
  
  communication: {
    preferred_channel: 'whatsapp',
    secondary_channel: 'email',
    preferred_tone: 'friendly',
    best_time: 'evening',
    language: 'english',
    personalization: { greeting_style: 'casual', emoji_usage: 'medium' }
  },
  
  risk: {
    fraud_probability: 0.02,
    churn_probability: 0.15
  },
  
  segments: {
    value: 'high_value',
    behavior: 'frequent',
    demographic: 'young_professional',
    engagement: 'highly_engaged'
  }
}
```

---

## Pricing Integration

```typescript
// Usage-based pricing
interface UsageRecord {
  customerId: string;
  operation: 'analyze' | 'trust_check' | 'cod_recommend' | 'return_risk' | 'support_profile' | 'sales_preferences' | 'recommend';
  timestamp: Date;
}

// Track usage
await sdk.trackUsage({
  operation: 'analyze',
  customerId: 'cust_abc123'
});

// Get usage report
const usage = await sdk.getUsageReport({
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  groupBy: 'operation'
});
```

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
│  (each merchant sees only their     │
│   customer data + aggregated signals)│
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
│  Privacy Filter                     │
│  (strip raw data, return only      │
│   signals and recommendations)      │
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
- Personal information beyond ID

**Always exposed:**
- Trust scores (0-100)
- Risk levels (low/medium/high)
- Recommendations (allow/block/review)
- Behavioral predictions
- Preference signals
- Segment labels

---

## Files to Create

### Backend Services (12 directories)
```
companies/HOJAI-AI/services/
├── customer-intelligence-gateway/     (4896)
├── trust-score-service/              (4897)
├── cod-intelligence/                 (4898)
├── return-risk-engine/              (4899)
├── support-intelligence/             (4900)
├── sales-intelligence/              (4901)
├── recommendation-engine/            (4902)
├── customer-graph/                   (4903)
├── loyalty-intelligence/             (4904)
└── communication-preference/         (4905)
```

### SDK Package
```
companies/HOJAI-AI/sdk/
└── hojai-customer-intelligence-sdk/
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── README.md
    ├── src/
    │   └── [all modules]
    └── __tests__/
        └── [all test files]
```

### Documentation
```
docs/customer-intelligence-sdk/
├── README.md
├── API.md
├── EXAMPLES.md
└── ARCHITECTURE.md
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| SDK test coverage | >85% | Vitest coverage report |
| Service uptime | 99.9% | Health checks |
| API response time | <200ms | P95 latency |
| All 12 modules | 12/12 built | Service registry |
| Documentation | 100% API covered | OpenAPI spec |
| SDK package | Published to npm | npm registry |

---

## Next Steps After Approval

1. Create SDK package structure
2. Build Customer Intelligence Gateway (orchestrator)
3. Build COD Intelligence Service (highest priority)
4. Build Return Risk Engine
5. Build remaining services
6. Integrate all into SDK
7. Add comprehensive tests
8. Publish SDK package
