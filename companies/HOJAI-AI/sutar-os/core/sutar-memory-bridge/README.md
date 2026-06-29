# SUTAR Memory Bridge

> **Bridge between SUTAR agents and the Memory Layer for persistent knowledge**

**Port:** 4143
**Layer:** 2 (Gateway + Twin + Memory + Identity)
**Package:** `@hojai/sutar-memory-bridge`

## Overview

SUTAR Memory Bridge provides:
- Memory remember/recall for agent twins
- Intent-tagged memory storage
- Memory OS proxy for underlying operations
- Memory analytics by intent type

## Quick Start

```bash
cd sutar-os/core/sutar-memory-bridge
npm install
npm run dev
# Service runs on http://localhost:4143
```

## Features

| Feature | Status |
|---------|--------|
| Memory remember | ✅ Implemented |
| Memory recall | ✅ Implemented |
| Intent filtering | ✅ Implemented |
| Memory OS proxy | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4143/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-memory-bridge",
  "sutarLayer": 2,
  "port": 4143,
  "counts": {
    "memories": 1234,
    "intents": 45,
    "audits": 89
  },
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Store Memory (Remember)

```bash
curl -X POST http://localhost:4143/api/memory/remember \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "twinId": "twin_composite_xyz789",
    "intentType": "negotiation_outcome",
    "content": "Successfully negotiated 15% discount with supplier ABC",
    "metadata": {
      "supplierId": "supplier-001",
      "discount": 15,
      "dealValue": 50000
    }
  }'
```

Response:
```json
{
  "id": "mem_abc123",
  "twinId": "twin_composite_xyz789",
  "intentType": "negotiation_outcome",
  "content": "Successfully negotiated 15% discount with supplier ABC",
  "metadata": {
    "supplierId": "supplier-001",
    "discount": 15,
    "dealValue": 50000
  },
  "storedAt": "2026-06-28T12:00:00.000Z",
  "tags": ["negotiation", "supplier", "discount"]
}
```

### Recall Memories

```bash
curl -X POST http://localhost:4143/api/memory/recall \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "twinId": "twin_composite_xyz789",
    "query": "supplier discounts",
    "intentType": "negotiation_outcome",
    "limit": 10
  }'
```

Response:
```json
{
  "twinId": "twin_composite_xyz789",
  "count": 3,
  "memories": [
    {
      "id": "mem_abc123",
      "intentType": "negotiation_outcome",
      "content": "Successfully negotiated 15% discount with supplier ABC",
      "metadata": {
        "supplierId": "supplier-001",
        "discount": 15
      },
      "storedAt": "2026-06-28T12:00:00.000Z",
      "relevanceScore": 0.95
    }
  ]
}
```

### Recall Memories by Intent Type

```bash
curl "http://localhost:4143/api/memory/recall-by-intent/negotiation_outcome"
```

Response:
```json
{
  "intentType": "negotiation_outcome",
  "count": 23,
  "memories": [
    {
      "id": "mem_abc123",
      "twinId": "twin_composite_xyz789",
      "content": "Successfully negotiated 15% discount with supplier ABC",
      "storedAt": "2026-06-28T12:00:00.000Z"
    }
  ]
}
```

### Delete Memory (Forget)

```bash
curl -X DELETE http://localhost:4143/api/memory/mem_abc123 \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "mem_abc123",
  "deleted": true,
  "deletedAt": "2026-06-28T12:00:00.000Z"
}
```

### List Supported Intent Types

```bash
curl http://localhost:4143/api/memory/intent-types
```

Response:
```json
{
  "count": 45,
  "intentTypes": [
    "negotiation_outcome",
    "contract_signed",
    "payment_received",
    "customer_feedback",
    "inventory_update",
    "compliance_check"
  ]
}
```

### Proxy to MemoryOS

```bash
curl "http://localhost:4143/api/memoryos/proxy/twin-001"
```

Response:
```json
{
  "twinId": "twin-001",
  "memoryPartition": "twin_001_knowledge",
  "status": "connected",
  "lastSync": "2026-06-28T12:00:00.000Z"
}
```

### View Audit Log

```bash
curl http://localhost:4143/api/audit
```

Response:
```json
{
  "total": 89,
  "returned": 89,
  "events": [
    {
      "id": "audit_xyz789",
      "timestamp": "2026-06-28T12:00:00.000Z",
      "action": "memory_stored",
      "actor": "agent-restaurant-001",
      "resource": "sutar-memory-bridge",
      "outcome": "success"
    }
  ]
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4143 | Service port |
| `NODE_ENV` | development | Environment (development/production) |
| `MEMORY_OS_URL` | http://localhost:4703 | MemoryOS URL |
| `INTERNAL_SERVICE_TOKEN` | - | Internal service authentication |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (auth, security)

---

## Integration Points

| Service | Port | Purpose |
|---------|------|---------|
| SUTAR Gateway | 4140 | API Gateway |
| MemoryOS | 4703 | Persistent memory |

---

**Last Updated:** 2026-06-28
