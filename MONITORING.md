# Monitoring & Observability

**Last Updated:** June 15, 2026

---

## Overview

RTMN uses a layered observability stack to detect, diagnose, and resolve issues quickly.

```
┌─────────────────────────────────────────────────────┐
│                   OBSERVABILITY STACK                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Metrics ──►  Datadog  ──►  Dashboards + Alerts     │
│                                                      │
│  Logs ─────►  Datadog Logs ──►  Log Analytics       │
│                                                      │
│  Traces ───►  Datadog APM ──►  Distributed Tracing  │
│                                                      │
│  Errors ───►  Sentry ──►  Error Tracking            │
│                                                      │
│  Uptime ───►  Better Uptime ──►  Status Page        │
│                                                      │
│  Security ─►  Cloudflare ──►  WAF + DDoS            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Metrics (Datadog)

### Key Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| **Platform Overview** | [TBD] | High-level service health |
| **BrandPulse** | [TBD] | BrandPulse-specific metrics |
| **Hotel OS** | [TBD] | Hotel OS metrics |
| **Foundation Services** | [TBD] | CorpID, MemoryOS, GoalOS |
| **Infrastructure** | [TBD] | CPU, memory, network |
| **Business Metrics** | [TBD] | Signups, API usage, revenue |

### Key Metrics to Monitor

#### BrandPulse

| Metric | Alert Threshold | Critical |
|--------|----------------|----------|
| `brandpulse.http.server.requests` | > 500 RPS | > 1000 RPS |
| `brandpulse.http.server.latency.p99` | > 2s | > 5s |
| `brandpulse.http.server.errors` | > 1% | > 5% |
| `brandpulse.sentiment.analysis.duration` | > 500ms | > 2s |
| `brandpulse.review.ingestion.latency` | > 30s | > 2min |
| `brandpulse.websocket.connections` | < 50% expected | < 25% expected |

#### Infrastructure

| Metric | Alert Threshold | Critical |
|--------|----------------|----------|
| `system.cpu.usage` | > 80% | > 95% |
| `system.memory.usage` | > 85% | > 95% |
| `system.disk.usage` | > 80% | > 90% |
| `mongodb.connections` | > 80% pool | > 95% pool |
| `redis.memory.usage` | > 80% | > 90% |

### Alert Routing

| Severity | Channel | Contact |
|----------|---------|---------|
| P1 | PagerDuty → Phone | Primary + Secondary On-Call |
| P2 | PagerDuty → SMS | Primary On-Call |
| P3 | Slack #alerts-medium | Engineering Team |
| P4 | Slack #alerts-low | Backlog |

---

## Logging

### Log Levels

| Level | Use Case |
|-------|----------|
| **ERROR** | Something failed; requires attention |
| **WARN** | Degraded performance; may need attention |
| **INFO** | Normal operational events |
| **DEBUG** | Detailed diagnostic info (dev/staging only) |

### Structured Log Format

```json
{
  "timestamp": "2026-06-15T10:30:00.000Z",
  "level": "INFO",
  "service": "brandpulse",
  "env": "production",
  "req_id": "req_abc123",
  "user_id": "user_xyz789",
  "message": "Review processed successfully",
  "meta": {
    "brand_id": "brand_123",
    "source": "google",
    "sentiment_score": 0.75,
    "duration_ms": 120
  }
}
```

### Query Examples

```
# All errors in BrandPulse (last hour)
service:brandpulse level:ERROR @timestamp>-1h

# Reviews from a specific brand
service:brandpulse message:"Review processed" brand_id:brand_123

# Slow requests (> 2s)
service:brandpulse duration_ms:>2000

# All 5xx errors
service:brandpulse http.status_code:>=500
```

---

## Tracing (Datadog APM)

### Spans to Monitor

| Span | Expected Duration | Alert Threshold |
|------|------------------|-----------------|
| `POST /api/v1/reviews/ingest` | < 500ms | > 2s |
| `sentiment.analyze` | < 300ms | > 1s |
| `source.fetch` (Google/Yelp) | < 2s | > 10s |
| `mongodb.find` | < 50ms | > 500ms |
| `redis.get` | < 5ms | > 50ms |

### Distributed Tracing

All inter-service calls are traced via RTNM SDK headers:
- `x-rtmn-trace-id` — Full trace ID
- `x-rtmn-span-id` — Current span
- `x-rtmn-parent-id` — Parent span

---

## Error Tracking (Sentry)

### Sentry Projects

| Project | Service |
|---------|---------|
| `rtmn-brandpulse` | BrandPulse API |
| `rtmn-brandpulse-dashboard` | BrandPulse Dashboard |
| `rtmn-hotel-os` | Hotel OS |
| `rtmn-restaurant-os` | Restaurant OS |
| `rtmn-foundation` | Foundation Services |

### Alert Rules

| Rule | Condition | Action |
|------|-----------|--------|
| New critical error | `level:critical` AND `first_seen:1h` | Page on-call |
| Error spike | > 50 errors in 5 min (vs baseline) | Page on-call |
| Regression | Same error after 30 days | Slack #alerts-medium |
| New issue type | `issue:new` AND `count:>5` | Slack #alerts-low |

---

## Uptime Monitoring (Better Uptime)

### Monitored Endpoints

| Endpoint | Check Interval | Timeout | Expected Status |
|----------|---------------|---------|-----------------|
| https://api.rtmn.io/health | 1 min | 10s | 200 |
| https://dashboard.rtmn.io/health | 1 min | 10s | 200 |
| https://api.rtmn.io/api/v1/brands | 5 min | 30s | 200 |
| MongoDB connection | 1 min | 10s | 200 |
| Redis connection | 1 min | 10s | 200 |

### SSL Certificate Monitoring

Monitor all RTMN domains for certificate expiry:
- Alert at 30 days before expiry
- Alert at 7 days before expiry
- Alert at 1 day before expiry

---

## Security Monitoring

### Cloudflare WAF

- Block known malicious IPs
- Rate limiting (100 req/min per IP for API)
- Bot detection
- Challenge suspicious requests

### Anomaly Detection

- Unusual API call volume
- Failed authentication attempts (> 10/min)
- API calls from new geo-locations
- Large data exports

### Audit Logs

All administrative actions are logged:
- Who (user/service account)
- What (action performed)
- When (timestamp)
- Where (source IP)
- Result (success/failure)

---

## Dashboard Access

| Dashboard | URL | Required Access |
|-----------|-----|----------------|
| Datadog | app.datadoghq.com | RTMN Google account |
| Sentry | rtmn.sentry.io | RTMN Google account |
| Better Uptime | status.rtmn.io | Better Uptime account |
| Cloudflare | dash.cloudflare.com | Cloudflare login |
| AWS Console | console.aws.amazon.com | AWS IAM |
| MongoDB Atlas | cloud.mongodb.com | MongoDB Atlas login |
| Status Page | status.rtmn.io | Public (read-only) |

---

*Review dashboards weekly. Update alerts quarterly based on traffic patterns.*