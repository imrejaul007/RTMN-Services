/**
 * Graph traversal utilities for TwinOS Graph Engine
 *
 * Provides:
 * - Temporal BFS (respects start_time / end_time)
 * - Weighted traversal (uses trust × strength as traversal cost)
 * - N-degree connection analysis
 */

import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// Temporal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a relationship edge was active at the given timestamp(s).
 * @param {object} rel - relationship object with since / until / createdAt
 * @param {number|null} queryAt  - Unix ms timestamp
 * @param {number|null} queryFrom - Unix ms timestamp
 * @param {number|null} queryTo   - Unix ms timestamp
 * @returns {boolean}
 */
export function edgeIsActive(rel, queryAt = null, queryFrom = null, queryTo = null) {
  // Normalize all inputs to timestamps (milliseconds since epoch)
  const toTimestamp = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return v;
    return new Date(v).getTime();
  };

  const created = toTimestamp(rel.createdAt);
  const since   = toTimestamp(rel.since) ?? created;
  const until   = toTimestamp(rel.until) ?? Infinity;

  const tsQueryAt   = toTimestamp(queryAt);
  const tsQueryFrom = toTimestamp(queryFrom);
  const tsQueryTo   = toTimestamp(queryTo);

  if (tsQueryAt !== null) {
    // Point-in-time query: edge active if query time is within [since, until]
    return tsQueryAt >= since && tsQueryAt <= until;
  }

  if (tsQueryFrom !== null) {
    // Range query: default upper bound to current time
    const to = tsQueryTo !== null ? tsQueryTo : Date.now();
    // Edge active if its [since, until] overlaps with [queryFrom, queryTo]
    // Overlap = !(edge.until < query.from OR edge.since > query.to)
    const overlaps = !(until < tsQueryFrom || since > to);
    return overlaps;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Temporal BFS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BFS traversal with optional temporal filtering.
 *
 * @param {string} rootId
 * @param {Array<{sourceId: string, targetId: string, ...}>} relationships
 * @param {object} options
 * @param {number} options.maxDepth
 * @param {string[]} options.typeFilter
 * @param {number|null} options.queryAt   - point-in-time filter
 * @param {number|null} options.queryFrom - range start
 * @param {number|null} options.queryTo   - range end
 * @param {number|null} options.minStrength
 * @param {number|null} options.minTrust
 * @param {boolean} options.includeExpired
 * @returns {{ nodes: object[], edges: object[], visited: Set, stats: object }}
 */
export function temporalBFS(rootId, relationships, {
  maxDepth = 2,
  typeFilter = null,
  queryAt = null,
  queryFrom = null,
  queryTo = null,
  minStrength = null,
  minTrust = null,
  includeExpired = false
} = {}) {
  const nodes = [];
  const edges = [];
  const visited = new Set([rootId]);
  const frontier = [rootId];

  nodes.push({ id: rootId, depth: 0, type: 'root' });

  for (let d = 0; d < maxDepth; d++) {
    const next = [];
    for (const currentId of frontier) {
      for (const rel of relationships) {
        // Only follow edges that originate from or point to currentId
        if (rel.sourceId !== currentId && rel.targetId !== currentId) continue;
        if (typeFilter && !typeFilter.includes(rel.type)) continue;

        // Temporal filter
        if (!edgeIsActive(rel, queryAt, queryFrom, queryTo)) {
          if (!includeExpired) continue;
        }

        // Enrichment filters
        if (minStrength !== null && (rel.strength ?? 0.5) < minStrength) continue;
        if (minTrust !== null && (rel.trust_score ?? 50) < minTrust) continue;

        const neighbor = rel.sourceId === currentId ? rel.targetId : rel.sourceId;

        // Temporal metadata
        const edgeWithMeta = {
          ...rel,
          depth: d + 1,
          from: currentId,
          is_expired: rel.until !== null && new Date(rel.until).getTime() <= (queryAt ?? Date.now()),
          effective_range: {
            from: rel.since || rel.createdAt,
            to: rel.until || null
          }
        };
        edges.push(edgeWithMeta);

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nodes.push({ id: neighbor, depth: d + 1, type: 'traversed' });
          next.push(neighbor);
        }
      }
    }
    frontier.length = 0;
    frontier.push(...next);
    if (frontier.length === 0) break;
  }

  return {
    nodes,
    edges,
    visited,
    stats: {
      total_nodes: nodes.length,
      total_edges: edges.length,
      max_depth_reached: maxDepth,
      query_at: queryAt ? new Date(queryAt).toISOString() : null,
      query_range: queryFrom && queryTo
        ? { from: new Date(queryFrom).toISOString(), to: new Date(queryTo).toISOString() }
        : null,
      min_strength_filter: minStrength,
      min_trust_filter: minTrust
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// N-degree connection analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find all twins reachable within N hops and classify them by distance.
 *
 * @param {string} rootId
 * @param {Array} relationships
 * @param {number} maxHops
 * @returns {object}
 */
export function nDegreeConnections(rootId, relationships, maxHops = 3) {
  const byHop = new Map();
  for (let i = 1; i <= maxHops; i++) byHop.set(i, []);

  const visited = new Map([[rootId, 0]]);
  const queue = [[rootId, 0]];

  while (queue.length > 0) {
    const [currentId, depth] = queue.shift();
    if (depth >= maxHops) continue;

    for (const rel of relationships) {
      if (rel.sourceId !== currentId && rel.targetId !== currentId) continue;
      const neighbor = rel.sourceId === currentId ? rel.targetId : rel.sourceId;

      if (!visited.has(neighbor) || visited.get(neighbor) > depth + 1) {
        visited.set(neighbor, depth + 1);
        queue.push([neighbor, depth + 1]);
        if (depth + 1 <= maxHops) {
          byHop.get(depth + 1).push({
            id: neighbor,
            relationship: rel,
            relationshipId: rel.id,
            depth: depth + 1
          });
        }
      }
    }
  }

  // Convert to sorted array
  const allConnections = [];
  for (const [hop, twins] of byHop.entries()) {
    for (const twin of twins) {
      allConnections.push(twin);
    }
  }

  return {
    root: rootId,
    max_hops: maxHops,
    total_reachable: allConnections.length,
    by_hop: Object.fromEntries(
      Array.from(byHop.entries()).map(([h, arr]) => [h, arr])
    ),
    connections: allConnections
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommend connections
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a twin, recommend who it should connect to.
 * Uses "friends of friends" + trust scoring.
 *
 * @param {string} twinId
 * @param {Array} relationships
 * @param {Map} twinRegistry
 * @param {object} options
 * @returns {object[]}
 */
export function recommendConnections(twinId, relationships, twinRegistry, {
  maxSuggestions = 10,
  minConfidence = 0.3
} = {}) {
  // Step 1: Get all direct neighbors
  const directNeighbors = new Set();
  for (const rel of relationships) {
    if (rel.sourceId === twinId) directNeighbors.add(rel.targetId);
    if (rel.targetId === twinId) directNeighbors.add(rel.sourceId);
  }
  directNeighbors.add(twinId); // exclude self

  // Step 2: Friends-of-friends scoring
  const foafScores = new Map(); // targetId → { score, mutualConnections, trustSum }

  for (const rel of relationships) {
    const other = rel.sourceId === twinId ? rel.targetId
                 : rel.targetId === twinId ? rel.sourceId
                 : null;
    if (!other) continue;

    // Look for second-degree connections through this neighbor
    for (const rel2 of relationships) {
      if (rel2.sourceId !== other && rel2.targetId !== other) continue;
      const candidate = rel2.sourceId === other ? rel2.targetId : rel2.sourceId;
      if (candidate === twinId || directNeighbors.has(candidate)) continue;

      const existing = foafScores.get(candidate) || { score: 0, mutualConnections: 0, trustSum: 0 };
      existing.mutualConnections++;
      existing.trustSum += (rel.trust_score ?? 50) * (rel2.trust_score ?? 50) / 100;
      existing.score = existing.mutualConnections * (existing.trustSum / existing.mutualConnections / 100);

      // Also factor in shared memory count
      existing.score += (rel.shared_memories ?? 0) * 0.1;

      foafScores.set(candidate, existing);
    }
  }

  // Step 3: Sort by score and return top-N
  const suggestions = Array.from(foafScores.entries())
    .map(([id, data]) => ({
      targetId: id,
      twin: twinRegistry?.get ? twinRegistry.get(id) : null,
      confidence: Math.min(1, data.score),
      mutual_connections: data.mutualConnections,
      avg_trust: data.mutualConnections > 0 ? data.trustSum / data.mutualConnections : 0,
      reason: data.mutualConnections > 1 ? 'multiple_mutual_connections' : 'single_mutual_connection'
    }))
    .filter(s => s.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSuggestions);

  return {
    twinId,
    total_candidates_evaluated: foafScores.size,
    suggestions
  };
}
