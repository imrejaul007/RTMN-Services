# Life Timeline Intelligence

> **Part of HOJAI VoiceOS** | Port: 4883

Tracks personal life evolution through:
- **Life Chapters**: From childhood to legacy
- **Milestones**: Achievements, turning points, anniversaries
- **Identity Evolution**: How values, priorities, and goals change
- **Growth Insights**: Patterns, lessons, and personal development

## Architecture

```
Life Events → Chapter Detector → Timeline Context → VoiceOS
                   ↓
              MemoryOS (long-term storage)
                   ↓
              Genie (reflection & growth)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/event` | Add a life event |
| GET | `/api/timeline/:userId` | Get timeline with events, chapters, stats |
| POST | `/api/profile` | Create/update user profile |
| GET | `/api/profile/:userId` | Get user profile and current state |
| POST | `/api/reflection` | Generate AI reflection |
| GET | `/api/context/:userId` | Get voice conversation context |
| GET | `/health` | Health check |

## Life Chapters

| Chapter | Typical Age | Events |
|---------|-------------|--------|
| Childhood | 0-12 | Early memories, family |
| Education | 12-22 | School, college, learning |
| Early Career | 22-30 | First jobs, career starts |
| Career | 30-45 | Professional growth |
| Entrepreneurship | 25+ | Building companies |
| Relationships | 25+ | Deep connections |
| Marriage | 28+ | Partnership |
| Parenthood | 30+ | Family building |
| Midlife | 45-60 | Reflection, wisdom |
| Retirement | 60+ | Freedom, legacy |

## Example Usage

```bash
# Create profile
curl -X POST http://localhost:4883/api/profile \
  -H 'Content-Type: application/json' \
  -d '{"userId": "user-123", "birthYear": 1990}'

# Add life event
curl -X POST http://localhost:4883/api/event \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user-123",
    "type": "achievement",
    "title": "First startup launched",
    "impact": "high",
    "isMilestone": true,
    "emotions": ["excited", "nervous"]
  }'

# Get reflection
curl -X POST http://localhost:4883/api/reflection \
  -H 'Content-Type: application/json' \
  -d '{"userId": "user-123", "timeRange": "year"}'
```

## Voice Context Example

```json
{
  "userId": "user-123",
  "currentChapter": "entrepreneurship",
  "currentGoals": ["Scale to 1M users", "Hire great team"],
  "recentEvents": [...],
  "upcomingMilestones": [
    {
      "title": "Company founded",
      "yearsSince": 2,
      "type": "anniversary"
    }
  ],
  "growthInsight": "You've grown from optimizer to visionary over 2 years"
}
```

## Integration

- **MemoryOS**: Stores long-term memories
- **Genie Companion**: Emotional state and trajectory
- **Conversation Physics**: Turn context and relationship awareness
- **Voice Director**: Emotional authenticity in responses

## Life Moat

> "The winning formula is: Human Voice = Emotion + Memory + Personality + Timing + Context + Action"

Life Timeline is the **Memory** component — it makes VoiceOS feel alive by remembering the user's story over years, not sessions.

---

*Part of the 12-layer VoiceOS architecture. See [HOJAI VoiceOS](../CLAUDE.md)*
