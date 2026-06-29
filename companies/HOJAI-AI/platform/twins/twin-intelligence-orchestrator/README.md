# TwinOS Intelligence Orchestrator
**Port: 4715**

> Unified orchestration layer connecting all intelligence services to TwinOS Hub.

---

## Overview

The Intelligence Orchestrator is the central brain of TwinOS, coordinating:

- **Reasoning** - Cross-twin reasoning and explanations
- **Prediction** - Future state and outcome predictions  
- **Behavior** - Pattern learning and personality modeling
- **Learning** - Continuous improvement from outcomes

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                Intelligence Orchestrator (4715)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │Reasoning│  │Prediction│  │ Behavior │  │ Learning │     │
│  │ Engine  │  │  Engine  │  │  Model   │  │   Loop   │     │
│  │ :4716   │  │  :4719   │  │  :4718   │  │  :4735   │     │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │             │             │             │             │
│       └────────────┴──────┬────┴────────────┘             │
│                            │                                │
│                            ▼                                │
│                   ┌────────────────┐                        │
│                   │  Orchestrator  │                        │
│                   │   Core Logic   │                        │
│                   └────────┬───────┘                        │
│                            │                                │
│       ┌────────────────────┼────────────────────┐          │
│       │                    │                    │          │
│       ▼                    ▼                    ▼          │
│  ┌─────────┐      ┌───────────┐      ┌──────────┐     │
│  │TwinOS   │      │  Memory   │      │   Twin   │     │
│  │  Hub    │      │    OS     │      │ Observer │     │
│  │ :4705   │      │  :4703    │      │  :4747   │     │
│  └─────────┘      └───────────┘      └──────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/orchestrator/analyze` | Full twin analysis |
| `GET` | `/api/orchestrator/analysis/:twinId` | Get cached analysis |
| `POST` | `/api/orchestrator/reason` | Cross-twin reasoning |
| `POST` | `/api/orchestrator/learn` | Record learning |
| `POST` | `/api/orchestrator/predict` | Generate predictions |

### Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/orchestrator/services` | Service health status |
| `DELETE` | `/api/orchestrator/cache/:twinId` | Clear twin cache |
| `DELETE` | `/api/orchestrator/cache` | Clear all cache |
| `GET` | `/health` | Service health |
| `GET` | `/ready` | Readiness check |

---

## Usage Examples

### Analyze a Twin

```bash
curl -X POST http://localhost:4715/api/orchestrator/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "twinId": "customer-123",
    "config": {
      "analysisDepth": "comprehensive",
      "includePredictions": true
    }
  }'
```

Response:
```json
{
  "success": true,
  "analysis": {
    "twinId": "customer-123",
    "summary": "High-value customer. Low churn risk (15%). 3 actionable recommendations.",
    "intelligence": {
      "behavior": {
        "patterns": ["prefers_email", "weekend_shopper"],
        "preferences": {"channel": "email"},
        "strengths": ["loyal"],
        "weaknesses": []
      },
      "predictions": {
        "churnRisk": 0.15,
        "ltvScore": 12500,
        "confidence": 0.87
      },
      "reasoning": {...},
      "learning": {...}
    },
    "recommendations": [
      {
        "type": "opportunity",
        "priority": "high",
        "title": "VIP Program",
        "actions": [...]
      }
    ],
    "confidence": 0.82
  }
}
```

### Cross-Twin Reasoning

```bash
curl -X POST http://localhost:4715/api/orchestrator/reason \
  -H "Content-Type: application/json" \
  -d '{
    "twins": ["customer-123", "order-456", "merchant-789"],
    "query": "Why did this customer churn?"
  }'
```

### Record Learning

```bash
curl -X POST http://localhost:4715/api/orchestrator/learn \
  -H "Content-Type: application/json" \
  -d '{
    "twinId": "employee-123",
    "outcome": "promotion",
    "event": "performance_review"
  }'
```

---

## Configuration

```bash
# Service URLs
TWIN_HUB_URL=http://localhost:4705
MEMORY_OS_URL=http://localhost:4703
REASONING_ENGINE_URL=http://localhost:4716
PREDICTION_ENGINE_URL=http://localhost:4719
BEHAVIOR_MODEL_URL=http://localhost:4718
TWIN_LEARNING_URL=http://localhost:4735

# Server
PORT=4715
CORS_ORIGIN=*
```

---

## Running

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode
npm run dev

# Run tests
npm test

# With coverage
npm run test:coverage
```

---

## Testing

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| TwinOS Hub | 4705 | Twin registry |
| MemoryOS | 4703 | Memory layer |
| Reasoning Engine | 4716 | Cross-twin reasoning |
| Prediction Engine | 4719 | Future predictions |
| Behavior Model | 4718 | Pattern learning |
| Twin Learning | 4735 | Learning loop |

---

## License

MIT - HOJAI AI
