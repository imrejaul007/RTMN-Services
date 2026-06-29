# Empathy Response Engine

**Port:** 4762  
**Package:** `@hojai/empathy-response-engine`

Agent-assist system that suggests empathetic responses based on detected emotions.

## Features

- Emotion-aware response generation
- Multiple response suggestions per emotion
- Tone modification (formal, casual, professional)
- Action-based alternatives
- Integration with voice emotion detection

## Quick Start

```bash
npm install
npm start
```

## API

```bash
# Get response suggestions
POST /suggest
{"emotion": "frustrated", "options": {"count": 3}}

# Generate single response
POST /respond
{"emotion": "angry", "context": {"tone": "professional", "severity": "high"}}

# Get responses for emotion
GET /responses/:emotion

# List supported emotions
GET /emotions
```

## Supported Emotions

- frustrated, angry, sad, anxious, happy, confused

## Testing

```bash
npm test
```
