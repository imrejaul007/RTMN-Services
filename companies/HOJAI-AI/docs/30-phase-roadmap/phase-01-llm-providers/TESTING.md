# Phase 1: Testing Guide

**Status:** Planned
**Last Updated:** 2026-06-22

---

## Test Strategy

### Test Pyramid

```
                    ┌─────────────┐
                    │   E2E Tests │  (5%)
                    └─────────────┘
                  ┌───────────────────┐
                  │ Integration Tests │  (25%)
                  └───────────────────┘
              ┌───────────────────────────┐
              │      Unit Tests           │  (70%)
              └───────────────────────────┘
```

### Coverage Targets

| Component | Target | Current |
|---|---|---|
| Provider Adapters | 95% | 0% |
| Inference Gateway | 90% | 60% |
| Billing Service | 90% | 0% |
| Cost Aggregator | 95% | 0% |
| Budget Monitor | 90% | 0% |
| Stripe Client | 85% | 0% |
| **Overall** | **90%** | **30%** |

---

## Unit Tests

### Provider Adapter Tests

#### OpenAI Provider

**File:** `test/providers/openai.test.js`

**Test Cases:**

1. **complete()**
   - [ ] Completes simple prompt
   - [ ] Handles system messages
   - [ ] Respects temperature parameter
   - [ ] Respects maxTokens parameter
   - [ ] Throws on invalid API key (ProviderAuthError)
   - [ ] Throws on rate limit (ProviderRateLimitError)
   - [ ] Throws on timeout (ProviderTimeoutError)
   - [ ] Retries on transient failures
   - [ ] Returns correct token counts
   - [ ] Returns correct cost

2. **stream()**
   - [ ] Streams chunks correctly
   - [ ] Handles errors during streaming
   - [ ] Reassembles full content correctly

3. **calculateCost()**
   - [ ] gpt-4o-mini cost correct
   - [ ] gpt-4o cost correct
   - [ ] o1-preview cost correct
   - [ ] Zero tokens returns zero cost
   - [ ] Large token counts calculate correctly

#### Anthropic Provider

**File:** `test/providers/anthropic.test.js`

**Test Cases:**

1. **complete()**
   - [ ] Completes simple prompt
   - [ ] Separates system message correctly
   - [ ] Handles multi-turn conversation
   - [ ] Respects max_tokens parameter
   - [ ] Throws on invalid API key
   - [ ] Throws on rate limit
   - [ ] Returns correct token counts

2. **calculateCost()**
   - [ ] claude-3-5-sonnet cost correct
   - [ ] claude-3-haiku cost correct

#### Google Provider

**File:** `test/providers/google.test.js`

**Test Cases:**

1. **complete()**
   - [ ] Completes simple prompt
   - [ ] Converts message format correctly
   - [ ] Handles chat history
   - [ ] Returns correct token counts

2. **calculateCost()**
   - [ ] gemini-1.5-pro cost correct
   - [ ] gemini-1.5-flash cost correct

#### Mistral Provider

**File:** `test/providers/mistral.test.js`

**Test Cases:**

1. **complete()**
   - [ ] Completes simple prompt
   - [ ] Handles errors

2. **calculateCost()**
   - [ ] mistral-large cost correct

#### HOJAI Provider

**File:** `test/providers/hojai.test.js`

**Test Cases:**

1. **complete()**
   - [ ] Completes simple prompt
   - [ ] Sends correct headers
   - [ ] Handles connection errors
   - [ ] Handles authentication errors

2. **calculateCost()**
   - [ ] Self-hosted cost correct (compute cost)

---

### Inference Gateway Tests

**File:** `test/gateway/complete.test.js`

**Test Cases:**

1. **POST /api/complete**
   - [ ] Returns 200 on success
   - [ ] Returns 401 without auth
   - [ ] Returns 400 with invalid request
   - [ ] Returns 429 when rate limited
   - [ ] Logs to cost ledger
   - [ ] Emits Prometheus metrics
   - [ ] Tracks stats correctly
   - [ ] Handles provider errors gracefully
   - [ ] Falls back to next provider on failure

2. **Model Selection**
   - [ ] Respects hard override (model param)
   - [ ] Matches capabilities correctly
   - [ ] Respects cost ceiling
   - [ ] Respects latency SLA
   - [ ] Prefers quality when requested
   - [ ] Falls back to default model

3. **Fallback Chain**
   - [ ] Tries primary model first
   - [ ] Falls back on error
   - [ ] Tries all models in chain
   - [ ] Returns error if all fail

4. **Stats Tracking**
   - [ ] Increments total requests
   - [ ] Accumulates total cost
   - [ ] Tracks per-provider stats
   - [ ] Tracks per-model stats

---

### Billing Service Tests

#### Cost Aggregator Tests

**File:** `test/billing/cost-aggregator.test.js`

**Test Cases:**

1. **getTenantCosts()**
   - [ ] Returns costs for tenant
   - [ ] Filters by date range
   - [ ] Aggregates by model
   - [ ] Aggregates by provider
   - [ ] Aggregates by feature
   - [ ] Aggregates by day
   - [ ] Returns zero for unknown tenant
   - [ ] Handles empty date range

#### Budget Monitor Tests

**File:** `test/billing/budget-monitor.test.js`

**Test Cases:**

1. **setBudget()**
   - [ ] Sets budget successfully
   - [ ] Overwrites existing budget
   - [ ] Validates input

2. **getBudget()**
   - [ ] Returns budget with current spend
   - [ ] Calculates utilization
   - [ ] Returns null for unknown tenant

3. **checkBudgets()**
   - [ ] Sends warning at 80% threshold
   - [ ] Sends exceeded alert at 100%
   - [ ] Doesn't send alerts below threshold
   - [ ] Handles errors gracefully

#### Stripe Client Tests

**File:** `test/billing/stripe-client.test.js`

**Test Cases:**

1. **createCustomer()**
   - [ ] Creates customer successfully
   - [ ] Includes metadata

2. **chargeInvoice()**
   - [ ] Creates invoice item
   - [ ] Creates and sends invoice
   - [ ] Handles errors

3. **verifyWebhook()**
   - [ ] Verifies valid signature
   - [ ] Rejects invalid signature

4. **handleWebhook()**
   - [ ] Handles invoice.paid
   - [ ] Handles invoice.payment_failed
   - [ ] Handles customer.subscription.deleted

---

## Integration Tests

### Provider Integration

**File:** `test/integration/providers.test.js`

**Test Cases:**

1. **All Providers Respond**
   - [ ] OpenAI responds to test prompt
   - [ ] Anthropic responds to test prompt
   - [ ] Google responds to test prompt
   - [ ] Mistral responds to test prompt
   - [ ] HOJAI responds to test prompt

2. **Provider Switching**
   - [ ] Can switch between providers
   - [ ] Same input → different responses

3. **Concurrent Calls**
   - [ ] 10 concurrent calls succeed
   - [ ] 100 concurrent calls succeed

### Cost Tracking Integration

**File:** `test/integration/cost-tracking.test.js`

**Test Cases:**

1. **Cost Ledger**
   - [ ] Entries written correctly
   - [ ] Entries retrievable by ID
   - [ ] Entries persist across restarts

2. **Metrics Emission**
   - [ ] Metrics visible in Prometheus
   - [ ] Correct labels applied
   - [ ] Histograms calculate percentiles

### Billing Integration

**File:** `test/integration/billing.test.js`

**Test Cases:**

1. **Cost Aggregation**
   - [ ] Reads from cost ledger
   - [ ] Filters by tenant
   - [ ] Filters by date range
   - [ ] Aggregates correctly

2. **Budget Monitoring**
   - [ ] Reads from cost ledger
   - [ ] Checks against budgets
   - [ ] Sends alerts

---

## End-to-End Tests

### Complete Flow

**File:** `test/e2e/complete-flow.test.js`

**Test Case 1: Simple Completion**

```
1. Start all services
2. Make POST /api/complete with gpt-4o-mini
3. Verify response
4. Check cost ledger
5. Check Prometheus metrics
6. Check stats endpoint
```

**Expected:**
- Response received in <5s
- Cost logged correctly
- Metrics emitted
- Stats updated

**Test Case 2: 100 Calls → Invoice**

```
1. Start all services
2. Make 100 LLM calls
3. Generate invoice via billing service
4. Verify invoice amount
5. Verify Stripe integration (test mode)
```

**Expected:**
- Invoice generated for 100 calls
- Total cost matches sum of individual costs
- Stripe invoice created

**Test Case 3: Budget Exceeded**

```
1. Set tenant budget to $10
2. Make LLM calls until budget exceeded
3. Verify alert sent
4. Verify next call blocked (if enabled)
```

**Expected:**
- Alert sent at 80% ($8)
- Alert sent at 100% ($10)
- Next call blocked if hard limit enabled

**Test Case 4: Provider Fallback**

```
1. Configure fallback chain
2. Make primary provider unavailable
3. Make LLM call
4. Verify fallback to next provider
5. Verify cost calculated for fallback provider
```

**Expected:**
- Primary fails
- Fallback succeeds
- Cost reflects fallback provider pricing

---

## Performance Tests

### Load Test

**File:** `test/performance/load.test.js`

**Tool:** k6 or Artillery

**Test Scenarios:**

1. **Sustained Load**
   - 100 req/s for 5 minutes
   - Verify p95 < 2s
   - Verify error rate <1%

2. **Burst Load**
   - 0 → 500 req/s in 10s
   - Hold for 2 minutes
   - Verify no crashes

3. **Cost Calculation Performance**
   - 1000 cost calculations/sec
   - Verify <10ms per calculation

4. **Concurrent Streams**
   - 50 concurrent streams
   - Verify all complete successfully

---

## Security Tests

### Authentication Tests

**File:** `test/security/auth.test.js`

**Test Cases:**

1. **Missing Token**
   - [ ] Returns 401

2. **Invalid Token**
   - [ ] Returns 401

3. **Expired Token**
   - [ ] Returns 401

4. **Insufficient Permissions**
   - [ ] Returns 403

### Input Validation Tests

**File:** `test/security/validation.test.js`

**Test Cases:**

1. **SQL Injection**
   - [ ] Sanitized

2. **XSS**
   - [ ] Sanitized

3. **Prompt Injection**
   - [ ] Detected by ai-safety

4. **Oversized Input**
   - [ ] Returns 413

5. **Invalid JSON**
   - [ ] Returns 400

---

## Cost Accuracy Tests

### Provider Billing Reconciliation

**File:** `test/cost-accuracy.test.js`

**Test Cases:**

1. **OpenAI**
   - Make 100 calls
   - Compare HOJAI cost to OpenAI dashboard
   - Verify within 1%

2. **Anthropic**
   - Make 100 calls
   - Compare HOJAI cost to Anthropic dashboard
   - Verify within 1%

3. **Google**
   - Make 100 calls
   - Compare HOJAI cost to Google dashboard
   - Verify within 1%

---

## Test Execution

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all

# With coverage
npm run test:coverage
```

### CI/CD Integration

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Test Data

### Fixtures

**File:** `test/fixtures/messages.js`

```javascript
export const simplePrompt = [
  { role: 'user', content: 'Reply with: OK' }
];

export const systemPrompt = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello' }
];

export const multiTurn = [
  { role: 'user', content: 'My name is Alice' },
  { role: 'assistant', content: 'Nice to meet you, Alice!' },
  { role: 'user', content: 'What is my name?' }
];

export const longPrompt = [
  { role: 'user', content: 'A'.repeat(10000) }
];
```

**File:** `test/fixtures/cost-entries.js`

```javascript
export const sampleCosts = [
  {
    requestId: 'req-1',
    timestamp: '2026-06-01T10:00:00Z',
    tenantId: 'tenant-1',
    userId: 'user-1',
    feature: 'chat',
    model: 'gpt-4o-mini',
    provider: 'openai',
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    costUsd: 0.000045,
    latencyMs: 800,
    status: 'success'
  },
  // ... more entries
];
```

---

## Test Gates

### Gate 1: Provider Connectivity (Day 3)
- [ ] All 5 providers respond to test prompt
- [ ] Latency < 10s p95 for each provider
- [ ] Error handling works

**Pass Criteria:** All tests green, all providers responding

### Gate 2: Cost Tracking (Day 7)
- [ ] Cost matches provider billing within 1%
- [ ] Cost ledger persists across restarts
- [ ] Metrics visible in Prometheus

**Pass Criteria:** Cost accuracy verified against provider dashboards

### Gate 3: Billing Service (Day 10)
- [ ] Cost aggregator works
- [ ] Budget monitoring works
- [ ] Invoice generation works
- [ ] Stripe integration works (test mode)
- [ ] E2E test passes

**Pass Criteria:** 100 calls → invoice generated → matches expected cost

### Gate 4: Production Readiness (Day 14)
- [ ] All tests passing (>90% coverage)
- [ ] Load test passes (100 req/s sustained)
- [ ] Security tests pass
- [ ] Documentation complete

**Pass Criteria:** Production deployment approved

---

*Testing guide: 2026-06-22*