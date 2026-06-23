# Phase 1: API Reference

**Status:** Planned
**Last Updated:** 2026-06-22

---

## Inference Gateway API (Port 4294)

### POST /api/complete

Complete a prompt using the specified model.

**Request:**
```http
POST /api/complete HTTP/1.1
Host: localhost:4294
Authorization: Bearer <jwt-token>
Content-Type: application/json
X-Tenant-Id: tenant-1
X-User-Id: user-1
X-Feature: chat

{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "What is the capital of France?" }
  ],
  "temperature": 0.7,
  "maxTokens": 1000,
  "topP": 1.0,
  "stream": false
}
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | string | No | Model ID (e.g., "gpt-4o-mini", "claude-3-5-sonnet"). If omitted, uses 7-step filter. |
| `messages` | array | Yes | Array of message objects |
| `messages[].role` | string | Yes | "system", "user", or "assistant" |
| `messages[].content` | string | Yes | Message content |
| `temperature` | number | No | Sampling temperature (0.0–2.0). Default: 0.7 |
| `maxTokens` | number | No | Max output tokens. Default: 2000 |
| `topP` | number | No | Nucleus sampling (0.0–1.0). Default: 1.0 |
| `stream` | boolean | No | Enable streaming. Default: false |

**Response (Success):**
```json
{
  "content": "The capital of France is Paris.",
  "model": "gpt-4o-mini",
  "provider": "openai",
  "inputTokens": 25,
  "outputTokens": 8,
  "totalTokens": 33,
  "costUsd": 0.00000855,
  "latencyMs": 850,
  "finishReason": "stop",
  "requestId": "req-123"
}
```

**Response Fields:**

| Field | Type | Description |
|---|---|---|
| `content` | string | Generated text |
| `model` | string | Model used |
| `provider` | string | Provider name (openai, anthropic, google, mistral, hojai) |
| `inputTokens` | number | Input token count |
| `outputTokens` | number | Output token count |
| `totalTokens` | number | Total tokens |
| `costUsd` | number | Cost in USD |
| `latencyMs` | number | Latency in milliseconds |
| `finishReason` | string | "stop", "length", "content_filter" |
| `requestId` | string | Unique request ID |

**Response (Error):**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "retryAfter": 60
}
```

**Status Codes:**

| Code | Description |
|---|---|
| 200 | Success |
| 400 | Invalid request (missing fields, invalid params) |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (insufficient permissions) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable (all providers down) |

---

### POST /api/complete (Streaming)

**Request:**
```http
POST /api/complete HTTP/1.1
Host: localhost:4294
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "model": "gpt-4o-mini",
  "messages": [{ "role": "user", "content": "Count to 10" }],
  "stream": true
}
```

**Response (Server-Sent Events):**
```
event: chunk
data: {"content":"1","finishReason":null}

event: chunk
data: {"content":",","finishReason":null}

event: chunk
data: {"content":" 2","finishReason":null}

...

event: done
data: {"totalTokens":15,"costUsd":0.00001,"latencyMs":1200}
```

---

### GET /api/models

List all available models.

**Request:**
```http
GET /api/models HTTP/1.1
Host: localhost:4294
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "models": [
    {
      "id": "gpt-4o",
      "provider": "openai",
      "capabilities": ["chat", "vision", "function_calling"],
      "contextWindow": 128000,
      "inputCostPer1K": 0.0025,
      "outputCostPer1K": 0.01,
      "avgLatencyMs": 1200
    },
    {
      "id": "gpt-4o-mini",
      "provider": "openai",
      "capabilities": ["chat", "vision", "function_calling"],
      "contextWindow": 128000,
      "inputCostPer1K": 0.00015,
      "outputCostPer1K": 0.0006,
      "avgLatencyMs": 800
    },
    {
      "id": "claude-3-5-sonnet",
      "provider": "anthropic",
      "capabilities": ["chat", "vision"],
      "contextWindow": 200000,
      "inputCostPer1K": 0.003,
      "outputCostPer1K": 0.015,
      "avgLatencyMs": 1500
    }
  ]
}
```

---

### GET /api/stats

Get inference gateway statistics.

**Request:**
```http
GET /api/stats HTTP/1.1
Host: localhost:4294
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "totalRequests": 12345,
  "totalCostUsd": 12.34,
  "totalTokens": 1234567,
  "avgLatencyMs": 950,
  "errorRate": 0.02,
  "byProvider": {
    "openai": {
      "requests": 8000,
      "costUsd": 8.00,
      "avgLatencyMs": 900
    },
    "anthropic": {
      "requests": 4000,
      "costUsd": 4.00,
      "avgLatencyMs": 1100
    },
    "google": {
      "requests": 345,
      "costUsd": 0.34,
      "avgLatencyMs": 700
    }
  },
  "byModel": {
    "gpt-4o-mini": {
      "requests": 10000,
      "costUsd": 5.00,
      "avgLatencyMs": 800
    },
    "claude-3-5-sonnet": {
      "requests": 2345,
      "costUsd": 7.34,
      "avgLatencyMs": 1500
    }
  }
}
```

---

### GET /health

Health check endpoint.

**Request:**
```http
GET /health HTTP/1.1
Host: localhost:4294
```

**Response:**
```json
{
  "status": "healthy",
  "service": "inference-gateway",
  "port": 4294,
  "providers": {
    "openai": "healthy",
    "anthropic": "healthy",
    "google": "healthy",
    "mistral": "healthy",
    "hojai": "healthy"
  },
  "uptime": 3600,
  "version": "1.0.0"
}
```

---

## Billing Service API (Port 4782)

### GET /api/billing/costs/:tenantId

Get cost breakdown for a tenant.

**Request:**
```http
GET /api/billing/costs/tenant-1?startDate=2026-06-01&endDate=2026-06-30 HTTP/1.1
Host: localhost:4782
Authorization: Bearer <jwt-token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `startDate` | string | No | Start date (ISO 8601). Default: 30 days ago |
| `endDate` | string | No | End date (ISO 8601). Default: now |

**Response:**
```json
{
  "tenantId": "tenant-1",
  "period": {
    "startDate": "2026-06-01",
    "endDate": "2026-06-30"
  },
  "totalCost": 125.50,
  "totalTokens": 1250000,
  "totalRequests": 5000,
  "byModel": {
    "gpt-4o-mini": {
      "cost": 50.00,
      "tokens": 500000,
      "requests": 2000
    },
    "claude-3-5-sonnet": {
      "cost": 75.50,
      "tokens": 750000,
      "requests": 3000
    }
  },
  "byProvider": {
    "openai": {
      "cost": 50.00,
      "tokens": 500000,
      "requests": 2000
    },
    "anthropic": {
      "cost": 75.50,
      "tokens": 750000,
      "requests": 3000
    }
  },
  "byFeature": {
    "chat": {
      "cost": 80.00,
      "tokens": 800000,
      "requests": 3200
    },
    "summarization": {
      "cost": 45.50,
      "tokens": 450000,
      "requests": 1800
    }
  },
  "byDay": {
    "2026-06-01": {
      "cost": 4.20,
      "tokens": 42000,
      "requests": 168
    },
    "2026-06-02": {
      "cost": 5.10,
      "tokens": 51000,
      "requests": 204
    }
  }
}
```

---

### GET /api/billing/budgets/:tenantId

Get budget configuration for a tenant.

**Request:**
```http
GET /api/billing/budgets/tenant-1 HTTP/1.1
Host: localhost:4782
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "tenantId": "tenant-1",
  "monthlyBudget": 1000.00,
  "alertThreshold": 0.8,
  "currentSpend": 750.00,
  "utilization": 0.75,
  "alertSent": false,
  "createdAt": "2026-06-01T00:00:00Z"
}
```

---

### POST /api/billing/budgets/:tenantId

Set budget configuration for a tenant.

**Request:**
```http
POST /api/billing/budgets/tenant-1 HTTP/1.1
Host: localhost:4782
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "monthlyBudget": 1000.00,
  "alertThreshold": 0.8
}
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `monthlyBudget` | number | Yes | Monthly budget in USD |
| `alertThreshold` | number | No | Alert threshold (0.0–1.0). Default: 0.8 |

**Response:**
```json
{
  "success": true,
  "tenantId": "tenant-1",
  "monthlyBudget": 1000.00,
  "alertThreshold": 0.8
}
```

---

### POST /api/billing/invoices/:tenantId

Generate and send invoice for a tenant.

**Request:**
```http
POST /api/billing/invoices/tenant-1 HTTP/1.1
Host: localhost:4782
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "period": "2026-06"
}
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `period` | string | Yes | Billing period (YYYY-MM) |

**Response:**
```json
{
  "invoiceId": "inv_123",
  "tenantId": "tenant-1",
  "period": "2026-06",
  "totalCost": 125.50,
  "totalTokens": 1250000,
  "totalRequests": 5000,
  "stripeInvoiceId": "in_123",
  "status": "sent",
  "dueDate": "2026-07-30",
  "createdAt": "2026-07-01T00:00:00Z"
}
```

---

### POST /api/billing/stripe/webhook

Stripe webhook handler.

**Request:**
```http
POST /api/billing/stripe/webhook HTTP/1.1
Host: localhost:4782
Stripe-Signature: <signature>

{
  "type": "invoice.paid",
  "data": {
    "object": {
      "metadata": {
        "tenantId": "tenant-1",
        "period": "2026-06"
      }
    }
  }
}
```

**Response:**
```json
{
  "received": true
}
```

---

## Error Codes

### Common Error Codes

| Code | Description | HTTP Status |
|---|---|---|
| `INVALID_REQUEST` | Missing or invalid fields | 400 |
| `UNAUTHORIZED` | Missing or invalid JWT | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `RATE_LIMIT` | Rate limit exceeded | 429 |
| `INTERNAL_ERROR` | Internal server error | 500 |
| `SERVICE_UNAVAILABLE` | All providers down | 503 |
| `PROVIDER_ERROR` | Provider API error | 502 |
| `TIMEOUT` | Request timeout | 504 |

### Provider-Specific Errors

| Code | Description | Action |
|---|---|---|
| `OPENAI_RATE_LIMIT` | OpenAI rate limit hit | Retry with backoff |
| `OPENAI_INVALID_KEY` | Invalid OpenAI API key | Check env vars |
| `OPENAI_QUOTA_EXCEEDED` | OpenAI quota exceeded | Check billing |
| `ANTHROPIC_RATE_LIMIT` | Anthropic rate limit hit | Retry with backoff |
| `ANTHROPIC_INVALID_KEY` | Invalid Anthropic API key | Check env vars |
| `GOOGLE_QUOTA_EXCEEDED` | Google quota exceeded | Check billing |

---

## Rate Limits

### Default Limits

| Scope | Limit |
|---|---|
| Per user | 100 requests/minute |
| Per user (burst) | 200 requests/minute |
| Per tenant | 10,000 requests/minute |
| Per IP | 1,000 requests/minute |

### Cost Limits

| Scope | Limit |
|---|---|
| Per request | $10.00 |
| Per user (daily) | $100.00 |
| Per tenant (monthly) | Configurable |

---

## Examples

### cURL Examples

**Basic completion:**
```bash
curl -X POST http://localhost:4294/api/complete \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant-1" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Streaming completion:**
```bash
curl -X POST http://localhost:4294/api/complete \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet",
    "messages": [{"role": "user", "content": "Write a poem"}],
    "stream": true
  }'
```

**Get costs:**
```bash
curl http://localhost:4782/api/billing/costs/tenant-1 \
  -H "Authorization: Bearer <jwt-token>"
```

**Set budget:**
```bash
curl -X POST http://localhost:4782/api/billing/budgets/tenant-1 \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyBudget": 1000,
    "alertThreshold": 0.8
  }'
```

### JavaScript Examples

**Basic usage:**
```javascript
import { HojaiClient } from '@hojai/sdk';

const client = new HojaiClient({
  apiKey: process.env.HOJAI_API_KEY,
  tenantId: 'tenant-1'
});

const response = await client.complete({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'What is AI?' }
  ]
});

console.log(response.content);
console.log(`Cost: $${response.costUsd}`);
```

**Streaming:**
```javascript
const stream = await client.stream({
  model: 'claude-3-5-sonnet',
  messages: [{ role: 'user', content: 'Tell me a story' }]
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

**Cost tracking:**
```javascript
const costs = await client.billing.getCosts('tenant-1', {
  startDate: '2026-06-01',
  endDate: '2026-06-30'
});

console.log(`Total cost: $${costs.totalCost}`);
console.log(`Total requests: ${costs.totalRequests}`);
```

---

*API documentation: 2026-06-22*