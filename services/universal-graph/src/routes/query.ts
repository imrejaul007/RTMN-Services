import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GraphNode } from '../models/Node';
import { GraphEdge } from '../models/Edge';
import { GraphResponse, EntityType, EdgeType, TraversalResult } from '../types';
import { GraphService } from '../services/graph';
import { TraversalService } from '../services/traversal';

const router = Router();
const graphService = new GraphService();
const traversalService = new TraversalService();

// Query schema
const graphQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  labels: z.string().optional(),
  properties: z.string().optional(), // JSON string
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

// Traversal schema
const traversalSchema = z.object({
  startNodeId: z.string().min(1),
  depth: z.coerce.number().min(1).max(10).optional().default(3),
  edgeTypes: z.array(z.string()).optional(),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('outgoing'),
  includeProperties: z.boolean().optional().default(false),
});

// Aggregation schema
const aggregationSchema = z.object({
  groupBy: z.enum(['entityType', 'edgeType', 'label']).min(1),
  metric: z.enum(['count', 'sum', 'avg']).optional().default('count'),
  property: z.string().optional(),
  filter: z.record(z.unknown()).optional(),
});

// Get graph statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await graphService.getGraphStats();

    res.json({
      success: true,
      data: stats,
      meta: { timestamp: new Date() },
    } as GraphResponse<typeof stats>);
  } catch (error) {
    console.error('Error fetching graph stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Traverse from a node
router.post('/traverse', async (req: Request, res: Response) => {
  try {
    const params = traversalSchema.parse(req.body);

    const result = await traversalService.breadthFirstTraversal({
      startNodeId: params.startNodeId,
      maxDepth: params.depth,
      edgeTypes: params.edgeTypes as EdgeType[] | undefined,
      direction: params.direction,
      includeProperties: params.includeProperties,
    });

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date(),
        count: result.nodes.length,
        edges: result.edges.length,
      },
    } as GraphResponse<TraversalResult>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error traversing graph:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Aggregation queries
router.post('/aggregate', async (req: Request, res: Response) => {
  try {
    const params = aggregationSchema.parse(req.body);
    let result: Record<string, unknown>[] = [];

    if (params.groupBy === 'entityType') {
      // Group nodes by entity type
      const nodes = await GraphNode.aggregate([
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      result = nodes;
    } else if (params.groupBy === 'edgeType') {
      // Group edges by type
      const edges = await GraphEdge.aggregate([
        { $group: { _id: '$edgeType', count: { $sum: 1 }, avgWeight: { $avg: '$weight' } } },
        { $sort: { count: -1 } },
      ]);
      result = edges;
    } else if (params.groupBy === 'label') {
      // Group nodes by labels
      const nodes = await GraphNode.aggregate([
        { $unwind: '$labels' },
        { $group: { _id: '$labels', count: { $sum: 1 }, types: { $addToSet: '$entityType' } } },
        { $sort: { count: -1 } },
      ]);
      result = nodes;
    }

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date(),
        count: result.length,
      },
    } as GraphResponse<typeof result>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error aggregating:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Find nodes by pattern (text search + filters)
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { search, filters, limit, offset } = req.body;

    const query: Record<string, unknown> = {};

    if (filters?.entityType) {
      query.entityType = filters.entityType;
    }

    if (filters?.entityId) {
      query.entityId = filters.entityId;
    }

    if (filters?.labels && filters.labels.length > 0) {
      query.labels = { $in: filters.labels };
    }

    let nodesQuery;

    if (search) {
      // Text search with filters
      nodesQuery = GraphNode.find({
        $text: { $search: search },
        ...query,
      }).skip(offset || 0).limit(limit || 20);
    } else {
      nodesQuery = GraphNode.find(query)
        .skip(offset || 0)
        .limit(limit || 20)
        .sort({ 'metadata.updatedAt': -1 });
    }

    const nodes = await nodesQuery;
    const total = await GraphNode.countDocuments(query);

    res.json({
      success: true,
      data: nodes,
      meta: {
        timestamp: new Date(),
        count: nodes.length,
        total,
      },
    } as GraphResponse<typeof nodes>);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Get subgraph (nodes and edges around a specific node)
router.get('/subgraph/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { depth, edgeTypes } = req.query;

    const subgraph = await graphService.getSubgraph({
      nodeId,
      depth: Number(depth) || 2,
      edgeTypes: edgeTypes ? (edgeTypes as string).split(',') as EdgeType[] : undefined,
    });

    res.json({
      success: true,
      data: subgraph,
      meta: {
        timestamp: new Date(),
        nodes: subgraph.nodes.length,
        edges: subgraph.edges.length,
      },
    } as GraphResponse<typeof subgraph>);
  } catch (error) {
    console.error('Error fetching subgraph:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Network analysis for a node
router.get('/analyze/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const analysis = await graphService.analyzeNode(nodeId);

    res.json({
      success: true,
      data: analysis,
      meta: { timestamp: new Date() },
    } as GraphResponse<typeof analysis>);
  } catch (error) {
    console.error('Error analyzing node:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Find common neighbors between two nodes
router.get('/common-neighbors/:nodeId1/:nodeId2', async (req: Request, res: Response) => {
  try {
    const { nodeId1, nodeId2 } = req.params;

    const neighbors1 = await GraphEdge.distinct('targetNodeId', { sourceNodeId: nodeId1 });
    const neighbors1Incoming = await GraphEdge.distinct('sourceNodeId', { targetNodeId: nodeId1 });

    const neighbors2 = await GraphEdge.distinct('targetNodeId', { sourceNodeId: nodeId2 });
    const neighbors2Incoming = await GraphEdge.distinct('sourceNodeId', { targetNodeId: nodeId2 });

    const allNeighbors1 = new Set([...neighbors1, ...neighbors1Incoming]);
    const allNeighbors2 = new Set([...neighbors2, ...neighbors2Incoming]);

    // Find common neighbors
    const commonNeighborIds = [...allNeighbors1].filter(id => allNeighbors2.has(id));

    const commonNeighbors = await GraphNode.find({ nodeId: { $in: commonNeighborIds } });

    // Find edges connecting common neighbors to each node
    const edges = await GraphEdge.find({
      $or: [
        { sourceNodeId: nodeId1, targetNodeId: { $in: commonNeighborIds } },
        { sourceNodeId: { $in: commonNeighborIds }, targetNodeId: nodeId1 },
        { sourceNodeId: nodeId2, targetNodeId: { $in: commonNeighborIds } },
        { sourceNodeId: { $in: commonNeighborIds }, targetNodeId: nodeId2 },
      ],
    });

    res.json({
      success: true,
      data: {
        nodeId1,
        nodeId2,
        commonNeighbors,
        connectingEdges: edges,
        total: commonNeighbors.length,
      },
      meta: { timestamp: new Date() },
    });
  } catch (error) {
    console.error('Error finding common neighbors:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Entity type distribution with connections
router.get('/entity-connections', async (req: Request, res: Response) => {
  try {
    const connections = await graphService.getEntityTypeConnections();

    res.json({
      success: true,
      data: connections,
      meta: { timestamp: new Date() },
    } as GraphResponse<typeof connections>);
  } catch (error) {
    console.error('Error fetching entity connections:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

export default router;
