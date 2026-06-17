import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schema
export const TrainingValidationSchema = z.object({
  tenantId: z.string().min(1),
  employeeId: z.string().min(1),
  trainingName: z.string().min(1),
  trainingType: z.enum(['mandatory', 'optional', 'certification', 'onboarding', 'skill_upgrade', 'compliance']),
  provider: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  duration: z.number().min(0).optional(), // in hours
  status: z.enum(['enrolled', 'in_progress', 'completed', 'failed', 'cancelled', 'pending']),
  completionDate: z.date().optional(),
  score: z.number().min(0).max(100).optional(),
  certificateObtained: z.boolean().default(false),
  certificateUrl: z.string().url().optional(),
  feedback: z.string().optional(),
  category: z.string().optional(),
  skillsGained: z.array(z.string()).default([]),
  cost: z.number().min(0).optional(),
  isMandatory: z.boolean().default(false),
  dueDate: z.date().optional(),
  renewalRequired: z.boolean().default(false),
  renewalPeriod: z.number().optional() // in months
});

// MongoDB schema
const TrainingSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  trainingName: { type: String, required: true },
  trainingType: {
    type: String,
    enum: ['mandatory', 'optional', 'certification', 'onboarding', 'skill_upgrade', 'compliance'],
    default: 'optional'
  },
  provider: { type: String },
  startDate: { type: Date, required: true },
  endDate: { Date },
  duration: { type: Number, min: 0 }, // in hours
  status: {
    type: String,
    enum: ['enrolled', 'in_progress', 'completed', 'failed', 'cancelled', 'pending'],
    default: 'enrolled'
  },
  completionDate: { type: Date },
  score: { type: Number, min: 0, max: 100 },
  certificateObtained: { type: Boolean, default: false },
  certificateUrl: { type: String },
  feedback: { type: String },
  category: { type: String },
  skillsGained: [{ type: String }],
  cost: { type: Number, min: 0 },
  isMandatory: { type: Boolean, default: false },
  dueDate: { type: Date },
  renewalRequired: { type: Boolean, default: false },
  renewalPeriod: { type: Number }, // in months
  completedOnTime: { type: Boolean }
}, {
  timestamps: true
});

// Indexes
TrainingSchema.index({ tenantId: 1, employeeId: 1 });
TrainingSchema.index({ tenantId: 1, status: 1 });
TrainingSchema.index({ tenantId: 1, trainingType: 1 });
TrainingSchema.index({ tenantId: 1, dueDate: 1 }, { sparse: true });
TrainingSchema.index({ tenantId: 1, isMandatory: 1 });

// Virtual for pending training
TrainingSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > this.dueDate;
});

export interface ITraining extends Document {
  tenantId: string;
  employeeId: string;
  trainingName: string;
  trainingType: 'mandatory' | 'optional' | 'certification' | 'onboarding' | 'skill_upgrade' | 'compliance';
  provider?: string;
  startDate: Date;
  endDate?: Date;
  duration?: number;
  status: 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'pending';
  completionDate?: Date;
  score?: number;
  certificateObtained: boolean;
  certificateUrl?: string;
  feedback?: string;
  category?: string;
  skillsGained: string[];
  cost?: number;
  isMandatory: boolean;
  dueDate?: Date;
  renewalRequired: boolean;
  renewalPeriod?: number;
  completedOnTime?: boolean;
  createdAt: Date;
  updatedAt: Date;
  isOverdue: boolean;
}

export const Training = mongoose.model<ITraining>('Training', TrainingSchema);
