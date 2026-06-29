# Trust Semantic Cache

**Port:** 4996  
Semantic caching of trusted answers.

## Features

- Semantic similarity matching
- Trust-based TTL
- Hit/miss statistics
- Automatic expiration

## API

```bash
# Cache answer
POST /cache
{"query": "What is AI?", "answer": "Artificial Intelligence...", "trustScore": 0.9}

# Get cached
GET /cache/:query

# Semantic search
GET /cache/search?q=what+is+AI

# Stats
GET /cache/stats

# Clear cache
DELETE /cache
```

## Testing

```bash
npm test
```
