# REZ Real-time Ranking Service

**Port:** 5006

ML-based real-time ranking service for feeds, recommendations, search results, and A/B testing.

## Features

- **Real-time Ranking** - Rank items in < 50ms
- **Multi-signal Scoring** - Combine relevance, popularity, recency, personalization
- **Learning to Rank** - LambdaMART ML model with LightGBM
- **A/B Testing** - Multi-armed bandit with statistical significance
- **Diversity Ranking** - Ensure result diversity (MMR algorithm)
- **Personalization** - User-specific ranking based on history
- **Feedback Loop** - Click/conversion tracking for model improvement
- **Feature Store** - Redis-cached pre-computed features

## Architecture

```
Ranking Service
├── API Server (Node.js)           # Ranking requests (<50ms)
├── Feature Store (Redis)          # Pre-computed features
├── ML Model (Python/LightGBM)      # LambdaMART ranking
├── A/B Tester                     # Experiment management
└── Analytics (MongoDB)           # Click-through tracking
```

## Quick Start

```bash
# Install dependencies
npm install

# Install Python ML dependencies
cd python && pip install -r requirements.txt && cd ..

# Configure environment
cp .env.example .env

# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Ranking

```bash
# Rank items
POST /rank
{
  "experimentId": "exp_123",
  "userId": "user_456",
  "context": {
    "location": "mumbai",
    "device": "mobile"
  },
  "items": [
    { "id": "item_1", "type": "product", "score": 0.8, "features": { "price": 100, "rating": 4.5 } },
    { "id": "item_2", "type": "product", "score": 0.6, "features": { "price": 50, "rating": 4.2 } }
  ],
  "options": {
    "limit": 10,
    "diversity": 0.3,
    "personalization": 0.5
  }
}

# Batch ranking
POST /rank/batch
{
  "requests": [/* multiple rank requests */]
}

# Get experiment results
GET /rank/:experimentId/results
```

### Experiments (A/B Testing)

```bash
# Create experiment
POST /experiments
{
  "name": "homepage_ranking_v2",
  "description": "Test new ranking algorithm",
  "arms": [
    { "id": "control", "traffic": 50, "config": { "model": "default" } },
    { "id": "treatment", "traffic": 50, "config": { "model": "lambdamart" } }
  ],
  "metric": "click_through_rate",
  "minSampleSize": 1000
}

# Get experiment stats
GET /experiments/:id/stats

# Stop experiment
DELETE /experiments/:id
```

### Feedback

```bash
# Log click
POST /rank/feedback
{
  "experimentId": "exp_123",
  "userId": "user_456",
  "itemId": "item_1",
  "action": "click",
  "position": 3,
  "timestamp": "2024-01-15T10:30:00Z"
}

# Log conversion
POST /rank/feedback
{
  "experimentId": "exp_123",
  "userId": "user_456",
  "itemId": "item_1",
  "action": "conversion",
  "value": 99.99
}
```

### Features

```bash
# Get entity features
GET /features/:entityId

# Update features
POST /features
{
  "entityId": "item_1",
  "type": "product",
  "features": {
    "popularity": 0.8,
    "recency": 0.6,
    "quality": 4.5,
    "price": 100
  }
}
```

## Ranking Signals

| Signal | Weight | Description |
|--------|--------|-------------|
| **Relevance** | 0.25 | Text/semantic match |
| **Popularity** | 0.25 | Views, purchases, ratings |
| **Recency** | 0.20 | Time since update |
| **Quality** | 0.15 | Average rating, reviews |
| **Trending** | 0.10 | Time-decay velocity |
| **Personalization** | Variable | User affinity score |

## ML Model: LambdaMART

The service uses LambdaMART (Listwise Learning to Rank) implemented with LightGBM:

```python
# Features for ranking:
# - TF-IDF similarity
# - BM25 score
# - Popularity signal
# - Recency signal
# - User-item affinity
# - Diversity score

# Training: LambdaMART with gradient boosting
# Inference: Score items and sort by predicted relevance
```

## A/B Testing

### Multi-armed Bandit

Automatically allocates traffic to better-performing arms:

```typescript
interface ExperimentArm {
  id: string;
  traffic: number;        // Traffic percentage
  config: Record<string, unknown>;
  impressions: number;
  conversions: number;
  ctr: number;           // Click-through rate
}
```

### Statistical Significance

- p-value < 0.05 required for winner declaration
- Minimum sample size per arm
- 95% confidence interval

## Diversity Ranking

Uses Maximum Marginal Relevance (MMR) to balance relevance and diversity:

```
MMR = α * Relevance(i) - (1-α) * Diversity(i, selected)
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5006 |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017/rez-ranking |
| `REDIS_URL` | Redis URL | redis://localhost:6379 |
| `ML_SERVICE_URL` | Python ML service URL | http://localhost:5007 |
| `NODE_ENV` | Environment | development |

## Example: Rank Restaurant Search

```bash
curl -X POST http://localhost:5006/rank \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "context": { "location": "mumbai", "time": "evening" },
    "items": [
      { "id": "rest_1", "type": "restaurant", "features": { "rating": 4.5, "distance": 2 } },
      { "id": "rest_2", "type": "restaurant", "features": { "rating": 4.2, "distance": 1 } },
      { "id": "rest_3", "type": "restaurant", "features": { "rating": 4.8, "distance": 5 } }
    ],
    "options": { "limit": 3, "diversity": 0.3 }
  }'
```

Response:
```json
{
  "ranked": [
    { "id": "rest_2", "score": 0.92, "explanation": ["Near you", "High rating"] },
    { "id": "rest_1", "score": 0.85, "explanation": ["Great rating", "Walkable"] },
    { "id": "rest_3", "score": 0.78, "explanation": ["Top rated", "Worth the trip"] }
  ],
  "latencyMs": 23
}
```

## Health Checks

```bash
curl http://localhost:5006/health
```

## License

MIT
