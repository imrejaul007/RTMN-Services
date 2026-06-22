# Monitoring: Inventory → Reorder Closed Loop

## Overview

This document describes the monitoring strategy for the first closed loop, including Prometheus metrics, alerting rules, and dashboard queries.

## Metrics

### Loop Health Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `rez_loop_events_total` | Counter | `event_type`, `tenant_id`, `status` | Total events processed |
| `rez_loop_events_processed` | Counter | `event_type`, `tenant_id` | Successfully processed events |
| `rez_loop_events_failed` | Counter | `event_type`, `tenant_id`, `error_type` | Failed event processing |
| `rez_loop_duration_seconds` | Histogram | `event_type`, `tenant_id`, `decision` | End-to-end loop latency |
| `rez_loop_state_transitions` | Counter | `from_state`, `to_state` | State transition counts |

### Component-Specific Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `rez_intent_resolution_seconds` | Histogram | `tenant_id` | Intent Graph processing time |
| `rez_action_decision_seconds` | Histogram | `tenant_id`, `decision` | Action Engine decision time |
| `rez_draft_orders_created` | Counter | `tenant_id`, `supplier_id` | Draft orders created |
| `rez_draft_orders_approved` | Counter | `tenant_id` | Draft orders approved |
| `rez_draft_orders_rejected` | Counter | `tenant_id`, `reason` | Draft orders rejected |

### Business Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `rez_reorder_approval_rate` | Gauge | `tenant_id` | % of drafts approved (rolling 24h) |
| `rez_auto_approve_rate` | Gauge | `tenant_id` | % of orders auto-approved |
| `rez_average_order_value` | Gauge | `tenant_id` | Average PO value |
| `rez_stockout_duration_seconds` | Histogram | `product_category` | Time between low stock and reorder |

---

## Prometheus Configuration

### Scrape Config

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'rez-first-loop'
    static_configs:
      - targets: ['rez-orchestrator:9090', 'rez-emitter:9090']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Recording Rules

```yaml
# recording_rules.yml
groups:
  - name: rez_loop_performance
    interval: 30s
    rules:
      - record: rez:loop_p95_latency:5m
        expr: histogram_quantile(0.95, rate(rez_loop_duration_seconds_bucket[5m]))

      - record: rez:loop_success_rate:5m
        expr: rate(rez_loop_events_processed[5m]) / rate(rez_loop_events_total[5m])

      - record: rez:loop_throughput:1m
        expr: rate(rez_loop_events_total[1m])

  - name: rez_loop_business
    interval: 60s
    rules:
      - record: rez:approval_rate_24h
        expr: |
          sum(rate(rez_draft_orders_approved[24h])) /
          sum(rate(rez_draft_orders_created[24h]))

      - record: rez:auto_approve_rate_24h
        expr: |
          sum(rate(rez_draft_orders_created{decision="auto"}[24h])) /
          sum(rate(rez_draft_orders_created[24h]))
```

---

## Alerting Rules

### Critical Alerts

```yaml
# alerts.yml
groups:
  - name: rez_loop_critical
    rules:
      # Loop failure rate > 5%
      - alert: ReZLoopHighFailureRate
        expr: |
          (
            sum(rate(rez_loop_events_failed[5m])) /
            sum(rate(rez_loop_events_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "ReZ loop failure rate exceeds 5%"
          description: "Loop failure rate is {{ $value | humanizePercentage }} over the last 5 minutes"
          runbook_url: "https://wiki.internal/runbooks/rez-loop-failures"

      # Loop latency p95 > 5 minutes
      - alert: ReZLoopHighLatency
        expr: |
          histogram_quantile(0.95, rate(rez_loop_duration_seconds_bucket[5m])) > 300
        for: 10m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "ReZ loop p95 latency exceeds 5 minutes"
          description: "Loop p95 latency is {{ $value | humanizeDuration }}"
          runbook_url: "https://wiki.internal/runbooks/rez-loop-latency"

      # Intent Graph processing failure
      - alert: ReZIntentGraphUnavailable
        expr: |
          up{job="intent-graph"} == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Intent Graph service is down"
          description: "Intent Graph has been unreachable for more than 1 minute"
          runbook_url: "https://wiki.internal/runbooks/intent-graph-down"

      # Action Engine unavailable
      - alert: ReZActionEngineUnavailable
        expr: |
          up{job="action-engine"} == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Action Engine service is down"
          description: "Action Engine has been unreachable for more than 1 minute"
          runbook_url: "https://wiki.internal/runbooks/action-engine-down"

      # Event Platform queue backlog
      - alert: ReZEventQueueBacklog
        expr: |
          sum by (queue_name) (
            redis_stream_length{queue_name=~"inventory.*"}
          ) > 1000
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Event queue backlog detected"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} pending messages"
          runbook_url: "https://wiki.internal/runbooks/event-queue-backlog"
```

### Warning Alerts

```yaml
  - name: rez_loop_warning
    rules:
      # Loop latency p95 > 2 minutes
      - alert: ReZLoopElevatedLatency
        expr: |
          histogram_quantile(0.95, rate(rez_loop_duration_seconds_bucket[5m])) > 120
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "ReZ loop latency elevated"
          description: "Loop p95 latency is {{ $value | humanizeDuration }}"

      # Approval rate < 70%
      - alert: ReZLowApprovalRate
        expr: |
          sum(rate(rez_draft_orders_approved[1h])) /
          sum(rate(rez_draft_orders_created[1h])) < 0.7
        for: 1h
        labels:
          severity: warning
          team: product
        annotations:
          summary: "Draft order approval rate is low"
          description: "Approval rate is {{ $value | humanizePercentage }} - merchants may be rejecting orders"
          runbook_url: "https://wiki.internal/runbooks/low-approval-rate"

      # Retry rate elevated
      - alert: ReZHighRetryRate
        expr: |
          sum(rate(rez_loop_retry_total[5m])) /
          sum(rate(rez_loop_events_total[5m])) > 0.1
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Loop retry rate is elevated"
          description: "Retry rate is {{ $value | humanizePercentage }}"
```

---

## Dashboard Queries

### Grafana Dashboard: ReZ Loop Overview

```
# Panel: Events Processed (Last 24h)
sum(increase(rez_loop_events_processed[24h]))

# Panel: Success Rate (%)
100 * sum(rate(rez_loop_events_processed[5m])) / sum(rate(rez_loop_events_total[5m]))

# Panel: Loop Latency Distribution
histogram_quantile(0.50, rate(rez_loop_duration_seconds_bucket[5m]))  # p50
histogram_quantile(0.95, rate(rez_loop_duration_seconds_bucket[5m]))  # p95
histogram_quantile(0.99, rate(rez_loop_duration_seconds_bucket[5m]))  # p99

# Panel: Throughput (events/min)
sum(rate(rez_loop_events_total[1m])) * 60

# Panel: State Distribution
sum by (state) (rez_loop_state_transitions{to_state=~"completed|failed|pending.*"})

# Panel: Failed Events by Error Type
sum by (error_type) (increase(rez_loop_events_failed[1h]))
```

### Grafana Dashboard: Business Metrics

```
# Panel: Approval Rate (24h rolling)
100 * sum(rate(rez_draft_orders_approved[24h])) / sum(rate(rez_draft_orders_created[24h]))

# Panel: Auto-Approve vs Manual Approval
sum by (decision) (increase(rez_draft_orders_created[24h]))

# Panel: Average Order Value
sum(increase(rez_draft_orders_total_value[24h])) / sum(increase(rez_draft_orders_created[24h]))

# Panel: Top Rejected Products
topk(10, sum by (product_id) (increase(rez_draft_orders_rejected{reason="product"}[24h])))
```

### Grafana Dashboard: Component Health

```
# Panel: Intent Graph Latency
histogram_quantile(0.95, rate(rez_intent_resolution_seconds_bucket[5m]))

# Panel: Action Engine Latency
histogram_quantile(0.95, rate(rez_action_decision_seconds_bucket[5m]))

# Panel: NextaBiZ Availability
up{job="nextabiz"} * 100

# Panel: NextaBiZ Error Rate
100 * sum(rate(rez_nextabiz_errors_total[5m])) / sum(rate(rez_nextabiz_requests_total[5m]))
```

---

## Log Correlation

All logs within a loop execution should include these labels:

```json
{
  "correlation_id": "evt_{event_id}",
  "loop_id": "loop_{uuid}",
  "tenant_id": "tenant_{id}",
  "service": "rez-first-loop",
  "event_type": "inventory.low"
}
```

### Structured Log Format

```json
{
  "timestamp": "2026-05-01T12:00:00.123Z",
  "level": "info",
  "correlation_id": "evt_abc123",
  "loop_id": "loop_xyz789",
  "service": "orchestrator",
  "message": "Loop completed successfully",
  "context": {
    "event_type": "inventory.low",
    "decision": "draft_for_approval",
    "duration_ms": 5234,
    "draft_order_id": "po_123"
  }
}
```

---

## Distributed Tracing

### Span Names

| Stage | Span Name |
|-------|-----------|
| Event Emission | `inventory.low.emit` |
| Event Routing | `event.route` |
| Intent Processing | `intent.process` |
| Decision Making | `action.decide` |
| Draft Creation | `nextabiz.create_draft` |
| Feedback Recording | `feedback.record` |
| Model Update | `agent.update_model` |

### Trace Attributes

```
loop.correlation_id: string
loop.loop_id: string
loop.tenant_id: string
loop.event_type: string
loop.decision: string
loop.duration_ms: number
```

---

## Health Checks

### Orchestrator Health Endpoint

```
GET /health

Response:
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "checks": {
    "intent_graph": "healthy",
    "action_engine": "healthy",
    "nextabiz": "healthy",
    "feedback_service": "healthy",
    "adaptive_agent": "healthy"
  },
  "metrics": {
    "active_loops": 12,
    "pending_approval": 8,
    "loops_last_hour": 156
  }
}
```

---

## SLO Targets

| SLO | Target | Alert Threshold |
|-----|--------|-----------------|
| Loop Success Rate | 99.5% | 99% |
| Loop p95 Latency | < 5 minutes | 3 minutes |
| Loop p99 Latency | < 15 minutes | 10 minutes |
| Approval Rate | > 80% | 70% |
| Event Processing | < 10 seconds | 5 seconds |

---

## On-Call Runbooks

### Runbook: Loop Failure Spike

1. Check Event Platform queue depth
2. Verify Intent Graph health
3. Check Action Engine response times
4. Review recent deployments
5. Enable debug logging if needed

### Runbook: High Latency

1. Identify bottleneck stage (Intent vs Action vs Execution)
2. Check downstream service health
3. Review network metrics
4. Check for resource contention

### Runbook: Low Approval Rate

1. Review rejected orders in last 24h
2. Check for common rejection patterns
3. Analyze merchant feedback
4. Coordinate with product team
