/**
 * PolicyOS — Natural Language Policy Authoring (Phase 2.4)
 *
 * Endpoints:
 *  - POST /api/policies/from-description  — convert NL → policy JSON
 *  - POST /api/policies/translate        — translate between formats
 */

/**
 * Simple keyword + pattern-based NL→Policy parser.
 * Real implementation would call an LLM; this rule-based engine handles
 * the most common authorization patterns for RTMN.
 */

// ── Keyword tables ──────────────────────────────────────────────────────────

const ACTION_MAP = {
  can: 'allow',
  allow: 'allow',
  permitted: 'allow',
  grant: 'allow',
  access: 'allow',
  enable: 'allow',
  give: 'allow',
  may: 'allow',
  should: 'allow',
  must: 'require',
  require: 'require',
  needs: 'require',
  demand: 'require',
  block: 'deny',
  deny: 'deny',
  prevent: 'deny',
  restrict: 'deny',
  forbid: 'deny',
  stop: 'deny',
  not: 'deny',
  unless: 'condition',
  only: 'condition',
  except: 'condition',
  if: 'condition',
  when: 'condition',
  provided: 'condition',
  given: 'condition',
  while: 'condition',
};

const SUBJECT_MAP = {
  user: 'user',
  users: 'user',
  employee: 'user',
  employee: 'user',
  staff: 'user',
  member: 'user',
  anyone: 'user',
  everyone: 'user',
  all: 'user',
  person: 'user',
  people: 'user',
  them: 'user',
  you: 'user',
  i: 'user',
  admin: 'admin',
  administrator: 'admin',
  superuser: 'admin',
  owner: 'owner',
  manager: 'manager',
  director: 'manager',
  vp: 'manager',
  executive: 'admin',
  system: 'system',
  service: 'system',
  api: 'system',
  bot: 'system',
  agent: 'system',
};

const RESOURCE_MAP = {
  data: 'data',
  file: 'data',
  files: 'data',
  document: 'data',
  documents: 'data',
  record: 'data',
  records: 'data',
  report: 'data',
  reports: 'data',
  dashboard: 'dashboard',
  analytics: 'dashboard',
  metrics: 'dashboard',
  config: 'config',
  configuration: 'config',
  settings: 'config',
  api: 'api',
  endpoint: 'api',
  service: 'api',
  report: 'report',
  budget: 'financial',
  budgets: 'financial',
  payment: 'financial',
  payments: 'financial',
  invoice: 'financial',
  invoices: 'financial',
  expense: 'financial',
  expenses: 'financial',
  money: 'financial',
  financial: 'financial',
  inventory: 'inventory',
  stock: 'inventory',
  product: 'product',
  products: 'product',
  customer: 'customer',
  customers: 'customer',
  user: 'customer',
  order: 'order',
  orders: 'order',
  shipment: 'shipment',
  shipment: 'shipment',
  employee: 'employee',
  employees: 'employee',
  payroll: 'payroll',
  salary: 'payroll',
  access: 'access',
};

const VERB_MAP = {
  read: 'read',
  view: 'read',
  see: 'read',
  get: 'read',
  fetch: 'read',
  retrieve: 'read',
  access: 'read',
  write: 'write',
  edit: 'write',
  modify: 'write',
  update: 'write',
  change: 'write',
  create: 'write',
  add: 'write',
  delete: 'delete',
  remove: 'delete',
  destroy: 'delete',
  execute: 'execute',
  run: 'execute',
  trigger: 'execute',
  approve: 'approve',
  reject: 'reject',
  delegate: 'delegate',
  share: 'share',
  export: 'export',
  import: 'import',
  login: 'login',
  logout: 'logout',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s\-_']/g, ' ').split(/\s+/).filter(Boolean);
}

function extractTokens(text) {
  return tokenize(text);
}

function extractValue(text, keywords) {
  const words = extractTokens(text);
  const found = [];
  for (const kw of keywords) {
    const idx = words.indexOf(kw.toLowerCase());
    if (idx >= 0 && idx + 1 < words.length) {
      found.push({ kw, value: words[idx + 1] });
    }
  }
  return found;
}

function extractRange(text) {
  const words = extractTokens(text);
  const patterns = [
    /(\d+)\s*(?:to|-)\s*(\d+)/,
    /(?:between|from)\s*(\d+)\s*(?:and|to|-)\s*(\d+)/,
    /(?:under|below|less than|at most|<)\s*(\d+)/,
    /(?:over|above|more than|greater than|at least|>)\s*(\d+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      if (p === patterns[0] || p === patterns[1]) {
        return { min: parseInt(m[1]), max: parseInt(m[2]) };
      }
      if (p === patterns[2]) return { max: parseInt(m[1]) };
      if (p === patterns[3]) return { min: parseInt(m[1]) };
    }
  }
  return null;
}

function extractRole(text) {
  const words = extractTokens(text);
  const roleKeywords = [
    'admin', 'administrator', 'user', 'viewer', 'editor', 'manager',
    'employee', 'owner', 'member', 'guest', 'auditor', 'operator',
    'engineer', 'developer', 'analyst', 'director', 'executive', 'superuser',
  ];
  for (const word of words) {
    if (roleKeywords.includes(word)) return word;
  }
  // "role of X" pattern
  const m = text.match(/role (?:of\s+)?(\w+)/i);
  if (m) return m[1];
  return null;
}

function extractEntity(text) {
  const words = extractTokens(text);
  // Pattern: "X's resource", "X resource", "resource for X"
  const possessive = text.match(/(\w+)'s?\s+(?:data|files?|records?|documents?|reports?|dashboard)/i);
  if (possessive) return possessive[1];
  const forPattern = text.match(/(?:data|files?|records?|documents?)\s+(?:for|of)\s+(\w+)/i);
  if (forPattern) return forPattern[1];
  return null;
}

function extractConditions(text) {
  const conditions = [];
  const words = extractTokens(text);

  // Time-based
  if (/\b(during|between|from)\s+(?:business|working)\s+hours?\b/i.test(text)) {
    conditions.push({ attribute: 'environment.time.hour', operator: 'in', value: [9, 10, 11, 12, 13, 14, 15, 16, 17] });
  }
  if (/\boutside\s+(?:business|working)\s+hours?\b/i.test(text)) {
    conditions.push({ attribute: 'environment.time.hour', operator: 'notIn', value: [9, 10, 11, 12, 13, 14, 15, 16, 17] });
  }
  if (/\b(on|before|after)\s+(?:weekdays?|monday|tuesday|wednesday|thursday|friday)\b/i.test(text)) {
    conditions.push({ attribute: 'environment.time.dayOfWeek', operator: 'in', value: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] });
  }
  if (/\b(on|before|after)\s+(?:weekends?|saturday|sunday)\b/i.test(text)) {
    conditions.push({ attribute: 'environment.time.dayOfWeek', operator: 'in', value: ['Saturday', 'Sunday'] });
  }

  // Location/IP-based
  if (/internal(ly)?\s+(?:network|ip)/i.test(text) || /from\s+inside/i.test(text)) {
    conditions.push({ attribute: 'environment.network.internal', operator: 'eq', value: true });
  }
  if (/external(ly)?\s+(?:network|ip)/i.test(text) || /from\s+outside/i.test(text)) {
    conditions.push({ attribute: 'environment.network.internal', operator: 'eq', value: false });
  }
  if (/trusted\s+device/i.test(text)) {
    conditions.push({ attribute: 'environment.context.trustedDevice', operator: 'eq', value: true });
  }

  // MFA
  if (/mfa|multi[\-\s]factor|two[\-\s]factor|totp|sms/i.test(text)) {
    conditions.push({ attribute: 'context.session.trusted', operator: 'eq', value: true });
  }

  // Amount-based (financial)
  const range = extractRange(text);
  if (range) {
    if (range.min !== undefined) {
      conditions.push({ attribute: 'context.amount', operator: 'gte', value: range.min });
    }
    if (range.max !== undefined) {
      conditions.push({ attribute: 'context.amount', operator: 'lte', value: range.max });
    }
  }

  // Department-based
  const deptMatch = text.match(/(\w+)\s+(?:department|dept)\b/i) || text.match(/\b(?:department|dept)\s+(?:of\s+)?(\w+)/i);
  if (deptMatch) {
    conditions.push({ attribute: 'user.department', operator: 'eq', value: deptMatch[1] });
  }

  // Risk level
  if (/\bhigh[\-\s]risk\b/i.test(text)) {
    conditions.push({ attribute: 'action.risk', operator: 'eq', value: 'high' });
  }
  if (/\bcritical\b/i.test(text)) {
    conditions.push({ attribute: 'action.risk', operator: 'eq', value: 'critical' });
  }

  // Trust score
  const trustMatch = text.match(/(?:trust|score)\s+(?:above|over|>)\s*(\d+)/i);
  if (trustMatch) {
    conditions.push({ attribute: 'user.trustScore', operator: 'gte', value: parseInt(trustMatch[1]) });
  }

  // VIP
  if (/\bvip\b/i.test(text)) {
    conditions.push({ attribute: 'user.attributes.vip', operator: 'eq', value: true });
  }

  // Resource ownership
  const owner = extractEntity(text);
  if (owner) {
    conditions.push({ attribute: 'resource.owner', operator: 'eq', value: `user:${owner}` });
  }

  // Sensitivity
  if (/\bconfidential\b/i.test(text)) {
    conditions.push({ attribute: 'resource.sensitivity', operator: 'eq', value: 'confidential' });
  }
  if (/\brestricted\b/i.test(text)) {
    conditions.push({ attribute: 'resource.sensitivity', operator: 'eq', value: 'restricted' });
  }
  if (/\bpii\b/i.test(text)) {
    conditions.push({ attribute: 'resource.classification', operator: 'eq', value: 'PII' });
  }
  if (/\bphi\b/i.test(text)) {
    conditions.push({ attribute: 'resource.classification', operator: 'eq', value: 'PHI' });
  }

  return conditions;
}

function inferResource(text) {
  const words = extractTokens(text);
  for (const w of words) {
    if (RESOURCE_MAP[w]) return RESOURCE_MAP[w];
  }
  // Default
  if (words.includes('data') || words.includes('records')) return 'data';
  return 'data';
}

function inferAction(text, resource) {
  const words = extractTokens(text);
  for (const w of words) {
    if (VERB_MAP[w]) return VERB_MAP[w];
  }
  if (words.includes('access')) return 'read';
  if (words.includes('modify') || words.includes('edit')) return 'write';
  if (words.includes('delete')) return 'delete';
  return 'read';
}

function generatePolicyId(description) {
  const words = extractTokens(description);
  const keyWords = words.filter(w =>
    !['can', 'not', 'only', 'must', 'may', 'the', 'a', 'an', 'and', 'or', 'if', 'when', 'is', 'are', 'be', 'to', 'from', 'for', 'in', 'on', 'at', 'by', 'with', 'that', 'this', 'they', 'their', 'it', 'its'].includes(w)
  ).slice(0, 8);
  return keyWords.join('-') || 'policy';
}

function generatePolicyName(description) {
  // Capitalize first letter of each word, limit to 80 chars
  const words = description.split(/\s+/).slice(0, 12);
  const name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return name.length > 80 ? name.slice(0, 77) + '...' : name;
}

// ── Core NL→Policy engine ───────────────────────────────────────────────────

export function parseNaturalLanguage(text) {
  const original = text.trim();
  const lower = original.toLowerCase();
  const words = extractTokens(original);

  // Step 1: Detect action (allow/deny)
  // Priority order: deny keywords BEFORE allow keywords (Object.entries iteration order)
  // 1a. Explicit deny/only patterns override everything
  let effect = 'allow';
  const denyWordBoundaries = [/\bonly\b/, /\bnot\b/, /\bnever\b/, /n't\b/];
  for (const pat of denyWordBoundaries) {
    if (pat.test(lower)) { effect = 'deny'; break; }
  }
  // 1b. Generic allow/deny keywords (only reached if no deny pattern above)
  if (effect !== 'deny') {
    for (const [kw, eff] of Object.entries(ACTION_MAP)) {
      if (lower.includes(kw)) { effect = eff; break; }
    }
  }

  // Step 2: Detect subject
  let subject = { type: 'user' };
  for (const [kw, st] of Object.entries(SUBJECT_MAP)) {
    if (lower.includes(kw)) { subject = { type: st }; break; }
  }

  // Step 3: Extract role constraint
  const role = extractRole(original);
  if (role) {
    subject.role = role;
  }

  // Step 4: Detect resource
  let resourceType = inferResource(lower);
  for (const [kw, rt] of Object.entries(RESOURCE_MAP)) {
    if (lower.includes(kw)) { resourceType = rt; break; }
  }

  // Step 5: Detect action verb
  let actionVerb = inferAction(lower, resourceType);
  for (const [kw, av] of Object.entries(VERB_MAP)) {
    if (lower.includes(kw)) { actionVerb = av; break; }
  }

  // Step 6: Extract conditions
  const conditions = extractConditions(original);

  // Step 7: Build expression
  let expression;
  if (conditions.length > 0) {
    const conditionExprs = conditions.map(c => {
      if (c.operator === 'in') return `${c.attribute} in [${c.value.join(', ')}]`;
      if (c.operator === 'notIn') return `${c.attribute} not in [${c.value.join(', ')}]`;
      return `${c.attribute} ${c.operator} ${typeof c.value === 'string' ? `'${c.value}'` : c.value}`;
    });
    expression = conditionExprs.join(' && ');
  } else {
    // Default expression: always true
    expression = 'true';
  }

  // Step 8: Determine effect based on keywords
  if (lower.includes('not ') || lower.includes("n't ") || lower.includes('never ')) {
    effect = 'deny';
  }

  // Build policy
  const id = generatePolicyId(original);
  const name = generatePolicyName(original);
  const version = '1.0';

  const policy = {
    id,
    name,
    description: original,
    version,
    effect,
    subjects: [{ ...subject }],
    resources: [`${resourceType}:*`],
    actions: [actionVerb],
    conditions: conditions.length > 0 ? conditions : [],
    expression,
    metadata: {
      parsedFrom: 'natural-language',
      originalText: original,
      confidence: conditions.length > 0 ? 0.85 : 0.60,
      warnings: conditions.length === 0 ? ['No conditions detected; policy applies broadly'] : [],
      generatedAt: new Date().toISOString(),
    },
  };

  // Add effectOverrides for deny policies
  if (effect === 'deny') {
    policy.effectOverrides = [{ effect: 'deny', expression: `!(${expression})` }];
  }

  return policy;
}

// ── Format translation ─────────────────────────────────────────────────────

export function translatePolicy(policy, targetFormat) {
  const source = policy;

  switch (targetFormat) {
    case 'policyos': {
      // Already PolicyOS format — return as-is
      return { ...source, format: 'policyos', sourcePolicyId: source.id, translatedAt: new Date().toISOString() };
    }

    case 'casbin': {
      // Convert to Casbin model format
      const sections = {
        request_definition: ['r = sub, obj, act'],
        policy_definition: ['p = sub, obj, act'],
        role_definition: ['g = _, _'],
        policy_effect: ['e = some(where (p.eft == allow))'],
        matchers: [`m = ${translateToCasbinExpr(source)}`],
      };

      const policies = source.subjects.flatMap(sub =>
        source.resources.flatMap(res =>
          source.actions.map(act => [sub.role || 'u', res, act])
        )
      );

      return {
        model: sections,
        policies,
        format: 'casbin',
        sourcePolicyId: source.id,
        translatedAt: new Date().toISOString(),
      };
    }

    case 'opa': {
      // Convert to Rego for Open Policy Agent
      const packageName = source.id.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'policy';

      const rego = `package ${packageName}

default allow = ${source.effect === 'allow' ? 'true' : 'false'}

allow = true {
    ${translateToOpaRule(source)}
}

# ${source.description || source.name}
# Parsed from: ${source.metadata?.originalText || 'N/A'}`;

      return {
        rego,
        package: packageName,
        format: 'opa',
        sourcePolicyId: source.id,
        translatedAt: new Date().toISOString(),
      };
    }

    case 'xacml': {
      // Convert to XACML-like JSON
      const xacml = {
        Policy: {
          PolicyId: source.id,
          Rule: {
            Effect: source.effect === 'allow' ? 'Permit' : 'Deny',
            Target: {
              Subjects: source.subjects.map(s => ({ AttributeId: 'subject-role', Value: s.role || 'user' })),
              Resources: source.resources.map(r => ({ AttributeId: 'resource-id', Value: r })),
              Actions: source.actions.map(a => ({ AttributeId: 'action-id', Value: a })),
            },
            Condition: source.conditions.length > 0 ? {
              Apply: {
                FunctionId: 'urn:oasis:names:tc:xacml:1.0:function:and',
                Conditions: source.conditions.map(c => ({
                  AttributeId: c.attribute,
                  FunctionId: `urn:oasis:names:tc:xacml:1.0:function:${c.operator}`,
                  Value: c.value,
                })),
              },
            } : undefined,
          },
        },
        format: 'xacml',
        sourcePolicyId: source.id,
        translatedAt: new Date().toISOString(),
      };
      return xacml;
    }

    default:
      throw new Error(`Unsupported target format: '${targetFormat}'. Supported: policyos, casbin, opa, xacml`);
  }
}

function translateToCasbinExpr(policy) {
  if (!policy.expression || policy.expression === 'true') {
    return 'r.sub == p.sub && r.obj == p.obj && r.act == p.act';
  }

  // Simplified: convert our expression back to Casbin-style
  const subExpr = policy.subjects[0]?.role
    ? `r.sub == "${policy.subjects[0].role}" || r.sub == p.sub`
    : 'r.sub == p.sub';

  const objExpr = 'r.obj == p.obj';
  const actExpr = 'r.act == p.act';
  const condExpr = translateConditionToCasbin(policy.conditions);

  if (condExpr) {
    return `${subExpr} && ${objExpr} && ${actExpr} && ${condExpr}`;
  }
  return `${subExpr} && ${objExpr} && ${actExpr}`;
}

function translateConditionToCasbin(conditions) {
  if (!conditions || conditions.length === 0) return null;

  const parts = conditions.map(c => {
    if (c.operator === 'eq') return `r.${c.attribute.replace('.', '_')} == ${JSON.stringify(c.value)}`;
    if (c.operator === 'neq') return `r.${c.attribute.replace('.', '_')} != ${JSON.stringify(c.value)}`;
    if (c.operator === 'in') return `r.${c.attribute.replace('.', '_')} in [${c.value.map(v => JSON.stringify(v)).join(', ')}]`;
    if (c.operator === 'notIn') return `r.${c.attribute.replace('.', '_')} not in [${c.value.map(v => JSON.stringify(v)).join(', ')}]`;
    if (c.operator === 'gte') return `r.${c.attribute.replace('.', '_')} >= ${c.value}`;
    if (c.operator === 'lte') return `r.${c.attribute.replace('.', '_')} <= ${c.value}`;
    if (c.operator === 'gt') return `r.${c.attribute.replace('.', '_')} > ${c.value}`;
    if (c.operator === 'lt') return `r.${c.attribute.replace('.', '_')} < ${c.value}`;
    return null;
  }).filter(Boolean);

  return parts.join(' && ');
}

function translateToOpaRule(policy) {
  const rules = [];

  // Subject
  if (policy.subjects[0]?.role) {
    rules.push(`input.subject.role == "${policy.subjects[0].role}"`);
  }

  // Resource
  if (policy.resources[0]) {
    const res = policy.resources[0].replace(':*', '');
    rules.push(`input.resource.type == "${res}"`);
  }

  // Action
  if (policy.actions[0]) {
    rules.push(`input.action == "${policy.actions[0]}"`);
  }

  // Conditions
  for (const c of policy.conditions) {
    if (c.operator === 'eq') rules.push(`input.${c.attribute} == ${JSON.stringify(c.value)}`);
    else if (c.operator === 'neq') rules.push(`input.${c.attribute} != ${JSON.stringify(c.value)}`);
    else if (c.operator === 'gte') rules.push(`input.${c.attribute} >= ${c.value}`);
    else if (c.operator === 'lte') rules.push(`input.${c.attribute} <= ${c.value}`);
    else if (c.operator === 'in') rules.push(`input.${c.attribute} in [${c.value.map(v => JSON.stringify(v)).join(', ')}]`);
  }

  return rules.length > 0 ? rules.join('\n    ') : 'input';
}

// ── Route registration ──────────────────────────────────────────────────────

export function registerNLAuthoringRoutes(app, { auditLog, customAuth }) {
  // POST /api/policies/from-description — NL → policy JSON
  app.post('/api/policies/from-description', customAuth, (req, res) => {
    const { description, language, id, name } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'description is required and must be a non-empty string' });
    }

    if (description.trim().length > 2000) {
      return res.status(400).json({ error: 'description must be 2000 characters or fewer' });
    }

    try {
      const policy = parseNaturalLanguage(description);

      // Allow caller to override id/name
      if (id && typeof id === 'string' && id.length <= 64) {
        policy.id = id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      }
      if (name && typeof name === 'string' && name.length <= 128) {
        policy.name = name.slice(0, 128);
      }

      if (auditLog) {
        auditLog.write({
          event: 'policy.parse',
          userId: req.auth?.sub,
          tenantId: req.auth?.tenantId,
          data: { policyId: policy.id, originalLength: description.length, language: language || 'en' },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(201).json({
        ok: true,
        policy,
        suggestions: generateSuggestions(policy),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to parse policy description', detail: err.message });
    }
  });

  // POST /api/policies/translate — translate policy between formats
  app.post('/api/policies/translate', customAuth, (req, res) => {
    const { policy, targetFormat } = req.body;

    if (!policy || typeof policy !== 'object') {
      return res.status(400).json({ error: 'policy object is required' });
    }

    if (!targetFormat || typeof targetFormat !== 'string') {
      return res.status(400).json({ error: 'targetFormat is required (policyos, casbin, opa, xacml)' });
    }

    const supported = ['policyos', 'casbin', 'opa', 'xacml'];
    if (!supported.includes(targetFormat)) {
      return res.status(400).json({
        error: `Unsupported targetFormat. Supported: ${supported.join(', ')}`,
      });
    }

    try {
      const result = translatePolicy(policy, targetFormat);

      if (auditLog) {
        auditLog.write({
          event: 'policy.translate',
          userId: req.auth?.sub,
          tenantId: req.auth?.tenantId,
          data: { sourceId: policy.id, targetFormat },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}

// ── Suggestions ────────────────────────────────────────────────────────────

function generateSuggestions(policy) {
  const suggestions = [];

  if (policy.conditions.length === 0) {
    suggestions.push({
      type: 'warning',
      code: 'BROAD_SCOPE',
      message: 'This policy has no conditions and applies broadly. Consider adding conditions like time restrictions, department limits, or amount thresholds.',
    });
  }

  if (policy.effect === 'allow' && !policy.expression.includes('&&')) {
    suggestions.push({
      type: 'info',
      code: 'ADD_CONDITIONS',
      message: 'Consider adding conditions to make this policy more restrictive and secure.',
    });
  }

  if (policy.effect === 'deny' && !policy.expression.includes('&&')) {
    suggestions.push({
      type: 'info',
      code: 'DENY_DEFAULT',
      message: 'This is a broad deny. Consider making it a deny-if-matches condition instead of deny-all.',
    });
  }

  if (policy.metadata?.warnings?.length > 0) {
    for (const w of policy.metadata.warnings) {
      suggestions.push({ type: 'warning', code: 'PARSER_WARNING', message: w });
    }
  }

  if (policy.subjects[0]?.type === 'user' && !policy.subjects[0]?.role) {
    suggestions.push({
      type: 'info',
      code: 'SPECIFY_ROLE',
      message: 'No role was detected. Consider specifying which role this policy applies to (e.g., "only admins can...").',
    });
  }

  return suggestions;
}
