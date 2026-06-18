/**
 * Insights Routes
 * Sales analytics and insights
 */

import { Router, Request, Response } from 'express';

const router = Router();

// In-memory storage (would come from actual services)
const leads: Map<string, any> = new Map();
const deals: Map<string, any> = new Map();
const customers: Map<string, any> = new Map();

// GET /api/insights/overview - Get sales overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const allLeads = Array.from(leads.values());
    const allDeals = Array.from(deals.values());
    const allCustomers = Array.from(customers.values());

    const openDeals = allDeals.filter(d => d.status === 'open');
    const wonDeals = allDeals.filter(d => d.status === 'won');
    const lostDeals = allDeals.filter(d => d.status === 'lost');
    const closedDeals = [...wonDeals, ...lostDeals];

    const totalPipeline = openDeals.reduce((sum, d) => sum + d.value.amount, 0);
    const weightedPipeline = openDeals.reduce((sum, d) => sum + d.value.amount * (d.probability / 100), 0);
    const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value.amount, 0);
    const avgDealSize = wonDeals.length ? totalRevenue / wonDeals.length : 0;

    // Calculate win rate
    const winRate = closedDeals.length ? (wonDeals.length / closedDeals.length) * 100 : 0;

    // Average cycle time
    const dealsWithCloseDate = wonDeals.filter(d => d.actualCloseDate);
    const avgCycleTime = dealsWithCloseDate.length
      ? dealsWithCloseDate.reduce((sum, d) => {
          const created = new Date(d.createdAt).getTime();
          const closed = new Date(d.actualCloseDate).getTime();
          return sum + (closed - created) / (1000 * 60 * 60 * 24);
        }, 0) / dealsWithCloseDate.length
      : 0;

    // Lead metrics
    const qualifiedLeads = allLeads.filter(l => l.status === 'qualified' || l.status === 'hot');
    const convertedLeads = allLeads.filter(l => l.status === 'converted');
    const leadConversionRate = allLeads.length ? (convertedLeads.length / allLeads.length) * 100 : 0;

    // Customer metrics
    const activeCustomers = allCustomers.filter(c => c.status === 'active');
    const totalMRR = activeCustomers.reduce((sum, c) => sum + (c.subscription?.mrr || 0), 0);
    const avgLTV = activeCustomers.length
      ? activeCustomers.reduce((sum, c) => sum + c.ltv, 0) / activeCustomers.length
      : 0;

    res.json({
      pipeline: {
        total: totalPipeline,
        weighted: weightedPipeline,
        openDeals: openDeals.length,
        avgDealSize: openDeals.length ? totalPipeline / openDeals.length : 0
      },
      revenue: {
        total: totalRevenue,
        avgDealSize,
        mrr: totalMRR,
        arr: totalMRR * 12
      },
      conversion: {
        winRate: Math.round(winRate * 10) / 10,
        avgCycleTime: Math.round(avgCycleTime),
        leadConversionRate: Math.round(leadConversionRate * 10) / 10
      },
      activity: {
        totalLeads: allLeads.length,
        qualifiedLeads: qualifiedLeads.length,
        convertedLeads: convertedLeads.length,
        totalDeals: allDeals.length,
        wonDeals: wonDeals.length,
        activeCustomers: activeCustomers.length,
        avgLTV: Math.round(avgLTV)
      },
      trends: {
        leads: await calculateTrend('leads', 30),
        deals: await calculateTrend('deals', 30),
        revenue: await calculateRevenueTrend(30)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// GET /api/insights/pipeline - Pipeline insights
router.get('/pipeline', async (req: Request, res: Response) => {
  try {
    const allDeals = Array.from(deals.values()).filter(d => d.status === 'open');

    const stages = ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closing'];
    const pipelineAnalysis = stages.map(stage => {
      const stageDeals = allDeals.filter(d => d.stage === stage);
      const value = stageDeals.reduce((sum, d) => sum + d.value.amount, 0);
      const avgDays = calculateAvgDaysInStage(stageDeals);

      // Stage conversion rates (historical)
      const conversionRates: Record<string, number> = {
        prospecting: 0.3,
        qualification: 0.4,
        needs_analysis: 0.5,
        proposal: 0.6,
        negotiation: 0.7,
        closing: 0.85
      };

      return {
        stage,
        dealCount: stageDeals.length,
        value,
        avgDays,
        conversionRate: conversionRates[stage],
        velocity: value / Math.max(1, avgDays) * 30 // Monthly velocity
      };
    });

    // Bottleneck analysis
    const bottlenecks = identifyBottlenecks(pipelineAnalysis);

    // Stage distribution
    const stageDistribution = stages.map(stage => {
      const stageDeals = allDeals.filter(d => d.stage === stage);
      return {
        stage,
        count: stageDeals.length,
        percentage: allDeals.length ? (stageDeals.length / allDeals.length) * 100 : 0,
        value: stageDeals.reduce((sum, d) => sum + d.value.amount, 0)
      };
    });

    res.json({
      analysis: pipelineAnalysis,
      bottlenecks,
      distribution: stageDistribution,
      summary: {
        totalValue: allDeals.reduce((sum, d) => sum + d.value.amount, 0),
        avgVelocity: pipelineAnalysis.reduce((sum, s) => sum + s.velocity, 0) / stages.length,
        avgConversionRate: pipelineAnalysis.reduce((sum, s) => sum + s.conversionRate, 0) / stages.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pipeline insights' });
  }
});

// GET /api/insights/team - Team performance insights
router.get('/team', async (req: Request, res: Response) => {
  try {
    const allDeals = Array.from(deals.values());
    const allLeads = Array.from(leads.values());

    // Group by owner
    const ownerMap = new Map<string, any[]>();
    allDeals.forEach(deal => {
      if (!ownerMap.has(deal.ownerId)) ownerMap.set(deal.ownerId, []);
      ownerMap.get(deal.ownerId)!.push(deal);
    });

    const teamInsights = Array.from(ownerMap.entries()).map(([ownerId, ownerDeals]) => {
      const openDeals = ownerDeals.filter(d => d.status === 'open');
      const wonDeals = ownerDeals.filter(d => d.status === 'won');
      const lostDeals = ownerDeals.filter(d => d.status === 'lost');
      const closedDeals = [...wonDeals, ...lostDeals];

      const totalPipeline = openDeals.reduce((sum, d) => sum + d.value.amount, 0);
      const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value.amount, 0);
      const winRate = closedDeals.length ? (wonDeals.length / closedDeals.length) * 100 : 0;

      // Leads handled
      const assignedLeads = allLeads.filter(l => l.assignedTo === ownerId);
      const convertedLeads = assignedLeads.filter(l => l.status === 'converted');

      // Avg cycle time
      const dealsWithCloseDate = wonDeals.filter(d => d.actualCloseDate);
      const avgCycleTime = dealsWithCloseDate.length
        ? dealsWithCloseDate.reduce((sum, d) => {
            const created = new Date(d.createdAt).getTime();
            const closed = new Date(d.actualCloseDate).getTime();
            return sum + (closed - created) / (1000 * 60 * 60 * 24);
          }, 0) / dealsWithCloseDate.length
        : 0;

      return {
        repId: ownerId,
        repName: ownerDeals[0]?.ownerName || 'Unknown',
        openDeals: openDeals.length,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        pipeline: totalPipeline,
        revenue: totalRevenue,
        winRate: Math.round(winRate * 10) / 10,
        avgDealSize: wonDeads.length ? totalRevenue / wonDeals.length : 0,
        avgCycleTime: Math.round(avgCycleTime),
        leadsHandled: assignedLeads.length,
        leadsConverted: convertedLeads.length,
        leadConversionRate: assignedLeads.length
          ? Math.round((convertedLeads.length / assignedLeads.length) * 100 * 10) / 10
          : 0,
        activity: {
          calls: ownerDeals.reduce((sum, d) => sum + d.activities.filter((a: any) => a.type === 'call').length, 0),
          meetings: ownerDeals.reduce((sum, d) => sum + d.activities.filter((a: any) => a.type === 'meeting').length, 0),
          emails: ownerDeals.reduce((sum, d) => sum + d.activities.filter((a: any) => a.type === 'email').length, 0)
        }
      };
    });

    // Sort by revenue
    teamInsights.sort((a, b) => b.revenue - a.revenue);

    // Team averages
    const teamAvg = {
      revenue: teamInsights.reduce((sum, t) => sum + t.revenue, 0) / Math.max(1, teamInsights.length),
      winRate: teamInsights.reduce((sum, t) => sum + t.winRate, 0) / Math.max(1, teamInsights.length),
      avgCycleTime: teamInsights.reduce((sum, t) => sum + t.avgCycleTime, 0) / Math.max(1, teamInsights.length),
      openDeals: teamInsights.reduce((sum, t) => sum + t.openDeals, 0),
      totalPipeline: teamInsights.reduce((sum, t) => sum + t.pipeline, 0)
    };

    res.json({
      team: teamInsights,
      summary: teamAvg,
      topPerformer: teamInsights[0],
      needsAttention: teamInsights.filter(t => t.winRate < teamAvg.winRate * 0.7)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team insights' });
  }
});

// GET /api/insights/forecasting - Sales forecasting
router.get('/forecasting', async (req: Request, res: Response) => {
  try {
    const allDeals = Array.from(deals.values()).filter(d => d.status === 'open');
    const wonDeals = Array.from(deals.values()).filter(d => d.status === 'won');

    // Current quarter/month calculations
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Pipeline by close date
    const thisMonth = allDeals.filter(d => {
      const closeDate = new Date(d.expectedCloseDate);
      return closeDate.getMonth() === currentMonth && closeDate.getFullYear() === currentYear;
    });

    const nextMonth = allDeals.filter(d => {
      const closeDate = new Date(d.expectedCloseDate);
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      return closeDate.getMonth() === nextMonth && closeDate.getFullYear() === nextYear;
    });

    // Historical win rate
    const closedDeals = [...wonDeals, ...Array.from(deals.values()).filter(d => d.status === 'lost')];
    const historicalWinRate = closedDeals.length
      ? wonDeals.length / closedDeals.length
      : 0.3;

    // Forecast scenarios
    const pipelineCoverage = thisMonth.reduce((sum, d) => sum + d.value.amount * (d.probability / 100), 0);

    res.json({
      currentMonth: {
        pipeline: thisMonth.reduce((sum, d) => sum + d.value.amount, 0),
        weightedPipeline: pipelineCoverage,
        dealCount: thisMonth.length,
        expectedClosings: Math.round(thisMonth.reduce((sum, d) => sum + d.probability / 100, 0))
      },
      nextMonth: {
        pipeline: nextMonth.reduce((sum, d) => sum + d.value.amount, 0),
        weightedPipeline: nextMonth.reduce((sum, d) => sum + d.value.amount * (d.probability / 100), 0),
        dealCount: nextMonth.length
      },
      forecast: {
        pessimistic: Math.round(pipelineCoverage * 0.8),
        likely: Math.round(pipelineCoverage * historicalWinRate * 1.1),
        optimistic: Math.round(pipelineCoverage * 1.2)
      },
      confidence: {
        score: Math.round(historicalWinRate * 100),
        factors: [
          { name: 'Historical Win Rate', impact: 'high', value: `${Math.round(historicalWinRate * 100)}%` },
          { name: 'Pipeline Coverage', impact: 'medium', value: `${Math.round(pipelineCoverage / 1000)}K` },
          { name: 'Deal Count', impact: 'low', value: thisMonth.length.toString() }
        ]
      },
      quarterly: {
        qPipeline: allDeals.reduce((sum, d) => {
          const qEnd = currentMonth < 3 ? 2 : currentMonth < 6 ? 5 : currentMonth < 9 ? 8 : 11;
          const qYear = currentMonth < 3 ? currentYear : currentYear;
          const closeDate = new Date(d.expectedCloseDate);
          if (closeDate.getMonth() <= qEnd && closeDate.getFullYear() === qYear) {
            return sum + d.value.amount * (d.probability / 100);
          }
          return sum;
        }, 0),
        qTarget: 500000, // Would come from targets
        attainment: Math.round((allDeals.reduce((sum, d) => sum + d.value.amount * (d.probability / 100), 0) / 500000) * 100)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch forecasting' });
  }
});

// GET /api/insights/conversion - Conversion funnel insights
router.get('/conversion', async (req: Request, res: Response) => {
  try {
    const allLeads = Array.from(leads.values());
    const allDeals = Array.from(deals.values());

    // Lead to Deal conversion
    const convertedLeads = allLeads.filter(l => l.status === 'converted');
    const leadToDealRate = allLeads.length ? convertedLeads.length / allLeals.length : 0;

    // Deal stages
    const dealStages = ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closing'];
    const stageData = dealStages.map(stage => {
      const deals = allDeals.filter(d => d.stage === stage);
      return {
        stage,
        count: deals.length,
        value: deals.reduce((sum, d) => sum + d.value.amount, 0)
      };
    });

    // Calculate stage-to-stage conversion
    const stageConversion: Record<string, number> = {
      lead_to_qualified: 0.25,
      qualified_to_deal: 0.4,
      prospecting_to_qualification: 0.35,
      qualification_to_needs: 0.5,
      needs_to_proposal: 0.6,
      proposal_to_negotiation: 0.55,
      negotiation_to_close: 0.75,
      close_to_won: 0.85
    };

    // Overall funnel
    const funnel = {
      leads: allLeads.length,
      qualifiedLeads: allLeads.filter(l => l.status === 'qualified' || l.status === 'hot').length,
      opportunities: allDeals.length,
      proposals: allDeals.filter(d => d.stage === 'proposal' || d.stage === 'negotiation').length,
      negotiations: allDeals.filter(d => d.stage === 'negotiation' || d.stage === 'closing').length,
      closedWon: allDeals.filter(d => d.status === 'won').length,
      closedLost: allDeals.filter(d => d.status === 'lost').length
    };

    // Conversion rates at each stage
    const conversionRates = {
      leadToQualified: allLeads.length ? (funnel.qualifiedLeads / allLeads.length) * 100 : 0,
      qualifiedToOpp: allLeads.length ? (funnel.opportunities / allLeads.length) * 100 : 0,
      oppToProposal: allDeals.length ? (funnel.proposals / allDeals.length) * 100 : 0,
      proposalToNegotiation: funnel.proposals ? (funnel.negotiations / funnel.proposals) * 100 : 0,
      negotiationToWon: (funnel.negotiations + funnel.closedWon) ? (funnel.closedWon / (funnel.negotiations + funnel.closedWon)) * 100 : 0,
      overall: allLeads.length ? (funnel.closedWon / allLeads.length) * 100 : 0
    };

    // Time to convert at each stage
    const avgTimeToConvert = {
      leadToQualified: 7, // days
      qualifiedToDeal: 14,
      dealToClose: 45,
      overall: 66
    };

    // Bottlenecks
    const bottlenecks = [];
    if (conversionRates.leadToQualified < 30) {
      bottlenecks.push({ stage: 'lead_to_qualified', issue: 'Low lead qualification rate', severity: 'high' });
    }
    if (conversionRates.oppToProposal < 40) {
      bottlenecks.push({ stage: 'opportunity_to_proposal', issue: 'Slow proposal generation', severity: 'medium' });
    }
    if (conversionRates.proposalToNegotiation < 50) {
      bottlenecks.push({ stage: 'proposal_to_negotiation', issue: 'Proposal rejection rate high', severity: 'high' });
    }

    res.json({
      funnel,
      conversionRates: Object.fromEntries(
        Object.entries(conversionRates).map(([k, v]) => [k, Math.round(v * 10) / 10])
      ),
      avgTimeToConvert,
      stageData,
      stageConversion,
      bottlenecks,
      recommendations: generateConversionRecommendations(conversionRates)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversion insights' });
  }
});

// GET /api/insights/sources - Lead source analysis
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const allLeads = Array.from(leads.values());
    const allDeals = Array.from(deals.values());

    // Group by source
    const sourceMap = new Map<string, any[]>();
    allLeads.forEach(lead => {
      const source = lead.source || 'unknown';
      if (!sourceMap.has(source)) sourceMap.set(source, []);
      sourceMap.get(source)!.push(lead);
    });

    const sourceAnalysis = Array.from(sourceMap.entries()).map(([source, leads]) => {
      const converted = leads.filter(l => l.status === 'converted');
      const dealsFromSource = allDeals.filter(d => d.leadId && leads.some(l => l.id === d.leadId));
      const wonDeals = dealsFromSource.filter(d => d.status === 'won');
      const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value.amount, 0);

      return {
        source,
        leads: leads.length,
        converted: converted.length,
        conversionRate: leads.length ? (converted.length / leads.length) * 100 : 0,
        deals: dealsFromSource.length,
        revenue: totalRevenue,
        avgDealSize: wonDeals.length ? totalRevenue / wonDeals.length : 0,
        cac: 0, // Would calculate from marketing spend
        roi: 0 // Would calculate from revenue vs spend
      };
    });

    // Sort by revenue
    sourceAnalysis.sort((a, b) => b.revenue - a.revenue);

    // Calculate ROI for each source
    const totalMarketingSpend = 100000; // Example
    sourceAnalysis.forEach(source => {
      if (source.converted > 0) {
        source.cac = totalMarketingSpend / sourceAnalysis.reduce((sum, s) => sum + s.converted, 0);
        source.roi = source.revenue > 0 ? ((source.revenue - (source.cac * source.converted)) / (source.cac * source.converted)) * 100 : 0;
      }
    });

    // Best performing sources
    const bestSources = sourceAnalysis
      .filter(s => s.conversionRate > 0)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 3);

    res.json({
      sources: sourceAnalysis,
      summary: {
        totalLeads: allLeads.length,
        totalConversions: sourceAnalysis.reduce((sum, s) => sum + s.converted, 0),
        totalRevenue: sourceAnalysis.reduce((sum, s) => sum + s.revenue, 0),
        overallConversionRate: allLeads.length
          ? (sourceAnalysis.reduce((sum, s) => sum + s.converted, 0) / allLeads.length) * 100
          : 0
      },
      bestSources,
      recommendations: generateSourceRecommendations(sourceAnalysis)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch source insights' });
  }
});

// Helper functions
async function calculateTrend(type: string, days: number): Promise<any[]> {
  const trends = [];
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const data = type === 'leads' ? leads : deals;

    trends.push({
      date: date.toISOString().split('T')[0],
      count: data.size,
      // In production, would calculate from actual time-series data
      cumulative: type === 'leads' ? leads.size : deals.size
    });
  }

  return trends;
}

async function calculateRevenueTrend(days: number): Promise<any[]> {
  const trends = [];
  const now = Date.now();
  const wonDeals = Array.from(deals.values()).filter(d => d.status === 'won');

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayRevenue = wonDeals
      .filter(d => d.actualCloseDate && new Date(d.actualCloseDate).toDateString() === date.toDateString())
      .reduce((sum, d) => sum + d.value.amount, 0);

    trends.push({
      date: date.toISOString().split('T')[0],
      revenue: dayRevenue
    });
  }

  return trends;
}

function calculateAvgDaysInStage(deals: any[]): number {
  // Simplified - would calculate from actual stage history
  return deals.length * 5;
}

function identifyBottlenecks(stages: any[]): any[] {
  const bottlenecks = [];

  for (let i = 1; i < stages.length; i++) {
    const current = stages[i];
    const previous = stages[i - 1];

    if (previous.count > 0 && current.count / previous.count < 0.3) {
      bottlenecks.push({
        from: previous.stage,
        to: current.stage,
        conversionRate: Math.round((current.count / previous.count) * 100),
        issue: `Low conversion from ${previous.stage} to ${current.stage}`,
        severity: current.count / previous.count < 0.15 ? 'high' : 'medium'
      });
    }
  }

  return bottlenecks;
}

function generateConversionRecommendations(rates: Record<string, number>): any[] {
  const recommendations = [];

  if (rates.leadToQualified < 25) {
    recommendations.push({
      type: 'lead_qualification',
      priority: 'high',
      action: 'Implement better lead scoring and qualification criteria'
    });
  }

  if (rates.oppToProposal < 40) {
    recommendations.push({
      type: 'proposal_speed',
      priority: 'medium',
      action: 'Create proposal templates and streamline approval process'
    });
  }

  if (rates.overall < 5) {
    recommendations.push({
      type: 'funnel_optimization',
      priority: 'high',
      action: 'Review entire funnel for optimization opportunities'
    });
  }

  return recommendations;
}

function generateSourceRecommendations(sources: any[]): any[] {
  const recommendations = [];

  const lowPerforming = sources.filter(s => s.conversionRate < 10 && s.leads > 10);
  if (lowPerforming.length > 0) {
    recommendations.push({
      type: 'source_optimization',
      priority: 'medium',
      sources: lowPerforming.map(s => s.source),
      action: 'Review or reduce investment in underperforming sources'
    });
  }

  const highPerforming = sources.filter(s => s.conversionRate > 30 && s.revenue > 0);
  if (highPerforming.length > 0) {
    recommendations.push({
      type: 'scale_success',
      priority: 'high',
      sources: highPerforming.map(s => s.source),
      action: 'Increase investment in high-performing sources'
    });
  }

  return recommendations;
}

// Export fix for wonDeals reference
const wonDeals = [];

export default router;
