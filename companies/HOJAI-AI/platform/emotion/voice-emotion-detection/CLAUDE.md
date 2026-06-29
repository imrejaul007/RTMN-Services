# Voice Emotion Detection - Service Guide

## Service Overview

**Purpose:** Analyzes audio characteristics to identify emotional states in speech  
**Port:** 4760  
**Type:** Express.js REST API  
**Dependencies:** express, cors, helmet  

## Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Main service entry point - Express app with all endpoints |
| `__tests__/unit/` | Unit tests for service functionality |
| `package.json` | Service metadata and dependencies |

## Architecture

```
src/index.js
├── Prosodic Feature Extraction
│   └── extractProsodicFeatures(audioData) → features object
│       - pitch, energy, speechRate, pauseFrequency, jitter, shimmer
│
├── Emotion Classification
│   └── classifyEmotion(features) → { emotions, dimensions }
│       - Rule-based emotion mapping
│       - VAD (Valence-Arousal-Dominance) dimensions
│
├── Score Normalization
│   └── normalizeScores(scores) → normalized object
│       - Scales scores to 0-1 range relative to max
│
└── API Endpoints
    ├── POST /analyze - Single audio analysis
    ├── POST /analyze/stream - Segmented stream analysis
    ├── GET /emotions - Available emotion categories
    └── GET /health - Health check
```

## Emotion Model

### Categories
- **happy** → joy
- **sad** → sorrow
- **angry** → frustration
- **fearful** → anxiety
- **surprised** → startle
- **disgusted** → aversion
- **neutral** → calm

### Dimensions
- **valence** (0-1): negative ↔ positive emotional tone
- **arousal** (0-1): low energy ↔ high energy
- **dominance** (0-1): lack of control ↔ in control

## Classification Rules

| Feature Condition | Primary Emotion |
|------------------|-----------------|
| `energy > 70 && pitch > 70` | happy/excited |
| `energy < 40 && speechRate < 130` | sad |
| `pitch > 80 && speechRate > 180 && pauseFrequency > 5` | fearful/anxious |
| `energy > 80 && speechRate > 190` | angry |

## Common Tasks

### Adding a new emotion category

Edit `src/index.js`:
```javascript
// Add to EMOTIONS object (line 13-21)
const EMOTIONS = {
  // existing emotions...
  surprised: 'startle',
  // add new: yourEmotion: 'description'
};

// Add classification rule in classifyEmotion() (line 41-83)
// Add condition before the neutral fallback
```

### Modifying classification thresholds

Edit rules in `classifyEmotion()` function around lines 46-68:
```javascript
// Example: Make anger detection more sensitive
if (features.energy > 75 && features.speechRate > 180) {
  scores.angry = 0.75 + Math.random() * 0.2;
}
```

### Adding dimension calculations

Edit the dimensions section in `classifyEmotion()` around lines 71-81:
```javascript
const valence = /* your formula */;
const arousal = features.energy / 100;
const dominance = /* your formula */;
```

## Integration Points

### With Genie Voice Gateway (port 4880)
Voice emotion detection can enrich voice conversations with emotional context for more empathetic responses.

### With Customer Success OS (port 4050)
Monitor customer frustration levels during support calls for early intervention.

### With Analytics/Monitoring
Track emotional trends over time for customer satisfaction metrics.

## Testing

```bash
# Run unit tests
npm test

# Add new test in __tests__/unit/
# Use vitest describe/it blocks
```

## Environment

- `PORT` - Override default 4760
- Service uses helmet for security headers
- CORS enabled for cross-origin requests
