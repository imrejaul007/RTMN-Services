# Relationship OS

**Port: 4897**

Full relationship graph with trust hierarchy, voice preferences, and clusters.

## Features

- Relationship nodes (family, friend, colleague, boss, partner, client, acquaintance, service, AI)
- Trust scoring (0-100) with levels (stranger → intimate)
- Voice preferences per relationship
- Interaction history tracking
- Relationship clusters (family, work, social)
- Context awareness (how met, interests, groups, language, timezone)

## API Endpoints

```
POST /api/relationships                - Create relationship
GET  /api/relationships/:userId          - Get all relationships
GET  /api/relationships/:userId/:target - Get specific relationship
PATCH /api/relationships/:id/trust       - Update trust score
GET  /api/relationships/:userId/graph    - Get relationship graph
GET  /api/relationships/:id/voice-prefs - Get voice preferences
PATCH /api/relationships/:id/voice-prefs - Update voice preferences
```

## Example

```bash
# Create relationship
curl -X POST http://localhost:4897/api/relationships \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-1",
    "targetId": "mom-1",
    "targetName": "Mom",
    "targetType": "human",
    "type": "family"
  }'

# Get voice preferences
curl http://localhost:4897/api/relationships/rel-user-1-mom-1/voice-preferences
# Returns: { formality: 0.2, warmth: 0.9, humorLevel: "moderate", ... }
```

## Voice Preferences by Relationship

| Relationship | Formality | Warmth | Humor | Interruption |
|--------------|-----------|--------|-------|--------------|
| Family | 0.2 | 0.9 | High | Allowed |
| Friend | 0.3 | 0.7 | High | Allowed |
| Colleague | 0.6 | 0.5 | Light | No |
| Boss | 0.8 | 0.3 | None | No |
| Client | 0.9 | 0.4 | None | No |

## VoiceOS Integration

Used by Layer 4 of the 12-layer VoiceOS architecture for relationship-aware voice responses.
