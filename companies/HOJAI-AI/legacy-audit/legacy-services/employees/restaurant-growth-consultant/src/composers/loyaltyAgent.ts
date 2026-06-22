import { v4 as uuidv4 } from 'uuid';

interface LoyaltyMember {
  id: string;
  name: string;
  tier: string;
  points: number;
  lifetimeVisits: number;
  lifetimeValue: number;
  lastVisit: string;
  birthday?: string;
  preferences: string[];
}

interface LoyaltyCampaign {
  id: string;
  name: string;
  type: 'welcome' | 'birthday' | 'tier_upgrade' | 'reactivation' | 'referral';
  targetSegment: string;
  offer: string;
  expectedResponse: number;
  expectedRevenue: number;
  roi: number;
}

/**
 * Restaurant Loyalty Agent
 * Composed by Restaurant Growth Consultant
 * Handles loyalty program operations, member engagement, and retention campaigns
 */
export class LoyaltyAgent {
  /**
   * Calculate member health score
   */
  calculateMemberHealth(member: LoyaltyMember): { score: number; status: 'active' | 'at_risk' | 'lapsing' | 'churned'; factors: string[] } {
    const factors: string[] = [];
    let score = 100;

    // Recency factor
    const daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(member.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastVisit > 60) {
      score -= 40;
      factors.push(`No visit in ${daysSinceLastVisit} days (-40)`);
    } else if (daysSinceLastVisit > 30) {
      score -= 25;
      factors.push(`Last visit ${daysSinceLastVisit} days ago (-25)`);
    } else if (daysSinceLastVisit > 14) {
      score -= 10;
      factors.push(`Last visit ${daysSinceLastVisit} days ago (-10)`);
    }

    // Engagement factor (visits per month)
    const avgVisitsPerMonth = member.lifetimeVisits / 12; // Simplified
    if (avgVisitsPerMonth < 0.5) {
      score -= 20;
      factors.push('Low visit frequency (-20)');
    } else if (avgVisitsPerMonth < 1) {
      score -= 10;
      factors.push('Below average visits (-10)');
    }

    // Value factor
    const avgOrderValue = member.lifetimeValue / Math.max(member.lifetimeVisits, 1);
    if (avgOrderValue < 300) {
      score -= 15;
      factors.push('Below average order value (-15)');
    }

    // Tier decay
    const tierThresholds: Record<string, number> = { Platinum: 5000, Gold: 2000, Silver: 500 };
    const expectedVisits = tierThresholds[member.tier] || 0;
    if (member.lifetimeValue < expectedVisits * 0.5) {
      score -= 10;
      factors.push('Below tier expectation (-10)');
    }

    // Determine status
    let status: 'active' | 'at_risk' | 'lapsing' | 'churned';
    if (score >= 70) status = 'active';
    else if (score >= 50) status = 'at_risk';
    else if (score >= 25) status = 'lapsing';
    else status = 'churned';

    return { score: Math.max(0, score), status, factors };
  }

  /**
   * Identify members needing attention
   */
  async identifyAtRiskMembers(members: LoyaltyMember[]): Promise<{
    atRisk: LoyaltyMember[];
    lapsing: LoyaltyMember[];
    churned: LoyaltyMember[];
  }> {
    const atRisk: LoyaltyMember[] = [];
    const lapsing: LoyaltyMember[] = [];
    const churned: LoyaltyMember[] = [];

    for (const member of members) {
      const health = this.calculateMemberHealth(member);

      switch (health.status) {
        case 'at_risk':
          atRisk.push(member);
          break;
        case 'lapsing':
          lapsing.push(member);
          break;
        case 'churned':
          churned.push(member);
          break;
      }
    }

    return { atRisk, lapsing, churned };
  }

  /**
   * Generate retention offers
   */
  generateRetentionOffers(
    member: LoyaltyMember,
    health: { score: number; status: string; factors: string[] }
  ): { offer: string; pointsCost: number; revenueImpact: number; priority: 'urgent' | 'high' | 'medium' } {
    const offers: { offer: string; pointsCost: number; revenueImpact: number; priority: 'urgent' | 'high' | 'medium' }[] = [];

    // Churned members - aggressive offer
    if (health.status === 'churned') {
      offers.push({
        offer: '30% off + Free dessert on next visit',
        pointsCost: 0,
        revenueImpact: 500,
        priority: 'urgent',
      });
    }

    // Lapsing members - strong incentive
    if (health.status === 'lapsing' || health.status === 'churned') {
      offers.push({
        offer: '20% off + Double points this month',
        pointsCost: 0,
        revenueImpact: 400,
        priority: 'urgent',
      });
    }

    // At-risk - moderate incentive
    if (health.status === 'at_risk') {
      offers.push({
        offer: '15% off for your next visit',
        pointsCost: 0,
        revenueImpact: 300,
        priority: 'high',
      });
    }

    // Tier-specific offers
    if (member.tier === 'Platinum') {
      offers.push({
        offer: 'Exclusive chef\'s table experience at 50% off',
        pointsCost: 500,
        revenueImpact: 1500,
        priority: 'medium',
      });
    } else if (member.tier === 'Gold') {
      offers.push({
        offer: 'Free premium beverage with any main course',
        pointsCost: 100,
        revenueImpact: 250,
        priority: 'medium',
      });
    }

    // Birthday offer
    if (member.birthday) {
      const daysUntilBirthday = Math.floor(
        (new Date(member.birthday).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilBirthday <= 7 && daysUntilBirthday >= -7) {
        offers.push({
          offer: 'Free birthday dessert + 2x points',
          pointsCost: 0,
          revenueImpact: 350,
          priority: 'high',
        });
      }
    }

    // Return best offer based on priority
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2 };
    return offers.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])[0];
  }

  /**
   * Create loyalty campaigns
   */
  async createCampaigns(
    members: LoyaltyMember[],
    segments: {
      atRisk: LoyaltyMember[];
      lapsing: LoyaltyMember[];
      churned: LoyaltyMember[];
      birthdays: LoyaltyMember[];
      tierUpgrade: LoyaltyMember[];
    }
  ): Promise<LoyaltyCampaign[]> {
    const campaigns: LoyaltyCampaign[] = [];

    // We Miss You campaign (at-risk)
    if (segments.atRisk.length > 0) {
      campaigns.push({
        id: uuidv4(),
        name: 'We Miss You - Come Back',
        type: 'reactivation',
        targetSegment: `${segments.atRisk.length} at-risk members`,
        offer: '15% off next visit',
        expectedResponse: segments.atRisk.length * 0.35,
        expectedRevenue: segments.atRisk.length * 0.35 * 500,
        roi: 2.5,
      });
    }

    // Win Back campaign (lapsing/churned)
    if (segments.lapsing.length + segments.churned.length > 0) {
      const winBackCount = segments.lapsing.length + segments.churned.length;
      campaigns.push({
        id: uuidv4(),
        name: 'Win Back Lapsed Members',
        type: 'reactivation',
        targetSegment: `${winBackCount} lapsed/churned members`,
        offer: '25% off + free appetizer',
        expectedResponse: winBackCount * 0.15,
        expectedRevenue: winBackCount * 0.15 * 750,
        roi: 1.8,
      });
    }

    // Birthday campaign
    if (segments.birthdays.length > 0) {
      campaigns.push({
        id: uuidv4(),
        name: 'Birthday Celebrations',
        type: 'birthday',
        targetSegment: `${segments.birthdays.length} members with birthdays this week`,
        offer: 'Free dessert + 2x points',
        expectedResponse: segments.birthdays.length * 0.6,
        expectedRevenue: segments.birthdays.length * 0.6 * 400,
        roi: 4.0,
      });
    }

    // Tier Upgrade campaign
    if (segments.tierUpgrade.length > 0) {
      campaigns.push({
        id: uuidv4(),
        name: 'Tier Upgrade Push',
        type: 'tier_upgrade',
        targetSegment: `${segments.tierUpgrade.length} members close to next tier`,
        offer: 'Double points this month to unlock next tier',
        expectedResponse: segments.tierUpgrade.length * 0.45,
        expectedRevenue: segments.tierUpgrade.length * 0.45 * 600,
        roi: 3.5,
      });
    }

    // Referral campaign
    campaigns.push({
      id: uuidv4(),
      name: 'Refer a Friend',
      type: 'referral',
      targetSegment: 'All active members',
      offer: 'Referrer and referee both get 200 points',
      expectedResponse: members.filter(m => this.calculateMemberHealth(m).status === 'active').length * 0.1,
      expectedRevenue: members.filter(m => this.calculateMemberHealth(m).status === 'active').length * 0.1 * 800,
      roi: 5.0,
    });

    // Welcome campaign
    campaigns.push({
      id: uuidv4(),
      name: 'New Member Welcome Series',
      type: 'welcome',
      targetSegment: 'New enrollments',
      offer: '100 bonus points on first visit + 2x points for first week',
      expectedResponse: 0.7,
      expectedRevenue: 400,
      roi: 3.0,
    });

    return campaigns.sort((a, b) => b.roi - a.roi);
  }

  /**
   * Calculate program health metrics
   */
  calculateProgramHealth(
    members: LoyaltyMember[],
    totalRevenue: number
  ): {
    totalMembers: number;
    activeMembers: number;
    activeRate: number;
    avgLifetimeValue: number;
    avgVisitsPerMonth: number;
    redemptionRate: number;
    memberROI: number;
    tierDistribution: Record<string, number>;
  } {
    const activeMembers = members.filter(m =>
      this.calculateMemberHealth(m).status !== 'churned'
    );

    const tierDistribution: Record<string, number> = {};
    for (const member of members) {
      tierDistribution[member.tier] = (tierDistribution[member.tier] || 0) + 1;
    }

    const totalLifetimeValue = members.reduce((sum, m) => sum + m.lifetimeValue, 0);
    const totalVisits = members.reduce((sum, m) => sum + m.lifetimeVisits, 0);

    return {
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      activeRate: members.length > 0 ? (activeMembers.length / members.length) * 100 : 0,
      avgLifetimeValue: members.length > 0 ? totalLifetimeValue / members.length : 0,
      avgVisitsPerMonth: members.length > 0 ? totalVisits / (members.length * 12) : 0,
      redemptionRate: 35, // Simulated
      memberROI: totalLifetimeValue > 0 ? totalRevenue / totalLifetimeValue : 0,
      tierDistribution,
    };
  }

  /**
   * Identify tier upgrade candidates
   */
  identifyUpgradeCandidates(members: LoyaltyMember[]): {
    nearSilver: LoyaltyMember[];
    nearGold: LoyaltyMember[];
    nearPlatinum: LoyaltyMember[];
  } {
    const nearSilver: LoyaltyMember[] = [];
    const nearGold: LoyaltyMember[] = [];
    const nearPlatinum: LoyaltyMember[] = [];

    const thresholds = {
      Silver: { required: 500, range: 400 },
      Gold: { required: 2000, range: 500 },
      Platinum: { required: 5000, range: 1000 },
    };

    for (const member of members) {
      if (member.tier === 'Member') {
        const nextThreshold = thresholds.Silver.required;
        if (member.points >= nextThreshold - thresholds.Silver.range) {
          nearSilver.push(member);
        }
      } else if (member.tier === 'Silver') {
        const nextThreshold = thresholds.Gold.required;
        if (member.points >= nextThreshold - thresholds.Gold.range) {
          nearGold.push(member);
        }
      } else if (member.tier === 'Gold') {
        const nextThreshold = thresholds.Platinum.required;
        if (member.points >= nextThreshold - thresholds.Platinum.range) {
          nearPlatinum.push(member);
        }
      }
    }

    return { nearSilver, nearGold, nearPlatinum };
  }

  /**
   * Generate engagement sequence
   */
  generateEngagementSequence(
    member: LoyaltyMember,
    daysAhead: number = 30
  ): { day: number; action: string; channel: string; message: string }[] {
    const sequence: { day: number; action: string; channel: string; message: string }[] = [];

    // Day 0 - Welcome back (if returning)
    const health = this.calculateMemberHealth(member);
    if (health.status !== 'active') {
      sequence.push({
        day: 0,
        action: 'reactivation_offer',
        channel: 'WhatsApp',
        message: `Hi ${member.name}! We miss you at ${member.tier === 'Member' ? 'our restaurant' : 'your favorite restaurant'}. Here's 15% off your next visit!`,
      });
    }

    // Day 3 - Reminder
    sequence.push({
      day: 3,
      action: 'reminder',
      channel: 'SMS',
      message: 'Your exclusive offer expires in 3 days. Use code: COMEBACK15',
    });

    // Day 7 - Value highlight
    sequence.push({
      day: 7,
      action: 'value_proposition',
      channel: 'Email',
      message: `You're just ${1000 - (member.points % 1000)} points away from your next reward!`,
    });

    // Day 14 - Last chance
    if (health.status === 'lapsing' || health.status === 'churned') {
      sequence.push({
        day: 14,
        action: 'final_reminder',
        channel: 'WhatsApp',
        message: `Last chance! Your points are waiting. Free dessert on your next visit.`,
      });
    }

    // Check for upcoming birthday
    if (member.birthday) {
      const birthdayDate = new Date(member.birthday);
      const today = new Date();
      const daysUntilBirthday = Math.floor(
        (birthdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilBirthday > 0 && daysUntilBirthday <= daysAhead) {
        sequence.push({
          day: daysUntilBirthday,
          action: 'birthday',
          channel: 'WhatsApp',
          message: `Happy Birthday! Enjoy a complimentary dessert on us. See you soon!`,
        });
      }
    }

    return sequence.sort((a, b) => a.day - b.day);
  }

  /**
   * Calculate loyalty program ROI
   */
  calculateProgramROI(
    programCost: number,
    incrementalRevenue: number,
    memberCount: number
  ): { totalCost: number; incrementalRevenue: number; roi: number; costPerMember: number; revenuePerMember: number } {
    return {
      totalCost: programCost,
      incrementalRevenue,
      roi: programCost > 0 ? incrementalRevenue / programCost : 0,
      costPerMember: memberCount > 0 ? programCost / memberCount : 0,
      revenuePerMember: memberCount > 0 ? incrementalRevenue / memberCount : 0,
    };
  }
}

export const loyaltyAgent = new LoyaltyAgent();
