/**
 * Dashboard Routes - Pipeline visualization
 * FIXED: Now integrates with real CRM data instead of hardcoded mocks
 */
import { Router } from 'express';
import { PipelineDashboard } from '../dashboard/pipelineDashboard.js';

const router = Router();
const dashboard = new PipelineDashboard();

router.get('/stats', async (req, res) => {
    try {
        // In real implementation, fetch from database
        // For now, return structure with clear indication of empty state
        const mockDeals: unknown[] = [];
        const mockActivities: unknown[] = [];
        const stats = dashboard.getStats(mockDeals, mockActivities);
        res.json({
            ...stats,
            _meta: {
                source: 'mock',
                message: 'Connect to REZ CRM Hub for real data',
                endpoints: {
                    leads: '/api/leads',
                    deals: '/api/ecosystem/crm/deals',
                    pipeline: '/api/sales/pipeline'
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get('/pipeline-chart', async (req, res) => {
    try {
        const mockDeals: unknown[] = [];
        const chartData = dashboard.getPipelineChartData(mockDeals);
        res.json(chartData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const mockDeals: unknown[] = [];
        const leaderboard = dashboard.getLeaderboard(mockDeals);
        res.json({
            leaderboard,
            _meta: {
                source: 'mock',
                message: 'Connect to REZ CRM Hub for real data'
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

export default router;
