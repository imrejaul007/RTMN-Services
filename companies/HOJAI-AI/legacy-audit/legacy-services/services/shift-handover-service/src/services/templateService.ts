import { v4 as uuidv4 } from 'uuid';
import { HandoverTemplate, IHandoverTemplate, AlertType } from '../models/handover';
import { logger } from '../utils/logger';

export interface CreateTemplateInput {
  name: string;
  description?: string;
  facilityId: string;
  facilityName: string;
  departmentId?: string;
  departmentName?: string;
  sections?: {
    includePatients?: boolean;
    includeTasks?: boolean;
    includeAlerts?: boolean;
    includeNotes?: boolean;
    patientFields?: string[];
    taskCategories?: string[];
    alertTypes?: AlertType[];
  };
  createdBy: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  sections?: {
    includePatients?: boolean;
    includeTasks?: boolean;
    includeAlerts?: boolean;
    includeNotes?: boolean;
    patientFields?: string[];
    taskCategories?: string[];
    alertTypes?: AlertType[];
  };
  isActive?: boolean;
}

export class TemplateService {
  /**
   * Create a new handover template
   */
  async createTemplate(input: CreateTemplateInput): Promise<IHandoverTemplate> {
    try {
      const templateId = `TMPL-${uuidv4().substring(0, 8).toUpperCase()}`;

      const template = new HandoverTemplate({
        templateId,
        name: input.name,
        description: input.description,
        facilityId: input.facilityId,
        facilityName: input.facilityName,
        departmentId: input.departmentId,
        departmentName: input.departmentName,
        sections: {
          includePatients: input.sections?.includePatients ?? true,
          includeTasks: input.sections?.includeTasks ?? true,
          includeAlerts: input.sections?.includeAlerts ?? true,
          includeNotes: input.sections?.includeNotes ?? true,
          patientFields: input.sections?.patientFields ?? [
            'patientId',
            'patientName',
            'roomNumber',
            'condition',
            'vitals',
            'pendingTasks',
            'concerns'
          ],
          taskCategories: input.sections?.taskCategories ?? [],
          alertTypes: input.sections?.alertTypes ?? Object.values(AlertType)
        },
        isActive: true,
        createdBy: input.createdBy
      });

      await template.save();
      logger.info(`Template created: ${templateId}`);

      return template;
    } catch (error) {
      logger.error('Failed to create template:', error);
      throw error;
    }
  }

  /**
   * Get a template by ID
   */
  async getTemplate(templateId: string): Promise<IHandoverTemplate | null> {
    try {
      const template = await HandoverTemplate.findOne({ templateId }).exec();
      return template;
    } catch (error) {
      logger.error(`Failed to get template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get templates by facility
   */
  async getTemplatesByFacility(
    facilityId: string,
    includeInactive: boolean = false
  ): Promise<IHandoverTemplate[]> {
    try {
      const query: Record<string, unknown> = { facilityId };
      if (!includeInactive) {
        query.isActive = true;
      }

      const templates = await HandoverTemplate.find(query)
        .sort({ name: 1 })
        .exec();

      return templates;
    } catch (error) {
      logger.error(`Failed to get templates for facility ${facilityId}:`, error);
      throw error;
    }
  }

  /**
   * Get templates by department
   */
  async getTemplatesByDepartment(
    departmentId: string,
    facilityId?: string
  ): Promise<IHandoverTemplate[]> {
    try {
      const query: Record<string, unknown> = {
        departmentId,
        isActive: true
      };

      if (facilityId) {
        query.facilityId = facilityId;
      }

      const templates = await HandoverTemplate.find(query)
        .sort({ name: 1 })
        .exec();

      return templates;
    } catch (error) {
      logger.error(`Failed to get templates for department ${departmentId}:`, error);
      throw error;
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    updates: UpdateTemplateInput
  ): Promise<IHandoverTemplate | null> {
    try {
      const template = await HandoverTemplate.findOne({ templateId }).exec();
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (updates.name !== undefined) {
        template.name = updates.name;
      }
      if (updates.description !== undefined) {
        template.description = updates.description;
      }
      if (updates.isActive !== undefined) {
        template.isActive = updates.isActive;
      }
      if (updates.sections) {
        template.sections = {
          ...template.sections,
          ...updates.sections
        };
      }

      await template.save();
      logger.info(`Template updated: ${templateId}`);

      return template;
    } catch (error) {
      logger.error(`Failed to update template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Apply a template to a handover
   */
  async applyTemplate(
    handoverId: string,
    templateId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const template = await HandoverTemplate.findOne({ templateId }).exec();
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Import here to avoid circular dependency
      const { handoverService } = await import('./handoverService');
      const handover = await handoverService.getHandover(handoverId);

      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      // Update handover with template info
      handover.templateId = template.templateId;
      handover.templateName = template.name;
      await handover.save();

      logger.info(`Template ${templateId} applied to handover ${handoverId}`);

      return {
        success: true,
        message: `Template "${template.name}" applied successfully`
      };
    } catch (error) {
      logger.error(`Failed to apply template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(
    templateId: string,
    newName: string,
    createdBy: string
  ): Promise<IHandoverTemplate> {
    try {
      const original = await HandoverTemplate.findOne({ templateId }).exec();
      if (!original) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const newTemplate = new HandoverTemplate({
        templateId: `TMPL-${uuidv4().substring(0, 8).toUpperCase()}`,
        name: newName,
        description: original.description,
        facilityId: original.facilityId,
        facilityName: original.facilityName,
        departmentId: original.departmentId,
        departmentName: original.departmentName,
        sections: { ...original.sections },
        isActive: true,
        createdBy
      });

      await newTemplate.save();
      logger.info(`Template duplicated: ${newTemplate.templateId} from ${templateId}`);

      return newTemplate;
    } catch (error) {
      logger.error(`Failed to duplicate template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a template (soft delete)
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const template = await HandoverTemplate.findOne({ templateId }).exec();
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      template.isActive = false;
      await template.save();

      logger.info(`Template deleted: ${templateId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get default template for a facility
   */
  async getDefaultTemplate(facilityId: string): Promise<IHandoverTemplate | null> {
    try {
      // Look for a template named "Default" or first active template
      let template = await HandoverTemplate.findOne({
        facilityId,
        isActive: true,
        name: { $regex: /^default$/i }
      }).exec();

      if (!template) {
        template = await HandoverTemplate.findOne({
          facilityId,
          isActive: true
        }).sort({ createdAt: 1 }).exec();
      }

      return template;
    } catch (error) {
      logger.error(`Failed to get default template for facility ${facilityId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active templates
   */
  async getAllActiveTemplates(): Promise<IHandoverTemplate[]> {
    try {
      const templates = await HandoverTemplate.find({ isActive: true })
        .sort({ facilityName: 1, name: 1 })
        .exec();

      return templates;
    } catch (error) {
      logger.error('Failed to get all active templates:', error);
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(
    templateId: string
  ): Promise<{
    usageCount: number;
    lastUsed: Date | null;
  }> {
    try {
      const { ShiftHandover } = await import('../models/handover');

      const handovers = await ShiftHandover.find({ templateId })
        .sort({ createdAt: -1 })
        .limit(1)
        .exec();

      const usageCount = await ShiftHandover.countDocuments({ templateId }).exec();

      return {
        usageCount,
        lastUsed: handovers[0]?.createdAt || null
      };
    } catch (error) {
      logger.error(`Failed to get stats for template ${templateId}:`, error);
      throw error;
    }
  }
}

export const templateService = new TemplateService();
