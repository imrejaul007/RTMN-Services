// Customer Memory Types - Cross-domain customer intelligence

export interface CustomerMemory {
  customerId: string;
  company: string;

  // Identity
  identity: {
    name?: string;
    phone?: string;
    email?: string;
    avatar?: string;
    registeredAt?: Date;
  };

  // Value metrics
  value: {
    lifetimeValue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalSpent: number;
    refundRate: number;
  };

  // Engagement
  engagement: {
    lastActiveDate?: Date;
    preferredChannel: 'whatsapp' | 'sms' | 'email' | 'inapp';
    pushOptIn: boolean;
    emailOptIn: boolean;
    preferredLanguage: string;
  };

  // Support history
  support: {
    totalTickets: number;
    openTickets: number;
    avgResolutionTime: number; // hours
    lastTicketDate?: Date;
    satisfactionScore?: number;
  };

  // Risk indicators
  risk: {
    churnProbability: number;
    fraudScore: number;
    refundRiskScore: number;
    vipStatus: boolean;
    flaggedStatus: boolean;
  };

  // Loyalty
  loyalty: {
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    points: number;
    pointsValue: number;
    memberSince: Date;
  };

  // Timeline
  timeline: MemoryEvent[];

  // Last update
  lastUpdated: Date;
}

export interface MemoryEvent {
  id: string;
  date: Date;
  category: 'order' | 'payment' | 'support' | 'refund' | 'loyalty' | 'delivery' | 'feedback' | 'account';
  type: string;
  title: string;
  description?: string;

  // Context
  orderId?: string;
  ticketId?: string;
  transactionId?: string;

  // Outcome
  sentiment?: number;
  resolution?: string;
  resolutionTime?: number;

  // Metadata
  channel?: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

export interface CrossDomainLink {
  id: string;
  sourceId: string;
  sourceType: 'customer' | 'profile';
  sourceCompany: string;
  targetId: string;
  targetType: 'customer' | 'profile';
  targetCompany: string;
  relationship: 'self' | 'family' | 'caregiver' | 'spouse' | 'child' | 'parent' | 'sibling' | 'delegate';
  linkedAt: Date;
  linkedBy: string;
  verified: boolean;
  verifiedAt?: Date;
}

export interface CustomerJourney {
  customerId: string;

  // Journey events
  events: JourneyEvent[];

  // Summary
  summary: {
    totalInteractions: number;
    totalOrders: number;
    totalSpent: number;
    totalTickets: number;
    avgSatisfaction: number;
    journeyDuration: number; // days
  };

  // Patterns
  patterns: JourneyPattern[];

  // Predictions
  predictions: {
    nextLikelyAction?: string;
    churnRisk?: number;
    ltvPotential?: number;
  };

  // Last update
  lastUpdated: Date;
}

export interface JourneyEvent {
  id: string;
  date: Date;
  domain: 'commerce' | 'healthcare' | 'rides' | 'finance' | 'support';
  eventType: string;
  title: string;
  description?: string;

  // Impact
  value?: number;
  sentiment?: number;

  // Resolution
  resolved: boolean;
  resolution?: string;

  // Links
  relatedEvents?: string[];
  orderId?: string;
  ticketId?: string;
}

export interface JourneyPattern {
  type: 'behavioral' | 'temporal' | 'value' | 'support';
  name: string;
  description: string;
  confidence: number;
  detectedAt: Date;
  evidence: string[];
}

export interface PatternDetection {
  customerId: string;
  patterns: JourneyPattern[];
  insights: PatternInsight[];
  recommendations: PatternRecommendation[];
  detectedAt: Date;
}

export interface PatternInsight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  metric?: number;
}

export interface PatternRecommendation {
  action: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact?: string;
}
