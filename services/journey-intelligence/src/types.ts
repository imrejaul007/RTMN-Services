/**
 * Journey Intelligence Types
 * Core type definitions for customer journey tracking and analytics
 */

// Journey Stages
export enum JourneyStage {
  AWARENESS = 'awareness',
  CONSIDERATION = 'consideration',
  ACQUISITION = 'acquisition',
  ACTIVATION = 'activation',
  RETENTION = 'retention',
  REFERRAL = 'referral'
}

// Touchpoint Types
export enum TouchpointType {
  AD = 'ad',
  WEBSITE = 'website',
  SIGNUP = 'signup',
  PURCHASE = 'purchase',
  DELIVERY = 'delivery',
  SUPPORT = 'support',
  REVIEW = 'review',
  REPEAT = 'repeat',
  REFERRAL = 'referral',
  EMAIL = 'email',
  SOCIAL = 'social',
  SEARCH = 'search',
  APP = 'app',
  CALL = 'call',
  CHAT = 'chat'
}

// Attribution Models
export enum AttributionModel {
  LAST_TOUCH = 'last_touch',
  FIRST_TOUCH = 'first_touch',
  LINEAR = 'linear',
  TIME_DECAY = 'time_decay',
  POSITION_BASED = 'position_based',
  DATA_DRIVEN = 'data_driven'
}

// Touchpoint Source
export interface TouchpointSource {
  type: TouchpointType;
  channel?: string;
  campaign?: string;
  content?: string;
  medium?: string;
  source?: string;
  referrer?: string;
}

// Customer Journey
export interface ICustomerJourney {
  _id?: string;
  customerId: string;
  tenantId: string;
  currentStage: JourneyStage;
  stages: JourneyStageHistory[];
  touchpoints: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  convertedAt?: Date;
  churnedAt?: Date;
  lifetime: number; // in days
  value: number; // customer lifetime value
}

export interface JourneyStageHistory {
  stage: JourneyStage;
  enteredAt: Date;
  exitedAt?: Date;
  touchpointId?: string;
  metadata?: Record<string, unknown>;
}

// Touchpoint
export interface ITouchpoint {
  _id?: string;
  touchpointId: string;
  customerId: string;
  tenantId: string;
  type: TouchpointType;
  source: TouchpointSource;
  journeyId?: string;
  journeyStage?: JourneyStage;
  timestamp: Date;
  duration?: number; // seconds spent
  revenue?: number;
  metadata: Record<string, unknown>;
  properties: TouchpointProperties;
  sessionId?: string;
  deviceInfo?: DeviceInfo;
  location?: GeoLocation;
  converted: boolean;
  createdAt: Date;
}

export interface TouchpointProperties {
  url?: string;
  pageTitle?: string;
  searchQuery?: string;
  adId?: string;
  adGroup?: string;
  keyword?: string;
  placement?: string;
  conversionValue?: number;
  eventType?: string;
  elementId?: string;
}

export interface DeviceInfo {
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  screenWidth?: number;
  screenHeight?: number;
}

export interface GeoLocation {
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// Funnel
export interface IFunnel {
  _id?: string;
  funnelId: string;
  tenantId: string;
  name: string;
  description?: string;
  stages: FunnelStage[];
  filters?: FunnelFilters;
  dateRange: DateRange;
  createdAt: Date;
  updatedAt: Date;
}

export interface FunnelStage {
  name: string;
  order: number;
  required: boolean;
  targetCount?: number;
  conversionTarget?: number; // target conversion rate
}

export interface FunnelFilters {
  customerIds?: string[];
  segments?: string[];
  channels?: string[];
  campaigns?: string[];
  excludeChannels?: string[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Funnel Analysis
export interface FunnelAnalysis {
  funnelId: string;
  tenantId: string;
  stages: FunnelStageResult[];
  totalEntered: number;
  totalConverted: number;
  overallConversionRate: number;
  dropOffPoints: DropOffPoint[];
  timeToConversion: TimeStats;
  segmentBreakdown: SegmentResult[];
  dateRange: DateRange;
  generatedAt: Date;
}

export interface FunnelStageResult {
  stageName: string;
  order: number;
  entered: number;
  exited: number;
  converted: number;
  conversionRate: number;
  avgTimeInStage: number; // seconds
  dropOffRate: number;
}

export interface DropOffPoint {
  fromStage: string;
  toStage: string;
  dropOffCount: number;
  dropOffRate: number;
  commonExitTouchpoints: TouchpointType[];
  reasons?: string[];
}

export interface TimeStats {
  avgTimeToConvert: number;
  medianTimeToConvert: number;
  minTimeToConvert: number;
  maxTimeToConvert: number;
  distribution: Record<string, number>;
}

export interface SegmentResult {
  segmentName: string;
  entered: number;
  converted: number;
  conversionRate: number;
}

// Journey Insights
export interface JourneyInsights {
  customerId: string;
  tenantId: string;
  journeyId: string;
  currentStage: JourneyStage;
  stageProgress: StageProgress;
  touchpointCount: number;
  totalRevenue: number;
  avgSessionDuration: number;
  engagementScore: number;
  conversionProbability: number;
  predictedChurnRisk: number;
  recommendations: Recommendation[];
  insights: Insight[];
  generatedAt: Date;
}

export interface StageProgress {
  stage: JourneyStage;
  enteredAt: Date;
  duration: number; // seconds in this stage
  progress: number; // 0-100
  nextStage?: JourneyStage;
  timeToNextStage: number; // predicted seconds
}

export interface Recommendation {
  type: 'action' | 'content' | 'channel' | 'timing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  actionUrl?: string;
}

export interface Insight {
  type: 'pattern' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Conversion Prediction
export interface ConversionPrediction {
  customerId: string;
  tenantId: string;
  currentStage: JourneyStage;
  conversionProbability: number;
  predictedValue: number;
  predictedTimeToConversion: number;
 影响因素: InfluenceFactor[];
  modelVersion: string;
  generatedAt: Date;
}

export interface InfluenceFactor {
  factor: string;
  impact: number; // -1 to 1
  direction: 'positive' | 'negative' | 'neutral';
  description: string;
}

// Dropout Detection
export interface DropoutAlert {
  alertId: string;
  customerId: string;
  tenantId: string;
  journeyId: string;
  currentStage: JourneyStage;
  dropoutProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  triggers: DropoutTrigger[];
  recommendedActions: string[];
}

export interface DropoutTrigger {
  type: string;
  description: string;
  severity: number; // 0-1
  detectedAt: Date;
}

// API Request/Response Types
export interface CreateJourneyRequest {
  customerId: string;
  tenantId?: string;
  initialStage?: JourneyStage;
  metadata?: Record<string, unknown>;
}

export interface TrackTouchpointRequest {
  customerId: string;
  tenantId?: string;
  type: TouchpointType;
  source: TouchpointSource;
  timestamp?: Date;
  revenue?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  properties?: Partial<TouchpointProperties>;
  deviceInfo?: Partial<DeviceInfo>;
  location?: Partial<GeoLocation>;
  sessionId?: string;
}

export interface CreateFunnelRequest {
  name: string;
  description?: string;
  stages: Omit<FunnelStage, 'order'>[];
  filters?: FunnelFilters;
}

export interface AnalyzeFunnelRequest {
  funnelId?: string;
  funnel?: Omit<FunnelStage, 'order'>[];
  dateRange: {
    start: Date | string;
    end: Date | string;
  };
  filters?: FunnelFilters;
}

export interface GetInsightsRequest {
  customerId: string;
  tenantId?: string;
  includeRecommendations?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}
