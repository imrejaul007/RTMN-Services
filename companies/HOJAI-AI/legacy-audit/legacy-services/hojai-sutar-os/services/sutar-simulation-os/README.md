# SUTAR SimulationOS

**What-if analysis, Monte Carlo simulation, and scenario testing for business decisions.**

---

## Overview

SimulationOS is a microservice that enables businesses to test scenarios before committing resources. It uses Monte Carlo simulation to model uncertainty and predict outcomes across various business domains.

## Features

- **Monte Carlo Simulation** - Run thousands of iterations to model uncertainty
- **What-If Analysis** - Test parameter changes and see projected impacts
- **Scenario Comparison** - Compare multiple simulation results side-by-side
- **Risk Assessment** - Quantify and visualize risk across scenarios
- **Confidence Scoring** - Understand the reliability of predictions

## Supported Simulation Types

### Scenario Planning
| Type | Use Case |
|------|----------|
| `PRICING` | Test price changes and elasticity impact |
| `OFFER` | Evaluate promotional offers and discounts |
| `CASHBACK` | Model cashback rewards and their ROI |
| `BUNDLE` | Analyze bundle pricing strategies |

### Forecasting
| Type | Use Case |
|------|----------|
| `DEMAND` | Forecast demand with seasonality |
| `CASHFLOW` | Cash flow forecasting (inflows/outflows) |
| `REVENUE` | Revenue forecasting with growth modeling |
| `COST` | Cost structure and break-even analysis |

### Risk Modeling
| Type | Use Case |
|------|----------|
| `RISK` | Financial, operational, market risk assessment |
| `COMPLIANCE` | Compliance risk and regulatory impact |

### Planning & Operations
| Type | Use Case |
|------|----------|
| `STAFFING` | Workforce planning and optimization |
| `INVENTORY` | Stock level and carrying cost balance |
| `PROCUREMENT` | Supplier comparison and mixed sourcing |
| `CUSTOM` | Define custom parameters for any use case |

---

## Quick Start

```bash
cd services/sutar-simulation-os
npm install
npm run dev
```

---

## API Reference

### Health Endpoints

```bash
GET /health          # Basic health check
GET /health/ready    # Readiness probe
GET /health/live     # Liveness probe
```

### Core Endpoints

```bash
# Run a simulation
POST /api/v1/simulations

# List all simulations
GET /api/v1/simulations

# Get a specific simulation
GET /api/v1/simulations/:id

# Delete a simulation
DELETE /api/v1/simulations/:id

# Perform what-if analysis
POST /api/v1/simulations/:id/whatif

# Compare multiple simulations
POST /api/v1/simulations/compare
```

### Legacy Endpoints

```bash
POST /api/v1/intent   # Intent-based simulation
POST /api/v1/event    # Event processing
```

---

## API Examples

### Run a Pricing Simulation

```bash
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
    "iterations": 1000,
    "confidenceLevel": 0.95
  }'
```

### Run What-If Analysis

```bash
curl -X POST http://localhost:4241/api/v1/simulations/sim-xxx/whatif \
  -H "Content-Type: application/json" \
  -d '{
    "variations": [
      {
        "name": "Reduce price by 10%",
        "parameterChanges": { "price": 90 }
      }
    ]
  }'
```

### Compare Simulations

```bash
curl -X POST http://localhost:4241/api/v1/simulations/compare \
  -H "Content-Type: application/json" \
  -d '{
    "simulationIds": ["sim-xxx", "sim-yyy"]
  }'
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4241` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `API_KEY` | `sim-dev-key...` | API authentication key |
| `ALLOWED_ORIGINS` | `localhost:*` | CORS allowed origins |

---

## Security

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable allowed origins
- **Input Validation**: All inputs validated with Zod
- **Request Timeout**: 30 second timeout per request
- **Helmet**: Security headers enabled

---

## License

Internal use only - RTMN Platform

---

**Last Updated:** 2026-06-13
