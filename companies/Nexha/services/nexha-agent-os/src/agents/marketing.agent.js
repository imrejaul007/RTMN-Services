/**
 * Marketing Agent — Campaign management, audience analysis, content strategy.
 *
 * ADR-??? Phase 3 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';

export class MarketingAgent {
  constructor(tenantId) {
    this.agentId = 'marketing';
    this.tenantId = tenantId;
    this.role = 'Marketing';
    this.name = 'Nexha Marketing Agent';
    this.capabilities = [
      'campaign_creation',
      'audience_analysis',
      'content_generation',
      'budget_allocation',
      'performance_tracking',
      'seo_optimization',
      'social_scheduling',
    ];
    this.campaigns = [];
    this.audiences = [];
    this.activityLog = [];
  }

  async act(context) {
    const { action } = context;
    switch (action) {
      case 'create_campaign': return this.createCampaign(context);
      case 'list_campaigns': return this.listCampaigns(context);
      case 'analyze_audience': return this.analyzeAudience(context);
      case 'optimize_budget': return this.optimizeBudget(context);
      case 'get_performance': return this.getPerformance(context);
      default: return { error: `Unknown action: ${action}` };
    }
  }

  async createCampaign(context) {
    const { name, type, budget, channels, audience } = context;
    if (!name || !type) return { error: 'name and type required' };

    const campaign = {
      campaignId: uuidv4(),
      name,
      type: type || 'awareness',
      status: 'draft',
      budget: budget || 0,
      spent: 0,
      channels: channels || ['email', 'social'],
      audience: audience || 'general',
      startDate: context.startDate || null,
      endDate: context.endDate || null,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      roi: 0,
      createdAt: new Date().toISOString(),
    };

    this.campaigns.push(campaign);
    this.log('create_campaign', { campaignId: campaign.campaignId, name });
    return { campaign };
  }

  async listCampaigns(context = {}) {
    const { status, type } = context;
    let list = [...this.campaigns];
    if (status) list = list.filter(c => c.status === status);
    if (type) list = list.filter(c => c.type === type);
    return { campaigns: list, total: list.length };
  }

  async analyzeAudience(context = {}) {
    const { segment } = context;
    // Simulate audience analysis
    const audiences = [
      { id: 'enterprise', name: 'Enterprise Buyers', size: 234, avgDealSize: 50000, conversionRate: 0.12 },
      { id: 'smb', name: 'Small Business', size: 1247, avgDealSize: 5000, conversionRate: 0.08 },
      { id: 'startup', name: 'Startups', size: 892, avgDealSize: 2500, conversionRate: 0.05 },
      { id: 'individual', name: 'Individual', size: 8923, avgDealSize: 99, conversionRate: 0.15 },
    ];

    if (segment) {
      const found = audiences.find(a => a.id === segment);
      return found ? { audience: found } : { error: 'Segment not found' };
    }

    this.log('analyze_audience', { segments: audiences.length });
    return { audiences };
  }

  async optimizeBudget(context = {}) {
    const { totalBudget } = context;
    if (!totalBudget) return { error: 'totalBudget required' };

    // Simple budget allocation algorithm
    const allocation = [
      { channel: 'Google Ads', pct: 35, amount: totalBudget * 0.35, expectedRoas: 4.2 },
      { channel: 'Meta Ads', pct: 30, amount: totalBudget * 0.30, expectedRoas: 3.8 },
      { channel: 'LinkedIn', pct: 15, amount: totalBudget * 0.15, expectedRoas: 5.1 },
      { channel: 'Email', pct: 10, amount: totalBudget * 0.10, expectedRoas: 8.5 },
      { channel: 'Content', pct: 10, amount: totalBudget * 0.10, expectedRoas: 3.2 },
    ];

    this.log('optimize_budget', { totalBudget, channels: allocation.length });
    return { allocation, totalBudget };
  }

  async getPerformance(context = {}) {
    const { campaignId } = context;
    if (campaignId) {
      const campaign = this.campaigns.find(c => c.campaignId === campaignId);
      if (!campaign) return { error: 'Campaign not found' };
      return { campaign, metrics: this.calculateMetrics(campaign) };
    }

    // Aggregate performance
    const total = this.campaigns.reduce((acc, c) => ({
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      conversions: acc.conversions + c.conversions,
      spent: acc.spent + c.spent,
    }), { impressions: 0, clicks: 0, conversions: 0, spent: 0 });

    return {
      campaigns: this.campaigns.length,
      active: this.campaigns.filter(c => c.status === 'active').length,
      ...total,
      ctr: total.impressions > 0 ? (total.clicks / total.impressions * 100).toFixed(2) + '%' : '0%',
      conversionRate: total.clicks > 0 ? (total.conversions / total.clicks * 100).toFixed(2) + '%' : '0%',
    };
  }

  calculateMetrics(campaign) {
    const ctr = campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0;
    const convRate = campaign.clicks > 0 ? campaign.conversions / campaign.clicks : 0;
    return {
      ctr: (ctr * 100).toFixed(2) + '%',
      conversionRate: (convRate * 100).toFixed(2) + '%',
      cpc: campaign.clicks > 0 ? (campaign.spent / campaign.clicks).toFixed(2) : 0,
      roi: campaign.spent > 0 ? (campaign.conversions * 100 / campaign.spent).toFixed(2) : 0,
    };
  }

  log(action, data) {
    this.activityLog.unshift({ id: uuidv4(), timestamp: new Date().toISOString(), action, data });
    if (this.activityLog.length > 100) this.activityLog.pop();
  }

  getHistory(limit = 20) {
    return this.activityLog.slice(0, limit);
  }

  getProfile() {
    return {
      agentId: this.agentId,
      role: this.role,
      name: this.name,
      capabilities: this.capabilities,
      campaignsCount: this.campaigns.length,
    };
  }
}
