import { generateId, randomDelay, sleep, calculateLeadScore } from '../utils/helpers.js';
import type { Lead, SDRWorkflow, WorkflowLog } from '../types/index.js';
import logger from '../utils/logger.js';
import aiIntegration from './aiIntegration.js';

interface ProspectResearch {
  company: string;
  industry: string;
  size?: string;
  recentNews?: string[];
  keyContacts?: string[];
  painPoints?: string[];
  techStack?: string[];
}

interface OutreachEmail {
  subject: string;
  body: string;
  channel: 'email' | 'sms' | 'linkedin';
  variant?: 'A' | 'B';
}

interface ABLTest {
  variantA: OutreachEmail;
  variantB: OutreachEmail;
  results: {
    variantA: { sent: number; opened: number; replied: number };
    variantB: { sent: number; opened: number; replied: number };
  };
  winner?: 'A' | 'B';
}

interface ResponseHandling {
  response: string;
  type: 'interested' | 'not_interested' | 'meeting_request' | 'unsubscribe' | 'out_of_office';
  action: string;
  nextStep?: string;
}

class AutonomousSDRService {
  private workflows: Map<string, SDRWorkflow> = new Map();
  private leads: Map<string, Lead> = new Map();
  private abTests: Map<string, ABLTest> = new Map();

  constructor() {
    this.initMockLeads();
  }

  private initMockLeads() {
    const mockLeads: Lead[] = [
      { id: 'lead-001', name: 'John Smith', email: 'john@techcorp.com', company: 'TechCorp Inc', title: 'VP of Sales', status: 'new', score: 0, source: 'linkedin', createdAt: new Date(), updatedAt: new Date() },
      { id: 'lead-002', name: 'Sarah Johnson', email: 'sarah@startupxyz.com', company: 'StartupXYZ', title: 'CEO', status: 'contacted', score: 0, source: 'referral', createdAt: new Date(), updatedAt: new Date() },
      { id: 'lead-003', name: 'Mike Chen', email: 'mike@enterprise.io', company: 'Enterprise.io', title: 'Director of Operations', status: 'qualified', score: 0, source: 'website', createdAt: new Date(), updatedAt: new Date() },
      { id: 'lead-004', name: 'Emily Davis', email: 'emily@retailplus.com', company: 'RetailPlus', title: 'Head of Growth', status: 'new', score: 0, source: 'linkedin', createdAt: new Date(), updatedAt: new Date() },
      { id: 'lead-005', name: 'Robert Wilson', email: 'robert@manufacturing.co', company: 'Manufacturing Co', title: 'Sales Manager', status: 'contacted', score: 0, source: 'cold_outreach', createdAt: new Date(), updatedAt: new Date() }
    ];

    mockLeads.forEach(lead => {
      lead.score = calculateLeadScore(lead);
      this.leads.set(lead.id, lead);
    });
  }

  // Start autonomous SDR workflow
  async startWorkflow(config: {
    name: string;
    targetLeads?: string[];
    criteria?: {
      minScore?: number;
      sources?: string[];
      industries?: string[];
    };
    channels: ('email' | 'sms' | 'linkedin')[];
    followUpSequence: number;
    abTestEnabled: boolean;
  }): Promise<SDRWorkflow> {
    const workflowId = generateId('sdr');

    // Get target leads
    let targetLeads = Array.from(this.leads.values());

    if (config.targetLeads?.length) {
      targetLeads = targetLeads.filter(l => config.targetLeads!.includes(l.id));
    }

    if (config.criteria) {
      if (config.criteria.minScore) {
        targetLeads = targetLeads.filter(l => l.score! >= config.criteria!.minScore!);
      }
      if (config.criteria.sources?.length) {
        targetLeads = targetLeads.filter(l => config.criteria!.sources!.includes(l.source!));
      }
      if (config.criteria.industries?.length) {
        targetLeads = targetLeads.filter(l => config.criteria!.industries!.includes(l.metadata?.industry || ''));
      }
    }

    const workflow: SDRWorkflow = {
      id: workflowId,
      name: config.name,
      status: 'running',
      currentStep: 'initializing',
      progress: 0,
      prospectsProcessed: 0,
      emailsSent: 0,
      responsesReceived: 0,
      meetingsBooked: 0,
      startedAt: new Date(),
      logs: []
    };

    this.workflows.set(workflowId, workflow);

    // Start async workflow execution
    this.executeWorkflow(workflowId, targetLeads, config).catch(err => {
      logger.error(`Workflow ${workflowId} error:`, err);
      const wf = this.workflows.get(workflowId);
      if (wf) {
        wf.status = 'error';
        wf.logs.push({ timestamp: new Date(), level: 'error', message: err.message });
      }
    });

    return workflow;
  }

  private async executeWorkflow(
    workflowId: string,
    leads: Lead[],
    config: any
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    try {
      // Step 1: Research prospects
      workflow.currentStep = 'researching';
      workflow.logs.push({ timestamp: new Date(), level: 'info', message: `Starting research on ${leads.length} prospects` });
      this.workflows.set(workflowId, workflow);

      for (const lead of leads) {
        await this.researchProspect(lead);
        workflow.prospectsProcessed++;
        workflow.progress = Math.floor((workflow.prospectsProcessed / leads.length) * 100);
        this.workflows.set(workflowId, workflow);
      }

      // Step 2: Generate and send outreach
      workflow.currentStep = 'outreach';
      workflow.logs.push({ timestamp: new Date(), level: 'info', message: 'Starting outreach sequence' });
      this.workflows.set(workflowId, workflow);

      // A/B Test setup if enabled
      if (config.abTestEnabled && config.channels.includes('email')) {
        const testId = await this.setupABTest(leads, workflowId);
        await this.executeABTest(testId, workflowId);
      } else {
        for (const lead of leads) {
          await this.sendOutreach(lead, config.channels, workflowId);
          workflow.emailsSent++;
          this.workflows.set(workflowId, workflow);
        }
      }

      // Step 3: Follow-up sequence
      workflow.currentStep = 'follow_up';
      workflow.logs.push({ timestamp: new Date(), level: 'info', message: 'Starting follow-up sequence' });
      this.workflows.set(workflowId, workflow);

      for (let i = 0; i < config.followUpSequence; i++) {
        await sleep(5000); // Wait between follow-ups
        workflow.logs.push({
          timestamp: new Date(),
          level: 'success',
          message: `Follow-up ${i + 1} sent to ${Math.floor(workflow.emailsSent * 0.7)} prospects`
        });
      }

      // Complete
      workflow.status = 'completed';
      workflow.currentStep = 'completed';
      workflow.progress = 100;
      workflow.completedAt = new Date();
      workflow.logs.push({ timestamp: new Date(), level: 'success', message: 'Workflow completed successfully' });
      this.workflows.set(workflowId, workflow);

    } catch (error: any) {
      workflow.status = 'error';
      workflow.logs.push({ timestamp: new Date(), level: 'error', message: error.message });
      this.workflows.set(workflowId, workflow);
    }
  }

  private async researchProspect(lead: Lead): Promise<ProspectResearch> {
    await randomDelay(500, 1500);

    // Simulate research
    const research: ProspectResearch = {
      company: lead.company || 'Unknown Company',
      industry: this.inferIndustry(lead),
      size: this.inferCompanySize(lead),
      recentNews: [
        'Recently raised Series B funding',
        'Expanding to European markets'
      ],
      painPoints: [
        'Manual sales prospecting takes too long',
        'Need better CRM integration',
        'Want to scale outreach without adding headcount'
      ],
      techStack: ['Salesforce', 'Slack', 'HubSpot', 'Zoom']
    };

    lead.metadata = { ...lead.metadata, research };
    this.leads.set(lead.id, lead);

    return research;
  }

  private inferIndustry(lead: Lead): string {
    const company = (lead.company || '').toLowerCase();
    if (company.includes('tech') || company.includes('software')) return 'Technology';
    if (company.includes('retail') || company.includes('store')) return 'Retail';
    if (company.includes('health') || company.includes('medical')) return 'Healthcare';
    if (company.includes('finance') || company.includes('bank')) return 'Finance';
    if (company.includes('manufacturing')) return 'Manufacturing';
    return 'General';
  }

  private inferCompanySize(lead: Lead): string {
    const title = (lead.title || '').toLowerCase();
    if (title.includes('ceo') || title.includes('founder')) return '1-50';
    if (title.includes('vp') || title.includes('director')) return '50-500';
    if (title.includes('manager')) return '10-200';
    return '10-100';
  }

  private async sendOutreach(
    lead: Lead,
    channels: string[],
    workflowId: string
  ): Promise<void> {
    await randomDelay(200, 800);

    const research = lead.metadata?.research as ProspectResearch;

    // Generate personalized email using AI
    const emailPrompt = `Write a personalized outreach email for:
Name: ${lead.name}
Company: ${lead.company}
Title: ${lead.title}
Industry: ${research?.industry || 'B2B'}
Pain Points: ${research?.painPoints?.join(', ') || 'Sales efficiency'}

Keep it under 150 words, include a clear CTA.`;

    const emailResponse = await aiIntegration.routeRequest({
      model: 'auto',
      prompt: emailPrompt,
      temperature: 0.7,
      maxTokens: 512
    });

    const email: OutreachEmail = {
      subject: `Quick question about ${lead.company}`,
      body: emailResponse.text,
      channel: 'email',
      variant: 'A'
    };

    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.logs.push({
        timestamp: new Date(),
        level: 'success',
        message: `Sent email to ${lead.email} - Subject: ${email.subject}`,
        details: { leadId: lead.id, channel: email.channel }
      });
    }

    // Update lead status
    lead.status = 'contacted';
    lead.updatedAt = new Date();
    this.leads.set(lead.id, lead);
  }

  private async setupABTest(leads: Lead[], workflowId: string): Promise<string> {
    const testId = generateId('abtest');

    const variantA: OutreachEmail = {
      subject: `Quick question about ${leads[0].company}`,
      body: 'Variant A content - focus on time savings',
      channel: 'email',
      variant: 'A'
    };

    const variantB: OutreachEmail = {
      subject: `Idea for ${leads[0].company}`,
      body: 'Variant B content - focus on ROI',
      channel: 'email',
      variant: 'B'
    };

    const halfPoint = Math.floor(leads.length / 2);
    const test: ABLTest = {
      variantA: { ...variantA, body: `Variant A - ${variantA.body} (sent to ${halfPoint} leads)` },
      variantB: { ...variantB, body: `Variant B - ${variantB.body} (sent to ${leads.length - halfPoint} leads)` },
      results: {
        variantA: { sent: halfPoint, opened: 0, replied: 0 },
        variantB: { sent: leads.length - halfPoint, opened: 0, replied: 0 }
      }
    };

    this.abTests.set(testId, test);

    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `A/B Test started: ${testId}`,
        details: { variantA: halfPoint, variantB: leads.length - halfPoint }
      });
    }

    return testId;
  }

  private async executeABTest(testId: string, workflowId: string): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) return;

    // Simulate A/B test results after some time
    await sleep(2000);

    // Randomly determine winner based on simulated performance
    const aOpenRate = 0.35 + Math.random() * 0.1;
    const bOpenRate = 0.35 + Math.random() * 0.1;

    test.results.variantA.opened = Math.floor(test.results.variantA.sent * aOpenRate);
    test.results.variantB.opened = Math.floor(test.results.variantB.sent * bOpenRate);
    test.results.variantA.replied = Math.floor(test.results.variantA.opened * 0.12);
    test.results.variantB.replied = Math.floor(test.results.variantB.opened * 0.15);

    test.winner = test.results.variantA.replied > test.results.variantB.replied ? 'A' : 'B';

    this.abTests.set(testId, test);

    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.emailsSent = test.results.variantA.sent + test.results.variantB.sent;
      workflow.responsesReceived = test.results.variantA.replied + test.results.variantB.replied;
      workflow.logs.push({
        timestamp: new Date(),
        level: 'success',
        message: `A/B Test completed. Winner: Variant ${test.winner}`,
        details: {
          variantA: test.results.variantA,
          variantB: test.results.variantB,
          winner: test.winner
        }
      });
    }
  }

  // Handle incoming responses
  async handleResponse(response: {
    leadId: string;
    type: 'reply' | 'meeting_booked' | 'unsubscribe' | 'out_of_office';
    content?: string;
  }): Promise<ResponseHandling> {
    const lead = this.leads.get(response.leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    await randomDelay(200, 500);

    let handling: ResponseHandling;
    let action: string;
    let nextStep: string | undefined;

    if (response.type === 'meeting_booked') {
      handling = {
        response: 'Meeting booked successfully',
        type: 'meeting_request',
        action: 'schedule_meeting',
        nextStep: 'Send calendar invite and prepare demo'
      };
      lead.status = 'qualified';
      const workflow = Array.from(this.workflows.values()).find(w => w.status === 'running');
      if (workflow) {
        workflow.meetingsBooked++;
      }
    } else if (response.type === 'unsubscribe') {
      handling = {
        response: 'Lead unsubscribed',
        type: 'unsubscribe',
        action: 'remove_from_campaigns'
      };
      lead.metadata = { ...lead.metadata, unsubscribed: true };
    } else if (response.type === 'out_of_office') {
      handling = {
        response: 'Out of office - will retry later',
        type: 'out_of_office',
        action: 'schedule_retry',
        nextStep: 'Resume outreach sequence after return date'
      };
    } else {
      // Analyze response content
      const sentimentPrompt = `Analyze this prospect response for interest level:
"${response.content || 'No content'}"

Respond with: interested, not_interested, or needs_more_info`;

      const sentimentResponse = await aiIntegration.routeRequest({
        model: 'auto',
        prompt: sentimentPrompt,
        temperature: 0.3,
        maxTokens: 100
      });

      const isInterested = !sentimentResponse.text.toLowerCase().includes('not_interested');

      if (isInterested) {
        handling = {
          response: 'Lead is interested - escalation required',
          type: 'interested',
          action: 'escalate_to_sales',
          nextStep: 'Schedule demo call'
        };
        lead.status = 'qualified';
      } else {
        handling = {
          response: 'Lead not interested - will nurture',
          type: 'not_interested',
          action: 'add_to_nurture_sequence'
        };
      }
    }

    lead.updatedAt = new Date();
    this.leads.set(lead.id, lead);

    return handling;
  }

  // Get workflow status
  getWorkflowStatus(workflowId: string): SDRWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  // Stop workflow
  async stopWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    workflow.status = 'idle';
    workflow.currentStep = 'stopped';
    workflow.logs.push({
      timestamp: new Date(),
      level: 'warn',
      message: 'Workflow manually stopped'
    });
    this.workflows.set(workflowId, workflow);

    return true;
  }

  // Get all workflows
  getAllWorkflows(): SDRWorkflow[] {
    return Array.from(this.workflows.values());
  }

  // Get leads
  getLeads(): Lead[] {
    return Array.from(this.leads.values());
  }
}

export const autonomousSDR = new AutonomousSDRService();
export default autonomousSDR;
