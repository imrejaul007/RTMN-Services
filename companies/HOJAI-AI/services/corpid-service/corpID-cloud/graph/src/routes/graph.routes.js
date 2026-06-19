/**
 * CorpID Cloud - Identity Graph Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../shared/utils/logger.js';
import {
  nodes,
  edges,
  NODE_TYPES,
  EDGE_TYPES,
  getOrCreateNode,
  getNodeById,
  getNodeByEntity,
  createEdge,
  getNodeEdges,
  getRelatedNodes,
  getShortestPath,
  getGraphStats,
  findCommonConnections,
  deleteEdge
} from '../models/graph.model.js';

const router = express.Router();

/**
 * Get available types
 * GET /api/graph/types
 */
router.get('/types',
  requireAuth(),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      nodeTypes: NODE_TYPES,
      edgeTypes: EDGE_TYPES
    });
  })
);

/**
 * Create or get a node
 * POST /api/graph/nodes
 */
router.post('/nodes',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { entityType, entityId, properties } = req.body;

    if (!entityType || !entityId) {
      throw new AppError('Entity type and ID are required', 400, 'VALIDATION_ERROR');
    }

    const node = getOrCreateNode(entityType, entityId, properties);

    dataAudit('graph.node_created', req, 'graph_node', node.id, { entityType, entityId });

    res.status(201).json({
      success: true,
      node
    });
  })
);

/**
 * Get node by ID
 * GET /api/graph/nodes/:id
 */
router.get('/nodes/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const node = getNodeById(req.params.id);
    if (!node) {
      throw new AppError('Node not found', 404, 'NODE_NOT_FOUND');
    }

    res.json({ success: true, node });
  })
);

/**
 * Get node by entity
 * GET /api/graph/entities/:type/:id
 */
router.get('/entities/:type/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const node = getNodeByEntity(req.params.type, req.params.id);
    if (!node) {
      throw new AppError('Node not found', 404, 'NODE_NOT_FOUND');
    }

    res.json({ success: true, node });
  })
);

/**
 * Create a relationship
 * POST /api/graph/edges
 */
router.post('/edges',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { sourceNodeId, targetNodeId, type, properties } = req.body;

    if (!sourceNodeId || !targetNodeId || !type) {
      throw new AppError('Source, target, and type are required', 400, 'VALIDATION_ERROR');
    }

    if (!Object.values(EDGE_TYPES).includes(type)) {
      throw new AppError('Invalid edge type', 400, 'INVALID_EDGE_TYPE');
    }

    // Verify both nodes exist
    if (!getNodeById(sourceNodeId) || !getNodeById(targetNodeId)) {
      throw new AppError('Source or target node not found', 404, 'NODE_NOT_FOUND');
    }

    const edge = createEdge(sourceNodeId, targetNodeId, type, properties);

    dataAudit('graph.edge_created', req, 'graph_edge', edge.id, { type });

    res.status(201).json({
      success: true,
      edge
    });
  })
);

/**
 * Get edges for a node
 * GET /api/graph/nodes/:id/edges
 */
router.get('/nodes/:id/edges',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { direction = 'all' } = req.query;
    const node = getNodeById(req.params.id);
    if (!node) {
      throw new AppError('Node not found', 404, 'NODE_NOT_FOUND');
    }

    const edges = getNodeEdges(req.params.id, direction);

    res.json({
      success: true,
      nodeId: req.params.id,
      count: edges.length,
      edges
    });
  })
);

/**
 * Get related nodes
 * GET /api/graph/nodes/:id/related
 */
router.get('/nodes/:id/related',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type, depth = 1 } = req.query;
    const node = getNodeById(req.params.id);
    if (!node) {
      throw new AppError('Node not found', 404, 'NODE_NOT_FOUND');
    }

    const related = getRelatedNodes(req.params.id, type || null, parseInt(depth));

    res.json({
      success: true,
      nodeId: req.params.id,
      count: related.length,
      related
    });
  })
);

/**
 * Find shortest path
 * GET /api/graph/path/:from/:to
 */
router.get('/path/:from/:to',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const path = getShortestPath(req.params.from, req.params.to);

    if (!path) {
      return res.json({
        success: true,
        pathExists: false,
        path: []
      });
    }

    res.json({
      success: true,
      pathExists: true,
      distance: path.length - 1,
      path
    });
  })
);

/**
 * Find common connections
 * GET /api/graph/common/:id1/:id2
 */
router.get('/common/:id1/:id2',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const common = findCommonConnections(req.params.id1, req.params.id2);

    res.json({
      success: true,
      count: common.length,
      connections: common
    });
  })
);

/**
 * Delete edge
 * DELETE /api/graph/edges/:id
 */
router.delete('/edges/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const deleted = deleteEdge(req.params.id);
    if (!deleted) {
      throw new AppError('Edge not found', 404, 'EDGE_NOT_FOUND');
    }

    dataAudit('graph.edge_deleted', req, 'graph_edge', req.params.id);

    res.json({ success: true, message: 'Edge deleted' });
  })
);

/**
 * Get graph statistics
 * GET /api/graph/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const stats = getGraphStats();
    res.json({ success: true, stats });
  })
);

export default router;
