/**
 * Follow-up Automation Engine - Auto-follow-up sequences
 * FIXED: scheduleSteps now returns scheduled steps, notes about persistence requirement
 *
 * NOTE: This engine manages follow-up logic in memory. For production use,
 * integrate with a persistent job queue (Bull, BullMQ, Agenda) to survive restarts.
 */
import { v4 as uuidv4 } from 'uuid';

interface FollowUpStep {
    stepNumber: number;
    action: {
        type: string;
        template: string;
        delayDays: number;
        subject?: string;
        description?: string;
    };
    scheduledFor: Date;
    status: 'pending' | 'completed' | 'failed' | 'skipped';
}

interface FollowUpSequence {
    id: string;
    name: string;
    leadId: string;
    steps: FollowUpStep[];
    startedAt: Date;
    active: boolean;
}

interface FollowUpTask {
    id: string;
    title: string;
    leadId: string;
    dueDate: Date;
    priority: string;
    status: 'pending' | 'completed' | 'failed';
}

interface FollowUpRule {
    id: string;
    name: string;
    trigger: string;
    conditions: Record<string, unknown>;
    actions: Array<{
        type: string;
        template: string;
        delayDays: number;
        subject?: string;
        description?: string;
    }>;
    active: boolean;
}

export class FollowUpEngine {
    private rules: FollowUpRule[] = [];
    // NOTE: In-memory sequences are lost on restart. For production, persist to DB.
    private activeSequences = new Map<string, FollowUpSequence>();

    constructor() {
        this.initDefaultRules();
    }

    /**
     * Start a follow-up sequence for a lead
     */
    startSequence(leadId: string, sequenceName: string): FollowUpSequence {
        const id = 'seq_' + uuidv4();
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
        // FIXED: actually schedule steps (returns for visibility; real scheduling needs a job queue)
        const scheduledSteps = this.scheduleSteps(sequence);
        console.log(`Follow-up sequence ${id} started for lead ${leadId} with ${scheduledSteps.length} steps`);
        return sequence;
    }

    /**
     * Evaluate rules and trigger actions
     */
    evaluateRules(context: Record<string, unknown>): Array<{ type: string; template: string; delayDays: number }> {
        const triggeredActions: Array<{ type: string; template: string; delayDays: number; subject?: string; description?: string }> = [];
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
    createTask(leadId: string, title: string, dueInDays: number, priority = 'medium'): FollowUpTask {
        return {
            id: 'task_' + uuidv4(),
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
    getPendingTasks(leadId: string): FollowUpTask[] {
        // NOTE: In production, query from persistent storage
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
    pauseSequence(leadId: string): boolean {
        const seq = this.activeSequences.get(leadId);
        if (seq) {
            seq.active = false;
            return true;
        }
        return false;
    }

    /**
     * Resume sequence
     */
    resumeSequence(leadId: string): boolean {
        const seq = this.activeSequences.get(leadId);
        if (seq) {
            seq.active = true;
            return true;
        }
        return false;
    }

    /**
     * Get sequence status
     */
    getSequenceStatus(leadId: string): FollowUpSequence | null {
        return this.activeSequences.get(leadId) || null;
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

    private getDefaultSteps(): FollowUpStep[] {
        const now = new Date();
        return [
            {
                stepNumber: 1,
                action: { type: 'email', template: 'initial_outreach', delayDays: 0, subject: 'Introduction' },
                scheduledFor: now,
                status: 'pending',
            },
            {
                stepNumber: 2,
                action: { type: 'email', template: 'follow_up_1', delayDays: 3, subject: 'Following up' },
                scheduledFor: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
                status: 'pending',
            },
            {
                stepNumber: 3,
                action: { type: 'task', template: 'call_task', delayDays: 5, description: 'Phone call' },
                scheduledFor: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
                status: 'pending',
            },
            {
                stepNumber: 4,
                action: { type: 'email', template: 'reengagement', delayDays: 10, subject: 'Final follow-up' },
                scheduledFor: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
                status: 'pending',
            },
        ];
    }

    /**
     * FIXED: Returns scheduled steps for visibility.
     * In production, submit each step to a job queue (Bull, BullMQ, Agenda).
     */
    private scheduleSteps(sequence: FollowUpSequence): FollowUpStep[] {
        console.log(`Scheduling ${sequence.steps.length} steps for sequence ${sequence.id}`);
        const scheduled: FollowUpStep[] = [];
        for (const step of sequence.steps) {
            const scheduledStep: FollowUpStep = {
                ...step,
                scheduledFor: new Date(
                    sequence.startedAt.getTime() + step.action.delayDays * 24 * 60 * 60 * 1000
                ),
                status: 'pending',
            };
            // NOTE: In production, submit to queue here:
            // await queue.add('followup', { sequenceId: sequence.id, step }, { delay: step.action.delayDays * 24 * 60 * 60 * 1000 });
            scheduled.push(scheduledStep);
        }
        return scheduled;
    }

    private matchesConditions(rule: FollowUpRule, context: Record<string, unknown>): boolean {
        if (typeof rule.conditions.daysSince === 'number' && typeof context.daysSinceContact === 'number') {
            if ((context.daysSinceContact as number) < rule.conditions.daysSince) return false;
        }
        if (rule.conditions.stage && context.stage !== rule.conditions.stage) return false;
        return true;
    }
}
