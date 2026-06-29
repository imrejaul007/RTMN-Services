# SUTAR Intent Bus

> **Pub/Sub bus for agent intent communication and pattern matching**

**Port:** 4154
**Layer:** 3 (Intent + Network + REZ Bridge)
**Package:** `@hojai/sutar-intent-bus`

## Overview

SUTAR Intent Bus provides:
- Intent message publishing and subscription
- Pattern-based filtering (action, source, target, tags)
- Wildcard pattern matching
- TTL-based message expiration
- Correlation ID for request/response

## Quick Start

```bash
cd sutar-os/core/sutar-intent-bus
npm install
npm run dev
# Service runs on http://localhost:4154
```

## Features

| Feature | Status |
|---------|--------|
| Intent publishing | ✅ Implemented |
| Subscription management | ✅ Implemented |
| Pattern matching | ✅ Implemented |
| Wildcard support | ✅ Implemented |
| TTL expiration | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4154/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-intent-bus",
  "port": 4154,
  "layer": "Intent + Network",
  "intents": 156,
  "subscriptions": 23,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Publish Intent

```bash
curl -X POST http://localhost:4154/api/intents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "action": "negotiate_price",
    "source": "agent-restaurant-001",
    "target": "agent-supplier-001",
    "priority": "high",
    "payload": {
      "item": "vegetables",
      "quantity": 100,
      "currentPrice": 600,
      "targetPrice": 500
    },
    "tags": ["negotiation", "supplies"],
    "ttl": 3600
  }'
```

Response:
```json
{
  "intent": {
    "intentId": "intent_abc123",
    "action": "negotiate_price",
    "source": "agent-restaurant-001",
    "target": "agent-supplier-001",
    "priority": "high",
    "payload": {
      "item": "vegetables",
      "quantity": 100,
      "currentPrice": 600,
      "targetPrice": 500
    },
    "tags": ["negotiation", "supplies"],
    "timestamp": "2026-06-28T12:00:00.000Z",
    "ttl": 3600,
    "correlationId": null,
    "replyTo": null
  },
  "delivered": 3
}
```

### List Intents

```bash
curl "http://localhost:4154/api/intents?source=agent-restaurant-001&limit=10"
```

Response:
```json
{
  "total": 156,
  "returned": 10,
  "intents": [
    {
      "intentId": "intent_abc123",
      "action": "negotiate_price",
      "source": "agent-restaurant-001",
      "target": "agent-supplier-001",
      "priority": "high",
      "timestamp": "2026-06-28T12:00:00.000Z",
      "ttl": 3600
    }
  ]
}
```

### Create Subscription

```bash
curl -X POST http://localhost:4154/api/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "pattern": "action:negotiate_*",
    "subscriberId": "agent-accounting-001",
    "callbackUrl": "http://localhost:5000/webhook",
    "description": "Get notified of all negotiation intents"
  }'
```

Response:
```json
{
  "id": "sub_abc123",
  "pattern": "action:negotiate_*",
  "subscriberId": "agent-accounting-001",
  "callbackUrl": "http://localhost:5000/webhook",
  "description": "Get notified of all negotiation intents",
  "createdAt": "2026-06-28T12:00:00.000Z",
  "active": true,
  "matchedCount": 0,
  "lastMatchedAt": null
}
```

### List Subscriptions

```bash
curl "http://localhost:4154/api/subscriptions?active=true"
```

Response:
```json
{
  "total": 23,
  "returned": 23,
  "subscriptions": [
    {
      "id": "sub_abc123",
      "pattern": "action:negotiate_*",
      "subscriberId": "agent-accounting-001",
      "active": true,
      "matchedCount": 5,
      "lastMatchedAt": "2026-06-28T12:00:00.000Z"
    }
  ]
}
```

### Cancel Subscription

```bash
curl -X DELETE http://localhost:4154/api/subscriptions/sub_abc123 \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "sub_abc123",
  "status": "cancelled"
}
```

### Get Bus Status

```bash
curl http://localhost:4154/api/bus/status
```

Response:
```json
{
  "service": "sutar-intent-bus",
  "status": "healthy",
  "totalIntents": 156,
  "recentIntentsLastMin": 12,
  "totalSubscriptions": 23,
  "activeSubscriptions": 20
}
```

### Pattern Syntax Reference

| Pattern | Matches |
|---------|---------|
| `*` | All intents |
| `negotiate_price` | Exact action match |
| `action:negotiate_*` | Action prefix wildcard |
| `source:agent-restaurant*` | Source prefix wildcard |
| `tag:urgent` | Tag inclusion |
| `tag:*pricing*` | Tag wildcard |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INTENT_BUS_PORT` | 4154 | Service port |
| `NODE_ENV` | development | Environment (development/production) |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (security)

---

**Last Updated:** 2026-06-28
