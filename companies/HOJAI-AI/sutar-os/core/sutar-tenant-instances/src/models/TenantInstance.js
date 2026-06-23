/**
 * TenantInstance — a logical SUTAR shard dedicated to a single tenant.
 *
 * State machine:
 *   PROVISIONING → ACTIVE → SUSPENDED → ACTIVE → DESTROYING → DESTROYED
 *             ↘ FAILED                                ↗
 *
 * Isolation levels:
 *   SHARED        — uses shared infrastructure but gets logical namespace
 *   DEDICATED     — own database, shared compute
 *   ISOLATED      — own database + own dedicated pod/compute
 *
 * ADR-0010 Phase 9 (2026-06-22).
 */

import mongoose from 'mongoose';

export const INSTANCE_STATUSES = [
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'DESTROYING',
  'DESTROYED',
  'FAILED',
];

export const ISOLATION_LEVELS = ['SHARED', 'DEDICATED', 'ISOLATED'];

const LimitsSchema = new mongoose.Schema(
  {
    maxAgents: { type: Number, default: 100 },
    maxMissionsPerDay: { type: Number, default: 1000 },
    maxApiCallsPerMinute: { type: Number, default: 600 },
    storageMbLimit: { type: Number, default: 1024 },
  },
  { _id: false }
);

const RoutesSchema = new mongoose.Schema(
  {
    pathPrefix: String,
    upstreamUrl: String,
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const TenantInstanceSchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    status: { type: String, enum: INSTANCE_STATUSES, default: 'PROVISIONING', index: true },
    isolationLevel: { type: String, enum: ISOLATION_LEVELS, default: 'SHARED' },
    region: { type: String, default: 'global' },
    namespace: { type: String, required: true }, // e.g. 'sutar_tenant_acme'
    databaseUri: { type: String, default: null }, // null for SHARED
    apiKeyHash: { type: String, default: null }, // hashed bearer token for direct API
    limits: { type: LimitsSchema, default: () => ({}) },
    routes: { type: [RoutesSchema], default: [] },
    tags: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    provisionedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    destroyedAt: { type: Date, default: null },
    lastHealthCheckAt: { type: Date, default: null },
    healthCheckStatus: { type: String, enum: ['healthy', 'degraded', 'unhealthy', 'unknown'], default: 'unknown' },
  },
  { timestamps: true }
);

// One instance per tenant — re-provisioning destroys the old one
TenantInstanceSchema.index({ tenantId: 1, status: 1 });
TenantInstanceSchema.index({ status: 1, createdAt: -1 });

export const TenantInstance =
  mongoose.models.TenantInstance || mongoose.model('TenantInstance', TenantInstanceSchema);