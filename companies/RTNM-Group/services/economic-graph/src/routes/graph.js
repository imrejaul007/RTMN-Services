import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { economicGraph, NODE_TYPES, EDGE_TYPES, graphState, logger } from '../index.js';

const router = express.Router();

/**
 * GET /api/graph
 * Get full graph structure
 */
router.get('/', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;

    let nodes = economicGraph.nodes();

    // Filter by type if specified
    if (type) {
      nodes = nodes.filter(n => economicGraph.getNodeAttribute(n, 'type') === type);
    }

    // Limit results
    nodes = nodes.slice(0, parseInt(limit));

    const graphData = {
      nodes: nodes.map(nodeId => ({
        id: nodeId,
        ...economicGraph.getNodeAttributes(nodeId)
      })),
      edges: economicGraph.edges().map(edgeId => ({
        id: edgeId,
        ...economicGraph.getEdgeAttributes(edgeId)
      })),
      stats: {
        nodeCount: economicGraph.order,
        edgeCount: economicGraph.size,
        nodeTypes: getNodeTypeCounts(),
        edgeTypes: getEdgeTypeCounts()
      }
    };

    res.json({
      success: true,
      graph: graphData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getNodeTypeCounts() {
  const counts = {};
  for (const type of Object.values(NODE_TYPES)) {
    counts[type] = economicGraph.filterNodes(n =>
      economicGraph.getNodeAttribute(n, 'type') === type
    ).length;
  }
  return counts;
}

function getEdgeTypeCounts() {
  const counts = {};
  for (const type of Object.values(EDGE_TYPES)) {
    counts[type] = economicGraph.filterEdges(e =>
      economicGraph.getEdgeAttribute(e, 'type') === type
    ).length;
  }
  return counts;
}

/**
 * POST /api/graph/node
 * Add a node to the graph
 */
router.post('/node', async (req, res) => {
  try {
    const {
      id,
      type,
      name,
      attributes = {}
    } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        success: false,
        error: 'Type and name are required'
      });
    }

    // Generate ID if not provided
    const nodeId = id || `${type}:${uuidv4()}`;

    // Check if node already exists
    if (economicGraph.hasNode(nodeId)) {
      return res.status(409).json({
        success: false,
        error: 'Node already exists'
      });
    }

    // Add node
    economicGraph.addNode(nodeId, {
      type,
      name,
      value: attributes.value || 0,
      ...attributes,
      createdAt: new Date().toISOString()
    });

    graphState.nodeCount++;
    graphState.lastUpdated = new Date().toISOString();

    res.status(201).json({
      success: true,
      node: {
        id: nodeId,
        type,
        name,
        attributes: economicGraph.getNodeAttributes(nodeId)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/graph/edge
 * Add an edge (value flow) to the graph
 */
router.post('/edge', async (req, res) => {
  try {
    const {
      source,
      target,
      type,
      value,
      attributes = {}
    } = req.body;

    if (!source || !target || !type) {
      return res.status(400).json({
        success: false,
        error: 'Source, target, and type are required'
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

    // Generate edge ID
    const edgeId = `edge:${uuidv4()}`;

    // Check for duplicate edge
    if (economicGraph.hasEdge(source, target)) {
      // Update existing edge
      economicGraph.setEdgeAttributes(source, target, {
        type,
        value: value || 1,
        ...attributes,
        updatedAt: new Date().toISOString()
      });

      return res.json({
        success: true,
        message: 'Edge updated',
        edge: {
          id: economicGraph.edge(source, target),
          source,
          target,
          attributes: economicGraph.getEdgeAttributes(economicGraph.edge(source, target))
        }
      });
    }

    // Add edge
    economicGraph.addEdge(source, target, {
      type,
      value: value || 1,
      ...attributes,
      createdAt: new Date().toISOString()
    });

    graphState.edgeCount++;
    graphState.lastUpdated = new Date().toISOString();

    res.status(201).json({
      success: true,
      edge: {
        id: edgeId,
        source,
        target,
        attributes: economicGraph.getEdgeAttributes(edgeId)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/graph/node/:id
 * Get specific node details
 */
router.get('/node/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!economicGraph.hasNode(id)) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }

    const attributes = economicGraph.getNodeAttributes(id);

    // Get connected nodes
    const inEdges = economicGraph.inEdges(id);
    const outEdges = economicGraph.outEdges(id);

    const connections = {
      in: inEdges.map(e => ({
        edgeId: e,
        source: economicGraph.source(e),
        ...economicGraph.getEdgeAttributes(e)
      })),
      out: outEdges.map(e => ({
        edgeId: e,
        target: economicGraph.target(e),
        ...economicGraph.getEdgeAttributes(e)
      }))
    };

    res.json({
      success: true,
      node: {
        id,
        ...attributes,
        connections: {
          inCount: connections.in.length,
          outCount: connections.out.length
        }
      },
      connections
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/graph/node/:id
 * Remove a node from the graph
 */
router.delete('/node/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!economicGraph.hasNode(id)) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }

    // Remove all edges connected to this node
    const edges = economicGraph.edges(id);
    edges.forEach(e => {
      economicGraph.dropEdge(e);
      graphState.edgeCount--;
    });

    // Remove node
    economicGraph.dropNode(id);
    graphState.nodeCount--;
    graphState.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      message: 'Node removed',
      removed: {
        node: id,
        edgesRemoved: edges.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/graph/nodes
 * List nodes with filtering and pagination
 */
router.get('/nodes', async (req, res) => {
  try {
    const { type, search, limit = 50, offset = 0 } = req.query;

    let nodes = economicGraph.nodes();

    // Filter by type
    if (type) {
      nodes = nodes.filter(n => economicGraph.getNodeAttribute(n, 'type') === type);
    }

    // Search by name
    if (search) {
      const searchLower = search.toLowerCase();
      nodes = nodes.filter(n => {
        const name = economicGraph.getNodeAttribute(n, 'name') || '';
        return name.toLowerCase().includes(searchLower);
      });
    }

    // Paginate
    const total = nodes.length;
    nodes = nodes.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    const result = nodes.map(nodeId => ({
      id: nodeId,
      ...economicGraph.getNodeAttributes(nodeId)
    }));

    res.json({
      success: true,
      count: result.length,
      total,
      nodes: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/graph/edges
 * List edges with filtering
 */
router.get('/edges', async (req, res) => {
  try {
    const { type, source, target, limit = 100 } = req.query;

    let edges = economicGraph.edges();

    // Filter by type
    if (type) {
      edges = edges.filter(e => economicGraph.getEdgeAttribute(e, 'type') === type);
    }

    // Filter by source
    if (source) {
      edges = edges.filter(e => economicGraph.source(e) === source);
    }

    // Filter by target
    if (target) {
      edges = edges.filter(e => economicGraph.target(e) === target);
    }

    // Limit
    edges = edges.slice(0, parseInt(limit));

    const result = edges.map(edgeId => ({
      id: edgeId,
      source: economicGraph.source(edgeId),
      target: economicGraph.target(edgeId),
      ...economicGraph.getEdgeAttributes(edgeId)
    }));

    res.json({
      success: true,
      count: result.length,
      edges: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/graph/path
 * Find path between two nodes
 */
router.post('/path', async (req, res) => {
  try {
    const { source, target, maxDepth = 5 } = req.body;

    if (!source || !target) {
      return res.status(400).json({
        success: false,
        error: 'Source and target are required'
      });
    }

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

    // BFS to find shortest path
    const path = findShortestPath(source, target, maxDepth);

    res.json({
      success: true,
      path: {
        source,
        target,
        found: path.length > 0,
        nodes: path,
        length: path.length - 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function findShortestPath(source, target, maxDepth) {
  if (source === target) return [source];

  const visited = new Set([source]);
  const queue = [[source]];
  let depth = 0;

  while (queue.length > 0 && depth < maxDepth) {
    const currentPath = queue.shift();
    const current = currentPath[currentPath.length - 1];
    depth = currentPath.length - 1;

    const neighbors = economicGraph.neighbors(current);

    for (const neighbor of neighbors) {
      if (neighbor === target) {
        return [...currentPath, neighbor];
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...currentPath, neighbor]);
      }
    }
  }

  return []; // No path found
}

export default router;
