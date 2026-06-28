# Simulation OS

## Purpose
Company, market, pricing, and risk simulation engine with Monte Carlo analysis and scenario planning.

## Port
4874

## Features
- Monte Carlo simulation with Box-Muller transform
- Company financial projections (revenue, costs, profit margins)
- Market share simulation with competitor analysis
- Dynamic pricing optimization with elasticity modeling
- Risk simulation with Value at Risk (VaR) calculation
- Scenario generation with probabilities
- Timeline projections
- Chart data generation

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness check |
| POST | /api/simulate/company | Run company financial simulation |
| POST | /api/simulate/market | Run market share simulation |
| POST | /api/simulate/pricing | Run pricing optimization |
| POST | /api/simulate/risk | Run risk simulation (VaR) |
| GET | /api/simulate | List all simulations |
| GET | /api/simulate/:id | Get simulation results |
| DELETE | /api/simulate/:id | Cancel/delete simulation |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4874 | Service port |

## Commands

```bash
npm run dev     # Development with hot reload
npm start       # Production
npm test        # Run tests
```

## Simulation Types

### Company Simulation
Projects revenue growth, costs, and profit over 1-10 years based on:
- Current revenue and growth rate
- Employee count and cost structure
- Scenario types: revenue_growth, cost_reduction, expansion, acquisition

### Market Simulation
Monte Carlo analysis of market share with:
- Market size and growth rate
- Competitor market shares and growth rates
- Target market share goal
- 100-10,000 iterations

### Pricing Simulation
Optimizes pricing with:
- Current price and cost per unit
- Price elasticity coefficient
- Competitor prices
- Demand base
- Range min/max

### Risk Simulation
Value at Risk calculation with:
- Initial value
- Risk factors (probability and impact)
- Time horizon (years)
- 100-100,000 simulations

## Monte Carlo Method

Uses Box-Muller transform for normal distribution:
```
z = sqrt(-2 * ln(u1)) * cos(2 * pi * u2)
value = mean + z * stdDev
```

Returns percentile 5th and 95th values.

## VaR Calculation

Value at Risk (95% confidence):
```
VaR = initialValue - percentile5
```