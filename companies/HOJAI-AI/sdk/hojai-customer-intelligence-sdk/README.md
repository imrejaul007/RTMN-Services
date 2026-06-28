# Customer Intelligence SDK

**Version:** 1.0.0  
**Package:** `@hojai/customer-intelligence-sdk`  
**Services:** 12 modules | **Status:** Production Ready

Unified SDK for HOJAI Customer Intelligence — trust scores, COD recommendations, return risk, support intelligence, and more.

---

## Installation

```bash
npm install @hojai/customer-intelligence-sdk
```

---

## Quick Start

```typescript
import { CustomerIntelligenceSDK } from '@hojai/customer-intelligence-sdk';

const sdk = new CustomerIntelligenceSDK({
  gatewayUrl: 'http://localhost:4896',
  apiKey: 'your-api-key'
});

// Full customer analysis
const result = await sdk.analyze({ phone: '+91XXXXXXXXXX' });
console.log(result.data.trust_score);
console.log(result.data.cod_recommendation.allowed);
```

---

## All 12 Modules

| Module | Method | Purpose |
|--------|--------|---------|
| **Identity** | `sdk.identity.resolve()` | Customer identity resolution |
| **Trust Score** | `sdk.trust.score()` | Customer trust scoring |
| **COD Intelligence** | `sdk.cod.recommend()` | Cash on Delivery recommendations |
| **Return Risk** | `sdk.returns.risk()` | Return abuse detection |
| **Support Intelligence** | `sdk.support.profile()` | Support behavior profiling |
| **Sales Intelligence** | `sdk.sales.preferences()` | Selling preferences |
| **Customer Twin** | `sdk.twin.profile()` | Digital twin data |
| **Recommendations** | `sdk.recommendations.get()` | Next best actions |
| **Customer Graph** | `sdk.graph.resolve()` | Relationship graph |
| **Risk Engine** | `sdk.risk.scores()` | Fraud and churn scores |
| **Loyalty** | `sdk.loyalty.profile()` | LTV and retention |
| **Communication** | `sdk.communication.preferences()` | Channel and tone |

---

## Examples

### Full Customer Analysis

```typescript
const analysis = await sdk.analyze({
  phone: '+919876543210',
  email: 'customer@example.com'
});

// Returns: trust_score, cod_recommendation, return_risk, 
//          support_profile, selling_preferences, loyalty, 
//          communication, risk, segments
```

### COD Recommendation

```typescript
const cod = await sdk.cod.recommend({
  orderHistory: { total: 10, completed: 9, returned: 1 },
  addressHistory: { changes90d: 0, verified: true },
  purchaseAmount: 2500
});

if (cod.data.allowed) {
  console.log('Allow COD with', cod.data.confidence, '% confidence');
}
```

### Return Risk Assessment

```typescript
const returns = await sdk.returns.risk({
  orderHistory: { orders: 20, returns: 1 },
  returnVelocity: { returns7d: 0, returns30d: 1 }
});

console.log('Return risk:', returns.data.risk);
console.log('Policy:', returns.data.policy_recommendation);
```

### Support Profile

```typescript
const support = await sdk.support.profile({
  ticketHistory: { total: 5, last90d: 2, escalations: 0 },
  sentiment: 'neutral'
});

console.log('Priority:', support.data.priority);
console.log('Recommended tone:', support.data.recommended_tone);
console.log('Preferred channel:', support.data.preferred_channel);
```

### Sales Preferences

```typescript
const sales = await sdk.sales.preferences({
  purchaseHistory: {
    totalSpend: 50000,
    orderCount: 20,
    avgOrderValue: 2500
  }
});

console.log('Segment:', sales.data.customer_segment);
console.log('Premium buyer:', sales.data.premium_buyer);
console.log('Next offer:', sales.data.next_best_offer);
```

### Loyalty Profile

```typescript
const loyalty = await sdk.loyalty.profile({
  purchaseHistory: { orders: 50, totalSpend: 50000 },
  engagementHistory: { logins: 100, referrals: 5 }
});

console.log('LTV:', loyalty.data.ltv.current);
console.log('Tier:', loyalty.data.ltv_tier);
console.log('Churn risk:', loyalty.data.churn_risk.probability);
```

### Communication Preferences

```typescript
const comm = await sdk.communication.preferences({
  channelHistory: { whatsapp: 50, email: 30 },
  sentimentHistory: { positive: 10, negative: 2 }
});

console.log('Preferred channel:', comm.data.preferred_channel);
console.log('Tone:', comm.data.preferred_tone);
console.log('Best time:', comm.data.best_time);
```

---

## API Reference

### CustomerIntelligenceSDK

```typescript
// Initialize
const sdk = new CustomerIntelligenceSDK(config);

// Full analysis
sdk.analyze(input) → AnalyzeOutput

// Individual modules
sdk.identity.resolve(input) → GraphResolveOutput
sdk.trust.score(input) → TrustScoreOutput
sdk.cod.recommend(input) → CodRecommendation
sdk.returns.risk(input) → ReturnRiskAssessment
sdk.support.profile(input) → SupportProfile
sdk.sales.preferences(input) → SellingPreferences
sdk.loyalty.profile(input) → LoyaltyProfile
sdk.communication.preferences(input) → CommunicationPreferences
sdk.risk.scores(customerId) → RiskScores
sdk.recommendations.get(input) → RecommendationOutput
sdk.graph.resolve(input) → GraphResolveOutput
```

---

## Configuration

```typescript
interface CustomerIntelligenceConfig {
  gatewayUrl?: string;        // Single entry point
  services?: {                 // Direct service URLs
    gateway?: string;
    identity?: string;
    trust?: string;
    cod?: string;
    returns?: string;
    support?: string;
    sales?: string;
    twin?: string;
    recommendations?: string;
    graph?: string;
    risk?: string;
    loyalty?: string;
    communication?: string;
  };
  apiKey?: string;             // Authentication
  timeout?: number;            // Request timeout (ms)
  retries?: number;            // Retry attempts
  debug?: boolean;             // Debug logging
}
```

---

## Pricing Integration

Track usage for billing:

```typescript
// Track operation
await sdk.usage.track({
  operation: 'analyze',
  customerId: 'cust_123',
  timestamp: new Date().toISOString(),
  success: true,
  latencyMs: 150
});

// Get usage report
const report = await sdk.usage.report('2026-06-01', '2026-06-30');
console.log('Total calls:', report.data.totalCalls);
```

---

## Privacy Architecture

This SDK follows a **signals-only** architecture:

✅ **Never exposed:**
- Order history details
- Merchant names
- Addresses
- Transaction details
- Personal information

✅ **Always exposed:**
- Trust scores (0-100)
- Risk levels (low/medium/high)
- Recommendations (allow/block/review)
- Behavioral predictions
- Preference signals

---

## License

Proprietary - HOJAI AI
