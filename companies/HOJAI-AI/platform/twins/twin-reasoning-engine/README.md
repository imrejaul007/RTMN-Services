# Twin Reasoning Engine

**Port:** 4716

Active cross-twin reasoning and explanation service.

## Features

- Why reasoning (explain events with causes)
- What-if reasoning (scenario analysis)
- Trace reasoning (relationship path traversal)
- Recommendations generation
- Reasoning chains (multi-step analysis)
- Twin data registration

## API

```bash
# Why analysis
curl -X POST localhost:4716/api/reasoning/why \
  -d '{"twinId": "customer-1", "event": "churn"}'

# What-if scenario
curl -X POST localhost:4716/api/reasoning/whatif \
  -d '{"twinId": "customer-1", "action": "send_discount"}'

# Trace relationships
curl -X POST localhost:4716/api/reasoning/trace \
  -d '{"twinId": "customer-1"}'

# Get recommendations
curl -X POST localhost:4716/api/reasoning/recommend \
  -d '{"twinId": "customer-1"}'
```

## Tests

```bash
npm test  # 12 tests
```

## Status

✅ Production Ready - 12 tests passing
