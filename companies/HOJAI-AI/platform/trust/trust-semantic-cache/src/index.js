import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4996;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Semantic cache
const cache = new Map();
const cacheStats = { hits: 0, misses: 0, evictions: 0 };

// Simple semantic similarity (in production, use embeddings)
function calculateSimilarity(query1, query2) {
  const words1 = new Set(query1.toLowerCase().split(/\s+/));
  const words2 = new Set(query2.toLowerCase().split(/\s+/));
  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);
  return intersection.length / union.size;
}

// Find cached answer
function findCached(query) {
  for (const [cachedQuery, cached] of cache.entries()) {
    const similarity = calculateSimilarity(query, cachedQuery);
    if (similarity > 0.8) {
      return cached;
    }
  }
  return null;
}

// Cache entry with TTL
function createCacheEntry(query, answer, trustScore) {
  const ttl = getTTLFromTrust(trustScore);
  return {
    query,
    answer,
    trustScore,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl,
    hits: 0
  };
}

function getTTLFromTrust(trustScore) {
  // Higher trust = longer cache
  if (trustScore >= 0.9) return 7 * 24 * 60 * 60 * 1000; // 7 days
  if (trustScore >= 0.7) return 24 * 60 * 60 * 1000; // 1 day
  if (trustScore >= 0.5) return 60 * 60 * 1000; // 1 hour
  return 10 * 60 * 1000; // 10 minutes
}

// POST /cache - Cache a trusted answer
app.post('/cache', (req, res) => {
  const { query, answer, trustScore, metadata } = req.body;

  if (!query || !answer) {
    return res.status(400).json({ error: 'Query and answer are required' });
  }

  const entry = createCacheEntry(query, answer, trustScore || 0.5);
  entry.metadata = metadata;

  cache.set(query, entry);

  // Cleanup expired
  cleanupExpired();

  res.json({ success: true, entry });
});

// GET /cache/:query - Get cached answer
app.get('/cache/:query(*)', (req, res) => {
  const { query } = req.params;

  const cached = cache.get(query) || findCached(query);

  if (!cached) {
    cacheStats.misses++;
    return res.json({ hit: false, cached: null });
  }

  if (Date.now() > cached.expiresAt) {
    cache.delete(query);
    cacheStats.misses++;
    return res.json({ hit: false, cached: null, reason: 'expired' });
  }

  cached.hits++;
  cacheStats.hits++;

  res.json({
    hit: true,
    cached: {
      query: cached.query,
      answer: cached.answer,
      trustScore: cached.trustScore,
      createdAt: cached.createdAt,
      hits: cached.hits
    }
  });
});

// DELETE /cache/:query - Invalidate cache
app.delete('/cache/:query(*)', (req, res) => {
  const { query } = req.params;
  const deleted = cache.delete(query);

  res.json({ success: deleted });
});

// DELETE /cache - Clear all cache
app.delete('/cache', (req, res) => {
  const size = cache.size;
  cache.clear();
  res.json({ success: true, cleared: size });
});

// GET /cache/stats - Cache statistics
app.get('/cache/stats', (req, res) => {
  cleanupExpired();

  const entries = Array.from(cache.values());
  const avgTrust = entries.length > 0
    ? entries.reduce((sum, e) => sum + e.trustScore, 0) / entries.length
    : 0;

  res.json({
    stats: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses + 1),
      size: cache.size,
      evictions: cacheStats.evictions,
      avgTrustScore: avgTrust
    }
  });
});

// GET /cache/search - Semantic search
app.get('/cache/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const results = [];
  for (const [query, cached] of cache.entries()) {
    const similarity = calculateSimilarity(q, query);
    if (similarity > 0.3) {
      results.push({
        query,
        answer: cached.answer,
        trustScore: cached.trustScore,
        similarity
      });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);

  res.json({ results: results.slice(0, 10), count: results.length });
});

function cleanupExpired() {
  const now = Date.now();
  let evictions = 0;
  for (const [query, cached] of cache.entries()) {
    if (now > cached.expiresAt) {
      cache.delete(query);
      evictions++;
    }
  }
  cacheStats.evictions += evictions;
}

// Cleanup interval
setInterval(cleanupExpired, 60 * 1000);

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'trust-semantic-cache', port: PORT, cacheSize: cache.size });
});

app.listen(PORT, () => {
  console.log(`Trust Semantic Cache running on port ${PORT}`);
});

export default app;
