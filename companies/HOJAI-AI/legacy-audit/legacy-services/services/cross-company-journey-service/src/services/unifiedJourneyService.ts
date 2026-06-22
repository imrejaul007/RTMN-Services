import { v4 as uuidv4 } from 'uuid';
import {
  UnifiedJourney,
  JourneyEvent,
  JourneySegment,
  JourneyMilestone,
  JourneyPhase,
  EventType,
  ChannelType,
  HealthStatus,
  MilestoneType,
  IUnifiedJourney,
  IJourneyEvent,
  ICompanyInteraction,
  IJourneySegment,
  IJourneyMilestone,
  IJourneyHealth,
  HealthFactor
} from '../models/journey';
import { logger } from '../utils/logger';
import { eventAggregator } from './eventAggregator';
import { patternDetection } from './patternDetection';
import { journeyAnalytics } from './journeyAnalytics';

export interface CreateJourneyOptions {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  attributes?: Record<string, unknown>;
}

export interface TrackEventOptions {
  customerId: string;
  companyId: string;
  companyName: string;
  eventType: EventType;
  channel: ChannelType;
  metadata?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referralSource?: string;
  utmParameters?: Record<string, string>;
  timestamp?: Date;
}

export interface TimelineOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface JourneySummary {
  customerId: string;
  currentPhase: JourneyPhase;
  totalCompanies: number;
  totalEvents: number;
  totalRevenue: number;
  lifetimeValue: number;
  healthScore: number;
  healthStatus: HealthStatus;
  engagementScore: number;
  churnRisk: number;
  journeyDurationDays: number;
  companies: ICompanyInteraction[];
  recentEvents: IJourneyEvent[];
  milestones: IJourneyMilestone[];
  preferredChannels: ChannelType[];
  segments: string[];
  tags: string[];
}

export class UnifiedJourneyService {
  /**
   * Create a new unified journey for a customer
   */
  async createJourney(options: CreateJourneyOptions): Promise<IUnifiedJourney> {
    const { customerId, customerEmail, customerPhone, customerName, attributes } = options;

    logger.info(`Creating unified journey for customer: ${customerId}`);

    // Check if journey already exists
    let journey = await UnifiedJourney.findOne({ customerId });

    if (journey) {
      logger.warn(`Journey already exists for customer: ${customerId}, updating instead`);
      return this.updateJourney(journey, options);
    }

    journey = new UnifiedJourney({
      customerId,
      customerEmail,
      customerPhone,
      customerName,
      journeyStartDate: new Date(),
      lastActivityDate: new Date(),
      currentPhase: JourneyPhase.AWARENESS,
      companies: [],
      totalEvents: 0,
      totalRevenue: 0,
      lifetimeValue: 0,
      healthScore: 50,
      healthStatus: HealthStatus.GOOD,
      engagementScore: 0,
      churnRisk: 0,
      totalCompanies: 0,
      preferredChannels: [],
      attributes: attributes || {},
      tags: [],
      segments: [],
      predictions: []
    });

    await journey.save();

    logger.info(`Created unified journey for customer: ${customerId}`, {
      journeyId: journey._id,
      companies: 0,
      totalEvents: 0
    });

    return journey;
  }

  /**
   * Update existing journey with new information
   */
  private async updateJourney(
    journey: IUnifiedJourney,
    options: CreateJourneyOptions
  ): Promise<IUnifiedJourney> {
    const updates: Partial<IUnifiedJourney> = {};

    if (options.customerEmail) updates.customerEmail = options.customerEmail;
    if (options.customerPhone) updates.customerPhone = options.customerPhone;
    if (options.customerName) updates.customerName = options.customerName;

    Object.assign(journey, updates);
    await journey.save();

    return journey;
  }

  /**
   * Get unified journey for a customer
   */
  async getJourney(customerId: string): Promise<IUnifiedJourney | null> {
    return UnifiedJourney.findOne({ customerId });
  }

  /**
   * Track a cross-company event
   */
  async trackCrossCompanyEvent(options: TrackEventOptions): Promise<IJourneyEvent> {
    const {
      customerId,
      companyId,
      companyName,
      eventType,
      channel,
      metadata,
      properties,
      sessionId,
      userAgent,
      ipAddress,
      referralSource,
      utmParameters,
      timestamp
    } = options;

    logger.debug(`Tracking event for customer ${customerId}`, {
      companyId,
      eventType,
      channel
    });

    // Ensure journey exists
    let journey = await this.getJourney(customerId);
    if (!journey) {
      journey = await this.createJourney({ customerId });
    }

    // Receive and process event through event aggregator
    const event = await eventAggregator.receiveEvent(companyId, {
      customerId,
      companyId,
      companyName,
      eventType,
      channel,
      metadata: metadata || {},
      properties: properties || {},
      sessionId,
      userAgent,
      ipAddress,
      referralSource,
      utmParameters,
      timestamp: timestamp || new Date()
    });

    // Update unified journey with new event
    await this.updateJourneyWithEvent(journey, event, companyId, companyName);

    // Check for milestone achievements
    await this.checkAndRecordMilestones(journey, event);

    // Detect patterns
    await patternDetection.detectCrossCompanyPatterns(customerId);

    // Update health and analytics
    await this.updateJourneyAnalytics(journey);

    return event;
  }

  /**
   * Update journey stats after receiving an event
   */
  private async updateJourneyWithEvent(
    journey: IUnifiedJourney,
    event: IJourneyEvent,
    companyId: string,
    companyName: string
  ): Promise<void> {
    const now = new Date();

    // Update basic stats
    journey.totalEvents += 1;
    journey.lastActivityDate = now;

    // Update revenue if this is a purchase event
    if (
      event.eventType === EventType.PURCHASE ||
      event.eventType === EventType.PAYMENT ||
      event.eventType === EventType.CHECKOUT_COMPLETE
    ) {
      const amount = (event.properties as Record<string, number>)?.totalAmount || 0;
      journey.totalRevenue += amount;
      journey.lifetimeValue += amount;
    }

    // Update company interaction
    await this.updateCompanyInteraction(journey, companyId, companyName, event);

    // Update preferred channels
    this.updatePreferredChannels(journey, event.channel);

    // Update current phase
    await this.updateJourneyPhase(journey);

    await journey.save();
  }

  /**
   * Update or create company interaction record
   */
  private async updateCompanyInteraction(
    journey: IUnifiedJourney,
    companyId: string,
    companyName: string,
    event: IJourneyEvent
  ): Promise<void> {
    const companyIndex = journey.companies.findIndex(c => c.companyId === companyId);

    if (companyIndex === -1) {
      // New company interaction
      const newInteraction: ICompanyInteraction = {
        companyId,
        companyName,
        companyType: 'vertical_company' as any,
        firstInteraction: event.timestamp,
        lastInteraction: event.timestamp,
        totalInteractions: 1,
        interactionTypes: [event.eventType],
        channels: [event.channel],
        revenue: 0,
        orders: 0,
        averageOrderValue: 0,
        preferredChannel: event.channel,
        engagementScore: 10
      };

      // Add revenue if purchase
      if (
        event.eventType === EventType.PURCHASE ||
        event.eventType === EventType.PAYMENT ||
        event.eventType === EventType.CHECKOUT_COMPLETE
      ) {
        const amount = (event.properties as Record<string, number>)?.totalAmount || 0;
        newInteraction.revenue = amount;
        newInteraction.orders = 1;
        newInteraction.averageOrderValue = amount;
      }

      journey.companies.push(newInteraction);
      journey.totalCompanies = journey.companies.length;
    } else {
      // Update existing interaction
      const interaction = journey.companies[companyIndex];
      interaction.lastInteraction = event.timestamp;
      interaction.totalInteractions += 1;

      // Add new event type if not present
      if (!interaction.interactionTypes.includes(event.eventType)) {
        interaction.interactionTypes.push(event.eventType);
      }

      // Add new channel if not present
      if (!interaction.channels.includes(event.channel)) {
        interaction.channels.push(event.channel);
      }

      // Update revenue
      if (
        event.eventType === EventType.PURCHASE ||
        event.eventType === EventType.PAYMENT ||
        event.eventType === EventType.CHECKOUT_COMPLETE
      ) {
        const amount = (event.properties as Record<string, number>)?.totalAmount || 0;
        interaction.revenue += amount;
        interaction.orders += 1;
        interaction.averageOrderValue = interaction.revenue / interaction.orders;
      }

      // Update engagement score
      interaction.engagementScore = Math.min(100, interaction.engagementScore + 5);
    }
  }

  /**
   * Update preferred channels based on event frequency
   */
  private updatePreferredChannels(journey: IUnifiedJourney, channel: ChannelType): void {
    const channelCounts: Record<string, number> = {};

    journey.companies.forEach(company => {
      company.channels.forEach(ch => {
        channelCounts[ch] = (channelCounts[ch] || 0) + 1;
      });
    });

    // Sort channels by frequency
    const sortedChannels = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([ch]) => ch as ChannelType);

    journey.preferredChannels = sortedChannels;
  }

  /**
   * Update journey phase based on events and behavior
   */
  private async updateJourneyPhase(journey: IUnifiedJourney): Promise<void> {
    const events = await JourneyEvent.find({ customerId: journey.customerId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    const recentEvents = events.filter(
      e => new Date(e.timestamp).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
    );

    const hasPurchase =
      recentEvents.some(e => e.eventType === EventType.PURCHASE) ||
      recentEvents.some(e => e.eventType === EventType.PAYMENT) ||
      recentEvents.some(e => e.eventType === EventType.CHECKOUT_COMPLETE);

    const hasReferral =
      recentEvents.some(e => e.eventType === EventType.REFERRAL) ||
      recentEvents.some(e => e.eventType === EventType.SHARE);

    const hasSupport =
      recentEvents.some(e => e.eventType === EventType.SUPPORT_TICKET);

    const daysSinceLastActivity =
      (Date.now() - journey.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);

    // Determine phase
    if (journey.totalRevenue > 0 && daysSinceLastActivity > 90) {
      journey.currentPhase = JourneyPhase.CHURNED;
    } else if (journey.totalRevenue > 0 && daysSinceLastActivity > 30) {
      journey.currentPhase = JourneyPhase.AT_RISK;
    } else if (hasReferral && journey.totalRevenue > 0) {
      journey.currentPhase = JourneyPhase.ADVOCACY;
    } else if (hasPurchase) {
      journey.currentPhase = JourneyPhase.RETENTION;
    } else if (
      recentEvents.some(e =>
        [EventType.SEARCH, EventType.PAGE_VIEW, EventType.CLICK].includes(e.eventType as EventType)
      )
    ) {
      journey.currentPhase = JourneyPhase.CONSIDERATION;
    } else if (journey.totalEvents > 0) {
      journey.currentPhase = JourneyPhase.AWARENESS;
    }

    // Check for reactivation
    if (journey.currentPhase === JourneyPhase.CHURNED && daysSinceLastActivity <= 7) {
      journey.currentPhase = JourneyPhase.REACTIVATED;
    }
  }

  /**
   * Check and record milestones
   */
  private async checkAndRecordMilestones(
    journey: IUnifiedJourney,
    event: IJourneyEvent
  ): Promise<void> {
    const milestones: MilestoneType[] = [];

    // First interaction
    if (journey.totalEvents === 1) {
      milestones.push(MilestoneType.FIRST_INTERACTION);
    }

    // First purchase
    if (
      (event.eventType === EventType.PURCHASE ||
        event.eventType === EventType.PAYMENT ||
        event.eventType === EventType.CHECKOUT_COMPLETE) &&
      journey.totalRevenue > 0
    ) {
      const existingPurchase = await JourneyMilestone.findOne({
        customerId: journey.customerId,
        milestoneType: MilestoneType.FIRST_PURCHASE
      });

      if (!existingPurchase) {
        milestones.push(MilestoneType.FIRST_PURCHASE);
      }
    }

    // First login
    if (event.eventType === EventType.LOGIN) {
      const existingLogin = await JourneyMilestone.findOne({
        customerId: journey.customerId,
        milestoneType: MilestoneType.FIRST_LOGIN
      });

      if (!existingLogin) {
        milestones.push(MilestoneType.FIRST_LOGIN);
      }
    }

    // Signup complete
    if (event.eventType === EventType.SIGNUP) {
      const existingSignup = await JourneyMilestone.findOne({
        customerId: journey.customerId,
        milestoneType: MilestoneType.SIGNUP_COMPLETE
      });

      if (!existingSignup) {
        milestones.push(MilestoneType.SIGNUP_COMPLETE);
      }
    }

    // Support ticket resolved
    if (event.eventType === EventType.SUPPORT_TICKET) {
      const existingSupport = await JourneyMilestone.findOne({
        customerId: journey.customerId,
        milestoneType: MilestoneType.SUPPORT_TICKET_RESOLVED
      });

      if (!existingSupport) {
        milestones.push(MilestoneType.SUPPORT_TICKET_RESOLVED);
      }
    }

    // Referral made
    if (event.eventType === EventType.REFERRAL || event.eventType === EventType.SHARE) {
      milestones.push(MilestoneType.REFERRAL_MADE);
    }

    // Record milestones
    for (const milestoneType of milestones) {
      await this.recordMilestone(journey.customerId, milestoneType, event);
    }
  }

  /**
   * Record a milestone
   */
  private async recordMilestone(
    customerId: string,
    milestoneType: MilestoneType,
    event: IJourneyEvent
  ): Promise<IJourneyMilestone> {
    const milestoneId = uuidv4();

    const milestoneData = this.getMilestoneDescription(milestoneType, event);

    const milestone = new JourneyMilestone({
      milestoneId,
      customerId,
      milestoneType,
      achievedAt: event.timestamp,
      companyId: event.companyId,
      companyName: event.companyName,
      description: milestoneData.description,
      value: milestoneData.value,
      metadata: milestoneData.metadata
    });

    await milestone.save();

    logger.info(`Milestone recorded for customer ${customerId}: ${milestoneType}`);

    return milestone;
  }

  /**
   * Get milestone description
   */
  private getMilestoneDescription(
    milestoneType: MilestoneType,
    event: IJourneyEvent
  ): { description: string; value?: number; metadata?: Record<string, unknown> } {
    switch (milestoneType) {
      case MilestoneType.FIRST_INTERACTION:
        return {
          description: `First interaction with ${event.companyName}`,
          metadata: { channel: event.channel }
        };
      case MilestoneType.FIRST_PURCHASE:
        return {
          description: `First purchase on ${event.companyName}`,
          value: (event.properties as Record<string, number>)?.totalAmount,
          metadata: { orderId: (event.properties as Record<string, string>)?.orderId }
        };
      case MilestoneType.FIRST_LOGIN:
        return {
          description: `First login to ${event.companyName}`,
          metadata: { channel: event.channel }
        };
      case MilestoneType.SIGNUP_COMPLETE:
        return {
          description: `Sign up completed on ${event.companyName}`
        };
      case MilestoneType.SUPPORT_TICKET_RESOLVED:
        return {
          description: `Support ticket resolved by ${event.companyName}`,
          metadata: { ticketId: (event.properties as Record<string, string>)?.ticketId }
        };
      case MilestoneType.REFERRAL_MADE:
        return {
          description: `Referred someone from ${event.companyName}`
        };
      default:
        return {
          description: `Milestone: ${milestoneType}`,
          metadata: { eventType: event.eventType }
        };
    }
  }

  /**
   * Update journey analytics
   */
  private async updateJourneyAnalytics(journey: IUnifiedJourney): Promise<void> {
    // Get engagement score
    const engagementScore = await journeyAnalytics.getEngagementScore(journey.customerId);
    journey.engagementScore = engagementScore;

    // Get churn risk
    const churnRisk = await journeyAnalytics.getChurnRisk(journey.customerId);
    journey.churnRisk = churnRisk;

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(
      engagementScore,
      churnRisk,
      journey.totalRevenue,
      journey.totalCompanies
    );
    journey.healthScore = healthScore;
    journey.healthStatus = this.getHealthStatus(healthScore);

    await journey.save();
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(
    engagementScore: number,
    churnRisk: number,
    revenue: number,
    companyCount: number
  ): number {
    const engagementWeight = 0.4;
    const churnWeight = 0.3;
    const revenueWeight = 0.15;
    const companyWeight = 0.15;

    // Normalize revenue (cap at 10 lakhs)
    const normalizedRevenue = Math.min(revenue / 100000, 1);
    const normalizedCompanies = Math.min(companyCount / 5, 1);

    const score =
      engagementScore * engagementWeight +
      (1 - churnRisk) * 100 * churnWeight +
      normalizedRevenue * 100 * revenueWeight +
      normalizedCompanies * 100 * companyWeight;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Get health status from score
   */
  private getHealthStatus(score: number): HealthStatus {
    if (score >= 80) return HealthStatus.EXCELLENT;
    if (score >= 60) return HealthStatus.GOOD;
    if (score >= 40) return HealthStatus.FAIR;
    if (score >= 20) return HealthStatus.AT_RISK;
    return HealthStatus.CRITICAL;
  }

  /**
   * Get unified timeline for a customer
   */
  async getUnifiedTimeline(
    customerId: string,
    options?: TimelineOptions
  ): Promise<IJourneyEvent[]> {
    const query: Record<string, unknown> = { customerId };

    if (options?.startDate) {
      query.timestamp = { $gte: options.startDate };
    }

    if (options?.endDate) {
      query.timestamp = { ...(query.timestamp as object || {}), $lte: options.endDate };
    }

    const events = await JourneyEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 100)
      .lean();

    return events as unknown as IJourneyEvent[];
  }

  /**
   * Get company-specific timeline
   */
  async getCompanyTimeline(
    customerId: string,
    companyId: string,
    options?: TimelineOptions
  ): Promise<IJourneyEvent[]> {
    const query: Record<string, unknown> = { customerId, companyId };

    if (options?.startDate) {
      query.timestamp = { $gte: options.startDate };
    }

    if (options?.endDate) {
      query.timestamp = { ...(query.timestamp as object || {}), $lte: options.endDate };
    }

    const events = await JourneyEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .lean();

    return events as unknown as IJourneyEvent[];
  }

  /**
   * Get journey phases
   */
  async getJourneyPhases(customerId: string): Promise<IJourneySegment[]> {
    const segments = await JourneySegment.find({ customerId })
      .sort({ startDate: 1 })
      .lean();

    return segments as unknown as IJourneySegment[];
  }

  /**
   * Identify and return key milestones
   */
  async identifyMilestones(customerId: string): Promise<IJourneyMilestone[]> {
    const milestones = await JourneyMilestone.find({ customerId })
      .sort({ achievedAt: -1 })
      .lean();

    return milestones as unknown as IJourneyMilestone[];
  }

  /**
   * Calculate journey health
   */
  async calculateJourneyHealth(customerId: string): Promise<IJourneyHealth> {
    const journey = await this.getJourney(customerId);

    if (!journey) {
      return {
        customerId,
        overallScore: 0,
        status: HealthStatus.CRITICAL,
        engagementScore: 0,
        recencyScore: 0,
        frequencyScore: 0,
        monetaryScore: 0,
        churnRisk: 1,
        lastAssessed: new Date(),
        factors: [],
        recommendations: ['No journey data found for this customer']
      };
    }

    const factors: HealthFactor[] = [];

    // Recency score
    const daysSinceLastActivity =
      (Date.now() - journey.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
    let recencyScore = 100;
    if (daysSinceLastActivity > 1) recencyScore = 80;
    if (daysSinceLastActivity > 7) recencyScore = 60;
    if (daysSinceLastActivity > 30) recencyScore = 30;
    if (daysSinceLastActivity > 90) recencyScore = 10;

    factors.push({
      factor: 'Recency',
      score: recencyScore,
      impact: recencyScore >= 60 ? 'positive' : 'negative',
      description: `Last activity ${Math.round(daysSinceLastActivity)} days ago`
    });

    // Frequency score
    const avgEventsPerWeek = journey.totalEvents / Math.max(1, daysSinceLastActivity / 7);
    let frequencyScore = Math.min(100, avgEventsPerWeek * 20);
    factors.push({
      factor: 'Frequency',
      score: frequencyScore,
      impact: frequencyScore >= 30 ? 'positive' : 'negative',
      description: `${avgEventsPerWeek.toFixed(1)} events per week on average`
    });

    // Monetary score
    const avgOrderValue = journey.totalRevenue / Math.max(1, journey.totalEvents);
    const monetaryScore = Math.min(100, avgOrderValue * 10);
    factors.push({
      factor: 'Monetary',
      score: monetaryScore,
      impact: monetaryScore >= 30 ? 'positive' : 'negative',
      description: `Average order value: ₹${avgOrderValue.toFixed(2)}`
    });

    // Company diversity
    const companyScore = Math.min(100, journey.totalCompanies * 25);
    factors.push({
      factor: 'Company Diversity',
      score: companyScore,
      impact: companyScore >= 50 ? 'positive' : 'neutral',
      description: `Engaged with ${journey.totalCompanies} companies`
    });

    // Calculate overall score
    const overallScore = Math.round(
      recencyScore * 0.35 +
      frequencyScore * 0.25 +
      monetaryScore * 0.25 +
      companyScore * 0.15
    );

    const recommendations: string[] = [];
    if (recencyScore < 30) {
      recommendations.push('Re-engage customer with personalized outreach');
    }
    if (frequencyScore < 30) {
      recommendations.push('Increase touchpoints with relevant content');
    }
    if (monetaryScore < 30 && journey.totalCompanies > 0) {
      recommendations.push('Consider cross-selling or upselling opportunities');
    }
    if (journey.totalCompanies < 2) {
      recommendations.push('Introduce customer to other RTNM services');
    }

    return {
      customerId,
      overallScore,
      status: this.getHealthStatus(overallScore),
      engagementScore: journey.engagementScore,
      recencyScore,
      frequencyScore,
      monetaryScore,
      churnRisk: journey.churnRisk,
      lastAssessed: new Date(),
      factors,
      recommendations
    };
  }

  /**
   * Get comprehensive journey summary
   */
  async getJourneySummary(customerId: string): Promise<JourneySummary | null> {
    const journey = await this.getJourney(customerId);

    if (!journey) {
      return null;
    }

    const recentEvents = await this.getUnifiedTimeline(customerId, { limit: 10 });
    const milestones = await this.identifyMilestones(customerId);

    const journeyDurationDays = Math.ceil(
      (Date.now() - journey.journeyStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      customerId: journey.customerId,
      currentPhase: journey.currentPhase,
      totalCompanies: journey.totalCompanies,
      totalEvents: journey.totalEvents,
      totalRevenue: journey.totalRevenue,
      lifetimeValue: journey.lifetimeValue,
      healthScore: journey.healthScore,
      healthStatus: journey.healthStatus,
      engagementScore: journey.engagementScore,
      churnRisk: journey.churnRisk,
      journeyDurationDays,
      companies: journey.companies,
      recentEvents,
      milestones,
      preferredChannels: journey.preferredChannels,
      segments: journey.segments,
      tags: journey.tags
    };
  }

  /**
   * Add tags to journey
   */
  async addTags(customerId: string, tags: string[]): Promise<void> {
    await UnifiedJourney.updateOne(
      { customerId },
      { $addToSet: { tags: { $each: tags } } }
    );
  }

  /**
   * Add segments to journey
   */
  async addSegments(customerId: string, segments: string[]): Promise<void> {
    await UnifiedJourney.updateOne(
      { customerId },
      { $addToSet: { segments: { $each: segments } } }
    );
  }

  /**
   * Update customer attributes
   */
  async updateAttributes(
    customerId: string,
    attributes: Record<string, unknown>
  ): Promise<void> {
    await UnifiedJourney.updateOne(
      { customerId },
      { $set: { attributes } }
    );
  }

  /**
   * Delete journey and all related data
   */
  async deleteJourney(customerId: string): Promise<void> {
    await Promise.all([
      UnifiedJourney.deleteOne({ customerId }),
      JourneyEvent.deleteMany({ customerId }),
      JourneySegment.deleteMany({ customerId }),
      JourneyMilestone.deleteMany({ customerId })
    ]);

    logger.info(`Deleted journey and related data for customer: ${customerId}`);
  }
}

export const unifiedJourneyService = new UnifiedJourneyService();
