/**
 * Graph algorithms for TwinOS Graph Engine
 * Port: 4715
 *
 * Provides:
 * - PageRank (power iteration)
 * - Betweenness centrality (Brandes' algorithm)
 * - Community detection (Louvain-inspired greedy modularity)
 * - Shortest path (weighted Dijkstra)
 * - Utility: build undirected adjacency list from relationships
 */

// ─────────────────────────────────────────────────────────────────────────────
// Utility: build undirected adjacency list from twinRelationships
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an undirected adjacency list from twin relationships.
 * Each relationship creates two directed edges (one each way).
 *
 * @param {Array<{sourceId: string, targetId: string, strength?: number, trust_score?: number}>} relationships
 * @returns {Map<string, Array<{targetId: string, weight: number, strength: number, trust_score: number}>>}
 */
export function buildAdjacency(relationships) {
  const adj = new Map();
  for (const rel of relationships) {
    if (!adj.has(rel.sourceId)) adj.set(rel.sourceId, []);
    if (!adj.has(rel.targetId)) adj.set(rel.targetId, []);
    // Store full relationship metadata on each directional edge
    // Forward edge: A → B
    const forwardEdge = { ...rel };
    forwardEdge.targetId = rel.targetId;
    adj.get(rel.sourceId).push(forwardEdge);

    // Reverse edge: B → A (undirected)
    const reverseEdge = { ...rel };
    reverseEdge.targetId = rel.sourceId;
    adj.get(rel.targetId).push(reverseEdge);
  }
  return adj;
}

// ─────────────────────────────────────────────────────────────────────────────
// PageRank
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute PageRank on an undirected adjacency list using power iteration.
 * For undirected graphs (like TwinOS relationships), we treat edges as
 * bidirectional and normalize by the total out-degree of the source.
 *
 * @param {Map<string, Array<{targetId: string, weight?: number}>>} adjacency
 * @param {object} options
 * @param {number} options.damping  - damping factor (default 0.85)
 * @param {number} options.maxIter - max iterations (default 100)
 * @param {number} options.tol     - convergence tolerance (default 1e-6)
 * @returns {{ ranks: Map<string, number>, iterations: number, converged: boolean }}
 */
export function pageRank(adjacency, { damping = 0.85, maxIter = 100, tol = 1e-6 } = {}) {
  const nodes = Array.from(adjacency.keys());
  const n = nodes.length;
  if (n === 0) return { ranks: new Map(), iterations: 0, converged: true };

  // Build in-links map: targetId → [{sourceId, weight}]
  const inLinks = new Map();
  for (const node of nodes) inLinks.set(node, []);
  for (const [sourceId, edges] of adjacency.entries()) {
    for (const edge of edges) {
      if (inLinks.has(edge.targetId)) {
        inLinks.get(edge.targetId).push({ sourceId, weight: edge.weight ?? 1 });
      }
    }
  }

  // Initialize uniform ranks
  let ranks = new Map(nodes.map(id => [id, 1 / n]));

  for (let iter = 0; iter < maxIter; iter++) {
    // Dangling node contribution: sum of ranks for nodes with no outgoing edges
    let danglingSum = 0;
    for (const [id, edges] of adjacency.entries()) {
      if (edges.length === 0) danglingSum += ranks.get(id) ?? 0;
    }

    let maxDelta = 0;
    const newRanks = new Map();

    for (const node of nodes) {
      let rank = (1 - damping) / n;

      // Sum contributions from all nodes that link to this node
      const linksList = inLinks.get(node) ?? [];
      for (const { sourceId, weight = 1 } of linksList) {
        const outEdges = adjacency.get(sourceId) ?? [];
        const outDegree = outEdges.length;
        if (outDegree > 0) {
          const sourceRank = ranks.get(sourceId) ?? 0;
          rank += damping * sourceRank * weight / outDegree;
        }
      }

      // Add dangling node contribution (distributed equally)
      rank += damping * danglingSum / n;

      newRanks.set(node, rank);
      const delta = Math.abs(rank - (ranks.get(node) ?? 0));
      if (delta > maxDelta) maxDelta = delta;
    }

    ranks = newRanks;
    if (maxDelta < tol) {
      return { ranks, iterations: iter + 1, converged: true };
    }
  }

  return { ranks, iterations: maxIter, converged: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Betweenness centrality (Brandes' algorithm)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute betweenness centrality for all nodes using Brandes' algorithm.
 * Adapted for undirected graphs: each edge contributes 0.5 to both endpoints.
 *
 * @param {Map<string, Array<{targetId: string}>>} adjacency - outgoing edges
 * @returns {Map<string, number>} - node → centrality score
 */
export function betweennessCentrality(adjacency) {
  const nodes = Array.from(adjacency.keys());
  const centrality = new Map(nodes.map(id => [id, 0]));

  for (const source of nodes) {
    // BFS from source
    const dist = new Map(nodes.map(id => [id, -1]));
    const sigma = new Map(nodes.map(id => [id, 0]));
    const pred = new Map(nodes.map(id => [id, []]));

    dist.set(source, 0);
    sigma.set(source, 1);

    const queue = [source];
    const stack = [];

    while (queue.length > 0) {
      const w = queue.shift();
      stack.push(w);
      const dw = dist.get(w);
      const neighbors = (adjacency.get(w) ?? []).map(e => e.targetId);

      for (const v of neighbors) {
        if (dist.get(v) === -1) {
          dist.set(v, dw + 1);
          queue.push(v);
        }
        if (dist.get(v) === dw + 1) {
          sigma.set(v, (sigma.get(v) ?? 0) + (sigma.get(w) ?? 0));
          pred.get(v).push(w);
        }
      }
    }

    // Back-propagation of dependencies
    const delta = new Map(nodes.map(id => [id, 0]));
    while (stack.length > 0) {
      const w = stack.pop();
      const preds = pred.get(w) ?? [];
      for (const v of preds) {
        const sigmaW = sigma.get(w) ?? 0;
        const sigmaV = sigma.get(v) ?? 0;
        if (sigmaW > 0) {
          const contrib = ((sigmaV / sigmaW) * (1 + (delta.get(w) ?? 0)));
          delta.set(v, (delta.get(v) ?? 0) + contrib);
        }
      }
      if (w !== source) {
        centrality.set(w, (centrality.get(w) ?? 0) + (delta.get(w) ?? 0));
      }
    }
  }

  // Normalize: σ(v) / ((n-1)(n-2)) for undirected graphs
  const n = nodes.length;
  if (n > 2) {
    const norm = 1 / ((n - 1) * (n - 2));
    for (const [id, score] of centrality.entries()) {
      centrality.set(id, score * norm);
    }
  }

  return centrality;
}

// ─────────────────────────────────────────────────────────────────────────────
// Community detection (Louvain-inspired greedy modularity)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect communities using greedy modularity optimization.
 *
 * @param {Map<string, Array<{targetId: string, weight?: number}>>} adjacency
 * @returns {Array<{community: number, members: string[]}>}
 */
export function communityDetection(adjacency, { maxIterations = 50 } = {}) {
  const nodes = Array.from(adjacency.keys());
  if (nodes.length === 0) return [];

  // Total edge weight (count each edge once)
  let totalWeight = 0;
  const nodeWeight = new Map();
  for (const [id, edges] of adjacency.entries()) {
    let w = 0;
    for (const e of edges) { w += e.weight ?? 1; }
    nodeWeight.set(id, w);
    totalWeight += w;
  }
  // m2 = 2 * totalWeight (for undirected graph)
  const m2 = totalWeight * 2;
  if (m2 === 0) return [{ community: 0, members: nodes }];

  // Start: each node in its own community
  const community = new Map(nodes.map((id, i) => [id, i]));
  let moved = true;
  let iter = 0;

  function gain(node, targetComm) {
    const neighbors = (adjacency.get(node) ?? []).map(e => e.targetId);

    // Sum of weights from node to target community
    let k_i_in = 0;
    for (const nid of neighbors) {
      if (community.get(nid) === targetComm) {
        const edge = (adjacency.get(node) ?? []).find(e => e.targetId === nid);
        k_i_in += edge?.weight ?? 1;
      }
    }

    const k_i = nodeWeight.get(node) ?? 1;

    // Total weight incident to target community
    let sumTot = 0;
    for (const [nid, edges] of adjacency.entries()) {
      if (community.get(nid) === targetComm) {
        sumTot += nodeWeight.get(nid) ?? 1;
      }
    }

    const deltaQ = (k_i_in / m2) - ((k_i * sumTot) / (m2 * m2));
    return Math.max(0, deltaQ);
  }

  // Phase 1: move nodes to maximize modularity
  while (moved && iter < maxIterations) {
    moved = false;
    iter++;
    for (const node of nodes) {
      const neighbors = (adjacency.get(node) ?? []).map(e => e.targetId);
      const neighborComms = [...new Set(neighbors.map(n => community.get(n)))];

      let bestComm = community.get(node);
      let bestGain = 0;

      for (const c of neighborComms) {
        if (c === community.get(node)) continue;
        const g = gain(node, c);
        if (g > bestGain) { bestGain = g; bestComm = c; }
      }

      if (bestGain > 0 && bestComm !== community.get(node)) {
        community.set(node, bestComm);
        moved = true;
      }
    }
  }

  // Renumber communities to 0..N-1
  const unique = [...new Set(community.values())];
  const renum = new Map(unique.map((c, i) => [c, i]));
  for (const [node, cid] of community.entries()) {
    community.set(node, renum.get(cid));
  }

  // Group by community
  const groups = new Map();
  for (const [node, cid] of community.entries()) {
    if (!groups.has(cid)) groups.set(cid, []);
    groups.get(cid).push(node);
  }

  const communities = [];
  for (const [cid, members] of groups.entries()) {
    communities.push({ community: cid, members });
  }

  return communities.sort((a, b) => b.members.length - a.members.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shortest path (weighted Dijkstra)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dijkstra's algorithm with weighted edges.
 * Weight = 1 / (strength × trust_normalized + epsilon)
 *
 * @param {Map<string, Array<{targetId: string, strength?: number, trust_score?: number}>>} adjacency
 * @param {string} source
 * @param {string|null} target
 * @param {function|null} weightFn
 * @returns {{ distances: Map<string, number>, predecessors: Map<string, string|null>, paths: Map<string, string[]> }}
 */
export function dijkstra(adjacency, source, target = null, weightFn = null) {
  const defaultWeight = (edge) => {
    const s = edge.strength ?? 0.5;
    const t = (edge.trust_score ?? 50) / 100;
    return 1 / (s * t + 0.01);
  };

  const distances = new Map();
  const predecessors = new Map();
  const paths = new Map();
  const visited = new Set();
  const pq = []; // min-priority queue as sorted array

  // Initialize: only nodes in adjacency keys are valid graph nodes
  for (const node of adjacency.keys()) {
    distances.set(node, Infinity);
    predecessors.set(node, null);
  }

  // Source is always a valid node (must be in adjacency)
  if (!distances.has(source)) {
    return { distances: new Map(), predecessors: new Map(), paths: new Map() };
  }

  distances.set(source, 0);
  paths.set(source, [source]);

  const push = (dist, node) => {
    let lo = 0, hi = pq.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pq[mid][0] <= dist) lo = mid + 1; else hi = mid;
    }
    pq.splice(lo, 0, [dist, node]);
  };

  push(0, source);

  while (pq.length > 0) {
    const [dist, node] = pq.shift();
    if (visited.has(node)) continue;
    visited.add(node);

    if (target !== null && node === target) break;

    const edges = adjacency.get(node) ?? [];
    for (const edge of edges) {
      const w = weightFn ? weightFn(edge) : defaultWeight(edge);
      const alt = dist + w;
      const prev = distances.get(edge.targetId) ?? Infinity;
      if (alt < prev) {
        distances.set(edge.targetId, alt);
        predecessors.set(edge.targetId, node);
        const path = paths.get(node);
        paths.set(edge.targetId, path ? [...path, edge.targetId] : [node, edge.targetId]);
        push(alt, edge.targetId);
      }
    }
  }

  return { distances, predecessors, paths };
}
