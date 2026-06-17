import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GraphEdge } from '../models/Edge';
import { GraphNode } from '../models/Node';
import { GraphResponse, EdgeType } from '../types';

const router = Router();

// Validation schemas
const createEdgeSchema = z.object({
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  edgeType: z.string().min(1),
  properties: z.record(z.unknown()).optional().default({}),
  weight: z.number().min(0).max(1).optional().default(1),
  source: z.string().optional(),
});

const updateEdgeSchema = z.object({
  properties: z.record(z.unknown()).optional(),
  weight: z.number().min(0).max(1).optional(),
});

const queryEdgeSchema = z.object({
  sourceNodeId: z.string().optional(),
  targetNodeId: z.string().optional(),
  edgeType: z.string().optional(),
  minWeight: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

// Create a new edge (relationship between nodes)
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createEdgeSchema.parse(req.body);

    // Verify source and target nodes exist
    const [sourceNode, targetNode] = await Promise.all([
      GraphNode.findOne({ nodeId: data.sourceNodeId }),
      GraphNode.findOne({ nodeId: data.targetNodeId }),
    ]);

    if (!sourceNode) {
      return res.status(404).json({
        success: false,
        error: `Source node not found: ${data.sourceNodeId}`,
      } as GraphResponse<null>);
    }

    if (!targetNode) {
      return res.status(404).json({
        success: false,
        error: `Target node not found: ${data.targetNodeId}`,
      } as GraphResponse<null>);
    }

    // Check for existing edge
    const existingEdge = await GraphEdge.findOne({
      sourceNodeId: data.sourceNodeId,
      targetNodeId: data.targetNodeId,
      edgeType: data.edgeType,
    });

    if (existingEdge) {
      return res.status(409).json({
        success: false,
        error: 'Edge already exists between these nodes with this type',
        data: existingEdge,
      } as GraphResponse<typeof existingEdge>);
    }

    const edgeId = `${data.sourceNodeId}_${data.edgeType}_${data.targetNodeId}`;

    const edge = await GraphEdge.create({
      edgeId,
      sourceNodeId: data.sourceNodeId,
      targetNodeId: data.targetNodeId,
      edgeType: data.edgeType as EdgeType,
      properties: data.properties,
      weight: data.weight,
      metadata: {
        source: data.source,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: edge,
      meta: { timestamp: new Date() },
    } as GraphResponse<typeof edge>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error creating edge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Get edge by ID
router.get('/:edgeId', async (req: Request, res: Response) => {
  try {
    const { edgeId } = req.params;
    const edge = await GraphEdge.findOne({ edgeId });

    if (!edge) {
      return res.status(404).json({
        success: false,
        error: 'Edge not found',
      } as GraphResponse<null>);
    }

    res.json({
      success: true,
      data: edge,
      meta: { timestamp: new Date() },
    } as GraphResponse<typeof edge>);
  } catch (error) {
    console.error('Error fetching edge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Update an edge
router.patch('/:edgeId', async (req: Request, res: Response) => {
  try {
    const { edgeId } = req.params;
    const updates = updateEdgeSchema.parse(req.body);

    const edge = await GraphEdge.findOneAndUpdate(
      { edgeId },
      {
        $set: {
          ...updates,
          'metadata.updatedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!edge) {
      return res.status(404).json({
        success: false,
        error: 'Edge not found',
      } as GraphResponse<null>);
    }

    res.json({
      success: true,
      data: edge,
      meta: { timestamp: new Date() },
    } as GraphResponse<typeof edge>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error updating edge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Delete an edge
router.delete('/:edgeId', async (req: Request, res: Response) => {
  try {
    const { edgeId } = req.params;
    const edge = await GraphEdge.findOneAndDelete({ edgeId });

    if (!edge) {
      return res.status(404).json({
        success: false,
        error: 'Edge not found',
      } as GraphResponse<null>);
    }

    res.json({
      success: true,
      data: { deleted: true, edgeId },
      meta: { timestamp: new Date() },
    } as GraphResponse<{ deleted: boolean; edgeId: string }>);
  } catch (error) {
    console.error('Error deleting edge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Query edges
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = queryEdgeSchema.parse(req.query);
    const filter: Record<string, unknown> = {};

    if (query.sourceNodeId) {
      filter.sourceNodeId = query.sourceNodeId;
    }

    if (query.targetNodeId) {
      filter.targetNodeId = query.targetNodeId;
    }

    if (query.edgeType) {
      filter.edgeType = query.edgeType;
    }

    if (query.minWeight !== undefined) {
      filter.weight = { $gte: query.minWeight };
    }

    const total = await GraphEdge.countDocuments(filter);
    const edges = await GraphEdge.find(filter)
      .skip(query.offset)
      .limit(query.limit)
      .sort({ 'metadata.createdAt': -1 });

    res.json({
      success: true,
      data: edges,
      meta: {
        timestamp: new Date(),
        count: edges.length,
        offset: query.offset,
        total,
      },
    } as GraphResponse<typeof edges>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error querying edges:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Get edges for a specific node
router.get('/node/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { direction, edgeType } = req.query;

    const filter: Record<string, unknown> = {};

    if (direction === 'incoming') {
      filter.targetNodeId = nodeId;
    } else if (direction === 'outgoing') {
      filter.sourceNodeId = nodeId;
    } else {
      filter.$or = [
        { sourceNodeId: nodeId },
        { targetNodeId: nodeId },
      ];
    }

    if (edgeType) {
      filter.edgeType = edgeType;
    }

    const edges = await GraphEdge.find(filter).sort({ 'metadata.createdAt': -1 });

    res.json({
      success: true,
      data: edges,
      meta: {
        timestamp: new Date(),
        count: edges.length,
      },
    } as GraphResponse<typeof edges>);
  } catch (error) {
    console.error('Error fetching node edges:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Get neighbors of a node
router.get('/neighbors/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { direction, limit } = req.query;

    let edges: InstanceType<typeof GraphEdge>[];

    if (direction === 'incoming') {
      edges = await GraphEdge.find({ targetNodeId: nodeId })
        .limit(Number(limit) || 50);
    } else if (direction === 'outgoing') {
      edges = await GraphEdge.find({ sourceNodeId: nodeId })
        .limit(Number(limit) || 50);
    } else {
      edges = await GraphEdge.find({
        $or: [
          { sourceNodeId: nodeId },
          { targetNodeId: nodeId },
        ],
      }).limit(Number(limit) || 100);
    }

    // Get unique neighbor node IDs
    const neighborIds = new Set<string>();
    const relationships = [];

    for (const edge of edges) {
      const neighborId = edge.sourceNodeId === nodeId
        ? edge.targetNodeId
        : edge.sourceNodeId;

      if (!neighborIds.has(neighborId)) {
        neighborIds.add(neighborId);
        relationships.push({
          edge,
          neighborId,
          direction: edge.sourceNodeId === nodeId ? 'outgoing' : 'incoming',
        });
      }
    }

    // Fetch neighbor nodes
    const neighbors = await GraphNode.find({ nodeId: { $in: Array.from(neighborIds) } });

    res.json({
      success: true,
      data: {
        nodeId,
        totalNeighbors: neighbors.length,
        relationships,
        neighbors,
      },
      meta: { timestamp: new Date() },
    });
  } catch (error) {
    console.error('Error fetching neighbors:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Batch create edges
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { edges } = req.body as { edges: z.infer<typeof createEdgeSchema>[] };

    if (!Array.isArray(edges) || edges.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Edges array is required',
      } as GraphResponse<null>);
    }

    const createdEdges = [];
    const errors = [];

    for (const edgeData of edges) {
      try {
        const parsed = createEdgeSchema.parse(edgeData);

        // Verify nodes exist
        const [sourceNode, targetNode] = await Promise.all([
          GraphNode.findOne({ nodeId: parsed.sourceNodeId }),
          GraphNode.findOne({ nodeId: parsed.targetNodeId }),
        ]);

        if (!sourceNode || !targetNode) {
          errors.push({
            sourceNodeId: parsed.sourceNodeId,
            targetNodeId: parsed.targetNodeId,
            error: 'Source or target node not found',
          });
          continue;
        }

        const existingEdge = await GraphEdge.findOne({
          sourceNodeId: parsed.sourceNodeId,
          targetNodeId: parsed.targetNodeId,
          edgeType: parsed.edgeType,
        });

        if (existingEdge) {
          errors.push({
            edge: parsed,
            error: 'Edge already exists',
          });
          continue;
        }

        const edge = await GraphEdge.create({
          edgeId: `${parsed.sourceNodeId}_${parsed.edgeType}_${parsed.targetNodeId}`,
          sourceNodeId: parsed.sourceNodeId,
          targetNodeId: parsed.targetNodeId,
          edgeType: parsed.edgeType as EdgeType,
          properties: parsed.properties,
          weight: parsed.weight,
          metadata: {
            source: parsed.source,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        createdEdges.push(edge);
      } catch (err) {
        errors.push({ data: edgeData, error: String(err) });
      }
    }

    res.status(201).json({
      success: true,
      data: { created: createdEdges, errors },
      meta: {
        timestamp: new Date(),
        count: createdEdges.length,
      },
    } as GraphResponse<{ created: typeof createdEdges; errors: typeof errors }>);
  } catch (error) {
    console.error('Error batch creating edges:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

export default router;
