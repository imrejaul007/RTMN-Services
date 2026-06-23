# Phase 1: Architecture

**Status:** Planned
**Last Updated:** 2026-06-22

---

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Application                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /api/complete
                         │ { model, messages, options }
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Inference Gateway (Port 4294)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Request Validation                                      │   │
│  │  - Auth (JWT)                                            │   │
│  │  - Rate limiting                                         │   │
│  │  - Input sanitization                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Model Selection (selectModel)                           │   │
│  │  1. Hard override (model param)                          │   │
│  │  2. Capability match (vision → gpt-4o)                   │   │
│  │  3. Task type hint                                       │   │
│  │  4. Cost ceiling                                         │   │
│  │  5. Latency SLA                                          │   │
│  │  6. Quality preference                                   │   │
│  │  7. Default fallback (gpt-4o-mini)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Fallback Chain (if primary fails)                       │   │
│  │  claude-3-5-sonnet → gpt-4o → gemini-1.5-pro →          │   │
│  │  mistral-large → hojai-llama-3-70b                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Provider Adapter                                        │   │
│  │  - OpenAI    (gpt-4o, gpt-4o-mini, o1-preview)          │   │
│  │  - Anthropic (claude-3-5-sonnet, claude-3-haiku)        │   │
│  │  - Google    (gemini-1.5-pro, gemini-1.5-flash)         │   │
│  │  - Mistral   (mistral-large)                             │   │
│  │  - HOJAI     (hojai-llama-3-70b)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Cost Tracking                                           │   │
│  │  - Calculate cost (per-model pricing)                    │   │
│  │  - Log to cost ledger (PersistentMap)                    │   │
│  │  - Emit Prometheus metrics                              │   │
│  │  - Attribute by tenant/user/feature                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Response                                                │   │
│  │  { content, model, provider, tokens, cost, latency }    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Real LLM API calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              External LLM Providers                              │
│  OpenAI API │ Anthropic API │ Google API │ Mistral API │ HOJAI   │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Cost data flows back
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Billing Service (Port 4782)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Cost Aggregator                                         │   │
│  │  - Read cost ledger                                     │   │
│  │  - Aggregate by tenant/model/provider/feature/day       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Budget Monitor                                          │   │
│  │  - Check monthly budgets                                 │   │
│  │  - Send alerts at 80% threshold                          │   │
│  │  - Block at 100% (optional)                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Invoice Generator                                       │   │
│  │  - Generate monthly invoices                             │   │
│  │  - Send to Stripe                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Stripe Integration                                      │   │
│  │  - Create customers                                      │   │
│  │  - Charge invoices                                       │   │
│  │  - Handle webhooks                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Inference Gateway

**Port:** 4294
**File:** `platform/intelligence/inference-gateway/src/index.js`

**Responsibilities:**
- Model selection (7-step filter)
- Fallback chain execution
- Cost calculation
- Metrics emission
- Cost ledger logging

**Key Classes:**
- `InferenceGateway` — Main service
- `ModelSelector` — Implements 7-step filter
- `FallbackChain` — Handles provider failures
- `CostCalculator` — Per-model pricing
- `ProviderRegistry` — Manages provider adapters

### 2. Provider Adapters

**Port:** N/A (library)
**File:** `platform/intelligence/inference-gateway/src/providers/`

**Adapters:**
- `OpenAIProvider` — OpenAI API
- `AnthropicProvider` — Anthropic API
- `GoogleProvider` — Google Gemini API
- `MistralProvider` — Mistral API
- `HojaiProvider` — Self-hosted models

**Interface:**
```typescript
interface ProviderAdapter {
  name: string;
  complete(model: Model, messages: Message[], options: CompletionOptions): Promise<CompletionResponse>;
  stream(model: Model, messages: Message[], options: CompletionOptions): AsyncIterable<StreamChunk>;
  calculateCost(model: Model, inputTokens: number, outputTokens: number): number;
}
```

### 3. Billing Service

**Port:** 4782
**File:** `platform/infra/billing-apis/src/index.js`

**Components:**
- `CostAggregator` — Aggregate costs
- `BudgetMonitor` — Monitor budgets
- `InvoiceGenerator` — Generate invoices
- `StripeClient` — Stripe integration
- `Alerts` — Send budget alerts

---

## Data Flow

### Request Flow

```
1. Client sends POST /api/complete
   Headers: Authorization, X-Tenant-Id, X-User-Id, X-Feature
   Body: { model, messages, options }

2. Inference Gateway receives request
   - Validates auth (JWT)
   - Checks rate limits
   - Sanitizes input

3. Model Selection
   - Applies 7-step filter
   - Selects best model

4. Provider Call
   - Calls selected provider
   - Retries on failure (3x exponential backoff)
   - Falls back to next model on failure

5. Cost Calculation
   - Calculates cost from token counts
   - Logs to cost ledger
   - Emits Prometheus metrics

6. Response
   - Returns { content, model, provider, tokens, cost, latency }
```

### Cost Aggregation Flow

```
1. Cost entries written to PersistentMap
   Key: requestId
   Value: { timestamp, tenantId, userId, feature, model, provider, tokens, costUsd }

2. Cost Aggregator reads ledger
   - Filters by tenant/date range
   - Aggregates by model, provider, feature, day

3. Budget Monitor checks budgets
   - Runs every hour
   - Calculates month-to-date spend
   - Sends alerts at 80% threshold
   - Blocks at 100% (if enabled)

4. Invoice Generator creates invoices
   - Runs on 1st of each month
   - Generates invoice for previous month
   - Sends to Stripe

5. Stripe charges customer
   - Creates invoice in Stripe
   - Sends to customer email
   - Processes payment
   - Webhook updates HOJAI
```

---

## Storage Architecture

### Cost Ledger

**Storage:** PersistentMap (file-backed)
**Location:** `./data/costs/`
**Format:** JSON files

**Schema:**
```json
{
  "requestId": "req-123",
  "timestamp": "2026-06-22T10:30:00Z",
  "tenantId": "tenant-1",
  "userId": "user-1",
  "feature": "chat",
  "model": "gpt-4o-mini",
  "provider": "openai",
  "inputTokens": 100,
  "outputTokens": 50,
  "totalTokens": 150,
  "costUsd": 0.000045,
  "latencyMs": 850,
  "status": "success"
}
```

**Retention:** 2 years (archive older to cold storage)

### Budget Storage

**Storage:** PersistentMap
**Location:** `./data/budgets/`

**Schema:**
```json
{
  "tenantId": "tenant-1",
  "monthlyBudget": 1000.00,
  "alertThreshold": 0.8,
  "createdAt": "2026-06-01T00:00:00Z",
  "stripeCustomerId": "cus_..."
}
```

---

## Integration Points

### With Other Services

**MemoryOS (port 4703):**
- No direct integration
- Inference results may be stored in MemoryOS by calling services

**TwinOS (port 4705):**
- No direct integration
- Twins may use inference for AI capabilities

**Flow Orchestrator (port 4244):**
- Calls inference gateway for AI steps
- Example: `intelligence.call` step → inference gateway

**AI Safety (port 4774):**
- Called before/after inference
- Input sanitization + output validation

**Semantic Cache (port 4772):**
- Checked before inference (cache hit → no call)
- Populated after inference (cache miss → store result)

---

## Security Architecture

### Authentication

**Method:** JWT (CorpID-backed)
**Middleware:** `@rtmn/shared/auth/requireAuth`

**Token Claims:**
- `sub` — User ID
- `tenant` — Tenant ID
- `scope` — Permissions
- `exp` — Expiration

### Authorization

**Scopes:**
- `inference:read` — Can call inference
- `inference:write` — Can configure models
- `billing:read` — Can view costs
- `billing:write` — Can set budgets

### Rate Limiting

**Default:** 100 requests/minute per user
**Burst:** 200 requests/minute
**Tenant limit:** 10,000 requests/minute

**Storage:** Redis (distributed)

### Input Sanitization

**Checks:**
- Prompt injection detection (ai-safety)
- PII detection
- Length limits (max 100K tokens)
- Character validation

### Output Validation

**Checks:**
- PII redaction
- Toxic content filtering
- Hallucination detection
- Length validation

---

## Scalability Architecture

### Horizontal Scaling

**Inference Gateway:**
- Stateless (can run multiple instances)
- Load balancer (round-robin)
- Health checks every 10s

**Billing Service:**
- Stateless (can run multiple instances)
- Shared cost ledger (PersistentMap)
- Idempotent operations

### Vertical Scaling

**Memory:**
- Small: 512MB (handles 1K req/min)
- Medium: 1GB (handles 10K req/min)
- Large: 2GB (handles 50K req/min)

**CPU:**
- Small: 1 core
- Medium: 2 cores
- Large: 4 cores

### Caching Strategy

**Semantic Cache (port 4772):**
- Checked before every inference call
- Hit rate target: 30%
- TTL: 1 hour

**Cost Ledger Cache:**
- In-memory cache of recent costs
- 5-minute TTL
- Reduces disk I/O

---

## Disaster Recovery

### Backup Strategy

**Cost Ledger:**
- Daily backup to S3
- Retention: 90 days
- Restore time: <1 hour

**Budget Data:**
- Daily backup to S3
- Retention: 1 year
- Restore time: <1 hour

### Failover Strategy

**Provider Failover:**
- Automatic (fallback chain)
- No manual intervention

**Service Failover:**
- Load balancer health checks
- Automatic removal of unhealthy instances
- New instances auto-spawn

**Data Recovery:**
- Restore from S3 backup
- Replay cost entries
- Reconcile with provider billing

---

## Performance Characteristics

### Latency Targets

| Provider | p50 | p95 | p99 |
|---|---|---|---|
| OpenAI (gpt-4o-mini) | 500ms | 1.5s | 3s |
| Anthropic (claude-3-haiku) | 600ms | 2s | 4s |
| Google (gemini-1.5-flash) | 400ms | 1.2s | 2.5s |
| Mistral (mistral-large) | 800ms | 2.5s | 5s |
| HOJAI (self-hosted) | 300ms | 1s | 2s |

### Throughput Targets

**Per Instance:**
- 100 requests/minute (small)
- 1,000 requests/minute (medium)
- 5,000 requests/minute (large)

**Cluster:**
- 10,000 requests/minute (10 instances)
- 100,000 requests/minute (100 instances)

### Cost Targets

**Per Request:**
- Simple query (100 tokens): $0.0001
- Medium query (500 tokens): $0.0005
- Complex query (2000 tokens): $0.002

**Per Tenant (Monthly):**
- Small (1K req/day): $3/month
- Medium (10K req/day): $30/month
- Large (100K req/day): $300/month

---

*Architecture documentation: 2026-06-22*