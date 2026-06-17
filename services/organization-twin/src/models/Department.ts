import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  tenantId: string;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: mongoose.Types.ObjectId;
  managerEmployeeId?: string;
  costCenter?: string;
  budget?: {
    allocated: number;
    spent: number;
    currency: string;
  };
  headcount: {
    current: number;
    target: number;
  };
  type: 'operations' | 'sales' | 'hr' | 'finance' | 'marketing' | 'it' | 'legal' | 'support' | 'production' | 'other';
  status: 'active' | 'inactive' | 'archived';
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    parentDepartmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    managerEmployeeId: {
      type: String,
      trim: true,
    },
    costCenter: {
      type: String,
      trim: true,
    },
    budget: {
      allocated: { type: Number, default: 0 },
      spent: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    headcount: {
      current: { type: Number, default: 0 },
      target: { type: Number, default: 0 },
    },
    type: {
      type: String,
      enum: ['operations', 'sales', 'hr', 'finance', 'marketing', 'it', 'legal', 'support', 'production', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
DepartmentSchema.index({ tenantId: 1, organizationId: 1 });
DepartmentSchema.index({ tenantId: 1, organizationId: 1, parentDepartmentId: 1 });
DepartmentSchema.index({ tenantId: 1, code: 1 }, { unique: true });
DepartmentSchema.index({ organizationId: 1, name: 1 });

export const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);
