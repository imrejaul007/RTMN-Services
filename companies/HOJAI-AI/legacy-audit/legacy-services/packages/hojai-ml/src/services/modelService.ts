import mongoose, { Schema, Model } from 'mongoose';
import Redis from 'ioredis';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { Model as ModelType, ModelTier, ModelType, ModelStatus, RoutingRule, PromptTemplate } from '../types/index.js';

// ============================================================================
// MODELS
// ============================================================================

const ModelSchema = new Schema({
  tenantId: { type: String, sparse: true, index: true },
  name: { type: String, required: true },
  version: { type: String, required: true },
  description: String,
  tier: { type: String, enum: Object.values(ModelTier), required: true },
  type: { type: String, enum: Object.values(ModelType), required: true },
  domain: String,
  provider: { type: String, enum: ['openai', 'anthropic', 'meta', 'google', 'custom', 'hojai'], required: true },
  baseModel: String,
  config: {
    temperature: Number,
    maxTokens: Number,
    topP: Number,
    frequencyPenalty: Number,
    presencePenalty: Number
  },
  training: {
    datasetSize: Number,
    fineTunedFrom: String,
    trainingDate: Date,
    epochs: Number,
    learningRate: Number
  },
  metrics: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1: Number,
    auc: Number,
    rmse: Number,
    latencyMs: Number,
    costPerCall: Number
  },
  capabilities: [String],
  inputSchema: { type: Map, of: Schema.Types.Mixed },
  outputSchema: { type: Map, of: Schema.Types.Mixed },
  accessControl: {
    tenantIds: [String],
    requiresLicense: { type: Boolean, default: false },
    licenseKey: String,
    maxCallsPerDay: Number
  },
  costPerToken: Number,
  costPerCall: Number,
  status: { type: String, enum: Object.values(ModelStatus), default: ModelStatus.DEPLOYED },
  routingHints: {
    latencySensitive: { type: Boolean, default: false },
    costSensitive: { type: Boolean, default: false },
    accuracySensitive: { type: Boolean, default: false },
    fallbackModel: String
  }
}, { timestamps: true });

ModelSchema.index({ tier: 1, type: 1, status: 1 });
ModelSchema.index({ tenantId: 1, tier: 1 });

export const ModelModel = mongoose.model('Model', ModelSchema);

// ============================================================================
// ROUTING RULES
// ============================================================================

const RoutingRuleSchema = new Schema({
  tenantId: { type: String, sparse: true, index: true },
  name: { type: String, required: true },
  description: String,
  conditions: [{
    field: String,
    operator: String,
    value: Schema.Types.Mixed
  }],
  modelId: { type: String, required: true },
  priority: { type: Number, default: 0 },
  fallbackModelId: String,
  active: { type: Boolean, default: true }
}, { timestamps: true });

RoutingRuleSchema.index({ tenantId: 1, priority: -1 });

export const RoutingRuleModel = mongoose.model('RoutingRule', RoutingRuleSchema);

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const PromptTemplateSchema = new Schema({
  tenantId: { type: String, sparse: true, index: true },
  name: { type: String, required: true },
  description: String,
  task: { type: String, required: true },
  modelType: { type: String, enum: Object.values(ModelType), required: true },
  systemPrompt: { type: String, required: true },
  userPromptTemplate: { type: String, required: true },
  variables: [{
    name: String,
    type: String,
    required: { type: Boolean, default: true },
    defaultValue: String
  }],
  config: {
    temperature: Number,
    maxTokens: Number
  },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export const PromptTemplateModel = mongoose.model('PromptTemplate', PromptTemplateSchema);

// ============================================================================
// MODEL SERVICE
// ============================================================================

export class ModelService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Register a model
   */
  async registerModel(params: Omit<ModelType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelType> {
    const model = new ModelModel({ ...params, id: uuid() });
    await model.save();
    return model.toObject() as ModelType;
  }

  /**
   * Get best model for a task
   */
  async getBestModel(params: {
    tenantId: string;
    task: string;
    domain?: string;
    constraints?: {
      maxLatencyMs?: number;
      maxCost?: number;
      minAccuracy?: number;
    };
  }): Promise<ModelType | null> {
    const { tenantId, task, domain, constraints } = params;

    // Check cache first
    const cacheKey = `model:${tenantId}:${task}:${domain || 'any'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get routing rules for this tenant
    const rules = await RoutingRuleModel.find({
      tenantId: { $in: [tenantId, null] }, // Include global rules
      active: true
    }).sort({ priority: -1 });

    // Find matching rule
    for (const rule of rules) {
      const matches = this.evaluateConditions(rule.conditions, params);
      if (matches) {
        const model = await ModelModel.findOne({ _id: rule.modelId, status: ModelStatus.DEPLOYED });
        if (model) {
          const result = model.toObject() as ModelType;
          await this.redis.setex(cacheKey, 300, JSON.stringify(result)); // Cache 5 minutes
          return result;
        }
      }
    }

    // Fallback: find best available model
    const query: Record<string, unknown> = {
      tier: { $in: [ModelTier.GLOBAL, ModelTier.VERTICAL] },
      status: ModelStatus.DEPLOYED
    };

    if (domain) {
      query.domain = domain;
    }

    const models = await ModelModel.find(query).sort({ 'metrics.accuracy': -1 }).limit(1);
    if (models.length > 0) {
      return models[0].toObject() as ModelType;
    }

    return null;
  }

  private evaluateConditions(conditions: any[], params: any): boolean {
    for (const cond of conditions) {
      const value = params[cond.field];
      switch (cond.operator) {
        case 'equals':
          if (value !== cond.value) return false;
          break;
        case 'contains':
          if (!String(value).includes(cond.value)) return false;
          break;
        case 'in':
          if (!cond.value.includes(value)) return false;
          break;
        case 'greater_than':
          if (value <= cond.value) return false;
          break;
        case 'less_than':
          if (value >= cond.value) return false;
          break;
      }
    }
    return true;
  }

  /**
   * Execute inference
   */
  async infer(params: {
    tenantId: string;
    modelId: string;
    input: Record<string, any>;
    parameters?: Record<string, any>;
  }): Promise<{ output: any; tokens?: number; latencyMs: number; cost: number }> {
    const { tenantId, modelId, input, parameters } = params;

    const model = await ModelModel.findById(modelId);
    if (!model) throw new Error('Model not found');

    const startTime = Date.now();

    let output: any;
    let tokensUsed: number | undefined;
    let cost: number;

    switch (model.provider) {
      case 'openai':
        const openaiResult = await this.callOpenAI(model, input, parameters);
        output = openaiResult.output;
        tokensUsed = openaiResult.tokens;
        cost = (tokensUsed || 0) * (model.costPerToken || 0.0001);
        break;

      case 'custom':
      case 'hojai':
        // Call custom model endpoint
        output = await this.callCustomModel(model, input);
        cost = model.costPerCall || 0;
        break;

      default:
        throw new Error(`Provider ${model.provider} not supported`);
    }

    const latencyMs = Date.now() - startTime;

    // Update model metrics (rolling average)
    await ModelModel.updateOne(
      { _id: modelId },
      {
        $set: { 'metrics.latencyMs': latencyMs }
      }
    );

    return { output, tokens: tokensUsed, latencyMs, cost };
  }

  private async callOpenAI(model: any, input: any, params?: any): Promise<{ output: any; tokens: number }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Mock for development
      return { output: { response: 'Mock response' }, tokens: 100 };
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model.baseModel || 'gpt-4',
        messages: input.messages || [{ role: 'user', content: input.text }],
        temperature: params?.temperature || model.config?.temperature || 0.7,
        max_tokens: params?.maxTokens || model.config?.maxTokens || 1000
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` }
      }
    );

    return {
      output: { response: response.data.choices[0].message.content },
      tokens: response.data.usage.total_tokens
    };
  }

  private async callCustomModel(model: any, input: any): Promise<any> {
    // Call internal model service
    const response = await axios.post(model.config.endpoint, input, {
      timeout: 30000
    });
    return response.data;
  }

  /**
   * Create routing rule
   */
  async createRoutingRule(rule: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoutingRule> {
    const doc = new RoutingRuleModel({ ...rule, id: uuid() });
    await doc.save();
    return doc.toObject() as RoutingRule;
  }

  /**
   * Create prompt template
   */
  async createPromptTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptTemplate> {
    const doc = new PromptTemplateModel({ ...template, id: uuid() });
    await doc.save();
    return doc.toObject() as PromptTemplate;
  }

  /**
   * Render prompt from template
   */
  renderPrompt(template: PromptTemplate, variables: Record<string, any>): { system: string; user: string } {
    let userPrompt = template.userPromptTemplate;

    for (const variable of template.variables) {
      const value = variables[variable.name] || variable.defaultValue;
      if (variable.required && !value) {
        throw new Error(`Missing required variable: ${variable.name}`);
      }
      userPrompt = userPrompt.replace(`{{${variable.name}}}`, String(value));
    }

    return {
      system: template.systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Get available models for tenant
   */
  async getAvailableModels(tenantId: string, tier?: ModelTier): Promise<ModelType[]> {
    const query: Record<string, unknown> = {
      status: ModelStatus.DEPLOYED,
      $or: [
        { tenantId: null }, // Global models
        { tenantId }, // Tenant's own models
        { 'accessControl.tenantIds': tenantId } // Licensed models
      ]
    };

    if (tier) query.tier = tier;

    const models = await ModelModel.find(query);
    return models.map(m => m.toObject() as ModelType);
  }

  /**
   * Get cost estimate
   */
  async getCostEstimate(tenantId: string, task: string, estimatedTokens?: number): Promise<{ perCall: number; monthlyEstimate: number }> {
    const model = await this.getBestModel({ tenantId, task });
    if (!model) {
      return { perCall: 0, monthlyEstimate: 0 };
    }

    const perCall = model.costPerCall || (model.costPerToken || 0) * (estimatedTokens || 1000);
    const monthlyEstimate = perCall * 1000 * 30; // Assume 1000 calls/day

    return { perCall, monthlyEstimate };
  }
}

export const modelService = new ModelService();
