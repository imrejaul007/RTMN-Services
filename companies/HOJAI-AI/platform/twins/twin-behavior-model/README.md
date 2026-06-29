# Twin Behavior Model

**Port:** 4718

Behavior learning and pattern detection for digital twins.

## Features

- Pattern capture and detection
- Preference learning
- Anomaly detection
- Routine identification
- Personality modeling
- Communication style analysis

## API

```bash
# Observe behavior event
curl -X POST localhost:4718/api/behavior/observe \
  -d '{"twinId": "emp-123", "eventType": "task_complete"}'

# Get behavior profile
curl localhost:4718/api/behavior/profile/emp-123

# Detect patterns
curl -X POST localhost:4718/api/behavior/patterns \
  -d '{"twinId": "emp-123"}'

# Learn preferences
curl -X POST localhost:4718/api/behavior/learn \
  -d '{"twinId": "emp-123", "preference": {"category": "channel", "value": "slack"}}'
```

## Tests

```bash
npm test  # 40 tests
```

## Status

✅ Production Ready - 40 tests passing