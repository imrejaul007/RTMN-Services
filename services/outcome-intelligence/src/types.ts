// Core Types for Outcome Intelligence Service

export interface RevenueImpact {
  saved: number;
  protected: number;
  cost: number;
}

export interface CustomerImpact {
  retained: boolean;
  churned: boolean;
  promoted: boolean;
  npsBefore?: number;
  npsAfter?: number;
}

export interface BusinessImpact {
  upsell: boolean;
  upsellAmount?: number;
  referral: boolean;
  referralCount?: number;
  riskIdentified: boolean;
  riskSeverity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ResolutionMetrics {
  csatBefore?: number;
  csatAfter?: number;
  resolutionTimeMinutes: number;
  firstResponseTimeMinutes?: number;
  agentId?: string;
}

export interface OutcomeRecord {
  outcomeId: string;
  tenantId: string;
  ticketId: string;
  interactionId?: string;
  timestamp: Date;
  revenueImpact: RevenueImpact;
  customerImpact: CustomerImpact;
  businessImpact: BusinessImpact;
  metrics: ResolutionMetrics;
  metadata?: Record<string, unknown>;
  calculatedAt?: Date;
}

export interface AggregatedMetrics {
  tenantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totals: {
    totalRevenueSaved: number;
    totalRevenueProtected: number;
    totalRevenueCost: number;
    totalCustomersRetained: number;
    totalCustomersChurned: number;
    totalUpsellsGenerated: number;
    totalUpsellAmount: number;
    totalReferralsCreated: number;
    totalRisksIdentified: number;
    totalOutcomesTracked: number;
  };
  averages: {
    avgCsatImprovement: number;
    avgResolutionTime: number;
    avgRevenuePerTicket: number;
  };
  trends: {
    revenueSavedTrend: number;
    retentionRate: number;
    upsellConversionRate: number;
  };
}

export interface DashboardData {
  tenantId: string;
  summary: {
    totalRevenueSaved: number;
    totalRevenueProtected: number;
    customersRetained: number;
    churnPrevented: number;
    upsellsGenerated: number;
    referralsCreated: number;
    risksIdentified: number;
  };
  performance: {
    avgCsatImprovement: number;
    avgResolutionTime: number;
    totalTicketsProcessed: number;
  };
  topOutcomes: OutcomeRecord[];
  periodOverPeriod: {
    current: AggregatedMetrics;
    previous?: AggregatedMetrics;
  };
}

export interface ReportFilters {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  period?: 'daily' | 'weekly' | 'monthly';
  minRevenueSaved?: number;
  includeChurned?: boolean;
  groupBy?: 'ticket' | 'agent' | 'channel' | 'category';
}

export interface OutcomeAnalytics {
  revenueSavedPerTicket: number;
  customerRetentionRate: number;
  churnPreventionRate: number;
  upsellConversionRate: number;
  referralRate: number;
  riskDetectionRate: number;
  averageResolutionTime: number;
  csatImprovement: number;
  netPromoterScoreImprovement: number;
  roiPercentage: number;
}

// API Request/Response Types

export interface TrackOutcomeRequest {
  ticketId: string;
  interactionId?: string;
  revenueImpact: RevenueImpact;
  customerImpact: CustomerImpact;
  businessImpact: BusinessImpact;
  metrics: ResolutionMetrics;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsResponse {
  success: boolean;
  data: OutcomeAnalytics;
  timestamp: Date;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
  timestamp: Date;
}

export interface ReportResponse {
  success: boolean;
  data: {
    report: AggregatedMetrics;
    breakdown: Record<string, unknown>[];
  };
  timestamp: Date;
}
