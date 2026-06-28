# knowledge-base

**Port:** 5466
**Phase:** 3
**Purpose:** RAG-powered Q&A, FAQ, document management

## Features

- PDF/URL/FAQ import
- Semantic search
- MemoryOS integration
- Auto-answers

## API

- `POST /api/kb/add` — Add document
- `GET /api/kb/search` — Search
- `POST /api/kb/ask` — Q&A

## Startup

```bash
cd products/knowledge-base && npm install && npm start
```
