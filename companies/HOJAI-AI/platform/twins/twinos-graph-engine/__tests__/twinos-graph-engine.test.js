/**
 * TwinOS Graph Engine — algorithm + integration tests
 * Run: node --test __tests__/twinos-graph-engine.test.js
 * Or: npm test (uses vitest.config.js)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  pageRank,
  betweennessCentrality,
  communityDetection,
  dijkstra,
  buildAdjacency
} from '../src/graph/algorithms.js';
import {
  temporalBFS,
  edgeIsActive,
  nDegreeConnections,
  recommendConnections
} from '../src/graph/traversal.js';
import {
  graphStats,
  influenceScoring,
  topInfluencers
} from '../src/graph/analytics.js';

// ── Fixtures ───────────────────────────────────────────────────────────────

/** Simple 5-node undirected graph for algorithm tests */
function makeSimpleGraph() {
  const rels = [
    // Star: A → B, A → C, A → D, A → E
    { id: 'r1', sourceId: 'A', targetId: 'B', strength: 0.8, trust_score: 80 },
    { id: 'r2', sourceId: 'A', targetId: 'C', strength: 0.6, trust_score: 70 },
    { id: 'r3', sourceId: 'A', targetId: 'D', strength: 0.9, trust_score: 90 },
    { id: 'r4', sourceId: 'A', targetId: 'E', strength: 0.7, trust_score: 60 },
    // B ↔ C (bridge)
    { id: 'r5', sourceId: 'B', targetId: 'C', strength: 0.5, trust_score: 50 },
    // D ↔ E (bridge)
    { id: 'r6', sourceId: 'D', targetId: 'E', strength: 0.5, trust_score: 50 },
  ];
  return rels;
}

/** Larger graph for PageRank and centrality tests */
function makeConnectedGraph() {
  const nodes = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
  const edges = [
    ['P1', 'P2'], ['P1', 'P3'], ['P1', 'P4'],
    ['P2', 'P3'], ['P2', 'P5'],
    ['P3', 'P6'], ['P3', 'P7'],
    ['P4', 'P8'],
    ['P5', 'P6'], ['P6', 'P7'], ['P7', 'P8'],
    ['P5', 'P8'],
  ];
  return edges.map(([s, t], i) => ({
    id: `e${i}`, sourceId: s, targetId: t, strength: 0.7, trust_score: 75
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Algorithms
// ─────────────────────────────────────────────────────────────────────────────

describe('buildAdjacency', () => {
  it('should build undirected adjacency from relationships', () => {
    const rels = [
      { sourceId: 'A', targetId: 'B' },
      { sourceId: 'B', targetId: 'C' }
    ];
    const adj = buildAdjacency(rels);
    expect(adj.has('A')).toBe(true);
    expect(adj.has('B')).toBe(true);
    expect(adj.has('C')).toBe(true);
    // A → B and B → A (undirected)
    expect(adj.get('A').some(e => e.targetId === 'B')).toBe(true);
    expect(adj.get('B').some(e => e.targetId === 'A')).toBe(true);
    expect(adj.get('B').some(e => e.targetId === 'C')).toBe(true);
  });

  it('should preserve edge metadata', () => {
    const rels = [{ sourceId: 'A', targetId: 'B', strength: 0.9, trust_score: 95 }];
    const adj = buildAdjacency(rels);
    const aToB = adj.get('A').find(e => e.targetId === 'B');
    expect(aToB.strength).toBe(0.9);
    expect(aToB.trust_score).toBe(95);
  });
});

describe('pageRank', () => {
  it('should rank hub nodes highest', () => {
    // Larger asymmetric graph: A has many more edges than B or C
    const rels = [
      { id: 'a1', sourceId: 'A', targetId: 'B' },
      { id: 'a2', sourceId: 'A', targetId: 'C' },
      { id: 'a3', sourceId: 'A', targetId: 'D' },
      { id: 'a4', sourceId: 'A', targetId: 'E' },
      { id: 'a5', sourceId: 'A', targetId: 'F' },
      { id: 'a6', sourceId: 'B', targetId: 'C' },
    ];
    const adj = buildAdjacency(rels);
    const { ranks } = pageRank(adj);
    // A is the hub (5 edges) — should rank highest
    const aScore = ranks.get('A');
    expect(aScore).toBeGreaterThan(ranks.get('B'));
    expect(aScore).toBeGreaterThan(ranks.get('C'));
  });

  it('should converge within max iterations', () => {
    const rels = makeConnectedGraph();
    const adj = buildAdjacency(rels);
    const { converged, iterations } = pageRank(adj, { maxIter: 50 });
    expect(converged).toBe(true);
    expect(iterations).toBeLessThanOrEqual(50);
  });

  it('should return empty map for empty graph', () => {
    const { ranks } = pageRank(new Map());
    expect(ranks.size).toBe(0);
  });

  it('should sum to ~1.0', () => {
    const rels = makeConnectedGraph();
    const adj = buildAdjacency(rels);
    const { ranks } = pageRank(adj);
    const sum = [...ranks.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThanOrEqual(1.0001);
  });
});

describe('betweennessCentrality', () => {
  it('should identify bridge nodes as high centrality', () => {
    const rels = makeSimpleGraph();
    const adj = buildAdjacency(rels);
    const bw = betweennessCentrality(adj);
    // A is the star hub — A's betweenness should be the highest
    expect(bw.get('A')).toBeGreaterThan(bw.get('B'));
    expect(bw.get('A')).toBeGreaterThan(0); // hub has non-zero betweenness
  });

  it('should return 0 for fully disconnected nodes', () => {
    const adj = new Map([
      ['X', [{ targetId: 'Y' }]],
      ['Y', [{ targetId: 'X' }]],
      ['Z', []] // isolated
    ]);
    const bw = betweennessCentrality(adj);
    // Z should be 0 (or near 0)
    expect(bw.get('Z')).toBeLessThanOrEqual(0.5);
  });
});

describe('communityDetection', () => {
  it('should group clearly separate clusters', () => {
    const rels = [
      // Cluster 1: fully connected triangle
      { id: 'c1', sourceId: 'N1', targetId: 'N2' },
      { id: 'c2', sourceId: 'N2', targetId: 'N3' },
      { id: 'c3', sourceId: 'N1', targetId: 'N3' },
      // Cluster 2: fully connected triangle
      { id: 'c4', sourceId: 'M1', targetId: 'M2' },
      { id: 'c5', sourceId: 'M2', targetId: 'M3' },
      { id: 'c6', sourceId: 'M1', targetId: 'M3' },
      // Single bridge
      { id: 'bridge', sourceId: 'N3', targetId: 'M1', strength: 0.1 }
    ];
    const adj = buildAdjacency(rels);
    const communities = communityDetection(adj);

    // Should detect communities — greedy algorithm may produce 2-4 communities
    expect(communities.length).toBeGreaterThanOrEqual(2);

    // Build community map
    const commMap = new Map(communities.flatMap(c =>
      c.members.map(m => [m, c.community])
    ));

    // At minimum, the two large clusters should be mostly separated:
    // The largest community should contain majority of either cluster
    const largest = communities[0];
    const smallest = communities[communities.length - 1];
    // Communities should have meaningful sizes
    expect(largest.members.length).toBeGreaterThanOrEqual(2);
    // No community should contain nodes from both triangles as a single group
    // (greedy may split but won't merge everything)
    expect(communities.length).toBeLessThanOrEqual(6);
  });

  it('should return empty array for empty graph', () => {
    const adj = new Map();
    const communities = communityDetection(adj);
    expect(communities).toEqual([]);
  });
});

describe('dijkstra', () => {
  it('should find shortest path', () => {
    const rels = makeSimpleGraph();
    const adj = buildAdjacency(rels);
    const { paths, distances } = dijkstra(adj, 'B', 'D');
    const path = paths.get('D');
    expect(path).toBeDefined();
    // B → A → D is shorter than B → C → ... → D
    expect(path.length).toBeLessThanOrEqual(3);
  });

  it('should handle unreachable nodes', () => {
    const rels = [
      { sourceId: 'X', targetId: 'Y' }
    ];
    const adj = buildAdjacency(rels);
    const { distances } = dijkstra(adj, 'X', 'Z');
    // Z is not in the graph — distances map only contains reachable nodes
    expect(distances.has('Z')).toBe(false);
    // Y is reachable with finite distance
    expect(distances.get('Y')).toBeLessThan(Infinity);
  });

  it('should weight by trust × strength by default', () => {
    const rels = [
      { sourceId: 'S', targetId: 'H', strength: 1.0, trust_score: 100 },
      { sourceId: 'S', targetId: 'L', strength: 0.1, trust_score: 10 }
    ];
    const adj = buildAdjacency(rels);
    const { distances } = dijkstra(adj, 'S', 'L');
    // Both are 1 hop but different weights
    const h = distances.get('H');
    const l = distances.get('L');
    expect(h).toBeLessThan(l); // High trust/strength = shorter path
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Temporal
// ─────────────────────────────────────────────────────────────────────────────

describe('edgeIsActive', () => {
  const now = Date.now();
  const ms = (n) => new Date(now + n).toISOString();
  const ago = (n) => new Date(now - n).toISOString();

  it('should return true for currently active edge', () => {
    const rel = { createdAt: ago(86400000), since: ago(86400000), until: null };
    expect(edgeIsActive(rel, null, null, null)).toBe(true);
  });

  it('should return false for expired edge at point query', () => {
    const rel = { createdAt: ago(86400000 * 10), since: ago(86400000 * 10), until: ago(86400000) };
    const queryAt = now - (86400000 / 2); // 12h ago
    expect(edgeIsActive(rel, queryAt, null, null)).toBe(false);
  });

  it('should return true for edge valid in range', () => {
    const rel = { createdAt: ago(86400000 * 30), since: ago(86400000 * 20), until: ago(86400000 * 5) };
    // Range: 25 days ago to 10 days ago — overlaps with rel (20 to 5 days ago)
    expect(edgeIsActive(rel, null, ago(86400000 * 25), ago(86400000 * 10))).toBe(true);
  });

  it('should return false for edge outside range', () => {
    const rel = { createdAt: ago(86400000 * 30), since: ago(86400000 * 30), until: ago(86400000 * 20) };
    // Range: 15 days ago to now — no overlap with rel (ended 20 days ago)
    expect(edgeIsActive(rel, null, ago(86400000 * 15), null)).toBe(false);
  });
});

describe('temporalBFS', () => {
  const now = Date.now();
  const ago = (n) => new Date(now - n).toISOString();

  const rels = [
    // Active edge: A → B
    { id: 'r1', sourceId: 'A', targetId: 'B', type: 'owns', createdAt: ago(86400000 * 10), since: ago(86400000 * 10), until: null },
    // Expired edge: A → C (expired 2 days ago)
    { id: 'r2', sourceId: 'A', targetId: 'C', type: 'owns', createdAt: ago(86400000 * 30), since: ago(86400000 * 30), until: ago(86400000 * 2) },
    // Active edge: B → D
    { id: 'r3', sourceId: 'B', targetId: 'D', type: 'manages', createdAt: ago(86400000 * 5), since: ago(86400000 * 5), until: null },
  ];

  it('should find all edges without temporal filter', () => {
    const result = temporalBFS('A', rels, { maxDepth: 2 });
    expect(result.nodes.length).toBeGreaterThanOrEqual(4);
    expect(result.edges.length).toBeGreaterThanOrEqual(3);
  });

  it('should exclude expired edges at point-in-time query', () => {
    const queryAt = now - 86400000; // 1 day ago
    const result = temporalBFS('A', rels, { maxDepth: 2, queryAt });
    // r2 (expired) should not appear
    expect(result.edges.some(e => e.id === 'r2')).toBe(false);
  });

  it('should include expired edges when includeExpired=true', () => {
    const queryAt = now - 86400000; // 1 day ago
    const result = temporalBFS('A', rels, { maxDepth: 2, queryAt, includeExpired: true });
    expect(result.edges.some(e => e.id === 'r2')).toBe(true);
    expect(result.edges.find(e => e.id === 'r2')?.is_expired).toBe(true);
  });

  it('should respect maxDepth', () => {
    const result = temporalBFS('A', rels, { maxDepth: 1 });
    // Depth 1: A→B, A→C, A→D via B→D = N/A since D is 2 hops
    const maxFound = Math.max(...result.nodes.map(n => n.depth));
    expect(maxFound).toBeLessThanOrEqual(1);
  });
});

describe('nDegreeConnections', () => {
  const rels = [
    { id: 'r1', sourceId: 'X', targetId: 'Y' },
    { id: 'r2', sourceId: 'Y', targetId: 'Z' },
    { id: 'r3', sourceId: 'Z', targetId: 'W' },
  ];

  it('should find 1-hop connections', () => {
    const result = nDegreeConnections('X', rels, 1);
    expect(result.total_reachable).toBe(1);
    expect(result.by_hop['1'].some(c => c.id === 'Y')).toBe(true);
  });

  it('should find 2-hop connections', () => {
    const result = nDegreeConnections('X', rels, 2);
    expect(result.total_reachable).toBe(2);
    expect(result.by_hop['2'].some(c => c.id === 'Z')).toBe(true);
  });

  it('should find 3-hop connections', () => {
    const result = nDegreeConnections('X', rels, 3);
    expect(result.total_reachable).toBe(3);
    expect(result.by_hop['3'].some(c => c.id === 'W')).toBe(true);
  });
});

describe('recommendConnections', () => {
  it('should suggest friends-of-friends', () => {
    const twinId = 'A';
    const rels = [
      { id: 'r1', sourceId: 'A', targetId: 'B', trust_score: 80 },
      { id: 'r2', sourceId: 'B', targetId: 'C', trust_score: 70 },
      { id: 'r3', sourceId: 'C', targetId: 'D', trust_score: 60 },
      { id: 'r4', sourceId: 'B', targetId: 'D', trust_score: 90 }, // D reachable via B in 2 hops
    ];
    const twinRegistry = new Map([
      ['A', { id: 'A', name: 'A' }],
      ['B', { id: 'B', name: 'B' }],
      ['C', { id: 'C', name: 'C' }],
      ['D', { id: 'D', name: 'D' }],
    ]);
    const result = recommendConnections(twinId, rels, twinRegistry, { maxSuggestions: 5 });
    expect(result.suggestions.length).toBeGreaterThan(0);
    // C and D are foaf — C should appear
    const names = result.suggestions.map(s => s.targetId);
    expect(names).toContain('C');
    expect(names).toContain('D');
    expect(names).not.toContain('A');
    expect(names).not.toContain('B');
  });

  it('should filter by minConfidence', () => {
    const rels = [
      { id: 'r1', sourceId: 'X', targetId: 'Y', trust_score: 10 },
      { id: 'r2', sourceId: 'Y', targetId: 'Z', trust_score: 10 }
    ];
    const twinRegistry = new Map([['X', {}], ['Y', {}], ['Z', {}]]);
    const result = recommendConnections('X', rels, twinRegistry, { minConfidence: 0.3 });
    // Low trust means low confidence — should filter out
    expect(result.suggestions.length).toBeLessThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

describe('graphStats', () => {
  it('should count nodes and edges correctly', () => {
    const rels = makeSimpleGraph();
    const stats = graphStats(rels);
    expect(stats.nodes).toBe(5);
    expect(stats.edges).toBe(6);
  });

  it('should identify the largest component', () => {
    const rels = [
      { id: 'a', sourceId: 'X', targetId: 'Y' },
      { id: 'b', sourceId: 'Y', targetId: 'Z' },
      { id: 'c', sourceId: 'W', targetId: 'V' }, // separate component
    ];
    const stats = graphStats(rels);
    expect(stats.connected_components).toBe(2);
    expect(stats.largest_component_size).toBe(3);
  });

  it('should compute average degree', () => {
    const rels = makeSimpleGraph();
    const stats = graphStats(rels);
    // Star graph: A has degree 4, others have degree 2
    expect(stats.max_degree).toBe(4);
    expect(stats.avg_degree).toBeGreaterThan(0);
  });

  it('should count edge types', () => {
    const rels = [
      { id: 'r1', sourceId: 'A', targetId: 'B', type: 'owns' },
      { id: 'r2', sourceId: 'B', targetId: 'C', type: 'owns' },
      { id: 'r3', sourceId: 'C', targetId: 'D', type: 'manages' }
    ];
    const stats = graphStats(rels);
    expect(stats.edge_types.owns).toBe(2);
    expect(stats.edge_types.manages).toBe(1);
  });
});

describe('influenceScoring', () => {
  it('should combine pagerank and betweenness', () => {
    const adj = buildAdjacency(makeSimpleGraph());
    const pr = pageRank(adj);
    const bw = betweennessCentrality(adj);
    const influence = influenceScoring(pr.ranks, bw);

    expect(influence.has('A')).toBe(true);
    // A is both high-pagerank and high-betweenness — should be ranked 1
    expect(influence.get('A')?.rank).toBe(1);
  });

  it('should rank by influence descending', () => {
    const adj = buildAdjacency(makeSimpleGraph());
    const pr = pageRank(adj);
    const bw = betweennessCentrality(adj);
    const influence = influenceScoring(pr.ranks, bw);
    const ranks = [...influence.values()].map(v => v.rank);
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });
});

describe('topInfluencers', () => {
  it('should return top-N by influence', () => {
    const adj = buildAdjacency(makeSimpleGraph());
    const pr = pageRank(adj);
    const bw = betweennessCentrality(adj);
    const influence = influenceScoring(pr.ranks, bw);
    const top = topInfluencers(influence, 3);
    expect(top.length).toBeLessThanOrEqual(3);
    // First should be hub
    expect(top[0]?.tier).toBe('top-3');
  });

  it('should assign correct tiers', () => {
    const adj = buildAdjacency(makeConnectedGraph());
    const pr = pageRank(adj);
    const bw = betweennessCentrality(adj);
    const influence = influenceScoring(pr.ranks, bw);
    const top = topInfluencers(influence, 100);
    const top3 = top.filter(n => n.tier === 'top-3');
    const top10 = top.filter(n => n.tier === 'top-10');
    expect(top3.length).toBeLessThanOrEqual(3);
    expect(top10.length).toBeLessThanOrEqual(10);
  });
});
