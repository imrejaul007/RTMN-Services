# CLAUDE.md - SUTAR SimulationOS

## Project Overview

**Name:** sutar-simulation-os
**Type:** SUTAR OS Service (Layer 5)
**Port:** 4241
**Description:** What-if analysis, Monte Carlo simulation, and scenario testing
**Company:** HOJAI AI
**Product:** SUTAR OS
**Status:** Production Ready

## Tech Stack

- Node.js 18+
- Express.js
- TypeScript 5.x
- Zod (validation)
- express-rate-limit (security)
- helmet (security headers)
- uuid (ID generation)

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server (watch mode) |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4241 | Service port |
| NODE_ENV | No | development | Environment |
| API_KEY | No | sim-dev-key... | API authentication |
| ALLOWED_ORIGINS | No | localhost:* | CORS origins |

---

## Features (Complete)

### Scenario Planning
| Feature | Type | Status |
|---------|------|--------|
| Pricing Optimization | PRICING | ✅ |
| Offer Modeling | OFFER | ✅ |
| Cashback ROI | CASHBACK | ✅ |
| Bundle Pricing | BUNDLE | ✅ |

### Forecasting
| Feature | Type | Status |
|---------|------|--------|
| Demand Forecasting | DEMAND | ✅ |
| Cash Flow Forecasting | CASHFLOW | ✅ |
| Revenue Forecasting | REVENUE | ✅ |
| Cost Forecasting | COST | ✅ |

### Risk Modeling
| Feature | Type | Status |
|---------|------|--------|
| Financial Risk | RISK | ✅ |
| Operational Risk | RISK | ✅ |
| Market Risk | RISK | ✅ |
| Compliance Risk | COMPLIANCE | ✅ |

### Sensitivity Analysis
| Feature | Endpoint | Status |
|---------|----------|--------|
| What-If Analysis | POST /simulations/:id/whatif | ✅ |
| Impact Assessment | ImpactSummary in response | ✅ |
| Recommendation Engine | Recommendation[] in response | ✅ |

### Operations
| Feature | Type | Status |
|---------|------|--------|
| Staffing Optimization | STAFFING | ✅ |
| Inventory Optimization | INVENTORY | ✅ |
| Procurement Analysis | PROCUREMENT | ✅ |
| Custom Parameters | CUSTOM | ✅ |

---

## API Endpoints

### Core Simulation
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/simulations` | POST | Run Monte Carlo simulation |
| `/api/v1/simulations` | GET | List all simulations |
| `/api/v1/simulations/:id` | GET | Get specific simulation |
| `/api/v1/simulations/:id` | DELETE | Delete simulation |

### Analysis
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/simulations/:id/whatif` | POST | What-if analysis |
| `/api/v1/simulations/compare` | POST | Compare scenarios |

### Health & Metrics
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service health |
| `/health/ready` | GET | Readiness probe |
| `/health/live` | GET | Liveness probe |
| `/metrics` | GET | Prometheus metrics |

### Legacy
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/info` | GET | Service info |
| `/api/v1/intent` | POST | Intent processing |
| `/api/v1/event` | POST | Event processing |

---

## Simulation Types (All Supported)

| Type | Category | Parameters |
|------|----------|------------|
| PRICING | Scenario Planning | currentPrice, elasticity, competitorPrice |
| OFFER | Scenario Planning | offerType, offerValue, estimatedUplift |
| CASHBACK | Scenario Planning | offerValue, estimatedUplift |
| BUNDLE | Scenario Planning | bundleItems, discountPercentage |
| DEMAND | Forecasting | historicalDemand, seasonalityFactor, trendFactor |
| CASHFLOW | Forecasting | inflows, outflows, openingBalance, forecastPeriods |
| REVENUE | Forecasting | historicalRevenue, growthRate, marketSize, marketShare |
| COST | Forecasting | fixedCosts, variableCostPerUnit, overheadCosts |
| RISK | Risk Modeling | riskFactors (probability, impact) |
| COMPLIANCE | Risk Modeling | complianceAreas, regulatoryChanges, auditFindings |
| STAFFING | Operations | currentStaff, hoursRequired, hourlyRate, productivityGain |
| INVENTORY | Operations | currentStock, reorderPoint, leadTime, carryingCost |
| PROCUREMENT | Operations | suppliers, quantity |
| CUSTOM | Custom | customVars (flexible key-value pairs) |

---

## Response Structure

### SimulationResult
```typescript
{
  id: string;
  name: string;
  type: SimulationType;
  status: 'completed';
  scenarios: Scenario[];       // All generated scenarios
  bestScenario: Scenario;      // Highest profit scenario
  worstScenario: Scenario;    // Lowest profit scenario
  statistics: {
    mean, median, stdDev, variance
    percentiles: { p5, p25, p50, p75, p90, p95, p99 }
    distribution: DistributionBucket[]
  };
  confidenceInterval: { lower, upper, level, marginOfError };
  riskAssessment: {
    overallRiskScore, riskLevel
    riskMitigation: string[]
    valueAtRisk, expectedShortfall
  };
  metadata: {
    durationMs, iterationsCompleted
    convergenceRate, modelAccuracy
    assumptions: string[]
    warnings: string[]
  };
}
```

---

## Architecture

This service follows the SUTAR OS 12-layer canonical architecture.

```
Layer 5: SimulationOS
├── monteCarlo.ts    - Core Monte Carlo engine
├── scenarioService.ts - What-if analysis & comparison
├── validators/      - Zod schemas for all inputs
└── types/          - TypeScript interfaces
```

## Integration

### Upstream Services
- SUTAR Gateway (4140)
- SUTAR Intent Bus (4154)
- SUTAR Decision Engine (4240)
- SUTAR GoalOS (4242)

### Downstream Services
- HOJAI Memory (4520)
- RABTUL Services (4001-4005)
- Event Bus (4510)

---

## Example Usage

```bash
# Run pricing simulation
curl -X POST http://localhost:4241/api/v1/simulations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Pricing Test",
    "type": "PRICING",
    "parameters": {
      "currentPrice": 100,
      "elasticity": 1.5,
      "competitorPrice": 95
    },
    "iterations": 1000
  }'

# Run cashflow simulation
curl -X POST http://localhost:4241/api/v1/simulations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cash Flow Forecast",
    "type": "CASHFLOW",
    "parameters": {
      "inflows": [
        {"name": "Sales", "amount": 10000, "frequency": "monthly", "certainty": 0.9}
      ],
      "outflows": [
        {"name": "Rent", "amount": 3000, "frequency": "monthly", "certainty": 1.0}
      ],
      "openingBalance": 10000,
      "forecastPeriods": 12
    }
  }'
```

---

**Last Updated:** 2026-06-13
