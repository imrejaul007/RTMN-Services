# Phase 3: Observability & Tracing

**Duration:** 2 weeks (Week 4–5)
**Priority:** P0 (Critical)
**Owner:** DevOps Engineer

---

## Goal

Build production-grade observability with metrics, logs, traces, and per-stage latency tracking across all 240+ services.

---

## Why This Matters

**Current State:**
- `platform/observability/centralized-observability/` is **EMPTY** (only node_modules)
- `platform/observability/observability-apis/` is **EMPTY** (only node_modules)
- No metrics aggregation, no log aggregation, no distributed tracing
- Each service has basic `console.log` but no structured logging
- No per-stage latency tracking, no p50/p95/p99 calculations
- Cannot diagnose production issues

**After This Phase:** Full observability stack with Prometheus metrics, Loki logs, Jaeger traces, and Grafana dashboards.

---

## Deliverables

### 3.1 Build Centralized Observability Service

**Port:** 4783
**File:** `platform/observability/centralized-observability/` (currently EMPTY)

**Tasks:**

1. Create Express service on port 4783
2. Prometheus metrics endpoint `/metrics`
3. Log aggregation endpoint `/api/logs` (Loki-compatible)
4. Trace ingestion endpoint `/api/traces` (OpenTelemetry-compatible)
5. Health check aggregation `/health/all`

**Implementation:**

```javascript
// File: platform/observability/centralized-observability/src/index.js

import express from 'express';
import promClient from 'prom-client';
import { logger } from '@rtmn/shared/logger';

const app = express();
app.use(express.json());

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['service', 'method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['service', 'method', 'route', 'status']
});

const serviceHealth = new promClient.Gauge({
  name: 'service_health',
  help: 'Service health status (1=healthy, 0=unhealthy)',
  labelNames: ['service', 'host', 'port']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(serviceHealth);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Log ingestion (Loki-compatible)
app.post('/api/logs', async (req, res) => {
  try {
    const { service, level, message, timestamp, metadata } = req.body;

    // Forward to Loki or store locally
    await forwardToLoki({ service, level, message, timestamp, metadata });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trace ingestion (OpenTelemetry-compatible)
app.post('/api/traces', async (req, res) => {
  try {
    const traces = req.body;
    await forwardToJaeger(traces);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check all services
app.get('/health/all', async (req, res) => {
  const services = await getServiceRegistry();
  const healthChecks = await Promise.all(
    services.map(async (service) => {
      try {
        const response = await fetch(`http://${service.host}:${service.port}/health`, {
          timeout: 5000
        });
        const health = await response.json();
        serviceHealth.set({ service: service.name, host: service.host, port: service.port }, 1);
        return { service: service.name, status: 'healthy', ...health };
      } catch (error) {
        serviceHealth.set({ service: service.name, host: service.host, port: service.port }, 0);
        return { service: service.name, status: 'unhealthy', error: error.message };
      }
    })
  );

  res.json({ services: healthChecks });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'centralized-observability', port: 4783 });
});

const PORT = process.env.PORT || 4783;
app.listen(PORT, () => {
  logger.info(`Centralized Observability listening on :${PORT}`);
});
```

---

### 3.2 Add OpenTelemetry Instrumentation

**Tasks:** Add OpenTelemetry to all services in:
- `platform/intelligence/` (inference-gateway, ai-intelligence, etc.)
- `platform/flow/` (flow-orchestrator)
- `platform/memory/` (memory-os, memory-context-engine)
- `products/genie/` (genie-gateway)

**Implementation:**

```javascript
// File: shared/telemetry/instrumentation.js

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { Resource } from '@opentelemetry/resources';

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': process.env.SERVICE_NAME || 'unknown',
    'service.version': process.env.SERVICE_VERSION || '1.0.0'
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

**Add to each service:**

```javascript
// At the top of each service's index.js
import './shared/telemetry/instrumentation.js';
```

---

### 3.3 Build Observability APIs

**Port:** 4784
**File:** `platform/observability/observability-apis/` (currently EMPTY)

**Tasks:**

1. Create Express service on port 4784
2. Query API: `GET /api/metrics?service=X&metric=Y`
3. Query API: `GET /api/logs?service=X&level=error`
4. Query API: `GET /api/traces/:traceId`
5. Grafana dashboard JSON exports

**Implementation:**

```javascript
// File: platform/observability/observability-apis/src/index.js

import express from 'express';
import { logger } from '@rtmn/shared/logger';

const app = express();
app.use(express.json());

// Query metrics (Prometheus)
app.get('/api/metrics', async (req, res) => {
  const { service, metric, timeRange = '1h' } = req.query;

  try {
    const query = `${metric}{service="${service}"}`;
    const result = await queryPrometheus(query, timeRange);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Query logs (Loki)
app.get('/api/logs', async (req, res) => {
  const { service, level, timeRange = '1h', limit = 100 } = req.query;

  try {
    const query = `{service="${service}"} |= "${level || ''}"`;
    const logs = await queryLoki(query, timeRange, limit);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get trace by ID (Jaeger)
app.get('/api/traces/:traceId', async (req, res) => {
  try {
    const trace = await queryJaeger(req.params.traceId);
    res.json(trace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'observability-apis', port: 4784 });
});

const PORT = process.env.PORT || 4784;
app.listen(PORT, () => {
  logger.info(`Observability APIs listening on :${PORT}`);
});
```

---

### 3.4 Add Per-Stage Latency Tracking

**File:** `platform/flow/flow-orchestrator/src/index.js`

**Tasks:**

1. Instrument each step with `performance.now()`
2. Emit histogram metrics: `flow_step_duration_ms{step,template}`
3. Calculate p50/p95/p99 in Prometheus
4. Add slow-step alerts (>5s p95)

**Implementation:**

```javascript
// In flow orchestrator
app.post('/api/flow/execute', requireAuth, async (req, res) => {
  const { template, inputs } = req.body;
  const templateDef = templates[template];

  const stepResults = {};
  const stepTimings = {};

  for (const step of templateDef.steps) {
    const start = performance.now();

    try {
      stepResults[step.name] = await executeStep(step, inputs, stepResults);
      const duration = performance.now() - start;
      stepTimings[step.name] = duration;

      // Emit metric
      metrics.histogram('flow_step_duration_ms', duration, {
        step: step.name,
        template,
        status: 'success'
      });
    } catch (error) {
      const duration = performance.now() - start;
      stepTimings[step.name] = duration;

      metrics.histogram('flow_step_duration_ms', duration, {
        step: step.name,
        template,
        status: 'error'
      });

      throw error;
    }
  }

  res.json({ results: stepResults, timings: stepTimings });
});
```

---

## Grafana Dashboards

### Dashboard 1: Service Overview
- Requests/sec by service
- Latency p95 by service
- Error rate by service
- CPU/Memory usage

### Dashboard 2: Flow Orchestration
- Flow executions/min by template
- Step latency p95 by step
- Step failure rate
- Total flow duration

### Dashboard 3: LLM Performance
- LLM calls/min by model
- LLM latency p95 by model
- LLM cost/hour by model
- LLM error rate

### Dashboard 4: Memory Operations
- Memory reads/sec
- Memory writes/sec
- Memory latency p95
- Memory cache hit rate

---

## Prometheus Alerts

```yaml
# High error rate
- alert: HighErrorRate
  expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
  for: 5m
  annotations:
    summary: "High error rate: {{ $value }}"

# Slow response
- alert: SlowResponse
  expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)) > 5
  for: 5m
  annotations:
    summary: "Slow response from {{ $labels.service }}"

# Service down
- alert: ServiceDown
  expr: up == 0
  for: 2m
  annotations:
    summary: "Service {{ $labels.service }} is down"
```

---

## Test Gates

### Gate 1: Metrics (Day 3)
- [ ] Prometheus scraping all services
- [ ] Custom metrics visible
- [ ] Histograms calculating percentiles

### Gate 2: Logs (Day 5)
- [ ] Loki ingesting logs
- [ ] Log query API works
- [ ] Structured logging working

### Gate 3: Traces (Day 7)
- [ ] Jaeger receiving traces
- [ ] Distributed traces visible
- [ ] Trace context propagated

### Gate 4: Latency (Day 10)
- [ ] Per-step latency tracked
- [ ] Slow-step alerts firing
- [ ] Dashboards showing real-time data

---

## Success Criteria

✅ Centralized observability service deployed
✅ OpenTelemetry instrumentation across all services
✅ Prometheus metrics for all endpoints
✅ Loki log aggregation working
✅ Jaeger distributed tracing working
✅ Per-stage latency tracking in flow orchestrator
✅ 4+ Grafana dashboards deployed
✅ 10+ Prometheus alerts configured
✅ All tests passing

---

*Phase 3 documentation: 2026-06-22*