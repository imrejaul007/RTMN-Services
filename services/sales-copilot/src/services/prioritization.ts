import { v4 as uuidv4 } from 'uuid';
import { PrioritizedLead, LeadStage, ILead } from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

interface PrioritizationParams {
  leads: ILead[];
  limit?: number;
  factors?: string[];
}

// Weights for each prioritization factor
const FACTOR_WEIGHTS = {
  recency: 0.25,
  engagement: 0.25,
  dealSize: 0.20,
  stage: 0.15,
  fit: 0.15
};

// Stage progression scores
const STAGE_SCORES: Record<LeadStage, number> = {
  [LeadStage.NEW]: 10,
  [LeadStage.CONTACTED]: 25,
  [LeadStage.QUALIFIED]: 50,
  [LeadStage.PROPOSAL]: 75,
  [LeadStage.NEGOTIATION]: 90,
  [LeadStage.CLOSED_WON]: 100,
  [LeadStage.CLOSED_LOST]: 0
};

export async function prioritizeLeads(params: PrioritizationParams): Promise<PrioritizedLead[]> {
  const { leads, limit, factors } = params;

  logger.info(`Prioritizing ${leads.length} leads`);

  // Calculate priority score for each lead
  const prioritizedLeads: PrioritizedLead[] = leads.map(lead => {
    const factors_scores = calculateFactors(lead);

    const priorityScore = Object.entries(factors_scores)
      .reduce((total, [factor, data]) => {
        const weight = FACTOR_WEIGHTS[factor as keyof typeof FACTOR_WEIGHTS] || 0;
        return total + (data.score * weight);
      }, 0);

    const recommendedAction = determineRecommendedAction(lead, factors_scores);

    return {
      ...lead,
      priorityScore: Math.round(priorityScore * 100) / 100,
      priorityFactors: Object.entries(factors_scores).map(([factor, data]) => ({
        factor,
        weight: FACTOR_WEIGHTS[factor as keyof typeof FACTOR_WEIGHTS] || 0,
        score: data.score
      })),
      recommendedAction
    };
  });

  // Sort by priority score (highest first)
  prioritizedLeads.sort((a, b) => b.priorityScore - a.priorityScore);

  // Filter out closed deals unless specified
  const activeLeads = prioritizedLeads.filter(
    lead => lead.stage !== LeadStage.CLOSED_WON && lead.stage !== LeadStage.CLOSED_LOST
  );

  // Apply limit if specified
  const result = limit ? activeLeads.slice(0, limit) : activeLeads;

  logger.info(`Prioritized ${result.length} leads`);

  return result;
}

interface FactorScore {
  score: number;
  reason: string;
}

function calculateFactors(lead: ILead): Record<string, FactorScore> {
  return {
    recency: calculateRecencyScore(lead),
    engagement: calculateEngagementScore(lead),
    dealSize: calculateDealSizeScore(lead),
    stage: calculateStageScore(lead),
    fit: calculateFitScore(lead)
  };
}

function calculateRecencyScore(lead: ILead): FactorScore {
  if (!lead.lastContactedAt) {
    return { score: 100, reason: 'Never contacted - high priority' };
  }

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  let score: number;
  let reason: string;

  if (daysSinceContact === 0) {
    score = 80;
    reason = 'Contacted today';
  } else if (daysSinceContact <= 2) {
    score = 100;
    reason = 'Contacted within 2 days - optimal timing';
  } else if (daysSinceContact <= 7) {
    score = 90;
    reason = `Contacted ${daysSinceContact} days ago`;
  } else if (daysSinceContact <= 14) {
    score = 70;
    reason = `Contacted ${daysSinceContact} days ago - follow up needed`;
  } else if (daysSinceContact <= 30) {
    score = 50;
    reason = `Stale - ${daysSinceContact} days since last contact`;
  } else {
    score = 30;
    reason = `Very stale - ${daysSinceContact} days since last contact`;
  }

  return { score, reason };
}

function calculateEngagementScore(lead: ILead): FactorScore {
  // Use lead score as engagement indicator
  const score = lead.score || 50;

  let reason: string;
  if (score >= 80) {
    reason = 'High engagement score';
  } else if (score >= 60) {
    reason = 'Medium engagement score';
  } else if (score >= 40) {
    reason = 'Low engagement score';
  } else {
    reason = 'Very low engagement - needs nurturing';
  }

  return { score, reason };
}

function calculateDealSizeScore(lead: ILead): FactorScore {
  // Normalize deal size (assuming max deal is 1M)
  const maxDealSize = 1000000;
  const revenue = lead.revenue || 0;

  const score = Math.min(100, (revenue / maxDealSize) * 100 + 20);

  let reason: string;
  if (revenue >= 500000) {
    reason = `Enterprise deal ($${formatCurrency(revenue)})`;
  } else if (revenue >= 100000) {
    reason = `Mid-market deal ($${formatCurrency(revenue)})`;
  } else if (revenue >= 25000) {
    reason = `SMB deal ($${formatCurrency(revenue)})`;
  } else {
    reason = `Small deal ($${formatCurrency(revenue)})`;
  }

  return { score, reason };
}

function calculateStageScore(lead: ILead): FactorScore {
  const score = STAGE_SCORES[lead.stage] || 10;

  const stageReasons: Record<LeadStage, string> = {
    [LeadStage.NEW]: 'New lead - needs immediate outreach',
    [LeadStage.CONTACTED]: 'Initial contact made',
    [LeadStage.QUALIFIED]: 'Qualified and understood needs',
    [LeadStage.PROPOSAL]: 'Proposal sent - decision pending',
    [LeadStage.NEGOTIATION]: 'In negotiation - close to winning',
    [LeadStage.CLOSED_WON]: 'Won - celebrate!',
    [LeadStage.CLOSED_LOST]: 'Lost - analyze for learnings'
  };

  return { score, reason: stageReasons[lead.stage] };
}

function calculateFitScore(lead: ILead): FactorScore {
  // Simple fit score based on available data
  let score = 50; // Base score

  if (lead.industry) score += 15;
  if (lead.companySize) score += 15;
  if (lead.title) score += 10;
  if (lead.revenue && lead.revenue > 100000) score += 10;

  score = Math.min(100, score);

  const reasons = [];
  if (lead.industry) reasons.push('Industry identified');
  if (lead.companySize) reasons.push('Company size known');
  if (lead.title) reasons.push('Decision maker identified');

  return {
    score,
    reason: reasons.length > 0 ? reasons.join(', ') : 'Limited data - needs research'
  };
}

function determineRecommendedAction(lead: ILead, factors: Record<string, FactorScore>): string {
  const { recency, engagement, stage } = factors;

  // Determine action based on combination of factors
  if (lead.stage === LeadStage.NEW && !lead.lastContactedAt) {
    return 'Send introductory email within 24 hours';
  }

  if (recency.score > 80 && stage.score >= 50) {
    return 'Schedule follow-up call to advance deal';
  }

  if (engagement.score < 40) {
    return 'Send nurturing content to increase engagement';
  }

  if (stage.score >= 75 && stage.score < 90) {
    return 'Prepare for negotiation - get legal/compliance ready';
  }

  if (recency.score < 50) {
    return 'Immediate follow-up required - deal at risk';
  }

  return 'Continue current engagement strategy';
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toString();
}
