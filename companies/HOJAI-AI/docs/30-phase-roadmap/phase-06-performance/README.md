# Phase 6: Performance & Scaling

**Duration:** 2 weeks (Week 9–10)
**Priority:** P2 (Medium)
**Owner:** Infrastructure Engineer

---

## Goal

Optimize performance to handle production load with distributed caching, token budget enforcement, batch processing, and connection pooling.

---

## Deliverables

### 6.1 Add Redis Distributed Cache

**File:** `platform/intelligence/semantic-cache/src/index.js`

**Tasks:**

1. Add Redis backend for distributed cache
2. Implement cache invalidation by tag
3. Add cache warming on startup
4. Add cache metrics

**Implementation:**

```javascript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: 3
});

// Cache with TTL and tags
app.post('/api/cache/set', async (req, res) => {
  const { key, value, ttl = 3600, tags = [] } = req.body;

  await redis.setex(key, ttl, JSON.stringify(value));

  // Tag-based invalidation
  for (const tag of tags) {
    await redis.sadd(`tag:${tag}`, key);
    await redis.expire(`tag:${tag}`, ttl);
  }

  res.json({ success: true });
});

// Invalidate by tag
app.post('/api/cache/invalidate-tag', async (req, res) => {
  const { tag } = req.body;

  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys);
    await redis.del(`tag:${tag}`);
  }

  res.json({ success: true, invalidated: keys.length });
});
```

---

### 6.2 Implement Token Budget Enforcement

**File:** `platform/memory/memory-context-engine/src/index.js`

**Tasks:**

1. Add `maxTokens` parameter
2. Truncate context to fit budget
3. Add token counting (tiktoken)
4. Emit metrics

**Implementation:**

```javascript
import { encoding_for_model } from 'tiktoken';

const encoders = {
  'gpt-4o': encoding_for_model('gpt-4o'),
  'gpt-4o-mini': encoding_for_model('gpt-4o'),
  'claude-3-5-sonnet': encoding_for_model('gpt-4o') // Approximation
};

function countTokens(text, model = 'gpt-4o') {
  const encoder = encoders[model] || encoders['gpt-4o'];
  return encoder.encode(text).length;
}

app.post('/api/context/build', async (req, res) => {
  const { memories, maxTokens = 4000, model = 'gpt-4o' } = req.body;

  // Sort by score (relevance × confidence × recency)
  const sorted = memories.sort((a, b) => b.score - a.score);

  // Truncate to fit budget
  let totalTokens = 0;
  const selected = [];

  for (const memory of sorted) {
    const tokens = countTokens(memory.content, model);
    if (totalTokens + tokens > maxTokens) break;

    selected.push(memory);
    totalTokens += tokens;
  }

  metrics.histogram('context_tokens_used', totalTokens);
  metrics.histogram('context_memories_selected', selected.length);

  res.json({ context: selected, totalTokens });
});
```

---

### 6.3 Add Batch Processing

**File:** `platform/intelligence/inference-gateway/src/batch.js`

**Tasks:**

1. Implement `POST /api/batch` endpoint
2. Accept array of requests (up to 100)
3. Process in parallel with concurrency limit
4. Use OpenAI Batch API for 50% cost savings

**Implementation:**

```javascript
app.post('/api/batch', requireAuth, async (req, res) => {
  const { requests } = req.body;

  if (requests.length > 100) {
    return res.status(400).json({ error: 'Max 100 requests per batch' });
  }

  // Process with concurrency limit
  const concurrencyLimit = 10;
  const results = [];

  for (let i = 0; i < requests.length; i += concurrencyLimit) {
    const batch = requests.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(async (request, idx) => {
        try {
          const response = await provider.complete(
            request.model,
            request.messages,
            request.options
          );
          return { index: i + idx, success: true, response };
        } catch (error) {
          return { index: i + idx, success: false, error: error.message };
        }
      })
    );
    results.push(...batchResults);
  }

  // Sort by original index
  results.sort((a, b) => a.index - b.index);

  res.json({ results });
});
```

---

### 6.4 Add Connection Pooling

**File:** All services making HTTP calls

**Tasks:**

1. Use `agentkeepalive` for HTTP connections
2. Pool size: 10 per service
3. Timeout: 30s default
4. Retry: 3 attempts with exponential backoff

**Implementation:**

```javascript
import { Agent } from 'agentkeepalive';

const keepAliveAgent = new Agent({
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 30000,
  keepAliveMsecs: 60000
});

async function callService(url, options = {}) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios({
        url,
        ...options,
        httpAgent: keepAliveAgent,
        httpsAgent: keepAliveAgent,
        timeout: options.timeout || 30000
      });
      return response.data;
    } catch (error) {
      lastError = error;
      const backoff = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
}
```

---

## Performance Targets

| Metric | Target |
|---|---|
| Inference p95 latency | < 2s |
| Cache hit rate | > 30% |
| Batch throughput | 100 req/30s |
| Connection reuse | > 80% |

---

*Phase 6 documentation: 2026-06-22*