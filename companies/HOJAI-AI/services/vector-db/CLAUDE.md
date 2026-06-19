# Vector Database (rtmn-vector-db)

> **Service:** `vector-db`
> **Port:** 4780
> **Version:** 1.0.0
> **Owner:** HOJAI AI — Data & Knowledge Cloud (Division 6)
> **Status:** ✅ Production-ready in-memory vector store

## What it is

In-memory vector database for the RTMN ecosystem — a lightweight Pinecone/Qdrant/pgvector alternative with cosine / dot product / Euclidean similarity, metadata filtering, and a shared 128-dim FNV-1a vectorizer. No external DB dependency. The single primitive that every other "AI-ready" service in the stack builds on.

## Why it exists

**Without vector storage there is no RAG, no semantic search, no embedding-based recommendation.** The ecosystem previously had zero vector DB code in the repo. This service is the foundation for the new RAG Platform (port 4781) and is available to all RTMN services.

## Endpoints (all `/api/*`)

### Collections
- `POST /api/collections` body `{ name, dimension, metric? }` — create (metric defaults to cosine)
- `GET /api/collections` — list with counts
- `GET /api/collections/:name` — get one
- `DELETE /api/collections/:name` — delete (cascades vectors)
- `PATCH /api/collections/:name` body `{ dimension?, metric? }` — update schema (only when empty)

### Vectors
- `POST /api/collections/:name/vectors` body `{ id?, values, metadata?, document? }` — upsert single
- `POST /api/collections/:name/vectors/batch` body `{ vectors: [{id?, values, metadata?, document?}, ...] }` — batch (max 1000)
- `GET /api/collections/:name/vectors/:vectorId` — fetch one
- `DELETE /api/collections/:name/vectors/:vectorId` — delete one
- `POST /api/collections/:name/vectors/delete-batch` body `{ ids: [...] }` — batch delete
- `GET /api/collections/:name/vectors?limit=50&offset=0` — paginated list

### Search (the core)
- `POST /api/collections/:name/search` body `{ query: number[], topK?, filter?, includeValues?, includeDocuments? }` — vector search
- `POST /api/collections/:name/search-by-text` body `{ text, topK?, filter? }` — embeds text in-process, then searches (dim=128)
- `POST /api/query` body `{ collection, query, topK?, filter? }` — alternative top-level search
- Filter operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `exists` (combined with implicit AND)

### Utilities
- `POST /api/embed` body `{ text, dimension? }` — shared vectorizer. Default 128-dim FNV-1a bag-of-words + L2 normalize. **Same algorithm as semantic-cache (4772) so embeddings are interoperable across services.**
- `GET /api/stats` — aggregate counts + memory estimate
- `POST /api/stats/reset` — reset counters
- `GET /api/audit?limit=100` — recent events (cap 10k)

### Health
- `GET /health` → 301 redirect to `/api/health`
- `GET /api/health` → `{ status, service, port, version, collections, totalVectors, uptime }`

## Key design choices

1. **In-memory `Map` storage** — matches the existing ecosystem pattern (no Mongo, no Postgres). Fast for in-process reads, zero infra setup. Persistence is a planned v1.1 feature.
2. **128-dim FNV-1a bag-of-words vectorizer** — re-implemented from `semantic-cache` (line-for-line the same algorithm). Deterministic, no dependencies, fine for dev/demo and intra-ecosystem embedding sharing. Production should swap in OpenAI `text-embedding-3-small` or similar.
3. **Three metrics** — cosine (default, best for normalized embeddings), dot (faster), Euclidean (with `1/(1+d)` score conversion so higher is still better).
4. **Metadata filtering with 9 operators** — `eq/ne/gt/gte/lt/lte/in/nin/exists`. AND combined. Spans a metadata index that's built at upsert time and torn down at delete.
5. **Audit log** — every mutation, every "interesting" search (with matches) recorded with actor (from `x-actor`/`x-principal`/`x-user-id` headers), action type, and details. Cap 10k FIFO.

## Integration with the rest of RTMN

- **Used by:** `rag-platform` (4781) for storage + retrieval; available to all other services that need embedding-based search.
- **Wired into HOJAI Intelligence** (4881) routing: `vector: http://localhost:4780`, capabilities `embed`, `vectorSearch`, `vectorUpsert`.
- **Embeddings are interoperable with `semantic-cache` (4772)** because both use the same 128-dim FNV-1a algorithm. A vector stored in `vector-db` can be compared against a query embedded by `semantic-cache` (or vice versa).

## File layout

```
services/vector-db/
├── package.json         # express, helmet, cors, uuid — same as the rest of the stack
├── CLAUDE.md            # this file
└── src/
    └── index.js         # ~1,200 lines — single-file service in the RTMN pattern
```

## What it does NOT do (yet)

- **Persistence** — in-memory only. Restart loses data. Planned v1.1 with SQLite or LMDB.
- **Real embeddings** — FNV-1a is great for dev but for production quality you want `text-embedding-3-small` (1536-dim) or `cohere-embed-v3` (1024-dim). Pluggable embedder interface is a v1.1 feature.
- **HNSW / IVF index** — currently brute-force cosine scan. Fine for ~10k vectors; beyond that you need an ANN index.
- **Multi-tenancy** — all collections are in one process. The `principalOf(req)` pattern + `actor` headers exist for audit, not isolation. Real multi-tenancy is a v1.2 task (per-customer collections + namespacing).
- **Streaming ingestion** — batch endpoints exist; SSE/streaming for large imports is v1.2.

## Example: end-to-end RAG (used by the RAG Platform)

```javascript
// 1. Create collection (one-time)
await fetch('http://localhost:4780/api/collections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'knowledge-base', dimension: 128, metric: 'cosine' })
});

// 2. Embed a chunk of text
const { vector } = await fetch('http://localhost:4780/api/embed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'The Eiffel Tower is in Paris.', dimension: 128 })
}).then(r => r.json());

// 3. Upsert with metadata + document text
await fetch('http://localhost:4780/api/collections/knowledge-base/vectors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'doc-1-chunk-0',
    values: vector,
    metadata: { documentId: 'doc-1', chunkIndex: 0, source: 'wikipedia' },
    document: 'The Eiffel Tower is in Paris.'
  })
}).then(r => r.json());

// 4. Search
const { matches } = await fetch('http://localhost:4780/api/collections/knowledge-base/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: vector, topK: 5 })
}).then(r => r.json());
// → returns top-5 matches with score, metadata, document
```

Or just use `POST /api/collections/:name/search-by-text` to skip the embed step.

---

*Last updated: June 19, 2026 — Initial release as part of HOJAI AI Division 6 (Data & Knowledge Cloud) build-out.*
*Companion service: [../rag-platform/CLAUDE.md](../rag-platform/CLAUDE.md).*
