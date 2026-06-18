// Customer Intelligence Service Types

export interface CustomerBase {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  industry?: string;
  source: string;
  sourceDetails?: Record<string, unknown>;
}

export interface CustomerIdentity {
  type: 'email' | 'phone' | 'device_id' | 'cookie_id' | 'account_id' | 'external_id';
  value: string;
  verified: boolean;
  verifiedAt?: Date;
  addedAt: Date;
}

export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  type: 'billing' | 'shipping' | 'home' | 'work';
}

export interface CustomerPreference {
  key: string;
  value: unknown;
  source?: string;
  updatedAt: Date;
}

export interface CustomerBehavior {
  event: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  source?: string;
  sessionId?: string;
}

export interface CustomerMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
  firstOrderDate?: Date;
  lifetimeDays: number;
  engagementScore: number;
  activityDays: number;
  lastActivityDate?: Date;
}

export interface CustomerRiskScore {
  overall: number;
  fraudRisk: number;
  churnRisk: number;
  creditRisk: number;
  factors: RiskFactor[];
  calculatedAt: Date;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  assignedAt: Date;
  source?: string;
}

export type CustomerStatus = 'active' | 'inactive' | 'churned' | 'blocked';
export type CustomerType = 'individual' | 'business' | 'guest';
export type CustomerTier = 'standard' | 'premium' | 'enterprise' | 'vip';

export interface Customer360 {
  id: string;
  masterId?: string;
  type: CustomerType;
  status: CustomerStatus;
  tier: CustomerTier;
  profile: {
    firstName?: string;
    lastName?: string;
    fullName: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    industry?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  identities: CustomerIdentity[];
  addresses: CustomerAddress[];
  preferences: CustomerPreference[];
  metrics: CustomerMetrics;
  riskScore: CustomerRiskScore;
  segments: CustomerSegment[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface IdentityLink {
  masterId: string;
  linkedId: string;
  linkType: 'merged' | 'resolved' | 'associated';
  confidence: number;
  matchedFields: string[];
  linkedAt: Date;
  linkedBy: string;
}

export interface RiskEvent {
  customerId: string;
  eventType: 'fraud_attempt' | 'chargeback' | 'dispute' | 'refund' | 'suspicious_activity' | 'high_value_order' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  source: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  createdAt: Date;
}

export interface SegmentDefinition {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface SegmentCriteria {
  conditions: SegmentCondition[];
  operator: 'AND' | 'OR';
}

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'exists';
  value: unknown;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MetricsSummary {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersToday: number;
  newCustomersThisWeek: number;
  newCustomersThisMonth: number;
  averageLifetimeValue: number;
  averageEngagementScore: number;
  churnRate: number;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  segmentDistribution: Record<string, number>;
}
