# Identity Timeline

**Service:** Activity Timeline
**Port:** 4702 (via gateway)
**Prefix:** `/api/timeline`

---

## Overview

The Identity Timeline service provides a complete activity history for all identity interactions. It tracks events across authentication, transactions, profile changes, AI interactions, and more.

## Features

- **9 Event Categories:** Authentication, transaction, profile, security, AI, organization, social, device, API
- **30+ Event Types:** Detailed event classification
- **Time-based Queries:** Filter by date range
- **Search:** Full-text event search
- **Statistics:** Activity breakdown by category and date
- **Actor Tracking:** Who performed each action
- **Context Capture:** IP, device, location per event
- **Content Storage:** AI interaction content
- **Visibility Levels:** User, admin, system

## Event Categories

| Category | Examples |
|----------|----------|
| `authentication` | Login, logout, MFA events |
| `transaction` | Orders, payments |
| `profile` | Profile updates, preferences |
| `security` | Device added, suspicious activity |
| `ai_interaction` | Agent created, memory stored |
| `organization` | Joined, left, role changes |
| `social` | Follow, unfollow |
| `device` | Registered, trusted, blocked |
| `api` | API key events |

## Event Types

### Authentication Events
- `auth.login` - User logged in
- `auth.logout` - User logged out
- `auth.failed` - Failed login attempt
- `auth.mfa_enabled` - MFA enabled
- `auth.password_changed` - Password changed

### Profile Events
- `profile.updated` - Profile updated
- `profile.avatar_changed` - Avatar changed
- `profile.preferences_changed` - Preferences updated

### Security Events
- `security.device_added` - New device registered
- `security.api_key_created` - API key created
- `security.suspicious_activity` - Suspicious activity detected

### AI Events
- `ai.agent_created` - AI agent created
- `ai.interaction` - AI interaction
- `ai.memory_stored` - Memory stored

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/timeline/types` | Get event types |
| GET | `/api/timeline/me` | Get my timeline |
| GET | `/api/timeline/me/recent` | Recent activity |
| GET | `/api/timeline/me/stats` | Statistics |
| GET | `/api/timeline/me/search` | Search events |
| GET | `/api/timeline/me/events/:id` | Get specific event |
| POST | `/api/timeline/me/events` | Record event |
| GET | `/api/timeline/user/:userId` | User timeline (admin) |
| GET | `/api/timeline/stats` | Platform stats (admin) |

## Usage Example

```bash
# Get recent activity
curl "http://localhost:4702/api/timeline/me/recent?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "count": 10,
  "events": [
    {
      "id": "evt-abc",
      "timestamp": "2026-06-18T19:00:00Z",
      "type": "auth.login",
      "category": "authentication",
      "title": "Login successful",
      "actor": { "type": "user", "id": "user-123" },
      "context": { "ip": "192.168.1.1", "userAgent": "..." },
      "result": { "status": "success" }
    }
  ]
}
```

```bash
# Get timeline statistics
curl http://localhost:4702/api/timeline/me/stats \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "stats": {
    "totalEvents": 150,
    "byCategory": {
      "authentication": 80,
      "profile": 30,
      "security": 20,
      "ai_interaction": 15,
      "transaction": 5
    },
    "byDate": {
      "2026-06-17": { "count": 45 },
      "2026-06-18": { "count": 60 }
    }
  }
}
```

```bash
# Search timeline
curl "http://localhost:4702/api/timeline/me/search?q=login" \
  -H "Authorization: Bearer $TOKEN"
```

## File Structure

```
timeline/
├── src/
│   ├── models/
│   │   └── timeline.model.js
│   └── routes/
│       └── timeline.routes.js
└── CLAUDE.md
```