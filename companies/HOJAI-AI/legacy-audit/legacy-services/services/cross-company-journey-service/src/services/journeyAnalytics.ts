import {
  JourneyEvent,
  UnifiedJourney,
  EventType,
  ChannelType,
  IJourneyEvent
} from '../models/journey';
import { logger } from '../utils/logger';

export interface EngagementMetrics {
  overallScore: number;
  recencyScore: number;
  frequencyScore: number;
  recencyDays: number;
  eventsLast30Days: number;
  eventsLast90Days: number;
  averageSessionLength: number;
  topChannels: { channel: ChannelType; count: number }[];
  topCompanies: { companyId: string; count: number }[];
}

export interface LTVMetrics {
  lifetimeValue: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  ordersLast30Days: number;
  predicted12MonthValue: number;
  predicted24MonthValue: number;
  revenueByCompany: { companyId: string; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

export interface ChurnRiskMetrics {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: { factor: string; contribution: number; description: string }[];
  daysSinceLastActivity: number;
  predictedChurnDate?: Date;
  recommendedActions: string[];
}

export interface VelocityMetrics {
  currentPhase: string;
  daysInCurrentPhase: number;
  averageDaysPerPhase: number;
  phaseProgress: number;
  velocityScore: number;
  phaseHistory: { phase: string; duration: number; completed: boolean }[];
}

export interface ChannelPreference {
  channel: ChannelType;
  frequency: number;
  percentage: number;
  revenueContribution: number;
}

export interface JourneyComparison {
  similarity: number;
  commonPhases: string[];
  commonCompanies: string[];
  commonPatterns: string[];
  timeOffset: number;
  revenueDifference: number;
  engagementDifference: number;
}

export class JourneyAnalyticsService {
  /**
   * Calculate engagement score (0-100)
   */
  async getEngagementScore(customerId: string): Promise<number> {
    const metrics = await this.getEngagementMetrics(customerId);
    return metrics.overallScore;
  }

  /**
   * Get comprehensive engagement metrics
   */
  async getEngagementMetrics(customerId: string): Promise<EngagementMetrics> {
    const journey = await UnifiedJourney.findOne({ customerId });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .lean();

    const recentEvents = events.filter(
      e => new Date(e.timestamp).getTime() > thirtyDaysAgo.getTime()
    );

    const olderEvents = events.filter(
      e =>
        new Date(e.timestamp).getTime() > ninetyDaysAgo.getTime() &&
        new Date(e.timestamp).getTime() <= thirtyDaysAgo.getTime()
    );

    // Calculate recency score
    const daysSinceActivity = journey
      ? (Date.now() - journey.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    let recencyScore = 0;
    if (daysSinceActivity <= 1) recencyScore = 100;
    else if (daysSinceActivity <= 7) recencyScore = 80;
    else if (daysSinceActivity <= 14) recencyScore = 60;
    else if (daysSinceActivity <= 30) recencyScore = 40;
    else if (daysSinceActivity <= 60) recencyScore = 20;
    else recencyScore = 0;

    // Calculate frequency score
    const eventsPerWeek = recentEvents.length / 4;
    const frequencyScore = Math.min(100, eventsPerWeek * 15);

    // Calculate average session length (simplified - based on events per session)
    const sessionCounts = new Map<string, number>();
    for (const event of events) {
      if (event.sessionId) {
        sessionCounts.set(event.sessionId, (sessionCounts.get(event.sessionId) || 0) + 1);
      }
    }
    const avgSessionLength =
      sessionCounts.size > 0
        ? Array.from(sessionCounts.values()).reduce((a, b) => a + b, 0) / sessionCounts.size
        : 0;

    // Calculate top channels
    const channelCounts: Record<string, number> = {};
    for (const event of events) {
      channelCounts[event.channel] = (channelCounts[event.channel] || 0) + 1;
    }
    const topChannels = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([channel, count]) => ({
        channel: channel as ChannelType,
        count
      }));

    // Calculate top companies
    const companyCounts: Record<string, number> = {};
    for (const event of events) {
      companyCounts[event.companyId] = (companyCounts[event.companyId] || 0) + 1;
    }
    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([companyId, count]) => ({
        companyId,
        count
      }));

    // Calculate overall score
    const overallScore = Math.round(
      recencyScore * 0.4 + frequencyScore * 0.35 + (avgSessionLength / 10) * 10 * 0.25
    );

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      recencyScore,
      frequencyScore,
      recencyDays: Math.round(daysSinceActivity),
      eventsLast30Days: recentEvents.length,
      eventsLast90Days: recentEvents.length + olderEvents.length,
      averageSessionLength: Math.round(avgSessionLength * 10) / 10,
      topChannels,
      topCompanies
    };
  }

  /**
   * Calculate Lifetime Value
   */
  async getLTV(customerId: string): Promise<LTVMetrics> {
    const journey = await UnifiedJourney.findOne({ customerId });

    if (!journey) {
      return {
        lifetimeValue: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        totalOrders: 0,
        ordersLast30Days: 0,
        predicted12MonthValue: 0,
        predicted24MonthValue: 0,
        revenueByCompany: [],
        revenueByMonth: []
      };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .lean();

    // Get purchase events
    const purchaseEvents = events.filter(
      e => e.eventType === EventType.PURCHASE || e.eventType === EventType.PAYMENT
    );

    const totalRevenue = journey.totalRevenue || 0;
    const totalOrders = purchaseEvents.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Orders in last 30 days
    const recentPurchases = purchaseEvents.filter(
      e => new Date(e.timestamp).getTime() > thirtyDaysAgo.getTime()
    );
    const ordersLast30Days = recentPurchases.length;

    // Calculate revenue by company
    const revenueByCompany: { companyId: string; revenue: number }[] = [];
    for (const company of journey.companies) {
      if (company.revenue > 0) {
        revenueByCompany.push({
          companyId: company.companyId,
          revenue: company.revenue
        });
      }
    }
    revenueByCompany.sort((a, b) => b.revenue - a.revenue);

    // Calculate revenue by month
    const revenueByMonth: { month: string; revenue: number }[] = [];
    const monthMap = new Map<string, number>();

    for (const event of purchaseEvents) {
      const month = new Date(event.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      });
      const amount = (event.properties as Record<string, number>)?.totalAmount || 0;
      monthMap.set(month, (monthMap.get(month) || 0) + amount);
    }

    for (const [month, revenue] of monthMap) {
      revenueByMonth.push({ month, revenue });
    }
    revenueByMonth.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    // Predict future value based on historical data
    const journeyDuration =
      (Date.now() - journey.journeyStartDate.getTime()) / (1000 * 60 * 60 * 24);
    const monthlyRate = journeyDuration > 0 ? totalRevenue / (journeyDuration / 30) : 0;

    // Simple prediction with slight decay
    const predicted12MonthValue = monthlyRate * 12 * 0.9;
    const predicted24MonthValue = monthlyRate * 24 * 0.75;

    return {
      lifetimeValue: journey.lifetimeValue || 0,
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      totalOrders,
      ordersLast30Days,
      predicted12MonthValue: Math.round(predicted12MonthValue),
      predicted24MonthValue: Math.round(predicted24MonthValue),
      revenueByCompany,
      revenueByMonth
    };
  }

  /**
   * Calculate churn risk
   */
  async getChurnRisk(customerId: string): Promise<number> {
    const metrics = await this.getChurnRiskMetrics(customerId);
    return metrics.riskScore;
  }

  /**
   * Get comprehensive churn risk metrics
   */
  async getChurnRiskMetrics(customerId: string): Promise<ChurnRiskMetrics> {
    const journey = await UnifiedJourney.findOne({ customerId });
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .lean();

    const factors: { factor: string; contribution: number; description: string }[] = [];
    let riskScore = 0;

    // Factor 1: Recency
    const daysSinceActivity = journey
      ? (Date.now() - journey.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    let recencyRisk = 0;
    if (daysSinceActivity > 90) recencyRisk = 0.4;
    else if (daysSinceActivity > 60) recencyRisk = 0.3;
    else if (daysSinceActivity > 30) recencyRisk = 0.2;
    else if (daysSinceActivity > 14) recencyRisk = 0.1;
    factors.push({
      factor: 'recency',
      contribution: recencyRisk,
      description: `${Math.round(daysSinceActivity)} days since last activity`
    });
    riskScore += recencyRisk;

    // Factor 2: Engagement decline
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentCount = events.filter(
      e => new Date(e.timestamp).getTime() > thirtyDaysAgo.getTime()
    ).length;
    const olderCount = events.filter(
      e =>
        new Date(e.timestamp).getTime() > sixtyDaysAgo.getTime() &&
        new Date(e.timestamp).getTime() <= thirtyDaysAgo.getTime()
    ).length;

    let engagementRisk = 0;
    if (olderCount > 0) {
      const declineRatio = recentCount / olderCount;
      if (declineRatio < 0.2) engagementRisk = 0.25;
      else if (declineRatio < 0.5) engagementRisk = 0.15;
      else if (declineRatio < 0.8) engagementRisk = 0.05;
    }
    factors.push({
      factor: 'engagement_decline',
      contribution: engagementRisk,
      description:
        recentCount < olderCount
          ? `Activity declined by ${Math.round((1 - recentCount / olderCount) * 100)}%`
          : 'Activity is stable or growing'
    });
    riskScore += engagementRisk;

    // Factor 3: Support issues
    const supportTickets = events.filter(e => e.eventType === EventType.SUPPORT_TICKET).length;
    let supportRisk = 0;
    if (supportTickets >= 5) supportRisk = 0.15;
    else if (supportTickets >= 3) supportRisk = 0.1;
    else if (supportTickets >= 1) supportRisk = 0.05;
    factors.push({
      factor: 'support_issues',
      contribution: supportRisk,
      description: `${supportTickets} support tickets`
    });
    riskScore += supportRisk;

    // Factor 4: Single company engagement
    const uniqueCompanies = new Set(events.map(e => e.companyId));
    let companyRisk = 0;
    if (uniqueCompanies.size === 1 && events.length > 10) {
      companyRisk = 0.1;
      factors.push({
        factor: 'single_company',
        contribution: companyRisk,
        description: 'Only engaged with one company'
      });
    } else {
      factors.push({
        factor: 'single_company',
        contribution: 0,
        description: `Engaged with ${uniqueCompanies.size} companies`
      });
    }
    riskScore += companyRisk;

    // Factor 5: Revenue concentration
    if (journey && journey.companies.length > 0) {
      const revenueConcentration =
        journey.companies.reduce((max, c) => Math.max(max, c.revenue), 0) /
        Math.max(1, journey.totalRevenue);
      if (revenueConcentration > 0.95 && journey.totalRevenue > 0) {
        riskScore += 0.1;
        factors.push({
          factor: 'revenue_concentration',
          contribution: 0.1,
          description: '95%+ revenue from single company'
        });
      } else {
        factors.push({
          factor: 'revenue_concentration',
          contribution: 0,
          description: 'Revenue diversified across companies'
        });
      }
    }

    // Cap risk score
    riskScore = Math.min(1, riskScore);

    // Determine risk level
    let riskLevel: ChurnRiskMetrics['riskLevel'];
    if (riskScore >= 0.7) riskLevel = 'critical';
    else if (riskScore >= 0.5) riskLevel = 'high';
    else if (riskScore >= 0.3) riskLevel = 'medium';
    else riskLevel = 'low';

    // Generate recommendations
    const recommendedActions: string[] = [];
    if (daysSinceActivity > 30) {
      recommendedActions.push('Send personalized re-engagement campaign');
    }
    if (recentCount < olderCount) {
      recommendedActions.push('Identify and address declining engagement topics');
    }
    if (supportTickets > 0) {
      recommendedActions.push('Review and resolve outstanding support issues');
    }
    if (uniqueCompanies.size === 1) {
      recommendedActions.push('Introduce customer to complementary RTNM services');
    }

    // Predict churn date
    let predictedChurnDate: Date | undefined;
    if (riskScore >= 0.5) {
      predictedChurnDate = new Date();
      predictedChurnDate.setDate(
        predictedChurnDate.getDate() + Math.round((1 - riskScore) * 180)
      );
    }

    return {
      riskScore,
      riskLevel,
      factors,
      daysSinceLastActivity: Math.round(daysSinceActivity),
      predictedChurnDate,
      recommendedActions
    };
  }

  /**
   * Calculate journey velocity (speed through journey)
   */
  async getJourneyVelocity(customerId: string): Promise<VelocityMetrics> {
    const journey = await UnifiedJourney.findOne({ customerId });
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: 1 })
      .lean();

    if (!journey) {
      return {
        currentPhase: 'unknown',
        daysInCurrentPhase: 0,
        averageDaysPerPhase: 0,
        phaseProgress: 0,
        velocityScore: 0,
        phaseHistory: []
      };
    }

    // Phase history (simplified - in production would track phase transitions)
    const phaseHistory: { phase: string; duration: number; completed: boolean }[] = [];

    // Calculate current phase duration
    const daysInCurrentPhase = Math.ceil(
      (Date.now() - journey.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate average days per phase based on journey duration
    const totalDays = (Date.now() - journey.journeyStartDate.getTime()) / (1000 * 60 * 60 * 24);
    const phasesCompleted = this.getPhaseProgress(journey.currentPhase);
    const averageDaysPerPhase = phasesCompleted > 0 ? totalDays / phasesCompleted : totalDays;

    // Calculate velocity score
    let velocityScore = 50; // Base score

    // Adjust based on journey progression vs time
    const expectedProgress = Math.min(1, totalDays / 365); // Expected 1 year for full journey
    if (phasesCompleted > expectedProgress * 6) {
      velocityScore += 20; // Ahead of schedule
    } else if (phasesCompleted < expectedProgress * 6) {
      velocityScore -= 15; // Behind schedule
    }

    // Adjust based on recent activity
    if (daysInCurrentPhase < 7) {
      velocityScore += 15;
    } else if (daysInCurrentPhase > 30) {
      velocityScore -= 20;
    }

    velocityScore = Math.min(100, Math.max(0, velocityScore));

    // Calculate phase progress (0-1 within current phase)
    const phaseProgress = this.calculatePhaseProgress(journey.currentPhase, events);

    return {
      currentPhase: journey.currentPhase,
      daysInCurrentPhase,
      averageDaysPerPhase: Math.round(averageDaysPerPhase * 10) / 10,
      phaseProgress,
      velocityScore,
      phaseHistory
    };
  }

  /**
   * Get phase progress value
   */
  private getPhaseProgress(currentPhase: string): number {
    const phaseOrder = [
      'awareness',
      'consideration',
      'decision',
      'purchase',
      'retention',
      'advocacy'
    ];
    const index = phaseOrder.indexOf(currentPhase.toLowerCase());
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * Calculate progress within current phase
   */
  private calculatePhaseProgress(
    phase: string,
    events: IJourneyEvent[]
  ): number {
    // Simplified implementation
    const phaseEvents = events.slice(0, 10);
    const purchaseIndicator = phaseEvents.some(
      e => e.eventType === EventType.PURCHASE || e.eventType === EventType.PAYMENT
    );
    const retentionIndicator = phaseEvents.some(
      e => e.eventType === EventType.SUBSCRIPTION || e.eventType === EventType.LOGIN
    );

    switch (phase.toLowerCase()) {
      case 'awareness':
        return 0.5;
      case 'consideration':
        return 0.6;
      case 'decision':
        return purchaseIndicator ? 0.8 : 0.4;
      case 'purchase':
        return 0.9;
      case 'retention':
        return retentionIndicator ? 0.7 : 0.3;
      case 'advocacy':
        return 0.5;
      default:
        return 0;
    }
  }

  /**
   * Get preferred communication channels
   */
  async getPreferredChannels(customerId: string): Promise<ChannelPreference[]> {
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .lean();

    const channelCounts: Record<string, number> = {};
    const channelRevenue: Record<string, number> = {};

    for (const event of events) {
      const channel = event.channel;
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;

      if (
        event.eventType === EventType.PURCHASE ||
        event.eventType === EventType.PAYMENT
      ) {
        const amount = (event.properties as Record<string, number>)?.totalAmount || 0;
        channelRevenue[channel] = (channelRevenue[channel] || 0) + amount;
      }
    }

    const totalEvents = events.length;
    const totalRevenue = Object.values(channelRevenue).reduce((a, b) => a + b, 0);

    const preferences: ChannelPreference[] = Object.entries(channelCounts)
      .map(([channel, count]) => ({
        channel: channel as ChannelType,
        frequency: count,
        percentage: Math.round((count / totalEvents) * 100),
        revenueContribution:
          totalRevenue > 0 ? (channelRevenue[channel] || 0) / totalRevenue : 0
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return preferences;
  }

  /**
   * Compare two customer journeys for similarity
   */
  async getJourneySimilarity(
    customerId1: string,
    customerId2: string
  ): Promise<JourneyComparison> {
    const [journey1, journey2] = await Promise.all([
      UnifiedJourney.findOne({ customerId: customerId1 }),
      UnifiedJourney.findOne({ customerId: customerId2 })
    ]);

    const [events1, events2] = await Promise.all([
      JourneyEvent.find({ customerId: customerId1 }).lean(),
      JourneyEvent.find({ customerId: customerId2 }).lean()
    ]);

    // Common companies
    const companies1 = new Set(journey1?.companies.map(c => c.companyId) || []);
    const companies2 = new Set(journey2?.companies.map(c => c.companyId) || []);
    const commonCompanies = [...companies1].filter(c => companies2.has(c));

    // Common patterns (based on companies)
    const commonPatterns: string[] = [];
    if (commonCompanies.length >= 2) {
      commonPatterns.push('multi_company_engagement');
    }
    if (
      journey1 &&
      journey2 &&
      Math.abs(journey1.totalRevenue - journey2.totalRevenue) /
        Math.max(1, journey1.totalRevenue) <
        0.3
    ) {
      commonPatterns.push('similar_revenue');
    }

    // Time offset (difference in journey start)
    const timeOffset =
      journey1 && journey2
        ? Math.abs(
            journey1.journeyStartDate.getTime() - journey2.journeyStartDate.getTime()
          ) /
          (1000 * 60 * 60 * 24)
        : 0;

    // Calculate similarity score
    let similarity = 0;
    if (journey1 && journey2) {
      // Phase similarity
      if (journey1.currentPhase === journey2.currentPhase) similarity += 0.2;

      // Company overlap
      const totalCompanies = new Set([
        ...companies1,
        ...companies2
      ]).size;
      if (totalCompanies > 0) {
        similarity += (commonCompanies.length / totalCompanies) * 0.3;
      }

      // Event type similarity
      const types1 = new Set(events1.map(e => e.eventType));
      const types2 = new Set(events2.map(e => e.eventType));
      const commonTypes = [...types1].filter(t => types2.has(t)).length;
      const totalTypes = new Set([...types1, ...types2]).size;
      if (totalTypes > 0) {
        similarity += (commonTypes / totalTypes) * 0.25;
      }

      // Engagement score similarity
      const engagementDiff =
        Math.abs(journey1.engagementScore - journey2.engagementScore) / 100;
      similarity += (1 - engagementDiff) * 0.25;
    }

    // Revenue difference
    const revenueDifference =
      journey1 && journey2
        ? Math.abs(journey1.totalRevenue - journey2.totalRevenue)
        : 0;

    // Engagement difference
    const engagementDifference =
      journey1 && journey2
        ? Math.abs(journey1.engagementScore - journey2.engagementScore)
        : 0;

    return {
      similarity: Math.round(similarity * 100),
      commonPhases: journey1 && journey2 ? [journey1.currentPhase] : [],
      commonCompanies,
      commonPatterns,
      timeOffset: Math.round(timeOffset),
      revenueDifference,
      engagementDifference
    };
  }

  /**
   * Get comprehensive analytics summary
   */
  async getAnalyticsSummary(
    customerId: string
  ): Promise<{
    engagement: EngagementMetrics;
    ltv: LTVMetrics;
    churnRisk: ChurnRiskMetrics;
    velocity: VelocityMetrics;
    channels: ChannelPreference[];
  }> {
    const [engagement, ltv, churnRisk, velocity, channels] = await Promise.all([
      this.getEngagementMetrics(customerId),
      this.getLTV(customerId),
      this.getChurnRiskMetrics(customerId),
      this.getJourneyVelocity(customerId),
      this.getPreferredChannels(customerId)
    ]);

    return {
      engagement,
      ltv,
      churnRisk,
      velocity,
      channels
    };
  }
}

export const journeyAnalytics = new JourneyAnalyticsService();
