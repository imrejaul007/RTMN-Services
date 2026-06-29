# RuntimeOS

> **Agent lifecycle, scheduling, resource limits, scaling, and hot swaps for AI agents**

**Port:** 4860
**Package:** `@hojai/runtime-os`

## Overview

RuntimeOS provides Kubernetes-like infrastructure for AI employees:
- **Agent Lifecycle** — Create, start, stop, pause, restart agents
- **Resource Management** — CPU, memory, and token quotas per agent
- **Scheduling** — Cron-based job scheduling for agents
- **Pods** — Agent grouping with isolation levels
- **Auto-scaling** — Min/max instance scaling per pod

## Quick Start

```bash
cd platform/sutar-os/core/runtime-os
npm install
npm run dev
# Service runs on http://localhost:4860
```

---

## API Examples

### Health Check

```bash
curl http://localhost:4860/health
```

Response:
```json
{
  "status": "ok",
  "service": "runtime-os",
  "port": 4860,
  "counts": {
    "agents": 23,
    "pods": 5,
    "schedules": 12
  }
}
```

### Create Agent

```bash
curl -X POST http://localhost:4860/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "Sales Agent",
    "type": "sales",
    "config": {
      "model": "gpt-4",
      "temperature": 0.7
    },
    "podId": "pod_sales"
  }'
```

Response:
```json
{
  "id": "agent_abc123",
  "name": "Sales Agent",
  "type": "sales",
  "status": "stopped",
  "podId": "pod_sales",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Agents

```bash
curl "http://localhost:4860/api/agents?status=running&type=sales"
```

Response:
```json
{
  "count": 12,
  "agents": [
    { "id": "agent_abc123", "name": "Sales Agent", "type": "sales", "status": "running" }
  ]
}
```

### Update Agent Status

```bash
curl -X PATCH http://localhost:4860/api/agents/agent_abc123/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"status": "paused"}'
```

Response:
```json
{
  "id": "agent_abc123",
  "status": "paused",
  "updatedAt": "2026-06-28T12:00:00.000Z"
}
```

### Restart Agent

```bash
curl -X POST http://localhost:4860/api/agents/agent_abc123/restart \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "agent_abc123",
  "status": "running",
  "restartedAt": "2026-06-28T12:00:00.000Z"
}
```

### Update Agent Resources

```bash
curl -X POST http://localhost:4860/api/agents/agent_abc123/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "maxTokens": 100000,
    "maxMemoryMb": 512,
    "maxConcurrentRequests": 10
  }'
```

Response:
```json
{
  "id": "agent_abc123",
  "resources": {
    "maxTokens": 100000,
    "maxMemoryMb": 512,
    "maxConcurrentRequests": 10
  }
}
```

### Create Pod

```bash
curl -X POST http://localhost:4860/api/pods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "sales-team",
    "isolation": "shared",
    "minInstances": 2,
    "maxInstances": 10
  }'
```

Response:
```json
{
  "id": "pod_sales",
  "name": "sales-team",
  "isolation": "shared",
  "minInstances": 2,
  "maxInstances": 10,
  "currentInstances": 2,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### Scale Pod

```bash
curl -X PATCH http://localhost:4860/api/pods/pod_sales/scale \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"instances": 5}'
```

Response:
```json
{
  "id": "pod_sales",
  "currentInstances": 5,
  "scaledAt": "2026-06-28T12:00:00.000Z"
}
```

### Create Schedule

```bash
curl -X POST http://localhost:4860/api/schedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "agentId": "agent_abc123",
    "cron": "0 9 * * 1-5",
    "action": "daily_report",
    "enabled": true
  }'
```

Response:
```json
{
  "id": "schedule_xyz789",
  "agentId": "agent_abc123",
  "cron": "0 9 * * 1-5",
  "action": "daily_report",
  "enabled": true,
  "nextRun": "2026-06-29T09:00:00.000Z"
}
```

### Get Team Quota

```bash
curl http://localhost:4860/api/quotas/team_sales
```

Response:
```json
{
  "teamId": "team_sales",
  "limits": {
    "maxAgents": 20,
    "maxTokensPerDay": 1000000,
    "maxConcurrentRequests": 100
  },
  "currentUsage": {
    "agents": 12,
    "tokensToday": 450000,
    "concurrentRequests": 45
  }
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 4860 | Service port |
| `NODE_ENV` | No | development | Environment |

---

**Last Updated:** 2026-06-28
