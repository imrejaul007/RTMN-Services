# TwinOS Query Engine

**Version:** 1.0.0
**Port:** 4884
**Status:** ✅ RUNNING | **June 26, 2026**

---

## Overview

TwinOS Query Engine provides a natural language interface to the TwinOS graph. Users can ask questions like "who is connected to Alice" or "find the shortest path from Bob to Carol" and get structured or natural language responses.

**Part of TwinOS v3.2 upgrade (alongside twinos-hub 4705 and twinos-graph-engine 4883).**

---

## Architecture

```
User: "who is connected to Alice"
         │
         ▼
twinos-query-engine (4884)
    │   │
    │   ├── nl-parser.js       ──► Intent: find_connected
    │   ├── query-builder.js  ──► Graph operation
    │   └── response-formatter.js ──► NL response
         │
         ▼
twinos-graph-engine (4883)
    │   └── Temporal BFS from "Alice"
         │
         ▼
Response: "Alice is connected to 3 entities:
  • directly connected: Bob, Carol, Dave"
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@rtmn/twinos-shared` | Auth, middleware |
| Express | HTTP server |
| Node.js `fetch` | Calls to Graph Engine |

---

## API Endpoints

### Main Query

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/query` | Execute natural language query |

**Request:**
```json
{
  "query": "who is connected to Alice",
  "format": "full"
}
```

**`format` options:**
- `full` — metadata + result + formatted text (default)
- `text` — natural language response only
- `json` — raw result data only

**Response (full format):**
```json
{
  "query": "who is connected to Alice",
  "intent": "find_connected",
  "confidence": 0.8,
  "operation": {
    "type": "traverse",
    "description": "Find all entities connected to \"Alice\"",
    "endpoint": "http://localhost:4883/api/graph/traverse/Alice"
  },
  "result": {
    "nodes": [...],
    "edges": [...]
  },
  "formatted": "Alice is connected to 3 entities:\n  • directly connected: Bob, Carol, Dave"
}
```

### Query Utilities

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/query/batch` | Execute multiple queries |
| `GET` | `/api/query/parse?q=<query>` | Parse without executing |
| `GET` | `/api/query/explain?q=<query>` | Explain query semantics |
| `GET` | `/api/query/intents` | List all supported intents |
| `GET` | `/api/query/examples` | Get example queries |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/ready` | Readiness (Graph Engine connected) |
| `GET` | `/api/query/health` | Graph Engine connectivity |

---

## Supported Intents

| Intent | Examples |
|--------|---------|
| `find_connected` | "who is connected to Alice", "show connections for Acme" |
| `find_relationship_type` | "who manages Acme", "what does Alice own" |
| `shortest_path` | "find the path from Alice to Bob", "how many hops between A and B" |
| `top_influencers` | "who are the top influencers", "show top hubs" |
| `community` | "which nodes are in the same community as Alice" |
| `influence_score` | "how important is Alice", "what is Alice's influence" |
| `entity_info` | "tell me about Alice", "describe Acme" |
| `relationship_between` | "what is the relationship between Alice and Bob" |
| `entity_search` | Any unrecognized text → treated as entity search |

---

## Batch Queries

```bash
curl -X POST http://localhost:4884/api/query/batch \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      "who are the top influencers",
      "find the shortest path from Alice to Bob"
    ],
    "format": "text"
  }'
```

**Response:**
```json
{
  "results": [
    {
      "query": "who are the top influencers",
      "intent": "top_influencers",
      "text": "Top 3 influential nodes:\n  1. Alice — influence: 0.950\n  2. Bob — influence: 0.820"
    },
    {
      "query": "find the shortest path from Alice to Bob",
      "intent": "shortest_path",
      "text": "Found path from Alice to Bob:\n  Alice → Carol → Bob\n  (2 hops, distance: 1.82)"
    }
  ],
  "count": 2
}
```

---

## Query Explain

```bash
curl "http://localhost:4884/api/query/explain?q=who%20is%20connected%20to%20Alice"
```

**Response:**
```json
{
  "query": "who is connected to Alice",
  "explanation": "Find all entities connected to \"Alice\" up to 2 hops away.",
  "intent": "find_connected",
  "confidence": 0.8,
  "parsed": { "entity": "Alice" },
  "operation": {
    "type": "traverse",
    "description": "Find all entities connected to \"Alice\"",
    "endpoint": "http://localhost:4884/api/graph/traverse/Alice"
  }
}
```

---

## Response Formatter Examples

### Connections
```
"Alice" is connected to 3 entities:
  • directly connected: Bob, Carol, Dave
  • 2-hop: Eve, Frank
```

### Shortest Path
```
Found path from Alice to Carol:
  Alice → Bob → Carol
  (2 hops, distance: 1.82)

Connections in path:
  • Alice → Bob
  • Bob → Carol
```

### Top Influencers
```
Top 5 influential nodes:

  1. Alice — influence: 0.950 [top-3]
  2. Bob — influence: 0.820 [top-3]
  3. Carol — influence: 0.650 [top-10]
```

### Communities
```
Found 2 communities:

  Community 0 (3 members):
    A, B, C
  Community 1 (2 members):
    D, E
```

### Influence Score
```
Influence analysis for "Alice":
  • Rank: 1
  • Score: 0.950
  • PageRank: 0.3200
  • Betweenness: 0.6700
  • Tier: top-10
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4884 | Service port |
| `GRAPH_ENGINE_URL` | http://localhost:4883 | Graph Engine URL |
| `JWT_SECRET` | dev fallback | JWT verification |
| `NODE_ENV` | development | Environment |

---

## Startup

```bash
cd platform/twins/twinos-query-engine
npm install
npm start  # Port 4884
```

---

## Testing

```bash
npm test  # 38 tests
```

---

## Related Services

| Service | Port | Purpose |
|--------|------|---------|
| twinos-hub | 4705 | Twin registry, relationship CRUD |
| twinos-graph-engine | 4883 | Graph algorithms |
| twinos-query-engine | 4884 | Natural language interface |
