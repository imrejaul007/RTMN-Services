import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schema
export const PerformanceValidationSchema = z.object({
  tenantId: z.string().min(1),
  employeeId: z.string().min(1),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']),
  periodStart: z.date(),
  periodEnd: z.date(),
  ticketsHandled: z.number().min(0).default(0),
  ticketsResolved: z.number().min(0).default(0),
  ticketsEscalated: z.number().min(0).default(0),
  firstResponseTime: z.number().min(0).optional(), // in seconds
  averageResolutionTime: z.number().min(0).optional(), // in seconds
  csat: z.number().min(0).max(5).optional(), // 1-5 scale
  csatResponses: z.number().min(0).default(0),
  nps: z.number().min(-100).max(100).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  attendanceRate: z.number().min(0).max(100).optional(),
  adherenceScore: z.number().min(0).max(100).optional(),
  productivityIndex: z.number().min(0).max(100).optional(),
  goalCompletionRate: z.number().min(0).max(100).optional(),
  peerReviewScore: z.number().min(0).max(5).optional(),
  supervisorRating: z.number().min(0).max(5).optional(),
  overallScore: z.number().min(0).max(100).optional(),
  topPerformingAreas: z.array(z.string()).default([]),
  improvementAreas: z.array(z.string()).default([]),
  notes: z.string().optional()
});

// MongoDB schema
const PerformanceSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'],
    default: 'monthly'
  },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  ticketsHandled: { type: Number, min: 0, default: 0 },
  ticketsResolved: { type: Number, min: 0, default: 0 },
  ticketsEscalated: { type: Number, min: 0, default: 0 },
  firstResponseTime: { type: Number, min: 0 }, // in seconds
  averageResolutionTime: { type: Number, min: 0 }, // in seconds
  csat: { type: Number, min: 0, max: 5 }, // 1-5 scale
  csatResponses: { type: Number, min: 0, default: 0 },
  nps: { type: Number, min: -100, max: 100 },
  qualityScore: { type: Number, min: 0, max: 100 },
  attendanceRate: { type: Number, min: 0, max: 100 },
  adherenceScore: { type: Number, min: 0, max: 100 },
  productivityIndex: { type: Number, min: 0, max: 100 },
  goalCompletionRate: { type: Number, min: 0, max: 100 },
  peerReviewScore: { type: Number, min: 0, max: 5 },
  supervisorRating: { type: Number, min: 0, max: 5 },
  overallScore: { type: Number, min: 0, max: 100 },
  topPerformingAreas: [{ type: String }],
  improvementAreas: [{ type: String }],
  notes: { type: String }
}, {
  timestamps: true
});

// Indexes
PerformanceSchema.index({ tenantId: 1, employeeId: 1 });
PerformanceSchema.index({ tenantId: 1, employeeId: 1, period: 1, periodStart: -1 });
PerformanceSchema.index({ tenantId: 1, periodStart: 1, periodEnd: 1 });

// Virtual for resolution rate
PerformanceSchema.virtual('resolutionRate').get(function() {
  if (this.ticketsHandled === 0) return 0;
  return (this.ticketsResolved / this.ticketsHandled) * 100;
});

// Virtual for escalation rate
PerformanceSchema.virtual('escalationRate').get(function() {
  if (this.ticketsHandled === 0) return 0;
  return (this.ticketsEscalated / this.ticketsHandled) * 100;
});

// Virtual for CSAT percentage (normalized to 100)
PerformanceSchema.virtual('csatPercentage').get(function() {
  if (!this.csat) return 0;
  return (this.csat / 5) * 100;
});

export interface IPerformance extends Document {
  tenantId: string;
  employeeId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  periodStart: Date;
  periodEnd: Date;
  ticketsHandled: number;
  ticketsResolved: number;
  ticketsEscalated: number;
  firstResponseTime?: number;
  averageResolutionTime?: number;
  csat?: number;
  csatResponses: number;
  nps?: number;
  qualityScore?: number;
  attendanceRate?: number;
  adherenceScore?: number;
  productivityIndex?: number;
  goalCompletionRate?: number;
  peerReviewScore?: number;
  supervisorRating?: number;
  overallScore?: number;
  topPerformingAreas: string[];
  improvementAreas: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  resolutionRate: number;
  escalationRate: number;
  csatPercentage: number;
}

export const Performance = mongoose.model<IPerformance>('Performance', PerformanceSchema);
