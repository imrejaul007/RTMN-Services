# SUTAR Network Learning

> **Learning from agent network outcomes and optimizing strategies over time**

**Port:** 4243
**Layer:** 4 (Decision + Execution)
**Package:** `@hojai/sutar-network-learning`

## Overview

SUTAR Network Learning provides:
- Outcome recording from agent operations
- Strategy performance tracking
- Insight generation from success/failure patterns
- Performance analytics and reporting

## Quick Start

```bash
cd sutar-os/core/sutar-network-learning
npm install
npm run dev
# Service runs on http://localhost:4243
```

## Features

| Feature | Status |
|---------|--------|
| Outcome recording | ✅ Implemented |
| Strategy tracking | ✅ Implemented |
| Insight generation | ✅ Implemented |
| Performance analytics | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4243/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-network-learning",
  "port": 4243,
  "layer": "Decision + Execution",
  "outcomes": 567,
  "strategies": 12,
  "insights": 34,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Record Outcome

```bash
curl -X POST http://localhost:4243/api/outcomes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "context": {
      "industry": "restaurant",
      "urgency": "normal",
      "season": "summer"
    },
    "strategy": "collaborative_approach",
    "actions": ["initial_offer", "counter_offer", "final_agreement"],
    "result": "success",
    "value": 15000,
    "success": true,
    "duration": 3600000,
    "agentId": "agent-restaurant-001",
    "negotiationType": "price",
    "counterpartType": "supplier"
  }'
```

Response:
```json
{
  "outcomeId": "out_abc123",
  "insight": {
    "id": "ins_xyz789",
    "type": "success_pattern",
    "strategy": "collaborative_approach",
    "pattern": ["extended_negotiation"],
    "confidence": 0.85,
    "basedOn": 1
  }
}
```

### List Outcomes

```bash
curl "http://localhost:4243/api/outcomes?strategy=collaborative_approach&success=true&limit=10"
```

Response:
```json
{
  "total": 567,
  "returned": 10,
  "outcomes": [
    {
      "id": "out_abc123",
      "strategy": "collaborative_approach",
      "result": "success",
      "value": 15000,
      "success": true,
      "duration": 3600000,
      "timestamp": "2026-06-28T12:00:00.000Z"
    }
  ]
}
```

### Get Insights

```bash
curl "http://localhost:4243/api/insights?minConfidence=0.7"
```

Response:
```json
{
  "total": 34,
  "returned": 15,
  "insights": [
    {
      "id": "ins_xyz789",
      "type": "success_pattern",
      "strategy": "collaborative_approach",
      "pattern": ["extended_negotiation"],
      "recommendation": "Continue using strategy collaborative_approach — positive outcome in restaurant context",
      "confidence": 0.85,
      "basedOn": 12
    }
  ]
}
```

### Get Optimized Strategies

```bash
curl "http://localhost:4243/api/strategies?limit=10"
```

Response:
```json
{
  "total": 8,
  "strategies": [
    {
      "id": "collaborative_approach",
      "attempts": 45,
      "successes": 38,
      "successRate": 0.844,
      "totalValue": 567000,
      "avgValue": 12600,
      "avgDuration": 2880000,
      "contexts": ["restaurant", "retail"],
      "score": 0.82
    }
  ]
}
```

### Register Strategy

```bash
curl -X POST http://localhost:4243/api/strategies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "competitive_bidding",
    "description": "Use competitive bidding to get best price"
  }'
```

Response:
```json
{
  "id": "strat_xyz789",
  "name": "competitive_bidding",
  "description": "Use competitive bidding to get best price",
  "attempts": 0,
  "successes": 0,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### Get Performance Analytics

```bash
curl "http://localhost:4243/api/performance?since=2026-06-01T00:00:00.000Z"
```

Response:
```json
{
  "period": "since 2026-06-01T00:00:00.000Z",
  "totalOutcomes": 156,
  "successRate": "78.21%",
  "totalValue": 2340000,
  "avgValue": 15000,
  "avgDurationMs": 3240000,
  "strategies": [
    {
      "id": "collaborative_approach",
      "successRate": "84.44%",
      "avgValue": 12600,
      "attempts": 45
    }
  ]
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LEARNING_PORT` | 4243 | Service port |
| `NODE_ENV` | development | Environment (development/production) |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (security)

---

**Last Updated:** 2026-06-28
