# Voice Director

> **Part of HOJAI VoiceOS** | Port: 4882

Generates emotionally authentic voice directives for TTS synthesis:
- **Emotion-based settings**: pace, volume, pauses, expressions
- **Personality modes**: Founder, Friend, Mother, Professional, Teacher, Coach, Child
- **SSML markup**: Ready for ElevenLabs, Cartesia, Google TTS
- **Timed text**: Simple markers for any TTS engine

## Architecture

```
LLM Output → Voice Director → TTS Engine → Human-like Speech
                    ↓
           Voice Directive:
           {
             emotion: "empathetic",
             pace: 0.85,
             volume: "soft",
             pauseBeforeMs: 400,
             expressions: ["WARM", "SMILE"]
           }
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/directive` | Generate voice directive + blueprint |
| POST | `/api/directive/ssml` | Generate SSML directly |
| POST | `/api/directive/batch` | Batch process multiple utterances |
| POST | `/api/blueprint/convert` | Convert between formats |
| GET | `/api/personality-modes` | List available modes |
| GET | `/health` | Health check |

## Voice Emotions

| Emotion | Pace | Volume | Expressions |
|---------|------|--------|-------------|
| excited | 1.15 | loud | EXCITED, BREATH |
| happy | 1.05 | normal | SMILE |
| sad | 0.8 | soft | THOUGHTFUL |
| empathetic | 0.8 | soft | WARM, SMILE |
| concerned | 0.85 | soft | CONCERNED |
| warm | 0.95 | soft | WARM, SMILE |
| professional | 0.95 | normal | — |
| whispering | 0.7 | very_soft | WHISPER |

## Personality Modes

| Mode | For | Pace | Formality |
|------|-----|------|-----------|
| **Founder** | Investor, Partner, Employee | 1.0 | 0.7 |
| **Friend** | Friend, Family | 1.05 | 0.2 |
| **Mother** | Mother | 0.85 | 0.3 |
| **Professional** | Customer, Investor | 0.95 | 0.9 |
| **Teacher** | Student, Learner | 0.85 | 0.6 |
| **Coach** | Coachee, Team | 1.1 | 0.4 |
| **Child** | Child | 1.15 | 0.1 |

## Example Usage

```bash
# Generate directive
curl -X POST http://localhost:4882/api/directive \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Congratulations... you did it. This is a huge achievement.",
    "emotion": "celebratory",
    "relationship": "friend",
    "personalityMode": "friend"
  }'

# Response
{
  "directive": {
    "emotion": "celebratory",
    "pace": 1.1,
    "volume": "loud",
    "pauseBeforeMs": 100,
    "pauseAfterMs": 150,
    "expressions": ["EXCITED", "SMILE"],
    "smile": true,
    "energy": "high"
  },
  "formats": {
    "ssml": "<speak><prosody rate='110%' volume='loud'>...</prosody></speak>",
    "timedText": "[SMILE] [EXCITED] Congratulations... [PAUSE 300ms] you did it."
  }
}
```

## Integration

- **Voice Gateway (4880)**: Receives voice directives for TTS synthesis
- **Conversation Physics (4881)**: Gets emotion context for directive generation
- **MemoryOS**: Stores voice preferences per user
- **Genie Companion**: Emotional state for directive tuning

---

*Part of the 12-layer VoiceOS architecture. See [HOJAI VoiceOS](../CLAUDE.md)*
