# Emotional Journey

**Port:** 4764  
Post-call emotional journey analysis.

## Features

- Track emotion sequences over time
- Journey analysis (peaks, valleys, transitions)
- CSAT prediction from emotion
- Journey comparison
- Trajectory analysis

## API

```bash
# Create journey
POST /journey/create
{"conversationId": "conv-1", "participantId": "user-1"}

# Add emotion
POST /journey/:id/emotion
{"emotion": "happy", "intensity": 0.8}

# Analyze journey
POST /journey/:id/analyze

# Compare journeys
POST /journey/:id/compare
{"otherJourneyId": "journey-2"}

# Get journey
GET /journey/:id
```

## Testing

```bash
npm test
```
