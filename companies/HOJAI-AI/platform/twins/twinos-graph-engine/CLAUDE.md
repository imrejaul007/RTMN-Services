# TwinOS Graph Engine

**Version:** 1.0.0
**Port:** 4883
**Status:** ✅ RUNNING | **June 26, 2026**

---

## Overview

TwinOS Graph Engine is a dedicated graph analytics service that provides advanced algorithms for the TwinOS relationship graph. It maintains an in-memory materialized view of all twin relationships and exposes algorithms via HTTP API.

**Part of TwinOS v3.2 upgrade (alongside twinos-hub 4705 and twinos-query-engine 4884).**

---

## Architecture

```
twinos-hub (4705) ──────► twinos-graph-engine (4883) ──► twinos-query-engine (4884)
(twin registry)           (graph algorithms)            (NL interface)

Data flow:
1. twinos-hub maintains the canonical twin registry
2. Graph Engine polls twinos-hub every 60s for relationship updates
3. Graph Engine caches adjacency list and runs algorithms on it
4. Query Engine translates NL → graph operations → calls Graph Engine
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@rtmn/twinos-shared` | Auth, middleware, logging |
| `@rtmn/shared` | Env validation, shutdown |
| Express | HTTP server |
| PersistentMap | Graph cache persistence |

---

## API Endpoints

### Health & Cache

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/ready` | Readiness (graph cache loaded) |
| `POST` | `/api/graph/refresh` | Force cache refresh from hub |
| `GET` | `/api/graph/cache/status` | Cache metadata |

### Graph Traversal

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/graph/traverse/:twinId` | Temporal BFS from twin |
| `GET` | `/api/graph/path` | Shortest path between twins |
| `GET` | `/api/graph/connected/:twinId` | N-degree connections |
| `GET` | `/api/graph/recommend` | Friends-of-friends recommendations |

### Graph Algorithms

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/graph/communities` | Louvain community detection |
| `GET` | `/api/graph/centrality` | PageRank + betweenness centrality |
| `GET` | `/api/graph/stats` | Graph statistics |
| `POST` | `/api/graph/compute` | Run all algorithms (cached) |

---

## Query Parameters

### `/api/graph/traverse/:twinId`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `maxDepth` | int | 2 | Maximum traversal depth |
| `queryAt` | ISO date | null | Point-in-time filter |
| `queryFrom` | ISO date | null | Range start |
| `queryTo` | ISO date | null | Range end |
| `typeFilter` | string | null | Comma-separated types |
| `minStrength` | float | null | Min relationship strength |
| `minTrust` | int | null | Min trust score |
| `includeExpired` | bool | false | Include expired edges |

### `/api/graph/path`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Source twin ID |
| `to` | string | Yes | Target twin ID |

### `/api/graph/centrality`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `algorithm` | string | influence | pagerank, betweenness, or influence |
| `limit` | int | 20 | Max results |

### `/api/graph/communities`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 20 | Max communities to return |

---

## Graph Algorithms

### PageRank
Power iteration on undirected adjacency list. Damping factor 0.85, tolerance 1e-6.

### Betweenness Centrality
Brandes' algorithm O(|V|·|E|) on unweighted graphs. Normalized for undirected graphs.

### Community Detection
Louvain-inspired greedy modularity optimization. Two phases: node movement → community renumbering.

### Dijkstra's Algorithm
Weighted shortest path using `1 / (strength × trust_normalized + 0.01)` as edge weight. Lower weight = shorter path.

### Temporal BFS
BFS with temporal filtering — only traverses edges where `since <= queryAt <= until`.

### Influence Scoring
Combines PageRank (50%) + betweenness (50%) into a single influence score, normalized 0-1.

---

## Response Formats

### `/api/graph/traverse/:twinId`
```json
{
  "success": true,
  "root": "twin-123",
  "nodes": [
    { "id": "twin-123", "depth": 0, "type": "root" },
    { "id": "twin-456", "depth": 1, "type": "traversed" }
  ],
  "edges": [
    { "id": "rel-1", "type": "knows", "depth": 1, "is_expired": false }
  ],
  "stats": { "total_nodes": 2, "total_edges": 1 }
}
```

### `/api/graph/path`
```json
{
  "success": true,
  "from": "twin-A",
  "to": "twin-D",
  "path": ["twin-A", "twin-B", "twin-D"],
  "hops": 2,
  "distance": 2.54
}
```

### `/api/graph/centrality`
```json
{
  "success": true,
  "algorithm": "influence",
  "nodes": [
    { "node": "twin-A", "rank": 1, "influence": 0.95, "tier": "top-3" },
    { "node": "twin-B", "rank": 2, "influence": 0.82, "tier": "top-3" }
  ]
}
```

### `/api/graph/communities`
```json
{
  "success": true,
  "total_communities": 3,
  "communities": [
    { "id": 0, "size": 12, "members": ["A", "B", "C"], "percentage": 40 }
  ]
}
```

### `/api/graph/stats`
```json
{
  "success": true,
  "nodes": 30,
  "edges": 85,
  "density": 0.195,
  "is_connected": false,
  "connected_components": 2,
  "largest_component_size": 25,
  "avg_degree": 5.67,
  "max_degree": 15
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4883 | Service port |
| `TWINOS_HUB_URL` | http://localhost:4705 | Hub URL for cache refresh |
| `REFRESH_INTERVAL_MS` | 60000 | Cache refresh interval (60s) |
| `GRAPH_CACHE_MAX_AGE_MS` | 300000 | Max cache age before force refresh |
| `JWT_SECRET` | dev fallback | JWT verification secret |
| `CORS_ORIGINS` | * | CORS allowed origins |

---

## Startup

```bash
cd platform/twins/twinos-graph-engine
npm install
npm start  # Port 4883
```

Or via `start-twins.sh` (includes graph-engine automatically):

```bash
bash /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/start-twins.sh
```

---

## Testing

```bash
npm test  # 34 tests
```

---

## Related Services

| Service | Port | Purpose |
|---------|------|---------|
| twinos-hub | 4705 | Twin registry, relationship CRUD |
| twinos-graph-engine | 4883 | Graph algorithms |
| twinos-query-engine | 4717 | Natural language interface |
