/**
 * HOJAI FounderOS - Fundraising Service
 */

import { v4 as uuid } from 'uuid';
import { FundraisingPlanModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';
import { FundraisingStage } from '../types/index.js';

const logger = createLogger('fundraising');

export class FundraisingService {
  /**
   * List all fundraising plans for a tenant
   */
  async list(tenantId: string, limit = 50, offset = 0): Promise<any[]> {
    const plans = await FundraisingPlanModel.find({ tenantId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return plans.map(p => this.formatFundraisingPlan(p));
  }

  /**
   * Get fundraising plan by ID
   */
  async getById(tenantId: string, id: string): Promise<any | null> {
    const plan = await FundraisingPlanModel.findOne({ tenantId, id });
    return plan ? this.formatFundraisingPlan(plan) : null;
  }

  /**
   * Create a new fundraising plan
   */
  async create(tenantId: string, data: {
    name: string;
    description?: string;
    stage: FundraisingStage;
    targetAmount?: number;
    currency?: string;
    targetDate?: Date;
    valuation?: number;
    pitchDeck?: string;
    investors?: Array<{
      name: string;
      type?: string;
      contact?: string;
      status?: string;
    }>;
    milestones?: Array<{
      id?: string;
      title: string;
      description?: string;
      targetDate?: Date;
      status?: string;
    }>;
    createdBy?: string;
  }): Promise<any> {
    const id = uuid();

    const plan = new FundraisingPlanModel({
      id,
      tenantId,
      name: data.name,
      description: data.description,
      stage: data.stage,
      targetAmount: data.targetAmount,
      currency: data.currency || 'USD',
      targetDate: data.targetDate,
      valuation: data.valuation,
      raisedAmount: 0,
      pitchDeck: data.pitchDeck,
      investors: (data.investors || []).map(inv => ({
        name: inv.name,
        type: inv.type,
        contact: inv.contact,
        status: (inv.status || 'contacted') as 'contacted' | 'meeting_scheduled' | 'interested' | 'passed' | 'committed'
      })),
      milestones: (data.milestones || []).map(m => ({
        id: m.id || uuid(),
        title: m.title,
        description: m.description,
        targetDate: m.targetDate,
        status: (m.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'delayed'
      })),
      createdBy: data.createdBy
    });

    await plan.save();
    logger.info('fundraising_plan_created', { tenantId, id, name: data.name, stage: data.stage });

    return this.formatFundraisingPlan(plan);
  }

  /**
   * Update a fundraising plan
   */
  async update(tenantId: string, id: string, updates: {
    name?: string;
    description?: string;
    stage?: FundraisingStage;
    targetAmount?: number;
    currency?: string;
    targetDate?: Date;
    valuation?: number;
    pitchDeck?: string;
    raisedAmount?: number;
    investors?: Array<{
      name: string;
      type?: string;
      contact?: string;
      status?: string;
    }>;
    milestones?: Array<{
      id?: string;
      title: string;
      description?: string;
      targetDate?: Date;
      status?: string;
    }>;
  }): Promise<any | null> {
    const plan = await FundraisingPlanModel.findOne({ tenantId, id });
    if (!plan) return null;

    if (updates.name !== undefined) plan.name = updates.name;
    if (updates.description !== undefined) plan.description = updates.description;
    if (updates.stage !== undefined) plan.stage = updates.stage;
    if (updates.targetAmount !== undefined) plan.targetAmount = updates.targetAmount;
    if (updates.currency !== undefined) plan.currency = updates.currency;
    if (updates.targetDate !== undefined) plan.targetDate = updates.targetDate;
    if (updates.valuation !== undefined) plan.valuation = updates.valuation;
    if (updates.pitchDeck !== undefined) plan.pitchDeck = updates.pitchDeck;
    if (updates.raisedAmount !== undefined) plan.raisedAmount = updates.raisedAmount;
    if (updates.investors) {
      plan.investors = updates.investors.map(inv => ({
        name: inv.name,
        type: inv.type,
        contact: inv.contact,
        status: (inv.status || 'contacted') as 'contacted' | 'meeting_scheduled' | 'interested' | 'passed' | 'committed'
      }));
    }
    if (updates.milestones) {
      plan.milestones = updates.milestones.map(m => ({
        id: m.id || uuid(),
        title: m.title,
        description: m.description,
        targetDate: m.targetDate,
        status: (m.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'delayed'
      }));
    }

    await plan.save();
    logger.info('fundraising_plan_updated', { tenantId, id });

    return this.formatFundraisingPlan(plan);
  }

  /**
   * Delete a fundraising plan
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await FundraisingPlanModel.deleteOne({ tenantId, id });
    if (result.deletedCount > 0) {
      logger.info('fundraising_plan_deleted', { tenantId, id });
      return true;
    }
    return false;
  }

  /**
   * Update fundraising progress
   */
  async updateProgress(tenantId: string, id: string, raisedAmount: number): Promise<any | null> {
    const plan = await FundraisingPlanModel.findOne({ tenantId, id });
    if (!plan) return null;

    plan.raisedAmount = raisedAmount;
    await plan.save();

    logger.info('fundraising_progress_updated', { tenantId, id, raisedAmount });

    return this.formatFundraisingPlan(plan);
  }

  /**
   * Add investor to plan
   */
  async addInvestor(tenantId: string, id: string, investor: {
    name: string;
    type?: string;
    contact?: string;
    status?: string;
  }): Promise<any | null> {
    const plan = await FundraisingPlanModel.findOne({ tenantId, id });
    if (!plan) return null;

    plan.investors.push({
      name: investor.name,
      type: investor.type,
      contact: investor.contact,
      status: (investor.status || 'contacted') as 'contacted' | 'meeting_scheduled' | 'interested' | 'passed' | 'committed'
    });

    await plan.save();
    logger.info('investor_added', { tenantId, id, investorName: investor.name });

    return this.formatFundraisingPlan(plan);
  }

  /**
   * Update investor status
   */
  async updateInvestorStatus(
    tenantId: string,
    id: string,
    investorName: string,
    status: string
  ): Promise<any | null> {
    const plan = await FundraisingPlanModel.findOne({ tenantId, id });
    if (!plan) return null;

    const investor = plan.investors.find(inv => inv.name === investorName);
    if (investor) {
      investor.status = status as any;
      await plan.save();
      logger.info('investor_status_updated', { tenantId, id, investorName, status });
    }

    return this.formatFundraisingPlan(plan);
  }

  /**
   * Get fundraising analytics
   */
  async getAnalytics(tenantId: string): Promise<any> {
    const plans = await FundraisingPlanModel.find({ tenantId });

    const totalRaised = plans.reduce((sum, p) => sum + (p.raisedAmount || 0), 0);
    const totalTarget = plans.reduce((sum, p) => sum + (p.targetAmount || 0), 0);
    const activeInvestors = plans.reduce((sum, p) =>
      sum + p.investors.filter(inv => inv.status !== 'passed').length, 0);

    const byStage = plans.reduce((acc, p) => {
      acc[p.stage] = (acc[p.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = plans.reduce((acc, p) => {
      const status = p.raisedAmount >= (p.targetAmount || 0) ? 'funded' :
        p.raisedAmount > 0 ? 'in_progress' : 'planning';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPlans: plans.length,
      totalRaised,
      totalTarget,
      fillRate: totalTarget > 0 ? Math.round((totalRaised / totalTarget) * 100) : 0,
      activeInvestors,
      byStage,
      byStatus
    };
  }

  /**
   * Generate standard milestones for a funding round
   */
  generateStandardMilestones(stage: FundraisingStage): any[] {
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() + 6);

    const stageConfig: Record<FundraisingStage, { title: string; description: string; monthOffset: number }[]> = {
      [FundraisingStage.PRE_SEED]: [
        { title: 'Build MVP', description: 'Develop minimum viable product', monthOffset: 1 },
        { title: 'Get First Users', description: 'Acquire first 10-25 beta users', monthOffset: 2 },
        { title: 'Initial Traction', description: 'Demonstrate product-market fit signals', monthOffset: 3 }
      ],
      [FundraisingStage.SEED]: [
        { title: 'Pitch Deck Ready', description: 'Complete investor pitch materials', monthOffset: 1 },
        { title: 'Investor Outreach', description: 'Begin outreach to target investors', monthOffset: 2 },
        { title: 'First Meetings', description: 'Schedule and complete first investor meetings', monthOffset: 3 },
        { title: 'Term Sheet', description: 'Negotiate and receive term sheet', monthOffset: 4 },
        { title: 'Close Round', description: 'Complete fundraising round', monthOffset: 6 }
      ],
      [FundraisingStage.SERIES_A]: [
        { title: 'Metrics Alignment', description: 'Ensure metrics meet Series A bar', monthOffset: 1 },
        { title: 'Strategic Investor List', description: 'Build list of strategic VCs', monthOffset: 2 },
        { title: 'Board Presentation', description: 'Prepare and present to board', monthOffset: 2 },
        { title: 'Due Diligence', description: 'Complete investor due diligence', monthOffset: 4 },
        { title: 'Close Round', description: 'Complete Series A fundraising', monthOffset: 6 }
      ],
      [FundraisingStage.SERIES_B]: [
        { title: 'Growth Metrics Review', description: 'Analyze growth and efficiency metrics', monthOffset: 1 },
        { title: 'Market Positioning', description: 'Confirm competitive positioning', monthOffset: 2 },
        { title: 'Due Diligence Prep', description: 'Prepare comprehensive due diligence package', monthOffset: 3 },
        { title: 'Close Round', description: 'Complete Series B fundraising', monthOffset: 6 }
      ],
      [FundraisingStage.SERIES_C]: [
        { title: 'Scale Readiness', description: 'Verify operational scale readiness', monthOffset: 1 },
        { title: 'International Expansion', description: 'Plan international market entry', monthOffset: 2 },
        { title: 'Close Round', description: 'Complete Series C fundraising', monthOffset: 6 }
      ],
      [FundraisingStage.IPO]: [
        { title: 'Financial Audit', description: 'Complete comprehensive financial audit', monthOffset: 3 },
        { title: 'Legal Preparation', description: 'Prepare legal documentation', monthOffset: 6 },
        { title: 'Banker Selection', description: 'Select investment banks', monthOffset: 9 },
        { title: 'Roadshow', description: 'Conduct investor roadshow', monthOffset: 12 },
        { title: 'IPO Launch', description: 'Complete IPO', monthOffset: 15 }
      ]
    };

    const milestones = stageConfig[stage] || [];

    return milestones.map(m => ({
      id: uuid(),
      title: m.title,
      description: m.description,
      targetDate: new Date(baseDate.getTime() + m.monthOffset * 30 * 24 * 60 * 60 * 1000),
      status: 'pending'
    }));
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private formatFundraisingPlan(plan: any): any {
    return {
      id: plan.id,
      tenantId: plan.tenantId,
      name: plan.name,
      description: plan.description,
      stage: plan.stage,
      targetAmount: plan.targetAmount,
      currency: plan.currency,
      targetDate: plan.targetDate,
      valuation: plan.valuation,
      raisedAmount: plan.raisedAmount,
      pitchDeck: plan.pitchDeck,
      investors: plan.investors,
      milestones: plan.milestones,
      createdBy: plan.createdBy,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    };
  }
}

export const fundraisingService = new FundraisingService();
export default fundraisingService;
