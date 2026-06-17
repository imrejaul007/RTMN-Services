import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schema
export const EmployeeSchema = z.object({
  tenantId: z.string().min(1),
  employeeId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  department: z.string(),
  role: z.string(),
  level: z.enum(['junior', 'mid', 'senior', 'lead', 'manager', 'director']),
  managerId: z.string().optional(),
  hireDate: z.date(),
  status: z.enum(['active', 'inactive', 'on_leave', 'terminated']),
  avatar: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  skills: [{ type: Schema.Types.ObjectId, ref: 'Skill' }],
  certifications: [{ type: Schema.Types.ObjectId, ref: 'Certification' }],
  schedules: [{ type: Schema.Types.ObjectId, ref: 'Schedule' }],
  trainings: [{ type: Schema.Types.ObjectId, ref: 'Training' }],
  performanceRecords: [{ type: Schema.Types.ObjectId, ref: 'Performance' }],
  metadata: z.record(z.any()).optional()
});

// MongoDB schema
const EmployeeModelSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  department: { type: String, required: true },
  role: { type: String, required: true },
  level: {
    type: String,
    enum: ['junior', 'mid', 'senior', 'lead', 'manager', 'director'],
    default: 'mid'
  },
  managerId: { type: String },
  hireDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'terminated'],
    default: 'active'
  },
  avatar: { type: String },
  location: { type: String },
  timezone: { type: String },
  skills: [{ type: Schema.Types.ObjectId, ref: 'Skill' }],
  certifications: [{ type: Schema.Types.ObjectId, ref: 'Certification' }],
  schedules: [{ type: Schema.Types.ObjectId, ref: 'Schedule' }],
  trainings: [{ type: Schema.Types.ObjectId, ref: 'Training' }],
  performanceRecords: [{ type: Schema.Types.ObjectId, ref: 'Performance' }],
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Compound index for tenant-scoped queries
EmployeeModelSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
EmployeeModelSchema.index({ tenantId: 1, department: 1 });
EmployeeModelSchema.index({ tenantId: 1, status: 1 });

export interface IEmployee extends Document {
  tenantId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  role: string;
  level: 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'director';
  managerId?: string;
  hireDate: Date;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  avatar?: string;
  location?: string;
  timezone?: string;
  skills: mongoose.Types.ObjectId[];
  certifications: mongoose.Types.ObjectId[];
  schedules: mongoose.Types.ObjectId[];
  trainings: mongoose.Types.ObjectId[];
  performanceRecords: mongoose.Types.ObjectId[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeModelSchema);
