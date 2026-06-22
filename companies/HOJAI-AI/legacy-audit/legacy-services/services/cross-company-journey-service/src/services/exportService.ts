import { JourneyEvent, UnifiedJourney, JourneyMilestone, IJourneyEvent, IJourneyMilestone } from '../models/journey';
import { logger } from '../utils/logger';
import { journeyAnalytics } from './journeyAnalytics';
import { patternDetection } from './patternDetection';

export type ExportFormat = 'json' | 'csv' | 'pdf' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  includeEvents?: boolean;
  includeMilestones?: boolean;
  includeAnalytics?: boolean;
  includePatterns?: boolean;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface JourneyReport {
  customerId: string;
  generatedAt: Date;
  summary: JourneySummary;
  events?: IJourneyEvent[];
  milestones?: IJourneyMilestone[];
  analytics?: AnalyticsSummary;
  patterns?: PatternSummary;
}

export interface JourneySummary {
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  journeyStartDate: Date;
  lastActivityDate: Date;
  journeyDurationDays: number;
  currentPhase: string;
  healthScore: number;
  totalCompanies: number;
  totalEvents: number;
  totalRevenue: number;
  lifetimeValue: number;
  engagementScore: number;
  churnRisk: number;
  preferredChannels: string[];
  companies: CompanySummary[];
}

export interface CompanySummary {
  companyId: string;
  companyName: string;
  firstInteraction: Date;
  lastInteraction: Date;
  totalInteractions: number;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  preferredChannel: string;
  engagementScore: number;
}

export interface AnalyticsSummary {
  engagement: {
    overallScore: number;
    recencyScore: number;
    frequencyScore: number;
    topChannels: { channel: string; count: number }[];
  };
  ltv: {
    lifetimeValue: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalOrders: number;
    predicted12MonthValue: number;
  };
  churnRisk: {
    riskScore: number;
    riskLevel: string;
    daysSinceLastActivity: number;
  };
  velocity: {
    currentPhase: string;
    velocityScore: number;
  };
}

export interface PatternSummary {
  patterns: {
    patternType: string;
    confidence: number;
    description: string;
  }[];
  churnSignals: {
    riskLevel: string;
    score: number;
    signals: string[];
  };
  upsellOpportunities: {
    type: string;
    targetCompany: string;
    reason: string;
  }[];
}

export interface SharedAccess {
  accessId: string;
  customerId: string;
  agentId: string;
  grantedAt: Date;
  expiresAt: Date;
  accessLevel: 'summary' | 'full' | 'events_only';
  sharedData?: Partial<JourneyReport>;
}

export class ExportService {
  private sharedAccessStore: Map<string, SharedAccess> = new Map();

  /**
   * Export journey data in specified format
   */
  async exportJourney(
    customerId: string,
    format: ExportFormat,
    options?: Partial<ExportOptions>
  ): Promise<string> {
    logger.info(`Exporting journey for customer ${customerId} in ${format} format`);

    const report = await this.generateJourneyReport(customerId, options);

    switch (format) {
      case 'json':
        return this.exportAsJSON(report);
      case 'csv':
        return this.exportAsCSV(report);
      case 'html':
        return this.exportAsHTML(report);
      case 'pdf':
        // PDF generation would require a library like puppeteer or pdfkit
        // For now, return HTML which can be converted to PDF
        return this.exportAsHTML(report);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate comprehensive journey report
   */
  async generateJourneyReport(
    customerId: string,
    options?: Partial<ExportOptions>
  ): Promise<JourneyReport> {
    const journey = await UnifiedJourney.findOne({ customerId });

    if (!journey) {
      throw new Error(`Journey not found for customer: ${customerId}`);
    }

    const summary = await this.generateSummary(journey);

    const report: JourneyReport = {
      customerId,
      generatedAt: new Date(),
      summary
    };

    if (options?.includeEvents !== false) {
      const dateFilter: Record<string, unknown> = { customerId };
      if (options?.dateRange) {
        dateFilter.timestamp = {};
        if (options.dateRange.start) {
          (dateFilter.timestamp as Record<string, Date>).$gte = options.dateRange.start;
        }
        if (options.dateRange.end) {
          (dateFilter.timestamp as Record<string, Date>).$lte = options.dateRange.end;
        }
      }
      const events = await JourneyEvent.find(dateFilter)
        .sort({ timestamp: -1 })
        .limit(1000)
        .lean();
      report.events = events as unknown as IJourneyEvent[];
    }

    if (options?.includeMilestones !== false) {
      const milestones = await JourneyMilestone.find({ customerId })
        .sort({ achievedAt: -1 })
        .lean();
      report.milestones = milestones as unknown as IJourneyMilestone[];
    }

    if (options?.includeAnalytics !== false) {
      const analyticsSummary = await this.generateAnalyticsSummary(customerId);
      report.analytics = analyticsSummary;
    }

    if (options?.includePatterns !== false) {
      const patternSummary = await this.generatePatternSummary(customerId);
      report.patterns = patternSummary;
    }

    return report;
  }

  /**
   * Generate summary section
   */
  private async generateSummary(journey: InstanceType<typeof UnifiedJourney>): Promise<JourneySummary> {
    const journeyDurationDays = Math.ceil(
      (Date.now() - journey.journeyStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const companies: CompanySummary[] = journey.companies.map(company => ({
      companyId: company.companyId,
      companyName: company.companyName,
      firstInteraction: company.firstInteraction,
      lastInteraction: company.lastInteraction,
      totalInteractions: company.totalInteractions,
      revenue: company.revenue,
      orders: company.orders,
      averageOrderValue: company.averageOrderValue,
      preferredChannel: company.preferredChannel,
      engagementScore: company.engagementScore
    }));

    return {
      customerId: journey.customerId,
      customerEmail: journey.customerEmail,
      customerName: journey.customerName,
      journeyStartDate: journey.journeyStartDate,
      lastActivityDate: journey.lastActivityDate,
      journeyDurationDays,
      currentPhase: journey.currentPhase,
      healthScore: journey.healthScore,
      totalCompanies: journey.totalCompanies,
      totalEvents: journey.totalEvents,
      totalRevenue: journey.totalRevenue,
      lifetimeValue: journey.lifetimeValue,
      engagementScore: journey.engagementScore,
      churnRisk: journey.churnRisk,
      preferredChannels: journey.preferredChannels,
      companies
    };
  }

  /**
   * Generate analytics summary
   */
  private async generateAnalyticsSummary(customerId: string): Promise<AnalyticsSummary> {
    const [engagementMetrics, ltvMetrics, churnRiskMetrics, velocityMetrics] = await Promise.all([
      journeyAnalytics.getEngagementMetrics(customerId),
      journeyAnalytics.getLTV(customerId),
      journeyAnalytics.getChurnRiskMetrics(customerId),
      journeyAnalytics.getJourneyVelocity(customerId)
    ]);

    return {
      engagement: {
        overallScore: engagementMetrics.overallScore,
        recencyScore: engagementMetrics.recencyScore,
        frequencyScore: engagementMetrics.frequencyScore,
        topChannels: engagementMetrics.topChannels.slice(0, 5).map(c => ({
          channel: c.channel,
          count: c.count
        }))
      },
      ltv: {
        lifetimeValue: ltvMetrics.lifetimeValue,
        totalRevenue: ltvMetrics.totalRevenue,
        averageOrderValue: ltvMetrics.averageOrderValue,
        totalOrders: ltvMetrics.totalOrders,
        predicted12MonthValue: ltvMetrics.predicted12MonthValue
      },
      churnRisk: {
        riskScore: churnRiskMetrics.riskScore,
        riskLevel: churnRiskMetrics.riskLevel,
        daysSinceLastActivity: churnRiskMetrics.daysSinceLastActivity
      },
      velocity: {
        currentPhase: velocityMetrics.currentPhase,
        velocityScore: velocityMetrics.velocityScore
      }
    };
  }

  /**
   * Generate pattern summary
   */
  private async generatePatternSummary(customerId: string): Promise<PatternSummary> {
    const [patterns, churnSignals, upsellOpportunities] = await Promise.all([
      patternDetection.getPatterns(customerId),
      patternDetection.detectChurnSignals(customerId),
      patternDetection.detectUpsellOpportunities(customerId)
    ]);

    return {
      patterns: patterns.map(p => ({
        patternType: p.patternType,
        confidence: p.confidence,
        description: p.description
      })),
      churnSignals: {
        riskLevel: churnSignals.riskLevel,
        score: churnSignals.score,
        signals: churnSignals.signals.filter(s => s.detected).map(s => s.description)
      },
      upsellOpportunities: upsellOpportunities.slice(0, 3).map(o => ({
        type: o.type,
        targetCompany: o.targetCompany,
        reason: o.reason
      }))
    };
  }

  /**
   * Export as JSON
   */
  private exportAsJSON(report: JourneyReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export as CSV
   */
  private exportAsCSV(report: JourneyReport): string {
    const lines: string[] = [];

    // Header
    lines.push('Customer Journey Export');
    lines.push(`Customer ID,${report.customerId}`);
    lines.push(`Generated At,${report.generatedAt.toISOString()}`);
    lines.push('');

    // Summary
    lines.push('=== SUMMARY ===');
    const summary = report.summary;
    lines.push(`Journey Start,${summary.journeyStartDate.toISOString()}`);
    lines.push(`Last Activity,${summary.lastActivityDate.toISOString()}`);
    lines.push(`Duration (Days),${summary.journeyDurationDays}`);
    lines.push(`Current Phase,${summary.currentPhase}`);
    lines.push(`Health Score,${summary.healthScore}`);
    lines.push(`Total Companies,${summary.totalCompanies}`);
    lines.push(`Total Events,${summary.totalEvents}`);
    lines.push(`Total Revenue,${summary.totalRevenue}`);
    lines.push(`Lifetime Value,${summary.lifetimeValue}`);
    lines.push(`Engagement Score,${summary.engagementScore}`);
    lines.push(`Churn Risk,${summary.churnRisk}`);
    lines.push('');

    // Companies
    lines.push('=== COMPANIES ===');
    lines.push('Company ID,Company Name,First Interaction,Last Interaction,Interactions,Revenue,Orders,AOV,Preferred Channel,Engagement');
    for (const company of summary.companies) {
      lines.push([
        company.companyId,
        company.companyName,
        company.firstInteraction.toISOString(),
        company.lastInteraction.toISOString(),
        company.totalInteractions.toString(),
        company.revenue.toString(),
        company.orders.toString(),
        company.averageOrderValue.toString(),
        company.preferredChannel,
        company.engagementScore.toString()
      ].join(','));
    }
    lines.push('');

    // Analytics
    if (report.analytics) {
      lines.push('=== ANALYTICS ===');
      lines.push(`Engagement Score,${report.analytics.engagement.overallScore}`);
      lines.push(`Recency Score,${report.analytics.engagement.recencyScore}`);
      lines.push(`Frequency Score,${report.analytics.engagement.frequencyScore}`);
      lines.push(`Lifetime Value,${report.analytics.ltv.lifetimeValue}`);
      lines.push(`Total Revenue,${report.analytics.ltv.totalRevenue}`);
      lines.push(`Average Order Value,${report.analytics.ltv.averageOrderValue}`);
      lines.push(`Total Orders,${report.analytics.ltv.totalOrders}`);
      lines.push(`Churn Risk Score,${report.analytics.churnRisk.riskScore}`);
      lines.push(`Churn Risk Level,${report.analytics.churnRisk.riskLevel}`);
      lines.push(`Days Since Activity,${report.analytics.churnRisk.daysSinceLastActivity}`);
      lines.push(`Velocity Score,${report.analytics.velocity.velocityScore}`);
      lines.push('');
    }

    // Milestones
    if (report.milestones && report.milestones.length > 0) {
      lines.push('=== MILESTONES ===');
      lines.push('Type,Company,Achieved At,Description,Value');
      for (const milestone of report.milestones) {
        lines.push([
          milestone.milestoneType,
          milestone.companyName,
          milestone.achievedAt.toISOString(),
          `"${milestone.description}"`,
          milestone.value?.toString() || ''
        ].join(','));
      }
      lines.push('');
    }

    // Events (limited)
    if (report.events && report.events.length > 0) {
      lines.push('=== RECENT EVENTS ===');
      lines.push('Timestamp,Company,Event Type,Channel,Properties');
      for (const event of report.events.slice(0, 100)) {
        lines.push([
          event.timestamp.toISOString(),
          event.companyName,
          event.eventType,
          event.channel,
          `"${JSON.stringify(event.properties || {}).replace(/"/g, '""')}"`
        ].join(','));
      }
    }

    return lines.join('\n');
  }

  /**
   * Export as HTML
   */
  private exportAsHTML(report: JourneyReport): string {
    const summary = report.summary;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Journey Report - ${report.customerId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .card { background: white; margin-bottom: 20px; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .card-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #eee; font-weight: 600; color: #333; }
    .card-body { padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .stat { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .stat-value { font-size: 32px; font-weight: 700; color: #667eea; }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; text-transform: uppercase; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    .table th { background: #f8f9fa; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .phase-badge { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .score-ring { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; margin: 0 auto; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #333; }
    .tag { display: inline-block; padding: 4px 10px; background: #e9ecef; border-radius: 4px; font-size: 12px; margin: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Customer Journey Report</h1>
      <p>Customer: ${summary.customerName || summary.customerId} | Generated: ${report.generatedAt.toLocaleString()}</p>
    </div>

    <div class="card">
      <div class="card-header">Journey Overview</div>
      <div class="card-body">
        <div class="grid">
          <div class="stat">
            <div class="stat-value">${summary.totalEvents}</div>
            <div class="stat-label">Total Events</div>
          </div>
          <div class="stat">
            <div class="stat-value">${summary.totalCompanies}</div>
            <div class="stat-label">Companies</div>
          </div>
          <div class="stat">
            <div class="stat-value">₹${(summary.totalRevenue / 1000).toFixed(1)}K</div>
            <div class="stat-label">Revenue</div>
          </div>
          <div class="stat">
            <div class="stat-value">${summary.journeyDurationDays}</div>
            <div class="stat-label">Days Active</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Health & Engagement</div>
      <div class="card-body">
        <div class="grid">
          <div class="stat">
            <div class="score-ring" style="background: ${this.getScoreColor(summary.healthScore)}20; color: ${this.getScoreColor(summary.healthScore)}">
              ${summary.healthScore}
            </div>
            <div class="stat-label">Health Score</div>
          </div>
          <div class="stat">
            <div class="score-ring" style="background: ${this.getScoreColor(summary.engagementScore)}20; color: ${this.getScoreColor(summary.engagementScore)}">
              ${summary.engagementScore}
            </div>
            <div class="stat-label">Engagement</div>
          </div>
          <div class="stat">
            <div class="score-ring" style="background: ${this.getChurnColor(summary.churnRisk)}20; color: ${this.getChurnColor(summary.churnRisk)}">
              ${Math.round(summary.churnRisk * 100)}%
            </div>
            <div class="stat-label">Churn Risk</div>
          </div>
          <div class="stat">
            <span class="badge phase-badge">${summary.currentPhase}</span>
            <div class="stat-label">Current Phase</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Company Engagements</div>
      <div class="card-body">
        <table class="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Interactions</th>
              <th>Revenue</th>
              <th>Orders</th>
              <th>Engagement</th>
            </tr>
          </thead>
          <tbody>
            ${summary.companies.map(c => `
              <tr>
                <td>${c.companyName}</td>
                <td>${c.totalInteractions}</td>
                <td>₹${c.revenue.toLocaleString()}</td>
                <td>${c.orders}</td>
                <td><span class="badge ${this.getEngagementBadge(c.engagementScore)}">${c.engagementScore}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${report.analytics ? `
    <div class="card">
      <div class="card-header">Analytics Summary</div>
      <div class="card-body">
        <div class="grid">
          <div class="stat">
            <div class="stat-value">₹${(report.analytics.ltv.lifetimeValue / 1000).toFixed(1)}K</div>
            <div class="stat-label">LTV</div>
          </div>
          <div class="stat">
            <div class="stat-value">₹${report.analytics.ltv.averageOrderValue.toFixed(0)}</div>
            <div class="stat-label">Avg Order</div>
          </div>
          <div class="stat">
            <div class="stat-value">${report.analytics.ltv.totalOrders}</div>
            <div class="stat-label">Total Orders</div>
          </div>
          <div class="stat">
            <div class="stat-value">${report.analytics.velocity.velocityScore}</div>
            <div class="stat-label">Velocity Score</div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    ${report.milestones && report.milestones.length > 0 ? `
    <div class="card">
      <div class="card-header">Key Milestones</div>
      <div class="card-body">
        ${report.milestones.map(m => `
          <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <strong>${m.milestoneType.replace(/_/g, ' ')}</strong>
            <span style="color: #666; margin-left: 10px;">${m.companyName}</span>
            <span style="color: #999; font-size: 12px; float: right;">${new Date(m.achievedAt).toLocaleDateString()}</span>
            <p style="color: #666; font-size: 14px; margin-top: 5px;">${m.description}</p>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${report.patterns && report.patterns.patterns.length > 0 ? `
    <div class="card">
      <div class="card-header">Detected Patterns</div>
      <div class="card-body">
        ${report.patterns.patterns.map(p => `
          <span class="tag">${p.patternType.replace(/_/g, ' ')} (${Math.round(p.confidence * 100)}%)</span>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated by HOJAI AI - Cross-Company Journey Service</p>
      <p>Report ID: ${report.customerId}-${Date.now()}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return html;
  }

  /**
   * Get color for score
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#17a2b8';
    if (score >= 40) return '#ffc107';
    return '#dc3545';
  }

  /**
   * Get color for churn risk
   */
  private getChurnColor(risk: number): string {
    if (risk < 0.2) return '#28a745';
    if (risk < 0.4) return '#17a2b8';
    if (risk < 0.6) return '#ffc107';
    if (risk < 0.8) return '#fd7e14';
    return '#dc3545';
  }

  /**
   * Get engagement badge class
   */
  private getEngagementBadge(score: number): string {
    if (score >= 70) return 'badge-success';
    if (score >= 40) return 'badge-warning';
    return 'badge-danger';
  }

  /**
   * Share journey with an agent
   */
  async shareJourneyWithAgent(
    customerId: string,
    agentId: string,
    accessLevel: 'summary' | 'full' | 'events_only' = 'summary',
    expiresInHours: number = 24
  ): Promise<SharedAccess> {
    logger.info(`Sharing journey ${customerId} with agent ${agentId}`);

    const accessId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate limited report based on access level
    const sharedData: Partial<JourneyReport> = {};
    const report = await this.generateJourneyReport(customerId);

    if (accessLevel === 'summary') {
      sharedData.customerId = report.customerId;
      sharedData.generatedAt = report.generatedAt;
      sharedData.summary = report.summary;
    } else if (accessLevel === 'events_only') {
      sharedData.customerId = report.customerId;
      sharedData.generatedAt = report.generatedAt;
      sharedData.events = report.events;
    } else {
      sharedData = report;
    }

    const access: SharedAccess = {
      accessId,
      customerId,
      agentId,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      accessLevel,
      sharedData
    };

    this.sharedAccessStore.set(accessId, access);

    // In production, would store in database and send notification
    logger.info(`Journey access granted: ${accessId}`);

    return access;
  }

  /**
   * Get shared access
   */
  async getSharedAccess(accessId: string): Promise<SharedAccess | null> {
    const access = this.sharedAccessStore.get(accessId);

    if (!access) {
      return null;
    }

    // Check expiration
    if (new Date() > access.expiresAt) {
      this.sharedAccessStore.delete(accessId);
      return null;
    }

    return access;
  }

  /**
   * Revoke shared access
   */
  async revokeSharedAccess(accessId: string): Promise<boolean> {
    const deleted = this.sharedAccessStore.delete(accessId);
    if (deleted) {
      logger.info(`Revoked access: ${accessId}`);
    }
    return deleted;
  }

  /**
   * Generate AI summary of the journey
   */
  async generateJourneySummary(customerId: string): Promise<string> {
    const journey = await UnifiedJourney.findOne({ customerId });

    if (!journey) {
      return `No journey data found for customer: ${customerId}`;
    }

    const [analytics, patterns, milestones] = await Promise.all([
      journeyAnalytics.getAnalyticsSummary(customerId),
      patternDetection.getPatterns(customerId),
      JourneyMilestone.find({ customerId }).sort({ achievedAt: -1 }).limit(5).lean()
    ]);

    // Build summary narrative
    const parts: string[] = [];

    // Overview
    parts.push(
      `${journey.customerName || 'Customer'} has been active for ${journey.journeyDurationDays || Math.ceil((Date.now() - journey.journeyStartDate.getTime()) / (1000 * 60 * 60 * 24))} days across ${journey.totalCompanies} RTNM companies.`
    );

    // Engagement
    parts.push(
      `Current engagement score is ${analytics.engagement.overallScore}/100 with a ${analytics.churnRisk.riskLevel} churn risk.`
    );

    // Revenue
    if (journey.totalRevenue > 0) {
      parts.push(
        `Total revenue generated is ₹${journey.totalRevenue.toLocaleString()} with an average order value of ₹${analytics.ltv.averageOrderValue.toFixed(0)}.`
      );
    }

    // Phase
    parts.push(
      `The customer is currently in the "${journey.currentPhase.replace(/_/g, ' ')}" phase of their journey.`
    );

    // Top companies
    if (journey.companies.length > 0) {
      const topCompanies = journey.companies
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 3)
        .map(c => c.companyName);
      parts.push(
        `Most engaged companies: ${topCompanies.join(', ')}.`
      );
    }

    // Patterns
    if (patterns.length > 0) {
      const patternTypes = [...new Set(patterns.map(p => p.patternType.replace(/_/g, ' ')))];
      parts.push(
        `Behavior patterns detected: ${patternTypes.slice(0, 3).join(', ')}.`
      );
    }

    // Milestones
    if (milestones.length > 0) {
      const recentMilestone = milestones[0];
      parts.push(
        `Latest milestone: ${recentMilestone.description.toLowerCase()} on ${new Date(recentMilestone.achievedAt).toLocaleDateString()}.`
      );
    }

    // LTV prediction
    if (analytics.ltv.predicted12MonthValue > 0) {
      parts.push(
        `Predicted 12-month value: ₹${analytics.ltv.predicted12MonthValue.toLocaleString()}.`
      );
    }

    return parts.join(' ');
  }
}

export const exportService = new ExportService();
