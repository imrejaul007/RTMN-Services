# Identity Memory

**Service:** AI Memory Integration
**Port:** 4702 (via gateway)
**Prefix:** `/api/memory`

---

## Overview

The Identity Memory service provides persistent memory for AI agents, allowing them to remember user preferences, behaviors, and context across sessions. It integrates with MemoryOS for personalized AI experiences.

## Features

- **7 Memory Categories:** Preferences, behavioral, communication, security, social, professional, contextual
- **Confidence Scoring:** 0-1 confidence per memory
- **Source Tracking:** User, agent, system, observed
- **Memory Types:** Explicit, inferred, episodic
- **Access Control:** Per-agent read/write/delete permissions
- **Bulk Operations:** Agent sync support
- **Search:** Full-text memory search
- **Archive/Delete:** Lifecycle management
- **Privacy Controls:** Share with specific orgs/agents

## Memory Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `preferences` | User-stated preferences | Theme, language, notifications |
| `behavioral` | Observed behaviors | Active hours, shopping patterns |
| `communication` | Communication style | Tone, formality, frequency |
| `security` | Security preferences | MFA, password rotation |
| `social` | Social connections | Friends, family, colleagues |
| `professional` | Work context | Job, skills, projects |
| `contextual` | Session context | Current task, mood |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memory/categories` | Get categories |
| GET | `/api/memory/me` | Get my memory link |
| PUT | `/api/memory/me` | Update memory settings |
| POST | `/api/memory/me/memories` | Store memory |
| GET | `/api/memory/me/memories` | List my memories |
| GET | `/api/memory/me/memories/search` | Search memories |
| GET | `/api/memory/me/memories/:id` | Get specific memory |
| PUT | `/api/memory/me/memories/:id` | Update memory |
| POST | `/api/memory/me/memories/:id/archive` | Archive memory |
| DELETE | `/api/memory/me/memories/:id` | Delete memory |
| GET | `/api/memory/me/stats` | Memory statistics |
| POST | `/api/memory/me/memories/bulk` | Bulk store (agent sync) |

## Usage Example

### Store Memory
```bash
curl -X POST http://localhost:4702/api/memory/me/memories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preferences",
    "category": "ui",
    "key": "theme",
    "value": "dark",
    "confidence": 0.9,
    "source": "user"
  }'
```

### Search Memories
```bash
curl "http://localhost:4702/api/memory/me/memories/search?q=theme" \
  -H "Authorization: Bearer $TOKEN"
```

### Bulk Store (Agent)
```bash
curl -X POST http://localhost:4702/api/memory/me/memories/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memories": [
      { "type": "behavioral", "key": "active_hours", "value": "9-17" },
      { "type": "preferences", "key": "language", "value": "en" }
    ]
  }'
```

### Memory Statistics
```bash
curl http://localhost:4702/api/memory/me/stats \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "summary": {
    "total": 25,
    "byType": {
      "preferences": 10,
      "behavioral": 8,
      "contextual": 7
    },
    "bySource": {
      "user": 12,
      "agent": 10,
      "system": 3
    },
    "averageConfidence": 0.82
  }
}
```

## Memory Lifecycle

```
Created → Active → Archived (optional) → Deleted
                ↓
            Updated (continuously)
```

## File Structure

```
memory/
├── src/
│   ├── models/
│   │   └── memory.model.js
│   └── routes/
│       └── memory.routes.js
└── CLAUDE.md
```
