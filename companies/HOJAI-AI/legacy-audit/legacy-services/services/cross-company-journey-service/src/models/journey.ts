import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum EventType {
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  PURCHASE = 'purchase',
  SIGNUP = 'signup',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SEARCH = 'search',
  FORM_SUBMIT = 'form_submit',
  SUPPORT_TICKET = 'support_ticket',
  REVIEW = 'review',
  REFERRAL = 'referral',
  SUBSCRIPTION = 'subscription',
  PAYMENT = 'payment',
  REFUND = 'refund',
  FEEDBACK = 'feedback',
  NPS_SURVEY = 'nps_survey',
  CART_ADD = 'cart_add',
  CART_REMOVE = 'cart_remove',
  CHECKOUT_START = 'checkout_start',
  CHECKOUT_COMPLETE = 'checkout_complete',
  WISHLIST_ADD = 'wishlist_add',
  SHARE = 'share',
  DOWNLOAD = 'download',
  VIDEO_PLAY = 'video_play',
  API_CALL = 'api_call',
  ERROR = 'error',
  CUSTOM = 'custom'
}

export enum JourneyPhase {
  AWARENESS = 'awareness',
  CONSIDERATION = 'consideration',
  DECISION = 'decision',
  PURCHASE = 'purchase',
  RETENTION = 'retention',
  ADVOCACY = 'advocacy',
  CHURNED = 'churned',
  REACTIVATED = 'reactivated'
}

export enum ChannelType {
  WEB = 'web',
  MOBILE_APP = 'mobile_app',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms',
  CALL = 'call',
  SOCIAL = 'social',
  POS = 'pos',
  API = 'api',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  TELEGRAM = 'telegram',
  SLACK = 'slack'
}

export enum CompanyType {
  CORE_PLATFORM = 'core_platform',
  VERTICAL_COMPANY = 'vertical_company',
  AI_SERVICE = 'ai_service',
  MERCHANT = 'merchant',
  CONSUMER = 'consumer'
}

export enum MilestoneType {
  FIRST_INTERACTION = 'first_interaction',
  FIRST_PURCHASE = 'first_purchase',
  FIRST_LOGIN = 'first_login',
  SIGNUP_COMPLETE = 'signup_complete',
  EMAIL_VERIFIED = 'email_verified',
  PHONE_VERIFIED = 'phone_verified',
  PROFILE_COMPLETE = 'profile_complete',
  LOYALTY_TIER_ACHIEVED = 'loyalty_tier_achieved',
  REFERRAL_MADE = 'referral_made',
  REFERRAL_CONVERTED = 'referral_converted',
  SUPPORT_TICKET_RESOLVED = 'support_ticket_resolved',
  ANNIVERSARY = 'anniversary',
  LTV_THRESHOLD = 'ltv_threshold',
  ENGAGEMENT_STREAK = 'engagement_streak',
  CROSS_COMPANY_ENGAGEMENT = 'cross_company_engagement'
}

export enum PatternType {
  SEASONAL_PURCHASE = 'seasonal_purchase',
  HIGH_VALUE_BUYER = 'high_value_buyer',
  BROWSER = 'browser',
  ABANDONER = 'abandoner',
  LOYAL = 'loyal',
  AT_RISK = 'at_risk',
  CHURNING = 'churning',
  DORMANT = 'dormant',
  POWER_USER = 'power_user',
  INFLUENCER = 'influencer',
  CROSS_COMPANY_USER = 'cross_company_user',
  REFERRER = 'referrer',
  SUPPORTER = 'supporter',
  COMPLAINER = 'complainer'
}

export enum HealthStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  AT_RISK = 'at_risk',
  CRITICAL = 'critical'
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IJourneyEvent {
  eventId: string;
  customerId: string;
  companyId: string;
  companyName: string;
  eventType: EventType;
  channel: ChannelType;
  timestamp: Date;
  metadata: Record<string, unknown>;
  properties: EventProperties;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: GeoLocation;
  referralSource?: string;
  utmParameters?: UTMParameters;
  enriched?: boolean;
  enrichedAt?: Date;
}

export interface EventProperties {
  page?: string;
  pageTitle?: string;
  pageUrl?: string;
  productId?: string;
  productName?: string;
  productCategory?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  currency?: string;
  orderId?: string;
  searchQuery?: string;
  searchResults?: number;
  formName?: string;
  formFields?: Record<string, string>;
  ticketId?: string;
  ticketPriority?: 'low' | 'medium' | 'high' | 'critical';
  rating?: number;
  reviewText?: string;
  subscriptionTier?: string;
  paymentMethod?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  errorMessage?: string;
  errorCode?: string;
  [key: string]: unknown;
}

export interface GeoLocation {
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface UTMParameters {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface ICompanyInteraction {
  companyId: string;
  companyName: string;
  companyType: CompanyType;
  firstInteraction: Date;
  lastInteraction: Date;
  totalInteractions: number;
  interactionTypes: EventType[];
  channels: ChannelType[];
  revenue: number;
  orders: number;
  averageOrderValue: number;
  preferredChannel: ChannelType;
  engagementScore: number;
}

export interface ICrossCompanyPattern {
  patternId: string;
  customerId: string;
  patternType: PatternType;
  confidence: number;
  companies: string[];
  channels: ChannelType[];
  firstDetected: Date;
  lastDetected: Date;
  occurrences: number;
  description: string;
  metadata: Record<string, unknown>;
}

export interface IJourneySegment {
  segmentId: string;
  customerId: string;
  phase: JourneyPhase;
  startDate: Date;
  endDate?: Date;
  duration: number;
  companyInteractions: number;
  totalEvents: number;
  revenue: number;
  keyEvents: string[];
  channelBreakdown: Record<ChannelType, number>;
}

export interface IJourneyMilestone {
  milestoneId: string;
  customerId: string;
  milestoneType: MilestoneType;
  achievedAt: Date;
  companyId: string;
  companyName: string;
  description: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface IJourneyPrediction {
  predictionId: string;
  customerId: string;
  predictionType: 'next_interaction' | 'churn' | 'purchase' | 'upgrade' | 'referral';
  probability: number;
  predictedAt: Date;
  predictedFor: Date;
  confidence: number;
  factors: PredictionFactor[];
  recommendedActions: string[];
  modelVersion: string;
}

export interface PredictionFactor {
  factor: string;
  weight: number;
  contribution: number;
  description: string;
}

export interface IJourneyHealth {
  customerId: string;
  overallScore: number;
  status: HealthStatus;
  engagementScore: number;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  churnRisk: number;
  npsScore?: number;
  lastAssessed: Date;
  factors: HealthFactor[];
  recommendations: string[];
}

export interface HealthFactor {
  factor: string;
  score: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

// ============================================================================
// MONGOOSE DOCUMENTS
// ============================================================================

export interface IUnifiedJourney extends Document {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  companies: ICompanyInteraction[];
  totalEvents: number;
  totalRevenue: number;
  lifetimeValue: number;
  journeyStartDate: Date;
  lastActivityDate: Date;
  currentPhase: JourneyPhase;
  healthScore: number;
  healthStatus: HealthStatus;
  engagementScore: number;
  churnRisk: number;
  totalCompanies: number;
  preferredChannels: ChannelType[];
  attributes: CustomerAttributes;
  tags: string[];
  segments: string[];
  predictions: IJourneyPrediction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerAttributes {
  age?: number;
  gender?: string;
  location?: string;
  industry?: string;
  company?: string;
  jobTitle?: string;
  income?: string;
  preferences?: Record<string, unknown>;
  interests?: string[];
  communicationPreferences?: ChannelType[];
}

export interface IJourneyEventDocument extends Document {
  eventId: string;
  customerId: string;
  companyId: string;
  companyName: string;
  eventType: EventType;
  channel: ChannelType;
  timestamp: Date;
  metadata: Record<string, unknown>;
  properties: EventProperties;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: GeoLocation;
  referralSource?: string;
  utmParameters?: UTMParameters;
  enriched: boolean;
  enrichedAt?: Date;
  createdAt: Date;
}

export interface ICrossCompanyPatternDocument extends Document {
  patternId: string;
  customerId: string;
  patternType: PatternType;
  confidence: number;
  companies: string[];
  channels: ChannelType[];
  firstDetected: Date;
  lastDetected: Date;
  occurrences: number;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJourneySegmentDocument extends Document {
  segmentId: string;
  customerId: string;
  phase: JourneyPhase;
  startDate: Date;
  endDate?: Date;
  duration: number;
  companyInteractions: number;
  totalEvents: number;
  revenue: number;
  keyEvents: string[];
  channelBreakdown: Record<ChannelType, number>;
  createdAt: Date;
}

export interface IJourneyMilestoneDocument extends Document {
  milestoneId: string;
  customerId: string;
  milestoneType: MilestoneType;
  achievedAt: Date;
  companyId: string;
  companyName: string;
  description: string;
  value?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ICompany extends Document {
  companyId: string;
  name: string;
  displayName: string;
  type: CompanyType;
  description?: string;
  website?: string;
  logo?: string;
  webhookSecret?: string;
  webhookUrl?: string;
  eventTypes: EventType[];
  channels: ChannelType[];
  isActive: boolean;
  priority: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const GeoLocationSchema = new Schema<GeoLocation>(
  {
    country: { type: String },
    state: { type: String },
    city: { type: String },
    postalCode: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  { _id: false }
);

const UTMParametersSchema = new Schema<UTMParameters>(
  {
    utmSource: { type: String },
    utmMedium: { type: String },
    utmCampaign: { type: String },
    utmTerm: { type: String },
    utmContent: { type: String }
  },
  { _id: false }
);

const EventPropertiesSchema = new Schema<EventProperties>(
  {
    page: { type: String },
    pageTitle: { type: String },
    pageUrl: { type: String },
    productId: { type: String },
    productName: { type: String },
    productCategory: { type: String },
    quantity: { type: Number },
    unitPrice: { type: Number },
    totalAmount: { type: Number },
    currency: { type: String, default: 'INR' },
    orderId: { type: String },
    searchQuery: { type: String },
    searchResults: { type: Number },
    formName: { type: String },
    formFields: { type: Schema.Types.Mixed },
    ticketId: { type: String },
    ticketPriority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    rating: { type: Number, min: 1, max: 5 },
    reviewText: { type: String },
    subscriptionTier: { type: String },
    paymentMethod: { type: String },
    deviceType: { type: String },
    browser: { type: String },
    os: { type: String },
    errorMessage: { type: String },
    errorCode: { type: String }
  },
  { _id: false }
);

export const JourneyEventSchema = new Schema<IJourneyEventDocument>({
  eventId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  companyId: { type: String, required: true, index: true },
  companyName: { type: String, required: true },
  eventType: {
    type: String,
    enum: Object.values(EventType),
    required: true,
    index: true
  },
  channel: {
    type: String,
    enum: Object.values(ChannelType),
    required: true,
    index: true
  },
  timestamp: { type: Date, required: true, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  properties: { type: EventPropertiesSchema, default: {} },
  sessionId: { type: String, index: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  location: { type: GeoLocationSchema },
  referralSource: { type: String },
  utmParameters: { type: UTMParametersSchema },
  enriched: { type: Boolean, default: false },
  enrichedAt: { type: Date }
}, { timestamps: true });

// Compound indexes for efficient queries
JourneyEventSchema.index({ customerId: 1, timestamp: -1 });
JourneyEventSchema.index({ customerId: 1, companyId: 1, timestamp: -1 });
JourneyEventSchema.index({ customerId: 1, eventType: 1, timestamp: -1 });

const CustomerAttributesSchema = new Schema<CustomerAttributes>(
  {
    age: { type: Number },
    gender: { type: String },
    location: { type: String },
    industry: { type: String },
    company: { type: String },
    jobTitle: { type: String },
    income: { type: String },
    preferences: { type: Schema.Types.Mixed },
    interests: [{ type: String }],
    communicationPreferences: [{ type: String, enum: Object.values(ChannelType) }]
  },
  { _id: false }
);

const CompanyInteractionSchema = new Schema<ICompanyInteraction>(
  {
    companyId: { type: String, required: true },
    companyName: { type: String, required: true },
    companyType: { type: String, enum: Object.values(CompanyType), required: true },
    firstInteraction: { type: Date, required: true },
    lastInteraction: { type: Date, required: true },
    totalInteractions: { type: Number, default: 0 },
    interactionTypes: [{ type: String, enum: Object.values(EventType) }],
    channels: [{ type: String, enum: Object.values(ChannelType) }],
    revenue: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    preferredChannel: { type: String, enum: Object.values(ChannelType) },
    engagementScore: { type: Number, default: 0, min: 0, max: 100 }
  },
  { _id: false }
);

export const UnifiedJourneySchema = new Schema<IUnifiedJourney>({
  customerId: { type: String, required: true, unique: true, index: true },
  customerEmail: { type: String, index: true },
  customerPhone: { type: String, index: true },
  customerName: { type: String },
  companies: { type: [CompanyInteractionSchema], default: [] },
  totalEvents: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  lifetimeValue: { type: Number, default: 0 },
  journeyStartDate: { type: Date, required: true },
  lastActivityDate: { type: Date, required: true },
  currentPhase: {
    type: String,
    enum: Object.values(JourneyPhase),
    default: JourneyPhase.AWARENESS
  },
  healthScore: { type: Number, default: 50, min: 0, max: 100 },
  healthStatus: {
    type: String,
    enum: Object.values(HealthStatus),
    default: HealthStatus.GOOD
  },
  engagementScore: { type: Number, default: 0, min: 0, max: 100 },
  churnRisk: { type: Number, default: 0, min: 0, max: 1 },
  totalCompanies: { type: Number, default: 0 },
  preferredChannels: [{ type: String, enum: Object.values(ChannelType) }],
  attributes: { type: CustomerAttributesSchema, default: {} },
  tags: [{ type: String, index: true }],
  segments: [{ type: String }],
  predictions: { type: Schema.Types.Mixed, default: [] }
}, { timestamps: true });

export const CrossCompanyPatternSchema = new Schema<ICrossCompanyPatternDocument>({
  patternId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  patternType: {
    type: String,
    enum: Object.values(PatternType),
    required: true
  },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  companies: [{ type: String }],
  channels: [{ type: String, enum: Object.values(ChannelType) }],
  firstDetected: { type: Date, required: true },
  lastDetected: { type: Date, required: true },
  occurrences: { type: Number, default: 1 },
  description: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Compound indexes
CrossCompanyPatternSchema.index({ customerId: 1, patternType: 1 });
CrossCompanyPatternSchema.index({ customerId: 1, lastDetected: -1 });

export const JourneySegmentSchema = new Schema<IJourneySegmentDocument>({
  segmentId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  phase: {
    type: String,
    enum: Object.values(JourneyPhase),
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  duration: { type: Number, default: 0 },
  companyInteractions: { type: Number, default: 0 },
  totalEvents: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  keyEvents: [{ type: String }],
  channelBreakdown: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

JourneySegmentSchema.index({ customerId: 1, startDate: -1 });

export const JourneyMilestoneSchema = new Schema<IJourneyMilestoneDocument>({
  milestoneId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  milestoneType: {
    type: String,
    enum: Object.values(MilestoneType),
    required: true
  },
  achievedAt: { type: Date, required: true },
  companyId: { type: String, required: true },
  companyName: { type: String, required: true },
  description: { type: String, required: true },
  value: { type: Number },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

JourneyMilestoneSchema.index({ customerId: 1, milestoneType: 1 });
JourneyMilestoneSchema.index({ customerId: 1, achievedAt: -1 });

export const CompanySchema = new Schema<ICompany>({
  companyId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  displayName: { type: String, required: true },
  type: {
    type: String,
    enum: Object.values(CompanyType),
    required: true
  },
  description: { type: String },
  website: { type: String },
  logo: { type: String },
  webhookSecret: { type: String },
  webhookUrl: { type: String },
  eventTypes: [{ type: String, enum: Object.values(EventType) }],
  channels: [{ type: String, enum: Object.values(ChannelType) }],
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// ============================================================================
// MODELS
// ============================================================================

export const UnifiedJourney = mongoose.model<IUnifiedJourney>('UnifiedJourney', UnifiedJourneySchema);
export const JourneyEvent = mongoose.model<IJourneyEventDocument>('JourneyEvent', JourneyEventSchema);
export const CrossCompanyPattern = mongoose.model<ICrossCompanyPatternDocument>('CrossCompanyPattern', CrossCompanyPatternSchema);
export const JourneySegment = mongoose.model<IJourneySegmentDocument>('JourneySegment', JourneySegmentSchema);
export const JourneyMilestone = mongoose.model<IJourneyMilestoneDocument>('JourneyMilestone', JourneyMilestoneSchema);
export const Company = mongoose.model<ICompany>('Company', CompanySchema);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UnifiedJourneyDocument = IUnifiedJourney;
export type JourneyEventDocument = IJourneyEventDocument;
export type CrossCompanyPatternDocument = ICrossCompanyPatternDocument;
export type JourneySegmentDocument = IJourneySegmentDocument;
export type JourneyMilestoneDocument = IJourneyMilestoneDocument;
export type CompanyDocument = ICompany;
