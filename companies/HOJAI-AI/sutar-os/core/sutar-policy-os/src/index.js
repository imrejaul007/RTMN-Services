/**
 * SUTAR OS — Policy OS
 *
 * Business policy registry and enforcement.
 * Agents check policies before executing actions.
 *
 * Endpoints:
 *   POST /api/policies         — Create a policy
 *   GET  /api/policies          — List policies
 *   GET  /api/policies/:id      — Get policy
 *   PUT  /api/policies/:id      — Update policy
 *   POST /api/policies/:id/evaluate — Evaluate policy for context
 *   GET  /api/policies/check    — Quick policy check
 *   GET  /api/categories        — List policy categories
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());
setupSecurity(app, { serviceName: 'sutar-policy-os' });

const PORT = process.env.POLICY_PORT || 4254;

// ---------- In-Memory Stores ----------
const policies = new Map();
const MAX_POLICIES = 5000;

// ---------- Policy Categories ----------
const CATEGORIES = [
  { id: 'negotiation', name: 'Negotiation Policies', description: 'Rules for agent negotiation' },
  { id: 'contract', name: 'Contract Policies', description: 'Contract creation and execution rules' },
  { id: 'financial', name: 'Financial Policies', description: 'Payment, escrow, and financial limits' },
  { id: 'compliance', name: 'Compliance Policies', description: 'Regulatory and compliance rules' },
  { id: 'security', name: 'Security Policies', description: 'Access control and security rules' },
  { id: 'operational', name: 'Operational Policies', description: 'Day-to-day operational rules' },
];

// ---------- Policy Creation ----------
function createPolicy(params) {
  const id = uuidv4();
  const policy = {
    id,
    name: params.name,
    description: params.description,
    category: params.category || 'operational',
    priority: params.priority || 'medium', // low, medium, high, critical
    status: params.status || 'active', // active, inactive, draft
    rules: params.rules || [],
    conditions: params.conditions || [],
    actions: params.actions || [], // allow, deny, require_approval, log
    scope: params.scope || { agents: ['*'], tenants: ['*'] },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: params.createdBy || 'system',
    metadata: params.metadata || {},
  };
  policies.set(id, policy);
  return policy;
}

// ---------- Policy Evaluation ----------
function evaluatePolicy(policyId, context) {
  const policy = policies.get(policyId);
  if (!policy) return { error: 'Policy not found' };
  if (policy.status !== 'active') return { policyId, result: 'skipped', reason: 'Policy inactive' };

  // Check scope
  if (!matchesScope(policy.scope, context)) {
    return { policyId, result: 'skipped', reason: 'Out of scope' };
  }

  // Check conditions
  for (const condition of policy.conditions) {
    const passed = evaluateCondition(condition, context);
    if (!passed && condition.operator === 'required') {
      return { policyId, result: 'denied', reason: `Condition failed: ${condition.field}` };
    }
  }

  // Apply rules
  for (const rule of policy.rules) {
    const ruleResult = evaluateRule(rule, context);
    if (ruleResult.result === 'denied') return { policyId, ...ruleResult };
    if (ruleResult.result === 'require_approval') return { policyId, ...ruleResult };
  }

  return { policyId, result: 'allowed', policyName: policy.name, priority: policy.priority };
}

function matchesScope(scope, context) {
  const agents = scope.agents || ['*'];
  const tenants = scope.tenants || ['*'];

  const agentMatch = agents.includes('*') || agents.includes(context.agentId);
  const tenantMatch = tenants.includes('*') || tenants.includes(context.tenantId);

  return agentMatch && tenantMatch;
}

function evaluateCondition(condition, context) {
  const value = getNestedValue(context, condition.field);
  switch (condition.operator) {
    case 'eq': return value === condition.value;
    case 'ne': return value !== condition.value;
    case 'gt': return value > condition.value;
    case 'gte': return value >= condition.value;
    case 'lt': return value < condition.value;
    case 'lte': return value <= condition.value;
    case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
    case 'contains': return String(value).includes(String(condition.value));
    case 'required': return value !== null && value !== undefined;
    default: return true;
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

function evaluateRule(rule, context) {
  // Threshold rules
  if (rule.type === 'threshold') {
    const value = getNestedValue(context, rule.field) || 0;
    if (rule.operator === 'max' && value > rule.value) {
      return { result: rule.action || 'denied', reason: `${rule.field} exceeds limit (${value} > ${rule.value})` };
    }
    if (rule.operator === 'min' && value < rule.value) {
      return { result: rule.action || 'denied', reason: `${rule.field} below minimum (${value} < ${rule.value})` };
    }
  }

  // Value-based rules
  if (rule.type === 'value_limit') {
    if (context.value > rule.value) {
      return { result: rule.action || 'require_approval', reason: `Value ${context.value} exceeds policy limit ${rule.value}`, requiresApproval: true };
    }
  }

  // Role-based rules
  if (rule.type === 'role_required') {
    const userRole = context.role || 'user';
    if (!rule.roles.includes(userRole)) {
      return { result: 'denied', reason: `Role ${userRole} not authorized for this action` };
    }
  }

  // Time-based rules
  if (rule.type === 'time_window') {
    const now = new Date();
    const hour = now.getHours();
    if (rule.window === 'business_hours') {
      if (hour < 9 || hour >= 18) {
        return { result: rule.action || 'require_approval', reason: 'Outside business hours', requiresApproval: true };
      }
    }
  }

  return { result: 'allowed' };
}

// ---------- Bulk Policy Check ----------
function checkPolicies(context) {
  const applicable = Array.from(policies.values()).filter(p =>
    p.status === 'active' && matchesScope(p.scope, context)
  );

  const results = [];
  let finalResult = 'allowed';

  for (const policy of applicable) {
    const result = evaluatePolicy(policy.id, context);
    results.push(result);
    if (result.result === 'denied') finalResult = 'denied';
    else if (result.result === 'require_approval' && finalResult === 'allowed') finalResult = 'require_approval';
  }

  const requiresApproval = results.filter(r => r.requiresApproval).length;

  return {
    context,
    finalResult,
    policiesChecked: applicable.length,
    denied: results.filter(r => r.result === 'denied').length,
    requiresApproval,
    results,
  };
}

// ---------- Routes ----------
app.post('/api/policies', requireAuth, (req, res) => {
  const policy = createPolicy(req.body);
  res.status(201).json(policy);
});

app.get('/api/policies', requireAuth, (req, res) => {
  const { category, status, priority, limit } = req.query;
  let list = Array.from(policies.values());
  if (category) list = list.filter(p => p.category === category);
  if (status) list = list.filter(p => p.status === status);
  if (priority) list = list.filter(p => p.priority === priority);
  list.sort((a, b) => b.priority.localeCompare(a.priority) || b.createdAt.localeCompare(a.createdAt));
  res.json({ total: policies.size, returned: Math.min(list.length, parseInt(limit) || 100), policies: list });
});

app.get('/api/policies/:id', requireAuth, (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  res.json(policy);
});

app.put('/api/policies/:id', requireAuth, (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  Object.assign(policy, req.body, { updatedAt: new Date().toISOString(), version: policy.version + 1 });
  res.json(policy);
});

app.post('/api/policies/:id/evaluate', requireAuth, (req, res) => {
  const result = evaluatePolicy(req.params.id, req.body);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.get('/api/policies/check', requireAuth, (req, res) => {
  res.json(checkPolicies(req.query));
});

app.get('/api/categories', (_req, res) => {
  res.json({ categories: CATEGORIES });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sutar-policy-os', port: PORT, layer: 'Marketplace + Economy', policies: policies.size, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => { console.log(`[sutar-policy-os] listening on :${PORT}`); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
