# ObservabilityOS — Monitoring, Metrics & Analytics

**Port:** 4592
**Purpose:** Complete observability for AI workers and the platform

---

## Overview

ObservabilityOS provides comprehensive monitoring and analytics:
- **Metrics** — Real-time and historical data
- **Traces** — Request/response tracking
- **Logs** — Centralized logging
- **Alerts** — Proactive notifications
- **Dashboards** — Visual insights

---

## Metrics Categories

### Platform Metrics
- `platform.requests.total` — Total requests
- `platform.latency.p50` — Median latency
- `platform.latency.p95` — 95th percentile latency
- `platform.errors.total` — Error count
- `platform.uptime` — System uptime

### AI Worker Metrics
- `ai_worker.accuracy.*` — Task accuracy
- `ai_worker.latency.*` — Response time
- `ai_worker.tokens.*` — Token consumption
- `ai_worker.cost.*` — Cost tracking
- `ai_worker.errors.*` — Error rates
- `ai_worker.satisfaction.*` — User ratings

### Business Metrics
- `business.revenue.*` — Revenue tracking
- `business.transactions.*` — Transaction counts
- `business.customers.*` — Customer metrics
- `business.conversion.*` — Conversion funnels

---

## API Endpoints

### Metrics
```
POST /api/metrics             - Record metric
POST /api/metrics/batch       - Batch record
GET  /api/metrics            - List metrics
GET  /api/metrics/:name      - Get metric
GET  /api/metrics/:name/latest - Latest value
```

### AI Worker Metrics
```
POST /api/ai/metrics          - Record AI metrics
GET  /api/ai/metrics/:agentId - Agent performance
GET  /api/ai/leaderboard     - Agent leaderboard
```

### Traces
```
POST /api/traces             - Record trace
GET  /api/traces            - List traces
GET  /api/traces/:id        - Get trace
```

### Logs
```
POST /api/logs              - Record log
GET  /api/logs              - Query logs
GET  /api/logs/stats        - Log statistics
```

### Alerts
```
POST /api/alerts             - Create alert
GET  /api/alerts             - List alerts
GET  /api/alerts/:id        - Get alert
POST /api/alerts/:id/acknowledge - Acknowledge
POST /api/alerts/:id/resolve - Resolve
```

### Dashboards
```
GET  /api/dashboards         - List dashboards
GET  /api/dashboards/:id    - Get dashboard
```

### Analytics
```
GET  /api/analytics/overview   - Platform overview
GET  /api/analytics/realtime  - Real-time metrics
```

---

## Example Usage

### Record AI Worker Metric
```bash
curl -X POST http://localhost:4592/api/ai/metrics \
  -H 'Content-Type: application/json' \
  -d '{
    "agentId": "support-agent-1",
    "category": "accuracy",
    "value": 0.94,
    "metadata": {"task": "refund_processing"}
  }'
```

### Get Agent Performance
```bash
curl "http://localhost:4592/api/ai/metrics/support-agent-1?period=24h"
```

### AI Leaderboard
```bash
curl "http://localhost:4592/api/ai/leaderboard?category=accuracy&limit=10"
```

### Create Alert
```bash
curl -X POST http://localhost:4592/api/alerts \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "High Error Rate",
    "condition": "error_rate > 0.05",
    "threshold": 0.05,
    "severity": "error",
    "duration": 300
  }'
```

---

## Dashboards

### CEO Dashboard
- Revenue trend
- Active companies
- AI workers deployed
- Customer satisfaction

### Operations Dashboard
- Active deployments
- Deploy time
- Success rate
- Open incidents

### AI Workforce Dashboard
- Total AI workers
- Accuracy leaderboard
- Token usage
- Cost tracking

### Engineering Dashboard
- System health
- Latency percentiles
- Error rates
- Infrastructure metrics

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ObservabilityOS                        │
│                     (4592)                              │
├─────────────────────────────────────────────────────────┤
│  Metrics Engine                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Counters │ │  Gauges  │ │ Histograms│              │
│  └──────────┘ └──────────┘ └──────────┘              │
├─────────────────────────────────────────────────────────┤
│  Trace Collector                                        │
│  Spans → Traces → Dependencies                       │
├─────────────────────────────────────────────────────────┤
│  Log Aggregator                                        │
│  Ingest → Index → Query                             │
├─────────────────────────────────────────────────────────┤
│  Alert Engine                                          │
│  Conditions → Evaluation → Notifications               │
├─────────────────────────────────────────────────────────┤
│  Dashboard Engine                                      │
│  Widgets → Layouts → Real-time                     │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Add real metrics backend** — Prometheus, InfluxDB
2. **Add distributed tracing** — OpenTelemetry
3. **Add log aggregation** — Loki, Elasticsearch
4. **Add alerting channels** — Slack, PagerDuty, email
5. **Add anomaly detection** — ML-based
