import express from 'express';
import { economicGraph, NODE_TYPES, EDGE_TYPES, VALUE_CURRENCIES, logger } from '../index.js';

const router = express.Router();

/**
 * GET /api/flows
 * Get all value flows in the graph
 */
router.get('/', async (req, res) => {
  try {
    const { type, minValue = 0, limit = 100 } = req.query;

    let edges = economicGraph.edges();

    // Filter by type
    if (type) {
      edges = edges.filter(e => {
        const edgeType = economicGraph.getEdgeAttribute(e, 'type');
        return edgeType === type;
      });
    }

    // Filter by minimum value
    edges = edges.filter(e => {
      const value = economicGraph.getEdgeAttribute(e, 'value') || 0;
      return value >= parseFloat(minValue);
    });

    // Limit
    edges = edges.slice(0, parseInt(limit));

    const flows = edges.map(edgeId => {
      const source = economicGraph.source(edgeId);
      const target = economicGraph.target(edgeId);
      return {
        id: edgeId,
        source: {
          id: source,
          ...economicGraph.getNodeAttributes(source)
        },
        target: {
          id: target,
          ...economicGraph.getNodeAttributes(target)
        },
        ...economicGraph.getEdgeAttributes(edgeId)
      };
    });

    res.json({
      success: true,
      count: flows.length,
      flows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/flows/calculate
 * Calculate value flow between nodes
 */
router.post('/calculate', async (req, res) => {
  try {
    const { source, target, currency = 'money' } = req.body;

    if (!source || !target) {
      return res.status(400).json({
        success: false,
        error: 'Source and target are required'
      });
    }

    // Check if nodes exist
    if (!economicGraph.hasNode(source)) {
      return res.status(404).json({
        success: false,
        error: `Source node '${source}' not found`
      });
    }

    if (!economicGraph.hasNode(target)) {
      return res.status(404).json({
        success: false,
        error: `Target node '${target}' not found`
      });
    }

    // Calculate direct flow
    let directFlow = null;
    let directEdgeId = null;

    if (economicGraph.hasEdge(source, target)) {
      directEdgeId = economicGraph.edge(source, target);
      directFlow = economicGraph.getEdgeAttributes(directEdgeId);
    }

    // Calculate reverse flow
    let reverseFlow = null;
    let reverseEdgeId = null;

    if (economicGraph.hasEdge(target, source)) {
      reverseEdgeId = economicGraph.edge(target, source);
      reverseFlow = economicGraph.getEdgeAttributes(reverseEdgeId);
    }

    // Calculate net flow
    const netFlow = {
      [currency]: (directFlow?.value || 0) - (reverseFlow?.value || 0)
    };

    // Calculate total flow (both directions)
    const totalFlow = {
      [currency]: (directFlow?.value || 0) + (reverseFlow?.value || 0)
    };

    // Calculate indirect paths
    const indirectPaths = findIndirectPaths(source, target);

    res.json({
      success: true,
      flow: {
        source,
        target,
        currency,
        direct: {
          exists: !!directFlow,
          edgeId: directEdgeId,
          value: directFlow?.value || 0
        },
        reverse: {
          exists: !!reverseFlow,
          edgeId: reverseEdgeId,
          value: reverseFlow?.value || 0
        },
        net,
        total,
        indirect: indirectPaths
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function findIndirectPaths(source, target, maxDepth = 3) {
  const paths = [];

  function dfs(current, target, visited, path, depth) {
    if (depth > maxDepth) return;
    if (current === target) {
      paths.push([...path]);
      return;
    }

    const neighbors = economicGraph.neighbors(current);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        path.push(neighbor);
        dfs(neighbor, target, visited, path, depth + 1);
        path.pop();
        visited.delete(neighbor);
      }
    }
  }

  const visited = new Set([source]);
  dfs(source, target, visited, [source], 0);

  return paths.map(path => ({
    nodes: path,
    length: path.length - 1,
    value: calculatePathValue(path)
  }));
}

function calculatePathValue(path) {
  let totalValue = 0;

  for (let i = 0; i < path.length - 1; i++) {
    if (economicGraph.hasEdge(path[i], path[i + 1])) {
      const edgeId = economicGraph.edge(path[i], path[i + 1]);
      totalValue += economicGraph.getEdgeAttribute(edgeId, 'value') || 0;
    }
  }

  return totalValue;
}

/**
 * GET /api/flows/summary
 * Get summary of all value flows
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = {
      byType: {},
      totalValue: 0,
      topFlows: [],
      nodeImpact: {}
    };

    // Aggregate by type
    for (const type of Object.values(EDGE_TYPES)) {
      summary.byType[type] = {
        count: 0,
        totalValue: 0
      };
    }

    // Process edges
    for (const edgeId of economicGraph.edges()) {
      const type = economicGraph.getEdgeAttribute(edgeId, 'type');
      const value = economicGraph.getEdgeAttribute(edgeId, 'value') || 0;

      if (summary.byType[type]) {
        summary.byType[type].count++;
        summary.byType[type].totalValue += value;
      }

      summary.totalValue += value;
    }

    // Get top flows by value
    const flowsWithValue = economicGraph.edges()
      .map(edgeId => ({
        edgeId,
        source: economicGraph.source(edgeId),
        target: economicGraph.target(edgeId),
        type: economicGraph.getEdgeAttribute(edgeId, 'type'),
        value: economicGraph.getEdgeAttribute(edgeId, 'value') || 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    summary.topFlows = flowsWithValue;

    // Calculate node impact
    for (const nodeId of economicGraph.nodes()) {
      const inEdges = economicGraph.inEdges(nodeId);
      const outEdges = economicGraph.outEdges(nodeId);

      let inValue = 0;
      let outValue = 0;

      for (const edgeId of inEdges) {
        inValue += economicGraph.getEdgeAttribute(edgeId, 'value') || 0;
      }

      for (const edgeId of outEdges) {
        outValue += economicGraph.getEdgeAttribute(edgeId, 'value') || 0;
      }

      summary.nodeImpact[nodeId] = {
        inValue,
        outValue,
        netFlow: inValue - outValue,
        connections: inEdges.length + outEdges.length
      };
    }

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/flows/transfer
 * Simulate value transfer between nodes
 */
router.post('/transfer', async (req, res) => {
  try {
    const { source, target, value, currency = 'money', type = 'revenue' } = req.body;

    if (!source || !target || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Source, target, and value are required'
      });
    }

    // Check nodes exist
    if (!economicGraph.hasNode(source) || !economicGraph.hasNode(target)) {
      return res.status(404).json({
        success: false,
        error: 'Source or target node not found'
      });
    }

    const transferId = `transfer_${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Update or create edge
    if (economicGraph.hasEdge(source, target)) {
      const edgeId = economicGraph.edge(source, target);
      const currentValue = economicGraph.getEdgeAttribute(edgeId, 'value') || 0;
      economicGraph.setEdgeAttribute(edgeId, 'value', currentValue + value);
    } else {
      economicGraph.addEdge(source, target, {
        type,
        currency,
        value,
        createdAt: timestamp
      });
    }

    res.json({
      success: true,
      transfer: {
        id: transferId,
        source,
        target,
        value,
        currency,
        type,
        timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/flows/industry/:industryId
 * Get flows for a specific industry
 */
router.get('/industry/:industryId', async (req, res) => {
  try {
    const { industryId } = req.params;

    // Find industry node
    const industryNode = `industry:${industryId}`;
    if (!economicGraph.hasNode(industryNode)) {
      return res.status(404).json({
        success: false,
        error: `Industry '${industryId}' not found`
      });
    }

    // Get connected edges
    const inEdges = economicGraph.inEdges(industryNode);
    const outEdges = economicGraph.outEdges(industryNode);

    const flows = {
      incoming: inEdges.map(edgeId => ({
        edgeId,
        source: economicGraph.source(edgeId),
        sourceInfo: economicGraph.getNodeAttributes(economicGraph.source(edgeId)),
        ...economicGraph.getEdgeAttributes(edgeId)
      })),
      outgoing: outEdges.map(edgeId => ({
        edgeId,
        target: economicGraph.target(edgeId),
        targetInfo: economicGraph.getNodeAttributes(economicGraph.target(edgeId)),
        ...economicGraph.getEdgeAttributes(edgeId)
      }))
    };

    // Calculate totals
    flows.totalIncoming = flows.incoming.reduce((sum, f) => sum + (f.value || 0), 0);
    flows.totalOutgoing = flows.outgoing.reduce((sum, f) => sum + (f.value || 0), 0);
    flows.netFlow = flows.totalIncoming - flows.totalOutgoing;

    res.json({
      success: true,
      industry: industryNode,
      flows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
