# Genie Memory Graph Service

**Version:** 1.0.0
**Port:** 4717
**Status:** ✅ PHASE 1 COMPLETE - Unified Memory Layer

---

## Overview

Genie Memory Graph is the **unified memory layer** that connects MemoryOS + TwinOS into one coherent graph. This is the foundation layer that powers all Genie experiences, enabling the "one continuous intelligence" vision.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      GENIE MEMORY GRAPH (4717)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                         7 MEMORY GRAPHS                              │       │
│  │                                                                       │       │
│  │   Identity ────→ Who you are, personality, preferences               │       │
│  │   Knowledge ───→ Facts, concepts, expertise                          │       │
│  │   Relationship → People, connections, interactions                    │       │
│  │   Goal ────────→ Objectives, progress, milestones                    │       │
│  │   Timeline ────→ Events, memories, history                          │       │
│  │   Preference ──→ Likes, dislikes, patterns                          │       │
│  │   Context ─────→ Current situation, recent activities              │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
services/genie-memory-graph/
├── src/
│   ├── index.js              # Main entry point
│   ├── types/
│   │   └── graphTypes.js    # Type definitions
│   └── routes/
│       ├── identity.js       # Identity graph
│       ├── knowledge.js      # Knowledge graph
│       ├── relationship.js   # Relationship graph
│       ├── goal.js          # Goal graph
│       ├── timeline.js       # Timeline graph
│       ├── preference.js     # Preference graph
│       ├── graph.js         # Graph operations
│       └── search.js        # Unified search
├── package.json
└── CLAUDE.md
```

---

## The Memory Graph Layer

This is what makes Genie feel like **one continuous intelligence** rather than a collection of features.

```
                    GENIE
                      │
          ──────────────────────
          Memory Graph Layer
          ──────────────────────
                      │
    ┌─────────┬─────────┬─────────┬─────────┐
    │         │         │         │         │
 Identity  Knowledge  Relationship Goal    Timeline
 Graph     Graph     Graph      Graph    Graph
    │         │         │         │         │
    └─────────┴─────────┴─────────┴─────────┘
                      │
                      ▼
              Preference Graph
                      │
                      ▼
               Context Graph
```

---

## 7 Memory Graphs

### 1. Identity Graph
| Field | Description |
|-------|-------------|
| `name` | User's name |
| `personality` | Traits, communication style, values |
| `learnedFacts` | AI-learned facts about user |
| `activities` | User activity history |
| `communication` | Language, tone, formality preferences |

### 2. Knowledge Graph
| Feature | Description |
|---------|-------------|
| `triples` | (subject, predicate, object) triples |
| `inference` | AI-inferred connections |
| `domains` | Business, technology, personal, academic, industry |
| `confidence` | Trust level for each fact |

### 3. Relationship Graph
| Feature | Description |
|---------|-------------|
| `people` | Person records |
| `interactions` | Communication history |
| `strength` | Relationship strength (1-10) |
| `reminders` | When to reconnect |
| `categories` | Family, friend, professional |

### 4. Goal Graph
| Feature | Description |
|---------|-------------|
| `goals` | Objectives with deadlines |
| `milestones` | Sub-goals |
| `progress` | Completion percentage |
| `types` | Short-term, medium-term, long-term, life goals |
| `status` | Active, completed, abandoned, on hold |

### 5. Timeline Graph
| Feature | Description |
|---------|-------------|
| `events` | Life events |
| `replay` | "Show me everything in April 2026" |
| `categories` | Life, professional, personal, health, financial |
| `people` | Who was involved |
| `emotions` | How it felt |

### 6. Preference Graph
| Feature | Description |
|---------|-------------|
| `categories` | Lifestyle, work, social, learning, health |
| `strength` | How strong is this preference |
| `source` | Explicit or inferred |
| `context` | When this applies |

### 7. Context Graph
| Feature | Description |
|---------|-------------|
| `current` | Current situation |
| `recent` | Recent activities |
| `active` | Active goals, people, topics |

---

## API Endpoints

### Identity Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/identity` | Create user identity |
| GET | `/api/identity/:userId` | Get identity |
| PUT | `/api/identity/:userId` | Update identity |
| PUT | `/api/identity/:userId/personality` | Update personality |
| PUT | `/api/identity/:userId/communication` | Update communication |
| POST | `/api/identity/:userId/learn` | Learn new fact |
| GET | `/api/identity/:userId/facts` | Get learned facts |
| POST | `/api/identity/:userId/activity` | Record activity |
| GET | `/api/identity/:userId/activity` | Get activities |

### Knowledge Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/knowledge/triple` | Add knowledge triple |
| POST | `/knowledge/batch` | Add multiple triples |
| GET | `/knowledge/:userId` | Get all knowledge |
| GET | `/knowledge/:userId/search` | Search knowledge |
| GET | `/knowledge/:userId/graph` | Get as graph data |
| DELETE | `/knowledge/:userId/:tripleId` | Delete triple |
| GET | `/knowledge/:userId/infer` | Infer new knowledge |
| POST | `/knowledge/:userId/import` | Import from text |

### Relationship Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/relationship` | Add relationship |
| GET | `/relationship/:userId` | Get all relationships |
| GET | `/relationship/:userId/:personId` | Get relationship |
| PUT | `/relationship/:userId/:personId` | Update relationship |
| POST | `/relationship/:userId/:personId/interaction` | Record interaction |
| GET | `/relationship/:userId/summary` | Get summary |
| GET | `/relationship/:userId/suggestions` | Get reconnect suggestions |
| DELETE | `/relationship/:userId/:personId` | Remove relationship |

### Goal Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/goal` | Create goal |
| GET | `/goal/:userId` | Get all goals |
| GET | `/goal/:userId/:goalId` | Get goal |
| PUT | `/goal/:userId/:goalId` | Update goal |
| POST | `/goal/:userId/:goalId/progress` | Update progress |
| POST | `/goal/:userId/:goalId/milestone` | Add milestone |
| POST | `/goal/:userId/:goalId/complete` | Complete goal |
| GET | `/goal/:userId/stats` | Get statistics |
| DELETE | `/goal/:userId/:goalId` | Delete goal |

### Timeline Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/timeline/event` | Add event |
| GET | `/timeline/:userId` | Get timeline |
| GET | `/timeline/:userId/replay` | Life replay |
| GET | `/timeline/:userId/:eventId` | Get event |
| PUT | `/timeline/:userId/:eventId` | Update event |
| DELETE | `/timeline/:userId/:eventId` | Delete event |
| GET | `/timeline/:userId/years` | Get available years |
| GET | `/timeline/:userId/stats` | Get statistics |

### Preference Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/preference` | Add preference |
| GET | `/preference/:userId` | Get preferences |
| PUT | `/preference/:userId` | Update preferences |
| DELETE | `/preference/:userId/:category/:key` | Remove preference |
| POST | `/preference/:userId/learn` | Learn preference |
| GET | `/preference/:userId/summary` | Get summary |

### Graph Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/graph/:userId/full` | Get complete graph |
| POST | `/graph/:userId/connect` | Create connection |
| GET | `/graph/:userId/path` | Find path |
| GET | `/graph/:userId/neighbors` | Get neighbors |
| GET | `/graph/:userId/centrality` | Most connected entities |

### Search Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search/:userId` | Universal search |
| GET | `/search/:userId/suggest` | Get suggestions |
| GET | `/search/:userId/recall` | Recall memories |

---

## Example Usage

### Create Identity
```bash
curl -X POST http://localhost:4717/api/identity \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "name": "Karim",
    "occupation": "Founder",
    "location": "Mumbai"
  }'
```

### Add Knowledge Triple
```bash
curl -X POST http://localhost:4717/knowledge/triple \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "subject": "RTMN",
    "predicate": "is",
    "object": "Multi-industry operating system",
    "confidence": 0.95
  }'
```

### Add Relationship
```bash
curl -X POST http://localhost:4717/relationship \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "name": "Rahul",
    "type": "friend",
    "subtype": "best_friend",
    "importance": 9
  }'
```

### Create Goal
```bash
curl -X POST http://localhost:4717/goal \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "title": "Launch Genie AI",
    "description": "Complete Phase 1 of Genie",
    "type": "short_term",
    "deadline": "2026-06-30",
    "priority": 9
  }'
```

### Life Replay
```bash
curl "http://localhost:4717/timeline/karim/replay?startDate=2026-06-01&endDate=2026-06-30"
```

**Response:**
```json
{
  "success": true,
  "replay": [
    { "date": "2026-06-18", "title": "Built Genie Companion", "category": "achievement" },
    { "date": "2026-06-15", "title": "Met with investors", "category": "professional" }
  ],
  "period": { "startDate": "2026-06-01", "endDate": "2026-06-30" },
  "count": 2
}
```

---

## Quick Start

```bash
cd services/genie-memory-graph
npm install
npm start

# Health check
curl http://localhost:4717/health

# Get user graph overview
curl http://localhost:4717/api/user/karim/graph
```

---

## The 6 "Nobody Else Has" Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **🧭 Life GPS** | Goal Graph + Recommendation Engine | 🟡 Partial |
| **📖 Life Replay** | Timeline Graph + Replay API | ✅ Complete |
| **🎓 Life University** | Knowledge Graph + Learning OS | 🔜 Phase 3 |
| **🪞 Future Self** | Goal Graph + Progress Tracking | 🟡 Partial |
| **🌐 Real World Memory** | All 7 Graphs unified | ✅ Complete |
| **🤝 Relationship Intelligence** | Relationship Graph + Suggestions | 🟡 Partial |

---

## Statistics

| Metric | Value |
|--------|-------|
| Memory Graphs | 7 |
| API Endpoints | 60+ |
| Knowledge Types | 5 domains |
| Relationship Categories | 4 |
| Goal Types | 4 |
| Timeline Categories | 5 |

---

## Phase Status

| Phase | Services | Status |
|-------|----------|--------|
| **Phase 1** | Companion Service | ✅ COMPLETE |
| **Phase 1** | Memory Graph | ✅ COMPLETE |
| **Phase 1** | Relationship OS | 🔜 Next |
| **Phase 2** | Thinking Engine | Pending |
| **Phase 2** | Consultant Agent | Pending |
| **Phase 2** | Life GPS | Pending |
| **Phase 3** | Learning OS | Pending |
| **Phase 3** | Wellness OS | Pending |
| **Phase 3** | Money OS | Pending |
| **Phase 4** | Creation OS | Pending |
| **Phase 4** | Execution Engine | Pending |
| **Phase 4** | Life University | Pending |

---

*Last Updated: June 18, 2026*
*Genie AI - Your Memory Layer*
