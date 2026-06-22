import { v4 as uuidv4 } from 'uuid';
import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Template, ITemplate, ITemplateVariable } from '../models/Template';
import { logger } from '../utils/logger';

export interface CreateTemplateDto {
  name: string;
  type: 'nda' | 'msa' | 'sow' | 'employment' | 'vendor' | 'custom';
  description?: string;
  content: string;
  variables?: ITemplateVariable[];
  createdBy: string;
  tenantId: string;
}

export interface TemplateQuery {
  tenantId: string;
  type?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class TemplateService {
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    Handlebars.registerHelper('lower', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    Handlebars.registerHelper('concat', function(this: unknown, ...args: unknown[]): string {
      return args.slice(0, -1).join('');
    });

    Handlebars.registerHelper('ifEquals', (arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) => {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('listItems', (items: string[]) => {
      if (!items || items.length === 0) return '';
      return new Handlebars.SafeString(
        items.map((item, i) => `<li>${item}</li>`).join('')
      );
    });
  }

  async create(dto: CreateTemplateDto): Promise<ITemplate> {
    const templateId = `TPL-${uuidv4().substring(0, 8).toUpperCase()}`;

    const template = new Template({
      templateId,
      name: dto.name,
      type: dto.type,
      description: dto.description || '',
      content: dto.content,
      variables: dto.variables || [],
      variablesJson: JSON.stringify(dto.variables || []),
      isActive: true,
      createdBy: dto.createdBy,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
      },
      tenantId: dto.tenantId
    });

    this.validateTemplateContent(dto.content, dto.variables || []);

    await template.save();
    logger.info(`Template created: ${templateId}`, { templateId, tenantId: dto.tenantId });
    return template;
  }

  async findById(templateId: string, tenantId: string): Promise<ITemplate | null> {
    return Template.findOne({ templateId, tenantId });
  }

  async findByIdWithContent(templateId: string, tenantId: string): Promise<ITemplate | null> {
    const template = await Template.findOne({ templateId, tenantId });
    if (template) {
      Template.updateOne({ templateId }, { $inc: { 'metadata.usageCount': 1 } });
    }
    return template;
  }

  async findAll(query: TemplateQuery): Promise<{ templates: ITemplate[]; total: number }> {
    const { tenantId, type, isActive, search, page = 1, limit = 20 } = query;

    const filter: Record<string, unknown> = { tenantId };

    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      Template.find(filter)
        .select('-content')
        .sort({ 'metadata.createdAt': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Template.countDocuments(filter)
    ]);

    return { templates: templates as unknown as ITemplate[], total };
  }

  async findAllActive(tenantId: string, type?: string): Promise<ITemplate[]> {
    const filter: Record<string, unknown> = { tenantId, isActive: true };
    if (type) filter.type = type;

    return Template.find(filter).sort({ name: 1 }).lean() as unknown as ITemplate[];
  }

  async update(templateId: string, tenantId: string, dto: Partial<CreateTemplateDto>): Promise<ITemplate | null> {
    const template = await Template.findOne({ templateId, tenantId });
    if (!template) return null;

    if (dto.name) template.name = dto.name;
    if (dto.type) template.type = dto.type;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.content) {
      this.validateTemplateContent(dto.content, dto.variables || template.variables);
      template.content = dto.content;
    }
    if (dto.variables) {
      template.variables = dto.variables;
      template.variablesJson = JSON.stringify(dto.variables);
    }

    template.metadata.updatedAt = new Date();
    await template.save();
    this.compiledTemplates.delete(templateId);

    logger.info(`Template updated: ${templateId}`, { templateId, tenantId });
    return template;
  }

  async delete(templateId: string, tenantId: string): Promise<boolean> {
    const result = await Template.deleteOne({ templateId, tenantId });
    if (result.deletedCount > 0) {
      this.compiledTemplates.delete(templateId);
      logger.info(`Template deleted: ${templateId}`, { templateId, tenantId });
      return true;
    }
    return false;
  }

  async renderTemplate(
    templateId: string,
    tenantId: string,
    variables: Record<string, unknown>
  ): Promise<string> {
    const template = await this.findByIdWithContent(templateId, tenantId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let compiled = this.compiledTemplates.get(templateId);
    if (!compiled) {
      compiled = Handlebars.compile(template.content);
      this.compiledTemplates.set(templateId, compiled);
    }

    const context = this.buildContext(template.variables, variables);
    return compiled(context);
  }

  private buildContext(
    templateVariables: ITemplateVariable[],
    providedValues: Record<string, unknown>
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    for (const variable of templateVariables) {
      if (providedValues[variable.name] !== undefined) {
        context[variable.name] = providedValues[variable.name];
      } else if (variable.defaultValue !== undefined) {
        context[variable.name] = variable.defaultValue;
      } else {
        context[variable.name] = '';
      }
    }

    for (const [key, value] of Object.entries(providedValues)) {
      if (context[key] === undefined) {
        context[key] = value;
      }
    }

    context.generatedDate = new Date();
    context.generatedDateFormatted = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return context;
  }

  private validateTemplateContent(content: string, variables: ITemplateVariable[]): void {
    const variableNames = variables.map(v => v.name);
    const usedVariables = content.match(/\{\{([^}]+)\}\}/g) || [];

    for (const match of usedVariables) {
      const varName = match.replace(/\{|\}/g, '').trim().split(' ')[0];
      if (!variableNames.includes(varName) && !['if', 'each', 'with', 'lookup', 'formatDate', 'uppercase', 'lower', 'concat', 'ifEquals', 'listItems'].includes(varName)) {
        logger.warn(`Template uses undefined variable: ${varName}`);
      }
    }
  }

  async loadFromFile(templatePath: string, tenantId: string, createdBy: string): Promise<ITemplate> {
    const content = fs.readFileSync(templatePath, 'utf-8');
    const fileName = path.basename(templatePath, '.hbs');
    const type = this.getTypeFromFileName(fileName);

    return this.create({
      name: this.formatFileName(fileName),
      type,
      description: `Loaded from ${fileName}.hbs`,
      content,
      createdBy,
      tenantId
    });
  }

  async loadAllTemplatesFromDir(dirPath: string, tenantId: string, createdBy: string): Promise<number> {
    if (!fs.existsSync(dirPath)) {
      logger.warn(`Template directory not found: ${dirPath}`);
      return 0;
    }

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.hbs'));
    let loaded = 0;

    for (const file of files) {
      try {
        await this.loadFromFile(path.join(dirPath, file), tenantId, createdBy);
        loaded++;
      } catch (error) {
        logger.error(`Failed to load template ${file}:`, error);
      }
    }

    return loaded;
  }

  private getTypeFromFileName(fileName: string): CreateTemplateDto['type'] {
    const lower = fileName.toLowerCase();
    if (lower.includes('nda')) return 'nda';
    if (lower.includes('msa')) return 'msa';
    if (lower.includes('sow')) return 'sow';
    if (lower.includes('employment')) return 'employment';
    if (lower.includes('vendor')) return 'vendor';
    return 'custom';
  }

  private formatFileName(fileName: string): string {
    return fileName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  async getVariableSchema(templateId: string, tenantId: string): Promise<ITemplateVariable[] | null> {
    const template = await Template.findOne({ templateId, tenantId }).select('templateId name type variables');
    return template ? template.variables : null;
  }
}

export const templateService = new TemplateService();
