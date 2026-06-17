import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

interface LeadScoreInput {
  company_name?: string;
  company_size?: string;
  industry?: string;
  website_traffic?: number;
  employees_count?: number;
  revenue?: string;
  has_job_postings?: boolean;
  recent_funding?: boolean;
  social_engagement?: number;
  email_opens?: number;
  email_clicks?: number;
  website_visits?: number;
  demo_requested?: boolean;
  trial_started?: boolean;
}

interface ScoreBreakdown {
  firmographic: number;
  engagement: number;
  behavioral: number;
  intent: number;
}

// Scoring weights
const SCORING_WEIGHTS = {
  company_size: {
    'enterprise': 20,
    'mid-market': 15,
    'smb': 10,
    'startup': 5
  },
  industry_match: 15,
  employees: (count: number) => Math.min(count / 50, 20),
  website_traffic: (traffic: number) => Math.min(traffic / 1000, 15),
  job_postings: 10,
  recent_funding: 15,
  social_engagement: (engagement: number) => Math.min(engagement / 50, 10),
  email_metrics: {
    open: 0.5,
    click: 2,
    weight_max: 15
  },
  website_visits: (visits: number) => Math.min(visits * 0.3, 20),
  demo_requested: 25,
  trial_started: 30
};

// Calculate lead score
function calculateScore(lead: LeadScoreInput): { total: number; breakdown: ScoreBreakdown; tier: string; factors: string[] } {
  const breakdown: ScoreBreakdown = { firmographic: 0, engagement: 0, behavioral: 0, intent: 0 };
  const factors: string[] = [];

  // Firmographic scoring
  const sizeKey = lead.company_size?.toLowerCase() as keyof typeof SCORING_WEIGHTS.company_size;
  if (sizeKey && SCORING_WEIGHTS.company_size[sizeKey]) {
    breakdown.firmographic += SCORING_WEIGHTS.company_size[sizeKey];
    factors.push(`${lead.company_size} company (+${SCORING_WEIGHTS.company_size[sizeKey]})`);
  }

  if (lead.industry) {
    breakdown.firmographic += SCORING_WEIGHTS.industry_match;
    factors.push(`Industry match (+${SCORING_WEIGHTS.industry_match})`);
  }

  if (lead.employees_count) {
    const empScore = SCORING_WEIGHTS.employees(lead.employees_count);
    breakdown.firmographic += empScore;
    if (empScore > 5) factors.push(`${lead.employees_count} employees (+${empScore.toFixed(1)})`);
  }

  // Engagement scoring
  if (lead.email_opens) {
    const emailScore = Math.min(lead.email_opens * SCORING_WEIGHTS.email_metrics.open, SCORING_WEIGHTS.email_metrics.weight_max);
    breakdown.engagement += emailScore;
    if (emailScore > 2) factors.push(`${lead.email_opens} email opens (+${emailScore.toFixed(1)})`);
  }

  if (lead.email_clicks) {
    const clickScore = Math.min(lead.email_clicks * SCORING_WEIGHTS.email_metrics.click, SCORING_WEIGHTS.email_metrics.weight_max);
    breakdown.engagement += clickScore;
    if (clickScore > 2) factors.push(`${lead.email_clicks} email clicks (+${clickScore.toFixed(1)})`);
  }

  if (lead.social_engagement) {
    const socialScore = SCORING_WEIGHTS.social_engagement(lead.social_engagement);
    breakdown.engagement += socialScore;
    if (socialScore > 2) factors.push(`Social engagement (+${socialScore.toFixed(1)})`);
  }

  // Behavioral scoring
  if (lead.website_visits) {
    const visitScore = SCORING_WEIGHTS.website_visits(lead.website_visits);
    breakdown.behavioral += visitScore;
    if (visitScore > 3) factors.push(`${lead.website_visits} website visits (+${visitScore.toFixed(1)})`);
  }

  if (lead.website_traffic) {
    const trafficScore = SCORING_WEIGHTS.website_traffic(lead.website_traffic);
    breakdown.behavioral += trafficScore;
    if (trafficScore > 3) factors.push(`Website traffic (+${trafficScore.toFixed(1)})`);
  }

  // Intent scoring
  if (lead.has_job_postings) {
    breakdown.intent += SCORING_WEIGHTS.job_postings;
    factors.push('Active hiring (+10)');
  }

  if (lead.recent_funding) {
    breakdown.intent += SCORING_WEIGHTS.recent_funding;
    factors.push('Recent funding (+15)');
  }

  if (lead.demo_requested) {
    breakdown.intent += SCORING_WEIGHTS.demo_requested;
    factors.push('Demo requested (+25)');
  }

  if (lead.trial_started) {
    breakdown.intent += SCORING_WEIGHTS.trial_started;
    factors.push('Trial started (+30)');
  }

  // Calculate total
  const total = Math.min(Math.round(
    breakdown.firmographic +
    breakdown.engagement +
    breakdown.behavioral +
    breakdown.intent
  ), 100);

  // Determine tier
  let tier: string;
  if (total >= 80) tier = 'Hot';
  else if (total >= 60) tier = 'Warm';
  else if (total >= 40) tier = 'Cool';
  else tier = 'Cold';

  return { total, breakdown, tier, factors };
}

// POST /score - Score a lead
router.post('/', (req: Request, res: Response) => {
  const lead = req.body as LeadScoreInput;

  if (!lead || Object.keys(lead).length === 0) {
    res.status(400).json({
      success: false,
      error: 'Lead data is required'
    });
    return;
  }

  const result = calculateScore(lead);

  res.json({
    success: true,
    data: {
      lead_id: randomUUID(),
      score: result.total,
      tier: result.tier,
      breakdown: result.breakdown,
      factors: result.factors,
      recommendations: getRecommendations(result.tier, lead)
    }
  });
});

function getRecommendations(tier: string, lead: LeadScoreInput): string[] {
  const recommendations: string[] = [];

  if (tier === 'Hot') {
    recommendations.push('Priority follow-up within 24 hours');
    recommendations.push('Schedule executive meeting');
    recommendations.push('Prepare custom demo');
  } else if (tier === 'Warm') {
    recommendations.push('Follow-up within 48 hours');
    recommendations.push('Share relevant case studies');
    recommendations.push('Invite to upcoming webinar');
  } else if (tier === 'Cool') {
    recommendations.push('Add to nurture sequence');
    recommendations.push('Share educational content');
    recommendations.push('Monitor for engagement triggers');
  } else {
    recommendations.push('Long-term nurture campaign');
    recommendations.push('Quarterly check-in');
    recommendations.push('Monitor for buying signals');
  }

  return recommendations;
}

export default router;
