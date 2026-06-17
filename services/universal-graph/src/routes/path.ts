import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GraphNode } from '../models/Node';
import { GraphEdge } from '../models/Edge';
import { GraphResponse, EdgeType } from '../types';
import { TraversalService } from '../services/traversal';

const router = Router();
const traversalService = new TraversalService();

// Path query schema
const pathQuerySchema = z.object({
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  maxDepth: z.coerce.number().min(1).max(10).optional().default(5),
  edgeTypes: z.array(z.string()).optional(),
  includeWeights: z.boolean().optional().default(true),
  limit: z.coerce.number().min(1).max(20).optional().default(1),
});

// Shortest path between two nodes
router.post('/shortest', async (req: Request, res: Response) => {
  try {
    const params = pathQuerySchema.parse(req.body);

    // Verify both nodes exist
    const [sourceNode, targetNode] = await Promise.all([
      GraphNode.findOne({ nodeId: params.sourceNodeId }),
      GraphNode.findOne({ nodeId: params.targetNodeId }),
    ]);

    if (!sourceNode) {
      return res.status(404).json({
        success: false,
        error: `Source node not found: ${params.sourceNodeId}`,
      } as GraphResponse<null>);
    }

    if (!targetNode) {
      return res.status(404).json({
        success: false,
        error: `Target node not found: ${params.targetNodeId}`,
      } as GraphResponse<null>);
    }

    const path = await traversalService.findShortestPath({
      sourceNodeId: params.sourceNodeId,
      targetNodeId: params.targetNodeId,
      maxDepth: params.maxDepth,
      edgeTypes: params.edgeTypes as EdgeType[] | undefined,
      includeWeights: params.includeWeights,
    });

    if (!path) {
      return res.json({
        success: true,
        data: { found: false, path: null, message: 'No path found' },
        meta: { timestamp: new Date() },
      });
    }

    res.json({
      success: true,
      data: {
        found: true,
        path: path.path,
        edges: path.edges,
        totalWeight: path.totalWeight,
        depth: path.depth,
      },
      meta: { timestamp: new Date() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error finding shortest path:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Find all paths between two nodes
router.post('/all', async (req: Request, res: Response) => {
  try {
    const params = pathQuerySchema.parse(req.body);

    const paths = await traversalService.findAllPaths({
      sourceNodeId: params.sourceNodeId,
      targetNodeId: params.targetNodeId,
      maxDepth: params.maxDepth,
      edgeTypes: params.edgeTypes as EdgeType[] | undefined,
      limit: params.limit,
    });

    res.json({
      success: true,
      data: {
        totalPaths: paths.length,
        paths: paths.map(p => ({
          path: p.path,
          edges: p.edges,
          totalWeight: p.totalWeight,
          depth: p.depth,
        })),
      },
      meta: { timestamp: new Date() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error finding all paths:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Find all nodes reachable from a source
router.post('/reachable', async (req: Request, res: Response) => {
  try {
    const { sourceNodeId, maxDepth, edgeTypes } = req.body;

    if (!sourceNodeId) {
      return res.status(400).json({
        success: false,
        error: 'sourceNodeId is required',
      } as GraphResponse<null>);
    }

    const reachable = await traversalService.findReachableNodes({
      sourceNodeId,
      maxDepth: maxDepth || 5,
      edgeTypes,
    });

    res.json({
      success: true,
      data: reachable,
      meta: {
        timestamp: new Date(),
        count: reachable.length,
      },
    });
  } catch (error) {
    console.error('Error finding reachable nodes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Check if two nodes are connected
router.get('/connected/:sourceNodeId/:targetNodeId', async (req: Request, res: Response) => {
  try {
    const { sourceNodeId, targetNodeId } = req.params;
    const { maxDepth } = req.query;

    const connected = await traversalService.areConnected(
      sourceNodeId,
      targetNodeId,
      Number(maxDepth) || 5
    );

    res.json({
      success: true,
      data: {
        sourceNodeId,
        targetNodeId,
        connected,
      },
      meta: { timestamp: new Date() },
    });
  } catch (error) {
    console.error('Error checking connection:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Get connection chain (sequence of edges connecting two entities)
router.get('/chain/:entityType1/:entityId1/:entityType2/:entityId2', async (req: Request, res: Response) => {
  try {
    const { entityType1, entityId1, entityType2, entityId2 } = req.params;
    const { maxDepth } = req.query;

    const sourceNodeId = `${entityType1}_${entityId1}`;
    const targetNodeId = `${entityType2}_${entityId2}`;

    // Verify nodes exist
    const [sourceNode, targetNode] = await Promise.all([
      GraphNode.findOne({ nodeId: sourceNodeId }),
      GraphNode.findOne({ nodeId: targetNodeId }),
    ]);

    if (!sourceNode || !targetNode) {
      return res.status(404).json({
        success: false,
        error: 'One or both nodes not found',
      } as GraphResponse<null>);
    }

    const path = await traversalService.findShortestPath({
      sourceNodeId,
      targetNodeId,
      maxDepth: Number(maxDepth) || 5,
    });

    if (!path) {
      return res.json({
        success: true,
        data: {
          found: false,
          sourceNode,
          targetNode,
          message: 'No connection found between these entities',
        },
        meta: { timestamp: new Date() },
      });
    }

    // Build detailed chain with entity info
    const chain = path.path.map((node, index) => {
      const edge = path.edges[index];
      return {
        step: index + 1,
        from: node,
        via: edge ? { edgeType: edge.edgeType, properties: edge.properties } : null,
        to: path.path[index + 1] || null,
      };
    });

    res.json({
      success: true,
      data: {
        found: true,
        sourceNode,
        targetNode,
        chain,
        totalWeight: path.totalWeight,
        hops: path.depth,
      },
      meta: { timestamp: new Date() },
    });
  } catch (error) {
    console.error('Error finding connection chain:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Find intermediate nodes connecting two entity types
router.get('/connectors/:entityType1/:entityType2', async (req: Request, res: Response) => {
  try {
    const { entityType1, entityType2 } = req.params;
    const { minConnections, limit } = req.query;

    // Find nodes of type 1
    const nodesType1 = await GraphNode.find({ entityType: entityType1 });
    const nodesType2 = await GraphNode.find({ entityType: entityType2 });

    if (nodesType1.length === 0 || nodesType2.length === 0) {
      return res.json({
        success: true,
        data: {
          connectors: [],
          message: 'No nodes found for one or both entity types',
        },
        meta: { timestamp: new Date() },
      });
    }

    // Find common neighbors that connect both types
    const connectors: Record<string, {
      node: InstanceType<typeof GraphNode>;
      connectionsToType1: number;
      connectionsToType2: number;
      totalConnections: number;
    }> = {};

    for (const node1 of nodesType1.slice(0, 100)) { // Limit for performance
      const edges1 = await GraphEdge.find({
        $or: [
          { sourceNodeId: node1.nodeId },
          { targetNodeId: node1.nodeId },
        ],
      });

      for (const edge of edges1) {
        const neighborId = edge.sourceNodeId === node1.nodeId
          ? edge.targetNodeId
          : edge.sourceNodeId;

        if (!connectors[neighborId]) {
          const neighborNode = await GraphNode.findOne({ nodeId: neighborId });
          if (neighborNode) {
            connectors[neighborId] = {
              node: neighborNode,
              connectionsToType1: 0,
              connectionsToType2: 0,
              totalConnections: 0,
            };
          }
        }

        if (connectors[neighborId]) {
          connectors[neighborId].connectionsToType1++;
          connectors[neighborId].totalConnections++;
        }
      }
    }

    for (const node2 of nodesType2.slice(0, 100)) {
      const edges2 = await GraphEdge.find({
        $or: [
          { sourceNodeId: node2.nodeId },
          { targetNodeId: node2.nodeId },
        ],
      });

      for (const edge of edges2) {
        const neighborId = edge.sourceNodeId === node2.nodeId
          ? edge.targetNodeId
          : edge.sourceNodeId;

        if (connectors[neighborId]) {
          connectors[neighborId].connectionsToType2++;
        }
      }
    }

    // Filter and sort connectors
    let result = Object.values(connectors)
      .filter(c => c.connectionsToType1 > 0 && c.connectionsToType2 > 0)
      .sort((a, b) => b.totalConnections - a.totalConnections);

    if (minConnections) {
      result = result.filter(c => c.totalConnections >= Number(minConnections));
    }

    if (limit) {
      result = result.slice(0, Number(limit));
    }

    res.json({
      success: true,
      data: {
        entityType1,
        entityType2,
        connectors: result,
        total: result.length,
      },
      meta: { timestamp: new Date() },
    });
  } catch (error) {
    console.error('Error finding connectors:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

export default router;
