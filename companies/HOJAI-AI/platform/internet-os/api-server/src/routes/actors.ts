/**
 * Actor Routes
 * HTTP endpoints for actor operations
 */

import { Router } from 'express';
import { actorService } from '../services/actorService.js';

export const actorRoutes = Router();

// List all available actors
actorRoutes.get('/', async (_req, res) => {
  try {
    const actors = actorService.listActors();
    res.json({ actors, count: actors.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get actor details
actorRoutes.get('/:id', async (req, res) => {
  try {
    const actor = actorService.getActor(req.params.id);
    if (!actor) {
      return res.status(404).json({ error: 'Actor not found' });
    }
    res.json(actor);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Run an actor
actorRoutes.post('/:id/run', async (req, res) => {
  try {
    const { action, params, options } = req.body;
    const result = await actorService.runActor(req.params.id, action, params, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Batch run actors
actorRoutes.post('/batch', async (req, res) => {
  try {
    const { inputs, parallel } = req.body;
    if (parallel) {
      const results = await actorService.runBatchParallel(inputs);
      res.json({ results, count: results.length });
    } else {
      const results = await actorService.runBatch(inputs);
      res.json({ results, count: results.length });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Search actors
actorRoutes.get('/search/:query', async (req, res) => {
  try {
    const actors = actorService.searchActors(req.params.query);
    res.json({ actors, count: actors.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
