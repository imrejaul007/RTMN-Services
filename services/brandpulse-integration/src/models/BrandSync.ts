import { v4 as uuidv4 } from 'uuid';

// Sync status enum
export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

// Sync type enum
export enum SyncType {
  CAMPAIGN = 'campaign',
  MENTION = 'mention',
  SENTIMENT = 'sentiment',
  FULL = 'full'
}

// Brand sentiment data
export interface BrandSentiment {
  brandId: string;
  platform: string;
  score: number; // -1 to 1 (negative to positive)
  positive: number;
  negative: number;
  neutral: number;
  volume: number;
  trending: 'up' | 'down' | 'stable';
  keywords: string[];
  timestamp: Date;
}

// Brand mention data
export interface BrandMention {
  id: string;
  brandId: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube' | 'news' | 'blog' | 'forum' | 'review';
  authorId: string;
  authorName: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  reach: number;
  impressions: number;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    replies: number;
  };
  hashtags: string[];
  mentions: string[]; // other brands mentioned
  url: string;
  createdAt: Date;
  syncedAt?: Date;
}

// Brand campaign data
export interface BrandCampaign {
  id: string;
  brandId: string;
  name: string;
  description: string;
  objective: 'awareness' | 'engagement' | 'conversion' | 'loyalty' | 'reputation';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  platforms: string[];
  budget: {
    total: number;
    spent: number;
    currency: string;
  };
  targetAudience: {
    demographics?: {
      ageRange?: { min: number; max: number };
      gender?: string[];
      locations?: string[];
    };
    interests?: string[];
    behaviors?: string[];
  };
  creativeAssets: {
    id: string;
    type: 'image' | 'video' | 'text' | 'story';
    url: string;
    thumbnails?: string[];
  }[];
  metrics: {
    impressions: number;
    reach: number;
    clicks: number;
    conversions: number;
    ctr: number;
    roas: number;
    engagement: number;
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

// Brand health KPIs
export interface BrandHealthKPIs {
  brandId: string;
  overallScore: number; // 0-100
  metrics: {
    awareness: {
      score: number;
      trend: number;
      reach: number;
      impressions: number;
    };
    sentiment: {
      score: number;
      trend: number;
      positiveRatio: number;
      negativeRatio: number;
    };
    engagement: {
      score: number;
      trend: number;
      rate: number;
      interactions: number;
    };
    reputation: {
      score: number;
      trend: number;
      reviewRating: number;
      crisisRisk: 'low' | 'medium' | 'high' | 'critical';
    };
  };
  competitivePosition: {
    rank: number;
    shareOfVoice: number;
    shareOfEngagement: number;
  };
  risks: {
    type: 'sentiment_drop' | 'viral_negative' | 'crisis' | 'competition';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
  }[];
  opportunities: {
    type: 'trend' | 'partnership' | 'content' | 'campaign';
    title: string;
    description: string;
    potential: number; // 0-100
    detectedAt: Date;
  }[];
  period: {
    start: Date;
    end: Date;
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  };
  updatedAt: Date;
}

// Sync record
export interface SyncRecord {
  id: string;
  type: SyncType;
  status: SyncStatus;
  sourceId?: string;
  targetService: string;
  data: Record<string, any>;
  result?: {
    success: boolean;
    message?: string;
    recordsProcessed: number;
    recordsFailed: number;
    duration: number;
    errors?: { index: number; error: string }[];
  };
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

// Brand entity
export interface Brand {
  id: string;
  name: string;
  slug: string;
  industry: string;
  verticals: string[];
  logos?: {
    primary: string;
    secondary?: string;
    favicon?: string;
  };
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  socialProfiles?: {
    platform: string;
    handle: string;
    url: string;
    followers: number;
  }[];
  keywords: string[]; // brand keywords for monitoring
  competitors: string[]; // competitor brand IDs
  settings: {
    sentimentThresholds: {
      positive: number; // >= this is positive
      negative: number; // <= this is negative
    };
    alertThresholds: {
      negativeVolume: number; // alert if negative mentions > this
      crisisVelocity: number; // alert if mentions increase by this % in 1 hour
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Touchpoint for Journey Twin
export interface BrandTouchpoint {
  id: string;
  brandId: string;
  journeyId?: string;
  customerId?: string;
  type: 'social_mention' | 'ad_impression' | 'content_interaction' | 'review' | 'support' | 'purchase';
  source: string;
  channel: string;
  content?: string;
  sentiment?: number;
  engagement?: {
    views: number;
    clicks?: number;
    shares?: number;
    comments?: number;
  };
  metadata?: Record<string, any>;
  timestamp: Date;
}

// Trust signal
export interface TrustSignal {
  id: string;
  brandId: string;
  source: 'social' | 'review' | 'news' | 'support' | 'compliance';
  type: string;
  score: number; // 0-100
  weight: number; // importance weight
  description: string;
  sourceUrl?: string;
  detectedAt: Date;
  expiresAt?: Date;
}

// Helper to create new sync record
export function createSyncRecord(
  type: SyncType,
  targetService: string,
  data: Record<string, any>,
  sourceId?: string
): SyncRecord {
  return {
    id: uuidv4(),
    type,
    status: SyncStatus.PENDING,
    sourceId,
    targetService,
    data,
    startedAt: new Date(),
    createdAt: new Date()
  };
}

// Helper to update sync record with result
export function completeSyncRecord(
  record: SyncRecord,
  result: SyncRecord['result']
): SyncRecord {
  return {
    ...record,
    status: result?.success ? SyncStatus.COMPLETED : SyncStatus.FAILED,
    result,
    completedAt: new Date()
  };
}

// In-memory store for sync records (replace with DB in production)
const syncRecords: Map<string, SyncRecord> = new Map();

export const syncStore = {
  save: async (record: SyncRecord): Promise<void> => {
    syncRecords.set(record.id, record);
  },

  get: async (id: string): Promise<SyncRecord | undefined> => {
    return syncRecords.get(id);
  },

  getByStatus: async (status: SyncStatus): Promise<SyncRecord[]> => {
    return Array.from(syncRecords.values()).filter(r => r.status === status);
  },

  getByType: async (type: SyncType): Promise<SyncRecord[]> => {
    return Array.from(syncRecords.values()).filter(r => r.type === type);
  },

  getRecent: async (limit: number = 100): Promise<SyncRecord[]> => {
    return Array.from(syncRecords.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },

  update: async (id: string, updates: Partial<SyncRecord>): Promise<SyncRecord | undefined> => {
    const existing = syncRecords.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    syncRecords.set(id, updated);
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    return syncRecords.delete(id);
  },

  clear: async (): Promise<void> => {
    syncRecords.clear();
  }
};
