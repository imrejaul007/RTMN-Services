/**
 * HOJAI Customer Intelligence SDK - Type Definitions
 * All TypeScript interfaces for the SDK
 */

// ============ CONFIGURATION ============

export interface CustomerIntelligenceConfig {
  /** Gateway URL (single entry point) */
  gatewayUrl?: string;
  /** Direct service URLs */
  services?: {
    gateway?: string;
    identity?: string;
    trust?: string;
    cod?: string;
    returns?: string;
    support?: string;
    sales?: string;
    twin?: string;
    recommendations?: string;
    graph?: string;
    risk?: string;
    loyalty?: string;
    communication?: string;
  };
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Number of retries on failure */
  retries?: number;
  /** Enable debug logging */
  debug?: boolean;
}

// ============ COMMON RESPONSE TYPES ============

export interface SDKResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  code?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, boolean>;
  timestamp: string;
}

// ============ ANALYZE INPUT/OUTPUT ============

export interface AnalyzeInput {
  /** Customer phone number */
  phone?: string;
  /** Customer email */
  email?: string;
  /** Device identifier */
  deviceId?: string;
  /** Merchant ID (for multi-tenant) */
  merchantId?: string;
}

export interface AnalyzeOutput {
  /** Unique customer identifier */
  customer_id: string;
  /** Overall trust score (0-100) */
  trust_score: number;
  /** Trust level */
  trust_level: 'low' | 'medium' | 'high' | 'trusted';

  /** COD recommendation */
  cod_recommendation: CodRecommendation;

  /** Return risk assessment */
  return_risk: ReturnRiskAssessment;

  /** Support profile */
  support_profile: SupportProfile;

  /** Sales preferences */
  selling_preferences: SellingPreferences;

  /** Loyalty information */
  loyalty: LoyaltyProfile;

  /** Communication preferences */
  communication: CommunicationPreferences;

  /** Risk scores */
  risk: RiskScores;

  /** Customer segments */
  segments: CustomerSegments;

  /** Analysis timestamp */
  analyzed_at: string;

  /** Confidence of analysis */
  confidence: number;
}

// ============ TRUST SCORE ============

export interface TrustScoreInput {
  customerId?: string;
  orderHistory?: {
    total: number;
    completed: number;
    cancelled: number;
    returned: number;
  };
  supportHistory?: {
    tickets: number;
    escalations: number;
  };
  accountAge?: number; // in days
  paymentHistory?: {
    successful: number;
    failed: number;
  };
}

export interface TrustScoreOutput {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'trusted';
  badge: 'new' | 'verified' | 'trusted' | 'vip';
  factors: TrustFactor[];
  calculated_at: string;
}

export interface TrustFactor {
  name: string;
  contribution: number; // -1 to 1
  value: string | number;
  description: string;
}

// ============ COD INTELLIGENCE ============

export interface CodRecommendationInput {
  customerId?: string;
  phone?: string;
  email?: string;
  orderHistory?: {
    total: number;
    completed: number;
    returned: number;
  };
  addressHistory?: {
    changes90d: number;
    verified: boolean;
  };
  deviceHistory?: {
    changes30d: number;
  };
  purchaseAmount?: number;
  category?: string;
}

export interface CodRecommendation {
  allowed: boolean;
  confidence: number; // 0-100
  recommendation: 'allow' | 'review' | 'block';
  factors: CodFactor[];
  reasons: string[];
}

export interface CodFactor {
  name: string;
  impact: number; // contribution to score
  value: string | number;
  description: string;
}

// ============ RETURN RISK ============

export interface ReturnRiskInput {
  customerId?: string;
  phone?: string;
  orderHistory?: {
    orders: number;
    returns: number;
    returnReasons?: string[];
  };
  returnVelocity?: {
    returns7d: number;
    returns30d: number;
  };
  itemValues?: {
    avgOrderValue: number;
    avgReturnValue: number;
  };
}

export interface ReturnRiskAssessment {
  risk: 'low' | 'medium' | 'high';
  abuse_probability: number; // 0-1
  policy_recommendation: 'free_returns' | 'standard' | 'manual_review' | 'exchange_only';
  factors: string[];
  confidence: number;
}

export interface ReturnAbuseIndicators {
  sameDayReturns: number;
  highValueReturns: number;
  repeatedSize Exchanges: number;
  abusivePatterns: string[];
}

// ============ SUPPORT INTELLIGENCE ============

export interface SupportProfileInput {
  customerId?: string;
  phone?: string;
  ticketHistory?: {
    total: number;
    last90d: number;
    escalations: number;
  };
  refundRequests?: {
    total: number;
    approved: number;
    denied: number;
  };
  sentiment?: 'positive' | 'neutral' | 'negative';
  channelHistory?: string[];
}

export interface SupportProfile {
  tickets_90d: number;
  refund_rate: number;
  sentiment: string;
  escalation_probability: number;
  priority: 'low' | 'normal' | 'high' | 'vip';
  recommended_tone: 'friendly' | 'formal' | 'empathetic' | 'direct';
  preferred_channel: 'whatsapp' | 'email' | 'chat' | 'phone';
  recommended_agent: 'ai' | 'human' | 'specialist';
  likely_resolution: 'refund' | 'exchange' | 'credit' | 'apology' | 'escalate';
  wait_time_tolerance: 'low' | 'medium' | 'high';
}

// ============ SALES INTELLIGENCE ============

export interface SellingPreferencesInput {
  customerId?: string;
  purchaseHistory?: {
    totalSpend: number;
    orderCount: number;
    avgOrderValue: number;
    categories: string[];
  };
  browsingHistory?: {
    views: number;
    cartAdds: number;
  };
  responseHistory?: {
    emailOpens: number;
    campaignClicks: number;
    offerAcceptances: number;
  };
}

export interface SellingPreferences {
  customer_segment: string;
  segment_description: string;
  price_sensitivity: 'low' | 'medium' | 'high';
  discount_responsiveness: number; // 0-1
  premium_buyer: boolean;
  preferred_categories: string[];
  buying_frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  next_best_offer: string;
  recommended_channel: string;
  recommended_time: 'morning' | 'afternoon' | 'evening' | 'night';
  upsell_opportunities: string[];
}

// ============ LOYALTY INTELLIGENCE ============

export interface LoyaltyProfileInput {
  customerId?: string;
  purchaseHistory?: {
    orders: number;
    totalSpend: number;
    firstOrderDate?: string;
  };
  engagementHistory?: {
    logins: number;
    referrals: number;
    reviews: number;
  };
  subscriptionStatus?: 'none' | 'free' | 'premium';
}

export interface LoyaltyProfile {
  ltv: {
    current: number;
    predicted_1yr: number;
    predicted_3yr: number;
  };
  ltv_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'vip';
  churn_risk: {
    probability: number; // 0-1
    level: string;
    factors: string[];
  };
  retention_recommendations: string[];
  upsell_opportunities: string[];
  membership_benefits: string[];
}

// ============ COMMUNICATION PREFERENCES ============

export interface CommunicationPreferencesInput {
  customerId?: string;
  interactionHistory?: {
    opens: number;
    clicks: number;
    responses: number;
  };
  channelHistory?: {
    whatsapp: number;
    email: number;
    sms: number;
    push: number;
  };
  sentimentHistory?: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface CommunicationPreferences {
  preferred_channel: 'whatsapp' | 'email' | 'sms' | 'push';
  secondary_channel: string;
  preferred_tone: 'friendly' | 'formal' | 'empathetic' | 'direct';
  best_time: 'morning' | 'afternoon' | 'evening' | 'night';
  language: string;
  personalization: {
    greeting_style: 'formal' | 'casual' | 'friendly';
    emoji_usage: 'none' | 'low' | 'medium' | 'high';
    personalization_level: 'minimal' | 'standard' | 'full';
  };
}

// ============ RISK SCORES ============

export interface RiskScores {
  fraud_probability: number; // 0-1
  fraud_level: 'low' | 'medium' | 'high' | 'critical';
  churn_probability: number; // 0-1
  churn_level: 'low' | 'medium' | 'high';
  credit_score?: number; // 300-850
  credit_decision?: 'approve' | 'review' | 'decline';
}

// ============ CUSTOMER SEGMENTS ============

export interface CustomerSegments {
  value: 'new' | 'at_risk' | 'regular' | 'high_value' | 'vip';
  behavior: 'frequent' | 'occasional' | 'new' | 'dormant' | 'inactive';
  demographic: string;
  engagement: 'highly_engaged' | 'engaged' | 'passive' | 'unengaged';
}

// ============ CUSTOMER TWIN ============

export interface CustomerTwinProfile {
  id: string;
  identity: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };
  behavior: {
    totalOrders: number;
    totalSpend: number;
    avgOrderValue: number;
    favoriteCategories: string[];
  };
  segments: CustomerSegments;
  preferences: {
    communication: CommunicationPreferences;
    shopping: SellingPreferences;
  };
  lifetime_value: LoyaltyProfile['ltv'];
  risk: RiskScores;
  last_activity: string;
  created_at: string;
}

// ============ RECOMMENDATIONS ============

export interface RecommendationInput {
  customerId?: string;
  context: 'checkout' | 'cart' | 'browse' | 'support' | 'marketing' | 'general';
  available?: string[];
  limit?: number;
}

export interface Recommendation {
  action: string;
  type: 'product' | 'offer' | 'action' | 'content';
  score: number;
  reason: string;
  personalization: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RecommendationOutput {
  recommendations: Recommendation[];
  next_best_action: {
    action: string;
    confidence: number;
    alternatives: string[];
  };
  generated_at: string;
}

// ============ CUSTOMER GRAPH ============

export interface GraphResolveInput {
  phone?: string;
  email?: string;
  deviceId?: string;
}

export interface GraphResolveOutput {
  customerId: string;
  confidence: number;
  merged_ids: string[];
  sources: string[];
}

export interface GraphConnection {
  type: string;
  entity: {
    id: string;
    type: string;
    name?: string;
  };
  strength: number; // 0-1
  created_at: string;
}

export interface GraphNetwork {
  customer: {
    id: string;
    segments: CustomerSegments;
  };
  connections: GraphConnection[];
  network_score: number;
}

// ============ USAGE TRACKING ============

export interface UsageRecord {
  operation: 'analyze' | 'trust_check' | 'cod_recommend' | 'return_risk' | 'support_profile' | 'sales_preferences' | 'recommend';
  customerId?: string;
  timestamp: string;
  success: boolean;
  latencyMs: number;
}

export interface UsageReport {
  startDate: string;
  endDate: string;
  totalCalls: number;
  byOperation: Record<string, number>;
  byDay: Record<string, number>;
}
