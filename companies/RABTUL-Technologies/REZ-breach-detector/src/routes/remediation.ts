import { Router, Request, Response, NextFunction } from 'express';
import { remediationEngine } from '../services/remediationEngine';
import { notificationService, NotificationChannel } from '../services/notificationService';
import { rootCauseAnalyzer } from '../services/rootCauseAnalyzer';
import { breachService } from '../services/breachService';
import { ValidationError } from '../utils/errors';

const router = Router();

router.post('/trigger/:breachId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = (req.body.type || 'auto') as 'auto' | 'manual' | 'semi-auto';
    const remediation = await remediationEngine.remediate(req.params.breachId, type);
    res.status(201).json({ success: remediation.status === 'completed', data: remediation, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const remediation = remediationEngine.getRemediation(req.params.id);
    if (!remediation) throw new ValidationError('Remediation not found');
    res.json({ success: true, data: remediation, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.get('/breach/:breachId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const remediations = remediationEngine.getRemediationsForBreach(req.params.breachId);
    res.json({ success: true, data: remediations, count: remediations.length, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.post('/channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel: NotificationChannel = req.body;
    if (!channel.name || !channel.type) throw new ValidationError('name and type required');
    notificationService.registerChannel(channel);
    res.status(201).json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.get('/channels', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: notificationService.getChannels(), timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

router.post('/analyze-cause/:breachId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const breach = breachService.getById(req.params.breachId);
    const analysis = rootCauseAnalyzer.analyze(breach);
    res.json({ success: true, data: analysis, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
