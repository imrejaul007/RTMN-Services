/**
 * PolicyOS — RBAC & ABAC Routes (Phase 1: RBAC v2)
 *
 * Role-based and attribute-based access control endpoints.
 * Phase 1 adds:
 *   - Role conditions (attribute-based constraints on role exercise)
 *   - Time-bound role grants (validFrom / validUntil)
 *   - Role hierarchy (inheritsFrom)
 *   - Role delegation
 *   - Break-glass temporary elevation
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

  // =================================================================
  // Role CRUD
  // =================================================================

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
      // Phase 1: conditions — attribute constraints for exercising this role
      conditions: body.conditions || null,
      // Phase 1: delegation config
      delegation: body.delegation || null,
      // Phase 1: hierarchy
      hierarchy: body.hierarchy || null,
      // Phase 1: explicit conflicts
      conflictsWith: Array.isArray(body.conflictsWith) ? body.conflictsWith : [],
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

  // PATCH /api/roles/:role/constraints — update role conditions (Phase 1)
  app.patch('/api/roles/:role/constraints', customAuth, (req, res) => {
    const role = roles.get(req.params.role);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    const { conditions, delegation, hierarchy, conflictsWith } = req.body || {};
    if (conditions !== undefined) role.conditions = conditions;
    if (delegation !== undefined) role.delegation = delegation;
    if (hierarchy !== undefined) role.hierarchy = hierarchy;
    if (Array.isArray(conflictsWith)) role.conflictsWith = conflictsWith;
    roles.set(role.name, role);
    auditLog({
      type: 'role.constraints_updated',
      roleName: role.name,
      actor: req.auth?.sub || req.auth?.role || 'unknown',
      details: { conditions, delegation, hierarchy },
    });
    res.json(role);
  });

  // =================================================================
  // Role Hierarchy (Phase 1.2)
  // =================================================================

  /** Detect circular inheritance — DFS with visited set. */
  function detectCycle(roleName, visited = new Set()) {
    if (visited.has(roleName)) return true;
    visited.add(roleName);
    const role = roles.get(roleName);
    if (!role?.hierarchy?.inheritsFrom) return false;
    for (const parent of role.hierarchy.inheritsFrom) {
      if (detectCycle(parent, new Set(visited))) return true;
    }
    return false;
  }

  /** Walk the inheritance chain and collect all permissions. */
  function computeEffectivePermissions(roleName, _visited = new Set()) {
    if (_visited.has(roleName)) return []; // prevent infinite loop on cycle
    _visited.add(roleName);
    const role = roles.get(roleName);
    if (!role) return [];
    const perms = [...(role.permissions || [])];
    if (role.hierarchy?.inheritsFrom) {
      for (const parent of role.hierarchy.inheritsFrom) {
        perms.push(...computeEffectivePermissions(parent, new Set(_visited)));
      }
    }
    return [...new Set(perms)]; // dedupe
  }

  // GET /api/roles/:role/hierarchy — show inheritance tree (Phase 1.2)
  app.get('/api/roles/:role/hierarchy', (req, res) => {
    const role = roles.get(req.params.role);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    const effective = computeEffectivePermissions(req.params.role);
    const tree = {
      name: role.name,
      permissions: role.permissions || [],
      effectivePermissions: effective,
      inheritsFrom: role.hierarchy?.inheritsFrom || [],
      priority: role.hierarchy?.priority || 0,
    };
    res.json(tree);
  });

  // GET /api/roles/:role/effective-permissions/:userId (Phase 1.2)
  app.get('/api/roles/:role/effective-permissions/:userId', (req, res) => {
    const role = roles.get(req.params.role);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    const userId = req.params.userId;
    const userRoleList = userRoles.get(userId) || [];
    if (!userRoleList.includes(req.params.role)) {
      return res.status(404).json({ error: 'User does not have this role' });
    }
    const effective = computeEffectivePermissions(req.params.role);
    res.json({ userId, role: req.params.role, effectivePermissions: effective });
  });

  // =================================================================
  // Role Assignment with Time Bounds (Phase 1.1)
  // =================================================================

  // In-memory store for time-bound assignments
  const timedAssignments = new Map(); // userId → [{ role, validFrom, validUntil, grantedBy }]

  // POST /api/roles/:role/assign — assign with optional time bounds (Phase 1.1)
  app.post('/api/roles/:role/assign', customAuth, (req, res) => {
    const body = req.body || {};
    const roleName = req.params.role;
    const userId = body.userId;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const role = roles.get(roleName);
    if (!role) return res.status(404).json({ error: 'Role not found' });

    const validFrom = body.validFrom ? new Date(body.validFrom).getTime() : null;
    const validUntil = body.validUntil ? new Date(body.validUntil).getTime() : null;
    if (validFrom && validUntil && validFrom >= validUntil) {
      return res.status(400).json({ error: 'validFrom must be before validUntil' });
    }

    const current = userRoles.get(userId) || [];
    if (!current.includes(roleName)) {
      current.push(roleName);
      userRoles.set(userId, current);
    }

    // Record time-bound assignment metadata
    if (validFrom || validUntil) {
      const timed = timedAssignments.get(userId) || [];
      // Replace existing timed record for this role if any
      const idx = timed.findIndex((a) => a.role === roleName);
      const entry = {
        role: roleName,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        grantedBy: req.auth?.sub || req.auth?.role || 'u-admin',
      };
      if (idx >= 0) timed[idx] = entry;
      else timed.push(entry);
      timedAssignments.set(userId, timed);
    }

    auditLog({
      type: 'role.assigned',
      roleName,
      actor: body.actor || req.auth?.sub || req.auth?.role || 'u-admin',
      details: { userId, validFrom: body.validFrom || null, validUntil: body.validUntil || null },
    });
    res.json({ ok: true, userId, role: roleName, validFrom: body.validFrom || null, validUntil: body.validUntil || null });
  });

  // =================================================================
  // Delegation (Phase 1.1)
  // =================================================================

  // Delegations: fromUser → toUser → { role, maxDepth, expiresAt }
  const delegations = new Map(); // fromUser → Map(toUser → delegation record)

  // POST /api/roles/:role/delegate — delegate role to another user (Phase 1.1)
  app.post('/api/roles/:role/delegate', customAuth, (req, res) => {
    const body = req.body || {};
    const roleName = req.params.role;
    const { toUserId, reason, durationHours } = body;
    if (!toUserId) return res.status(400).json({ error: 'toUserId is required' });
    const delegatorId = req.auth?.sub || req.auth?.userId || 'unknown';

    const role = roles.get(roleName);
    if (!role) return res.status(404).json({ error: 'Role not found' });

    const delegConfig = role.delegation;
    if (!delegConfig?.allowed) {
      return res.status(403).json({ error: `Role '${roleName}' does not allow delegation` });
    }

    // Check if delegator actually has this role
    const delegatorRoles = userRoles.get(delegatorId) || [];
    if (!delegatorRoles.includes(roleName)) {
      return res.status(403).json({ error: 'You do not have this role to delegate' });
    }

    const maxDepth = delegConfig.maxDepth || 1;
    const expiresAt = durationHours
      ? new Date(Date.now() + durationHours * 3600_000).toISOString()
      : null;

    if (!delegations.has(delegatorId)) delegations.set(delegatorId, new Map());
    delegations.get(delegatorId).set(toUserId, {
      role: roleName,
      maxDepth,
      expiresAt,
      reason: reason || null,
      delegatedAt: new Date().toISOString(),
    });

    auditLog({
      type: 'role.delegated',
      roleName,
      actor: delegatorId,
      details: { toUserId, reason, maxDepth, expiresAt },
    });
    res.json({ ok: true, role: roleName, toUserId, expiresAt });
  });

  // GET /api/roles/delegations — list active delegations (Phase 1.1)
  app.get('/api/roles/delegations', customAuth, (req, res) => {
    const actor = req.auth?.sub || req.auth?.userId || 'unknown';
    const incoming = [];
    const outgoing = [];

    // Incoming: delegations TO this user
    for (const [fromUser, map] of delegations) {
      for (const [toUser, del] of map) {
        if (toUser === actor) {
          if (!del.expiresAt || new Date(del.expiresAt) > new Date()) {
            incoming.push({ fromUser, ...del });
          }
        }
        if (fromUser === actor) {
          if (!del.expiresAt || new Date(del.expiresAt) > new Date()) {
            outgoing.push({ toUser, ...del });
          }
        }
      }
    }
    res.json({ incoming, outgoing });
  });

  // DELETE /api/roles/:role/delegation/:toUserId — revoke delegation (Phase 1.1)
  app.delete('/api/roles/:role/delegation/:toUserId', customAuth, (req, res) => {
    const actor = req.auth?.sub || req.auth?.userId || 'unknown';
    const toUserId = req.params.toUserId;
    const delegatorMap = delegations.get(actor);
    if (!delegatorMap?.has(toUserId)) {
      return res.status(404).json({ error: 'Delegation not found' });
    }
    const del = delegatorMap.get(toUserId);
    delegatorMap.delete(toUserId);
    auditLog({
      type: 'role.delegation_revoked',
      roleName: req.params.role,
      actor,
      details: { toUserId },
    });
    res.json({ ok: true, revoked: toUserId });
  });

  // =================================================================
  // Break-Glass (Phase 1.4) — Temporary Role Elevation
  // =================================================================

  // Elevations: userId → { role, reason, expiresAt, approvedBy }
  const elevations = new Map();

  // POST /api/roles/elevate — temporary elevation to a higher role (Phase 1.4)
  app.post('/api/roles/elevate', customAuth, (req, res) => {
    const body = req.body || {};
    const { role, reason, durationMinutes } = body;
    if (!role || !reason) return res.status(400).json({ error: 'role and reason are required' });

    const elevRole = roles.get(role);
    if (!elevRole) return res.status(404).json({ error: 'Role not found' });

    const userId = req.auth?.sub || req.auth?.userId || 'unknown';
    const now = Date.now();
    const expiresAt = now + (durationMinutes || 60) * 60_000; // default 1h

    elevations.set(userId, {
      role,
      reason,
      expiresAt,
      elevatedAt: new Date().toISOString(),
    });

    auditLog({
      type: 'role.elevated',
      roleName: role,
      actor: userId,
      details: { reason, durationMinutes: durationMinutes || 60 },
    });
    res.json({
      ok: true,
      role,
      reason,
      expiresAt: new Date(expiresAt).toISOString(),
      message: 'Elevation granted. Use elevated role immediately.',
    });
  });

  // GET /api/roles/elevation — check current elevation status
  app.get('/api/roles/elevation', customAuth, (req, res) => {
    const userId = req.auth?.sub || req.auth?.userId || 'unknown';
    const elev = elevations.get(userId);
    if (!elev || new Date(elev.expiresAt) < new Date()) {
      return res.json({ elevated: false });
    }
    res.json({ elevated: true, ...elev });
  });

  // DELETE /api/roles/elevation — revoke own elevation early
  app.delete('/api/roles/elevation', customAuth, (req, res) => {
    const userId = req.auth?.sub || req.auth?.userId || 'unknown';
    if (elevations.has(userId)) {
      elevations.delete(userId);
      auditLog({ type: 'role.elevation_revoked', actor: userId });
    }
    res.json({ ok: true });
  });

  // =================================================================
  // Role Overlap Detection (Phase 1.3)
  // =================================================================

  // POST /api/roles/check-overlap — check if two users have conflicting permissions (Phase 1.3)
  app.post('/api/roles/check-overlap', customAuth, (req, res) => {
    const { userId1, userId2 } = req.body || {};
    if (!userId1 || !userId2) return res.status(400).json({ error: 'userId1 and userId2 are required' });

    const roles1 = new Set(userRoles.get(userId1) || []);
    const roles2 = new Set(userRoles.get(userId2) || []);

    // Find explicit conflicts
    const explicit = [];
    for (const r1 of roles1) {
      const role = roles.get(r1);
      if (role?.conflictsWith) {
        for (const conflict of role.conflictsWith) {
          if (roles2.has(conflict)) {
            explicit.push({ role: r1, conflictsWith: conflict });
          }
        }
      }
    }

    // Find permission overlap
    const perms1 = new Set();
    for (const r of roles1) perms1.add(...computeEffectivePermissions(r));
    const perms2 = new Set();
    for (const r of roles2) perms2.add(...computeEffectivePermissions(r));

    const shared = [...perms1].filter((p) => perms2.has(p));

    res.json({
      userId1,
      userId2,
      hasConflict: explicit.length > 0,
      explicitConflicts: explicit,
      sharedPermissions: shared,
    });
  });

  // GET /api/admin/role-conflicts — admin view of all active conflicts (Phase 1.3)
  app.get('/api/admin/role-conflicts', customAuth, (req, res) => {
    const conflicts = [];
    for (const [roleName, role] of roles) {
      if (role.conflictsWith?.length) {
        for (const other of role.conflictsWith) {
          conflicts.push({ role: roleName, conflictsWith: other });
        }
      }
    }
    res.json({ totalRolesWithConflicts: conflicts.length / 2, conflicts });
  });

  // =================================================================
  // Role Condition Evaluation
  // =================================================================

  /** Check if role conditions are satisfied by the given context. */
  function evaluateRoleConditions(role, context) {
    if (!role.conditions) return { satisfied: true, failed: [] };
    const failed = [];
    for (const [path, constraint] of Object.entries(role.conditions)) {
      const value = resolvePath(context, path);
      for (const [op, expected] of Object.entries(constraint)) {
        if (op === 'in') {
          if (!Array.isArray(expected) || !expected.includes(value)) {
            failed.push({ path, op, expected, actual: value });
          }
        } else if (op === 'eq') {
          if (value !== expected) {
            failed.push({ path, op, expected, actual: value });
          }
        } else if (op === 'neq') {
          if (value === expected) {
            failed.push({ path, op, expected, actual: value });
          }
        } else if (op === 'gte' && typeof value !== 'number') {
          failed.push({ path, op, expected, actual: value });
        } else if (op === 'lte' && typeof value !== 'number') {
          failed.push({ path, op, expected, actual: value });
        }
      }
    }
    return { satisfied: failed.length === 0, failed };
  }

  function resolvePath(obj, path) {
    return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
  }

  // =================================================================
  // Legacy / unchanged endpoints
  // =================================================================

  app.get('/api/users/:userId/roles', (req, res) => {
    const list = (userRoles.get(req.params.userId) || [])
      .map((n) => roles.get(n))
      .filter(Boolean)
      .map((r) => {
        // Check time bounds
        const timed = (timedAssignments.get(req.params.userId) || [])
          .find((a) => a.role === r.name);
        const now = Date.now();
        const active =
          !timed ||
          (!timed.validFrom || now >= timed.validFrom) &&
          (!timed.validUntil || now <= timed.validUntil);
        const effective = active ? computeEffectivePermissions(r.name) : [];
        const conditions = evaluateRoleConditions(r, {});
        return { ...r, effectivePermissions: effective, timeBound: !!timed, active, conditions };
      });
    res.json({ userId: req.params.userId, roles: list });
  });

  app.get('/api/users', (req, res) => {
    res.json({ count: users.size, users: Array.from(users.values()) });
  });

  // POST /api/check/role — RBAC check
  app.post('/api/check/role', customAuth, evaluateLimiter, (req, res) => {
    const body = req.body || {};
    const { userId, requiredPermission, context = {} } = body;
    if (!userId || !requiredPermission) {
      return res.status(400).json({ error: 'userId and requiredPermission are required' });
    }

    const userRoleList = (userRoles.get(userId) || [])
      .map((n) => roles.get(n))
      .filter(Boolean);

    const now = Date.now();

    // Check break-glass elevation first
    const elev = elevations.get(userId);
    const isElevated = elev && new Date(elev.expiresAt) > new Date();

    let matched = [];
    for (const r of userRoleList) {
      // Time-bound check
      const timed = (timedAssignments.get(userId) || []).find((a) => a.role === r.name);
      if (timed) {
        if (timed.validFrom && now < timed.validFrom) continue;
        if (timed.validUntil && now > timed.validUntil) continue;
      }

      const effective = computeEffectivePermissions(r.name);
      const hasPerm = effective.includes('*') || effective.includes(requiredPermission) ||
        effective.some((p) => p.endsWith(':*') && requiredPermission.startsWith(p.slice(0, -1)));

      if (hasPerm) {
        // Condition check
        const cond = evaluateRoleConditions(r, context);
        if (cond.satisfied) matched.push(r.name);
      }
    }

    // If elevated, add elevated role
    if (isElevated) {
      matched.push(elev.role);
    }

    const allowed = matched.length > 0;
    res.json({ allowed, userId, requiredPermission, matchedRoles: matched });
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
