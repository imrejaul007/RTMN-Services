/**
 * Dashboard Routes - Pipeline visualization
 */
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
    res.json({
        totalLeads: 25, totalDeals: 12, totalValue: 450000,
        conversionRate: 32, avgDealSize: 37500, activeCampaigns: 3
    });
});

router.get('/pipeline-chart', async (req: Request, res: Response) => {
    res.json({
        stages: [
            { stage: 'New', count: 10, value: 50000 },
            { stage: 'Contacted', count: 8, value: 120000 },
            { stage: 'Qualified', count: 4, value: 100000 },
            { stage: 'Proposal', count: 2, value: 80000 },
            { stage: 'Negotiation', count: 1, value: 100000 }
        ]
    });
});

router.get('/leaderboard', async (req: Request, res: Response) => {
    res.json({
        reps: [
            { name: 'John Doe', deals: 5, value: 150000 },
            { name: 'Jane Smith', deals: 4, value: 120000 }
        ]
    });
});

export { router as dashboardRoutes };
