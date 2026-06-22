// API Types
export interface Brand {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  logo?: string;
  industry?: string;
  stats: BrandStats;
}

export interface BrandStats {
  totalReviews: number;
  averageRating: number;
  sentimentScore: number;
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  lastUpdated: string;
}

export interface Review {
  id: string;
  reviewId: string;
  content: string;
  rating: number;
  title?: string;
  source: 'google' | 'yelp' | 'tripadvisor' | 'facebook' | 'direct' | 'internal';
  author: {
    name: string;
    avatar?: string;
    isVerified: boolean;
  };
  sentiment: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
    aspects?: { name: string; score: number; mentions: number }[];
    keywords?: string[];
  };
  engagement?: { helpful: number; shares: number; clicks: number };
  responses?: { content: string; author: string; createdAt: string }[];
  moderation?: { status: string };
  sourceUrl?: string;
  publishedAt: string;
}

export interface SentimentTrend {
  period: 'day' | 'week' | 'month';
  data: TimeSeriesData[];
  overall: {
    current: number;
    previous: number;
    change: number;
    percentChange: number;
  };
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface RatingDistribution {
  distribution: Record<number, number>;
  average: number;
  median: number;
}

export interface SourceBreakdown {
  sources: Record<string, {
    count: number;
    avgRating: number;
    avgSentiment: number;
  }>;
  total: number;
}

export interface AspectAnalysis {
  aspects: Aspect[];
  overall: {
    score: number;
    label: string;
  };
}

export interface Aspect {
  name: string;
  mentions: number;
  score: number;
  trend: string;
}

export interface Alert {
  id: string;
  type: 'negative_spike' | 'low_rating' | 'negative_review' | 'competitor_mention' | 'trend_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewId?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
