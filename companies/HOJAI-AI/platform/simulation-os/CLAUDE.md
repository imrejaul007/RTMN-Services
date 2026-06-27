# SimulationOS 2.0 - Production-ready Simulation Engine for SUTAR

> **Version:** 2.0.0
> **Last Updated:** June 27, 2026
> **Status:** Production Ready

## Overview

SimulationOS 2.0 is a comprehensive simulation platform that provides real-time what-if analysis, risk modeling, and business scenario planning for the SUTAR autonomous economic layer.

## Architecture

```
SimulationOS 2.0 (Port 4300)
├── Company Simulation Engine
│   ├── Org Restructure Impact
│   ├── Hiring Plan ROI
│   ├── Process Change Effects
│   └── Technology Adoption
│
├── Market Simulation
│   ├── Demand Forecasting
│   ├── Price Elasticity
│   ├── Market Share Projection
│   ├── Competitor Behavior Modeling
│   └── Porter's 5 Forces Analysis
│
├── Pricing Simulation
│   ├── A/B Price Testing
│   ├── Competitor-based Pricing
│   ├── Value-based Pricing
│   └── Promotional Impact
│
├── Risk Simulation (Monte Carlo)
│   ├── Value at Risk (VaR)
│   ├── Sensitivity Analysis
│   ├── Stress Testing
│   └── Risk Mitigation
│
└── What-If Analysis
    ├── Natural Language Parsing
    ├── Scenario Comparison
    ├── Insights Generation
    └── Templates Library
```

## Quick Start

```bash
# Start SimulationOS
cd companies/HOJAI-AI/platform/simulation-os
bash scripts/start-simulation-os.sh start

# Or with custom port
SIMULATION_PORT=4300 npm run dev
```

## API Endpoints

### Company Simulation

```bash
# Run company simulation
POST /api/simulate/company

# Get simulation results
GET /api/simulate/:id

# Compare scenarios
GET /api/simulate/:id/scenarios

# Commit winning scenario
POST /api/simulate/:id/commit
```

### Market Simulation

```bash
# Run market simulation
POST /api/simulate/market

# Get results
GET /api/simulate/market/:id

# Get market trends
GET /api/simulate/market/trends

# Detailed analysis
GET /api/simulate/market/:id/analysis
```

### Pricing Simulation

```bash
# Run pricing simulation
POST /api/simulate/pricing

# Get results
GET /api/simulate/pricing/:id

# Get recommendations
GET /api/simulate/pricing/:id/recommendations

# Get price ladder
GET /api/simulate/pricing/ladder/:productId
```

### Risk Simulation

```bash
# Run risk simulation
POST /api/simulate/risk

# Get results
GET /api/simulate/risk/:id

# Get VaR results
GET /api/simulate/risk/:id/var

# Get sensitivity analysis
GET /api/simulate/risk/:id/sensitivity

# Get stress test results
GET /api/simulate/risk/:id/stress

# Get mitigations
GET /api/simulate/risk/:id/mitigations
```

### What-If Analysis

```bash
# Run what-if analysis
POST /api/simulate/whatif

# Get results
GET /api/simulate/whatif/:id

# Compare analyses
POST /api/simulate/whatif/compare

# Get templates
GET /api/simulate/whatif/templates

# Get question types
GET /api/simulate/whatif/types
```

## Monte Carlo Implementation

All simulation engines use Monte Carlo methods for probabilistic analysis:

### Statistical Methods

- **Seeded Random Generator**: Mulberry32 algorithm for reproducibility
- **Normal Distribution**: Box-Muller transform
- **Triangular Distribution**: For bounded uncertainty
- **Log-normal Distribution**: For skewed variables

### Analysis Features

- **Confidence Intervals**: 90%, 95%, 99% CI
- **Percentile Analysis**: P5, P25, P50, P75, P95, P99
- **Distribution Fitting**: Anderson-Darling normality test
- **Sensitivity Analysis**: Tornado charts, factor contribution

## Project Structure

```
simulation-os/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   └── index.ts              # Main entry point
├── company-simulation/
│   ├── engine/               # Monte Carlo + calculation engines
│   ├── models/              # TypeScript interfaces + Zod schemas
│   ├── routes/              # Express routes
│   └── __tests__/           # Vitest tests
├── market-simulation/
│   ├── engine/
│   ├── models/
│   ├── routes/
│   └── __tests__/
├── pricing-simulation/
│   ├── engine/
│   ├── models/
│   ├── routes/
│   └── __tests__/
├── risk-simulation/
│   ├── engine/
│   ├── models/
│   ├── routes/
│   └── __tests__/
├── whatif-analysis/
│   ├── engine/
│   ├── models/
│   ├── routes/
│   └── __tests__/
└── scripts/
    └── start-simulation-os.sh
```

## Key Features

### 1. Company Simulation Engine

- **Hiring ROI Calculator**: Monte Carlo simulation for headcount expansion
- **Org Restructure Impact**: Financial and operational impact modeling
- **Process Change Analysis**: Efficiency and cost-benefit analysis
- **Tech Adoption ROI**: Investment return with adoption curves

### 2. Market Simulation

- **Demand Forecasting**: Multiple forecasting methods with seasonality
- **Price Elasticity**: Segment-level elasticity analysis
- **Market Share Projection**: Competitive dynamics modeling
- **Scenario Analysis**: Optimistic, Base, Pessimistic, Black Swan

### 3. Pricing Simulation

- **A/B Testing Simulator**: Traffic split simulation with statistical significance
- **Value-based Pricing**: WTP estimation with value drivers
- **Competitive Pricing**: Position analysis and recommendations
- **Promotional Impact**: Break-even discount analysis

### 4. Risk Simulation

- **Value at Risk (VaR)**: Historical, Variance-Covariance, Monte Carlo
- **Sensitivity Analysis**: One-way and two-way analysis
- **Stress Testing**: Standard scenarios (Market Crash, Recession, etc.)
- **Risk Mitigation**: Prioritized recommendations with cost/impact

### 5. What-If Analysis

- **Natural Language Parsing**: Convert questions to structured analysis
- **Scenario Comparison**: Side-by-side comparison of alternatives
- **Insights Generation**: Opportunity, risk, and recommendation insights
- **Template Library**: Pre-built templates for common scenarios

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test:watch
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SIMULATION_PORT` | 4300 | Server port |
| `NODE_ENV` | development | Environment |
| `CORS_ORIGIN` | * | CORS allowed origins |

## Health Check

```bash
curl http://localhost:4300/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-06-27T00:00:00.000Z",
  "uptime": 3600,
  "version": "2.0.0",
  "modules": {
    "companySimulation": true,
    "marketSimulation": true,
    "pricingSimulation": true,
    "riskSimulation": true,
    "whatIfAnalysis": true
  }
}
```

## Integration with SUTAR

SimulationOS is designed to work seamlessly with the SUTAR autonomous economic layer:

1. **Decision Engine Integration**: Pulls scenarios for multi-option ranking
2. **MemoryOS Integration**: Stores simulation results for future reference
3. **TwinOS Integration**: Updates digital twins with simulated outcomes
4. **CorpID Integration**: Authenticates simulation requests

## License

MIT
