/**
 * History Routes
 * HTTP endpoints for searching historical data
 *
 * REUSES: MemoryOS (4703) for storage
 */

import { Router } from 'express';
import { memoryIntegration } from '../integrations/memory.js';

export const historyRoutes = Router();

// Search all history
historyRoutes.get('/', async (req, res) => {
  try {
    const { query, limit = 100, offset = 0 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const results = await memoryIntegration.search(
      query as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get entity history
historyRoutes.get('/entity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { limit = 100 } = req.query;

    const history = await memoryIntegration.getEntityHistory(
      entityId,
      parseInt(limit as string)
    );

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get changes by type
historyRoutes.get('/changes/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 100, since } = req.query;

    const changes = await memoryIntegration.getChangesByType(
      type,
      parseInt(limit as string),
      since ? new Date(since as string) : undefined
    );

    res.json({ changes, count: changes.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get timeline for an entity
historyRoutes.get('/timeline/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { startDate, endDate } = req.query;

    const timeline = await memoryIntegration.getTimeline(
      entityId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get statistics
historyRoutes.get('/stats', async (_req, res) => {
  try {
    const stats = await memoryIntegration.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Store custom history entry
historyRoutes.post('/', async (req, res) => {
  try {
    const { entityId, content, metadata } = req.body;

    if (!entityId || !content) {
      return res.status(400).json({ error: 'entityId and content required' });
    }

    const entry = await memoryIntegration.store({
      entityId,
      content,
      metadata,
      type: 'custom_history',
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
