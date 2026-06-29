# Emotion Alerts

**Port:** 4765  
Real-time emotion alerts.

## API

```bash
POST /rules {"emotion": "angry", "severity": "high"}
POST /emotion/evaluate {"entityId": "user-1", "emotion": "angry", "intensity": 0.9}
GET /alerts
PUT /alerts/:id/resolve
```
