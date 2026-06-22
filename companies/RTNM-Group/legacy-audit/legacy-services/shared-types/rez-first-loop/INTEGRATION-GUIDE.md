# Integration Guide: Inventory → Reorder Closed Loop

## Table of Contents

1. [Service Connections](#service-connections)
2. [Configuration](#configuration)
3. [Testing the Loop](#testing-the-loop)
4. [Monitoring the Loop](#monitoring-the-loop)

---

## Service Connections

### 1. rez-merchant-service → rez-event-platform

**Connection Type:** REST API (HTTP POST)

**Endpoint:**
```
POST /api/v1/events
Authorization: Bearer {service_token}
Content-Type: application/json
```

**Event Payload:**
```json
{
  "eventId": "evt_{uuid}",
  "eventType": "inventory.low",
  "timestamp": "2026-05-01T12:00:00Z",
  "source": "rez-merchant-service",
  "tenantId": "tenant_{id}",
  "payload": {
    "productId": "prod_{id}",
    "sku": "SKU-12345",
    "currentStock": 5,
    "reorderPoint": 20,
    "preferredSupplierId": "sup_{id}",
    "suggestedQuantity": 100
  }
}
```

**Health Check:**
```
GET /api/v1/health
Response: { "status": "healthy", "connectedServices": [...] }
```

---

### 2. rez-event-platform → rez-intent-graph

**Connection Type:** Message Queue (RabbitMQ/Redis Streams)

**Exchange:** `rez.events`
**Routing Key:** `inventory.low`
**Queue:** `intent-graph.inventory.low`

**Message Format:**
```json
{
  "messageId": "msg_{uuid}",
  "headers": {
    "correlationId": "evt_{event_id}",
    "source": "rez-event-platform",
    "timestamp": "2026-05-01T12:00:00.123Z"
  },
  "body": { /* Original inventory.low event */ }
}
```

**Dead Letter Queue:** `intent-graph.dlq` (for failed processing)

---

### 3. rez-intent-graph → rez-action-engine

**Connection Type:** Internal gRPC

**Service Definition:**
```protobuf
service IntentProcessor {
  rpc ProcessIntent(ProcessIntentRequest) returns (ProcessIntentResponse);
  rpc StreamIntents(StreamIntentsRequest) returns (stream Intent);
}

message ProcessIntentRequest {
  string intent_id = 1;
  IntentType type = 2;
  google.protobuf.Struct context = 3;
  string tenant_id = 4;
}

message Intent {
  string id = 1;
  IntentType type = 2;
  google.protobuf.Struct context = 3;
  Decision decision = 4;
}
```

**Endpoint:** `grpc://intent-graph.internal:50051`

---

### 4. rez-action-engine → NextaBiZ

**Connection Type:** REST API

**Create Draft PO:**
```
POST /api/v1/procurement/draft-orders
Authorization: Bearer {procurement_token}
```

**Request:**
```json
{
  "supplierId": "sup_{id}",
  "lineItems": [
    {
      "productId": "prod_{id}",
      "sku": "SKU-12345",
      "quantity": 100,
      "unitPrice": 12.50
    }
  ],
  "metadata": {
    "trigger": "inventory.low",
    "intentId": "intent_{id}",
    "correlationId": "evt_{event_id}"
  }
}
```

**Response:**
```json
{
  "draftOrderId": "po_{id}",
  "status": "draft",
  "estimatedTotal": 1250.00,
  "approvalRequired": true,
  "approvalUrl": "/procurement/orders/po_{id}/approve"
}
```

---

### 5. NextaBiZ → BizOS UI

**Connection Type:** Webhook / Polling

**Webhook Event:**
```
POST {merchant_webhook_url}
X-Signature: sha256={hmac}
Content-Type: application/json

{
  "event": "draft_order.created",
  "orderId": "po_{id}",
  "merchantId": "merchant_{id}",
  "timestamp": "2026-05-01T12:00:00Z"
}
```

---

### 6. BizOS UI → rez-feedback-service

**Connection Type:** REST API

**Record Approval:**
```
POST /api/v1/feedback/loop-outcomes
Authorization: Bearer {service_token}
```

**Payload:**
```json
{
  "loopId": "loop_{uuid}",
  "correlationId": "evt_{event_id}",
  "intentId": "intent_{id}",
  "draftOrderId": "po_{id}",
  "outcome": "approved",
  "merchantId": "merchant_{id}",
  "merchantAction": {
    "action": "approved",
    "modifiedAmount": 100,
    "modifiedQuantity": 120,
    "feedback": "Always order extra safety stock"
  },
  "timestamps": {
    "eventEmitted": "2026-05-01T12:00:00Z",
    "orderCreated": "2026-05-01T12:00:05Z",
    "approved": "2026-05-01T12:15:00Z"
  }
}
```

---

### 7. rez-feedback-service → AdaptiveScoringAgent

**Connection Type:** Internal gRPC / Message Queue

**Update Model:**
```
POST /api/v1/agent/update-model
```

**Payload:**
```json
{
  "eventType": "reorder_pattern",
  "context": {
    "productCategory": "electronics",
    "leadTimeVariance": 0.15,
    "demandVariance": 0.3,
    "optimalSafetyStockRatio": 0.25
  },
  "outcome": {
    "predictedQuantity": 100,
    "actualOrderedQuantity": 120,
    "approvedByMerchant": true,
    "adjustmentFactor": 1.2
  },
  "metadata": {
    "merchantId": "merchant_{id}",
    "timestamp": "2026-05-01T12:15:00Z"
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Service Discovery
SERVICE_REGISTRY_URL=http://service-registry.internal:8500
INTENT_GRAPH_URL=grpc://intent-graph.internal:50051
ACTION_ENGINE_URL=grpc://action-engine.internal:50052
FEEDBACK_SERVICE_URL=http://feedback-service.internal:8080

# Event Platform
EVENT_PLATFORM_URL=http://event-platform.internal:3000
EVENT_PLATFORM_TOKEN=${EVENT_PLATFORM_SERVICE_TOKEN}

# NextaBiZ
NEXTABIZ_API_URL=https://api.nextabiz.internal
NEXTABIZ_API_KEY=${NEXTABIZ_PROCUREMENT_TOKEN}

# Queue Configuration
REDIS_URL=redis://redis.internal:6379
RABBITMQ_URL=amqp://rabbitmq.internal:5672

# Loop Settings
LOOP_TIMEOUT_MS=300000
AUTO_APPROVE_THRESHOLD=1000
MAX_RETRY_ATTEMPTS=3

# Monitoring
PROMETHEUS_PORT=9090
METRICS_ENABLED=true
```

### Service Registry Entries

```yaml
# services.yaml
services:
  - name: rez-merchant-service
    port: 8080
    healthEndpoint: /health
    tags: [inventory, events]

  - name: rez-event-platform
    port: 3000
    healthEndpoint: /health
    tags: [events, routing]

  - name: rez-intent-graph
    port: 50051
    protocol: grpc
    healthEndpoint: /health
    tags: [intent, processing]

  - name: rez-action-engine
    port: 50052
    protocol: grpc
    healthEndpoint: /health
    tags: [decision, policy]

  - name: rez-feedback-service
    port: 8081
    healthEndpoint: /health
    tags: [feedback, analytics]

  - name: adaptive-scoring-agent
    port: 50053
    protocol: grpc
    healthEndpoint: /health
    tags: [ml, learning]
```

---

## Testing the Loop

### Unit Tests

```bash
# Test event emission
npm run test:emitter

# Test intent processing
npm run test:intents

# Test action decisions
npm run test:actions

# Test orchestrator
npm run test:orchestrator
```

### Integration Tests

```bash
# Run full loop integration test
npm run test:integration

# Test with mocked external services
npm run test:integration:mocked

# End-to-end test with test tenant
npm run test:e2e
```

### Manual Testing Checklist

- [ ] Emit `inventory.low` event via API
- [ ] Verify event appears in Event Platform
- [ ] Check Intent Graph receives and processes event
- [ ] Verify Draft PO created in NextaBiZ
- [ ] Check BizOS UI displays draft order
- [ ] Approve/reject order in UI
- [ ] Verify feedback recorded
- [ ] Confirm agent received learning update

### Test Event Generator

```typescript
// src/test-utils.ts
export function generateTestInventoryEvent(overrides = {}): InventoryLowEvent {
  return {
    eventId: `evt_${uuid()}`,
    eventType: 'inventory.low',
    timestamp: new Date().toISOString(),
    source: 'rez-merchant-service',
    tenantId: 'tenant_test_001',
    payload: {
      productId: 'prod_test_001',
      sku: 'TEST-SKU-001',
      currentStock: Math.floor(Math.random() * 10),
      reorderPoint: 20,
      preferredSupplierId: 'sup_test_001',
      suggestedQuantity: 100,
      ...overrides,
    },
  };
}
```

---

## Monitoring the Loop

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `loop_events_total` | Total inventory.low events | - |
| `loop_events_processed` | Successfully processed events | - |
| `loop_events_failed` | Failed event processing | > 5% |
| `loop_duration_seconds` | End-to-end loop latency | p95 > 300s |
| `loop_draft_approved` | Draft POs approved | < 50% |
| `loop_draft_rejected` | Draft POs rejected | > 30% |
| `intent_resolution_time` | Time to resolve intent | p95 > 5s |
| `action_decision_time` | Time to make decision | p95 > 2s |

### Log Correlation

All logs within a loop execution share:
```
correlationId: evt_{event_id}
loopId: loop_{uuid}
tenantId: tenant_{id}
```

### Tracing

- **Trace ID:** Generated at event emission
- **Span hierarchy:** emit → route → process → decide → execute → feedback → learn
- **Export:** OTLP to Jaeger/ Tempo

---

## Troubleshooting

### Event Not Received by Intent Graph

1. Check Event Platform logs for routing errors
2. Verify queue consumer is active
3. Check dead letter queue for failures

### Draft PO Not Created

1. Verify Action Engine decision was "auto" or "approval"
2. Check NextaBiZ API connectivity
3. Validate supplier configuration

### Feedback Not Recorded

1. Check BizOS UI webhook configuration
2. Verify Feedback Service health
3. Check network connectivity

---

## Next Steps

1. **Implement real-time dashboard** for loop monitoring
2. **Add circuit breakers** for external service calls
3. **Implement retry policies** with exponential backoff
4. **Add distributed tracing** across all services
5. **Create A/B testing framework** for policy variants
