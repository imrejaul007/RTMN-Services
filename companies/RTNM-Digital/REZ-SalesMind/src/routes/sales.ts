/**
 * Sales Routes - Sales intelligence endpoints
 */
import { Router, Request, Response } from 'express';
import { isValidLeadId } from '../middleware/validation.js';

const router = Router();

router.get('/intelligence/:leadId', async (req: Request, res: Response) => {
    const { leadId } = req.params;
    if (!isValidLeadId(leadId)) return res.status(400).json({ error: 'Invalid lead ID' });
    res.json({ leadId, overallScore: 75, conversionProbability: 65, recommendations: ['Schedule call'] });
});

router.get('/pre-call/:leadId', async (req: Request, res: Response) => {
    const { leadId } = req.params;
    if (!isValidLeadId(leadId)) return res.status(400).json({ error: 'Invalid lead ID' });
    res.json({ leadId, talkingPoints: ['ROI focus', 'Quick implementation'], questionsToAsk: ['Timeline?', 'Budget?'] });
});

router.get('/twin/:leadId', async (req: Request, res: Response) => {
    const { leadId } = req.params;
    if (!isValidLeadId(leadId)) return res.status(400).json({ error: 'Invalid lead ID' });
    res.json({ leadId, persona: 'Tech Decision Maker', bestContactTime: 'Morning' });
});

router.get('/talking-points/:leadId', async (req: Request, res: Response) => {
    const { leadId } = req.params;
    if (!isValidLeadId(leadId)) return res.status(400).json({ error: 'Invalid lead ID' });
    res.json({ leadId, talkingPoints: ['Reduce costs', 'Increase efficiency'] });
});

router.get('/next-action/:leadId', async (req: Request, res: Response) => {
    const { leadId } = req.params;
    if (!isValidLeadId(leadId)) return res.status(400).json({ error: 'Invalid lead ID' });
    res.json({ leadId, action: 'Send follow-up email', priority: 'high', dueDate: 'Today' });
});

router.get('/signals/:leadId', async (req: Request, res: Response) => {
    const { leadId } = req.params;
    if (!isValidLeadId(leadId)) return res.status(400).json({ error: 'Invalid lead ID' });
    res.json({ leadId, signals: [{ type: 'engagement', score: 80 }] });
});

router.get('/pipeline', async (req: Request, res: Response) => {
    res.json({ totalLeads: 25, totalValue: 450000, stages: { new: 10, contacted: 8, qualified: 4 } });
});

router.get('/pipeline-summary', async (req: Request, res: Response) => {
    res.json({ summary: 'Pipeline healthy', healthScore: 78 });
});

export { router as salesRoutes };
