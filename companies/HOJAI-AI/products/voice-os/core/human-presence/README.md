# Human Presence Engine

**Port: 4896**

Detects and adapts to human presence, attention, energy, and context.

## Features

- Presence state detection (active, distracted, tired, focused, multi-tasking, stressed, relaxed)
- Energy analysis (mental, physical, emotional, social)
- Attention tracking
- Context awareness (location, activity, social context)
- Multi-person session detection
- Group dynamics analysis
- Presence-based adaptations

## API Endpoints

```
POST /api/presence              - Update presence state
GET  /api/presence/:userId      - Get current presence
POST /api/presence/analyze      - Analyze conversation
POST /api/presence/detect-mode  - Detect conversation mode
GET  /api/presence/:userId/adaptation - Get voice adaptation
POST /api/presence/session/create - Create multi-person session
POST /api/presence/session/:id/speak - Record speaking
GET  /api/presence/session/:id   - Get session state
```

## Example

```bash
# Update presence
curl -X POST http://localhost:4896/api/presence \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "state": "focused", "energy": {"mental": "high"}}'

# Get adaptation
curl http://localhost:4896/api/presence/user-1/adaptation
```

## Multi-Person Sessions

```bash
# Create session
curl -X POST http://localhost:4896/api/presence/session/create \
  -d '{"sessionId": "meeting-1", "participantIds": ["user-1", "user-2", "user-3"]}'

# Detect mode
curl http://localhost:4896/api/presence/session/meeting-1
# Returns: { mode: "meeting", adaptation: {...} }
```

## VoiceOS Integration

Used by Layer 7 and Layer 12 of the 12-layer VoiceOS architecture for presence detection and multi-person conversation awareness.
