/**
 * PolicyOS — Twin Governance (Phase 7)
 *
 * Endpoints:
 *  - GET  /api/twins/policies       — list twin access policies
 *  - POST /api/twins/policies       — create policy
 *  - GET  /api/twins/policies/:id   — get one
 *  - DELETE /api/twins/policies/:id — delete
 *  - POST /api/twins/policies/evaluate — evaluate twin access
 *  - GET  /api/twins/versions       — version history
 *  - POST /api/twins/versions/rollback — rollback to version
 *  - POST /api/twins/bridge         — bridge to TwinOS
 */

// ── Twin Access Policies (persistent when provided) ─────────────────────────────

let twinPolicies = new Map();
let twinPolicyIdCounter = 0;

export function initTwinPoliciesStore(store) {
  twinPolicies = store;
  let maxN = 0;
  for (const p of store.values()) {
    const m = p.id.match(/twin-pol-(\d+)/);
    if (m) maxN = Math.max(maxN, parseInt(m[1]));
  }
  twinPolicyIdCounter = maxN;
}

export const VERSION_STATES = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
};

export function evaluateTwinAccess(policyId, { subject, twinType, action, twinId }) {
  const policy = twinPolicies.get(policyId);
  if (!policy) return { allowed: false, reason: 'Twin policy not found' };

  // Check twin type match
  if (policy.twinType && policy.twinType !== '*' && policy.twinType !== twinType) {
    return { allowed: false, reason: `Twin type '${twinType}' not authorized` };
  }

  // Check action
  if (!policy.actions.includes('*') && !policy.actions.includes(action)) {
    return { allowed: false, reason: `Action '${action}' not permitted` };
  }

  // Check ownership
  if (policy.ownerOnly && subject !== policy.owner) {
    return { allowed: false, reason: 'Only the twin owner can perform this action' };
  }

  return { allowed: true, reason: 'Twin access permitted', policyId };
}

// ── Route Registration ───────────────────────────────────────────────────────

export function registerTwinGovernanceRoutes(app, { auditLog, customAuth, twinPolicies }) {
  if (twinPolicies) initTwinPoliciesStore(twinPolicies);

  // GET /api/twins/policies — list policies
  app.get('/api/twins/policies', customAuth, (req, res) => {
    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const policies = [...twinPolicies.values()].filter(p => p.tenantId === tenantId);
    res.json({ count: policies.length, policies });
  });

  // POST /api/twins/policies — create policy
  app.post('/api/twins/policies', customAuth, (req, res) => {
    const { name, twinType, actions, ownerOnly, owner, metadata } = req.body;
    if (!name || !twinType || !actions) {
      return res.status(400).json({ error: 'name, twinType, and actions are required' });
    }

    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const id = `twin-pol-${++twinPolicyIdCounter}-${Date.now()}`;
    const policy = {
      id, name, twinType,
      actions: Array.isArray(actions) ? actions : [actions],
      ownerOnly: ownerOnly ?? false,
      owner: owner || null,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      createdBy: req.auth?.sub,
      tenantId,
    };

    twinPolicies.set(id, policy);
    res.status(201).json({ ok: true, policy });
  });

  // GET /api/twins/policies/:id
  app.get('/api/twins/policies/:id', customAuth, (req, res) => {
    const policy = twinPolicies.get(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json({ policy });
  });

  // DELETE /api/twins/policies/:id
  app.delete('/api/twins/policies/:id', customAuth, (req, res) => {
    if (!twinPolicies.has(req.params.id)) return res.status(404).json({ error: 'Policy not found' });
    twinPolicies.delete(req.params.id);
    res.json({ ok: true });
  });

  // POST /api/twins/policies/evaluate
  app.post('/api/twins/policies/evaluate', customAuth, (req, res) => {
    const { policyId, subject, twinType, action, twinId } = req.body;
    if (!policyId || !subject || !action) {
      return res.status(400).json({ error: 'policyId, subject, and action are required' });
    }
    const result = evaluateTwinAccess(policyId, { subject, twinType, action, twinId });
    res.json({ ok: true, ...result });
  });

  // GET /api/twins/versions — list version history
  app.get('/api/twins/versions', customAuth, (req, res) => {
    const { twinId, limit = 50 } = req.query;
    // In production this would query TwinOS version history
    res.json({
      twinId: twinId || null,
      versions: [],
      note: 'Bridge to TwinOS for actual version history',
    });
  });

  // POST /api/twins/versions/rollback
  app.post('/api/twins/versions/rollback', customAuth, (req, res) => {
    const { twinId, version } = req.body;
    if (!twinId || !version) {
      return res.status(400).json({ error: 'twinId and version are required' });
    }
    res.json({
      ok: true,
      twinId,
      targetVersion: version,
      rolledBackAt: new Date().toISOString(),
      note: 'Bridge to TwinOS to perform actual rollback',
    });
  });

  // POST /api/twins/bridge — bridge to TwinOS
  app.post('/api/twins/bridge', customAuth, async (req, res) => {
    const { twinType, action, twinId, data } = req.body;
    if (!twinType || !action) {
      return res.status(400).json({ error: 'twinType and action are required' });
    }

    const supportedTypes = [
      'customer', 'order', 'wallet', 'employee', 'voice',
      'product', 'asset', 'organization', 'partner', 'lead',
      'session', 'device', 'transaction', 'document',
    ];
    if (!supportedTypes.includes(twinType)) {
      return res.status(400).json({ error: `Unsupported twinType. Supported: ${supportedTypes.join(', ')}` });
    }

    const supportedActions = ['read', 'update', 'delete', 'version', 'snapshot', 'restore'];
    if (!supportedActions.includes(action)) {
      return res.status(400).json({ error: `Unsupported action. Supported: ${supportedActions.join(', ')}` });
    }

    res.json({
      ok: true,
      twinType,
      action,
      twinId: twinId || null,
      result: `Would ${action} ${twinType} twin`,
      bridgedAt: new Date().toISOString(),
    });
  });
}