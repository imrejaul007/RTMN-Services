import mongoose, { Document, Schema } from 'mongoose';

export interface IBranch extends Document {
  tenantId: string;
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  type: 'warehouse' | 'store' | 'office' | 'franchise' | 'popup' | 'distribution_center' | 'call_center' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  contact: {
    email?: string;
    phone?: string;
    fax?: string;
  };
  managerEmployeeId?: string;
  capacity?: {
    type: string; // sqft, sqm
    value: number;
    current: number;
  };
  amenities?: string[];
  isHeadquarters: boolean;
  status: 'active' | 'inactive' | 'temporarily_closed' | 'archived';
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
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
    type: {
      type: String,
      enum: ['warehouse', 'store', 'office', 'franchise', 'popup', 'distribution_center', 'call_center', 'other'],
      default: 'office',
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: 'US' },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    contact: {
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      fax: { type: String, trim: true },
    },
    managerEmployeeId: {
      type: String,
      trim: true,
    },
    capacity: {
      type: {
        type: String,
        enum: ['sqft', 'sqm'],
        default: 'sqft',
      },
      value: { type: Number, default: 0 },
      current: { type: Number, default: 0 },
    },
    amenities: [{
      type: String,
      trim: true,
    }],
    isHeadquarters: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'temporarily_closed', 'archived'],
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
BranchSchema.index({ tenantId: 1, organizationId: 1 });
BranchSchema.index({ tenantId: 1, code: 1 }, { unique: true });
BranchSchema.index({ organizationId: 1, isHeadquarters: 1 });
BranchSchema.index({ 'address.city': 1, 'address.state': 1 });

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema);
