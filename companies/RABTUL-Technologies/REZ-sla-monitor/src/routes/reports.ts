import { Router, Request, Response, NextFunction } from 'express';
import { reportGenerator } from '../services/reportGenerator';
import { ValidationError } from '../utils/errors';

const router = Router();

router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slaId, startDate, endDate } = req.body;
    if (!slaId) throw new ValidationError('slaId is required');
    if (!startDate || !endDate) throw new ValidationError('startDate and endDate are required');
    const report = reportGenerator.generate(slaId, { start: new Date(startDate), end: new Date(endDate) });
    res.status(201).json({ success: true, data: report, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.get('/:slaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const report = reportGenerator.generate(req.params.slaId, { start: startDate, end: endDate });
    res.json({ success: true, data: report, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

export default router;
