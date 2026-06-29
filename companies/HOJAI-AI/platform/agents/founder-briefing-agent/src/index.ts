/**
 * Founder Briefing Agent
 * Daily Executive Summary - Sales, Marketing, Operations, Finance
 */

import { Agent, AgentContext, AgentResult } from '@hojai/agents';
import { MemoryOS } from '@hojai/memory';
import { TwinOS } from '@hojai/twins';

export interface BriefingConfig {
  channels: ('slack' | 'email')[];
  recipients: string[];
  time: string; // cron format
  includeSections: string[];
}

export interface DailyMetrics {
  sales?: {
    newLeads: number;
    dealsWon: number;
    dealsLost: number;
    pipelineValue: number;
    avgDealSize: number;
  };
  marketing?: {
    websiteVisitors: number;
    conversions: number;
    leads: number;
    CAC: number;
    ROAS: number;
  };
  operations?: {
    ticketsOpen: number;
    ticketsResolved: number;
    CSAT: number;
    responseTime: number;
  };
  finance?: {
    revenue: number;
    burn: number;
    runway: number;
    cashFlow: number;
  };
}

export class FounderBriefingAgent extends Agent {
  private memory: MemoryOS;
  private twins: TwinOS;
  private config: BriefingConfig;

  constructor(config: Partial<BriefingConfig> = {}) {
    super({
      id: 'founder-briefing-agent',
      name: 'Founder Briefing Agent',
      role: 'founder',
      description: 'AI-powered daily executive briefing with KPIs, risks, and recommendations',
      skills: [
        'data_aggregation',
        'trend_analysis',
        'risk_detection',
        'opportunity_identification',
        'report_generation'
      ],
      memory: {
        required: ['daily_briefing_history', 'metrics_history', 'company_twin'],
        updateOn: ['briefing_generated', 'risk_identified', 'opportunity_detected']
      },
      twins: ['company_twin', 'sales_twin', 'customer_twin']
    });

    this.memory = new MemoryOS();
    this.twins = new TwinOS();
    this.config = {
      channels: config.channels ?? ['slack'],
      recipients: config.recipients ?? [],
      time: config.time ?? '0 7 * * *',
      includeSections: config.includeSections ?? ['sales', 'marketing', 'operations', 'finance', 'risks', 'opportunities']
    };
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Step 1: Gather all metrics
    const metrics = await this.gatherMetrics();

    // Step 2: Compare with yesterday
    const yesterdayMetrics = await this.getYesterdayMetrics();
    const trends = this.calculateTrends(metrics, yesterdayMetrics);

    // Step 3: Identify risks
    const risks = await this.identifyRisks(metrics, trends);

    // Step 4: Identify opportunities
    const opportunities = await this.identifyOpportunities(metrics, trends);

    // Step 5: Generate recommendations
    const recommendations = await this.generateRecommendations(risks, opportunities, metrics);

    // Step 6: Build briefing
    const briefing = this.buildBriefing(metrics, trends, risks, opportunities, recommendations);

    // Step 7: Update company twin
    await this.updateCompanyTwin(metrics, risks, opportunities);

    // Step 8: Update memory
    await this.updateBriefingHistory(briefing);

    // Step 9: Send to channels
    await this.sendBriefing(briefing);

    return {
      success: true,
      output: {
        briefing,
        metrics,
        trends,
        risks,
        opportunities,
        recommendations
      }
    };
  }

  private async gatherMetrics(): Promise<DailyMetrics> {
    // In production, these would call actual CRM, analytics, etc.
    return {
      sales: await this.getSalesMetrics(),
      marketing: await this.getMarketingMetrics(),
      operations: await this.getOperationsMetrics(),
      finance: await this.getFinanceMetrics()
    };
  }

  private async getSalesMetrics(): Promise<DailyMetrics['sales']> {
    // TODO: Integrate with CRM (Salesforce, HubSpot, REZ CRM Hub)
    return {
      newLeads: Math.floor(Math.random() * 50) + 10,
      dealsWon: Math.floor(Math.random() * 5) + 1,
      dealsLost: Math.floor(Math.random() * 3),
      pipelineValue: Math.floor(Math.random() * 1000000) + 500000,
      avgDealSize: Math.floor(Math.random() * 50000) + 20000
    };
  }

  private async getMarketingMetrics(): Promise<DailyMetrics['marketing']> {
    // TODO: Integrate with analytics (Google Analytics, Mixpanel)
    return {
      websiteVisitors: Math.floor(Math.random() * 5000) + 1000,
      conversions: Math.floor(Math.random() * 50) + 10,
      leads: Math.floor(Math.random() * 30) + 5,
      CAC: Math.floor(Math.random() * 500) + 200,
      ROAS: Math.round((Math.random() * 5 + 2) * 100) / 100
    };
  }

  private async getOperationsMetrics(): Promise<DailyMetrics['operations']> {
    // TODO: Integrate with support (Zendesk, Freshdesk)
    return {
      ticketsOpen: Math.floor(Math.random() * 100) + 20,
      ticketsResolved: Math.floor(Math.random() * 80) + 15,
      CSAT: Math.round((Math.random() * 0.5 + 4.5) * 100) / 100,
      responseTime: Math.floor(Math.random() * 30) + 5
    };
  }

  private async getFinanceMetrics(): Promise<DailyMetrics['finance']> {
    // TODO: Integrate with finance (QuickBooks, Xero)
    return {
      revenue: Math.floor(Math.random() * 200000) + 100000,
      burn: Math.floor(Math.random() * 50000) + 30000,
      runway: Math.floor(Math.random() * 18) + 6,
      cashFlow: Math.floor(Math.random() * 100000) + 50000
    };
  }

  private async getYesterdayMetrics(): Promise<DailyMetrics | null> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const history = await this.memory.search({
      type: 'daily_briefing',
      date: dateStr,
      limit: 1
    });

    return history[0]?.metrics || null;
  }

  private calculateTrends(current: DailyMetrics, yesterday: DailyMetrics | null): Record<string, {
    value: number;
    change: number;
    direction: 'up' | 'down' | 'stable';
  }> {
    const trends: Record<string, any> = {};

    if (!yesterday) {
      return trends;
    }

    // Sales trends
    if (current.sales && yesterday.sales) {
      trends.newLeads = this.calcTrend(current.sales.newLeads, yesterday.sales.newLeads);
      trends.dealsWon = this.calcTrend(current.sales.dealsWon, yesterday.sales.dealsWon);
      trends.pipelineValue = this.calcTrend(current.sales.pipelineValue, yesterday.sales.pipelineValue);
    }

    // Marketing trends
    if (current.marketing && yesterday.marketing) {
      trends.visitors = this.calcTrend(current.marketing.websiteVisitors, yesterday.marketing.websiteVisitors);
      trends.conversions = this.calcTrend(current.marketing.conversions, yesterday.marketing.conversions);
    }

    // Operations trends
    if (current.operations && yesterday.operations) {
      trends.CSAT = this.calcTrend(current.operations.CSAT, yesterday.operations.CSAT);
      trends.ticketsOpen = this.calcTrend(current.operations.ticketsOpen, yesterday.operations.ticketsOpen);
    }

    return trends;
  }

  private calcTrend(current: number, previous: number): { value: number; change: number; direction: 'up' | 'down' | 'stable' } {
    const change = previous === 0 ? 0 : Math.round(((current - previous) / previous) * 100);
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (change > 5) direction = 'up';
    if (change < -5) direction = 'down';

    return { value: current, change, direction };
  }

  private async identifyRisks(metrics: DailyMetrics, trends: Record<string, any>): Promise<{
    level: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    metric?: string;
  }[]> {
    const risks: any[] = [];

    // Low conversion rate
    if (metrics.marketing) {
      const conversionRate = metrics.marketing.conversions / metrics.marketing.websiteVisitors;
      if (conversionRate < 0.02) {
        risks.push({
          level: 'high',
          title: 'Low Conversion Rate',
          description: `Conversion rate at ${(conversionRate * 100).toFixed(1)}% - below industry benchmark of 2.5%`,
          metric: 'conversion_rate'
        });
      }
    }

    // High CAC
    if (metrics.marketing && metrics.sales) {
      const LTV = metrics.sales.avgDealSize * 3; // Simplified
      if (metrics.marketing.CAC > LTV * 0.3) {
        risks.push({
          level: 'high',
          title: 'High Customer Acquisition Cost',
          description: `CAC of ₹${metrics.marketing.CAC} exceeds 30% of LTV`,
          metric: 'CAC'
        });
      }
    }

    // Declining sales
    if (trends.dealsWon?.direction === 'down' && trends.dealsWon?.change < -20) {
      risks.push({
        level: 'high',
        title: 'Sales Decline',
        description: `Deals won dropped ${Math.abs(trends.dealsWon.change)}% from yesterday`,
        metric: 'deals_won'
      });
    }

    // Low CSAT
    if (metrics.operations && metrics.operations.CSAT < 4.0) {
      risks.push({
        level: 'medium',
        title: 'Low Customer Satisfaction',
        description: `CSAT at ${metrics.operations.CSAT} - below target of 4.5`,
        metric: 'CSAT'
      });
    }

    // Low runway
    if (metrics.finance && metrics.finance.runway < 6) {
      risks.push({
        level: 'high',
        title: 'Cash Runway Critical',
        description: `Only ${metrics.finance.runway} months of runway remaining`,
        metric: 'runway'
      });
    }

    return risks;
  }

  private async identifyOpportunities(metrics: DailyMetrics, trends: Record<string, any>): Promise<{
    level: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potential: string;
  }[]> {
    const opportunities: any[] = [];

    // Strong lead flow
    if (metrics.sales && metrics.sales.newLeads > 50) {
      opportunities.push({
        level: 'high',
        title: 'Strong Lead Generation',
        description: `${metrics.sales.newLeads} new leads - highest in 30 days`,
        potential: 'Scale outreach to convert more'
      });
    }

    // Growing pipeline
    if (trends.pipelineValue?.direction === 'up' && trends.pipelineValue?.change > 15) {
      opportunities.push({
        level: 'medium',
        title: 'Pipeline Growth',
        description: `Pipeline up ${trends.pipelineValue.change}% - potential revenue growth`,
        potential: 'Focus on deal velocity'
      });
    }

    // High ROAS
    if (metrics.marketing && metrics.marketing.ROAS > 4) {
      opportunities.push({
        level: 'high',
        title: 'High Marketing ROI',
        description: `ROAS at ${metrics.marketing.ROAS}x - scale profitable campaigns`,
        potential: 'Increase ad spend by 20%'
      });
    }

    // Low ticket backlog
    if (metrics.operations && metrics.operations.ticketsOpen < 30) {
      opportunities.push({
        level: 'low',
        title: 'Support Running Smoothly',
        description: 'Low ticket volume - consider reallocating support resources',
        potential: 'Redirect to sales support'
      });
    }

    return opportunities;
  }

  private async generateRecommendations(risks: any[], opportunities: any[], metrics: DailyMetrics): Promise<string[]> {
    const recommendations: string[] = [];

    // Risk-based recommendations
    risks.forEach(risk => {
      if (risk.level === 'high') {
        switch (risk.metric) {
          case 'conversion_rate':
            recommendations.push('Review landing pages and user flow for optimization');
            break;
          case 'CAC':
            recommendations.push('Focus on organic channels to reduce CAC');
            break;
          case 'deals_won':
            recommendations.push('Schedule pipeline review with sales team');
            break;
          case 'runway':
            recommendations.push('Prioritize revenue-generating activities immediately');
            break;
        }
      }
    });

    // Opportunity-based recommendations
    opportunities.forEach(opp => {
      if (opp.level === 'high') {
        recommendations.push(opp.potential);
      }
    });

    // Default recommendations if none
    if (recommendations.length === 0) {
      recommendations.push('Continue current strategy - all metrics within targets');
    }

    return recommendations.slice(0, 5); // Top 5
  }

  private buildBriefing(
    metrics: DailyMetrics,
    trends: Record<string, any>,
    risks: any[],
    opportunities: any[],
    recommendations: string[]
  ): string {
    const date = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    const formatTrend = (t: any) => {
      if (!t) return '';
      const emoji = t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→';
      const color = t.direction === 'up' ? 'green' : t.direction === 'down' ? 'red' : 'gray';
      return `${emoji} ${Math.abs(t.change)}%`;
    };

    let briefing = `# 📊 Daily Briefing - ${date}\n\n`;

    // Sales Section
    if (metrics.sales && this.config.includeSections.includes('sales')) {
      briefing += `## 💰 Sales\n`;
      briefing += `| Metric | Value | vs Yesterday |\n`;
      briefing += `|--------|-------|------------|\n`;
      briefing += `| New Leads | ${metrics.sales.newLeads} | ${formatTrend(trends.newLeads)} |\n`;
      briefing += `| Deals Won | ${metrics.sales.dealsWon} | ${formatTrend(trends.dealsWon)} |\n`;
      briefing += `| Pipeline Value | ${formatCurrency(metrics.sales.pipelineValue)} | ${formatTrend(trends.pipelineValue)} |\n`;
      briefing += `| Avg Deal Size | ${formatCurrency(metrics.sales.avgDealSize)} | - |\n\n`;
    }

    // Marketing Section
    if (metrics.marketing && this.config.includeSections.includes('marketing')) {
      briefing += `## 📣 Marketing\n`;
      briefing += `| Metric | Value | vs Yesterday |\n`;
      briefing += `|--------|-------|------------|\n`;
      briefing += `| Visitors | ${metrics.marketing.websiteVisitors.toLocaleString()} | ${formatTrend(trends.visitors)} |\n`;
      briefing += `| Conversions | ${metrics.marketing.conversions} | ${formatTrend(trends.conversions)} |\n`;
      briefing += `| CAC | ${formatCurrency(metrics.marketing.CAC)} | - |\n`;
      briefing += `| ROAS | ${metrics.marketing.ROAS}x | - |\n\n`;
    }

    // Operations Section
    if (metrics.operations && this.config.includeSections.includes('operations')) {
      briefing += `## ⚙️ Operations\n`;
      briefing += `| Metric | Value | Target |\n`;
      briefing += `|--------|-------|--------|\n`;
      briefing += `| CSAT | ${metrics.operations.CSAT}/5 | 4.5+ |\n`;
      briefing += `| Tickets Open | ${metrics.operations.ticketsOpen} | <50 |\n`;
      briefing += `| Response Time | ${metrics.operations.responseTime}m | <15m |\n\n`;
    }

    // Finance Section
    if (metrics.finance && this.config.includeSections.includes('finance')) {
      briefing += `## 💵 Finance\n`;
      briefing += `| Metric | Value |\n`;
      briefing += `|--------|-------|\n`;
      briefing += `| Revenue | ${formatCurrency(metrics.finance.revenue)} |\n`;
      briefing += `| Burn | ${formatCurrency(metrics.finance.burn)}/mo |\n`;
      briefing += `| Runway | ${metrics.finance.runway} months |\n`;
      briefing += `| Cash Flow | ${formatCurrency(metrics.finance.cashFlow)} |\n\n`;
    }

    // Risks Section
    if (risks.length > 0 && this.config.includeSections.includes('risks')) {
      briefing += `## ⚠️ Risks\n`;
      risks.slice(0, 3).forEach(risk => {
        const emoji = risk.level === 'high' ? '🔴' : risk.level === 'medium' ? '🟡' : '🟢';
        briefing += `${emoji} ${risk.title}\n`;
        briefing += `   ${risk.description}\n\n`;
      });
    }

    // Opportunities Section
    if (opportunities.length > 0 && this.config.includeSections.includes('opportunities')) {
      briefing += `## 🚀 Opportunities\n`;
      opportunities.slice(0, 3).forEach(opp => {
        briefing += `• ${opp.title}: ${opp.description}\n`;
      });
      briefing += '\n';
    }

    // Recommendations Section
    if (recommendations.length > 0) {
      briefing += `## 🎯 Today's Priorities\n`;
      recommendations.forEach((rec, i) => {
        briefing += `${i + 1}. ${rec}\n`;
      });
      briefing += '\n';
    }

    briefing += `---\n`;
    briefing += `*Generated at ${new Date().toLocaleTimeString()} by Founder Briefing Agent*\n`;

    return briefing;
  }

  private async updateCompanyTwin(metrics: DailyMetrics, risks: any[], opportunities: any[]): Promise<void> {
    await this.twins.update('company_twin', {
      lastBriefing: new Date().toISOString(),
      metrics,
      topRisks: risks.filter(r => r.level === 'high').map(r => r.title),
      topOpportunities: opportunities.filter(o => o.level === 'high').map(o => o.title)
    });
  }

  private async updateBriefingHistory(briefing: string): Promise<void> {
    await this.memory.save({
      type: 'daily_briefing',
      date: new Date().toISOString().split('T')[0],
      briefing,
      createdAt: new Date().toISOString()
    });
  }

  private async sendBriefing(briefing: string): Promise<void> {
    for (const channel of this.config.channels) {
      if (channel === 'slack') {
        // TODO: Integrate with Slack
        console.log('Sending to Slack:', this.config.recipients);
      } else if (channel === 'email') {
        // TODO: Integrate with email
        console.log('Sending to email:', this.config.recipients);
      }
    }
  }
}

export default FounderBriefingAgent;
