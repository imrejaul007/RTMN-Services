import { Router, Request, Response, NextFunction } from 'express';
import { breachService } from '../services/breachService';
import { NotFoundError } from '../utils/errors';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try { const breach = breachService.detect(req.body); res.status(201).json({ success: true, data: breach, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { const breach = breachService.getById(req.params.id); res.json({ success: true, data: breach, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { const { slaId, serviceId, severity, status } = req.query; const breaches = breachService.getAll({ slaId, serviceId, severity, status } as any); res.json({ success: true, data: breaches, count: breaches.length, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try { const { status, actor } = req.body; if (!status) throw new NotFoundError('status'); const breach = breachService.updateStatus(req.params.id, status, actor); res.json({ success: true, data: breach, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { const deleted = breachService.delete(req.params.id); if (!deleted) throw new NotFoundError(`Breach ${req.params.id}`); res.json({ success: true, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.get('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try { const events = breachService.getEvents(req.params.id); res.json({ success: true, data: events, count: events.length, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.get('/stats/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: breachService.getStats(), timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

export default router;
