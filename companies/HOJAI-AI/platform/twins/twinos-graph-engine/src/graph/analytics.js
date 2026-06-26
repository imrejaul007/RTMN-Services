/**
 * Graph analytics utilities for TwinOS Graph Engine
 *
 * Provides:
 * - Global graph statistics
 * - Influence scoring (combine PageRank + betweenness)
 * - Graph density analysis
 * - Clusterability metrics
 */

import { buildAdjacency } from './algorithms.js';

// ─────────────────────────────────────────────────────────────────────────────
// Global graph statistics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute comprehensive graph-level statistics.
 *
 * @param {Array<{sourceId: string, targetId: string, ...}>} relationships
 * @returns {object}
 */
export function graphStats(relationships) {
  const adj = buildAdjacency(relationships);
  const nodes = Array.from(adj.keys());
  const n = nodes.length;

  let totalEdges = relationships.length;
  let directedEdges = totalEdges;
  let totalWeight = 0;
  let activeEdges = 0;
  let expiredEdges = 0;
  let edgeTypeCounts = {};

  const degree = new Map(nodes.map(id => [id, 0]));

  for (const rel of relationships) {
    totalWeight += (rel.strength ?? 0.5) * (rel.trust_score ?? 50) / 100;
    if (!rel.until) activeEdges++;
    else expiredEdges++;

    edgeTypeCounts[rel.type] = (edgeTypeCounts[rel.type] || 0) + 1;

    // Undirected degree: each relationship contributes to both endpoints
    degree.set(rel.sourceId, (degree.get(rel.sourceId) || 0) + 1);
    degree.set(rel.targetId, (degree.get(rel.targetId) || 0) + 1);
  }

  const avgDegree = n > 0 ? Array.from(degree.values()).reduce((s, d) => s + d, 0) / n : 0;
  const maxDegree = n > 0 ? Math.max(...degree.values()) : 0;
  const minDegree = n > 0 ? Math.min(...degree.values()) : 0;

  // Graph density (undirected): E / (V * (V-1) / 2)
  const possibleEdges = n > 1 ? (n * (n - 1)) / 2 : 0;
  const density = possibleEdges > 0 ? directedEdges / possibleEdges : 0;

  // Is the graph connected?
  const visited = new Set();
  const queue = [nodes[0]];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const { targetId } of (adj.get(current) ?? [])) {
      if (!visited.has(targetId)) queue.push(targetId);
    }
  }
  const isConnected = visited.size === n;

  // Connected components
  const components = [];
  const seen = new Set();
  for (const node of nodes) {
    if (seen.has(node)) continue;
    const component = [];
    const q = [node];
    while (q.length > 0) {
      const curr = q.shift();
      if (seen.has(curr)) continue;
      seen.add(curr);
      component.push(curr);
      for (const { targetId } of (adj.get(curr) ?? [])) {
        if (!seen.has(targetId)) q.push(targetId);
      }
    }
    components.push(component);
  }

  // Average clustering coefficient (local transitivity)
  let clusteringSum = 0;
  let clusteringCount = 0;
  for (const node of nodes) {
    const neighbors = (adj.get(node) ?? []).map(e => e.targetId);
    const k = neighbors.length;
    if (k < 2) continue;
    let triangles = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const ni = neighbors[i];
        const nj = neighbors[j];
        const niNeighbors = new Set((adj.get(ni) ?? []).map(e => e.targetId));
        if (niNeighbors.has(nj)) triangles++;
      }
    }
    clusteringSum += (2 * triangles) / (k * (k - 1));
    clusteringCount++;
  }
  const avgClustering = clusteringCount > 0 ? clusteringSum / clusteringCount : 0;

  return {
    nodes: n,
    edges: totalEdges,
    active_edges: activeEdges,
    expired_edges: expiredEdges,
    possible_edges: possibleEdges,
    density: Math.round(density * 1000) / 1000,
    is_connected: isConnected,
    connected_components: components.length,
    largest_component_size: components.length > 0
      ? Math.max(...components.map(c => c.length))
      : 0,
    avg_degree: Math.round(avgDegree * 100) / 100,
    max_degree: maxDegree,
    min_degree: minDegree,
    avg_weight: n > 0 ? Math.round((totalWeight / n) * 100) / 100 : 0,
    avg_clustering: Math.round(avgClustering * 1000) / 1000,
    edge_types: edgeTypeCounts
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Influence scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Combine PageRank and betweenness into a single influence score.
 *
 * @param {Map<string, number>} pageRanks - node → rank
 * @param {Map<string, number>} betweenness - node → centrality
 * @param {object} options
 * @returns {Map<string, object>} - node → { influence, pagerank, betweenness, rank }
 */
export function influenceScoring(pageRanks, betweenness, { pagerankWeight = 0.5, betweennessWeight = 0.5 } = {}) {
  // Normalize both scores to 0-1
  const prValues = Array.from(pageRanks.values());
  const bwValues = Array.from(betweenness.values());
  const prMax = Math.max(...prValues, 0.0001);
  const bwMax = Math.max(...bwValues, 0.0001);

  const result = new Map();

  for (const [node, pr] of pageRanks.entries()) {
    const bw = betweenness.get(node) ?? 0;
    const normPR = pr / prMax;
    const normBW = bw / bwMax;
    const influence = pagerankWeight * normPR + betweennessWeight * normBW;

    result.set(node, {
      influence: Math.round(influence * 1000) / 1000,
      pagerank: Math.round(pr * 1000) / 1000,
      pagerank_normalized: Math.round(normPR * 1000) / 1000,
      betweenness: Math.round(bw * 1000) / 1000,
      betweenness_normalized: Math.round(normBW * 1000) / 1000,
      rank: 0 // filled below
    });
  }

  // Rank by influence descending
  const sorted = [...result.entries()].sort((a, b) => b[1].influence - a[1].influence);
  sorted.forEach(([node, data], i) => {
    resultget(node).rank = i + 1;
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Top influencers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return top-N influencers from precomputed influence scores.
 *
 * @param {Map<string, object>} influenceScores - from influenceScoring()
 * @param {number} limit
 * @returns {object[]}
 */
export function topInfluencers(influenceScores, limit = 10) {
  return [...influenceScores.entries()]
    .sort((a, b) => a[1].rank - b[1].rank)
    .slice(0, limit)
    .map(([node, data]) => ({
      node,
      rank: data.rank,
      influence: data.influence,
      pagerank: data.pagerank,
      betweenness: data.betweenness,
      tier: data.rank <= 3 ? 'top-3'
        : data.rank <= 10 ? 'top-10'
        : data.rank <= 50 ? 'top-50'
        : 'standard'
    }));
}
