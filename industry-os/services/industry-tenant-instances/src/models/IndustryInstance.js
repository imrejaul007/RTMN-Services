/**
 * IndustryInstance — a per-tenant Industry OS shard.
 *
 * Tracks which tenant gets which industry OS (healthcare, finance, etc.)
 * and in what state. Used by the lifecycle manager (instanceService) to
 * provision, suspend, resume, and destroy per-tenant industry OS shards
 * for regulated/large tenants.
 *
 * ADR-0010 Phase 10 (2026-06-22).
 */

import mongoose from 'mongoose';

export const INDUSTRY_STATUSES = [
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'DESTROYING',
  'DESTROYED',
  'FAILED',
];

export const ISOLATION_LEVELS = ['SHARED', 'DEDICATED', 'ISOLATED'];

// Industries currently supported. Add more as new Industry OS services are built.
export const SUPPORTED_INDUSTRIES = [
  'restaurant',
  'hotel',
  'healthcare',
  'retail',
  'legal',
  'education',
  'agriculture',
  'automotive',
  'beauty',
  'fashion',
  'fitness',
  'gaming',
  'government',
  'homeServices',
  'manufacturing',
  'nonProfit',
  'professional',
  'sports',
  'travel',
  'entertainment',
  'construction',
  'finance',
  'realEstate',
  'transport',
];

const routeSchema = new mongoose.Schema(
  {
    pathPrefix: { type: String, required: true },
    upstreamUrl: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const limitsSchema = new mongoose.Schema(
  {
    maxApiCallsPerMinute: { type: Number, default: 600 },
    maxRecordsPerTenant: { type: Number, default: 100000 },
    storageMbLimit: { type: Number, default: 1024 },
    maxConcurrentWorkflows: { type: Number, default: 50 },
  },
  { _id: false },
);

const complianceSchema = new mongoose.Schema(
  {
    framework: { type: String }, // HIPAA, PCI-DSS, GDPR, SOC2, etc.
    auditLogEnabled: { type: Boolean, default: true },
    dataResidencyRegion: { type: String },
    encryptionAtRest: { type: Boolean, default: true },
    encryptionInTransit: { type: Boolean, default: true },
    notes: { type: String },
  },
  { _id: false },
);

const IndustryInstanceSchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    industry: { type: String, required: true, enum: SUPPORTED_INDUSTRIES },
    status: { type: String, enum: INDUSTRY_STATUSES, default: 'PROVISIONING', index: true },
    isolationLevel: { type: String, enum: ISOLATION_LEVELS, default: 'SHARED' },
    region: { type: String, default: 'global' },
    namespace: { type: String, required: true },
    databaseUri: { type: String },
    apiKeyHash: { type: String, required: true },
    limits: { type: limitsSchema, default: () => ({}) },
    compliance: { type: complianceSchema, default: () => ({}) },
    routes: { type: [routeSchema], default: [] },
    tags: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    provisionedAt: { type: Date, default: Date.now },
    suspendedAt: { type: Date },
    destroyedAt: { type: Date },
    lastHealthCheckAt: { type: Date },
    healthCheckStatus: { type: String, enum: ['healthy', 'degraded', 'unhealthy', 'unknown'], default: 'unknown' },
  },
  { timestamps: true },
);

// Compound indexes for multi-tenant queries
IndustryInstanceSchema.index({ tenantId: 1, industry: 1 });
IndustryInstanceSchema.index({ industry: 1, status: 1 });
IndustryInstanceSchema.index({ tenantId: 1, status: 1 });

export const IndustryInstance =
  mongoose.models.IndustryInstance || mongoose.model('IndustryInstance', IndustryInstanceSchema);

export { INDUSTRY_STATUSES, ISOLATION_LEVELS, SUPPORTED_INDUSTRIES };