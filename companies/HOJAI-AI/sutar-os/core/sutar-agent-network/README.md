# SUTAR Agent Network

> **Network topology of agents with message routing between them**

**Port:** 4155
**Layer:** 3 (Intent + Network + REZ Bridge)
**Package:** `@hojai/sutar-agent-network`

## Overview

SUTAR Agent Network provides:
- Agent node registration and tracking
- Network topology with edges (peers, routes)
- Message routing between agents
- BFS pathfinding for agent-to-agent communication
- Intent-type aware routing

## Quick Start

```bash
cd sutar-os/core/sutar-agent-network
npm install
npm run dev
# Service runs on http://localhost:4155
```

## Features

| Feature | Status |
|---------|--------|
| Node registration | ✅ Implemented |
| Edge management | ✅ Implemented |
| Message routing | ✅ Implemented |
| BFS pathfinding | ✅ Implemented |
| Heartbeat tracking | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4155/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-agent-network",
  "sutarLayer": 3,
  "port": 4155,
  "counts": {
    "nodes": 4,
    "edges": 4,
    "messages": 0
  },
  "capabilities": [
    "nodes-list",
    "nodes-register",
    "nodes-heartbeat",
    "edges-add",
    "edges-list",
    "route",
    "messages-send",
    "messages-list"
  ],
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Register Node (Agent)

```bash
curl -X POST http://localhost:4155/api/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "agentId": "agent-hotel-002",
    "capabilities": ["book", "checkin", "checkout"]
  }'
```

Response:
```json
{
  "agentId": "agent-hotel-002",
  "capabilities": ["book", "checkin", "checkout"],
  "lastSeen": "2026-06-28T12:00:00.000Z",
  "status": "online"
}
```

### List All Nodes

```bash
curl http://localhost:4155/api/nodes
```

Response:
```json
{
  "count": 4,
  "nodes": [
    {
      "agentId": "agent-restaurant-001",
      "capabilities": ["transact"],
      "lastSeen": "2026-06-28T12:00:00.000Z",
      "status": "online"
    }
  ]
}
```

### Agent Heartbeat

```bash
curl -X POST http://localhost:4155/api/nodes/agent-restaurant-001/heartbeat \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "agentId": "agent-restaurant-001",
  "lastSeen": "2026-06-28T12:00:00.000Z",
  "status": "online"
}
```

### Add Edge (Connection)

```bash
curl -X POST http://localhost:4155/api/edges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "from": "agent-hotel-002",
    "to": "agent-negotiator-001",
    "type": "routes-to",
    "weight": 7
  }'
```

Response:
```json
{
  "id": "agent-hotel-002->agent-negotiator-001:routes-to",
  "from": "agent-hotel-002",
  "to": "agent-negotiator-001",
  "type": "routes-to",
  "weight": 7,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Edges

```bash
curl "http://localhost:4155/api/edges?type=routes-to"
```

Response:
```json
{
  "count": 2,
  "edges": [
    {
      "id": "agent-restaurant-001->agent-negotiator-001:routes-to",
      "from": "agent-restaurant-001",
      "to": "agent-negotiator-001",
      "type": "routes-to",
      "weight": 8
    }
  ]
}
```

### Find Route Between Agents

```bash
curl -X POST http://localhost:4155/api/route \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "from": "agent-restaurant-001",
    "to": "agent-negotiator-001",
    "intentType": "negotiate_price"
  }'
```

Response:
```json
{
  "from": "agent-restaurant-001",
  "to": "agent-negotiator-001",
  "intentType": "negotiate_price",
  "hops": [
    {
      "from": "agent-restaurant-001",
      "to": "agent-negotiator-001",
      "type": "routes-to",
      "weight": 8
    }
  ],
  "totalWeight": 8
}
```

### Send Message Between Agents

```bash
curl -X POST http://localhost:4155/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "from": "agent-restaurant-001",
    "to": "agent-negotiator-001",
    "intentType": "negotiate_price",
    "payload": {
      "item": "vegetables",
      "quantity": 100,
      "targetPrice": 500
    }
  }'
```

Response:
```json
{
  "id": "msg_abc123",
  "from": "agent-restaurant-001",
  "to": "agent-negotiator-001",
  "intentType": "negotiate_price",
  "payload": {
    "item": "vegetables",
    "quantity": 100,
    "targetPrice": 500
  },
  "deliveredAt": "2026-06-28T12:00:00.000Z",
  "status": "delivered"
}
```

### List Messages

```bash
curl "http://localhost:4155/api/messages?from=agent-restaurant-001"
```

Response:
```json
{
  "count": 1,
  "messages": [
    {
      "id": "msg_abc123",
      "from": "agent-restaurant-001",
      "to": "agent-negotiator-001",
      "intentType": "negotiate_price",
      "deliveredAt": "2026-06-28T12:00:00.000Z",
      "status": "delivered"
    }
  ]
}
```

### Edge Types Reference

| Type | Description |
|------|-------------|
| `peers` | Peer-to-peer connection |
| `routes-to` | Message routing relationship |
| `publishes-to` | Pub/sub relationship |
| `claims-from` | Capability claim relationship |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4155 | Service port |
| `NODE_ENV` | development | Environment (development/production) |
| `INTERNAL_SERVICE_TOKEN` | - | Internal service authentication |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (auth, security, persistent-map)

---

## Integration Points

| Service | Port | Purpose |
|---------|------|---------|
| SUTAR Gateway | 4140 | API Gateway |
| SUTAR Intent Bus | 4154 | Intent routing |

---

**Last Updated:** 2026-06-28
