import { Router, Request, Response, NextFunction } from 'express';
import { slaService } from '../services/slaService';
import { validateSLA } from '../validators/slaValidator';
import { NotFoundError } from '../utils/errors';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try { validateSLA(req.body); const sla = slaService.create(req.body); res.status(201).json({ success: true, data: sla, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { const sla = slaService.getById(req.params.id); res.json({ success: true, data: sla, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { const { serviceId, provider, consumer, status } = req.query; const slas = slaService.getAll({ serviceId, provider, consumer, status } as any); res.json({ success: true, data: slas, count: slas.length, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { const sla = slaService.update(req.params.id, req.body); res.json({ success: true, data: sla, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try { const { status } = req.body; if (!status) throw new NotFoundError('status'); const sla = slaService.updateStatus(req.params.id, status); res.json({ success: true, data: sla, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { const deleted = slaService.delete(req.params.id); if (!deleted) throw new NotFoundError(`SLA ${req.params.id}`); res.json({ success: true, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.get('/stats/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: slaService.getStats(), timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

export default router;
