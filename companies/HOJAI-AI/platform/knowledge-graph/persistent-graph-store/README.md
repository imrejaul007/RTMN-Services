# KnowledgeOS Persistent Graph Store

> **Status:** Production-ready v1.0.0
> **Port:** 4750
> **Owner:** HOJAI AI Knowledge Platform team

## Overview

KnowledgeOS Persistent Graph Store is a PostgreSQL/pgvector-backed property graph database that provides:

- **Nodes** with 9 types (PERSON, ORGANIZATION, LOCATION, PRODUCT, SERVICE, CONCEPT, DOCUMENT, EVENT, PLACE)
- **Edges** with 6 types (WORKS_FOR, LOCATED_IN, PRODUCE, SELL, KNOWS, REPORTED_BY)
- **JSONB properties** for flexible data storage
- **Vector embeddings** for semantic similarity search via pgvector
- **Timestamps and source tracking** for audit trails
- **Graph traversal** algorithms (BFS, DFS, shortest path)
- **JWT authentication** for API security

## Quick Start

```bash
# Install dependencies
npm install

# Set up PostgreSQL with pgvector
# Ensure pgvector extension is enabled in your PostgreSQL instance

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL connection details

# Start the service
npm start

# Or with custom port
PORT=4750 npm start
```

## API Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health status |
| GET | `/ready` | Readiness probe |

### Nodes (CRUD)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/nodes` | Create a new node |
| GET | `/nodes` | List all nodes (with filters) |
| GET | `/nodes/:id` | Get node by ID |
| PUT | `/nodes/:id` | Update a node |
| DELETE | `/nodes/:id` | Delete a node |

### Edges (CRUD)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/edges` | Create a new edge |
| GET | `/edges` | List all edges (with filters) |
| GET | `/edges/:id` | Get edge by ID |
| PUT | `/edges/:id` | Update an edge |
| DELETE | `/edges/:id` | Delete an edge |

### Graph Operations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/graph/traverse/:startId` | BFS traversal from a node |
| POST | `/graph/dfs/:startId` | DFS traversal from a node |
| POST | `/graph/path/:startId/:endId` | Find shortest path |
| POST | `/graph/search` | Search nodes (text or vector) |
| GET | `/graph/neighbors/:nodeId` | Get node neighbors |

### Statistics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Service statistics |
| POST | `/stats/reset` | Reset statistics |
| GET | `/types/nodes` | Available node types |
| GET | `/types/edges` | Available edge types |

## Node Types

| Type | Description | Example |
|------|-------------|---------|
| PERSON | Individual person | John Doe |
| ORGANIZATION | Company or organization | Acme Corp |
| LOCATION | Physical location | New York |
| PRODUCT | Product or item | Widget Pro |
| SERVICE | Service offering | Cloud Hosting |
| CONCEPT | Abstract concept | Machine Learning |
| DOCUMENT | Document or file | Annual Report |
| EVENT | Event or happening | Conference 2024 |
| PLACE | Place of interest | Grand Canyon |

## Edge Types

| Type | Description | Direction |
|------|-------------|-----------|
| WORKS_FOR | Person works for organization | PERSON -> ORGANIZATION |
| LOCATED_IN | Entity is located in location | * -> LOCATION |
| PRODUCE | Organization produces product | ORGANIZATION -> PRODUCT |
| SELL | Organization sells product | ORGANIZATION -> PRODUCT |
| KNOWS | Person knows person | PERSON -> PERSON |
| REPORTED_BY | Document reported by person | DOCUMENT -> PERSON |

## Usage Examples

### Create a Node

```bash
curl -X POST http://localhost:4750/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "type": "PERSON",
    "name": "John Doe",
    "properties": {
      "age": 30,
      "occupation": "Software Engineer"
    },
    "source": "hr-system"
  }'
```

### Create an Edge

```bash
curl -X POST http://localhost:4750/edges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "sourceId": "person-uuid",
    "targetId": "company-uuid",
    "type": "WORKS_FOR",
    "properties": {
      "role": "Senior Engineer",
      "since": "2022-01-15"
    }
  }'
```

### BFS Traversal

```bash
curl -X POST http://localhost:4750/graph/traverse/person-uuid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "maxDepth": 3,
    "direction": "out",
    "edgeTypes": ["KNOWS", "WORKS_FOR"],
    "nodeTypes": ["PERSON", "ORGANIZATION"]
  }'
```

### Find Shortest Path

```bash
curl -X POST http://localhost:4750/graph/path/person1-uuid/person2-uuid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "edgeTypes": ["KNOWS"]
  }'
```

### Vector Search

```bash
curl -X POST http://localhost:4750/graph/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "query": "machine learning algorithms",
    "topK": 10,
    "nodeTypes": ["CONCEPT", "PRODUCT"],
    "minScore": 0.7
  }'
```

## Database Schema

### Nodes Table

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

### Edges Table

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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4750 | Service port |
| PGHOST | localhost | PostgreSQL host |
| PGPORT | 5432 | PostgreSQL port |
| PGDATABASE | knowledge_graph | Database name |
| PGUSER | postgres | Database user |
| PGPASSWORD | postgres | Database password |

## Testing

```bash
# Run tests
npm test

# Run tests with watch mode
npm run test:watch
```

## License

MIT
