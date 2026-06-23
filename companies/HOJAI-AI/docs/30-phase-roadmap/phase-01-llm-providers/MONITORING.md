# Phase 1: Monitoring Guide

**Status:** Planned
**Last Updated:** 2026-06-22

---

## Metrics (Prometheus)

### Inference Gateway Metrics

```yaml
# Total requests
inference_requests_total{service="inference-gateway",model="gpt-4o-mini",provider="openai",tenant="tenant-1",status="success"}

# Cost histogram
inference_cost_usd{service="inference-gateway",model="gpt-4o-mini",tenant="tenant-1"}

# Token histogram
inference_tokens_total{service="inference-gateway",model="gpt-4o-mini",tenant="tenant-1"}

# Latency histogram
inference_latency_ms{service="inference-gateway",model="gpt-4o-mini",provider="openai"}

# Error counter
inference_errors_total{service="inference-gateway",model="gpt-4o-mini",provider="openai",error_type="ProviderRateLimitError"}

# Fallback counter
inference_fallbacks_total{service="inference-gateway",from_model="gpt-4o-mini",to_model="claude-3-haiku"}
```

### Billing Service Metrics

```yaml
# Tenant spend
tenant_monthly_spend{tenant="tenant-1"}

# Budget utilization
tenant_budget_utilization{tenant="tenant-1"}

# Invoice counter
invoices_generated_total{tenant="tenant-1"}

# Stripe charges
stripe_charges_total{status="success"}
```

---

## Grafana Dashboards

### Dashboard 1: Inference Overview

**Panels:**
1. **Requests/sec by Provider** (graph)
   - Query: `sum(rate(inference_requests_total[1m])) by (provider)`
2. **Cost/hour by Model** (graph)
   - Query: `sum(rate(inference_cost_usd_sum[1h])) by (model)`
3. **Latency p50/p95/p99** (graph)
   - Query: `histogram_quantile(0.95, sum(rate(inference_latency_ms_bucket[5m])) by (le))`
4. **Error Rate** (graph)
   - Query: `sum(rate(inference_errors_total[5m])) / sum(rate(inference_requests_total[5m]))`
5. **Top 10 Tenants by Cost** (table)
   - Query: `topk(10, sum(inference_cost_usd_sum) by (tenant))`

### Dashboard 2: Provider Health

**Panels:**
1. **Uptime per Provider** (stat)
2. **Latency per Provider** (graph)
3. **Error Rate per Provider** (graph)
4. **Rate Limit Hits** (graph)
5. **Fallback Events** (graph)

### Dashboard 3: Cost Analysis

**Panels:**
1. **Real-time Cost** (stat)
2. **Cost by Tenant** (pie chart)
3. **Cost by Model** (pie chart)
4. **Cost by Feature** (pie chart)
5. **Cost Trends** (graph)
6. **Budget Utilization** (gauge)

### Dashboard 4: Billing Operations

**Panels:**
1. **Invoices Generated** (counter)
2. **Stripe Charges** (counter)
3. **Payment Success Rate** (gauge)
4. **Failed Payments** (table)

---

## Alerts

### Critical Alerts

```yaml
# Provider down
- alert: ProviderDown
  expr: up{job="inference-gateway"} == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Inference gateway is down"
    description: "Provider {{ $labels.provider }} has been down for 2 minutes"

# High error rate
- alert: HighErrorRate
  expr: sum(rate(inference_errors_total[5m])) / sum(rate(inference_requests_total[5m])) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate: {{ $value | humanizePercentage }}"

# High latency
- alert: HighLatency
  expr: histogram_quantile(0.95, sum(rate(inference_latency_ms_bucket[5m])) by (le)) > 10000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "p95 latency > 10s"

# Budget exceeded
- alert: TenantBudgetExceeded
  expr: tenant_budget_utilization > 1.0
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "Tenant {{ $labels.tenant }} exceeded budget"

# Unusual cost spike
- alert: CostSpike
  expr: sum(rate(inference_cost_usd_sum[1h])) > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Cost spike: ${{ $value }}/hour"
```

### Warning Alerts

```yaml
# Approaching budget limit
- alert: ApproachingBudgetLimit
  expr: tenant_budget_utilization > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Tenant {{ $labels.tenant }} at 80% of budget"

# Slow provider
- alert: SlowProvider
  expr: histogram_quantile(0.95, sum(rate(inference_latency_ms_bucket[5m])) by (provider, le)) > 5000
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Provider {{ $labels.provider }} p95 > 5s"

# High token usage
- alert: HighTokenUsage
  expr: sum(rate(inference_tokens_total[1h])) > 1000000
  for: 10m
  labels:
    severity: info
  annotations:
    summary: "High token usage: {{ $value }} tokens/hour"
```

---

## Log Aggregation (Loki)

### Structured Logging

```javascript
import { logger } from '@rtmn/shared/logger';

logger.info('Inference request', {
  requestId: 'req-123',
  tenantId: 'tenant-1',
  model: 'gpt-4o-mini',
  inputTokens: 100,
  outputTokens: 50,
  costUsd: 0.000045,
  latencyMs: 850
});

logger.error('Provider error', {
  requestId: 'req-123',
  provider: 'openai',
  error: 'Rate limit exceeded',
  retryAfter: 60
});
```

### Log Queries (LogQL)

```yaml
# Errors in last hour
{service="inference-gateway"} |= "error" | json | level="error"

# Slow requests
{service="inference-gateway"} | json | latencyMs > 5000

# High cost requests
{service="inference-gateway"} | json | costUsd > 0.01

# Specific tenant
{service="inference-gateway"} | json | tenantId="tenant-1"
```

---

## Distributed Tracing (Jaeger)

### Span Creation

```javascript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('inference-gateway');

app.post('/api/complete', async (req, res) => {
  const span = tracer.startSpan('inference.complete', {
    attributes: {
      'model': req.body.model,
      'tenant': req.headers['x-tenant-id']
    }
  });

  try {
    const response = await provider.complete(...);
    span.setAttributes({
      'tokens.input': response.inputTokens,
      'tokens.output': response.outputTokens,
      'cost.usd': response.costUsd
    });
    res.json(response);
  } finally {
    span.end();
  }
});
```

### Trace Visualization

View in Jaeger UI:
- http://localhost:16686
- Search by service, operation, tags
- View span hierarchy
- Identify bottlenecks

---

## Health Checks

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 4294
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 4294
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

### Deep Health Check

```javascript
app.get('/health/ready', async (req, res) => {
  const checks = {
    inference_gateway: 'healthy',
    providers: {},
    cost_ledger: 'healthy',
    billing_service: 'unknown'
  };

  // Check providers
  for (const [name, provider] of providerRegistry.providers) {
    try {
      await provider.complete(
        { id: 'gpt-4o-mini' },
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 5 }
      );
      checks.providers[name] = 'healthy';
    } catch (error) {
      checks.providers[name] = 'unhealthy';
    }
  }

  // Check billing service
  try {
    await fetch('http://localhost:4782/health');
    checks.billing_service = 'healthy';
  } catch (error) {
    checks.billing_service = 'unhealthy';
  }

  const allHealthy = Object.values(checks.providers).every(s => s === 'healthy')
    && checks.billing_service === 'healthy';

  res.status(allHealthy ? 200 : 503).json(checks);
});
```

---

## SLOs (Service Level Objectives)

### Availability SLO

**Target:** 99.9% uptime (43.2 minutes downtime/month)

**Measurement:**
```promql
sum(rate(inference_requests_total{status="success"}[30d])) / sum(rate(inference_requests_total[30d]))
```

**Error Budget:** 0.1% = 43.2 minutes/month

### Latency SLO

**Target:** p95 < 2s

**Measurement:**
```promql
histogram_quantile(0.95, sum(rate(inference_latency_ms_bucket[5m])) by (le))
```

### Cost SLO

**Target:** 99% of requests < $0.01

**Measurement:**
```promql
sum(rate(inference_cost_usd_bucket{le="0.01"}[5m])) / sum(rate(inference_cost_usd_count[5m]))
```

---

## Runbooks

### Runbook: High Error Rate

**Alert:** `HighErrorRate` firing

**Steps:**
1. Check provider status: `curl http://localhost:4294/api/stats`
2. Check error logs: `{service="inference-gateway"} |= "error"`
3. If OpenAI down: Check https://status.openai.com
4. If Anthropic down: Check https://status.anthropic.com
5. If all providers down: Enable stub mode `USE_REAL_PROVIDERS=false`
6. Notify team via Slack

### Runbook: High Cost

**Alert:** `CostSpike` firing

**Steps:**
1. Check cost dashboard: Grafana → Cost Analysis
2. Identify top spending tenant
3. Check if legitimate or abuse
4. If abuse: Block tenant, notify user
5. If legitimate: Review pricing, suggest optimization
6. Consider rate limiting

### Runbook: Provider Down

**Alert:** `ProviderDown` firing

**Steps:**
1. Verify provider status page
2. Check API key validity
3. Check rate limits
4. Failover to next provider (automatic via fallback chain)
5. If all providers down: Enable stub mode
6. Post incident update

---

*Monitoring guide: 2026-06-22*