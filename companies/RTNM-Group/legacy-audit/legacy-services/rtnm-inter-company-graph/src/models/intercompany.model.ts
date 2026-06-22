import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyProperties {
  industry?: string;
  sector?: string;
  founded?: Date;
  headquarters?: string;
  employees?: number;
  monthlyRevenue?: number;
  properties?: Record<string, unknown>;
}

export interface ICompanyNode extends Document {
  corpId: string;
  name: string;
  type: 'holding' | 'subsidiary' | 'partner' | 'vendor' | 'customer';
  role: string;
  trustScore: number;
  monthlyRevenue: number;
  employees: number;
  properties: ICompanyProperties;
  tags: string[];
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const CompanyPropertiesSchema = new Schema<ICompanyProperties>(
  {
    industry: { type: String },
    sector: { type: String },
    founded: { type: Date },
    headquarters: { type: String },
    employees: { type: Number },
    monthlyRevenue: { type: Number },
    properties: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const CompanyNodeSchema = new Schema<ICompanyNode>(
  {
    corpId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['holding', 'subsidiary', 'partner', 'vendor', 'customer'],
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    trustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    monthlyRevenue: {
      type: Number,
      default: 0,
    },
    employees: {
      type: Number,
      default: 0,
    },
    properties: {
      type: CompanyPropertiesSchema,
      default: () => ({}),
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
CompanyNodeSchema.index({ type: 1, status: 1 });
CompanyNodeSchema.index({ trustScore: -1 });
CompanyNodeSchema.index({ tags: 1 });

export interface IEdgeProperties {
  monthlyVolume?: number;
  paymentTerms?: string;
  creditLimit?: number;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ICompanyEdge extends Document {
  edgeId: string;
  sourceId: string;
  targetId: string;
  relationship: 'pays' | 'receives' | 'provides' | 'consumes' | 'owns' | 'licenses' | 'integrates' | 'supports';
  direction: 'unidirectional' | 'bidirectional';
  properties: IEdgeProperties;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

const EdgePropertiesSchema = new Schema<IEdgeProperties>(
  {
    monthlyVolume: { type: Number },
    paymentTerms: { type: String },
    creditLimit: { type: Number },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: false }
);

const CompanyEdgeSchema = new Schema<ICompanyEdge>(
  {
    edgeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sourceId: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    relationship: {
      type: String,
      enum: ['pays', 'receives', 'provides', 'consumes', 'owns', 'licenses', 'integrates', 'supports'],
      required: true,
    },
    direction: {
      type: String,
      enum: ['unidirectional', 'bidirectional'],
      default: 'unidirectional',
    },
    properties: {
      type: EdgePropertiesSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for relationship queries
CompanyEdgeSchema.index({ sourceId: 1, targetId: 1 });
CompanyEdgeSchema.index({ relationship: 1, status: 1 });
CompanyEdgeSchema.index({ 'properties.monthlyVolume': -1 });

export const CompanyNode = mongoose.model<ICompanyNode>('CompanyNode', CompanyNodeSchema);
export const CompanyEdge = mongoose.model<ICompanyEdge>('CompanyEdge', CompanyEdgeSchema);
