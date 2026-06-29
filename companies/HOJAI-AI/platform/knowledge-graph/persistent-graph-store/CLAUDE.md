# KnowledgeOS Persistent Graph Store (port 4750)

> **Status:** Production-ready v1.0.0
> **Role:** Persistent graph store with PostgreSQL/pgvector backend
> **Owner:** HOJAI AI Knowledge Platform team
> **Port:** 4750

## Mission

Provides a production-grade persistent graph store for the RTMN knowledge graph. Unlike the in-memory graph database (4783), this service persists data to PostgreSQL and supports vector similarity search via pgvector. Powers KnowledgeOS with entity relationships, traversal, and semantic search.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   KnowledgeOS Graph Store (4750)             │
├─────────────────────────────────────────────────────────────┤
│  Express REST API (JWT Auth)                                │
│  ├── Node CRUD: POST/GET/PUT/DELETE /nodes                  │
│  ├── Edge CRUD: POST/GET/PUT/DELETE /edges                   │
│  ├── Traversal: BFS, DFS, Shortest Path                     │
│  └── Search: Text + Vector (pgvector)                       │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL + pgvector                                       │
│  ├── nodes: id, type, name, properties (JSONB), embedding    │
│  ├── edges: id, source_id, target_id, type, properties (JSONB) │
│  └── Indexes: B-tree, GIN, IVFFlat                          │
└─────────────────────────────────────────────────────────────┘
```

## Node Types (9)

| Type | Use Case |
|------|----------|
| PERSON | People, contacts, employees |
| ORGANIZATION | Companies, departments, teams |
| LOCATION | Geographic locations, addresses |
| PRODUCT | Products, SKUs, inventory items |
| SERVICE | Services, subscriptions |
| CONCEPT | Abstract ideas, categories |
| DOCUMENT | Files, reports, articles |
| EVENT | Events, appointments, meetings |
| PLACE | Points of interest, venues |

## Edge Types (6)

| Type | Description | Direction |
|------|-------------|-----------|
| WORKS_FOR | Employment relationship | PERSON -> ORGANIZATION |
| LOCATED_IN | Location association | * -> LOCATION |
| PRODUCE | Production relationship | ORGANIZATION -> PRODUCT |
| SELL | Sales relationship | ORGANIZATION -> PRODUCT |
| KNOWS | Social connection | PERSON -> PERSON |
| REPORTED_BY | Attribution | DOCUMENT -> PERSON |

## Key Features

- **Persistent Storage**: PostgreSQL with full ACID compliance
- **Vector Search**: pgvector embeddings for semantic similarity
- **JSONB Properties**: Flexible schema for node/edge attributes
- **Graph Traversal**: BFS, DFS, shortest path algorithms
- **Proper Indexing**: B-tree, GIN, IVFFlat for performance
- **JWT Authentication**: Secure API access

## API Summary

| Category | Endpoints |
|----------|-----------|
| Health | GET /health, GET /ready |
| Nodes | POST/GET/PUT/DELETE /nodes, /nodes/:id |
| Edges | POST/GET/PUT/DELETE /edges, /edges/:id |
| Traversal | POST /graph/traverse/:id, /graph/dfs/:id |
| Path | POST /graph/path/:startId/:endId |
| Search | POST /graph/search |
| Neighbors | GET /graph/neighbors/:nodeId |
| Stats | GET/POST /stats, GET /types/nodes, /types/edges |

## Database Schema

### nodes

```sql
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(500) NOT NULL,
  properties JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  source VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### edges

```sql
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  properties JSONB DEFAULT '{}',
  weight DECIMAL(5,2) DEFAULT 1.0,
  source VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Indexes

- `idx_nodes_type` - B-tree on type
- `idx_nodes_embedding` - IVFFlat for vector similarity
- `idx_nodes_properties` - GIN for JSONB
- `idx_edges_source/target/type` - B-tree
- `idx_edges_properties` - GIN for JSONB

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4750 | Service port |
| PGHOST | localhost | PostgreSQL host |
| PGPORT | 5432 | PostgreSQL port |
| PGDATABASE | knowledge_graph | Database name |
| PGUSER | postgres | Database user |
| PGPASSWORD | postgres | Database password |

## Related Services

- `graph-database` (4783) - In-memory graph (no persistence)
- `vector-db` (4780) - Vector storage service
- `knowledge-graph-os` (4501) - Graph OS service
- `memory-os` (4703) - Memory layer integration

## Next Steps

- Add GraphQL interface for complex queries
- Implement subgraph matching (pattern queries)
- Add graph analytics (PageRank, centrality)
- Support for time-windowed queries
- Federation with other graph stores
