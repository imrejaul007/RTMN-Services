# Revenue Intelligence OS - Complete API Documentation

## Overview

**Port:** 5400  
**Base URL:** `http://localhost:5400`  
**Content-Type:** `application/json`

---

## Health & Status

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "revenue-intelligence-os",
  "version": "1.0.0",
  "port": 5400,
  "tagline": "The AI Revenue Department",
  "modules": {
    "revenueHub": true,
    "demandIntelligence": true,
    "pricingOptimization": true,
    "promotionManagement": true,
    "revopsIntelligence": true,
    "cohortAnalysis": true,
    "analyticsEngine": true,
    "revenueTwin": true
  },
  "aiAgents": 8,
  "connectedServices": {
    "salesOS": "healthy",
    "financeOS": "healthy",
    "marketingOS": "healthy",
    "operationsOS": "healthy",
    "cxoOS": "healthy"
  }
}
```

### GET /api/status
Get service status with summary metrics.

**Response:**
```json
{
  "modules": { ... },
  "summary": {
    "totalRevenue": 11250000,
    "monthlyGrowth": "8.4",
    "revenueStreams": 5,
    "activePromotions": 3,
    "cohorts": 8,
    "insights": 5,
    "recommendations": 4
  },
  "aiAgents": {
    "total": 8,
    "active": 8
  }
}
```

---

## Revenue Hub

### GET /api/revenue/hub
Get unified revenue overview from all streams.

**Response:**
```json
{
  "totalRevenue": 11250000,
  "revenueBySource": {
    "subscription": 8500000,
    "one-time": 1200000,
    "usage": 450000,
    "services": 780000,
    "marketplace": 320000
  },
  "weightedGrowthRate": "8.4",
  "streams": [
    {
      "id": "REV001",
      "source": "subscription",
      "amount": 8500000,
      "percentage": "75.6",
      "growth": 8.5,
      "status": "active"
    }
  ],
  "trend": [ ... ],
  "updatedAt": "2026-06-18T10:57:46.791Z"
}
```

### GET /api/revenue/snapshots
Get historical revenue snapshots.

**Query Parameters:**
- `period` (optional): Number of months to return (default: 12)

**Response:**
```json
{
  "snapshots": [
    {
      "id": "SNAP000",
      "month": "2026-06",
      "totalRevenue": 10195663,
      "mrr": 7500000,
      "arr": 90000000,
      "newRevenue": 800000,
      "expansionRevenue": 400000,
      "churnRevenue": 200000,
      "netNewRevenue": 1000000
    }
  ],
  "count": 12
}
```

### GET /api/revenue/forecast
Get revenue forecasts.

**Response:**
```json
{
  "forecasts": [
    {
      "id": "FC001",
      "month": "2026-07",
      "predictedRevenue": 12800000,
      "confidence": 90,
      "factors": ["demand_up", "seasonality", "pricing_optimized"]
    }
  ],
  "summary": {
    "nextMonth": { ... },
    "confidenceAvg": 88,
    "predictedGrowth": "6.5"
  }
}
```

### GET /api/revenue/dimensions
Get revenue breakdown by dimension.

**Query Parameters:**
- `dimension`: segment | region | product | source

**Response:**
```json
{
  "dimension": "segment",
  "breakdown": [
    { "name": "Enterprise", "revenue": 6500000, "percentage": 54, "growth": 12.5 },
    { "name": "Professional", "revenue": 4200000, "percentage": 35, "growth": 8.2 },
    { "name": "Starter", "revenue": 1300000, "percentage": 11, "growth": 15.8 }
  ]
}
```

### POST /api/revenue/streams
Add a new revenue stream.

**Request:**
```json
{
  "source": "subscription",
  "amount": 500000,
  "currency": "USD",
  "period": "monthly",
  "growth": 10
}
```

### GET /api/revenue/growth
Get growth metrics.

**Response:**
```json
{
  "periodGrowth": "15.2",
  "avgMonthlyGrowth": "8.5",
  "monthlyGrowth": [
    { "month": "2026-06", "growth": "8.5" }
  ],
  "projections": [
    { "month": "Q3-2026", "projected": 13020000, "confidence": 92 }
  ]
}
```

---

## Demand Intelligence

### GET /api/demand/signals
Get all demand signals.

**Response:**
```json
{
  "signals": [
    {
      "id": "SIG001",
      "type": "organic",
      "source": "SEO",
      "volume": 45000,
      "conversionRate": 3.2,
      "trend": "up",
      "contribution": "41.5",
      "projectedRevenue": 144000
    }
  ],
  "summary": {
    "totalVolume": 108500,
    "avgConversionRate": "4.4",
    "strongestSignal": { "source": "Partners", "conversionRate": 8.5 },
    "trendingUp": 3
  }
}
```

### POST /api/demand/forecast
Run demand forecast.

**Request:**
```json
{
  "horizon": 3,
  "factors": ["economic_downturn", "seasonal_peak"]
}
```

**Response:**
```json
{
  "success": true,
  "forecasts": [
    {
      "horizon": 1,
      "month": "2026-07",
      "predicted": 12945011,
      "confidence": 89,
      "factors": ["seasonality", "trend", "organic_growth", "economic_downturn", "seasonal_peak"]
    }
  ],
  "summary": {
    "baseRevenue": 12000000,
    "totalPredicted": 39588554,
    "avgConfidence": 86
  }
}
```

### GET /api/demand/seasonality
Get seasonality patterns.

**Response:**
```json
{
  "patterns": [
    { "month": "Jul", "index": 1.0, "description": "High Season" },
    { "month": "Jan", "index": 0.85, "description": "Low Season" }
  ],
  "peak": { "month": "July", "index": 1.0 },
  "low": { "month": "January", "index": 0.85 }
}
```

### GET /api/demand/trends
Analyze market trends.

**Response:**
```json
{
  "overallTrend": "accelerating",
  "organicGrowth": 15000,
  "paidGrowth": 8000,
  "signals": [
    { "source": "SEO", "volume": 45000, "trend": "up", "health": "healthy" }
  ],
  "recommendations": [
    { "type": "opportunity", "message": "Strong organic growth...", "impact": "high" }
  ]
}
```

### GET /api/demand/pipeline
Get pipeline coverage ratio.

**Response:**
```json
{
  "totalPipeline": 13500000,
  "targetRevenue": 15000000,
  "coverageRatio": "0.90",
  "monthsOfPipeline": "1.1",
  "health": "adequate"
}
```

---

## Pricing Intelligence

### GET /api/pricing/rules
Get all pricing rules.

**Response:**
```json
{
  "rules": [
    {
      "id": "PRC001",
      "product": "Enterprise",
      "basePrice": 50000,
      "margin": 65,
      "status": "active",
      "monthlyRevenue": 5000000
    }
  ],
  "summary": {
    "avgMargin": "65.0",
    "activeRules": 5,
    "totalProducts": 5
  }
}
```

### POST /api/pricing/optimize
Optimize pricing for a product.

**Request:**
```json
{
  "productId": "PRC001",
  "marketData": {
    "competitorAvg": 48000,
    "demand": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "product": "Enterprise",
  "currentPrice": 50000,
  "optimalPrice": 54000,
  "recommendation": {
    "action": "increase",
    "amount": 4000,
    "percentage": "8.0",
    "confidence": "high"
  },
  "analysis": {
    "competitorAvg": 48000,
    "elasticity": -1.2,
    "position": "premium"
  },
  "impact": {
    "currentRevenue": 5000000,
    "projectedRevenue": 5400000,
    "revenueChange": 400000
  }
}
```

### GET /api/pricing/competitors
Get competitive pricing data.

**Response:**
```json
{
  "competitors": [
    {
      "name": "Competitor A",
      "enterprise": 48000,
      "professional": 18000,
      "strength": "Enterprise focus",
      "marketShare": 25
    }
  ],
  "analysis": {
    "avgEnterprise": 49667,
    "ourPosition": "competitive"
  }
}
```

### GET /api/pricing/sensitivity/:productId
Calculate price sensitivity.

**Query Parameters:**
- `priceChange`: Percentage change to analyze (default: 10)

**Response:**
```json
{
  "product": "Enterprise",
  "priceChange": "+10%",
  "elasticity": -1.2,
  "volumeChange": "-12.0%",
  "revenueChange": {
    "current": 5000000,
    "projected": 5400000,
    "change": 400000,
    "percent": "8.0"
  },
  "recommendation": "Increase price"
}
```

### GET /api/pricing/discounts
Get discount analysis.

**Response:**
```json
{
  "avgDiscountGiven": 12.5,
  "discountBrackets": [
    { "range": "0-10%", "count": 45, "avgDealSize": 25000 }
  ],
  "recommendations": [
    { "type": "control", "message": "Set discount limits...", "priority": "high" }
  ]
}
```

---

## Promotion Management

### GET /api/promotions
Get all promotions.

**Query Parameters:**
- `status`: active | planned | completed

**Response:**
```json
{
  "promotions": [
    {
      "id": "PROM001",
      "name": "Summer Sale",
      "type": "discount",
      "discount": 20,
      "status": "active",
      "budget": 500000,
      "revenue": 850000,
      "roi": 170
    }
  ],
  "summary": {
    "total": 4,
    "active": 3,
    "totalBudget": 1400000,
    "totalRevenue": 3400000,
    "avgROI": 277
  }
}
```

### POST /api/promotions
Create a new promotion.

**Request:**
```json
{
  "name": "Holiday Special",
  "type": "discount",
  "discount": 25,
  "startDate": "2026-11-01",
  "endDate": "2026-12-31",
  "budget": 600000
}
```

### GET /api/promotions/:id/attribution
Get attribution model for a promotion.

**Response:**
```json
{
  "promotionId": "PROM001",
  "totalAttributedRevenue": 850000,
  "attributionModel": "multi-touch",
  "touchpoints": [
    { "name": "First Touch", "revenue": 212500, "percentage": 25 },
    { "name": "Lead Generation", "revenue": 297500, "percentage": 35 }
  ],
  "metrics": {
    "roi": 170,
    "revenuePerDollar": 1.7,
    "paybackPeriod": 7
  }
}
```

### GET /api/promotions/effectiveness
Analyze promotion effectiveness.

**Response:**
```json
{
  "promotions": [
    {
      "id": "PROM001",
      "name": "Summer Sale",
      "roi": 170,
      "health": "excellent",
      "recommendations": [
        { "type": "scale", "message": "Excellent performance...", "expectedImpact": "+30% revenue" }
      ]
    }
  ],
  "summary": {
    "avgROI": 277,
    "excellent": 2,
    "good": 1
  }
}
```

### GET /api/promotions/optimize-budget
Optimize budget allocation across promotions.

**Query Parameters:**
- `totalBudget`: Total budget to allocate (default: 1000000)

**Response:**
```json
{
  "totalBudget": 1000000,
  "allocations": [
    {
      "id": "PROM001",
      "name": "Summer Sale",
      "currentBudget": 500000,
      "newBudget": 450000,
      "change": -50000,
      "changePercent": "-10%"
    }
  ]
}
```

### GET /api/promotions/calendar
Get promotion calendar.

**Query Parameters:**
- `year`: Year to display (default: 2026)

**Response:**
```json
{
  "year": 2026,
  "calendar": [
    {
      "month": "June",
      "promotions": [ { "id": "PROM001", "name": "Summer Sale", "budget": 500000 } ],
      "totalBudget": 500000
    }
  ]
}
```

---

## RevOps Intelligence

### GET /api/revops/pipeline
Get pipeline overview.

**Response:**
```json
{
  "stages": [
    { "name": "Prospecting", "count": 150, "value": 15000000, "velocity": 15 },
    { "name": "Qualification", "count": 100, "value": 12000000, "velocity": 12 }
  ],
  "summary": {
    "totalPipeline": 46500000,
    "dealCount": 355,
    "avgDealSize": 130986,
    "coverageRatio": "3.1"
  },
  "health": {
    "score": 85,
    "status": "healthy"
  }
}
```

### GET /api/revops/metrics
Get key RevOps metrics.

**Response:**
```json
{
  "retention": {
    "netRevenueRetention": 118,
    "grossRevenueRetention": 92,
    "logoChurnRate": 5.2,
    "netChurnRate": 3.8,
    "expansionRate": 18.5,
    "contractionRate": 2.1
  },
  "salesEfficiency": {
    "winRate": 28,
    "avgSalesCycle": 45,
    "avgContractLength": 18
  },
  "unitEconomics": {
    "ltvCacRatio": 5.2,
    "paybackPeriod": 14,
    "magicNumber": 0.85
  }
}
```

### GET /api/revops/churn
Get churn risk analysis.

**Response:**
```json
{
  "risks": [
    {
      "customerId": "CUS001",
      "name": "TechCorp",
      "mrr": 125000,
      "risk": "high",
      "reason": "Low engagement",
      "recoveryProbability": 30,
      "recommendedAction": "Immediate executive outreach"
    }
  ],
  "summary": {
    "totalAtRisk": 410000,
    "annualAtRisk": 4920000,
    "highRiskCount": 2,
    "recoveryPotential": 147600
  }
}
```

### GET /api/revops/expansion
Get expansion tracking.

**Response:**
```json
{
  "expansions": [
    {
      "customerId": "CUS010",
      "name": "ScaleUp Inc",
      "currentMRR": 150000,
      "expansionMRR": 50000,
      "expansionRate": 50,
      "type": "upsell"
    }
  ],
  "summary": {
    "totalExpansionMRR": 125000,
    "annualExpansion": 1500000,
    "expansionCount": 4
  }
}
```

### GET /api/revops/winloss
Get win/loss analysis.

**Response:**
```json
{
  "summary": {
    "totalDeals": 150,
    "won": 42,
    "lost": 108,
    "winRate": 28,
    "avgWinValue": 85000
  },
  "reasons": [
    { "reason": "Price too high", "count": 35, "percentage": 32 }
  ]
}
```

### GET /api/revops/risk
Get revenue at risk analysis.

**Response:**
```json
{
  "totalMRR": 12000000,
  "grossChurn": {
    "monthly": 624000,
    "annual": 7488000,
    "rate": 5.2
  },
  "netChurn": {
    "monthly": 240000,
    "annual": 2880000,
    "rate": 3.8
  },
  "benchmarks": {
    "healthyNetChurn": "<5%",
    "goodNetChurn": "5-7%"
  }
}
```

---

## Cohort Analysis

### GET /api/cohorts
Get all cohorts.

**Query Parameters:**
- `segment`: Filter by segment (Enterprise | Professional)

**Response:**
```json
{
  "cohorts": [
    {
      "id": "COH001",
      "name": "Q1-2025 Enterprise",
      "segment": "Enterprise",
      "customers": 45,
      "mrr": 2250000,
      "ltv": 27000000,
      "churnRate": 5.2,
      "expansionRate": 18.5,
      "retentionCurve": [
        { "month": 0, "retention": 100 },
        { "month": 6, "retention": 73 }
      ]
    }
  ],
  "summary": {
    "totalCustomers": 775,
    "totalMrr": 22100000,
    "avgLtv": 14705000,
    "bestCohort": { "name": "Q4-2025 Enterprise", "churnRate": 2.1 }
  }
}
```

### GET /api/cohorts/:id
Get detailed cohort analysis.

**Response:**
```json
{
  "id": "COH001",
  "name": "Q1-2025 Enterprise",
  "customers": 45,
  "mrr": 2250000,
  "ltv": 27000000,
  "retentionCurve": [ ... ],
  "revenueOverTime": [ ... ],
  "ltvProjection": {
    "months": [3, 6, 12, 24, 36],
    "values": [6750000, 13500000, 27000000, 54000000, 72900000]
  },
  "health": {
    "score": 85,
    "status": "healthy"
  }
}
```

### POST /api/cohorts/ltv-predict
Predict customer LTV.

**Request:**
```json
{
  "segment": "Enterprise",
  "mrr": 100000,
  "customers": 50,
  "tenure": 24
}
```

**Response:**
```json
{
  "input": { "segment": "Enterprise", "mrr": 100000, "customers": 50, "tenure": 24 },
  "prediction": {
    "ltv": 45000000,
    "ltvPerCustomer": 900000,
    "confidence": 87,
    "confidenceRange": { "low": 38250000, "high": 51750000 }
  },
  "recommendation": "high_value"
}
```

### GET /api/cohorts/retention
Get retention analysis.

**Response:**
```json
{
  "bySegment": {
    "Enterprise": {
      "avgChurn": 4.2,
      "avgExpansion": 24.5
    }
  },
  "retentionMetrics": {
    "month1": 92,
    "month6": 65,
    "month12": 52
  }
}
```

---

## Analytics

### GET /api/analytics/overview
Get analytics dashboard.

**Response:**
```json
{
  "summary": {
    "totalRevenue": 12000000,
    "avgMonthlyRevenue": 11500000,
    "trend": [
      { "month": "2026-06", "growth": "8.5" }
    ]
  },
  "metrics": {
    "mrr": 8500000,
    "arr": 102000000,
    "newRevenue": 800000,
    "expansionRevenue": 400000,
    "churnRevenue": 200000,
    "netNewRevenue": 1000000
  }
}
```

### GET /api/analytics/velocity
Get velocity metrics.

---

## AI Copilot

### POST /api/copilot/chat
Natural language revenue queries.

**Request:**
```json
{
  "message": "What is our MRR and ARR?"
}
```

**Response:**
```json
{
  "response": "Current Revenue Metrics:\nMRR: $7,500,000\nARR: $90,000,000\nMonthly Growth: 13.3%\nNet New Revenue: $1,000,000",
  "actions": [
    { "label": "View Revenue Hub", "endpoint": "/api/revenue/hub" },
    { "label": "View Forecasts", "endpoint": "/api/revenue/forecast" }
  ]
}
```

**Example Queries:**
- "What is our MRR?"
- "Show demand signals"
- "Which customers are at risk?"
- "Show active promotions"
- "Compare Q1 and Q2 cohorts"
- "Optimize Enterprise pricing"

---

## Insights & Recommendations

### GET /api/insights
Get AI-generated insights.

**Response:**
```json
{
  "insights": [
    {
      "id": "INS001",
      "type": "growth",
      "title": "MRR Growth Acceleration",
      "description": "Monthly growth rate increased from 6.2% to 8.5%",
      "impact": "positive",
      "confidence": 92
    }
  ],
  "summary": {
    "total": 5,
    "positive": 1,
    "warnings": 2,
    "opportunities": 2
  }
}
```

### GET /api/recommendations
Get actionable recommendations.

**Response:**
```json
{
  "recommendations": [
    {
      "id": "REC001",
      "agent": "CRO",
      "title": "Optimize Enterprise Pricing",
      "description": "Consider 10% price increase...",
      "impact": 850000,
      "priority": "high",
      "status": "pending"
    }
  ],
  "summary": {
    "total": 4,
    "highPriority": 3,
    "totalImpact": 3720000
  }
}
```

---

## Revenue Digital Twin

### GET /api/twin
Get current revenue state.

**Response:**
```json
{
  "currentState": {
    "revenue": 12000000,
    "mrr": 10200000,
    "arr": 122400000,
    "growth": 8.5,
    "churnRate": 5.2,
    "expansionRate": 18.5
  },
  "healthScore": 82,
  "riskLevel": "low",
  "projections": {
    "conservative": { "annual": 16800000, "confidence": 90 },
    "expected": { "annual": 21600000, "confidence": 75 }
  }
}
```

### POST /api/twin/simulate
Simulate a scenario.

**Request:**
```json
{
  "changes": [
    { "type": "growth_rate", "value": 10 },
    { "type": "churn_decrease", "value": 1 }
  ],
  "horizon": 12
}
```

**Response:**
```json
{
  "original": 12000000,
  "simulated": 19200000,
  "change": 7200000,
  "changePercent": "60.0",
  "horizon": 12,
  "riskAssessment": {
    "overallRisk": "medium",
    "recommendation": "Positive scenario - consider acceleration"
  }
}
```

### GET /api/twin/scenarios
Get predefined scenarios.

**Response:**
```json
{
  "scenarios": [
    {
      "id": "conservative",
      "name": "Conservative Growth",
      "description": "5% monthly growth",
      "totalRevenue": 156000000,
      "confidence": 85,
      "risk": "low"
    },
    {
      "id": "aggressive",
      "name": "Aggressive Growth",
      "description": "15% monthly growth",
      "totalRevenue": 245000000,
      "confidence": 60,
      "risk": "high"
    },
    {
      "id": "downturn",
      "name": "Economic Downturn",
      "description": "-20% growth",
      "totalRevenue": 98000000,
      "confidence": 70,
      "risk": "critical"
    }
  ]
}
```

### GET /api/twin/risk
Get risk assessment.

**Response:**
```json
{
  "overall": { "score": 82, "level": "low" },
  "factors": [
    { "factor": "Revenue Growth", "score": 90, "status": "good" },
    { "factor": "Churn Rate", "score": 70, "status": "moderate" }
  ],
  "alerts": [ ... ],
  "recommendations": [ ... ]
}
```

---

## AI Agents

### GET /api/agents
List all AI agents.

**Response:**
```json
{
  "agents": [
    { "id": "cro", "name": "AI Chief Revenue Officer", "accuracy": 90, "tasks": 5, "status": "active" },
    { "id": "demandForecaster", "name": "Demand Forecaster", "accuracy": 92, "tasks": 3, "status": "active" }
  ],
  "summary": {
    "total": 8,
    "active": 8,
    "avgAccuracy": "88.6",
    "totalTasks": 25
  }
}
```

### GET /api/agents/:id
Get agent details and run analysis.

**Response:**
```json
{
  "agent": "AI Chief Revenue Officer",
  "timestamp": "2026-06-18T10:57:46.791Z",
  "metrics": {
    "mrr": 8500000,
    "arr": 102000000,
    "growth": 13.3,
    "churn": 2.4
  },
  "healthScore": 85,
  "status": "healthy",
  "recommendations": [ ... ],
  "priorities": [ ... ]
}
```

### POST /api/agents/:id/run
Run agent task.

**Request:**
```json
{
  "productId": "PRC001",
  "objectives": "revenue"
}
```

---

## Industry Bridge

### GET /api/industries/revenue
Get revenue by industry.

**Response:**
```json
{
  "industries": [
    { "code": "restaurant", "name": "Restaurant OS", "port": 5010, "status": "connected", "revenue": 2500000 },
    { "code": "hotel", "name": "Hotel OS", "port": 5025, "status": "connected", "revenue": 4500000 }
  ],
  "summary": {
    "totalRevenue": 15000000,
    "connected": 8,
    "total": 12
  }
}
```

---

## Sync

### GET /api/sync/sources
Get available data sources.

**Response:**
```json
{
  "sources": [
    { "name": "Sales OS", "port": 5055, "dataTypes": ["pipeline", "opportunities", "subscriptions"] },
    { "name": "Finance OS", "port": 4801, "dataTypes": ["invoices", "payments", "revenue"] }
  ]
}
```

### GET /api/sync/connections
Check connection status.

### POST /api/sync/collect
Collect data from all sources.

---

## Reports

### GET /api/reports/revenue-summary
Get revenue summary report.

### GET /api/reports/forecast
Get forecast report.
