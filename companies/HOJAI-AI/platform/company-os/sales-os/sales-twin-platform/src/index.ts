/**
 * Sales Twin Platform
 *
 * Living digital twins for Sales OS
 * Inspired by: Salesforce + Clari + Gong + 6sense
 *
 * Twins:
 * - Customer Twin
 * - Account Twin
 * - Opportunity Twin
 * - Revenue Twin
 * - Territory Twin
 * - Salesperson Twin
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TWIN TYPES
// ============================================================

export interface CustomerTwin {
  id: string;
  customerId: string;

  // Identity
  identity: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    title?: string;
  };

  // Lifecycle
  lifecycle: {
    stage: 'lead' | 'prospect' | 'customer' | 'expanding' | 'churning';
    since: Date;
    health: number;
    ltv: number;
  };

  // Financial
  financials: {
    arr: number;
    mrr: number;
    orders: number;
    aov: number;
    paymentStatus: 'current' | 'late' | 'overdue';
  };

  // Behavior
  behavior: {
    engagement: number;
    lastActive: Date;
    preferredChannel: 'whatsapp' | 'email' | 'call' | 'in_app';
    nps?: number;
  };

  // Intelligence
  intelligence: {
    churnRisk: number;
    expansionProbability: number;
    nextBestAction: string;
    recommendedOffer?: string;
  };

  lastUpdated: Date;
  confidence: number;
}

export interface AccountTwin {
  id: string;
  accountId: string;

  // Company Info
  company: {
    name: string;
    industry: string;
    size: 'startup' | 'smb' | 'mid' | 'enterprise';
    revenue: string;
    employees: number;
    website?: string;
  };

  // Relationships
  relationships: {
    champion?: { name: string; email: string };
    economicBuyer?: { name: string; email: string };
    blockers: string[];
    influencers: string[];
  };

  // Financial
  financials: {
    arr: number;
    potential: number;
    shareOfWallet: number;
    competitors: string[];
  };

  // Health
  health: {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    risks: string[];
  };

  lastUpdated: Date;
  confidence: number;
}

export interface OpportunityTwin {
  id: string;
  opportunityId: string;
  accountId: string;
  accountName: string;

  // Deal Info
  deal: {
    name: string;
    value: number;
    stage: 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
    probability: number;
    closeDate: Date;
    owner: string;
  };

  // Stakeholders
  stakeholders: {
    name: string;
    role: string;
    influence: 'low' | 'medium' | 'high';
    contactInfo?: string;
  }[];

  // Intelligence
  intelligence: {
    health: number;
    momentum: 'gaining' | 'stable' | 'losing';
    competitorMentioned?: string;
    missingStakeholders: string[];
    riskFactors: string[];
    aiRecommendations: string[];
  };

  // Activities
  activities: {
    lastContact: Date;
    meetingsThisWeek: number;
    emails: number;
    tasks: number;
  };

  lastUpdated: Date;
  confidence: number;
}

export interface RevenueTwin {
  id: string;
  entityId: string;

  // Metrics
  metrics: {
    arr: number;
    mrr: number;
    newArr: number;
    expansionArr: number;
    churnArr: number;
    netNewArr: number;
    grr: number;
    nrr: number;
  };

  // Growth
  growth: {
    monthly: number;
    quarterly: number;
    annually: number;
    target: number;
    attainment: number;
  };

  // Pipeline
  pipeline: {
    qualified: number;
    proposals: number;
    negotiations: number;
    weighted: number;
    coverage: number;
  };

  // Forecasts
  forecasts: {
    commit: number;
    bestCase: number;
    mostLikely: number;
    open: number;
    accuracy: number;
  };

  lastUpdated: Date;
  confidence: number;
}

export interface TerritoryTwin {
  id: string;
  territoryId: string;
  name: string;

  // Geography
  geography: {
    region?: string;
    country?: string;
    state?: string;
    city?: string;
    industry?: string;
  };

  // Quota
  quota: {
    target: number;
    achieved: number;
    attainment: number;
    period: string;
  };

  // Team
  team: {
    reps: number;
    managers: number;
    openRoles: number;
    names: string[];
  };

  // Performance
  performance: {
    pipeline: number;
    winRate: number;
    avgDealSize: number;
    salesCycle: number;
  };

  lastUpdated: Date;
  confidence: number;
}

export interface SalespersonTwin {
  id: string;
  repId: string;

  // Info
  info: {
    name: string;
    email: string;
    title: string;
    territory: string;
    manager?: string;
  };

  // Quota
  quota: {
    target: number;
    achieved: number;
    attainment: number;
    quotaRemaining: number;
    daysRemaining: number;
  };

  // Performance
  performance: {
    pipeline: number;
    deals: number;
    winRate: number;
    avgDealSize: number;
    calls: number;
    emails: number;
    meetings: number;
  };

  // Activities
  activities: {
    thisWeek: { calls: number; emails: number; meetings: number; demos: number };
    lastWeek: { calls: number; emails: number; meetings: number; demos: number };
  };

  // Intelligence
  intelligence: {
    topPerforming: string[];
    improvementAreas: string[];
    aiCoaching: string[];
    recommendedNext: string;
  };

  lastUpdated: Date;
  confidence: number;
}

// ============================================================
// STORAGE
// ============================================================

const customerTwins = new Map<string, CustomerTwin>();
const accountTwins = new Map<string, AccountTwin>();
const opportunityTwins = new Map<string, OpportunityTwin>();
const revenueTwins = new Map<string, RevenueTwin>();
const territoryTwins = new Map<string, TerritoryTwin>();
const salespersonTwins = new Map<string, SalespersonTwin>();

// ============================================================
// ROUTES - CUSTOMER TWINS
// ============================================================

router.post('/customers', async (req, res) => {
  try {
    const twin: CustomerTwin = {
      id: crypto.randomUUID(),
      customerId: req.body.customerId || crypto.randomUUID(),
      identity: req.body.identity || {},
      lifecycle: req.body.lifecycle || { stage: 'lead', since: new Date(), health: 0, ltv: 0 },
      financials: req.body.financials || { arr: 0, mrr: 0, orders: 0, aov: 0, paymentStatus: 'current' },
      behavior: req.body.behavior || { engagement: 0, lastActive: new Date(), preferredChannel: 'email' },
      intelligence: req.body.intelligence || { churnRisk: 0, expansionProbability: 0, nextBestAction: '' },
      lastUpdated: new Date(),
      confidence: 50,
    };

    customerTwins.set(twin.customerId, twin);
    res.status(201).json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const twin = customerTwins.get(req.params.id);
    if (!twin) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const { stage, minHealth, minLtv } = req.query;
    let result = Array.from(customerTwins.values());

    if (stage) result = result.filter(t => t.lifecycle.stage === stage);
    if (minHealth) result = result.filter(t => t.lifecycle.health >= Number(minHealth));
    if (minLtv) result = result.filter(t => t.lifecycle.ltv >= Number(minLtv));

    res.json({ success: true, twins: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - ACCOUNT TWINS
// ============================================================

router.post('/accounts', async (req, res) => {
  try {
    const twin: AccountTwin = {
      id: crypto.randomUUID(),
      accountId: req.body.accountId || crypto.randomUUID(),
      company: req.body.company || {},
      relationships: req.body.relationships || {},
      financials: req.body.financials || { arr: 0, potential: 0, shareOfWallet: 0, competitors: [] },
      health: req.body.health || { score: 50, trend: 'stable', risks: [] },
      lastUpdated: new Date(),
      confidence: 50,
    };

    accountTwins.set(twin.accountId, twin);
    res.status(201).json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const twin = accountTwins.get(req.params.id);
    if (!twin) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/accounts', async (req, res) => {
  try {
    const { industry, size, minArr } = req.query;
    let result = Array.from(accountTwins.values());

    if (industry) result = result.filter(t => t.company.industry === industry);
    if (size) result = result.filter(t => t.company.size === size);
    if (minArr) result = result.filter(t => t.financials.arr >= Number(minArr));

    res.json({ success: true, twins: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - OPPORTUNITY TWINS
// ============================================================

router.post('/opportunities', async (req, res) => {
  try {
    const twin: OpportunityTwin = {
      id: crypto.randomUUID(),
      opportunityId: req.body.opportunityId || crypto.randomUUID(),
      accountId: req.body.accountId || '',
      accountName: req.body.accountName || '',
      deal: req.body.deal || { name: '', value: 0, stage: 'discovery', probability: 0, closeDate: new Date(), owner: '' },
      stakeholders: req.body.stakeholders || [],
      intelligence: req.body.intelligence || { health: 50, momentum: 'stable', riskFactors: [], aiRecommendations: [], missingStakeholders: [] },
      activities: req.body.activities || { lastContact: new Date(), meetingsThisWeek: 0, emails: 0, tasks: 0 },
      lastUpdated: new Date(),
      confidence: 50,
    };

    opportunityTwins.set(twin.opportunityId, twin);
    res.status(201).json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/opportunities/:id', async (req, res) => {
  try {
    const twin = opportunityTwins.get(req.params.id);
    if (!twin) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }
    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/opportunities', async (req, res) => {
  try {
    const { stage, owner, minValue } = req.query;
    let result = Array.from(opportunityTwins.values());

    if (stage) result = result.filter(t => t.deal.stage === stage);
    if (owner) result = result.filter(t => t.deal.owner === owner);
    if (minValue) result = result.filter(t => t.deal.value >= Number(minValue));

    res.json({ success: true, twins: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - REVENUE TWINS
// ============================================================

router.get('/revenue/:entityId', async (req, res) => {
  try {
    let twin = revenueTwins.get(req.params.entityId);

    if (!twin) {
      twin = {
        id: crypto.randomUUID(),
        entityId: req.params.entityId,
        metrics: { arr: 0, mrr: 0, newArr: 0, expansionArr: 0, churnArr: 0, netNewArr: 0, grr: 0, nrr: 0 },
        growth: { monthly: 0, quarterly: 0, annually: 0, target: 0, attainment: 0 },
        pipeline: { qualified: 0, proposals: 0, negotiations: 0, weighted: 0, coverage: 0 },
        forecasts: { commit: 0, bestCase: 0, mostLikely: 0, open: 0, accuracy: 0 },
        lastUpdated: new Date(),
        confidence: 50,
      };
      revenueTwins.set(req.params.entityId, twin);
    }

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/revenue/:entityId', async (req, res) => {
  try {
    const twin = revenueTwins.get(req.params.entityId) || {
      id: crypto.randomUUID(),
      entityId: req.params.entityId,
      metrics: { arr: 0, mrr: 0, newArr: 0, expansionArr: 0, churnArr: 0, netNewArr: 0, grr: 0, nrr: 0 },
      growth: { monthly: 0, quarterly: 0, annually: 0, target: 0, attainment: 0 },
      pipeline: { qualified: 0, proposals: 0, negotiations: 0, weighted: 0, coverage: 0 },
      forecasts: { commit: 0, bestCase: 0, mostLikely: 0, open: 0, accuracy: 0 },
      lastUpdated: new Date(),
      confidence: 50,
    };

    Object.assign(twin, req.body);
    twin.lastUpdated = new Date();
    revenueTwins.set(req.params.entityId, twin);

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - TERRITORY TWINS
// ============================================================

router.post('/territories', async (req, res) => {
  try {
    const twin: TerritoryTwin = {
      id: crypto.randomUUID(),
      territoryId: req.body.territoryId || crypto.randomUUID(),
      name: req.body.name || 'Territory',
      geography: req.body.geography || {},
      quota: req.body.quota || { target: 0, achieved: 0, attainment: 0, period: '' },
      team: req.body.team || { reps: 0, managers: 0, openRoles: 0, names: [] },
      performance: req.body.performance || { pipeline: 0, winRate: 0, avgDealSize: 0, salesCycle: 0 },
      lastUpdated: new Date(),
      confidence: 50,
    };

    territoryTwins.set(twin.territoryId, twin);
    res.status(201).json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/territories', async (req, res) => {
  try {
    const result = Array.from(territoryTwins.values());
    res.json({ success: true, territories: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - SALESPERSON TWINS
// ============================================================

router.post('/salespeople', async (req, res) => {
  try {
    const twin: SalespersonTwin = {
      id: crypto.randomUUID(),
      repId: req.body.repId || crypto.randomUUID(),
      info: req.body.info || {},
      quota: req.body.quota || { target: 0, achieved: 0, attainment: 0, quotaRemaining: 0, daysRemaining: 0 },
      performance: req.body.performance || { pipeline: 0, deals: 0, winRate: 0, avgDealSize: 0, calls: 0, emails: 0, meetings: 0 },
      activities: req.body.activities || { thisWeek: { calls: 0, emails: 0, meetings: 0, demos: 0 }, lastWeek: { calls: 0, emails: 0, meetings: 0, demos: 0 } },
      intelligence: req.body.intelligence || { topPerforming: [], improvementAreas: [], aiCoaching: [], recommendedNext: '' },
      lastUpdated: new Date(),
      confidence: 50,
    };

    salespersonTwins.set(twin.repId, twin);
    res.status(201).json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/salespeople/:id', async (req, res) => {
  try {
    const twin = salespersonTwins.get(req.params.id);
    if (!twin) {
      return res.status(404).json({ success: false, error: 'Salesperson not found' });
    }
    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/salespeople', async (req, res) => {
  try {
    const { territory, manager } = req.query;
    let result = Array.from(salespersonTwins.values());

    if (territory) result = result.filter(t => t.info.territory === territory);
    if (manager) result = result.filter(t => t.info.manager === manager);

    res.json({ success: true, twins: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// SALES DASHBOARD
// ============================================================

router.get('/dashboard/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;

    const customers = Array.from(customerTwins.values());
    const accounts = Array.from(accountTwins.values());
    const opportunities = Array.from(opportunityTwins.values());
    const salespeople = Array.from(salespersonTwins.values());
    const territories = Array.from(territoryTwins.values());
    const revenue = revenueTwins.get(entityId);

    const dashboard = {
      entityId,
      summary: {
        totalCustomers: customers.length,
        totalAccounts: accounts.length,
        totalOpportunities: opportunities.length,
        totalARR: revenue?.metrics.arr || 0,
        totalPipeline: opportunities.reduce((sum, o) => sum + o.deal.value, 0),
        weightedPipeline: opportunities.reduce((sum, o) => sum + (o.deal.value * o.deal.probability / 100), 0),
      },
      health: {
        avgCustomerHealth: customers.length > 0 ? customers.reduce((sum, c) => sum + c.lifecycle.health, 0) / customers.length : 0,
        avgAccountHealth: accounts.length > 0 ? accounts.reduce((sum, a) => sum + a.health.score, 0) / accounts.length : 0,
        churnRisk: customers.filter(c => c.intelligence.churnRisk > 70).length,
        expansionOpportunities: customers.filter(c => c.intelligence.expansionProbability > 60).length,
      },
      pipeline: {
        byStage: {
          discovery: opportunities.filter(o => o.deal.stage === 'discovery').length,
          demo: opportunities.filter(o => o.deal.stage === 'demo').length,
          proposal: opportunities.filter(o => o.deal.stage === 'proposal').length,
          negotiation: opportunities.filter(o => o.deal.stage === 'negotiation').length,
        },
        atRisk: opportunities.filter(o => o.intelligence.health < 40).length,
      },
      team: {
        totalReps: salespeople.length,
        avgQuotaAttainment: salespeople.length > 0 ? salespeople.reduce((sum, s) => sum + s.quota.attainment, 0) / salespeople.length : 0,
        onTrack: salespeople.filter(s => s.quota.attainment >= 80).length,
        behind: salespeople.filter(s => s.quota.attainment < 50).length,
      },
      generatedAt: new Date(),
    };

    res.json({ success: true, dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
