/**
 * Industry Builder Service
 *
 * Partners create IndustryOS extensions.
 */

import { v4 as uuidv4 } from 'uuid';
import { IndustryBuilder, IndustryModule, IndustryTemplate } from './types';

// ============================================
// In-Memory Stores
// ============================================

const builders = new Map<string, IndustryBuilder>();
const modules = new Map<string, IndustryModule>();
const templates = new Map<string, IndustryTemplate>();

// ============================================
// Industry Builder Service
// ============================================

export class IndustryBuilderService {
  /**
   * Start building an IndustryOS
   */
  createBuilder(params: {
    partnerId: string;
    name: string;
    industry: string;
  }): IndustryBuilder {
    const builder: IndustryBuilder = {
      id: `ib_${uuidv4().slice(0, 8)}`,
      partnerId: params.partnerId,
      name: params.name,
      industry: params.industry,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    builders.set(builder.id, builder);
    return builder;
  }

  /**
   * Add module to builder
   */
  addModule(params: {
    builderId: string;
    name: string;
    type: 'core' | 'optional';
    routes: string[];
    dependencies?: string[];
  }): IndustryModule {
    const module: IndustryModule = {
      id: `mod_${uuidv4().slice(0, 8)}`,
      builderId: params.builderId,
      name: params.name,
      type: params.type,
      routes: params.routes,
      dependencies: params.dependencies || [],
    };

    modules.set(module.id, module);
    return module;
  }

  /**
   * Submit for review
   */
  submitForReview(builderId: string): IndustryBuilder | null {
    const builder = builders.get(builderId);
    if (!builder) return null;

    builder.status = 'review';
    return builder;
  }

  /**
   * Approve builder
   */
  approve(builderId: string): IndustryBuilder | null {
    const builder = builders.get(builderId);
    if (!builder) return null;

    builder.status = 'approved';
    return builder;
  }

  /**
   * Publish as template
   */
  publishAsTemplate(builderId: string): IndustryTemplate | null {
    const builder = builders.get(builderId);
    if (!builder || builder.status !== 'approved') return null;

    builder.status = 'published';

    const builderModules = Array.from(modules.values())
      .filter(m => m.builderId === builderId);

    const template: IndustryTemplate = {
      id: `tmpl_${uuidv4().slice(0, 8)}`,
      name: builder.name,
      industry: builder.industry,
      description: `${builder.name} for ${builder.industry} industry`,
      modules: builderModules.map(m => m.id),
      aiWorkers: [],
      distributionChannels: [],
      createdBy: builder.partnerId,
      status: 'active',
    };

    templates.set(template.id, template);
    return template;
  }

  /**
   * Get builder
   */
  getBuilder(builderId: string): IndustryBuilder | null {
    return builders.get(builderId) || null;
  }

  /**
   * Get builder modules
   */
  getBuilderModules(builderId: string): IndustryModule[] {
    return Array.from(modules.values())
      .filter(m => m.builderId === builderId);
  }

  /**
   * Get all templates
   */
  getTemplates(filter?: { industry?: string; status?: string }): IndustryTemplate[] {
    let list = Array.from(templates.values());

    if (filter?.industry) {
      list = list.filter(t => t.industry === filter.industry);
    }

    if (filter?.status) {
      list = list.filter(t => t.status === filter.status);
    }

    return list;
  }

  /**
   * Clone a template
   */
  cloneTemplate(templateId: string, newName: string, partnerId: string): IndustryBuilder | null {
    const template = templates.get(templateId);
    if (!template) return null;

    return this.createBuilder({
      partnerId,
      name: newName,
      industry: template.industry,
    });
  }

  /**
   * Get builder stats
   */
  getStats(): {
    totalBuilders: number;
    byStatus: Record<string, number>;
    byIndustry: Record<string, number>;
    totalTemplates: number;
  } {
    const byStatus: Record<string, number> = {};
    const byIndustry: Record<string, number> = {};

    for (const builder of builders.values()) {
      byStatus[builder.status] = (byStatus[builder.status] || 0) + 1;
      byIndustry[builder.industry] = (byIndustry[builder.industry] || 0) + 1;
    }

    return {
      totalBuilders: builders.size,
      byStatus,
      byIndustry,
      totalTemplates: templates.size,
    };
  }
}

export const industryBuilderService = new IndustryBuilderService();