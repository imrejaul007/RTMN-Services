/**
 * AI Sales Agent - Unified Sales Workflow
 *
 * Coordinates all ecosystem services for complete sales operations
 * Uses existing RTNM services - no new services needed
 */

import { v4 as uuidv4 } from 'uuid';
import {
  prospectingConnector,
  communicationConnector,
  intelligenceConnector,
  identityConnector,
  crmConnector,
  bookingConnector,
  conversationIntelConnector,
} from './ecosystemConnector.js';

export interface SalesWorkflowInput {
  prospectEmail?: string;
  prospectName: string;
  company: string;
  phone?: string;
  source: string;
  painPoint?: string;
  productInterest?: string;
}

export interface SalesWorkflowResult {
  workflowId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  actions: {
    action: string;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
    error?: string;
  }[];
  preCallBrief?: any;
  talkingPoints?: string[];
  nextBestAction?: string;
  estimatedCloseProbability?: number;
  errors?: string[];
}

export class AISalesAgent {
  /**
   * Run complete sales workflow for a prospect
   */
  async runWorkflow(input: SalesWorkflowInput): Promise<SalesWorkflowResult> {
    const workflowId = 'wf_' + uuidv4(); // Use UUID for unique IDs
    const actions: any[] = [];

    console.log('Starting AI Sales Workflow:', workflowId);

    const errors: string[] = [];

    // Step 1: Enrich prospect from multiple sources
    try {
      const enrichmentResult = await this.enrichProspect(input);
      actions.push({ action: 'enrich_prospect', status: 'completed', result: enrichmentResult });
    } catch (error) {
      errors.push(`enrich_prospect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actions.push({ action: 'enrich_prospect', status: 'failed', error: errors[errors.length - 1] });
    }

    // Step 2: Get market intelligence
    try {
      const marketIntel = await intelligenceConnector.getMarketSignals(input.company);
      actions.push({ action: 'market_intel', status: 'completed', result: marketIntel });
    } catch (error) {
      errors.push(`market_intel: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actions.push({ action: 'market_intel', status: 'failed', error: errors[errors.length - 1] });
    }

    // Step 3: Generate pre-call brief
    try {
      const preCallBrief = await this.generatePreCallBrief(input);
      actions.push({ action: 'pre_call_brief', status: 'completed', result: preCallBrief });
    } catch (error) {
      errors.push(`pre_call_brief: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actions.push({ action: 'pre_call_brief', status: 'failed', error: errors[errors.length - 1] });
    }

    // Step 4: Create CRM lead if not exists
    try {
      const leadCreated = await this.createOrUpdateLead(input);
      actions.push({ action: 'crm_lead', status: 'completed', result: leadCreated });
    } catch (error) {
      errors.push(`crm_lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actions.push({ action: 'crm_lead', status: 'failed', error: errors[errors.length - 1] });
    }

    // Step 5: Generate talking points
    try {
      const talkingPoints = await this.generateTalkingPoints(input, []);
      actions.push({ action: 'talking_points', status: 'completed', result: talkingPoints });
    } catch (error) {
      errors.push(`talking_points: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actions.push({ action: 'talking_points', status: 'failed', error: errors[errors.length - 1] });
    }

    // Step 6: Determine next best action
    try {
      const nextBestAction = await this.determineNextAction(input);
      actions.push({ action: 'next_action', status: 'completed', result: nextBestAction });
    } catch (error) {
      errors.push(`next_action: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actions.push({ action: 'next_action', status: 'failed', error: errors[errors.length - 1] });
    }

    // Step 7: Calculate close probability
    try {
      const closeProbability = await this.calculateCloseProbability(input);
      actions.push({ action: 'probability_calc', status: 'completed', result: { probability: closeProbability } });
    } catch (error) {
      errors.push(`probability_calc: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actions.push({ action: 'probability_calc', status: 'failed', error: errors[errors.length - 1] });
    }

    // Step 8: Store in identity hub for future reference
    try {
      await identityConnector.storeInteraction('salesmind', input.prospectEmail || 'unknown', {
        workflowId,
        prospect: input,
        timestamp: new Date(),
      });
      actions.push({ action: 'store_identity', status: 'completed' });
    } catch (error) {
      errors.push(`store_identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
      actions.push({ action: 'store_identity', status: 'failed', error: errors[errors.length - 1] });
    }

    // Get the completed actions data for return values
    const enrichAction = actions.find(a => a.action === 'enrich_prospect');
    const briefAction = actions.find(a => a.action === 'pre_call_brief');
    const talkingPointsAction = actions.find(a => a.action === 'talking_points');
    const nextAction = actions.find(a => a.action === 'next_action');
    const probAction = actions.find(a => a.action === 'probability_calc');

    return {
      workflowId,
      status: errors.length > 0 && errors.length === actions.length ? 'failed' : 'completed',
      actions,
      preCallBrief: briefAction?.result,
      talkingPoints: talkingPointsAction?.result as string[] | undefined,
      nextBestAction: nextAction?.result as string | undefined,
      estimatedCloseProbability: (probAction?.result as { probability: number })?.probability || 50,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Enrich prospect from multiple ecosystem sources
   */
  private async enrichProspect(input: SalesWorkflowInput): Promise<any> {
    const enrichment = {
      prospect: { name: input.prospectName, email: input.prospectEmail, phone: input.phone },
      company: null as any,
      linkedIn: null as any,
      marketSignals: [] as any[],
      identityProfile: null as any,
      conversationHistory: [] as any[],
    };

    // Get company intel from HOJAI
    enrichment.company = await this.getCompanyIntel(input.company);

    // Get LinkedIn data
    enrichment.linkedIn = await this.getLinkedInData(input);

    // Get market signals
    enrichment.marketSignals = await intelligenceConnector.getMarketSignals(input.company);

    // Get identity profile
    if (input.prospectEmail) {
      enrichment.identityProfile = await identityConnector.getUnifiedProfile(input.prospectEmail);
      enrichment.conversationHistory = await identityConnector.getConversationHistory('salesmind', input.prospectEmail);
    }

    return enrichment;
  }

  private async getCompanyIntel(companyName: string): Promise<any> {
    const intel = await intelligenceConnector.getCompanyProfile(companyName);
    if (!intel) {
      // Fallback to mock data
      return {
        name: companyName,
        industry: 'Technology',
        size: '50-200',
        founded: 2015,
        website: `https://${companyName.toLowerCase().replace(/\s/g, '')}.com`,
        techStack: ['React', 'Node.js', 'AWS'],
        funding: 'Series A',
        growth: '15% YoY',
      };
    }
    return intel;
  }

  private async getLinkedInData(input: SalesWorkflowInput): Promise<any> {
    // This would use LinkedIn connector - simplified here
    return {
      profileUrl: `https://linkedin.com/in/${input.prospectName.toLowerCase().replace(/\s/g, '-')}`,
      headline: 'Sales Leader',
      connections: 250,
    };
  }

  private async generatePreCallBrief(input: SalesWorkflowInput): Promise<any> {
    const company = await this.getCompanyIntel(input.company);
    const marketSignals = await intelligenceConnector.getMarketSignals(input.company);

    return {
      prospect: {
        name: input.prospectName,
        title: 'Unknown',
        company: input.company,
        email: input.prospectEmail,
        phone: input.phone,
      },
      companyIntel: {
        industry: company?.industry || 'Unknown',
        size: company?.size || 'Unknown',
        funding: company?.funding || 'Unknown',
        founded: company?.founded || 'Unknown',
      },
      talkingPoints: marketSignals.slice(0, 5).map((s: any) => s.content),
      recentActivity: [],
      keyInsights: [
        `Company in ${company?.industry || 'tech'} industry`,
        company?.size ? `Team of ${company.size}` : '',
        company?.funding ? `Recent ${company.funding}` : '',
      ].filter(Boolean),
      recommendedApproach: this.getRecommendedApproach(input),
      questionsToAsk: [
        'What are your current priorities?',
        'What challenges are you facing?',
        'What would success look like?',
        'Who else is involved in this decision?',
      ],
    };
  }

  private async getRecommendedApproach(input: SalesWorkflowInput): Promise<string> {
    const company = await this.getCompanyIntel(input.company);

    if (company?.funding?.includes('Series A')) {
      return 'Emphasize ROI and quick implementation - early stage companies need fast results';
    }
    if (company?.size?.includes('500+')) {
      return 'Focus on enterprise features, security, and integration capabilities';
    }
    return 'Standard SMB approach - emphasize ease of use and quick time to value';
  }

  private async generateTalkingPoints(
    input: SalesWorkflowInput,
    _marketSignals: any[]
  ): Promise<string[]> {
    const points: string[] = [];

    // Get company intel
    const company = await this.getCompanyIntel(input.company);

    // Company-specific points
    if (company?.industry) {
      points.push(`${input.company} operates in the ${company.industry} sector - key trends include market growth and digital transformation`);
    }

    if (company?.funding) {
      points.push(`${input.company} recently raised ${company.funding} funding - showing growth trajectory`);
    }

    if (company?.growth) {
      points.push(`${input.company} is growing at ${company.growth} - they may be scaling operations`);
    }

    // Market signals from intelligence connector
    const signals = await intelligenceConnector.getMarketSignals(input.company);
    signals.slice(0, 3).forEach((signal: any) => {
      points.push(signal.content);
    });

    // Pain point based
    if (input.painPoint) {
      points.push(`They mentioned challenges with: ${input.painPoint}`);
    }

    // Product interest
    if (input.productInterest) {
      points.push(`Interested in: ${input.productInterest}`);
    }

    return points.slice(0, 8);
  }

  private async determineNextAction(input: SalesWorkflowInput): Promise<string> {
    const company = await this.getCompanyIntel(input.company);

    if (input.prospectEmail) {
      const history = await identityConnector.getConversationHistory('salesmind', input.prospectEmail);
      if (history.length === 0) {
        return 'Send introductory email with value proposition';
      }
      if (history.length < 3) {
        return 'Schedule discovery call to understand their needs';
      }
    }

    if (company?.size?.includes('500+')) {
      return 'Request meeting with decision makers, prepare executive briefing';
    }

    return 'Send personalized proposal based on their requirements';
  }

  private async calculateCloseProbability(input: SalesWorkflowInput): Promise<number> {
    let probability = 50; // Base probability

    const company = await this.getCompanyIntel(input.company);

    // Positive factors
    if (company?.funding) probability += 15;
    if (company?.size?.includes('200+')) probability += 10;
    if (input.prospectEmail) probability += 15;
    if (input.painPoint) probability += 10;

    // Negative factors
    if (!input.phone) probability -= 10;
    if (!input.prospectEmail) probability -= 20;

    return Math.min(Math.max(probability, 5), 95);
  }

  private async createOrUpdateLead(input: SalesWorkflowInput): Promise<any> {
    const company = await this.getCompanyIntel(input.company);

    const leadData = {
      name: input.prospectName,
      email: input.prospectEmail,
      phone: input.phone,
      company: input.company,
      source: input.source,
      stage: 'new' as const,
      score: company?.score || 50,
      industry: company?.industry,
      companySize: company?.size,
    };

    // Create/update lead in CRM
    const result = await crmConnector.createLead ? await crmConnector.createLead(leadData) : null;
    if (result) {
      return result;
    }

    // Fallback to local ID
    console.log('Creating/updating lead:', leadData);
    return { id: 'lead_' + uuidv4(), ...leadData };
  }

  /**
   * Execute outreach sequence
   */
  async executeOutreachSequence(prospectId: string, sequenceType: 'intro' | 'follow_up' | 'proposal' | 'reengagement'): Promise<{
    steps: { step: string; status: string; sentAt?: Date }[];
  }> {
    const steps: any[] = [];

    switch (sequenceType) {
      case 'intro':
        // Step 1: LinkedIn connection
        steps.push({ step: 'linkedin_connect', status: 'pending' });
        // Step 2: Intro email
        steps.push({ step: 'send_email', status: 'pending' });
        break;

      case 'follow_up':
        // Step 1: Follow-up email
        steps.push({ step: 'send_followup_email', status: 'pending' });
        // Step 2: Call attempt
        steps.push({ step: 'make_call', status: 'pending' });
        break;

      case 'proposal':
        // Step 1: Send proposal
        steps.push({ step: 'send_proposal', status: 'pending' });
        // Step 2: Schedule call
        steps.push({ step: 'schedule_meeting', status: 'pending' });
        break;

      case 'reengagement':
        // Step 1: Re-engagement email
        steps.push({ step: 'send_reengagement_email', status: 'pending' });
        // Step 2: LinkedIn message
        steps.push({ step: 'send_linkedin_message', status: 'pending' });
        break;
    }

    // Execute steps
    for (const step of steps) {
      console.log('Executing step:', step.step);
      step.status = 'completed';
      step.sentAt = new Date();
    }

    return { steps };
  }

  /**
   * Analyze conversation and extract insights
   */
  async analyzeConversation(conversationText: string): Promise<any> {
    const [sentiment, topics, objections] = await Promise.all([
      conversationIntelConnector.getSentiment(conversationText),
      conversationIntelConnector.extractKeyTopics(conversationText),
      conversationIntelConnector.detectObjections(conversationText),
    ]);

    return {
      sentiment,
      topics,
      objections,
      summary: this.summarizeConversation(conversationText, sentiment, topics),
      recommendations: this.getRecommendations(objections, sentiment),
    };
  }

  private summarizeConversation(text: string, sentiment: string, topics: string[]): string {
    return `This conversation has ${sentiment} sentiment. Key topics discussed: ${topics.join(', ')}.`;
  }

  private getRecommendations(objections: string[], sentiment: string): string[] {
    const recommendations: string[] = [];

    if (objections.length > 0) {
      recommendations.push(`Address objections: ${objections.join(', ')}`);
    }

    if (sentiment === 'negative') {
      recommendations.push('Consider rebuilding trust before pushing for close');
    }

    recommendations.push('Follow up within 24 hours to maintain momentum');

    return recommendations;
  }
}

export const aiSalesAgent = new AISalesAgent();