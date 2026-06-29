/**
 * AI SDR Agent
 * Sales Development Representative - Lead Qualification & Outreach
 */

import { Agent, AgentContext, AgentResult } from '@hojai/agents';
import { MemoryOS } from '@hojai/memory';
import { TwinOS } from '@hojai/twins';

export interface Lead {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  job_title?: string;
  linkedin_url?: string;
  source?: string;
  score?: number;
  grade?: 'A' | 'B' | 'C' | 'D';
}

export interface SDRConfig {
  autoFollowUp: boolean;
  followUpDays: number[];
  meetingLink?: string;
  emailTemplates?: {
    initial?: string;
    followUp?: string;
    meeting?: string;
  };
}

export class AISDRAgent extends Agent {
  private memory: MemoryOS;
  private twins: TwinOS;
  private config: SDRConfig;

  constructor(config: Partial<SDRConfig> = {}) {
    super({
      id: 'ai-sdr-agent',
      name: 'AI SDR Agent',
      role: 'sdr',
      description: 'AI-powered sales development rep for lead qualification, outreach, and meeting booking',
      skills: [
        'lead_qualification',
        'company_research',
        'email_personalization',
        'linkedin_outreach',
        'meeting_booking',
        'crm_update',
        'follow_up_sequence'
      ],
      memory: {
        required: ['lead_history', 'outreach_templates', 'interaction_memory'],
        updateOn: ['lead_contacted', 'email_sent', 'meeting_booked']
      },
      twins: ['lead_twin', 'prospect_twin', 'customer_twin']
    });

    this.memory = new MemoryOS();
    this.twins = new TwinOS();
    this.config = {
      autoFollowUp: config.autoFollowUp ?? true,
      followUpDays: config.followUpDays ?? [3, 7, 14],
      meetingLink: config.meetingLink,
      emailTemplates: config.emailTemplates
    };
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const { input } = context;

    // Step 1: Validate lead data
    if (!input.email && !input.phone) {
      return { success: false, error: 'Email or phone required' };
    }

    // Step 2: Enrich lead data
    const enrichedLead = await this.enrichLead(input);

    // Step 3: Qualify lead
    const qualification = await this.qualifyLead(enrichedLead);

    // Step 4: Create/update lead twin
    await this.updateLeadTwin(enrichedLead, qualification);

    // Step 5: Route based on qualification
    if (qualification.grade === 'A' || qualification.grade === 'B') {
      // High priority - immediate outreach
      await this.sendInitialEmail(enrichedLead);
      return {
        success: true,
        output: {
          lead: enrichedLead,
          qualification,
          action: 'outreach_initiated',
          nextStep: 'await_response'
        }
      };
    } else if (qualification.grade === 'C') {
      // Medium priority - nurture sequence
      await this.addToNurtureSequence(enrichedLead);
      return {
        success: true,
        output: {
          lead: enrichedLead,
          qualification,
          action: 'nurture_sequence',
          nextStep: 'automated_nurture'
        }
      };
    } else {
      // Low priority - archive
      return {
        success: true,
        output: {
          lead: enrichedLead,
          qualification,
          action: 'archived',
          nextStep: 'none'
        }
      };
    }
  }

  private async enrichLead(lead: Lead): Promise<Lead> {
    // Company research
    const companyData = await this.researchCompany(lead.company);

    // LinkedIn enrichment (if URL not provided)
    if (!lead.linkedin_url && lead.company) {
      lead.linkedin_url = await this.findLinkedIn(lead);
    }

    // Merge company data
    return {
      ...lead,
      ...companyData,
      score: 0 // Will be calculated in qualifyLead
    };
  }

  private async researchCompany(companyName: string): Promise<Partial<Lead>> {
    // TODO: Integrate with REZ Atlas or web scraper
    // For now, return basic enrichment
    return {
      company_size: undefined,
      industry: undefined,
      funding: undefined
    };
  }

  private async findLinkedIn(lead: Lead): Promise<string | undefined> {
    // TODO: LinkedIn search integration
    return undefined;
  }

  private async qualifyLead(lead: Lead): Promise<{ score: number; grade: 'A' | 'B' | 'C' | 'D'; reasons: string[] }> {
    let score = 50;
    const reasons: string[] = [];

    // Company size scoring
    if (lead.company_size) {
      if (lead.company_size > 1000) {
        score += 20;
        reasons.push('Enterprise company');
      } else if (lead.company_size > 100) {
        score += 15;
        reasons.push('Mid-market company');
      } else if (lead.company_size > 10) {
        score += 10;
        reasons.push('SMB company');
      }
    }

    // Job title scoring (decision authority)
    const title = lead.job_title?.toLowerCase() || '';
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || title.includes('coo') || title.includes('founder')) {
      score += 20;
      reasons.push('C-level executive');
    } else if (title.includes('vp') || title.includes('vice president')) {
      score += 15;
      reasons.push('VP level');
    } else if (title.includes('director')) {
      score += 12;
      reasons.push('Director level');
    } else if (title.includes('manager')) {
      score += 8;
      reasons.push('Manager level');
    }

    // Email quality
    if (lead.email.includes(lead.company.replace(/\s+/g, ''))) {
      score += 5;
      reasons.push('Company email');
    }

    // Source quality
    if (lead.source === 'linkedin') {
      score += 10;
      reasons.push('LinkedIn lead');
    } else if (lead.source === 'referral') {
      score += 15;
      reasons.push('Referral');
    }

    // Cap at 100
    score = Math.min(score, 100);

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D';
    if (score >= 80) grade = 'A';
    else if (score >= 60) grade = 'B';
    else if (score >= 40) grade = 'C';
    else grade = 'D';

    return { score, grade, reasons };
  }

  private async updateLeadTwin(lead: Lead, qualification: { score: number; grade: string }): Promise<void> {
    await this.twins.upsert('lead_twin', {
      identity: { email: lead.email },
      data: {
        ...lead,
        score: qualification.score,
        grade: qualification.grade,
        lastQualified: new Date().toISOString()
      }
    });
  }

  private async sendInitialEmail(lead: Lead): Promise<void> {
    const template = this.config.emailTemplates?.initial || this.getDefaultEmailTemplate(lead);

    // TODO: Integrate with email service
    await this.memory.save({
      type: 'outreach_email',
      recipient: lead.email,
      subject: template.subject,
      body: template.body,
      sentAt: new Date().toISOString()
    });
  }

  private getDefaultEmailTemplate(lead: Lead): { subject: string; body: string } {
    return {
      subject: `Quick question about ${lead.company}`,
      body: `Hi ${lead.name.split(' ')[0]},

I noticed ${lead.company} and thought there might be an opportunity to help.

Would you be open to a quick 15-minute call this week?

${this.config.meetingLink ? `You can book directly here: ${this.config.meetingLink}` : ''}

Best regards`
    };
  }

  private async addToNurtureSequence(lead: Lead): Promise<void> {
    // TODO: Add to email nurture sequence
    await this.memory.save({
      type: 'nurture_sequence',
      recipient: lead.email,
      sequence: 'default_nurture',
      addedAt: new Date().toISOString()
    });
  }

  // Follow-up logic
  async sendFollowUp(leadId: string, step: number): Promise<void> {
    if (!this.config.autoFollowUp || step >= this.config.followUpDays.length) {
      return;
    }

    // TODO: Send follow-up email based on step
    const followUpDays = this.config.followUpDays[step];

    await this.memory.save({
      type: 'follow_up',
      leadId,
      step,
      scheduledFor: new Date(Date.now() + followUpDays * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  // Meeting booking
  async bookMeeting(lead: Lead, proposedTime: Date): Promise<{ success: boolean; meetingLink?: string }> {
    if (!this.config.meetingLink) {
      return { success: false };
    }

    // TODO: Integrate with Calendly/Google Calendar
    return {
      success: true,
      meetingLink: `${this.config.meetingLink}?name=${encodeURIComponent(lead.name)}&email=${encodeURIComponent(lead.email)}`
    };
  }
}

export default AISDRAgent;
