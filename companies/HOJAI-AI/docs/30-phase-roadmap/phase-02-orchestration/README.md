# Phase 2: Orchestration Wiring

**Duration:** 1 week (Week 3)
**Priority:** P0 (Critical)
**Owner:** Senior Engineer

---

## Goal

Fix the broken orchestration flow so that "answer a user question" works end-to-end through the Genie Gateway → Flow Orchestrator → TwinOS → MemoryOS → AI Intelligence → Inference Gateway pipeline.

---

## Why This Matters

**Current State:**
- **Genie Gateway (port 4701)** is a hardcoded `if/else` switch that returns canned responses
- **Flow Orchestrator (port 4244)** has a broken `intelligence.call` step that calls a non-existent endpoint `/api/intelligence/${task}`
- **AI Intelligence (port 4881)** `/api/analyze` is entirely deterministic (regex/keyword matching)
- The "answer a question" flow never reaches a real LLM

**Impact:** Users asking questions get hardcoded or deterministic responses, not AI-generated answers.

**After This Phase:** The full orchestration pipeline works, Genie Gateway delegates to Flow Orchestrator, and AI Intelligence calls real LLMs.

---

## Current State Audit

### Existing Code

**File:** `products/genie/genie-gateway/src/index.js`

**Issues:**
- Lines 198-240: Hardcoded `if (q.includes('weather'))` switch
- Never calls flow orchestrator
- Returns canned responses like "The capital of France is Paris" (hardcoded)

**File:** `platform/flow/flow-orchestrator/src/index.js`

**Issues:**
- Line 217: `intelligence.call` step calls `/api/intelligence/${task}` which doesn't exist
- Falls through to offline stub
- Templates exist but never complete successfully

**File:** `platform/intelligence/ai-intelligence/src/index.ts`

**Issues:**
- `/api/analyze` is entirely deterministic
- 5 agents (intent, sentiment, retrieval, prediction, recommendation) use regex
- Never calls LLM

---

## Deliverables

### 2.1 Fix Genie Gateway

**File:** `products/genie/genie-gateway/src/index.js`

**Tasks:**

1. Replace hardcoded `if/else` switch (lines 198-240) with flow orchestrator call
2. Add request validation
3. Add response streaming (SSE)
4. Add conversation history loading from MemoryOS
5. Add context assembly (MemoryOS + TwinOS)

**New Implementation:**

```javascript
// File: products/genie/genie-gateway/src/index.js

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { logger } from '@rtmn/shared/logger';
import { flowOrchestratorClient } from './clients/flow-orchestrator.js';
import { memoryOSClient } from './clients/memory-os.js';
import { twinOSClient } from './clients/twinos.js';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'genie-gateway', port: 4701 });
});

// Answer a question (main endpoint)
app.post('/api/genie/answer', requireAuth, async (req, res) => {
  const start = Date.now();
  try {
    const { question, userId, sessionId, stream = false } = req.body;

    // Validate input
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question required' });
    }
    if (question.length > 10000) {
      return res.status(413).json({ error: 'Question too long (max 10000 chars)' });
    }

    // Load conversation history from MemoryOS
    const history = await memoryOSClient.getHistory(userId, sessionId, {
      limit: 10,
      orderBy: 'timestamp:desc'
    });

    // Resolve user twin from TwinOS
    const userTwin = await twinOSClient.resolve(`user.${userId}`);

    // Assemble context
    const context = {
      user: {
        id: userId,
        twin: userTwin,
        preferences: userTwin?.preferences || {}
      },
      history: history.map(h => ({
        role: h.role,
        content: h.content
      })),
      sessionId,
      timestamp: new Date().toISOString()
    };

    // Call flow orchestrator with "answer-question" template
    const response = await flowOrchestratorClient.execute({
      template: 'answer-question',
      inputs: {
        question,
        context
      },
      stream
    });

    // Store in memory
    await memoryOSClient.store(userId, sessionId, {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    });

    await memoryOSClient.store(userId, sessionId, {
      role: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
      metadata: {
        model: response.model,
        provider: response.provider,
        cost: response.costUsd,
        latency: Date.now() - start
      }
    });

    res.json({
      answer: response.content,
      sessionId,
      model: response.model,
      cost: response.costUsd,
      latencyMs: Date.now() - start
    });
  } catch (error) {
    logger.error('Genie answer failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Streaming endpoint
app.post('/api/genie/answer/stream', requireAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { question, userId, sessionId } = req.body;

    const history = await memoryOSClient.getHistory(userId, sessionId, { limit: 10 });
    const userTwin = await twinOSClient.resolve(`user.${userId}`);

    const context = {
      user: { id: userId, twin: userTwin },
      history: history.map(h => ({ role: h.role, content: h.content })),
      sessionId
    };

    const stream = flowOrchestratorClient.executeStream({
      template: 'answer-question',
      inputs: { question, context }
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Start server
const PORT = process.env.PORT || 4701;
app.listen(PORT, () => {
  logger.info(`Genie Gateway listening on :${PORT}`);
});
```

**Tasks:**
- [ ] Remove hardcoded `if/else` switch
- [ ] Implement flow orchestrator client
- [ ] Implement MemoryOS client
- [ ] Implement TwinOS client
- [ ] Add streaming support
- [ ] Add conversation history
- [ ] Add error handling
- [ ] Write tests

---

### 2.2 Add Missing /api/intelligence/:task Endpoint

**File:** `platform/intelligence/ai-intelligence/src/index.ts`

**Tasks:**

1. Implement `POST /api/intelligence/:task` endpoint
2. Support tasks: classify, extract, summarize, generate, analyze
3. Call inference gateway
4. Add timeout handling

**New Implementation:**

```typescript
// File: platform/intelligence/ai-intelligence/src/index.ts

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { logger } from '@rtmn/shared/logger';
import { inferenceGatewayClient } from './clients/inference-gateway.js';
import { promptManagerClient } from './clients/prompt-manager.js';

const app = express();
app.use(express.json());

// Task handlers
const taskHandlers = {
  classify: async (input, options) => {
    const prompt = await promptManagerClient.render('classification', {
      categories: options.categories,
      text: input.text
    });

    const response = await inferenceGatewayClient.complete({
      model: options.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 100
    });

    return {
      category: response.content.trim(),
      confidence: 0.85,
      tokens: response.totalTokens,
      cost: response.costUsd
    };
  },

  extract: async (input, options) => {
    const prompt = await promptManagerClient.render('entity-extraction', {
      entities: options.entities,
      text: input.text
    });

    const response = await inferenceGatewayClient.complete({
      model: options.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 500
    });

    try {
      const entities = JSON.parse(response.content);
      return { entities, tokens: response.totalTokens, cost: response.costUsd };
    } catch (error) {
      return { entities: [], tokens: response.totalTokens, cost: response.costUsd };
    }
  },

  summarize: async (input, options) => {
    const prompt = await promptManagerClient.render('summarization', {
      text: input.text,
      maxWords: options.maxWords || 200
    });

    const response = await inferenceGatewayClient.complete({
      model: options.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: Math.ceil((options.maxWords || 200) * 1.5)
    });

    return {
      summary: response.content,
      tokens: response.totalTokens,
      cost: response.costUsd
    };
  },

  generate: async (input, options) => {
    const response = await inferenceGatewayClient.complete({
      model: options.model || 'gpt-4o-mini',
      messages: input.messages || [{ role: 'user', content: input.prompt }],
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000
    });

    return {
      content: response.content,
      tokens: response.totalTokens,
      cost: response.costUsd
    };
  },

  analyze: async (input, options) => {
    // Keep some deterministic logic for speed, but use LLM for complex analysis
    const prompt = await promptManagerClient.render('analysis', {
      text: input.text,
      analysisType: options.type || 'general'
    });

    const response = await inferenceGatewayClient.complete({
      model: options.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 800
    });

    return {
      analysis: response.content,
      tokens: response.totalTokens,
      cost: response.costUsd
    };
  }
};

// Main endpoint
app.post('/api/intelligence/:task', requireAuth, async (req, res) => {
  const start = Date.now();
  try {
    const { task } = req.params;
    const { input, options = {} } = req.body;

    const handler = taskHandlers[task];
    if (!handler) {
      return res.status(400).json({ error: `Unknown task: ${task}` });
    }

    // Set timeout (30s default)
    const timeoutMs = options.timeoutMs || 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
    );

    const result = await Promise.race([
      handler(input, options),
      timeoutPromise
    ]);

    res.json({
      task,
      result,
      latencyMs: Date.now() - start
    });
  } catch (error) {
    logger.error('Intelligence task failed', { task: req.params.task, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Keep existing /api/analyze for backward compatibility
app.post('/api/analyze', requireAuth, async (req, res) => {
  req.url = '/api/intelligence/analyze';
  app._router.handle(req, res);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ai-intelligence', port: 4881 });
});

// Start server
const PORT = process.env.PORT || 4881;
app.listen(PORT, () => {
  logger.info(`AI Intelligence listening on :${PORT}`);
});
```

**Tasks:**
- [ ] Add `/api/intelligence/:task` endpoint
- [ ] Implement 5 task handlers (classify, extract, summarize, generate, analyze)
- [ ] Integrate with inference gateway
- [ ] Integrate with prompt manager
- [ ] Add timeout handling
- [ ] Keep backward compatibility with `/api/analyze`
- [ ] Write tests

---

### 2.3 Test End-to-End Flow

**Test the complete flow:**

```
User Question
  ↓
Genie Gateway (port 4701)
  ↓
Flow Orchestrator (port 4244)
  ↓
  ├─→ Twin Resolve (port 4705)
  ├─→ Memory Read (port 4703)
  ├─→ Intelligence Call (port 4881) ← FIXED
  │     └─→ Inference Gateway (port 4294)
  │           └─→ OpenAI / Anthropic / Google
  ├─→ Memory Write (port 4703)
  └─→ Response
```

**Test Script:**

```javascript
// test/e2e/orchestration.test.js

import request from 'supertest';

describe('Orchestration E2E', () => {
  test('User question flows through full pipeline', async () => {
    const response = await request('http://localhost:4701')
      .post('/api/genie/answer')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        question: 'What is the capital of France?',
        userId: 'test-user',
        sessionId: 'test-session'
      });

    expect(response.status).toBe(200);
    expect(response.body.answer).toContain('Paris');
    expect(response.body.model).toBeTruthy();
    expect(response.body.cost).toBeGreaterThan(0);
    expect(response.body.latencyMs).toBeGreaterThan(0);
  });

  test('Conversation history is maintained', async () => {
    const sessionId = 'test-session-history';

    // First question
    await request('http://localhost:4701')
      .post('/api/genie/answer')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        question: 'My name is Alice',
        userId: 'test-user',
        sessionId
      });

    // Second question (should remember name)
    const response = await request('http://localhost:4701')
      .post('/api/genie/answer')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        question: 'What is my name?',
        userId: 'test-user',
        sessionId
      });

    expect(response.body.answer).toContain('Alice');
  });

  test('Streaming works', async () => {
    const response = await request('http://localhost:4701')
      .post('/api/genie/answer/stream')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        question: 'Count to 5',
        userId: 'test-user',
        sessionId: 'test-stream'
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
  });
});
```

---

## Test Gates

### Gate 1: Genie Gateway (Day 2)
- [ ] Hardcoded switch removed
- [ ] Flow orchestrator called
- [ ] Memory integration works
- [ ] Twin integration works

### Gate 2: AI Intelligence (Day 4)
- [ ] `/api/intelligence/:task` endpoint works
- [ ] All 5 tasks (classify, extract, summarize, generate, analyze) work
- [ ] Backward compatibility maintained
- [ ] Timeout handling works

### Gate 3: End-to-End (Day 5)
- [ ] Full pipeline works
- [ ] User question → LLM answer
- [ ] Conversation history maintained
- [ ] Streaming works
- [ ] Cost tracked correctly

---

## Success Criteria

✅ Genie Gateway calls Flow Orchestrator (no hardcoded responses)
✅ Flow Orchestrator's `intelligence.call` step succeeds
✅ AI Intelligence `/api/intelligence/:task` endpoint works
✅ Full E2E flow works: User → Genie → Flow → Memory → AI → Inference → Provider
✅ Conversation history maintained across requests
✅ Streaming responses work
✅ Cost tracked for every request
✅ All tests passing

---

*Phase 2 documentation: 2026-06-22*