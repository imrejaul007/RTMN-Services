import mongoose, { Schema, Document } from 'mongoose';
import {
  ScenarioDefinition as IScenarioDefinition,
  ScenarioCategory,
  ScenarioType,
  ScenarioParameter,
} from '../types';

export interface ScenarioDocument extends Omit<IScenarioDefinition, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const ScenarioParameterSchema = new Schema<ScenarioParameter>(
  {
    name: { type: String, required: true },
    currentValue: { type: Number, required: true },
    proposedValue: { type: Number, required: true },
    minValue: { type: Number },
    maxValue: { type: Number },
    unit: { type: String, required: true },
    category: {
      type: String,
      enum: Object.values(ScenarioCategory),
      required: true,
    },
  },
  { _id: false }
);

const ScenarioSchema = new Schema<ScenarioDocument>(
  {
    name: { type: String, required: true, maxlength: 200, index: true },
    description: { type: String, maxlength: 1000 },
    category: {
      type: String,
      enum: Object.values(ScenarioCategory),
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(ScenarioType),
      required: true,
      index: true,
    },
    parameters: { type: [ScenarioParameterSchema], required: true, validate: [arr => arr.length > 0, 'At least one parameter is required'] },
    constraints: { type: Map, of: Number, default: {} },
    tenantId: { type: String, required: true, index: true },
    tags: [{ type: String, index: true }],
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    collection: 'scenarios',
  }
);

// Virtual for id
ScenarioSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Compound indexes
ScenarioSchema.index({ tenantId: 1, category: 1 });
ScenarioSchema.index({ tenantId: 1, type: 1 });
ScenarioSchema.index({ tenantId: 1, isActive: 1 });

// Static methods
ScenarioSchema.statics.findByTenant = function (
  tenantId: string,
  options: {
    category?: ScenarioCategory;
    type?: ScenarioType;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const query: Record<string, unknown> = { tenantId };

  if (options.category) {
    query.category = options.category;
  }
  if (options.type) {
    query.type = options.type;
  }
  if (typeof options.isActive === 'boolean') {
    query.isActive = options.isActive;
  }
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { description: { $regex: options.search, $options: 'i' } },
      { tags: { $in: [new RegExp(options.search, 'i')] } },
    ];
  }

  return this.find(query)
    .sort({ updatedAt: -1 })
    .skip(options.offset || 0)
    .limit(options.limit || 50);
};

ScenarioSchema.statics.countByTenant = function (
  tenantId: string,
  options: {
    category?: ScenarioCategory;
    type?: ScenarioType;
    isActive?: boolean;
  } = {}
) {
  const query: Record<string, unknown> = { tenantId };

  if (options.category) {
    query.category = options.category;
  }
  if (options.type) {
    query.type = options.type;
  }
  if (typeof options.isActive === 'boolean') {
    query.isActive = options.isActive;
  }

  return this.countDocuments(query);
};

ScenarioSchema.statics.findByIdAndTenant = function (
  scenarioId: string,
  tenantId: string
) {
  return this.findOne({ _id: scenarioId, tenantId });
};

// Instance methods
ScenarioSchema.methods.validateParameters = function (): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const param of this.parameters) {
    if (param.minValue !== undefined && param.proposedValue < param.minValue) {
      errors.push(
        `Parameter "${param.name}" proposed value (${param.proposedValue}) is below minimum (${param.minValue})`
      );
    }
    if (param.maxValue !== undefined && param.proposedValue > param.maxValue) {
      errors.push(
        `Parameter "${param.name}" proposed value (${param.proposedValue}) exceeds maximum (${param.maxValue})`
      );
    }
  }

  // Check constraints
  const constraints = this.constraints as Map<string, number>;
  if (constraints) {
    for (const [key, value] of Object.entries(constraints.toObject ? constraints.toObject() : {})) {
      const param = this.parameters.find(p => p.name === key);
      if (param && param.proposedValue > value) {
        errors.push(
          `Parameter "${key}" proposed value (${param.proposedValue}) exceeds constraint (${value})`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
};

export const ScenarioModel = mongoose.model<ScenarioDocument>('Scenario', ScenarioSchema);
