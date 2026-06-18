/**
 * Customers Routes
 * Customer conversion and management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Customer, CustomerFilters, CustomerStats } from '../models/Customer';

// In-memory storage
const customers: Map<string, Customer> = new Map();

const router = Router();

// GET /api/customers - List all customers
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as CustomerFilters;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    let filteredCustomers = Array.from(customers.values());

    // Apply filters
    if (filters.status?.length) {
      filteredCustomers = filteredCustomers.filter(c => filters.status!.includes(c.status));
    }
    if (filters.tier?.length) {
      filteredCustomers = filteredCustomers.filter(c => filters.tier!.includes(c.tier));
    }
    if (filters.segment?.length) {
      filteredCustomers = filteredCustomers.filter(c => filters.segment!.includes(c.segment));
    }
    if (filters.health?.length) {
      filteredCustomers = filteredCustomers.filter(c => filters.health!.includes(c.health));
    }
    if (filters.ownerId?.length) {
      filteredCustomers = filteredCustomers.filter(c => filters.ownerId!.includes(c.ownerId));
    }
    if (filters.ltvMin !== undefined) {
      filteredCustomers = filteredCustomers.filter(c => c.ltv >= filters.ltvMin!);
    }
    if (filters.ltvMax !== undefined) {
      filteredCustomers = filteredCustomers.filter(c => c.ltv <= filters.ltvMax!);
    }

    // Sort by LTV descending by default
    filteredCustomers.sort((a, b) => b.ltv - a.ltv);

    // Pagination
    const total = filteredCustomers.length;
    const start = (page - 1) * limit;
    const paginatedCustomers = filteredCustomers.slice(start, start + limit);

    res.json({
      customers: paginatedCustomers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/stats - Get customer statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const allCustomers = Array.from(customers.values());

    const stats: CustomerStats = {
      total: allCustomers.length,
      active: 0,
      atRisk: 0,
      churned: 0,
      byTier: { free: 0, starter: 0, professional: 0, business: 0, enterprise: 0, strategic: 0 },
      bySegment: { smb: 0, mid_market: 0, enterprise: 0, government: 0, education: 0, nonprofit: 0 },
      byIndustry: {},
      totalMRR: 0,
      totalARR: 0,
      avgLTV: 0,
      avgCAC: 0,
      avgHealth: 0,
      avgNPS: 0,
      totalRevenue: 0,
      avgDealSize: 0
    };

    let totalLTV = 0;
    let totalCAC = 0;
    let totalHealth = 0;
    let totalNPS = 0;
    let npsCount = 0;

    allCustomers.forEach(customer => {
      // Status counts
      if (customer.status === 'active') stats.active++;
      if (customer.status === 'at_risk' || customer.status === 'churned') stats.atRisk++;
      if (customer.status === 'churned') stats.churned++;

      // Tier counts
      stats.byTier[customer.tier]++;

      // Segment counts
      stats.bySegment[customer.segment]++;

      // Industry counts
      stats.byIndustry[customer.industry] = (stats.byIndustry[customer.industry] || 0) + 1;

      // Revenue
      stats.totalMRR += customer.subscription.mrr;
      stats.totalARR += customer.subscription.arr;

      // LTV/CAC
      totalLTV += customer.ltv;
      totalCAC += customer.acquisitionCost;

      // Health
      const healthValues = { excellent: 100, good: 75, fair: 50, poor: 25, critical: 10 };
      totalHealth += healthValues[customer.health];

      // NPS
      if (customer.nps !== undefined) {
        totalNPS += customer.nps;
        npsCount++;
      }
    });

    stats.avgLTV = allCustomers.length ? totalLTV / allCustomers.length : 0;
    stats.avgCAC = allCustomers.length ? totalCAC / allCustomers.length : 0;
    stats.avgHealth = allCustomers.length ? totalHealth / allCustomers.length : 0;
    stats.avgNPS = npsCount ? totalNPS / npsCount : 0;
    stats.totalRevenue = stats.totalARR * 12;
    stats.avgDealSize = allCustomers.length ? stats.totalRevenue / allCustomers.length : 0;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer stats' });
  }
});

// GET /api/customers/segments - Get customer segments
router.get('/segments', async (req: Request, res: Response) => {
  try {
    const allCustomers = Array.from(customers.values());

    const segments = {
      byTier: {} as Record<string, { count: number; mrr: number; ltv: number }>,
      bySize: {} as Record<string, { count: number; mrr: number; ltv: number }>,
      byHealth: {} as Record<string, { count: number; mrr: number; churnRisk: number }>,
      byLifecycle: {} as Record<string, { count: number; mrr: number; avgAge: number }>
    };

    allCustomers.forEach(customer => {
      // By Tier
      if (!segments.byTier[customer.tier]) {
        segments.byTier[customer.tier] = { count: 0, mrr: 0, ltv: 0 };
      }
      segments.byTier[customer.tier].count++;
      segments.byTier[customer.tier].mrr += customer.subscription.mrr;
      segments.byTier[customer.tier].ltv += customer.ltv;

      // By Size
      const size = customer.company.size;
      if (!segments.bySize[size]) {
        segments.bySize[size] = { count: 0, mrr: 0, ltv: 0 };
      }
      segments.bySize[size].count++;
      segments.bySize[size].mrr += customer.subscription.mrr;
      segments.bySize[size].ltv += customer.ltv;

      // By Health
      if (!segments.byHealth[customer.health]) {
        segments.byHealth[customer.health] = { count: 0, mrr: 0, churnRisk: 0 };
      }
      segments.byHealth[customer.health].count++;
      segments.byHealth[customer.health].mrr += customer.subscription.mrr;
      const riskValues = { excellent: 0, good: 0.1, fair: 0.3, poor: 0.6, critical: 0.9 };
      segments.byHealth[customer.health].churnRisk = riskValues[customer.health];

      // By Lifecycle
      if (!segments.byLifecycle[customer.lifecycleStage]) {
        segments.byLifecycle[customer.lifecycleStage] = { count: 0, mrr: 0, avgAge: 0 };
      }
      segments.byLifecycle[customer.lifecycleStage].count++;
      segments.byLifecycle[customer.lifecycleStage].mrr += customer.subscription.mrr;
    });

    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

// GET /api/customers/health - Get health overview
router.get('/health', async (req: Request, res: Response) => {
  try {
    const allCustomers = Array.from(customers.values());

    const health = {
      excellent: allCustomers.filter(c => c.health === 'excellent'),
      good: allCustomers.filter(c => c.health === 'good'),
      fair: allCustomers.filter(c => c.health === 'fair'),
      poor: allCustomers.filter(c => c.health === 'poor'),
      critical: allCustomers.filter(c => c.health === 'critical')
    };

    const atRisk = [...health.poor, ...health.critical];
    const healthTrend = allCustomers.length ?
      ((health.excellent.length + health.good.length) / allCustomers.length) * 100 : 0;

    res.json({
      distribution: {
        excellent: { count: health.excellent.length, percentage: (health.excellent.length / allCustomers.length) * 100 },
        good: { count: health.good.length, percentage: (health.good.length / allCustomers.length) * 100 },
        fair: { count: health.fair.length, percentage: (health.fair.length / allCustomers.length) * 100 },
        poor: { count: health.poor.length, percentage: (health.poor.length / allCustomers.length) * 100 },
        critical: { count: health.critical.length, percentage: (health.critical.length / allCustomers.length) * 100 }
      },
      atRisk: {
        count: atRisk.length,
        percentage: (atRisk.length / allCustomers.length) * 100,
        mrr: atRisk.reduce((sum, c) => sum + c.subscription.mrr, 0),
        customers: atRisk.map(c => ({ id: c.id, name: c.fullName, company: c.company.name, health: c.health }))
      },
      healthScore: healthTrend,
      trend: healthTrend >= 80 ? 'healthy' : healthTrend >= 60 ? 'stable' : 'concerning'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health' });
  }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = customers.get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST /api/customers - Create customer directly
router.post('/', async (req: Request, res: Response) => {
  try {
    const bridges = (req as any).bridges;
    const body = req.body;

    const customer: Customer = {
      id: uuidv4(),
      firstName: body.firstName,
      lastName: body.lastName,
      fullName: body.fullName || `${body.firstName || ''} ${body.lastName || ''}`.trim(),
      email: body.email,
      phone: body.phone,
      alternateEmail: body.alternateEmail,
      alternatePhone: body.alternatePhone,
      company: {
        id: body.company?.id,
        name: body.company?.name || body.companyName,
        legalName: body.company?.legalName,
        website: body.company?.website,
        logo: body.company?.logo,
        industry: body.company?.industry || body.industry,
        subIndustry: body.company?.subIndustry,
        size: body.company?.size || body.companySize,
        founded: body.company?.founded,
        headquarters: body.company?.headquarters || {
          address: '',
          city: '',
          country: 'US',
          type: 'headquarters'
        },
        locations: body.company?.locations,
        description: body.company?.description,
        mission: body.company?.mission,
        values: body.company?.values
      },
      accountType: body.accountType || 'individual',
      tier: body.tier || 'starter',
      segment: body.segment || 'smb',
      industry: body.industry || body.company?.industry || 'other',
      status: body.status || 'active',
      lifecycleStage: body.lifecycleStage || 'onboarding',
      health: body.health || 'good',
      convertedFromLead: body.leadId,
      convertedFromDeal: body.dealId,
      convertedAt: new Date(body.convertedAt) || new Date(),
      conversionValue: body.conversionValue || 0,
      conversionSource: body.conversionSource,
      subscription: body.subscription || {
        planId: 'free',
        planName: 'Free',
        status: 'active',
        mrr: 0,
        arr: 0,
        currency: 'USD',
        billingCycle: 'monthly',
        startDate: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        items: []
      },
      billing: body.billing || {
        currency: 'USD',
        paymentMethod: { type: 'card', isDefault: true },
        billingAddress: {
          name: body.fullName || '',
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
      engagement: body.engagement || {
        loginFrequency: 0,
        featureAdoption: { totalFeatures: 0, usedFeatures: 0, adoptionRate: 0, coreFeatures: {} },
        avgSessionDuration: 0,
        monthlyActiveUsers: 0,
        dailyActiveUsers: 0,
        integrationsUsed: 0,
        supportTickets: 0,
        adoptionTrend: 'stable'
      },
      ownerId: body.ownerId || 'system',
      ownerName: body.ownerName || 'System',
      accountManager: body.accountManager,
      primaryContact: {
        id: uuidv4(),
        firstName: body.firstName || '',
        lastName: body.lastName || '',
        fullName: body.fullName || '',
        email: body.email,
        phone: body.phone,
        title: body.title,
        isPrimary: true,
        isDecisionMaker: true
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
        title: 'Customer Created',
        description: 'Customer account created',
        type: 'conversion',
        date: new Date()
      }],
      healthHistory: [{
        date: new Date(),
        health: 'good',
        score: 50,
        factors: []
      }],
      activities: [],
      ltv: 0,
      acquisitionCost: body.acquisitionCost || 0,
      roi: 0,
      paymentHistory: [],
      organizationId: body.organizationId || 'default',
      tags: body.tags || [],
      notes: body.notes,
      customFields: body.customFields,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create digital twin in Customer Ops
    if (bridges?.customerOps) {
      try {
        await bridges.customerOps.createCustomerTwin(customer);
      } catch (e) {}
    }

    // Notify SUTAR
    if (bridges?.sutar) {
      bridges.sutar.logGoalEvent('customer_created', {
        customerId: customer.id,
        company: customer.company.name,
        tier: customer.tier
      }).catch(() => {});
    }

    customers.set(customer.id, customer);

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existingCustomer = customers.get(req.params.id);

    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updates = req.body;
    const updatedCustomer: Customer = {
      ...existingCustomer,
      ...updates,
      id: existingCustomer.id,
      updatedAt: new Date()
    };

    customers.set(updatedCustomer.id, updatedCustomer);

    res.json(updatedCustomer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// POST /api/customers/:id/health - Update health
router.post('/:id/health', async (req: Request, res: Response) => {
  try {
    const customer = customers.get(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { health, score, factors, notes } = req.body;

    // Add to health history
    customer.healthHistory.push({
      date: new Date(),
      health: health || customer.health,
      score: score || customer.successMetrics.healthScore,
      factors: factors || []
    });

    // Update current health
    if (health) customer.health = health;
    customer.successMetrics.healthScore = score || customer.successMetrics.healthScore;

    // Add activity
    customer.activities.push({
      id: uuidv4(),
      type: 'health_update',
      description: notes || `Health updated to ${customer.health}`,
      performedBy: 'system',
      performedAt: new Date()
    });

    // Update status if health is critical
    if (health === 'critical' || health === 'poor') {
      customer.status = 'at_risk';
      customer.lifecycleStage = 'churn';
    } else if (health === 'good' || health === 'excellent') {
      customer.lifecycleStage = 'value';
    }

    customer.updatedAt = new Date();
    customers.set(customer.id, customer);

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update health' });
  }
});

// POST /api/customers/:id/upgrade - Upgrade customer tier
router.post('/:id/upgrade', async (req: Request, res: Response) => {
  try {
    const bridges = (req as any).bridges;
    const customer = customers.get(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { newTier, newPlan, newMRR } = req.body;

    const previousTier = customer.tier;
    const previousMRR = customer.subscription.mrr;

    // Update subscription
    customer.tier = newTier;
    customer.subscription.planId = newPlan?.id || newTier;
    customer.subscription.planName = newPlan?.name || newTier;
    customer.subscription.mrr = newMRR;
    customer.subscription.arr = newMRR * 12;

    // Add milestone
    customer.milestones.push({
      id: uuidv4(),
      title: 'Tier Upgraded',
      description: `Upgraded from ${previousTier} to ${newTier}`,
      type: 'upgrade',
      date: new Date(),
      metadata: { previousTier, newTier, mrrIncrease: newMRR - previousMRR }
    });

    // Update LTV
    customer.ltv = calculateLTV(customer);

    // Update success metrics
    customer.successMetrics.valueScore = Math.min(100, (customer.subscription.mrr / 10000) * 100);

    // Update lifecycle
    customer.lifecycleStage = 'expansion';

    customer.updatedAt = new Date();
    customers.set(customer.id, customer);

    // Log to SUTAR
    if (bridges?.sutar) {
      bridges.sutar.logGoalEvent('customer_upgraded', {
        customerId: customer.id,
        previousTier,
        newTier,
        mrrIncrease: newMRR - previousMRR
      }).catch(() => {});
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upgrade customer' });
  }
});

// POST /api/customers/:id/activity - Add activity
router.post('/:id/activity', async (req: Request, res: Response) => {
  try {
    const customer = customers.get(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { type, description, performedBy, relatedTo, metadata } = req.body;

    customer.activities.push({
      id: uuidv4(),
      type,
      description,
      performedBy: performedBy || 'system',
      performedAt: new Date(),
      relatedTo,
      metadata
    });

    customer.lastActivityAt = new Date();
    customer.updatedAt = new Date();

    customers.set(customer.id, customer);

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add activity' });
  }
});

// Helper function to calculate LTV
function calculateLTV(customer: Customer): number {
  const avgSubscriptionLife = 24; // months
  const grossMargin = 0.7;
  const churnRate = 0.1; // 10% monthly churn

  const monthlyRevenue = customer.subscription.mrr;
  const lifetime = 1 / churnRate; // Average lifetime in months
  const ltv = monthlyRevenue * lifetime * grossMargin;

  return Math.round(ltv);
}

export default router;
