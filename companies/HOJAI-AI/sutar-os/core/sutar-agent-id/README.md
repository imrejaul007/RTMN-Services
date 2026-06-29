# SUTAR Agent ID

> **Agent identity registry with capability mapping and manifest resolution**

**Port:** 4145
**Layer:** 2 (Gateway + Twin + Memory + Identity)
**Package:** `@hojai/sutar-agent-id`

## Overview

SUTAR Agent ID provides:
- Agent identity registration and management
- Capability registry for agents
- Intent-to-agent manifest resolution
- Agent heartbeat and status tracking

## Quick Start

```bash
cd sutar-os/core/sutar-agent-id
npm install
npm run dev
# Service runs on http://localhost:4145
```

## Features

| Feature | Status |
|---------|--------|
| Agent registration | ✅ Implemented |
| Capability management | ✅ Implemented |
| Intent resolution | ✅ Implemented |
| Heartbeat tracking | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4145/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-agent-id",
  "sutarLayer": 2,
  "port": 4145,
  "counts": {
    "agents": 45,
    "capabilities": 189,
    "audits": 67
  },
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Register New Agent

```bash
curl -X POST http://localhost:4145/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "agentId": "agent-restaurant-001",
    "name": "Restaurant Sales Agent",
    "type": "merchant",
    "capabilities": ["negotiate", "transact", "support"],
    "metadata": {
      "industry": "restaurant",
      "region": "IN",
      "version": "1.0.0"
    }
  }'
```

Response:
```json
{
  "agentId": "agent-restaurant-001",
  "name": "Restaurant Sales Agent",
  "type": "merchant",
  "capabilities": ["negotiate", "transact", "support"],
  "status": "online",
  "registeredAt": "2026-06-28T12:00:00.000Z",
  "lastSeen": "2026-06-28T12:00:00.000Z",
  "metadata": {
    "industry": "restaurant",
    "region": "IN",
    "version": "1.0.0"
  }
}
```

### List All Agents

```bash
curl http://localhost:4145/api/agents
```

Response:
```json
{
  "count": 45,
  "agents": [
    {
      "agentId": "agent-restaurant-001",
      "name": "Restaurant Sales Agent",
      "type": "merchant",
      "status": "online",
      "capabilities": ["negotiate", "transact", "support"]
    }
  ]
}
```

### Get Agent by ID

```bash
curl http://localhost:4145/api/agents/agent-restaurant-001
```

Response:
```json
{
  "agentId": "agent-restaurant-001",
  "name": "Restaurant Sales Agent",
  "type": "merchant",
  "capabilities": ["negotiate", "transact", "support"],
  "status": "online",
  "registeredAt": "2026-06-28T12:00:00.000Z",
  "lastSeen": "2026-06-28T12:00:00.000Z",
  "metadata": {
    "industry": "restaurant",
    "region": "IN",
    "version": "1.0.0"
  }
}
```

### Add Capability to Agent

```bash
curl -X POST http://localhost:4145/api/agents/agent-restaurant-001/capabilities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "capability": "refund_processing"
  }'
```

Response:
```json
{
  "agentId": "agent-restaurant-001",
  "capability": "refund_processing",
  "addedAt": "2026-06-28T12:00:00.000Z"
}
```

### Remove Capability from Agent

```bash
curl -X DELETE http://localhost:4145/api/agents/agent-restaurant-001/capabilities/refund_processing \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "agentId": "agent-restaurant-001",
  "capability": "refund_processing",
  "removed": true,
  "removedAt": "2026-06-28T12:00:00.000Z"
}
```

### Find Agents for Intent (Manifest Resolution)

```bash
curl -X POST http://localhost:4145/api/manifest/agents-for-intent \
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
  "matchingAgents": [
    {
      "agentId": "agent-restaurant-001",
      "name": "Restaurant Sales Agent",
      "matchScore": 0.92,
      "capabilities": ["negotiate", "transact", "support"],
      "status": "online"
    }
  ],
  "recommendedAgent": "agent-restaurant-001"
}
```

### View Audit Log

```bash
curl http://localhost:4145/api/audit
```

Response:
```json
{
  "total": 67,
  "returned": 67,
  "events": [
    {
      "id": "audit_xyz789",
      "timestamp": "2026-06-28T12:00:00.000Z",
      "action": "agent_registered",
      "actor": "system",
      "resource": "sutar-agent-id",
      "outcome": "success"
    }
  ]
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4145 | Service port |
| `NODE_ENV` | development | Environment (development/production) |
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
| SUTAR Twin OS | 4142 | Twin management |

---

**Last Updated:** 2026-06-28
