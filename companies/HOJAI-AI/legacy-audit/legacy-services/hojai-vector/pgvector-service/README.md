# HOJAI pgvector Service

**Tagline:** Vector Storage & Similarity Search
**Port:** 4721
**Version:** 1.0.0

Vector storage and similarity search service using PostgreSQL pgvector extension. Currently uses mock in-memory storage for development; production deployment should integrate with actual PostgreSQL + pgvector.

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start service
npm run dev

# Or run production build
node dist/index.js
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4721 | Service port |
| `NODE_ENV` | development | Environment |
| `DATABASE_URL` | postgresql://... | PostgreSQL connection (future) |
| `CORS_ORIGINS` | * | Allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |

## API Endpoints

### Vector Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/vectors` | Insert a single vector |
| `POST` | `/api/vectors/batch` | Batch insert vectors |
| `POST` | `/api/vectors/search` | Search for similar vectors |
| `GET` | `/api/vectors/:id` | Get vector by ID |
| `DELETE` | `/api/vectors/:id` | Delete vector |

### Namespace Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/namespaces` | List all namespaces |
| `GET` | `/api/namespaces/:namespace/vectors` | List vectors in namespace |
| `GET` | `/api/namespaces/:namespace/stats` | Get namespace statistics |

### Health & Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Basic health check |
| `GET` | `/api/health` | API health check |
| `GET` | `/health/live` | Kubernetes liveness probe |
| `GET` | `/health/ready` | Kubernetes readiness probe |
| `GET` | `/api/stats` | Storage statistics |

## API Examples

### Insert a Vector

```bash
curl -X POST http://localhost:4721/api/vectors \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "documents",
    "embedding": [0.1, 0.2, 0.3, 0.4, 0.5],
    "metadata": {
      "title": "Document Title",
      "source": "web"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "namespace": "documents",
    "embedding": [0.1, 0.2, 0.3, 0.4, 0.5],
    "metadata": {
      "title": "Document Title",
      "source": "web"
    },
    "created_at": "2026-05-30T09:50:28.027Z"
  },
  "meta": {
    "timestamp": "2026-05-30T09:50:28.027Z",
    "requestId": "req_xxx"
  }
}
```

### Search for Similar Vectors

```bash
curl -X POST http://localhost:4721/api/vectors/search \
  -H "Content-Type: application/json" \
  -d '{
    "embedding": [0.1, 0.2, 0.3, 0.4, 0.5],
    "limit": 10,
    "threshold": 0.8,
    "namespace": "documents"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "score": 1.0,
        "namespace": "documents",
        "metadata": {
          "title": "Document Title"
        },
        "created_at": "2026-05-30T09:50:28.027Z"
      }
    ],
    "query": [0.1, 0.2, 0.3, 0.4, 0.5],
    "total": 1,
    "took_ms": 2
  }
}
```

### Batch Insert

```bash
curl -X POST http://localhost:4721/api/vectors/batch \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": [
      {"namespace": "text", "embedding": [0.1, 0.2, 0.3]},
      {"namespace": "text", "embedding": [0.4, 0.5, 0.6]},
      {"namespace": "text", "embedding": [0.7, 0.8, 0.9]}
    ],
    "namespace": "documents"  // Optional: override namespace
  }'
```

### Get Vector by ID

```bash
curl http://localhost:4721/api/vectors/550e8400-e29b-41d4-a716-446655440000
```

### Delete Vector

```bash
curl -X DELETE http://localhost:4721/api/vectors/550e8400-e29b-41d4-a716-446655440000
```

### List Namespaces

```bash
curl http://localhost:4721/api/namespaces
```

## Types

### VectorRecord

```typescript
interface VectorRecord {
  id: string;                    // UUID
  namespace: string;             // Namespace identifier
  embedding: number[];           // Vector embedding
  metadata?: Record<string, unknown>;  // Optional metadata
  created_at: string;           // ISO timestamp
}
```

### SearchRequest

```typescript
interface SearchRequest {
  embedding: number[];           // Query vector
  limit?: number;               // Max results (default: 10, max: 1000)
  threshold?: number;            // Minimum similarity score (0-1)
  namespace?: string;            // Filter by namespace
  includeMetadata?: boolean;      // Include metadata in results (default: true)
}
```

### SearchResult

```typescript
interface SearchResult {
  id: string;
  score: number;                 // Cosine similarity score (0-1)
  namespace: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Express Server (4721)                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Rate Limit  │  │   Helmet    │  │    CORS     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├─────────────────────────────────────────────────────────┤
│                  Vector Routes (/api)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ POST /  │ │ POST /  │ │ GET /   │ │DELETE / │    │
│  │vectors  │ │search   │ │:id      │ │:id      │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────────────────────┤
│           InMemoryVectorStore (Mock Storage)            │
│           - Cosine similarity calculation               │
│           - Namespace indexing                          │
│           - Batch operations                            │
└─────────────────────────────────────────────────────────┘
```

## Production Deployment

To deploy with actual PostgreSQL + pgvector:

1. Enable pgvector extension in PostgreSQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. Create tables:
   ```sql
   CREATE TABLE vectors (
     id UUID PRIMARY KEY,
     namespace VARCHAR(255) NOT NULL,
     embedding vector(1536) NOT NULL,
     metadata JSONB,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX ON vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   CREATE INDEX ON vectors (namespace);
   ```

3. Replace `InMemoryVectorStore` with actual pg client operations.

## Security

- Rate limiting: 100 requests/minute global, 60/minute for search
- CORS configuration support
- Helmet security headers
- Input validation with Zod schemas
- Request ID tracking for audit trails

## License

Proprietary - HOJAI AI
