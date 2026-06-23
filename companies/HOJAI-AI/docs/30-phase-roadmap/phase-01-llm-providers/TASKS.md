# Phase 1: Detailed Task Breakdown

**Status:** Planned
**Last Updated:** 2026-06-22

---

## Week 1: Provider Adapters & Cost Tracking

### Day 1: Setup & Base Classes

#### Task 1.1: Create Provider Directory Structure
- **Effort:** 1 hour
- **Files:** `platform/intelligence/inference-gateway/src/providers/`
- **Owner:** Senior Engineer
- **Dependencies:** None

**Subtasks:**
- [ ] Create `providers/` directory
- [ ] Create `base.js` with BaseProvider, ProviderError classes
- [ ] Create `index.js` with ProviderRegistry
- [ ] Add to package.json: `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, `@mistralai/mistralai`, `axios`

---

#### Task 1.2: Implement BaseProvider Class
- **Effort:** 4 hours
- **File:** `platform/intelligence/inference-gateway/src/providers/base.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.1

**Subtasks:**
- [ ] Implement `BaseProvider` constructor
- [ ] Implement `retryWithBackoff()` method
- [ ] Implement `ProviderError` class
- [ ] Implement `ProviderRateLimitError` class
- [ ] Implement `ProviderAuthError` class
- [ ] Implement `ProviderTimeoutError` class
- [ ] Write unit tests for BaseProvider
- [ ] Write unit tests for error classes

**Acceptance Criteria:**
- All error types properly extend ProviderError
- Retry logic works with exponential backoff
- Tests pass with >90% coverage

---

### Day 2: Implement OpenAI & Anthropic Providers

#### Task 1.3: Implement OpenAI Provider
- **Effort:** 6 hours
- **File:** `platform/intelligence/inference-gateway/src/providers/openai.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.2

**Subtasks:**
- [ ] Implement `OpenAIProvider` class extending BaseProvider
- [ ] Implement `complete()` method
- [ ] Implement `stream()` method
- [ ] Implement `calculateCost()` method with pricing table
- [ ] Map OpenAI errors to custom error types
- [ ] Add timeout handling
- [ ] Write unit tests (10+ test cases)
- [ ] Write integration tests with real API

**Acceptance Criteria:**
- All 3 OpenAI models (gpt-4o, gpt-4o-mini, o1-preview) work
- Streaming works correctly
- Cost calculation matches OpenAI pricing
- Error handling works for all error types
- Tests pass with >90% coverage

---

#### Task 1.4: Implement Anthropic Provider
- **Effort:** 6 hours
- **File:** `platform/intelligence/inference-gateway/src/providers/anthropic.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.2

**Subtasks:**
- [ ] Implement `AnthropicProvider` class extending BaseProvider
- [ ] Implement `complete()` method (handle system message separately)
- [ ] Implement `stream()` method
- [ ] Implement `calculateCost()` method with pricing table
- [ ] Map Anthropic errors to custom error types
- [ ] Write unit tests (10+ test cases)
- [ ] Write integration tests with real API

**Acceptance Criteria:**
- All 2 Anthropic models (claude-3-5-sonnet, claude-3-haiku) work
- System message handled correctly
- Cost calculation matches Anthropic pricing
- Tests pass with >90% coverage

---

### Day 3: Implement Google, Mistral, HOJAI Providers

#### Task 1.5: Implement Google Provider
- **Effort:** 6 hours
- **File:** `platform/intelligence/inference-gateway/src/providers/google.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.2

**Subtasks:**
- [ ] Implement `GoogleProvider` class extending BaseProvider
- [ ] Implement `complete()` method (convert message format)
- [ ] Implement `stream()` method
- [ ] Implement `calculateCost()` method with pricing table
- [ ] Map Google errors to custom error types
- [ ] Write unit tests
- [ ] Write integration tests with real API

**Acceptance Criteria:**
- Both Gemini models (gemini-1.5-pro, gemini-1.5-flash) work
- Message format conversion correct
- Cost calculation matches Google pricing
- Tests pass with >90% coverage

---

#### Task 1.6: Implement Mistral Provider
- **Effort:** 4 hours
- **File:** `platform/intelligence/inference-gateway/src/providers/mistral.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.2

**Subtasks:**
- [ ] Implement `MistralProvider` class extending BaseProvider
- [ ] Implement `complete()` method
- [ ] Implement `calculateCost()` method
- [ ] Write unit tests
- [ ] Write integration tests

**Acceptance Criteria:**
- mistral-large works
- Cost calculation matches Mistral pricing
- Tests pass

---

#### Task 1.7: Implement HOJAI Provider
- **Effort:** 4 hours
- **File:** `platform/intelligence/inference-gateway/src/providers/hojai.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.2

**Subtasks:**
- [ ] Implement `HojaiProvider` class extending BaseProvider
- [ ] Implement `complete()` method (call self-hosted endpoint)
- [ ] Implement `calculateCost()` method (compute cost)
- [ ] Write unit tests with mock server
- [ ] Write integration tests

**Acceptance Criteria:**
- Self-hosted model endpoint works
- Authentication handled correctly
- Cost calculation based on compute cost
- Tests pass

---

#### Task 1.8: Create Provider Registry
- **Effort:** 3 hours
- **File:** `platform/intelligence/inference-gateway/src/providers/index.js`
- **Owner:** Senior Engineer
- **Dependencies:** Tasks 1.3-1.7

**Subtasks:**
- [ ] Implement `ProviderRegistry` class
- [ ] Implement `register()`, `get()`, `list()` methods
- [ ] Implement `healthCheck()` method
- [ ] Auto-register providers based on env vars
- [ ] Write unit tests

**Acceptance Criteria:**
- Registry manages all 5 providers
- Health check works for all providers
- Auto-registration based on env vars
- Tests pass

---

### Day 4: Wire Inference Gateway

#### Task 1.9: Update Inference Gateway - Import Providers
- **Effort:** 2 hours
- **File:** `platform/intelligence/inference-gateway/src/index.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.8

**Subtasks:**
- [ ] Import providerRegistry
- [ ] Add feature flag `USE_REAL_PROVIDERS`
- [ ] Conditionally use real providers or stub

**Acceptance Criteria:**
- Feature flag works
- Can toggle between real and stub providers

---

#### Task 1.10: Add Cost Ledger
- **Effort:** 4 hours
- **File:** `platform/intelligence/inference-gateway/src/index.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.9

**Subtasks:**
- [ ] Import PersistentMap
- [ ] Create costLedger PersistentMap
- [ ] Update /api/complete to log costs
- [ ] Add cost attribution by tenant/user/feature
- [ ] Write tests

**Acceptance Criteria:**
- Cost ledger persists across restarts
- Costs attributed correctly
- Tests pass

---

#### Task 1.11: Add Stats Tracking
- **Effort:** 3 hours
- **File:** `platform/intelligence/inference-gateway/src/index.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.10

**Subtasks:**
- [ ] Add stats object
- [ ] Track total requests, cost, tokens
- [ ] Track per-provider stats
- [ ] Track per-model stats
- [ ] Add /api/stats endpoint
- [ ] Write tests

**Acceptance Criteria:**
- Stats accurate
- /api/stats endpoint works
- Tests pass

---

#### Task 1.12: Update /api/complete Endpoint
- **Effort:** 6 hours
- **File:** `platform/intelligence/inference-gateway/src/index.js`
- **Owner:** Senior Engineer
- **Dependencies:** Tasks 1.9-1.11

**Subtasks:**
- [ ] Replace stub call with provider.complete()
- [ ] Add request validation
- [ ] Add error handling
- [ ] Add metrics emission
- [ ] Add request ID generation
- [ ] Update response format
- [ ] Write tests

**Acceptance Criteria:**
- Endpoint calls real providers
- Validation works
- Errors handled gracefully
- Metrics emitted
- Tests pass

---

#### Task 1.13: Add /api/models Endpoint
- **Effort:** 2 hours
- **File:** `platform/intelligence/inference-gateway/src/index.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.12

**Subtasks:**
- [ ] List all models from MODEL_CATALOG
- [ ] Include capabilities, context window, pricing
- [ ] Add /api/models endpoint
- [ ] Write tests

**Acceptance Criteria:**
- All 9 models listed
- Correct metadata
- Tests pass

---

#### Task 1.14: Update /health Endpoint
- **Effort:** 2 hours
- **File:** `platform/intelligence/inference-gateway/src/index.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.12

**Subtasks:**
- [ ] Check all providers
- [ ] Return per-provider health
- [ ] Return 503 if any provider down
- [ ] Write tests

**Acceptance Criteria:**
- Health check accurate
- Tests pass

---

### Day 5: Integration Testing

#### Task 1.15: Write Integration Tests
- **Effort:** 6 hours
- **File:** `platform/intelligence/inference-gateway/test/integration/`
- **Owner:** Senior Engineer
- **Dependencies:** Tasks 1.9-1.14

**Subtasks:**
- [ ] Test all providers respond
- [ ] Test cost tracking end-to-end
- [ ] Test stats tracking
- [ ] Test error handling
- [ ] Test fallback chain
- [ ] Test concurrent calls

**Acceptance Criteria:**
- All integration tests pass
- All providers tested
- Cost tracking verified

---

## Week 2: Billing Service & Deployment

### Day 6: Billing Service Setup

#### Task 1.16: Create Billing Service Structure
- **Effort:** 2 hours
- **File:** `platform/infra/billing-apis/`
- **Owner:** Senior Engineer
- **Dependencies:** None

**Subtasks:**
- [ ] Create directory structure
- [ ] Initialize package.json
- [ ] Install dependencies (express, stripe, @rtmn/shared)
- [ ] Create src/ directory
- [ ] Create test/ directory

**Acceptance Criteria:**
- Directory structure created
- Dependencies installed
- Service can start

---

#### Task 1.17: Implement Cost Aggregator
- **Effort:** 6 hours
- **File:** `platform/infra/billing-apis/src/cost-aggregator.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.16

**Subtasks:**
- [ ] Implement `CostAggregator` class
- [ ] Implement `getTenantCosts()` method
- [ ] Implement aggregation by model, provider, feature, day
- [ ] Add filtering by date range
- [ ] Write unit tests
- [ ] Write integration tests

**Acceptance Criteria:**
- Aggregation accurate
- Filtering works
- Tests pass with >90% coverage

---

#### Task 1.18: Implement Budget Monitor
- **Effort:** 6 hours
- **File:** `platform/infra/billing-apis/src/budget-monitor.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.17

**Subtasks:**
- [ ] Implement `BudgetMonitor` class
- [ ] Implement `setBudget()` method
- [ ] Implement `getBudget()` method
- [ ] Implement `checkBudgets()` method
- [ ] Add cron job for hourly checks
- [ ] Implement alerts
- [ ] Write unit tests
- [ ] Write integration tests

**Acceptance Criteria:**
- Budget setting/retrieval works
- Hourly checks run
- Alerts sent at thresholds
- Tests pass

---

#### Task 1.19: Implement Invoice Generator
- **Effort:** 4 hours
- **File:** `platform/infra/billing-apis/src/invoice-generator.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.17

**Subtasks:**
- [ ] Implement `InvoiceGenerator` class
- [ ] Implement `generate()` method
- [ ] Calculate period costs
- [ ] Create invoice object
- [ ] Write tests

**Acceptance Criteria:**
- Invoice generation works
- Period costs calculated correctly
- Tests pass

---

#### Task 1.20: Implement Stripe Client
- **Effort:** 6 hours
- **File:** `platform/infra/billing-apis/src/stripe-client.js`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.16

**Subtasks:**
- [ ] Implement `StripeClient` class
- [ ] Implement `createCustomer()` method
- [ ] Implement `chargeInvoice()` method
- [ ] Implement `verifyWebhook()` method
- [ ] Implement `handleWebhook()` method
- [ ] Write unit tests with Stripe test mode
- [ ] Write integration tests

**Acceptance Criteria:**
- Customer creation works
- Invoice charging works
- Webhook verification works
- Webhook handling works
- Tests pass

---

#### Task 1.21: Implement Main Service
- **Effort:** 6 hours
- **File:** `platform/infra/billing-apis/src/index.js`
- **Owner:** Senior Engineer
- **Dependencies:** Tasks 1.17-1.20

**Subtasks:**
- [ ] Create Express app
- [ ] Implement /api/billing/costs/:tenantId
- [ ] Implement /api/billing/budgets/:tenantId (GET/POST)
- [ ] Implement /api/billing/invoices/:tenantId
- [ ] Implement /api/billing/stripe/webhook
- [ ] Add /health endpoint
- [ ] Add authentication
- [ ] Write integration tests

**Acceptance Criteria:**
- All endpoints work
- Authentication enforced
- Tests pass

---

### Day 7: E2E Testing

#### Task 1.22: Write E2E Tests
- **Effort:** 6 hours
- **File:** `platform/infra/billing-apis/test/e2e/`
- **Owner:** Senior Engineer
- **Dependencies:** Task 1.21

**Subtasks:**
- [ ] Test 100 LLM calls → invoice generation
- [ ] Test budget exceeded → alert sent
- [ ] Test Stripe integration (test mode)
- [ ] Test webhook handling
- [ ] Test cost aggregation

**Acceptance Criteria:**
- All E2E tests pass
- 100 calls → invoice matches expected
- Stripe integration verified

---

#### Task 1.23: Load Testing
- **Effort:** 4 hours
- **Tool:** k6 or Artillery
- **Owner:** DevOps Engineer
- **Dependencies:** Task 1.22

**Subtasks:**
- [ ] Write load test script
- [ ] Run 100 req/s for 5 minutes
- [ ] Verify p95 < 2s
- [ ] Verify error rate <1%
- [ ] Document results

**Acceptance Criteria:**
- Load test passes
- Performance targets met

---

### Day 8: Deployment

#### Task 1.24: Create Dockerfiles
- **Effort:** 3 hours
- **Files:** `platform/intelligence/inference-gateway/Dockerfile`, `platform/infra/billing-apis/Dockerfile`
- **Owner:** DevOps Engineer
- **Dependencies:** None

**Subtasks:**
- [ ] Create Dockerfile for inference-gateway
- [ ] Create Dockerfile for billing-apis
- [ ] Add health checks
- [ ] Optimize image size

**Acceptance Criteria:**
- Docker images build successfully
- Images are small (<500MB)
- Health checks work

---

#### Task 1.25: Create Docker Compose
- **Effort:** 2 hours
- **File:** `docker-compose.yml`
- **Owner:** DevOps Engineer
- **Dependencies:** Task 1.24

**Subtasks:**
- [ ] Define services
- [ ] Configure environment variables
- [ ] Configure volumes
- [ ] Configure networking
- [ ] Test locally

**Acceptance Criteria:**
- All services start successfully
- Environment variables loaded
- Tests pass

---

#### Task 1.26: Deploy to Staging
- **Effort:** 4 hours
- **Owner:** DevOps Engineer
- **Dependencies:** Task 1.25

**Subtasks:**
- [ ] Deploy to staging environment
- [ ] Configure secrets
- [ ] Test all endpoints
- [ ] Verify metrics
- [ ] Test billing flow

**Acceptance Criteria:**
- Services running in staging
- All endpoints working
- Metrics flowing

---

### Day 9: Monitoring Setup

#### Task 1.27: Configure Prometheus
- **Effort:** 3 hours
- **File:** `prometheus.yml`
- **Owner:** DevOps Engineer
- **Dependencies:** Task 1.26

**Subtasks:**
- [ ] Add scrape configs for inference-gateway
- [ ] Add scrape configs for billing-apis
- [ ] Configure retention
- [ ] Test scraping

**Acceptance Criteria:**
- Prometheus scraping all services
- Metrics visible
- Tests pass

---

#### Task 1.28: Create Grafana Dashboards
- **Effort:** 6 hours
- **Files:** `grafana/*.json`
- **Owner:** DevOps Engineer
- **Dependencies:** Task 1.27

**Subtasks:**
- [ ] Create Inference Overview dashboard
- [ ] Create Provider Health dashboard
- [ ] Create Cost Analysis dashboard
- [ ] Create Billing Operations dashboard
- [ ] Import dashboards to Grafana
- [ ] Verify data showing

**Acceptance Criteria:**
- All dashboards deployed
- Data showing correctly
- Tests pass

---

#### Task 1.29: Configure Alerts
- **Effort:** 4 hours
- **File:** `alerts.yml`
- **Owner:** DevOps Engineer
- **Dependencies:** Task 1.28

**Subtasks:**
- [ ] Create critical alerts (provider down, high error rate)
- [ ] Create warning alerts (high latency, budget exceeded)
- [ ] Configure notification channels (Slack, email)
- [ ] Test alerts

**Acceptance Criteria:**
- All alerts configured
- Notification channels working
- Tests pass

---

### Day 10: Documentation & Launch

#### Task 1.30: Write API Documentation
- **Effort:** 4 hours
- **File:** `docs/api/`
- **Owner:** Senior Engineer
- **Dependencies:** None

**Subtasks:**
- [ ] Document /api/complete endpoint
- [ ] Document /api/stats endpoint
- [ ] Document /api/models endpoint
- [ ] Document billing endpoints
- [ ] Add request/response examples
- [ ] Add error codes

**Acceptance Criteria:**
- All endpoints documented
- Examples included
- Error codes documented

---

#### Task 1.31: Write Deployment Guide
- **Effort:** 3 hours
- **File:** `docs/deployment/`
- **Owner:** DevOps Engineer
- **Dependencies:** None

**Subtasks:**
- [ ] Document prerequisites
- [ ] Document environment variables
- [ ] Document deployment steps
- [ ] Document rollback procedure
- [ ] Document troubleshooting

**Acceptance Criteria:**
- Deployment guide complete
- Rollback procedure tested
- Troubleshooting guide helpful

---

#### Task 1.32: Update CLAUDE.md
- **Effort:** 2 hours
- **File:** `companies/HOJAI-AI/CLAUDE.md`
- **Owner:** Senior Engineer
- **Dependencies:** None

**Subtasks:**
- [ ] Document Phase 1 completion
- [ ] Update service registry
- [ ] Update statistics
- [ ] Update architecture diagram

**Acceptance Criteria:**
- CLAUDE.md updated
- Accurate information

---

#### Task 1.33: Deploy to Production
- **Effort:** 4 hours
- **Owner:** DevOps Engineer
- **Dependencies:** Tasks 1.26-1.32

**Subtasks:**
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Verify all features working
- [ ] Notify team

**Acceptance Criteria:**
- Production deployment successful
- All features working
- No critical issues

---

## Summary

**Total Tasks:** 33
**Total Effort:** ~180 hours (4.5 weeks for 1 engineer)
**Critical Path:** Day 1-5 (providers) → Day 6-7 (billing) → Day 8-10 (deployment)

**Team:**
- Senior Engineer (full-time): Days 1-10
- DevOps Engineer (part-time): Days 8-10
- ML Engineer (part-time): Day 7 (E2E testing)

---

*Task breakdown: 2026-06-22*