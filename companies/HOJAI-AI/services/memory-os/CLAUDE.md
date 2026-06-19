# MemoryOS - Personal AI Memory

**Version:** 1.0.0  
**Port:** 4703  
**Status:** ✅ RUNNING | **June 18, 2026**

---

## Overview

MemoryOS is the **Personal AI Memory** service for the RTMN ecosystem. It stores and retrieves user memories, preferences, facts, and events across all Genie services.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MemoryOS (4703)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                       MEMORY TYPES                                     │       │
│  │                                                                       │       │
│  │   General ────→ Conversations, facts, preferences                    │       │
│  │   Preferences ────→ User settings, likes, dislikes                  │       │
│  │   Events ────→ Meetings, appointments, reminders                     │       │
│  │   Transactions ────→ Purchases, payments, expenses                  │       │
│  │   Context ────→ Current session, recent activity                   │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
services/memory-os/
├── src/
│   └── index.js              # Memory API (in-memory storage)
├── package.json
└── CLAUDE.md
```

---

## Memory Types

| Type | Description | Examples |
|------|-------------|----------|
| `general` | General information | Facts, conversations, interests |
| `preference` | User preferences | Theme, language, notification settings |
| `event` | Events & appointments | Meetings, reminders, deadlines |
| `transaction` | Financial transactions | Purchases, payments, expenses |
| `context` | Session context | Current task, recent queries |
| `fact` | Verified facts | User name, birthdate, location |

---

## API Endpoints

### Memory CRUD
```
POST /api/memories           # Store memory
GET  /api/memories           # List all memories
GET  /api/memories/:id       # Get memory by ID
PUT  /api/memories/:id       # Update memory
DELETE /api/memories/:id     # Delete memory
```

### Search
```
GET /api/memories/search?q=keyword    # Search memories
GET /api/memories/user/:userId        # Get user's memories
```

### By Type
```
GET /api/memories/type/:type    # Get by memory type
```

### Health
```
GET /health                     # Service health check
```

---

## Example Usage

### Store Memory
```bash
curl -X POST http://localhost:4703/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "content": "User prefers vegetarian food",
    "type": "preference"
  }'
```

### Get User Memories
```bash
curl http://localhost:4703/api/memories/user/user_123
```

### Search Memories
```bash
curl "http://localhost:4703/api/memories/search?q=vegetarian"
```

### Get by Type
```bash
curl http://localhost:4703/api/memories/type/preference
```

---

## Connected Services

| Service | Port | Uses MemoryOS |
|---------|------|---------------|
| Genie Gateway | 4701 | ✅ User context |
| Genie Briefing | 4712 | ✅ Tasks & insights |
| Genie Calendar | 4709 | ✅ Event storage |
| TwinOS Hub | 4705 | ✅ Context sync |
| RAZO Keyboard | 4725 | ✅ Conversation memory |

---

## Environment Variables

```env
PORT=4703
```

---

## Quick Start

```bash
cd services/memory-os
npm install
npm start

# Health check
curl http://localhost:4703/health
```

---

*Last Updated: June 18, 2026*
