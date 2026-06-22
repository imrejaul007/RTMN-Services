import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ResolutionTemplate, TemplateCategory } from '../models/resolution';
import type {
  IResolutionTemplate,
  IResolutionStep,
  ISuccessCriteria,
  IssueCategory,
  IssuePriority
} from '../models/resolution';

interface TemplateCreateInput {
  name: string;
  description: string;
  category: TemplateCategory;
  applicableCategories: IssueCategory[];
  applicablePriorities: IssuePriority[];
  steps: IResolutionStep[];
  successCriteria: ISuccessCriteria[];
  createdBy: string;
  tags?: string[];
}

interface TemplateUpdateInput {
  success?: boolean;
  used?: boolean;
  usageCount?: number;
  averageResolutionTime?: number;
}

interface SimilaritySearchInput {
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
}

class TemplateService {
  async createTemplate(input: TemplateCreateInput): Promise<IResolutionTemplate> {
    logger.info('Creating resolution template', { name: input.name });

    const templateId = `tmpl_${uuidv4()}`;

    const template = await ResolutionTemplate.create({
      templateId,
      name: input.name,
      description: input.description,
      category: input.category,
      applicableCategories: input.applicableCategories,
      applicablePriorities: input.applicablePriorities,
      steps: input.steps,
      successCriteria: input.successCriteria,
      averageResolutionTime: 0,
      successRate: 0,
      usageCount: 0,
      createdBy: input.createdBy,
      isActive: true,
      tags: input.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    logger.info('Template created successfully', { templateId });
    return template.toObject() as IResolutionTemplate;
  }

  async findSimilarTemplate(input: SimilaritySearchInput): Promise<IResolutionTemplate[]> {
    logger.debug('Finding similar templates', {
      category: input.category,
      priority: input.priority
    });

    try {
      // Find templates by category and priority
      const templates = await ResolutionTemplate.find({
        isActive: true,
        applicableCategories: input.category,
        applicablePriorities: input.priority
      })
        .sort({ successRate: -1, usageCount: -1 })
        .limit(10)
        .lean();

      if (templates.length === 0) {
        // Broaden search to just category
        const broaderTemplates = await ResolutionTemplate.find({
          isActive: true,
          applicableCategories: input.category
        })
          .sort({ successRate: -1, usageCount: -1 })
          .limit(10)
          .lean();

        return broaderTemplates as IResolutionTemplate[];
      }

      return templates as IResolutionTemplate[];
    } catch (error) {
      logger.error('Error finding similar templates', { error });
      return [];
    }
  }

  async updateTemplate(
    templateId: string,
    input: TemplateUpdateInput
  ): Promise<IResolutionTemplate | null> {
    logger.info('Updating template', { templateId });

    try {
      const template = await ResolutionTemplate.findOne({ templateId });
      if (!template) {
        logger.warn('Template not found for update', { templateId });
        return null;
      }

      // Update usage statistics
      if (input.used !== undefined) {
        template.usageCount += 1;
        template.lastUsedAt = new Date();
      }

      if (input.success !== undefined) {
        // Update rolling success rate
        const totalAttempts = template.usageCount || 1;
        const previousSuccesses = template.successRate * (totalAttempts - 1);
        const newSuccesses = input.success ? 1 : 0;
        template.successRate = (previousSuccesses + newSuccesses) / totalAttempts;
      }

      if (input.averageResolutionTime !== undefined) {
        // Update rolling average
        const totalAttempts = template.usageCount || 1;
        const previousTotal = template.averageResolutionTime * (totalAttempts - 1);
        template.averageResolutionTime = Math.round(
          (previousTotal + input.averageResolutionTime) / totalAttempts
        );
      }

      if (input.usageCount !== undefined) {
        template.usageCount = input.usageCount;
      }

      template.updatedAt = new Date();
      await template.save();

      logger.info('Template updated successfully', { templateId });
      return template.toObject() as IResolutionTemplate;
    } catch (error) {
      logger.error('Error updating template', { error });
      throw error;
    }
  }

  async getPopularTemplates(limit: number = 10): Promise<IResolutionTemplate[]> {
    logger.debug('Getting popular templates', { limit });

    try {
      const templates = await ResolutionTemplate.find({ isActive: true })
        .sort({ usageCount: -1, successRate: -1 })
        .limit(limit)
        .lean();

      return templates as IResolutionTemplate[];
    } catch (error) {
      logger.error('Error getting popular templates', { error });
      return [];
    }
  }

  async getTemplatesByCategory(category: TemplateCategory): Promise<IResolutionTemplate[]> {
    logger.debug('Getting templates by category', { category });

    try {
      const templates = await ResolutionTemplate.find({
        isActive: true,
        category
      })
        .sort({ successRate: -1, usageCount: -1 })
        .lean();

      return templates as IResolutionTemplate[];
    } catch (error) {
      logger.error('Error getting templates by category', { error });
      return [];
    }
  }

  async getTemplatesByPriority(priority: IssuePriority): Promise<IResolutionTemplate[]> {
    logger.debug('Getting templates by priority', { priority });

    try {
      const templates = await ResolutionTemplate.find({
        isActive: true,
        applicablePriorities: priority
      })
        .sort({ successRate: -1, usageCount: -1 })
        .lean();

      return templates as IResolutionTemplate[];
    } catch (error) {
      logger.error('Error getting templates by priority', { error });
      return [];
    }
  }

  async getTemplateById(templateId: string): Promise<IResolutionTemplate | null> {
    try {
      const template = await ResolutionTemplate.findOne({ templateId }).lean();
      return template as IResolutionTemplate | null;
    } catch (error) {
      logger.error('Error getting template by ID', { error });
      return null;
    }
  }

  async listAllTemplates(options?: {
    page?: number;
    limit?: number;
    category?: TemplateCategory;
    isActive?: boolean;
  }): Promise<{
    templates: IResolutionTemplate[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const query: Record<string, unknown> = {};
    if (options?.category) {
      query.category = options.category;
    }
    if (options?.isActive !== undefined) {
      query.isActive = options.isActive;
    }

    try {
      const [templates, total] = await Promise.all([
        ResolutionTemplate.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        ResolutionTemplate.countDocuments(query)
      ]);

      return {
        templates: templates as IResolutionTemplate[],
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error listing templates', { error });
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    logger.info('Deleting template', { templateId });

    try {
      const result = await ResolutionTemplate.updateOne(
        { templateId },
        { isActive: false, updatedAt: new Date() }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error deleting template', { error });
      return false;
    }
  }

  async reactivateTemplate(templateId: string): Promise<boolean> {
    logger.info('Reactivating template', { templateId });

    try {
      const result = await ResolutionTemplate.updateOne(
        { templateId },
        { isActive: true, updatedAt: new Date() }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error reactivating template', { error });
      return false;
    }
  }

  async searchTemplates(query: string, limit: number = 10): Promise<IResolutionTemplate[]> {
    logger.debug('Searching templates', { query, limit });

    try {
      const templates = await ResolutionTemplate.find({
        isActive: true,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      })
        .sort({ successRate: -1, usageCount: -1 })
        .limit(limit)
        .lean();

      return templates as IResolutionTemplate[];
    } catch (error) {
      logger.error('Error searching templates', { error });
      return [];
    }
  }

  async getTemplateStats(templateId: string): Promise<{
    templateId: string;
    usageCount: number;
    successRate: number;
    averageResolutionTime: number;
    lastUsedAt?: Date;
  } | null> {
    try {
      const template = await ResolutionTemplate.findOne({ templateId }).lean();
      if (!template) return null;

      return {
        templateId: template.templateId,
        usageCount: template.usageCount,
        successRate: template.successRate,
        averageResolutionTime: template.averageResolutionTime,
        lastUsedAt: template.lastUsedAt || undefined
      };
    } catch (error) {
      logger.error('Error getting template stats', { error });
      return null;
    }
  }

  async cloneTemplate(
    templateId: string,
    newName: string,
    createdBy: string
  ): Promise<IResolutionTemplate | null> {
    logger.info('Cloning template', { originalId: templateId, newName });

    try {
      const original = await ResolutionTemplate.findOne({ templateId }).lean();
      if (!original) {
        logger.warn('Original template not found', { templateId });
        return null;
      }

      const newTemplateId = `tmpl_${uuidv4()}`;

      const cloned = await ResolutionTemplate.create({
        templateId: newTemplateId,
        name: newName,
        description: original.description,
        category: original.category,
        applicableCategories: original.applicableCategories,
        applicablePriorities: original.applicablePriorities,
        steps: original.steps.map(step => ({
          ...step,
          _id: undefined,
          status: 'pending',
          completedAt: undefined,
          completedBy: undefined
        })),
        successCriteria: original.successCriteria.map(criteria => ({
          ...criteria,
          isMet: false,
          currentValue: undefined
        })),
        averageResolutionTime: original.averageResolutionTime,
        successRate: 0, // Reset stats for new template
        usageCount: 0,
        createdBy,
        isActive: true,
        tags: original.tags,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      logger.info('Template cloned successfully', { newTemplateId });
      return cloned.toObject() as IResolutionTemplate;
    } catch (error) {
      logger.error('Error cloning template', { error });
      throw error;
    }
  }

  async getTemplatesNeedingReview(): Promise<IResolutionTemplate[]> {
    // Find templates with low success rate or not used recently
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const templates = await ResolutionTemplate.find({
        isActive: true,
        $or: [
          { successRate: { $lt: 0.6 } },
          {
            $and: [
              { lastUsedAt: { $lt: thirtyDaysAgo } },
              { usageCount: { $gt: 0 } }
            ]
          }
        ]
      })
        .sort({ successRate: 1 })
        .lean();

      return templates as IResolutionTemplate[];
    } catch (error) {
      logger.error('Error getting templates needing review', { error });
      return [];
    }
  }
}

export const templateService = new TemplateService();
export { TemplateService };
