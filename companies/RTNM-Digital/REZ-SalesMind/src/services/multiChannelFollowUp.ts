/**
 * REZ SalesMind - Multi-Channel Follow-Up Engine
 * Automated follow-up sequences across email, SMS, WhatsApp, calls, and social media
 */

import { v4 as uuidv4 } from 'uuid';

// Types
export type ChannelType = 'email' | 'sms' | 'whatsapp' | 'call' | 'linkedin' | 'instagram' | 'facebook' | 'twitter';

export interface FollowUpStep {
  id: string;
  channel: ChannelType;
  message: string;
  delayHours: number;
  condition?: {
    type: 'replied' | 'no_reply' | 'opened' | 'clicked' | 'converted';
    action: 'stop' | 'continue' | 'escalate';
  };
  abTest?: {
    variant: string;
    percentage: number;
  };
  timezoneAware?: boolean;
  preferredTime?: string;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  description?: string;
  steps: FollowUpStep[];
  status: 'active' | 'paused' | 'completed' | 'draft';
  leadId?: string;
  contactInfo?: ContactInfo;
  executionHistory: ExecutionRecord[];
  analytics: SequenceAnalytics;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  isABTestEnabled?: boolean;
  abTestMetrics?: ABTestMetrics;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  timezone?: string;
  preferredChannel?: ChannelType;
}

export interface ExecutionRecord {
  id: string;
  stepId: string;
  channel: ChannelType;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  responseReceived?: boolean;
  responseType?: 'replied' | 'opened' | 'clicked' | 'converted';
  error?: string;
}

export interface SequenceAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalConverted: number;
  bounceRate: number;
  responseRate: number;
  conversionRate: number;
  avgResponseTime?: number;
  channelPerformance: Record<ChannelType, ChannelMetrics>;
}

export interface ChannelMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  converted: number;
}

export interface ABTestMetrics {
  variantA: { sent: number; responseRate: number; conversions: number };
  variantB: { sent: number; responseRate: number; conversions: number };
  winner?: 'A' | 'B';
  confidence: number;
}

// In-memory storage
const sequences = new Map<string, FollowUpSequence>();
const activeExecutions = new Map<string, any>();
const scheduledJobs = new Map<string, any>();

// Pre-built templates
export const followUpTemplates: Partial<FollowUpSequence>[] = [
  {
    name: 'Lead Nurture Sequence',
    description: '7-day lead nurturing sequence',
    steps: [
      { id: 's1', channel: 'email', message: 'Hi {{name}}, I noticed you visited our website. Would you like to schedule a quick call?', delayHours: 0, timezoneAware: true },
      { id: 's2', channel: 'linkedin', message: 'Hi {{name}}, great connecting with you! Let me know if you have any questions.', delayHours: 24 },
      { id: 's3', channel: 'email', message: 'Hi {{name}}, here are some resources that might help you...', delayHours: 72, condition: { type: 'no_reply', action: 'continue' } },
      { id: 's4', channel: 'sms', message: 'Hi {{name}}, just following up on my email. Let me know if I can help!', delayHours: 96, condition: { type: 'no_reply', action: 'escalate' } },
    ],
  },
  {
    name: 'Demo Follow-Up',
    description: 'Post-demo engagement sequence',
    steps: [
      { id: 's1', channel: 'email', message: 'Thanks for the demo, {{name}}! Here are the slides we discussed.', delayHours: 0 },
      { id: 's2', channel: 'whatsapp', message: 'Hi {{name}}, following up on our demo. Any questions?', delayHours: 4 },
      { id: 's3', channel: 'email', message: '{{name}}, here are some case studies from similar companies.', delayHours: 48 },
      { id: 's4', channel: 'call', message: 'Schedule a follow-up call to discuss pricing.', delayHours: 120, condition: { type: 'no_reply', action: 'escalate' } },
    ],
  },
  {
    name: 'Proposal Follow-Up',
    description: 'Post-proposal engagement sequence',
    steps: [
      { id: 's1', channel: 'email', message: 'Hi {{name}}, I wanted to follow up on the proposal I sent.', delayHours: 24 },
      { id: 's2', channel: 'call', message: 'Follow up call to discuss proposal.', delayHours: 72, condition: { type: 'no_reply', action: 'continue' } },
      { id: 's3', channel: 'linkedin', message: 'Hi {{name}}, just checking in on the proposal. Happy to answer any questions.', delayHours: 96 },
      { id: 's4', channel: 'email', message: '{{name}}, just a reminder that the pricing is valid until end of month.', delayHours: 144, condition: { type: 'no_reply', action: 'escalate' } },
    ],
  },
  {
    name: 'Cold Outreach Sequence',
    description: 'Initial cold outreach with multiple touchpoints',
    steps: [
      { id: 's1', channel: 'linkedin', message: 'Hi {{name}}, I found your profile interesting and would love to connect.', delayHours: 0 },
      { id: 's2', channel: 'email', message: 'Hi {{name}}, I came across {{company}} and thought there might be synergy.', delayHours: 48, condition: { type: 'replied', action: 'stop' } },
      { id: 's3', channel: 'twitter', message: 'Hey {{name}}, interesting insights on your recent post!', delayHours: 72 },
      { id: 's4', channel: 'email', message: 'Hi {{name}}, wanted to share how we helped similar companies...', delayHours: 120, condition: { type: 'no_reply', action: 'continue' } },
      { id: 's5', channel: 'sms', message: 'Hi {{name}}, tried reaching you via email. Let me know if you\'d like to chat!', delayHours: 168 },
    ],
  },
  {
    name: 'Win-Back Campaign',
    description: 'Re-engage lost or inactive leads',
    steps: [
      { id: 's1', channel: 'email', message: 'Hi {{name}}, it\'s been a while. Here\'s what\'s new with us...', delayHours: 0 },
      { id: 's2', channel: 'whatsapp', message: 'Hey {{name}}, miss you! We have some exciting updates to share.', delayHours: 72 },
      { id: 's3', channel: 'email', message: '{{name}}, just wanted to check in. Is now a better time?', delayHours: 120 },
      { id: 's4', channel: 'call', message: 'Final outreach call attempt.', delayHours: 240, condition: { type: 'no_reply', action: 'stop' } },
    ],
  },
];

// Follow-Up Sequence Engine
export class FollowUpSequenceEngine {
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize with templates
    this.initializeDefaultSequences();
  }

  /**
   * Initialize default sequence templates
   */
  private initializeDefaultSequences(): void {
    followUpTemplates.forEach((template, idx) => {
      const seq: FollowUpSequence = {
        id: `template_${idx + 1}`,
        name: template.name || `Sequence ${idx + 1}`,
        description: template.description,
        steps: template.steps || [],
        status: 'draft',
        executionHistory: [],
        analytics: this.createEmptyAnalytics(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      sequences.set(seq.id, seq);
    });
  }

  /**
   * Create empty analytics object
   */
  private createEmptyAnalytics(): SequenceAnalytics {
    const channels: Record<ChannelType, ChannelMetrics> = {
      email: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
      sms: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
      whatsapp: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
      call: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
      linkedin: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
      instagram: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
      facebook: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
      twitter: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
    };

    return {
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalReplied: 0,
      totalConverted: 0,
      bounceRate: 0,
      responseRate: 0,
      conversionRate: 0,
      channelPerformance: channels,
    };
  }

  /**
   * Create a new follow-up sequence
   */
  async createSequence(name: string, steps: FollowUpStep[], options?: { description?: string; abTest?: boolean }): Promise<FollowUpSequence> {
    const id = `seq_${uuidv4()}`;

    const sequence: FollowUpSequence = {
      id,
      name,
      description: options?.description,
      steps: steps.map(s => ({ ...s, id: s.id || `step_${uuidv4()}` })),
      status: 'draft',
      executionHistory: [],
      analytics: this.createEmptyAnalytics(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isABTestEnabled: options?.abTest,
      abTestMetrics: options?.abTest ? {
        variantA: { sent: 0, responseRate: 0, conversions: 0 },
        variantB: { sent: 0, responseRate: 0, conversions: 0 },
        confidence: 0,
      } : undefined,
    };

    sequences.set(id, sequence);
    console.log(`[FollowUp] Created sequence: ${name} (${id})`);

    return sequence;
  }

  /**
   * Get a sequence by ID
   */
  async getSequence(sequenceId: string): Promise<FollowUpSequence | null> {
    return sequences.get(sequenceId) || null;
  }

  /**
   * Get all sequences
   */
  async getAllSequences(status?: string): Promise<FollowUpSequence[]> {
    const all = Array.from(sequences.values());
    if (status) {
      return all.filter(s => s.status === status);
    }
    return all;
  }

  /**
   * Execute a sequence for a specific lead
   */
  async executeSequence(sequenceId: string, leadId: string, contactInfo: ContactInfo): Promise<{ executionId: string; message: string }> {
    const sequence = sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    if (sequence.status !== 'active') {
      throw new Error(`Sequence ${sequenceId} is not active`);
    }

    const executionId = `exec_${uuidv4()}`;

    // Create execution context
    const execution = {
      executionId,
      sequenceId,
      leadId,
      contactInfo,
      currentStepIndex: 0,
      status: 'running',
      startedAt: new Date(),
      records: [] as ExecutionRecord[],
      variant: sequence.isABTestEnabled ? (Math.random() > 0.5 ? 'A' : 'B') : 'A',
    };

    activeExecutions.set(executionId, execution);

    // Schedule first step
    this.scheduleStep(execution);

    console.log(`[FollowUp] Started sequence ${sequenceId} for lead ${leadId}`);

    return {
      executionId,
      message: `Sequence started for lead ${leadId}`,
    };
  }

  /**
   * Schedule a follow-up step
   */
  private scheduleStep(execution: any): void {
    const sequence = sequences.get(execution.sequenceId);
    if (!sequence) return;

    const step = sequence.steps[execution.currentStepIndex];
    if (!step) {
      // Sequence completed
      execution.status = 'completed';
      sequence.status = 'completed';
      return;
    }

    // Check A/B test
    if (step.abTest && sequence.isABTestEnabled) {
      const assignedVariant = execution.variant;
      if (step.abTest.variant !== assignedVariant) {
        execution.currentStepIndex++;
        this.scheduleStep(execution);
        return;
      }
    }

    const delayMs = step.delayHours * 60 * 60 * 1000;
    const scheduledTime = new Date(Date.now() + delayMs);

    const jobId = `job_${uuidv4()}`;
    const job = setTimeout(async () => {
      await this.executeStep(execution, step);
    }, delayMs);

    scheduledJobs.set(jobId, { job, executionId: execution.executionId, stepId: step.id });

    console.log(`[FollowUp] Scheduled step ${step.id} for ${scheduledTime.toISOString()}`);
  }

  /**
   * Execute a single step
   */
  private async executeStep(execution: any, step: FollowUpStep): Promise<void> {
    const sequence = sequences.get(execution.sequenceId);
    if (!sequence) return;

    const record: ExecutionRecord = {
      id: `rec_${uuidv4()}`,
      stepId: step.id,
      channel: step.channel,
      status: 'sent',
      sentAt: new Date(),
    };

    try {
      // Send message via appropriate channel
      await this.sendViaChannel(step.channel, step.message, execution.contactInfo);

      record.status = 'delivered';
      record.deliveredAt = new Date();

      // Update analytics
      this.updateAnalytics(sequence, step.channel, 'sent');
      this.updateAnalytics(sequence, step.channel, 'delivered');

      // Mock response simulation
      setTimeout(() => {
        const responded = Math.random() > 0.6;
        if (responded) {
          record.responseReceived = true;
          record.responseType = 'replied';
          this.updateAnalytics(sequence, step.channel, 'replied');

          // Check condition
          if (step.condition?.type === 'replied' && step.condition.action === 'stop') {
            execution.status = 'completed';
            console.log(`[FollowUp] Sequence stopped due to reply`);
          }
        }
      }, 5000);

    } catch (error: any) {
      record.status = 'failed';
      record.error = error.message;
      console.error(`[FollowUp] Step ${step.id} failed:`, error);
    }

    execution.records.push(record);
    sequence.executionHistory.push(record);

    // Move to next step
    execution.currentStepIndex++;
    if (execution.status === 'running') {
      this.scheduleStep(execution);
    }
  }

  /**
   * Send message via specific channel
   */
  private async sendViaChannel(channel: ChannelType, message: string, contact: ContactInfo): Promise<void> {
    const substitutions: Record<string, string> = {
      email: contact.email || 'N/A',
      phone: contact.phone || 'N/A',
      linkedin: contact.linkedin || 'N/A',
      instagram: contact.instagram || 'N/A',
      facebook: contact.facebook || 'N/A',
      twitter: contact.twitter || 'N/A',
    };

    const recipient = substitutions[channel];
    console.log(`[FollowUp] Sending ${channel} message to ${recipient}: ${message.substring(0, 50)}...`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Update sequence analytics
   */
  private updateAnalytics(sequence: FollowUpSequence, channel: ChannelType, metric: string): void {
    switch (metric) {
      case 'sent':
        sequence.analytics.totalSent++;
        sequence.analytics.channelPerformance[channel].sent++;
        break;
      case 'delivered':
        sequence.analytics.totalDelivered++;
        sequence.analytics.channelPerformance[channel].delivered++;
        break;
      case 'opened':
        sequence.analytics.totalOpened++;
        sequence.analytics.channelPerformance[channel].opened++;
        break;
      case 'clicked':
        sequence.analytics.totalClicked++;
        sequence.analytics.channelPerformance[channel].clicked++;
        break;
      case 'replied':
        sequence.analytics.totalReplied++;
        sequence.analytics.channelPerformance[channel].replied++;
        break;
      case 'converted':
        sequence.analytics.totalConverted++;
        sequence.analytics.channelPerformance[channel].converted++;
        break;
    }

    // Calculate rates
    if (sequence.analytics.totalSent > 0) {
      sequence.analytics.responseRate = (sequence.analytics.totalReplied / sequence.analytics.totalSent) * 100;
      sequence.analytics.conversionRate = (sequence.analytics.totalConverted / sequence.analytics.totalSent) * 100;
    }
  }

  /**
   * Pause a sequence
   */
  async pauseSequence(sequenceId: string): Promise<FollowUpSequence> {
    const sequence = sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    sequence.status = 'paused';
    sequence.updatedAt = new Date();

    console.log(`[FollowUp] Paused sequence: ${sequenceId}`);
    return sequence;
  }

  /**
   * Resume a paused sequence
   */
  async resumeSequence(sequenceId: string): Promise<FollowUpSequence> {
    const sequence = sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    sequence.status = 'active';
    sequence.updatedAt = new Date();

    console.log(`[FollowUp] Resumed sequence: ${sequenceId}`);
    return sequence;
  }

  /**
   * Get sequence execution status
   */
  async getSequenceStatus(sequenceId: string): Promise<any> {
    const sequence = sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    const executions = Array.from(activeExecutions.values()).filter(
      e => e.sequenceId === sequenceId
    );

    return {
      sequenceId,
      status: sequence.status,
      totalExecutions: sequence.executionHistory.length,
      activeExecutions: executions.length,
      lastExecution: sequence.executionHistory[sequence.executionHistory.length - 1],
      analytics: sequence.analytics,
    };
  }

  /**
   * Get sequence analytics
   */
  async getSequenceAnalytics(sequenceId: string): Promise<SequenceAnalytics> {
    const sequence = sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    return sequence.analytics;
  }

  /**
   * Add a channel to existing sequence
   */
  async addChannelToSequence(sequenceId: string, channel: ChannelType, step: FollowUpStep): Promise<FollowUpSequence> {
    const sequence = sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    step.id = step.id || `step_${uuidv4()}`;
    step.channel = channel;
    sequence.steps.push(step);
    sequence.updatedAt = new Date();

    console.log(`[FollowUp] Added ${channel} step to sequence: ${sequenceId}`);
    return sequence;
  }

  /**
   * Remove a channel from sequence
   */
  async removeChannelFromSequence(sequenceId: string, channel: ChannelType): Promise<FollowUpSequence> {
    const sequence = sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    sequence.steps = sequence.steps.filter(s => s.channel !== channel);
    sequence.updatedAt = new Date();

    console.log(`[FollowUp] Removed ${channel} from sequence: ${sequenceId}`);
    return sequence;
  }

  /**
   * Get execution details
   */
  async getExecution(executionId: string): Promise<any> {
    return activeExecutions.get(executionId) || null;
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(executionId: string): Promise<{ success: boolean; message: string }> {
    const execution = activeExecutions.get(executionId);
    if (!execution) {
      return { success: false, message: 'Execution not found' };
    }

    execution.status = 'cancelled';

    // Cancel scheduled jobs for this execution
    scheduledJobs.forEach((job, jobId) => {
      if (job.executionId === executionId) {
        clearTimeout(job.job);
        scheduledJobs.delete(jobId);
      }
    });

    console.log(`[FollowUp] Cancelled execution: ${executionId}`);
    return { success: true, message: 'Execution cancelled' };
  }

  /**
   * Get pre-built templates
   */
  getTemplates(): Partial<FollowUpSequence>[] {
    return followUpTemplates;
  }

  /**
   * Start the processing engine
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[FollowUp] Engine started');
  }

  /**
   * Stop the processing engine
   */
  stop(): void {
    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('[FollowUp] Engine stopped');
  }
}

export const followUpEngine = new FollowUpSequenceEngine();
export default followUpEngine;
