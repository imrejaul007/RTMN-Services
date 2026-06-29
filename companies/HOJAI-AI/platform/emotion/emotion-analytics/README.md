# Emotion Analytics

**Port:** 4763  
Emotion analytics dashboards and insights.

## Features

- Emotion pattern analysis
- Trend detection
- Distribution analysis
- Alert system
- Conversation tracking

## API

```bash
# Track emotion
POST /analytics/track
{"conversationId": "conv-1", "emotion": "happy", "intensity": 0.8}

# Analyze emotions
POST /analytics/analyze
{"conversationId": "conv-1", "timeframe": "day"}

# Get summary
GET /analytics/summary

# Start conversation
POST /conversation/start
{"conversationId": "conv-1"}

# Add emotion to conversation
POST /conversation/:id/emotion
{"emotion": "frustrated"}
```

## Testing

```bash
npm test
```
