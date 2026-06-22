# RAG Platform (rtmn-rag-platform)

> **Service:** `rag-platform`
> **Port:** 4781
> **Version:** 1.0.0
> **Owner:** HOJAI AI — Data & Knowledge Cloud (Division 6)
> **Status:** ✅ Production-ready retrieval-augmented generation framework

## What it is

The RAG framework for the RTMN ecosystem. Sits on top of **Vector DB (4780)** for storage/retrieval and **Inference Gateway (4770)** for LLM generation. Provides document ingestion with smart chunking, retrieval with metadata filtering, and end-to-end Q&A with source attribution.

This is the service that makes the vector database actually useful — without it, vector-db is just a place to put vectors. With it, the rest of the ecosystem can ask natural-language questions over a knowledge base and get grounded answers.

## Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Document    │ ──▶ │  Chunking    │ ──▶ │  Embedding   │ ──▶ │  Vector DB   │
│  (raw text)  │     │  (sentence-  │     │  (vector-db  │     │  (cosine     │
│              │     │  aware)      │     │  /api/embed) │     │  store)      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                        │
       ┌────────────────────────────────────────────────────────────────┘
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  RAG Query   │ ──▶ │  Embed query │ ──▶ │  Top-K       │ ──▶ │  Build       │
│  (question)  │     │  + search    │     │  matches     │     │  context     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                        │
                                                                        ▼
                                                              ┌──────────────┐
                                                              │  Inference   │
                                                              │  Gateway     │
                                                              │  (LLM call)  │
                                                              └──────────────┘
```

## Endpoints (all `/api/*`)

### Document ingestion
- `POST /api/documents` body `{ collection, documentId?, content, metadata?, chunkSize?, chunkOverlap? }`
  - Chunks the content (default 500 chars / 50 overlap, sentence-boundary aware)
  - Auto-creates the vector-db collection (dim 128, cosine) on first use
  - Embeds each chunk via `vector-db /api/embed`
  - Upserts chunk vectors with `metadata: { ...documentMeta, documentId, chunkIndex, start, end }`
  - Returns `{ documentId, collection, chunksCreated, totalChunks, vectorIds }`

- `GET /api/documents/:documentId?includeContent=true|false` — fetch document + chunk metadata
- `DELETE /api/documents/:documentId` — delete document + all its chunk vectors
- `GET /api/documents?collection=NAME` — list documents in a collection

### Retrieval-only (no LLM call)
- `POST /api/retrieve` body `{ collection, query, topK?, filter? }`
  - Returns `{ matches: [...], queryEmbedding, took_ms }`
  - For clients that want to do their own prompting

### RAG query (the star)
- `POST /api/rag/query` body `{ collection, query, topK?, filter?, systemPrompt?, model?, temperature?, maxTokens?, includeSources? }`
  - Defaults: `topK=5`, `model='gpt-4o-mini'`, `temperature=0.3`, `includeSources=true`
  - Pipeline: embed query → search top-K → assemble context block → call inference-gateway
  - Returns `{ answer, model, provider, usage, took_ms, confidence, matchCount, topScore, sources?: [...] }`
  - `confidence`: `high` (top score ≥ 0.5), `medium` (≥ 0.2), `low` (< 0.2)

- `POST /api/rag/stream` — placeholder, returns 501. **Planned v1.1** (SSE streaming).

### Configuration
- `GET /api/config` — current config
- `POST /api/config` body `{ vectorDbUrl?, inferenceUrl?, defaultChunkSize?, defaultChunkOverlap?, defaultModel?, defaultTemperature?, defaultTopK? }` — update

### Stats & audit
- `GET /api/stats` — counters + per-collection breakdown
- `POST /api/stats/reset` — reset query counters (not document storage)
- `GET /api/audit?limit=100&action=rag.query` — recent events

### Health
- `GET /health` → 301 redirect to `/api/health`
- `GET /api/health` → `{ status, service, port, version, documents, totalChunks, uptime, dependencies: { vectorDb, inferenceGateway } }`

## Chunking strategy

**Sentence-boundary-aware sliding window.**

1. Tokenize the content into sentences (handles `.`, `!`, `?`, `\n`; protects common abbreviations like `Mr.`, `e.g.`).
2. Pack sentences greedily into a buffer until the next sentence would exceed `chunkSize`.
3. Emit the buffer, then start a new buffer with the trailing `chunkOverlap` characters of the previous one to preserve context at the seam.
4. Each emitted chunk has `text`, `start`, `end`, `chunkIndex`.

Default `chunkSize=500`, `chunkOverlap=50`. Both configurable per-request or via `POST /api/config`.

## Context assembly

Each retrieved match is prefixed with `[Source N]` and joined with blank lines. The final user prompt is:

```
Context:
[Source 1] <doc 1>
[Source 2] <doc 2>
...

Question: <user query>

Answer using only the context above. If the context doesn't contain the answer, say so.
```

Default system prompt: *"You are HOJAI AI, a helpful assistant. Answer questions based only on the provided context. Be concise. If the context does not contain the answer, say so clearly."* — overridable per request.

## Confidence scoring

```
score >= 0.5  → high
score >= 0.2  → medium
score <  0.2  → low   (or 0 matches at all)
```

The "top score" is the highest similarity from the returned matches. Clients can use `confidence` to decide whether to fall back to a non-RAG answer, ask the user to clarify, or escalate to a human.

## Upstream dependency health

`/api/health` actively pings both `vector-db` and `inference-gateway` (2s timeout each, parallel). If either is down, `status` becomes `degraded` and the upstream is reported as `down`. Document ingestion and RAG queries that hit a down upstream return a 502 with the upstream error in the body.

## Configuration

All defaults can be overridden by env vars or via `POST /api/config`:

| Env var | Default | What |
|---------|---------|------|
| `VECTOR_DB_URL` | `http://localhost:4780` | vector-db base URL |
| `INFERENCE_URL` | `http://localhost:4770` | inference-gateway base URL |
| `DEFAULT_CHUNK_SIZE` | `500` | chars per chunk |
| `DEFAULT_CHUNK_OVERLAP` | `50` | overlap between chunks |
| `DEFAULT_MODEL` | `gpt-4o-mini` | LLM model |
| `DEFAULT_TEMPERATURE` | `0.3` | low — we want grounded, not creative |
| `DEFAULT_TOP_K` | `5` | chunks retrieved per query |

## Integration with the rest of RTMN

- **Calls:** `vector-db` (4780) for storage and embedding; `inference-gateway` (4770) for LLM completion.
- **Wired into HOJAI Intelligence** (4881) routing: `rag: http://localhost:4781`, capabilities `ragQuery`, `ragRetrieve`, `ragIngest`.
- **Replaces no service** — first RAG framework in the RTMN stack. Can be used by any service that needs grounded answers (sales copilot, support bot, knowledge base Q&A, etc.).

## File layout

```
services/rag-platform/
├── package.json         # express, helmet, cors, uuid — same as the rest of the stack
├── CLAUDE.md            # this file
└── src/
    └── index.js         # ~1,150 lines — single-file service in the RTMN pattern
```

## What it does NOT do (yet)

- **Streaming responses** — `/api/rag/stream` returns 501. SSE planned for v1.1.
- **Re-ranking** — current order is raw similarity. A cross-encoder reranker step is v1.2.
- **Hybrid search** — vector-only. Adding BM25 keyword search alongside is v1.2.
- **Multi-modal RAG** — text only. Image/PDF extraction is the job of a future `document-intelligence` service.
- **Production-grade embeddings** — FNV-1a is fine for dev. Production should call out to OpenAI/Cohere embeddings via a v1.1 pluggable embedder interface.
- **Query transformation** — no HyDE, no multi-query, no step-back. Straight similarity search.

## Example: end-to-end Q&A

```javascript
// 1. Ingest a document
await fetch('http://localhost:4781/api/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collection: 'company-handbook',
    content: 'Our refund policy allows full refunds within 30 days of purchase. ...',
    metadata: { source: 'handbook-v2.pdf' }
  })
});

// 2. Ask a question
const r = await fetch('http://localhost:4781/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collection: 'company-handbook',
    query: 'Can I get a refund after 45 days?',
    topK: 3
  })
}).then(r => r.json());

console.log(r.answer);          // "According to the policy, full refunds are only available within 30 days..."
console.log(r.confidence);      // "high"
console.log(r.sources[0].score); // 0.62
```

---

*Last updated: June 19, 2026 — Initial release as part of HOJAI AI Division 6 (Data & Knowledge Cloud) build-out.*
*Companion service: [../vector-db/CLAUDE.md](../vector-db/CLAUDE.md).*