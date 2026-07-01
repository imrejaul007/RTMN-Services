# MarketingOS Phase-wise Build Plan — July 2, 2026

> **Reality Check:** MarketingOS is **85% built** across 15+ services. The gap is **integration + 2 new modules (RevenueOS, CreatorOS)**, not wholesale building.

---

## Phase 0: Quick Wins (This Week)

**Goal:** Wire existing services for immediate value

### Task 0.1: Marketing OS → Intent Attribution (2 days)

**Current State:** Marketing OS has mock attribution data
**Target State:** Real attribution data from `intent-attribution` service (port 4803)

**Steps:**
1. Update `RTMNMarketingHub.js` to call `intent-attribution:4803`
2. Replace mock `GET /api/adbazaar/attribution` with real call
3. Add `/api/attribution/report` endpoint in Marketing OS
4. Add `/api/attribution/roi` endpoint in Marketing OS

**Deliverables:**
- Real attribution data in Marketing OS dashboard
- Multi-touch attribution (6 models)
- ROI metrics per campaign

**Code Changes:**
```javascript
// In RTMNMarketingHub.js - Add attribution integration
const attributionService = axios.create({ baseURL: 'http://localhost:4803' });

async getAttributionReport(campaignId) {
  const response = await attributionService.get(`/api/attribution/report`, {
    params: { campaignId }
  });
  return response.data;
}
```

---

### Task 0.2: Marketing OS → AdBazaar DSP (3 days)

**Current State:** Mock AdBazaar data
**Target State:** Real AdBazaar DSP integration

**Steps:**
1. Get real AdBazaar API credentials
2. Update `AdBazaarService.js` with real API calls
3. Add DSP budget management
4. Add real-time bidding endpoints

**Deliverables:**
- Real campaign performance from AdBazaar
- Live budget management
- Actual audience sync

---

## Phase 1: Integration & Wire Up (Week 1-2)

**Goal:** Connect all 15 services to Marketing OS as unified layer

### 1.1 Wire Marketing OS → All Services (5 days)

| Connection | Service | Port | Data Flow |
|------------|---------|------|-----------|
| → Intent Attribution | intent-attribution | 4803 | Attribution models |
| → A/B Testing | REZ-ab-testing | - | Variant results |
| → CDP | adbazaar-cdp | 4961 | Customer profiles |
| → Growth Engine | growth-engine | 3002 | Referral metrics |
| → Attribution Engine | attribution-engine | 3004 | Channel attribution |
| → Marketing Agent | adbazaar-marketing-agent | 4965 | AI recommendations |
| → Social Analytics | social-analytics-service | - | Social metrics |
| → Lead Scoring | lead-scoring | 5458 | Lead quality |

**Implementation:**
```javascript
// New unified marketing hub in Marketing OS
class UnifiedMarketingHub {
  constructor() {
    this.attribution = new AttributionClient('http://localhost:4803');
    this.abTesting = new ABTestClient('http://localhost:5001');
    this.cdp = new CDPClient('http://localhost:4961');
    this.growth = new GrowthClient('http://localhost:3002');
  }

  async getCampaignAnalytics(campaignId) {
    const [attribution, abTesting, cdp] = await Promise.all([
      this.attribution.getReport(campaignId),
      this.abTesting.getResults(campaignId),
      this.cdp.getAudienceInsights(campaignId)
    ]);
    return { attribution, abTesting, cdp };
  }
}
```

### 1.2 Add Unified Dashboard (3 days)

**Endpoints:**
```
GET /api/dashboard/overview        # All metrics
GET /api/dashboard/campaigns       # Campaign performance
GET /api/dashboard/audience       # Audience insights
GET /api/dashboard/revenue         # Revenue attribution
GET /api/dashboard/growth         # Growth metrics
```

### 1.3 Add Cross-Service Analytics (2 days)

**Features:**
- Attribution + A/B Testing combined analysis
- CDP + Growth Engine cohort analysis
- Marketing Agent → All services orchestration

**Deliverables:**
- Single dashboard with all marketing metrics
- Unified campaign analytics
- Cross-service insights

---

## Phase 2: Persistence Fixes (Week 3)

**Goal:** Move in-memory services to MongoDB

### 2.1 Growth Engine → MongoDB (3 days)

**Current:** In-memory Maps
**Target:** MongoDB collections

**Collections:**
- `referrals` — Referral records
- `referralCodes` — Referral codes
- `growthCampaigns` — Campaign data
- `viralMetrics` — Viral coefficients

**Implementation:**
```javascript
// Add to growth-engine/src/models/
const referralSchema = new mongoose.Schema({
  referrerId: String,
  refereeId: String,
  referralCode: String,
  status: { type: String, enum: ['pending', 'converted', 'expired'] },
  tier: Number,
  rewardEarned: Number,
  createdAt: Date,
  convertedAt: Date
});

mongoose.model('Referral', referralSchema);
```

### 2.2 Attribution Engine → MongoDB (3 days)

**Current:** In-memory Maps
**Target:** MongoDB collections

**Collections:**
- `touchpoints` — All touchpoints
- `conversions` — Conversion records
- `campaigns` — Campaign data
- `channels` — Channel metrics

### 2.3 WhatsApp Commerce → MongoDB (3 days)

**Current:** In-memory cart with 30-min TTL
**Target:** MongoDB cart + order persistence

**Collections:**
- `carts` — Shopping carts
- `orders` — Order records
- `products` — Product catalog

---

## Phase 3: RevenueOS — Build (Week 4-5)

**This is the ONLY truly missing canonical module.**

### 3.1 Architecture

```
RevenueOS (port 5700)
├── CAC Calculator
│   ├── Cost aggregation (ads, content, team)
│   ├── Customer attribution
│   └── Channel CAC breakdown
├── LTV Predictor
│   ├── Cohort analysis
│   ├── Retention curves
│   └── Revenue per customer
├── Pipeline Influencer
│   ├── Lead → MQL → SQL → Opportunity → Won
│   ├── Marketing influenced pipeline
│   └── Revenue attribution
├── Revenue Forecaster
│   ├── Historical patterns
│   ├── Seasonal adjustments
│   └── Scenario modeling
├── Channel ROI Analyzer
│   ├── ROAS per channel
│   ├── Channel efficiency
│   └── Budget optimization
└── Growth Accountant
    ├── MRR/ARR tracking
    ├── Net new revenue
    └── Expansion revenue
```

### 3.2 API Endpoints

```
# CAC
GET  /api/cac                    # Overall CAC
GET  /api/cac/by-channel         # CAC per channel
GET  /api/cac/by-campaign        # CAC per campaign
GET  /api/cac/by-segment        # CAC per segment

# LTV
GET  /api/ltv                    # Overall LTV
GET  /api/ltv/by-cohort         # LTV by cohort
GET  /api/ltv/prediction/:id    # Predict customer LTV

# Pipeline
GET  /api/pipeline/attribution   # Marketing influenced
GET  /api/pipeline/stage        # Pipeline by stage
GET  /api/pipeline/forecast     # Pipeline forecast

# Revenue
GET  /api/revenue/attribution   # Revenue by channel
GET  /api/revenue/forecast      # Revenue forecast
GET  /api/revenue/roi           # ROI per channel

# Dashboard
GET  /api/dashboard/revenue     # Full revenue dashboard
```

### 3.3 Data Sources (Integrations)

| Source | Data |
|--------|------|
| Intent Attribution | Channel attribution, touchpoints |
| Marketing OS | Campaign spend, conversions |
| CDP | Customer data, cohorts |
| Sales OS | Pipeline, deals, revenue |
| REZ Wallet | Payments, transactions |

### 3.4 Implementation

**File:** `industry-os/services/marketing-os/src/models/Revenue.js`

```javascript
const revenueSchema = new mongoose.Schema({
  customerId: String,
  channel: String,
  campaign: String,
  cac: Number,
  ltv: Number,
  revenue: Number,
  margin: Number,
  cohort: String,
  acquiredAt: Date,
  metrics: {
    marketingInfluenced: Boolean,
    pipelineStage: String,
    daysToClose: Number
  }
});
```

### 3.5 Key Formulas

```javascript
// CAC
CAC = Total Marketing Cost / New Customers Acquired

// LTV
LTV = Average Revenue Per User × Customer Lifespan
LTV = ARPU × (1 / Churn Rate)

// ROAS
ROAS = Revenue from Campaign / Campaign Cost

// Marketing Efficiency Ratio
MER = Total Revenue / Total Marketing Spend

// Pipeline Influence
Influence % = Deals with Marketing Touchpoints / Total Deals
```

---

## Phase 4: CreatorOS — Build (Week 6-7)

### 4.1 Architecture

```
CreatorOS (port 5701)
├── Creator Marketplace
│   ├── Creator profiles
│   ├── Audience metrics
│   ├── Category tags
│   └── Availability
├── Creator Twin Engine
│   ├── Audience twin
│   ├── Engagement twin
│   ├── Category twin
│   └── Trust twin
├── Campaign Matcher
│   ├── Brand fit scoring
│   ├── Audience overlap
│   └── Price optimization
├── Contract Manager
│   ├── NDA handling
│   ├── Deliverable tracking
│   └── Approval workflow
├── Payment Processor
│   ├── Fee calculation
│   ├── Payment scheduling
│   └── Tax handling
├── UGC Library
│   ├── Content storage
│   ├── Rights management
│   └── Usage tracking
└── Analytics Dashboard
    ├── Performance metrics
    ├── ROI calculation
    └── Creator leaderboard
```

### 4.2 API Endpoints

```
# Creators
GET  /api/creators               # List creators
GET  /api/creators/:id          # Creator profile
POST /api/creators               # Register creator
GET  /api/creators/:id/twin     # Creator twin

# Campaigns
GET  /api/creator-campaigns     # List campaigns
POST /api/creator-campaigns     # Create campaign
POST /api/creator-campaigns/:id/match # Match creators
GET  /api/creator-campaigns/:id/creators # Matched creators

# Contracts
POST /api/contracts              # Create contract
GET  /api/contracts/:id         # Get contract
POST /api/contracts/:id/sign    # Sign contract
POST /api/contracts/:id/deliver # Submit deliverables

# Payments
POST /api/payments               # Process payment
GET  /api/payments/:creatorId   # Creator payments
GET  /api/payments/pending       # Pending payouts

# UGC
POST /api/ugc                   # Upload UGC
GET  /api/ugc/:id               # Get UGC
POST /api/ugc/:id/approve       # Approve UGC
```

### 4.3 Creator Twin Model

```javascript
const creatorTwinSchema = {
  creatorId: String,
  audience: {
    size: Number,
    demographics: Object,
    interests: [String],
    engagementRate: Number
  },
  performance: {
    avgReach: Number,
    avgEngagement: Number,
    conversionRate: Number
  },
  categories: [String],
  trustScore: Number,
  priceRange: {
    min: Number,
    max: Number
  },
  history: {
    campaigns: Number,
    completed: Number,
    avgRating: Number
  }
};
```

---

## Phase 5: IntelligenceOS & Social (Week 8-9)

### 5.1 IntelligenceOS — Add Predictive AI

**New Features:**
- Churn prediction model
- LTV prediction model
- Conversion probability
- Optimal send time prediction
- Content performance prediction

**Implementation:**
```javascript
// New service: marketing-intelligence (port 5702)
class MarketingIntelligence {
  async predictChurn(customerId) {
    const features = await this.getFeatures(customerId);
    return this.model.predict(features);
  }

  async predictLTV(customerId) {
    const cohort = await this.getCohort(customerId);
    return this.calculateLTV(cohort);
  }

  async recommendNextBestAction(customerId) {
    const predictions = await Promise.all([
      this.predictChurn(customerId),
      this.predictLTV(customerId),
      this.getIntentSignals(customerId)
    ]);
    return this.recommendationEngine.optimize(predictions);
  }
}
```

### 5.2 SocialOS — Real API Integration

**New Features:**
- Real Instagram API posting
- Real LinkedIn API posting
- Real Twitter API posting
- Optimal time detection
- Real engagement tracking

**Implementation:**
```javascript
// social-integration-service (port 5703)
class SocialIntegration {
  async postToInstagram(content, credentials) {
    const api = new InstagramAPI(credentials);
    return api.publishPhoto({
      image_url: content.imageUrl,
      caption: content.caption,
      hashtags: content.hashtags
    });
  }

  async getOptimalTime(channel) {
    const historical = await this.getEngagementHistory(channel);
    return this.analytics.findOptimalTime(historical);
  }
}
```

---

## Phase 6: Testing & Documentation (Week 10)

### 6.1 Unit Tests (3 days)

```javascript
// Add vitest tests
describe('RevenueOS', () => {
  test('calculates CAC correctly', async () => {
    const cac = await revenueOS.calculateCAC({
      totalSpend: 10000,
      newCustomers: 100
    });
    expect(cac).toBe(100);
  });

  test('predicts LTV from cohort', async () => {
    const ltv = await revenueOS.predictLTV(cohortId);
    expect(ltv).toBeGreaterThan(0);
  });
});
```

### 6.2 Integration Tests (2 days)

```javascript
// Test service connections
describe('Marketing OS Integration', () => {
  test('fetches attribution data', async () => {
    const data = await marketingOS.getAttribution('camp-123');
    expect(data).toHaveProperty('touchpoints');
  });
});
```

### 6.3 Documentation (3 days)

- API documentation (Swagger)
- Runbook
- Architecture diagrams
- Integration guides

---

## Summary

| Phase | Focus | Duration | Key Deliverables |
|-------|-------|----------|------------------|
| **Phase 0** | Quick Wins | 1 week | Wire Attribution + AdBazaar |
| **Phase 1** | Integration | 2 weeks | All 15 services connected |
| **Phase 2** | Persistence | 1 week | MongoDB for in-memory services |
| **Phase 3** | RevenueOS | 2 weeks | NEW: CAC/LTV/ROI module |
| **Phase 4** | CreatorOS | 2 weeks | NEW: Creator marketplace |
| **Phase 5** | Intelligence | 2 weeks | Predictive AI + Real Social |
| **Phase 6** | Testing | 1 week | Tests + Docs |
| **TOTAL** | | **11 weeks** | |

---

## What NOT To Do

| Don't | Why |
|-------|-----|
| ❌ Don't build new Attribution | 6 models exist in intent-attribution |
| ❌ Don't build new A/B Testing | Statistical significance exists in REZ-ab-testing |
| ❌ Don't build new CDP | Identity resolution exists in adbazaar-cdp |
| ❌ Don't build new Growth Engine | Referral + viral exists in RTNM-REE |
| ❌ Don't build new Marketing Agent | Autonomous execution exists in adbazaar-marketing-agent |

---

## Immediate Start

**Day 1-2:** Wire Marketing OS → Intent Attribution
**Day 3-5:** Wire Marketing OS → AdBazaar DSP (real)

This gives you immediate value with existing code.

---

*Plan Date: July 2, 2026*
*Est. Completion: September 11, 2026 (11 weeks)*
