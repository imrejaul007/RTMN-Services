/**
 * UsageMetric — daily usage counters per industry instance.
 *
 * Tracks per-day aggregates: apiCalls, recordsCreated, workflowsExecuted,
 * errorCount (increments) + recordsActive, storageMbUsed (high-water mark).
 *
 * ADR-0010 Phase 10 (2026-06-22).
 */

import mongoose from 'mongoose';

const UsageMetricSchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    industry: { type: String, required: true },
    date: { type: String, required: true }, // ISO YYYY-MM-DD
    apiCalls: { type: Number, default: 0 },
    recordsCreated: { type: Number, default: 0 },
    recordsUpdated: { type: Number, default: 0 },
    workflowsExecuted: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    recordsActive: { type: Number, default: 0 },     // high-water
    storageMbUsed: { type: Number, default: 0 },     // high-water
  },
  { timestamps: true },
);

UsageMetricSchema.index({ instanceId: 1, date: 1 }, { unique: true });

export const UsageMetric =
  mongoose.models.UsageMetric || mongoose.model('UsageMetric', UsageMetricSchema);