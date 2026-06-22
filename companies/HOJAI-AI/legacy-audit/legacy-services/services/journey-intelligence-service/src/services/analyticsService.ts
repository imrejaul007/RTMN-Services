/**
 * Analytics Service
 * Advanced analytics including churn prediction, LTV calculation, and recommendations
 */

import axios from 'axios';
import { JourneyEvent, CustomerProfile, BusinessDomain, JourneyEventType, IJourneyEvent, ICustomerProfile } from '../models';
import logger from '../utils/logger';

export interface ChurnPrediction {
  customerId: string;
  churnScore: number;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: {
    factor: string;
    impact: number;
    description: string;
  }[];
  recommendedActions: string[];
  predictedChurnDate: Date | null;
  confidence: number;
}

export interface LTVCalculation {
  customerId: string;
  historicalLTV: number;
  predictedLTV: number;
  ltvConfidence: number;
  customerValueTier: 'standard' | 'silver' | 'gold' | 'platinum' | 'diamond';
  monthlyValue: number;
  projectedValue6Months: number;
  projectedValue12Months: number;
  growthRate: number;
  monetizationChannels: {
    channel: string;
    revenue: number;
    percentage: number;
  }[];
  ltvFactors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    value: number;
  }[];
}

export interface CrossBusinessInsight {
  customerId: string;
  activeDomains: string[];
  crossBusinessScore: number;
  opportunities: {
    domain: string;
    opportunity: string;
    potential: 'low' | 'medium' | 'high';
    reason: string;
  }[];
  synergies: {
    domains: string[];
    synergy: string;
    strength: number;
  }[];
  recommendations: {
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: string;
  }[];
  sharedPatterns: {
    pattern: string;
    description: string;
    confidence: number;
  }[];
}

export interface NextActionRecommendation {
  customerId: string;
  recommendedActions: {
    action: string;
    type: 'conversion' | 'retention' | 'engagement' | 'reactivation';
    priority: number;
    reason: string;
    expectedOutcome: string;
    channel: string;
    urgency: 'low' | 'medium' | 'high';
  }[];
  personalizationContext: {
    preferredChannels: string[];
    bestTimeToReach: string;
    messagingTheme: string;
    incentives: string[];
  };
  journeyStage: string;
  nextBestAction: string;
}

class AnalyticsService {
  private readonly logger = logger.withService('analytics-service');
  private readonly memoryServiceUrl: string;
  private readonly analyticsServiceUrl: string;

  constructor() {
    this.memoryServiceUrl = process.env.MEMORY_SERVICE_URL || 'http://localhost:4591';
    this.analyticsServiceUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4592';
  }

  /**
   * Predict customer churn probability
   */
  async predictChurn(customerId: string): Promise<ChurnPrediction> {
    this.logger.info('Predicting churn', { customerId });

    try {
      // Fetch customer data
      const [events, profile] = await Promise.all([
        JourneyEvent.find({ customerId }).sort({ timestamp: -1 }).lean(),
        CustomerProfile.findOne({ customerId }),
      ]);

      if (events.length === 0) {
        return this.getMockChurnPrediction(customerId, 'no_data');
      }

      const now = new Date();
      const lastEvent = events[0];
      const daysSinceLastEvent = Math.max(0, (now.getTime() - lastEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate risk factors
      const riskFactors: ChurnPrediction['riskFactors'] = [];

      // Recency risk
      if (daysSinceLastEvent > 7) {
        riskFactors.push({
          factor: 'recency',
          impact: Math.min(30, daysSinceLastEvent * 2),
          description: `${Math.round(daysSinceLastEvent)} days since last activity`,
        });
      }

      // Engagement decline
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const recentEvents = events.filter((e) => e.timestamp >= thirtyDaysAgo);
      const earlierEvents = events.filter((e) => e.timestamp >= sixtyDaysAgo && e.timestamp < thirtyDaysAgo);

      if (recentEvents.length < earlierEvents.length * 0.3 && earlierEvents.length > 3) {
        riskFactors.push({
          factor: 'engagement_decline',
          impact: 25,
          description: 'Significant decline in engagement over past 30 days',
        });
      }

      // Cart abandonment
      const cartAbandons = events.filter((e) => e.eventType === JourneyEventType.CART_ABANDON).length;
      const conversions = events.filter((e) =>
        [JourneyEventType.PURCHASE, JourneyEventType.BOOKING, JourneyEventType.SUBSCRIPTION].includes(e.eventType as JourneyEventType)
      ).length;

      if (cartAbandons > conversions && cartAbandons > 2) {
        riskFactors.push({
          factor: 'cart_abandonment',
          impact: 15,
          description: 'Multiple abandoned carts without recovery',
        });
      }

      // Check for negative signals
      const cancellations = events.filter((e) => e.eventType === JourneyEventType.BOOKING_CANCEL).length;
      if (cancellations > 0) {
        riskFactors.push({
          factor: 'cancellation',
          impact: 20,
          description: `${cancellations} booking cancellation(s) detected`,
        });
      }

      // Low engagement score
      if (profile && profile.engagementLevel === 'low') {
        riskFactors.push({
          factor: 'low_engagement',
          impact: 20,
          description: 'Consistently low engagement across sessions',
        });
      }

      // Calculate churn score
      const baseScore = Math.min(100, riskFactors.reduce((sum, f) => sum + f.impact, 0));
      const churnScore = Math.min(100, baseScore + daysSinceLastEvent * 1.5);

      // Determine risk level
      let riskLevel: ChurnPrediction['riskLevel'] = 'low';
      if (churnScore >= 80) riskLevel = 'critical';
      else if (churnScore >= 60) riskLevel = 'high';
      else if (churnScore >= 40) riskLevel = 'medium';

      // Generate recommendations
      const recommendedActions = this.generateChurnPreventionActions(riskFactors, profile);

      // Predict churn date (if critical)
      let predictedChurnDate: Date | null = null;
      if (riskLevel === 'critical' || riskLevel === 'high') {
        const daysToChurn = Math.max(7, 30 - churnScore * 0.3);
        predictedChurnDate = new Date();
        predictedChurnDate.setDate(predictedChurnDate.getDate() + daysToChurn);
      }

      return {
        customerId,
        churnScore: Math.round(churnScore * 100) / 100,
        churnProbability: Math.round((churnScore / 100) * 100) / 100,
        riskLevel,
        riskFactors,
        recommendedActions,
        predictedChurnDate,
        confidence: events.length > 20 ? 0.85 : events.length > 10 ? 0.7 : 0.5,
      };
    } catch (error) {
      this.logger.error('Error predicting churn', { customerId, error });
      return this.getMockChurnPrediction(customerId, 'error');
    }
  }

  /**
   * Calculate customer lifetime value
   */
  async calculateLTV(customerId: string): Promise<LTVCalculation> {
    this.logger.info('Calculating LTV', { customerId });

    try {
      const [events, profile] = await Promise.all([
        JourneyEvent.find({ customerId }).sort({ timestamp: 1 }).lean(),
        CustomerProfile.findOne({ customerId }),
      ]);

      if (events.length === 0) {
        return this.getMockLTVCalculation(customerId);
      }

      // Calculate historical LTV
      const transactions = events.filter((e) =>
        [JourneyEventType.PURCHASE, JourneyEventType.BOOKING, JourneyEventType.LOAN_APPROVED, JourneyEventType.SUBSCRIPTION].includes(
          e.eventType as JourneyEventType
        )
      );

      let historicalLTV = 0;
      const monetizationByChannel: Record<string, number> = {};

      transactions.forEach((t) => {
        const amount = (t.metadata as Record<string, unknown>)?.amount as number || 0;
        historicalLTV += amount;
        const channel = t.channel || 'direct';
        monetizationByChannel[channel] = (monetizationByChannel[channel] || 0) + amount;
      });

      // Calculate metrics
      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      const monthsActive = Math.max(1, (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const monthlyValue = historicalLTV / monthsActive;

      // Calculate growth rate
      const midPoint = Math.floor(events.length / 2);
      const firstHalfTransactions = events.slice(0, midPoint).filter((e) =>
        [JourneyEventType.PURCHASE, JourneyEventType.BOOKING].includes(e.eventType as JourneyEventType)
      );
      const secondHalfTransactions = events.slice(midPoint).filter((e) =>
        [JourneyEventType.PURCHASE, JourneyEventType.BOOKING].includes(e.eventType as JourneyEventType)
      );

      const firstHalfValue = firstHalfTransactions.reduce(
        (sum, e) => sum + ((e.metadata as Record<string, unknown>)?.amount as number || 0),
        0
      );
      const secondHalfValue = secondHalfTransactions.reduce(
        (sum, e) => sum + ((e.metadata as Record<string, unknown>)?.amount as number || 0),
        0
      );

      const growthRate = firstHalfValue > 0 ? ((secondHalfValue - firstHalfValue) / firstHalfValue) * 100 : 0;

      // Project LTV
      const projectedValue6Months = monthlyValue * 6 * (1 + growthRate / 100);
      const projectedValue12Months = monthlyValue * 12 * Math.pow(1 + growthRate / 100, 2);

      // Determine value tier
      let customerValueTier: LTVCalculation['customerValueTier'] = 'standard';
      if (historicalLTV >= 100000) customerValueTier = 'diamond';
      else if (historicalLTV >= 50000) customerValueTier = 'platinum';
      else if (historicalLTV >= 20000) customerValueTier = 'gold';
      else if (historicalLTV >= 5000) customerValueTier = 'silver';

      // LTV factors
      const ltvFactors: LTVCalculation['ltvFactors'] = [];

      if (transactions.length > 5) {
        ltvFactors.push({ factor: 'high_transaction_frequency', impact: 'positive', value: 20 });
      }
      if (growthRate > 10) {
        ltvFactors.push({ factor: 'positive_growth_trend', impact: 'positive', value: 15 });
      }
      if (profile && profile.activeDomains && profile.activeDomains.length > 2) {
        ltvFactors.push({ factor: 'cross_business_engagement', impact: 'positive', value: 25 });
      }

      // Monetization channels
      const monetizationChannels = Object.entries(monetizationByChannel).map(([channel, revenue]) => ({
        channel,
        revenue,
        percentage: historicalLTV > 0 ? (revenue / historicalLTV) * 100 : 0,
      }));

      // Confidence based on data volume
      const ltvConfidence = events.length > 50 ? 0.9 : events.length > 20 ? 0.75 : 0.6;

      return {
        customerId,
        historicalLTV: Math.round(historicalLTV * 100) / 100,
        predictedLTV: Math.round(projectedValue12Months * 100) / 100,
        ltvConfidence,
        customerValueTier,
        monthlyValue: Math.round(monthlyValue * 100) / 100,
        projectedValue6Months: Math.round(projectedValue6Months * 100) / 100,
        projectedValue12Months: Math.round(projectedValue12Months * 100) / 100,
        growthRate: Math.round(growthRate * 100) / 100,
        monetizationChannels,
        ltvFactors,
      };
    } catch (error) {
      this.logger.error('Error calculating LTV', { customerId, error });
      return this.getMockLTVCalculation(customerId);
    }
  }

  /**
   * Get cross-business insights for a customer
   */
  async getCrossBusinessInsights(customerId: string): Promise<CrossBusinessInsight> {
    this.logger.info('Getting cross-business insights', { customerId });

    try {
      const [events, profile] = await Promise.all([
        JourneyEvent.find({ customerId }).lean(),
        CustomerProfile.findOne({ customerId }),
      ]);

      if (events.length === 0) {
        return this.getMockCrossBusinessInsights(customerId);
      }

      // Analyze domain engagement
      const domainEngagement: Record<string, { events: number; transactions: number; lastActivity: Date }> = {};
      Object.values(BusinessDomain).forEach((domain) => {
        domainEngagement[domain] = { events: 0, transactions: 0, lastActivity: new Date(0) };
      });

      events.forEach((event) => {
        const domain = event.businessDomain;
        if (!domainEngagement[domain]) {
          domainEngagement[domain] = { events: 0, transactions: 0, lastActivity: new Date(0) };
        }
        domainEngagement[domain].events++;
        if ([JourneyEventType.PURCHASE, JourneyEventType.BOOKING].includes(event.eventType as JourneyEventType)) {
          domainEngagement[domain].transactions++;
        }
        if (event.timestamp > domainEngagement[domain].lastActivity) {
          domainEngagement[domain].lastActivity = event.timestamp;
        }
      });

      const activeDomains = Object.entries(domainEngagement)
        .filter(([_, data]) => data.events > 0)
        .map(([domain]) => domain);

      // Calculate cross-business score
      const crossBusinessScore = Math.min(100, activeDomains.length * 25);

      // Find opportunities
      const opportunities: CrossBusinessInsight['opportunities'] = [];
      const engagedDomains = new Set(activeDomains);

      Object.values(BusinessDomain).forEach((domain) => {
        if (!engagedDomains.has(domain)) {
          // Check if there are common patterns suggesting potential
          const potential = this.assessDomainPotential(domain, events as unknown as IJourneyEvent[]);
          if (potential !== 'low') {
            opportunities.push({
              domain,
              opportunity: this.generateOpportunityDescription(domain),
              potential,
              reason: `Customer profile suggests potential interest in ${domain}`,
            });
          }
        }
      });

      // Find synergies between active domains
      const synergies = this.findDomainSynergies(activeDomains);

      // Generate recommendations
      const recommendations = this.generateCrossBusinessRecommendations(activeDomains, opportunities, synergies);

      // Find shared patterns
      const sharedPatterns = this.findSharedPatterns(events as unknown as IJourneyEvent[]);

      return {
        customerId,
        activeDomains,
        crossBusinessScore,
        opportunities,
        synergies,
        recommendations,
        sharedPatterns,
      };
    } catch (error) {
      this.logger.error('Error getting cross-business insights', { customerId, error });
      return this.getMockCrossBusinessInsights(customerId);
    }
  }

  /**
   * Recommend next best actions for a customer
   */
  async recommendNextAction(customerId: string): Promise<NextActionRecommendation> {
    this.logger.info('Generating next action recommendations', { customerId });

    try {
      const [events, profile, churnPrediction, ltv] = await Promise.all([
        JourneyEvent.find({ customerId }).sort({ timestamp: -1 }).lean(),
        CustomerProfile.findOne({ customerId }),
        this.predictChurn(customerId),
        this.calculateLTV(customerId),
      ]);

      if (events.length === 0) {
        return this.getMockNextActionRecommendation(customerId);
      }

      const recommendedActions: NextActionRecommendation['recommendedActions'] = [];

      // Determine journey stage
      const journeyStage = this.determineJourneyStage(events as unknown as IJourneyEvent[]);

      // Generate action based on stage and signals
      if (churnPrediction.riskLevel === 'critical' || churnPrediction.riskLevel === 'high') {
        recommendedActions.push({
          action: 'Re-engagement campaign with exclusive offer',
          type: 'reactivation',
          priority: 1,
          reason: 'Critical churn risk detected',
          expectedOutcome: 'Prevent churn within next 7 days',
          channel: 'email',
          urgency: 'high',
        });
      }

      if (journeyStage === 'engagement') {
        const cartEvents = events.filter((e) => e.eventType === JourneyEventType.ADD_TO_CART);
        if (cartEvents.length > 0) {
          recommendedActions.push({
            action: 'Abandoned cart recovery email',
            type: 'conversion',
            priority: 1,
            reason: 'Customer added items to cart but has not converted',
            expectedOutcome: 'Convert cart abandonment to purchase',
            channel: 'email',
            urgency: 'high',
          });
        }
      }

      if (journeyStage === 'conversion') {
        recommendedActions.push({
          action: 'Post-purchase follow-up and loyalty program invitation',
          type: 'retention',
          priority: 2,
          reason: 'Customer just converted - critical retention moment',
          expectedOutcome: 'Build loyalty and encourage repeat purchase',
          channel: 'whatsapp',
          urgency: 'medium',
        });
      }

      // Cross-sell recommendations
      if (ltv.customerValueTier !== 'diamond' && ltv.customerValueTier !== 'platinum') {
        const activeDomains = new Set(events.map((e) => e.businessDomain));
        const potentialDomains = Object.values(BusinessDomain).filter((d) => !activeDomains.has(d));

        if (potentialDomains.length > 0) {
          recommendedActions.push({
            action: `Introduce ${potentialDomains[0]} services`,
            type: 'engagement',
            priority: 3,
            reason: 'Cross-sell opportunity to increase customer value',
            expectedOutcome: `Expand relationship to ${potentialDomains[0]}`,
            channel: 'in_app',
            urgency: 'low',
          });
        }
      }

      // Loyalty upgrade
      if (ltv.customerValueTier === 'gold' || ltv.customerValueTier === 'silver') {
        recommendedActions.push({
          action: 'Upgrade to premium loyalty tier',
          type: 'retention',
          priority: 2,
          reason: 'Customer is valuable - upgrade to increase retention',
          expectedOutcome: 'Increase retention by 20%',
          channel: 'app_notification',
          urgency: 'medium',
        });
      }

      // Personalization context
      const preferredChannels = this.identifyPreferredChannels(events as unknown as IJourneyEvent[]);
      const bestTimeToReach = this.identifyBestTime(events as unknown as IJourneyEvent[]);
      const messagingTheme = this.determineMessagingTheme(profile, ltv);

      return {
        customerId,
        recommendedActions: recommendedActions.sort((a, b) => a.priority - b.priority),
        personalizationContext: {
          preferredChannels,
          bestTimeToReach,
          messagingTheme,
          incentives: this.identifyIncentives(profile, ltv, churnPrediction),
        },
        journeyStage,
        nextBestAction: recommendedActions.length > 0 ? recommendedActions[0].action : 'Continue engagement',
      };
    } catch (error) {
      this.logger.error('Error generating recommendations', { customerId, error });
      return this.getMockNextActionRecommendation(customerId);
    }
  }

  // ==================== Helper Methods ====================

  private generateChurnPreventionActions(
    riskFactors: ChurnPrediction['riskFactors'],
    profile: ICustomerProfile | null
  ): string[] {
    const actions: string[] = [];

    if (riskFactors.some((f) => f.factor === 'recency')) {
      actions.push('Send re-engagement notification with time-limited offer');
      actions.push('Personalized email highlighting new features/relevance');
    }

    if (riskFactors.some((f) => f.factor === 'engagement_decline')) {
      actions.push('Conduct satisfaction survey to identify pain points');
      actions.push('Offer incentive to return (discount, bonus)');
    }

    if (riskFactors.some((f) => f.factor === 'cart_abandonment')) {
      actions.push('Send abandoned cart reminder with urgency');
      actions.push('Offer free shipping or discount on recovered cart');
    }

    if (riskFactors.some((f) => f.factor === 'cancellation')) {
      actions.push('Offer resolution to address cancellation reason');
      actions.push('Provide retention incentive for future booking');
    }

    if (riskFactors.some((f) => f.factor === 'low_engagement')) {
      actions.push('Re-engage with personalized content recommendations');
      actions.push('Introduce loyalty program benefits');
    }

    if (actions.length === 0) {
      actions.push('Continue regular engagement through newsletters');
      actions.push('Monitor engagement metrics weekly');
    }

    return actions;
  }

  private assessDomainPotential(domain: BusinessDomain, events: IJourneyEvent[]): 'low' | 'medium' | 'high' {
    // Simple heuristic - could be enhanced with ML model
    const totalEvents = events.length;
    if (totalEvents < 5) return 'low';

    // Check for complementary domain indicators
    const searchEvents = events.filter((e) => e.eventType === JourneyEventType.SEARCH);
    const domainKeywords: Record<BusinessDomain, string[]> = {
      [BusinessDomain.COMMERCE]: ['product', 'buy', 'shop', 'price'],
      [BusinessDomain.HEALTHCARE]: ['doctor', 'health', 'medical', 'appointment'],
      [BusinessDomain.MOBILITY]: ['ride', 'taxi', 'delivery', 'transport'],
      [BusinessDomain.FINANCE]: ['loan', 'credit', 'insurance', 'investment'],
      [BusinessDomain.HOSPITALITY]: ['hotel', 'booking', 'travel', 'stay'],
      [BusinessDomain.MEDIA]: ['ad', 'advertise', 'campaign', 'reach'],
      [BusinessDomain.LIFESTYLE]: ['life', 'personal', 'ai', 'assistant'],
      [BusinessDomain.CORPORATE]: ['business', 'hr', 'employee', 'enterprise'],
    };

    const keywords = domainKeywords[domain] || [];
    const matchingSearches = searchEvents.filter((e) => {
      const query = ((e.metadata as Record<string, unknown>)?.query as string)?.toLowerCase() || '';
      return keywords.some((kw) => query.includes(kw));
    });

    if (matchingSearches.length > 2) return 'high';
    if (matchingSearches.length > 0) return 'medium';
    return 'low';
  }

  private generateOpportunityDescription(domain: BusinessDomain): string {
    const descriptions: Record<BusinessDomain, string> = {
      [BusinessDomain.COMMERCE]: 'Expand shopping experience with deals and rewards',
      [BusinessDomain.HEALTHCARE]: 'Access healthcare services and wellness programs',
      [BusinessDomain.MOBILITY]: 'Get rides and delivery services',
      [BusinessDomain.FINANCE]: 'Explore financial products and services',
      [BusinessDomain.HOSPITALITY]: 'Book hotels and travel experiences',
      [BusinessDomain.MEDIA]: 'Advertise and reach targeted audiences',
      [BusinessDomain.LIFESTYLE]: 'Enhance daily life with AI-powered assistance',
      [BusinessDomain.CORPORATE]: 'Streamline business operations',
    };
    return descriptions[domain] || 'Explore new services';
  }

  private findDomainSynergies(activeDomains: string[]): CrossBusinessInsight['synergies'] {
    const synergies: CrossBusinessInsight['synergies'] = [];

    const synergyPairs: Record<string, { domains: string[]; synergy: string; strength: number }> = {
      'commerce-hospitality': {
        domains: [BusinessDomain.COMMERCE, BusinessDomain.HOSPITALITY],
        synergy: 'Travel shopping - customers who book hotels often purchase travel accessories',
        strength: 0.8,
      },
      'commerce-finance': {
        domains: [BusinessDomain.COMMERCE, BusinessDomain.FINANCE],
        synergy: 'BNPL and financing options increase purchase value',
        strength: 0.75,
      },
      'healthcare-lifestyle': {
        domains: [BusinessDomain.HEALTHCARE, BusinessDomain.LIFESTYLE],
        synergy: 'Wellness and health tracking integration',
        strength: 0.7,
      },
      'mobility-commerce': {
        domains: [BusinessDomain.MOBILITY, BusinessDomain.COMMERCE],
        synergy: 'Delivery services complement retail',
        strength: 0.85,
      },
      'corporate-commerce': {
        domains: [BusinessDomain.CORPORATE, BusinessDomain.COMMERCE],
        synergy: 'B2B procurement and corporate benefits',
        strength: 0.7,
      },
    };

    activeDomains.forEach((d1) => {
      activeDomains.forEach((d2) => {
        if (d1 < d2) {
          const key = `${d1}-${d2}`;
          const synergy = synergyPairs[key];
          if (synergy) {
            synergies.push({
              domains: synergy.domains,
              synergy: synergy.synergy,
              strength: synergy.strength,
            });
          }
        }
      });
    });

    return synergies;
  }

  private generateCrossBusinessRecommendations(
    activeDomains: string[],
    opportunities: CrossBusinessInsight['opportunities'],
    synergies: CrossBusinessInsight['synergies']
  ): CrossBusinessInsight['recommendations'] {
    const recommendations: CrossBusinessInsight['recommendations'] = [];

    // Priority recommendations based on synergies
    synergies.forEach((synergy) => {
      if (synergy.strength > 0.7) {
        recommendations.push({
          action: `Create bundled offering across ${synergy.domains.join(' & ')}`,
          priority: 'high',
          expectedImpact: `Leverage ${Math.round(synergy.strength * 100)}% synergy strength`,
        });
      }
    });

    // Cross-sell recommendations
    opportunities.slice(0, 3).forEach((opp) => {
      if (opp.potential === 'high') {
        recommendations.push({
          action: `Introduce customer to ${opp.domain} services`,
          priority: 'medium',
          expectedImpact: 'Expand customer relationship',
        });
      }
    });

    return recommendations;
  }

  private findSharedPatterns(events: IJourneyEvent[]): CrossBusinessInsight['sharedPatterns'] {
    const patterns: CrossBusinessInsight['sharedPatterns'] = [];

    // Check for consistent channel usage
    const channels = events.map((e) => e.channel).filter((c): c is string => Boolean(c));
    const channelCounts: Record<string, number> = {};
    channels.forEach((c) => {
      channelCounts[c] = (channelCounts[c] || 0) + 1;
    });

    const dominantChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0];
    if (dominantChannel && dominantChannel[1] / events.length > 0.6) {
      patterns.push({
        pattern: 'channel_preference',
        description: `Consistently uses ${dominantChannel[0]} channel (${Math.round((dominantChannel[1] / events.length) * 100)}% of interactions)`,
        confidence: dominantChannel[1] / events.length,
      });
    }

    // Check for consistent time patterns
    const hours = events.map((e) => e.timestamp.getHours());
    const morningEvents = hours.filter((h) => h >= 6 && h < 12).length;
    const eveningEvents = hours.filter((h) => h >= 18 && h < 22).length;

    if (morningEvents / events.length > 0.4) {
      patterns.push({
        pattern: 'morning_engagement',
        description: 'Prefers morning hours for engagement',
        confidence: morningEvents / events.length,
      });
    } else if (eveningEvents / events.length > 0.4) {
      patterns.push({
        pattern: 'evening_engagement',
        description: 'Prefers evening hours for engagement',
        confidence: eveningEvents / events.length,
      });
    }

    return patterns;
  }

  private determineJourneyStage(events: IJourneyEvent[]): string {
    if (events.length === 0) return 'unknown';

    const recentEvents = events.slice(0, 10);
    const eventTypes = recentEvents.map((e) => e.eventType);

    if (eventTypes.includes(JourneyEventType.CHURN) || eventTypes.includes(JourneyEventType.INACTIVITY)) {
      return 'churned';
    }

    if (
      eventTypes.includes(JourneyEventType.PURCHASE) ||
      eventTypes.includes(JourneyEventType.BOOKING) ||
      eventTypes.includes(JourneyEventType.SUBSCRIPTION)
    ) {
      return 'conversion';
    }

    if (eventTypes.includes(JourneyEventType.ADD_TO_CART) || eventTypes.includes(JourneyEventType.BOOKING_START)) {
      return 'engagement';
    }

    if (eventTypes.includes(JourneyEventType.VIEW) || eventTypes.includes(JourneyEventType.INTERACTION)) {
      return 'discovery';
    }

    return 'awareness';
  }

  private identifyPreferredChannels(events: IJourneyEvent[]): string[] {
    const channelCounts: Record<string, number> = {};
    events.forEach((e) => {
      if (e.channel) {
        channelCounts[e.channel] = (channelCounts[e.channel] || 0) + 1;
      }
    });

    return Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([channel]) => channel);
  }

  private identifyBestTime(events: IJourneyEvent[]): string {
    const hours = events.map((e) => e.timestamp.getHours());

    const morning = hours.filter((h) => h >= 6 && h < 12).length;
    const afternoon = hours.filter((h) => h >= 12 && h < 18).length;
    const evening = hours.filter((h) => h >= 18 && h < 22).length;

    if (morning >= afternoon && morning >= evening) return 'morning';
    if (evening >= afternoon) return 'evening';
    return 'afternoon';
  }

  private determineMessagingTheme(profile: ICustomerProfile | null, ltv: LTVCalculation): string {
    if (ltv.customerValueTier === 'diamond' || ltv.customerValueTier === 'platinum') {
      return 'premium_exclusive';
    }
    if (ltv.customerValueTier === 'gold') {
      return 'loyalty_reward';
    }
    return 'value_awareness';
  }

  private identifyIncentives(
    profile: ICustomerProfile | null,
    ltv: LTVCalculation,
    churn: ChurnPrediction
  ): string[] {
    const incentives: string[] = [];

    if (churn.riskLevel === 'critical' || churn.riskLevel === 'high') {
      incentives.push('20% off next purchase');
      incentives.push('Free delivery');
    }

    if (ltv.customerValueTier === 'silver' || ltv.customerValueTier === 'gold') {
      incentives.push('Loyalty points bonus');
      incentives.push('Early access to sales');
    }

    if (ltv.customerValueTier === 'diamond' || ltv.customerValueTier === 'platinum') {
      incentives.push('VIP customer support');
      incentives.push('Exclusive products');
      incentives.push('Personal shopping assistant');
    }

    if (incentives.length === 0) {
      incentives.push('Welcome discount');
      incentives.push('Referral bonus');
    }

    return incentives;
  }

  // ==================== Mock Data for Fallback ====================

  private getMockChurnPrediction(customerId: string, reason: string): ChurnPrediction {
    return {
      customerId,
      churnScore: reason === 'no_data' ? 50 : 60,
      churnProbability: reason === 'no_data' ? 0.5 : 0.6,
      riskLevel: 'medium',
      riskFactors: [
        {
          factor: 'insufficient_data',
          impact: 30,
          description: 'Limited journey data available for analysis',
        },
      ],
      recommendedActions: [
        'Gather more customer interaction data',
        'Monitor engagement patterns over time',
        'Use generic retention strategies initially',
      ],
      predictedChurnDate: null,
      confidence: 0.4,
    };
  }

  private getMockLTVCalculation(customerId: string): LTVCalculation {
    return {
      customerId,
      historicalLTV: 0,
      predictedLTV: 0,
      ltvConfidence: 0.3,
      customerValueTier: 'standard',
      monthlyValue: 0,
      projectedValue6Months: 0,
      projectedValue12Months: 0,
      growthRate: 0,
      monetizationChannels: [],
      ltvFactors: [
        {
          factor: 'insufficient_data',
          impact: 'neutral',
          value: 0,
        },
      ],
    };
  }

  private getMockCrossBusinessInsights(customerId: string): CrossBusinessInsight {
    return {
      customerId,
      activeDomains: [],
      crossBusinessScore: 0,
      opportunities: [],
      synergies: [],
      recommendations: [
        {
          action: 'Start tracking customer across multiple touchpoints',
          priority: 'medium',
          expectedImpact: 'Enable cross-business insights',
        },
      ],
      sharedPatterns: [],
    };
  }

  private getMockNextActionRecommendation(customerId: string): NextActionRecommendation {
    return {
      customerId,
      recommendedActions: [
        {
          action: 'Build customer engagement across touchpoints',
          type: 'engagement',
          priority: 1,
          reason: 'Insufficient data for targeted recommendations',
          expectedOutcome: 'Generate more customer data for better insights',
          channel: 'multi',
          urgency: 'medium',
        },
      ],
      personalizationContext: {
        preferredChannels: ['email', 'app_notification'],
        bestTimeToReach: 'morning',
        messagingTheme: 'value_awareness',
        incentives: ['Welcome offer', 'First purchase discount'],
      },
      journeyStage: 'awareness',
      nextBestAction: 'Build initial engagement',
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
