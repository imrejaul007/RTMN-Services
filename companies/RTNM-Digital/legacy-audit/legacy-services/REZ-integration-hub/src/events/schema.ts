/**
 * REZ Integration Hub - Unified Event Schema
 *
 * Standardized event schema for all services
 * This is the "nervous system" of REZ
 */

// Event Categories
export type EventCategory =
  | 'commerce'      // Order, payment, inventory
  | 'customer'       // User actions, profile
  | 'marketing'      // Campaigns, offers
  | 'engagement'     // Notifications, loyalty
  | 'intelligence'   // AI insights, predictions
  | 'market'        // Weather, events, competitors
  | 'system';       // Health, errors

// Event Namespaces
export type EventNamespace = {
  category: EventCategory;
  domain: string;
  action: string;
};

// Base Event
export interface BaseEvent<T = unknown> {
  // Identity
  id: string;
  version: '1.0';
  timestamp: Date;

  // Context
  source: ServiceIdentity;
  target?: ServiceIdentity[];

  // Event data
  namespace: EventNamespace;
  category: EventCategory;

  // Payload
  payload: T;

  // Correlation
  correlationId?: string;
  causationId?: string;

  // Metadata
  metadata: EventMetadata;
}

// Service Identity
export interface ServiceIdentity {
  serviceId: string;
  serviceName: string;
  instanceId?: string;
  region?: string;
}

// Event Metadata
export interface EventMetadata {
  environment: 'development' | 'staging' | 'production';
  traceId?: string;
  spanId?: string;
  userId?: string;
  merchantId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

// Event Payloads by Category

// Commerce Events
export interface CommerceEvents {
  'commerce.order.created': {
    orderId: string;
    merchantId: string;
    customerId: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: 'upi' | 'card' | 'wallet' | 'cash';
    source: 'app' | 'pos' | 'qr' | 'aggregator';
    aggregator?: 'swiggy' | 'zomato' | 'dunzo';
  };

  'commerce.order.completed': {
    orderId: string;
    merchantId: string;
    customerId: string;
    total: number;
    profit: number;
    margin: number;
    completionTime: number; // minutes
  };

  'commerce.order.cancelled': {
    orderId: string;
    merchantId: string;
    reason: string;
    refundAmount: number;
    refundStatus: 'pending' | 'processed' | 'failed';
  };

  'commerce.payment.received': {
    paymentId: string;
    orderId: string;
    merchantId: string;
    amount: number;
    method: string;
    status: 'success' | 'failed' | 'pending';
    transactionId?: string;
  };

  'commerce.inventory.low': {
    merchantId: string;
    productId: string;
    productName: string;
    currentStock: number;
    reorderLevel: number;
    supplierId?: string;
  };

  'commerce.inventory.depleted': {
    merchantId: string;
    productId: string;
    productName: string;
    lastSale: Date;
  };
}

// Customer Events
export interface CustomerEvents {
  'customer.registered': {
    customerId: string;
    merchantId?: string;
    phone: string;
    email?: string;
    source: 'app' | 'pos' | 'qr' | 'website' | 'referral';
    referralCode?: string;
  };

  'customer.profile.updated': {
    customerId: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  };

  'customer.active': {
    customerId: string;
    merchantId: string;
    sessionId: string;
    sessionDuration: number;
    actions: string[];
  };

  'customer.inactive': {
    customerId: string;
    merchantId: string;
    daysSinceLastActivity: number;
    riskLevel: 'low' | 'medium' | 'high';
  };

  'customer.churn_risk': {
    customerId: string;
    merchantId: string;
    riskScore: number; // 0-100
    reasons: string[];
    lastOrderDate: Date;
    avgOrderFrequency: number;
  };

  'customer.segment_changed': {
    customerId: string;
    merchantId: string;
    oldSegment: string;
    newSegment: string;
    trigger: string;
  };

  'customer.ltv_changed': {
    customerId: string;
    merchantId: string;
    oldLTV: number;
    newLTV: number;
    change: number;
    reason: 'order' | 'refund' | 'loyalty' | 'correction';
  };
}

// Marketing Events
export interface MarketingEvents {
  'marketing.campaign.created': {
    campaignId: string;
    merchantId: string;
    name: string;
    type: 'push' | 'sms' | 'whatsapp' | 'email' | 'qr';
    target: CampaignTarget;
    offer?: OfferDetails;
    budget: number;
    scheduledAt: Date;
  };

  'marketing.campaign.launched': {
    campaignId: string;
    merchantId: string;
    sent: number;
    targetAudience: string;
  };

  'marketing.campaign.completed': {
    campaignId: string;
    merchantId: string;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    revenue: number;
    roi: number;
  };

  'marketing.campaign.performed_poorly': {
    campaignId: string;
    merchantId: string;
    expectedConversion: number;
    actualConversion: number;
    variance: number;
    recommendations: string[];
  };

  'marketing.offer.created': {
    offerId: string;
    merchantId: string;
    type: 'discount' | 'cashback' | 'loyalty' | 'combo';
    value: number;
    minOrderValue?: number;
    validUntil: Date;
  };

  'marketing.offer.redeemed': {
    offerId: string;
    merchantId: string;
    customerId: string;
    orderId: string;
    discount: number;
    cashback?: number;
  };
}

// Engagement Events
export interface EngagementEvents {
  'engagement.notification.sent': {
    notificationId: string;
    customerId: string;
    channel: 'push' | 'sms' | 'whatsapp' | 'email';
    messageType: string;
    campaignId?: string;
  };

  'engagement.notification.delivered': {
    notificationId: string;
    deliveredAt: Date;
    deviceType?: string;
  };

  'engagement.notification.opened': {
    notificationId: string;
    openedAt: Date;
  };

  'engagement.loyalty.points_earned': {
    customerId: string;
    merchantId: string;
    points: number;
    reason: 'order' | 'referral' | 'review' | 'campaign';
    orderId?: string;
  };

  'engagement.loyalty.points_redeemed': {
    customerId: string;
    merchantId: string;
    points: number;
    reward: string;
    orderId?: string;
  };

  'engagement.wallet.topup': {
    customerId: string;
    merchantId?: string;
    amount: number;
    method: 'upi' | 'card' | 'cashback';
    bonus?: number;
  };

  'engagement.qr.scanned': {
    qrId: string;
    merchantId: string;
    customerId?: string;
    location: { lat: number; lng: number };
    context: 'menu' | 'order' | 'payment' | 'feedback';
  };
}

// Intelligence Events
export interface IntelligenceEvents {
  'intelligence.demand.spike': {
    merchantId: string;
    location: string;
    category: string;
    intensity: number; // 0-100
    confidence: number;
    duration?: number;
    source: 'historical' | 'event' | 'weather' | 'trend';
  };

  'intelligence.demand.drop': {
    merchantId: string;
    location: string;
    category: string;
    intensity: number;
    confidence: number;
    likelyCause: string;
  };

  'intelligence.forecast.generated': {
    merchantId: string;
    forecastType: 'demand' | 'inventory' | 'revenue';
    predictions: ForecastPrediction[];
    horizon: string;
    confidence: number;
  };

  'intelligence.anomaly.detected': {
    merchantId: string;
    anomalyType: 'revenue' | 'orders' | 'customer' | 'inventory';
    actual: number;
    expected: number;
    variance: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };

  'intelligence.recommendation.generated': {
    merchantId: string;
    type: 'pricing' | 'marketing' | 'inventory' | 'retention';
    action: string;
    expectedImpact: { revenue?: number; customers?: number };
    confidence: number;
    reasoning: string;
  };
}

// Market Events
export interface MarketEvents {
  'market.weather.changed': {
    location: string;
    condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
    temperature: number;
    humidity: number;
    forecast: string;
  };

  'market.weather.rain_detected': {
    location: string;
    intensity: 'light' | 'moderate' | 'heavy';
    duration: number; // hours
    impact: number; // expected demand change
  };

  'market.event.detected': {
    eventId: string;
    location: string;
    name: string;
    type: 'sports' | 'festival' | 'holiday' | 'local' | 'weather';
    startDate: Date;
    endDate: Date;
    expectedImpact: number;
    affectedCategories: string[];
  };

  'market.event.upcoming': {
    eventId: string;
    eventName: string;
    daysUntil: number;
    prepRecommendations: string[];
  };

  'market.competitor.discount_detected': {
    competitorId: string;
    competitorName: string;
    location: string;
    discount: number;
    type: 'percentage' | 'flat';
    validUntil: Date;
    source: 'scraping' | 'user_report' | 'partner';
  };

  'market.competitor.pricing_changed': {
    competitorId: string;
    category: string;
    oldPrice: number;
    newPrice: number;
    change: number;
  };
}

// System Events
export interface SystemEvents {
  'system.agent.heartbeat': {
    agentId: string;
    agentName: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    tasksProcessed: number;
    successRate: number;
    avgResponseTime: number;
  };

  'system.agent.error': {
    agentId: string;
    errorType: string;
    errorMessage: string;
    stack?: string;
    recoverable: boolean;
  };

  'system.goal.achieved': {
    goalId: string;
    merchantId: string;
    target: number;
    actual: number;
    duration: number;
  };

  'system.goal.at_risk': {
    goalId: string;
    merchantId: string;
    progress: number;
    expectedProgress: number;
    gap: number;
    daysRemaining: number;
  };

  'system.execution.approved': {
    executionId: string;
    merchantId: string;
    actionType: string;
    approvedBy: 'merchant' | 'system';
    riskLevel: 'low' | 'medium' | 'high';
  };

  'system.execution.completed': {
    executionId: string;
    merchantId: string;
    actionType: string;
    success: boolean;
    duration: number;
    outcome: unknown;
  };

  'system.execution.failed': {
    executionId: string;
    merchantId: string;
    actionType: string;
    error: string;
    rollbackStatus?: 'success' | 'failed' | 'not_attempted';
  };

  'system.risk.detected': {
    merchantId: string;
    riskType: 'margin' | 'fraud' | 'overspend' | 'compliance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: unknown;
    blocked?: boolean;
  };
}

// Supporting Types
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CampaignTarget {
  type: 'all' | 'segment' | 'individual';
  segmentId?: string;
  customerIds?: string[];
  filters?: Record<string, unknown>;
}

export interface OfferDetails {
  type: 'percentage' | 'flat' | 'free';
  value: number;
  maxDiscount?: number;
  minOrderValue?: number;
  code?: string;
}

export interface ForecastPrediction {
  timestamp: Date;
  value: number;
  confidence: number;
}

// Union type for all events
export type REZEvent =
  | BaseEvent<CommerceEvents[keyof CommerceEvents]>
  | BaseEvent<CustomerEvents[keyof CustomerEvents]>
  | BaseEvent<MarketingEvents[keyof MarketingEvents]>
  | BaseEvent<EngagementEvents[keyof EngagementEvents]>
  | BaseEvent<IntelligenceEvents[keyof IntelligenceEvents]>
  | BaseEvent<MarketEvents[keyof MarketEvents]>
  | BaseEvent<SystemEvents[keyof SystemEvents]>;

// Event creators helper
export function createEvent<T>(
  namespace: EventNamespace,
  payload: T,
  source: ServiceIdentity,
  options?: Partial<{
    target: ServiceIdentity[];
    correlationId: string;
    causationId: string;
    metadata: EventMetadata;
  }>
): BaseEvent<T> {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    version: '1.0',
    timestamp: new Date(),
    source,
    namespace,
    category: namespace.category,
    payload,
    correlationId: options?.correlationId,
    causationId: options?.causationId,
    metadata: options?.metadata || {
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
    },
  };
}
