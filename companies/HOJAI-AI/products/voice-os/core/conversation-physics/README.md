# Conversation Physics Engine

> **Part of HOJAI VoiceOS** | Port: 4881

Makes AI conversations feel human through:
- **Turn Manager**: When to speak, wait, interrupt, continue
- **Silence Intelligence**: Understanding pause meanings
- **Backchannel Generator**: "mm-hmm", "right...", "I understand..."
- **Repair Engine**: Self-correction handling
- **Emotion Trajectory**: Emotional flow tracking

## Architecture

```
User Speech → Conversation Physics → Voice Director → TTS
                     ↓
              MemoryOS (context)
                     ↓
              EmotionOS (emotional state)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversation/start` | Start conversation session |
| POST | `/api/conversation/user-speech` | Process user speech |
| POST | `/api/conversation/ai-speech` | Generate voice directive |
| POST | `/api/conversation/end` | End conversation |
| GET | `/api/conversation/:sessionId` | Get session state |
| GET | `/api/emotion/:userId` | Get emotional state |
| GET | `/health` | Health check |
| GET | `/ready` | Readiness probe |

## Key Features

### Turn Manager
- Detects user interruptions ("actually wait—" → wait for correction)
- Short utterances (yes/no) → continue previous thought
- Silence → backchannel acknowledgment

### Silence Intelligence
| Duration | Meaning | Response |
|----------|---------|----------|
| 0.5s | Thinking | None |
| 3s | Processing | None |
| 10s | Confusion | "Take your time..." |
| 30s | Distracted | "Still there?" |
| 60s+ | Abandoned | "Catch you later!" |

### Repair Engine
Handles self-corrections:
- "Book flight to Delhi—sorry, Mumbai" → acknowledges, uses Mumbai
- "I meant—" → captures corrected intent
- Updates MemoryOS with clarification

### Emotion Trajectory
Tracks emotional flow over time:
- "You sound calmer this week than last month"
- Detects emotional shifts and patterns
- Generates contextual responses based on trajectory

## Example Usage

```bash
# Start conversation
curl -X POST http://localhost:4881/api/conversation/start \
  -H 'Content-Type: application/json' \
  -d '{"userId": "user-123", "context": {"relationship": "friend", "timeOfDay": "evening"}}'

# Process user speech
curl -X POST http://localhost:4881/api/conversation/user-speech \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "abc-123", "transcript": "Actually wait, I meant Mumbai not Delhi", "emotion": "thinking"}'

# Generate AI response directive
curl -X POST http://localhost:4881/api/conversation/ai-speech \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "abc-123", "plannedResponse": "Got it, Mumbai. Let me find flights for you.", "targetEmotion": "professional"}'
```

## Relationship-Specific Responses

The engine adapts to relationship context:

| Relationship | Example Response |
|--------------|------------------|
| Mother | "Beta, take your time..." |
| Friend | "Yo, you still there?" |
| Investor | "Take your time to consider..." |
| Customer | "I'm here to help..." |

## Integration

- **Voice Gateway (4880)**: Sends STT output, receives Voice Directives
- **MemoryOS (4703)**: Stores conversation context
- **Genie Companion**: Emotional state and trajectory
- **RAZO Keyboard**: Intent detection and conversation flow

---

*Part of the 12-layer VoiceOS architecture. See [HOJAI VoiceOS](../CLAUDE.md)*
