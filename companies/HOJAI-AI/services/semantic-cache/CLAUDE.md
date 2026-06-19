# Semantic Cache

> **Service:** semantic-cache
> **Port:** 4772
> **Owner:** HOJAI AI - Training & Model Platform (Division 7)
> **Version:** 1.0.0
> **Status:** Production Ready

A semantic caching layer for LLM responses. Cache completions are keyed by
embedding similarity rather than exact prompt match, so paraphrases
("What's the weather?" vs. "Tell me the weather") hit the same cache entry.
**Goal:** 50%+ reduction in LLM API spend.

---

## Purpose

Every prompt sent to an LLM costs money. In production traffic, a large fraction
of prompts are paraphrases of the same question — the same customer asking the
same thing in slightly different words, or many users asking the same FAQ.

A naive exact-match cache misses all of these. A semantic cache embeds the
prompt into a vector and serves the response of the closest previously-cached
prompt whenever cosine similarity crosses a threshold. The inference gateway
should call **this service before every LLM call** and only fall through to the
provider when the cache misses.

This service:

- Stores `(prompt, response)` pairs along with their prompt embeddings
- Computes embeddings using a dependency-free bag-of-words + FNV-1a hashing
  vectorizer (production swap-in for a real embedding model is straightforward)
- Performs cosine-similarity lookup with a configurable threshold (default 0.85)
- Tracks hits, misses, cost-saved estimate, and a full audit log
- Exposes the embedding service standalone for reuse elsewhere

---

## Endpoints

### Health

| Method | Path           | Description |
|--------|----------------|-------------|
| GET    | `/health`      | Redirects to `/api/health` |
| GET    | `/api/health`  | Liveness + entry count + hit rate |

### Embedding service (standalone)

| Method | Path                 | Description |
|--------|----------------------|-------------|
| POST   | `/api/embed`         | Compute embedding for `{text, dim?}` |
| POST   | `/api/embed/batch`   | Compute embeddings for `{texts: [...], dim?}` (max 500) |
| POST   | `/api/similarity`    | Cosine similarity between `{a, b}` (texts or vectors) |

### Cache CRUD

| Method | Path                       | Description |
|--------|----------------------------|-------------|
| POST   | `/api/cache`               | Store `{prompt, response, model, metadata?, ttlSeconds?}` |
| GET    | `/api/cache`               | List entries (filter by `?model=`, paginate `?limit=&offset=`) |
| GET    | `/api/cache/:id`           | Get one entry |
| DELETE | `/api/cache/:id`           | Delete one entry |
| POST   | `/api/cache/clear`         | Clear all (optional `{model, olderThan}` filter) |
| GET    | `/api/cache/similar/:id`   | Find entries similar to a given entry (`?topK=&threshold=`) |

### Lookup (hot path)

| Method | Path                  | Description |
|--------|-----------------------|-------------|
| POST   | `/api/lookup`         | Look up by `{prompt, model?, threshold?, topK?}` |
| POST   | `/api/lookup/batch`   | Batch lookup up to 200 prompts |

### Stats & audit

| Method | Path                | Description |
|--------|---------------------|-------------|
| GET    | `/api/stats`        | Hit rate, avg similarity at hit, est. cost saved, by-model breakdown |
| POST   | `/api/stats/reset`  | Reset cumulative counters (entries untouched) |
| GET    | `/api/audit`        | Append-only event log (filters: `?op=`, `?entryId=`, `?limit=`) |

**Total: 18 endpoints**

---

## How similarity matching works

The vectorizer is intentionally minimal:

1. **Tokenize** — lowercase, split on non-word characters, drop stopwords
   (a hardcoded list of ~80 English stopwords lives in `src/index.js`).
2. **Hash + count** — each remaining token is FNV-1a hashed to a 32-bit
   integer, modulo'd into a bucket (default 128 dimensions), and accumulated
   by term frequency.
3. **L2 normalize** — the resulting vector is normalized so dot product
   equals cosine similarity.

At lookup time, the incoming prompt is embedded the same way, then we score
every non-expired entry for the requested model and return the highest-cosine
match above `threshold`.

### Example

```
Prompt A: "What's the weather in Paris today?"   -> embed -> vec_A
Prompt B: "Tell me the current weather in Paris" -> embed -> vec_B
cosine(vec_A, vec_B) ≈ 0.92   (well above default 0.85 threshold)
```

Both prompts would map to the same cache entry. A third prompt, "What's the
capital of France?", would tokenize very differently and have cosine ~0.05,
missing the cache.

The service ships pre-seeded with five paraphrase groups (weather, quantum
entanglement, carbonara recipe, capitals, haiku) so you can hit
`POST /api/lookup` immediately and see hits.

---

## Integration guide

The intended caller is the HOJAI AI **inference-gateway**. The flow:

```js
async function callLLM(prompt, model) {
  // 1) Try semantic cache first
  const lookup = await fetch('http://localhost:4772/api/lookup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, model, threshold: 0.85 })
  }).then(r => r.json());

  if (lookup.hit) {
    return {
      response: lookup.entry.response,
      fromCache: true,
      similarity: lookup.similarity,
      savedCostUsd: lookup.entry.metadata.costUsd
    };
  }

  // 2) Cache miss — call the real provider
  const result = await openai.chat.completions.create({ model, messages: [{ role: 'user', content: prompt }] });
  const responseText = result.choices[0].message.content;

  // 3) Store for next time
  await fetch('http://localhost:4772/api/cache', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt,
      response: responseText,
      model,
      metadata: {
        provider: 'openai',
        tokensIn: result.usage.prompt_tokens,
        tokensOut: result.usage.completion_tokens,
        costUsd: estimateCost(result.usage, model)
      }
    })
  });

  return { response: responseText, fromCache: false };
}
```

Key things to know:

- **Always pass `model`.** It scopes the lookup so a cached GPT-3.5 answer
  never serves a GPT-4 request.
- **Tune `threshold` per call.** 0.85 is the default; trivial paraphrases
  hit it, but creative rewrites need ~0.75. Deterministic factual queries
  can safely use 0.92 to avoid stale answers.
- **Store on every miss** — the cache is only useful if you feed it.
- **Pass `metadata.costUsd`** if you want the `/api/stats` cost-saved estimate
  to be accurate. The service falls back to a per-model default otherwise.

---

## Limitations

This is a working prototype of a semantic cache, not production-grade. Specific
caveats:

### The embedding model is a toy

- Bag-of-words + hashing has no notion of word order, synonyms, or semantic
  similarity. "happy" and "joyful" are unrelated vectors. "the cat sat on the
  mat" and "the mat sat on the cat" would embed identically.
- The 128-dim hashed vector is mostly noise for short prompts. Two unrelated
  prompts with overlapping stopwords share ~10 dimensions by coincidence.
- The FNV hash function is deterministic but not locality-sensitive — nearby
  words do not land in nearby buckets.

**Production fix:** swap `embed()` for a real embedding service. Drop-in
options:

- `text-embedding-3-small` from OpenAI (1536 dims, ~$0.02/M tokens)
- `voyage-2` from Voyage AI (1024 dims, tuned for retrieval)
- A local `sentence-transformers` model behind a sidecar service

Only `embed()` and the dimensionality need to change — the rest of the service
operates on `number[]` and is model-agnostic.

### Storage is in-memory

- Restarts lose the cache.
- There is no LRU eviction; the map grows unbounded.
- There is no replication; this is a single-node service.

**Production fix:** Redis (with `pgvector` or a dedicated vector store for
nearest-neighbor). For very large caches, use HNSW indexing
(`hnswlib-node`, `pgvector`, or Pinecone) — naive cosine over N entries is
O(N) per lookup and will not scale past ~10k entries per model.

### No multi-tenancy

- Every cache entry is global. Two customers asking similar questions share
  responses. This may leak business data between tenants.

**Production fix:** prefix every cache key with a tenant/business ID and add
a `?tenantId=` filter on every endpoint (or scope at the gateway).

### No security model

- All endpoints are open. No auth, no RBAC.
- Anyone can read or delete any entry.

**Production fix:** require a CorpID JWT, scope by tenant, restrict
`/api/cache/clear` and `DELETE /api/cache/:id` to operators.

### Audit log is bounded

- The in-memory audit log is capped at 10,000 entries (`shift()` on overflow).

**Production fix:** ship to a structured log sink (CloudWatch, Datadog, a
durable event bus) so you have a full history of every store/lookup event.

---

## Statistics

| Metric | Value |
|--------|-------|
| Endpoints | 18 |
| Vector dimensions | 128 (configurable per call up to 4096) |
| Default similarity threshold | 0.85 |
| Pre-seeded entries | 15 (5 paraphrase groups of 3 each) |
| External dependencies | express, cors, helmet, uuid |
| External services required | none (fully self-contained) |

---

*Last Updated: June 19, 2026*
*HOJAI AI - Training & Model Platform*
