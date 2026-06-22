# Genie Universal Search Service

**Version:** 1.0.0  
**Port:** 4713  
**Status:** ✅ BUILT - Search Everything

---

## Overview

Genie Universal Search searches across **everything** in the Genie ecosystem:
- Memories (Memory Inbox)
- Twins (Personal, Health, Financial, Relationship)
- Calendar events
- Tasks and projects
- People and contacts
- Knowledge base

```
┌─────────────────────────────────────────────────────────────┐
│                   UNIVERSAL SEARCH                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Query                                                  │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Universal Search API                     │   │
│  │                  /api/search                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│       ┌──────────────────┼──────────────────┐            │
│       ▼                  ▼                  ▼              │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐         │
│  │ Memories │        │  Twins  │        │Calendar │         │
│  │  Inbox  │        │ (All)   │        │ Events  │         │
│  └─────────┘        └─────────┘        └─────────┘         │
│       │                  │                  │              │
│       ▼                  ▼                  ▼              │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐         │
│  │People   │        │Tasks    │        │Knowledge│         │
│  └─────────┘        └─────────┘        └─────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Main Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search` | Universal search across all sources |
| GET | `/api/search/semantic` | AI semantic search |
| GET | `/api/search/suggestions` | Get search suggestions |
| GET | `/api/search/trending` | Get trending searches |

### Source-Specific Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search/memories` | Search memories only |
| GET | `/api/search/twins` | Search all twins |
| GET | `/api/search/people` | Search people/contacts |
| GET | `/api/search/health` | Search health data |
| GET | `/api/search/finance` | Search financial data |
| GET | `/api/search/calendar` | Search calendar events |
| GET | `/api/search/tasks` | Search tasks |

### Saved & Recent

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search/saved` | Save a search |
| GET | `/api/search/saved` | Get saved searches |
| DELETE | `/api/search/saved/:id` | Delete saved search |
| GET | `/api/search/recent` | Get recent searches |
| DELETE | `/api/search/recent` | Clear recent searches |

### Index Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/index/rebuild` | Rebuild search index |
| POST | `/api/index/add` | Add item to index |

---

## Example Usage

### Universal Search
```bash
curl "http://localhost:4713/api/search?q=meeting&limit=10"
```

**Response:**
```json
{
  "success": true,
  "query": "meeting",
  "total": 5,
  "results": [
    {
      "id": "mem-1",
      "title": "Meeting notes with Rahul",
      "content": "Discussed partnership opportunity",
      "source": "memory",
      "score": 100
    },
    {
      "id": "p-1",
      "name": "Rahul",
      "relationship": "business_partner",
      "source": "person",
      "score": 85
    }
  ],
  "suggestions": ["meeting notes", "past meetings"]
}
```

### Search People
```bash
curl "http://localhost:4713/api/search/people?q=rahul"
```

**Response:**
```json
{
  "success": true,
  "query": "rahul",
  "source": "people",
  "results": [
    {
      "id": "p-1",
      "name": "Rahul",
      "relationship": "business_partner",
      "lastContact": "2026-06-15",
      "score": 100
    }
  ]
}
```

### Search Health
```bash
curl "http://localhost:4713/api/search/health?q=doctor"
```

### Search Finance
```bash
curl "http://localhost:4713/api/search/finance?q=expense"
```

### Semantic Search
```bash
curl "http://localhost:4713/api/search/semantic?q=medical+appointment"
```

**Response:**
```json
{
  "success": true,
  "query": "medical appointment",
  "type": "semantic",
  "results": [
    {
      "id": "apt-1",
      "doctor": "Dr. Sharma",
      "date": "2026-06-19",
      "type": "appointment",
      "source": "twin",
      "twinType": "health",
      "score": 95
    }
  ],
  "expandedQuery": ["medical", "appointment", "doctor", "clinic", "checkup"]
}
```

### Save Search
```bash
curl -X POST http://localhost:4713/api/search/saved \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "name": "My weekly meetings",
    "query": "meeting week"
  }'
```

---

## Search Sources

| Source | Description | Data From |
|--------|-------------|-----------|
| memories | User memories | Memory Inbox (4710) |
| twins | All digital twins | TwinOS (4705) |
| people | Contacts/relationships | Relationship Twin |
| health | Health data | Health Twin (4717) |
| finance | Financial data | Financial Twin (4715) |
| calendar | Events | Calendar (4709) |
| tasks | Tasks/projects | Project Twin |
| knowledge | Articles/docs | Knowledge Base |

---

## Search Features

### Relevance Scoring
- Exact match: 100 points
- Title match: +50 points
- Content match: 50 points
- Tag match: 40 points
- Recency boost: 5-30 points

### Semantic Search
- Related term expansion
- Synonym matching
- Concept clustering
- Query interpretation

### Filters
- `type`: Filter by memory type
- `category`: Filter by category
- `tag`: Filter by tag
- `sources`: Comma-separated source list
- `limit`: Number of results
- `offset`: Pagination offset

---

## Memorae Feature Mapped

| Memorae Feature | Genie Universal Search |
|----------------|----------------------|
| Universal Search | ✅ `/api/search` |
| Search People | ✅ `/api/search/people` |
| Search Everything | ✅ All sources |
| Semantic Search | ✅ `/api/search/semantic` |
| Search Suggestions | ✅ `/api/search/suggestions` |
| Recent Searches | ✅ `/api/search/recent` |
| Saved Searches | ✅ `/api/search/saved` |

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/genie-universal-search
npm install
npm start

# Test
curl http://localhost:4713/health
curl "http://localhost:4713/api/search?q=test"
```

---

## Service Integrations

| Service | Port | Purpose |
|---------|------|---------|
| Memory Inbox | 4710 | Memory data |
| TwinOS Hub | 4705 | Twin data |
| Health Twin | 4717 | Health search |
| Financial Twin | 4715 | Finance search |
| Calendar | 4709 | Calendar events |
| Knowledge Base | 4940 | Knowledge search |

---

*Last Updated: June 18, 2026*
