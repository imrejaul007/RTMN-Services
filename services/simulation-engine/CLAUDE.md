# Simulation Intelligence Engine

**Service:** Simulation Intelligence Engine  
**Port:** 4952  
**Version:** 1.0.0  
**Status:** Active

---

## Overview

The Simulation Intelligence Engine answers "What if?" questions about business decisions. It uses Monte Carlo simulation, statistical analysis, and impact modeling to predict outcomes of various business scenarios.

## Capabilities

- **What-If Analysis:** Explore "What if?" questions about business decisions
- **Monte Carlo Simulation:** Run probabilistic simulations with configurable iterations
- **Impact Analysis:** Calculate impact on CSAT, revenue, churn, support costs
- **Risk Assessment:** Evaluate risk factors and calculate Value at Risk (VaR)
- **Scenario Comparison:** Compare multiple scenarios side-by-side
- **ROI Calculations:** Calculate return on investment and payback periods
- **Time Series Projections:** Project outcomes over time horizons
- **Multi-Tenant Support:** Secure isolation between tenants

## API Endpoints

### Simulation Routes (`/api/simulate`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/run` | Run a new simulation |
| GET | `/` | List all simulations |
| GET | `/:id` | Get simulation by ID |
| GET | `/:id/results` | Get simulation results |
| DELETE | `/:id` | Cancel/delete simulation |

### Scenario Routes (`/api/scenarios`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create a new scenario |
| GET | `/` | List all scenarios |
| GET | `/:id` | Get scenario by ID |
| PUT | `/:id` | Update scenario |
| DELETE | `/:id` | Delete scenario |
| POST | `/:id/clone` | Clone scenario |
| POST | `/templates/:type` | Create pre-defined scenario |
| POST | `/validate` | Validate scenario |

### Results Routes (`/api/results`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List cached results |
| GET | `/:simulationId` | Get full results |
| GET | `/:simulationId/summary` | Get results summary |
| GET | `/:simulationId/metrics` | Get metrics only |
| GET | `/:simulationId/recommendations` | Get recommendations |
| GET | `/:simulationId/risk` | Get risk analysis |
| GET | `/compare` | Compare multiple simulations |

## Usage Examples

### 1. Create a "What if we increase refunds by 5%?" Scenario

```bash
curl -X POST http://localhost:4952/api/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "What if we increase refund rate by 5%?",
    "description": "Analyze impact of increasing customer refund acceptance rate",
    "category": "refund",
    "type": "what_if",
    "tenantId": "tenant_123",
    "parameters": [
      {
        "name": "refund_rate",
        "currentValue": 0.05,
        "proposedValue": 0.10,
        "minValue": 0,
        "maxValue": 0.30,
        "unit": "percent",
        "category": "refund"
      }
    ],
    "tags": ["refund", "what-if", "customer-impact"]
  }'
```

### 2. Run a Simulation

```bash
curl -X POST http://localhost:4952/api/simulate/run \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Refund Impact Analysis",
    "scenarioId": "scenario_id_here",
    "tenantId": "tenant_123",
    "priority": "high",
    "monteCarlo": {
      "iterations": 1000,
      "confidenceLevel": 0.95,
      "distribution": "normal"
    },
    "timeHorizon": {
      "start": "2026-06-16T00:00:00Z",
      "end": "2026-09-16T00:00:00Z",
      "granularity": "day"
    },
    "createdBy": "user_123"
  }'
```

### 3. Use a Pre-defined Template

```bash
# Available types: refund_increase, price_decrease, service_improvement, marketing_push
curl -X POST http://localhost:4952/api/scenarios/templates/refund_increase \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_123"
  }'
```

### 4. Compare Simulations

```bash
curl "http://localhost:4952/api/results/compare?tenantId=tenant_123&ids=sim_id_1,sim_id_2,sim_id_3"
```

## Scenario Categories

| Category | Description | Typical Parameters |
|----------|-------------|-------------------|
| `pricing` | Price changes | price, discount, margin |
| `refund` | Refund policies | refund_rate, refund_limit |
| `promotion` | Promotional offers | discount, duration, budget |
| `service` | Service improvements | response_time, quality_score |
| `operational` | Operational changes | efficiency, throughput |
| `customer` | Customer experience | satisfaction, engagement |
| `financial` | Financial adjustments | cost, revenue targets |
| `marketing` | Marketing campaigns | spend, reach, conversion |

## Scenario Types

| Type | Description |
|------|-------------|
| `what_if` | Single scenario analysis |
| `comparative` | Compare multiple options |
| `sensitivity` | Test parameter sensitivity |
| `monte_carlo` | Probabilistic simulation |
| `stress_test` | Extreme scenario testing |

## Monte Carlo Configuration

```typescript
{
  iterations: 1000,        // Number of simulation runs (100-10000)
  confidenceLevel: 0.95,   // Confidence interval (0-1)
  distribution: 'normal',  // Distribution type
  seed: 12345              // Optional seed for reproducibility
}
```

## Response Metrics

The simulation returns detailed metrics:

### Impact Summary
- **CSAT:** Customer satisfaction score (0-1)
- **Revenue:** Total revenue projection
- **Churn:** Customer churn rate (0-1)
- **Support Cost:** Support operation costs
- **Net Impact:** Net revenue after costs

### Risk Analysis
- **Overall Risk Score:** 0-100 risk score
- **Risk Level:** low, medium, high, critical
- **Value at Risk (VaR):** Potential loss amount
- **Risk Factors:** Identified risk elements

### Recommendations
Prioritized recommendations with:
- Expected impact
- Confidence level
- Caveats and considerations

## Configuration

Environment variables in `.env`:

```env
PORT=4952
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/simulation-engine
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000
CLEANUP_API_KEY=your-api-key
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run in production
npm start
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Simulation Engine                         │
├─────────────────────────────────────────────────────────────┤
│  Routes Layer                                                │
│  ├── simulate.ts (Run simulations)                          │
│  ├── scenarios.ts (Manage scenarios)                        │
│  └── results.ts (Query results)                             │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                              │
│  ├── simulator.ts (Core simulation orchestration)           │
│  ├── modelRunner.ts (ML/business model execution)           │
│  ├── impactCalculator.ts (Impact calculations)              │
│  └── scenarioBuilder.ts (Scenario management)               │
├─────────────────────────────────────────────────────────────┤
│  Models Layer                                                │
│  ├── Simulation.ts (Simulation runs)                       │
│  ├── Scenario.ts (Scenario definitions)                     │
│  └── Result.ts (Cached results)                             │
├─────────────────────────────────────────────────────────────┤
│  MongoDB                                                     │
└─────────────────────────────────────────────────────────────┘
```

## Health Check

```bash
curl http://localhost:4952/health
```

Response:
```json
{
  "status": "healthy",
  "service": "simulation-engine",
  "version": "1.0.0",
  "timestamp": "2026-06-16T00:00:00.000Z",
  "mongodb": "connected"
}
```

---

**Last Updated:** June 16, 2026
