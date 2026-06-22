import mongoose, { Schema, Document } from 'mongoose';

// Pricing Model Types
export interface IPricing {
  model: 'free' | 'subscription' | 'usage' | 'tiered' | 'enterprise';
  rate: number;
  unit: string;
  currency?: string;
  tiers?: Array<{
    name: string;
    price: number;
    features: string[];
  }>;
}

// SLA Types
export interface ISLA {
  uptime: number; // percentage (e.g., 99.9)
  responseTime: number; // milliseconds
  availability?: string;
  supportLevel?: 'basic' | 'standard' | 'premium' | 'enterprise';
}

// API Endpoint Types
export interface IAPIEndpoint {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  auth: 'none' | 'apiKey' | 'oauth2' | 'jwt';
  description?: string;
  rateLimit?: {
    requests: number;
    window: string;
  };
}

// Service Document Interface
export interface IServiceDocument extends Document {
  serviceId: string;
  corpId: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  pricing: IPricing;
  sla: ISLA;
  api: IAPIEndpoint[];
  capabilities: string[];
  documentation?: {
    docsUrl?: string;
    changelogUrl?: string;
    supportUrl?: string;
  };
  status: 'active' | 'deprecated' | 'maintenance' | 'inactive';
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// Service Schema
const PricingSchema = new Schema<IPricing>(
  {
    model: {
      type: String,
      enum: ['free', 'subscription', 'usage', 'tiered', 'enterprise'],
      required: true,
    },
    rate: { type: Number, required: true },
    unit: { type: String, required: true },
    currency: { type: String, default: 'USD' },
    tiers: [
      {
        name: String,
        price: Number,
        features: [String],
        _id: false,
      },
    ],
  },
  { _id: false }
);

const SLASchema = new Schema<ISLA>(
  {
    uptime: { type: Number, required: true, min: 0, max: 100 },
    responseTime: { type: Number, required: true },
    availability: { type: String },
    supportLevel: {
      type: String,
      enum: ['basic', 'standard', 'premium', 'enterprise'],
    },
  },
  { _id: false }
);

const APIEndpointSchema = new Schema<IAPIEndpoint>(
  {
    endpoint: { type: String, required: true },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      required: true,
    },
    auth: {
      type: String,
      enum: ['none', 'apiKey', 'oauth2', 'jwt'],
      required: true,
    },
    description: { type: String },
    rateLimit: {
      requests: Number,
      window: String,
      _id: false,
    },
  },
  { _id: false }
);

const ServiceSchema = new Schema<IServiceDocument>(
  {
    serviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    corpId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    tags: [
      {
        type: String,
        index: true,
      },
    ],
    pricing: {
      type: PricingSchema,
      required: true,
    },
    sla: {
      type: SLASchema,
      required: true,
    },
    api: [APIEndpointSchema],
    capabilities: [
      {
        type: String,
        index: true,
      },
    ],
    documentation: {
      docsUrl: String,
      changelogUrl: String,
      supportUrl: String,
      _id: false,
    },
    status: {
      type: String,
      enum: ['active', 'deprecated', 'maintenance', 'inactive'],
      default: 'active',
      index: true,
    },
    version: {
      type: String,
      default: '1.0.0',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for common queries
ServiceSchema.index({ category: 1, status: 1 });
ServiceSchema.index({ corpId: 1, status: 1 });
ServiceSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Service = mongoose.model<IServiceDocument>('Service', ServiceSchema);
