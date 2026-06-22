# Infrastructure - Source of Truth v2.0

**Last Updated:** May 11, 2026

---

## Overview

ReZ uses a microservices architecture with comprehensive infrastructure for reliability, observability, and scalability.

## Infrastructure Services (27)

### Reliability Services (10)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| **Event Bus** | 4006 | rez-event-bus | Event streaming | Active |
| **Rate Limit** | 4007 | rez-rate-limit | Rate limiting | Active |
| **Retry Service** | 4008 | rez-retry-service | Retry logic | Active |
| **DLQ Service** | 4015 | REZ-dlq-service | Dead letter queue | Active |
| **Circuit Breaker** | - | REZ-circuit-breaker | Fault tolerance | Active |
| **Idempotency Service** | - | REZ-idempotency-service | Idempotent operations | Active |
| **Policy Engine** | - | REZ-policy-engine | Policy enforcement | Active |
| **Webhook Service** | 4013 | rez-webhook-service | Outgoing webhooks | Active |
| **Scheduler Service** | 3017 | rez-scheduler-service | Cron jobs | Active |
| **Socket Service** | 4010 | rez-socket-service | Real-time messaging | Active |

### Observability Services (10)

| Service | Git Path | Purpose | Status |
|---------|----------|---------|--------|
| **Monitoring** | rez-monitoring | Service monitoring | Active |
| **Observability** | rez-observability | Distributed tracing | Active |
| **Observability System** | REZ-observability-system | System observability | Active |
| **Audit Logging** | REZ-audit-logging | Audit trail | Active |
| **API Docs** | rez-api-docs | API documentation | Active |
| **Analytics Service** | rez-analytics-service | Analytics platform | Active |
| **Analytics V2** | rez-analytics-v2 | Next-gen analytics | Active |
| **Error Intelligence** | rez-error-intelligence | Error tracking | Active |
| **Alerting** | (built-in) | Alert management | Active |
| **Health Checks** | (built-in) | Service health | Active |

### DevOps Services (7)

| Service | Git Path | Purpose | Status |
|---------|----------|---------|--------|
| **DevOps Config** | rez-devops-config | DevOps configs | Active |
| **Deploy** | rez-deploy | Deployment scripts | Active |
| **Load Tests** | REZ-load-tests | Performance testing | Active |
| **Integration Tests** | rez-integration-tests | Integration tests | Active |
| **Feature Flags** | rez-feature-flags | Feature toggles | Active |
| **DevOps Pipeline** | (GitHub Actions) | CI/CD | Active |
| **Monitoring Dashboards** | rez-ops-dashboard | Ops dashboard | Active |

---

## Hosting & Deployment

| Provider | Usage | Status |
|----------|-------|--------|
| **Render** | Primary hosting for services | Active |
| **Vercel** | Frontend hosting | Active |
| **MongoDB Atlas** | Primary database | Active |
| **Redis Cloud** | Caching and sessions | Active |
| **Firebase** | Push notifications, Auth | Active |
| **Cloudflare** | CDN, DDoS protection | Active |

---

## Monitoring & Observability Stack

| Tool | Usage | Endpoint |
|------|-------|----------|
| Sentry | Error tracking | `SENTRY_DSN` env var |
| OpenTelemetry | Distributed tracing | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Prometheus | Metrics | `/metrics` endpoint |
| Health checks | Service status | `/health` endpoint |
| Grafana | Metrics visualization | (dashboards) |
| ELK Stack | Log aggregation | (future) |

---

## Service Communication

### Internal Auth

All services communicate using:
- **X-Internal-Token** header
- **INTERNAL_SERVICE_TOKENS_JSON** env var (JSON mapping service names to tokens)

### External Auth

- JWT Bearer tokens for user authentication
- CORS origin validation (wildcard origins rejected)

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| OTP requests | 3 per minute per phone |
| OTP requests (IP) | 5 per 15 minutes per IP |
| Service-level | Via `rez-rate-limit` service |

---

## Database Architecture

| Database | Usage | Provider |
|----------|-------|----------|
| MongoDB | Primary data store | MongoDB Atlas |
| Redis | Caching, sessions | Redis Cloud |
| BullMQ | Job queues | Redis Cloud |
| PostgreSQL | Analytics (future) | TBD |
| Vector DB | Embeddings | TBD |

### MongoDB Collections

- `users` - User profiles
- `merchants` - Merchant data
- `orders` - Order documents
- `transactions` - Financial transactions
- `notifications` - Notification records
- `audit_logs` - Audit trail

### Redis Keys

- `session:*` - User sessions
- `rate:*` - Rate limiting
- `cache:*` - Data cache
- `queue:*` - Job queues
- `lock:*` - Distributed locks

---

## CI/CD Pipeline

### GitHub Actions

```
Push -> Lint -> Test -> Build -> Deploy
              |
              v
         Architecture Fitness Tests
```

### Architecture Fitness Tests

1. **No Bespoke Buttons** - Must use `@rez/rez-ui`
2. **No Console Logs** - Must use `rez-shared/telemetry`
3. **No Bespoke Idempotency** - Must use `rez-shared/idempotency`
4. **No Bespoke Enums** - Must use `rez-shared/enums/`
5. **No Math.random() for IDs** - Must use `uuid` or `crypto.randomUUID()`

### Deployment Strategy

- Blue-green deployments for zero downtime
- Rolling updates for gradual rollout
- Feature flags for canary releases
- Automatic rollback on failures

---

## Security

### Authentication Flow

```
User -> Phone + OTP -> Auth Service -> JWT
                              |
                              v
                    JWT stored in header
                              |
                              v
                    Services validate JWT
```

### Service-to-Service Auth

```
Service A -> X-Internal-Token -> Service B
                        |
                        v
              Validate against tokens
```

### Rate Limiting

- Global rate limits via `rez-rate-limit`
- Per-user limits for sensitive endpoints
- Per-IP limits for brute force protection

---

## Common Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret |
| `INTERNAL_SERVICE_TOKENS_JSON` | Internal service auth tokens |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `SENTRY_DSN` | Sentry error tracking |
| `PORT` | HTTP server port |
| `HEALTH_PORT` | Health check port |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry endpoint |

---

## Service Health Checks

Every service implements:

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Health check |
| `GET /health/ready` | Readiness probe |
| `GET /health/live` | Liveness probe |
| `GET /metrics` | Prometheus metrics |

---

## Related Documentation

- [Common Services](../1_COMMON_SERVICES/README.md)
- [Integrations](../6_INTEGRATIONS/README.md)
- [API Reference](../../API_REFERENCE.md)

---

**Last Updated:** May 11, 2026
**Maintained By:** Claude Code
