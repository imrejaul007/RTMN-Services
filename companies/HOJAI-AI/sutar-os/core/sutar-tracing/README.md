# SUTAR Tracing

> **Distributed tracing, execution replay, and debugging for autonomous agent operations**

**Port:** 4606
**Layer:** Observability
**Package:** `@hojai/sutar-tracing`

## Overview

SUTAR Tracing provides:
- Request tracing with spans
- Execution replay
- Critical path analysis
- Error tracking
- Latency metrics

## Quick Start

```bash
cd sutar-os/core/sutar-tracing
npm install
npm run dev
# Service runs on http://localhost:4606
```

## Features

| Feature | Status |
|---------|--------|
| Trace creation | ✅ Implemented |
| Span management | ✅ Implemented |
| Trace replay | ✅ Implemented |
| Debug info | ✅ Implemented |
| Metrics | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4606/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-tracing",
  "port": 4606,
  "layer": "Observability",
  "activeTraces": 5,
  "totalTraces": 234,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Start Trace

```bash
curl -X POST http://localhost:4606/api/traces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "serviceName": "sutar-negotiation-engine",
    "operationName": "negotiate_contract",
    "parentTraceId": null,
    "tags": {
      "tenantId": "tenant-001",
      "dealValue": 50000
    }
  }'
```

Response:
```json
{
  "traceId": "trace_abc123",
  "serviceName": "sutar-negotiation-engine",
  "operationName": "negotiate_contract",
  "startTime": "2026-06-28T12:00:00.000Z",
  "status": "running",
  "spanCount": 0
}
```

### Add Span to Trace

```bash
curl -X POST http://localhost:4606/api/traces/trace_abc123/spans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "operationName": "fetch_counterpart_data",
    "serviceName": "sutar-trust-engine",
    "parentSpanId": null,
    "tags": {
      "counterpartId": "merchant-001"
    }
  }'
```

Response:
```json
{
  "spanId": "span_xyz789",
  "traceId": "trace_abc123",
  "operationName": "fetch_counterpart_data",
  "serviceName": "sutar-trust-engine",
  "startTime": "2026-06-28T12:00:00.000Z",
  "status": "ok"
}
```

### End Trace

```bash
curl -X PUT http://localhost:4606/api/traces/trace_abc123/end \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "status": "ok"
  }'
```

Response:
```json
{
  "traceId": "trace_abc123",
  "operationName": "negotiate_contract",
  "status": "ok",
  "duration": 2340
}
```

### Get Trace

```bash
curl http://localhost:4606/api/traces/trace_abc123 \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "trace": {
    "traceId": "trace_abc123",
    "serviceName": "sutar-negotiation-engine",
    "operationName": "negotiate_contract",
    "status": "ok",
    "duration": 2340,
    "spanCount": 3
  },
  "spans": [
    {
      "spanId": "span_xyz789",
      "operationName": "fetch_counterpart_data",
      "status": "ok",
      "duration": 120
    }
  ]
}
```

### List Traces

```bash
curl "http://localhost:4606/api/traces?status=ok&limit=10"
```

Response:
```json
{
  "total": 234,
  "returned": 10,
  "traces": [
    {
      "traceId": "trace_abc123",
      "serviceName": "sutar-negotiation-engine",
      "operationName": "negotiate_contract",
      "status": "ok",
      "duration": 2340
    }
  ]
}
```

### Replay Trace

```bash
curl -X POST http://localhost:4606/api/replay/trace_abc123 \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "traceId": "trace_abc123",
  "operationName": "negotiate_contract",
  "totalSteps": 3,
  "totalDuration": 2340,
  "status": "ok",
  "steps": [
    {
      "step": 1,
      "operation": "fetch_counterpart_data",
      "service": "sutar-trust-engine",
      "status": "ok",
      "result": { "success": true }
    }
  ],
  "replayedAt": "2026-06-28T12:05:00.000Z"
}
```

### Debug Trace

```bash
curl http://localhost:4606/api/debug/trace_abc123 \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "traceId": "trace_abc123",
  "summary": {
    "status": "ok",
    "totalDuration": 2340,
    "totalSpans": 3,
    "errorCount": 0,
    "serviceCount": 2
  },
  "criticalPath": [
    { "operation": "negotiate_contract", "service": "sutar-negotiation-engine", "duration": 2340 },
    { "operation": "fetch_counterpart_data", "service": "sutar-trust-engine", "duration": 120 }
  ],
  "errors": [],
  "spanTimeline": [...]
}
```

### Get Tracing Metrics

```bash
curl http://localhost:4606/api/metrics \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "timestamp": "2026-06-28T12:00:00.000Z",
  "activeTraces": 5,
  "completedTraces": 229,
  "errorTraces": 3,
  "totalTraces": 234,
  "errorRate": "1.31%",
  "avgDuration": 1890,
  "latency": {
    "p50": 1200,
    "p95": 4500,
    "p99": 8900
  },
  "topServices": [
    { "service": "sutar-negotiation-engine", "spanCount": 89 },
    { "service": "sutar-trust-engine", "spanCount": 67 }
  ]
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRACING_PORT` | 4606 | Service port |
| `NODE_ENV` | development | Environment (development/production) |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (security)

---

**Last Updated:** 2026-06-28
