# SUTAR Simulation OS

> **What-if scenario engine with Monte Carlo simulations for autonomous decision making**

**Port:** 4241
**Layer:** 4 (Decision + Execution)
**Package:** `@hojai/sutar-simulation-os`

## Overview

SUTAR Simulation OS provides:
- Monte Carlo simulations
- Stress testing scenarios
- Sensitivity analysis
- Agent behavior simulation
- Seeded random for reproducibility

## Quick Start

```bash
cd sutar-os/core/sutar-simulation-os
npm install
npm run dev
# Service runs on http://localhost:4241
```

## Features

| Feature | Status |
|---------|--------|
| Monte Carlo simulations | ✅ Implemented |
| Stress testing | ✅ Implemented |
| Sensitivity analysis | ✅ Implemented |
| Seeded RNG | ✅ Implemented |
| Result comparison | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4241/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-simulation-os",
  "port": 4241,
  "layer": "Decision + Execution",
  "scenarios": 12,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Create Scenario

```bash
curl -X POST http://localhost:4241/api/scenarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "Restaurant Revenue Projection",
    "description": "Monte Carlo simulation of monthly revenue",
    "modelType": "monte_carlo",
    "variables": [
      {
        "name": "daily_orders",
        "distribution": "uniform",
        "min": 50,
        "max": 150
      },
      {
        "name": "avg_order_value",
        "distribution": "normal",
        "mean": 500,
        "stdDev": 100
      }
    ],
    "constraints": [
      { "field": "revenue", "operator": "gte", "value": 50000 }
    ],
    "parameters": {
      "iterations": 1000,
      "confidenceLevel": 0.95,
      "seed": 12345
    }
  }'
```

Response:
```json
{
  "id": "scenario_abc123",
  "name": "Restaurant Revenue Projection",
  "modelType": "monte_carlo",
  "variables": [...],
  "parameters": {
    "iterations": 1000,
    "confidenceLevel": 0.95,
    "seed": 12345
  },
  "status": "created",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Scenarios

```bash
curl "http://localhost:4241/api/scenarios?status=completed&limit=10"
```

Response:
```json
{
  "total": 12,
  "returned": 5,
  "scenarios": [
    {
      "id": "scenario_abc123",
      "name": "Restaurant Revenue Projection",
      "modelType": "monte_carlo",
      "status": "completed",
      "createdAt": "2026-06-28T12:00:00.000Z"
    }
  ]
}
```

### Get Scenario

```bash
curl http://localhost:4241/api/scenarios/scenario_abc123
```

Response:
```json
{
  "id": "scenario_abc123",
  "name": "Restaurant Revenue Projection",
  "modelType": "monte_carlo",
  "variables": [...],
  "parameters": {...},
  "status": "completed",
  "results": {...},
  "completedAt": "2026-06-28T12:01:00.000Z"
}
```

### Run Simulation

```bash
curl -X POST http://localhost:4241/api/scenarios/scenario_abc123/run \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "scenario_abc123",
  "status": "completed",
  "completedAt": "2026-06-28T12:01:00.000Z"
}
```

### Get Simulation Results

```bash
curl http://localhost:4241/api/scenarios/scenario_abc123/results
```

Response:
```json
{
  "scenarioId": "scenario_abc123",
  "name": "Restaurant Revenue Projection",
  "results": {
    "iterations": 1000,
    "validRuns": 987,
    "constraintViolations": 13,
    "mean": 72500,
    "stdDev": 15200,
    "median": 71000,
    "percentile": {
      "p5": 48000,
      "p10": 52000,
      "p25": 61000,
      "p50": 71000,
      "p75": 81000,
      "p90": 92000,
      "p95": 98000
    },
    "min": 35000,
    "max": 125000,
    "riskOfLoss": 0.02
  }
}
```

### Delete Scenario

```bash
curl -X DELETE http://localhost:4241/api/scenarios/scenario_abc123 \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "scenario_abc123",
  "status": "deleted"
}
```

### Get Simulation Templates

```bash
curl http://localhost:4241/api/templates
```

Response:
```json
{
  "templates": [
    {
      "id": "negotiation_outcome",
      "name": "Negotiation Outcome",
      "modelType": "monte_carlo",
      "description": "Simulate negotiation outcomes with variable concessions"
    },
    {
      "id": "market_stress",
      "name": "Market Stress Test",
      "modelType": "stress_test",
      "description": "Stress test pricing under market shocks"
    },
    {
      "id": "supply_chain",
      "name": "Supply Chain Risk",
      "modelType": "monte_carlo",
      "description": "Simulate supply chain disruptions"
    },
    {
      "id": "contract_value",
      "name": "Contract Value Distribution",
      "modelType": "monte_carlo",
      "description": "Distribution of contract values over time"
    }
  ]
}
```

---

## Distribution Types

| Distribution | Parameters | Use Case |
|--------------|------------|----------|
| `uniform` | min, max | Unknown range |
| `normal` | mean, stdDev | Natural phenomena |
| `triangular` | min, max, mode | Estimated range |
| `poisson` | lambda | Event counts |
| `bernoulli` | probability | Binary outcomes |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SIMULATION_PORT` | 4241 | Service port |
| `NODE_ENV` | development | Environment (development/production) |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (security)

---

**Last Updated:** 2026-06-28
