/**
 * Journey Service
 * Core service for tracking and managing customer journeys across RTNM businesses
 */

import { v4 as uuidv4 } from 'uuid';
import { JourneyEvent, CustomerProfile, BusinessDomain, JourneyEventType, ICustomerProfile, IJourneyEvent } from '../models';
import logger from '../utils/logger';

export interface TrackEventInput {
  customerId: string;
  businessDomain: BusinessDomain;
  businessId: string;
  eventType: JourneyEventType;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  channel?: string;
  timestamp?: Date;
}

export interface JourneyEventResponse {
  eventId: string;
  customerId: string;
  eventType: string;
  businessDomain: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface JourneyResponse {
  customerId: string;
  totalEvents: number;
  activeDomains: string[];
  firstEventDate: Date | null;
  lastEventDate: Date | null;
  events: JourneyEventResponse[];
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  businessDomain: string;
  businessId: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  sessionId?: string;
  channel?: string;
}

export interface TimelineResponse {
  customerId: string;
  totalEvents: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  events: TimelineEvent[];
  groupedByDate: Record<string, TimelineEvent[]>;
}

export interface JourneyAnalysis {
  customerId: string;
  summary: {
    totalEvents: number;
    activeDomains: number;
    daysActive: number;
    averageEventsPerDay: number;
  };
  domainBreakdown: {
    domain: string;
    events: number;
    percentage: number;
    lastActivity: Date | null;
  }[];
  funnelAnalysis: {
    stage: string;
    count: number;
    dropoffRate: number;
  }[];
  engagementMetrics: {
    engagementScore: number;
    engagementLevel: 'low' | 'medium' | 'high' | 'vip';
    sessionFrequency: number;
    averageSessionDuration: number;
  };
  behavioralPatterns: {
    pattern: string;
    confidence: number;
    description: string;
  }[];
  insights: string[];
}

class JourneyService {
  private readonly logger = logger.withService('journey-service');

  /**
   * Track a customer journey event
   */
  async trackEvent(input: TrackEventInput): Promise<JourneyEventResponse> {
    const { customerId, businessDomain, businessId, eventType, metadata, sessionId, channel, timestamp } = input;

    this.logger.info('Tracking journey event', { customerId, businessDomain, eventType });

    const event = new JourneyEvent({
      customerId,
      businessDomain,
      businessId,
      eventType,
      metadata: metadata || {},
      sessionId: sessionId || uuidv4(),
      channel,
      timestamp: timestamp || new Date(),
    });

    await event.save();

    // Update customer profile
    await this.updateCustomerProfile(customerId, businessDomain, eventType, metadata);

    this.logger.info('Event tracked successfully', { eventId: event._id.toString(), customerId });

    return {
      eventId: event._id.toString(),
      customerId: event.customerId,
      eventType: event.eventType,
      businessDomain: event.businessDomain,
      timestamp: event.timestamp,
      metadata: event.metadata as Record<string, unknown>,
    };
  }

  /**
   * Get customer journey summary
   */
  async getJourney(customerId: string, options?: { limit?: number; offset?: number; domain?: BusinessDomain }): Promise<JourneyResponse> {
    const { limit = 100, offset = 0, domain } = options || {};

    this.logger.info('Fetching customer journey', { customerId, limit, offset });

    const query: Record<string, unknown> = { customerId };
    if (domain) {
      query.businessDomain = domain;
    }

    const [events, profile, total] = await Promise.all([
      JourneyEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      CustomerProfile.findOne({ customerId }),
      JourneyEvent.countDocuments(query),
    ]);

    const activeDomains = profile?.activeDomains || [];

    return {
      customerId,
      totalEvents: total,
      activeDomains,
      firstEventDate: events.length > 0 ? events[events.length - 1].timestamp : null,
      lastEventDate: events.length > 0 ? events[0].timestamp : null,
      events: events.map((e) => ({
        eventId: e._id.toString(),
        customerId: e.customerId,
        eventType: e.eventType,
        businessDomain: e.businessDomain,
        timestamp: e.timestamp,
        metadata: e.metadata as Record<string, unknown>,
      })),
    };
  }

  /**
   * Get customer journey timeline
   */
  async getTimeline(
    customerId: string,
    options?: { startDate?: Date; endDate?: Date; domain?: BusinessDomain; limit?: number }
  ): Promise<TimelineResponse> {
    const { startDate, endDate, domain, limit = 500 } = options || {};

    this.logger.info('Fetching customer timeline', { customerId, startDate, endDate });

    const query: Record<string, unknown> = { customerId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) (query.timestamp as Record<string, Date>).$gte = startDate;
      if (endDate) (query.timestamp as Record<string, Date>).$lte = endDate;
    }

    if (domain) {
      query.businessDomain = domain;
    }

    const events = await JourneyEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Group events by date
    const groupedByDate: Record<string, TimelineEvent[]> = {};
    events.forEach((event) => {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push({
        id: event._id.toString(),
        eventType: event.eventType,
        businessDomain: event.businessDomain,
        businessId: event.businessId,
        timestamp: event.timestamp,
        metadata: event.metadata as Record<string, unknown>,
        sessionId: event.sessionId,
        channel: event.channel,
      });
    });

    const dateRange = {
      start: events.length > 0 ? events[events.length - 1].timestamp : new Date(),
      end: events.length > 0 ? events[0].timestamp : new Date(),
    };

    return {
      customerId,
      totalEvents: events.length,
      dateRange,
      events: events.map((e) => ({
        id: e._id.toString(),
        eventType: e.eventType,
        businessDomain: e.businessDomain,
        businessId: e.businessId,
        timestamp: e.timestamp,
        metadata: e.metadata as Record<string, unknown>,
        sessionId: e.sessionId,
        channel: e.channel,
      })),
      groupedByDate,
    };
  }

  /**
   * Analyze customer journey patterns
   */
  async analyzeJourney(customerId: string): Promise<JourneyAnalysis> {
    this.logger.info('Analyzing customer journey', { customerId });

    const [events, profile] = await Promise.all([
      JourneyEvent.find({ customerId }).sort({ timestamp: 1 }).lean(),
      CustomerProfile.findOne({ customerId }),
    ]);

    if (events.length === 0) {
      return {
        customerId,
        summary: {
          totalEvents: 0,
          activeDomains: 0,
          daysActive: 0,
          averageEventsPerDay: 0,
        },
        domainBreakdown: [],
        funnelAnalysis: [],
        engagementMetrics: {
          engagementScore: 0,
          engagementLevel: 'low',
          sessionFrequency: 0,
          averageSessionDuration: 0,
        },
        behavioralPatterns: [],
        insights: ['No journey data available for this customer'],
      };
    }

    // Calculate summary metrics
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const daysActive = Math.max(1, Math.ceil((lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24)));
    const averageEventsPerDay = events.length / daysActive;

    // Domain breakdown
    const domainCounts: Record<string, { count: number; lastActivity: Date }> = {};
    events.forEach((event) => {
      if (!domainCounts[event.businessDomain]) {
        domainCounts[event.businessDomain] = { count: 0, lastActivity: event.timestamp };
      }
      domainCounts[event.businessDomain].count++;
      if (event.timestamp > domainCounts[event.businessDomain].lastActivity) {
        domainCounts[event.businessDomain].lastActivity = event.timestamp;
      }
    });

    const domainBreakdown = Object.entries(domainCounts).map(([domain, data]) => ({
      domain,
      events: data.count,
      percentage: (data.count / events.length) * 100,
      lastActivity: data.lastActivity,
    }));

    // Funnel analysis
    const funnelStages = [
      { name: 'awareness', events: [JourneyEventType.AWARENESS, JourneyEventType.DISCOVERY, JourneyEventType.SEARCH] },
      { name: 'engagement', events: [JourneyEventType.VIEW, JourneyEventType.INTERACTION, JourneyEventType.ADD_TO_CART, JourneyEventType.WISHLIST] },
      { name: 'conversion', events: [JourneyEventType.SIGNUP, JourneyEventType.PURCHASE, JourneyEventType.BOOKING, JourneyEventType.LOAN_APPROVED] },
      { name: 'retention', events: [JourneyEventType.RETURN_VISIT, JourneyEventType.REPEAT_PURCHASE, JourneyEventType.REFERRAL] },
    ];

    const funnelAnalysis: { stage: string; count: number; dropoffRate: number }[] = [];
    let previousCount = events.length;

    for (const stage of funnelStages) {
      const count = events.filter((e) => stage.events.includes(e.eventType as JourneyEventType)).length;
      const dropoffRate = previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;

      funnelAnalysis.push({
        stage: stage.name,
        count,
        dropoffRate: Math.round(dropoffRate * 100) / 100,
      });

      previousCount = count;
    }

    // Engagement metrics
    const engagementScore = this.calculateEngagementScore(events as unknown as IJourneyEvent[], profile);
    const engagementLevel = this.getEngagementLevel(engagementScore);
    const sessionFrequency = this.calculateSessionFrequency(events as unknown as IJourneyEvent[]);
    const averageSessionDuration = this.calculateAverageSessionDuration(events as unknown as IJourneyEvent[]);

    // Behavioral patterns
    const behavioralPatterns = this.detectBehavioralPatterns(events as unknown as IJourneyEvent[]);

    // Generate insights
    const insights = this.generateInsights(events as unknown as IJourneyEvent[], domainBreakdown, funnelAnalysis, profile);

    return {
      customerId,
      summary: {
        totalEvents: events.length,
        activeDomains: Object.keys(domainCounts).length,
        daysActive,
        averageEventsPerDay: Math.round(averageEventsPerDay * 100) / 100,
      },
      domainBreakdown,
      funnelAnalysis,
      engagementMetrics: {
        engagementScore,
        engagementLevel,
        sessionFrequency: Math.round(sessionFrequency * 100) / 100,
        averageSessionDuration: Math.round(averageSessionDuration / 60), // in minutes
      },
      behavioralPatterns,
      insights,
    };
  }

  /**
   * Update customer profile after event tracking
   */
  private async updateCustomerProfile(
    customerId: string,
    businessDomain: BusinessDomain,
    eventType: JourneyEventType,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const profile = await CustomerProfile.findOne({ customerId });

      if (!profile) {
        // Create new profile
        await CustomerProfile.create({
          customerId,
          activeDomains: [businessDomain],
          firstEventDate: new Date(),
          lastEventDate: new Date(),
        });
      } else {
        // Update existing profile
        const updateData: Record<string, unknown> = {
          lastEventDate: new Date(),
          totalEvents: (profile.totalEvents || 0) + 1,
        };

        // Add domain if new
        if (!profile.activeDomains.includes(businessDomain)) {
          updateData.activeDomains = [...profile.activeDomains, businessDomain];
        }

        // Track transactions
        if ([JourneyEventType.PURCHASE, JourneyEventType.BOOKING, JourneyEventType.LOAN_APPROVED].includes(eventType)) {
          updateData.totalTransactions = (profile.totalTransactions || 0) + 1;
          if (metadata?.amount) {
            updateData.lifetimeValue = (profile.lifetimeValue || 0) + (metadata.amount as number);
          }
        }

        await CustomerProfile.findOneAndUpdate({ customerId }, updateData, { new: true });
      }
    } catch (error) {
      this.logger.error('Failed to update customer profile', { customerId, error });
      // Don't throw - event tracking should succeed even if profile update fails
    }
  }

  /**
   * Calculate engagement score based on recency, frequency, and monetary value
   */
  private calculateEngagementScore(events: IJourneyEvent[], profile: ICustomerProfile | null): number {
    if (events.length === 0) return 0;

    const now = new Date();
    const lastEvent = events[events.length - 1];
    const daysSinceLastEvent = Math.max(0, (now.getTime() - lastEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24));

    // Recency score (0-40 points) - more recent = higher
    const recencyScore = Math.max(0, 40 - daysSinceLastEvent * 2);

    // Frequency score (0-30 points) - more events = higher
    const frequencyScore = Math.min(30, events.length * 0.3);

    // Monetary score (0-30 points) - based on LTV
    const ltv = profile?.lifetimeValue || 0;
    const monetaryScore = Math.min(30, ltv / 1000);

    return Math.round(recencyScore + frequencyScore + monetaryScore);
  }

  /**
   * Get engagement level from score
   */
  private getEngagementLevel(score: number): 'low' | 'medium' | 'high' | 'vip' {
    if (score >= 80) return 'vip';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Calculate session frequency (sessions per week)
   */
  private calculateSessionFrequency(events: IJourneyEvent[]): number {
    if (events.length < 2) return 0;

    const sessionIds = new Set(events.map((e) => e.sessionId).filter(Boolean));
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const weeksActive = Math.max(1, (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24 * 7));

    return sessionIds.size / weeksActive;
  }

  /**
   * Calculate average session duration
   */
  private calculateAverageSessionDuration(events: IJourneyEvent[]): number {
    if (events.length < 2) return 0;

    // Group by session
    const sessionEvents: Record<string, IJourneyEvent[]> = {};
    events.forEach((event) => {
      const sessionId = event.sessionId || 'default';
      if (!sessionEvents[sessionId]) {
        sessionEvents[sessionId] = [];
      }
      sessionEvents[sessionId].push(event);
    });

    const durations = Object.values(sessionEvents).map((sessionEvents) => {
      const sorted = sessionEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return sorted[sorted.length - 1].timestamp.getTime() - sorted[0].timestamp.getTime();
    });

    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  /**
   * Detect behavioral patterns from events
   */
  private detectBehavioralPatterns(events: IJourneyEvent[]): { pattern: string; confidence: number; description: string }[] {
    const patterns: { pattern: string; confidence: number; description: string }[] = [];

    // Check for repeat purchasers
    const purchases = events.filter((e) => e.eventType === JourneyEventType.PURCHASE);
    if (purchases.length >= 3) {
      patterns.push({
        pattern: 'repeat_purchaser',
        confidence: 0.9,
        description: `Customer has made ${purchases.length} purchases, indicating loyalty`,
      });
    }

    // Check for cart abandonment pattern
    const cartAbandons = events.filter((e) => e.eventType === JourneyEventType.CART_ABANDON);
    const conversions = events.filter((e) =>
      [JourneyEventType.PURCHASE, JourneyEventType.BOOKING, JourneyEventType.SUBSCRIPTION].includes(e.eventType)
    );
    if (cartAbandons.length > conversions.length * 2) {
      patterns.push({
        pattern: 'cart_abandoner',
        confidence: 0.75,
        description: 'High cart abandonment rate - consider retargeting',
      });
    }

    // Check for research-heavy behavior
    const views = events.filter((e) => [JourneyEventType.VIEW, JourneyEventType.INTERACTION].includes(e.eventType));
    if (views.length > events.length * 0.7) {
      patterns.push({
        pattern: 'researcher',
        confidence: 0.65,
        description: 'Customer tends to research extensively before converting',
      });
    }

    // Check for multi-domain engagement
    const domains = new Set(events.map((e) => e.businessDomain));
    if (domains.size >= 3) {
      patterns.push({
        pattern: 'cross_business',
        confidence: 0.85,
        description: `Active across ${domains.size} business domains - high value customer`,
      });
    }

    return patterns;
  }

  /**
   * Generate actionable insights
   */
  private generateInsights(
    events: IJourneyEvent[],
    domainBreakdown: { domain: string; events: number; percentage: number }[],
    funnelAnalysis: { stage: string; count: number; dropoffRate: number }[],
    profile: ICustomerProfile | null
  ): string[] {
    const insights: string[] = [];

    // Check for high churn risk
    const daysSinceLastEvent =
      events.length > 0
        ? Math.floor((new Date().getTime() - events[events.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    if (daysSinceLastEvent > 30) {
      insights.push(`Customer inactive for ${daysSinceLastEvent} days - high churn risk. Consider re-engagement campaign.`);
    }

    // Check for high-value potential
    if (profile && profile.lifetimeValue > 10000) {
      insights.push('High-value customer - prioritize for VIP treatment and personalized experiences.');
    }

    // Check for cross-sell opportunities
    if (domainBreakdown.length > 0 && domainBreakdown.length < 3) {
      const activeDomains = domainBreakdown.map((d) => d.domain);
      const potentialDomains = Object.values(BusinessDomain).filter((d) => !activeDomains.includes(d));
      if (potentialDomains.length > 0) {
        insights.push(`Cross-sell opportunity: Customer is active in ${activeDomains.join(', ')} but not in ${potentialDomains[0]}.`);
      }
    }

    // Check for cart abandonment
    const abandonEvents = events.filter((e) => e.eventType === JourneyEventType.CART_ABANDON);
    if (abandonEvents.length > 0) {
      insights.push(`${abandonEvents.length} abandoned carts detected - recovery campaign recommended.`);
    }

    // Check engagement trend
    const recentEvents = events.filter((e) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return e.timestamp >= thirtyDaysAgo;
    });
    const earlierEvents = events.filter((e) => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return e.timestamp >= sixtyDaysAgo && e.timestamp < thirtyDaysAgo;
    });

    if (recentEvents.length < earlierEvents.length * 0.5 && earlierEvents.length > 5) {
      insights.push('Declining engagement trend detected - intervention recommended to prevent churn.');
    }

    return insights;
  }
}

export const journeyService = new JourneyService();
export default journeyService;
