import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Relationship, CreateRelationshipZodSchema, toRelationshipResponse } from '../models/Relationship.js';
import { twinService } from '../services/twinService.js';
import { eventService } from '../services/eventService.js';
import { syncService } from '../services/syncService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation schema for query params
const RelationshipQuerySchema = z.object({
  limit: z.string().optional().transform(v => v ? parseInt(v) : 50),
  offset: z.string().optional().transform(v => v ? parseInt(v) : 0),
  type: z.string().optional(),
});

/**
 * GET /twins/:id/relationships - Get relationships for a twin
 */
router.get('/twins/:id/relationships', async (req: Request, res: Response) => {
  try {
    const { type, limit, offset } = RelationshipQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = { sourceTwinId: req.params.id };
    if (type) {
      filter.type = type;
    }

    const [outgoing, incoming, twin] = await Promise.all([
      Relationship.find(filter).limit(limit).skip(offset),
      Relationship.find({ targetTwinId: req.params.id }).limit(limit).skip(offset),
      twinService.getTwinById(req.params.id),
    ]);

    if (!twin) {
      res.status(404).json({ error: 'Twin not found' });
      return;
    }

    res.json({
      twinId: req.params.id,
      outgoing: outgoing.map(toRelationshipResponse),
      incoming: incoming.map(toRelationshipResponse),
      totalOutgoing: outgoing.length,
      totalIncoming: incoming.length,
    });
  } catch (error) {
    logger.error('Error getting relationships:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get relationships' });
  }
});

/**
 * GET /twins/:id/relationships/incoming - Get incoming relationships only
 */
router.get('/twins/:id/relationships/incoming', async (req: Request, res: Response) => {
  try {
    const { type, limit, offset } = RelationshipQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = { targetTwinId: req.params.id };
    if (type) {
      filter.type = type;
    }

    const twin = await twinService.getTwinById(req.params.id);
    if (!twin) {
      res.status(404).json({ error: 'Twin not found' });
      return;
    }

    const relationships = await Relationship.find(filter)
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });

    res.json({
      twinId: req.params.id,
      relationships: relationships.map(r => ({
        ...toRelationshipResponse(r),
        sourceTwinId: r.sourceTwinId, // Include for incoming relationships
      })),
      total: relationships.length,
    });
  } catch (error) {
    logger.error('Error getting incoming relationships:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get incoming relationships' });
  }
});

/**
 * GET /twins/:id/relationships/outgoing - Get outgoing relationships only
 */
router.get('/twins/:id/relationships/outgoing', async (req: Request, res: Response) => {
  try {
    const { type, limit, offset } = RelationshipQuerySchema.parse(req.query);

    const filter: Record<string, unknown> = { sourceTwinId: req.params.id };
    if (type) {
      filter.type = type;
    }

    const twin = await twinService.getTwinById(req.params.id);
    if (!twin) {
      res.status(404).json({ error: 'Twin not found' });
      return;
    }

    const relationships = await Relationship.find(filter)
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });

    res.json({
      twinId: req.params.id,
      relationships: relationships.map(toRelationshipResponse),
      total: relationships.length,
    });
  } catch (error) {
    logger.error('Error getting outgoing relationships:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get outgoing relationships' });
  }
});

/**
 * POST /twins/:id/relationships - Add a relationship
 */
router.post('/twins/:id/relationships', async (req: Request, res: Response) => {
  try {
    const validation = CreateRelationshipZodSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
      return;
    }

    const { targetId, targetType, type, metadata } = validation.data;

    // Verify source twin exists
    const sourceTwin = await twinService.getTwinById(req.params.id);
    if (!sourceTwin) {
      res.status(404).json({ error: 'Source twin not found' });
      return;
    }

    // Verify target twin exists
    const targetTwin = await twinService.getTwinById(targetId);
    if (!targetTwin) {
      res.status(404).json({ error: 'Target twin not found' });
      return;
    }

    // Check for existing relationship
    const existing = await Relationship.findOne({
      sourceTwinId: req.params.id,
      targetTwinId: targetId,
    });

    if (existing) {
      res.status(409).json({ error: 'Relationship already exists' });
      return;
    }

    // Create relationship
    const relationship = new Relationship({
      relationshipId: uuidv4(),
      sourceTwinId: req.params.id,
      targetTwinId: targetId,
      targetType,
      type,
      metadata,
    });

    await relationship.save();
    logger.info(`Created relationship: ${req.params.id} -> ${targetId}`, { type });

    // Record event
    await eventService.recordEvent({
      twinId: req.params.id,
      action: 'relationship_added',
      previousState: null,
      newState: { targetId, targetType, type, metadata },
      source: 'api',
    });

    // Broadcast update
    const relResponse = toRelationshipResponse(relationship);
    await syncService.broadcastRelationshipUpdate(req.params.id, relResponse as unknown as Record<string, unknown>, 'added');

    res.status(201).json(relResponse);
  } catch (error) {
    logger.error('Error creating relationship:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to create relationship' });
  }
});

/**
 * DELETE /twins/:id/relationships/:relationshipId - Remove a relationship
 */
router.delete('/twins/:id/relationships/:relationshipId', async (req: Request, res: Response) => {
  try {
    const relationship = await Relationship.findOne({
      relationshipId: req.params.relationshipId,
      sourceTwinId: req.params.id,
    });

    if (!relationship) {
      res.status(404).json({ error: 'Relationship not found' });
      return;
    }

    const targetId = relationship.targetTwinId;
    const type = relationship.type;

    await Relationship.deleteOne({ relationshipId: req.params.relationshipId });
    logger.info(`Deleted relationship: ${req.params.id} -> ${targetId}`);

    // Record event
    await eventService.recordEvent({
      twinId: req.params.id,
      action: 'relationship_removed',
      previousState: { targetId, type },
      newState: null,
      source: 'api',
    });

    // Broadcast update
    await syncService.broadcastRelationshipUpdate(
      req.params.id,
      { targetId, type } as unknown as Record<string, unknown>,
      'removed'
    );

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting relationship:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to delete relationship' });
  }
});

/**
 * GET /twins/:id/relationships/:relationshipId - Get a specific relationship
 */
router.get('/twins/:id/relationships/:relationshipId', async (req: Request, res: Response) => {
  try {
    const relationship = await Relationship.findOne({
      relationshipId: req.params.relationshipId,
      sourceTwinId: req.params.id,
    });

    if (!relationship) {
      res.status(404).json({ error: 'Relationship not found' });
      return;
    }

    res.json(toRelationshipResponse(relationship));
  } catch (error) {
    logger.error('Error getting relationship:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get relationship' });
  }
});

/**
 * PATCH /twins/:id/relationships/:relationshipId - Update relationship metadata
 */
router.patch('/twins/:id/relationships/:relationshipId', async (req: Request, res: Response) => {
  try {
    const { metadata } = req.body;

    const relationship = await Relationship.findOne({
      relationshipId: req.params.relationshipId,
      sourceTwinId: req.params.id,
    });

    if (!relationship) {
      res.status(404).json({ error: 'Relationship not found' });
      return;
    }

    if (metadata) {
      relationship.metadata = { ...relationship.metadata, ...metadata };
    }

    await relationship.save();
    logger.info(`Updated relationship metadata: ${req.params.relationshipId}`);

    res.json(toRelationshipResponse(relationship));
  } catch (error) {
    logger.error('Error updating relationship:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to update relationship' });
  }
});

/**
 * GET /relationships - Query relationships across all twins
 */
router.get('/relationships', async (req: Request, res: Response) => {
  try {
    const { type, targetType, limit, offset } = req.query;

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (targetType) filter.targetType = targetType;

    const relationships = await Relationship.find(filter)
      .limit(Math.min(parseInt(limit as string) || 50, 100))
      .skip(parseInt(offset as string) || 0)
      .sort({ createdAt: -1 });

    const total = await Relationship.countDocuments(filter);

    res.json({
      relationships: relationships.map(toRelationshipResponse),
      total,
      limit: parseInt(limit as string) || 50,
      offset: parseInt(offset as string) || 0,
    });
  } catch (error) {
    logger.error('Error querying relationships:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to query relationships' });
  }
});

export default router;
