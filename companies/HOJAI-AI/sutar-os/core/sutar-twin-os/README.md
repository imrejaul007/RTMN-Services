# SUTAR Twin OS

> **Composite digital twin management for autonomous agents and entities**

**Port:** 4142
**Layer:** 2 (Gateway + Twin + Memory + Identity)
**Package:** `@hojai/sutar-twin-os`

## Overview

SUTAR Twin OS provides:
- Composite twin creation spanning multiple twin services
- SUTAR capability tagging
- Intent-aware twin resolution
- Twin-to-TwinOS Hub proxy

## Quick Start

```bash
cd sutar-os/core/sutar-twin-os
npm install
npm run dev
# Service runs on http://localhost:4142
```

## Features

| Feature | Status |
|---------|--------|
| Twin creation | ✅ Implemented |
| Capability tagging | ✅ Implemented |
| Intent resolution | ✅ Implemented |
| TwinOS Hub proxy | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4142/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-twin-os",
  "sutarLayer": 2,
  "port": 4142,
  "counts": {
    "twins": 67,
    "tags": 234,
    "audits": 89
  },
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Readiness Probe

```bash
curl http://localhost:4142/ready
```

Response:
```json
{
  "ready": true,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Create Composite Twin

```bash
curl -X POST http://localhost:4142/api/twins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "sutarId": "sutar_abc123",
    "name": "Restaurant Agent Twin",
    "twinServices": ["customer-twin", "order-twin", "inventory-twin"],
    "capabilities": ["negotiate", "fulfill", "support"]
  }'
```

Response:
```json
{
  "id": "twin_composite_xyz789",
  "sutarId": "sutar_abc123",
  "name": "Restaurant Agent Twin",
  "twinServices": ["customer-twin", "order-twin", "inventory-twin"],
  "capabilities": ["negotiate", "fulfill", "support"],
  "tags": [],
  "createdAt": "2026-06-28T12:00:00.000Z",
  "status": "active"
}
```

### List All Twins

```bash
curl http://localhost:4142/api/twins
```

Response:
```json
{
  "count": 67,
  "twins": [
    {
      "id": "twin_composite_xyz789",
      "sutarId": "sutar_abc123",
      "name": "Restaurant Agent Twin",
      "status": "active",
      "capabilities": ["negotiate", "fulfill", "support"]
    }
  ]
}
```

### Get Twin by ID

```bash
curl http://localhost:4142/api/twins/twin_composite_xyz789
```

Response:
```json
{
  "id": "twin_composite_xyz789",
  "sutarId": "sutar_abc123",
  "name": "Restaurant Agent Twin",
  "twinServices": ["customer-twin", "order-twin", "inventory-twin"],
  "capabilities": ["negotiate", "fulfill", "support"],
  "tags": [
    { "tag": "restaurant", "addedAt": "2026-06-28T12:00:00.000Z" }
  ],
  "services": {
    "customer-twin": { "status": "synced", "lastUpdate": "2026-06-28T12:00:00.000Z" },
    "order-twin": { "status": "synced", "lastUpdate": "2026-06-28T12:00:00.000Z" },
    "inventory-twin": { "status": "synced", "lastUpdate": "2026-06-28T12:00:00.000Z" }
  },
  "createdAt": "2026-06-28T12:00:00.000Z",
  "status": "active"
}
```

### Add Capability Tag

```bash
curl -X POST http://localhost:4142/api/twins/twin_composite_xyz789/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "tag": "premium_seller"
  }'
```

Response:
```json
{
  "tag": "premium_seller",
  "addedAt": "2026-06-28T12:00:00.000Z",
  "addedBy": "sutar_admin"
}
```

### Remove Capability Tag

```bash
curl -X DELETE http://localhost:4142/api/twins/twin_composite_xyz789/tags/premium_seller \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "tag": "premium_seller",
  "removed": true,
  "removedAt": "2026-06-28T12:00:00.000Z"
}
```

### Intent-Aware Twin Resolution

```bash
curl -X POST http://localhost:4142/api/twins/resolve-for-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "intent": "negotiate_contract",
    "context": {
      "dealType": "bulk_order",
      "value": 50000
    }
  }'
```

Response:
```json
{
  "intent": "negotiate_contract",
  "resolvedTwins": [
    {
      "id": "twin_composite_xyz789",
      "name": "Restaurant Agent Twin",
      "matchScore": 0.92,
      "capabilities": ["negotiate", "fulfill"],
      "tags": ["restaurant", "premium_seller"]
    }
  ],
  "recommendedTwin": "twin_composite_xyz789",
  "fallbackTwin": "twin_composite_abc456"
}
```

### Proxy to TwinOS Hub

```bash
curl http://localhost:4142/api/twinos/proxy/twin-001
```

Response:
```json
{
  "twinId": "twin-001",
  "type": "customer",
  "status": "synced",
  "data": {
    "customerId": "cust_abc123",
    "ltv": 15000,
    "segment": "premium"
  }
}
```

### View Audit Log

```bash
curl http://localhost:4142/api/audit
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
      "action": "twin_created",
      "actor": "system",
      "resource": "sutar-twin-os",
      "outcome": "success"
    }
  ]
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4142 | Service port |
| `NODE_ENV` | development | Environment (development/production) |
| `TWINOS_HUB_URL` | http://localhost:4705 | TwinOS Hub URL |
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
| TwinOS Hub | 4705 | Twin management |

---

**Last Updated:** 2026-06-28
