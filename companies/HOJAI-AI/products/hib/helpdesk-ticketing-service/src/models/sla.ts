/**
 * SLA Model - Mongoose schema for SLA configurations
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum SlaType {
  FIRST_RESPONSE = 'first_response',
  RESOLUTION = 'resolution',
  NEXT_RESPONSE = 'next_response',
}

export enum SlaPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface ISLA extends Document {
  slaId: string;
  name: string;
  description: string;
  priority: SlaPriority;
  type: SlaType;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  businessHoursOnly: boolean;
  workingHours: {
    start: string;
    end: string;
    timezone: string;
    weekends: number[];
  };
  isActive: boolean;
  appliesTo: {
    categories: string[];
    teams: string[];
  };
  escalationRules: Array<{
    afterMinutes: number;
    action: 'notify' | 'assign' | 'escalate';
    target: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const slaSchema = new Schema<ISLA>(
  {
    slaId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: String,
    priority: {
      type: String,
      enum: Object.values(SlaPriority),
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(SlaType),
      required: true,
    },
    responseTimeMinutes: { type: Number, required: true },
    resolutionTimeMinutes: { type: Number, required: true },
    businessHoursOnly: { type: Boolean, default: false },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      weekends: { type: [Number], default: [0, 6] },
    },
    isActive: { type: Boolean, default: true, index: true },
    appliesTo: {
      categories: [{ type: String }],
      teams: [{ type: String }],
    },
    escalationRules: [
      {
        afterMinutes: Number,
        action: { type: String, enum: ['notify', 'assign', 'escalate'] },
        target: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
slaSchema.index({ priority: 1, isActive: 1 });
slaSchema.index({ 'appliesTo.categories': 1 });

export const SLA = mongoose.model<ISLA>('SLA', slaSchema);
export default SLA;
