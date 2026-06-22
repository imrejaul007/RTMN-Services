# @rez/monitoring - Production-Ready Observability

> Comprehensive observability package for RTNM services with Prometheus metrics, health checks, SLO tracking, and distributed tracing.

## Features

- **Prometheus Metrics** - Counter, gauge, histogram, and summary metrics with automatic percentile calculation
- **Health Checks** - Liveness, readiness, and startup probes for Kubernetes
- **SLO Tracking** - Service Level Objectives with automatic status calculation
- **Distributed Tracing** - Request correlation with trace IDs
- **Alert Rules** - Auto-generated Prometheus alert rules
- **Request Metrics** - Automatic HTTP request metrics middleware

## Installation

```bash
npm install @rez/monitoring
```

## Quick Start

```typescript
import express from 'express';
import { createMonitoring } from '@rez/monitoring';

const app = express();

// Create monitoring instance
const monitoring = createMonitoring({
  service: 'rabtul-auth',
  version: '1.0.0',
  port: 9090,
  labels: { region: 'us-east-1' }
});

// Automatic request metrics
app.use(monitoring.requestMetricsMiddleware());

// Setup routes
app.get('/health', monitoring.healthHandler);
app.get('/ready', monitoring.readinessHandler);
app.get('/live', monitoring.startupHandler);
app.get('/metrics', monitoring.metricsHandler);

// Track custom metrics
app.post('/api/login', (req, res) => {
  monitoring.counter('login_attempts_total', { method: 'POST' });
  // ... login logic
  monitoring.histogram('login_duration_ms', 150);
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Metrics available at http://localhost:9090/metrics');
});
```

## Metrics Types

### Counter
Use for events that happen (requests, errors, logins).

```typescript
monitoring.counter('http_requests_total', { method: 'GET', path: '/health' });
```

### Gauge
Use for values that go up and down (memory, connections, queue size).

```typescript
monitoring.gauge('active_connections', 42);
monitoring.gauge('queue_size', 15);
```

### Histogram
Use for latencies, sizes, durations. Automatically calculates percentiles.

```typescript
monitoring.histogram('http_request_duration_ms', 125, { method: 'GET' });
monitoring.histogram('response_size_bytes', 2048);
```

### Summary
Similar to histogram but for final aggregated values.

```typescript
monitoring.summary('task_duration_ms', 500);
```

## Health Checks

### Health Handler
Returns detailed health status with all registered service dependencies.

```typescript
app.get('/health', monitoring.healthHandler);

// Response:
// {
// "status": "healthy",
//   "timestamp": "2026-06-12T10:30:00.000Z",
//   "version": "1.0.0",
//   "uptime": 3600,
//   "services": {
//     "database": { "status": "up", "latency": 5 },
//     "redis": { "status": "up", "latency": 2 }
//   }
// }
```

### Readiness Probe
Checks if service can handle traffic.

```typescript
app.get('/ready', monitoring.readinessHandler);

// Response:
// {
//   "ready": true,
//   "checks": [
//     { "name": "database", "ok": true, "latency": 5 },
//     { "name": "redis", "ok": true, "latency": 2 }
//   ],
//   "timestamp": "2026-06-12T10:30:00.000Z"
// }
```

### Startup Probe
Checks if service has initialized.

```typescript
app.get('/live', monitoring.startupHandler);

// Response:
// {
//   "started": true,
//   "duration": 1500,
//   "maxDuration": 30000,
//   "timestamp": "2026-06-12T10:30:00.000Z"
// }
```

## SLO Configuration

Configure Service Level Objectives for your service.

```typescript
// Configure SLOs
monitoring.configureSLO({
  name: 'availability',
  target: 99.9, // 99.9% availability
  window: '30d',
  metric: 'http_requests_total'
});

monitoring.configureSLO({
  name: 'latency',
  target: 99.0, // 99% of requests under 1 second
  window: '30d',
  metric: 'http_request_duration_ms'
});

// Get SLO status
const sloStatus = monitoring.getSLOStatus();
// [
//   { name: 'availability', status: 'healthy', current: 99.95, target: 99.9 },
//   { name: 'latency', status: 'healthy', current: 99.2, target: 99.0 }
// ]
```

## Register Health Checks

Register health checks for external dependencies.

```typescript
import { registerHealthCheck } from '@rez/monitoring';
import { checkHealth as dbHealth } from '@rez/mongodb';
import { checkHealth as redisHealth } from '@rez/redis';

// Register dependency health checks
registerHealthCheck('database', dbHealth);
registerHealthCheck('redis', redisHealth);
```

## Alert Rules

Generate Prometheus alert rules for your service.

```typescript
import { generateAlertRules, exportAlertRulesYAML } from '@rez/monitoring';

// Get alert rules as objects
const rules = generateAlertRules('my-service');
// [
//   { alert: 'my_service_high_error_rate', expr: '...', for: '2m', ... },
//   { alert: 'my_service_high_latency', expr: '...', for: '5m', ... },
//   ...
// ]

// Export as YAML for Prometheus
const yaml = exportAlertRulesYAML('my-service');
```

## Timed Operations

Automatically time function execution and record duration.

```typescript
// Time a sync function
const result = monitoring.timed('db_query_duration_ms', () => {
  return database.query('SELECT * FROM users');
});

// Time an async function
const data = await monitoring.timed('api_call_duration_ms', async () => {
  return fetch('https://api.example.com/data');
});
```

## Tracing Middleware

Add distributed tracing to your requests.

```typescript
import { tracingMiddleware } from '@rez/monitoring';

app.use(tracingMiddleware('my-service'));

// Access trace ID in handlers
app.get('/api/data', (req, res) => {
  const traceId = req.traceId;
  const spanId = req.spanId;
  res.json({ traceId });
});
```

## Prometheus Output Example

```
# HELP my_service_info Service information
# TYPE my_service_info gauge
my_service_info{service="my-service",region="us-east-1"} 1

# HELP my_service_uptime_seconds Service uptime in seconds
# TYPE my_service_uptime_seconds gauge
my_service_uptime_seconds{service="my-service",region="us-east-1"} 3600

# HELP my_service_http_requests_total Counter metric
# TYPE my_service_http_requests_total counter
my_service_http_requests_total{method="GET",path="/health",status="200"} 150

# HELP my_service_http_request_duration_ms Histogram metric
# TYPE my_service_http_request_duration_ms histogram
my_service_http_request_duration_ms_sum{method="GET",path="/api"} 15000.00
my_service_http_request_duration_ms_count{method="GET",path="/api"} 100
my_service_http_request_duration_ms_p50{method="GET",path="/api"} 125.00
my_service_http_request_duration_ms_p95{method="GET",path="/api"} 450.00
my_service_http_request_duration_ms_p99{method="GET",path="/api"} 890.00
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: my-service
          ports:
            - containerPort: 3000
            - containerPort: 9090  # Metrics
          livenessProbe:
            httpGet:
              path: /live
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          startupProbe:
            httpGet:
              path: /live
              port: 3000
            failureThreshold: 30
            periodSeconds: 10
```

## API Reference

### `createMonitoring(config)`

Create a monitoring instance for a service.

| Parameter | Type | Description |
|-----------|------|-------------|
| `service` | `string` | Service name (required) |
| `version` | `string` | Service version |
| `port` | `number` | Metrics port (default: 9090) |
| `env` | `string` | Environment (production/staging/development) |
| `labels` | `Record<string, string>` | Custom labels for all metrics |

### Returns

```typescript
{
  // Metrics methods
  counter: (name, labels?, value?) => void
  gauge: (name, value, labels?) => void
  histogram: (name, value, labels?) => void
  summary: (name, value, labels?) => void
  timed: <T>(name, fn, labels?) => Promise<T>

  // Handlers
  metricsHandler: ExpressHandler
  healthHandler: ExpressHandler
  readinessHandler: ExpressHandler
  startupHandler: ExpressHandler
  requestMetricsMiddleware: () => ExpressMiddleware

  // SLO
  configureSLO: (slo) => void
  getSLOStatus: () => SLOStatus[]

  // Internal
  collector: MetricsCollector
  config: MonitoringConfig
}
```

## License

Proprietary - RTNM Digital
