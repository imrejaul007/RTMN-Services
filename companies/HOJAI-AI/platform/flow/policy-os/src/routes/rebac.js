/**
 * PolicyOS — ReBAC: Relationship-Based Access Control (Phase 3)
 *
 * Endpoints:
 *  - POST /api/relationships              — create relationship
 *  - GET  /api/relationships              — list relationships (filterable)
 *  - GET  /api/relationships/:id         — get one relationship
 *  - DELETE /api/relationships/:id       — delete relationship
 *  - POST /api/relationships/check       — check relationship
 *  - GET  /api/relationships/path         — find relationship path
 *  - POST /api/policies/from-relationships — policy from relationship traversal
 */

// ── Relationship Types ────────────────────────────────────────────────────────

export const RELATIONSHIP_TYPES = {
  OWNS: 'owns',
  MANAGES: 'manages',
  MEMBER_OF: 'member_of',
  COLLEAGUE_OF: 'colleague_of',
  REPORTS_TO: 'reports_to',
  COLLABORATES_WITH: 'collaborates_with',
  PEER_OF: 'peer_of',
  PARENT_OF: 'parent_of',
  CHILD_OF: 'child_of',
  FOLLOWS: 'follows',
  SHARES_WITH: 'shares_with',
  DELEGATED_TO: 'delegated_to',
  DELEGATED_FROM: 'delegated_from',
  MENTIONS: 'mentions',
  LOCATED_IN: 'located_in',
  PART_OF: 'part_of',
};

// Directed edges: (from, type, to)
// Subject must always be the "from" in the graph

// ── Graph Store ──────────────────────────────────────────────────────────────

// Map<id, { id, from, type, to, metadata, createdAt, createdBy, tenantId }>
const relationshipStore = new Map();
let relationshipIdCounter = 0;

// Inverted index for fast lookups
// outEdges: Map<from, Set<id>>  — what edges start from a node
// inEdges: Map<to, Set<id>>      — what edges end at a node
// typeIndex: Map<type, Set<id>> — edges of a given type
const outEdges = new Map();
const inEdges = new Map();
const typeIndex = new Map();

function addToIndex(rel) {
  // outEdges
  if (!outEdges.has(rel.from)) outEdges.set(rel.from, new Set());
  outEdges.get(rel.from).add(rel.id);

  // inEdges
  if (!inEdges.has(rel.to)) inEdges.set(rel.to, new Set());
  inEdges.get(rel.to).add(rel.id);

  // typeIndex
  if (!typeIndex.has(rel.type)) typeIndex.set(rel.type, new Set());
  typeIndex.get(rel.type).add(rel.id);
}

function removeFromIndex(rel) {
  if (outEdges.has(rel.from)) outEdges.get(rel.from).delete(rel.id);
  if (inEdges.has(rel.to)) inEdges.get(rel.to).delete(rel.id);
  if (typeIndex.has(rel.type)) typeIndex.get(rel.type).delete(rel.id);
}

// ── Graph Traversal Engine ───────────────────────────────────────────────────

/**
 * BFS/DFS traversal to check if a relationship path exists.
 * Returns the path if found, null otherwise.
 */
export function findPath(from, to, maxDepth = 5, allowedTypes = null) {
  if (from === to) return [from];

  const visited = new Set([from]);
  const queue = [[from]];

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    // Get outgoing edges from current node
    const edgeIds = outEdges.get(current) || new Set();
    for (const edgeId of edgeIds) {
      const rel = relationshipStore.get(edgeId);
      if (!rel) continue;

      // Filter by allowed types if specified
      if (allowedTypes && !allowedTypes.includes(rel.type)) continue;

      if (visited.has(rel.to)) continue;
      visited.add(rel.to);

      const newPath = [...path, rel.to];

      if (rel.to === to) return newPath;
      if (newPath.length >= maxDepth) continue;

      queue.push(newPath);
    }

    // Also follow reverse (incoming) edges — traverse "backwards" relationships
    const incomingIds = inEdges.get(current) || new Set();
    for (const edgeId of incomingIds) {
      const rel = relationshipStore.get(edgeId);
      if (!rel) continue;
      if (allowedTypes && !allowedTypes.includes(rel.type)) continue;

      if (visited.has(rel.from)) continue;
      visited.add(rel.from);

      const newPath = [...path, rel.from];
      if (rel.from === to) return newPath;
      if (newPath.length >= maxDepth) continue;

      queue.push(newPath);
    }
  }

  return null;
}

/**
 * Find all nodes reachable from a given node within maxDepth.
 */
export function findReachable(from, maxDepth = 3, allowedTypes = null, direction = 'out') {
  const visited = new Set([from]);
  const frontier = [{ node: from, depth: 0 }];
  const reachable = [];

  while (frontier.length > 0) {
    const { node, depth } = frontier.shift();
    if (depth > 0) reachable.push(node);

    if (depth >= maxDepth) continue;

    let edgeIds;
    if (direction === 'out') {
      edgeIds = outEdges.get(node) || new Set();
    } else if (direction === 'in') {
      edgeIds = inEdges.get(node) || new Set();
    } else {
      edgeIds = new Set([...(outEdges.get(node) || []), ...(inEdges.get(node) || [])]);
    }

    for (const edgeId of edgeIds) {
      const rel = relationshipStore.get(edgeId);
      if (!rel) continue;
      if (allowedTypes && !allowedTypes.includes(rel.type)) continue;

      const neighbor = direction === 'out' ? rel.to : rel.from;
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      frontier.push({ node: neighbor, depth: depth + 1 });
    }
  }

  return reachable;
}

/**
 * Check if a specific relationship exists (direct edge).
 */
export function hasDirectRelationship(from, type, to) {
  const edgeIds = outEdges.get(from) || new Set();
  for (const edgeId of edgeIds) {
    const rel = relationshipStore.get(edgeId);
    if (rel && rel.type === type && rel.to === to) return true;
  }
  return false;
}

/**
 * Get all relationships for a node (both directions).
 */
export function getRelationshipsForNode(node, opts = {}) {
  const { direction = 'both', type = null } = opts;
  const results = [];

  if (direction === 'out' || direction === 'both') {
    const ids = outEdges.get(node) || new Set();
    for (const id of ids) {
      const rel = relationshipStore.get(id);
      if (rel && (!type || rel.type === type)) results.push({ ...rel, direction: 'outgoing' });
    }
  }

  if (direction === 'in' || direction === 'both') {
    const ids = inEdges.get(node) || new Set();
    for (const id of ids) {
      const rel = relationshipStore.get(id);
      if (rel && (!type || rel.type === type)) results.push({ ...rel, direction: 'incoming' });
    }
  }

  return results;
}

// ── Hybrid Policy Evaluation ─────────────────────────────────────────────────

/**
 * Evaluate a ReBAC-enhanced policy.
 * Returns { allowed, reason, path?, matchedRelationship? }
 */
export function evaluateWithReBAC(policy, context, relationships) {
  const { subject, resource, action, attributes = {} } = context;
  const { relationshipRequirements = [] } = policy;

  if (!relationshipRequirements || relationshipRequirements.length === 0) {
    return { allowed: true, reason: 'No relationship requirements' };
  }

  for (const req of relationshipRequirements) {
    const { type, direction = 'out', target, maxDepth = 3 } = req;

    let found = false;

    // Direct relationship check
    if (direction === 'direct') {
      found = hasDirectRelationship(subject, type, target);
      if (!found) {
        return { allowed: false, reason: `Missing direct relationship: ${subject} ${type} ${target}` };
      }
      continue;
    }

    // Traverse relationship graph
    if (direction === 'out' || direction === 'both') {
      const path = findPath(subject, target, maxDepth,
        type === '*' ? null : [type]);
      if (path) {
        found = true;
        return { allowed: true, reason: `Relationship path found: ${path.join(' → ')}`, path, matchedRelationship: { type, target } };
      }
    }

    if (direction === 'in' || direction === 'both') {
      const path = findPath(target, subject, maxDepth,
        type === '*' ? null : [type]);
      if (path) {
        found = true;
        return { allowed: true, reason: `Relationship path found: ${path.join(' → ')}`, path, matchedRelationship: { type, target, direction: 'incoming' } };
      }
    }

    if (!found) {
      return {
        allowed: false,
        reason: `No ${direction === 'both' ? 'incoming or outgoing' : direction} relationship of type '${type}' found within ${maxDepth} hops from ${subject} to ${target}`,
      };
    }
  }

  return { allowed: true, reason: 'All relationship requirements satisfied' };
}

// ── Route Registration ───────────────────────────────────────────────────────

export function registerReBACRoutes(app, { auditLog, customAuth }) {

  // POST /api/relationships — create relationship
  app.post('/api/relationships', customAuth, (req, res) => {
    const { from, type, to, metadata } = req.body;

    if (!from || typeof from !== 'string') {
      return res.status(400).json({ error: 'from is required and must be a string' });
    }
    if (!type || !Object.values(RELATIONSHIP_TYPES).includes(type)) {
      return res.status(400).json({
        error: `type is required and must be one of: ${Object.values(RELATIONSHIP_TYPES).join(', ')}`,
      });
    }
    if (!to || typeof to !== 'string') {
      return res.status(400).json({ error: 'to is required and must be a string' });
    }
    if (from === to) {
      return res.status(400).json({ error: 'from and to cannot be the same' });
    }

    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const id = `rel-${++relationshipIdCounter}-${Date.now()}`;
    const rel = {
      id,
      from,
      type,
      to,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      createdBy: req.auth?.sub || 'system',
      tenantId,
    };

    relationshipStore.set(id, rel);
    addToIndex(rel);

    if (auditLog) {
      auditLog({
        event: 'relationship.create',
        userId: req.auth?.sub,
        tenantId,
        data: { id, from, type, to },
        timestamp: rel.createdAt,
      });
    }

    res.status(201).json({ ok: true, relationship: rel });
  });

  // GET /api/relationships — list relationships
  app.get('/api/relationships', customAuth, (req, res) => {
    const { from, to, type, limit = 100, offset = 0 } = req.query;
    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const maxLimit = Math.min(parseInt(limit) || 100, 500);
    const startOffset = parseInt(offset) || 0;

    let results = [...relationshipStore.values()];

    // Tenant isolation
    results = results.filter(r => r.tenantId === tenantId);

    if (from) results = results.filter(r => r.from === from);
    if (to) results = results.filter(r => r.to === to);
    if (type) results = results.filter(r => r.type === type);

    const total = results.length;
    results = results.slice(startOffset, startOffset + maxLimit);

    res.json({
      count: results.length,
      total,
      offset: startOffset,
      limit: maxLimit,
      relationships: results,
    });
  });

  // GET /api/relationships/:id — get one relationship
  app.get('/api/relationships/:id', customAuth, (req, res) => {
    const rel = relationshipStore.get(req.params.id);
    if (!rel) return res.status(404).json({ error: `Relationship '${req.params.id}' not found` });
    res.json({ relationship: rel });
  });

  // DELETE /api/relationships/:id — delete relationship
  app.delete('/api/relationships/:id', customAuth, (req, res) => {
    const rel = relationshipStore.get(req.params.id);
    if (!rel) return res.status(404).json({ error: `Relationship '${req.params.id}' not found` });

    removeFromIndex(rel);
    relationshipStore.delete(req.params.id);

    if (auditLog) {
      auditLog({
        event: 'relationship.delete',
        userId: req.auth?.sub,
        tenantId: req.auth?.tenantId,
        data: { id: req.params.id },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ ok: true, deleted: req.params.id });
  });

  // POST /api/relationships/check — check if relationship exists
  app.post('/api/relationships/check', customAuth, (req, res) => {
    const { from, type, to, maxDepth = 3, direction = 'out' } = req.body;

    if (!from || !type || !to) {
      return res.status(400).json({ error: 'from, type, and to are required' });
    }

    // Direct check first
    if (hasDirectRelationship(from, type, to)) {
      return res.json({ exists: true, path: [from, to], type: 'direct', maxDepth: 1 });
    }

    // Traverse if not direct
    if (direction === 'out') {
      const path = findPath(from, to, maxDepth, [type]);
      return res.json({ exists: !!path, path: path || null, type: path ? 'traversed' : 'none', maxDepth });
    }

    if (direction === 'in') {
      const path = findPath(to, from, maxDepth, [type]);
      return res.json({ exists: !!path, path: path || null, type: path ? 'traversed' : 'none', maxDepth });
    }

    // Both directions
    const pathOut = findPath(from, to, maxDepth, [type]);
    if (pathOut) return res.json({ exists: true, path: pathOut, type: 'traversed-out', maxDepth });

    const pathIn = findPath(to, from, maxDepth, [type]);
    return res.json({ exists: !!pathIn, path: pathIn || null, type: pathIn ? 'traversed-in' : 'none', maxDepth });
  });

  // GET /api/relationships/path — find relationship path between two nodes
  app.get('/api/relationships/path', customAuth, (req, res) => {
    const { from, to, maxDepth = 5, type } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to query params are required' });
    }

    const allowedTypes = type ? type.split(',').map(t => t.trim()) : null;
    const path = findPath(from, to, Math.min(parseInt(maxDepth) || 5, 10), allowedTypes);

    res.json({
      exists: !!path,
      path: path || null,
      from,
      to,
      maxDepth: Math.min(parseInt(maxDepth) || 5, 10),
      typeFilter: allowedTypes,
    });
  });

  // GET /api/relationships/node/:node — get all relationships for a node
  app.get('/api/relationships/node/:node', customAuth, (req, res) => {
    const { direction = 'both', type } = req.query;
    const relationships = getRelationshipsForNode(req.params.node, { direction, type });
    res.json({ node: req.params.node, direction, type: type || null, count: relationships.length, relationships });
  });

  // POST /api/relationships/batch — create multiple relationships
  app.post('/api/relationships/batch', customAuth, (req, res) => {
    const { relationships } = req.body;
    if (!Array.isArray(relationships)) {
      return res.status(400).json({ error: 'relationships must be an array' });
    }
    if (relationships.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 relationships per batch' });
    }

    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const results = [];
    const errors = [];

    for (let i = 0; i < relationships.length; i++) {
      const { from, type, to, metadata } = relationships[i];
      if (!from || !type || !to) {
        errors.push({ index: i, error: 'Missing from, type, or to' });
        continue;
      }
      if (from === to) {
        errors.push({ index: i, error: 'from and to cannot be the same' });
        continue;
      }

      const id = `rel-${++relationshipIdCounter}-${Date.now()}-${i}`;
      const rel = { id, from, type, to, metadata: metadata || {}, createdAt: new Date().toISOString(), createdBy: req.auth?.sub || 'system', tenantId };
      relationshipStore.set(id, rel);
      addToIndex(rel);
      results.push(rel);
    }

    res.status(errors.length === relationships.length ? 400 : 201).json({
      ok: errors.length === 0,
      created: results.length,
      errors: errors.length > 0 ? errors : undefined,
      relationships: results,
    });
  });

  // POST /api/policies/from-relationships — create policy from relationship traversal
  app.post('/api/policies/from-relationships', customAuth, (req, res) => {
    const { name, subject, relationshipType, target, direction = 'out', maxDepth = 3, action = 'read', resource = '*' } = req.body;

    if (!name || !subject || !relationshipType || !target) {
      return res.status(400).json({ error: 'name, subject, relationshipType, and target are required' });
    }

    const path = findPath(subject, target, maxDepth, [relationshipType]);
    const policyId = `rebac-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

    const policy = {
      id: policyId,
      name,
      description: `Access granted based on ${relationshipType} relationship from ${subject} to ${target}${path ? ` (path: ${path.join(' → ')})` : ' (no path found)'}`,
      effect: path ? 'allow' : 'deny',
      version: '1.0',
      subjects: [{ type: 'user', id: subject }],
      resources: [`${resource}:*`],
      actions: Array.isArray(action) ? action : [action],
      conditions: [],
      expression: path ? 'true' : 'false',
      relationshipRequirements: [{ type: relationshipType, direction, target, maxDepth }],
      hybridPolicy: true,
      metadata: {
        parsedFrom: 'relationship-traversal',
        foundPath: path,
        subject,
        target,
        createdAt: new Date().toISOString(),
      },
    };

    res.status(201).json({ ok: true, policy, pathFound: !!path });
  });
}
