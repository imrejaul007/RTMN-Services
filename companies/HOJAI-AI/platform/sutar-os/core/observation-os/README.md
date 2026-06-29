# ObservationOS

> **Live monitoring, logs, metrics, traces, and cost tracking for AI agents**

**Port:** 4861
**Package:** `@hojai/observation-os`

## Overview

ObservationOS provides Datadog-like observability for AI agents:
- **Metrics Collection** — Per-agent metrics with aggregation
- **Distributed Tracing** — Operation traces with step-level duration
- **Alerting** — Severity-based alerts with firing/resolved states
- **Cost Tracking** — Token and API cost aggregation per agent
- **Dashboard** — Overview of active alerts and latency

## Quick Start

```bash
cd platform/sutar-os/core/observation-os
npm install
npm run dev
# Service runs on http://localhost:4861
```

---

## API Examples

### Health Check

```bash
curl http://localhost:4861/health
```

Response:
```json
{
  "status": "ok",
  "service": "observation-os",
  "port": 4861,
  "counts": {
    "metrics": 1234,
    "alerts": 5,
    "traces": 456
  }
}
```

### Submit Metric

```bash
curl -X POST http://localhost:4861/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "agentId": "agent_abc123",
    "name": "requests_total",
    "value": 150,
    "tags": {"endpoint": "negotiate"}
  }'
```

Response:
```json
{
  "success": true,
  "metricId": "metric_xyz789",
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Get Agent Metrics

```bash
curl http://localhost:4861/api/agents/agent_abc123/metrics
```

Response:
```json
{
  "agentId": "agent_abc123",
  "count": 50,
  "metrics": [
    { "name": "requests_total", "value": 150, "tags": {"endpoint": "negotiate"}, "timestamp": "2026-06-28T12:00:00.000Z" }
  ]
}
```

### Aggregate Metrics

```bash
curl "http://localhost:4861/api/metrics/aggregate?window=1h"
```

Response:
```json
{
  "window": "1h",
  "aggregations": [
    { "name": "requests_total", "avg": 145, "count": 60, "max": 200, "min": 50 }
  ]
}
```

### Submit Trace

```bash
curl -X POST http://localhost:4861/traces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "agentId": "agent_abc123",
    "operation": "negotiate_contract",
    "duration": 1234,
    "status": "ok"
  }'
```

Response:
```json
{
  "traceId": "trace_xyz789",
  "agentId": "agent_abc123",
  "operation": "negotiate_contract",
  "status": "ok"
}
```

### Get Agent Traces

```bash
curl "http://localhost:4861/api/agents/agent_abc123/traces?status=error"
```

Response:
```json
{
  "agentId": "agent_abc123",
  "count": 3,
  "traces": [
    { "traceId": "trace_xyz789", "operation": "negotiate_contract", "status": "error", "duration": 5000 }
  ]
}
```

### Create Alert

```bash
curl -X POST http://localhost:4861/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "agentId": "agent_abc123",
    "severity": "high",
    "type": "latency_threshold",
    "message": "Agent latency exceeds 5s threshold",
    "value": 5234
  }'
```

Response:
```json
{
  "alertId": "alert_xyz789",
  "agentId": "agent_abc123",
  "severity": "high",
  "status": "firing",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Alerts

```bash
curl "http://localhost:4861/alerts?status=firing&severity=high"
```

Response:
```json
{
  "count": 2,
  "alerts": [
    { "alertId": "alert_xyz789", "severity": "high", "status": "firing", "agentId": "agent_abc123" }
  ]
}
```

### Acknowledge Alert

```bash
curl -X PATCH http://localhost:4861/alerts/alert_xyz789/acknowledge \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "alertId": "alert_xyz789",
  "status": "acknowledged",
  "acknowledgedAt": "2026-06-28T12:00:00.000Z"
}
```

### Get Costs

```bash
 curl http://localhost:4861/costs?period=30d
```

Response:
```json
{
  "period": "30d",
  "totalCost": 1234.56,
  "byAgent": [
    { "agentId": "agent_abc123", "cost": 456.78, "tokens": 123456 }
  ],
  "byType": {
    "api_calls": 789.12,
    "tokens": 345.44
  }
}
```

### Get Dashboard

```bash
curl http://localhost:4861/dashboard
```

Response:
```json
{
  "timestamp": "2026-06-28T12:00:00.000Z",
  "activeAlerts": 5,
  "criticalAlerts": 1,
  "avgLatency": 234,
  "requestsPerMinute": 145,
  "topErrors": [
    { "type": "timeout", "count": 12 }
  ]
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 4861 | Service port |
| `NODE_ENV` | No | development | Environment |

---

**Last Updated:** 2026-06-28
