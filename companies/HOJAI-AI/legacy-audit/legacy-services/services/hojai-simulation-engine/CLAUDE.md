# CLAUDE.md - Simulation Engine

## Project Overview

**Name:** hojai-simulation-engine
**Type:** SUTAR OS - Decision Layer
**Port:** 4241
**Company:** HOJAI AI
**Part of:** SUTAR OS Phase 6 - SimulationOS
**Lines:** 310
**Status:** ✅ PRODUCTION READY

## What is Simulation Engine?

Simulation Engine provides what-if analysis and scenario testing for business decisions. It helps evaluate risks and optimize outcomes before execution.

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4241 | Service port |

## Features

### 1. What-if Analysis

| Feature | Description |
|---------|-------------|
| **Scenario Testing** | Test multiple hypothetical scenarios |
| **Parameter Variation** | Change quantities, prices, suppliers, timing |
| **Impact Calculation** | Calculate cost and time impact |
| **Risk Assessment** | Assess risk level per scenario |
| **Recommendations** | Generate recommendations |

### 2. Monte Carlo Simulation

| Feature | Description |
|---------|-------------|
| **Iterations** | Configurable iterations (default 1000) |
| **Min/Max Factors** | Define range (e.g., 0.8-1.2) |
| **Random Sampling** | Random value generation |
| **Percentile Analysis** | P10, P50, P90 results |
| **Mean Calculation** | Expected value |

### 3. Risk Assessment

| Feature | Description |
|---------|-------------|
| **Risk Levels** | low, medium, high |
| **Risk Factors** | Cost, time, quality |
| **Risk Tolerance** | User-defined tolerance |
| **Risk Scoring** | Score based on factors |

### 4. Confidence Scoring

| Feature | Description |
|---------|-------------|
| **Confidence Level** | 0-1 scale |
| **Risk-based** | Higher risk = lower confidence |
| **Supplier-based** | Premium = higher confidence |

### 5. Scenario Comparison

| Feature | Description |
|---------|-------------|
| **Multi-scenario** | Compare multiple scenarios |
| **Best For Analysis** | Identify best for cost/risk/reliability |
| **Recommendation Engine** | Suggest optimal choice |

### 6. Simulation Parameters

| Parameter | Description |
|-----------|-------------|
| quantity | Number of units |
| price | Unit price |
| supplier | Supplier type (premium/budget) |
| timing | Delivery timing (standard/rush) |
| backupSupplier | Include backup option |

## API Endpoints

### Simulations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulations` | Create simulation |
| GET | `/api/simulations` | List simulations |
| GET | `/api/simulations/:id` | Get simulation |

### Monte Carlo

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/monte-carlo` | Run Monte Carlo simulation |

### What-if Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/what-if` | Run what-if analysis |

## Simulation Request

```typescript
interface SimulationRequest {
  intentId?: string;
  title: string;
  scenarios: Scenario[];
  constraints?: {
    maxBudget?: number;
    maxStorageDays?: number;
    riskTolerance?: 'low' | 'medium' | 'high';
  };
}

interface Scenario {
  name: string;
  parameters: {
    quantity?: number;
    price?: number;
    supplier?: 'premium' | 'budget';
    timing?: 'standard' | 'rush';
  };
}
```

## Simulation Result

```typescript
interface SimulationResult {
  scenarioId: string;
  name: string;
  parameters: any;
  metrics: {
    cost: number;
    risk: 'low' | 'medium' | 'high';
    confidence: number;  // 0-1
    expectedOutcome: string;
  };
  comparison: {
    bestFor: 'cost' | 'risk' | 'reliability';
    recommendation: string;
  };
}
```

## Monte Carlo Result

```typescript
interface MonteCarloResult {
  baseValue: number;
  iterations: number;
  results: {
    pessimistic: number;  // P10
    median: number;      // P50
    optimistic: number;   // P90
    mean: number;
  };
  confidence: number;
}
```

## Integration

### Upstream
- Decision Engine
- GoalOS
- User requests

### Downstream
- Negotiation Engine
- ContractOS

## Health Endpoints

- `GET /health` - Health check
- `GET /health/ready` - Readiness probe

## File Structure

```
hojai-simulation-engine/
├── src/
│   └── index.ts                    # Main server (all-in-one)
├── package.json
├── tsconfig.json
└── CLAUDE.md (this file)
```

## Notes

- Simulation Engine runs what-if scenarios
- Monte Carlo for probabilistic analysis
- Risk assessment included
- Confidence scoring
