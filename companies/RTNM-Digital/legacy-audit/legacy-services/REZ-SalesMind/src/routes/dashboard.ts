/**
 * Dashboard Routes - Pipeline visualization
 */

import { Router } from 'express';
import { PipelineDashboard, Deal, ActivityItem } from '../dashboard/pipelineDashboard.js';

const router = Router();
const dashboard = new PipelineDashboard();

router.get('/stats', async (req, res) => {
  try {
    // In real implementation, fetch from database
    const mockDeals: Deal[] = [
      { id: '1', title: 'Acme Corp Deal', company: 'Acme Corp', value: 50000, stage: 'proposal', owner: 'Alice', daysInStage: 5, probability: 60, risk: 'low' },
      { id: '2', title: 'TechStart Deal', company: 'TechStart', value: 25000, stage: 'qualified', owner: 'Bob', daysInStage: 12, probability: 40, risk: 'medium' },
      { id: '3', title: 'Global Inc Deal', company: 'Global Inc', value: 80000, stage: 'negotiation', owner: 'Alice', daysInStage: 3, probability: 80, risk: 'low' },
    ];
    const mockActivities: ActivityItem[] = [];

    const stats = dashboard.getStats(mockDeals, mockActivities);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/pipeline-chart', async (req, res) => {
  try {
    const mockDeals: Deal[] = [];
    const chartData = dashboard.getPipelineChartData(mockDeals);
    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const mockDeals: Deal[] = [];
    const leaderboard = dashboard.getLeaderboard(mockDeals);
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;