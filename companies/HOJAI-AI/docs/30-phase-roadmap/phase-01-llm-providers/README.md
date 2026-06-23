# Phase 1: LLM Providers & Billing

**Duration:** 2 weeks (Week 1–2)
**Priority:** P0 (Critical)
**Owner:** Senior Engineer + DevOps

---

## ⚠️ CRITICAL: What We're BUILDING vs What We're USING

### ❌ We are NOT building:
- **LLMs from scratch** (like GPT-4, Claude, Gemini)
- **Training our own foundation models** (that costs $100M+ and takes years)
- **Competing with OpenAI/Anthropic at the model layer**

### ✅ We ARE building:
- **Infrastructure** ON TOP of existing LLMs
- **Routing logic** to pick the right LLM for each task
- **Cost tracking** for every API call
- **Billing system** to charge customers
- **Fallback chains** when one provider is down

### ✅ We ARE using:
- **OpenAI** (GPT-4o, GPT-4o-mini, o1-preview)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Haiku)
- **Google** (Gemini 1.5 Pro, Gemini 1.5 Flash)
- **Mistral** (Mistral Large)
- **HOJAI self-hosted models** (Phase 30 - fine-tuned, not built from scratch)

### 🎯 Think of it like AWS:
- **AWS doesn't build** the Linux kernel
- **AWS uses** Linux and builds infrastructure (EC2, S3, RDS) ON TOP
- **Similarly, HOJAI uses** OpenAI/Anthropic and builds infrastructure (Agent Runtime, SkillOS, Marketplace) ON TOP

---

## Goal

Wire the inference gateway to **USE** real LLM provider APIs (OpenAI, Anthropic, Google, Mistral) via their SDKs, and implement production-grade cost tracking with billing integration.

**Key Point:** We are making API calls to existing LLM providers. We are not training or building LLMs.

---

## Why This Matters

**Current State:** The inference gateway (port 4294) has well-designed routing logic but is in **STUB MODE**. `getProviderKey()` returns null for all providers, `callStubProvider()` returns hardcoded strings, and `costUsd: 0` is hardcoded.

**Impact:** Without real LLM API calls, HOJAI AI cannot serve production traffic. Every "AI" service is actually deterministic.

**After This Phase:** Real LLM API calls work end-to-end (we call OpenAI, Anthropic, etc.) with accurate cost tracking and billing.

---

## What This Phase Actually Does

```javascript
// ✅ We USE OpenAI's API (we don't build GPT-4o)
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ We USE Anthropic's API (we don't build Claude)
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 🔨 WE BUILD the routing logic
function selectModel(task, budget, quality) {
  // Pick the right model based on requirements
  if (budget < 0.001) return 'gpt-4o-mini';      // Cheap
  if (quality === 'high') return 'claude-3-5-sonnet'; // High quality
  return 'gpt-4o'; // Default
}

// 🔨 WE BUILD the cost tracking
function calculateCost(model, inputTokens, outputTokens) {
  const pricing = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 }
  };
  return (inputTokens / 1000) * pricing[model].input + (outputTokens / 1000) * pricing[model].output;
}

// 🔨 WE BUILD the fallback chain
async function callWithFallback(messages) {
  try {
    return await openai.complete('gpt-4o', messages);
  } catch (error) {
    // Fallback to Anthropic if OpenAI fails
    return await anthropic.complete('claude-3-5-sonnet', messages);
  }
}
```

**Bottom Line:** We make API calls to existing LLM providers and build smart infrastructure around those calls.

---

## Current State Audit

### Existing Code

**File:** `platform/intelligence/inference-gateway/src/index.js`

**Issues:**

1. **Line 186:** `costUsd: 0` hardcoded
2. **Lines 310-330:** `getProviderKey()` returns null
3. **Lines 340-380:** `callStubProvider()` returns hardcoded strings
4. **Lines 206-250:** `selectModel()` logic is correct but never executes real calls

**File:** `platform/infra/billing-apis/` — **EMPTY DIRECTORY** (only node_modules)

**File:** `platform/intelligence/inference-gateway/src/index.js` (lines 256-268) — Stats object tracks `latencyMs` but always 0-5ms (stub)

---

## Deliverables

### 1.1 Implement Provider SDK Calls

**File:** `platform/intelligence/inference-gateway/src/providers/`

**Build 5 provider adapters:**

#### OpenAI Adapter (`openai.js`)
```javascript
// Purpose: Call OpenAI API (gpt-4o, gpt-4o-mini, o1-preview)

import OpenAI from 'openai';

export class OpenAIProvider {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 3
    });
    this.name = 'openai';
  }

  async complete(model, messages, options = {}) {
    const start = Date.now();
    try {
      const response = await this.client.chat.completions.create({
        model: model.id,
        messages: messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        top_p: options.topP ?? 1.0,
        stream: options.stream ?? false
      });

      const latencyMs = Date.now() - start;
      const inputTokens = response.usage.prompt_tokens;
      const outputTokens = response.usage.completion_tokens;

      return {
        content: response.choices[0].message.content,
        model: model.id,
        provider: this.name,
        inputTokens,
        outputTokens,
        totalTokens: response.usage.total_tokens,
        latencyMs,
        costUsd: this.calculateCost(model, inputTokens, outputTokens),
        finishReason: response.choices[0].finish_reason
      };
    } catch (error) {
      throw new ProviderError(`OpenAI call failed: ${error.message}`, this.name, error);
    }
  }

  async stream(model, messages, options = {}) {
    const stream = await this.client.chat.completions.create({
      model: model.id,
      messages: messages,
      stream: true,
      ...options
    });

    for await (const chunk of stream) {
      yield {
        content: chunk.choices[0]?.delta?.content || '',
        finishReason: chunk.choices[0]?.finish_reason
      };
    }
  }

  calculateCost(model, inputTokens, outputTokens) {
    // Pricing per 1K tokens (as of 2026-06-22)
    const pricing = {
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'o1-preview': { input: 0.015, output: 0.06 }
    };

    const rate = pricing[model.id] || pricing['gpt-4o-mini'];
    return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
  }
}
```

#### Anthropic Adapter (`anthropic.js`)
```javascript
// Purpose: Call Anthropic API (claude-3-5-sonnet, claude-3-haiku)

import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30000,
      maxRetries: 3
    });
    this.name = 'anthropic';
  }

  async complete(model, messages, options = {}) {
    const start = Date.now();
    try {
      // Anthropic requires system message separate
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const response = await this.client.messages.create({
        model: model.id,
        system: systemMessage,
        messages: conversationMessages,
        max_tokens: options.maxTokens ?? 2000,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 1.0
      });

      const latencyMs = Date.now() - start;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      return {
        content: response.content[0].text,
        model: model.id,
        provider: this.name,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        latencyMs,
        costUsd: this.calculateCost(model, inputTokens, outputTokens),
        finishReason: response.stop_reason
      };
    } catch (error) {
      throw new ProviderError(`Anthropic call failed: ${error.message}`, this.name, error);
    }
  }

  calculateCost(model, inputTokens, outputTokens) {
    const pricing = {
      'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    };

    const rate = pricing[model.id] || pricing['claude-3-haiku'];
    return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
  }
}
```

#### Google Adapter (`google.js`)
```javascript
// Purpose: Call Google Gemini API (gemini-1.5-pro, gemini-1.5-flash)

import { GoogleGenerativeAI } from '@google/generative-ai';

export class GoogleProvider {
  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.name = 'google';
  }

  async complete(model, messages, options = {}) {
    const start = Date.now();
    try {
      const genModel = this.client.getGenerativeModel({ model: model.id });

      // Convert messages to Gemini format
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const lastMessage = messages[messages.length - 1];

      const chat = genModel.startChat({
        history: history,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2000,
          topP: options.topP ?? 1.0
        }
      });

      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      const text = response.text();

      const latencyMs = Date.now() - start;
      const inputTokens = response.usageMetadata?.promptTokenCount || 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

      return {
        content: text,
        model: model.id,
        provider: this.name,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        latencyMs,
        costUsd: this.calculateCost(model, inputTokens, outputTokens),
        finishReason: 'stop'
      };
    } catch (error) {
      throw new ProviderError(`Google call failed: ${error.message}`, this.name, error);
    }
  }

  calculateCost(model, inputTokens, outputTokens) {
    const pricing = {
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 }
    };

    const rate = pricing[model.id] || pricing['gemini-1.5-flash'];
    return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
  }
}
```

#### Mistral Adapter (`mistral.js`)
```javascript
// Purpose: Call Mistral API (mistral-large)

import MistralClient from '@mistralai/mistralai';

export class MistralProvider {
  constructor() {
    this.client = new MistralClient(process.env.MISTRAL_API_KEY);
    this.name = 'mistral';
  }

  async complete(model, messages, options = {}) {
    const start = Date.now();
    try {
      const response = await this.client.chat({
        model: model.id,
        messages: messages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 2000,
        topP: options.topP ?? 1.0
      });

      const latencyMs = Date.now() - start;
      const inputTokens = response.usage.promptTokens;
      const outputTokens = response.usage.completionTokens;

      return {
        content: response.choices[0].message.content,
        model: model.id,
        provider: this.name,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        latencyMs,
        costUsd: this.calculateCost(model, inputTokens, outputTokens),
        finishReason: response.choices[0].finishReason
      };
    } catch (error) {
      throw new ProviderError(`Mistral call failed: ${error.message}`, this.name, error);
    }
  }

  calculateCost(model, inputTokens, outputTokens) {
    const pricing = {
      'mistral-large': { input: 0.004, output: 0.012 }
    };

    const rate = pricing[model.id] || pricing['mistral-large'];
    return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
  }
}
```

#### HOJAI Adapter (`hojai.js`)
```javascript
// Purpose: Call self-hosted HOJAI models (hojai-llama-3-70b)

import axios from 'axios';

export class HojaiProvider {
  constructor() {
    this.endpoint = process.env.HOJAI_LLM_ENDPOINT || 'http://localhost:5000';
    this.apiKey = process.env.HOJAI_LLM_API_KEY;
    this.name = 'hojai';
  }

  async complete(model, messages, options = {}) {
    const start = Date.now();
    try {
      const response = await axios.post(
        `${this.endpoint}/v1/chat/completions`,
        {
          model: model.id,
          messages: messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const latencyMs = Date.now() - start;
      const inputTokens = response.data.usage.prompt_tokens;
      const outputTokens = response.data.usage.completion_tokens;

      return {
        content: response.data.choices[0].message.content,
        model: model.id,
        provider: this.name,
        inputTokens,
        outputTokens,
        totalTokens: response.data.usage.total_tokens,
        latencyMs,
        costUsd: this.calculateCost(model, inputTokens, outputTokens),
        finishReason: response.data.choices[0].finish_reason
      };
    } catch (error) {
      throw new ProviderError(`HOJAI call failed: ${error.message}`, this.name, error);
    }
  }

  calculateCost(model, inputTokens, outputTokens) {
    // Self-hosted: just infrastructure cost
    const costPer1K = 0.0001; // $0.10 per 1M tokens (compute cost)
    return ((inputTokens + outputTokens) / 1000) * costPer1K;
  }
}
```

**Tasks:**
- [ ] Create `providers/` directory
- [ ] Implement all 5 provider adapters
- [ ] Add retry logic with exponential backoff
- [ ] Add streaming support
- [ ] Add error handling (rate limits, timeouts, invalid keys)
- [ ] Add provider health checks
- [ ] Write unit tests for each adapter
- [ ] Write integration tests with mock servers

---

### 1.2 Fix Cost Tracking

**File:** `platform/intelligence/inference-gateway/src/index.js`

**Tasks:**

1. **Replace `costUsd: 0` (line 186)** with real cost calculation from provider response
2. **Add `costLedger` PersistentMap** for per-request cost logging
3. **Emit cost metrics** to Prometheus
4. **Add cost attribution** by tenant/user/feature

**Code Changes:**

```javascript
// Add to imports
import { PersistentMap } from '@rtmn/persistent-store';
import { metrics } from '@rtmn/observability';

// Add cost ledger
const costLedger = new PersistentMap({
  name: 'inference-cost-ledger',
  baseDir: './data/costs'
});

// Add cost tracking to /api/complete endpoint
app.post('/api/complete', async (req, res) => {
  const { model, messages, ...options } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || 'anonymous';
  const feature = req.headers['x-feature'] || 'unknown';

  try {
    const response = await callProvider(model, messages, options);

    // Log cost to ledger
    const costEntry = {
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
      requestId: req.id
    };

    await costLedger.set(req.id, costEntry);

    // Emit Prometheus metrics
    metrics.increment('inference_requests_total', {
      model: model.id,
      provider: model.provider,
      tenant: tenantId
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

    res.json(response);
  } catch (error) {
    metrics.increment('inference_errors_total', {
      model: model.id,
      provider: model.provider,
      error_type: error.name
    });

    res.status(500).json({ error: error.message });
  }
});
```

**Test Gate:**
- Cost matches OpenAI/Anthropic billing within 1%
- Cost ledger persists across restarts
- Metrics visible in Prometheus

---

### 1.3 Build Billing Service

**File:** `platform/infra/billing-apis/` (currently EMPTY)

**Tasks:**

1. **Create Express service** on port 4782
2. **Implement per-tenant cost aggregation**
3. **Add budget alerts**
4. **Implement invoice generation**
5. **Stripe integration** for actual charging

**File Structure:**

```
platform/infra/billing-apis/
├── src/
│   ├── index.js              # Main Express app
│   ├── cost-aggregator.js    # Aggregate costs by tenant
│   ├── invoice-generator.js  # Generate invoices
│   ├── stripe-client.js      # Stripe integration
│   ├── budget-monitor.js     # Monitor budgets
│   └── alerts.js             # Send alerts
├── test/
│   ├── cost-aggregator.test.js
│   ├── invoice-generator.test.js
│   └── e2e.test.js
├── package.json
├── README.md
└── CLAUDE.md
```

**Main Service (`src/index.js`):**

```javascript
import express from 'express';
import { PersistentMap } from '@rtmn/persistent-store';
import { requireAuth } from '@rtmn/shared/auth';
import { costAggregator } from './cost-aggregator.js';
import { invoiceGenerator } from './invoice-generator.js';
import { stripeClient } from './stripe-client.js';
import { budgetMonitor } from './budget-monitor.js';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'billing-apis', port: 4782 });
});

// Get tenant costs
app.get('/api/billing/costs/:tenantId', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const costs = await costAggregator.getTenantCosts(
      req.params.tenantId,
      startDate,
      endDate
    );
    res.json(costs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tenant budgets
app.get('/api/billing/budgets/:tenantId', requireAuth, async (req, res) => {
  try {
    const budgets = await budgetMonitor.getBudgets(req.params.tenantId);
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set tenant budget
app.post('/api/billing/budgets/:tenantId', requireAuth, async (req, res) => {
  try {
    const { monthlyBudget, alertThreshold } = req.body;
    await budgetMonitor.setBudget(req.params.tenantId, {
      monthlyBudget,
      alertThreshold
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate invoice
app.post('/api/billing/invoices/:tenantId', requireAuth, async (req, res) => {
  try {
    const { period } = req.body; // e.g., "2026-06"
    const invoice = await invoiceGenerator.generate(req.params.tenantId, period);

    // Charge via Stripe
    if (invoice.amount > 0) {
      await stripeClient.chargeInvoice(invoice);
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook
app.post('/api/billing/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = stripeClient.verifyWebhook(req.body, req.headers['stripe-signature']);
    await stripeClient.handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 4782;
app.listen(PORT, () => {
  console.log(`💰 Billing service listening on :${PORT}`);
});
```

**Cost Aggregator (`src/cost-aggregator.js`):**

```javascript
import { PersistentMap } from '@rtmn/persistent-store';

export class CostAggregator {
  constructor() {
    this.costLedger = new PersistentMap({
      name: 'inference-cost-ledger',
      baseDir: './data/costs'
    });
  }

  async getTenantCosts(tenantId, startDate, endDate) {
    const costs = [];
    const start = new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(endDate || Date.now());

    // Iterate cost ledger
    for (const [requestId, entry] of this.costLedger.entries()) {
      const entryDate = new Date(entry.timestamp);
      if (entry.tenantId === tenantId && entryDate >= start && entryDate <= end) {
        costs.push(entry);
      }
    }

    // Aggregate by model, provider, feature
    const aggregated = {
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
      aggregated.totalCost += cost.costUsd;
      aggregated.totalTokens += cost.totalTokens;

      // By model
      if (!aggregated.byModel[cost.model]) {
        aggregated.byModel[cost.model] = { cost: 0, tokens: 0, requests: 0 };
      }
      aggregated.byModel[cost.model].cost += cost.costUsd;
      aggregated.byModel[cost.model].tokens += cost.totalTokens;
      aggregated.byModel[cost.model].requests += 1;

      // By provider
      if (!aggregated.byProvider[cost.provider]) {
        aggregated.byProvider[cost.provider] = { cost: 0, tokens: 0, requests: 0 };
      }
      aggregated.byProvider[cost.provider].cost += cost.costUsd;
      aggregated.byProvider[cost.provider].tokens += cost.totalTokens;
      aggregated.byProvider[cost.provider].requests += 1;

      // By feature
      if (!aggregated.byFeature[cost.feature]) {
        aggregated.byFeature[cost.feature] = { cost: 0, tokens: 0, requests: 0 };
      }
      aggregated.byFeature[cost.feature].cost += cost.costUsd;
      aggregated.byFeature[cost.feature].tokens += cost.totalTokens;
      aggregated.byFeature[cost.feature].requests += 1;

      // By day
      const day = cost.timestamp.split('T')[0];
      if (!aggregated.byDay[day]) {
        aggregated.byDay[day] = { cost: 0, tokens: 0, requests: 0 };
      }
      aggregated.byDay[day].cost += cost.costUsd;
      aggregated.byDay[day].tokens += cost.totalTokens;
      aggregated.byDay[day].requests += 1;
    }

    return aggregated;
  }
}
```

**Budget Monitor (`src/budget-monitor.js`):**

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
      baseDir: './data/costs'
    });
  }

  async setBudget(tenantId, { monthlyBudget, alertThreshold = 0.8 }) {
    await this.budgets.set(tenantId, {
      tenantId,
      monthlyBudget,
      alertThreshold,
      createdAt: new Date().toISOString()
    });
  }

  async getBudgets(tenantId) {
    return await this.budgets.get(tenantId);
  }

  async checkBudgets() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const [tenantId, budget] of this.budgets.entries()) {
      const monthCosts = await this.getMonthCosts(tenantId, monthStart, now);
      const utilization = monthCosts / budget.monthlyBudget;

      if (utilization >= 1.0) {
        await alerts.sendBudgetExceeded(tenantId, monthCosts, budget.monthlyBudget);
      } else if (utilization >= budget.alertThreshold) {
        await alerts.sendBudgetWarning(tenantId, monthCosts, budget.monthlyBudget, utilization);
      }
    }
  }

  async getMonthCosts(tenantId, start, end) {
    let total = 0;
    for (const [requestId, entry] of this.costLedger.entries()) {
      const entryDate = new Date(entry.timestamp);
      if (entry.tenantId === tenantId && entryDate >= start && entryDate <= end) {
        total += entry.costUsd;
      }
    }
    return total;
  }
}

// Run budget check every hour
setInterval(() => {
  budgetMonitor.checkBudgets();
}, 60 * 60 * 1000);
```

**Stripe Client (`src/stripe-client.js`):**

```javascript
import Stripe from 'stripe';

export class StripeClient {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async createCustomer(tenantId, email) {
    return await this.stripe.customers.create({
      metadata: { tenantId },
      email
    });
  }

  async chargeInvoice(invoice) {
    if (!invoice.stripeCustomerId) {
      throw new Error(`No Stripe customer for tenant ${invoice.tenantId}`);
    }

    return await this.stripe.invoices.create({
      customer: invoice.stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      description: `HOJAI AI usage for ${invoice.period}`,
      metadata: {
        tenantId: invoice.tenantId,
        period: invoice.period,
        totalCost: invoice.totalCost.toString()
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
        await this.markInvoicePaid(event.data.object.metadata.tenantId, event.data.object.metadata.period);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event.data.object.metadata.tenantId);
        break;
    }
  }
}
```

**Tasks:**
- [ ] Create service directory structure
- [ ] Implement cost aggregator
- [ ] Implement budget monitor
- [ ] Implement invoice generator
- [ ] Implement Stripe client
- [ ] Add webhook handler
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E test (100 LLM calls → invoice generated)
- [ ] Add to docker-compose
- [ ] Update CLAUDE.md
- [ ] Add to service registry

---

## Configuration

### Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
MISTRAL_API_KEY=...
HOJAI_LLM_ENDPOINT=http://localhost:5000
HOJAI_LLM_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Feature flags
USE_REAL_PROVIDERS=true
USE_BILLING=true
COST_TRACKING_ENABLED=true
```

### Feature Flags

```javascript
// In inference-gateway/src/index.js
const USE_REAL_PROVIDERS = process.env.USE_REAL_PROVIDERS === 'true';
const USE_BILLING = process.env.USE_BILLING === 'true';

if (USE_REAL_PROVIDERS) {
  // Use real provider adapters
} else {
  // Use stub (for testing)
}
```

---

## Testing Strategy

### Unit Tests

**File:** `test/providers/openai.test.js`

```javascript
import { OpenAIProvider } from '../../src/providers/openai.js';

describe('OpenAIProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new OpenAIProvider();
  });

  test('completes a simple prompt', async () => {
    const model = { id: 'gpt-4o-mini', provider: 'openai' };
    const messages = [{ role: 'user', content: 'Say hello' }];

    const response = await provider.complete(model, messages);

    expect(response.content).toBeTruthy();
    expect(response.inputTokens).toBeGreaterThan(0);
    expect(response.outputTokens).toBeGreaterThan(0);
    expect(response.costUsd).toBeGreaterThan(0);
    expect(response.latencyMs).toBeGreaterThan(0);
  });

  test('calculates cost correctly', () => {
    const model = { id: 'gpt-4o-mini' };
    const cost = provider.calculateCost(model, 1000, 500);

    // gpt-4o-mini: input $0.00015/1K, output $0.0006/1K
    expect(cost).toBeCloseTo(0.00015 + 0.0003, 6);
  });

  test('handles API errors gracefully', async () => {
    const model = { id: 'invalid-model', provider: 'openai' };
    const messages = [{ role: 'user', content: 'test' }];

    await expect(provider.complete(model, messages)).rejects.toThrow();
  });

  test('supports streaming', async () => {
    const model = { id: 'gpt-4o-mini' };
    const messages = [{ role: 'user', content: 'Count to 5' }];

    const chunks = [];
    for await (const chunk of provider.stream(model, messages)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    const fullContent = chunks.map(c => c.content).join('');
    expect(fullContent).toMatch(/1.*2.*3.*4.*5/);
  });
});
```

### Integration Tests

**File:** `test/integration/providers.test.js`

```javascript
import { OpenAIProvider } from '../../src/providers/openai.js';
import { AnthropicProvider } from '../../src/providers/anthropic.js';

describe('Provider Integration', () => {
  test('all providers respond to test prompt', async () => {
    const providers = [
      new OpenAIProvider(),
      new AnthropicProvider()
      // Add others when API keys available
    ];

    const messages = [{ role: 'user', content: 'Reply with: OK' }];

    for (const provider of providers) {
      const response = await provider.complete(
        { id: provider.name === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku' },
        messages
      );

      expect(response.content).toContain('OK');
      expect(response.latencyMs).toBeLessThan(10000); // 10s timeout
    }
  });
});
```

### E2E Test

**File:** `test/e2e/billing.test.js`

```javascript
import request from 'supertest';
import { app } from '../../src/index.js';

describe('Billing E2E', () => {
  test('100 LLM calls generate correct invoice', async () => {
    const tenantId = 'test-tenant';

    // Make 100 LLM calls
    for (let i = 0; i < 100; i++) {
      await request(app)
        .post('/api/complete')
        .set('x-tenant-id', tenantId)
        .send({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: `Test ${i}` }]
        });
    }

    // Generate invoice
    const response = await request(app)
      .post(`/api/billing/invoices/${tenantId}`)
      .send({ period: '2026-06' });

    expect(response.body.totalCost).toBeGreaterThan(0);
    expect(response.body.totalRequests).toBe(100);
    expect(response.body.totalTokens).toBeGreaterThan(0);
  });
});
```

---

## Test Gates

### Gate 1: Provider Connectivity (Day 3)
- [ ] All 5 providers respond to test prompt
- [ ] Latency < 10s p95 for each provider
- [ ] Error handling works (invalid key, timeout, rate limit)

### Gate 2: Cost Tracking (Day 7)
- [ ] Cost matches provider billing within 1%
- [ ] Cost ledger persists across restarts
- [ ] Metrics visible in Prometheus
- [ ] Per-tenant cost aggregation works

### Gate 3: Billing Service (Day 10)
- [ ] Cost aggregator works
- [ ] Budget monitoring works
- [ ] Invoice generation works
- [ ] Stripe integration works (test mode)
- [ ] E2E test passes: 100 calls → invoice generated

### Gate 4: Production Readiness (Day 14)
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Rollback plan tested

---

## Monitoring & Alerts

### Metrics (Prometheus)

```yaml
# inference_requests_total
# Type: Counter
# Labels: model, provider, tenant
# Alert: Rate drop >50% for 5min

# inference_cost_usd
# Type: Histogram
# Labels: model, tenant
# Alert: p95 cost increase >20%

# inference_latency_ms
# Type: Histogram
# Labels: model, provider
# Alert: p95 >10s

# inference_errors_total
# Type: Counter
# Labels: model, provider, error_type
# Alert: Error rate >5%
```

### Alerts

```yaml
# High cost alert
- alert: HighInferenceCost
  expr: sum(rate(inference_cost_usd_sum[1h])) > 100
  for: 5m
  annotations:
    summary: "High inference cost: ${{ $value }}/hour"

# Provider down
- alert: ProviderDown
  expr: up{job="inference-gateway"} == 0
  for: 2m
  annotations:
    summary: "Inference gateway down"

# Budget exceeded
- alert: TenantBudgetExceeded
  expr: tenant_budget_utilization > 1.0
  for: 1m
  annotations:
    summary: "Tenant {{ $labels.tenant }} exceeded budget"
```

### Dashboards (Grafana)

1. **Inference Overview**
   - Requests/sec by provider
   - Cost/hour by model
   - Latency p50/p95/p99
   - Error rate

2. **Cost Analysis**
   - Cost by tenant (top 10)
   - Cost by model
   - Cost by feature
   - Cost trends (daily/weekly/monthly)

3. **Provider Health**
   - Uptime per provider
   - Latency per provider
   - Error rate per provider
   - Rate limit hits

---

## Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/
COPY test/ ./test/

EXPOSE 4294 4782

CMD ["node", "src/index.js"]
```

### Docker Compose

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
      - USE_REAL_PROVIDERS=true
    depends_on:
      - billing-apis

  billing-apis:
    build: ./platform/infra/billing-apis
    ports:
      - "4782:4782"
    environment:
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
```

---

## Rollback Plan

### Feature Flags

```javascript
// Instant rollback to stub mode
USE_REAL_PROVIDERS=false  // Reverts to hardcoded responses
USE_BILLING=false         // Disables cost tracking
```

### Database Rollback

```bash
# Backup cost ledger before deployment
cp -r ./data/costs ./data/costs.backup.2026-06-22

# Restore if needed
rm -rf ./data/costs
cp -r ./data/costs.backup.2026-06-22 ./data/costs
```

### Service Rollback

```bash
# Stop new version
docker stop inference-gateway-v2

# Start old version
docker start inference-gateway-v1
```

---

## Success Criteria

✅ All 5 provider adapters implemented and tested
✅ Cost tracking accurate within 1% of provider billing
✅ Billing service deployed and operational
✅ Stripe integration working (test mode)
✅ Budget monitoring and alerts functional
✅ All tests passing (>95% coverage)
✅ Documentation complete
✅ Monitoring and alerts configured
✅ Rollback plan tested

---

## Related Documentation

- [Phase 1 ARCHITECTURE.md](./ARCHITECTURE.md) — Technical architecture
- [Phase 1 API.md](./API.md) — API endpoints
- [Phase 1 IMPLEMENTATION.md](./IMPLEMENTATION.md) — Step-by-step guide
- [Phase 1 TESTING.md](./TESTING.md) — Test cases
- [Phase 1 DEPLOYMENT.md](./DEPLOYMENT.md) — Deployment guide
- [Phase 1 MONITORING.md](./MONITORING.md) — Metrics and alerts
- [Phase 1 TASKS.md](./TASKS.md) — Detailed task breakdown

---

*Phase 1 documentation: 2026-06-22*
*Status: Planned*
*Owner: Senior Engineer + DevOps*