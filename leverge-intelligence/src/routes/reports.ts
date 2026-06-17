import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const reports = new Map();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const allReports = Array.from(reports.values()).filter(r => r.createdBy === req.userId);
    res.json({ reports: allReports, total: allReports.length });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, format } = req.body;
    const report = {
      id: uuidv4(),
      name,
      type,
      format: format || 'pdf',
      status: 'completed',
      createdBy: req.userId,
      createdAt: new Date(),
      downloadUrl: `/api/reports/${uuidv4()}/download`
    };
    reports.set(report.id, report);
    res.status(201).json(report);
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
