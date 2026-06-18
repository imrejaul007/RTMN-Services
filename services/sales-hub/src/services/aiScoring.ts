/**
 * AI Scoring Service
 * Unified lead and deal scoring with AI-powered insights
 */

import winston from 'winston';
import { Lead, ScoreBreakdown, ScoreGrade, LeadQuality } from '../models/Lead';
import { Deal } from '../models/Deal';

export interface ScoredLead extends Lead {
  score: {
    total: number;
    grade: ScoreGrade;
    factors: ScoreFactors;
  };
  breakdown: ScoreBreakdown;
  quality: LeadQuality;
}

export interface ScoreFactors {
  engagement: number;
  technical: number;
  budget: number;
  authority: number;
  timing: number;
  trust: number;
  brand: number;
}

export interface ScoringWeights {
  engagement: number;
  technical: number;
  budget: number;
  authority: number;
  timing: number;
  trust: number;
  brand: number;
}

export interface AIScoringResult {
  score: {
    total: number;
    grade: ScoreGrade;
    factors: ScoreFactors;
  };
  breakdown: ScoreBreakdown;
  quality: LeadQuality;
  recommendations: string[];
  insights: string[];
}

export class AIScoringService {
  private logger: winston.Logger;
  private weights: ScoringWeights;

  constructor(logger?: winston.Logger) {
    this.logger = logger || console;
    this.weights = {
      engagement: parseFloat(process.env.LEAD_ENGAGEMENT_WEIGHT || '0.3'),
      technical: parseFloat(process.env.LEAD_TECHNICAL_WEIGHT || '0.25'),
      budget: parseFloat(process.env.LEAD_BUDGET_WEIGHT || '0.25'),
      authority: parseFloat(process.env.LEAD_AUTHORITY_WEIGHT || '0.2'),
      timing: 0.15,
      trust: 0.1,
      brand: 0.1
    };
  }

  /**
   * Score a lead with all available signals
   */
  async scoreLead(lead: Lead, bridges: any): Promise<AIScoringResult> {
    this.logger.info('Scoring lead', { leadId: lead.id, email: lead.email });

    // Initialize factors
    const factors: ScoreFactors = {
      engagement: 0,
      technical: 0,
      budget: 0,
      authority: 0,
      timing: 0,
      trust: 0,
      brand: 0
    };

    // 1. Engagement scoring
    factors.engagement = this.scoreEngagement(lead);

    // 2. Technical fit scoring
    factors.technical = this.scoreTechnicalFit(lead);

    // 3. Budget scoring
    factors.budget = this.scoreBudget(lead);

    // 4. Authority scoring
    factors.authority = this.scoreAuthority(lead);

    // 5. Timing scoring
    factors.timing = this.scoreTiming(lead);

    // 6. Trust scoring (from trust service if available)
    if (lead.trustScore) {
      factors.trust = lead.trustScore.overall;
    }

    // 7. Brand affinity scoring
    if (lead.brandAffinity) {
      factors.brand = this.scoreBrandAffinity(lead.brandAffinity);
    }

    // Calculate weighted score
    const totalScore = this.calculateWeightedScore(factors);

    // Generate breakdown
    const breakdown = this.generateBreakdown(factors, totalScore);

    // Determine grade
    const grade = this.getGrade(totalScore);

    // Determine quality
    const quality = this.getQuality(totalScore, lead);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, lead);

    // Generate insights
    const insights = this.generateInsights(factors, lead);

    return {
      score: { total: totalScore, grade, factors },
      breakdown,
      quality,
      recommendations,
      insights
    };
  }

  /**
   * Score engagement based on touchpoints and activities
   */
  private scoreEngagement(lead: Lead): number {
    let score = 0;

    // Touchpoint count (max 30 points)
    const touchpointCount = lead.touchpoints?.length || 0;
    score += Math.min(30, touchpointCount * 5);

    // Recent activity (max 20 points)
    if (lead.lastActivity) {
      const daysSinceActivity = (Date.now() - new Date(lead.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity <= 1) score += 20;
      else if (daysSinceActivity <= 7) score += 15;
      else if (daysSinceActivity <= 14) score += 10;
      else if (daysSinceActivity <= 30) score += 5;
    }

    // Source quality (max 15 points)
    const sourceScores: Record<string, number> = {
      referral: 15,
      event: 12,
      content: 10,
      linkedin: 10,
      website: 8,
      paid_ads: 5,
      cold_outreach: 5,
      other: 3
    };
    score += sourceScores[lead.source] || 5;

    // Temperature bonus (max 10 points)
    const tempScores: Record<string, number> = { hot: 10, warm: 6, cold: 2 };
    score += tempScores[lead.temperature] || 5;

    // Engagement trend (max 15 points)
    const engagementTrend = this.calculateEngagementTrend(lead.touchpoints);
    score += engagementTrend;

    // Next follow-up scheduled (max 10 points)
    if (lead.nextFollowUp) {
      const daysToFollowUp = (new Date(lead.nextFollowUp).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysToFollowUp <= 3) score += 10;
      else if (daysToFollowUp <= 7) score += 7;
      else score += 3;
    }

    return Math.min(100, score);
  }

  /**
   * Score technical fit based on enrichment data
   */
  private scoreTechnicalFit(lead: Lead): number {
    let score = 0;

    // Technology stack relevance (max 40 points)
    if (lead.enrichment?.technology) {
      const tech = lead.enrichment.technology;

      // Relevant technologies that indicate readiness
      const relevantTech = ['Salesforce', 'HubSpot', 'CRM', 'Marketing Automation', 'Analytics', 'ERP'];
      const techMatches = relevantTech.filter(t =>
        Object.values(tech).some(arr => arr?.includes(t))
      ).length;

      score += Math.min(40, techMatches * 10);
    }

    // Company size fit (max 30 points)
    const sizeScores: Record<string, number> = {
      '51-200': 20,
      '201-500': 25,
      '501-1000': 30,
      '1001-5000': 30,
      '5000+': 25
    };
    score += sizeScores[lead.companySize || ''] || 10;

    // Industry match (max 20 points)
    const targetIndustries = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail'];
    if (lead.industry && targetIndustries.includes(lead.industry)) {
      score += 20;
    } else if (lead.industry) {
      score += 10;
    }

    // Funding stage (max 10 points)
    if (lead.enrichment?.funding) {
      const funding = lead.enrichment.funding;
      if (funding.totalRaised && funding.totalRaised > 100000000) score += 10;
      else if (funding.totalRaised && funding.totalRaised > 10000000) score += 7;
      else if (funding.totalRaised) score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Score budget availability
   */
  private scoreBudget(lead: Lead): number {
    let score = 0;

    if (!lead.budget) {
      // Infer from company size if not explicitly set
      const inferredBudget: Record<string, { min: number; max: number }> = {
        '1-10': { min: 10000, max: 50000 },
        '11-50': { min: 25000, max: 100000 },
        '51-200': { min: 50000, max: 250000 },
        '201-500': { min: 100000, max: 500000 },
        '501-1000': { min: 250000, max: 1000000 },
        '1001-5000': { min: 500000, max: 2500000 },
        '5000+': { min: 1000000, max: 10000000 }
      };
      lead.budget = inferredBudget[lead.companySize || ''] || { min: 10000, max: 50000 };
    }

    // Budget range score
    const budgetMax = lead.budget.max;
    if (budgetMax >= 100000) score += 40;
    else if (budgetMax >= 50000) score += 30;
    else if (budgetMax >= 25000) score += 20;
    else if (budgetMax >= 10000) score += 15;
    else score += 10;

    // Budget clarity
    if (lead.budget.min && lead.budget.max) {
      const range = lead.budget.max - lead.budget.min;
      const midPoint = (lead.budget.max + lead.budget.min) / 2;
      // Smaller range = more clarity
      const clarity = 1 - (range / midPoint);
      score += Math.round(clarity * 20);
    }

    // Currency (USD preference)
    if (lead.budget.currency === 'USD') score += 10;

    return Math.min(100, score);
  }

  /**
   * Score authority level
   */
  private scoreAuthority(lead: Lead): number {
    if (!lead.authority) {
      // Infer from title if not set
      const title = lead.title?.toLowerCase() || '';
      if (title.includes('ceo') || title.includes('founder') || title.includes('owner') || title.includes('cto') || title.includes('cio')) {
        lead.authority = 'cxo';
      } else if (title.includes('vp') || title.includes('vice president') || title.includes('director')) {
        lead.authority = 'vp';
      } else if (title.includes('manager') || title.includes('head of')) {
        lead.authority = 'manager';
      } else {
        lead.authority = 'individual';
      }
    }

    const authorityScores: Record<string, number> = {
      cxo: 100,
      vp: 80,
      director: 70,
      manager: 50,
      individual: 30
    };

    return authorityScores[lead.authority] || 30;
  }

  /**
   * Score purchase timing
   */
  private scoreTiming(lead: Lead): number {
    if (!lead.timeline) {
      // Infer from urgency signals
      if (lead.temperature === 'hot') {
        lead.timeline = '1_month';
      } else if (lead.temperature === 'warm') {
        lead.timeline = '3_months';
      } else {
        lead.timeline = '6_months';
      }
    }

    const timelineScores: Record<string, number> = {
      immediate: 100,
      '1_month': 85,
      '3_months': 60,
      '6_months': 40,
      '1_year': 20,
      exploring: 10
    };

    return timelineScores[lead.timeline] || 30;
  }

  /**
   * Score brand affinity
   */
  private scoreBrandAffinity(brandAffinity: any): number {
    let score = 50; // Base score

    // Sentiment bonus
    const sentimentScores: Record<string, number> = {
      positive: 25,
      neutral: 0,
      negative: -15
    };
    score += sentimentScores[brandAffinity.sentiment] || 0;

    // Mentions bonus (logarithmic scale)
    const mentions = brandAffinity.brandMentions || 0;
    score += Math.min(15, Math.log10(mentions + 1) * 5);

    // Share of voice
    const sov = brandAffinity.shareOfVoice || 0;
    score += Math.min(10, sov / 10);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate weighted total score
   */
  private calculateWeightedScore(factors: ScoreFactors): number {
    const total =
      factors.engagement * this.weights.engagement +
      factors.technical * this.weights.technical +
      factors.budget * this.weights.budget +
      factors.authority * this.weights.authority +
      factors.timing * this.weights.timing +
      factors.trust * this.weights.trust +
      factors.brand * this.weights.brand;

    return Math.round(total);
  }

  /**
   * Generate score breakdown
   */
  private generateBreakdown(factors: ScoreFactors, total: number): ScoreBreakdown {
    const baseScore = 20; // Base starting score
    const maxBonus = 80; // Maximum bonus points available

    return {
      baseScore,
      engagementBonus: Math.round((factors.engagement / 100) * maxBonus * this.weights.engagement * 10) / 10,
      technicalBonus: Math.round((factors.technical / 100) * maxBonus * this.weights.technical * 10) / 10,
      budgetBonus: Math.round((factors.budget / 100) * maxBonus * this.weights.budget * 10) / 10,
      authorityBonus: Math.round((factors.authority / 100) * maxBonus * this.weights.authority * 10) / 10,
      trustBonus: Math.round((factors.trust / 100) * maxBonus * this.weights.trust * 10) / 10,
      brandBonus: Math.round((factors.brand / 100) * maxBonus * this.weights.brand * 10) / 10,
      penalty: 0,
      total
    };
  }

  /**
   * Get grade from score
   */
  private getGrade(score: number): ScoreGrade {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  /**
   * Get quality from score and lead data
   */
  private getQuality(score: number, lead: Lead): LeadQuality {
    if (score >= 80 && lead.authority === 'cxo') return 'premium';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Calculate engagement trend
   */
  private calculateEngagementTrend(touchpoints: any[]): number {
    if (!touchpoints || touchpoints.length < 3) return 5;

    // Check for recent high engagement
    const recentTouchpoints = touchpoints.filter(t =>
      Date.now() - new Date(t.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
    );

    const olderTouchpoints = touchpoints.filter(t =>
      Date.now() - new Date(t.timestamp).getTime() >= 7 * 24 * 60 * 60 * 1000 &&
      Date.now() - new Date(t.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000
    );

    if (recentTouchpoints.length > olderTouchpoints.length * 0.5) {
      return 15; // Increasing engagement
    } else if (recentTouchpoints.length > 0) {
      return 8; // Stable engagement
    }
    return 0; // Declining or no recent engagement
  }

  /**
   * Generate scoring recommendations
   */
  private generateRecommendations(factors: ScoreFactors, lead: Lead): string[] {
    const recommendations: string[] = [];

    if (factors.engagement < 40) {
      recommendations.push('Increase engagement through multi-channel outreach');
    }

    if (factors.technical < 50) {
      recommendations.push('Research technical environment for better positioning');
    }

    if (factors.budget < 50) {
      recommendations.push('Qualify budget with discovery questions');
    }

    if (factors.authority < 50) {
      recommendations.push('Try to connect with decision-maker');
    }

    if (factors.timing < 50) {
      recommendations.push('Set timeline expectation and nurture for future');
    }

    if (factors.trust < 50) {
      recommendations.push('Build trust through social proof and case studies');
    }

    if (lead.painPoints?.length === 0) {
      recommendations.push('Identify and document pain points');
    }

    return recommendations;
  }

  /**
   * Generate scoring insights
   */
  private generateInsights(factors: ScoreFactors, lead: Lead): string[] {
    const insights: string[] = [];

    // Strengths
    const strengths = [];
    if (factors.engagement >= 70) strengths.push('High engagement activity');
    if (factors.authority >= 80) strengths.push('Decision-maker level contact');
    if (factors.budget >= 70) strengths.push('Clear budget alignment');
    if (factors.timing >= 70) strengths.push('Purchase-ready timeline');

    if (strengths.length > 0) {
      insights.push(`Strengths: ${strengths.join(', ')}`);
    }

    // Concerns
    const concerns = [];
    if (factors.engagement < 30) concerns.push('Low engagement');
    if (factors.authority < 40) concerns.push('Not a decision-maker');
    if (factors.budget < 30) concerns.push('Budget unclear');
    if (factors.timing > 90) concerns.push('Timeline may be aggressive');

    if (concerns.length > 0) {
      insights.push(`Concerns: ${concerns.join(', ')}`);
    }

    // Next best action hint
    if (factors.authority >= 70 && factors.timing >= 60) {
      insights.push('Ready for direct sales conversation');
    } else if (factors.engagement >= 60) {
      insights.push('Focus on deepening relationship');
    } else {
      insights.push('Need more nurturing');
    }

    return insights;
  }

  /**
   * Score a deal
   */
  async scoreDeal(deal: Deal): Promise<number> {
    let score = 50; // Base score

    // Stage progression bonus
    const stageScores: Record<string, number> = {
      prospecting: 5,
      qualification: 15,
      needs_analysis: 25,
      proposal: 35,
      negotiation: 45,
      closing: 55
    };
    score += stageScores[deal.stage] || 0;

    // Value bonus (larger deals get more attention)
    if (deal.value.amount >= 100000) score += 20;
    else if (deal.value.amount >= 50000) score += 15;
    else if (deal.value.amount >= 25000) score += 10;
    else if (deal.value.amount >= 10000) score += 5;

    // Stakeholder engagement
    if (deal.stakeholders?.length >= 4) score += 15;
    else if (deal.stakeholders?.length >= 2) score += 10;
    else if (deal.stakeholders?.length >= 1) score += 5;

    // Risk factors
    if (deal.riskIndicators?.length > 0) {
      const criticalRisks = deal.riskIndicators.filter(r => r.severity === 'critical' || r.severity === 'high');
      score -= criticalRisks.length * 15;
    }

    // Trust score
    if (deal.trustScore) {
      score += (deal.trustScore.overall - 50) / 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Update scoring weights
   */
  updateWeights(newWeights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...newWeights };

    // Normalize weights
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (total !== 1) {
      Object.keys(this.weights).forEach(key => {
        (this.weights as any)[key] = (this.weights as any)[key] / total;
      });
    }
  }
}
