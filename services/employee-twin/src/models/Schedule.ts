import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schema
export const ScheduleValidationSchema = z.object({
  tenantId: z.string().min(1),
  employeeId: z.string().min(1),
  shiftType: z.enum(['morning', 'afternoon', 'evening', 'night', 'flexible', 'rotating']),
  workingDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  isWorkFromHome: z.boolean().default(false),
  wfhDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  effectiveFrom: z.date(),
  effectiveTo: z.date().optional(),
  weeklyHours: z.number().min(0).max(60).optional(),
  timezone: z.string().optional(),
  notes: z.string().optional()
});

// MongoDB schema
const ScheduleSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  shiftType: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night', 'flexible', 'rotating'],
    default: 'flexible'
  },
  workingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isWorkFromHome: { type: Boolean, default: false },
  wfhDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date },
  weeklyHours: { type: Number, min: 0, max: 60 },
  timezone: { type: String },
  notes: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes
ScheduleSchema.index({ tenantId: 1, employeeId: 1 });
ScheduleSchema.index({ tenantId: 1, shiftType: 1 });
ScheduleSchema.index({ tenantId: 1, isWorkFromHome: 1 });
ScheduleSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

// Virtual for calculating hours per day
ScheduleSchema.virtual('hoursPerDay').get(function() {
  if (!this.startTime || !this.endTime) return 0;
  const [startH, startM] = this.startTime.split(':').map(Number);
  const [endH, endM] = this.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return (endMinutes - startMinutes) / 60;
});

export interface ISchedule extends Document {
  tenantId: string;
  employeeId: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible' | 'rotating';
  workingDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  startTime: string;
  endTime: string;
  isWorkFromHome: boolean;
  wfhDays?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  weeklyHours?: number;
  timezone?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  hoursPerDay: number;
}

export const Schedule = mongoose.model<ISchedule>('Schedule', ScheduleSchema);
