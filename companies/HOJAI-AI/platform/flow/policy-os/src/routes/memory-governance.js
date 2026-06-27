/**
 * PolicyOS — Memory Governance (Phase 6)
 *
 * Endpoints:
 *  - GET  /api/memory/policies         — list memory access policies
 *  - POST /api/memory/policies         — create memory access policy
 *  - GET  /api/memory/policies/:id     — get one policy
 *  - DELETE /api/memory/policies/:id   — delete policy
 *  - POST /api/memory/policies/evaluate — evaluate memory access
 *  - POST /api/memory/pii/scan         — scan for PII in memory
 *  - GET  /api/memory/retention        — retention rules
 *  - POST /api/memory/retention        — create retention rule
 *  - POST /api/memory/bridge           — bridge to MemoryOS
 */

// ── Memory Access Policies ────────────────────────────────────────────────────

const memoryPolicies = new Map();
let policyIdCounter = 0;

export const ACCESS_LEVELS = {
  FULL: 'full',
  READ: 'read',
  APPEND: 'append',
  NONE: 'none',
};

export const RETENTION_LEVELS = {
  EPHEMERAL: { name: 'ephemeral', days: 0 },
  SHORT: { name: 'short', days: 30 },
  MEDIUM: { name: 'medium', days: 90 },
  LONG: { name: 'long', days: 365 },
  PERMANENT: { name: 'permanent', days: -1 },
};

export const PII_CATEGORIES = {
  EMAIL: 'email',
  PHONE: 'phone',
  SSN: 'ssn',
  CREDIT_CARD: 'credit_card',
  AADHAR: 'aadhar',
  NAME: 'name',
  ADDRESS: 'address',
  DOB: 'dob',
  IP: 'ip_address',
  CUSTOM: 'custom',
};

export function detectPII(text) {
  const patterns = [
    { type: PII_CATEGORIES.EMAIL, regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    { type: PII_CATEGORIES.PHONE, regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g },
    { type: PII_CATEGORIES.SSN, regex: /\d{3}[-.\s]?\d{2}[-.\s]?\d{4}/g },
    { type: PII_CATEGORIES.CREDIT_CARD, regex: /\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g },
    { type: PII_CATEGORIES.AADHAR, regex: /\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g },
    { type: PII_CATEGORIES.IP, regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
  ];

  const findings = [];
  for (const p of patterns) {
    const matches = text.match(p.regex);
    if (matches) {
      for (const m of matches) {
        findings.push({
          type: p.type,
          masked: m.replace(/\d(?=\d{4})/g, '*'),
          index: text.indexOf(m),
        });
      }
    }
  }
  return findings;
}

export function evaluateMemoryAccess(policyId, { subject, resource, action, context = {} }) {
  const policy = memoryPolicies.get(policyId);
  if (!policy) return { allowed: false, reason: 'Policy not found' };

  // Check subject match
  if (policy.subject && policy.subject !== subject && policy.subject !== '*') {
    return { allowed: false, reason: `Subject '${subject}' not authorized for this policy` };
  }

  // Check action match
  if (!policy.actions.includes('*') && !policy.actions.includes(action)) {
    return { allowed: false, reason: `Action '${action}' not permitted by this policy` };
  }

  // Check time bounds
  const now = new Date();
  if (policy.validFrom && new Date(policy.validFrom) > now) {
    return { allowed: false, reason: 'Policy not yet valid' };
  }
  if (policy.validUntil && new Date(policy.validUntil) < now) {
    return { allowed: false, reason: 'Policy expired' };
  }

  // Check conditions
  if (policy.conditions && policy.conditions.length > 0) {
    for (const cond of policy.conditions) {
      const actual = context[cond.attribute];
      switch (cond.operator) {
        case 'eq':
          if (actual !== cond.value) return { allowed: false, reason: `Condition failed: ${cond.attribute} must equal ${cond.value}` };
          break;
        case 'neq':
          if (actual === cond.value) return { allowed: false, reason: `Condition failed: ${cond.attribute} must not equal ${cond.value}` };
          break;
        case 'in':
          if (!cond.value.includes(actual)) return { allowed: false, reason: `Condition failed: ${cond.attribute} not in allowed values` };
          break;
        case 'gte':
          if (actual < cond.value) return { allowed: false, reason: `Condition failed: ${cond.attribute} must be >= ${cond.value}` };
          break;
        case 'lte':
          if (actual > cond.value) return { allowed: false, reason: `Condition failed: ${cond.attribute} must be <= ${cond.value}` };
          break;
      }
    }
  }

  return {
    allowed: true,
    reason: 'Memory access permitted',
    accessLevel: policy.accessLevel,
    policyId,
  };
}

// ── Route Registration ───────────────────────��───────────────────────────────

export function registerMemoryGovernanceRoutes(app, { auditLog, customAuth }) {

  // GET /api/memory/policies — list policies
  app.get('/api/memory/policies', customAuth, (req, res) => {
    const { tenantId } = req.auth || {};
    let policies = [...memoryPolicies.values()].filter(p => p.tenantId === tenantId);
    res.json({ count: policies.length, policies });
  });

  // POST /api/memory/policies — create policy
  app.post('/api/memory/policies', customAuth, (req, res) => {
    const { name, subject, resource, actions, accessLevel, conditions, validFrom, validUntil, metadata } = req.body;

    if (!name || !subject || !actions || !accessLevel) {
      return res.status(400).json({ error: 'name, subject, actions, and accessLevel are required' });
    }
    if (!Object.values(ACCESS_LEVELS).includes(accessLevel)) {
      return res.status(400).json({ error: `accessLevel must be one of: ${Object.values(ACCESS_LEVELS).join(', ')}` });
    }

    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const id = `mem-pol-${++policyIdCounter}-${Date.now()}`;
    const policy = {
      id,
      name,
      subject,
      resource: resource || '*',
      actions: Array.isArray(actions) ? actions : [actions],
      accessLevel,
      conditions: conditions || [],
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      createdBy: req.auth?.sub,
      tenantId,
    };

    memoryPolicies.set(id, policy);

    if (auditLog) {
      auditLog.write({ event: 'memory.policy.create', userId: req.auth?.sub, tenantId, data: { id, name }, timestamp: policy.createdAt });
    }

    res.status(201).json({ ok: true, policy });
  });

  // GET /api/memory/policies/:id — get one
  app.get('/api/memory/policies/:id', customAuth, (req, res) => {
    const policy = memoryPolicies.get(req.params.id);
    if (!policy) return res.status(404).json({ error: `Policy '${req.params.id}' not found` });
    res.json({ policy });
  });

  // DELETE /api/memory/policies/:id — delete
  app.delete('/api/memory/policies/:id', customAuth, (req, res) => {
    if (!memoryPolicies.has(req.params.id)) return res.status(404).json({ error: 'Policy not found' });
    memoryPolicies.delete(req.params.id);
    res.json({ ok: true });
  });

  // POST /api/memory/policies/evaluate — evaluate access
  app.post('/api/memory/policies/evaluate', customAuth, (req, res) => {
    const { policyId, subject, resource, action, context } = req.body;
    if (!policyId || !subject || !action) {
      return res.status(400).json({ error: 'policyId, subject, and action are required' });
    }
    const result = evaluateMemoryAccess(policyId, { subject, resource, action, context });
    res.json({ ok: true, ...result });
  });

  // POST /api/memory/pii/scan — scan for PII
  app.post('/api/memory/pii/scan', customAuth, (req, res) => {
    const { text, categories } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const findings = detectPII(text);

    // Filter by categories if specified
    const filtered = categories && categories.length > 0
      ? findings.filter(f => categories.includes(f.type))
      : findings;

    const summary = {};
    for (const f of filtered) {
      summary[f.type] = (summary[f.type] || 0) + 1;
    }

    res.json({
      ok: true,
      textLength: text.length,
      totalFindings: filtered.length,
      summary,
      findings: filtered,
      hasPII: filtered.length > 0,
      scannedAt: new Date().toISOString(),
    });
  });

  // GET /api/memory/retention — list retention rules
  app.get('/api/memory/retention', customAuth, (req, res) => {
    res.json({
      levels: Object.values(RETENTION_LEVELS),
      note: 'Retention levels are predefined. Use POST to create custom rules.',
    });
  });

  // POST /api/memory/retention — create retention rule
  app.post('/api/memory/retention', customAuth, (req, res) => {
    const { resourceType, retentionLevel, customDays, autoDelete } = req.body;
    if (!resourceType) {
      return res.status(400).json({ error: 'resourceType is required' });
    }

    let days;
    if (customDays !== undefined) {
      days = parseInt(customDays);
    } else if (retentionLevel && RETENTION_LEVELS[retentionLevel.toUpperCase()]) {
      days = RETENTION_LEVELS[retentionLevel.toUpperCase()].days;
    } else {
      return res.status(400).json({ error: 'Either retentionLevel or customDays is required' });
    }

    const rule = {
      id: `ret-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      resourceType,
      retentionDays: days,
      autoDelete: autoDelete ?? true,
      createdAt: new Date().toISOString(),
      createdBy: req.auth?.sub,
    };

    res.status(201).json({ ok: true, rule });
  });

  // POST /api/memory/bridge — bridge to MemoryOS
  app.post('/api/memory/bridge', customAuth, async (req, res) => {
    const { memoryType, action, data } = req.body;
    if (!memoryType || !action) {
      return res.status(400).json({ error: 'memoryType and action are required' });
    }

    // Simulate bridge to MemoryOS
    const supportedTypes = ['episodic', 'semantic', 'procedural', 'working', 'long_term'];
    if (!supportedTypes.includes(memoryType)) {
      return res.status(400).json({ error: `Unsupported memoryType. Supported: ${supportedTypes.join(', ')}` });
    }

    const supportedActions = ['remember', 'recall', 'forget', 'compress', 'verify'];
    if (!supportedActions.includes(action)) {
      return res.status(400).json({ error: `Unsupported action. Supported: ${supportedActions.join(', ')}` });
    }

    res.json({
      ok: true,
      memoryType,
      action,
      result: `Would ${action} from ${memoryType} memory`,
      note: `Bridge to MemoryOS at configured endpoint`,
      bridgedAt: new Date().toISOString(),
    });
  });
}