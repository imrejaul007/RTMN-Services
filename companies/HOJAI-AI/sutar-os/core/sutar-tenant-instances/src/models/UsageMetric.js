/**
 * UsageMetric — daily counter rollup per tenant instance.
 *
 * ADR-0010 Phase 9 (2026-06-22).
 */

import mongoose from 'mongoose';

const UsageMetricSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    instanceId: { type: String, required: true, index: true },
    date: { type: String, required: true }, // ISO date YYYY-MM-DD
    apiCalls: { type: Number, default: 0 },
    missionsCreated: { type: Number, default: 0 },
    missionsCompleted: { type: Number, default: 0 },
    missionsFailed: { type: Number, default: 0 },
    agentsActive: { type: Number, default: 0 },
    storageMbUsed: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One row per (instance, day) — easy upsert
UsageMetricSchema.index({ instanceId: 1, date: 1 }, { unique: true });
UsageMetricSchema.index({ tenantId: 1, date: -1 });

export const UsageMetric =
  mongoose.models.UsageMetric || mongoose.model('UsageMetric', UsageMetricSchema);