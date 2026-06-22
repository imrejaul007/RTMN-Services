import express from 'express';
import { economicGraph, NODE_TYPES, EDGE_TYPES, logger } from '../index.js';

const router = express.Router();

/**
 * GET /api/visualization/d3
 * Get D3.js compatible graph data
 */
router.get('/d3', async (req, res) => {
  try {
    const { type, focus } = req.query;

    // Build D3-compatible data structure
    const nodes = [];
    const links = [];

    // Get all nodes (or filtered)
    let nodeIds = economicGraph.nodes();

    if (type) {
      nodeIds = nodeIds.filter(n =>
        economicGraph.getNodeAttribute(n, 'type') === type
      );
    }

    // If focus node specified, include only connected nodes
    if (focus) {
      const focusNode = focus;
      const connected = new Set([focusNode]);

      for (const edgeId of economicGraph.edges()) {
        const source = economicGraph.source(edgeId);
        const target = economicGraph.target(edgeId);

        if (source === focusNode) connected.add(target);
        if (target === focusNode) connected.add(source);
      }

      nodeIds = nodeIds.filter(n => connected.has(n));
    }

    // Convert nodes
    for (const nodeId of nodeIds) {
      const attrs = economicGraph.getNodeAttributes(nodeId);
      nodes.push({
        id: nodeId,
        name: attrs.name || nodeId,
        type: attrs.type,
        val: calculateNodeValue(nodeId),
        ...attrs
      });
    }

    // Convert edges (only between included nodes)
    const nodeSet = new Set(nodeIds);
    for (const edgeId of economicGraph.edges()) {
      const source = economicGraph.source(edgeId);
      const target = economicGraph.target(edgeId);

      if (nodeSet.has(source) && nodeSet.has(target)) {
        const attrs = economicGraph.getEdgeAttributes(edgeId);
        links.push({
          id: edgeId,
          source,
          target,
          type: attrs.type,
          value: attrs.value || 1,
          ...attrs
        });
      }
    }

    res.json({
      success: true,
      data: {
        nodes,
        links
      },
      meta: {
        nodeCount: nodes.length,
        linkCount: links.length,
        generated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function calculateNodeValue(nodeId) {
  // Base value from attributes
  const baseValue = economicGraph.getNodeAttribute(nodeId, 'value') || 1;

  // Scale by degree
  const degree = economicGraph.degree(nodeId);

  return Math.max(1, baseValue * Math.sqrt(degree + 1));
}

/**
 * GET /api/visualization/hierarchical
 * Get hierarchical view of the graph
 */
router.get('/hierarchical', async (req, res) => {
  try {
    const { industryId } = req.query;

    // Get industry nodes
    const industries = economicGraph.filterNodes(n =>
      economicGraph.getNodeAttribute(n, 'type') === NODE_TYPES.INDUSTRY
    );

    const hierarchy = {
      name: 'RTMN Ecosystem',
      children: []
    };

    for (const industryId of industries) {
      const industryName = economicGraph.getNodeAttribute(industryId, 'name');
      const neighbors = economicGraph.neighbors(industryId);

      // Categorize children by type
      const children = categorizeChildren(neighbors);

      const industryNode = {
        name: industryName,
        id: industryId,
        children: Object.entries(children).map(([type, nodes]) => ({
          name: type,
          children: nodes.map(n => ({
            id: n,
            name: economicGraph.getNodeAttribute(n, 'name') || n,
            value: economicGraph.getNodeAttribute(n, 'value') || 1
          }))
        }))
      };

      hierarchy.children.push(industryNode);
    }

    res.json({
      success: true,
      hierarchy
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function categorizeChildren(nodeIds) {
  const categories = {};

  for (const nodeId of nodeIds) {
    const type = economicGraph.getNodeAttribute(nodeId, 'type');
    if (!categories[type]) {
      categories[type] = [];
    }
    categories[type].push(nodeId);
  }

  return categories;
}

/**
 * GET /api/visualization/matrix
 * Get adjacency matrix for the graph
 */
router.get('/matrix', async (req, res) => {
  try {
    const nodes = economicGraph.nodes();
    const nodeIndex = {};
    nodes.forEach((n, i) => { nodeIndex[n] = i; });

    const size = nodes.length;
    const matrix = Array(size).fill(null).map(() => Array(size).fill(0));

    // Fill matrix
    for (const edgeId of economicGraph.edges()) {
      const source = economicGraph.source(edgeId);
      const target = economicGraph.target(edgeId);
      const value = economicGraph.getEdgeAttribute(edgeId, 'value') || 1;

      const i = nodeIndex[source];
      const j = nodeIndex[target];

      if (i !== undefined && j !== undefined) {
        matrix[i][j] = value;
      }
    }

    res.json({
      success: true,
      matrix: {
        nodes: nodes.map(n => ({
          id: n,
          name: economicGraph.getNodeAttribute(n, 'name') || n
        })),
        data: matrix
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/visualization/sunburst
 * Get sunburst chart data
 */
router.get('/sunburst', async (req, res) => {
  try {
    const hierarchy = buildSunburstData();

    res.json({
      success: true,
      hierarchy
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function buildSunburstData() {
  const root = {
    id: 'root',
    name: 'RTMN',
    value: 0,
    children: []
  };

  // Group nodes by type
  const byType = {};
  for (const nodeId of economicGraph.nodes()) {
    const type = economicGraph.getNodeAttribute(nodeId, 'type');
    if (!byType[type]) {
      byType[type] = [];
    }
    byType[type].push(nodeId);
  }

  // Build hierarchy
  for (const [type, nodes] of Object.entries(byType)) {
    const typeNode = {
      id: type,
      name: type,
      children: nodes.map(n => ({
        id: n,
        name: economicGraph.getNodeAttribute(n, 'name') || n,
        value: economicGraph.getNodeAttribute(n, 'value') || 1
      }))
    };
    root.children.push(typeNode);
  }

  // Calculate values
  function calculateValue(node) {
    if (!node.children || node.children.length === 0) {
      return node.value || 1;
    }
    node.value = node.children.reduce((sum, c) => sum + calculateValue(c), 0);
    return node.value;
  }
  calculateValue(root);

  return root;
}

/**
 * GET /api/visualization/force
 * Get force-directed graph data
 */
router.get('/force', async (req, res) => {
  try {
    const { width = 800, height = 600 } = req.query;

    const nodes = economicGraph.nodes().map(nodeId => {
      const attrs = economicGraph.getNodeAttributes(nodeId);
      return {
        id: nodeId,
        name: attrs.name || nodeId,
        type: attrs.type,
        group: getGroupForType(attrs.type),
        radius: Math.sqrt(economicGraph.degree(nodeId) + 1) * 5 + 5,
        x: Math.random() * parseInt(width),
        y: Math.random() * parseInt(height)
      };
    });

    const links = economicGraph.edges().map(edgeId => ({
      id: edgeId,
      source: economicGraph.source(edgeId),
      target: economicGraph.target(edgeId),
      type: economicGraph.getEdgeAttribute(edgeId, 'type'),
      value: economicGraph.getEdgeAttribute(edgeId, 'value') || 1
    }));

    res.json({
      success: true,
      simulation: {
        width: parseInt(width),
        height: parseInt(height),
        nodes,
        links
      },
      forces: {
        link: { distance: 100 },
        charge: { strength: -200 },
        center: { x: parseInt(width) / 2, y: parseInt(height) / 2 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getGroupForType(type) {
  const groups = {
    [NODE_TYPES.COMPANY]: 1,
    [NODE_TYPES.INDUSTRY]: 2,
    [NODE_TYPES.MARKET]: 3,
    [NODE_TYPES.AGENT]: 4,
    [NODE_TYPES.PRODUCT]: 5,
    [NODE_TYPES.SERVICE]: 6
  };
  return groups[type] || 0;
}

/**
 * GET /api/visualization/timeline
 * Get timeline/chord diagram data
 */
router.get('/timeline', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // For now, generate aggregated data by industry
    const industries = economicGraph.filterNodes(n =>
      economicGraph.getNodeAttribute(n, 'type') === NODE_TYPES.INDUSTRY
    );

    const timeline = {
      nodes: industries.map(id => ({
        id,
        name: economicGraph.getNodeAttribute(id, 'name'),
        color: economicGraph.getNodeAttribute(id, 'color')
      })),
      flows: []
    };

    // Aggregate flows between industries
    for (const source of industries) {
      for (const target of industries) {
        if (source === target) continue;

        if (economicGraph.hasEdge(source, target)) {
          const edgeId = economicGraph.edge(source, target);
          const value = economicGraph.getEdgeAttribute(edgeId, 'value') || 0;
          if (value > 0) {
            timeline.flows.push({
              source: economicGraph.getNodeAttribute(source, 'name'),
              target: economicGraph.getNodeAttribute(target, 'name'),
              value
            });
          }
        }
      }
    }

    res.json({
      success: true,
      timeline
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/visualization/export
 * Export full graph as JSON
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const graphData = {
      meta: {
        exported: new Date().toISOString(),
        version: '1.0.0',
        nodeCount: economicGraph.order,
        edgeCount: economicGraph.size
      },
      nodes: economicGraph.nodes().map(n => ({
        id: n,
        ...economicGraph.getNodeAttributes(n)
      })),
      edges: economicGraph.edges().map(e => ({
        id: e,
        source: economicGraph.source(e),
        target: economicGraph.target(e),
        ...economicGraph.getEdgeAttributes(e)
      }))
    };

    if (format === 'json') {
      res.json(graphData);
    } else if (format === 'csv') {
      // Convert to CSV
      const csv = [
        'source,target,type,value',
        ...graphData.edges.map(e =>
          `${e.source},${e.target},${e.type},${e.value || 0}`
        )
      ].join('\n');

      res.type('text/csv').send(csv);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
