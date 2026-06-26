# Experimentation OS

**Port:** 5277  
**Status:** ✅ Built (June 26, 2026)

Feature Flag & A/B Testing Platform: Feature flags, experiment management, statistical analysis, and canary deployments.

## AI Agents (2)

| Agent | Purpose |
|-------|---------|
| Experiment Design Agent | Hypothesis creation, sample size calculation, metrics selection |
| Statistical Analysis Agent | A/B test analysis, significance testing, recommendations |

## Key Features

- **Feature Flags**: Toggle features, percentage rollouts, user targeting
- **A/B Testing**: Multi-variant tests, statistical significance, conversion tracking
- **Canary Deployments**: Gradual rollouts, automated rollback, traffic splitting
- **Experimentation**: Hypothesis tracking, experiment timeline, results analysis

## Endpoints

```
POST /api/flags                     # Create feature flag
GET  /api/flags                     # List flags
PATCH /api/flags/:id               # Update flag
POST /api/experiments              # Create experiment
GET  /api/experiments              # List experiments
POST /api/experiments/:id/results  # Record results
GET  /api/analysis/:id             # Statistical analysis
POST /api/deployments/canary       # Canary deployment
```

## Start

```bash
cd industry-os/services/experimentation-os
npm start
# http://localhost:5277/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
