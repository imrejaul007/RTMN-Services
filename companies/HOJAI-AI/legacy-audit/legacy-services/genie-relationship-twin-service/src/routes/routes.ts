/**
 * Routes
 */
import { Router, Request, Response } from 'express';
import * as service from '../services/relationshipTwinService.js';

const router = Router();

const resp = (s: boolean, d?: any) => ({ success: s, data: d, meta: { timestamp: new Date().toISOString() } });

// GET /relationships
router.get('/relationships', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const rels = await service.getRelationships(userId);
  res.json(resp(true, { relationships: rels }));
});

// POST /relationships
router.post('/relationships', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const rel = await service.addRelationship(userId, req.body);
  res.status(201).json(resp(true, rel));
});

// GET /relationships/summary
router.get('/relationships/summary', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const summary = await service.getSummary(userId);
  res.json(resp(true, summary));
});

// POST /relationships/:id/interactions
router.post('/relationships/:id/interactions', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const rel = await service.addInteraction(req.params.id, userId, req.body);
  if (!rel) { res.status(404).json(resp(false)); return; }
  res.json(resp(true, rel));
});

export default router;
