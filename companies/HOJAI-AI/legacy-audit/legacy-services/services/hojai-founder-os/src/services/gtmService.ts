/**
 * HOJAI FounderOS - GTM Strategy Service
 */

import { v4 as uuid } from 'uuid';
import { GTMStrategyModel, MarketAnalysisModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('gtm');

export class GTMService {
  /**
   * List all GTM strategies for a tenant
   */
  async list(tenantId: string, limit = 50, offset = 0): Promise<any[]> {
    const strategies = await GTMStrategyModel.find({ tenantId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return strategies.map(s => this.formatGTMStrategy(s));
  }

  /**
   * Get GTM strategy by ID
   */
  async getById(tenantId: string, id: string): Promise<any | null> {
    const strategy = await GTMStrategyModel.findOne({ tenantId, id });
    return strategy ? this.formatGTMStrategy(strategy) : null;
  }

  /**
   * Create a new GTM strategy
   */
  async create(tenantId: string, data: {
    name: string;
    description?: string;
    targetMarket?: string;
    strategy?: {
      targetSegments?: string[];
      positioning?: string;
      channels?: string[];
      pricingModel?: string;
      goLiveDate?: Date;
      milestones?: Array<{
        id?: string;
        title: string;
        description?: string;
        targetDate?: Date;
        status?: string;
      }>;
    };
    createdBy?: string;
  }): Promise<any> {
    const id = uuid();

    const milestones = (data.strategy?.milestones || []).map(m => ({
      id: m.id || uuid(),
      title: m.title,
      description: m.description,
      targetDate: m.targetDate,
      status: m.status || 'pending'
    }));

    const strategy = new GTMStrategyModel({
      id,
      tenantId,
      name: data.name,
      description: data.description,
      targetMarket: data.targetMarket,
      strategy: {
        targetSegments: data.strategy?.targetSegments || [],
        positioning: data.strategy?.positioning,
        channels: data.strategy?.channels || [],
        pricingModel: data.strategy?.pricingModel,
        goLiveDate: data.strategy?.goLiveDate,
        milestones
      },
      createdBy: data.createdBy
    });

    await strategy.save();
    logger.info('gtm_strategy_created', { tenantId, id, name: data.name });

    return this.formatGTMStrategy(strategy);
  }

  /**
   * Update a GTM strategy
   */
  async update(tenantId: string, id: string, updates: {
    name?: string;
    description?: string;
    targetMarket?: string;
    strategy?: {
      targetSegments?: string[];
      positioning?: string;
      channels?: string[];
      pricingModel?: string;
      goLiveDate?: Date;
      milestones?: Array<{
        id?: string;
        title: string;
        description?: string;
        targetDate?: Date;
        status?: string;
      }>;
    };
  }): Promise<any | null> {
    const strategy = await GTMStrategyModel.findOne({ tenantId, id });
    if (!strategy) return null;

    if (updates.name !== undefined) strategy.name = updates.name;
    if (updates.description !== undefined) strategy.description = updates.description;
    if (updates.targetMarket !== undefined) strategy.targetMarket = updates.targetMarket;

    if (updates.strategy) {
      if (updates.strategy.targetSegments) strategy.strategy.targetSegments = updates.strategy.targetSegments;
      if (updates.strategy.positioning) strategy.strategy.positioning = updates.strategy.positioning;
      if (updates.strategy.channels) strategy.strategy.channels = updates.strategy.channels;
      if (updates.strategy.pricingModel) strategy.strategy.pricingModel = updates.strategy.pricingModel;
      if (updates.strategy.goLiveDate) strategy.strategy.goLiveDate = updates.strategy.goLiveDate;
      if (updates.strategy.milestones) {
        strategy.strategy.milestones = updates.strategy.milestones.map(m => ({
          id: m.id || uuid(),
          title: m.title,
          description: m.description,
          targetDate: m.targetDate,
          status: (m.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'delayed'
        }));
      }
    }

    await strategy.save();
    logger.info('gtm_strategy_updated', { tenantId, id });

    return this.formatGTMStrategy(strategy);
  }

  /**
   * Delete a GTM strategy
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await GTMStrategyModel.deleteOne({ tenantId, id });
    if (result.deletedCount > 0) {
      logger.info('gtm_strategy_deleted', { tenantId, id });
      return true;
    }
    return false;
  }

  /**
   * Generate GTM from business model
   */
  async generateFromBusinessModel(tenantId: string, businessModel: any, createdBy?: string): Promise<any> {
    const generated = this.suggestGTMFromCanvas(businessModel);

    return this.create(tenantId, {
      name: `GTM Strategy for ${businessModel.name}`,
      description: `Go-to-market strategy derived from ${businessModel.name}`,
      targetMarket: generated.targetMarket,
      strategy: {
        targetSegments: generated.targetSegments,
        positioning: generated.positioning,
        channels: generated.channels,
        pricingModel: generated.pricingModel,
        goLiveDate: generated.goLiveDate,
        milestones: generated.milestones
      },
      createdBy
    });
  }

  /**
   * Get GTM suggestions based on market analysis
   */
  async suggestFromMarketAnalysis(tenantId: string, marketAnalysisId: string): Promise<any> {
    const marketAnalysis = await MarketAnalysisModel.findOne({ tenantId, id: marketAnalysisId });
    if (!marketAnalysis) return null;

    const suggestions = {
      targetSegments: this.suggestTargetSegments(marketAnalysis),
      channels: this.suggestChannels(marketAnalysis),
      pricingModel: this.suggestPricingModel(marketAnalysis),
      positioning: this.suggestPositioning(marketAnalysis)
    };

    return suggestions;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private suggestGTMFromCanvas(businessModel: any): any {
    const segments = businessModel.segments || {};

    return {
      targetSegments: segments.customerSegments || [],
      positioning: `Unique value: ${(segments.valuePropositions || []).join(', ') || 'To be defined'}`,
      channels: this.suggestChannelsFromCanvas(segments),
      pricingModel: this.suggestPricingFromRevenueStreams(segments.revenueStreams || []),
      goLiveDate: this.calculateGoLiveDate(),
      milestones: this.generateMilestones()
    };
  }

  private suggestChannelsFromCanvas(segments: any): string[] {
    const channels: string[] = [];

    if (segments.channels && segments.channels.length > 0) {
      return segments.channels;
    }

    // Default channel suggestions based on product type
    channels.push('Direct sales', 'Website', 'Content marketing');

    return channels;
  }

  private suggestPricingFromRevenueStreams(revenueStreams: string[]): string {
    if (revenueStreams.length === 0) return 'To be determined';

    const lowerStreams = revenueStreams.map((s: string) => s.toLowerCase());

    if (lowerStreams.some((s: string) => s.includes('subscription'))) {
      return 'Subscription-based pricing';
    }
    if (lowerStreams.some((s: string) => s.includes('usage'))) {
      return 'Usage-based pricing';
    }
    if (lowerStreams.some((s: string) => s.includes('transaction'))) {
      return 'Transaction-based pricing';
    }

    return revenueStreams[0] || 'To be determined';
  }

  private calculateGoLiveDate(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date;
  }

  private generateMilestones(): any[] {
    return [
      {
        id: uuid(),
        title: 'Market Research Complete',
        description: 'Finalize target market and customer segments',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending'
      },
      {
        id: uuid(),
        title: 'Positioning Defined',
        description: 'Finalize unique value proposition and positioning',
        targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        status: 'pending'
      },
      {
        id: uuid(),
        title: 'Channel Strategy Finalized',
        description: 'Select and prepare primary channels',
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'pending'
      },
      {
        id: uuid(),
        title: 'Pricing Launched',
        description: 'Finalize and publish pricing',
        targetDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
        status: 'pending'
      },
      {
        id: uuid(),
        title: 'Public Launch',
        description: 'Full go-to-market launch',
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'pending'
      }
    ];
  }

  private suggestTargetSegments(marketAnalysis: any): string[] {
    const segments: string[] = [];

    if (marketAnalysis.som) {
      segments.push(`Initial target: SOM ($${marketAnalysis.som.toLocaleString()})`);
    }

    if (marketAnalysis.competitors && marketAnalysis.competitors.length > 0) {
      segments.push(`Competitors' underserved segments`);
    }

    segments.push('Early adopters');

    return segments;
  }

  private suggestChannels(marketAnalysis: any): string[] {
    const channels = [
      'Content marketing',
      'Social media',
      'Direct outreach',
      'Partnership channels'
    ];

    if (marketAnalysis.targetMarket?.toLowerCase().includes('enterprise')) {
      channels.unshift('Sales-led growth', 'Trade shows');
    } else {
      channels.unshift('Product-led growth', 'Viral/Referral');
    }

    return channels;
  }

  private suggestPricingModel(marketAnalysis: any): string {
    if (marketAnalysis.targetMarket?.toLowerCase().includes('enterprise')) {
      return 'Enterprise tiered pricing';
    }

    return 'Freemium with premium upsell';
  }

  private suggestPositioning(marketAnalysis: any): string {
    const opportunities = marketAnalysis.opportunities || [];

    if (opportunities.length > 0) {
      return `Positioning: ${opportunities[0]}`;
    }

    return 'Positioning: Innovative solution addressing key market gaps';
  }

  private formatGTMStrategy(strategy: any): any {
    return {
      id: strategy.id,
      tenantId: strategy.tenantId,
      name: strategy.name,
      description: strategy.description,
      targetMarket: strategy.targetMarket,
      strategy: strategy.strategy,
      createdBy: strategy.createdBy,
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt
    };
  }
}

export const gtmService = new GTMService();
export default gtmService;
