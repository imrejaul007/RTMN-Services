import mongoose, { Document, Schema } from 'mongoose';

export interface IFactor extends Document {
  // Core identification
  factorId: string;
  tenantId: string;
  name: string;
  category: 'customer' | 'transaction' | 'history' | 'business' | 'risk' | 'value';
  description: string;

  // Scoring configuration
  weight: number; // Base weight (0-100)
  scoreRanges: Array<{
    min: number;
    max: number;
    score: number;
    label: string;
  }>;

  // Value mapping
  valueConfig: {
    type: 'numeric' | 'categorical' | 'boolean' | 'date';
    mappings?: Array<{
      value: unknown;
      score: number;
    }>;
    formula?: string; // For calculated scores
  };

  // Risk indicators
  isRiskFactor: boolean;
  riskDirection: 'positive' | 'negative' | 'neutral';
  riskThreshold?: number;

  // Business rules
  isActive: boolean;
  priority: number;

  // Metadata
  metadata?: Record<string, unknown>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

const FactorSchema = new Schema<IFactor>(
  {
    factorId: {
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
    category: {
      type: String,
      required: true,
      enum: ['customer', 'transaction', 'history', 'business', 'risk', 'value']
    },
    description: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    scoreRanges: [
      {
        min: Number,
        max: Number,
        score: Number,
        label: String
      }
    ],
    valueConfig: {
      type: {
        type: String,
        required: true,
        enum: ['numeric', 'categorical', 'boolean', 'date']
      },
      mappings: [
        {
          value: Schema.Types.Mixed,
          score: Number
        }
      ],
      formula: String
    },
    isRiskFactor: {
      type: Boolean,
      default: false
    },
    riskDirection: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    riskThreshold: Number,
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    priority: {
      type: Number,
      default: 50,
      min: 1,
      max: 100
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    collection: 'factors'
  }
);

// Indexes
FactorSchema.index({ tenantId: 1, isActive: 1, category: 1 });
FactorSchema.index({ tenantId: 1, priority: -1 });
FactorSchema.index({ tenantId: 1, isRiskFactor: 1 });

// Methods
FactorSchema.methods.calculateScore = function(value: unknown): number {
  const config = this.valueConfig;

  if (config.type === 'boolean') {
    const boolValue = Boolean(value);
    const mapping = config.mappings?.find(m => m.value === boolValue);
    return mapping?.score ?? 50;
  }

  if (config.type === 'categorical' && config.mappings) {
    const mapping = config.mappings.find(m => m.value === value);
    return mapping?.score ?? 50;
  }

  if (config.type === 'numeric' && typeof value === 'number') {
    const range = this.scoreRanges?.find(r => value >= r.min && value < r.max);
    return range?.score ?? 50;
  }

  if (config.type === 'date' && value instanceof Date) {
    const range = this.scoreRanges?.find(r => {
      const ageInDays = Math.floor((Date.now() - value.getTime()) / (1000 * 60 * 60 * 24));
      return ageInDays >= r.min && ageInDays < r.max;
    });
    return range?.score ?? 50;
  }

  return 50; // Default score
};

FactorSchema.methods.calculateWeightedScore = function(value: unknown): number {
  const baseScore = this.calculateScore(value);
  return (baseScore * this.weight) / 100;
};

// Static methods
FactorSchema.statics.findActiveByCategory = function(
  tenantId: string,
  category: IFactor['category']
) {
  return this.find({
    tenantId,
    isActive: true,
    category
  }).sort({ priority: -1 });
};

FactorSchema.statics.findRiskFactors = function(tenantId: string) {
  return this.find({
    tenantId,
    isActive: true,
    isRiskFactor: true
  }).sort({ priority: -1 });
};

FactorSchema.statics.findValueFactors = function(tenantId: string) {
  return this.find({
    tenantId,
    isActive: true,
    category: 'value'
  }).sort({ priority: -1 });
};

// Seed default factors
FactorSchema.statics.seedDefaults = async function(tenantId: string) {
  const defaults: Partial<IFactor>[] = [
    // Customer factors
    {
      factorId: `${tenantId}:account_age`,
      tenantId,
      name: 'Account Age',
      category: 'customer',
      description: 'How long the customer has been with the business',
      weight: 15,
      valueConfig: {
        type: 'numeric',
        mappings: [
          { value: { min: 0, max: 30 }, score: 20 },
          { value: { min: 30, max: 90 }, score: 40 },
          { value: { min: 90, max: 365 }, score: 70 },
          { value: { min: 365, max: Infinity }, score: 100 }
        ]
      },
      scoreRanges: [
        { min: 0, max: 30, score: 20, label: 'New' },
        { min: 30, max: 90, score: 40, label: 'Developing' },
        { min: 90, max: 365, score: 70, label: 'Established' },
        { min: 365, max: 99999, score: 100, label: 'Loyal' }
      ]
    },
    // Transaction factors
    {
      factorId: `${tenantId}:transaction_amount`,
      tenantId,
      name: 'Transaction Amount',
      category: 'transaction',
      description: 'The monetary value of the transaction',
      weight: 25,
      valueConfig: { type: 'numeric' },
      scoreRanges: [
        { min: 0, max: 5000, score: 30, label: 'Low' },
        { min: 5000, max: 25000, score: 60, label: 'Medium' },
        { min: 25000, max: 100000, score: 85, label: 'High' },
        { min: 100000, max: Infinity, score: 100, label: 'Premium' }
      ]
    },
    // History factors
    {
      factorId: `${tenantId}:refund_history`,
      tenantId,
      name: 'Previous Refunds',
      category: 'history',
      description: 'Number of previous refund requests',
      weight: 30,
      valueConfig: { type: 'numeric' },
      isRiskFactor: true,
      riskDirection: 'negative',
      scoreRanges: [
        { min: 0, max: 1, score: 100, label: 'None' },
        { min: 1, max: 3, score: 70, label: 'Low' },
        { min: 3, max: 5, score: 40, label: 'Moderate' },
        { min: 5, max: Infinity, score: 10, label: 'High Risk' }
      ]
    },
    {
      factorId: `${tenantId}:dispute_history`,
      tenantId,
      name: 'Previous Disputes',
      category: 'history',
      description: 'Number of previous payment disputes',
      weight: 35,
      valueConfig: { type: 'numeric' },
      isRiskFactor: true,
      riskDirection: 'negative',
      scoreRanges: [
        { min: 0, max: 1, score: 100, label: 'None' },
        { min: 1, max: 2, score: 60, label: 'Low' },
        { min: 2, max: Infinity, score: 10, label: 'High Risk' }
      ]
    },
    // Business factors
    {
      factorId: `${tenantId}:customer_tier`,
      tenantId,
      name: 'Customer Tier',
      category: 'value',
      description: 'Customer loyalty tier level',
      weight: 20,
      valueConfig: {
        type: 'categorical',
        mappings: [
          { value: 'standard', score: 30 },
          { value: 'silver', score: 50 },
          { value: 'gold', score: 75 },
          { value: 'platinum', score: 90 },
          { value: 'vip', score: 100 }
        ]
      }
    },
    {
      factorId: `${tenantId}:lifetime_value`,
      tenantId,
      name: 'Lifetime Value',
      category: 'value',
      description: 'Total value the customer has brought to the business',
      weight: 30,
      valueConfig: { type: 'numeric' },
      scoreRanges: [
        { min: 0, max: 10000, score: 20, label: 'Bronze' },
        { min: 10000, max: 50000, score: 50, label: 'Silver' },
        { min: 50000, max: 200000, score: 80, label: 'Gold' },
        { min: 200000, max: Infinity, score: 100, label: 'Platinum' }
      ]
    }
  ];

  for (const factor of defaults) {
    await this.findOneAndUpdate(
      { factorId: factor.factorId },
      factor,
      { upsert: true, new: true }
    );
  }
};

export const Factor = mongoose.model<IFactor>('Factor', FactorSchema);
