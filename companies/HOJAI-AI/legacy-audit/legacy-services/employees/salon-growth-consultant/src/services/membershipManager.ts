import {
  ClientMetrics,
  Membership,
  MembershipTier,
  MembershipMetrics,
  MembershipConsultRequest,
  MembershipConsultResponse,
} from '../types';

/**
 * Membership Manager Service
 * Designs and optimizes salon membership programs
 */
export class MembershipManagerService {
  private readonly DEFAULT_TIERS: MembershipTier[] = [
    {
      name: 'Basic',
      pointsRequired: 0,
      monthlyFee: 0,
      benefits: ['Earn 1 point per ₹10', 'Birthday reward', 'Email updates'],
      discount: 0,
      multiplier: 1,
      color: '#9CA3AF',
      perks: [
        { category: 'points', item: 'Earn Rate', value: 1, frequency: 'monthly' },
      ],
    },
    {
      name: 'Silver',
      pointsRequired: 500,
      monthlyFee: 199,
      benefits: [
        'Earn 1.5 points per ₹10',
        '5% discount on all services',
        'Priority booking',
        'Free hair wash with cut',
      ],
      discount: 5,
      multiplier: 1.5,
      color: '#C0C0C0',
      perks: [
        { category: 'discount', item: 'Service Discount', value: 5, frequency: 'monthly' },
        { category: 'priority', item: 'Priority Booking', value: 1, frequency: 'monthly' },
        { category: 'free_service', item: 'Hair Wash', value: 150, frequency: 'monthly' },
      ],
    },
    {
      name: 'Gold',
      pointsRequired: 2000,
      monthlyFee: 499,
      benefits: [
        'Earn 2 points per ₹10',
        '10% discount on all services',
        'Priority booking',
        'Free hair treatment quarterly',
        'Exclusive member events',
      ],
      discount: 10,
      multiplier: 2,
      color: '#FFD700',
      perks: [
        { category: 'discount', item: 'Service Discount', value: 10, frequency: 'monthly' },
        { category: 'priority', item: 'Priority Booking', value: 1, frequency: 'monthly' },
        { category: 'free_service', item: 'Hair Treatment', value: 500, frequency: 'quarterly' },
        { category: 'exclusive', item: 'Member Events', value: 1, frequency: 'quarterly' },
      ],
    },
    {
      name: 'Platinum',
      pointsRequired: 5000,
      monthlyFee: 999,
      benefits: [
        'Earn 3 points per ₹10',
        '15% discount on all services',
        'VIP priority booking',
        'Free premium treatment monthly',
        'Personal stylist consultation',
        'Complimentary beverages',
      ],
      discount: 15,
      multiplier: 3,
      color: '#E5E4E2',
      perks: [
        { category: 'discount', item: 'Service Discount', value: 15, frequency: 'monthly' },
        { category: 'priority', item: 'VIP Priority', value: 1, frequency: 'monthly' },
        { category: 'free_service', item: 'Premium Treatment', value: 1000, frequency: 'monthly' },
        { category: 'exclusive', item: 'Personal Stylist', value: 1, frequency: 'quarterly' },
        { category: 'exclusive', item: 'Complimentary Beverages', value: 1, frequency: 'monthly' },
      ],
    },
  ];

  /**
   * Design membership program
   */
  async designProgram(request: MembershipConsultRequest): Promise<MembershipConsultResponse> {
    const { avgServiceValue, clientMetrics, currentMembership, goals } = request;

    // Generate membership program
    const program = this.generateMembershipProgram(avgServiceValue, goals);

    // Calculate metrics
    const metrics = this.calculateMetrics(clientMetrics, program, avgServiceValue);

    // Generate recommendations
    const recommendations = this.generateRecommendations(clientMetrics, metrics, goals);

    // Tier strategy
    const tierStrategy = this.generateTierStrategy();

    // Generate campaigns
    const campaigns = this.generateCampaigns(clientMetrics, goals);

    // Project impact
    const projectedImpact = this.projectImpact(clientMetrics, metrics);

    return {
      program,
      metrics,
      recommendations,
      tierStrategy,
      campaigns,
      projectedImpact,
    };
  }

  /**
   * Generate membership program structure
   */
  private generateMembershipProgram(
    avgServiceValue: number,
    goals: string
  ): Membership {
    const tiers = [...this.DEFAULT_TIERS];

    // Adjust tiers based on goals
    if (goals === 'acquire') {
      // Add free trial tier
      tiers.unshift({
        name: 'Free',
        pointsRequired: 0,
        monthlyFee: 0,
        benefits: ['Earn 1 point per ₹20', 'Birthday reward', 'View appointments'],
        discount: 0,
        multiplier: 0.5,
        color: '#6B7280',
        perks: [
          { category: 'points', item: 'Earn Rate', value: 0.5, frequency: 'monthly' },
        ],
      });
    }

    return {
      id: `membership_${Date.now()}`,
      name: 'Glow Rewards',
      tiers,
      pointsPerRupee: 0.1, // 1 point per ₹10
      pointsValue: 0.01, // 100 points = ₹1
      birthdayBonus: 500,
      referralBonus: 200,
      expiry: 'never',
    };
  }

  /**
   * Calculate membership metrics
   */
  private calculateMetrics(
    clientMetrics: ClientMetrics,
    program: Membership,
    avgServiceValue: number
  ): MembershipMetrics {
    // Estimate membership uptake (typically 10-30% of active clients)
    const estimatedUptake = 0.2; // 20% uptake
    const estimatedActiveMembers = Math.round(clientMetrics.totalClients * estimatedUptake);

    // Estimate tier distribution
    const tierDistribution = [
      { tier: 'Basic', count: Math.round(estimatedActiveMembers * 0.4), percent: 40, revenue: 0 },
      { tier: 'Silver', count: Math.round(estimatedActiveMembers * 0.3), percent: 30, revenue: 199 },
      { tier: 'Gold', count: Math.round(estimatedActiveMembers * 0.2), percent: 20, revenue: 499 },
      { tier: 'Platinum', count: Math.round(estimatedActiveMembers * 0.1), percent: 10, revenue: 999 },
    ];

    // Calculate revenue from subscriptions
    const monthlyRecurringRevenue = tierDistribution.reduce(
      (sum, tier) => sum + tier.count * tier.revenue,
      0
    );

    // Premium members count
    const premiumMembers =
      tierDistribution.find(t => t.tier === 'Gold')!.count +
      tierDistribution.find(t => t.tier === 'Platinum')!.count;

    return {
      totalMembers: estimatedActiveMembers,
      activeMembers: Math.round(estimatedActiveMembers * 0.85),
      premiumMembers,
      monthlyRecurringRevenue,
      avgMemberValue: avgServiceValue * 1.5, // Members spend 50% more
      churnRate: 8, // Typical monthly churn
      redemptionRate: 0.6, // 60% redemption rate
      tierDistribution,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    clientMetrics: ClientMetrics,
    metrics: MembershipMetrics,
    goals: string
  ): MembershipConsultResponse['recommendations'] {
    const recommendations: MembershipConsultResponse['recommendations'] = [];

    // Acquisition recommendations
    if (goals === 'acquire' || goals === 'all') {
      recommendations.push({
        action: 'Offer first-month free trial for new members',
        reason: 'Reduces friction in membership signup and increases conversion by 40%',
        expectedLift: 35,
        timeline: '1 month',
      });

      recommendations.push({
        action: 'Create referral program with double points',
        reason: 'Existing members are best advocates - 3x higher conversion than ads',
        expectedLift: 25,
        timeline: '2 months',
      });
    }

    // Retention recommendations
    if (goals === 'retain' || goals === 'all') {
      recommendations.push({
        action: 'Implement points expiry policy (18 months)',
        reason: 'Creates urgency and increases redemption frequency by 20%',
        expectedLift: 15,
        timeline: '3 months',
      });

      recommendations.push({
        action: 'Send tier upgrade reminders at 80% completion',
        reason: 'Gamification increases engagement and spending',
        expectedLift: 20,
        timeline: '1 month',
      });
    }

    // Spend increase recommendations
    if (goals === 'increase_spend' || goals === 'all') {
      recommendations.push({
        action: 'Create exclusive member-only services',
        reason: 'Premium offerings justify higher tier subscriptions',
        expectedLift: 30,
        timeline: '2 months',
      });

      recommendations.push({
        action: 'Bundle services at member-only prices',
        reason: 'Packages increase average ticket size by 25%',
        expectedLift: 25,
        timeline: '1 month',
      });
    }

    return recommendations;
  }

  /**
   * Generate tier strategy
   */
  private generateTierStrategy(): MembershipConsultResponse['tierStrategy'] {
    return [
      {
        tier: 'Free',
        targetPercent: 30,
        benefits: ['Basic earn rate', 'Birthday reward', 'Easy signup'],
        upgradeCriteria: '500 points earned',
      },
      {
        tier: 'Silver',
        targetPercent: 35,
        benefits: ['1.5x earn rate', '5% discount', 'Priority booking', 'Free hair wash'],
        upgradeCriteria: '2000 points earned',
      },
      {
        tier: 'Gold',
        targetPercent: 25,
        benefits: ['2x earn rate', '10% discount', 'Free quarterly treatment', 'Member events'],
        upgradeCriteria: '5000 points earned or ₹999/month',
      },
      {
        tier: 'Platinum',
        targetPercent: 10,
        benefits: ['3x earn rate', '15% discount', 'Monthly premium treatment', 'Personal stylist'],
        upgradeCriteria: 'Referral or high-value spend',
      },
    ];
  }

  /**
   * Generate membership campaigns
   */
  private generateCampaigns(
    clientMetrics: ClientMetrics,
    goals: string
  ): MembershipConsultResponse['campaigns'] {
    const campaigns: MembershipConsultResponse['campaigns'] = [];

    // Welcome campaign for new members
    campaigns.push({
      name: 'Welcome to Glow Rewards',
      type: 'welcome',
      description: 'Onboard new members with bonus points and guide to tier benefits',
      targetSegment: 'New members (first 7 days)',
      expectedConversion: 45,
    });

    // Upgrade campaign for Silver members
    const silverMembers = Math.round(clientMetrics.totalClients * 0.15);
    if (silverMembers > 10) {
      campaigns.push({
        name: 'Unlock Gold Benefits',
        type: 'upgrade',
        description: 'Personalized upgrade offer for Silver members approaching Gold threshold',
        targetSegment: `Silver members (${silverMembers} prospects)`,
        expectedConversion: 25,
      });
    }

    // Reactivation campaign for lapsed members
    if (clientMetrics.dormantClients > 0) {
      campaigns.push({
        name: 'We Miss You',
        type: 'reactivation',
        description: 'Bring back dormant members with special reactivation bonus',
        targetSegment: `Dormant members (${clientMetrics.dormantClients} prospects)`,
        expectedConversion: 15,
      });
    }

    // Referral campaign
    campaigns.push({
      name: 'Share the Glow',
      type: 'referral',
      description: 'Existing members refer friends for bonus points',
      targetSegment: 'All active members',
      expectedConversion: 12,
    });

    // Birthday campaign
    campaigns.push({
      name: 'Birthday Treat',
      type: 'birthday',
      description: 'Special birthday offer or free add-on service',
      targetSegment: 'Members with birthdays this month',
      expectedConversion: 60,
    });

    return campaigns;
  }

  /**
   * Project membership program impact
   */
  private projectImpact(
    clientMetrics: ClientMetrics,
    metrics: MembershipMetrics
  ): MembershipConsultResponse['projectedImpact'] {
    const memberGrowth = Math.round(clientMetrics.totalClients * 0.2);

    const revenueIncrease = metrics.avgMemberValue * memberGrowth * 0.5; // 50% additional revenue

    const retentionLift = 15; // 15% improvement in retention

    const mrrIncrease = metrics.monthlyRecurringRevenue;

    return {
      memberGrowth,
      revenueIncrease: Math.round(revenueIncrease),
      retentionLift,
      mrrIncrease,
    };
  }
}

export const membershipManagerService = new MembershipManagerService();
