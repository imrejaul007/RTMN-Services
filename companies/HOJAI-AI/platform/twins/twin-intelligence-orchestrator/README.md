# Twin Intelligence Orchestrator

**Port:** 4715

Central orchestration layer for TwinOS intelligence services.

## Features

- Unified twin analysis across all intelligence services
- Cross-twin reasoning
- Prediction generation
- Learning loop management
- Service health monitoring

## API

```bash
# Health check
curl localhost:4715/health

# Full twin analysis
curl -X POST localhost:4715/api/orchestrator/analyze \
  -H 'Content-Type: application/json' \
  -d '{"twinId": "customer-123"}'

# Cross-twin reasoning
curl -X POST localhost:4715/api/orchestrator/reason \
  -d '{"twins": ["customer-1", "order-1"], "query": "Why churn?"}'
```

## Tests

```bash
npm test  # 39 tests
```

## Architecture

```
TwinOS Hub (4705)
    ↓
Twin Intelligence Orchestrator (4715)
    ├── Twin Behavior Model (4718)
    ├── Twin Reasoning Engine (4716)
    ├── Twin Learning OS (4735)
    └── Twin Execution OS (4737)
```

## Status

✅ Production Ready - 39 tests passing
