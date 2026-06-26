# Verification OS

**Port:** 5265  
**Status:** ✅ Built (June 26, 2026)

AI Output Reproducibility & Validation Platform: Baseline management, execution validation, regression detection, and AI output consistency tracking.

## AI Agents (2)

| Agent | Purpose |
|-------|---------|
| Verification Agent | Baseline creation, output comparison, drift detection |
| Regression Detector Agent | Regression identification, impact analysis, alert generation |

## Key Features

- **Baseline Management**: Versioned baselines, metadata tracking, snapshot storage
- **Output Validation**: Diff generation, semantic comparison, threshold validation
- **Reproducibility Tracking**: Hash verification, environment capture, execution logs
- **Regression Detection**: Change detection, impact scoring, trend analysis

## Endpoints

```
POST /api/baselines                # Create baseline
GET  /api/baselines               # List baselines
GET  /api/baselines/:id          # Get baseline
POST /api/validate                # Validate output
GET  /api/validate/:id           # Validation results
POST /api/executions             # Log execution
GET  /api/executions/:id        # Execution details
GET  /api/regression/:id        # Regression analysis
```

## Start

```bash
cd industry-os/services/verification-os
npm start
# http://localhost:5265/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
