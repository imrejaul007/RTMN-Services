import { Router, Request, Response, NextFunction } from 'express';
import { incidentManager } from '../services/incidentManager';
import { breachService } from '../services/breachService';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { breachId, title, description, severity, serviceId, breachIds } = req.body;
    let incident;
    if (breachId) {
      const breach = breachService.getById(breachId);
      incident = incidentManager.createFromBreach(breachId, { description: title || breach.description, serviceId: serviceId || breach.serviceId, severity: severity || breach.severity, breachIds });
    } else {
      if (!title) throw new ValidationError('title required');
      incident = incidentManager.createFromBreach('manual', { description, serviceId, severity });
    }
    res.status(201).json({ success: true, data: incident, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { const incident = incidentManager.getById(req.params.id); if (!incident) throw new NotFoundError(`Incident ${req.params.id}`); res.json({ success: true, data: incident, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { const { status, severity } = req.query; const incidents = incidentManager.getAll({ status, severity } as any); res.json({ success: true, data: incidents, count: incidents.length, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try { const { status, actor, note } = req.body; if (!status) throw new ValidationError('status required'); const incident = incidentManager.updateStatus(req.params.id, status, actor, note); res.json({ success: true, data: incident, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.patch('/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
  try { const { assignee } = req.body; if (!assignee) throw new ValidationError('assignee required'); const incident = incidentManager.assign(req.params.id, assignee); res.json({ success: true, data: incident, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

export default router;
