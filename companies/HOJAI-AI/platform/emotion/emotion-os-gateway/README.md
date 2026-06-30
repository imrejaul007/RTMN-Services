# EmotionOS Gateway

**Unified entry point for all emotion intelligence services.**

Port: 4760

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Voice Emotion Detection | 4760 | Real-time voice emotion analysis |
| Emotional Memory | 4761 | Emotional timeline storage |
| Empathy Response Engine | 4762 | Empathetic response generation |
| Emotion Analytics | 4763 | Dashboards and insights |
| Emotional Journey | 4764 | Post-call journey analysis |
| Emotion Alerts | 4765 | Real-time emotion alerts |
| Cross-Modal Emotion | 4766 | Text + voice emotion fusion |
| Tone Analysis | 4767 | Tone and sentiment analysis |

## Quick Start

```bash
npm install
npm start
```

## API Endpoints

### POST /analyze
Unified emotion analysis from text/voice.

```json
{
  "text": "I am frustrated",
  "voice": { "pitch": 85, "energy": 92, "speechRate": 195 },
  "context": "customer_support",
  "entityId": "user_123"
}
```

### POST /trust
Calculate trust score for relationships.

```json
{
  "sourceId": "user_123",
  "targetId": "merchant_456",
  "trustHistory": [{ "positive": true }],
  "interaction": { "positive": true }
}
```

### GET /timeline/:entityId
Get emotion timeline for an entity.

### POST /empathy
Generate empathetic responses based on emotion.

### POST /cross-modal
Fuse emotion from multiple modalities (text, voice, face).

### POST /tone
Analyze tone of text.

### GET /capabilities
List all gateway capabilities.

### GET /services
List all downstream services and their status.

## Architecture

```
┌─────────────────────────────────────┐
│         EmotionOS Gateway             │
│           (Port 4760)              │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┬──────────┐
    ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Voice │ │Memory│ │Empathy│ │Tone   │
│Emotn │ │      │ │Respns │ │Analysis│
└──────┘ └──────┘ └──────┘ └──────┘
```
