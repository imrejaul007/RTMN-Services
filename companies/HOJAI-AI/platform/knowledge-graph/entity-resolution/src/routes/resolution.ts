import { Router, Request, Response } from 'express';
import { ResolutionService } from '../services/resolution.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const resolutionService = new ResolutionService();

// Apply auth middleware
router.use(authMiddleware);

// POST /resolve - Resolve single entity
router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { entity, source, options } = req.body;
    if (!entity) {
      return res.status(400).json({ error: 'Entity is required' });
    }
    const result = await resolutionService.resolve(entity, source, options);
    res.json(result);
  } catch (error) {
    console.error('Error resolving entity:', error);
    res.status(500).json({ error: 'Failed to resolve entity' });
  }
});

// POST /resolve/batch - Batch resolve entities
router.post('/resolve/batch', async (req: Request, res: Response) => {
  try {
    const { entities, source, options } = req.body;
    if (!entities || !Array.isArray(entities)) {
      return res.status(400).json({ error: 'Entities array is required' });
    }
    const results = await resolutionService.batchResolve(entities, source, options);
    res.json({ results, count: results.length });
  } catch (error) {
    console.error('Error batch resolving entities:', error);
    res.status(500).json({ error: 'Failed to batch resolve entities' });
  }
});

// POST /resolve/link - Link extracted entity to canonical
router.post('/resolve/link', async (req: Request, res: Response) => {
  try {
    const { extractedEntity, canonicalId, confidence } = req.body;
    if (!extractedEntity || !canonicalId) {
      return res.status(400).json({ error: 'extractedEntity and canonicalId are required' });
    }
    const result = await resolutionService.linkEntity(extractedEntity, canonicalId, confidence);
    res.json(result);
  } catch (error) {
    console.error('Error linking entity:', error);
    res.status(500).json({ error: 'Failed to link entity' });
  }
});

// GET /entities/:id - Get canonical entity
router.get('/entities/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entity = await resolutionService.getCanonicalEntity(id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    res.json(entity);
  } catch (error) {
    console.error('Error getting entity:', error);
    res.status(500).json({ error: 'Failed to get entity' });
  }
});

// GET /entities/:id/sources - Get sources contributing to entity
router.get('/entities/:id/sources', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sources = await resolutionService.getEntitySources(id);
    res.json({ sources });
  } catch (error) {
    console.error('Error getting entity sources:', error);
    res.status(500).json({ error: 'Failed to get entity sources' });
  }
});

// GET /entities/:id/aliases - Get aliases for entity
router.get('/entities/:id/aliases', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const aliases = await resolutionService.getEntityAliases(id);
    res.json({ aliases });
  } catch (error) {
    console.error('Error getting entity aliases:', error);
    res.status(500).json({ error: 'Failed to get entity aliases' });
  }
});

// POST /entities/:id/merge - Merge entities
router.post('/entities/:id/merge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sourceIds } = req.body;
    if (!sourceIds || !Array.isArray(sourceIds)) {
      return res.status(400).json({ error: 'sourceIds array is required' });
    }
    const result = await resolutionService.mergeEntities(id, sourceIds);
    res.json(result);
  } catch (error) {
    console.error('Error merging entities:', error);
    res.status(500).json({ error: 'Failed to merge entities' });
  }
});

// POST /entities/:id/split - Split merged entity
router.post('/entities/:id/split', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { splitInto } = req.body;
    if (!splitInto || !Array.isArray(splitInto)) {
      return res.status(400).json({ error: 'splitInto array is required' });
    }
    const result = await resolutionService.splitEntity(id, splitInto);
    res.json(result);
  } catch (error) {
    console.error('Error splitting entity:', error);
    res.status(500).json({ error: 'Failed to split entity' });
  }
});

// GET /review-queue - Get review queue
router.get('/review-queue', async (req: Request, res: Response) => {
  try {
    const { limit, offset, status } = req.query;
    const queue = await resolutionService.getReviewQueue({
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      status: status as string
    });
    res.json(queue);
  } catch (error) {
    console.error('Error getting review queue:', error);
    res.status(500).json({ error: 'Failed to get review queue' });
  }
});

// POST /review-queue/:id/resolve - Resolve review item
router.post('/review-queue/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, canonicalId, confidence } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }
    const result = await resolutionService.resolveReviewItem(id, action, canonicalId, confidence);
    res.json(result);
  } catch (error) {
    console.error('Error resolving review item:', error);
    res.status(500).json({ error: 'Failed to resolve review item' });
  }
});

// GET /graph/:entityId/linked - Get linked entities
router.get('/graph/:entityId/linked', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { types } = req.query;
    const linked = await resolutionService.getLinkedEntities(entityId, types as string[]);
    res.json({ linked });
  } catch (error) {
    console.error('Error getting linked entities:', error);
    res.status(500).json({ error: 'Failed to get linked entities' });
  }
});

export default router;
