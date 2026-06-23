# Phase 1: Implementation Guide

**Status:** Planned
**Last Updated:** 2026-06-22

---

## Step-by-Step Implementation

### Day 1-2: Provider Adapters

#### Step 1: Create Provider Directory

```bash
mkdir -p platform/intelligence/inference-gateway/src/providers
cd platform/intelligence/inference-gateway/src/providers
```

#### Step 2: Install Provider SDKs

```bash
cd platform/intelligence/inference-gateway
npm install openai @anthropic-ai/sdk @google/generative-ai @mistralai/mistralai axios
```

#### Step 3: Create Provider Base Class

**File:** `src/providers/base.js`

```javascript
export class ProviderError extends Error {
  constructor(message, provider, originalError) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider, retryAfter, originalError) {
    super(`Rate limit hit for ${provider}`, provider, originalError);
    this.name = 'ProviderRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(provider, originalError) {
    super(`Authentication failed for ${provider}`, provider, originalError);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider, timeoutMs, originalError) {
    super(`Timeout after ${timeoutMs}ms for ${provider}`, provider, originalError);
    this.name = 'ProviderTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class BaseProvider {
  constructor(name) {
    this.name = name;
  }

  async complete(model, messages, options) {
    throw new Error('Must implement complete()');
  }

  async stream(model, messages, options) {
    throw new Error('Must implement stream()');
  }

  calculateCost(model, inputTokens, outputTokens) {
    throw new Error('Must implement calculateCost()');
  }

  async retryWithBackoff(fn, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on auth errors
        if (error instanceof ProviderAuthError) {
          throw error;
        }

        // Calculate backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;

        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${backoffMs + jitter}ms`);

        await new Promise(resolve => setTimeout(resolve, backoffMs + jitter));
      }
    }
    throw lastError;
  }
}
```

#### Step 4: Implement OpenAI Provider

**File:** `src/providers/openai.js`

```javascript
import OpenAI from 'openai';
import { BaseProvider, ProviderError, ProviderRateLimitError, ProviderAuthError, ProviderTimeoutError } from './base.js';

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super('openai');
    this.apiKey = process.env.OPENAI_API_KEY;

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
      timeout: 30000,
      maxRetries: 0 // We handle retries ourselves
    });

    // Pricing per 1K tokens (as of 2026-06-22)
    this.pricing = {
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'o1-preview': { input: 0.015, output: 0.06 }
    };
  }

  async complete(model, messages, options = {}) {
    return await this.retryWithBackoff(async () => {
      const start = Date.now();
      const timeoutMs = options.timeoutMs || 30000;

      try {
        const response = await Promise.race([
          this.client.chat.completions.create({
            model: model.id,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2000,
            top_p: options.topP ?? 1.0,
            frequency_penalty: options.frequencyPenalty ?? 0,
            presence_penalty: options.presencePenalty ?? 0
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new ProviderTimeoutError(this.name, timeoutMs)), timeoutMs)
          )
        ]);

        const latencyMs = Date.now() - start;

        return {
          content: response.choices[0].message.content,
          model: model.id,
          provider: this.name,
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
          latencyMs,
          costUsd: this.calculateCost(model, response.usage.prompt_tokens, response.usage.completion_tokens),
          finishReason: response.choices[0].finish_reason
        };
      } catch (error) {
        // Map OpenAI errors to our error types
        if (error.status === 401) {
          throw new ProviderAuthError(this.name, error);
        }
        if (error.status === 429) {
          throw new ProviderRateLimitError(this.name, error.headers?.['retry-after'], error);
        }
        if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
          throw new ProviderTimeoutError(this.name, timeoutMs, error);
        }
        throw new ProviderError(`OpenAI call failed: ${error.message}`, this.name, error);
      }
    });
  }

  async *stream(model, messages, options = {}) {
    const stream = await this.client.chat.completions.create({
      model: model.id,
      messages: messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000
    });

    for await (const chunk of stream) {
      yield {
        content: chunk.choices[0]?.delta?.content || '',
        finishReason: chunk.choices[0]?.finish_reason
      };
    }
  }

  calculateCost(model, inputTokens, outputTokens) {
    const rate = this.pricing[model.id] || this.pricing['gpt-4o-mini'];
    return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
  }
}
```

#### Step 5: Implement Other Providers

Follow the same pattern for Anthropic, Google, Mistral, and HOJAI providers (see API.md for full code).

#### Step 6: Create Provider Registry

**File:** `src/providers/index.js`

```javascript
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GoogleProvider } from './google.js';
import { MistralProvider } from './mistral.js';
import { HojaiProvider } from './hojai.js';

export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    this.providers.set(provider.name, provider);
  }

  get(name) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }
    return provider;
  }

  list() {
    return Array.from(this.providers.keys());
  }

  async healthCheck() {
    const results = {};
    for (const [name, provider] of this.providers) {
      try {
        await provider.complete(
          { id: this.getDefaultModel(name) },
          [{ role: 'user', content: 'ping' }],
          { maxTokens: 5 }
        );
        results[name] = 'healthy';
      } catch (error) {
        results[name] = `unhealthy: ${error.message}`;
      }
    }
    return results;
  }

  getDefaultModel(providerName) {
    const defaults = {
      'openai': 'gpt-4o-mini',
      'anthropic': 'claude-3-haiku',
      'google': 'gemini-1.5-flash',
      'mistral': 'mistral-large',
      'hojai': 'hojai-llama-3-70b'
    };
    return defaults[providerName];
  }
}

// Initialize registry
export const providerRegistry = new ProviderRegistry();

// Register providers (only if API keys are set)
if (process.env.OPENAI_API_KEY) {
  providerRegistry.register(new OpenAIProvider());
}
if (process.env.ANTHROPIC_API_KEY) {
  providerRegistry.register(new AnthropicProvider());
}
if (process.env.GOOGLE_API_KEY) {
  providerRegistry.register(new GoogleProvider());
}
if (process.env.MISTRAL_API_KEY) {
  providerRegistry.register(new MistralProvider());
}
if (process.env.HOJAI_LLM_ENDPOINT) {
  providerRegistry.register(new HojaiProvider());
}
```

---

### Day 3-4: Wire Inference Gateway

#### Step 7: Update Inference Gateway

**File:** `src/index.js`

Add these changes:

```javascript
import { providerRegistry } from './providers/index.js';
import { PersistentMap } from '@rtmn/persistent-store';
import { metrics } from '@rtmn/observability';
import { logger } from '@rtmn/shared/logger';

// Add cost ledger
const costLedger = new PersistentMap({
  name: 'inference-cost-ledger',
  baseDir: './data/costs'
});

// Add stats tracking
const stats = {
  totalRequests: 0,
  totalCostUsd: 0,
  totalTokens: 0,
  errors: 0,
  byProvider: {},
  byModel: {}
};

// Update /api/complete endpoint
app.post('/api/complete', requireAuth, async (req, res) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.user.sub || 'anonymous';
  const feature = req.headers['x-feature'] || 'unknown';

  try {
    const { model: modelHint, messages, ...options } = req.body;

    // Model selection
    const model = selectModel({
      hint: modelHint,
      capabilities: req.body.capabilities,
      task: req.body.task,
      maxCostUsd: req.body.maxCostUsd,
      maxLatencyMs: req.body.maxLatencyMs,
      preferQuality: req.body.preferQuality
    });

    // Get provider
    const provider = providerRegistry.get(model.provider);

    // Call provider
    const response = await provider.complete(model, messages, options);

    // Track stats
    stats.totalRequests++;
    stats.totalCostUsd += response.costUsd;
    stats.totalTokens += response.totalTokens;

    if (!stats.byProvider[model.provider]) {
      stats.byProvider[model.provider] = { requests: 0, costUsd: 0, tokens: 0 };
    }
    stats.byProvider[model.provider].requests++;
    stats.byProvider[model.provider].costUsd += response.costUsd;
    stats.byProvider[model.provider].tokens += response.totalTokens;

    if (!stats.byModel[model.id]) {
      stats.byModel[model.id] = { requests: 0, costUsd: 0, tokens: 0 };
    }
    stats.byModel[model.id].requests++;
    stats.byModel[model.id].costUsd += response.costUsd;
    stats.byModel[model.id].tokens += response.totalTokens;

    // Log to cost ledger
    await costLedger.set(requestId, {
      timestamp: new Date().toISOString(),
      tenantId,
      userId,
      feature,
      model: model.id,
      provider: model.provider,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      totalTokens: response.totalTokens,
      costUsd: response.costUsd,
      latencyMs: response.latencyMs,
      status: 'success',
      requestId
    });

    // Emit metrics
    metrics.increment('inference_requests_total', {
      model: model.id,
      provider: model.provider,
      tenant: tenantId,
      status: 'success'
    });

    metrics.histogram('inference_cost_usd', response.costUsd, {
      model: model.id,
      tenant: tenantId
    });

    metrics.histogram('inference_tokens_total', response.totalTokens, {
      model: model.id,
      tenant: tenantId
    });

    metrics.histogram('inference_latency_ms', response.latencyMs, {
      model: model.id,
      provider: model.provider
    });

    // Add request ID to response
    response.requestId = requestId;

    res.json(response);
  } catch (error) {
    stats.errors++;

    metrics.increment('inference_errors_total', {
      model: req.body.model || 'unknown',
      provider: error.provider || 'unknown',
      error_type: error.name
    });

    logger.error('Inference error', {
      requestId,
      error: error.message,
      stack: error.stack,
      tenantId,
      userId
    });

    res.status(error.statusCode || 500).json({
      error: error.message,
      code: error.code || 'INTERNAL_ERROR',
      requestId
    });
  }
});

// Add /api/stats endpoint
app.get('/api/stats', requireAuth, (req, res) => {
  res.json(stats);
});

// Add /api/models endpoint
app.get('/api/models', requireAuth, (req, res) => {
  const models = MODEL_CATALOG.map(model => ({
    id: model.id,
    provider: model.provider,
    capabilities: model.capabilities,
    contextWindow: model.contextWindow,
    inputCostPer1K: model.pricing.input,
    outputCostPer1K: model.pricing.output,
    avgLatencyMs: model.avgLatencyMs
  }));
  res.json({ models });
});

// Add health check with provider status
app.get('/health', async (req, res) => {
  const providerHealth = await providerRegistry.healthCheck();
  const allHealthy = Object.values(providerHealth).every(s => s === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    service: 'inference-gateway',
    port: 4294,
    providers: providerHealth,
    uptime: process.uptime(),
    version: '1.0.0'
  });
});
```

---

### Day 5-7: Build Billing Service

#### Step 8: Create Billing Service Structure

```bash
mkdir -p platform/infra/billing-apis/src
cd platform/infra/billing-apis
npm init -y
npm install express @rtmn/shared @rtmn/persistent-store stripe
```

#### Step 9: Implement Cost Aggregator

**File:** `src/cost-aggregator.js`

```javascript
import { PersistentMap } from '@rtmn/persistent-store';

export class CostAggregator {
  constructor(costLedgerPath = '../../intelligence/inference-gateway/data/costs') {
    this.costLedger = new PersistentMap({
      name: 'inference-cost-ledger',
      baseDir: costLedgerPath
    });
  }

  async getTenantCosts(tenantId, startDate, endDate) {
    const costs = [];
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    for (const [requestId, entry] of this.costLedger.entries()) {
      const entryDate = new Date(entry.timestamp);
      if (entry.tenantId === tenantId && entryDate >= start && entryDate <= end) {
        costs.push(entry);
      }
    }

    return this.aggregate(costs, tenantId, startDate, endDate);
  }

  aggregate(costs, tenantId, startDate, endDate) {
    const result = {
      tenantId,
      period: { startDate, endDate },
      totalCost: 0,
      totalTokens: 0,
      totalRequests: costs.length,
      byModel: {},
      byProvider: {},
      byFeature: {},
      byDay: {}
    };

    for (const cost of costs) {
      result.totalCost += cost.costUsd;
      result.totalTokens += cost.totalTokens;

      this.incrementAggregator(result.byModel, cost.model, cost);
      this.incrementAggregator(result.byProvider, cost.provider, cost);
      this.incrementAggregator(result.byFeature, cost.feature, cost);

      const day = cost.timestamp.split('T')[0];
      this.incrementAggregator(result.byDay, day, cost);
    }

    // Round to 6 decimal places
    result.totalCost = Math.round(result.totalCost * 1000000) / 1000000;

    return result;
  }

  incrementAggregator(obj, key, cost) {
    if (!obj[key]) {
      obj[key] = { cost: 0, tokens: 0, requests: 0 };
    }
    obj[key].cost += cost.costUsd;
    obj[key].tokens += cost.totalTokens;
    obj[key].requests += 1;
  }
}
```

#### Step 10: Implement Budget Monitor

**File:** `src/budget-monitor.js`

```javascript
import { PersistentMap } from '@rtmn/persistent-store';
import { alerts } from './alerts.js';

export class BudgetMonitor {
  constructor() {
    this.budgets = new PersistentMap({
      name: 'tenant-budgets',
      baseDir: './data/budgets'
    });

    this.costLedger = new PersistentMap({
      name: 'inference-cost-ledger',
      baseDir: '../../intelligence/inference-gateway/data/costs'
    });
  }

  async setBudget(tenantId, config) {
    await this.budgets.set(tenantId, {
      tenantId,
      monthlyBudget: config.monthlyBudget,
      alertThreshold: config.alertThreshold || 0.8,
      createdAt: new Date().toISOString(),
      stripeCustomerId: config.stripeCustomerId
    });
  }

  async getBudget(tenantId) {
    const budget = await this.budgets.get(tenantId);
    if (!budget) return null;

    const currentSpend = await this.getMonthToDateSpend(tenantId);
    const utilization = currentSpend / budget.monthlyBudget;

    return {
      ...budget,
      currentSpend,
      utilization,
      alertSent: utilization >= budget.alertThreshold
    };
  }

  async getMonthToDateSpend(tenantId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return await this.getSpendInRange(tenantId, monthStart, now);
  }

  async getSpendInRange(tenantId, start, end) {
    let total = 0;
    for (const [requestId, entry] of this.costLedger.entries()) {
      const entryDate = new Date(entry.timestamp);
      if (entry.tenantId === tenantId && entryDate >= start && entryDate <= end) {
        total += entry.costUsd;
      }
    }
    return total;
  }

  async checkBudgets() {
    for (const [tenantId, budget] of this.budgets.entries()) {
      const currentSpend = await this.getMonthToDateSpend(tenantId);
      const utilization = currentSpend / budget.monthlyBudget;

      if (utilization >= 1.0) {
        await alerts.sendBudgetExceeded(tenantId, currentSpend, budget.monthlyBudget);
      } else if (utilization >= budget.alertThreshold) {
        await alerts.sendBudgetWarning(tenantId, currentSpend, budget.monthlyBudget, utilization);
      }
    }
  }
}

// Run budget check every hour
const budgetMonitor = new BudgetMonitor();
setInterval(() => {
  budgetMonitor.checkBudgets().catch(err => {
    console.error('Budget check failed:', err);
  });
}, 60 * 60 * 1000);

export { budgetMonitor };
```

#### Step 11: Implement Stripe Client

**File:** `src/stripe-client.js`

```javascript
import Stripe from 'stripe';

export class StripeClient {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async createCustomer(tenantId, email, name) {
    return await this.stripe.customers.create({
      email,
      name,
      metadata: { tenantId }
    });
  }

  async chargeInvoice(invoice) {
    if (!invoice.stripeCustomerId) {
      throw new Error(`No Stripe customer for tenant ${invoice.tenantId}`);
    }

    // Create invoice item
    await this.stripe.invoiceItems.create({
      customer: invoice.stripeCustomerId,
      amount: Math.round(invoice.totalCost * 100), // Convert to cents
      currency: 'usd',
      description: `HOJAI AI usage for ${invoice.period}`,
      metadata: {
        tenantId: invoice.tenantId,
        period: invoice.period
      }
    });

    // Create and send invoice
    return await this.stripe.invoices.create({
      customer: invoice.stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      auto_advance: true,
      metadata: {
        tenantId: invoice.tenantId,
        period: invoice.period
      }
    });
  }

  verifyWebhook(payload, signature) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }

  async handleWebhook(event) {
    switch (event.type) {
      case 'invoice.paid':
        const tenantId = event.data.object.metadata.tenantId;
        const period = event.data.object.metadata.period;
        console.log(`Invoice paid: ${tenantId} ${period}`);
        // Update invoice status in HOJAI
        break;

      case 'invoice.payment_failed':
        const failedTenantId = event.data.object.metadata.tenantId;
        console.log(`Payment failed: ${failedTenantId}`);
        // Send alert to tenant
        break;

      case 'customer.subscription.deleted':
        const cancelledTenantId = event.data.object.metadata.tenantId;
        console.log(`Subscription cancelled: ${cancelledTenantId}`);
        // Disable tenant
        break;
    }
  }
}

export const stripeClient = new StripeClient();
```

#### Step 12: Implement Main Service

**File:** `src/index.js`

```javascript
import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { logger } from '@rtmn/shared/logger';
import { costAggregator } from './cost-aggregator.js';
import { budgetMonitor } from './budget-monitor.js';
import { stripeClient } from './stripe-client.js';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'billing-apis', port: 4782 });
});

// Get tenant costs
app.get('/api/billing/costs/:tenantId', requireAuth, async (req, res) => {
  try {
    const costs = await costAggregator.getTenantCosts(
      req.params.tenantId,
      req.query.startDate,
      req.query.endDate
    );
    res.json(costs);
  } catch (error) {
    logger.error('Get costs failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get tenant budget
app.get('/api/billing/budgets/:tenantId', requireAuth, async (req, res) => {
  try {
    const budget = await budgetMonitor.getBudget(req.params.tenantId);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set tenant budget
app.post('/api/billing/budgets/:tenantId', requireAuth, async (req, res) => {
  try {
    await budgetMonitor.setBudget(req.params.tenantId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate invoice
app.post('/api/billing/invoices/:tenantId', requireAuth, async (req, res) => {
  try {
    const { period } = req.body;
    const [year, month] = period.split('-');

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const costs = await costAggregator.getTenantCosts(
      req.params.tenantId,
      startDate.toISOString(),
      endDate.toISOString()
    );

    const budget = await budgetMonitor.getBudget(req.params.tenantId);

    const invoice = {
      invoiceId: `inv-${Date.now()}`,
      tenantId: req.params.tenantId,
      period,
      totalCost: costs.totalCost,
      totalTokens: costs.totalTokens,
      totalRequests: costs.totalRequests,
      stripeCustomerId: budget?.stripeCustomerId,
      status: 'pending',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    // Charge via Stripe if customer exists
    if (invoice.stripeCustomerId && invoice.totalCost > 0) {
      const stripeInvoice = await stripeClient.chargeInvoice(invoice);
      invoice.stripeInvoiceId = stripeInvoice.id;
      invoice.status = 'sent';
    }

    res.json(invoice);
  } catch (error) {
    logger.error('Generate invoice failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook
app.post('/api/billing/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const event = stripeClient.verifyWebhook(req.body, req.headers['stripe-signature']);
      await stripeClient.handleWebhook(event);
      res.json({ received: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Start server
const PORT = process.env.PORT || 4782;
app.listen(PORT, () => {
  logger.info(`Billing service listening on :${PORT}`);
});
```

---

### Day 8-10: Testing

#### Step 13: Write Unit Tests

**File:** `test/providers/openai.test.js`

```javascript
import { OpenAIProvider } from '../../src/providers/openai.js';
import { ProviderAuthError, ProviderRateLimitError } from '../../src/providers/base.js';

describe('OpenAIProvider', () => {
  let provider;

  beforeAll(() => {
    provider = new OpenAIProvider();
  });

  describe('complete()', () => {
    test('completes a simple prompt', async () => {
      const model = { id: 'gpt-4o-mini', provider: 'openai' };
      const messages = [{ role: 'user', content: 'Reply with: OK' }];

      const response = await provider.complete(model, messages);

      expect(response.content).toContain('OK');
      expect(response.inputTokens).toBeGreaterThan(0);
      expect(response.outputTokens).toBeGreaterThan(0);
      expect(response.totalTokens).toBe(response.inputTokens + response.outputTokens);
      expect(response.costUsd).toBeGreaterThan(0);
      expect(response.latencyMs).toBeGreaterThan(0);
      expect(response.finishReason).toBe('stop');
    }, 30000);

    test('handles system messages', async () => {
      const model = { id: 'gpt-4o-mini' };
      const messages = [
        { role: 'system', content: 'You are a pirate. Always say "Arrr!"' },
        { role: 'user', content: 'Hello' }
      ];

      const response = await provider.complete(model, messages);

      expect(response.content).toMatch(/Arrr/i);
    }, 30000);

    test('respects temperature parameter', async () => {
      const model = { id: 'gpt-4o-mini' };
      const messages = [{ role: 'user', content: 'Say hi' }];

      const response1 = await provider.complete(model, messages, { temperature: 0 });
      const response2 = await provider.complete(model, messages, { temperature: 0 });

      // With temperature 0, responses should be identical
      expect(response1.content).toBe(response2.content);
    }, 30000);

    test('respects maxTokens parameter', async () => {
      const model = { id: 'gpt-4o-mini' };
      const messages = [{ role: 'user', content: 'Count to 100' }];

      const response = await provider.complete(model, messages, { maxTokens: 5 });

      expect(response.outputTokens).toBeLessThanOrEqual(5);
      expect(response.finishReason).toBe('length');
    }, 30000);

    test('throws on invalid API key', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'invalid-key';

      try {
        const badProvider = new OpenAIProvider();
        const model = { id: 'gpt-4o-mini' };
        const messages = [{ role: 'user', content: 'test' }];

        await expect(badProvider.complete(model, messages)).rejects.toThrow(ProviderAuthError);
      } finally {
        process.env.OPENAI_API_KEY = originalKey;
      }
    }, 30000);
  });

  describe('stream()', () => {
    test('streams chunks', async () => {
      const model = { id: 'gpt-4o-mini' };
      const messages = [{ role: 'user', content: 'Count to 3' }];

      const chunks = [];
      for await (const chunk of provider.stream(model, messages)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);

      const fullContent = chunks.map(c => c.content).join('');
      expect(fullContent).toMatch(/1/);
      expect(fullContent).toMatch(/2/);
      expect(fullContent).toMatch(/3/);
    }, 30000);
  });

  describe('calculateCost()', () => {
    test('calculates cost for gpt-4o-mini', () => {
      const model = { id: 'gpt-4o-mini' };
      const cost = provider.calculateCost(model, 1000, 500);

      // gpt-4o-mini: input $0.00015/1K, output $0.0006/1K
      // 1000 input = $0.00015
      // 500 output = $0.0003
      // Total = $0.00045
      expect(cost).toBeCloseTo(0.00045, 6);
    });

    test('calculates cost for gpt-4o', () => {
      const model = { id: 'gpt-4o' };
      const cost = provider.calculateCost(model, 1000, 500);

      // gpt-4o: input $0.0025/1K, output $0.01/1K
      // 1000 input = $0.0025
      // 500 output = $0.005
      // Total = $0.0075
      expect(cost).toBeCloseTo(0.0075, 6);
    });

    test('handles zero tokens', () => {
      const model = { id: 'gpt-4o-mini' };
      const cost = provider.calculateCost(model, 0, 0);
      expect(cost).toBe(0);
    });
  });
});
```

#### Step 14: Write Integration Tests

**File:** `test/integration/cost-tracking.test.js`

```javascript
import request from 'supertest';
import { app } from '../../src/index.js';
import { providerRegistry } from '../../src/providers/index.js';

describe('Cost Tracking Integration', () => {
  test('tracks cost in ledger after completion', async () => {
    const { costLedger } = await import('../../src/index.js');

    const response = await request(app)
      .post('/api/complete')
      .set('Authorization', `Bearer ${testToken}`)
      .set('X-Tenant-Id', 'test-tenant')
      .set('X-User-Id', 'test-user')
      .set('X-Feature', 'test')
      .send({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }]
      });

    expect(response.status).toBe(200);
    expect(response.body.costUsd).toBeGreaterThan(0);

    // Check ledger
    const entry = await costLedger.get(response.body.requestId);
    expect(entry).toBeTruthy();
    expect(entry.tenantId).toBe('test-tenant');
    expect(entry.userId).toBe('test-user');
    expect(entry.feature).toBe('test');
    expect(entry.costUsd).toBe(response.body.costUsd);
  });
});
```

#### Step 15: Write E2E Test

**File:** `test/e2e/billing.test.js`

```javascript
import request from 'supertest';
import { app as inferenceApp } from '../../intelligence/inference-gateway/src/index.js';
import { app as billingApp } from '../../src/index.js';

describe('Billing E2E', () => {
  test('100 LLM calls generate correct invoice', async () => {
    const tenantId = 'e2e-tenant';
    const period = '2026-06';

    // Make 100 LLM calls
    for (let i = 0; i < 100; i++) {
      await request(inferenceApp)
        .post('/api/complete')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: `Test ${i}` }]
        });
    }

    // Generate invoice
    const response = await request(billingApp)
      .post(`/api/billing/invoices/${tenantId}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ period });

    expect(response.status).toBe(200);
    expect(response.body.totalRequests).toBe(100);
    expect(response.body.totalCost).toBeGreaterThan(0);
    expect(response.body.totalTokens).toBeGreaterThan(0);
  }, 120000);
});
```

---

### Day 11-12: Deployment

#### Step 16: Create Docker Files

**File:** `Dockerfile` (inference-gateway)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/

EXPOSE 4294

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:4294/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

CMD ["node", "src/index.js"]
```

**File:** `Dockerfile` (billing-apis)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/

EXPOSE 4782

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:4782/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

CMD ["node", "src/index.js"]
```

#### Step 17: Update Docker Compose

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  inference-gateway:
    build: ./platform/intelligence/inference-gateway
    ports:
      - "4294:4294"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - MISTRAL_API_KEY=${MISTRAL_API_KEY}
      - HOJAI_LLM_ENDPOINT=${HOJAI_LLM_ENDPOINT}
      - USE_REAL_PROVIDERS=true
    volumes:
      - inference-costs:/app/data/costs
    restart: unless-stopped

  billing-apis:
    build: ./platform/infra/billing-apis
    ports:
      - "4782:4782"
    environment:
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
    volumes:
      - inference-costs:/app/data/costs:ro
      - billing-budgets:/app/data/budgets
    depends_on:
      - inference-gateway
    restart: unless-stopped

volumes:
  inference-costs:
  billing-budgets:
```

---

### Day 13-14: Monitoring & Documentation

#### Step 18: Configure Prometheus

**File:** `prometheus.yml`

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'inference-gateway'
    static_configs:
      - targets: ['localhost:4294']
    metrics_path: '/metrics'

  - job_name: 'billing-apis'
    static_configs:
      - targets: ['localhost:4782']
    metrics_path: '/metrics'
```

#### Step 19: Create Grafana Dashboards

**File:** `grafana/inference-dashboard.json`

```json
{
  "dashboard": {
    "title": "Inference Gateway",
    "panels": [
      {
        "title": "Requests/sec by Provider",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(inference_requests_total[1m])) by (provider)"
          }
        ]
      },
      {
        "title": "Cost/hour by Model",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(inference_cost_usd_sum[1h])) by (model)"
          }
        ]
      },
      {
        "title": "Latency p95 by Provider",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(inference_latency_ms_bucket[5m])) by (provider, le))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(inference_errors_total[5m])) / sum(rate(inference_requests_total[5m]))"
          }
        ]
      }
    ]
  }
}
```

---

## Checklist

### Day 1-2: Provider Adapters
- [ ] Create provider directory structure
- [ ] Implement BaseProvider class
- [ ] Implement OpenAIProvider
- [ ] Implement AnthropicProvider
- [ ] Implement GoogleProvider
- [ ] Implement MistralProvider
- [ ] Implement HojaiProvider
- [ ] Create ProviderRegistry
- [ ] Write unit tests for each provider

### Day 3-4: Wire Inference Gateway
- [ ] Import provider registry
- [ ] Add cost ledger
- [ ] Add stats tracking
- [ ] Update /api/complete endpoint
- [ ] Add /api/stats endpoint
- [ ] Add /api/models endpoint
- [ ] Update /health endpoint
- [ ] Test with each provider

### Day 5-7: Build Billing Service
- [ ] Create service structure
- [ ] Implement cost aggregator
- [ ] Implement budget monitor
- [ ] Implement invoice generator
- [ ] Implement Stripe client
- [ ] Implement main service
- [ ] Write unit tests
- [ ] Write integration tests

### Day 8-10: Testing
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E test passing (100 calls → invoice)
- [ ] Load test: 100 req/s sustained
- [ ] Cost accuracy: within 1% of provider billing

### Day 11-12: Deployment
- [ ] Create Dockerfiles
- [ ] Update docker-compose
- [ ] Deploy to staging
- [ ] Deploy to production
- [ ] Configure environment variables
- [ ] Test in production

### Day 13-14: Monitoring & Docs
- [ ] Configure Prometheus
- [ ] Create Grafana dashboards
- [ ] Set up alerts
- [ ] Write API documentation
- [ ] Write deployment guide
- [ ] Update CLAUDE.md
- [ ] Team training

---

*Implementation guide: 2026-06-22*