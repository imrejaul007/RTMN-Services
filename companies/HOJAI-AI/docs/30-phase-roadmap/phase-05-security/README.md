# Phase 5: Security Hardening

**Duration:** 1 week (Week 8)
**Priority:** P1 (High)
**Owner:** Security Engineer

---

## Goal

Production-grade security across all AI services with agent security, prompt injection defense, and output validation.

---

## Deliverables

### 5.1 Build Agent Security Service

**Port:** 4785
**File:** `platform/intelligence/agent-security/` (currently EMPTY)

**Tasks:**

1. Create Express service on port 4785
2. Agent authentication (API key + JWT)
3. Rate limiting per agent (token bucket)
4. Permission system (RBAC for tool calls)
5. Audit log for all agent actions

**Implementation:**

```javascript
// File: platform/intelligence/agent-security/src/index.js

import express from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@rtmn/shared/logger';
import { PersistentMap } from '@rtmn/persistent-store';

const app = express();
app.use(express.json());

const agents = new PersistentMap({ name: 'agents', baseDir: './data' });
const auditLog = new PersistentMap({ name: 'audit-log', baseDir: './data' });
const rateLimits = new Map();

// Register agent
app.post('/api/agents/register', async (req, res) => {
  const { agentId, name, permissions } = req.body;
  const apiKey = generateApiKey();

  await agents.set(agentId, {
    agentId,
    name,
    apiKey,
    permissions: permissions || [],
    createdAt: new Date().toISOString()
  });

  res.json({ agentId, apiKey });
});

// Authenticate agent
app.post('/api/agents/auth', async (req, res) => {
  const { agentId, apiKey } = req.body;
  const agent = await agents.get(agentId);

  if (!agent || agent.apiKey !== apiKey) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: agentId, permissions: agent.permissions },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

// Check permission
app.post('/api/agents/check-permission', async (req, res) => {
  const { agentId, permission } = req.body;
  const agent = await agents.get(agentId);

  const hasPermission = agent?.permissions.includes(permission) || false;

  // Audit log
  await auditLog.set(`${agentId}-${Date.now()}`, {
    agentId,
    action: 'check_permission',
    permission,
    granted: hasPermission,
    timestamp: new Date().toISOString()
  });

  res.json({ hasPermission });
});

// Rate limiting middleware
function rateLimit(agentId, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const key = `${agentId}-${Math.floor(now / windowMs)}`;

  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 0, resetAt: now + windowMs });
  }

  const bucket = rateLimits.get(key);

  if (bucket.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count };
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'agent-security', port: 4785 });
});

const PORT = process.env.PORT || 4785;
app.listen(PORT, () => {
  logger.info(`Agent Security listening on :${PORT}`);
});
```

---

### 5.2 Add Prompt Injection Defense

**File:** `platform/flow/flow-orchestrator/src/index.js`

**Tasks:**

1. Call ai-safety on every user input
2. Reject requests with injection score >0.8
3. Log injection attempts
4. Add jailbreak pattern detection

**Implementation:**

```javascript
// Add to flow orchestrator
import { aiSafetyClient } from './clients/ai-safety.js';

app.post('/api/flow/execute', requireAuth, async (req, res) => {
  const { template, inputs } = req.body;

  // Check for prompt injection
  const safetyCheck = await aiSafetyClient.check(req.body);

  if (safetyCheck.injectionScore > 0.8) {
    await auditLog.set(`injection-${Date.now()}`, {
      userId: req.user.sub,
      template,
      injectionScore: safetyCheck.injectionScore,
      patterns: safetyCheck.patterns,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      error: 'Prompt injection detected',
      score: safetyCheck.injectionScore
    });
  }

  // Continue with normal flow execution
  // ...
});
```

---

### 5.3 Add Output Validation

**File:** `platform/intelligence/inference-gateway/src/index.js`

**Tasks:**

1. Call ai-safety on every LLM output
2. Redact PII in responses
3. Block toxic content (score >0.9)
4. Detect hallucination

**Implementation:**

```javascript
// Add to inference gateway
app.post('/api/complete', requireAuth, async (req, res) => {
  const response = await provider.complete(model, messages, options);

  // Output validation
  const safetyCheck = await aiSafetyClient.checkResponse(response.content);

  if (safetyCheck.toxicityScore > 0.9) {
    return res.status(400).json({ error: 'Toxic content detected' });
  }

  if (safetyCheck.piiDetected) {
    response.content = safetyCheck.redactedContent;
    response.piiRedacted = true;
  }

  if (safetyCheck.hallucinationScore > 0.7) {
    response.hallucinationWarning = true;
  }

  res.json(response);
});
```

---

## Test Gates

- [ ] Agent registration and auth work
- [ ] Rate limiting enforced
- [ ] Permission system works
- [ ] Prompt injection blocked
- [ ] PII redacted
- [ ] Toxic content blocked

---

*Phase 5 documentation: 2026-06-22*