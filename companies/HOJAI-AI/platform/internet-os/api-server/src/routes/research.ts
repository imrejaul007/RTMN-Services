/**
 * Research Agent Routes
 * HTTP endpoints for autonomous research agents
 *
 * REUSES: Research Agents (Market, Competitor, Procurement)
 */

import { Router, Request, Response } from 'express';
import { researchDepartment } from '@hojai/research-agents';

export const researchRoutes = Router();

/**
 * List available research agents
 */
researchRoutes.get('/agents', async (_req: Request, res: Response) => {
  try {
    const agents = researchDepartment.listAgents();
    res.json({
      agents,
      count: agents.length,
      types: {
        market: 'Market Researcher - trends, news, social',
        competitor: 'Competitor Researcher - monitoring competitors',
        procurement: 'Procurement Researcher - finding suppliers',
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Get a specific agent config
 */
researchRoutes.get('/agents/:type', async (req: Request, res: Response) => {
  try {
    const agent = researchDepartment.getAgent(req.params.type);
    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        availableTypes: researchDepartment.listAgents(),
      });
    }
    res.json({
      name: agent.getName(),
      type: agent.getType(),
      config: agent.getConfig(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Run market researcher
 * POST /api/research/market
 * Body: { industry, city?, includeSocial?, includeNews?, includeTrends? }
 */
researchRoutes.post('/market', async (req: Request, res: Response) => {
  try {
    const { industry, city, includeSocial, includeNews, includeTrends } = req.body;

    if (!industry) {
      return res.status(400).json({ error: 'industry is required' });
    }

    const report = await researchDepartment.runResearch('market', {
      industry,
      city,
      includeSocial,
      includeNews,
      includeTrends,
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Run competitor researcher
 * POST /api/research/competitor
 * Body: { competitor, city?, includeProducts?, includeReviews?, includeNews?, includeSocial? }
 */
researchRoutes.post('/competitor', async (req: Request, res: Response) => {
  try {
    const { competitor, city, includeProducts, includeReviews, includeNews, includeSocial } = req.body;

    if (!competitor) {
      return res.status(400).json({ error: 'competitor is required' });
    }

    const report = await researchDepartment.runResearch('competitor', {
      competitor,
      city,
      includeProducts,
      includeReviews,
      includeNews,
      includeSocial,
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Run procurement researcher
 * POST /api/research/procurement
 * Body: { category, city?, minRating?, requireCertifications?, budget? }
 */
researchRoutes.post('/procurement', async (req: Request, res: Response) => {
  try {
    const { category, city, minRating, requireCertifications, budget } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }

    const report = await researchDepartment.runResearch('procurement', {
      category,
      city,
      minRating,
      requireCertifications,
      budget,
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Run all agents at once
 * POST /api/research/run-all
 * Body: { market?: {...}, competitor?: {...}, procurement?: {...} }
 */
researchRoutes.post('/run-all', async (req: Request, res: Response) => {
  try {
    const inputs = req.body || {};
    const reports = await researchDepartment.runAll(inputs);
    res.json({
      count: reports.length,
      reports,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Get recent reports
 */
researchRoutes.get('/reports', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const reports = researchDepartment.getReports(limit);
    res.json({
      reports,
      count: reports.length,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Get research stats
 */
researchRoutes.get('/stats', async (_req: Request, res: Response) => {
  try {
    const reports = researchDepartment.getReports(10000);
    const stats = {
      totalReports: reports.length,
      totalAgents: researchDepartment.listAgents().length,
      agentTypes: researchDepartment.listAgents(),
      lastReport: reports[reports.length - 1] || null,
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});