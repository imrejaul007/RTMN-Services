/**
 * Leads Routes
 * Lead orchestration endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Lead, LeadFilters, LeadSearchQuery, LeadStats } from '../models/Lead';
import { AIScoringService } from '../services/aiScoring';
import { RoutingService } from '../services/routing';

const router = Router();
const aiScoring = new AIScoringService();
const routing = new RoutingService();

// In-memory storage for demo (replace with database)
const leads: Map<string, Lead> = new Map();

// GET /api/leads - List all leads with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as LeadFilters;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    let filteredLeads = Array.from(leads.values());

    // Apply filters
    if (filters.status?.length) {
      filteredLeads = filteredLeads.filter(l => filters.status!.includes(l.status));
    }
    if (filters.stage?.length) {
      filteredLeads = filteredLeads.filter(l => filters.stage!.includes(l.stage));
    }
    if (filters.temperature?.length) {
      filteredLeads = filteredLeads.filter(l => filters.temperature!.includes(l.temperature));
    }
    if (filters.quality?.length) {
      filteredLeads = filteredLeads.filter(l => filters.quality!.includes(l.quality));
    }
    if (filters.assignedTo?.length) {
      filteredLeads = filteredLeads.filter(l => l.assignedTo && filters.assignedTo!.includes(l.assignedTo));
    }
    if (filters.scoreMin !== undefined) {
      filteredLeads = filteredLeads.filter(l => l.score.total >= filters.scoreMin!);
    }
    if (filters.scoreMax !== undefined) {
      filteredLeads = filteredLeads.filter(l => l.score.total <= filters.scoreMax!);
    }

    // Pagination
    const total = filteredLeads.length;
    const start = (page - 1) * limit;
    const paginatedLeads = filteredLeads.slice(start, start + limit);

    res.json({
      leads: paginatedLeads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/stats - Get lead statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const allLeads = Array.from(leads.values());

    const stats: LeadStats = {
      total: allLeads.length,
      byStatus: { new: 0, contacted: 0, qualified: 0, unqualified: 0, nurturing: 0, hot: 0, converted: 0, lost: 0 },
      byStage: { initial: 0, engaged: 0, qualified: 0, proposal: 0, negotiation: 0, closed: 0 },
      byTemperature: { cold: 0, warm: 0, hot: 0 },
      byQuality: { low: 0, medium: 0, high: 0, premium: 0 },
      bySource: {} as any,
      byIndustry: {},
      avgScore: 0,
      avgAge: 0,
      conversionRate: 0
    };

    let totalScore = 0;
    let totalAge = 0;
    let converted = 0;

    allLeads.forEach(lead => {
      stats.byStatus[lead.status]++;
      stats.byStage[lead.stage]++;
      stats.byTemperature[lead.temperature]++;
      stats.byQuality[lead.quality]++;
      stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;
      if (lead.industry) {
        stats.byIndustry[lead.industry] = (stats.byIndustry[lead.industry] || 0) + 1;
      }
      totalScore += lead.score.total;
      totalAge += Date.now() - new Date(lead.createdAt).getTime();
      if (lead.status === 'converted') converted++;
    });

    stats.avgScore = allLeads.length ? totalScore / allLeads.length : 0;
    stats.avgAge = allLeads.length ? totalAge / allLeads.length / (1000 * 60 * 60 * 24) : 0;
    stats.conversionRate = allLeads.length ? (converted / allLeads.length) * 100 : 0;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead stats' });
  }
});

// GET /api/leads/:id - Get single lead
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const lead = leads.get(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /api/leads - Create new lead
router.post('/', async (req: Request, res: Response) => {
  try {
    const bridges = (req as any).bridges;
    const body = req.body;

    // Create base lead
    const lead: Lead = {
      id: uuidv4(),
      firstName: body.firstName,
      lastName: body.lastName,
      fullName: `${body.firstName} ${body.lastName}`,
      email: body.email,
      phone: body.phone,
      title: body.title,
      company: body.company,
      companySize: body.companySize,
      industry: body.industry,
      website: body.website,
      linkedIn: body.linkedIn,
      source: body.source || 'other',
      sourceDetails: body.sourceDetails,
      status: 'new',
      stage: 'initial',
      temperature: 'warm',
      quality: 'medium',
      score: { total: 0, grade: 'C', factors: { engagement: 0, technical: 0, budget: 0, authority: 0, timing: 0, trust: 0, brand: 0 } },
      scoreBreakdown: { baseScore: 0, engagementBonus: 0, technicalBonus: 0, budgetBonus: 0, authorityBonus: 0, trustBonus: 0, brandBonus: 0, penalty: 0, total: 0 },
      journeyStage: 'awareness',
      touchpoints: [],
      painPoints: body.painPoints || [],
      organizationId: body.organizationId || 'default',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Enrich from external sources in parallel
    const enrichmentPromises: Promise<any>[] = [];

    if (bridges?.salesMind) {
      enrichmentPromises.push(
        bridges.salesMind.enrichLead(lead.email, lead.company).catch(() => ({}))
      );
    }
    if (bridges?.customerOps) {
      enrichmentPromises.push(
        bridges.customerOps.getBuyerTwin(lead.email).catch(() => ({}))
      );
    }
    if (bridges?.brandpulse) {
      enrichmentPromises.push(
        bridges.brandpulse.getBrandAffinity(lead.company).catch(() => ({}))
      );
    }
    if (bridges?.trust) {
      enrichmentPromises.push(
        bridges.trust.getTrustScore(lead.company).catch(() => ({}))
      );
    }

    const [salesmindData, buyerTwin, brandAffinity, trustData] = await Promise.all(enrichmentPromises);

    // Apply enrichment
    if (salesmindData) {
      lead.enrichment = { ...lead.enrichment, ...salesmindData };
    }
    if (buyerTwin) {
      lead.trustScore = buyerTwin.trustScore;
      lead.journeyStage = buyerTwin.journeyStage || lead.journeyStage;
    }
    if (brandAffinity) {
      lead.brandAffinity = brandAffinity;
    }
    if (trustData) {
      lead.trustScore = { ...lead.trustScore, ...trustData };
    }

    // AI Scoring
    const scoringResult = await aiScoring.scoreLead(lead, bridges);
    lead.score = scoringResult.score;
    lead.scoreBreakdown = scoringResult.breakdown;
    lead.quality = scoringResult.quality;

    // Temperature based on score
    if (lead.score.total >= 80) lead.temperature = 'hot';
    else if (lead.score.total >= 40) lead.temperature = 'warm';
    else lead.temperature = 'cold';

    // Auto-assignment if enabled
    if (bridges?.sutar) {
      const assignment = await routing.assignLead(lead, bridges.sutar);
      if (assignment) {
        lead.assignedTo = assignment.repId;
        lead.territory = assignment.territory;
      }
    }

    // Track journey
    if (bridges?.journey) {
      bridges.journey.trackLeadCreation(lead.id, {
        source: lead.source,
        temperature: lead.temperature,
        quality: lead.quality
      }).catch(() => {});
    }

    leads.set(lead.id, lead);

    res.status(201).json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead', details: (error as Error).message });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const bridges = (req as any).bridges;
    const existingLead = leads.get(req.params.id);

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updates = req.body;
    const updatedLead: Lead = {
      ...existingLead,
      ...updates,
      id: existingLead.id,
      updatedAt: new Date()
    };

    // Re-score if key fields changed
    if (updates.score === undefined) {
      const scoringResult = await aiScoring.scoreLead(updatedLead, bridges);
      updatedLead.score = scoringResult.score;
      updatedLead.scoreBreakdown = scoringResult.breakdown;
    }

    // Update temperature
    if (updatedLead.score.total >= 80) updatedLead.temperature = 'hot';
    else if (updatedLead.score.total >= 40) updatedLead.temperature = 'warm';
    else updatedLead.temperature = 'cold';

    leads.set(updatedLead.id, updatedLead);

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// POST /api/leads/:id/qualify - Qualify lead
router.post('/:id/qualify', async (req: Request, res: Response) => {
  try {
    const bridges = (req as any).bridges;
    const lead = leads.get(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { budget, authority, timeline, painPoints } = req.body;

    // Update qualification fields
    if (budget) lead.budget = budget;
    if (authority) lead.authority = authority;
    if (timeline) lead.timeline = timeline;
    if (painPoints) lead.painPoints = painPoints;

    // Re-score with qualification data
    const scoringResult = await aiScoring.scoreLead(lead, bridges);
    lead.score = scoringResult.score;
    lead.scoreBreakdown = scoringResult.breakdown;

    // Update status based on qualification
    if (lead.score.total >= 60) {
      lead.status = 'qualified';
      lead.stage = 'qualified';
      lead.quality = 'high';
    } else if (lead.score.total >= 30) {
      lead.status = 'nurturing';
      lead.stage = 'engaged';
    } else {
      lead.status = 'unqualified';
      lead.stage = 'initial';
    }

    lead.updatedAt = new Date();
    leads.set(lead.id, lead);

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to qualify lead' });
  }
});

// POST /api/leads/:id/convert - Convert lead to customer
router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const bridges = (req as any).bridges;
    const lead = leads.get(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.status === 'converted') {
      return res.status(400).json({ error: 'Lead already converted' });
    }

    const { dealId, customerData } = req.body;

    // Create customer from lead
    const customer = {
      id: uuidv4(),
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      company: {
        name: lead.company,
        industry: lead.industry || '',
        size: lead.companySize || '1-10',
        headquarters: { address: '', city: '', country: 'US', type: 'headquarters' as const }
      },
      accountType: 'individual' as const,
      tier: 'starter' as const,
      segment: 'smb' as const,
      industry: lead.industry || 'other',
      status: 'trial' as const,
      lifecycleStage: 'onboarding' as const,
      health: 'good' as const,
      convertedFromLead: lead.id,
      convertedFromDeal: dealId,
      convertedAt: new Date(),
      conversionValue: customerData?.value || 0,
      subscription: {
        planId: customerData?.planId || 'free',
        planName: customerData?.planName || 'Free',
        status: 'trialing' as const,
        mrr: 0,
        arr: 0,
        currency: 'USD',
        billingCycle: 'monthly' as const,
        startDate: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 day trial
        cancelAtPeriodEnd: false,
        items: []
      },
      billing: {
        currency: 'USD',
        paymentMethod: { type: 'card' as const, isDefault: true },
        billingAddress: {
          name: lead.fullName,
          address: '',
          city: '',
          postalCode: '',
          country: 'US'
        },
        taxExempt: false,
        invoicePrefix: 'CUST',
        invoices: [],
        balance: 0
      },
      engagement: {
        loginFrequency: 0,
        featureAdoption: { totalFeatures: 0, usedFeatures: 0, adoptionRate: 0, coreFeatures: {} },
        avgSessionDuration: 0,
        monthlyActiveUsers: 0,
        dailyActiveUsers: 0,
        integrationsUsed: 0,
        supportTickets: 0,
        adoptionTrend: 'stable' as const
      },
      ownerId: lead.assignedTo || 'system',
      ownerName: 'Sales Team',
      primaryContact: {
        id: uuidv4(),
        firstName: lead.firstName,
        lastName: lead.lastName,
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        title: lead.title,
        isPrimary: true,
        isDecisionMaker: lead.authority === 'cxo' || lead.authority === 'owner'
      },
      contacts: [],
      successMetrics: {
        adoptionScore: 0,
        roiScore: 0,
        healthScore: 50,
        valueScore: 0,
        riskScore: 50,
        healthChecksCompleted: 0,
        integrationsEnabled: 0,
        apiIntegrations: 0,
        dataMigrated: false,
        trainingCompleted: false,
        goals: [],
        achievements: []
      },
      milestones: [{
        id: uuidv4(),
        title: 'Lead Converted',
        description: 'Lead converted to customer',
        type: 'conversion' as const,
        date: new Date()
      }],
      healthHistory: [{
        date: new Date(),
        health: 'good' as const,
        score: 50,
        factors: []
      }],
      activities: [],
      ltv: 0,
      acquisitionCost: customerData?.acquisitionCost || 0,
      roi: 0,
      paymentHistory: [],
      organizationId: lead.organizationId,
      tags: [...lead.tags || []],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Update lead
    lead.status = 'converted';
    lead.convertedAt = new Date();
    lead.convertedToCustomerId = customer.id;
    if (dealId) lead.convertedToDealId = dealId;
    lead.updatedAt = new Date();

    leads.set(lead.id, lead);

    // Track in journey
    if (bridges?.journey) {
      bridges.journey.trackConversion(lead.id, customer.id).catch(() => {});
    }

    // Notify SUTAR
    if (bridges?.sutar) {
      bridges.sutar.logGoalEvent('lead_converted', {
        leadId: lead.id,
        customerId: customer.id,
        value: customer.conversionValue
      }).catch(() => {});
    }

    res.json({ lead, customer });
  } catch (error) {
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// POST /api/leads/:id/touchpoint - Add touchpoint to lead
router.post('/:id/touchpoint', async (req: Request, res: Response) => {
  try {
    const lead = leads.get(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { type, channel, outcome, notes, repId, automated } = req.body;

    const touchpoint = {
      id: uuidv4(),
      type,
      channel,
      timestamp: new Date(),
      outcome,
      notes,
      repId,
      automated: automated || false
    };

    lead.touchpoints.push(touchpoint);
    lead.lastActivity = new Date();
    lead.updatedAt = new Date();

    // Update engagement score
    const engagementBoost = getEngagementBoost(type);
    lead.score.factors.engagement = Math.min(100, lead.score.factors.engagement + engagementBoost);

    // Recalculate total score
    lead.score.total = Object.values(lead.score.factors).reduce((a, b) => a + b, 0);

    leads.set(lead.id, lead);

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add touchpoint' });
  }
});

// Helper function
function getEngagementBoost(type: string): number {
  const boosts: Record<string, number> = {
    demo_request: 25,
    trial_signup: 30,
    content_download: 10,
    email_open: 5,
    email_click: 10,
    email_reply: 15,
    call: 15,
    meeting: 20,
    linkedin_message: 10,
    webinar_attend: 15,
    event_attend: 20,
    chat: 10
  };
  return boosts[type] || 5;
}

export default router;
