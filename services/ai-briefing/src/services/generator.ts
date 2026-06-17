import { v4 as uuidv4 } from 'uuid';
import { BriefingModel } from '../models/Briefing';
import { RiskAnalyzer } from './riskAnalyzer';
import { OpportunityFinder } from './opportunityFinder';
import { RecommendationEngine } from './recommendationEngine';
import { Briefing, RiskAnalysis, OpportunityAnalysis, Recommendation } from '../types';

export class BriefingGenerator {
  private riskAnalyzer: RiskAnalyzer;
  private opportunityFinder: OpportunityFinder;
  private recommendationEngine: RecommendationEngine;

  constructor() {
    this.riskAnalyzer = new RiskAnalyzer();
    this.opportunityFinder = new OpportunityFinder();
    this.recommendationEngine = new RecommendationEngine();
  }

  async generate(
    tenantId: string,
    briefingId: string,
    date: Date
  ): Promise<Partial<Briefing>> {
    const startTime = Date.now();
    const dataSources: string[] = [];

    try {
      console.log(`Starting briefing generation for tenant ${tenantId}, date ${date.toISOString()}`);

      // Generate risk analysis
      const riskAnalysis = await this.riskAnalyzer.analyze(tenantId, date);
      dataSources.push(...riskAnalysis.dataSources);

      // Find opportunities
      const opportunities = await this.opportunityFinder.find(tenantId, date);
      dataSources.push(...opportunities.dataSources);

      // Generate recommendations
      const recommendations = await this.recommendationEngine.generate(
        tenantId,
        riskAnalysis,
        opportunities
      );

      // Generate summary
      const summary = this.generateSummary(riskAnalysis, opportunities, recommendations);

      // Fetch pending approvals (mock for now)
      const pendingApprovals = await this.fetchPendingApprovals(tenantId);

      // Get active alerts
      const alerts = await this.getActiveAlerts(tenantId);

      // Generate metrics
      const metrics = await this.generateMetrics(tenantId, date);

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(riskAnalysis, opportunities, recommendations);

      const briefingData: Partial<Briefing> = {
        summary,
        riskAnalysis,
        opportunities,
        recommendations,
        pendingApprovals,
        alerts,
        metrics,
        metadata: {
          dataSources: [...new Set(dataSources)],
          confidence,
          processingTime,
          version: '1.0.0'
        }
      };

      // Update the briefing record
      await BriefingModel.findOneAndUpdate(
        { id: briefingId },
        briefingData
      );

      console.log(`Briefing ${briefingId} generated successfully in ${processingTime}ms`);

      return briefingData;
    } catch (error) {
      console.error(`Error generating briefing ${briefingId}:`, error);
      throw error;
    }
  }

  private generateSummary(
    riskAnalysis: RiskAnalysis,
    opportunities: OpportunityAnalysis,
    recommendations: Recommendation[]
  ): Briefing['summary'] {
    const headline = this.generateHeadline(riskAnalysis, opportunities);
    const keyHighlights = this.generateKeyHighlights(riskAnalysis, opportunities, recommendations);
    const executiveSummary = this.generateExecutiveSummary(
      riskAnalysis,
      opportunities,
      recommendations
    );
    const quickWins = this.generateQuickWins(recommendations);

    return {
      headline,
      keyHighlights,
      executiveSummary,
      quickWins
    };
  }

  private generateHeadline(
    riskAnalysis: RiskAnalysis,
    opportunities: OpportunityAnalysis
  ): string {
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const riskLevel = riskAnalysis.riskLevel;
    const topOpportunity = opportunities.topPriority[0];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      return `${date}: Priority attention required - ${riskAnalysis.risks.length} active risks identified`;
    } else if (topOpportunity) {
      return `${date}: ${opportunities.totalOpportunities} opportunities identified, led by ${topOpportunity.title}`;
    } else {
      return `${date}: Daily Business Briefing - Steady operations with potential for growth`;
    }
  }

  private generateKeyHighlights(
    riskAnalysis: RiskAnalysis,
    opportunities: OpportunityAnalysis,
    recommendations: Recommendation[]
  ): string[] {
    const highlights: string[] = [];

    // Risk highlights
    if (riskAnalysis.riskLevel === 'critical' || riskAnalysis.riskLevel === 'high') {
      highlights.push(`${riskAnalysis.risks.length} active risks require attention`);
      if (riskAnalysis.trendingRisks.length > 0) {
        highlights.push(`${riskAnalysis.trendingRisks.length} risks showing increasing trend`);
      }
    } else {
      highlights.push('Risk levels within acceptable parameters');
    }

    // Opportunity highlights
    if (opportunities.totalOpportunities > 0) {
      highlights.push(`${opportunities.totalOpportunities} business opportunities identified`);
      if (opportunities.topPriority.length > 0) {
        const topValue = opportunities.topPriority[0].potentialValue;
        highlights.push(`Top opportunity valued at $${this.formatNumber(topValue)}`);
      }
    }

    // Recommendation highlights
    const urgentRecs = recommendations.filter(r => r.priority === 'urgent' || r.priority === 'high');
    if (urgentRecs.length > 0) {
      highlights.push(`${urgentRecs.length} high-priority actions recommended`);
    }

    // Add strategic insight
    if (riskAnalysis.overallRiskScore < 30 && opportunities.totalOpportunities > 3) {
      highlights.push('Favorable conditions for growth initiatives');
    }

    return highlights;
  }

  private generateExecutiveSummary(
    riskAnalysis: RiskAnalysis,
    opportunities: OpportunityAnalysis,
    recommendations: Recommendation[]
  ): string {
    const parts: string[] = [];

    // Risk overview
    if (riskAnalysis.riskLevel === 'critical') {
      parts.push('CRITICAL ALERT: Multiple high-severity risks require immediate executive attention.');
    } else if (riskAnalysis.riskLevel === 'high') {
      parts.push('Elevated risk profile detected. Recommend reviewing key risk indicators.');
    } else {
      parts.push('Overall risk profile remains stable and manageable.');
    }

    // Opportunity overview
    if (opportunities.totalOpportunities > 0) {
      const totalValue = opportunities.opportunities.reduce(
        (sum, o) => sum + o.potentialValue,
        0
      );
      parts.push(
        `${opportunities.totalOpportunities} opportunities identified with combined potential value of $${this.formatNumber(totalValue)}.`
      );
    }

    // Top recommendation
    if (recommendations.length > 0) {
      const topRec = recommendations[0];
      parts.push(
        `Primary recommendation: ${topRec.title}. Expected impact: ${topRec.expectedImpact}.`
      );
    }

    return parts.join(' ');
  }

  private generateQuickWins(recommendations: Recommendation[]): Briefing['summary']['quickWins'] {
    return recommendations
      .filter(r => r.effort === 'low' && (r.priority === 'high' || r.priority === 'medium'))
      .slice(0, 3)
      .map(r => ({
        title: r.title,
        impact: r.expectedImpact,
        effort: r.effort,
        action: r.description.split('.')[0] + '.'
      }));
  }

  private async fetchPendingApprovals(tenantId: string): Promise<Briefing['pendingApprovals']> {
    // Mock pending approvals - in production, fetch from approval service
    const mockApprovals: Briefing['pendingApprovals'] = [
      {
        id: uuidv4(),
        type: 'budget',
        title: 'Marketing Campaign Approval',
        requester: 'Marketing Team',
        requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        amount: 50000,
        description: 'Q2 digital marketing campaign for customer acquisition',
        status: 'pending',
        history: [
          {
            action: 'submitted',
            actor: 'Marketing Team',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        id: uuidv4(),
        type: 'hiring',
        title: 'Engineering Team Expansion',
        requester: 'Engineering Lead',
        requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        amount: 120000,
        description: 'Hiring 3 senior engineers for product development',
        status: 'pending',
        history: [
          {
            action: 'submitted',
            actor: 'Engineering Lead',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          }
        ]
      }
    ];

    return mockApprovals;
  }

  private async getActiveAlerts(tenantId: string): Promise<Briefing['alerts']> {
    // Mock alerts - in production, query from AlertModel
    return [{
      total: 5,
      critical: 1,
      warnings: 2,
      byCategory: {
        customer: 2,
        product: 1,
        financial: 2
      }
    }];
  }

  private async generateMetrics(
    tenantId: string,
    date: Date
  ): Promise<Briefing['metrics']> {
    // Mock metrics - in production, aggregate from various services
    return {
      revenue: {
        value: 1250000,
        change: 8.5,
        trend: 'up',
        target: 1300000
      },
      customers: {
        value: 4580,
        change: 3.2,
        trend: 'up'
      },
      operations: {
        value: 94,
        change: 1.5,
        trend: 'up',
        target: 95
      },
      market: {
        value: 52,
        change: -2.3,
        trend: 'down'
      }
    };
  }

  private calculateConfidence(
    riskAnalysis: RiskAnalysis,
    opportunities: OpportunityAnalysis,
    recommendations: Recommendation[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data quality
    if (riskAnalysis.risks.length > 0) confidence += 0.1;
    if (opportunities.opportunities.length > 0) confidence += 0.1;
    if (recommendations.length > 0) confidence += 0.1;

    // Increase confidence based on opportunity confidence
    if (opportunities.opportunities.length > 0) {
      const avgConfidence = opportunities.opportunities.reduce(
        (sum, o) => sum + o.confidence,
        0
      ) / opportunities.opportunities.length;
      confidence += avgConfidence * 0.2;
    }

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
