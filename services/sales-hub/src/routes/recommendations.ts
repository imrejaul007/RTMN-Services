/**
 * Recommendations Routes
 * AI-powered next best actions
 */

import { Router, Request, Response } from 'express';
import { AIScoringService } from '../services/aiScoring';
import { RoutingService } from '../services/routing';

const router = Router();
const aiScoring = new AIScoringService();
const routing = new RoutingService();

// In-memory storage for entities (in production, these would come from services)
const leads: Map<string, any> = new Map();
const deals: Map<string, any> = new Map();
const customers: Map<string, any> = new Map();

// GET /api/recommendations/leads - Get lead recommendations
router.get('/leads', async (req: Request, res: Response) => {
  try {
    const { territory, repId, limit = 10 } = req.query;

    const allLeads = Array.from(leads.values());
    const scoredLeads = await Promise.all(
      allLeads.map(async (lead: any) => {
        const score = await aiScoring.scoreLead(lead, null);
        return { ...lead, score: score.score.total, quality: score.quality };
      })
    );

    // Filter and sort
    let recommendations = scoredLeads
      .filter((l: any) => l.status === 'qualified' || l.temperature === 'hot')
      .filter((l: any) => !l.assignedTo || l.assignedTo === 'unassigned')
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, Number(limit));

    // Territory filter
    if (territory) {
      recommendations = recommendations.filter((l: any) => l.territory === territory);
    }

    // Rep filter
    if (repId) {
      recommendations = recommendations.filter((l: any) => l.assignedTo === repId);
    }

    // Generate recommendations
    const response = recommendations.map((lead: any) => ({
      type: 'lead_priority',
      entityId: lead.id,
      entityType: 'lead',
      priority: lead.score >= 80 ? 'high' : lead.score >= 50 ? 'medium' : 'low',
      score: lead.score,
      quality: lead.quality,
      reason: generateLeadReason(lead),
      action: {
        type: 'contact_lead',
        label: 'Contact Now',
        reason: 'High score lead ready for outreach'
      },
      suggestedTiming: lead.score >= 80 ? 'immediate' : 'within_24h',
      channels: suggestChannels(lead)
    }));

    res.json({
      recommendations: response,
      summary: {
        total: response.length,
        highPriority: response.filter((r: any) => r.priority === 'high').length,
        mediumPriority: response.filter((r: any) => r.priority === 'medium').length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get lead recommendations' });
  }
});

// GET /api/recommendations/deals - Get deal recommendations
router.get('/deals', async (req: Request, res: Response) => {
  try {
    const { stage, ownerId, limit = 10 } = req.query;

    const allDeals = Array.from(deals.values());
    let filteredDeals = allDeals.filter((d: any) => d.status === 'open');

    // Stage filter
    if (stage) {
      filteredDeals = filteredDeals.filter((d: any) => d.stage === stage);
    }

    // Owner filter
    if (ownerId) {
      filteredDeals = filteredDeals.filter((d: any) => d.ownerId === ownerId);
    }

    // Sort by value and urgency
    const recommendations = filteredDeals
      .map((deal: any) => {
        const daysToClose = Math.ceil((new Date(deal.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const urgency = daysToClose <= 7 ? 'critical' : daysToClose <= 14 ? 'high' : daysToClose <= 30 ? 'medium' : 'low';

        return {
          type: 'deal_acceleration',
          entityId: deal.id,
          entityType: 'deal',
          priority: urgency,
          value: deal.value.amount,
          stage: deal.stage,
          daysToClose,
          reason: generateDealReason(deal, daysToClose),
          actions: generateDealActions(deal, daysToClose),
          stakeholders: deal.stakeholders?.length || 0,
          nextBestAction: suggestNextAction(deal)
        };
      })
      .sort((a: any, b: any) => {
        // Sort by priority then value
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.value - a.value;
      })
      .slice(0, Number(limit));

    res.json({
      recommendations,
      summary: {
        total: recommendations.length,
        totalValue: recommendations.reduce((sum: number, r: any) => sum + r.value, 0),
        critical: recommendations.filter((r: any) => r.priority === 'critical').length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get deal recommendations' });
  }
});

// GET /api/recommendations/customers - Get customer recommendations
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const { health, tier, limit = 10 } = req.query;

    const allCustomers = Array.from(customers.values());
    let filteredCustomers = allCustomers;

    // Health filter
    if (health) {
      filteredCustomers = filteredCustomers.filter((c: any) => c.health === health);
    }

    // Tier filter
    if (tier) {
      filteredCustomers = filteredCustomers.filter((c: any) => c.tier === tier);
    }

    const recommendations = filteredCustomers
      .map((customer: any) => {
        const recommendations: any[] = [];

        // At-risk recommendations
        if (customer.health === 'poor' || customer.health === 'critical') {
          recommendations.push({
            type: 'churn_prevention',
            priority: 'critical',
            action: {
              type: 'schedule_check_in',
              label: 'Schedule Emergency Check-in',
              reason: 'Customer health is at risk'
            }
          });
        }

        // Upgrade recommendations
        if (customer.engagement?.adoptionRate > 70 && customer.tier !== 'enterprise') {
          recommendations.push({
            type: 'expansion',
            priority: 'high',
            action: {
              type: 'propose_upgrade',
              label: 'Propose Upgrade',
              reason: 'High adoption suggests readiness for higher tier'
            }
          });
        }

        // Engagement recommendations
        if (customer.engagement?.loginFrequency < 2) {
          recommendations.push({
            type: 're_engagement',
            priority: 'medium',
            action: {
              type: 'send_re_engagement',
              label: 'Send Re-engagement Campaign',
              reason: 'Low login frequency detected'
            }
          });
        }

        // Success check-in
        if (customer.successMetrics?.lastQBR &&
            (Date.now() - new Date(customer.successMetrics.lastQBR).getTime()) > 90 * 24 * 60 * 60 * 1000) {
          recommendations.push({
            type: 'qbr',
            priority: 'medium',
            action: {
              type: 'schedule_qbr',
              label: 'Schedule QBR',
              reason: 'Quarterly review overdue'
            }
          });
        }

        return {
          entityId: customer.id,
          entityType: 'customer',
          customerName: customer.fullName,
          company: customer.company?.name,
          health: customer.health,
          tier: customer.tier,
          mrr: customer.subscription?.mrr,
          recommendations
        };
      })
      .filter((c: any) => c.recommendations.length > 0)
      .sort((a: any, b: any) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority = Math.min(...a.recommendations.map((r: any) => priorityOrder[r.priority]));
        const bPriority = Math.min(...b.recommendations.map((r: any) => priorityOrder[r.priority]));
        return aPriority - bPriority;
      })
      .slice(0, Number(limit));

    res.json({
      recommendations,
      summary: {
        total: recommendations.length,
        atRisk: recommendations.filter((r: any) => r.health === 'poor' || r.health === 'critical').length,
        expansionOpportunities: recommendations.filter((r: any) =>
          r.recommendations.some((rec: any) => rec.type === 'expansion')
        ).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get customer recommendations' });
  }
});

// GET /api/recommendations/next-best-action - Get next best action
router.get('/next-best-action', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.query;

    let entity: any = null;
    if (entityType === 'lead' && entityId) {
      entity = leads.get(entityId as string);
    } else if (entityType === 'deal' && entityId) {
      entity = deals.get(entityId as string);
    } else if (entityType === 'customer' && entityId) {
      entity = customers.get(entityId as string);
    }

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const nba = await generateNextBestAction(entity, entityType as string);

    res.json(nba);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate next best action' });
  }
});

// GET /api/recommendations/territory - Get territory recommendations
router.get('/territory', async (req: Request, res: Response) => {
  try {
    const bridges = (req as any).bridges;

    // Get territory recommendations from routing service
    const territories = [
      { id: 'territory-1', name: 'West Coast', unassignedLeads: 15, potential: 150000 },
      { id: 'territory-2', name: 'East Coast', unassignedLeads: 12, potential: 120000 },
      { id: 'territory-3', name: 'Central', unassignedLeads: 8, potential: 80000 }
    ];

    const recommendations = territories.map(t => ({
      ...t,
      recommendations: [
        {
          type: 'rebalance',
          priority: t.unassignedLeads > 10 ? 'high' : 'medium',
          action: 'Consider reassigning leads to balance workload',
          potentialImpact: t.potential * 0.1
        },
        {
          type: 'coverage',
          priority: 'medium',
          action: 'Ensure adequate rep coverage in this territory',
          gap: Math.ceil(t.unassignedLeads / 3)
        }
      ]
    }));

    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get territory recommendations' });
  }
});

// Helper functions
function generateLeadReason(lead: any): string {
  const reasons: string[] = [];

  if (lead.score >= 80) {
    reasons.push('High engagement score');
  }
  if (lead.temperature === 'hot') {
    reasons.push('Hot temperature');
  }
  if (lead.trustScore?.overall >= 80) {
    reasons.push('Strong trust score');
  }
  if (lead.authority === 'cxo' || lead.authority === 'vp') {
    reasons.push('Decision-maker level');
  }
  if (lead.timeline === 'immediate' || lead.timeline === '1_month') {
    reasons.push('Ready to buy timeline');
  }

  return reasons.join(', ') || 'Qualified for outreach';
}

function suggestChannels(lead: any): string[] {
  const channels: string[] = ['email'];

  if (lead.temperature === 'hot') {
    channels.push('phone', 'linkedin');
  }
  if (lead.linkedIn) {
    channels.push('linkedin');
  }
  if (lead.touchpoints?.some((t: any) => t.type === 'demo_request')) {
    channels.push('demo');
  }

  return channels;
}

function generateDealReason(deal: any, daysToClose: number): string {
  if (daysToClose <= 0) {
    return 'Deal is past expected close date';
  }
  if (deal.stage === 'negotiation' && deal.stakeholders?.length < 2) {
    return 'Missing stakeholder engagement';
  }
  if (deal.value.amount >= 100000) {
    return 'High-value deal requires attention';
  }
  return 'Standard deal progression';
}

function generateDealActions(deal: any, daysToClose: number): any[] {
  const actions: any[] = [];

  if (daysToClose <= 0) {
    actions.push({ type: 'follow_up', label: 'Follow up on close', priority: 'critical' });
  }
  if (deal.nextStep) {
    actions.push({ type: 'complete_next_step', label: deal.nextStep, priority: 'high' });
  }
  if (deal.stakeholders?.length < 2) {
    actions.push({ type: 'add_stakeholder', label: 'Add more stakeholders', priority: 'high' });
  }
  if (deal.stage === 'proposal') {
    actions.push({ type: 'send_proposal', label: 'Send/Follow up on proposal', priority: 'high' });
  }

  return actions;
}

function suggestNextAction(deal: any): string {
  const stageActions: Record<string, string> = {
    prospecting: 'Initial outreach and discovery',
    qualification: 'Qualify budget, timeline, and authority',
    needs_analysis: 'Conduct deep dive needs analysis',
    proposal: 'Present and customize proposal',
    negotiation: 'Address concerns and finalize terms',
    closing: 'Get signature and close deal'
  };

  return stageActions[deal.stage] || 'Continue current engagement';
}

async function generateNextBestAction(entity: any, entityType: string): Promise<any> {
  if (entityType === 'lead') {
    const score = await aiScoring.scoreLead(entity, null);
    return {
      entityId: entity.id,
      entityType: 'lead',
      score: score.score.total,
      quality: score.quality,
      recommendedAction: {
        type: 'contact',
        method: entity.temperature === 'hot' ? 'phone' : 'email',
        message: generatePersonalizedMessage(entity),
        timing: score.score.total >= 70 ? 'immediate' : 'scheduled'
      },
      alternativeActions: suggestChannels(entity).map(channel => ({
        type: 'contact',
        channel,
        priority: channel === 'phone' ? 1 : 2
      }))
    };
  }

  return {
    entityId: entity.id,
    entityType,
    recommendedAction: { type: 'continue', message: 'No specific action recommended' }
  };
}

function generatePersonalizedMessage(lead: any): string {
  const templates: Record<string, string> = {
    hot: `Hi ${lead.firstName}, I noticed ${lead.company} is expanding rapidly. I'd love to show you how we've helped similar companies...`,
    warm: `Hi ${lead.firstName}, I came across ${lead.company} and I think we could add significant value to your team...`,
    cold: `Hi ${lead.firstName}, I wanted to reach out about how we might help ${lead.company} achieve its goals...`
  };

  return templates[lead.temperature] || templates.warm;
}

export default router;
