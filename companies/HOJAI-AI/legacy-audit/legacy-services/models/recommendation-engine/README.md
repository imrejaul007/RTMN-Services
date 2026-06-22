# HOJAI AI Recommendation Engine

**Port:** 4742
**Type:** Rule-based + Embedding Similarity Recommendations

Rule-based recommendation engine with embedding similarity for product recommendations. Supports personalized, trending, similar items, and frequently-bought-together recommendations.

## Features

- **Personalized Recommendations**: Combines user history with trending items using embedding similarity
- **Trending Items**: Most purchased items in the last 7 days
- **Similar Items**: Embedding cosine similarity based recommendations
- **Frequently Bought Together**: Co-purchase pattern analysis
- **Cold Start Handling**: Falls back to trending for new users

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Recommendation Engine                     │
├─────────────────────────────────────────────────────────────┤
│  Routes Layer                                               │
│  POST /api/recommend      - General recommendations         │
│  GET /api/recommend/:userId - User-specific recommendations  │
│  GET /api/trending         - Trending items                 │
│  POST /api/similar         - Similar items                  │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                              │
│  RecommendationService - Business logic                    │
│  EmbeddingService     - Cosine similarity                  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                  │
│  DataStore (In-memory mock, replace with DB)               │
│  - Products                                                │
│  - Purchases                                               │
│  - Purchase Patterns                                       │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST /api/recommend

Get recommendations based on request parameters.

```bash
curl -X POST http://localhost:4742/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "limit": 10,
    "type": "personalized"
  }'
```

**Request Body:**
```typescript
{
  userId?: string;
  productId?: string;
  limit?: number;        // 1-100, default 10
  type?: 'personalized' | 'trending' | 'similar' | 'frequently-bought';
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    items: Array<{
      id: string;
      name: string;
      score: number;
      reason: string;
    }>;
    type: string;
    generatedAt: string;
  }
}
```

### GET /api/recommend/:userId

Get personalized recommendations for a specific user.

```bash
curl http://localhost:4742/api/recommend/user123?limit=10&type=personalized
```

### GET /api/trending

Get trending items (most purchased in last 7 days).

```bash
curl http://localhost:4742/api/trending?limit=10&category=electronics
```

### POST /api/similar

Get similar items based on a product.

```bash
curl -X POST http://localhost:4742/api/similar \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "p1",
    "limit": 10
  }'
```

### POST /api/purchase

Record a purchase for training recommendations.

```bash
curl -X POST http://localhost:4742/api/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "productId": "p1",
    "quantity": 1
  }'
```

### GET /api/health

Health check endpoint.

```bash
curl http://localhost:4742/api/health
```

### GET /api/stats

Get data store statistics.

```bash
curl http://localhost:4742/api/stats
```

## Recommendation Algorithms

### Personalized (Default)

Combines three signals:
- **Embedding Similarity (40%)**: User preference vector vs product embedding
- **Trending Score (35%)**: Recent purchase velocity
- **Category Affinity (25%)**: User's preferred categories

### Trending

Items with highest purchase velocity over the last 7 days.

### Similar Items

Uses cosine similarity between product embedding vectors:
```
similarity(a, b) = dot(a, b) / (||a|| * ||b||)
```

### Frequently Bought Together

Co-purchase patterns from user purchase history.

## Quick Start

```bash
cd hojai-ai/models/recommendation-engine

# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4742 | Server port |
| HOST | 0.0.0.0 | Server host |
| LOG_LEVEL | info | Log level |
| CORS_ORIGIN | * | CORS allowed origin |

## Mock Data

The service initializes with 20 mock products across categories:
- electronics (10 products)
- accessories (10 products)

For production, replace the in-memory data store with a real database connection.

## Security

- Helmet.js for security headers
- CORS configuration
- Input validation with Zod
- Rate limiting ready (add express-rate-limit)

## Production Checklist

- [ ] Replace in-memory store with MongoDB/PostgreSQL
- [ ] Add Redis caching for frequently accessed recommendations
- [ ] Add rate limiting
- [ ] Add authentication middleware
- [ ] Set up monitoring/alerting
- [ ] Load test with realistic data
