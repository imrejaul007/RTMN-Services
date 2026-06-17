import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployee extends Document {
  tenantId: string;
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  employeeId: string; // External employee ID (e.g., from HR system)
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  jobTitle: string;
  role: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern' | 'temporary';
  reportsTo?: string; // Manager's employeeId
  reportsToEmployeeId?: mongoose.Types.ObjectId;
  hireDate: Date;
  terminationDate?: Date;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  salary?: {
    amount: number;
    currency: string;
    frequency: 'hourly' | 'monthly' | 'annual';
  };
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  skills?: string[];
  certifications?: Array<{
    name: string;
    issuedBy: string;
    issuedDate: Date;
    expiryDate?: Date;
  }>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
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
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'intern', 'temporary'],
      default: 'full_time',
    },
    reportsTo: {
      type: String,
      trim: true,
    },
    reportsToEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    hireDate: {
      type: Date,
      required: true,
    },
    terminationDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_leave', 'terminated'],
      default: 'active',
    },
    salary: {
      amount: { type: Number },
      currency: { type: String, default: 'USD' },
      frequency: {
        type: String,
        enum: ['hourly', 'monthly', 'annual'],
        default: 'annual',
      },
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    skills: [{
      type: String,
      trim: true,
    }],
    certifications: [{
      name: { type: String },
      issuedBy: { type: String },
      issuedDate: { type: Date },
      expiryDate: { type: Date },
    }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for full name
EmployeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Compound indexes
EmployeeSchema.index({ tenantId: 1, organizationId: 1 });
EmployeeSchema.index({ tenantId: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ organizationId: 1, departmentId: 1 });
EmployeeSchema.index({ reportsTo: 1 });
EmployeeSchema.index({ status: 1 });

// Ensure virtuals are included in JSON output
EmployeeSchema.set('toJSON', { virtuals: true });
EmployeeSchema.set('toObject', { virtuals: true });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
