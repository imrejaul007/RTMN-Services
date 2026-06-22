/**
 * HOJAI FounderOS - Briefing Service
 * AI-powered executive briefings
 */

import { v4 as uuid } from 'uuid';
import { FounderBriefingModel, BriefingTemplateModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';
import { BriefingType } from '../types/index.js';

const logger = createLogger('briefing');

// Service URLs for integration
const REVENUE_SERVICE = process.env.HOJAI_REVENUE_URL || 'http://localhost:4780';
const CUSTOMER_SERVICE = process.env.HOJAI_CUSTOMER_URL || 'http://localhost:4752';
const PRODUCT_SERVICE = process.env.HOJAI_PRODUCT_URL || 'http://localhost:4790';
const GOAL_SERVICE = process.env.HOJAI_GOAL_URL || 'http://localhost:4800';
const MEETING_SERVICE = process.env.HOJAI_MEETING_URL || 'http://localhost:4810';
const WORKFORCE_SERVICE = process.env.HOJAI_WORKFORCE_URL || 'http://localhost:4820';

export class BriefingService {
  /**
   * Get latest briefing by type
   */
  async getLatest(tenantId: string, type: BriefingType): Promise<any | null> {
    const briefing = await FounderBriefingModel.findOne({ tenantId, type })
      .sort({ date: -1 });

    return briefing ? this.formatBriefing(briefing) : null;
  }

  /**
   * List briefings by type
   */
  async list(tenantId: string, type: BriefingType, limit = 30): Promise<any[]> {
    const briefings = await FounderBriefingModel.find({ tenantId, type })
      .sort({ date: -1 })
      .limit(limit);

    return briefings.map(b => this.formatBriefing(b));
  }

  /**
   * Generate daily CEO briefing
   */
  async generateDailyBriefing(tenantId: string, userId?: string): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Gather data from various services
    const [revenueData, customerData, productData, meetingSchedule] = await Promise.allSettled([
      this.fetchRevenueMetrics(tenantId),
      this.fetchCustomerMetrics(tenantId),
      this.fetchProductMetrics(tenantId),
      this.fetchMeetingSchedule(tenantId, startOfDay, endOfDay)
    ]);

    // Generate briefing content
    const content = this.generateDailyContent(
      revenueData.status === 'fulfilled' ? revenueData.value : null,
      customerData.status === 'fulfilled' ? customerData.value : null,
      productData.status === 'fulfilled' ? productData.value : null,
      meetingSchedule.status === 'fulfilled' ? meetingSchedule.value : null
    );

    const briefing = await this.saveBriefing(tenantId, BriefingType.DAILY, content, userId);

    logger.info('daily_briefing_generated', { tenantId, briefingId: briefing.id });
    return briefing;
  }

  /**
   * Generate weekly executive briefing
   */
  async generateWeeklyBriefing(tenantId: string, userId?: string): Promise<any> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Gather data from various services
    const [revenueData, customerData, goalProgress, teamMetrics] = await Promise.allSettled([
      this.fetchWeeklyRevenueMetrics(tenantId, startOfWeek, endOfWeek),
      this.fetchWeeklyCustomerMetrics(tenantId, startOfWeek, endOfWeek),
      this.fetchGoalProgress(tenantId),
      this.fetchTeamMetrics(tenantId)
    ]);

    // Generate briefing content
    const content = this.generateWeeklyContent(
      revenueData.status === 'fulfilled' ? revenueData.value : null,
      customerData.status === 'fulfilled' ? customerData.value : null,
      goalProgress.status === 'fulfilled' ? goalProgress.value : null,
      teamMetrics.status === 'fulfilled' ? teamMetrics.value : null
    );

    const briefing = await this.saveBriefing(tenantId, BriefingType.WEEKLY, content, userId, {
      start: startOfWeek,
      end: endOfWeek
    });

    logger.info('weekly_briefing_generated', { tenantId, briefingId: briefing.id });
    return briefing;
  }

  /**
   * Generate board briefing
   */
  async generateBoardBriefing(tenantId: string, userId?: string): Promise<any> {
    // Gather comprehensive data
    const [financialMetrics, tractionData, milestoneData, fundraisingData] = await Promise.allSettled([
      this.fetchFinancialMetrics(tenantId),
      this.fetchTractionMetrics(tenantId),
      this.fetchMilestoneProgress(tenantId),
      this.fetchFundraisingStatus(tenantId)
    ]);

    // Generate board-ready content
    const content = this.generateBoardContent(
      financialMetrics.status === 'fulfilled' ? financialMetrics.value : null,
      tractionData.status === 'fulfilled' ? tractionData.value : null,
      milestoneData.status === 'fulfilled' ? milestoneData.value : null,
      fundraisingData.status === 'fulfilled' ? fundraisingData.value : null
    );

    const briefing = await this.saveBriefing(tenantId, BriefingType.BOARD, content, userId);

    logger.info('board_briefing_generated', { tenantId, briefingId: briefing.id });
    return briefing;
  }

  /**
   * Generate investor briefing
   */
  async generateInvestorBriefing(tenantId: string, userId?: string): Promise<any> {
    // Gather investor-relevant data
    const [metrics, highlights, financialModel, competitiveData] = await Promise.allSettled([
      this.fetchInvestorMetrics(tenantId),
      this.fetchTractionHighlights(tenantId),
      this.fetchFinancialSummary(tenantId),
      this.fetchCompetitivePositioning(tenantId)
    ]);

    // Generate investor-ready content
    const content = this.generateInvestorContent(
      metrics.status === 'fulfilled' ? metrics.value : null,
      highlights.status === 'fulfilled' ? highlights.value : null,
      financialModel.status === 'fulfilled' ? financialModel.value : null,
      competitiveData.status === 'fulfilled' ? competitiveData.value : null
    );

    const briefing = await this.saveBriefing(tenantId, BriefingType.INVESTOR, content, userId);

    logger.info('investor_briefing_generated', { tenantId, briefingId: briefing.id });
    return briefing;
  }

  /**
   * List briefing templates
   */
  async listTemplates(tenantId: string, type?: BriefingType): Promise<any[]> {
    const query = type ? { tenantId, type } : { tenantId };
    const templates = await BriefingTemplateModel.find(query)
      .sort({ createdAt: -1 });

    return templates.map(t => this.formatTemplate(t));
  }

  /**
   * Create briefing template
   */
  async createTemplate(tenantId: string, data: {
    type: BriefingType;
    name: string;
    description?: string;
    sections: Array<{
      name: string;
      description?: string;
      order?: number;
      required?: boolean;
      prompts?: string[];
    }>;
  }): Promise<any> {
    const id = uuid();

    const template = new BriefingTemplateModel({
      id,
      tenantId,
      type: data.type,
      name: data.name,
      description: data.description,
      sections: data.sections.map((s, i) => ({
        id: uuid(),
        name: s.name,
        description: s.description,
        order: s.order ?? i,
        required: s.required ?? true,
        prompts: s.prompts || []
      }))
    });

    await template.save();
    logger.info('briefing_template_created', { tenantId, id, name: data.name });

    return this.formatTemplate(template);
  }

  // ============================================================================
  // PRIVATE METHODS - DATA FETCHING
  // ============================================================================

  private async fetchRevenueMetrics(tenantId: string): Promise<any> {
    // In production, this would call the revenue service
    // For now, return simulated metrics
    return {
      revenue: 0,
      newCustomers: 0,
      churnedCustomers: 0,
      activeUsers: 0
    };
  }

  private async fetchWeeklyRevenueMetrics(tenantId: string, start: Date, end: Date): Promise<any> {
    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      revenue: 0,
      revenueGrowth: 0,
      newCustomers: 0,
      churnRate: 0,
      avgDealSize: 0,
      salesCycleDays: 0
    };
  }

  private async fetchCustomerMetrics(tenantId: string): Promise<any> {
    return {
      total: 0,
      active: 0,
      new: 0,
      atRisk: 0,
      nps: 0
    };
  }

  private async fetchWeeklyCustomerMetrics(tenantId: string, start: Date, end: Date): Promise<any> {
    return {
      newCustomers: 0,
      churnedCustomers: 0,
      expansion: 0,
      netNew: 0
    };
  }

  private async fetchProductMetrics(tenantId: string): Promise<any> {
    return {
      activeFeatures: 0,
      featureAdoption: 0,
      bugCount: 0,
      uptime: 100
    };
  }

  private async fetchMeetingSchedule(tenantId: string, start: Date, end: Date): Promise<any> {
    return {
      meetings: [],
      focusTime: 0,
      meetingCount: 0
    };
  }

  private async fetchGoalProgress(tenantId: string): Promise<any> {
    return {
      totalGoals: 0,
      onTrack: 0,
      atRisk: 0,
      completed: 0,
      overallProgress: 0
    };
  }

  private async fetchTeamMetrics(tenantId: string): Promise<any> {
    return {
      headcount: 0,
      openRoles: 0,
      utilization: 0,
      satisfaction: 0
    };
  }

  private async fetchFinancialMetrics(tenantId: string): Promise<any> {
    return {
      arr: 0,
      mrr: 0,
      growth: 0,
      burnRate: 0,
      runway: 0,
      grossMargin: 0
    };
  }

  private async fetchTractionMetrics(tenantId: string): Promise<any> {
    return {
      customers: 0,
      revenue: 0,
      growth: 0,
      nps: 0
    };
  }

  private async fetchMilestoneProgress(tenantId: string): Promise<any> {
    return {
      achieved: [],
      upcoming: [],
      delayed: []
    };
  }

  private async fetchFundraisingStatus(tenantId: string): Promise<any> {
    return {
      currentRound: null,
      targetAmount: 0,
      raisedAmount: 0,
      investors: []
    };
  }

  private async fetchInvestorMetrics(tenantId: string): Promise<any> {
    return {
      arr: 0,
      arrGrowth: 0,
      customers: 0,
      nps: 0,
      burnMultiple: 0,
      ltvCac: 0
    };
  }

  private async fetchTractionHighlights(tenantId: string): Promise<any> {
    return [];
  }

  private async fetchFinancialSummary(tenantId: string): Promise<any> {
    return {
      revenue: 0,
      costs: 0,
      burn: 0,
      runway: 0
    };
  }

  private async fetchCompetitivePositioning(tenantId: string): Promise<any> {
    return {
      strengths: [],
      differentiators: []
    };
  }

  // ============================================================================
  // PRIVATE METHODS - CONTENT GENERATION
  // ============================================================================

  private generateDailyContent(
    revenue: any,
    customers: any,
    product: any,
    meetings: any
  ): any {
    return {
      overview: `Daily briefing for ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      priorities: [
        { id: uuid(), title: 'Review daily metrics', description: 'Check key performance indicators', weight: 1 },
        { id: uuid(), title: 'Follow up on leads', description: 'Connect with potential customers', weight: 2 },
        { id: uuid(), title: 'Execute key tasks', description: 'Focus on high-impact activities', weight: 3 }
      ],
      risks: [
        { id: uuid(), title: 'Pipeline gaps', severity: 'medium', mitigation: 'Increase outbound efforts' }
      ],
      opportunities: [
        { id: uuid(), title: 'Market expansion', description: 'Explore new customer segments', potential: 'high' }
      ],
      metrics: [
        { name: 'Revenue Today', value: revenue?.revenue || 0, unit: 'USD', trend: 'stable' },
        { name: 'New Customers', value: revenue?.newCustomers || 0, trend: 'stable' },
        { name: 'Active Users', value: revenue?.activeUsers || 0, trend: 'stable' },
        { name: 'System Uptime', value: product?.uptime || 100, unit: '%', trend: 'stable' }
      ],
      recommendations: [
        'Focus on high-priority tasks for maximum impact',
        'Monitor key metrics throughout the day',
        'Schedule follow-ups with potential customers'
      ]
    };
  }

  private generateWeeklyContent(
    revenue: any,
    customers: any,
    goals: any,
    team: any
  ): any {
    const weekProgress = goals?.overallProgress || 0;

    return {
      overview: `Weekly executive briefing for the week of ${new Date().toLocaleDateString()}`,
      priorities: [
        { id: uuid(), title: 'Revenue growth', description: 'Focus on closing deals this week', weight: 1 },
        { id: uuid(), title: 'Goal alignment', description: `Current progress: ${weekProgress}%`, weight: 2 },
        { id: uuid(), title: 'Team development', description: 'Support team growth and performance', weight: 3 }
      ],
      risks: [
        { id: uuid(), title: 'Sales cycle lengthening', severity: 'medium', mitigation: 'Review and optimize sales process' },
        { id: uuid(), title: 'Team capacity', severity: 'low', mitigation: 'Consider hiring priorities' }
      ],
      opportunities: [
        { id: uuid(), title: 'Market momentum', description: 'Strong product-market fit indicators', potential: 'high' },
        { id: uuid(), title: 'Team growth', description: `${team?.openRoles || 0} open roles in progress`, potential: 'medium' }
      ],
      metrics: [
        { name: 'Weekly Revenue', value: revenue?.revenue || 0, unit: 'USD', change: revenue?.revenueGrowth || 0, trend: 'up' },
        { name: 'New Customers', value: customers?.newCustomers || 0, trend: 'stable' },
        { name: 'Churn Rate', value: customers?.churnRate || 0, unit: '%', trend: 'down' },
        { name: 'Goal Progress', value: weekProgress, unit: '%', trend: weekProgress >= 70 ? 'up' : 'down' }
      ],
      recommendations: [
        `Week-over-week revenue growth: ${revenue?.revenueGrowth || 0}%`,
        `${goals?.onTrack || 0} goals on track, ${goals?.atRisk || 0} at risk`,
        `${team?.headcount || 0} team members, ${team?.openRoles || 0} open positions`
      ]
    };
  }

  private generateBoardContent(
    financials: any,
    traction: any,
    milestones: any,
    fundraising: any
  ): any {
    const raised = fundraising?.raisedAmount || 0;
    const target = fundraising?.targetAmount || 0;

    return {
      overview: 'Quarterly board briefing - Company performance and outlook',
      priorities: [
        { id: uuid(), title: 'Revenue growth', description: `ARR: $${(financials?.arr || 0).toLocaleString()}`, weight: 1 },
        { id: uuid(), title: 'Path to profitability', description: `Burn rate: $${(financials?.burnRate || 0).toLocaleString()}/mo`, weight: 2 },
        { id: uuid(), title: 'Team scaling', description: 'Execute hiring plan', weight: 3 }
      ],
      risks: [
        { id: uuid(), title: 'Competitive pressure', severity: 'medium', mitigation: 'Continue product differentiation' },
        { id: uuid(), title: 'Market conditions', severity: 'low', mitigation: 'Maintain capital efficiency' }
      ],
      opportunities: [
        { id: uuid(), title: 'Market expansion', description: 'New geographic markets', potential: 'high' },
        { id: uuid(), title: 'Product expansion', description: 'Adjacent product opportunities', potential: 'medium' }
      ],
      metrics: [
        { name: 'ARR', value: financials?.arr || 0, unit: 'USD', change: financials?.growth || 0, trend: 'up' },
        { name: 'MRR', value: financials?.mrr || 0, unit: 'USD', trend: 'up' },
        { name: 'Growth Rate', value: financials?.growth || 0, unit: '% YoY', trend: 'up' },
        { name: 'Gross Margin', value: financials?.grossMargin || 0, unit: '%', trend: 'stable' },
        { name: 'Runway', value: financials?.runway || 0, unit: 'months', trend: 'stable' },
        { name: 'Customers', value: traction?.customers || 0, trend: 'up' }
      ],
      recommendations: [
        `ARR growth of ${financials?.growth || 0}% YoY`,
        `${milestones?.achieved?.length || 0} milestones achieved this period`,
        `${milestones?.upcoming?.length || 0} milestones planned`,
        `Fundraising: ${raised > 0 ? `$${raised.toLocaleString()} raised of $${target.toLocaleString()} target` : 'Not currently fundraising'}`
      ]
    };
  }

  private generateInvestorContent(
    metrics: any,
    highlights: any,
    financials: any,
    competitive: any
  ): any {
    return {
      overview: 'Investor briefing - Key metrics and traction highlights',
      priorities: [
        { id: uuid(), title: 'ARR growth', description: `${metrics?.arrGrowth || 0}% YoY growth`, weight: 1 },
        { id: uuid(), title: 'Unit economics', description: `LTV:CAC = ${metrics?.ltvCac || 0}x`, weight: 2 },
        { id: uuid(), title: 'Capital efficiency', description: `Burn multiple: ${metrics?.burnMultiple || 0}x`, weight: 3 }
      ],
      risks: [
        { id: uuid(), title: 'Market timing', severity: 'low', mitigation: 'Maintain product-market fit' }
      ],
      opportunities: [
        { id: uuid(), title: 'Market leadership', description: 'Growing competitive advantage', potential: 'high' }
      ],
      metrics: [
        { name: 'ARR', value: metrics?.arr || 0, unit: 'USD', change: metrics?.arrGrowth || 0, trend: 'up' },
        { name: 'Customers', value: metrics?.customers || 0, trend: 'up' },
        { name: 'NPS', value: metrics?.nps || 0, trend: 'up' },
        { name: 'LTV:CAC', value: metrics?.ltvCac || 0, unit: 'x', trend: 'up' },
        { name: 'Burn Multiple', value: metrics?.burnMultiple || 0, unit: 'x', trend: 'down' }
      ],
      recommendations: [
        `Strong ARR growth of ${metrics?.arrGrowth || 0}%`,
        `Excellent unit economics with LTV:CAC of ${metrics?.ltvCac || 0}x`,
        'Focus areas: ' + (competitive?.differentiators?.join(', ') || 'Continued growth')
      ]
    };
  }

  // ============================================================================
  // PRIVATE METHODS - HELPERS
  // ============================================================================

  private async saveBriefing(
    tenantId: string,
    type: BriefingType,
    content: any,
    userId?: string,
    period?: { start: Date; end: Date }
  ): Promise<any> {
    const id = uuid();
    const now = new Date();

    const briefing = new FounderBriefingModel({
      id,
      tenantId,
      type,
      date: now,
      period: period || { start: now, end: now },
      content,
      generatedAt: now,
      generatedBy: userId
    });

    await briefing.save();
    return this.formatBriefing(briefing);
  }

  private formatBriefing(briefing: any): any {
    return {
      id: briefing.id,
      tenantId: briefing.tenantId,
      type: briefing.type,
      date: briefing.date,
      period: briefing.period,
      content: briefing.content,
      generatedAt: briefing.generatedAt,
      generatedBy: briefing.generatedBy
    };
  }

  private formatTemplate(template: any): any {
    return {
      id: template.id,
      tenantId: template.tenantId,
      type: template.type,
      name: template.name,
      description: template.description,
      sections: template.sections,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }
}

export const briefingService = new BriefingService();
export default briefingService;