# REZ Ecosystem — Staging, SLOs, and SLA Documentation

**Document Version:** 1.0
**Date:** 2026-04-30

---

## Staging Environment (OPS-007)

### Current State

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | Various (Render, Vercel) | Live users |
| Development | Local `docker compose` | Local development |

### Required: Staging Environment

A staging environment that mirrors production is needed for:
- Pre-production testing
- CI/CD integration testing
- Enterprise customer demos
- Security testing

### Implementation Options

#### Option 1: Separate Render Services (Recommended)
- Duplicate all services on Render with `*-staging` prefix
- Use separate database instances
- Approx. cost: $50-100/month

#### Option 2: Namespace-based Isolation
- Use MongoDB namespaces (`production.*`, `staging.*`)
- Use PostgreSQL schemas
- Single deployment, namespace separation
- Lower cost but requires careful query scoping

### Staging Checklist

- [ ] Deploy all services with `ENVIRONMENT=staging`
- [ ] Separate MongoDB instance/namespace
- [ ] Separate PostgreSQL database
- [ ] Separate Redis instance
- [ ] Staging domain DNS records
- [ ] Staging OAuth2 app registration
- [ ] Staging Razorpay keys
- [ ] Automated deployment pipeline

---

## Service Level Objectives (OPS-008)

### Defined SLOs

| Service | Availability | Latency p99 | Error Rate |
|---------|-------------|-------------|------------|
| **Auth Service** | 99.9% | 200ms | < 0.1% |
| **Wallet Service** | 99.95% | 300ms | < 0.05% |
| **Payment Service** | 99.9% | 500ms | < 0.1% |
| **Merchant Service** | 99.5% | 500ms | < 0.5% |
| **Hotel OTA API** | 99.5% | 500ms | < 0.5% |
| **Intent Graph** | 99.0% | 1000ms | < 1.0% |

### Error Budget Policy

| SLO | Monthly Downtime | Error Budget |
|-----|-----------------|--------------|
| 99.9% | 43 min | 0.1% |
| 99.5% | 3.6 hours | 0.5% |
| 99.0% | 7.3 hours | 1.0% |

**Deployment Policy:**
- If error budget > 50% remaining: Normal deployments
- If error budget < 50% remaining: Freeze non-critical deploys
- If error budget exhausted: Immediate rollback, postmortem

### Latency SLOs

| Endpoint Type | p50 | p95 | p99 |
|---------------|-----|-----|-----|
| Auth (OTP send) | < 100ms | < 200ms | < 500ms |
| Auth (verify) | < 100ms | < 200ms | < 300ms |
| Wallet balance | < 50ms | < 100ms | < 200ms |
| Payment init | < 100ms | < 200ms | < 500ms |
| Hotel search | < 200ms | < 500ms | < 1000ms |

---

## Status Page

### Recommended: Statuspage.io

Cost: Free for up to 5 components

### Manual Implementation

Create a public status page at `status.rez.money`:

```typescript
// status-page/src/app/api/status/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkService('auth', 'http://auth:4002/health'),
    checkService('wallet', 'http://wallet:4003/health'),
    checkService('payment', 'http://payment:4004/health'),
    checkService('merchant', 'http://merchant:4005/health'),
  ]);

  const statuses = checks.map((result, index) => ({
    name: ['auth', 'wallet', 'payment', 'merchant'][index],
    status: result.status === 'fulfilled' ? 'operational' : 'degraded',
  }));

  const overall = statuses.every(s => s.status === 'operational')
    ? 'operational'
    : 'degraded';

  return Response.json({
    status: overall,
    services: statuses,
    timestamp: new Date().toISOString(),
  });
}
```

### Incident Response Playbook

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|----------|
| SEV1 | Service down | 15 min | All auth failing |
| SEV2 | Major degradation | 30 min | Payment timeouts |
| SEV3 | Minor issue | 4 hours | Single endpoint slow |
| SEV4 | Cosmetic | Next sprint | UI glitch |

### Communication Template

```
INCIDENT [SEV1] - [Title]
Time: [HH:MM UTC]
Status: Investigating

Impact: [Who is affected, how many users]
Duration: [ ongoing / X hours ]

What we know:
- [Fact 1]
- [Fact 2]

What we're doing:
- [Action 1]
- [Action 2]

Next update: [HH:MM UTC]
```

---

## Monitoring Alerts

### PagerDuty Escalation

| Level | Contact | Trigger |
|-------|---------|---------|
| P1 | On-call engineer | SEV1 (service down) |
| P2 | On-call + lead | SEV2 (>5min) |
| P3 | Team Slack | SEV3 |
| Info | Dashboard | SEV4 |

### Alert Thresholds

```yaml
# Prometheus alert_rules.yml
groups:
  - name: rez_critical
    rules:
      - alert: AuthServiceDown
        expr: up{job="rez-auth-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Auth service is down"

      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (job)
          / sum(rate(http_requests_total[5m])) by (job)) > 0.01
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Error rate > 1%"
```

---

## Related Documentation

- [Observability Stack](./OBSERVABILITY.md)
- [OPS-007 Issue](./ISSUES_REPORT.md#OPS-007)
- [OPS-008 Issue](./ISSUES_REPORT.md#OPS-008)
