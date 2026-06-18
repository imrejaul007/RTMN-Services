/**
 * Deals Routes
 * Deal orchestration endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Deal, DealFilters, DealStats, DealReport } from '../models/Deal';

// In-memory storage
const deals: Map<string, Deal> = new Map();

// Pipeline stages
const PIPELINE_STAGES = [
  { id: 'prospecting', name: 'Prospecting', order: 1, probability: 10 },
  { id: 'qualification', name: 'Qualification', order: 2, probability: 20 },
  { id: 'needs_analysis', name: 'Needs Analysis', order: 3, probability: 40 },
  { id: 'proposal', name: 'Proposal', order: 4, probability: 60 },
  { id: 'negotiation', name: 'Negotiation', order: 5, probability: 80 },
  { id: 'closing', name: 'Closing', order: 6, probability: 90 },
  { id: 'won', name: 'Won', order: 7, probability: 100 },
  { id: 'lost', name: 'Lost', order: 8, probability: 0 }
];

const router = Router();

// GET /api/deals - List all deals
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as DealFilters;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    let filteredDeals = Array.from(deals.values());

    // Apply filters
    if (filters.status?.length) {
      filteredDeals = filteredDeals.filter(d => filters.status!.includes(d.status));
    }
    if (filters.stage?.length) {
      filteredDeals = filteredDeals.filter(d => filters.stage!.includes(d.stage));
    }
    if (filters.type?.length) {
      filteredDeals = filteredDeals.filter(d => filters.type!.includes(d.type));
    }
    if (filters.ownerId?.length) {
      filteredDeals = filteredDeals.filter(d => filters.ownerId!.includes(d.ownerId));
    }
    if (filters.forecastCategory?.length) {
      filteredDeals = filteredDeals.filter(d => filters.forecastCategory!.includes(d.forecastCategory));
    }
    if (filters.valueMin !== undefined) {
      filteredDeals = filteredDeals.filter(d => d.value.amount >= filters.valueMin!);
    }
    if (filters.valueMax !== undefined) {
      filteredDeals = filteredDeals.filter(d => d.value.amount <= filters.valueMax!);
    }

    // Pagination
    const total = filteredDeals.length;
    const start = (page - 1) * limit;
    const paginatedDeals = filteredDeals.slice(start, start + limit);

    res.json({
      deals: paginatedDeals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET /api/deals/stats - Get deal statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const allDeals = Array.from(deals.values());

    const stats: DealStats = {
      total: allDeals.length,
      totalValue: 0,
      weightedValue: 0,
      byStatus: {
        open: { count: 0, value: 0 },
        won: { count: 0, value: 0 },
        lost: { count: 0, value: 0 },
        abandoned: { count: 0, value: 0 }
      },
      byStage: {} as any,
      byType: {} as any,
      byOwner: {} as any,
      byIndustry: {} as any,
      avgDealSize: 0,
      medianDealSize: 0,
      avgCycleTime: 0,
      winRate: 0,
      avgProbability: 0,
      pipelineVelocity: 0
    };

    let totalValue = 0;
    let wonValue = 0;
    let wonCount = 0;
    let lostCount = 0;
    let totalProbability = 0;
    let cycleTimeSum = 0;
    const dealValues: number[] = [];

    allDeals.forEach(deal => {
      const stageStats = stats.byStage[deal.stage] || { count: 0, value: 0 };
      stageStats.count++;
      stageStats.value += deal.value.amount;
      stats.byStage[deal.stage] = stageStats;

      const typeStats = stats.byType[deal.type] || { count: 0, value: 0 };
      typeStats.count++;
      typeStats.value += deal.value.amount;
      stats.byType[deal.type] = typeStats;

      const ownerStats = stats.byOwner[deal.ownerId] || { count: 0, value: 0 };
      ownerStats.count++;
      ownerStats.value += deal.value.amount;
      stats.byOwner[deal.ownerId] = ownerStats;

      const industryStats = stats.byIndustry[deal.industry] || { count: 0, value: 0 };
      industryStats.count++;
      industryStats.value += deal.value.amount;
      stats.byIndustry[deal.industry] = industryStats;

      stats.byStatus[deal.status].count++;
      stats.byStatus[deal.status].value += deal.value.amount;

      totalValue += deal.value.amount;
      stats.weightedValue += deal.value.amount * (deal.probability / 100);
      dealValues.push(deal.value.amount);

      if (deal.status === 'won') {
        wonValue += deal.value.amount;
        wonCount++;
      } else if (deal.status === 'lost') {
        lostCount++;
      }

      totalProbability += deal.probability;

      if (deal.actualCloseDate) {
        cycleTimeSum += new Date(deal.actualCloseDate).getTime() - new Date(deal.createdAt).getTime();
      }
    });

    stats.totalValue = totalValue;
    stats.avgDealSize = allDeals.length ? totalValue / allDeals.length : 0;
    stats.avgProbability = allDeals.length ? totalProbability / allDeals.length : 0;

    // Calculate median
    dealValues.sort((a, b) => a - b);
    const mid = Math.floor(dealValues.length / 2);
    stats.medianDealSize = dealValues.length ? (dealValues.length % 2 ? dealValues[mid] : (dealValues[mid - 1] + dealValues[mid]) / 2) : 0;

    // Win rate
    const closedDeals = wonCount + lostCount;
    stats.winRate = closedDeals ? (wonCount / closedDeals) * 100 : 0;

    // Avg cycle time in days
    const closedDealsWithDates = allDeals.filter(d => d.actualCloseDate);
    stats.avgCycleTime = closedDealsWithDates.length ? cycleTimeSum / closedDealsWithDates.length / (1000 * 60 * 60 * 24) : 0;

    // Pipeline velocity (deals per week)
    const oldestDate = allDeals.reduce((min, d) => new Date(d.createdAt) < min ? new Date(d.createdAt) : min, new Date());
    const weeksElapsed = Math.max(1, (Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    stats.pipelineVelocity = weeksElapsed > 0 ? allDeals.length / weeksElapsed : 0;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deal stats' });
  }
});

// GET /api/deals/pipeline - Get pipeline view
router.get('/pipeline', async (req: Request, res: Response) => {
  try {
    const allDeals = Array.from(deals.values()).filter(d => d.status === 'open');

    const pipeline = PIPELINE_STAGES.filter(s => s.id !== 'won' && s.id !== 'lost').map(stage => {
      const stageDeals = allDeals.filter(d => d.stage === stage.id);
      const value = stageDeals.reduce((sum, d) => sum + d.value.amount, 0);

      return {
        stage: stage.id,
        name: stage.name,
        order: stage.order,
        probability: stage.probability,
        dealCount: stageDeals.length,
        value,
        deals: stageDeals.map(d => ({
          id: d.id,
          name: d.name,
          value: d.value.amount,
          owner: d.ownerName,
          expectedCloseDate: d.expectedCloseDate,
          customer: d.customer.name
        }))
      };
    });

    const totalValue = allDeals.reduce((sum, d) => sum + d.value.amount, 0);
    const weightedValue = allDeals.reduce((sum, d) => sum + d.value.amount * (d.probability / 100), 0);

    res.json({
      stages: pipeline,
      summary: {
        totalDeals: allDeals.length,
        totalValue,
        weightedValue,
        avgDealSize: allDeals.length ? totalValue / allDeals.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

// GET /api/deals/report - Get deal report
router.get('/report', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'monthly';
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const allDeals = Array.from(deals.values()).filter(d => {
      const createdAt = new Date(d.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    const wonDeals = allDeals.filter(d => d.status === 'won');
    const lostDeals = allDeals.filter(d => d.status === 'lost');

    const report: DealReport = {
      period: period as any,
      startDate,
      endDate,
      summary: {
        dealsCreated: allDeals.length,
        dealsWon: wonDeals.length,
        dealsLost: lostDeals.length,
        revenue: wonDeals.reduce((sum, d) => sum + d.value.amount, 0),
        pipelineValue: allDeals.filter(d => d.status === 'open').reduce((sum, d) => sum + d.value.amount, 0),
        avgDealSize: wonDeals.length ? wonDeals.reduce((sum, d) => sum + d.value.amount, 0) / wonDeals.length : 0,
        winRate: (wonDeals.length + lostDeals.length) ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 : 0,
        avgCycleTime: 0
      },
      byStage: [],
      byOwner: [],
      trends: []
    };

    // Stage report
    PIPELINE_STAGES.forEach(stage => {
      const stageDeals = allDeals.filter(d => d.stage === stage.id);
      report.byStage.push({
        stage: stage.id,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.value.amount, 0),
        avgDaysInStage: 0,
        exitsToWon: 0,
        exitsToLost: 0
      });
    });

    // Owner report
    const ownerMap = new Map<string, any[]>();
    allDeals.forEach(deal => {
      if (!ownerMap.has(deal.ownerId)) ownerMap.set(deal.ownerId, []);
      ownerMap.get(deal.ownerId)!.push(deal);
    });

    ownerMap.forEach((ownerDeals, ownerId) => {
      const won = ownerDeals.filter(d => d.status === 'won');
      const lost = ownerDeals.filter(d => d.status === 'lost');
      report.byOwner.push({
        ownerId,
        ownerName: ownerDeals[0]?.ownerName || 'Unknown',
        dealsCreated: ownerDeals.length,
        dealsWon: won.length,
        dealsLost: lost.length,
        revenue: won.reduce((sum, d) => sum + d.value.amount, 0),
        avgDealSize: won.length ? won.reduce((sum, d) => sum + d.value.amount, 0) / won.length : 0,
        winRate: (won.length + lost.length) ? (won.length / (won.length + lost.length)) * 100 : 0,
        avgCycleTime: 0
      });
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/deals/:id - Get single deal
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const deal = deals.get(req.params.id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// POST /api/deals - Create new deal
router.post('/', async (req: Request, res: Response) => {
  try {
    const bridges = (req as any).bridges;
    const body = req.body;

    const stage = PIPELINE_STAGES.find(s => s.id === 'prospecting')!;

    const deal: Deal = {
      id: uuidv4(),
      name: body.name,
      description: body.description,
      reference: body.reference || `DEAL-${Date.now()}`,
      value: { amount: body.value },
      currency: body.currency || 'USD',
      customer: body.customer || { id: body.customerId, name: body.customerName, company: body.customerCompany },
      customerId: body.customerId,
      contact: body.contact || { id: body.contactId, name: body.contactName, email: body.contactEmail },
      contactId: body.contactId,
      type: body.type || 'new_business',
      category: body.category,
      industry: body.industry || body.customer?.industry || 'other',
      stage: 'prospecting',
      status: 'open',
      probability: stage.probability,
      pipelineId: body.pipelineId || 'default',
      pipelineName: body.pipelineName || 'Default Pipeline',
      stageOrder: stage.order,
      ownerId: body.ownerId || 'unassigned',
      ownerName: body.ownerName || 'Unassigned',
      team: body.team,
      territory: body.territory,
      expectedCloseDate: new Date(body.expectedCloseDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      leadId: body.leadId,
      lineItems: body.lineItems || [],
      stakeholders: body.stakeholders || [],
      activities: [{
        id: uuidv4(),
        type: 'stage_change',
        description: 'Deal created',
        performedBy: body.ownerId || 'system',
        performedAt: new Date()
      }],
      riskIndicators: [],
      forecastCategory: 'pipeline',
      forecastConfidence: 50,
      organizationId: body.organizationId || 'default',
      tags: body.tags || [],
      notes: body.notes
    };

    // AI scoring
    if (bridges?.salesMind) {
      try {
        const score = await bridges.salesMind.scoreDeal(deal);
        deal.dealScore = score;
      } catch (e) {}
    }

    // Trust score
    if (bridges?.trust) {
      try {
        const trust = await bridges.trust.getTrustScore(deal.customer.name);
        deal.trustScore = trust;
      } catch (e) {}
    }

    deals.set(deal.id, deal);

    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// PUT /api/deals/:id - Update deal
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existingDeal = deals.get(req.params.id);

    if (!existingDeal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const updates = req.body;
    const updatedDeal: Deal = {
      ...existingDeal,
      ...updates,
      id: existingDeal.id,
      updatedAt: new Date()
    };

    deals.set(updatedDeal.id, updatedDeal);

    res.json(updatedDeal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// POST /api/deals/:id/stage - Change deal stage
router.post('/:id/stage', async (req: Request, res: Response) => {
  try {
    const bridges = (req as any).bridges;
    const deal = deals.get(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const { stage, notes, performedBy } = req.body;
    const newStageConfig = PIPELINE_STAGES.find(s => s.id === stage);

    if (!newStageConfig) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    const activity = {
      id: uuidv4(),
      type: 'stage_change' as const,
      description: `Stage changed from ${deal.stage} to ${stage}`,
      performedBy: performedBy || 'system',
      performedAt: new Date(),
      nextStep: notes
    };

    // Update deal
    deal.stage = stage;
    deal.stageOrder = newStageConfig.order;
    deal.probability = newStageConfig.probability;
    deal.activities.push(activity);
    deal.lastActivityAt = new Date();
    deal.updatedAt = new Date();

    // Handle won/lost
    if (stage === 'won') {
      deal.status = 'won';
      deal.actualCloseDate = new Date();
      deal.forecastCategory = 'closed';

      // Log to SUTAR
      if (bridges?.sutar) {
        bridges.sutar.logGoalEvent('deal_won', {
          dealId: deal.id,
          value: deal.value.amount,
          customerId: deal.customerId
        }).catch(() => {});
      }
    } else if (stage === 'lost') {
      deal.status = 'lost';
      deal.actualCloseDate = new Date();
      deal.forecastCategory = 'closed';
    }

    deals.set(deal.id, deal);

    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to change stage' });
  }
});

// POST /api/deals/:id/activity - Add activity
router.post('/:id/activity', async (req: Request, res: Response) => {
  try {
    const deal = deals.get(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const { type, description, performedBy, duration, outcome, attendees, nextStep } = req.body;

    const activity = {
      id: uuidv4(),
      type,
      description,
      performedBy: performedBy || 'system',
      performedAt: new Date(),
      duration,
      outcome,
      attendees,
      nextStep
    };

    deal.activities.push(activity);
    deal.lastActivityAt = new Date();
    deal.nextStep = nextStep || deal.nextStep;
    deal.updatedAt = new Date();

    deals.set(deal.id, deal);

    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add activity' });
  }
});

// POST /api/deals/:id/stakeholder - Add stakeholder
router.post('/:id/stakeholder', async (req: Request, res: Response) => {
  try {
    const deal = deals.get(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const stakeholder = {
      id: uuidv4(),
      ...req.body
    };

    deal.stakeholders.push(stakeholder);
    deal.updatedAt = new Date();

    deals.set(deal.id, deal);

    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add stakeholder' });
  }
});

export default router;
