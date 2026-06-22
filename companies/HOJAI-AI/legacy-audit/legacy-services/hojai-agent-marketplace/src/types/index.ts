import { z } from 'zod';

// ============ AGENT TIER ============
export const AgentTierEnum = z.enum(['free', 'starter', 'professional', 'enterprise']);
export type AgentTier = z.infer<typeof AgentTierEnum>;

// ============ AGENT STATUS ============
export const AgentStatusEnum = z.enum(['draft', 'published', 'archived', 'deprecated']);
export type AgentStatus = z.infer<typeof AgentStatusEnum>;

// ============ INDUSTRY ============
export const IndustryEnum = z.enum([
  'banking',
  'healthcare',
  'restaurant',
  'retail',
  'travel',
  'hr',
  'ecommerce',
  'education',
  'real_estate',
  'logistics',
  'telecom',
  'insurance',
  'government',
  'general'
]);
export type Industry = z.infer<typeof IndustryEnum>;

// ============ AGENT CATEGORY ============
export const AgentCategoryEnum = z.enum([
  'customer_support',
  'sales',
  'marketing',
  'operations',
  'hr',
  'finance',
  'it',
  'compliance',
  'analytics',
  'automation',
  'general'
]);
export type AgentCategory = z.infer<typeof AgentCategoryEnum>;

// ============ AGENT CAPABILITY ============
export const AgentCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    required: z.boolean().default(false),
    default: z.any().optional(),
    description: z.string().optional()
  })).optional(),
  output: z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    description: z.string()
  }).optional()
});
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;

// ============ AGENT PRICING ============
export const AgentPricingSchema = z.object({
  tier: AgentTierEnum,
  price: z.number().min(0),
  currency: z.string().default('INR'),
  period: z.enum(['monthly', 'yearly', 'one-time', 'usage']).default('monthly'),
  includedConversations: z.number().optional(),
  overagePerConversation: z.number().optional(),
  maxConversations: z.number().optional()
});
export type AgentPricing = z.infer<typeof AgentPricingSchema>;

// ============ AGENT INTEGRATION ============
export const AgentIntegrationSchema = z.object({
  type: z.enum(['webhook', 'api', 'sdk', 'builtin']),
  name: z.string(),
  description: z.string(),
  config: z.record(z.any()).optional(),
  required: z.boolean().default(false)
});
export type AgentIntegration = z.infer<typeof AgentIntegrationSchema>;

// ============ AGENT REQUIREMENTS ============
export const AgentRequirementsSchema = z.object({
  minUsers: z.number().optional(),
  maxUsers: z.number().optional(),
  requiredIntegrations: z.array(z.string()).optional(),
  requiredPlans: z.array(z.string()).optional(),
  dataRetention: z.string().optional(),
  complianceCertifications: z.array(z.string()).optional()
});
export type AgentRequirements = z.infer<typeof AgentRequirementsSchema>;

// ============ AGENT METRICS ============
export const AgentMetricsSchema = z.object({
  totalInstalls: z.number().default(0),
  activeInstances: z.number().default(0),
  totalConversations: z.number().default(0),
  avgResponseTime: z.number().default(0),
  successRate: z.number().default(0),
  avgSatisfaction: z.number().min(0).max(5).optional(),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().default(0)
});
export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;

// ============ AGENT REVIEW ============
export const AgentReviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  response: z.string().optional(),
  createdAt: z.date(),
  helpful: z.number().default(0)
});
export type AgentReview = z.infer<typeof AgentReviewSchema>;

// ============ AGENT VERSION ============
export const AgentVersionSchema = z.object({
  version: z.string(),
  changelog: z.string(),
  breakingChanges: z.boolean().default(false),
  releasedAt: z.date(),
  deprecatedAt: z.date().optional()
});
export type AgentVersion = z.infer<typeof AgentVersionSchema>;

// ============ AGENT ============
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000),
  longDescription: z.string().max(10000).optional(),
  icon: z.string().url().optional(),
  screenshots: z.array(z.string().url()).optional(),
  videoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),

  // Categorization
  industry: IndustryEnum,
  category: AgentCategoryEnum,
  tags: z.array(z.string()),

  // Technical
  capabilities: z.array(AgentCapabilitySchema),
  integrations: z.array(AgentIntegrationSchema),
  requirements: AgentRequirementsSchema.optional(),

  // Business
  pricing: z.array(AgentPricingSchema),
  pricingModel: z.enum(['free', 'freemium', 'paid', 'custom']).default('free'),

  // Vendor
  vendorId: z.string(),
  vendorName: z.string(),
  vendorLogo: z.string().url().optional(),
  vendorWebsite: z.string().url().optional(),
  supportEmail: z.string().email().optional(),
  documentationUrl: z.string().url().optional(),
  privacyPolicyUrl: z.string().url().optional(),
  termsOfServiceUrl: z.string().url().optional(),

  // Status & Versioning
  status: AgentStatusEnum.default('draft'),
  currentVersion: z.string().default('1.0.0'),
  versions: z.array(AgentVersionSchema).optional(),

  // Metrics
  metrics: AgentMetricsSchema.optional(),

  // Discovery
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  new: z.boolean().default(false),
  verified: z.boolean().default(false),

  // SEO
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().optional()
});
export type Agent = z.infer<typeof AgentSchema>;

// ============ AGENT INSTANCE ============
export const AgentInstanceSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  name: z.string().optional(),
  config: z.record(z.any()),
  status: z.enum(['active', 'paused', 'stopped', 'error']).default('active'),
  tier: AgentTierEnum.default('starter'),
  usage: z.object({
    conversations: z.number().default(0),
    messages: z.number().default(0),
    apiCalls: z.number().default(0),
    storage: z.number().default(0)
  }).optional(),
  limits: z.object({
    maxConversations: z.number().optional(),
    maxMessages: z.number().optional(),
    maxApiCalls: z.number().optional()
  }).optional(),
  metrics: AgentMetricsSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type AgentInstance = z.infer<typeof AgentInstanceSchema>;

// ============ AGENT SUBSCRIPTION ============
export const AgentSubscriptionSchema = z.object({
  id: z.string(),
  instanceId: z.string(),
  tenantId: z.string(),
  tier: AgentTierEnum,
  status: z.enum(['active', 'cancelled', 'expired', 'trial']),
  startDate: z.date(),
  endDate: z.date().optional(),
  trialEndsAt: z.date().optional(),
  autoRenew: z.boolean().default(true),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  nextBillingDate: z.date().optional(),
  price: z.number(),
  currency: z.string().default('INR'),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type AgentSubscription = z.infer<typeof AgentSubscriptionSchema>;
