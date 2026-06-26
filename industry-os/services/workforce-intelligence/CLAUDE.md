# Workforce Intelligence OS

**Port:** 5283  
**Status:** ✅ Built (June 26, 2026)

Strategic Workforce Analytics & Planning: Capacity planning, skills mapping, productivity analytics, retention prediction, and strategic workforce optimization.

## AI Agents (4)

| Agent | Purpose |
|-------|---------|
| Capacity Planning Agent | Demand forecasting, gap analysis, resource allocation |
| Skills Intelligence Agent | Skills mapping, gap identification, development recommendations |
| Performance Intelligence Agent | Performance analysis, high-performer identification, prediction |
| Retention Intelligence Agent | Flight risk prediction, turnover analysis, retention recommendations |

## Key Features

- **Capacity Planning**: Demand forecasting, utilization analysis, allocation optimization
- **Skills Intelligence**: Skills inventory, gap analysis, career pathing, learning recommendations
- **Performance Management**: Performance tracking, trend analysis, peer comparisons
- **Retention Analytics**: Flight risk scoring, turnover analysis, retention strategies

## Endpoints

```
POST /api/employees                    # Add employee
GET  /api/employees                    # List employees
GET  /api/capacity/:orgId             # Capacity analysis
GET  /api/capacity/:orgId/forecast    # Demand forecast
GET  /api/skills/:orgId/map          # Skills mapping
GET  /api/skills/:orgId/gaps         # Skills gaps
POST /api/performance                 # Record performance
GET  /api/performance/:id            # Performance analysis
GET  /api/retention/:id/risk         # Flight risk
GET  /api/retention/:orgId/analysis  # Turnover analysis
```

## Start

```bash
cd industry-os/services/workforce-intelligence
npm start
# http://localhost:5283/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
