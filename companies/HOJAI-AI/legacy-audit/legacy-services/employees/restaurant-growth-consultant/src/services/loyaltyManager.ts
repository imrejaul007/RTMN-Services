import { v4 as uuidv4 } from 'uuid';
import {
  LoyaltyRequest,
  LoyaltyResponse,
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyReward,
  LoyaltyMetrics,
} from '../types';

/**
 * Loyalty Program Manager Service
 * Designs, implements, and optimizes restaurant loyalty programs
 */
export class LoyaltyManagerService {
  /**
   * Design a new loyalty program or optimize existing one
   */
  async designProgram(request: LoyaltyRequest): Promise<LoyaltyResponse> {
    // Generate or optimize loyalty program
    const program = request.currentLoyalty
      ? this.optimizeExistingProgram(request)
      : this.designNewProgram(request);

    // Calculate metrics (using industry benchmarks if no actual data)
    const metrics = this.calculateMetrics(request);

    // Generate recommendations
    const recommendations = this.generateRecommendations(program, metrics, request.goals);

    // Design tier strategy
    const tierStrategy = this.designTierStrategy(program, request.avgOrderValue);

    // Generate campaigns
    const campaigns = this.generateCampaigns(program, metrics);

    return {
      program,
      metrics,
      recommendations,
      tierStrategy,
      campaigns,
    };
  }

  /**
   * Design a new loyalty program from scratch
   */
  private designNewProgram(request: LoyaltyRequest): LoyaltyProgram {
    const tiers = this.designTiers(request.avgOrderValue);
    const rewards = this.designRewards(tiers, request.avgOrderValue);

    return {
      id: uuidv4(),
      name: `${request.restaurantName} Rewards`,
      tiers,
      rewards,
      pointsPerRupee: this.calculatePointsRate(request.avgOrderValue),
      birthdayBonus: 100,
      referralBonus: 50,
    };
  }

  /**
   * Design tier structure based on average order value
   */
  private designTiers(avgOrderValue: number): LoyaltyTier[] {
    // Scale tier thresholds based on restaurant price range
    const basePoints = avgOrderValue;
    const silverThreshold = basePoints * 50;
    const goldThreshold = basePoints * 150;
    const platinumThreshold = basePoints * 400;

    return [
      {
        name: 'Member',
        pointsRequired: 0,
        benefits: [
          'Earn 1 point per ₹1 spent',
          'Birthday reward',
          'Exclusive offers',
        ],
        multiplier: 1.0,
        color: '#9CA3AF', // Gray
      },
      {
        name: 'Silver',
        pointsRequired: silverThreshold,
        benefits: [
          'Earn 1.25 points per ₹1',
          'Priority support',
          'Early access to new dishes',
          'Free beverage on signup',
        ],
        multiplier: 1.25,
        color: '#C0C0C0', // Silver
      },
      {
        name: 'Gold',
        pointsRequired: goldThreshold,
        benefits: [
          'Earn 1.5 points per ₹1',
          'Free delivery',
          'Exclusive menu items',
          '10% off on birthdays',
          'Complimentary appetizer monthly',
        ],
        multiplier: 1.5,
        color: '#FFD700', // Gold
      },
      {
        name: 'Platinum',
        pointsRequired: platinumThreshold,
        benefits: [
          'Earn 2 points per Rs.1',
          'Free delivery always',
          'Chef\'s table access',
          'Personal dining concierge',
          'Annual celebration dinner',
          'First look at seasonal menus',
        ],
        multiplier: 2.0,
        color: '#E5E4E2', // Platinum
      },
    ];
  }

  /**
   * Design reward catalog
   */
  private designRewards(tiers: LoyaltyTier[], avgOrderValue: number): LoyaltyReward[] {
    return [
      // Discount rewards
      {
        id: uuidv4(),
        name: '₹50 Off',
        pointsCost: Math.round(avgOrderValue * 2),
        type: 'discount',
        available: true,
      },
      {
        id: uuidv4(),
        name: 'Rs.100 Off',
        pointsCost: Math.round(avgOrderValue * 4),
        type: 'discount',
        available: true,
      },
      {
        id: uuidv4(),
        name: 'Rs.250 Off',
        pointsCost: Math.round(avgOrderValue * 10),
        type: 'discount',
        minTier: 'Silver',
        available: true,
      },
      {
        id: uuidv4(),
        name: 'Rs.500 Off',
        pointsCost: Math.round(avgOrderValue * 20),
        type: 'discount',
        minTier: 'Gold',
        available: true,
      },

      // Free item rewards
      {
        id: uuidv4(),
        name: 'Free Beverage',
        pointsCost: Math.round(avgOrderValue),
        type: 'free_item',
        available: true,
      },
      {
        id: uuidv4(),
        name: 'Free Appetizer',
        pointsCost: Math.round(avgOrderValue * 3),
        type: 'free_item',
        available: true,
      },
      {
        id: uuidv4(),
        name: 'Free Dessert',
        pointsCost: Math.round(avgOrderValue * 2),
        type: 'free_item',
        available: true,
      },
      {
        id: uuidv4(),
        name: 'Free Main Course',
        pointsCost: Math.round(avgOrderValue * 8),
        type: 'free_item',
        minTier: 'Gold',
        available: true,
      },

      // Experience rewards
      {
        id: uuidv4(),
        name: 'Kitchen Tour',
        pointsCost: Math.round(avgOrderValue * 15),
        type: 'experience',
        minTier: 'Gold',
        available: true,
      },
      {
        id: uuidv4(),
        name: "Chef's Table Experience",
        pointsCost: Math.round(avgOrderValue * 50),
        type: 'experience',
        minTier: 'Platinum',
        available: true,
      },
      {
        id: uuidv4(),
        name: 'Cooking Class',
        pointsCost: Math.round(avgOrderValue * 30),
        type: 'experience',
        minTier: 'Gold',
        available: true,
      },

      // Percentage discounts
      {
        id: uuidv4(),
        name: '10% Off',
        pointsCost: Math.round(avgOrderValue * 3),
        type: 'discount_percent',
        available: true,
      },
      {
        id: uuidv4(),
        name: '20% Off',
        pointsCost: Math.round(avgOrderValue * 8),
        type: 'discount_percent',
        minTier: 'Silver',
        available: true,
      },
    ];
  }

  /**
   * Optimize an existing loyalty program
   */
  private optimizeExistingProgram(request: LoyaltyRequest): LoyaltyProgram {
    if (!request.currentLoyalty) {
      return this.designNewProgram(request);
    }

    const existing = request.currentLoyalty;
    const improvements: Partial<LoyaltyProgram> = {};

    // Analyze and improve based on goals
    switch (request.goals) {
      case 'acquire':
        // Focus on making entry easier
        improvements.pointsPerRupee = Math.max(existing.pointsPerRupee, 1);
        improvements.birthdayBonus = Math.max(existing.birthdayBonus, 100);
        break;

      case 'retain':
        // Focus on tier benefits and engagement
        improvements.referralBonus = Math.max(existing.referralBonus * 1.5, 75);
        break;

      case 'increase_spend':
        // Focus on premium tier incentives
        improvements.pointsPerRupee = Math.min(existing.pointsPerRupee * 1.2, 3);
        break;

      default:
        // Balanced improvement
        improvements.pointsPerRupee = existing.pointsPerRupee * 1.1;
    }

    return {
      ...existing,
      ...improvements,
    };
  }

  /**
   * Calculate points rate based on average order value
   */
  private calculatePointsRate(avgOrderValue: number): number {
    // Aim for customers to earn a reward after 5-10 visits
    const visitsForReward = 8;
    const rewardValue = avgOrderValue * 0.15; // 15% value back
    return Math.round(rewardValue / visitsForReward);
  }

  /**
   * Calculate loyalty metrics (using benchmarks)
   */
  private calculateMetrics(request: LoyaltyRequest): LoyaltyMetrics {
    const totalMembers = Math.round(request.monthlyCustomers * 0.3); // Assume 30% enroll
    const activeMembers = Math.round(totalMembers * 0.6); // 60% active

    return {
      totalMembers,
      activeMembers,
      avgVisitFrequency: 2.5, // Monthly visits
      avgOrderValue: request.avgOrderValue,
      redemptionRate: 35, // 35% redemption rate
      memberLifetimeValue: request.avgOrderValue * 2.5 * 12, // Annual LTV
      churnRate: 25, // 25% annual churn
      tierDistribution: [
        { tier: 'Member', count: Math.round(totalMembers * 0.6), percent: 60 },
        { tier: 'Silver', count: Math.round(totalMembers * 0.25), percent: 25 },
        { tier: 'Gold', count: Math.round(totalMembers * 0.12), percent: 12 },
        { tier: 'Platinum', count: Math.round(totalMembers * 0.03), percent: 3 },
      ],
    };
  }

  /**
   * Generate program recommendations
   */
  private generateRecommendations(
    program: LoyaltyProgram,
    metrics: LoyaltyMetrics,
    goals: string
  ): LoyaltyResponse['recommendations'] {
    const recommendations: LoyaltyResponse['recommendations'] = [];

    // Tier distribution recommendations
    if (metrics.tierDistribution[0].percent > 70) {
      recommendations.push({
        action: 'Implement tier upgrade campaigns',
        reason: 'Too many members stuck at base tier - 60% never upgrade',
        expectedLift: 15,
      });
    }

    // Redemption rate optimization
    if (metrics.redemptionRate < 30) {
      recommendations.push({
        action: 'Lower redemption thresholds by 20%',
        reason: 'Low redemption rate indicates rewards feel unattainable',
        expectedLift: 25,
      });
    }

    if (metrics.redemptionRate > 50) {
      recommendations.push({
        action: 'Increase reward values or add premium tiers',
        reason: 'High redemption but low LTV - need higher-value rewards',
        expectedLift: 10,
      });
    }

    // Churn reduction
    if (metrics.churnRate > 30) {
      recommendations.push({
        action: 'Implement win-back automation for lapsed members',
        reason: 'High churn rate - need proactive re-engagement',
        expectedLift: 20,
      });
    }

    // Goal-specific recommendations
    if (goals === 'acquire') {
      recommendations.push({
        action: 'Double points on first visit',
        reason: 'Accelerate new member progression to first reward',
        expectedLift: 30,
      });
    }

    return recommendations;
  }

  /**
   * Design tier upgrade strategy
   */
  private designTierStrategy(
    program: LoyaltyProgram,
    avgOrderValue: number
  ): LoyaltyResponse['tierStrategy'] {
    return program.tiers.slice(1).map(tier => ({
      tier: tier.name,
      targetPercent: tier.name === 'Silver' ? 30 : tier.name === 'Gold' ? 15 : 5,
      benefits: tier.benefits,
      upgradeCriteria: `Earn ${tier.pointsRequired} points within 12 months`,
    }));
  }

  /**
   * Generate loyalty campaigns
   */
  private generateCampaigns(
    program: LoyaltyProgram,
    metrics: LoyaltyMetrics
  ): LoyaltyResponse['campaigns'] {
    return [
      {
        name: 'Welcome Series',
        type: 'welcome',
        description: '5-email onboarding sequence introducing program benefits',
        expectedResponse: 45,
      },
      {
        name: 'Tier Upgrade Push',
        type: 'tier_upgrade',
        description: 'Target members close to next tier with bonus points offer',
        expectedResponse: 25,
      },
      {
        name: 'Reactivation Campaign',
        type: 'reactivation',
        description: 'Win back inactive members with bonus points and deadline',
        expectedResponse: 15,
      },
      {
        name: 'Referral Program Launch',
        type: 'referral',
        description: 'Refer a friend - both get bonus points',
        expectedResponse: 20,
      },
    ];
  }

  /**
   * Calculate ROI of loyalty program
   */
  async calculateROI(
    program: LoyaltyProgram,
    metrics: LoyaltyMetrics,
    implementationCost: number
  ): Promise<{ monthlyCost: number; monthlyRevenue: number; roi: number; paybackMonths: number }> {
    // Estimate costs
    const monthlyCost = implementationCost / 12;
    const avgPointsPerReward = program.rewards.reduce((sum, r) => sum + r.pointsCost, 0) / program.rewards.length;
    const avgRewardCost = avgPointsPerReward / program.pointsPerRupee * 0.7; // 70% of face value

    // Estimate revenue impact
    const activeMembers = metrics.activeMembers;
    const visitsPerMonth = metrics.avgVisitFrequency;
    const incrementalSpend = program.tiers[0].multiplier * 0.1; // 10% incremental spend from loyalty

    const monthlyRevenue = activeMembers * visitsPerMonth * metrics.avgOrderValue * incrementalSpend;
    const roi = ((monthlyRevenue - monthlyCost) / monthlyCost) * 100;
    const paybackMonths = monthlyCost > 0 ? implementationCost / (monthlyRevenue - monthlyCost) : 0;

    return {
      monthlyCost,
      monthlyRevenue,
      roi,
      paybackMonths: Math.max(0, paybackMonths),
    };
  }

  /**
   * Generate loyalty program report
   */
  async generateReport(request: LoyaltyRequest, response: LoyaltyResponse): Promise<string> {
    const roi = await this.calculateROI(
      response.program,
      response.metrics,
      request.monthlyCustomers * 50 // Estimate ₹50 cost per member
    );

    return `
# LOYALTY PROGRAM DESIGN REPORT
Generated: ${new Date().toISOString()}
Restaurant: ${request.restaurantName}

## PROGRAM OVERVIEW
- Program Name: ${response.program.name}
- Points Rate: ${response.program.pointsPerRupee} points per ₹1
- Birthday Bonus: ${response.program.birthdayBonus} points
- Referral Bonus: ${response.program.referralBonus} points

## TIER STRUCTURE
${response.program.tiers.map(t => `
### ${t.name} (${t.pointsRequired.toLocaleString()} points)
- Multiplier: ${t.multiplier}x
${t.benefits.map(b => `- ${b}`).join('\n')}
`).join('\n')}

## REWARD CATALOG
${response.program.rewards.map(r => `- ${r.name}: ${r.pointsCost} points${r.minTier ? ` (${r.minTier}+)` : ''}`).join('\n')}

## METRICS PROJECTION
- Total Members: ${response.metrics.totalMembers.toLocaleString()}
- Active Members: ${response.metrics.activeMembers.toLocaleString()}
- Avg Visit Frequency: ${response.metrics.avgVisitFrequency}/month
- Redemption Rate: ${response.metrics.redemptionRate}%
- Member LTV: ₹${response.metrics.memberLifetimeValue.toLocaleString()}

## ROI ANALYSIS
- Monthly Cost: ₹${roi.monthlyCost.toLocaleString()}
- Monthly Revenue Lift: ₹${roi.monthlyRevenue.toLocaleString()}
- ROI: ${roi.roi.toFixed(0)}%
- Payback Period: ${roi.paybackMonths.toFixed(1)} months

## RECOMMENDATIONS
${response.recommendations.map((r, i) => `${i + 1}. ${r.action} - Expected ${r.expectedLift}% lift`).join('\n')}

## CAMPAIGNS
${response.campaigns.map(c => `- ${c.name}: ${c.description} (${c.expectedResponse}% expected response)`).join('\n')}
`.trim();
  }
}

export const loyaltyManagerService = new LoyaltyManagerService();
