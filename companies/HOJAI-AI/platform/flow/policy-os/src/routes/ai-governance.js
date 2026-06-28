/**
 * PolicyOS — AI Governance (Phase 4)
 *
 * Endpoints:
 *  - GET    /api/ai/models          — list registered models
 *  - POST   /api/ai/models          — register a model
 *  - GET    /api/ai/models/:id      — get one model
 *  - PATCH  /api/ai/models/:id      — update model
 *  - DELETE /api/ai/models/:id      — deprecate model
 *  - POST   /api/ai/validate        — validate AI output
 *  - GET    /api/ai/constitutions   — list constitutions
 *  - POST   /api/ai/constitutions   — create constitution
 *  - POST   /api/ai/constitutions/:id/evaluate — evaluate against constitution
 */

// ── Model Registry (persistent when provided) ─────────────────────────────────

let modelRegistry = new Map();
let modelIdCounter = 0;

export function initAIModelsStore(store) {
  modelRegistry = store;
  let maxN = 0;
  for (const m of store.values()) {
    const idNum = parseInt(m.id.replace('model-', ''));
    if (!isNaN(idNum)) maxN = Math.max(maxN, idNum);
  }
  modelIdCounter = maxN;
}

// ── Constitutions (persistent when provided) ─────────────────────────────────

let constitutions = new Map();

export function initConstitutionsStore(store) {
  constitutions = store;
}

export const MODEL_STATUSES = {
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  BANNED: 'banned',
  UNDER_REVIEW: 'under_review',
  SHADOW_MODE: 'shadow_mode',
};

export const MODEL_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  MISTRAL: 'mistral',
  COHERE: 'cohere',
  HUGGINGFACE: 'huggingface',
  AZURE: 'azure',
  LOCAL: 'local',
  HOJAI: 'hojai',
};

// ── Output Validation ─────────────────────────────────────────────────────────

export const VALIDATION_RULES = {
  MAX_LENGTH: 'max_length',
  NO_PII: 'no_pii',
  NO_HARMFUL_CONTENT: 'no_harmful',
  NO_PRIVATE_DATA: 'no_private',
  TOPIC_ALLOWED: 'topic_allowed',
  TOPIC_BLOCKED: 'topic_blocked',
  FORMAT_JSON: 'format_json',
  FORMATMarkdown: 'format_markdown',
  NO_REFUSALS: 'no_refusals',
  CITE_SOURCES: 'cite_sources',
};

function detectPII(text) {
  const patterns = [
    { type: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g },
    { type: 'phone', regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g },
    { type: 'ssn', regex: /\d{3}[-.\s]?\d{2}[-.\s]?\d{4}/g },
    { type: 'credit_card', regex: /\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g },
    { type: 'aadhar', regex: /\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g },
  ];

  const findings = [];
  for (const p of patterns) {
    const matches = text.match(p.regex);
    if (matches) {
      for (const m of matches) {
        findings.push({ type: p.type, value: m.replace(/\d(?=\d{4})/g, '*'), index: text.indexOf(m) });
      }
    }
  }
  return findings;
}

function detectHarmfulContent(text) {
  const lower = text.toLowerCase();
  const harmful = [];

  // Category: violence
  const violenceWords = ['kill', 'murder', 'assassinate', 'torture', 'rape', 'abuse'];
  for (const w of violenceWords) {
    if (lower.includes(w)) harmful.push({ category: 'violence', keyword: w });
  }

  // Category: hate speech
  const hateWords = ['hate', 'slur', 'discriminate', 'supremac'];
  for (const w of hateWords) {
    if (lower.includes(w)) harmful.push({ category: 'hate_speech', keyword: w });
  }

  // Category: self-harm
  const selfHarm = ['suicide', 'self-harm', 'cut myself'];
  for (const w of selfHarm) {
    if (lower.includes(w)) harmful.push({ category: 'self_harm', keyword: w });
  }

  // Category: illegal
  const illegal = ['how to make bomb', 'how to hack', 'how to steal'];
  for (const w of illegal) {
    if (lower.includes(w)) harmful.push({ category: 'illegal', keyword: w });
  }

  return harmful;
}

export function validateOutput(output, rules = [], context = {}) {
  const violations = [];

  for (const rule of rules) {
    switch (rule.type) {
      case VALIDATION_RULES.MAX_LENGTH: {
        const maxLen = rule.value || 100000;
        if (output.length > maxLen) {
          violations.push({ rule: rule.type, severity: 'error', message: `Output exceeds max length ${maxLen}`, actual: output.length });
        }
        break;
      }

      case VALIDATION_RULES.NO_PII: {
        const piiFindings = detectPII(output);
        if (piiFindings.length > 0) {
          violations.push({ rule: rule.type, severity: 'error', message: `PII detected`, findings: piiFindings });
        }
        break;
      }

      case VALIDATION_RULES.NO_HARMFUL_CONTENT: {
        const harmful = detectHarmfulContent(output);
        if (harmful.length > 0) {
          violations.push({ rule: rule.type, severity: 'critical', message: `Harmful content detected`, findings: harmful });
        }
        break;
      }

      case VALIDATION_RULES.NO_PRIVATE_DATA: {
        const pii = detectPII(output);
        const sensitive = output.match(/\b\d{10,}\b/g) || [];
        if (pii.length > 0 || sensitive.length > 0) {
          violations.push({ rule: rule.type, severity: 'error', message: `Private data detected`, pii, sensitiveIds: sensitive });
        }
        break;
      }

      case VALIDATION_RULES.TOPIC_BLOCKED: {
        const blockedTopics = rule.topics || [];
        const lower = output.toLowerCase();
        for (const topic of blockedTopics) {
          if (lower.includes(topic.toLowerCase())) {
            violations.push({ rule: rule.type, severity: rule.severity || 'error', message: `Blocked topic: "${topic}"` });
          }
        }
        break;
      }

      case VALIDATION_RULES.TOPIC_ALLOWED: {
        if (rule.requireAtLeast && rule.requireAtLeast > 0) {
          const lower = output.toLowerCase();
          let matched = 0;
          for (const topic of (rule.topics || [])) {
            if (lower.includes(topic.toLowerCase())) matched++;
          }
          if (matched < rule.requireAtLeast) {
            violations.push({ rule: rule.type, severity: 'warning', message: `Output covers ${matched}/${rule.requireAtLeast} required topics` });
          }
        }
        break;
      }

      case VALIDATION_RULES.FORMAT_JSON: {
        try { JSON.parse(output); }
        catch { violations.push({ rule: rule.type, severity: 'error', message: 'Output is not valid JSON' }); }
        break;
      }

      case VALIDATION_RULES.FORMATMarkdown: {
        if (!output.includes('#') && !output.includes('*') && !output.includes('- ')) {
          violations.push({ rule: rule.type, severity: 'warning', message: 'Output does not appear to be markdown formatted' });
        }
        break;
      }

      case VALIDATION_RULES.NO_REFUSALS: {
        const refusalPatterns = [
          "i'm sorry", "i cannot", "i'm unable",
          "sorry, i can't", "i'm sorry but i can't",
          "i'm sorry but i can", "i cannot help",
          "cannot assist", "unable to help",
        ];
        const lower = output.toLowerCase();
        for (const p of refusalPatterns) {
          if (lower.includes(p)) {
            violations.push({ rule: rule.type, severity: 'error', message: `AI refusal detected: "${p}"` });
          }
        }
        break;
      }

      case VALIDATION_RULES.CITE_SOURCES: {
        if (!output.match(/\[\d+\]|\[source:|\(source:|\*\*Source:/i)) {
          violations.push({ rule: rule.type, severity: 'warning', message: 'No citations or source references found' });
        }
        break;
      }
    }
  }

  const hasCritical = violations.some(v => v.severity === 'critical');
  const hasErrors = violations.some(v => v.severity === 'error');

  return {
    valid: !hasCritical && !hasErrors,
    violations,
    summary: violations.length === 0 ? 'Output passed all validation rules'
      : hasCritical ? 'Output blocked due to critical violations'
      : hasErrors ? 'Output flagged due to errors'
      : 'Output passed with warnings',
    checkedAt: new Date().toISOString(),
  };
}

// ── Constitutional AI ─────────────────────────────────────────────────────────

const constitutions = new Map();
let constitutionIdCounter = 0;

export const CONSTITUTION_TYPES = {
  SAFETY: 'safety',
  PRIVACY: 'privacy',
  ACCURACY: 'accuracy',
  FAIRNESS: 'fairness',
  TRANSPARENCY: 'transparency',
  CUSTOM: 'custom',
};

export const HARM_CATEGORIES = {
  VIOLENCE: 'violence',
  HATE_SPEECH: 'hate_speech',
  SELF_HARM: 'self_harm',
  ILLEGAL: 'illegal',
  PII_LEAK: 'pii_leak',
  MISINFORMATION: 'misinformation',
  MANIPULATION: 'manipulation',
  PRIVACY: 'privacy',
};

function evaluateAgainstConstitution(text, constitution) {
  const { rules, harmCategories = [], allowedTopics = [], blockedTopics = [] } = constitution;

  const results = [];
  let score = 100;
  const violations = [];

  // Run standard validation
  const validation = validateOutput(text, rules || []);
  results.push({ type: 'validation', ...validation });
  if (!validation.valid) score -= 20;

  // Check harm categories
  if (harmCategories.includes(HARM_CATEGORIES.VIOLENCE) || harmCategories.includes(HARM_CATEGORIES.HATE_SPEECH) || harmCategories.includes(HARM_CATEGORIES.SELF_HARM) || harmCategories.includes(HARM_CATEGORIES.ILLEGAL)) {
    const harmful = detectHarmfulContent(text);
    if (harmful.length > 0) {
      score -= 50;
      violations.push(...harmful.map(h => ({ category: h.category, severity: 'critical', ...h })));
    }
  }

  // Check PII if privacy constitution
  if (harmCategories.includes(HARM_CATEGORIES.PII_LEAK) || harmCategories.includes(HARM_CATEGORIES.PRIVACY)) {
    const pii = detectPII(text);
    if (pii.length > 0) {
      score -= 30;
      violations.push(...pii.map(p => ({ category: 'pii_leak', severity: 'error', ...p })));
    }
  }

  // Check blocked topics
  for (const topic of blockedTopics) {
    if (text.toLowerCase().includes(topic.toLowerCase())) {
      score -= 20;
      violations.push({ category: 'topic_violation', severity: 'error', message: `Blocked topic: "${topic}"` });
    }
  }

  // Check required topics
  for (const topic of allowedTopics) {
    if (!text.toLowerCase().includes(topic.toLowerCase())) {
      score -= 5;
      violations.push({ category: 'missing_topic', severity: 'warning', message: `Missing required topic: "${topic}"` });
    }
  }

  score = Math.max(0, score);

  const verdict = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

  return {
    score,
    verdict,
    violations,
    results,
    evaluatedAt: new Date().toISOString(),
  };
}

// ── Route Registration ───────────────────────────────────────────────────────

export function registerAIGovernanceRoutes(app, { auditLog, customAuth, aiModels, constitutions }) {
  if (aiModels) initAIModelsStore(aiModels);
  if (constitutions) initConstitutionsStore(constitutions);

  // GET /api/ai/models — list models
  app.get('/api/ai/models', customAuth, (req, res) => {
    const { provider, status, limit = 50, offset = 0 } = req.query;
    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    let models = [...modelRegistry.values()].filter(m => m.tenantId === tenantId);
    if (provider) models = models.filter(m => m.provider === provider);
    if (status) models = models.filter(m => m.status === status);

    res.json({
      count: models.length,
      models: models.slice(parseInt(offset) || 0, parseInt(offset) + parseInt(limit)),
    });
  });

  // POST /api/ai/models — register a model
  app.post('/api/ai/models', customAuth, (req, res) => {
    const { name, provider, version, endpoint, validationRules, metadata } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!provider || !Object.values(MODEL_PROVIDERS).includes(provider)) {
      return res.status(400).json({ error: `provider must be one of: ${Object.values(MODEL_PROVIDERS).join(', ')}` });
    }

    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const id = `model-${++modelIdCounter}-${Date.now()}`;
    const model = {
      id,
      name,
      provider,
      version: version || '1.0',
      endpoint,
      status: MODEL_STATUSES.ACTIVE,
      validationRules: validationRules || [],
      metadata: metadata || {},
      registeredAt: new Date().toISOString(),
      registeredBy: req.auth?.sub,
      tenantId,
    };

    modelRegistry.set(id, model);

    if (auditLog) {
      auditLog({ event: 'ai.model.register', userId: req.auth?.sub, tenantId, data: { id, name, provider }, timestamp: model.registeredAt });
    }

    res.status(201).json({ ok: true, model });
  });

  // GET /api/ai/models/:id — get one model
  app.get('/api/ai/models/:id', customAuth, (req, res) => {
    const model = modelRegistry.get(req.params.id);
    if (!model) return res.status(404).json({ error: `Model '${req.params.id}' not found` });
    res.json({ model });
  });

  // PATCH /api/ai/models/:id — update model
  app.patch('/api/ai/models/:id', customAuth, (req, res) => {
    const model = modelRegistry.get(req.params.id);
    if (!model) return res.status(404).json({ error: `Model '${req.params.id}' not found` });

    const { status, validationRules, metadata } = req.body;
    if (status && Object.values(MODEL_STATUSES).includes(status)) model.status = status;
    if (validationRules) model.validationRules = validationRules;
    if (metadata) model.metadata = { ...model.metadata, ...metadata };
    model.updatedAt = new Date().toISOString();

    res.json({ ok: true, model });
  });

  // DELETE /api/ai/models/:id — deprecate model
  app.delete('/api/ai/models/:id', customAuth, (req, res) => {
    const model = modelRegistry.get(req.params.id);
    if (!model) return res.status(404).json({ error: `Model '${req.params.id}' not found` });
    model.status = MODEL_STATUSES.DEPRECATED;
    model.deprecatedAt = new Date().toISOString();
    res.json({ ok: true, model });
  });

  // POST /api/ai/validate — validate AI output
  app.post('/api/ai/validate', customAuth, (req, res) => {
    const { output, rules, context, modelId } = req.body;

    if (!output || typeof output !== 'string') {
      return res.status(400).json({ error: 'output is required and must be a string' });
    }

    // If modelId provided, load its validation rules
    let effectiveRules = rules || [];
    if (modelId) {
      const model = modelRegistry.get(modelId);
      if (model) effectiveRules = [...(model.validationRules || []), ...effectiveRules];
    }

    const result = validateOutput(output, effectiveRules, context || {});

    if (auditLog) {
      auditLog({
        event: 'ai.validate',
        userId: req.auth?.sub,
        tenantId: req.auth?.tenantId,
        data: { modelId, ruleCount: effectiveRules.length, valid: result.valid, violationCount: result.violations.length },
        timestamp: result.checkedAt,
      });
    }

    res.json({ ok: true, ...result });
  });

  // GET /api/ai/constitutions — list constitutions
  app.get('/api/ai/constitutions', customAuth, (req, res) => {
    const { type, limit = 20, offset = 0 } = req.query;
    let list = [...constitutions.values()];
    if (type) list = list.filter(c => c.type === type);
    res.json({
      count: list.length,
      constitutions: list.slice(parseInt(offset) || 0, parseInt(offset) + parseInt(limit)),
    });
  });

  // POST /api/ai/constitutions — create constitution
  app.post('/api/ai/constitutions', customAuth, (req, res) => {
    const { name, description, type, rules, harmCategories, allowedTopics, blockedTopics, metadata } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!type || !Object.values(CONSTITUTION_TYPES).includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${Object.values(CONSTITUTION_TYPES).join(', ')}` });
    }

    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const id = `const-${++constitutionIdCounter}-${Date.now()}`;
    const constitution = {
      id,
      name,
      description,
      type,
      rules: rules || [],
      harmCategories: harmCategories || [],
      allowedTopics: allowedTopics || [],
      blockedTopics: blockedTopics || [],
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      createdBy: req.auth?.sub,
      tenantId,
    };

    constitutions.set(id, constitution);

    if (auditLog) {
      auditLog({ event: 'ai.constitution.create', userId: req.auth?.sub, tenantId, data: { id, name, type }, timestamp: constitution.createdAt });
    }

    res.status(201).json({ ok: true, constitution });
  });

  // GET /api/ai/constitutions/:id — get one constitution
  app.get('/api/ai/constitutions/:id', customAuth, (req, res) => {
    const constitution = constitutions.get(req.params.id);
    if (!constitution) return res.status(404).json({ error: `Constitution '${req.params.id}' not found` });
    res.json({ constitution });
  });

  // POST /api/ai/constitutions/:id/evaluate — evaluate text against constitution
  app.post('/api/ai/constitutions/:id/evaluate', customAuth, (req, res) => {
    const constitution = constitutions.get(req.params.id);
    if (!constitution) return res.status(404).json({ error: `Constitution '${req.params.id}' not found` });

    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const result = evaluateAgainstConstitution(text, constitution);

    if (auditLog) {
      auditLog({
        event: 'ai.constitution.evaluate',
        userId: req.auth?.sub,
        tenantId: req.auth?.tenantId,
        data: { constitutionId: req.params.id, score: result.score, verdict: result.verdict },
        timestamp: result.evaluatedAt,
      });
    }

    res.json({ ok: true, constitutionId: req.params.id, ...result });
  });
}
