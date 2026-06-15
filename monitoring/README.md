# RTMN Monitoring & Observability

Comprehensive monitoring setup for RTMN services.

## Overview

RTMN uses a multi-layered observability stack to ensure reliability and performance across all services.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RTMN OBSERVABILITY STACK                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     METRICS (Datadog)                                │ │
│  │  • Custom business metrics                                           │ │
│  │  • Infrastructure monitoring                                         │ │
│  │  • APM distributed tracing                                           │ │
│  │  • Real-time dashboards                                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     ERRORS (Sentry)                                  │ │
│  │  • Full-stack error tracking                                        │ │
│  │  • Performance monitoring                                           │ │
│  │  • Profiling (Node.js)                                              │ │
│  │  • Release tracking                                                 │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     UPTIME (Better Uptime)                          │ │
│  │  • 1-minute check intervals                                         │ │
│  │  • SSL monitoring                                                   │ │
│  │  • Incident management                                               │ │
│  │  • Team notifications                                               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└────────────────────────────────────────────────────────────────��────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install @sentry/node @sentry/profiling-node dd-trace hot-shots
```

### 2. Configure Environment Variables

Create a `.env` file with your monitoring credentials:

```bash
# Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project
SERVICE_NAME=rtmn-service-name
GIT_SHA=$(git rev-parse HEAD)

# Datadog
DD_AGENT_HOST=localhost
DD_SERVICE_NAME=rtmn-service-name
NODE_ENV=production

# Application
MONGODB_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
RTNM_SDK_URL=https://api.rtmn.io
```

### 3. Integrate with Your Service

```typescript
// At the top of your entry file
import './monitoring/sentry';
import { requestMetrics, metrics } from './monitoring/datadog';

// Apply middleware
app.use(requestMetrics);

// Use metrics in your code
metrics.brandsCreated();
metrics.reviewsProcessed('google');
```

## Monitoring Stack Components

### Sentry (Error Tracking)

| Feature | Description |
|---------|-------------|
| Error Tracking | Full-stack error monitoring with context |
| Performance | Distributed tracing and profiling |
| Release Tracking | Track errors by version/deploy |
| Alerts | Configurable alert rules |

**Setup:**
```typescript
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

### Datadog (Metrics & APM)

| Feature | Description |
|---------|-------------|
| APM | Distributed tracing across services |
| Metrics | Custom business and infrastructure metrics |
| Logs | Centralized log aggregation |
| Dashboards | Real-time visualization |

**Setup:**
```bash
# Install Datadog agent
brew install datadog-agent

# Configure agent
sudo nano /opt/datadog-agent/etc/datadog.yaml
# api_key: YOUR_API_KEY

# Start agent
brew services start datadog-agent
```

### Better Uptime (Uptime Monitoring)

| Feature | Description |
|---------|-------------|
| Heartbeat Checks | 1-minute intervals |
| SSL Monitoring | Certificate expiration alerts |
| Incident Management | On-call scheduling |
| Status Pages | Public status pages |

**Monitored Endpoints:**

| Service | URL | Interval |
|---------|-----|----------|
| BrandPulse API | https://api.rtmn.io/health | 60s |
| RTMN SDK | https://sdk.rtmn.io/health | 60s |
| Documentation | https://docs.rtmn.io | 60s |
| Status Page | https://status.rtmn.io | 60s |

## Dashboards

### Key Dashboards

1. **RTMN Overview** - High-level view of all services
2. **BrandPulse Metrics** - Review volume, sentiment trends
3. **API Performance** - Latency, error rates, throughput
4. **Infrastructure** - CPU, memory, connections
5. **Business Metrics** - Subscriptions, revenue, growth

### Sentry Dashboards

- Error overview by service
- Performance by transaction
- Release health
- Team workload

### Better Uptime Dashboards

- Uptime percentage
- Incident history
- Response time trends
- SSL certificate status

## Alert Configuration

### Critical Alerts (Immediate)

| Alert | Condition | Action |
|-------|-----------|--------|
| Service Down | HTTP 503 for 2 min | Page on-call |
| High Error Rate | >5% errors for 5 min | Page on-call |
| Database Down | Connection failure | Page on-call |
| SSL Expiring | <7 days to expiry | Email + Slack |

### Warning Alerts (Informational)

| Alert | Condition | Action |
|-------|-----------|--------|
| High Latency | p99 > 2s for 10 min | Slack |
| High Memory | >80% for 15 min | Slack |
| Rate Limited | 429 responses >10% | Slack |
| Disk Space | <20% remaining | Email |

### Business Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Zero Reviews | No new reviews in 24h | Email |
| Sentiment Drop | Score drops >20% | Slack |
| API Quota | >90% quota used | Email |

## Runbooks

### Service Down

1. Check Better Uptime for which endpoint is down
2. Check Datadog for error logs
3. Check Sentry for recent errors
4. Verify service is running (`docker ps`)
5. Check logs (`docker logs service-name`)
6. Restart service if needed
7. Page senior engineer if not resolved in 15 min

### High Latency

1. Check Datadog APM for slow transactions
2. Check database query performance
3. Check Redis cache hit rates
4. Scale service if resource-constrained
5. Add circuit breakers if external API slow

### Error Spike

1. Check Sentry for error types
2. Identify new errors vs existing
3. Check recent deployments
4. Roll back if deployment-related
5. Create fix and deploy

### Database Issues

1. Check connection pool size
2. Check slow query log
3. Identify missing indexes
4. Run ANALYZE on affected tables
5. Scale database if resource-constrained

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
SENTRY_DSN=development-dsn
DD_AGENT_HOST=localhost
tracesSampleRate=1.0
profilesSampleRate=1.0
```

### Production

```bash
NODE_ENV=production
SENTRY_DSN=production-dsn
DD_AGENT_HOST=dd-agent
tracesSampleRate=0.1
profilesSampleRate=0.1
```

## Health Check Endpoint

All services expose a `/health` endpoint:

```json
{
  "status": "healthy",
  "timestamp": "2026-06-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "dependencies": {
    "mongodb": { "status": "up", "latency": 5 },
    "redis": { "status": "up", "latency": 2 },
    "rtmnApi": { "status": "up", "latency": 45 }
  }
}
```

## Metrics Reference

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `rtmn.brandpulse.brands.created` | Counter | New brands created |
| `rtmn.brandpulse.reviews.processed` | Counter | Reviews processed by source |
| `rtmn.brandpulse.sentiment.analyzed` | Histogram | Sentiment analysis duration |
| `rtmn.billing.subscriptions.active` | Gauge | Active subscriptions |
| `rtmn.billing.revenue.monthly` | Gauge | Monthly revenue |

### API Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `rtmn.api.requests.count` | Counter | API requests by method/path/status |
| `rtmn.api.latency` | Histogram | API latency by method/path |

### Infrastructure Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `rtmn.infrastructure.db.connections` | Gauge | Database connections |
| `rtmn.infrastructure.redis.connections` | Gauge | Redis connections |
| `rtmn.health.status` | Gauge | Service health (1=healthy, 0=unhealthy) |

## Support

- **Documentation**: https://docs.rtmn.io
- **Status Page**: https://status.rtmn.io
- **Support Email**: support@rtmn.com
- **On-Call**: Check PagerDuty for current on-call engineer

---

*Last Updated: June 15, 2026*
*RTMN Monitoring & Observability*
