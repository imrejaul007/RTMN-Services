# HOJAI Cost Tracker

> **Port:** 4410
> **Version:** 1.0.0
> **Status:** ✅ Built (2026-06-25)

AI usage metering and billing API for HOJAI Cloud.

---

## Quick Start

```bash
cd services/cost-tracker
npm install
npm start        # Port 4410
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/usage` | Track AI usage |
| `GET` | `/api/v1/usage` | Get usage records |
| `GET` | `/api/v1/usage/summary` | Get aggregated summary |
| `POST` | `/api/v1/budgets` | Set monthly budget |
| `GET` | `/api/v1/budgets/:userId` | Get budget |
| `POST` | `/api/v1/alerts` | Create alert |
| `GET` | `/api/v1/alerts/:userId` | List alerts |
| `DELETE` | `/api/v1/alerts/:id` | Delete alert |
| `GET` | `/api/v1/pricing` | Get current pricing |
| `GET` | `/api/v1/stats` | Platform statistics |

## Pricing (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| GPT-4 | $30 | $60 |
| GPT-4-Turbo | $10 | $30 |
| GPT-3.5-Turbo | $0.50 | $1.50 |
| Claude-3-Opus | $15 | $75 |
| Claude-3-Sonnet | $3 | $15 |
| Claude-3-Haiku | $0.25 | $1.25 |

## Usage Example

```bash
# Track usage
curl -X POST http://localhost:4410/api/v1/usage \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user1",
    "projectId": "proj1",
    "model": "gpt-4",
    "inputTokens": 1000,
    "outputTokens": 500
  }'

# Get summary
curl http://localhost:4410/api/v1/usage/summary?userId=user1

# Set budget
curl -X POST http://localhost:4410/api/v1/budgets \
  -d '{"userId": "user1", "monthlyLimit": 1000, "alertThreshold": 80}'
```

## Related Services

- **HOJAI Cloud** (:4380) — Uses cost tracking
- **AI Studio UI** (:3000) — Dashboard
