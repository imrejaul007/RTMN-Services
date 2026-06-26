# SearchOS - Port 4877

## Overview
Enterprise search across all knowledge.

## Purpose
Unified search across all company data and knowledge.

## Key Features
- Unified search across sources
- Semantic search
- Filters and facets
- Search analytics
- Personalized results
- Search suggestions

## API Endpoints

### Documents
- `POST /api/documents` - Index document
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document
- `DELETE /api/documents/:id` - Remove document

### Search
- `POST /api/search` - Search documents
  - Query, filters, pagination, sorting

### Suggestions
- `GET /api/suggestions` - Get suggestions

### Indexes
- `GET /api/indexes` - List indexes
- `POST /api/indexes` - Create index

### Analytics
- `GET /api/analytics/searches` - Search analytics

## Document Types
- `document` - General documents
- `email` - Emails
- `chat` - Chat messages
- `ticket` - Support tickets
- `code` - Code snippets
- `knowledge` - Knowledge base

## Tests
Vitest tests: `__tests__/search-os.test.ts`

## Environment
- Port: 4877

## Startup
```bash
cd platform/sutar-os/core/search-os && npm run dev
```
