import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  Opportunity,
  OpportunityStatus,
  OpportunityAssessment,
} from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// ============================================================================
// Opportunities Service - Opportunity Identification and Tracking
// ============================================================================

export class OpportunitiesService {
  private opportunities: Map<string, Opportunity> = new Map();

  constructor() {
    // Initialize with sample opportunities
    this.initializeSampleOpportunities();
  }

  /**
   * Get all opportunities for a tenant
   */
  async getOpportunities(
    tenantId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      category?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ data: Opportunity[]; total: number; assessment: OpportunityAssessment }> {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      category,
      sortBy = 'probability',
      sortOrder = 'desc',
    } = options || {};

    let opportunities = Array.from(this.opportunities.values())
      .filter(o => o.tenantId === tenantId);

    if (status) {
      opportunities = opportunities.filter(o => o.status === status);
    }

    if (priority) {
      opportunities = opportunities.filter(o => o.priority === priority);
    }

    if (category) {
      opportunities = opportunities.filter(o => o.category === category);
    }

    // Sort
    opportunities.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortBy) {
        case 'probability':
          aVal = a.probability;
          bVal = b.probability;
          break;
        case 'value':
          aVal = a.estimatedValue || 0;
          bVal = b.estimatedValue || 0;
          break;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        case 'identifiedAt':
          aVal = a.identifiedAt.getTime();
          bVal = b.identifiedAt.getTime();
          break;
        default:
          aVal = a.probability;
          bVal = b.probability;
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const total = opportunities.length;
    const paginatedOpportunities = opportunities.slice((page - 1) * limit, page * limit);
    const assessment = await this.getAssessment(tenantId);

    return {
      data: paginatedOpportunities,
      total,
      assessment,
    };
  }

  /**
   * Get opportunity assessment summary
   */
  async getAssessment(tenantId: string): Promise<OpportunityAssessment> {
    const opportunities = Array.from(this.opportunities.values())
      .filter(o => o.tenantId === tenantId);

    const byStatus: Record<OpportunityStatus, number> = {
      [OpportunityStatus.IDENTIFIED]: 0,
      [OpportunityStatus.EVALUATING]: 0,
      [OpportunityStatus.APPROVED]: 0,
      [OpportunityStatus.IMPLEMENTING]: 0,
      [OpportunityStatus.COMPLETED]: 0,
      [OpportunityStatus.REJECTED]: 0,
    };

    const byCategory: Record<string, number> = {};
    let pipelineValue = 0;
    let completedValue = 0;

    for (const opp of opportunities) {
      byStatus[opp.status]++;
      byCategory[opp.category] = (byCategory[opp.category] || 0) + 1;

      if (opp.status !== OpportunityStatus.REJECTED && opp.estimatedValue) {
        pipelineValue += opp.estimatedValue * (opp.probability / 100);
      }

      if (opp.status === OpportunityStatus.COMPLETED && opp.estimatedValue) {
        completedValue += opp.estimatedValue;
      }
    }

    const topOpportunities = opportunities
      .filter(o => o.status !== OpportunityStatus.REJECTED && o.status !== OpportunityStatus.COMPLETED)
      .sort((a, b) => (b.estimatedValue || 0) * b.probability - (a.estimatedValue || 0) * a.probability)
      .slice(0, 5);

    const completed = opportunities.filter(o => o.status === OpportunityStatus.COMPLETED).length;
    const conversionRate = opportunities.length > 0
      ? Math.round((completed / opportunities.length) * 100)
      : 0;

    return {
      totalOpportunities: opportunities.length,
      pipelineValue: Math.round(pipelineValue),
      byStatus,
      topOpportunities,
      byCategory,
      expectedROI: completedValue > 0 ? Math.round((completedValue / pipelineValue) * 100) : 0,
      conversionRate,
    };
  }

  /**
   * Get top opportunities
   */
  async getTopOpportunities(tenantId: string, limit: number = 10, sortBy: string = 'value'): Promise<Opportunity[]> {
    return Array.from(this.opportunities.values())
      .filter(o => o.tenantId === tenantId && o.status !== OpportunityStatus.REJECTED)
      .sort((a, b) => {
        if (sortBy === 'value') {
          return (b.estimatedValue || 0) - (a.estimatedValue || 0);
        }
        return b.probability - a.probability;
      })
      .slice(0, limit);
  }

  /**
   * Get opportunities grouped by status
   */
  async getOpportunitiesByStatus(tenantId: string): Promise<Record<OpportunityStatus, Opportunity[]>> {
    const opportunities = Array.from(this.opportunities.values()).filter(o => o.tenantId === tenantId);

    const byStatus: Record<OpportunityStatus, Opportunity[]> = {
      [OpportunityStatus.IDENTIFIED]: [],
      [OpportunityStatus.EVALUATING]: [],
      [OpportunityStatus.APPROVED]: [],
      [OpportunityStatus.IMPLEMENTING]: [],
      [OpportunityStatus.COMPLETED]: [],
      [OpportunityStatus.REJECTED]: [],
    };

    for (const opp of opportunities) {
      byStatus[opp.status].push(opp);
    }

    return byStatus;
  }

  /**
   * Get opportunities grouped by category
   */
  async getOpportunitiesByCategory(tenantId: string): Promise<Record<string, Opportunity[]>> {
    const opportunities = Array.from(this.opportunities.values()).filter(o => o.tenantId === tenantId);

    const byCategory: Record<string, Opportunity[]> = {};

    for (const opp of opportunities) {
      if (!byCategory[opp.category]) {
        byCategory[opp.category] = [];
      }
      byCategory[opp.category].push(opp);
    }

    return byCategory;
  }

  /**
   * Get opportunity pipeline
   */
  async getPipeline(tenantId: string): Promise<{
    stages: { name: string; count: number; value: number }[];
    total: number;
    totalValue: number;
  }> {
    const opportunities = Array.from(this.opportunities.values())
      .filter(o => o.tenantId === tenantId && o.status !== OpportunityStatus.REJECTED);

    const stages = [
      OpportunityStatus.IDENTIFIED,
      OpportunityStatus.EVALUATING,
      OpportunityStatus.APPROVED,
      OpportunityStatus.IMPLEMENTING,
    ];

    const pipeline = stages.map(status => {
      const stageOpps = opportunities.filter(o => o.status === status);
      return {
        name: status,
        count: stageOpps.length,
        value: stageOpps.reduce((sum, o) => sum + (o.estimatedValue || 0), 0),
      };
    });

    return {
      stages: pipeline,
      total: opportunities.length,
      totalValue: opportunities.reduce((sum, o) => sum + (o.estimatedValue || 0), 0),
    };
  }

  /**
   * Get a specific opportunity
   */
  async getOpportunity(tenantId: string, opportunityId: string): Promise<Opportunity | null> {
    const opportunity = this.opportunities.get(opportunityId);
    if (opportunity && opportunity.tenantId === tenantId) {
      return opportunity;
    }
    return null;
  }

  /**
   * Create a new opportunity
   */
  async createOpportunity(tenantId: string, data: Partial<Opportunity>): Promise<Opportunity> {
    const opportunity: Opportunity = {
      id: uuidv4(),
      tenantId,
      title: data.title || 'Untitled Opportunity',
      description: data.description || '',
      type: data.type || 'strategic',
      category: data.category || 'market_expansion',
      status: OpportunityStatus.IDENTIFIED,
      estimatedValue: data.estimatedValue,
      probability: data.probability || 50,
      effort: data.effort,
      timeline: data.timeline,
      priority: data.priority || 'medium',
      owner: data.owner,
      expectedOutcome: data.expectedOutcome,
      identifiedAt: new Date(),
      updatedAt: new Date(),
      tags: data.tags,
    };

    this.opportunities.set(opportunity.id, opportunity);
    logger.info('Opportunity created', { tenantId, opportunityId: opportunity.id });

    return opportunity;
  }

  /**
   * Update an opportunity
   */
  async updateOpportunity(
    tenantId: string,
    opportunityId: string,
    data: Partial<Opportunity>
  ): Promise<Opportunity | null> {
    const opportunity = this.opportunities.get(opportunityId);

    if (!opportunity || opportunity.tenantId !== tenantId) {
      return null;
    }

    Object.assign(opportunity, data);
    opportunity.updatedAt = new Date();

    return opportunity;
  }

  /**
   * Update opportunity status
   */
  async updateStatus(
    tenantId: string,
    opportunityId: string,
    status: OpportunityStatus
  ): Promise<Opportunity | null> {
    const opportunity = this.opportunities.get(opportunityId);

    if (!opportunity || opportunity.tenantId !== tenantId) {
      return null;
    }

    opportunity.status = status;
    opportunity.updatedAt = new Date();

    if (status === OpportunityStatus.COMPLETED) {
      opportunity.completedAt = new Date();
    }

    return opportunity;
  }

  /**
   * Evaluate an opportunity
   */
  async evaluateOpportunity(
    tenantId: string,
    opportunityId: string,
    evaluation: {
      estimatedValue?: number;
      probability?: number;
      effort?: number;
      timeline?: string;
    }
  ): Promise<Opportunity | null> {
    const opportunity = this.opportunities.get(opportunityId);

    if (!opportunity || opportunity.tenantId !== tenantId) {
      return null;
    }

    Object.assign(opportunity, evaluation);
    opportunity.status = OpportunityStatus.EVALUATING;
    opportunity.updatedAt = new Date();

    return opportunity;
  }

  /**
   * Delete an opportunity
   */
  async deleteOpportunity(tenantId: string, opportunityId: string): Promise<boolean> {
    const opportunity = this.opportunities.get(opportunityId);

    if (!opportunity || opportunity.tenantId !== tenantId) {
      return false;
    }

    this.opportunities.delete(opportunityId);
    return true;
  }

  /**
   * Approve an opportunity
   */
  async approveOpportunity(tenantId: string, opportunityId: string): Promise<Opportunity | null> {
    return this.updateStatus(tenantId, opportunityId, OpportunityStatus.APPROVED);
  }

  /**
   * Reject an opportunity
   */
  async rejectOpportunity(tenantId: string, opportunityId: string, reason?: string): Promise<Opportunity | null> {
    const opportunity = this.opportunities.get(opportunityId);

    if (!opportunity || opportunity.tenantId !== tenantId) {
      return null;
    }

    opportunity.status = OpportunityStatus.REJECTED;
    opportunity.updatedAt = new Date();
    opportunity.tags = [...(opportunity.tags || []), `rejected: ${reason || 'no reason'}`];

    return opportunity;
  }

  /**
   * Start implementation
   */
  async startImplementation(tenantId: string, opportunityId: string): Promise<Opportunity | null> {
    return this.updateStatus(tenantId, opportunityId, OpportunityStatus.IMPLEMENTING);
  }

  /**
   * Complete an opportunity
   */
  async completeOpportunity(
    tenantId: string,
    opportunityId: string,
    actualOutcome?: string
  ): Promise<Opportunity | null> {
    const opportunity = this.opportunities.get(opportunityId);

    if (!opportunity || opportunity.tenantId !== tenantId) {
      return null;
    }

    opportunity.status = OpportunityStatus.COMPLETED;
    opportunity.actualOutcome = actualOutcome;
    opportunity.completedAt = new Date();
    opportunity.updatedAt = new Date();

    return opportunity;
  }

  /**
   * Get ROI analysis
   */
  async getROIAnalysis(tenantId: string): Promise<{
    totalInvestment: number;
    totalReturn: number;
    roi: number;
    byCategory: { category: string; investment: number; return: number; roi: number }[];
    recommendations: string[];
  }> {
    const opportunities = Array.from(this.opportunities.values()).filter(o => o.tenantId === tenantId);

    let totalInvestment = 0;
    let totalReturn = 0;
    const byCategory: Record<string, { investment: number; return: number }> = {};

    for (const opp of opportunities) {
      const investment = (opp.effort || 0) * 100; // Estimate cost based on effort
      const expectedReturn = (opp.estimatedValue || 0) * (opp.probability / 100);

      totalInvestment += investment;

      if (opp.status === OpportunityStatus.COMPLETED) {
        totalReturn += opp.estimatedValue || 0;
      } else {
        totalReturn += expectedReturn;
      }

      if (!byCategory[opp.category]) {
        byCategory[opp.category] = { investment: 0, return: 0 };
      }
      byCategory[opp.category].investment += investment;
      byCategory[opp.category].return += expectedReturn;
    }

    const roi = totalInvestment > 0 ? Math.round(((totalReturn - totalInvestment) / totalInvestment) * 100) : 0;

    const categoryAnalysis = Object.entries(byCategory).map(([category, data]) => ({
      category,
      investment: data.investment,
      return: Math.round(data.return),
      roi: data.investment > 0 ? Math.round(((data.return - data.investment) / data.investment) * 100) : 0,
    }));

    const recommendations: string[] = [];
    const topRoiCategory = categoryAnalysis.sort((a, b) => b.roi - a.roi)[0];
    if (topRoiCategory) {
      recommendations.push(`Focus on ${topRoiCategory.category} opportunities - highest ROI at ${topRoiCategory.roi}%`);
    }

    if (roi < 100) {
      recommendations.push('Overall ROI below target - review opportunity evaluation criteria');
    }

    return {
      totalInvestment: Math.round(totalInvestment),
      totalReturn: Math.round(totalReturn),
      roi,
      byCategory: categoryAnalysis,
      recommendations,
    };
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private initializeSampleOpportunities(): void {
    const sampleOpportunities: Opportunity[] = [
      {
        id: 'opp-1',
        tenantId: 'default',
        title: 'Expand to European Markets',
        description: 'Enter the EU market with localized product offerings and partnerships.',
        type: 'expansion',
        category: 'market_expansion',
        status: OpportunityStatus.APPROVED,
        estimatedValue: 2500000,
        probability: 75,
        effort: 480,
        timeline: '6-9 months',
        priority: 'high',
        owner: 'CEO',
        expectedOutcome: 'Increase revenue by 20% within 18 months',
        identifiedAt: new Date('2026-01-15'),
        updatedAt: new Date(),
        tags: ['expansion', 'europe', 'strategic'],
      },
      {
        id: 'opp-2',
        tenantId: 'default',
        title: 'AI-Powered Product Recommendations',
        description: 'Implement ML-based recommendation engine to increase conversion.',
        type: 'technology',
        category: 'digital_transformation',
        status: OpportunityStatus.IMPLEMENTING,
        estimatedValue: 1800000,
        probability: 85,
        effort: 320,
        timeline: '3-4 months',
        priority: 'critical',
        owner: 'CTO',
        expectedOutcome: '15% increase in average order value',
        identifiedAt: new Date('2026-02-01'),
        updatedAt: new Date(),
        tags: ['ai', 'ml', 'product'],
      },
      {
        id: 'opp-3',
        tenantId: 'default',
        title: 'Strategic Partnership with TechGiant',
        description: 'Partner with TechGiant for co-marketing and distribution.',
        type: 'partnership',
        category: 'partnership',
        status: OpportunityStatus.EVALUATING,
        estimatedValue: 1200000,
        probability: 60,
        effort: 160,
        timeline: '2-3 months',
        priority: 'high',
        owner: 'CMO',
        expectedOutcome: 'Access to 10M+ new customers',
        identifiedAt: new Date('2026-03-10'),
        updatedAt: new Date(),
        tags: ['partnership', 'distribution'],
      },
      {
        id: 'opp-4',
        tenantId: 'default',
        title: 'Process Automation Initiative',
        description: 'Automate repetitive operational tasks across departments.',
        type: 'operational',
        category: 'efficiency',
        status: OpportunityStatus.COMPLETED,
        estimatedValue: 450000,
        probability: 100,
        effort: 200,
        timeline: '2 months',
        priority: 'medium',
        owner: 'COO',
        actualOutcome: 'Achieved 35% reduction in operational costs',
        identifiedAt: new Date('2025-11-01'),
        updatedAt: new Date('2026-01-15'),
        completedAt: new Date('2026-01-15'),
        tags: ['automation', 'efficiency'],
      },
      {
        id: 'opp-5',
        tenantId: 'default',
        title: 'Enterprise SaaS Tier Launch',
        description: 'Launch dedicated enterprise tier with advanced features and SLAs.',
        type: 'product_development',
        category: 'product_development',
        status: OpportunityStatus.IDENTIFIED,
        estimatedValue: 3500000,
        probability: 40,
        effort: 600,
        timeline: '8-12 months',
        priority: 'medium',
        owner: 'VP Product',
        identifiedAt: new Date('2026-04-01'),
        updatedAt: new Date(),
        tags: ['enterprise', 'saas', 'product'],
      },
    ];

    for (const opp of sampleOpportunities) {
      this.opportunities.set(opp.id, opp);
    }
  }
}
