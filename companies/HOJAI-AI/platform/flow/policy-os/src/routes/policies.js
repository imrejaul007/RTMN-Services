/**
 * PolicyOS — Policy Routes
 *
 * REST endpoints for Policy CRUD, lifecycle, evaluation, and composition.
 */

import { v4 as uuidv4 } from 'uuid';
import { validatePolicyBody } from '../lib/validation.js';

// =================================================================
// Policy CRUD
// =================================================================

export function registerPolicyRoutes(app, {
  policies,
  roles,
  userRoles,
  users,
  approvals,
  policyChanges,
  apiKeys,
  webhooks,
  webhookDeliveries,
  evalMetrics,
  auditLog,
  customAuth,
  evaluateLimiter,
  writeLimiter,
  evaluatePolicy,
  applyExceptions,
  findPolicy,
  evaluateComposition,
  CATEGORIES,
  POLICY_STATUSES,
}) {

  // POST /api/policies — create
  app.post('/api/policies', customAuth, writeLimiter, (req, res) => {
    const body = req.body || {};
    const v = validatePolicyBody(body);
    if (!v.ok) return res.status(400).json({ error: 'validation failed', errors: v.errors });
    const id = body.id || `pol-${uuidv4().slice(0, 8)}`;
    if (policies.has(id)) {
      return res.status(409).json({ error: `Policy with id '${id}' already exists` });
    }
    const now = new Date().toISOString();
    const policy = {
      id,
      name: body.name,
      description: body.description || '',
      category: body.category,
      version: 1,
      priority: typeof body.priority === 'number' ? body.priority : 50,
      status: body.status || 'draft',
      conditions: body.conditions || {},
      rules: body.rules || [],
      actions: body.actions || { onAllow: {}, onDeny: {} },
      exceptions: body.exceptions || [],
      approvals: body.approvals || { strategy: 'single', requiredApprovers: [] },
      composition: body.composition || null,
      effectiveFrom: body.effectiveFrom || null,
      effectiveUntil: body.effectiveUntil || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      owner: body.owner || 'u-admin',
      createdAt: now,
      updatedAt: now,
    };
    policies.set(id, policy);
    auditLog({
      type: 'policy.created',
      policyId: id,
      actor: policy.owner,
      details: { category: policy.category, name: policy.name },
    });
    res.status(201).json(policy);
  });

  // GET /api/policies — list
  app.get('/api/policies', (req, res) => {
    const { category, status, owner } = req.query;
    let result = Array.from(policies.values());
    if (category) result = result.filter((p) => p.category === category);
    if (status) result = result.filter((p) => p.status === status);
    if (owner) result = result.filter((p) => p.owner === owner);
    res.json({ count: result.length, policies: result });
  });

  // GET /api/policies/registry
  app.get('/api/policies/registry', (req, res) => {
    const all = Array.from(policies.values());
    const byCategory = {};
    const byStatus = {};
    for (const p of all) {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }
    res.json({ total: all.length, categories: CATEGORIES, statuses: POLICY_STATUSES, byCategory, byStatus, policies: all });
  });

  // GET /api/policies/:id
  app.get('/api/policies/:id', (req, res) => {
    const policy = policies.get(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  });

  // PATCH /api/policies/:id
  app.patch('/api/policies/:id', customAuth, writeLimiter, (req, res) => {
    const policy = policies.get(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    if (policy.status === 'retired') {
      return res.status(400).json({ error: 'Cannot modify a retired policy' });
    }
    const body = req.body || {};
    const v = validatePolicyBody(body, { partial: true });
    if (!v.ok) return res.status(400).json({ error: 'validation failed', errors: v.errors });
    const changes = [];
    const protectedFields = ['id', 'createdAt'];
    for (const [k, val] of Object.entries(body)) {
      if (protectedFields.includes(k)) continue;
      if (JSON.stringify(policy[k]) !== JSON.stringify(val)) {
        changes.push({ field: k, from: policy[k], to: val });
        policy[k] = val;
      }
    }
    policy.version = (policy.version || 1) + 1;
    policy.updatedAt = new Date().toISOString();
    if (changes.length > 0) {
      const list = policyChanges.get(policy.id) || [];
      list.push({ version: policy.version, timestamp: policy.updatedAt, changes });
      policyChanges.set(policy.id, list);
      auditLog({
        type: 'policy.updated',
        policyId: policy.id,
        actor: body.actor || policy.owner,
        details: { version: policy.version, changes },
      });
    }
    res.json(policy);
  });

  // DELETE /api/policies/:id
  app.delete('/api/policies/:id', customAuth, writeLimiter, async (req, res) => {
    const policy = policies.get(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    const hard = req.query.hard === 'true' || req.query.hard === '1';
    if (hard) {
      await policies.delete(req.params.id);
      auditLog({
        type: 'policy.deleted',
        policyId: policy.id,
        actor: req.body && req.body.actor ? req.body.actor : policy.owner,
        details: { hard: true, deletedAt: new Date().toISOString() },
      });
      return res.json({ ok: true, deleted: true, policyId: policy.id });
    }
    policy.status = 'retired';
    policy.updatedAt = new Date().toISOString();
    await policies.set(req.params.id, policy);
    auditLog({
      type: 'policy.retired',
      policyId: policy.id,
      actor: req.body && req.body.actor ? req.body.actor : policy.owner,
      details: { retiredAt: policy.updatedAt },
    });
    res.json({ ok: true, policy });
  });

  // =================================================================
  // Policy Lifecycle
  // =================================================================

  app.post('/api/policies/:id/submit', customAuth, writeLimiter, (req, res) => {
    const policy = policies.get(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    if (policy.status !== 'draft') {
      return res.status(400).json({ error: `Cannot submit policy in status '${policy.status}'` });
    }
    policy.status = 'review';
    policy.updatedAt = new Date().toISOString();
    auditLog({
      type: 'policy.submitted',
      policyId: policy.id,
      actor: req.body && req.body.actor ? req.body.actor : policy.owner,
      details: {},
    });
    res.json(policy);
  });

  app.post('/api/policies/:id/approve', customAuth, writeLimiter, (req, res) => {
    const policy = policies.get(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    if (policy.status !== 'review') {
      return res.status(400).json({ error: `Cannot approve policy in status '${policy.status}'` });
    }
    policy.status = 'published';
    policy.updatedAt = new Date().toISOString();
    auditLog({
      type: 'policy.approved',
      policyId: policy.id,
      actor: req.body && req.body.actor ? req.body.actor : 'u-admin',
      details: {},
    });
    res.json(policy);
  });

  app.post('/api/policies/:id/archive', customAuth, writeLimiter, (req, res) => {
    const policy = policies.get(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    if (policy.status !== 'published') {
      return res.status(400).json({ error: `Cannot archive policy in status '${policy.status}'` });
    }
    policy.status = 'archived';
    policy.updatedAt = new Date().toISOString();
    auditLog({
      type: 'policy.archived',
      policyId: policy.id,
      actor: req.body && req.body.actor ? req.body.actor : policy.owner,
      details: {},
    });
    res.json(policy);
  });

  // =================================================================
  // Policy Evaluation
  // =================================================================

  app.post('/api/policies/evaluate', customAuth, evaluateLimiter, (req, res) => {
    const body = req.body || {};
    const { policyId, context = {} } = body;
    const policy = findPolicy(policyId, context);

    if (policy && policy.composition && policy.composition.policyIds && policy.composition.policyIds.length) {
      const comp = evaluateComposition(policy.composition, context);
      const final = {
        allowed: comp.allowed,
        reasons: [`Composition(${policy.composition.mode || 'allOf'}) over ${comp.total} policies: ${comp.allows} allowed`],
        suggestions: [],
        policyUsed: policy.id,
        evaluatedAt: new Date().toISOString(),
        matchedRule: null,
        composition: comp,
      };
      auditLog({ type: 'policy.evaluated', policyId: policy.id, actor: context.user && context.user.id, details: { action: context.action, allowed: final.allowed, reasons: final.reasons } });
      return res.json(final);
    }

    const result = evaluatePolicy(policy, context);
    const final = applyExceptions(policy || {}, context, result);
    auditLog({
      type: 'policy.evaluated',
      policyId: final.policyUsed,
      actor: context.user && context.user.id,
      details: { action: context.action, allowed: final.allowed, reasons: final.reasons },
    });
    res.json(final);
  });

  app.post('/api/policies/evaluate-batch', customAuth, evaluateLimiter, (req, res) => {
    const body = req.body || {};
    const evaluations = Array.isArray(body.evaluations) ? body.evaluations : [];
    const results = evaluations.map((ev) => {
      const policy = findPolicy(ev.policyId, ev.context || {});
      const result = evaluatePolicy(policy, ev.context || {});
      return applyExceptions(policy || {}, ev.context || {}, result);
    });
    res.json({ count: results.length, results });
  });

  app.post('/api/policies/simulate', customAuth, evaluateLimiter, (req, res) => {
    const body = req.body || {};
    const { policyId, context = {} } = body;
    const policy = findPolicy(policyId, context);
    const result = evaluatePolicy(policy, context);
    const final = applyExceptions(policy || {}, context, result);
    // simulate does NOT write to audit log
    res.json({
      simulation: true,
      allowed: final.allowed,
      reasons: final.reasons,
      matchedRule: final.matchedRule,
      suggestions: final.suggestions,
      policyUsed: final.policyUsed,
    });
  });

  app.post('/api/policies/validate', customAuth, (req, res) => {
    const v = validatePolicyBody(req.body || {});
    const status = v.ok ? 200 : 400;
    res.status(status).json({ ok: v.ok, errors: v.errors, validatedAt: new Date().toISOString() });
  });

  // =================================================================
  // Bulk Operations
  // =================================================================

  app.post('/api/policies/bulk', customAuth, writeLimiter, (req, res) => {
    const list = Array.isArray(req.body && req.body.policies) ? req.body.policies : null;
    if (!list) return res.status(400).json({ error: 'policies array is required' });
    const results = { created: [], errors: [] };
    const now = new Date().toISOString();
    for (let i = 0; i < list.length; i++) {
      const body = list[i] || {};
      const v = validatePolicyBody(body);
      if (!v.ok) { results.errors.push({ index: i, id: body.id || null, errors: v.errors }); continue; }
      const id = body.id || `pol-${uuidv4().slice(0, 8)}`;
      if (policies.has(id)) { results.errors.push({ index: i, id, errors: ['duplicate id'] }); continue; }
      const policy = {
        id,
        name: body.name,
        description: body.description || '',
        category: body.category,
        version: 1,
        priority: typeof body.priority === 'number' ? body.priority : 50,
        status: body.status || 'draft',
        conditions: body.conditions || {},
        rules: body.rules || [],
        actions: body.actions || { onAllow: {}, onDeny: {} },
        exceptions: body.exceptions || [],
        approvals: body.approvals || { strategy: 'single', requiredApprovers: [] },
        composition: body.composition || null,
        effectiveFrom: body.effectiveFrom || null,
        effectiveUntil: body.effectiveUntil || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        owner: body.owner || 'u-admin',
        createdAt: now,
        updatedAt: now,
      };
      policies.set(id, policy);
      auditLog({ type: 'policy.created', policyId: id, actor: policy.owner, details: { category: policy.category, name: policy.name, bulk: true } });
      results.created.push(policy);
    }
    res.status(207).json({ requested: list.length, created: results.created.length, failed: results.errors.length, policies: results.created, errors: results.errors });
  });

  app.post('/api/policies/bulk-publish', customAuth, writeLimiter, (req, res) => {
    const ids = Array.isArray(req.body && req.body.policyIds) ? req.body.policyIds : null;
    if (!ids) return res.status(400).json({ error: 'policyIds array is required' });
    const out = [];
    for (const id of ids) {
      const p = policies.get(id);
      if (!p) { out.push({ id, status: 'not-found' }); continue; }
      if (p.status === 'retired') { out.push({ id, status: 'skipped', reason: 'retired' }); continue; }
      p.status = 'published';
      p.version = (p.version || 1) + 1;
      p.updatedAt = new Date().toISOString();
      policies.set(p.id, p);
      auditLog({ type: 'policy.published', policyId: p.id, actor: req.auth.role, details: { bulk: true } });
      out.push({ id, status: 'published', version: p.version });
    }
    res.json({ count: out.length, results: out });
  });

  // =================================================================
  // Policy Composition
  // =================================================================

  app.post('/api/composition-evaluate', customAuth, evaluateLimiter, (req, res) => {
    const { composition, context = {} } = req.body || {};
    if (!composition || !Array.isArray(composition.policyIds)) {
      return res.status(400).json({ error: 'composition.policyIds is required' });
    }
    const v = validatePolicyBody({ name: 'composition', category: 'business', composition }, { partial: true });
    if (!v.ok) return res.status(400).json({ error: 'validation failed', errors: v.errors });
    const result = evaluateComposition(composition, context);
    auditLog({ type: 'composition.evaluated', actor: context.user && context.user.id, details: { mode: result.mode, allows: result.allows, total: result.total, allowed: result.allowed } });
    res.json({ evaluatedAt: new Date().toISOString(), ...result });
  });
}
