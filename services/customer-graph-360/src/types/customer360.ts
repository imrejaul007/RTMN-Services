import { z } from 'zod';

/**
 * Customer Graph 360 - Unified Customer View Types
 * Aggregates data from all REZ ecosystem touchpoints
 */

// Location Schema
export const LocationSchema = z.object({
  city: z.string(),
  state: z.string(),
  country: z.string().default('India'),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// Demographics Schema
export const DemographicsSchema = z.object({
  age: z.number().optional(),
  gender: z.string().optional(),
  location: LocationSchema,
});

// Psychographics Schema
export const PsychographicsSchema = z.object({
  interests: z.array(z.string()).default([]),
  values: z.array(z.string()).default([]),
  lifestyle: z.array(z.string()).default([]),
});

// Linked Account Schema
export const LinkedAccountSchema = z.object({
  provider: z.string(),
  userId: z.string(),
});

// Identity Schema
export const IdentitySchema = z.object({
  userId: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  alternateIds: z.array(z.string()).default([]),
  linkedAccounts: z.array(LinkedAccountSchema).default([]),
});

// Profile Schema
export const ProfileSchema = z.object({
  demographics: DemographicsSchema,
  psychographics: PsychographicsSchema.optional(),
});

// Touchpoint Schema
export const TouchpointSchema = z.object({
  app: z.string(),
  firstSeen: z.date(),
  lastSeen: z.date(),
  sessionCount: z.number().default(0),
});

// Transactions Schema
export const TransactionsSchema = z.object({
  totalOrders: z.number().default(0),
  totalSpent: z.number().default(0),
  avgOrderValue: z.number().default(0),
  lastPurchase: z.date().optional(),
  favoriteCategories: z.array(z.string()).default([]),
  lifetimeValue: z.number().default(0),
  paymentMethods: z.array(z.string()).default([]),
});

// Interactions Schema
export const InteractionsSchema = z.object({
  appsUsed: z.array(z.string()).default([]),
  lastActive: z.date().optional(),
  engagementScore: z.number().min(0).max(100).default(0),
  touchpoints: z.array(TouchpointSchema).default([]),
});

// Price Range Schema
export const PriceRangeSchema = z.object({
  min: z.number().default(0),
  max: z.number().default(100000),
});

// Preferences Schema
export const PreferencesSchema = z.object({
  channels: z.array(z.string()).default(['push']),
  language: z.string().default('en'),
  notificationSettings: z.record(z.boolean()).default({}),
  priceRange: PriceRangeSchema,
  brands: z.array(z.string()).default([]),
});

// Historical Segment Schema
export const HistoricalSegmentSchema = z.object({
  segment: z.string(),
  from: z.date(),
  to: z.date().optional(),
});

// Segments Schema
export const SegmentsSchema = z.object({
  current: z.array(z.string()).default([]),
  historical: z.array(HistoricalSegmentSchema).default([]),
});

// Predictions Schema
export const PredictionsSchema = z.object({
  churnRisk: z.number().min(0).max(1).default(0),
  lifetimeValue: z.number().default(0),
  nextPurchaseDate: z.date().optional(),
  productRecommendations: z.array(z.string()).default([]),
});

// Main Customer 360 Schema
export const Customer360Schema = z.object({
  userId: z.string(),
  identity: IdentitySchema,
  profile: ProfileSchema,
  transactions: TransactionsSchema.default({}),
  interactions: InteractionsSchema.default({}),
  preferences: PreferencesSchema.default({}),
  segments: SegmentsSchema.default({}),
  predictions: PredictionsSchema.default({}),
  lastSynced: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// Types
export type Location = z.infer<typeof LocationSchema>;
export type Demographics = z.infer<typeof DemographicsSchema>;
export type Psychographics = z.infer<typeof PsychographicsSchema>;
export type LinkedAccount = z.infer<typeof LinkedAccountSchema>;
export type Identity = z.infer<typeof IdentitySchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Touchpoint = z.infer<typeof TouchpointSchema>;
export type Transactions = z.infer<typeof TransactionsSchema>;
export type Interactions = z.infer<typeof InteractionsSchema>;
export type PriceRange = z.infer<typeof PriceRangeSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type HistoricalSegment = z.infer<typeof HistoricalSegmentSchema>;
export type Segments = z.infer<typeof SegmentsSchema>;
export type Predictions = z.infer<typeof PredictionsSchema>;
export type Customer360 = z.infer<typeof Customer360Schema>;

// API Response Types
export interface Customer360Response {
  success: boolean;
  data?: Customer360;
  error?: string;
}

export interface InteractionResponse {
  success: boolean;
  data?: Touchpoint[];
  error?: string;
}

export interface PurchaseResponse {
  success: boolean;
  data?: {
    orders: Order[];
    total: number;
    totalSpent: number;
  };
  error?: string;
}

export interface PreferencesResponse {
  success: boolean;
  data?: Preferences;
  error?: string;
}

export interface SegmentsResponse {
  success: boolean;
  data?: Segments;
  error?: string;
}

export interface SyncResponse {
  success: boolean;
  syncedAt: Date;
  sources: string[];
  recordsProcessed: number;
}

export interface EnrichResponse {
  success: boolean;
  enrichedFields: string[];
  confidence: number;
}

// Supporting Types
export interface Order {
  orderId: string;
  app: string;
  amount: number;
  category: string;
  date: Date;
  paymentMethod: string;
}

export interface InteractionEvent {
  userId: string;
  app: string;
  event: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Data Source Types
export type DataSource = 'RABTUL' | 'BUZZLOCAL' | 'AIRZY' | 'REZ_MENU_QR' | 'REZ_NOW' | 'RISACARE';

export interface DataSourceConfig {
  name: DataSource;
  url: string;
  enabled: boolean;
}