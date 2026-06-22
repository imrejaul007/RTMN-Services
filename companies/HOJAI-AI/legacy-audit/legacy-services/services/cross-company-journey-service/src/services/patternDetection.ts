import { v4 as uuidv4 } from 'uuid';
import {
  JourneyEvent,
  CrossCompanyPattern,
  UnifiedJourney,
  EventType,
  ChannelType,
  PatternType,
  IJourneyEvent,
  ICrossCompanyPattern
} from '../models/journey';
import { logger } from '../utils/logger';

export interface PatternResult {
  patternId: string;
  customerId: string;
  patternType: PatternType;
  confidence: number;
  companies: string[];
  channels: ChannelType[];
  description: string;
  detectedAt: Date;
  factors: string[];
}

export interface RelatedEventGroup {
  groupId: string;
  events: IJourneyEvent[];
  relationType: string;
  strength: number;
}

export interface ChurnSignal {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  signals: ChurnSignalDetail[];
  recommendations: string[];
}

export interface ChurnSignalDetail {
  signal: string;
  weight: number;
  detected: boolean;
  description: string;
}

export interface UpsellOpportunity {
  opportunityId: string;
  type: 'cross_sell' | 'upsell' | 'upgrade';
  sourceCompany: string;
  targetCompany: string;
  confidence: number;
  reason: string;
  potentialValue: number;
}

export interface SupportPattern {
  patternId: string;
  type: string;
  frequency: number;
  companies: string[];
  commonIssue: string;
  resolutionRate: number;
  avgResolutionTime: number;
}

export interface NextInteractionPrediction {
  predictedCompany: string;
  predictedChannel: ChannelType;
  predictedEventType: EventType;
  probability: number;
  timeframe: string;
  confidence: number;
  reasoning: string;
}

export class PatternDetectionService {
  private readonly SEASONAL_DAYS = [11, 12, 13, 14, 15]; // Festival season approximation
  private readonly HIGH_VALUE_THRESHOLD = 10000; // INR
  private readonly CHURN_DAYS_THRESHOLD = 30;
  private readonly DORMANT_DAYS_THRESHOLD = 90;

  /**
   * Detect cross-company patterns for a customer
   */
  async detectCrossCompanyPatterns(customerId: string): Promise<PatternResult[]> {
    logger.info(`Detecting cross-company patterns for customer: ${customerId}`);

    const patterns: PatternResult[] = [];

    // Get all events for the customer
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .lean();

    if (events.length === 0) {
      return patterns;
    }

    // Detect various patterns
    const seasonalPattern = await this.detectSeasonalPattern(customerId, events);
    if (seasonalPattern) patterns.push(seasonalPattern);

    const highValuePattern = await this.detectHighValuePattern(customerId, events);
    if (highValuePattern) patterns.push(highValuePattern);

    const browserPattern = await this.detectBrowserPattern(customerId, events);
    if (browserPattern) patterns.push(browserPattern);

    const abandonerPattern = await this.detectAbandonerPattern(customerId, events);
    if (abandonerPattern) patterns.push(abandonerPattern);

    const loyalPattern = await this.detectLoyalPattern(customerId, events);
    if (loyalPattern) patterns.push(loyalPattern);

    const powerUserPattern = await this.detectPowerUserPattern(customerId, events);
    if (powerUserPattern) patterns.push(powerUserPattern);

    const crossCompanyPattern = await this.detectCrossCompanyEngagement(customerId, events);
    if (crossCompanyPattern) patterns.push(crossCompanyPattern);

    // Store detected patterns
    for (const pattern of patterns) {
      await this.storePattern(pattern);
    }

    logger.info(`Detected ${patterns.length} patterns for customer ${customerId}`);

    return patterns;
  }

  /**
   * Detect seasonal purchase patterns
   */
  private async detectSeasonalPattern(
    customerId: string,
    events: IJourneyEvent[]
  ): Promise<PatternResult | null> {
    const purchaseEvents = events.filter(
      e => e.eventType === EventType.PURCHASE || e.eventType === EventType.PAYMENT
    );

    if (purchaseEvents.length < 2) return null;

    // Group purchases by month
    const monthCounts: Record<number, number> = {};
    purchaseEvents.forEach(e => {
      const month = new Date(e.timestamp).getMonth();
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    // Check for seasonal pattern (at least 50% of purchases in same 3-month window)
    const totalPurchases = purchaseEvents.length;
    let maxSeasonal = 0;
    let seasonalMonth = 0;

    for (let i = 0; i < 12; i++) {
      const seasonal =
        (monthCounts[i] || 0) +
        (monthCounts[(i + 1) % 12] || 0) +
        (monthCounts[(i + 2) % 12] || 0);
      if (seasonal > maxSeasonal) {
        maxSeasonal = seasonal;
        seasonalMonth = i;
      }
    }

    if (maxSeasonal / totalPurchases >= 0.5) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        patternId: uuidv4(),
        customerId,
        patternType: PatternType.SEASONAL_PURCHASE,
        confidence: maxSeasonal / totalPurchases,
        companies: [...new Set(purchaseEvents.map(e => e.companyId))],
        channels: [...new Set(events.map(e => e.channel as ChannelType))],
        description: `Shows seasonal purchasing behavior with peak activity around ${monthNames[seasonalMonth]}`,
        detectedAt: new Date(),
        factors: [`${maxSeasonal}/${totalPurchases} purchases in seasonal window`]
      };
    }

    return null;
  }

  /**
   * Detect high-value buyer pattern
   */
  private async detectHighValuePattern(
    customerId: string,
    events: IJourneyEvent[]
  ): Promise<PatternResult | null> {
    const purchaseEvents = events.filter(
      e =>
        (e.eventType === EventType.PURCHASE || e.eventType === EventType.PAYMENT) &&
        (e.properties as Record<string, number>)?.totalAmount >= this.HIGH_VALUE_THRESHOLD
    );

    const highValueRatio = purchaseEvents.length / Math.max(1, events.filter(e =>
      e.eventType === EventType.PURCHASE || e.eventType === EventType.PAYMENT
    ).length);

    if (highValueRatio >= 0.5 && purchaseEvents.length >= 2) {
      const totalValue = purchaseEvents.reduce(
        (sum, e) => sum + ((e.properties as Record<string, number>)?.totalAmount || 0),
        0
      );

      return {
        patternId: uuidv4(),
        customerId,
        patternType: PatternType.HIGH_VALUE_BUYER,
        confidence: Math.min(0.95, highValueRatio + 0.2),
        companies: [...new Set(purchaseEvents.map(e => e.companyId))],
        channels: [...new Set(events.map(e => e.channel as ChannelType))],
        description: `High-value customer with average order value of ₹${Math.round(totalValue / purchaseEvents.length).toLocaleString()}`,
        detectedAt: new Date(),
        factors: [
          `${purchaseEvents.length} high-value purchases`,
          `Total value: ₹${totalValue.toLocaleString()}`
        ]
      };
    }

    return null;
  }

  /**
   * Detect browser pattern (many views, few purchases)
   */
  private async detectBrowserPattern(
    customerId: string,
    events: IJourneyEvent[]
  ): Promise<PatternResult | null> {
    const viewEvents = events.filter(
      e =>
        e.eventType === EventType.PAGE_VIEW ||
        e.eventType === EventType.SEARCH ||
        e.eventType === EventType.CLICK
    ).length;

    const purchaseEvents = events.filter(
      e => e.eventType === EventType.PURCHASE || e.eventType === EventType.PAYMENT
    ).length;

    const browseToBuyRatio = purchaseEvents > 0 ? viewEvents / purchaseEvents : viewEvents;

    // Browser if 10+ views per purchase
    if (browseToBuyRatio >= 10 && viewEvents >= 20) {
      return {
        patternId: uuidv4(),
        customerId,
        patternType: PatternType.BROWSER,
        confidence: Math.min(0.9, browseToBuyRatio / 20),
        companies: [...new Set(events.map(e => e.companyId))],
        channels: [...new Set(events.map(e => e.channel as ChannelType))],
        description: `Browses extensively before purchasing (${browseToBuyRatio.toFixed(0)}:1 browse-to-buy ratio)`,
        detectedAt: new Date(),
        factors: [
          `${viewEvents} view events`,
          `${purchaseEvents} purchase events`,
          `${browseToBuyRatio.toFixed(0)}:1 ratio`
        ]
      };
    }

    return null;
  }

  /**
   * Detect cart abandoner pattern
   */
  private async detectAbandonerPattern(
    customerId: string,
    events: IJourneyEvent[]
  ): Promise<PatternResult | null> {
    const cartAddEvents = events.filter(e => e.eventType === EventType.CART_ADD).length;
    const checkoutEvents = events.filter(e => e.eventType === EventType.CHECKOUT_COMPLETE).length;

    if (cartAddEvents >= 3 && checkoutEvents === 0) {
      return {
        patternId: uuidv4(),
        customerId,
        patternType: PatternType.ABANDONER,
        confidence: Math.min(0.9, 0.5 + cartAddEvents * 0.1),
        companies: [...new Set(events.map(e => e.companyId))],
        channels: [...new Set(events.map(e => e.channel as ChannelType))],
        description: `Adds to cart frequently but rarely completes checkout`,
        detectedAt: new Date(),
        factors: [
          `${cartAddEvents} cart additions`,
          `${checkoutEvents} completed checkouts`
        ]
      };
    }

    return null;
  }

  /**
   * Detect loyal customer pattern
   */
  private async detectLoyalPattern(
    customerId: string,
    events: IJourneyEvent[]
  ): Promise<PatternResult | null> {
    const journey = await UnifiedJourney.findOne({ customerId });
    if (!journey) return null;

    const daysSinceStart =
      (Date.now() - journey.journeyStartDate.getTime()) / (1000 * 60 * 60 * 24);

    const purchaseEvents = events.filter(
      e => e.eventType === EventType.PURCHASE || e.eventType === EventType.PAYMENT
    );

    // Calculate purchase frequency
    const purchaseFrequency = purchaseEvents.length / Math.max(1, daysSinceStart / 30);

    // Loyal if: 2+ purchases and buying monthly or more
    if (purchaseEvents.length >= 2 && purchaseFrequency >= 1) {
      return {
        patternId: uuidv4(),
        customerId,
        patternType: PatternType.LOYAL,
        confidence: Math.min(0.95, 0.5 + purchaseEvents.length * 0.1),
        companies: [...new Set(purchaseEvents.map(e => e.companyId))],
        channels: [...new Set(events.map(e => e.channel as ChannelType))],
        description: `Loyal customer with ${purchaseEvents.length} purchases over ${Math.round(daysSinceStart)} days`,
        detectedAt: new Date(),
        factors: [
          `${purchaseEvents.length} total purchases`,
          `${purchaseFrequency.toFixed(1)} purchases/month`,
          `Customer for ${Math.round(daysSinceStart)} days`
        ]
      };
    }

    return null;
  }

  /**
   * Detect power user pattern
   */
  private async detectPowerUserPattern(
    customerId: string,
    events: IJourneyEvent[]
  ): Promise<PatternResult | null> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEvents = events.filter(
      e => new Date(e.timestamp).getTime() > thirtyDaysAgo.getTime()
    );

    // Power user if: 50+ events in last 30 days
    if (recentEvents.length >= 50) {
      const eventTypes = new Set(recentEvents.map(e => e.eventType));
      const companies = new Set(recentEvents.map(e => e.companyId));

      return {
        patternId: uuidv4(),
        customerId,
        patternType: PatternType.POWER_USER,
        confidence: Math.min(0.95, recentEvents.length / 100),
        companies: [...companies],
        channels: [...new Set(recentEvents.map(e => e.channel as ChannelType))],
        description: `Power user with ${recentEvents.length} interactions in the last 30 days`,
        detectedAt: new Date(),
        factors: [
          `${recentEvents.length} events in last 30 days`,
          `${eventTypes.size} different event types`,
          `${companies.size} companies engaged`
        ]
      };
    }

    return null;
  }

  /**
   * Detect cross-company engagement pattern
   */
  private async detectCrossCompanyEngagement(
    customerId: string,
    events: IJourneyEvent[]
  ): Promise<PatternResult | null> {
    const uniqueCompanies = new Set(events.map(e => e.companyId));

    if (uniqueCompanies.size >= 3) {
      const companyList = [...uniqueCompanies];
      const engagementScores: { company: string; score: number }[] = [];

      for (const companyId of companyList) {
        const companyEvents = events.filter(e => e.companyId === companyId);
        engagementScores.push({
          company: companyId,
          score: companyEvents.length
        });
      }

      return {
        patternId: uuidv4(),
        customerId,
        patternType: PatternType.CROSS_COMPANY_USER,
        confidence: Math.min(0.95, uniqueCompanies.size / 10),
        companies: companyList,
        channels: [...new Set(events.map(e => e.channel as ChannelType))],
        description: `Engages with ${uniqueCompanies.size} RTNM companies`,
        detectedAt: new Date(),
        factors: [
          `${uniqueCompanies.size} companies`,
          `Most engaged: ${engagementScores.sort((a, b) => b.score - a.score)[0]?.company}`,
          `${events.length} total events`
        ]
      };
    }

    return null;
  }

  /**
   * Store detected pattern
   */
  private async storePattern(pattern: PatternResult): Promise<void> {
    // Check if pattern already exists
    const existing = await CrossCompanyPattern.findOne({
      customerId: pattern.customerId,
      patternType: pattern.patternType
    });

    if (existing) {
      // Update existing pattern
      existing.confidence = pattern.confidence;
      existing.companies = pattern.companies;
      existing.channels = pattern.channels;
      existing.lastDetected = new Date();
      existing.occurrences += 1;
      existing.description = pattern.description;
      existing.metadata = { factors: pattern.factors };
      await existing.save();
    } else {
      // Create new pattern
      const newPattern = new CrossCompanyPattern({
        patternId: pattern.patternId,
        customerId: pattern.customerId,
        patternType: pattern.patternType,
        confidence: pattern.confidence,
        companies: pattern.companies,
        channels: pattern.channels,
        firstDetected: new Date(),
        lastDetected: new Date(),
        occurrences: 1,
        description: pattern.description,
        metadata: { factors: pattern.factors }
      });
      await newPattern.save();
    }
  }

  /**
   * Find related events
   */
  async findRelatedEvents(customerId: string): Promise<RelatedEventGroup[]> {
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .lean();

    const groups: RelatedEventGroup[] = [];

    // Group by session
    const sessionGroups = new Map<string, IJourneyEvent[]>();
    for (const event of events) {
      if (event.sessionId) {
        const existing = sessionGroups.get(event.sessionId) || [];
        existing.push(event);
        sessionGroups.set(event.sessionId, existing);
      }
    }

    for (const [sessionId, sessionEvents] of sessionGroups) {
      if (sessionEvents.length >= 2) {
        groups.push({
          groupId: `session_${sessionId}`,
          events: sessionEvents,
          relationType: 'same_session',
          strength: Math.min(1, sessionEvents.length / 10)
        });
      }
    }

    // Group by time window (within 5 minutes)
    const timeWindowGroups = new Map<string, IJourneyEvent[]>();
    for (const event of events) {
      const windowStart = Math.floor(new Date(event.timestamp).getTime() / (5 * 60 * 1000));
      const key = `${event.companyId}_${windowStart}`;
      const existing = timeWindowGroups.get(key) || [];
      existing.push(event);
      timeWindowGroups.set(key, existing);
    }

    for (const [key, windowEvents] of timeWindowGroups) {
      if (windowEvents.length >= 3) {
        groups.push({
          groupId: `timewindow_${key}`,
          events: windowEvents,
          relationType: 'time_proximity',
          strength: Math.min(1, windowEvents.length / 20)
        });
      }
    }

    return groups;
  }

  /**
   * Detect churn signals
   */
  async detectChurnSignals(customerId: string): Promise<ChurnSignal> {
    const journey = await UnifiedJourney.findOne({ customerId });
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .lean();

    const signals: ChurnSignalDetail[] = [];
    let totalWeight = 0;
    let detectedWeight = 0;

    // Signal 1: Days since last activity
    const daysSinceActivity = journey
      ? (Date.now() - journey.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    totalWeight += 0.25;
    if (daysSinceActivity > this.CHURN_DAYS_THRESHOLD) {
      detectedWeight += 0.25;
      signals.push({
        signal: 'recency',
        weight: 0.25,
        detected: true,
        description: `No activity for ${Math.round(daysSinceActivity)} days`
      });
    } else {
      signals.push({
        signal: 'recency',
        weight: 0.25,
        detected: false,
        description: `Last activity ${Math.round(daysSinceActivity)} days ago`
      });
    }

    // Signal 2: Declining engagement
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentEvents = events.filter(
      e => new Date(e.timestamp).getTime() > thirtyDaysAgo.getTime()
    ).length;
    const olderEvents = events.filter(
      e =>
        new Date(e.timestamp).getTime() > sixtyDaysAgo.getTime() &&
        new Date(e.timestamp).getTime() <= thirtyDaysAgo.getTime()
    ).length;

    totalWeight += 0.25;
    if (recentEvents < olderEvents * 0.5 && olderEvents > 0) {
      detectedWeight += 0.25;
      signals.push({
        signal: 'declining_engagement',
        weight: 0.25,
        detected: true,
        description: `Engagement dropped by ${Math.round((1 - recentEvents / Math.max(1, olderEvents)) * 100)}%`
      });
    } else {
      signals.push({
        signal: 'declining_engagement',
        weight: 0.25,
        detected: false,
        description: 'Engagement is stable or increasing'
      });
    }

    // Signal 3: Support issues
    totalWeight += 0.2;
    const supportTickets = events.filter(e => e.eventType === EventType.SUPPORT_TICKET).length;
    if (supportTickets >= 3) {
      detectedWeight += 0.2;
      signals.push({
        signal: 'multiple_support_tickets',
        weight: 0.2,
        detected: true,
        description: `${supportTickets} support tickets filed`
      });
    } else {
      signals.push({
        signal: 'multiple_support_tickets',
        weight: 0.2,
        detected: false,
        description: `${supportTickets} support tickets (within acceptable range)`
      });
    }

    // Signal 4: Negative feedback
    totalWeight += 0.15;
    const negativeEvents = events.filter(
      e => e.eventType === EventType.FEEDBACK && (e.properties as Record<string, number>)?.rating <= 2
    ).length;
    if (negativeEvents > 0) {
      detectedWeight += 0.15;
      signals.push({
        signal: 'negative_feedback',
        weight: 0.15,
        detected: true,
        description: `${negativeEvents} negative feedback events`
      });
    } else {
      signals.push({
        signal: 'negative_feedback',
        weight: 0.15,
        detected: false,
        description: 'No negative feedback detected'
      });
    }

    // Signal 5: Single company engagement
    totalWeight += 0.15;
    const uniqueCompanies = new Set(events.map(e => e.companyId));
    if (uniqueCompanies.size === 1 && events.length > 5) {
      detectedWeight += 0.15;
      signals.push({
        signal: 'single_company',
        weight: 0.15,
        detected: true,
        description: 'Only engaged with one company'
      });
    } else {
      signals.push({
        signal: 'single_company',
        weight: 0.15,
        detected: false,
        description: `Engaged with ${uniqueCompanies.size} companies`
      });
    }

    const score = totalWeight > 0 ? detectedWeight / totalWeight : 0;

    const recommendations: string[] = [];
    if (score >= 0.6) {
      recommendations.push('Send re-engagement campaign with personalized offers');
      recommendations.push('Reach out via preferred communication channel');
    }
    if (signals.find(s => s.signal === 'declining_engagement')?.detected) {
      recommendations.push('Identify content topics that previously engaged this customer');
    }
    if (signals.find(s => s.signal === 'multiple_support_tickets')?.detected) {
      recommendations.push('Review and resolve pending support issues');
    }

    let riskLevel: ChurnSignal['riskLevel'];
    if (score >= 0.7) riskLevel = 'critical';
    else if (score >= 0.5) riskLevel = 'high';
    else if (score >= 0.3) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      riskLevel,
      score,
      signals,
      recommendations
    };
  }

  /**
   * Detect upsell/cross-sell opportunities
   */
  async detectUpsellOpportunities(customerId: string): Promise<UpsellOpportunity[]> {
    const opportunities: UpsellOpportunity[] = [];
    const journey = await UnifiedJourney.findOne({ customerId });
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .lean();

    if (!journey) return opportunities;

    // Get companies the customer is already engaged with
    const engagedCompanies = new Set(journey.companies.map(c => c.companyId));

    // Find patterns suggesting cross-sell opportunities
    // Example: High-value buyer in one company → suggest premium in another
    for (const company of journey.companies) {
      if (company.engagementScore >= 70 && company.revenue >= this.HIGH_VALUE_THRESHOLD) {
        // This customer is high-value in this company
        // Check other companies they might benefit from
        const otherCompanies = ['stayown', 'ridza', 'commerce', 'neXha'];
        for (const targetCompany of otherCompanies) {
          if (!engagedCompanies.has(targetCompany)) {
            opportunities.push({
              opportunityId: uuidv4(),
              type: 'cross_sell',
              sourceCompany: company.companyId,
              targetCompany,
              confidence: 0.7,
              reason: `High-value customer in ${company.companyName} showing strong engagement`,
              potentialValue: company.averageOrderValue * 0.5
            });
          }
        }
      }
    }

    // Check for upgrade opportunities within same company
    const purchaseEvents = events.filter(
      e => e.eventType === EventType.PURCHASE || e.eventType === EventType.PAYMENT
    );
    if (purchaseEvents.length >= 3) {
      const avgValue =
        purchaseEvents.reduce(
          (sum, e) => sum + ((e.properties as Record<string, number>)?.totalAmount || 0),
          0
        ) / purchaseEvents.length;

      if (avgValue > 5000) {
        const topCompany = journey.companies.sort((a, b) => b.revenue - a.revenue)[0];
        if (topCompany) {
          opportunities.push({
            opportunityId: uuidv4(),
            type: 'upgrade',
            sourceCompany: topCompany.companyId,
            targetCompany: topCompany.companyId,
            confidence: 0.8,
            reason: 'Consistent high-value purchaser - prime for premium tier upgrade',
            potentialValue: avgValue * 0.3
          });
        }
      }
    }

    return opportunities.slice(0, 5); // Return top 5 opportunities
  }

  /**
   * Detect support patterns
   */
  async detectSupportPatterns(customerId: string): Promise<SupportPattern[]> {
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .lean();

    const supportEvents = events.filter(e => e.eventType === EventType.SUPPORT_TICKET);

    if (supportEvents.length === 0) return [];

    const patterns: SupportPattern[] = [];

    // Group by company
    const companyGroups = new Map<string, IJourneyEvent[]>();
    for (const event of supportEvents) {
      const existing = companyGroups.get(event.companyId) || [];
      existing.push(event);
      companyGroups.set(event.companyId, existing);
    }

    for (const [companyId, companySupportEvents] of companyGroups) {
      if (companySupportEvents.length >= 2) {
        // Group by issue type if available
        const issueTypes = new Set(
          companySupportEvents.map(
            e => (e.properties as Record<string, string>)?.ticketPriority || 'unknown'
          )
        );

        patterns.push({
          patternId: uuidv4(),
          type: 'recurring_support',
          frequency: companySupportEvents.length,
          companies: [companyId],
          commonIssue: Array.from(issueTypes).join(', '),
          resolutionRate: 0.85, // Simplified - would need actual resolution tracking
          avgResolutionTime: 24 // hours - simplified
        });
      }
    }

    return patterns;
  }

  /**
   * Predict next interaction
   */
  async predictNextInteraction(customerId: string): Promise<NextInteractionPrediction | null> {
    const journey = await UnifiedJourney.findOne({ customerId });
    const events = await JourneyEvent.find({ customerId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    if (events.length === 0) return null;

    // Analyze recent behavior
    const recentEvents = events.slice(0, 20);

    // Most likely next company
    const companyCounts: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};
    const eventTypeCounts: Record<string, number> = {};

    for (const event of recentEvents) {
      companyCounts[event.companyId] = (companyCounts[event.companyId] || 0) + 1;
      channelCounts[event.channel] = (channelCounts[event.channel] || 0) + 1;
      eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] || 0) + 1;
    }

    const topCompany =
      Object.entries(companyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    const topChannel =
      Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'web';
    const topEventType =
      Object.entries(eventTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || EventType.PAGE_VIEW;

    // Calculate probability based on consistency
    const totalEvents = recentEvents.length;
    const topCompanyCount = companyCounts[topCompany] || 0;
    const topChannelCount = channelCounts[topChannel] || 0;

    const probability = (topCompanyCount / totalEvents + topChannelCount / totalEvents) / 2;
    const confidence = Math.min(0.9, probability + 0.2);

    // Predict timeframe
    const lastEvent = events[0];
    const hoursSinceLastEvent =
      (Date.now() - new Date(lastEvent.timestamp).getTime()) / (1000 * 60 * 60);
    let timeframe: string;
    if (hoursSinceLastEvent < 1) timeframe = 'within 1 hour';
    else if (hoursSinceLastEvent < 24) timeframe = 'within 24 hours';
    else timeframe = 'within 7 days';

    return {
      predictedCompany: topCompany,
      predictedChannel: topChannel as ChannelType,
      predictedEventType: topEventType as EventType,
      probability,
      timeframe,
      confidence,
      reasoning: `Based on ${totalEvents} recent events, most interactions are with ${topCompany} via ${topChannel}`
    };
  }

  /**
   * Get all patterns for a customer
   */
  async getPatterns(customerId: string): Promise<ICrossCompanyPattern[]> {
    const patterns = await CrossCompanyPattern.find({ customerId })
      .sort({ lastDetected: -1 })
      .lean();

    return patterns as unknown as ICrossCompanyPattern[];
  }

  /**
   * Delete patterns for a customer
   */
  async deletePatterns(customerId: string): Promise<number> {
    const result = await CrossCompanyPattern.deleteMany({ customerId });
    return result.deletedCount;
  }
}

export const patternDetection = new PatternDetectionService();
