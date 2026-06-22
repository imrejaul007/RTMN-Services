/**
 * Intelligence Engine - Combines HOJAI AI, AdBazaar, and REZ CRM Hub
 *
 * Purpose: Generate unified sales intelligence from multiple data sources
 */

import { HojaiAIClient, MarketSignal, BusinessIntelligence } from './hojaiClient.js';
import { AdBazaarClient, Campaign, CRMContact } from './adbazaarClient.js';
import { REZCRMClient, Lead, Deal, Activity } from './rezCRMClient.js';

export interface SalesIntelligence {
  leadId: string;
  overallScore: number;
  leadData: Lead;
  companyIntel?: BusinessIntelligence;
  marketSignals: MarketSignal[];
  campaigns: Campaign[];
  crmContacts: CRMContact[];
  recentActivities: Activity[];
  recommendations: string[];
  nextBestAction: string;
  engagementScore: number;
  conversionProbability: number;
  riskFactors: string[];
  opportunities: string[];
  timestamp: Date;
}

export interface PreCallBrief {
  leadId: string;
  leadName: string;
  company: string;
  title: string;
  score: number;
  stage: string;
  companyIntel: {
    industry: string;
    size: string;
    techStack: string[];
    funding?: string;
  };
  recentActivities: {
    type: string;
    date: Date;
    description: string;
  }[];
  activeCampaigns: {
    name: string;
    status: string;
    conversions: number;
  }[];
  marketContext: {
    signals: MarketSignal[];
    trends: string[];
  };
  talkingPoints: string[];
  recommendedApproach: string;
  questions: string[];
}

export class IntelligenceEngine {
  constructor(
    private hojaiClient: HojaiAIClient,
    private adbazaarClient: AdBazaarClient,
    private rezCRMClient: REZCRMClient
  ) {}

  // Expose clients for route access
  getCRMClient(): REZCRMClient {
    return this.rezCRMClient;
  }

  /**
   * Generate comprehensive sales intelligence for a lead
   */
  async getSalesIntelligence(leadId: string): Promise<SalesIntelligence | null> {
    // Fetch all data sources in parallel
    const [leadResult, activitiesResult, campaigns, contacts] = await Promise.all([
      this.rezCRMClient.getLead(leadId),
      this.rezCRMClient.getActivities(leadId),
      this.adbazaarClient.getCampaigns('default'),
      this.adbazaarClient.getContacts('default'),
    ]);

    const lead = leadResult.data;
    const activities = activitiesResult.data;

    if (!lead) return null;

    // Fetch company intel
    const companyIntel = await this.fetchCompanyIntel(lead);

    // Get market signals from HOJAI AI
    const marketSignals = await this.hojaiClient.getMarketSignals(lead.company || '');

    // Calculate scores
    const { score: aiScore, factors } = await this.hojaiClient.scoreLead(lead);
    const engagementScore = this.calculateEngagementScore(activities);
    const conversionProbability = this.calculateConversionProbability(lead, aiScore, engagementScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(lead, aiScore, engagementScore, factors);
    const riskFactors = this.identifyRiskFactors(lead, activities);
    const opportunities = this.identifyOpportunities(lead, marketSignals);

    return {
      leadId,
      overallScore: aiScore,
      leadData: lead,
      companyIntel: companyIntel || undefined,
      marketSignals,
      campaigns,
      crmContacts: contacts,
      recentActivities: activities.slice(0, 5),
      recommendations,
      nextBestAction: recommendations[0] || 'Schedule follow-up call',
      engagementScore,
      conversionProbability,
      riskFactors,
      opportunities,
      timestamp: new Date()
    };
  }

  /**
   * Generate pre-call brief for a sales rep
   */
  async getPreCallBrief(leadId: string): Promise<PreCallBrief | null> {
    const leadResult = await this.rezCRMClient.getLead(leadId);
    const lead = leadResult.data;
    if (!lead) return null;

    // Get company intelligence from HOJAI AI
    const companyIntel = await this.hojaiClient.getBusinessIntelligence(lead.company || '');
    const marketSignals = await this.hojaiClient.getMarketSignals(lead.company || '');

    // Get recent activities
    const activitiesResult = await this.rezCRMClient.getActivities(leadId);
    const activities = activitiesResult.data;
    const recentActivities = activities.slice(0, 3).map(a => ({
      type: a.type,
      date: a.timestamp,
      description: a.description || a.subject
    }));

    // Get active campaigns
    const campaigns = await this.adbazaarClient.getCampaigns('default');
    const activeCampaigns = campaigns
      .filter(c => c.status === 'active')
      .slice(0, 3)
      .map(c => ({
        name: c.name,
        status: c.status,
        conversions: c.conversions
      }));

    // Generate talking points
    const talkingPoints = this.generateTalkingPoints(lead, companyIntel, marketSignals);
    const recommendedApproach = this.recommendApproach(lead);
    const questions = this.generateQuestions(lead, companyIntel);

    return {
      leadId,
      leadName: lead.name,
      company: lead.company || '',
      title: lead.title || '',
      score: lead.score,
      stage: lead.stage,
      companyIntel: {
        industry: companyIntel?.industry || 'Unknown',
        size: companyIntel?.size || 'Unknown',
        techStack: companyIntel?.techStack || [],
        funding: companyIntel?.funding
      },
      recentActivities,
      activeCampaigns,
      marketContext: {
        signals: marketSignals.slice(0, 5),
        trends: marketSignals.filter(s => s.type === 'trend').map(s => s.content)
      },
      talkingPoints,
      recommendedApproach,
      questions
    };
  }

  /**
   * Get pipeline intelligence
   */
  async getPipelineIntelligence(): Promise<any> {
    const [leadsResult, dealsResult, pipelineResult] = await Promise.all([
      this.rezCRMClient.getLeads(),
      this.rezCRMClient.getDeals(),
      this.rezCRMClient.getPipelineSummary()
    ]);

    const leads = leadsResult.data;
    const deals = dealsResult.data;
    const pipeline = pipelineResult.data;

    // Analyze stage distribution
    const stageAnalysis = this.analyzeStages(leads, deals);

    // Get market insights
    const marketInsights = await this.hojaiClient.getMarketSignals('sales trends');

    return {
      totalLeads: leads.length,
      totalDeals: deals.length,
      stageAnalysis,
      pipelineValue: pipeline?.totalValue || 0,
      conversionRate: this.calculateConversionRate(leads),
      marketInsights,
      recommendations: this.generatePipelineRecommendations(stageAnalysis)
    };
  }

  private async fetchCompanyIntel(lead: Lead): Promise<BusinessIntelligence | null> {
    if (!lead?.company) return null;
    return this.hojaiClient.getBusinessIntelligence(lead.company);
  }

  private calculateEngagementScore(activities: Activity[]): number {
    if (!activities.length) return 0;

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let score = 0;
    activities.forEach(a => {
      const age = now - new Date(a.timestamp).getTime();
      const recency = Math.max(0, 1 - age / thirtyDaysAgo);
      const typeWeight = a.type === 'call' ? 3 : a.type === 'meeting' ? 4 : a.type === 'email' ? 2 : 1;
      score += recency * typeWeight;
    });

    return Math.min(100, Math.round(score));
  }

  private calculateConversionProbability(lead: Lead, aiScore: number, engagementScore: number): number {
    const stageWeights: Record<string, number> = {
      new: 0.1,
      contacted: 0.2,
      qualified: 0.4,
      proposal: 0.6,
      negotiation: 0.8,
      closed: 1.0
    };

    const stageWeight = stageWeights[lead.stage] || 0.2;
    const scoreFactor = aiScore / 100;
    const engagementFactor = engagementScore / 100;

    return Math.round((stageWeight * 0.4 + scoreFactor * 0.3 + engagementFactor * 0.3) * 100);
  }

  private generateRecommendations(lead: Lead, aiScore: number, engagementScore: number, factors: string[]): string[] {
    const recommendations: string[] = [];

    if (engagementScore < 30) {
      recommendations.push('Increase engagement - send personalized email');
    }

    if (aiScore > 70) {
      recommendations.push('High-value lead - prioritize with direct call');
    }

    if (lead.stage === 'new') {
      recommendations.push('Move to contacted stage - initial outreach required');
    }

    if (factors.length > 0) {
      recommendations.push('Leverage: ' + factors.slice(0, 2).join(', '));
    }

    if (!lead.phone && lead.email) {
      recommendations.push('Obtain phone number for better conversion');
    }

    return recommendations;
  }

  private identifyRiskFactors(lead: Lead, activities: Activity[]): string[] {
    const risks: string[] = [];

    if (activities.length === 0) {
      risks.push('No recent activity - lead may be cold');
    }

    const lastActivity = activities[0];
    if (lastActivity) {
      const daysSince = (Date.now() - new Date(lastActivity.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 14) {
        risks.push('No contact in ' + Math.round(daysSince) + ' days');
      }
    }

    if (lead.score < 30) {
      risks.push('Low lead score - may not convert');
    }

    return risks;
  }

  private identifyOpportunities(lead: Lead, signals: MarketSignal[]): string[] {
    const opportunities: string[] = [];

    const positiveSignals = signals.filter(s => s.sentiment === 'positive');
    if (positiveSignals.length > 0) {
      opportunities.push('Positive market signals - good timing for outreach');
    }

    if (lead.company) {
      const expansionSignals = signals.filter(s =>
        s.content.toLowerCase().includes('expansion') ||
        s.content.toLowerCase().includes('growth') ||
        s.content.toLowerCase().includes('funding')
      );
      if (expansionSignals.length > 0) {
        opportunities.push('Company in growth phase - potential for upsell');
      }
    }

    return opportunities;
  }

  private generateTalkingPoints(lead: Lead, intel: BusinessIntelligence | null, signals: MarketSignal[]): string[] {
    const points: string[] = [];

    if (lead.company) {
      points.push(lead.company + ' - recent developments and news');
    }

    if (intel?.industry) {
      points.push('Industry trends in ' + intel.industry);
    }

    const relevantSignals = signals.filter(s => s.relevance > 0.7);
    relevantSignals.forEach(s => {
      points.push(s.content);
    });

    if (intel?.techStack?.length) {
      points.push('Technical setup: ' + intel.techStack.slice(0, 3).join(', '));
    }

    return points.slice(0, 5);
  }

  private recommendApproach(lead: Lead): string {
    if (lead.score > 80) {
      return 'High-priority - direct call with executive sponsor';
    } else if (lead.score > 60) {
      return 'Medium-priority - personalized email followed by call';
    } else {
      return 'Low-priority - automated nurture sequence';
    }
  }

  private generateQuestions(lead: Lead, intel: BusinessIntelligence | null): string[] {
    const questions: string[] = [];

    questions.push('What are your current priorities for ' + (intel?.industry || 'your business') + '?');

    if (intel?.size === 'enterprise') {
      questions.push('What is your decision-making process for new solutions?');
    } else {
      questions.push('What challenges are you facing right now?');
    }

    questions.push('What would success look like for you?');

    return questions;
  }

  private analyzeStages(leads: Lead[], deals: Deal[]): any {
    const stageMap = new Map<string, { count: number; value: number }>();

    leads.forEach(l => {
      const current = stageMap.get(l.stage) || { count: 0, value: 0 };
      stageMap.set(l.stage, { count: current.count + 1, value: current.value });
    });

    deals.forEach(d => {
      const current = stageMap.get(d.stage) || { count: 0, value: 0 };
      stageMap.set(d.stage, { count: current.count + 1, value: current.value + d.value });
    });

    return Object.fromEntries(stageMap);
  }

  private calculateConversionRate(leads: Lead[]): number {
    const converted = leads.filter(l => l.stage === 'closed').length;
    return leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0;
  }

  private generatePipelineRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.new?.count > 50) {
      recommendations.push('High volume of new leads - consider qualification campaign');
    }

    if (analysis.qualified?.count < 5) {
      recommendations.push('Low qualification rate - review lead scoring criteria');
    }

    return recommendations;
  }
}