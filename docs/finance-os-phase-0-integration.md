# FinanceOS Phase 0: Integration Foundation
**Duration:** 2 weeks  
**Goal:** Wire existing services into unified FinanceOS

---

## Current State

We have **5 production services** that work independently:

| Service | Port | What it does | Data |
|---------|------|-------------|------|
| RABTUL Treasury OS | 4055 | Cash, investments, forecasting | ✅ MongoDB |
| REZ Payment Service | 4001 | Payments, refunds | ✅ MongoDB |
| REZ Wallet | 4004 | Wallets, credit, BNPL | ✅ MongoDB |
| Revenue Intelligence OS | 5400 | Demand/price intelligence | ✅ MongoDB |
| Industry Finance OS | 4801 | GL, AP, AR, payroll | ✅ In-memory |

**Problem:** They don't talk to each other. Finance OS has fake data.

---

## Phase 0 Tasks

### Week 1: Treasury + Payments Integration

#### Task 1.1: Connect Treasury → Finance OS (3 days)

**What:** Finance OS dashboard pulls real cash from RABTUL Treasury

**Current:**
```javascript
// finance-os - fake cash data
GET /api/dashboard/overview → 
  cash: 7,960,000  // hardcoded
```

**Target:**
```javascript
// finance-os - real cash from Treasury
GET /api/dashboard/overview → 
  cash: (fetch from RABTUL Treasury /api/v1/accounts/:businessId/position)
```

**Files to modify:**
- `industry-os/services/finance-os/src/index.js`
- Add `src/integrations/treasuryIntegration.js`

**Implementation:**
```javascript
// src/integrations/treasuryIntegration.js
const TREASURY_URL = process.env.TREASURY_URL || 'http://localhost:4055';

async function getCashPosition(businessId) {
  const res = await fetch(`${TREASURY_URL}/api/v1/accounts/${businessId}/position`);
  const data = await res.json();
  return {
    total: data.totalBalance,
    available: data.availableBalance,
    reserved: data.reservedBalance,
    currency: data.currency
  };
}

async function getCashFlow(businessId, period = 'monthly') {
  const res = await fetch(`${TREASURY_URL}/api/v1/cash-flow/${businessId}`);
  return res.json();
}

module.exports = { getCashPosition, getCashFlow };
```

**Update dashboard endpoint:**
```javascript
// In finance-os/src/index.js
const { getCashPosition, getCashFlow } = require('./integrations/treasuryIntegration');

app.get('/api/dashboard/overview', async (req, res) => {
  const { businessId } = req.query;
  
  // Get real cash from Treasury
  const cashData = businessId ? await getCashPosition(businessId) : null;
  
  res.json({
    financial: { assets, revenue, expenses, profit: revenue - expenses },
    cash: cashData?.total || cash,  // Use real data if available
    cashFlow: cashData ? await getCashFlow(businessId) : null,
    receivables, payables,
    budgets: { allocated, spent }
  });
});
```

#### Task 1.2: Connect Payments → Finance OS (2 days)

**What:** Finance OS shows real payment metrics from REZ Payment

**Integration:**
```javascript
// src/integrations/paymentIntegration.js
const PAYMENT_URL = process.env.PAYMENT_URL || 'http://localhost:4001';

async function getPaymentStats(businessId, period = '30d') {
  // Payment metrics from RABTUL
  const res = await fetch(`${PAYMENT_URL}/api/v1/payments/stats?businessId=${businessId}&period=${period}`);
  return res.json();
}

async function getPaymentVolume(businessId) {
  const res = await fetch(`${PAYMENT_URL}/api/v1/payments/volume?businessId=${businessId}`);
  return res.json();
}
```

**Add to Finance OS dashboard:**
```javascript
app.get('/api/dashboard/overview', async (req, res) => {
  const paymentStats = await getPaymentStats(businessId);
  
  res.json({
    // ... existing fields
    payments: {
      totalVolume: paymentStats.totalVolume,
      successfulCount: paymentStats.successfulCount,
      failedCount: paymentStats.failedCount,
      avgTransactionValue: paymentStats.avgValue,
      successRate: paymentStats.successRate
    }
  });
});
```

---

### Week 2: Revenue Intelligence + FP&A Integration

#### Task 2.1: Connect Revenue Intelligence → Finance OS (2 days)

**What:** Finance OS shows AI-powered revenue forecasts

**Revenue Intelligence endpoints (port 5400):**
```
GET /api/revenue/demand-forecast     → 90-day demand forecast
GET /api/revenue/pricing-recommendations → Dynamic pricing
GET /api/revenue/cohorts           → Customer cohort analysis
GET /api/revenue/revops-metrics    → MRR, ARR, churn
```

**Integration:**
```javascript
// src/integrations/revenueIntegration.js
const REVENUE_URL = process.env.REVENUE_URL || 'http://localhost:5400';

async function getRevenueForecast(industry) {
  const res = await fetch(`${REVENUE_URL}/api/revenue/demand-forecast?industry=${industry}`);
  return res.json();
}

async function getRevenueMetrics(businessId) {
  const res = await fetch(`${REVENUE_URL}/api/revenue/revops-metrics?businessId=${businessId}`);
  return res.json();
}
```

**Update Finance OS P&L:**
```javascript
app.get('/api/dashboard/overview', async (req, res) => {
  const revenueMetrics = await getRevenueMetrics(businessId);
  
  res.json({
    // ... existing fields
    revenue: {
      actual: revenue,  // From accounting
      forecast: revenueMetrics.mrr,
      arr: revenueMetrics.arr,
      growth: revenueMetrics.growthRate,
      churn: revenueMetrics.churnRate
    }
  });
});
```

#### Task 2.2: Connect FP&A → Revenue Intelligence (3 days)

**What:** FP&A forecasting uses real demand intelligence

**Current (fake):**
```javascript
// HOJAI FP&A - hardcoded forecast
async function generateForecast(budget) {
  return {
    monthly: budget.monthly.map(m => ({
      ...m,
      projected: m.base * 1.02  // 2% hardcoded growth
    }))
  };
}
```

**Target (real):**
```javascript
// HOJAI FP&A - AI-powered forecast
async function generateForecast(budget) {
  const { getRevenueForecast } = require('./integrations/revenueIntegration');
  
  const demandForecast = await getRevenueForecast(budget.industry);
  const revenueForecast = demandForecast.map(d => ({
    month: d.month,
    projected: d.demand * budget.avgDealSize,
    confidence: d.confidence
  }));
  
  return {
    monthly: revenueForecast,
    summary: {
      totalProjected: revenueForecast.reduce((s, r) => s + r.projected, 0),
      avgGrowth: demandForecast.avgGrowthRate
    }
  };
}
```

**Add to FP&A OS:**
```javascript
// fpa-os/src/integrations/revenueIntelligence.js
const REVENUE_URL = process.env.REVENUE_URL || 'http://localhost:5400';

class RevenueIntelligenceConnector {
  async getDemandForecast(params) {
    const res = await fetch(`${REVENUE_URL}/api/revenue/demand-forecast`, {
      query: params
    });
    return res.json();
  }
  
  async getPricingIntelligence(params) {
    const res = await fetch(`${REVENUE_URL}/api/revenue/pricing-recommendations`, {
      query: params
    });
    return res.json();
  }
  
  async getCohortAnalysis(params) {
    const res = await fetch(`${REVENUE_URL}/api/revenue/cohorts`, {
      query: params
    });
    return res.json();
  }
}

module.exports = new RevenueIntelligenceConnector();
```

#### Task 2.3: Connect FP&A → Treasury (2 days)

**What:** Cash flow forecasting uses real Treasury data

```javascript
// fpa-os/src/integrations/treasuryConnector.js
const TREASURY_URL = process.env.TREASURY_URL || 'http://localhost:4055';

async function getCashForecast(businessId) {
  const res = await fetch(`${TREASURY_URL}/api/v1/forecast/${businessId}/current`);
  return res.json();
}

async function getShortfallAlerts(businessId) {
  const res = await fetch(`${TREASURY_URL}/api/v1/forecast/${businessId}/shortfall`);
  return res.json();
}

// Use in FP&A cash forecast
app.post('/api/forecasts', async (req, res) => {
  const { businessId, type } = req.body;
  
  if (type === 'cash') {
    const treasuryForecast = await getCashForecast(businessId);
    const shortfall = await getShortfallAlerts(businessId);
    
    return res.json({
      type: 'cash',
      forecast: treasuryForecast,
      alerts: shortfall,
      runway: treasuryForecast.runway
    });
  }
  
  // ... existing logic
});
```

---

## Phase 0 Deliverables

### After Week 1:
| Deliverable | Status | Verification |
|-------------|--------|--------------|
| Finance OS shows real cash from Treasury | ✅ | `curl localhost:4801/api/dashboard/overview` shows Treasury cash |
| Finance OS shows payment volumes | ✅ | Payment stats in dashboard response |
| Cash flow chart uses real Treasury data | ✅ | `/api/dashboard/cashflow` returns Treasury data |

### After Week 2:
| Deliverable | Status | Verification |
|-------------|--------|--------------|
| FP&A forecast uses Revenue Intelligence | ✅ | Forecasts match demand forecast |
| FP&A cash forecast uses Treasury | ✅ | Cash forecasts match Treasury |
| Finance OS shows AI revenue metrics | ✅ | MRR, ARR, churn in dashboard |

---

## Test Commands

```bash
# Test Treasury integration
curl http://localhost:4055/api/v1/accounts/test-business/position

# Test Finance OS (before integration)
curl http://localhost:4801/api/dashboard/overview

# Test Finance OS (after - should show Treasury data)
curl "http://localhost:4801/api/dashboard/overview?businessId=test-business"

# Test Revenue Intelligence
curl http://localhost:5400/api/revenue/demand-forecast?industry=restaurant

# Test FP&A
curl -X POST http://localhost:4802/api/forecasts \
  -H 'Content-Type: application/json' \
  -d '{"businessId": "test-business", "type": "cash"}'
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `industry-os/services/finance-os/src/integrations/treasuryIntegration.js` | Create | Connect to RABTUL Treasury |
| `industry-os/services/finance-os/src/integrations/paymentIntegration.js` | Create | Connect to REZ Payment |
| `industry-os/services/finance-os/src/integrations/revenueIntegration.js` | Create | Connect to Revenue Intelligence |
| `industry-os/services/finance-os/src/index.js` | Modify | Use integrations |
| `companies/HOJAI-AI/platform/company-os/finance-os/fpa-os/src/integrations/` | Create | Revenue + Treasury connectors |
| `companies/HOJAI-AI/platform/company-os/finance-os/fpa-os/src/index.ts` | Modify | Use integrations |

---

## Environment Variables

```bash
# .env for Finance OS
TREASURY_URL=http://localhost:4055
PAYMENT_URL=http://localhost:4001
WALLET_URL=http://localhost:4004
REVENUE_URL=http://localhost:5400
TREASURY_INTERNAL_TOKEN=your-token-here
```

---

*Phase 0: Integration Foundation*
*Estimated completion: 2 weeks*
