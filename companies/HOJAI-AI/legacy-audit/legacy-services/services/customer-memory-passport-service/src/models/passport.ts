import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// ENUMS
// ============================================

export enum MemoryType {
  CONVERSATION = 'conversation',
  PREFERENCE = 'preference',
  INTERACTION = 'interaction',
  FEEDBACK = 'feedback',
  COMPLAINT = 'complaint',
  COMPLIMENT = 'compliment',
  PURCHASE = 'purchase',
  SUPPORT = 'support',
  PERSONAL = 'personal',
  BEHAVIORAL = 'behavioral',
  CONTEXTUAL = 'contextual',
  SENTIMENT = 'sentiment',
}

export enum MemoryImportance {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum SentimentLabel {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative',
}

export enum InteractionChannel {
  WHATSAPP = 'whatsapp',
  WEB = 'web',
  MOBILE_APP = 'mobile_app',
  CALL = 'call',
  EMAIL = 'email',
  IN_PERSON = 'in_person',
  CHATBOT = 'chatbot',
  API = 'api',
}

export enum InteractionType {
  QUERY = 'query',
  PURCHASE = 'purchase',
  SUPPORT_REQUEST = 'support_request',
  FEEDBACK = 'feedback',
  COMPLAINT = 'complaint',
  COMPLAINT_RESOLUTION = 'complaint_resolution',
  ONBOARDING = 'onboarding',
  CHECK_IN = 'check_in',
  CROSS_SELL = 'cross_sell',
  UPSELL = 'upsell',
  RENEWAL = 'renewal',
  CANCELLATION = 'cancellation',
}

export enum GraphNodeType {
  CUSTOMER = 'customer',
  COMPANY = 'company',
  PRODUCT = 'product',
  SERVICE = 'service',
  ISSUE = 'issue',
  RESOLUTION = 'resolution',
  INTERACTION = 'interaction',
  FEEDBACK = 'feedback',
  TRANSACTION = 'transaction',
  PREFERENCE = 'preference',
}

export enum GraphRelationshipType {
  PURCHASED = 'purchased',
  SUBSCRIBED_TO = 'subscribed_to',
  HAS_ISSUE = 'has_issue',
  RESOLVED_BY = 'resolved_by',
  INTERACTED_VIA = 'interacted_via',
  PREFERRED = 'preferred',
  COMPLAINED_ABOUT = 'complained_about',
  SATISFIED_WITH = 'satisfied_with',
 REFERRED = 'referred',
  BELONGS_TO = 'belongs_to',
}

// ============================================
// INTERFACES
// ============================================

export interface IMemoryTag {
  name: string;
  category: string;
  confidence: number;
}

export interface IMemoryEntry {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  summary?: string;
  importance: MemoryImportance;
  tags: IMemoryTag[];
  source: string;
  sourceId?: string;
  channel?: InteractionChannel;
  metadata?: Record<string, unknown>;
  sentiment?: SentimentLabel;
  sentimentScore?: number;
  entities?: string[];
  keywords?: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface IInteraction {
  id: string;
  type: InteractionType;
  channel: InteractionChannel;
  timestamp: Date;
  duration?: number;
  summary: string;
  outcome?: string;
  sentiment?: SentimentLabel;
  sentimentScore?: number;
  agentId?: string;
  agentName?: string;
  companyId: string;
  companyName?: string;
  relatedMemories: string[];
  metadata?: Record<string, unknown>;
}

export interface ISupportContext {
  ticketId?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  satisfactionScore?: number;
  lastContactDate?: Date;
  resolutionDate?: Date;
  totalTickets: number;
  openTickets: number;
  averageResponseTime?: number;
  firstResponseTime?: number;
  escalationHistory?: Array<{
    escalatedAt: Date;
    reason: string;
    escalatedTo: string;
  }>;
}

export interface ICommerceContext {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastPurchaseDate?: Date;
  favoriteCategories: string[];
  favoriteProducts: string[];
  paymentMethods: string[];
  shippingAddresses: Array<{
    label: string;
    address: string;
    isDefault: boolean;
  }>;
  loyaltyPoints?: number;
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  cartAbandonmentCount?: number;
  wishlistItems?: string[];
  subscriptionStatus?: 'active' | 'paused' | 'cancelled';
  subscriptionPlan?: string;
}

export interface IHealthContext {
  patientId?: string;
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
  }>;
  bloodType?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  lastVisitDate?: Date;
  preferredPharmacy?: string;
  preferredHospital?: string;
}

export interface ICompanyContext {
  companyId: string;
  companyName: string;
  linkedAt: Date;
  linkedBy?: string;
  status: 'active' | 'inactive' | 'churned';
  lifetimeValue: number;
  engagementScore: number;
  lastInteraction?: Date;
  interactionCount: number;
  preferences: Record<string, unknown>;
  support?: ISupportContext;
  commerce?: ICommerceContext;
  health?: IHealthContext;
  customFields?: Record<string, unknown>;
}

export interface IGraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  properties: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: GraphRelationshipType;
  properties?: Record<string, unknown>;
  weight?: number;
  createdAt: Date;
}

export interface IMemoryGraph {
  customerId: string;
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  lastUpdated: Date;
}

export interface ICustomerMemoryPassport extends Document {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  encryptedPII?: Record<string, string>;
  linkedCompanies: ICompanyContext[];
  memories: IMemoryEntry[];
  interactions: IInteraction[];
  graph: IMemoryGraph;
  healthScore: number;
  engagementScore: number;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  lastActivity?: Date;
  firstActivity?: Date;
  totalInteractions: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// ============================================
// SCHEMAS
// ============================================

const MemoryTagSchema = new Schema<IMemoryTag>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
  },
  { _id: false }
);

const MemoryEntrySchema = new Schema<IMemoryEntry>(
  {
    id: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: Object.values(MemoryType),
      required: true,
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    summary: { type: String },
    importance: {
      type: String,
      enum: Object.values(MemoryImportance),
      default: MemoryImportance.MEDIUM,
    },
    tags: [MemoryTagSchema],
    source: { type: String, required: true },
    sourceId: { type: String },
    channel: {
      type: String,
      enum: Object.values(InteractionChannel),
    },
    metadata: { type: Schema.Types.Mixed },
    sentiment: {
      type: String,
      enum: Object.values(SentimentLabel),
    },
    sentimentScore: { type: Number, min: -1, max: 1 },
    entities: [String],
    keywords: [String],
    expiresAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
  },
  { _id: false, timestamps: true }
);

const InteractionSchema = new Schema<IInteraction>(
  {
    id: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: Object.values(InteractionType),
      required: true,
    },
    channel: {
      type: String,
      enum: Object.values(InteractionChannel),
      required: true,
    },
    timestamp: { type: Date, required: true },
    duration: { type: Number },
    summary: { type: String, required: true },
    outcome: { type: String },
    sentiment: {
      type: String,
      enum: Object.values(SentimentLabel),
    },
    sentimentScore: { type: Number, min: -1, max: 1 },
    agentId: { type: String },
    agentName: { type: String },
    companyId: { type: String, required: true },
    companyName: { type: String },
    relatedMemories: [String],
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const SupportContextSchema = new Schema<ISupportContext>(
  {
    ticketId: { type: String },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
    },
    category: { type: String },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
    },
    satisfactionScore: { type: Number, min: 1, max: 5 },
    lastContactDate: { type: Date },
    resolutionDate: { type: Date },
    totalTickets: { type: Number, default: 0 },
    openTickets: { type: Number, default: 0 },
    averageResponseTime: { type: Number },
    firstResponseTime: { type: Number },
    escalationHistory: [
      {
        escalatedAt: Date,
        reason: String,
        escalatedTo: String,
      },
    ],
  },
  { _id: false }
);

const CommerceContextSchema = new Schema<ICommerceContext>(
  {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastPurchaseDate: { type: Date },
    favoriteCategories: [String],
    favoriteProducts: [String],
    paymentMethods: [String],
    shippingAddresses: [
      {
        label: String,
        address: String,
        isDefault: Boolean,
      },
    ],
    loyaltyPoints: { type: Number },
    loyaltyTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
    },
    cartAbandonmentCount: { type: Number },
    wishlistItems: [String],
    subscriptionStatus: {
      type: String,
      enum: ['active', 'paused', 'cancelled'],
    },
    subscriptionPlan: { type: String },
  },
  { _id: false }
);

const HealthContextSchema = new Schema<IHealthContext>(
  {
    patientId: { type: String },
    allergies: [String],
    medications: [String],
    conditions: [String],
    emergencyContacts: [
      {
        name: String,
        relationship: String,
        phone: String,
      },
    ],
    bloodType: { type: String },
    insuranceProvider: { type: String },
    policyNumber: { type: String },
    lastVisitDate: { type: Date },
    preferredPharmacy: { type: String },
    preferredHospital: { type: String },
  },
  { _id: false }
);

const CompanyContextSchema = new Schema<ICompanyContext>(
  {
    companyId: { type: String, required: true },
    companyName: { type: String, required: true },
    linkedAt: { type: Date, required: true, default: Date.now },
    linkedBy: { type: String },
    status: {
      type: String,
      enum: ['active', 'inactive', 'churned'],
      default: 'active',
    },
    lifetimeValue: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0, min: 0, max: 100 },
    lastInteraction: { type: Date },
    interactionCount: { type: Number, default: 0 },
    preferences: { type: Schema.Types.Mixed, default: {} },
    support: SupportContextSchema,
    commerce: CommerceContextSchema,
    health: HealthContextSchema,
    customFields: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const GraphNodeSchema = new Schema<IGraphNode>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(GraphNodeType),
      required: true,
    },
    label: { type: String, required: true },
    properties: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const GraphEdgeSchema = new Schema<IGraphEdge>(
  {
    id: { type: String, required: true },
    sourceId: { type: String, required: true },
    targetId: { type: String, required: true },
    relationship: {
      type: String,
      enum: Object.values(GraphRelationshipType),
      required: true,
    },
    properties: { type: Schema.Types.Mixed },
    weight: { type: Number, default: 1 },
  },
  { _id: false }
);

const MemoryGraphSchema = new Schema<IMemoryGraph>(
  {
    customerId: { type: String, required: true },
    nodes: [GraphNodeSchema],
    edges: [GraphEdgeSchema],
    lastUpdated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CustomerMemoryPassportSchema = new Schema<ICustomerMemoryPassport>(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerName: { type: String },
    encryptedPII: { type: Schema.Types.Mixed },
    linkedCompanies: [CompanyContextSchema],
    memories: [MemoryEntrySchema],
    interactions: [InteractionSchema],
    graph: MemoryGraphSchema,
    healthScore: { type: Number, default: 100, min: 0, max: 100 },
    engagementScore: { type: Number, default: 0, min: 0, max: 100 },
    churnRisk: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    lastActivity: { type: Date },
    firstActivity: { type: Date },
    totalInteractions: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ============================================
// INDEXES
// ============================================

CustomerMemoryPassportSchema.index({ customerEmail: 1 });
CustomerMemoryPassportSchema.index({ customerPhone: 1 });
CustomerMemoryPassportSchema.index({ 'linkedCompanies.companyId': 1 });
CustomerMemoryPassportSchema.index({ 'memories.type': 1 });
CustomerMemoryPassportSchema.index({ 'memories.tags.name': 1 });
CustomerMemoryPassportSchema.index({ 'memories.isDeleted': 1 });
CustomerMemoryPassportSchema.index({ lastActivity: -1 });
CustomerMemoryPassportSchema.index({ engagementScore: -1 });
CustomerMemoryPassportSchema.index({ churnRisk: 1 });

// Compound indexes for common queries
CustomerMemoryPassportSchema.index({
  customerId: 1,
  'linkedCompanies.companyId': 1,
});
CustomerMemoryPassportSchema.index({
  'memories.id': 1,
  'memories.isDeleted': 1,
});

// Text index for search
CustomerMemoryPassportSchema.index({
  'memories.title': 'text',
  'memories.content': 'text',
  'memories.summary': 'text',
  'memories.tags.name': 'text',
  customerName: 'text',
});

// ============================================
// MODEL
// ============================================

export const CustomerMemoryPassportModel: Model<ICustomerMemoryPassport> =
  mongoose.model<ICustomerMemoryPassport>(
    'CustomerMemoryPassport',
    CustomerMemoryPassportSchema
  );

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  IMemoryTag,
  IMemoryEntry,
  IInteraction,
  ISupportContext,
  ICommerceContext,
  IHealthContext,
  ICompanyContext,
  IGraphNode,
  IGraphEdge,
  IMemoryGraph,
  ICustomerMemoryPassport,
};
