# Graph Database Service

**Port:** 4783
**Status:** ✅ Production Ready (v1.0.0)
**Layer:** HOJAI AI → Division 6 (Data & Knowledge Cloud)
**Path:** `/Users/rejaulkarim/Documents/RTMN/services/graph-database`

## What It Does

In-memory property graph database (Neo4j / Memgraph alternative). Provides nodes, edges, labels, and a rich set of graph algorithms in a single CommonJS process.

**Use it for:**
- Knowledge graphs (entities + relationships)
- Social networks (people, follows, likes)
- Recommendation graphs (user → item → category)
- Fraud rings (account → transaction → device)
- Organizational hierarchies (employee → manager → department)
- Citation networks (paper → cites → paper)
- Customer journey graphs (touchpoint → channel → outcome)

**Replaces:** Neo4j / Memgraph / Amazon Neptune for development, testing, and small-to-medium production workloads.

## Capabilities

### CRUD
- **Nodes** — POST /api/nodes, GET /api/nodes/:id, PATCH /api/nodes/:id, DELETE /api/nodes/:id, GET /api/nodes (filter by label)
- **Edges** — POST /api/edges, GET /api/edges/:id, PATCH /api/edges/:id, DELETE /api/edges/:id, GET /api/edges (filter by type/from/to)
- **Batch** — POST /api/nodes/batch (max 1000), POST /api/edges/batch (max 5000)

### Analytics
- **Cypher-lite pattern matching** — `POST /api/match` with `(a:Label {prop: val})-[r:TYPE]->(b:Label)`
- **BFS traversal** — `POST /api/traverse` with configurable depth (1-10), direction (out/in/both), edge-type filters, label filters
- **Shortest path** — `POST /api/shortest-path` unweighted BFS, returns node path + edge path
- **Connected components** — `POST /api/components` undirected union-find
- **PageRank** — `POST /api/pagerank` damped power iteration, configurable damping/iterations/label-filter/topK

### Utility
- `GET /api/labels` — all labels + counts
- `GET /api/edge-types` — all edge types + counts
- `GET /api/degree/:id` — node in/out/total degree
- `POST /api/clear` — wipe graph (testing)
- `GET /api/stats`, `POST /api/stats/reset`
- `GET /api/audit` — recent operations log

## Cypher-lite Pattern Syntax

```
(a:Person {name: 'Alice'})-[r:KNOWS]->(b:Person)
(a:Person)<-[r:WORKS_AT]-(c:Company)         <- incoming edge
(a)-[r:KNOWS]->(b)                            <- unlabeled node
(a:Person|Pet)-[r]->(b)                       <- multi-label OR
```

**Supported operators:** `:Label`, `{prop: 'value'}`, `->` (outgoing), `<-` (incoming), `-` (any direction). Multiple labels OR semantics via `|`.

## Storage Model

```js
// In-memory: Maps for O(1) lookups
nodes: id -> { id, labels: Set, properties: object, createdAt }
edges: id -> { id, type, from, to, properties, createdAt }
nodeEdges: id -> { outgoing: Set<edgeId>, incoming: Set<edgeId> }
edgeIndex: type -> Set<edgeId>
labelIndex: label -> Set<nodeId>
```

**Capacity:** Suitable for ~100k nodes + ~500k edges. Beyond that, swap for Neo4j or Memgraph.

## Quick Start

```bash
cd services/graph-database
npm install
npm start              # listens on :4783
```

```bash
# Create a node
curl -X POST http://localhost:4783/api/nodes -H "Content-Type: application/json" \
  -d '{"labels":["Person"],"properties":{"name":"Alice","age":30}}'

# Create an edge
curl -X POST http://localhost:4783/api/edges -H "Content-Type: application/json" \
  -d '{"type":"KNOWS","from":"<aliceId>","to":"<bobId>","properties":{"since":2020}}'

# Pattern match
curl -X POST http://localhost:4783/api/match -H "Content-Type: application/json" \
  -d '{"pattern":"(a:Person {city: \"NYC\"})-[r:KNOWS]->(b:Person)"}'

# BFS traversal
curl -X POST http://localhost:4783/api/traverse -H "Content-Type: application/json" \
  -d '{"startId":"<aliceId>","maxDepth":3,"direction":"both"}'

# Shortest path
curl -X POST http://localhost:4783/api/shortest-path -H "Content-Type: application/json" \
  -d '{"from":"<aliceId>","to":"<frankId>","direction":"both"}'

# PageRank
curl -X POST http://localhost:4783/api/pagerank -H "Content-Type: application/json" \
  -d '{"labelFilter":"Person","topK":10}'

# Connected components
curl -X POST http://localhost:4783/api/components -H "Content-Type: application/json" -d '{}'
```

## Seed Data

On startup, loads a small social/company graph: 6 people (Alice/Bob/Carol/Dave/Eve/Frank) + 1 company (Acme Corp) + 7 KNOWS edges + 3 WORKS_AT edges. Useful for demos and smoke tests.

## Integration with HOJAI Intelligence (4881)

Wired into ai-intelligence `/api/route` and `/api/agents`:

```
GET /api/route -> services.graph = http://localhost:4783
GET /api/agents -> 'graph' agent (capabilities: graph-query, traverse, shortest-path, components, pagerank, node-crud, edge-crud)

capabilities:
  graphQuery:        POST /api/match
  graphTraverse:     POST /api/traverse
  graphShortestPath: POST /api/shortest-path
  graphComponents:   POST /api/components
  graphPageRank:     POST /api/pagerank
  graphNodeCreate:   POST /api/nodes
  graphEdgeCreate:   POST /api/edges
```

## Architecture Notes

- **Single process** — no clustering. For HA, run multiple replicas behind a load balancer with read-only endpoints or shard by label.
- **No persistence** — restart wipes the graph. Add `node-persist` or PostgreSQL backend for durability.
- **Linear traversals** — BFS scans edges linearly. For >1M edges, index by (from, type) or use Neo4j.
- **Cypher-lite** — no OPTIONAL MATCH, no WITH, no aggregation, no subqueries. Pattern + traversals only.
- **CommonJS** — no TypeScript, no build step. Same shape as `ai-safety`, `semantic-cache`, etc.

## TODO (Production)

- [ ] Swap in-memory `Map` for Neo4j / Memgraph / Amazon Neptune
- [ ] Add per-tenant namespace on every node ID
- [ ] Persist to disk with write-ahead log
- [ ] Add aggregation queries (count by label, sum properties)
- [ ] Add subgraph export (Cypher dump format, GraphML)
- [ ] Add OPTIONAL MATCH, WITH clauses
- [ ] Add weighted shortest path (Dijkstra)

## Files

- `package.json` — 4 deps: express, helmet, cors, uuid
- `src/index.js` — 825 lines (CommonJS)
- `CLAUDE.md` — this file
