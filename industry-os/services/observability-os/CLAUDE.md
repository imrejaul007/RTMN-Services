# Observability OS

**Port:** 5273  
**Status:** ✅ Built (June 26, 2026)

Enterprise Observability Platform: Log aggregation, distributed tracing, metrics collection, alerting, and incident management.

## AI Agents (3)

| Agent | Purpose |
|-------|---------|
| Log Intelligence Agent | Pattern detection, anomaly alerts, log correlation |
| Trace Analyzer Agent | Request flow analysis, latency detection, dependency mapping |
| Metrics Advisor Agent | Metric correlations, threshold optimization, forecasting |

## Key Features

- **Log Aggregation**: Centralized logging, real-time processing, full-text search
- **Distributed Tracing**: Request tracking, latency analysis, dependency graphs
- **Metrics Collection**: System metrics, business metrics, custom metrics
- **Alerting**: Multi-channel alerts, smart grouping, on-call management
- **Dashboards**: Customizable widgets, real-time updates, sharing

## Endpoints

```
POST /api/logs                      # Ingest logs
GET  /api/logs/search               # Search logs
GET  /api/traces                    # List traces
GET  /api/traces/:id                # Trace details
POST /api/metrics                   # Record metrics
GET  /api/metrics/query             # Query metrics
POST /api/alerts                    # Create alert
GET  /api/alerts                    # List alerts
GET  /api/dashboards                # List dashboards
```

## Start

```bash
cd industry-os/services/observability-os
npm start
# http://localhost:5273/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
