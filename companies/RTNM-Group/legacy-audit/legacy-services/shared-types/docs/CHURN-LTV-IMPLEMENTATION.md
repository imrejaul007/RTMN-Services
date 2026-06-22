# Churn Prediction and LTV (Lifetime Value) Implementation

**Created:** April 30, 2026
**Service:** `rez-merchant-service`
**App:** `rez-app-merchant`

---

## Overview

This document describes the implementation of Churn Prediction and Lifetime Value (LTV) models for the REZ Merchant platform. These analytics help merchants understand customer behavior, predict which customers are at risk of churning, and calculate the expected value of each customer relationship.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Merchant App (Mobile)                         │
│  ┌──────────────────┐     ┌──────────────────────┐             │
│  │  churn-risk.tsx  │     │   ltv-segments.tsx   │             │
│  └────────┬─────────┘     └──────────┬───────────┘             │
└───────────┼──────────────────────────┼────────────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   rez-merchant-service                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  API Routes                               │    │
│  │  /merchant/analytics/churn-prediction/*                  │    │
│  │  /merchant/analytics/ltv/*                              │    │
│  │  /merchant/analytics/customer-segments/*                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐   ┌──────────────────┐  ┌─────────────────┐  │
│  │ ChurnAgent  │   │  LTVCalculator   │  │CustomerSegments │  │
│  │ (RFM Scoring)│   │                  │  │  (Combined)     │  │
│  └──────────────┘   └──────────────────┘  └─────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    MongoDB                                │    │
│  │  Orders, StorePayments, CustomerMeta, Stores             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Churn Prediction Agent

**File:** `/rez-merchant-service/src/services/churnAgent.ts`

### Core Concepts

#### RFM (Recency, Frequency, Monetary) Scoring

RFM is a proven customer segmentation technique:

| Factor | Description | Scoring |
|--------|-------------|---------|
| **Recency (R)** | Days since last order | 1-5 (lower days = higher score) |
| **Frequency (F)** | Number of orders | 1-5 (more orders = higher score) |
| **Monetary (M)** | Total amount spent | 1-5 (higher spend = higher score) |

The combined RFM score ranges from 3 (worst) to 15 (best).

### Churn Probability Calculation

The churn probability (0-100%) is calculated using:

```typescript
// Base probability from RFM score
const rfmBaseProbability = ((15 - rfmScore.totalScore) / 15) * 50;

// Recency penalty (exponential for very old customers)
const recencyPenalty = Math.min(50, (rfmScore.recency / 90) * 50);

// Sigmoid transformation for smooth 0-100 range
const probability = 100 / (1 + Math.exp(-0.1 * (baseProbability - 50)));
```

### Risk Levels

| Risk Level | Probability Range | Days Since Last Order |
|------------|-------------------|----------------------|
| **Critical** | 80-100% | 90+ days |
| **High** | 60-79% | 60-89 days |
| **Medium** | 40-59% | 30-59 days |
| **Low** | 0-39% | 0-29 days |

### Key Methods

```typescript
// Main analysis
ChurnAgent.analyzeChurn(merchantId, options?)

// RFM scoring
ChurnAgent.calculateRFMScores(merchantId, storeIds, lookbackDays?)

// Individual customer prediction
ChurnAgent.getCustomerChurnPrediction(merchantId, userId)

// Get customers by risk level
ChurnAgent.getCustomersByRiskLevel(merchantId, riskLevel)
```

---

## 2. LTV Calculator

**File:** `/rez-merchant-service/src/services/ltvCalculator.ts`

### LTV Formula

```
LTV = Average Order Value × Order Frequency × Customer Lifespan
```

Where:
- **Average Order Value (AOV)** = Total Spent / Number of Orders
- **Order Frequency** = Orders per month
- **Customer Lifespan** = Expected months of customer relationship

### LTV Segments

| Segment | Minimum LTV | Minimum Orders | Minimum Frequency |
|---------|-------------|----------------|-------------------|
| **VIP** | Rs. 50,000 | 10+ orders | 2 orders/month |
| **High** | Rs. 15,000 | 5+ orders | 1 order/month |
| **Medium** | Rs. 5,000 | 2+ orders | 0.5 orders/month |
| **Low** | Rs. 0 | 1+ order | Any |

### Customer Lifespan Calculation

```typescript
// Historical lifespan from order data
const customerAgeDays = lastOrderDate - firstOrderDate;
const historicalMonths = customerAgeDays / 30;

// Order rate
const orderRate = totalOrders / historicalMonths;

// Estimated remaining months based on purchase pattern
const estimatedRemainingMonths = Math.min(24, 30 / orderRate);

return Math.min(DEFAULT_LIFESPAN_MONTHS, historicalMonths + estimatedRemainingMonths);
```

### Confidence Levels

| Confidence | Orders Required | Days as Customer |
|------------|-----------------|------------------|
| **High** | 10+ orders | 180+ days |
| **Medium** | 3+ orders | 30+ days |
| **Low** | Any | Any |

### Key Methods

```typescript
// Full LTV analysis
LTVCalculator.analyzeLTV(merchantId, options?)

// Individual customer LTV
LTVCalculator.getCustomerLTV(merchantId, userId)

// Get segment profiles with recommendations
LTVCalculator.getSegmentProfiles(merchantId)

// Store LTV in customer profile
LTVCalculator.storeLTVInProfile(merchantId, userId, ltvMetrics)

// Get top N customers by LTV
LTVCalculator.getTopLTVCustomers(merchantId, limit?)
```

---

## 3. API Routes

### Churn Prediction Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/merchant/analytics/churn-prediction` | Full churn analysis |
| GET | `/merchant/analytics/churn-prediction/summary` | Quick summary for dashboard |
| GET | `/merchant/analytics/churn-prediction/customer/:userId` | Single customer prediction |
| GET | `/merchant/analytics/churn-prediction/risk-level/:level` | Customers by risk level |
| GET | `/merchant/analytics/churn-prediction/alerts` | Active churn alerts |

### LTV Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/merchant/analytics/ltv` | Full LTV analysis |
| GET | `/merchant/analytics/ltv/summary` | Quick summary for dashboard |
| GET | `/merchant/analytics/ltv/segments` | Segment profiles with recommendations |
| GET | `/merchant/analytics/ltv/segment/:segment` | Customers by segment |
| GET | `/merchant/analytics/ltv/customer/:userId` | Single customer LTV |
| GET | `/merchant/analytics/ltv/top` | Top N customers by LTV |
| POST | `/merchant/analytics/ltv/refresh-profiles` | Refresh LTV in customer profiles |

### Customer Segments Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/merchant/analytics/customer-segments` | Combined churn + LTV segments |
| GET | `/merchant/analytics/customer-segments/summary` | Combined summary |
| GET | `/merchant/analytics/customer-segments/matrix` | Churn risk vs LTV segment matrix |
| GET | `/merchant/analytics/customer-segments/actionable` | Actionable segment insights |

---

## 4. Data Models

### Types

```typescript
// Churn Prediction
interface ChurnPrediction {
  userId: string;
  churnProbability: number;      // 0-100%
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  daysSinceLastOrder: number;
  lastOrderDate: Date | null;
  predictedChurnDate: Date | null;
  rfmScore: RFMScore;
  reasons: string[];
  recommendedActions: string[];
}

// LTV Metrics
interface LTVMetrics {
  userId: string;
  averageOrderValue: number;
  orderFrequency: number;        // orders per month
  customerLifespan: number;      // months
  totalOrders: number;
  totalSpent: number;
  ltv: number;
  ltvSegment: 'Low' | 'Medium' | 'High' | 'VIP';
  confidence: 'high' | 'medium' | 'low';
  calculatedAt: Date;
}

// Customer Segment Profile
interface LTVSegmentProfile {
  segment: LTVSegment;
  count: number;
  averageLTV: number;
  totalLTV: number;
  averageOrderValue: number;
  averageOrderFrequency: number;
  averageCustomerLifespan: number;
  percentageOfCustomers: number;
  percentageOfTotalLTV: number;
  characteristics: string[];
  recommendedActions: string[];
}
```

### CustomerMeta Schema Extension

LTV scores are stored in the existing `CustomerMeta` model:

```typescript
{
  ltvScore: Number,           // Calculated LTV
  ltvSegment: String,         // 'Low' | 'Medium' | 'High' | 'VIP'
  ltvMetrics: {
    averageOrderValue: Number,
    orderFrequency: Number,
    customerLifespan: Number,
    totalOrders: Number,
    totalSpent: Number,
    confidence: String,
    calculatedAt: Date
  }
}
```

---

## 5. Mobile App Screens

### Churn Risk Screen (`/app/analytics/churn-risk.tsx`)

**Features:**
- Summary card with total customers, avg churn probability, churn rate
- Risk distribution grid showing customer counts per risk level
- Active alerts banner (critical/warnings)
- Tap on risk level to view customers in that segment
- Customer cards with reasons and recommended actions
- Recent alerts list

**Navigation:** From Analytics tab, merchants can access this screen to monitor customer health.

### LTV Segments Screen (`/app/analytics/ltv-segments.tsx`)

**Features:**
- Summary card with total LTV, average LTV, median LTV
- VIP highlight showing contribution to total value
- Visual segment distribution bar
- Segment cards with metrics and recommendations
- Tap on segment to view customers
- Top customer trophy card
- Customer list with confidence badges

**Navigation:** From Analytics tab, merchants can access this screen to understand customer value distribution.

---

## 6. Business Recommendations

### Segment-Specific Actions

#### VIP Customers (Top Tier)
- Provide exclusive experiences and early access to new products
- Personal account managers for top accounts
- Request testimonials and referrals
- Premium loyalty rewards

#### High Value Customers
- Target with premium product offerings
- Personalized campaigns to increase engagement
- Create upgrade path to VIP status
- Loyalty incentives for repeat purchases

#### Medium Value Customers
- Increase purchase frequency with targeted promotions
- Introduce bundle offers to increase AOV
- Win-back campaigns for dormant periods
- Cross-sell complementary products

#### Low Value / At-Risk Customers
- Onboarding sequences to encourage repeat purchase
- First-time buyer incentives
- Reactivation campaigns for lapsed customers
- Minimize acquisition cost for this segment

### Churn Prevention Strategies

| Risk Level | Immediate Actions |
|------------|-------------------|
| **Critical** | Personal outreach, significant win-back offers, phone calls |
| **High** | Re-engagement email campaigns, special discounts |
| **Medium** | Targeted promotions, new product announcements |
| **Low** | Continue regular engagement, encourage referrals |

---

## 7. Configuration

### Environment Variables

```typescript
// Default churn thresholds (can be overridden per merchant)
const DEFAULT_CHURN_THRESHOLDS = {
  criticalDays: 90,   // Days for critical churn
  highRiskDays: 60,   // Days for high risk
  mediumRiskDays: 30, // Days for medium risk
  lowRiskDays: 14,    // Days for low risk
};

// Default LTV segments
const DEFAULT_LTV_SEGMENTS = {
  vip: { minLTV: 50000, minOrders: 10, minFrequency: 2 },
  high: { minLTV: 15000, minOrders: 5, minFrequency: 1 },
  medium: { minLTV: 5000, minOrders: 2, minFrequency: 0.5 },
  low: { minLTV: 0, minOrders: 1, minFrequency: 0 },
};

// Default customer lifespan assumption (months)
const DEFAULT_LIFESPAN_MONTHS = 24;
```

---

## 8. Performance Considerations

- **Indexing:** Queries use existing indexes on `Order.store`, `Order.user`, `Order.createdAt`, and `Order.payment.status`
- **Aggregation:** Uses MongoDB aggregation pipeline for efficient calculation
- **Caching:** Consider implementing Redis caching for frequently accessed analyses
- **Async Processing:** For large merchants, consider background job processing

---

## 9. Future Enhancements

1. **Predictive ML Models:** Replace rule-based scoring with trained ML models using historical data
2. **Cohort Analysis:** Track churn rates over time for customer cohorts
3. **Segment Evolution:** Track how customers move between segments over time
4. **Campaign Integration:** Direct integration with campaign service for automated re-engagement
5. **A/B Testing:** Test different re-engagement strategies per segment
6. **Real-time Scoring:** Update scores on each new order

---

## 10. Files Reference

### Backend Service (`rez-merchant-service`)

| File | Description |
|------|-------------|
| `src/services/churnAgent.ts` | Churn prediction logic with RFM scoring |
| `src/services/ltvCalculator.ts` | LTV calculation and segmentation |
| `src/routes/analytics/churnPrediction.ts` | Churn API endpoints |
| `src/routes/analytics/ltv.ts` | LTV API endpoints |
| `src/routes/analytics/customerSegments.ts` | Combined segment endpoints |
| `src/routes/analytics/index.ts` | Router aggregator (updated) |
| `src/models/CustomerMeta.ts` | Extended with LTV fields |

### Mobile App (`rez-app-merchant`)

| File | Description |
|------|-------------|
| `app/analytics/churn-risk.tsx` | Churn risk dashboard screen |
| `app/analytics/ltv-segments.tsx` | LTV segments screen |
| `types/analytics.ts` | Extended with churn/LTV types |

---

**Document Version:** 1.0
**Last Updated:** April 30, 2026
