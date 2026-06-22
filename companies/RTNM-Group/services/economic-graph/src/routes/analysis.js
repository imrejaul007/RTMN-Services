import express from 'express';
import { economicGraph, NODE_TYPES, EDGE_TYPES, logger } from '../index.js';

const router = express.Router();

/**
 * GET /api/analysis/metrics
 * Calculate graph metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      size: {
        nodes: economicGraph.order,
        edges: economicGraph.size,
        density: calculateDensity()
      },
      connectivity: {
        isConnected: isConnected(),
        componentCount: countComponents(),
        averageDegree: calculateAverageDegree()
      },
      centrality: {
        degree: calculateDegreeCentrality(),
        betweenness: calculateBetweennessCentrality()
      },
      clustering: {
        coefficient: calculateClusteringCoefficient()
      }
    };

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function calculateDensity() {
  const n = economicGraph.order;
  if (n <= 1) return 0;
  const maxEdges = n * (n - 1);
  return economicGraph.size / maxEdges;
}

function isConnected() {
  if (economicGraph.order === 0) return true;

  const visited = new Set();
  const queue = [economicGraph.nodes()[0]];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    for (const neighbor of economicGraph.neighbors(current)) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return visited.size === economicGraph.order;
}

function countComponents() {
  if (economicGraph.order === 0) return 0;

  const visited = new Set();
  let components = 0;

  for (const node of economicGraph.nodes()) {
    if (!visited.has(node)) {
      components++;
      bfsMarkVisited(node, visited);
    }
  }

  return components;
}

function bfsMarkVisited(start, visited) {
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    for (const neighbor of economicGraph.neighbors(current)) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }
}

function calculateAverageDegree() {
  const totalDegree = economicGraph.nodes().reduce((sum, node) => {
    return sum + economicGraph.degree(node);
  }, 0);
  return economicGraph.order > 0 ? totalDegree / economicGraph.order : 0;
}

function calculateDegreeCentrality() {
  const centrality = {};
  const n = economicGraph.order;
  if (n <= 1) return centrality;

  for (const node of economicGraph.nodes()) {
    centrality[node] = economicGraph.degree(node) / (n - 1);
  }

  // Return top 10
  return Object.entries(centrality)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((acc, [node, value]) => {
      acc[node] = value;
      return acc;
    }, {});
}

function calculateBetweennessCentrality() {
  const centrality = {};
  const nodes = economicGraph.nodes();

  // Initialize
  for (const node of nodes) {
    centrality[node] = 0;
  }

  // Calculate for each source
  for (const source of nodes) {
    const sps = {}; // Shortest paths
    const preds = {}; // Predecessors
    const sigma = {}; // Number of shortest paths

    for (const node of nodes) {
      sps[node] = [];
      preds[node] = [];
      sigma[node] = 0;
    }

    sigma[source] = 1;
    const dist = {};
    const queue = [source];

    for (const node of nodes) {
      dist[node] = -1;
    }
    dist[source] = 0;

    while (queue.length > 0) {
      const v = queue.shift();
      for (const w of economicGraph.neighbors(v)) {
        if (dist[w] < 0) {
          dist[w] = dist[v] + 1;
          queue.push(w);
        }
        if (dist[w] === dist[v] + 1) {
          sigma[w] += sigma[v];
          sps[w].push(v);
          preds[w].push(v);
        }
      }
    }

    // Accumulation
    const delta = {};
    for (const node of nodes) {
      delta[node] = 0;
    }

    const stack = [...nodes].sort((a, b) => dist[b] - dist[a]);
    for (const w of stack) {
      for (const v of preds[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== source) {
        centrality[w] += delta[w];
      }
    }
  }

  // Normalize
  const n = nodes.length;
  if (n > 2) {
    const norm = 2 / ((n - 1) * (n - 2));
    for (const node in centrality) {
      centrality[node] *= norm;
    }
  }

  // Return top 10
  return Object.entries(centrality)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((acc, [node, value]) => {
      acc[node] = value;
      return acc;
    }, {});
}

function calculateClusteringCoefficient() {
  const nodes = economicGraph.nodes();
  if (nodes.length < 3) return 0;

  let totalCoeff = 0;
  let nodesWithNeighbors = 0;

  for (const node of nodes) {
    const neighbors = economicGraph.neighbors(node);
    const k = neighbors.length;

    if (k < 2) continue;

    nodesWithNeighbors++;
    let triangles = 0;
    const possible = (k * (k - 1)) / 2;

    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (economicGraph.hasEdge(neighbors[i], neighbors[j])) {
          triangles++;
        }
      }
    }

    totalCoeff += triangles / possible;
  }

  return nodesWithNeighbors > 0 ? totalCoeff / nodesWithNeighbors : 0;
}

/**
 * GET /api/analysis/industry
 * Analyze industry relationships
 */
router.get('/industry', async (req, res) => {
  try {
    const { industryId } = req.query;

    let industries = economicGraph.filterNodes(n =>
      economicGraph.getNodeAttribute(n, 'type') === NODE_TYPES.INDUSTRY
    );

    const analysis = industries.map(industryId => {
      const neighbors = economicGraph.neighbors(industryId);
      const inDegree = economicGraph.inDegree(industryId);
      const outDegree = economicGraph.outDegree(industryId);

      // Get neighbor types
      const neighborTypes = {};
      for (const neighbor of neighbors) {
        const type = economicGraph.getNodeAttribute(neighbor, 'type');
        neighborTypes[type] = (neighborTypes[type] || 0) + 1;
      }

      return {
        id: industryId,
        name: economicGraph.getNodeAttribute(industryId, 'name'),
        connections: neighbors.length,
        inDegree,
        outDegree,
        netDegree: inDegree - outDegree,
        neighborTypes
      };
    });

    res.json({
      success: true,
      count: analysis.length,
      industries: analysis
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analysis/trends
 * Analyze value flow trends
 */
router.get('/trends', async (req, res) => {
  try {
    const trends = {
      revenueFlows: analyzeFlowsByType(EDGE_TYPES.REVENUE),
      costFlows: analyzeFlowsByType(EDGE_TYPES.COST),
      investmentFlows: analyzeFlowsByType(EDGE_TYPES.INVESTMENT),
      partnershipFlows: analyzeFlowsByType(EDGE_TYPES.PARTNERSHIP)
    };

    // Calculate net position for each node
    const nodePositions = {};
    for (const nodeId of economicGraph.nodes()) {
      const inFlows = economicGraph.inEdges(nodeId)
        .map(e => economicGraph.getEdgeAttribute(e, 'value') || 0)
        .reduce((a, b) => a + b, 0);

      const outFlows = economicGraph.outEdges(nodeId)
        .map(e => economicGraph.getEdgeAttribute(e, 'value') || 0)
        .reduce((a, b) => a + b, 0);

      nodePositions[nodeId] = {
        inflows: inFlows,
        outflows: outFlows,
        netPosition: inFlows - outFlows
      };
    }

    // Top earners and spenders
    const sorted = Object.entries(nodePositions)
      .sort((a, b) => b[1].netPosition - a[1].netPosition);

    trends.topEarners = sorted.slice(0, 5).map(([id, pos]) => ({
      id,
      ...economicGraph.getNodeAttributes(id),
      netPosition: pos.netPosition
    }));

    trends.topSpenders = sorted.slice(-5).reverse().map(([id, pos]) => ({
      id,
      ...economicGraph.getNodeAttributes(id),
      netPosition: pos.netPosition
    }));

    res.json({
      success: true,
      trends
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function analyzeFlowsByType(type) {
  const edges = economicGraph.filterEdges(e =>
    economicGraph.getEdgeAttribute(e, 'type') === type
  );

  const totalValue = edges.reduce((sum, e) =>
    sum + (economicGraph.getEdgeAttribute(e, 'value') || 0), 0
  );

  const flows = edges.map(edgeId => ({
    source: economicGraph.source(edgeId),
    target: economicGraph.target(edgeId),
    value: economicGraph.getEdgeAttribute(edgeId, 'value') || 0
  }));

  return {
    count: edges.length,
    totalValue,
    flows: flows.sort((a, b) => b.value - a.value).slice(0, 10)
  };
}

/**
 * GET /api/analysis/network
 * Network health analysis
 */
router.get('/network', async (req, res) => {
  try {
    const networkHealth = {
      connectivity: {
        isConnected: isConnected(),
        components: countComponents(),
        largestComponent: getLargestComponentSize()
      },
      balance: {
        reciprocity: calculateReciprocity(),
        flowBalance: analyzeFlowBalance()
      },
      vulnerability: {
        criticalNodes: findCriticalNodes()
      }
    };

    res.json({
      success: true,
      analysis: networkHealth
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getLargestComponentSize() {
  const visited = new Set();
  let largest = 0;

  for (const node of economicGraph.nodes()) {
    if (!visited.has(node)) {
      const componentSize = bfsCount(node, visited);
      largest = Math.max(largest, componentSize);
    }
  }

  return largest;
}

function bfsCount(start, visited) {
  let count = 0;
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    count++;

    for (const neighbor of economicGraph.neighbors(current)) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return count;
}

function calculateReciprocity() {
  let reciprocal = 0;
  let total = 0;

  for (const edgeId of economicGraph.edges()) {
    const source = economicGraph.source(edgeId);
    const target = economicGraph.target(edgeId);

    total++;
    if (economicGraph.hasEdge(target, source)) {
      reciprocal++;
    }
  }

  return total > 0 ? reciprocal / total : 0;
}

function analyzeFlowBalance() {
  const nodeBalance = {};

  for (const nodeId of economicGraph.nodes()) {
    const inValue = economicGraph.inEdges(nodeId)
      .reduce((sum, e) => sum + (economicGraph.getEdgeAttribute(e, 'value') || 0), 0);
    const outValue = economicGraph.outEdges(nodeId)
      .reduce((sum, e) => sum + (economicGraph.getEdgeAttribute(e, 'value') || 0), 0);

    nodeBalance[nodeId] = { inValue, outValue, balance: inValue - outValue };
  }

  const balances = Object.values(nodeBalance).map(n => Math.abs(n.balance));
  const avgImbalance = balances.length > 0
    ? balances.reduce((a, b) => a + b, 0) / balances.length
    : 0;

  return { averageImbalance: avgImbalance, byNode: nodeBalance };
}

function findCriticalNodes() {
  const centrality = calculateDegreeCentrality();
  const betweenness = calculateBetweennessCentrality();

  const critical = [];
  const allNodes = new Set([...Object.keys(centrality), ...Object.keys(betweenness)]);

  for (const node of allNodes) {
    const centScore = centrality[node] || 0;
    const betwScore = betweenness[node] || 0;

    if (centScore > 0.3 || betwScore > 0.2) {
      critical.push({
        node,
        ...economicGraph.getNodeAttributes(node),
        degreeCentrality: centScore,
        betweennessCentrality: betwScore
      });
    }
  }

  return critical.sort((a, b) =>
    (b.degreeCentrality + b.betweennessCentrality) -
    (a.degreeCentrality + a.betweennessCentrality)
  );
}

export default router;
