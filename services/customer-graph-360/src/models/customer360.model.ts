import mongoose, { Document, Schema } from 'mongoose';
import type {
  Customer360,
  Identity,
  Profile,
  Transactions,
  Interactions,
  Preferences,
  Segments,
  Predictions,
  Touchpoint,
} from '../types/index.js';

// Location subdocument schema
const LocationSchema = new Schema<Location>(
  {
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

// Demographics subdocument schema
const DemographicsSchema = new Schema<Demographics>(
  {
    age: { type: Number },
    gender: { type: String },
    location: { type: LocationSchema, required: true },
  },
  { _id: false }
);

// Psychographics subdocument schema
const PsychographicsSchema = new Schema<Psychographics>(
  {
    interests: [{ type: String }],
    values: [{ type: String }],
    lifestyle: [{ type: String }],
  },
  { _id: false }
);

// Linked account schema
const LinkedAccountSchema = new Schema<LinkedAccount>(
  {
    provider: { type: String, required: true },
    userId: { type: String, required: true },
  },
  { _id: false }
);

// Identity subdocument schema
const IdentitySchema = new Schema<Identity>(
  {
    userId: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    alternateIds: [{ type: String }],
    linkedAccounts: [LinkedAccountSchema],
  },
  { _id: false }
);

// Profile subdocument schema
const ProfileSchema = new Schema<Profile>(
  {
    demographics: { type: DemographicsSchema, required: true },
    psychographics: { type: PsychographicsSchema },
  },
  { _id: false }
);

// Touchpoint subdocument schema
const TouchpointSchema = new Schema<Touchpoint>(
  {
    app: { type: String, required: true },
    firstSeen: { type: Date, required: true },
    lastSeen: { type: Date, required: true },
    sessionCount: { type: Number, default: 0 },
  },
  { _id: false }
);

// Transactions subdocument schema
const TransactionsSchema = new Schema<Transactions>(
  {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    avgOrderValue: { type: Number, default: 0 },
    lastPurchase: { type: Date },
    favoriteCategories: [{ type: String }],
    lifetimeValue: { type: Number, default: 0 },
    paymentMethods: [{ type: String }],
  },
  { _id: false }
);

// Interactions subdocument schema
const InteractionsSchema = new Schema<Interactions>(
  {
    appsUsed: [{ type: String }],
    lastActive: { type: Date },
    engagementScore: { type: Number, default: 0, min: 0, max: 100 },
    touchpoints: [TouchpointSchema],
  },
  { _id: false }
);

// Price range subdocument schema
const PriceRangeSchema = new Schema<PriceRange>(
  {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100000 },
  },
  { _id: false }
);

// Preferences subdocument schema
const PreferencesSchema = new Schema<Preferences>(
  {
    channels: [{ type: String }],
    language: { type: String, default: 'en' },
    notificationSettings: { type: Map, of: Boolean },
    priceRange: { type: PriceRangeSchema },
    brands: [{ type: String }],
  },
  { _id: false }
);

// Historical segment schema
const HistoricalSegmentSchema = new Schema<HistoricalSegment>(
  {
    segment: { type: String, required: true },
    from: { type: Date, required: true },
    to: { type: Date },
  },
  { _id: false }
);

// Segments subdocument schema
const SegmentsSchema = new Schema<Segments>(
  {
    current: [{ type: String }],
    historical: [HistoricalSegmentSchema],
  },
  { _id: false }
);

// Predictions subdocument schema
const PredictionsSchema = new Schema<Predictions>(
  {
    churnRisk: { type: Number, default: 0, min: 0, max: 1 },
    lifetimeValue: { type: Number, default: 0 },
    nextPurchaseDate: { type: Date },
    productRecommendations: [{ type: String }],
  },
  { _id: false }
);

// Main Customer360 document schema
const Customer360ModelSchema = new Schema<Customer360 & Document>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    identity: {
      type: IdentitySchema,
      required: true,
    },
    profile: {
      type: ProfileSchema,
      required: true,
    },
    transactions: {
      type: TransactionsSchema,
      default: () => ({}),
    },
    interactions: {
      type: InteractionsSchema,
      default: () => ({
        appsUsed: [],
        engagementScore: 0,
        touchpoints: [],
      }),
    },
    preferences: {
      type: PreferencesSchema,
      default: () => ({
        channels: ['push'],
        language: 'en',
        notificationSettings: {},
        priceRange: { min: 0, max: 100000 },
        brands: [],
      }),
    },
    segments: {
      type: SegmentsSchema,
      default: () => ({
        current: [],
        historical: [],
      }),
    },
    predictions: {
      type: PredictionsSchema,
      default: () => ({
        churnRisk: 0,
        lifetimeValue: 0,
        productRecommendations: [],
      }),
    },
    lastSynced: {
      type: Date,
    },
    dataSources: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'customer360',
  }
);

// Indexes
Customer360ModelSchema.index({ 'identity.email': 1 });
Customer360ModelSchema.index({ 'identity.phone': 1 });
Customer360ModelSchema.index({ 'interactions.lastActive': -1 });
Customer360ModelSchema.index({ 'transactions.lifetimeValue': -1 });
Customer360ModelSchema.index({ 'segments.current': 1 });
Customer360ModelSchema.index({ 'predictions.churnRisk': -1 });

// Methods
Customer360ModelSchema.methods.addTouchpoint = function (app: string) {
  const touchpoint = this.interactions.touchpoints.find(
    (tp: Touchpoint) => tp.app === app
  );

  if (touchpoint) {
    touchpoint.lastSeen = new Date();
    touchpoint.sessionCount += 1;
  } else {
    this.interactions.touchpoints.push({
      app,
      firstSeen: new Date(),
      lastSeen: new Date(),
      sessionCount: 1,
    });
    this.interactions.appsUsed.push(app);
  }

  return this;
};

Customer360ModelSchema.methods.updateSegments = function (
  segment: string,
  addToCurrent: boolean = true
) {
  const now = new Date();

  // Remove from current if exists
  const currentIndex = this.segments.current.indexOf(segment);
  if (currentIndex > -1 && !addToCurrent) {
    this.segments.current.splice(currentIndex, 1);
    this.segments.historical.push({
      segment,
      from: now,
      to: now,
    });
  }

  // Add to current if needed
  if (addToCurrent && !this.segments.current.includes(segment)) {
    this.segments.current.push(segment);
  }

  return this;
};

Customer360ModelSchema.methods.calculateEngagementScore = function (): number {
  const now = new Date();
  const lastActive = this.interactions.lastActive;

  if (!lastActive) return 0;

  const daysSinceActive = Math.floor(
    (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Score based on recency
  let recencyScore = Math.max(0, 100 - daysSinceActive * 10);

  // Score based on app diversity
  const appDiversityScore = Math.min(
    100,
    this.interactions.appsUsed.length * 20
  );

  // Score based on session count
  const totalSessions = this.interactions.touchpoints.reduce(
    (sum: number, tp: Touchpoint) => sum + tp.sessionCount,
    0
  );
  const sessionScore = Math.min(100, totalSessions);

  // Weighted average
  return Math.round(
    recencyScore * 0.4 + appDiversityScore * 0.3 + sessionScore * 0.3
  );
};

// Static methods
Customer360ModelSchema.statics.findByUserId = function (userId: string) {
  return this.findOne({ userId });
};

Customer360ModelSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ 'identity.email': email });
};

Customer360ModelSchema.statics.findByPhone = function (phone: string) {
  return this.findOne({ 'identity.phone': phone });
};

Customer360ModelSchema.statics.findBySegment = function (segment: string) {
  return this.find({ 'segments.current': segment });
};

Customer360ModelSchema.statics.findHighValueCustomers = function (threshold: number = 10000) {
  return this.find({
    'transactions.lifetimeValue': { $gte: threshold },
  }).sort({ 'transactions.lifetimeValue': -1 });
};

Customer360ModelSchema.statics.findAtRiskCustomers = function (threshold: number = 0.7) {
  return this.find({
    'predictions.churnRisk': { $gte: threshold },
  }).sort({ 'predictions.churnRisk': -1 });
};

// Create and export the model
export const Customer360Model = mongoose.model<Customer360 & Document>(
  'Customer360',
  Customer360ModelSchema
);

export default Customer360Model;

// Type definitions for subdocuments
interface Location {
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
}

interface Demographics {
  age?: number;
  gender?: string;
  location: Location;
}

interface Psychographics {
  interests: string[];
  values: string[];
  lifestyle: string[];
}

interface LinkedAccount {
  provider: string;
  userId: string;
}

interface Identity {
  userId: string;
  email?: string;
  phone?: string;
  alternateIds: string[];
  linkedAccounts: LinkedAccount[];
}

interface Profile {
  demographics: Demographics;
  psychographics?: Psychographics;
}

interface Touchpoint {
  app: string;
  firstSeen: Date;
  lastSeen: Date;
  sessionCount: number;
}

interface Transactions {
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  lastPurchase?: Date;
  favoriteCategories: string[];
  lifetimeValue: number;
  paymentMethods: string[];
}

interface Interactions {
  appsUsed: string[];
  lastActive?: Date;
  engagementScore: number;
  touchpoints: Touchpoint[];
}

interface PriceRange {
  min: number;
  max: number;
}

interface Preferences {
  channels: string[];
  language: string;
  notificationSettings: Record<string, boolean>;
  priceRange: PriceRange;
  brands: string[];
}

interface HistoricalSegment {
  segment: string;
  from: Date;
  to?: Date;
}

interface Segments {
  current: string[];
  historical: HistoricalSegment[];
}

interface Predictions {
  churnRisk: number;
  lifetimeValue: number;
  nextPurchaseDate?: Date;
  productRecommendations: string[];
}