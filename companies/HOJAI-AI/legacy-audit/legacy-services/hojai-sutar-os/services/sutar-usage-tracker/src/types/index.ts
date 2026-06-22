// ============================================================================
// SUTAR Usage Tracker - Types
// ============================================================================

// Usage Event Types
export type UsageEventType =
  | 'api_call'
  | 'storage'
  | 'compute'
  | 'bandwidth'
  | 'memory'
  | 'requests'
  | 'custom';

export type QuotaPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type CostUnit = 'INR' | 'USD' | 'credits';

// Usage Event
export interface UsageEvent {
  id: string;
  entityId: string;
  service: string;
  eventType: UsageEventType;
  quantity: number;
  unit: string;
  cost?: number;
  metadata?: Record<string, any>;
  timestamp: string;
  periodStart: string;
  periodEnd: string;
}

// Resource Consumption
export interface ResourceConsumption {
  entityId: string;
  service: string;
  resources: {
    cpu?: number;
    memory?: number;
    storage?: number;
    bandwidth?: number;
    requests?: number;
    apiCalls?: number;
    compute?: number;
  };
  period: QuotaPeriod;
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
}

// Usage Quota
export interface UsageQuota {
  entityId: string;
  quotas: {
    apiCalls?: { limit: number; used: number; period: QuotaPeriod };
    storage?: { limit: number; used: number; period: QuotaPeriod };
    bandwidth?: { limit: number; used: number; period: QuotaPeriod };
    compute?: { limit: number; used: number; period: QuotaPeriod };
    memory?: { limit: number; used: number; period: QuotaPeriod };
    custom?: { [key: string]: { limit: number; used: number; period: QuotaPeriod } };
  };
  rateLimits: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Cost Configuration
export interface CostConfig {
  pricing: {
    [key in UsageEventType]?: { pricePerUnit: number; unit: string };
  };
  discounts: {
    volumeTiers: { threshold: number; discountPercent: number }[];
    loyaltyDiscounts: { [entityId: string]: number };
  };
  billingCycle: QuotaPeriod;
}

// Usage Report
export interface UsageReport {
  entityId: string;
  period: { start: string; end: string };
  summary: {
    totalEvents: number;
    totalCost: number;
    totalQuantity: number;
    byService: { [service: string]: { events: number; cost: number; quantity: number } };
    byType: { [type in UsageEventType]?: { events: number; cost: number; quantity: number } };
  };
  quotas: UsageQuota;
  consumption: ResourceConsumption;
}

// Rate Limit Status
export interface RateLimitStatus {
  entityId: string;
  currentRate: number;
  limit: number;
  windowMs: number;
  remainingRequests: number;
  resetAt: string;
  blocked: boolean;
}

// External Integrations
export interface EconomyOSConfig {
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
}

export interface ContractOSConfig {
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface TrackUsageRequest {
  entityId: string;
  service: string;
  eventType: UsageEventType;
  quantity: number;
  unit: string;
  metadata?: Record<string, any>;
  skipCostCalculation?: boolean;
}

export interface UpdateQuotaRequest {
  quotas?: UsageQuota['quotas'];
  rateLimits?: UsageQuota['rateLimits'];
}

// Health Response
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  integrations?: {
    economyOS?: { connected: boolean; url: string };
    contractOS?: { connected: boolean; url: string };
  };
}