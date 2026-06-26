/**
 * PolicyOS — RBAC & ABAC Routes
 *
 * Role-based and attribute-based access control endpoints.
 */

export function registerRbacRoutes(app, {
  roles,
  userRoles,
  users,
  policies,
  auditLog,
  customAuth,
  evaluateLimiter,
  evaluatePolicy,
  applyExceptions,
}) {

  // POST /api/roles — create role
  app.post('/api/roles', customAuth, (req, res) => {
    const body = req.body || {};
    if (!body.name) return res.status(400).json({ error: 'name is required' });
    if (roles.has(body.name)) return res.status(409).json({ error: `Role '${body.name}' already exists` });
    const role = {
      name: body.name,
      description: body.description || '',
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      scope: body.scope || 'self',
      createdAt: new Date().toISOString(),
    };
    roles.set(body.name, role);
    auditLog({
      type: 'role.created',
      roleName: role.name,
      actor: body.actor || 'u-admin',
      details: { permissions: role.permissions },
    });
    res.status(201).json(role);
  });

  app.get('/api/roles', (req, res) => {
    res.json({ count: roles.size, roles: Array.from(roles.values()) });
  });

  app.get('/api/roles/:role', (req, res) => {
    const role = roles.get(req.params.role);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  });

  // POST /api/roles/:role/assign
  app.post('/api/roles/:role/assign', customAuth, (req, res) => {
    const body = req.body || {};
    const roleName = req.params.role;
    const userId = body.userId;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const role = roles.get(roleName);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    const current = userRoles.get(userId) || [];
    if (!current.includes(roleName)) {
      current.push(roleName);
      userRoles.set(userId, current);
    }
    auditLog({ type: 'role.assigned', roleName, actor: body.actor || 'u-admin', details: { userId } });
    res.json({ ok: true, userId, role: roleName });
  });

  app.get('/api/users/:userId/roles', (req, res) => {
    const list = (userRoles.get(req.params.userId) || []).map((n) => roles.get(n)).filter(Boolean);
    res.json({ userId: req.params.userId, roles: list });
  });

  app.get('/api/users', (req, res) => {
    res.json({ count: users.size, users: Array.from(users.values()) });
  });

  // POST /api/check/role — RBAC check
  app.post('/api/check/role', customAuth, evaluateLimiter, (req, res) => {
    const body = req.body || {};
    const { userId, requiredPermission } = body;
    if (!userId || !requiredPermission) {
      return res.status(400).json({ error: 'userId and requiredPermission are required' });
    }
    const userRoleList = (userRoles.get(userId) || []).map((n) => roles.get(n)).filter(Boolean);
    const allowed = userRoleList.some((r) => {
      if (!r) return false;
      if (r.permissions.includes('*')) return true;
      if (r.permissions.includes(requiredPermission)) return true;
      return r.permissions.some((p) => {
        if (p.endsWith(':*')) {
          return requiredPermission.startsWith(p.slice(0, -1));
        }
        return false;
      });
    });
    res.json({
      allowed,
      userId,
      requiredPermission,
      matchedRoles: userRoleList.filter((r) => r && (r.permissions.includes('*') || r.permissions.includes(requiredPermission))),
    });
  });

  // =================================================================
  // ABAC
  // =================================================================

  app.post('/api/check/abac', customAuth, evaluateLimiter, (req, res) => {
    const body = req.body || {};
    const { userId, action, resource, attributes = {} } = body;
    if (!userId || !action) {
      return res.status(400).json({ error: 'userId and action are required' });
    }
    const user = users.get(userId) || { id: userId, trustScore: 0, attributes: {} };
    const context = {
      user: { ...user, scopes: attributes.scopes || [] },
      action,
      resource,
      ...attributes,
    };

    let policy = null;
    if (action.startsWith('ai.')) policy = policies.get('pol-ai-autonomy');
    else if (action.startsWith('skill.')) policy = policies.get('pol-skill-execution');
    else if (action === 'twin.share' || action === 'twin.export' || action === 'twin.delegate') {
      policy = policies.get('pol-twin-sharing');
    } else if (action === 'data.export' || action === 'data.bulk_download') {
      policy = policies.get('pol-data-export');
    } else if (action === 'payment.make' || action === 'payment.send') {
      policy = policies.get('pol-payment-fraud');
    } else if (action === 'purchase' || action === 'cart.checkout') {
      policy = policies.get('pol-shopping-budget');
    }
    if (!policy) {
      policy = Array.from(policies.values()).find((p) => p.status === 'published' && p.category === attributes.category);
    }

    const result = evaluatePolicy(policy, context);
    const final = applyExceptions(policy || {}, context, result);
    auditLog({
      type: 'abac.check',
      actor: userId,
      details: { action, resource, allowed: final.allowed, policyUsed: final.policyUsed },
    });
    res.json({
      allowed: final.allowed,
      matchedRule: final.matchedRule,
      reasons: final.reasons,
      policyUsed: final.policyUsed,
    });
  });
}
