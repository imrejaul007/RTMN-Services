/**
 * Cross-Ecosystem Bridge - TypeScript Interfaces
 * Defines types for cross-service profiles, links, and offers
 */

export interface EcosystemProfile {
  _id?: string;
  profileId: string;
  tenantId: string;

  // Primary identifiers across services
  identifiers: {
    corpidUserId?: string;
    hojaiGenieId?: string;
    rezConsumerId?: string;
    rezMerchantId?: string;
    stayownGuestId?: string;
    adbazaarProfileId?: string;
    email?: string;
    phone?: string;
  };

  // Unified profile data
  profile: {
    name?: {
      first?: string;
      last?: string;
      full?: string;
    };
    email?: string;
    phone?: string;
    avatar?: string;
    language?: string;
    timezone?: string;
    preferences?: Record<string, unknown>;
  };

  // Service-specific summaries
  serviceSummaries: {
    hojai?: HojaiSummary;
    rez?: RezSummary;
    stayown?: StayownSummary;
    adbazaar?: AdbazaarSummary;
    corpid?: CorpIDSummary;
  };

  // Engagement metrics
  engagement: {
    totalInteractions: number;
    lastActivity: Date;
    activityFrequency: 'daily' | 'weekly' | 'monthly' | 'rare';
    preferredServices: string[];
    engagementScore: number; // 0-100
  };

  // Identity resolution
  identityResolution: {
    confidence: number; // 0-100
    resolvedAt?: Date;
    sources: string[];
    conflicts?: IdentityConflict[];
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface HojaiSummary {
  userId: string;
  genieInteractions: number;
  memoryUsage: 'high' | 'medium' | 'low';
  aiPreferences: Record<string, unknown>;
  lastInteraction?: Date;
}

export interface RezSummary {
  consumerId?: string;
  merchantId?: string;
  totalOrders: number;
  totalSpend: number;
  loyaltyPoints: number;
  favoriteCategories: string[];
  lastOrderDate?: Date;
  paymentMethods: string[];
}

export interface StayownSummary {
  guestId?: string;
  stays: number;
  totalNights: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  roomPreferences: string[];
  amenitiesUsed: string[];
  lastStay?: Date;
}

export interface AdbazaarSummary {
  profileId?: string;
  adsViewed: number;
  clicks: number;
  conversions: number;
  campaignsJoined: string[];
  loyaltyPoints: number;
  interests: string[];
}

export interface CorpIDSummary {
  userId?: string;
  verified: boolean;
  verificationLevel: 'basic' | 'verified' | 'premium';
  linkedServices: string[];
  trustScore: number;
}

export interface IdentityConflict {
  field: string;
  values: { source: string; value: unknown }[];
  resolvedValue?: unknown;
}

export interface CrossServiceLink {
  _id?: string;
  linkId: string;
  tenantId: string;

  // Link type and metadata
  type: 'account' | 'household' | 'business' | 'referral' | 'transaction';

  // Connected entities
  entities: {
    service: EcosystemService;
    entityType: string;
    entityId: string;
    role: 'primary' | 'secondary' | 'dependent';
    linkedAt: Date;
    metadata?: Record<string, unknown>;
  }[];

  // Link properties
  properties: {
    sharedPhone?: string;
    sharedEmail?: string;
    sharedAddress?: string;
    relationshipType?: string;
  };

  // Status
  status: 'active' | 'pending' | 'suspended' | 'terminated';
  verifiedAt?: Date;
  verifiedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type EcosystemService =
  | 'hojai'
  | 'rez-consumer'
  | 'rez-merchant'
  | 'rez-pos'
  | 'stayown'
  | 'adbazaar'
  | 'corpid'
  | 'rtmn-gateway';

export interface CrossServiceOffer {
  _id?: string;
  offerId: string;
  tenantId: string;

  // Offer details
  offerType: 'discount' | 'voucher' | 'upgrade' | 'cashback' | 'points' | 'service';
  category: 'hotel' | 'restaurant' | 'retail' | 'healthcare' | 'entertainment' | 'cross-service';
  title: string;
  description: string;

  // Value
  value: {
    amount?: number;
    currency?: string;
    percentage?: number;
    points?: number;
    serviceType?: string;
    serviceDetails?: Record<string, unknown>;
  };

  // Targeting
  targeting: {
    profileIds?: string[];
    serviceIds?: string[];
    segments?: string[];
    conditions?: OfferCondition[];
  };

  // Validity
  validFrom: Date;
  validUntil: Date;
  maxRedemptions?: number;
  redemptions: number;

  // Status
  status: 'active' | 'paused' | 'expired' | 'exhausted';

  // Analytics
  analytics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface OfferCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: unknown;
}

export interface EngagementPattern {
  _id?: string;
  patternId: string;
  tenantId: string;

  profileId: string;
  service: EcosystemService;

  // Pattern data
  pattern: {
    type: 'recency' | 'frequency' | 'monetary' | 'sequence' | 'preference';
    frequency: string;
    recencyDays: number;
    value?: number;
    services: string[];
  };

  // Analysis
  analysis: {
    confidence: number;
    seasonality?: string[];
    trends: 'increasing' | 'stable' | 'decreasing';
    anomalies: string[];
  };

  // Predictions
  predictions: {
    nextAction?: Date;
    churnRisk?: 'high' | 'medium' | 'low';
    lifetimeValue?: number;
  };

  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ProfileSearchParams {
  query?: string;
  tenantId: string;
  services?: EcosystemService[];
  segments?: string[];
  limit?: number;
  offset?: number;
}

export interface IdentityResolutionRequest {
  tenantId: string;
  identifiers: {
    email?: string;
    phone?: string;
    corpidUserId?: string;
    hojaiGenieId?: string;
    rezConsumerId?: string;
  };
  options?: {
    mergeExisting?: boolean;
    confidenceThreshold?: number;
  };
}

export interface OfferGenerationRequest {
  tenantId: string;
  profileId: string;
  context: {
    trigger: 'purchase' | 'refund' | 'loyalty' | 'birthday' | 'inactivity' | 'cross_sell';
    relatedService?: EcosystemService;
    originalAmount?: number;
    originalService?: string;
  };
  preferences?: {
    maxValue?: number;
    categories?: string[];
    excludeServices?: string[];
  };
}
