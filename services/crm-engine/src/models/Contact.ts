import mongoose, { Document, Schema } from 'mongoose';

export enum LifecycleStage {
  LEAD = 'lead',
  PROSPECT = 'prospect',
  CUSTOMER = 'customer',
  EVANGELIST = 'evangelist',
}

export interface IExternalIds {
  hubspotId?: string;
  zohoId?: string;
}

export interface IContact extends Document {
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  lifecycleStage: LifecycleStage;
  leadSource?: string;
  owner?: string;
  externalIds: IExternalIds;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
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
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    lifecycleStage: {
      type: String,
      enum: Object.values(LifecycleStage),
      default: LifecycleStage.LEAD,
    },
    leadSource: {
      type: String,
      trim: true,
    },
    owner: {
      type: String,
    },
    externalIds: {
      hubspotId: { type: String },
      zohoId: { type: String },
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

// Compound index for tenant + email uniqueness
ContactSchema.index(['tenantId', 'email'], { unique: true });

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
