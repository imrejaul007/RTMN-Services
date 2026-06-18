# Genie Gateway - Personal AI Orchestrator

**Version:** 1.0.0  
**Port:** 4701  
**Status:** ✅ BUILT | **June 18, 2026**

---

## Overview

Genie Gateway is the **central orchestrator** for Genie Personal AI - the unified entry point that routes requests to Memory, Twins, Calendar, Briefing, and other AI services.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CONSUMER TRIANGLE                                       │
│                                                                                 │
│    GENIE (Think)  ←─────→  RAZO (Communicate)  ←─────→  DO APP (Act)           │
│       4701                   4725                          3001                 │
│         ↑                        ↑                           ↑                  │
│         └────────────────────────┼───────────────────────────┘                  │
│                                  │                                               │
│                          ┌──────▼──────┐                                        │
│                          │  TwinOS Hub │                                        │
│                          │   4705     │                                        │
│                          └─────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
services/genie-gateway/
├── src/
│   └── index.js              # Main orchestrator (Express server)
├── package.json
├── CLAUDE.md
└── FEATURES.md
```

---

## Connected Services

| Service | Port | Default URL | Purpose |
|---------|------|-------------|---------|
| MemoryOS | 4703 | localhost:4703 | Personal memory storage |
| TwinOS Hub | 4705 | localhost:4705 | Digital twins |
| Genie Calendar | 4709 | localhost:4709 | Calendar & scheduling |
| Genie Briefing | 4706 | localhost:4706 | Daily briefings |
| Personal Twin | 4708 | localhost:4708 | User profile twin |
| Financial Twin | 4715 | localhost:4715 | Finance tracking |
| Health Twin | 4717 | localhost:4717 | Health monitoring |
| Founder Twin | 4716 | localhost:4716 | Business venture twin |
| CorpID | 4702 | localhost:4702 | Identity |

---

## API Endpoints

### Core
```
GET  /health                    # Health check
GET  /ready                     # Service readiness
GET  /api/services              # List connected services
```

### User Context
```
GET  /api/user/:userId/context       # Get full context from all services
GET  /api/user/:userId/preferences   # Get user preferences
PUT  /api/user/:userId/preferences   # Update preferences
```

### AI Query
```
POST /api/query                       # Main AI query endpoint
   Body: { query, userId?, sessionId?, context? }
```

### Twins
```
GET  /api/twins/:userId               # Get all twins data
```

### Briefing
```
GET  /api/briefing/:userId           # Get daily briefing
   Query: ?type=morning|evening
```

### Memory
```
POST /api/memory                      # Store memory
   Body: { userId, content, type? }
GET  /api/memory/:userId              # Get memories
   Query: ?type=&limit=50
```

### Search
```
GET  /api/search                      # Search across services
   Query: ?q=query&userId=&type=all|memory|calendar
```

### Broadcast
```
POST /api/broadcast                    # Broadcast to all twins
   Body: { userId, event, data }
```

---

## Example Usage

### Query Genie
```bash
curl -X POST http://localhost:4701/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is my schedule for today?",
    "userId": "user_123"
  }'
```

**Response:**
```json
{
  "success": true,
  "query": "What is my schedule for today?",
  "response": {
    "type": "calendar",
    "message": "You have 2 meetings scheduled today.",
    "data": {
      "meetings": ["Standup at 10 AM", "Product review at 3 PM"]
    }
  },
  "requestId": "uuid",
  "timestamp": "2026-06-18T12:00:00Z"
}
```

### Get User Context
```bash
curl http://localhost:4701/api/user/user_123/context
```

### Get Daily Briefing
```bash
curl http://localhost:4701/api/briefing/user_123?type=morning
```

---

## Environment Variables

```env
MEMORY_URL=http://localhost:4703
TWINS_URL=http://localhost:4705
CALENDAR_URL=http://localhost:4709
BRIEFING_URL=http://localhost:4706
PERSONAL_TWIN_URL=http://localhost:4708
FINANCIAL_TWIN_URL=http://localhost:4715
HEALTH_TWIN_URL=http://localhost:4717
FOUNDER_TWIN_URL=http://localhost:4716
RELATIONSHIP_TWIN_URL=http://localhost:4705
CORPID_URL=http://localhost:4702
```

---

## Quick Start

```bash
cd services/genie-gateway
npm install
npm start

# Health check
curl http://localhost:4701/health
```

---

## AI Response Types

| Query Keywords | Response Type | Description |
|----------------|---------------|-------------|
| weather | weather | Weather information |
| task, todo, to do | tasks | Task list |
| meeting, schedule, calendar | calendar | Calendar events |
| remind, reminder | reminder | Reminder setup |

---

*Last Updated: June 18, 2026*
