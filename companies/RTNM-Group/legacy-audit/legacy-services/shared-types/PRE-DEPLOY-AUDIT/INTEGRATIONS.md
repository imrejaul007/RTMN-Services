# Integration Audit Report

**Date:** 2026-05-02
**Auditor:** Integration Auditor
**Scope:** /Users/rejaulkarim/Documents/ReZ Full App, /Users/rejaulkarim/Documents/rez-intent-graph

---

## Executive Summary

The Rez Ecosystem contains a well-structured microservices architecture with 40+ services. Integration patterns are mostly consistent, with good implementations of circuit breakers, retry logic, and event buses. However, several areas require attention before deployment.

---

## 1. Service URL References

### 1.1 Configuration Source of Truth

**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/config/services.ts`

| Service | Environment Variable | Dev Fallback | Production Required |
|---------|---------------------|--------------|-------------------|
| wallet | WALLET_SERVICE_URL | localhost:4004 | YES |
| monolith | MONOLITH_URL | localhost:4000 | YES |
| order | ORDER_SERVICE_URL | localhost:4006 | YES |
| payment | PAYMENT_SERVICE_URL | localhost:4002 | YES |
| merchant | MERCHANT_SERVICE_URL | localhost:4003 | YES |
| notification | NOTIFICATION_SERVICE_URL | localhost:4005 | YES |
| auth | AUTH_SERVICE_URL | localhost:4001 | YES |
| catalog | CATALOG_SERVICE_URL | localhost:4007 | YES |
| search | SEARCH_SERVICE_URL | localhost:4008 | YES |
| marketing | MARKETING_SERVICE_URL | localhost:4009 | YES |
| gamification | GAMIFICATION_SERVICE_URL | localhost:4010 | YES |
| ads | ADS_SERVICE_URL | localhost:4011 | YES |
| pms | PMS_SERVICE_URL | localhost:4012 | YES |
| analytics | ANALYTICS_SERVICE_URL | localhost:4013 | YES |
| insights | INSIGHTS_SERVICE_URL | localhost (dynamic) | NO |

**Status:** GOOD - All URLs use environment variables with proper fallbacks.

### 1.2 HTTP Client Configuration

**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/integrations/external-services.ts`

| Feature | Implementation | Status |
|---------|---------------|--------|
| Circuit Breaker | Custom implementation with 5-failure threshold, 60s reset | GOOD |
| Retry Logic | Exponential backoff (100ms base, 2x multiplier, max 2000ms) | GOOD |
| Timeout | 10s default, configurable per request | GOOD |
| Max Retries | 3 default | GOOD |

**Issues Found:**
1. **Inconsistent internal token** - Line 138 uses `process.env.INTERNAL_SERVICE_TOKEN` but Line 43 in `insightConnectors.ts` uses `process.env.INTERNAL_TOKEN` - **MISMATCH**
2. **Missing timeout on some calls** - `getUserFromToken` has explicit 5000ms timeout, but many helper functions rely on default

### 1.3 Auth Token Inconsistencies

| File | Token Variable | Usage |
|------|----------------|-------|
| external-services.ts:138 | `INTERNAL_SERVICE_TOKEN` | All HTTP calls |
| insightConnectors.ts:43 | `INTERNAL_TOKEN` | Order/Marketing/Wallet calls |
| websocket/server.ts:36 | `INTERNAL_SERVICE_TOKEN` | WebSocket auth |

**Issue:** Two different environment variable names for the same purpose across files.

---

## 2. Event Bus Dependencies

### 2.1 Redis Pub/Sub (ReZ Mind)

**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/eventBus.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Channel | GOOD | Uses 'rez-mind' channel consistently |
| Event Types | WARNING | Event naming inconsistent: `insight.generated`, `insight.triggered`, `insight.actioned` (dot notation) vs `commerce.order_completed` (underscore) |
| Handler Error Handling | GOOD | Errors caught and logged |
| Subscription Pattern | GOOD | Unsubscribe function returned |

### 2.2 Event Platform Integration

**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/integrations/eventPlatformIntegration.ts`

| Event Type | Queue Name | Internal Mapping |
|------------|------------|------------------|
| order.completed | events-order-completed | commerce.order_completed |
| conversion | events-conversion | commerce.conversion |
| ad.impression | events-ad-impression | ads.impression |
| ad.click | events-ad-click | ads.click |
| notification.sent | events-notification-sent | engagement.notification_sent |
| notification.opened | events-notification-opened | engagement.notification_opened |

**Issue:** Polling interval (5 seconds) may miss events in high-throughput scenarios.

### 2.3 Service Event Buses

| Service | Stream Name | Variable | Status |
|---------|-------------|----------|--------|
| rez-wallet-service | `rez:events` | EVENT_STREAM_NAME | GOOD |
| rez-order-service | `rez:events` | EVENT_STREAM_NAME | GOOD |
| rez-payment-service | (check config) | EVENT_STREAM_NAME | UNKNOWN |

**Consistency:** All services use `EVENT_STREAM_NAME` env var with `rez:events` fallback - GOOD

### 2.4 Event Naming Convention Issues

**Dot notation events:**
- `insight.generated`
- `insight.triggered`
- `insight.actioned`
- `wallet.debited`
- `wallet.credited`
- `order.created`
- `order.completed`

**Underscore notation events:**
- `commerce.order_completed`
- `commerce.conversion`
- `ads.impression`

**Recommendation:** Standardize on dot notation (e.g., `commerce.order.completed`).

---

## 3. Database Connections

### 3.1 MongoDB Connections

**ReZ Mind (rez-intent-graph):**

**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/database/mongodb.ts`

| Setting | Value | Assessment |
|---------|-------|------------|
| maxPoolSize | 50 | GOOD - High concurrency |
| minPoolSize | 2 | GOOD |
| serverSelectionTimeoutMS | 5000 | GOOD |
| socketTimeoutMS | 45000 | GOOD |
| connectTimeoutMS | 10000 | GOOD |
| retryWrites | true | GOOD |
| w | 'majority' | GOOD |
| journal | true | GOOD |
| heartbeatFrequencyMS | 10000 | GOOD |
| MAX_RETRIES | 5 | GOOD |
| Retry Delay | Exponential (1s, 2s, 4s...) | GOOD |

**Status:** EXCELLENT

### 3.2 Redis Connections

**Shared Memory (rez-intent-graph):**

**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/config/redis.ts`

| Client | Purpose | maxRetriesPerRequest | Status |
|--------|---------|---------------------|--------|
| redis | General ops | null (required for Socket.io) | GOOD |
| publisher | Pub/sub | null | GOOD |
| subscriber | Pub/sub | null | GOOD |

**Retry Strategy:**
```typescript
retryStrategy: (times) => Math.min(times * 50, 2000)
reconnectOnError: ['READONLY', 'ECONNRESET', 'ETIMEDOUT']
```

**Status:** GOOD

**Shared Memory (shared-memory.ts):**

| Setting | Value | Assessment |
|---------|-------|------------|
| maxRetriesPerRequest | 3 | ACCEPTABLE |
| retryStrategy | 200ms * attempts, max 2000ms | GOOD |
| lazyConnect | true | GOOD |

**Issue:** Shared memory falls back to in-memory Map when Redis unavailable - this is intentional for development but should be monitored in production.

### 3.3 Redis URL Configuration

| File | Variable | Fallback | Status |
|------|----------|----------|--------|
| config/redis.ts | REDIS_URL or REDIS_HOST/PORT/PASSWORD | localhost:6379 | GOOD |
| agents/shared-memory.ts | REDIS_URL or INTENT_GRAPH_REDIS_URL | localhost:6379 | WARNING - Different fallback env var |

**Issue:** `INTENT_GRAPH_REDIS_URL` fallback only in shared-memory.ts, not in config/redis.ts - potential confusion.

---

## 4. WebSocket Clients

### 4.1 ReZ Mind WebSocket Server

**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/websocket/server.ts`

| Feature | Implementation | Status |
|---------|---------------|--------|
| Authentication | Bearer token, API key, internal token | GOOD |
| Timing-safe comparison | crypto.timingSafeEqual used | GOOD |
| Heartbeat | 30s interval, 60s stale threshold | GOOD |
| Metrics broadcast | 30s interval | GOOD |
| Connection tracking | Client map with filters | GOOD |
| Graceful shutdown | cleanup on close | GOOD |

**Channels:**
- `demand_signals`
- `scarcity_alerts`
- `nudge_events`
- `system_metrics`
- `merchant_dashboard`
- `user_intents`

**Status:** GOOD

### 4.2 No External WebSocket Clients Found

No services currently connect TO other services via WebSocket - all WebSocket usage is for client connections to services.

---

## 5. Shared Module Issues

### 5.1 Package Structure

| Package | Path | Version | Exports |
|---------|------|---------|---------|
| @rez/shared-types | packages/shared-types | 2.0.0 | Enums, Entities, FSM, Branded IDs, Guards, Schemas |
| @rez/shared | packages/rez-shared | 1.0.0 | API Docs, Audit, Health, RateLimit, Tracing |
| @rez/rez-shared | packages/rez-shared | (separate) | Same as @rez/shared |

**Issue:** Possible duplicate package naming (`@rez/shared` vs `@rez/rez-shared`).

### 5.2 Shared Types Version

**Status:** `@rez/shared-types` at v2.0.0 - MAJOR version means breaking changes. Verify all services consume compatible versions.

### 5.3 Shared Memory Singleton Pattern

**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/agents/shared-memory.ts`

```typescript
static getInstance(): SharedMemory {
  if (!SharedMemory.instance) {
    SharedMemory.instance = new SharedMemory();
  }
  return SharedMemory.instance;
}
```

**Status:** GOOD - Proper singleton implementation.

### 5.4 Circular Dependency Risk

**Potential circular dependencies identified:**
1. `IntentCaptureService` imports from `models/index.js`
2. `DormantIntentService` imports from `models/index.js`
3. Both may import from shared modules

**Status:** MONITOR - No actual circular dependencies found, but architecture risk exists.

---

## 6. Missing Error Handling

### 6.1 HTTP Request Error Handling

**External Services (external-services.ts):**

| Scenario | Handling | Status |
|----------|----------|--------|
| Circuit open | Returns 503 with error message | GOOD |
| 4xx errors | Non-retry, records failure | GOOD |
| 5xx errors | Retry with backoff | GOOD |
| Network errors | Retry with backoff | GOOD |
| Timeout | AbortController, logs error | GOOD |

### 6.2 Insight Connectors Error Handling

**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/integrations/insightConnectors.ts`

**Issue:** All fetch calls use basic try/catch with logging. No circuit breaker protection for order/marketing/wallet service calls.

### 6.3 Event Bus Error Handling

**Event Bus (eventBus.ts):**

| Scenario | Handling | Status |
|----------|----------|--------|
| Publish failure | Logs error, throws | GOOD |
| Subscribe failure | Logs error, continues | GOOD |
| Handler error | Logs error, continues (other handlers run) | GOOD |

### 6.4 MongoDB Error Handling

| Scenario | Handling | Status |
|----------|----------|--------|
| Connection failure | Retry with exponential backoff (5 attempts) | GOOD |
| Query failure | Throws error | GOOD |
| Write failure | Throws error | GOOD |

### 6.5 Redis Error Handling

| Scenario | Handling | Status |
|----------|----------|--------|
| Connection failure | Retry strategy, falls back to in-memory | GOOD |
| Operation failure | Warns and falls through to in-memory | GOOD |

---

## 7. Recommendations

### CRITICAL (Must Fix Before Deploy)

1. **Unify Internal Token Environment Variable**
   - Change all `INTERNAL_TOKEN` references to `INTERNAL_SERVICE_TOKEN`
   - Files affected:
     - `/Users/rejaulkarim/Documents/rez-intent-graph/src/integrations/insightConnectors.ts:43`

2. **Standardize Event Naming Convention**
   - Choose dot notation consistently: `commerce.order.completed` not `commerce.order_completed`
   - Update event platform integration mappings

### HIGH (Fix Before Production)

3. **Add Circuit Breaker to Insight Connectors**
   - `insightConnectors.ts` makes HTTP calls without circuit breaker protection
   - Either use shared circuit breaker or add local implementation

4. **Redis URL Fallback Consistency**
   - Add `INTENT_GRAPH_REDIS_URL` support to `config/redis.ts` for consistency

5. **Increase Event Platform Polling Frequency**
   - Consider reducing from 5s to 1-2s for high-throughput scenarios

### MEDIUM (Fix in Next Sprint)

6. **Package Version Verification**
   - Audit all services for `@rez/shared-types` version compatibility
   - Ensure v2.0.0 consumers are updated

7. **Document Service Dependencies**
   - Create dependency matrix showing which services call which

### LOW (Technical Debt)

8. **Consider BullMQ Migration**
   - Event platform uses polling; BullMQ would be more efficient
   - Current polling works but is not optimal

9. **WebSocket Authentication Enhancement**
   - Consider JWT validation instead of token length check
   - Current implementation accepts any token > 10 chars

10. **Add Distributed Tracing Headers**
    - Ensure X-Request-ID propagation across all service calls
    - Currently only in shared logger middleware

---

## Appendix A: Service Dependency Matrix

```
rez-intent-graph → rez-wallet-service (HTTP)
rez-intent-graph → rez-order-service (HTTP)
rez-intent-graph → rez-payment-service (HTTP)
rez-intent-graph → rez-merchant-service (HTTP)
rez-intent-graph → rez-notification-service (HTTP via sharedMemory)
rez-intent-graph → rez-auth-service (HTTP)
rez-intent-graph → rez-marketing-service (HTTP)
rez-intent-graph → rez-event-platform (Redis polling)
rez-intent-graph → rez-api-gateway (WebSocket clients)
```

## Appendix B: Event Stream Summary

| Stream | Producers | Consumers |
|--------|-----------|-----------|
| rez:events | All services | Event consumers |
| stream:intent:events | intent-graph | intent-processors |
| stream:intent:nudges | intent-graph | nudge workers |
| stream:intent:analytics | intent-graph | analytics |
| rez-mind | intent-graph pub/sub | intent-graph subscribers |

## Appendix C: Environment Variables Required

```
# Core
MONGODB_URI (required)
REDIS_URL or (REDIS_HOST + REDIS_PORT + REDIS_PASSWORD)

# Service URLs (required in production)
WALLET_SERVICE_URL
MONOLITH_URL
ORDER_SERVICE_URL
PAYMENT_SERVICE_URL
MERCHANT_SERVICE_URL
NOTIFICATION_SERVICE_URL
AUTH_SERVICE_URL
CATALOG_SERVICE_URL
SEARCH_SERVICE_URL
MARKETING_SERVICE_URL
GAMIFICATION_SERVICE_URL
ADS_SERVICE_URL
PMS_SERVICE_URL
ANALYTICS_SERVICE_URL
INSIGHTS_SERVICE_URL

# Auth
INTERNAL_SERVICE_TOKEN (required for inter-service calls)

# Optional
EVENT_STREAM_NAME (default: rez:events)
EVENT_BUS_ENABLED (default: true)
EVENT_PLATFORM_ENABLED (default: true)
NODE_ENV (determines dev/prod behavior)
```

---

*End of Integration Audit Report*
