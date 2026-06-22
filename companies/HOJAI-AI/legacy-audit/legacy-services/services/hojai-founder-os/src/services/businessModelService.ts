/**
 * HOJAI FounderOS - Business Model Service
 */

import { v4 as uuid } from 'uuid';
import { BusinessModelModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';
import type { BusinessModelSegments } from '../types/index.js';

const logger = createLogger('business-model');

export class BusinessModelService {
  /**
   * List all business models for a tenant
   */
  async list(tenantId: string, limit = 50, offset = 0): Promise<any[]> {
    const models = await BusinessModelModel.find({ tenantId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return models.map(m => this.formatBusinessModel(m));
  }

  /**
   * Get business model by ID
   */
  async getById(tenantId: string, id: string): Promise<any | null> {
    const model = await BusinessModelModel.findOne({ tenantId, id });
    return model ? this.formatBusinessModel(model) : null;
  }

  /**
   * Create a new business model
   */
  async create(tenantId: string, data: {
    name: string;
    description?: string;
    segments?: Partial<BusinessModelSegments>;
    createdBy?: string;
  }): Promise<any> {
    const id = uuid();

    const model = new BusinessModelModel({
      id,
      tenantId,
      name: data.name,
      description: data.description,
      segments: {
        keyPartners: data.segments?.keyPartners || [],
        keyActivities: data.segments?.keyActivities || [],
        keyResources: data.segments?.keyResources || [],
        valuePropositions: data.segments?.valuePropositions || [],
        customerRelationships: data.segments?.customerRelationships || [],
        channels: data.segments?.channels || [],
        customerSegments: data.segments?.customerSegments || [],
        costStructure: data.segments?.costStructure || [],
        revenueStreams: data.segments?.revenueStreams || []
      },
      createdBy: data.createdBy
    });

    await model.save();
    logger.info('business_model_created', { tenantId, id, name: data.name });

    return this.formatBusinessModel(model);
  }

  /**
   * Update a business model
   */
  async update(tenantId: string, id: string, updates: {
    name?: string;
    description?: string;
    segments?: Partial<BusinessModelSegments>;
  }): Promise<any | null> {
    const model = await BusinessModelModel.findOne({ tenantId, id });
    if (!model) return null;

    if (updates.name !== undefined) model.name = updates.name;
    if (updates.description !== undefined) model.description = updates.description;
    if (updates.segments) {
      Object.assign(model.segments, updates.segments);
    }

    await model.save();
    logger.info('business_model_updated', { tenantId, id });

    return this.formatBusinessModel(model);
  }

  /**
   * Delete a business model
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await BusinessModelModel.deleteOne({ tenantId, id });
    if (result.deletedCount > 0) {
      logger.info('business_model_deleted', { tenantId, id });
      return true;
    }
    return false;
  }

  /**
   * AI Generate business model canvas from description
   */
  async generateFromDescription(tenantId: string, description: string, createdBy?: string): Promise<any> {
    // AI-powered generation logic
    // This would integrate with an AI service to generate canvas sections
    const generatedSegments = this.generateCanvasFromText(description);

    return this.create(tenantId, {
      name: 'AI-Generated Business Model',
      description,
      segments: generatedSegments,
      createdBy
    });
  }

  /**
   * Analyze business model gaps
   */
  async analyzeGaps(tenantId: string, id: string): Promise<any> {
    const model = await this.getById(tenantId, id);
    if (!model) return null;

    const gaps: string[] = [];
    const suggestions: string[] = [];

    // Check for empty sections
    const emptyChecks = [
      { section: 'keyPartners', suggestion: 'Consider identifying strategic partners who can help deliver value' },
      { section: 'keyActivities', suggestion: 'Define core activities needed to deliver your value proposition' },
      { section: 'keyResources', suggestion: 'Identify critical resources required for operations' },
      { section: 'valuePropositions', suggestion: 'Articulate unique value your product/service provides' },
      { section: 'customerRelationships', suggestion: 'Define how you will acquire, retain, and grow customer relationships' },
      { section: 'channels', suggestion: 'Identify distribution channels to reach customers' },
      { section: 'customerSegments', suggestion: 'Define your target customer segments' },
      { section: 'costStructure', suggestion: 'Identify key cost drivers for your business' },
      { section: 'revenueStreams', suggestion: 'Define how you will capture value and generate revenue' }
    ];

    for (const check of emptyChecks) {
      const section = model.segments[check.section as keyof typeof model.segments] as string[];
      if (!section || section.length === 0) {
        gaps.push(`${check.section} is empty`);
        suggestions.push(check.suggestion);
      }
    }

    return {
      id,
      gaps,
      suggestions,
      completeness: this.calculateCompleteness(model.segments)
    };
  }

  /**
   * Get revenue stream suggestions
   */
  suggestRevenueStreams(industry: string): string[] {
    const revenueTemplates: Record<string, string[]> = {
      saas: [
        'Monthly subscription (SaaS)',
        'Annual subscription with discount',
        'Usage-based pricing',
        'Freemium model',
        'Enterprise licensing',
        'Add-on modules'
      ],
      ecommerce: [
        'Product sales',
        'Subscription boxes',
        'Marketplace commissions',
        'Advertising revenue',
        'Premium membership'
      ],
      fintech: [
        'Transaction fees',
        'Interest spread',
        'Subscription fees',
        'Premium services',
        'API licensing'
      ],
      marketplace: [
        'Transaction commissions',
        'Listing fees',
        'Featured placement',
        'Premium seller subscriptions',
        'Advertising'
      ],
      default: [
        'Direct sales',
        'Subscription model',
        'Usage-based billing',
        'Licensing',
        'Partnership revenue'
      ]
    };

    return revenueTemplates[industry.toLowerCase()] || revenueTemplates.default;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateCanvasFromText(description: string): BusinessModelSegments {
    // AI simulation: Generate canvas based on description analysis
    const lowerDesc = description.toLowerCase();

    const segments: BusinessModelSegments = {
      keyPartners: [],
      keyActivities: [],
      keyResources: [],
      valuePropositions: [],
      customerRelationships: [],
      channels: [],
      customerSegments: [],
      costStructure: [],
      revenueStreams: []
    };

    // Basic keyword-based generation
    if (lowerDesc.includes('software') || lowerDesc.includes('app') || lowerDesc.includes('platform')) {
      segments.keyActivities.push('Software development', 'Maintenance', 'Customer support');
      segments.keyResources.push('Engineering team', 'Cloud infrastructure', 'IP/Patents');
    }

    if (lowerDesc.includes('marketplace') || lowerDesc.includes('two-sided')) {
      segments.keyPartners.push('Payment providers', 'Logistics partners', 'Sellers/Suppliers');
      segments.channels.push('Web platform', 'Mobile app');
    }

    if (lowerDesc.includes('b2b') || lowerDesc.includes('enterprise')) {
      segments.customerSegments.push('Enterprise companies', 'SMEs', 'Corporate accounts');
      segments.customerRelationships.push('Account management', 'Dedicated support', 'Custom integrations');
      segments.revenueStreams.push('Enterprise licensing', 'Usage-based pricing', 'Professional services');
    }

    if (lowerDesc.includes('b2c') || lowerDesc.includes('consumer')) {
      segments.customerSegments.push('Individual consumers', 'Power users', 'Casual users');
      segments.channels.push('App store', 'Social media', 'Content marketing');
      segments.customerRelationships.push('Self-service', 'Community', 'In-app messaging');
      segments.revenueStreams.push('Freemium model', 'In-app purchases', 'Subscription');
    }

    // Add defaults if nothing detected
    if (segments.keyPartners.length === 0) {
      segments.keyPartners.push('Technology partners', 'Distribution partners');
    }
    if (segments.keyActivities.length === 0) {
      segments.keyActivities.push('Product development', 'Marketing', 'Sales');
    }
    if (segments.valuePropositions.length === 0) {
      segments.valuePropositions.push(description.substring(0, 100));
    }

    return segments;
  }

  private calculateCompleteness(segments: BusinessModelSegments): number {
    const totalFields = 9;
    let filledFields = 0;

    const fields = [
      segments.keyPartners,
      segments.keyActivities,
      segments.keyResources,
      segments.valuePropositions,
      segments.customerRelationships,
      segments.channels,
      segments.customerSegments,
      segments.costStructure,
      segments.revenueStreams
    ];

    for (const field of fields) {
      if (field && field.length > 0) filledFields++;
    }

    return Math.round((filledFields / totalFields) * 100);
  }

  private formatBusinessModel(model: any): any {
    return {
      id: model.id,
      tenantId: model.tenantId,
      name: model.name,
      description: model.description,
      segments: model.segments,
      createdBy: model.createdBy,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };
  }
}

export const businessModelService = new BusinessModelService();
export default businessModelService;
