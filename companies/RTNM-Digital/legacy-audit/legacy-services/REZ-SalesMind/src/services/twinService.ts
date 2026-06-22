/**
 * Twin Service - AI-powered prospect twins for sales intelligence
 *
 * Uses HOJAI AI for twin creation and enrichment
 * Uses REZ CRM Hub for contact data
 */

import { HojaiAIClient } from './hojaiClient.js';
import { REZCRMClient } from './rezCRMClient.js';

export interface ProspectTwin {
  id: string;
  name: string;
  company: string;
  title: string;
  avatar?: string;
  personality: {
    communicationStyle: 'formal' | 'casual' | 'direct' | 'collaborative';
    preferredChannel: 'email' | 'phone' | 'linkedin' | 'in-person';
    responseTime: 'fast' | 'medium' | 'slow';
    decisionStyle: 'analytical' | 'intuitive' | 'driven';
  };
  preferences: {
    topics: string[];
    avoid: string[];
    triggers: string[];
  };
  history: {
    totalCalls: number;
    totalEmails: number;
    meetings: number;
    avgDealSize: number;
    conversionRate: number;
  };
  insights: {
    bestTimeToContact: string;
    buyingSignals: string[];
    objections: string[];
    competitivePosition: string;
  };
  score: number;
  lastUpdated: Date;
}

export class TwinService {
  constructor(
    private hojaiClient: HojaiAIClient,
    private rezCRMClient: REZCRMClient
  ) {}

  /**
   * Create or update a prospect twin
   */
  async createTwin(leadId: string): Promise<ProspectTwin | null> {
    const leadResult = await this.rezCRMClient.getLead(leadId);
    const lead = leadResult.data;
    if (!lead) return null;

    // Get AI-generated insights
    const twinData = await this.hojaiClient.getProspectTwin(leadId);

    // Build twin from available data
    const twin: ProspectTwin = {
      id: leadId,
      name: lead.name,
      company: lead.company || 'Unknown',
      title: lead.title || '',
      personality: this.inferPersonality(lead),
      preferences: twinData?.preferences || this.defaultPreferences(),
      history: twinData?.history || this.emptyHistory(),
      insights: twinData?.insights || this.defaultInsights(),
      score: lead.score,
      lastUpdated: new Date()
    };

    return twin;
  }

  /**
   * Get twin for a prospect
   */
  async getTwin(leadId: string): Promise<ProspectTwin | null> {
    return this.createTwin(leadId);
  }

  /**
   * Update twin with new interaction data
   */
  async updateTwin(leadId: string, interaction: any): Promise<ProspectTwin | null> {
    const twin = await this.getTwin(leadId);
    if (!twin) return null;

    // Update based on interaction
    twin.history.totalCalls += interaction.type === 'call' ? 1 : 0;
    twin.history.totalEmails += interaction.type === 'email' ? 1 : 0;
    twin.history.meetings += interaction.type === 'meeting' ? 1 : 0;
    twin.lastUpdated = new Date();

    // Refine personality based on interaction
    this.updatePersonality(twin, interaction);

    return twin;
  }

  /**
   * Generate talking points for a twin
   */
  async getTalkingPoints(leadId: string): Promise<string[]> {
    const twin = await this.getTwin(leadId);
    if (!twin) return [];

    const points: string[] = [];

    // Based on preferences
    twin.preferences.topics.forEach(topic => {
      points.push('Ask about ' + topic);
    });

    // Based on insights
    if (twin.insights.buyingSignals.length > 0) {
      points.push('Mention: ' + twin.insights.buyingSignals[0]);
    }

    // Based on history
    if (twin.history.conversionRate > 0.5) {
      points.push('Emphasize value proposition - previous positive experience');
    } else {
      points.push('Focus on education and trust building');
    }

    return points;
  }

  /**
   * Predict best next action
   */
  async predictNextAction(leadId: string): Promise<{ action: string; reason: string; confidence: number }> {
    const twin = await this.getTwin(leadId);
    if (!twin) {
      return { action: 'Initial outreach', reason: 'No data available', confidence: 0.3 };
    }

    // Decision logic based on twin data
    if (twin.history.totalCalls === 0 && twin.history.totalEmails === 0) {
      return {
        action: 'Send introduction email',
        reason: 'No previous contact - start with low-friction channel',
        confidence: 0.8
      };
    }

    if (twin.history.totalCalls < 3 && twin.personality.responseTime === 'slow') {
      return {
        action: 'Schedule a call',
        reason: 'Prefers thoughtful communication - give time to respond',
        confidence: 0.7
      };
    }

    if (twin.score > 70 && twin.history.conversionRate > 0.3) {
      return {
        action: 'Request meeting',
        reason: 'High-quality prospect with positive history',
        confidence: 0.9
      };
    }

    return {
      action: 'Follow-up email',
      reason: 'Maintain engagement while gathering more data',
      confidence: 0.6
    };
  }

  private inferPersonality(lead: any): ProspectTwin['personality'] {
    // Infer from title and company
    if (lead.title?.toLowerCase().includes('ceo') || lead.title?.toLowerCase().includes('founder')) {
      return {
        communicationStyle: 'direct',
        preferredChannel: 'phone',
        responseTime: 'fast',
        decisionStyle: 'intuitive'
      };
    }

    if (lead.title?.toLowerCase().includes('manager') || lead.title?.toLowerCase().includes('director')) {
      return {
        communicationStyle: 'formal',
        preferredChannel: 'email',
        responseTime: 'medium',
        decisionStyle: 'analytical'
      };
    }

    return {
      communicationStyle: 'collaborative',
      preferredChannel: 'email',
      responseTime: 'medium',
      decisionStyle: 'analytical'
    };
  }

  private defaultPreferences(): ProspectTwin['preferences'] {
    return {
      topics: ['industry trends', 'efficiency', 'cost savings'],
      avoid: ['aggressive selling', 'technical jargon'],
      triggers: ['ROI', 'results', 'proven track record']
    };
  }

  private emptyHistory(): ProspectTwin['history'] {
    return {
      totalCalls: 0,
      totalEmails: 0,
      meetings: 0,
      avgDealSize: 0,
      conversionRate: 0
    };
  }

  private defaultInsights(): ProspectTwin['insights'] {
    return {
      bestTimeToContact: '9 AM - 11 AM',
      buyingSignals: [],
      objections: ['budget', 'timing', 'priority'],
      competitivePosition: 'Unknown'
    };
  }

  private updatePersonality(twin: ProspectTwin, interaction: any): void {
    // Refine based on interaction outcome
    if (interaction.outcome === 'positive') {
      if (twin.personality.responseTime === 'slow') {
        twin.personality.responseTime = 'medium';
      }
    }

    if (interaction.responseTime && interaction.responseTime < 2) {
      twin.personality.responseTime = 'fast';
    }
  }
}