# HOJAI RAG Service

**Port:** 4731
**Location:** `hojai-llm/rag/`

Retrieval Augmented Generation service for HOJAI AI. Provides document storage, semantic search, and LLM-powered generation with context.

## Quick Start

```bash
cd hojai-llm/rag
npm install
npm run dev  # Development with hot reload
npm run build && npm start  # Production
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/health/ready` | Readiness check |
| GET | `/health/live` | Liveness check |
| POST | `/api/documents` | Create document |
| POST | `/api/documents/batch` | Batch create documents |
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/:id` | Get document by ID |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/search` | Semantic search |
| POST | `/api/generate` | Generate with RAG context |

## Usage Examples

### Create Document

```bash
curl -X POST http://localhost:4731/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "HOJAI AI Overview",
    "content": "HOJAI AI is a commercial AI infrastructure platform.",
    "metadata": {"category": "product"},
    "namespace": "hojai"
  }'
```

### Batch Create

```bash
curl -X POST http://localhost:4731/api/documents/batch \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {"title": "AI Agents", "content": "HOJAI Agents provide autonomous task execution."},
      {"title": "Workflow Engine", "content": "The workflow engine enables visual workflow creation."}
    ],
    "namespace": "hojai"
  }'
```

### Search

```bash
curl -X POST http://localhost:4731/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI platform infrastructure",
    "limit": 5,
    "namespace": "hojai"
  }'
```

### Generate with RAG

```bash
curl -X POST http://localhost:4731/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is HOJAI AI?",
    "max_tokens": 500,
    "temperature": 0.7
  }'
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4731 | Server port |
| `NODE_ENV` | development | Environment |
| `VECTOR_SERVICE_URL` | http://localhost:4721 | Vector service |
| `LLM_PROVIDER` | openai | LLM provider |
| `OPENAI_API_KEY` | - | OpenAI API key |
| `OPENAI_MODEL` | gpt-3.5-turbo | Model name |
| `EMBEDDING_MODEL` | text-embedding-ada-002 | Embedding model |
| `EMBEDDING_DIMENSION` | 1536 | Embedding dimension |
| `INTERNAL_SERVICE_TOKEN` | - | Service-to-service auth |

## Architecture

```
hojai-rag/
├── src/
│   ├── index.ts           # Main entry point
│   ├── config/            # Configuration
│   ├── types/             # TypeScript types
│   ├── validators/        # Zod schemas
│   ├── middleware/        # Auth, rate limiting, errors
│   ├── routes/            # API routes
│   └── services/          # Business logic
│       ├── documentService.ts  # Document CRUD + embeddings
│       └── llmService.ts       # LLM generation
└── dist/                  # Compiled output
```

## Features

- **Simple RAG Pipeline**: No LangChain dependency, lightweight implementation
- **Semantic Search**: TF-IDF based cosine similarity for embeddings
- **LLM Generation**: OpenAI-compatible API integration
- **Namespace Support**: Organize documents by namespace
- **Rate Limiting**: Per-IP rate limits (100/min general, 10/min generation)
- **Internal Auth**: Service-to-service authentication via `X-Internal-Token`

## Production Notes

- For production, replace the in-memory document store with a real vector database (Pinecone, Weaviate, pgvector)
- Configure `OPENAI_API_KEY` for real LLM generation
- Use `INTERNAL_SERVICE_TOKEN` for service-to-service authentication
