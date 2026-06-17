import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  tenantId: string;
  name: string;
  type: 'corporation' | 'llc' | 'partnership' | 'sole_proprietorship' | 'nonprofit' | 'government' | 'other';
  industry: string;
  registrationNumber?: string;
  taxId?: string;
  founded?: Date;
  website?: string;
  email: string;
  phone?: string;
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
  logo?: string;
  parentOrgId?: mongoose.Types.ObjectId;
  settings: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
    fiscalYearStart: number; // Month (1-12)
  };
  metadata: Record<string, unknown>;
  status: 'active' | 'inactive' | 'suspended' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    type: {
      type: String,
      enum: ['corporation', 'llc', 'partnership', 'sole_proprietorship', 'nonprofit', 'government', 'other'],
      default: 'corporation',
    },
    industry: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
    founded: {
      type: Date,
    },
    website: {
      type: String,
      trim: true,
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
    logo: {
      type: String,
    },
    parentOrgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    settings: {
      timezone: { type: String, default: 'UTC' },
      currency: { type: String, default: 'USD' },
      language: { type: String, default: 'en' },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
      fiscalYearStart: { type: Number, default: 1, min: 1, max: 12 },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
OrganizationSchema.index({ tenantId: 1, name: 1 });
OrganizationSchema.index({ tenantId: 1, status: 1 });
OrganizationSchema.index({ tenantId: 1, parentOrgId: 1 });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
