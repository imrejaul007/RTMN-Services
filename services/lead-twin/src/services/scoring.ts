import { ILead, IScoreFactor, LeadStage, LeadSource } from '../models/Lead';
import { Activity, ActivityType } from '../models/Activity';

// Scoring weights
const SCORING_WEIGHTS = {
  // Stage weights (0-100 based on funnel stage)
  stage: {
    [LeadStage.NEW]: 5,
    [LeadStage.CONTACTED]: 15,
    [LeadStage.QUALIFIED]: 30,
    [LeadStage.PROPOSAL]: 45,
    [LeadStage.NEGOTIATION]: 55,
    [LeadStage.WON]: 100,
    [LeadStage.LOST]: 0,
  },
  // Source weights
  source: {
    [LeadSource.REFERRAL]: 25,
    [LeadSource.EVENT]: 20,
    [LeadSource.CAMPAIGN]: 15,
    [LeadSource.PARTNER]: 15,
    [LeadSource.SOCIAL]: 10,
    [LeadSource.AD]: 10,
    [LeadSource.WEB]: 5,
  },
  // Engagement weights
  engagement: {
    emailOpened: 5,
    linkClicked: 5,
    formSubmitted: 10,
    demoRequested: 20,
    meetingScheduled: 25,
    meetingCompleted: 30,
    callCompleted: 15,
  },
  // Data completeness bonus
  dataCompleteness: {
    email: 5,
    phone: 5,
    company: 10,
    jobTitle: 10,
  },
  // Company data bonus (from enrichment)
  companyData: {
    hasLinkedin: 15,
    hasCompanyInfo: 10,
    companySizeLarge: 15,
    companySizeMedium: 10,
  },
  // Recency decay (points decrease over time without activity)
  inactivity: {
    decayPerWeek: -2,
    maxDecay: -20,
  },
};

// Default scoring service
class ScoringService {
  /**
   * Calculate the total score for a lead based on various factors
   */
  async calculateScore(lead: ILead): Promise<{
    total: number;
    factors: IScoreFactor[];
    lastCalculated: Date;
  }> {
    const factors: IScoreFactor[] = [];
    let totalScore = 0;

    // 1. Stage score
    const stageScore = SCORING_WEIGHTS.stage[lead.stage] || 0;
    factors.push({ name: 'stage', value: stageScore, weight: 1.5 });
    totalScore += stageScore * 1.5;

    // 2. Source score
    const sourceScore = SCORING_WEIGHTS.source[lead.source] || 0;
    factors.push({ name: 'source', value: sourceScore, weight: 1.0 });
    totalScore += sourceScore;

    // 3. Data completeness
    let dataScore = 0;
    if (lead.email) {
      dataScore += SCORING_WEIGHTS.dataCompleteness.email;
      factors.push({ name: 'has_email', value: SCORING_WEIGHTS.dataCompleteness.email });
    }
    if (lead.phone) {
      dataScore += SCORING_WEIGHTS.dataCompleteness.phone;
      factors.push({ name: 'has_phone', value: SCORING_WEIGHTS.dataCompleteness.phone });
    }
    if (lead.company) {
      dataScore += SCORING_WEIGHTS.dataCompleteness.company;
      factors.push({ name: 'has_company', value: SCORING_WEIGHTS.dataCompleteness.company });
    }
    if (lead.jobTitle) {
      dataScore += SCORING_WEIGHTS.dataCompleteness.jobTitle;
      factors.push({ name: 'has_jobtitle', value: SCORING_WEIGHTS.dataCompleteness.jobTitle });
    }
    totalScore += dataScore;

    // 4. Enrichment bonuses
    let enrichmentScore = 0;
    if (lead.enrichment?.linkedin?.url) {
      enrichmentScore += SCORING_WEIGHTS.companyData.hasLinkedin;
      factors.push({ name: 'has_linkedin', value: SCORING_WEIGHTS.companyData.hasLinkedin });
    }
    if (lead.enrichment?.companyData) {
      enrichmentScore += SCORING_WEIGHTS.companyData.hasCompanyInfo;
      factors.push({ name: 'has_company_data', value: SCORING_WEIGHTS.companyData.hasCompanyInfo });

      const size = lead.enrichment.companyData.size?.toLowerCase() || '';
      if (size.includes('500') || size.includes('1000') || size.includes('large')) {
        enrichmentScore += SCORING_WEIGHTS.companyData.companySizeLarge;
        factors.push({ name: 'company_size_large', value: SCORING_WEIGHTS.companyData.companySizeLarge });
      } else if (size.includes('50') || size.includes('100') || size.includes('medium')) {
        enrichmentScore += SCORING_WEIGHTS.companyData.companySizeMedium;
        factors.push({ name: 'company_size_medium', value: SCORING_WEIGHTS.companyData.companySizeMedium });
      }
    }
    totalScore += enrichmentScore;

    // 5. Recent engagement bonus
    const recentActivities = await this.getRecentActivities(lead.tenantId, lead.leadId);
    const engagementScore = await this.calculateEngagementScore(recentActivities, factors);
    totalScore += engagementScore;

    // 6. Recency decay
    const inactivityDecay = await this.calculateInactivityDecay(lead, factors);
    totalScore += inactivityDecay;

    // Normalize score to 0-100
    const normalizedScore = Math.min(100, Math.max(0, Math.round(totalScore)));

    return {
      total: normalizedScore,
      factors,
      lastCalculated: new Date(),
    };
  }

  /**
   * Get recent activities for a lead (last 30 days)
   */
  private async getRecentActivities(tenantId: string, leadId: string): Promise<Activity[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return Activity.find({
      tenantId,
      leadId,
      isDeleted: false,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  /**
   * Calculate engagement score based on recent activities
   */
  private async calculateEngagementScore(
    activities: Activity[],
    factors: IScoreFactor[]
  ): Promise<number> {
    let score = 0;
    const activityTypes = new Set<string>();

    for (const activity of activities) {
      const type = activity.type as ActivityType;
      if (activityTypes.has(type)) continue; // Only count each type once

      switch (type) {
        case ActivityType.CALL:
          score += SCORING_WEIGHTS.engagement.callCompleted;
          activityTypes.add(type);
          break;
        case ActivityType.EMAIL:
          // Check if email was opened (check metadata)
          if (activity.metadata?.opened) {
            score += SCORING_WEIGHTS.engagement.emailOpened;
          }
          if (activity.metadata?.linkClicked) {
            score += SCORING_WEIGHTS.engagement.linkClicked;
          }
          activityTypes.add(type);
          break;
        case ActivityType.MEETING:
          if (activity.metadata?.completed) {
            score += SCORING_WEIGHTS.engagement.meetingCompleted;
          } else {
            score += SCORING_WEIGHTS.engagement.meetingScheduled;
          }
          activityTypes.add(type);
          break;
        case ActivityType.TASK:
          if (activity.metadata?.type === 'demo_request') {
            score += SCORING_WEIGHTS.engagement.demoRequested;
          }
          activityTypes.add(type);
          break;
      }
    }

    if (score > 0) {
      factors.push({ name: 'recent_engagement', value: Math.min(score, 50) }); // Cap engagement bonus
    }

    return Math.min(score, 50); // Cap total engagement bonus
  }

  /**
   * Calculate score decay for inactive leads
   */
  private async calculateInactivityDecay(
    lead: ILead,
    factors: IScoreFactor[]
  ): Promise<number> {
    const lastActivity = await Activity.findOne({
      tenantId: lead.tenantId,
      leadId: lead.leadId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 });

    if (!lastActivity) {
      // No activity - small decay
      const weeksInactive = Math.floor(
        (Date.now() - lead.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      const decay = Math.min(
        Math.abs(SCORING_WEIGHTS.inactivity.decayPerWeek) * weeksInactive,
        Math.abs(SCORING_WEIGHTS.inactivity.maxDecay)
      );
      if (decay > 0) {
        factors.push({ name: 'inactivity_decay', value: -decay });
      }
      return -decay;
    }

    const daysSinceActivity = Math.floor(
      (Date.now() - lastActivity.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysSinceActivity > 7) {
      const weeksInactive = Math.floor(daysSinceActivity / 7);
      const decay = Math.min(
        Math.abs(SCORING_WEIGHTS.inactivity.decayPerWeek) * weeksInactive,
        Math.abs(SCORING_WEIGHTS.inactivity.maxDecay)
      );
      factors.push({ name: 'inactivity_decay', value: -decay });
      return -decay;
    }

    return 0;
  }

  /**
   * Batch calculate scores for multiple leads
   */
  async batchCalculateScores(leads: ILead[]): Promise<Array<{
    leadId: string;
    previousScore: number;
    newScore: number;
  }>> {
    const results = [];

    for (const lead of leads) {
      const previousScore = lead.score.total;
      const newScore = await this.calculateScore(lead);
      results.push({
        leadId: lead.leadId,
        previousScore,
        newScore: newScore.total,
      });
    }

    return results;
  }
}

const scoringService = new ScoringService();
export default scoringService;
