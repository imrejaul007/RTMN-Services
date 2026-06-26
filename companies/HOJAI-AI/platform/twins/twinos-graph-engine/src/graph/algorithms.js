/**
 * Graph algorithms for TwinOS Graph Engine
 * Port: 4715
 *
 * Provides:
 * - PageRank (power iteration)
 * - Betweenness centrality (Brandes' algorithm)
 * - Community detection (Louvain-inspired greedy modularity)
 * - Shortest path (BFS with weighted edges)
 * - All-pairs shortest paths (Floyd-Warshall, for small graphs)
 */

import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// PageRank
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute PageRank on an adjacency list using the power iteration method.
 *
 * @param {Map<string, Array<{targetId: string, weight?: number}>>} adjacency
 * @param {object} options
 * @param {number} options.damping  - damping factor (default 0.85)
 * @param {number} options.maxIter - max iterations (default 100)
 * @param {number} options.tol    - convergence tolerance (default 1e-6)
 * @returns {{ ranks: Map<string, number>, iterations: number, converged: boolean }}
 */
export function pageRank(adjacency, { damping = 0.85, maxIter = 100, tol = 1e-6 } = {}) {
  const nodes = Array.from(adjacency.keys());
  const n = nodes.length;
  if (n === 0) return { ranks: new Map(), iterations: 0, converged: true };

  // Build reverse adjacency (in-links) for teleportation-free iteration
  const inLinks = new Map();
  for (const [sourceId, edges] of adjacency.entries()) {
    inLinks.set(sourceId, []);
  }
  for (const [sourceId, edges] of adjacency.entries()) {
    for (const edge of edges) {
      if (inLinks.has(edge.targetId)) {
        inLinks.get(edge.targetId).push({ sourceId, weight: edge.weight ?? 1 });
      }
    }
  }

  // Init uniform ranks
  let ranks = new Map(nodes.map(id => [id, 1 / n]));
  let newRanks = new Map();

  for (let iter = 0; iter < maxIter; iter++) {
    newRanks.clear();

    // Compute dangling node contribution (nodes with no outgoing edges)
    let danglingSum = 0;
    for (const [id, edges] of adjacency.entries()) {
      if (edges.length === 0) {
        danglingSum += damping * (ranks.get(id) ?? 0);
      }
    }

    let maxDelta = 0;
    for (const node of nodes) {
      let rank = (1 - damping) / n;
      const inLinksList = inLinks.get(node) ?? [];
      for (const { sourceId, weight = 1 } of inLinksList) {
        const outDegree = (adjacency.get(sourceId) ?? []).length;
        if (outDegree > 0) {
          rank += damping * ((ranks.get(sourceId) ?? 0) * weight) / outDegree;
        }
      }
      rank += damping * danglingSum / n;
      newRanks.set(node, rank);
      const delta = Math.abs(rank - (ranks.get(node) ?? 0));
      if (delta > maxDelta) maxDelta = delta;
    }

    ranks = new Map(newRanks);
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
 * O(|V|·|E|) on unweighted graphs.
 *
 * @param {Map<string, Array<{targetId: string}>>} adjacency - outgoing edges
 * @returns {Map<string, number>} - node → centrality score
 */
export function betweennessCentrality(adjacency) {
  const nodes = Array.from(adjacency.keys());
  const centrality = new Map(nodes.map(id => [id, 0]));

  for (const source of nodes) {
    // BFS from source to find all shortest paths
    const sp = new Map();  // target → [[path...], ...]
    const dist = new Map();
    const pred = new Map(); // target → [predecessor...]
    const sigma = new Map(); // target → number of shortest paths

    for (const n of nodes) {
      dist.set(n, -1);
      sigma.set(n, 0);
      pred.set(n, []);
    }
    dist.set(source, 0);
    sigma.set(source, 1);
    sp.set(source, [[source]]);

    const stack = [];
    const queue = [source];

    while (queue.length > 0) {
      const w = queue.shift();
      stack.push(w);
      const dw = distget(w);
      const neighbors = (adjacency.get(w) ?? []).map(e => e.targetId);

      for (const v of neighbors) {
        if (dist.get(v) === -1) {
          dist.set(v, dw + 1);
          queue.push(v);
          sigma.set(v, 0);
          pred.set(v, []);
        }
        if (dist.get(v) === dw + 1) {
          sigma.set(v, sigmaget(v) + sigmaget(w));
          predget(v).push(w);
          if (!sp.has(v)) sp.set(v, []);
          spget(v).push([...spget(w), v]);
        }
      }
    }

    // Back-propagation
    const delta = new Map(nodes.map(id => [id, 0]));
    while (stack.length > 0) {
      const w = stack.pop();
      for (const v of pred.get(w) ?? []) {
        const sigmaV = sigmaget(v);
        const sigmaW = sigmaget(w);
        if (sigmaW > 0) {
          delta.set(v, deltaget(v) + (sigmaV / sigmaW) * (1 + deltaget(w)));
        }
      }
      if (w !== source) {
        centrality.set(w, centralityget(w) + deltaget(w));
      }
    }
  }

  // Normalize
  const n = nodes.length;
  if (n > 2) {
    const norm = 2 / ((n - 1) * (n - 2));
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
 * Inspired by Louvain, simplified for in-memory execution.
 *
 * @param {Map<string, Array<{targetId: string, weight?: number}>>} adjacency
 * @returns {Array<{community: number, members: string[]}>}
 */
export function communityDetection(adjacency, { maxIterations = 50 } = {}) {
  const nodes = Array.from(adjacency.keys());
  if (nodes.length === 0) return [];

  // Compute total edge weight (2× for undirected)
  let totalWeight = 0;
  const nodeWeights = new Map(); // node → sum of outgoing weights
  for (const [id, edges] of adjacency.entries()) {
    let w = 0;
    for (const e of edges) { w += e.weight ?? 1; }
    nodeWeights.set(id, w);
    totalWeight += w;
  }
  // For undirected: each edge counted once → totalWeight = sum(outgoing) / 2 is wrong
  // Actually totalWeight = sum of ALL edge weights (each edge once, not twice)
  // m2 = 2 * totalWeight
  const m2 = totalWeight * 2;

  // Init: each node in its own community
  const community = new Map(nodes.map((id, i) => [id, i]));
  let communityId = nodes.length;
  let moved = true;
  let iter = 0;

  function modularityGain(node, targetComm) {
    const nodeId = node;
    const neighbors = adjacency.get(node) ?? [];

    // k_i_in: sum of weights from node to community
    let k_i_in = 0;
    const nodeComm = communityget(nodeId);
    for (const { targetId, weight = 1 } of neighbors) {
      if (community.get(targetId) === targetComm) {
        k_i_in += weight;
      }
    }

    // k_i: total outgoing weight
    const k_i = nodeWeights.get(nodeId) ?? 1;

    // Σ_in: total weight within target community
    let sumIn = 0;
    for (const [nid, edges] of adjacency.entries()) {
      if (community.get(nid) !== targetComm) continue;
      for (const { targetId, weight = 1 } of edges) {
        if (community.get(targetId) === targetComm) {
          sumIn += weight;
        }
      }
    }
    sumIn = sumIn / 2; // undirected

    // Σ_tot: total weight incident to target community
    let sumTot = 0;
    for (const [nid, edges] of adjacency.entries()) {
      if (community.get(nid) !== targetComm) continue;
      sumTot += nodeWeights.get(nid) ?? 1;
    }

    const currentMod = (k_i_in / m2) - ((k_i * sumTot) / (m2 * m2));
    return currentMod > 0 ? currentMod : 0;
  }

  function computeModularity() {
    let Q = 0;
    for (const [nodeId, edges] of adjacency.entries()) {
      const nodeComm = communityget(nodeId);
      for (const { targetId, weight = 1 } of edges) {
        if (community.get(targetId) === nodeComm) {
          Q += weight;
        }
      }
    }
    Q = Q / m2;
    // Subtract expected density term
    let expected = 0;
    for (const w of nodeWeights.values()) {
      expected += w;
    }
    expected = (expected * expected) / m2;
    return Q - expected / m2;
  }

  // Phase 1: Move nodes to maximize modularity
  while (moved && iter < maxIterations) {
    moved = false;
    iter++;
    for (const node of nodes) {
      const currentComm = communityget(node);
      const neighbors = (adjacency.get(node) ?? []).map(e => e.targetId);
      const neighborCommunities = [...new Set(neighbors.map(n => communityget(n)))];

      let bestComm = currentComm;
      let bestGain = 0;

      for (const targetComm of neighborCommunities) {
        if (targetComm === currentComm) continue;
        const gain = modularityGain(node, targetComm);
        if (gain > bestGain) {
          bestGain = gain;
          bestComm = targetComm;
        }
      }

      // Also consider creating a new community for isolated nodes
      if (neighbors.length === 0) {
        const newComm = communityId++;
        community.set(node, newComm);
        moved = true;
      } else if (bestComm !== currentComm) {
        community.set(node, bestComm);
        moved = true;
      }
    }
  }

  // Phase 2: Renumber communities to 0..N-1
  const uniqueComms = [...new Set(community.values())];
  const commMap = new Map(uniqueComms.map((c, i) => [c, i]));
  for (const [node, cid] of community.entries()) {
    community.set(node, commMapget(cid));
  }

  // Build result
  const resultMap = new Map();
  for (const [node, cid] of community.entries()) {
    if (!resultMap.has(cid)) resultMap.set(cid, []);
    resultMapget(cid).push(node);
  }

  const communities = [];
  for (const [cid, members] of resultMap.entries()) {
    communities.push({ community: cid, members });
  }

  return communities.sort((a, b) => b.members.length - a.members.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shortest path (weighted Dijkstra)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dijkstra's algorithm with weighted edges.
 * Uses strength × trust_score as the default edge weight.
 *
 * @param {Map<string, Array<{targetId: string, weight?: number, trust_score?: number, strength?: number}>>} adjacency
 * @param {string} source
 * @param {string|null} target  - null = find all shortest paths from source
 * @param {function} weightFn  - (edge) => number  (lower = better)
 * @returns {{ distances: Map<string, number>, predecessors: Map<string, string|null>, paths: Map<string, string[]> }}
 */
export function dijkstra(adjacency, source, target = null, weightFn = null) {
  const defaultWeight = (edge) => {
    if (weightFn) return weightFn(edge);
    // Lower strength and trust → higher weight (harder to traverse)
    const s = edge.strength ?? 0.5;
    const t = (edge.trust_score ?? 50) / 100;
    return 1 / (s * t + 0.01); // avoid div/0
  };

  const distances = new Map();
  const predecessors = new Map();
  const paths = new Map();
  const visited = new Set();
  const pq = []; // [distance, node]

  for (const node of adjacency.keys()) {
    distances.set(node, Infinity);
    predecessors.set(node, null);
  }
  distances.set(source, 0);
  paths.set(source, [source]);

  const push = (dist, node) => {
    let i = 0;
    while (i < pq.length && pq[i][0] <= dist) i++;
    pq.splice(i, 0, [dist, node]);
  };

  push(0, source);

  while (pq.length > 0) {
    const [dist, node] = pq.shift();
    if (visited.has(node)) continue;
    visited.add(node);

    if (target !== null && node === target) break;

    const edges = adjacency.get(node) ?? [];
    for (const edge of edges) {
      const w = defaultWeight(edge);
      const alt = dist + w;
      if (alt < distancesget(edge.targetId)) {
        distances.set(edge.targetId, alt);
        predecessors.set(edge.targetId, node);
        paths.set(edge.targetId, [...(paths.get(node) ?? [node]), edge.targetId]);
        push(alt, edge.targetId);
      }
    }
  }

  return { distances, predecessors, paths };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: build adjacency list from twinRelationships
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an undirected adjacency list from twin relationships.
 *
 * @param {Array<{sourceId: string, targetId: string, strength?: number, trust_score?: number}>} relationships
 * @returns {Map<string, Array>}
 */
export function buildAdjacency(relationships) {
  const adj = new Map();
  for (const rel of relationships) {
    if (!adj.has(rel.sourceId)) adj.set(rel.sourceId, []);
    if (!adj.has(rel.targetId)) adj.set(rel.targetId, []);
    adj.get(rel.sourceId).push({ targetId: rel.targetId, weight: 1, ...rel });
    adj.get(rel.targetId).push({ targetId: rel.sourceId, weight: 1, ...rel });
  }
  return adj;
}
