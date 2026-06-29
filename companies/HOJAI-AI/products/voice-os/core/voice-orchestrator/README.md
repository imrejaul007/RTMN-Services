# Voice Orchestrator

**Port: 4898**

Wires RAZO → Genie → VoiceOS pipeline for complete voice interaction.

## Pipeline

```
User Input → RAZO (intent) → VoiceOS Context → Genie (response) → VoiceOS Directives → Audio
```

## Features

- Full pipeline orchestration
- RAZO intent detection integration
- Genie response generation
- VoiceOS context gathering (presence, relationships, conversation physics)
- Voice directive generation
- TTS audio generation

## API Endpoints

```
POST /api/voice/orchestrate   - Full voice pipeline
POST /api/voice/command       - Voice command (text or audio)
POST /api/voice/text          - Text input with voice response
GET  /api/voice/presence/:userId - Get presence adaptation
```

## Example

```bash
# Full voice orchestration
curl -X POST http://localhost:4898/api/voice/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-1",
    "input": "Order my usual pizza",
    "context": {
      "relationship": "friend"
    }
  }'

# Response
{
  "response": "Sure! Your usual Margherita from Domino's? It'll be there in 25 minutes.",
  "emotion": "friendly",
  "directives": {
    "pace": 1.0,
    "warmth": 0.7,
    "pauseBeforeMs": 200
  },
  "actions": [...]
}
```

## Service URLs (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| RAZO_URL | http://localhost:4299 | Intent detection |
| GENIE_URL | http://localhost:4701 | Response generation |
| CONVERSATION_PHYSICS_URL | http://localhost:4891 | Turn analysis |
| VOICE_DIRECTOR_URL | http://localhost:4892 | Voice directives |
| HUMAN_PRESENCE_URL | http://localhost:4896 | Presence detection |
| RELATIONSHIP_URL | http://localhost:4897 | Relationship context |
| TTS_URL | http://localhost:4880 | Text-to-speech |

## VoiceOS Integration

Used by Layer 9 of the 12-layer VoiceOS architecture as the central orchestrator.
