# Common Services Overview v2.0

**Last Updated:** May 11, 2026
**Total Services:** 21 core platform services

---

## Table of Contents

1. [Architecture Overview](./00_OVERVIEW.md)
2. [API Gateway](./01_API_GATEWAY.md)
3. [Auth Service](./02_AUTH_SERVICE.md)
4. [Payment Service](./03_PAYMENT_SERVICE.md)
5. [Wallet Service](./04_WALLET_SERVICE.md)
6. [Order Service](./05_ORDER_SERVICE.md)
7. [Profile Service](./06_PROFILE_SERVICE.md)
8. [Notification Service](./07_NOTIFICATION_SERVICE.md)
9. [Catalog Service](./08_CATALOG_SERVICE.md)
10. [Search Service](./09_SEARCH_SERVICE.md)
11. [Booking Service](./10_BOOKING_SERVICE.md)
12. [Webhook Service](./11_WEBHOOK_SERVICE.md)

---

## Service Summary

### Core Services (21)

| Service | Port | Git Path | Live URL | Status |
|---------|------|----------|----------|--------|
| API Gateway | 4000 | rez-api-gateway | - | Active |
| Auth Service | 4002 | rez-auth-service | https://rez-auth-service.onrender.com | Active |
| Payment Service | 4001 | rez-payment-service | https://rez-payment-service.onrender.com | Active |
| Wallet Service | 4004 | rez-wallet-service | https://rez-wallet-service.onrender.com | Active |
| Order Service | 4003 | rez-order-service | https://rez-order-service.onrender.com | Active |
| Profile Service | 3000 | rez-profile-service | https://rez-profile-service.onrender.com | Active |
| Merchant Service | 4005 | rez-merchant-service | - | Active |
| Notification Service | 4011 | rez-notifications-service | - | Active |
| Catalog Service | 3005 | rez-catalog-service | https://rez-catalog-service.onrender.com | Active |
| Search Service | 3009 | rez-search-service | - | Active |
| Booking Service | 3012 | rez-booking-service | - | Active |
| Socket Service | 4010 | rez-socket-service | - | Active |
| Webhook Service | 4013 | rez-webhook-service | - | Active |
| Validation Service | 3014 | rez-validation-service | - | Active |
| Scheduler Service | 3017 | rez-scheduler-service | - | Active |
| Contracts Service | 3018 | rez-contracts | - | Active |
| White Label Service | 3019 | rez-white-label-service | - | Active |
| Channel Manager | 3020 | rez-channel-manager-service | - | Active |
| Staff Service | 3021 | rez-staff-service | - | Active |
| POS Service | 3022 | rez-pos-service | - | Active |
| Currency Service | 3023 | rez-currency-service | - | Active |

### Infrastructure Services (27)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Event Bus | 4006 | rez-event-bus | Event streaming | Active |
| Rate Limit | 4007 | rez-rate-limit | Rate limiting | Active |
| Retry Service | 4008 | rez-retry-service | Retry logic | Active |
| DLQ Service | 4015 | REZ-dlq-service | Dead letter queue | Active |
| Circuit Breaker | - | REZ-circuit-breaker | Fault tolerance | Active |
| Idempotency Service | - | REZ-idempotency-service | Idempotent ops | Active |
| Monitoring | - | rez-monitoring | Service monitoring | Active |
| Observability | - | rez-observability | Distributed tracing | Active |
| Audit Logging | - | REZ-audit-logging | Audit trail | Active |
| Policy Engine | - | REZ-policy-engine | Policy enforcement | Active |
| Websocket Hub | - | rez-websocket-hub | WebSocket management | Active |
| Push Service | - | rez-push-service | Push notifications | Active |
| Aggregation Hub | - | rez-aggregator-hub | Data aggregation | Active |
| Profile Aggregator | - | rez-profile-aggregator-service | Profile sync | Active |
| Data Pipeline | - | rez-data-pipeline | ETL pipeline | Active |

---

## Service Communication

### Internal Authentication

All services communicate internally using:
- **X-Internal-Token**: Bearer token for service-to-service authentication
- **INTERNAL_SERVICE_TOKENS_JSON**: JSON object mapping service names to tokens

### External Authentication

- **JWT Bearer tokens** for user authentication
- **Phone + OTP** for user login
- **PIN** for returning users

### CORS Configuration

Allowed origins must be explicitly configured. Wildcard (`*`) origins are rejected at startup.

---

## Database

All services use:
- **MongoDB Atlas** - Primary data store
- **Redis Cloud** - Caching, sessions, rate limiting
- **BullMQ** - Job queues (Redis-based)

---

## Observability

| Tool | Service | Endpoint |
|------|---------|----------|
| Sentry | Error tracking | `SENTRY_DSN` env var |
| OpenTelemetry | Distributed tracing | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Prometheus | Metrics | `/metrics` endpoint |
| Health checks | Service status | `/health` endpoint |

---

## Common Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `REDIS_URL` | Redis connection string | `redis://...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `INTERNAL_SERVICE_TOKENS_JSON` | Internal service tokens | `{"auth":"token",...}` |
| `CORS_ORIGIN` | Allowed origins | `https://app.rez.com` |
| `SENTRY_DSN` | Sentry error tracking | `https://...` |
| `PORT` | HTTP server port | `4000` |
| `HEALTH_PORT` | Health check port | `4001` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry endpoint | `https://...` |

---

## Deployment

Services are deployed on **Render** with:
- Health checks on `/health` endpoint
- Graceful shutdown handling for SIGTERM/SIGINT
- Automatic restart on failure
- Environment-specific configuration via `.env`

### Architecture Fitness Tests

Services must pass these tests:
1. **No Bespoke Buttons** - Must use `@rez/rez-ui`
2. **No Console Logs** - Must use `rez-shared/telemetry`
3. **No Bespoke Idempotency** - Must use `rez-shared/idempotency`
4. **No Bespoke Enums** - Must use `rez-shared/enums/`
5. **No Math.random() for IDs** - Must use `uuid` or `crypto.randomUUID()`

---

## Service Health Ports

| Service | Primary Port | Health Port |
|---------|--------------|-------------|
| API Gateway | 4000 | 4001 |
| Auth Service | 4002 | 4003 |
| Payment Service | 4001 | 4000 |
| Wallet Service | 4004 | 4005 |
| Order Service | 4003 | 4002 |
| Profile Service | 3000 | 3001 |
| Merchant Service | 4005 | 4006 |
| Notification Service | 4011 | 4012 |
| Catalog Service | 3005 | 3006 |
| Search Service | 3009 | 3010 |

---

## Documentation Last Updated

**May 11, 2026**
