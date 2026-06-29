# SUTAR Monitoring

> **Real-time monitoring, metrics, and alerts for the SUTAR ecosystem**

**Port:** 3100
**Layer:** 1 (Base Observability)
**Package:** `@hojai/sutar-monitoring`

## Overview

SUTAR Monitoring provides:
- Service health monitoring (probes every 30s)
- Metric ingestion and aggregation
- Alert rule management
- Log aggregation
- Comprehensive observability dashboard

## Quick Start

```bash
cd sutar-os/core/sutar-monitoring
npm install
npm run dev
# Service runs on http://localhost:3100
```

## Features

| Feature | Status |
|---------|--------|
| Service probes | ✅ Implemented |
| Metrics collection | ✅ Implemented |
| Alert rules | ✅ Implemented |
| Log aggregation | ✅ Implemented |
| Background probing | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:3100/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-monitoring",
  "sutarLayer": 1,
  "layer": "Base Observability",
  "port": 3100,
  "counts": {
    "services": 23,
    "probes": 156,
    "metrics": 89,
    "alertRules": 1,
    "activeAlerts": 0,
    "logs": 45
  },
  "healthy": 20,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### List All Services

```bash
curl http://localhost:3100/api/services
```

Response:
```json
{
  "count": 23,
  "services": [
    {
      "id": "svc-decision-engine",
      "name": "SUTAR Decision Engine",
      "url": "http://localhost:4290",
      "port": 4290,
      "lastStatus": "healthy",
      "lastProbedAt": 1751121600000,
      "lastLatencyMs": 45
    }
  ]
}
```

### Get Service Health

```bash
curl http://localhost:3100/api/services/svc-decision-engine/health
```

Response:
```json
{
  "serviceId": "svc-decision-engine",
  "name": "SUTAR Decision Engine",
  "lastStatus": "healthy",
  "lastProbedAt": 1751121600000,
  "lastLatencyMs": 45
}
```

### Get Service Probe History

```bash
curl "http://localhost:3100/api/services/svc-decision-engine/history?limit=10"
```

Response:
```json
{
  "serviceId": "svc-decision-engine",
  "count": 10,
  "probes": [
    { "serviceId": "svc-decision-engine", "status": "healthy", "latencyMs": 45, "httpStatus": 200, "timestamp": 1751121600000 },
    { "serviceId": "svc-decision-engine", "status": "healthy", "latencyMs": 42, "httpStatus": 200, "timestamp": 1751121580000 }
  ]
}
```

### Trigger Service Probe

```bash
curl -X POST http://localhost:3100/api/probe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"serviceId": "svc-decision-engine"}'
```

Response:
```json
{
  "probe": {
    "serviceId": "svc-decision-engine",
    "status": "healthy",
    "latencyMs": 38,
    "httpStatus": 200,
    "timestamp": 1751121600000,
    "error": null
  }
}
```

### Push Metric

```bash
curl -X POST http://localhost:3100/api/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "serviceId": "svc-decision-engine",
    "name": "http_latency_ms",
    "value": 45,
    "tags": {"endpoint": "/api/v1/decide"}
  }'
```

Response:
```json
{
  "sample": {
    "name": "http_latency_ms",
    "value": 45,
    "tags": {"endpoint": "/api/v1/decide"},
    "timestamp": 1751121600000
  }
}
```

### Get Service Metrics

```bash
curl http://localhost:3100/api/metrics/svc-decision-engine
```

Response:
```json
{
  "serviceId": "svc-decision-engine",
  "count": 15,
  "samples": [
    { "name": "http_latency_ms", "value": 45, "tags": {"endpoint": "/api/v1/decide"}, "timestamp": 1751121600000 }
  ]
}
```

### Create Alert Rule

```bash
curl -X POST http://localhost:3100/api/alerts/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "High Latency Alert",
    "serviceId": "svc-decision-engine",
    "metric": "http_latency_ms",
    "comparator": "gt",
    "threshold": 500,
    "severity": "critical"
  }'
```

Response:
```json
{
  "rule": {
    "id": "rule_abc123",
    "name": "High Latency Alert",
    "serviceId": "svc-decision-engine",
    "metric": "http_latency_ms",
    "comparator": "gt",
    "threshold": 500,
    "severity": "critical",
    "enabled": true,
    "createdAt": 1751121600000
  }
}
```

### List Alert Rules

```bash
curl http://localhost:3100/api/alerts/rules
```

Response:
```json
{
  "count": 2,
  "rules": [
    {
      "id": "rule_abc123",
      "name": "High Latency Alert",
      "serviceId": "svc-decision-engine",
      "metric": "http_latency_ms",
      "comparator": "gt",
      "threshold": 500,
      "severity": "critical",
      "enabled": true
    }
  ]
}
```

### Get Active Alerts

```bash
curl http://localhost:3100/api/alerts/active
```

Response:
```json
{
  "count": 0,
  "alerts": []
}
```

### Resolve Alert

```bash
curl -X POST http://localhost:3100/api/alerts/active/rule_abc123/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"resolvedBy": "admin"}'
```

Response:
```json
{
  "alert": {
    "id": "alert_xyz789",
    "ruleId": "rule_abc123",
    "status": "resolved",
    "resolvedAt": 1751121600000,
    "resolvedBy": "admin"
  }
}
```

### Push Log Entry

```bash
curl -X POST http://localhost:3100/api/logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "service": "sutar-decision-engine",
    "level": "info",
    "message": "Decision made: proceed",
    "meta": {"decisionId": "dec_abc123", "riskScore": 0.25}
  }'
```

Response:
```json
{
  "entry": {
    "service": "sutar-decision-engine",
    "level": "info",
    "message": "Decision made: proceed",
    "meta": {"decisionId": "dec_abc123", "riskScore": 0.25},
    "timestamp": 1751121600000
  }
}
```

### Get Logs

```bash
curl "http://localhost:3100/api/logs?service=sutar-decision-engine&level=info&limit=50"
```

Response:
```json
{
  "count": 45,
  "logs": [
    {
      "service": "sutar-decision-engine",
      "level": "info",
      "message": "Decision made: proceed",
      "meta": {"decisionId": "dec_abc123"},
      "timestamp": 1751121600000
    }
  ]
}
```

### Get Stats

```bash
curl http://localhost:3100/api/stats
```

Response:
```json
{
  "services": {
    "total": 23,
    "byStatus": {
      "healthy": 20,
      "unhealthy": 2,
      "unreachable": 1
    }
  },
  "probes": 156,
  "metrics": 89,
  "alertRules": 2,
  "activeAlerts": 0,
  "resolvedAlerts": 5,
  "logs": 45,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3100 | Service port |
| `NODE_ENV` | development | Environment (development/production) |
| `INTERNAL_SERVICE_TOKEN` | - | Internal service authentication |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (auth, security, persistent-map)

---

**Last Updated:** 2026-06-28
