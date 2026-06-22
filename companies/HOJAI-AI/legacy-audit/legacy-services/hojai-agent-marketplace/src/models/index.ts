import mongoose, { Schema, Document } from 'mongoose';
import { Agent, AgentInstance, AgentSubscription, AgentReview } from '../types';

export interface IAgent extends Document {
  _id: mongoose.Types.ObjectId;
  agentId: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  longDescription?: string;
  icon?: string;
  screenshots?: string[];
  videoUrl?: string;
  demoUrl?: string;
  industry: string;
  category: string;
  tags: string[];
  capabilities: any[];
  integrations: any[];
  requirements?: any;
  pricing: any[];
  pricingModel: string;
  vendorId: string;
  vendorName: string;
  vendorLogo?: string;
  vendorWebsite?: string;
  supportEmail?: string;
  documentationUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  status: string;
  currentVersion: string;
  versions?: any[];
  metrics?: any;
  featured: boolean;
  trending: boolean;
  new: boolean;
  verified: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    agentId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, maxlength: 100, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    tagline: { type: String, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    longDescription: { type: String, maxlength: 10000 },
    icon: String,
    screenshots: [String],
    videoUrl: String,
    demoUrl: String,
    industry: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    tags: [String],
    capabilities: [Schema.Types.Mixed],
    integrations: [Schema.Types.Mixed],
    requirements: Schema.Types.Mixed,
    pricing: [Schema.Types.Mixed],
    pricingModel: { type: String, default: 'free' },
    vendorId: { type: String, required: true, index: true },
    vendorName: { type: String, required: true },
    vendorLogo: String,
    vendorWebsite: String,
    supportEmail: String,
    documentationUrl: String,
    privacyPolicyUrl: String,
    termsOfServiceUrl: String,
    status: { type: String, enum: ['draft', 'published', 'archived', 'deprecated'], default: 'draft' },
    currentVersion: { type: String, default: '1.0.0' },
    versions: [Schema.Types.Mixed],
    metrics: Schema.Types.Mixed,
    featured: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
    new: { type: Boolean, default: false, index: true },
    verified: { type: Boolean, default: false },
    metaTitle: { type: String, maxlength: 60 },
    metaDescription: { type: String, maxlength: 160 }
  },
  {
    timestamps: true,
    collection: 'marketplace_agents'
  }
);

// Indexes
AgentSchema.index({ status: 1, featured: 1 });
AgentSchema.index({ status: 1, trending: 1 });
AgentSchema.index({ industry: 1, category: 1, status: 1 });
AgentSchema.index({ tags: 1 });
AgentSchema.index({ 'pricing.tier': 1 });
AgentSchema.index({ name: 'text', description: 'text', tagline: 'text' });

// Methods
AgentSchema.methods.publish = function () {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

AgentSchema.methods.archive = function () {
  this.status = 'archived';
  return this.save();
};

AgentSchema.methods.incrementInstalls = function () {
  if (!this.metrics) this.metrics = {};
  this.metrics.totalInstalls = (this.metrics.totalInstalls || 0) + 1;
  return this.save();
};

AgentSchema.methods.updateMetrics = function (updates: any) {
  this.metrics = { ...this.metrics, ...updates };
  return this.save();
};

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

export interface IAgentInstance extends Document {
  _id: mongoose.Types.ObjectId;
  instanceId: string;
  agentId: string;
  tenantId: string;
  userId: string;
  name?: string;
  config: Record<string, any>;
  status: string;
  tier: string;
  usage: {
    conversations: number;
    messages: number;
    apiCalls: number;
    storage: number;
  };
  limits?: {
    maxConversations?: number;
    maxMessages?: number;
    maxApiCalls?: number;
  };
  metrics?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AgentInstanceSchema = new Schema<IAgentInstance>(
  {
    instanceId: { type: String, required: true, unique: true, index: true },
    agentId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    name: String,
    config: { type: Map, of: Schema.Types.Mixed, default: () => new Map() },
    status: { type: String, enum: ['active', 'paused', 'stopped', 'error'], default: 'active' },
    tier: { type: String, enum: ['free', 'starter', 'professional', 'enterprise'], default: 'starter' },
    usage: {
      conversations: { type: Number, default: 0 },
      messages: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
      storage: { type: Number, default: 0 }
    },
    limits: {
      maxConversations: Number,
      maxMessages: Number,
      maxApiCalls: Number
    },
    metrics: Schema.Types.Mixed
  },
  {
    timestamps: true,
    collection: 'agent_instances'
  }
);

AgentInstanceSchema.index({ agentId: 1, tenantId: 1 });
AgentInstanceSchema.index({ status: 1 });

AgentInstanceSchema.methods.incrementUsage = function (type: 'conversations' | 'messages' | 'apiCalls') {
  this.usage[type] = (this.usage[type] || 0) + 1;
  return this.save();
};

AgentInstanceSchema.methods.checkLimit = function (type: string): boolean {
  if (!this.limits || !this.limits[type as keyof typeof this.limits]) return true;
  const current = this.usage[type as keyof typeof this.usage] || 0;
  const limit = this.limits[type as keyof typeof this.limits]!;
  return current < limit;
};

export const AgentInstance = mongoose.model<IAgentInstance>('AgentInstance', AgentInstanceSchema);

export interface IAgentSubscription extends Document {
  _id: mongoose.Types.ObjectId;
  subscriptionId: string;
  instanceId: string;
  tenantId: string;
  tier: string;
  status: string;
  startDate: Date;
  endDate?: Date;
  trialEndsAt?: Date;
  autoRenew: boolean;
  billingCycle: string;
  nextBillingDate?: Date;
  price: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSubscriptionSchema = new Schema<IAgentSubscription>(
  {
    subscriptionId: { type: String, required: true, unique: true, index: true },
    instanceId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    tier: { type: String, enum: ['free', 'starter', 'professional', 'enterprise'], required: true },
    status: { type: String, enum: ['active', 'cancelled', 'expired', 'trial'], required: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    trialEndsAt: Date,
    autoRenew: { type: Boolean, default: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    nextBillingDate: Date,
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' }
  },
  {
    timestamps: true,
    collection: 'agent_subscriptions'
  }
);

AgentSubscriptionSchema.index({ instanceId: 1, status: 1 });
AgentSubscriptionSchema.index({ tenantId: 1, status: 1 });

export const AgentSubscription = mongoose.model<IAgentSubscription>('AgentSubscription', AgentSubscriptionSchema);

export interface IAgentReview extends Document {
  _id: mongoose.Types.ObjectId;
  reviewId: string;
  agentId: string;
  userId: string;
  tenantId: string;
  rating: number;
  title?: string;
  comment?: string;
  pros?: string[];
  cons?: string[];
  response?: string;
  helpful: number;
  createdAt: Date;
}

const AgentReviewSchema = new Schema<IAgentReview>(
  {
    reviewId: { type: String, required: true, unique: true, index: true },
    agentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: String,
    pros: [String],
    cons: [String],
    response: String,
    helpful: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'agent_reviews'
  }
);

AgentReviewSchema.index({ agentId: 1, createdAt: -1 });
AgentReviewSchema.index({ agentId: 1, rating: -1 });

AgentReviewSchema.statics.getAverageRating = async function (agentId: string) {
  const result = await this.aggregate([
    { $match: { agentId } },
    { $group: { _id: '$agentId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  return result[0] || { avgRating: 0, count: 0 };
};

export const AgentReview = mongoose.model<IAgentReview>('AgentReview', AgentReviewSchema);
