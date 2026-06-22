/**
 * Follow-up Automation Engine - Auto-follow-up sequences
 */

export interface FollowUpRule {
  id: string;
  name: string;
  trigger: 'no_reply' | 'opened' | 'clicked' | 'stage_change' | 'time_based';
  conditions: {
    daysSince?: number;
    stage?: string;
    emailSent?: boolean;
  };
  actions: FollowUpAction[];
  active: boolean;
}

export interface FollowUpAction {
  type: 'email' | 'task' | 'slack' | 'sms';
  template: string;
  delayDays: number;
  subject?: string;
  description?: string;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  leadId: string;
  steps: {
    stepNumber: number;
    action: FollowUpAction;
    scheduledFor: Date;
    status: 'pending' | 'sent' | 'skipped' | 'failed';
  }[];
  startedAt: Date;
  completedAt?: Date;
  active: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  leadId: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  assignedTo?: string;
}

export class FollowUpEngine {
  private rules: FollowUpRule[] = [];
  private activeSequences: Map<string, FollowUpSequence> = new Map();

  constructor() {
    this.initDefaultRules();
  }

  /**
   * Start a follow-up sequence for a lead
   */
  startSequence(leadId: string, sequenceName: string): FollowUpSequence {
    const id = 'seq_' + Date.now();
    const now = new Date();

    const sequence: FollowUpSequence = {
      id,
      name: sequenceName,
      leadId,
      steps: this.getDefaultSteps(),
      startedAt: now,
      active: true,
    };

    this.activeSequences.set(leadId, sequence);
    this.scheduleSteps(sequence);

    return sequence;
  }

  /**
   * Evaluate rules and trigger actions
   */
  evaluateRules(context: {
    leadId: string;
    daysSinceContact: number;
    stage: string;
    emailOpened: boolean;
    emailClicked: boolean;
  }): FollowUpAction[] {
    const triggeredActions: FollowUpAction[] = [];

    this.rules.filter(r => r.active).forEach(rule => {
      if (this.matchesConditions(rule, context)) {
        triggeredActions.push(...rule.actions);
      }
    });

    return triggeredActions;
  }

  /**
   * Create a task from trigger
   */
  createTask(leadId: string, title: string, dueInDays: number, priority: Task['priority'] = 'medium'): Task {
    return {
      id: 'task_' + Date.now(),
      title,
      leadId,
      dueDate: new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000),
      priority,
      status: 'pending',
    };
  }

  /**
   * Get all pending tasks for a lead
   */
  getPendingTasks(leadId: string): Task[] {
    // In real implementation, this would query a database
    return [];
  }

  /**
   * Mark task as complete
   */
  completeTask(taskId: string): boolean {
    console.log('Task completed:', taskId);
    return true;
  }

  /**
   * Add custom rule
   */
  addRule(rule: FollowUpRule): void {
    this.rules.push(rule);
  }

  /**
   * Get all rules
   */
  getRules(): FollowUpRule[] {
    return this.rules;
  }

  /**
   * Pause sequence
   */
  pauseSequence(leadId: string): void {
    const seq = this.activeSequences.get(leadId);
    if (seq) seq.active = false;
  }

  /**
   * Resume sequence
   */
  resumeSequence(leadId: string): void {
    const seq = this.activeSequences.get(leadId);
    if (seq) seq.active = true;
  }

  private initDefaultRules(): void {
    this.rules = [
      {
        id: 'rule_1',
        name: 'No Reply - 3 Days',
        trigger: 'no_reply',
        conditions: { daysSince: 3, emailSent: true },
        actions: [
          { type: 'email', template: 'follow_up_1', delayDays: 3, subject: 'Following up' },
          { type: 'task', template: 'call_task', delayDays: 5, description: 'Call if no reply' },
        ],
        active: true,
      },
      {
        id: 'rule_2',
        name: 'Email Opened - 1 Day',
        trigger: 'opened',
        conditions: { daysSince: 1 },
        actions: [
          { type: 'email', template: 'engagement_follow', delayDays: 1, subject: 'Quick question' },
        ],
        active: true,
      },
      {
        id: 'rule_3',
        name: 'Stage Changed to Proposal',
        trigger: 'stage_change',
        conditions: { stage: 'proposal' },
        actions: [
          { type: 'task', template: 'send_proposal', delayDays: 0, description: 'Send proposal document' },
          { type: 'slack', template: 'deal_progress', delayDays: 0 },
        ],
        active: true,
      },
      {
        id: 'rule_4',
        name: 'Weekly Check-in',
        trigger: 'time_based',
        conditions: { daysSince: 7 },
        actions: [
          { type: 'email', template: 'weekly_touch', delayDays: 7, subject: 'Checking in' },
        ],
        active: true,
      },
    ];
  }

  private getDefaultSteps(): FollowUpSequence['steps'] {
    return [
      {
        stepNumber: 1,
        action: { type: 'email', template: 'initial_outreach', delayDays: 0, subject: 'Introduction' },
        scheduledFor: new Date(),
        status: 'pending',
      },
      {
        stepNumber: 2,
        action: { type: 'email', template: 'follow_up_1', delayDays: 3, subject: 'Following up' },
        scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        stepNumber: 3,
        action: { type: 'task', template: 'call_task', delayDays: 5, description: 'Phone call' },
        scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        stepNumber: 4,
        action: { type: 'email', template: 'reengagement', delayDays: 10, subject: 'Final follow-up' },
        scheduledFor: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
    ];
  }

  private scheduleSteps(sequence: FollowUpSequence): void {
    console.log('Scheduling', sequence.steps.length, 'steps for sequence', sequence.id);
  }

  private matchesConditions(rule: FollowUpRule, context: any): boolean {
    if (rule.conditions.daysSince !== undefined && context.daysSinceContact < rule.conditions.daysSince) {
      return false;
    }
    if (rule.conditions.stage && context.stage !== rule.conditions.stage) {
      return false;
    }
    return true;
  }
}