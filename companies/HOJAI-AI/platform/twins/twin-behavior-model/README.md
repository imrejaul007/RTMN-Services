# TwinOS Behavior Model
**Port: 4718**

> Behavior learning and pattern detection for digital twins.

## Features
- Pattern capture and detection
- Preference learning
- Anomaly detection
- Routine identification
- Personality modeling
- Communication style analysis

## API

```bash
# Observe event
curl -X POST :4718/api/behavior/observe -d '{"twinId":"emp-1","eventType":"meeting"}'

# Get profile
curl :4718/api/behavior/profile/emp-1

# Detect patterns
curl -X POST :4718/api/behavior/patterns -d '{"twinId":"emp-1"}'
```

## Tests
```bash
npm test
```
