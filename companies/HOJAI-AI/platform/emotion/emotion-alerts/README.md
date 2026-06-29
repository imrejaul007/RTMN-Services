# Emotion Alerts

**Port:** 4765  
Real-time emotion alerts.

## Features

- Alert rules engine
- Intensity thresholds
- Severity levels
- Webhook subscriptions

## API

```bash
# Create rule
POST /rules
{"emotion": "angry", "severity": "high", "message": "Customer escalating"}

# Evaluate emotion
POST /emotion/evaluate
{"entityId": "user-1", "emotion": "angry", "intensity": 0.9}

# List alerts
GET /alerts?severity=high

# Resolve alert
PUT /alerts/:id/resolve
{"resolution": "Issue resolved"}

# Subscribe
POST /subscribe
{"callback": "https://...", "filters": {"severity": "high"}}
```

## Testing

```bash
npm test
```
