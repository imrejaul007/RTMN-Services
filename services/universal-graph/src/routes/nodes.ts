import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { GraphNode } from '../models/Node';
import { GraphResponse, EntityType } from '../types';

const router = Router();

// Validation schemas
const createNodeSchema = z.object({
  entityType: z.string(),
  entityId: z.string().min(1),
  name: z.string().min(1),
  properties: z.record(z.unknown()).optional().default({}),
  labels: z.array(z.string()).optional().default([]),
  source: z.string().optional(),
});

const updateNodeSchema = z.object({
  name: z.string().min(1).optional(),
  properties: z.record(z.unknown()).optional(),
  labels: z.array(z.string()).optional(),
});

const queryNodeSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  labels: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

// Create a new node
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createNodeSchema.parse(req.body);

    const existingNode = await GraphNode.findOne({
      entityType: data.entityType,
      entityId: data.entityId,
    });

    if (existingNode) {
      return res.status(409).json({
        success: false,
        error: 'Node already exists with this entityType and entityId',
      } as GraphResponse<null>);
    }

    const node = await GraphNode.create({
      nodeId: `${data.entityType}_${data.entityId}`,
      entityType: data.entityType as EntityType,
      entityId: data.entityId,
      name: data.name,
      properties: data.properties,
      labels: data.labels,
      metadata: {
        source: data.source,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    });

    res.status(201).json({
      success: true,
      data: node,
      meta: { timestamp: new Date() },
    } as GraphResponse<typeof node>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error creating node:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Get node by ID
router.get('/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const node = await GraphNode.findOne({ nodeId });

    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found',
      } as GraphResponse<null>);
    }

    res.json({
      success: true,
      data: node,
      meta: { timestamp: new Date() },
    } as GraphResponse<typeof node>);
  } catch (error) {
    console.error('Error fetching node:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Update a node
router.patch('/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const updates = updateNodeSchema.parse(req.body);

    const node = await GraphNode.findOneAndUpdate(
      { nodeId },
      {
        $set: {
          ...updates,
          'metadata.updatedAt': new Date(),
        },
        $inc: { 'metadata.version': 1 },
      },
      { new: true }
    );

    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found',
      } as GraphResponse<null>);
    }

    res.json({
      success: true,
      data: node,
      meta: { timestamp: new Date() },
    } as GraphResponse<typeof node>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error updating node:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Delete a node
router.delete('/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const node = await GraphNode.findOneAndDelete({ nodeId });

    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found',
      } as GraphResponse<null>);
    }

    res.json({
      success: true,
      data: { deleted: true, nodeId },
      meta: { timestamp: new Date() },
    } as GraphResponse<{ deleted: boolean; nodeId: string }>);
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Query nodes
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = queryNodeSchema.parse(req.query);
    const filter: Record<string, unknown> = {};

    if (query.entityType) {
      filter.entityType = query.entityType;
    }

    if (query.entityId) {
      filter.entityId = query.entityId;
    }

    if (query.labels) {
      filter.labels = { $in: query.labels.split(',') };
    }

    let nodeQuery = GraphNode.find(filter);

    if (query.search) {
      nodeQuery = GraphNode.find({
        $text: { $search: query.search },
        ...filter,
      });
    }

    const total = await GraphNode.countDocuments(filter);
    const nodes = await nodeQuery
      .skip(query.offset)
      .limit(query.limit)
      .sort({ 'metadata.updatedAt': -1 });

    res.json({
      success: true,
      data: nodes,
      meta: {
        timestamp: new Date(),
        count: nodes.length,
        offset: query.offset,
        total,
      },
    } as GraphResponse<typeof nodes>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error querying nodes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Batch create nodes
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { nodes } = req.body as { nodes: z.infer<typeof createNodeSchema>[] };

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nodes array is required',
      } as GraphResponse<null>);
    }

    const createdNodes = [];
    const errors = [];

    for (const nodeData of nodes) {
      try {
        const parsed = createNodeSchema.parse(nodeData);
        const existingNode = await GraphNode.findOne({
          entityType: parsed.entityType,
          entityId: parsed.entityId,
        });

        if (existingNode) {
          errors.push({
            entityType: parsed.entityType,
            entityId: parsed.entityId,
            error: 'Already exists',
          });
          continue;
        }

        const node = await GraphNode.create({
          nodeId: `${parsed.entityType}_${parsed.entityId}`,
          entityType: parsed.entityType,
          entityId: parsed.entityId,
          name: parsed.name,
          properties: parsed.properties,
          labels: parsed.labels,
          metadata: {
            source: parsed.source,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          },
        });
        createdNodes.push(node);
      } catch (err) {
        errors.push({ data: nodeData, error: String(err) });
      }
    }

    res.status(201).json({
      success: true,
      data: { created: createdNodes, errors },
      meta: {
        timestamp: new Date(),
        count: createdNodes.length,
      },
    } as GraphResponse<{ created: typeof createdNodes; errors: typeof errors }>);
  } catch (error) {
    console.error('Error batch creating nodes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

export default router;
