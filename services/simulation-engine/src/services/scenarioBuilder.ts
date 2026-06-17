import { v4 as uuidv4 } from 'uuid';
import {
  ScenarioDefinition,
  ScenarioCategory,
  ScenarioType,
  ScenarioParameter,
  CreateScenarioRequest,
  ScenarioParameterSchema,
} from '../types';
import { ScenarioModel, ScenarioDocument } from '../models/Scenario';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

class ScenarioBuilder {
  /**
   * Create a new scenario
   */
  async createScenario(request: CreateScenarioRequest): Promise<ScenarioDefinition> {
    // Validate parameters
    for (const param of request.parameters) {
      const validation = ScenarioParameterSchema.safeParse(param);
      if (!validation.success) {
        throw new Error(`Invalid parameter: ${validation.error.message}`);
      }
    }

    const scenario = new ScenarioModel({
      name: request.name,
      description: request.description,
      category: request.category,
      type: request.type,
      parameters: request.parameters,
      constraints: request.constraints || {},
      tenantId: request.tenantId,
      tags: request.tags || [],
      isActive: true,
    });

    await scenario.save();

    logger.info(`Created scenario: ${scenario._id} for tenant: ${request.tenantId}`);

    return this.toScenarioDefinition(scenario);
  }

  /**
   * Get a scenario by ID
   */
  async getScenario(scenarioId: string): Promise<ScenarioDefinition | null> {
    const scenario = await ScenarioModel.findById(scenarioId);
    if (!scenario) {
      return null;
    }
    return this.toScenarioDefinition(scenario);
  }

  /**
   * Get scenario by ID and tenant (for multi-tenant security)
   */
  async getScenarioByTenant(
    scenarioId: string,
    tenantId: string
  ): Promise<ScenarioDefinition | null> {
    const scenario = await ScenarioModel.findOne({ _id: scenarioId, tenantId });
    if (!scenario) {
      return null;
    }
    return this.toScenarioDefinition(scenario);
  }

  /**
   * List scenarios for a tenant
   */
  async listScenarios(
    tenantId: string,
    options: {
      category?: ScenarioCategory;
      type?: ScenarioType;
      isActive?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ scenarios: ScenarioDefinition[]; total: number }> {
    const scenarios = await ScenarioModel.findByTenant(tenantId, options);
    const total = await ScenarioModel.countByTenant(tenantId, {
      category: options.category,
      type: options.type,
      isActive: options.isActive,
    });

    return {
      scenarios: scenarios.map(s => this.toScenarioDefinition(s)),
      total,
    };
  }

  /**
   * Update a scenario
   */
  async updateScenario(
    scenarioId: string,
    tenantId: string,
    updates: Partial<CreateScenarioRequest>
  ): Promise<ScenarioDefinition | null> {
    const scenario = await ScenarioModel.findOneAndUpdate(
      { _id: scenarioId, tenantId },
      {
        $set: {
          ...(updates.name && { name: updates.name }),
          ...(updates.description && { description: updates.description }),
          ...(updates.category && { category: updates.category }),
          ...(updates.type && { type: updates.type }),
          ...(updates.parameters && { parameters: updates.parameters }),
          ...(updates.constraints && { constraints: updates.constraints }),
          ...(updates.tags && { tags: updates.tags }),
        },
      },
      { new: true }
    );

    if (!scenario) {
      return null;
    }

    logger.info(`Updated scenario: ${scenarioId}`);
    return this.toScenarioDefinition(scenario);
  }

  /**
   * Delete a scenario (soft delete)
   */
  async deleteScenario(
    scenarioId: string,
    tenantId: string
  ): Promise<boolean> {
    const result = await ScenarioModel.updateOne(
      { _id: scenarioId, tenantId },
      { $set: { isActive: false } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Clone a scenario
   */
  async cloneScenario(
    scenarioId: string,
    tenantId: string,
    newName?: string
  ): Promise<ScenarioDefinition | null> {
    const original = await this.getScenarioByTenant(scenarioId, tenantId);
    if (!original) {
      return null;
    }

    const cloned = new ScenarioModel({
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      category: original.category,
      type: original.type,
      parameters: original.parameters,
      constraints: original.constraints,
      tenantId,
      tags: original.tags,
      isActive: true,
    });

    await cloned.save();

    logger.info(`Cloned scenario ${scenarioId} to ${cloned._id}`);
    return this.toScenarioDefinition(cloned);
  }

  /**
   * Build a pre-defined "What If" scenario
   */
  async buildWhatIfScenario(
    tenantId: string,
    scenarioType: 'refund_increase' | 'price_decrease' | 'service_improvement' | 'marketing_push'
  ): Promise<ScenarioDefinition> {
    let scenarioDef: CreateScenarioRequest;

    switch (scenarioType) {
      case 'refund_increase':
        scenarioDef = {
          name: 'What if we increase refund rate by 5%?',
          description: 'Analyze the impact of increasing customer refund acceptance rate by 5 percentage points on CSAT, revenue, and churn.',
          category: ScenarioCategory.REFUND,
          type: ScenarioType.WHAT_IF,
          tenantId,
          parameters: [
            {
              name: 'refund_rate',
              currentValue: 0.05,
              proposedValue: 0.10,
              minValue: 0,
              maxValue: 0.30,
              unit: 'percent',
              category: ScenarioCategory.REFUND,
            },
          ],
          tags: ['refund', 'what-if', 'csat', 'customer-impact'],
        };
        break;

      case 'price_decrease':
        scenarioDef = {
          name: 'What if we decrease prices by 10%?',
          description: 'Analyze the impact of a 10% price reduction on revenue, volume, and profitability.',
          category: ScenarioCategory.PRICING,
          type: ScenarioType.WHAT_IF,
          tenantId,
          parameters: [
            {
              name: 'price',
              currentValue: 100,
              proposedValue: 90,
              minValue: 50,
              maxValue: 150,
              unit: 'currency',
              category: ScenarioCategory.PRICING,
            },
          ],
          constraints: {
            min_margin: 0.20,
          },
          tags: ['pricing', 'what-if', 'revenue'],
        };
        break;

      case 'service_improvement':
        scenarioDef = {
          name: 'What if we improve service quality by 20%?',
          description: 'Analyze the impact of improving service quality on customer satisfaction, retention, and support costs.',
          category: ScenarioCategory.SERVICE,
          type: ScenarioType.WHAT_IF,
          tenantId,
          parameters: [
            {
              name: 'service_quality',
              currentValue: 0.75,
              proposedValue: 0.90,
              minValue: 0.5,
              maxValue: 1.0,
              unit: 'score',
              category: ScenarioCategory.SERVICE,
            },
            {
              name: 'support_response_time',
              currentValue: 24,
              proposedValue: 12,
              minValue: 1,
              maxValue: 48,
              unit: 'hours',
              category: ScenarioCategory.SERVICE,
            },
          ],
          tags: ['service', 'what-if', 'csat', 'retention'],
        };
        break;

      case 'marketing_push':
        scenarioDef = {
          name: 'What if we increase marketing spend by 25%?',
          description: 'Analyze the impact of a 25% increase in marketing budget on customer acquisition, revenue, and ROI.',
          category: ScenarioCategory.MARKETING,
          type: ScenarioType.WHAT_IF,
          tenantId,
          parameters: [
            {
              name: 'marketing_spend',
              currentValue: 100000,
              proposedValue: 125000,
              minValue: 50000,
              maxValue: 500000,
              unit: 'currency',
              category: ScenarioCategory.MARKETING,
            },
          ],
          constraints: {
            max_roi_drop: 0.10,
          },
          tags: ['marketing', 'what-if', 'growth', 'acquisition'],
        };
        break;

      default:
        throw new Error(`Unknown scenario type: ${scenarioType}`);
    }

    return this.createScenario(scenarioDef);
  }

  /**
   * Build a comparative scenario
   */
  async buildComparativeScenario(
    tenantId: string,
    name: string,
    description: string,
    options: Array<{
      parameter: string;
      values: number[];
      unit: string;
      category: ScenarioCategory;
    }>
  ): Promise<ScenarioDefinition> {
    // Use the first value as current, and build parameters for comparison
    const parameters: ScenarioParameter[] = [];

    for (const option of options) {
      for (let i = 0; i < option.values.length; i++) {
        const isBaseline = i === 0;
        parameters.push({
          name: `${option.parameter}_${isBaseline ? 'baseline' : `option${i}`}`,
          currentValue: isBaseline ? option.values[0] : option.values[0],
          proposedValue: option.values[i],
          minValue: Math.min(...option.values) * 0.8,
          maxValue: Math.max(...option.values) * 1.2,
          unit: option.unit,
          category: option.category,
        });
      }
    }

    const scenarioDef: CreateScenarioRequest = {
      name,
      description,
      category: parameters[0]?.category || ScenarioCategory.CUSTOMER,
      type: ScenarioType.COMPARATIVE,
      tenantId,
      parameters,
      tags: ['comparative', 'analysis'],
    };

    return this.createScenario(scenarioDef);
  }

  /**
   * Build a sensitivity analysis scenario
   */
  async buildSensitivityScenario(
    tenantId: string,
    parameter: {
      name: string;
      currentValue: number;
      minValue: number;
      maxValue: number;
      unit: string;
      category: ScenarioCategory;
    },
    steps: number = 10
  ): Promise<ScenarioDefinition> {
    const scenarioDef: CreateScenarioRequest = {
      name: `Sensitivity Analysis: ${parameter.name}`,
      description: `Analyze how changes to ${parameter.name} (from ${parameter.minValue} to ${parameter.maxValue}) impact business metrics.`,
      category: parameter.category,
      type: ScenarioType.SENSITIVITY,
      tenantId,
      parameters: [
        {
          ...parameter,
          proposedValue: parameter.currentValue,
        },
      ],
      tags: ['sensitivity', 'analysis'],
    };

    const scenario = await this.createScenario(scenarioDef);

    // Add sensitivity metadata as tags
    scenario.tags.push(`steps:${steps}`, `range:${parameter.minValue}-${parameter.maxValue}`);
    await ScenarioModel.updateOne(
      { _id: (scenario as unknown as ScenarioDocument)._id },
      { $set: { tags: scenario.tags } }
    );

    return scenario;
  }

  /**
   * Validate scenario parameters
   */
  validateScenario(scenario: ScenarioDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!scenario.name || scenario.name.trim() === '') {
      errors.push('Scenario name is required');
    }
    if (!scenario.description || scenario.description.trim() === '') {
      errors.push('Scenario description is required');
    }
    if (!scenario.parameters || scenario.parameters.length === 0) {
      errors.push('At least one parameter is required');
    }

    // Validate each parameter
    for (const param of scenario.parameters) {
      if (param.currentValue === param.proposedValue) {
        errors.push(`Parameter "${param.name}" has no change from current value`);
      }
      if (param.minValue !== undefined && param.proposedValue < param.minValue) {
        errors.push(`Parameter "${param.name}" proposed value is below minimum`);
      }
      if (param.maxValue !== undefined && param.proposedValue > param.maxValue) {
        errors.push(`Parameter "${param.name}" proposed value exceeds maximum`);
      }
    }

    // Check constraints
    for (const [key, constraintValue] of Object.entries(scenario.constraints)) {
      const param = scenario.parameters.find(p => p.name === key);
      if (!param) {
        errors.push(`Constraint references unknown parameter: ${key}`);
      } else if (param.proposedValue > constraintValue) {
        errors.push(`Constraint violation: ${key} exceeds constraint value`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Convert Mongoose document to ScenarioDefinition
   */
  private toScenarioDefinition(doc: ScenarioDocument): ScenarioDefinition {
    return {
      id: doc._id.toHexString(),
      name: doc.name,
      description: doc.description,
      category: doc.category,
      type: doc.type,
      parameters: doc.parameters,
      constraints: doc.constraints instanceof Map
        ? Object.fromEntries(doc.constraints)
        : doc.constraints,
      tenantId: doc.tenantId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      tags: doc.tags,
      isActive: doc.isActive,
    };
  }
}

interface ScenarioDocument extends ScenarioDefinition {
  _id: { toHexString: () => string };
  createdAt: Date;
  updatedAt: Date;
}

export const scenarioBuilder = new ScenarioBuilder();
