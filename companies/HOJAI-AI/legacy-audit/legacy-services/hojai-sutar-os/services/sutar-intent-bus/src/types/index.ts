// ============================================================================
// Types Index - Centralized type definitions
// ============================================================================

// Core Intent Types
export type IntentCategory = 'browse' | 'search' | 'compare' | 'cart' | 'purchase' | 'support' | 'negotiation' | 'contract';
export type IntentStatus = 'captured' | 'processing' | 'routed' | 'completed' | 'failed';

export interface Intent {
  id: string;
  userId?: string;
  sessionId?: string;
  category: IntentCategory;
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  context: Record<string, any>;
  status: IntentStatus;
  routedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// Configuration
export interface Config {
  port: number;
  environment: string;
  allowedOrigins: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

// Classification Types
export interface ClassificationResult {
  category: IntentCategory;
  confidence: number;
  subIntents: string[];
  alternativeCategories: Array<{ category: IntentCategory; confidence: number }>;
  reasoning: string;
  keywords: string[];
  embeddings?: number[];
}

// Context Enrichment Types
export interface EnrichedContext {
  userContext: UserContext;
  sessionContext: SessionContext;
  historicalContext: HistoricalContext;
  temporalContext: TemporalContext;
  deviceContext: DeviceContext;
  locationContext: LocationContext;
  weatherContext?: WeatherContext;
  businessContext: BusinessContext;
}

export interface UserContext {
  userId: string;
  userType: 'new' | 'returning' | 'vip' | 'enterprise';
  preferences: Record<string, any>;
  pastCategories: string[];
  averageOrderValue?: number;
  totalOrders: number;
  loyaltyTier?: string;
  riskScore?: number;
}

export interface SessionContext {
  sessionId: string;
  sessionStart: string;
  pageViews: number;
  searchQueries: string[];
  cartValue?: number;
  activeFilters: Record<string, any>;
  recentCategories: string[];
  timeOnSite: number;
  bounceRisk: boolean;
}

export interface HistoricalContext {
  lastIntent?: Intent;
  lastCategory?: string;
  lastSearchQuery?: string;
  conversionRate: number;
  avgSessionDuration: number;
  preferredPaymentMethod?: string;
  preferredShippingMethod?: string;
  addresses: Array<{ type: string; address: string }>;
}

export interface TemporalContext {
  hourOfDay: number;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  month: number;
  quarter: number;
  fiscalQuarter?: string;
}

export interface DeviceContext {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
  screenWidth?: number;
  screenHeight?: number;
  isTouchDevice: boolean;
  connectionType?: string;
}

export interface LocationContext {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  locale?: string;
}

export interface WeatherContext {
  temperature?: number;
  condition?: string;
  humidity?: number;
  impactOnShopping?: 'positive' | 'negative' | 'neutral';
}

export interface BusinessContext {
  promotionActive: boolean;
  promotionDetails?: string;
  inventoryLevel?: 'in_stock' | 'low_stock' | 'out_of_stock';
  competitorActivity?: string;
  marketTrend?: 'rising' | 'falling' | 'stable';
}

// Routing Types
export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  matchCount: number;
  lastMatchedAt?: string;
}

export interface RoutingCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'regex';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RoutingAction {
  type: 'route_to' | 'set_priority' | 'add_tag' | 'set_context' | 'transform';
  value: any;
}

export interface RoutingDecision {
  targetService: string;
  confidence: number;
  matchedRules: RoutingRule[];
  reasoning: string;
  fallback: boolean;
  queue?: string;
  metadata?: Record<string, any>;
}

export interface RoutingAnalytics {
  totalRoutes: number;
  routesByService: Record<string, number>;
  routesByCategory: Record<string, number>;
  averageConfidence: number;
  topRules: Array<{ ruleId: string; name: string; matchCount: number }>;
  failedRoutes: number;
  fallbackRoutes: number;
}

// History Types
export interface HistoryEntry {
  intent: Intent;
  timestamp: string;
  action: 'captured' | 'classified' | 'enriched' | 'routed' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export interface HistoryQuery {
  userId?: string;
  sessionId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface HistoryStats {
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByCategory: Record<string, number>;
  averageSessionLength: number;
  mostActiveUsers: Array<{ userId: string; count: number }>;
  peakHours: number[];
}

export interface ConversationThread {
  sessionId: string;
  userId?: string;
  entries: HistoryEntry[];
  startedAt: string;
  lastActivityAt: string;
  isActive: boolean;
  metadata: Record<string, any>;
}

// Analytics Types
export interface AnalyticsTimeRange {
  startDate: string;
  endDate: string;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface IntentMetrics {
  totalIntents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  averageConfidence: number;
  successRate: number;
  averageProcessingTime: number;
}

export interface CategoryMetrics {
  category: IntentCategory;
  count: number;
  percentage: number;
  averageConfidence: number;
  successRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  weekOverWeekChange: number;
}

export interface UserMetrics {
  userId: string;
  totalIntents: number;
  categoryDistribution: Record<string, number>;
  averageSessionLength: number;
  conversionRate: number;
  lastActiveAt: string;
  userSegment: 'new' | 'active' | 'power' | 'churned';
}

export interface SessionMetrics {
  sessionId: string;
  intentCount: number;
  categories: IntentCategory[];
  startTime: string;
  endTime: string;
  duration: number;
  completionRate: number;
  bounceRate: number;
}

export interface TrendData {
  date: string;
  value: number;
  percentageChange?: number;
}

export interface FunnelAnalysis {
  stage: string;
  count: number;
  dropoffRate: number;
  conversionRate: number;
}

export interface HeatmapData {
  dayOfWeek: number;
  hourOfDay: number;
  value: number;
}

export interface PredictionModel {
  predictedVolume: number;
  confidence: number;
  factors: string[];
  recommendation: string;
}

// Conversation Types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intentId?: string;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  messages: Message[];
  intents: Intent[];
  turnCount: number;
  startedAt: string;
  lastActivityAt: string;
  isActive: boolean;
  metadata: ConversationMetadata;
  state: ConversationState;
}

export interface ConversationMetadata {
  averageResponseTime: number;
  topicHistory: string[];
  entityReferences: Record<string, any>;
  userSatisfaction?: number;
  escalationTriggered: boolean;
  transferCount: number;
}

export interface ConversationState {
  currentTopic?: string;
  pendingEntities: Record<string, any>;
  contextWindow: Message[];
  recentIntents: string[];
  dialogueActs: string[];
  sentiment: SentimentLevel;
  engagement: EngagementLevel;
}

export type SentimentLevel = 'positive' | 'neutral' | 'negative' | 'frustrated';
export type EngagementLevel = 'high' | 'medium' | 'low' | 'bored';

// Entity Extraction Types
export interface ExtractedEntity {
  type: EntityType;
  value: string;
  normalizedValue: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export type EntityType =
  | 'product'
  | 'brand'
  | 'price'
  | 'quantity'
  | 'color'
  | 'size'
  | 'location'
  | 'person'
  | 'organization'
  | 'date'
  | 'time'
  | 'duration'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'percentage'
  | 'dimension'
  | 'category'
  | 'model'
  | 'sku';

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  primaryEntity?: ExtractedEntity;
  relatedEntities: ExtractedEntity[];
  missingEntities: string[];
  entityCount: number;
  confidence: number;
}

// Sentiment Analysis Types
export interface SentimentResult {
  sentiment: SentimentLabel;
  score: number;
  confidence: number;
  aspects: AspectSentiment[];
  emotions: EmotionScore[];
  intensity: IntensityLevel;
  subjectivity: SubjectivityLevel;
  keyPhrases: string[];
  comparativeScore?: number;
}

export type SentimentLabel = 'positive' | 'negative' | 'neutral' | 'mixed';
export type IntensityLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type SubjectivityLevel = 'objective' | 'somewhat_subjective' | 'subjective';

export interface AspectSentiment {
  aspect: string;
  sentiment: SentimentLabel;
  score: number;
  mentions: number;
}

export interface EmotionScore {
  emotion: Emotion;
  score: number;
  indicators: string[];
}

export type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'anticipation' | 'trust';

// Priority Queue Types
export interface PriorityLevel {
  level: 'critical' | 'high' | 'normal' | 'low';
  score: number;
  processingTimeMs: number;
  maxRetries: number;
}

export interface QueuedIntent {
  intent: Intent;
  priority: PriorityLevel;
  enqueuedAt: string;
  position: number;
  estimatedWaitTime: number;
  metadata: QueueMetadata;
}

export interface QueueMetadata {
  source: 'api' | 'webhook' | 'batch' | 'scheduled';
  userSegment?: 'new' | 'active' | 'power' | 'vip' | 'enterprise';
  intentAge: number;
  contextScore: number;
  tags: string[];
}

export interface QueueStats {
  totalQueued: number;
  byPriority: Record<string, number>;
  averageWaitTime: number;
  averageProcessingTime: number;
  throughput: number;
  queueHealth: 'healthy' | 'degraded' | 'overloaded';
  oldestItemAge: number;
}

// Agent Network Types
export interface AgentRequest {
  intent: Intent;
  context: Record<string, any>;
  userId?: string;
  sessionId?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  success: boolean;
  agentId?: string;
  response?: string;
  actions?: AgentAction[];
  nextSteps?: string[];
  confidence: number;
  error?: string;
}

export interface AgentAction {
  type: 'route' | 'respond' | 'escalate' | 'transfer' | 'notify' | 'update';
  target?: string;
  payload: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface AgentCapability {
  name: string;
  description: string;
  supportedIntents: string[];
  parameters?: Record<string, any>;
}

export interface AgentStatus {
  agentId: string;
  name: string;
  status: 'available' | 'busy' | 'offline' | 'error';
  currentLoad: number;
  maxLoad: number;
  capabilities: string[];
  lastHeartbeat: string;
}
