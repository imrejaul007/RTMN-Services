/**
 * PolicyOS — Lifecycle Automation (Phase 9)
 *
 * Endpoints:
 *  - GET  /api/automation/rules         — list automation rules
 *  - POST /api/automation/rules         — create rule
 *  - GET  /api/automation/rules/:id     — get one
 *  - DELETE /api/automation/rules/:id   — delete
 *  - POST /api/automation/rules/:id/trigger — trigger rule manually
 *  - GET  /api/automation/approvals     — approval queue
 *  - POST /api/automation/approvals/:id — approve/reject
 *  - GET  /api/automation/history       — execution history
 */

const rules = new Map();
let ruleIdCounter = 0;
const approvals = new Map();
let approvalIdCounter = 0;
const history = [];

export const TRIGGER_TYPES = {
  POLICY_CREATED: 'policy_created',
  POLICY_UPDATED: 'policy_updated',
  POLICY_DELETED: 'policy_deleted',
  EVALUATION_RESULT: 'evaluation_result',
  SCHEDULE: 'schedule',
  MANUAL: 'manual',
  WEBHOOK: 'webhook',
  TRUST_CHANGE: 'trust_change',
  VIOLATION_DETECTED: 'violation_detected',
};

export const ACTION_TYPES = {
  APPROVE: 'approve',
  REJECT: 'reject',
  NOTIFY: 'notify',
  ESCALATE: 'escalate',
  LOG: 'log',
  BLOCK: 'block',
  AUDIT: 'audit',
  COMPOSE: 'compose',
};

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

export function triggerAutomationRule(ruleId, context) {
  const rule = rules.get(ruleId);
  if (!rule) return { success: false, reason: 'Rule not found' };
  if (!rule.enabled) return { success: false, reason: 'Rule is disabled' };

  const now = new Date();
  if (rule.validFrom && new Date(rule.validFrom) > now) return { success: false, reason: 'Rule not yet valid' };
  if (rule.validUntil && new Date(rule.validUntil) < now) return { success: false, reason: 'Rule expired' };

  const results = [];
  for (const action of rule.actions) {
    results.push({
      action: action.type,
      executed: true,
      result: `Would execute: ${action.type}`,
      timestamp: new Date().toISOString(),
    });
  }

  history.push({ ruleId, context, results, triggeredAt: new Date().toISOString(), type: 'rule_triggered' });
  if (history.length > 1000) history.shift();

  return { success: true, ruleId, results, triggeredAt: new Date().toISOString() };
}

export function registerLifecycleAutomationRoutes(app, { auditLog, customAuth }) {

  app.get('/api/automation/rules', customAuth, (req, res) => {
    const { enabled, triggerType, limit = 50 } = req.query;
    let list = [...rules.values()];
    if (enabled !== undefined) list = list.filter(r => r.enabled === (enabled === 'true'));
    if (triggerType) list = list.filter(r => r.trigger === triggerType);
    res.json({ count: list.length, rules: list.slice(0, parseInt(limit)) });
  });

  app.post('/api/automation/rules', customAuth, (req, res) => {
    const { name, trigger, actions, conditions, enabled, validFrom, validUntil, metadata } = req.body;
    if (!name || !trigger || !actions) {
      return res.status(400).json({ error: 'name, trigger, and actions are required' });
    }

    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const id = `rule-${++ruleIdCounter}-${Date.now()}`;
    const rule = {
      id, name, trigger,
      actions: Array.isArray(actions) ? actions : [actions],
      conditions: conditions || [],
      enabled: enabled ?? true,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      createdBy: req.auth?.sub,
      tenantId,
      executionCount: 0,
    };

    rules.set(id, rule);
    res.status(201).json({ ok: true, rule });
  });

  app.get('/api/automation/rules/:id', customAuth, (req, res) => {
    const rule = rules.get(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ rule });
  });

  app.patch('/api/automation/rules/:id', customAuth, (req, res) => {
    const rule = rules.get(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const { name, actions, conditions, enabled, validFrom, validUntil } = req.body;
    if (name !== undefined) rule.name = name;
    if (actions) rule.actions = actions;
    if (conditions) rule.conditions = conditions;
    if (enabled !== undefined) rule.enabled = enabled;
    if (validFrom !== undefined) rule.validFrom = validFrom;
    if (validUntil !== undefined) rule.validUntil = validUntil;
    res.json({ ok: true, rule });
  });

  app.delete('/api/automation/rules/:id', customAuth, (req, res) => {
    if (!rules.has(req.params.id)) return res.status(404).json({ error: 'Rule not found' });
    rules.delete(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/automation/rules/:id/trigger', customAuth, (req, res) => {
    const result = triggerAutomationRule(req.params.id, req.body.context || {});
    if (!result.success) return res.status(400).json(result);
    res.json({ ok: true, ...result });
  });

  app.get('/api/automation/approvals', customAuth, (req, res) => {
    const { status, limit = 50 } = req.query;
    let list = [...approvals.values()];
    if (status) list = list.filter(a => a.status === status);
    res.json({ count: list.length, approvals: list.slice(0, parseInt(limit)) });
  });

  app.post('/api/automation/approvals', customAuth, (req, res) => {
    const { policyId, requester, reason, priority } = req.body;
    if (!policyId || !requester) {
      return res.status(400).json({ error: 'policyId and requester are required' });
    }

    const id = `apr-${++approvalIdCounter}-${Date.now()}`;
    const approval = {
      id, policyId, requester,
      reason: reason || '',
      priority: priority || 'normal',
      status: APPROVAL_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedBy: null,
      reviewedAt: null,
    };

    approvals.set(id, approval);
    res.status(201).json({ ok: true, approval });
  });

  app.post('/api/automation/approvals/:id', customAuth, (req, res) => {
    const approval = approvals.get(req.params.id);
    if (!approval) return res.status(404).json({ error: 'Approval not found' });

    const { action, comments } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    approval.status = action === 'approve' ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
    approval.reviewedBy = req.auth?.sub;
    approval.reviewedAt = new Date().toISOString();
    approval.comments = comments || '';

    res.json({ ok: true, approval });
  });

  app.get('/api/automation/history', customAuth, (req, res) => {
    const { limit = 100, offset = 0 } = req.query;
    const start = parseInt(offset) || 0;
    const end = start + Math.min(parseInt(limit) || 100, 500);
    res.json({
      count: history.length,
      events: history.slice(start, end).reverse(),
    });
  });
}