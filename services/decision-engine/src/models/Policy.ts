import mongoose, { Document, Schema } from 'mongoose';
import { Policy, PolicyCondition, PolicyConstraint, PolicyOutcome, DecisionType } from '../types';

export interface IPolicy extends Document {
  // Core identification
  policyId: string;
  tenantId: string;
  name: string;
  description: string;

  // Applicability
  type: DecisionType[];
  priority: number;
  isActive: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;

  // Conditions (JSONLogic-style)
  conditions: PolicyCondition[];

  // Constraints
  constraints: PolicyConstraint[];

  // Outcomes
  outcomes: PolicyOutcome[];

  // Override settings
  allowOverride: boolean;
  overrideRoles?: string[];

  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];

  // Versioning
  version: number;
  previousVersion?: string;

  // Audit
  createdBy: string;
  updatedBy?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const PolicySchema = new Schema<IPolicy>(
  {
    policyId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    type: {
      type: [String],
      required: true,
      enum: ['refund', 'cancel', 'discount', 'escalate', 'policy_exception'],
      index: true
    },
    priority: {
      type: Number,
      required: true,
      default: 50,
      min: 1,
      max: 100
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    effectiveFrom: {
      type: Date
    },
    effectiveTo: {
      type: Date
    },
    conditions: [
      {
        field: { type: String, required: true },
        operator: {
          type: String,
          required: true,
          enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'exists']
        },
        value: { type: Schema.Types.Mixed, required: true },
        group: String
      }
    ],
    constraints: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          required: true,
          enum: ['amount', 'count', 'time', 'frequency']
        },
        operator: {
          type: String,
          required: true,
          enum: ['lte', 'gte', 'eq', 'between']
        },
        value: { type: Schema.Types.Mixed, required: true },
        period: String
      }
    ],
    outcomes: [
      {
        condition: { type: String, required: true }, // JSONLogic string
        outcome: {
          type: String,
          required: true,
          enum: ['approved', 'denied', 'escalated', 'partial', 'requires_review']
        },
        amount: { type: Schema.Types.Mixed },
        reasoning: { type: String, required: true }
      }
    ],
    allowOverride: {
      type: Boolean,
      default: true
    },
    overrideRoles: [String],
    metadata: {
      type: Schema.Types.Mixed
    },
    tags: [String],
    version: {
      type: Number,
      default: 1
    },
    previousVersion: {
      type: String
    },
    createdBy: {
      type: String,
      required: true
    },
    updatedBy: String
  },
  {
    timestamps: true,
    collection: 'policies'
  }
);

// Indexes
PolicySchema.index({ tenantId: 1, isActive: 1, type: 1 });
PolicySchema.index({ tenantId: 1, priority: -1 });
PolicySchema.index({ tenantId: 1, tags: 1 });

// Compound index for policy matching
PolicySchema.index({ tenantId: 1, isActive: 1, 'type': 1, priority: -1 });

// Methods
PolicySchema.methods.isEffective = function(): boolean {
  const now = new Date();
  if (this.effectiveFrom && now < this.effectiveFrom) {
    return false;
  }
  if (this.effectiveTo && now > this.effectiveTo) {
    return false;
  }
  return true;
};

PolicySchema.methods.matchesType = function(type: DecisionType): boolean {
  return this.type.includes(type);
};

// Static methods
PolicySchema.statics.findActiveByType = function(
  tenantId: string,
  type: DecisionType
) {
  const now = new Date();
  return this.find({
    tenantId,
    isActive: true,
    type,
    $or: [
      { effectiveFrom: { $exists: false } },
      { effectiveFrom: { $lte: now } }
    ],
    $or: [
      { effectiveTo: { $exists: false } },
      { effectiveTo: { $gte: now } }
    ]
  }).sort({ priority: -1 });
};

PolicySchema.statics.findApplicablePolicies = async function(
  tenantId: string,
  type: DecisionType,
  context: Record<string, unknown>
): Promise<IPolicy[]> {
  const policies = await this.find({
    tenantId,
    isActive: true,
    type,
    $or: [
      { effectiveFrom: { $exists: false } },
      { effectiveFrom: { $lte: new Date() } }
    ],
    $or: [
      { effectiveTo: { $exists: false } },
      { effectiveTo: { $gte: new Date() } }
    ]
  }).sort({ priority: -1 });

  // Filter by conditions
  return policies.filter(policy => {
    return policy.conditions.every(condition => {
      const fieldValue = getNestedValue(context, condition.field);
      return evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  });
};

// Helper function to get nested values
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Helper function to evaluate conditions
function evaluateCondition(
  fieldValue: unknown,
  operator: string,
  conditionValue: unknown
): boolean {
  switch (operator) {
    case 'eq':
      return fieldValue === conditionValue;
    case 'neq':
      return fieldValue !== conditionValue;
    case 'gt':
      return typeof fieldValue === 'number' && typeof conditionValue === 'number'
        && fieldValue > conditionValue;
    case 'gte':
      return typeof fieldValue === 'number' && typeof conditionValue === 'number'
        && fieldValue >= conditionValue;
    case 'lt':
      return typeof fieldValue === 'number' && typeof conditionValue === 'number'
        && fieldValue < conditionValue;
    case 'lte':
      return typeof fieldValue === 'number' && typeof conditionValue === 'number'
        && fieldValue <= conditionValue;
    case 'in':
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'nin':
      return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
    case 'contains':
      return typeof fieldValue === 'string' && typeof conditionValue === 'string'
        && fieldValue.includes(conditionValue);
    case 'exists':
      return conditionValue ? fieldValue !== undefined : fieldValue === undefined;
    default:
      return false;
  }
}

// Pre-save hook to update version
PolicySchema.pre('save', function(next) {
  if (this.isModified()) {
    this.version += 1;
  }
  next();
});

export const Policy = mongoose.model<IPolicy>('Policy', PolicySchema);
