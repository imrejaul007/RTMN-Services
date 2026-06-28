# Search OS

Enterprise full-text search with BM25 ranking, highlighting, and faceted search.

**Port:** 4877

## Features

- **BM25 Ranking** - Industry-standard relevance scoring
- **Full-Text Search** - Tokenization with stop word removal
- **Highlighting** - Query term highlighting in results
- **Faceted Search** - Filter by type, tags, and author
- **Autocomplete** - Real-time search suggestions
- **Bulk Indexing** - Index multiple documents at once
- **Date Range Filtering** - Filter results by creation date

## API Endpoints

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/ready` | Readiness probe |
| GET | `/api/search/status` | Index statistics |

### Indexing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search/index` | Index a document (requires auth) |
| PUT | `/api/search/index/:id` | Update a document (requires auth) |
| DELETE | `/api/search/index/:id` | Delete a document (requires auth) |
| POST | `/api/search/index/bulk` | Bulk index documents (requires auth) |
| GET | `/api/search/index/:id` | Get document by ID |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=<query>` | Search documents |
| POST | `/api/search` | Search with filters (requires auth) |
| GET | `/api/search/suggest?q=<query>` | Get autocomplete suggestions |

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (required) |
| `type` | string | Filter by document type |
| `tags` | string[] | Filter by tags |
| `author` | string | Filter by author |
| `dateFrom` | string | Filter from date (ISO 8601) |
| `dateTo` | string | Filter to date (ISO 8601) |
| `limit` | number | Results per page (default: 20, max: 100) |
| `offset` | number | Pagination offset (default: 0) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4877 | Service port |
| `NODE_ENV` | development | Environment mode |

## Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run tests
npm test

# Watch mode for tests
npm run test:watch
```

## Document Schema

```typescript
interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  metadata: Record<string, string>;
  author?: string;
  createdAt: string;
  updatedAt: string;
  indexedAt: string;
}
```

## Search Response

```typescript
interface SearchResponse {
  query: string;
  total: number;
  limit: number;
  offset: number;
  results: Array<{
    document: Document;
    score: number;
    highlights: string[];
    matchedTerms: string[];
  }>;
  facets: {
    types: Array<{ value: string; count: number }>;
    tags: Array<{ value: string; count: number }>;
    authors: Array<{ value: string; count: number }>;
  };
}
```

## Example Usage

```bash
# Index a document
curl -X POST http://localhost:4877/api/search/index \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Getting Started with TypeScript",
    "content": "TypeScript is a typed superset of JavaScript.",
    "type": "article",
    "tags": ["typescript", "javascript"],
    "author": "John Doe"
  }'

# Search
curl "http://localhost:4877/api/search?q=typescript"

# Search with filters
curl "http://localhost:4877/api/search?q=typescript&type=article&limit=10"

# Autocomplete
curl "http://localhost:4877/api/search/suggest?q=type"
```

## Dependencies

- express - HTTP server
- cors - CORS support
- helmet - Security headers
- uuid - Unique ID generation
- zod - Schema validation
