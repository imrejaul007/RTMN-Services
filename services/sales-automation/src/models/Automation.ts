import { v4 as uuidv4 } from 'uuid';

// Follow-up Types
export type FollowUpType = 'email' | 'sms' | 'push' | 'call';
export type FollowUpStatus = 'pending' | 'sent' | 'failed' | 'skipped' | 'completed';

export interface FollowUp {
  id: string;
  leadId: string;
  dealId?: string;
  type: FollowUpType;
  channel: string;
  template: string;
  subject?: string;
  scheduledAt: Date;
  executedAt?: Date;
  status: FollowUpStatus;
  attempts: number;
  maxAttempts: number;
  sequence: number;
  priority: 'high' | 'medium' | 'low';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  leadId: string;
  steps: FollowUpStep[];
  active: boolean;
  currentStep: number;
  completedAt?: Date;
  createdAt: Date;
}

export interface FollowUpStep {
  id: string;
  type: FollowUpType;
  delayMinutes: number;
  template: string;
  subject?: string;
  condition?: string;
}

// Routing Types
export type RoutingPriority = 'high' | 'medium' | 'low';
export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RoutingRule {
  id: string;
  name: string;
  description?: string;
  conditions: Condition[];
  targetQueue: string;
  targetAgent?: string;
  priority: RoutingPriority;
  score?: number;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Queue {
  id: string;
  name: string;
  description?: string;
  agents: string[];
  capacity: number;
  currentLoad: number;
  averageResponseTime: number;
  priority: RoutingPriority;
  active: boolean;
  createdAt: Date;
}

export interface RouteAssignment {
  id: string;
  leadId: string;
  dealId?: string;
  ruleId?: string;
  queueId?: string;
  agentId?: string;
  priority: RoutingPriority;
  score: number;
  assignedAt: Date;
  status: 'assigned' | 'accepted' | 'rejected' | 'transferred';
}

// Escalation Types
export type EscalationStatus = 'pending' | 'triggered' | 'in_progress' | 'resolved' | 'cancelled';
export type EscalationLevel = 1 | 2 | 3 | 4;

export interface EscalationRule {
  id: string;
  name: string;
  description?: string;
  triggerType: 'response_time' | 'sla_breach' | 'priority' | 'manual' | 'condition';
  triggerCondition?: string;
  escalationLevels: EscalationLevelConfig[];
  responseTimeMinutes: number;
  urgentThresholdMinutes?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationLevelConfig {
  level: EscalationLevel;
  name: string;
  targetType: 'queue' | 'agent' | 'supervisor' | 'manager';
  targetId?: string;
  notifyChannels: string[];
  responseTimeMinutes: number;
  autoEscalate: boolean;
}

export interface Escalation {
  id: string;
  ruleId?: string;
  leadId: string;
  dealId?: string;
  currentLevel: EscalationLevel;
  status: EscalationStatus;
  triggeredAt: Date;
  resolvedAt?: Date;
  notes: string[];
  history: EscalationHistoryEntry[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationHistoryEntry {
  level: EscalationLevel;
  action: 'triggered' | 'notified' | 'acknowledged' | 'resolved' | 'escalated';
  timestamp: Date;
  actor?: string;
  notes?: string;
}

// Workflow Types
export type TriggerType = 'event' | 'schedule' | 'condition' | 'manual';
export type ActionType = 'followup' | 'route' | 'escalate' | 'notify' | 'update' | 'webhook';

export interface Trigger {
  id: string;
  type: TriggerType;
  event?: string;
  schedule?: string;
  condition?: string;
  conditions?: Condition[];
  enabled: boolean;
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  order: number;
  config: Record<string, any>;
  delayMinutes?: number;
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  triggers: Trigger[];
  actions: WorkflowAction[];
  active: boolean;
  executionCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggerType: string;
  triggerData: Record<string, any>;
  actionsExecuted: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  results: Record<string, any>;
}

// Stats Types
export interface AutomationStats {
  followUps: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    completed: number;
  };
  routing: {
    total: number;
    byPriority: Record<RoutingPriority, number>;
    averageScore: number;
  };
  escalations: {
    total: number;
    pending: number;
    resolved: number;
    avgResolutionTime: number;
  };
  workflows: {
    total: number;
    active: number;
    executions: number;
  };
}

// In-memory storage
class AutomationStore {
  private followUps: Map<string, FollowUp> = new Map();
  private followUpSequences: Map<string, FollowUpSequence> = new Map();
  private routingRules: Map<string, RoutingRule> = new Map();
  private queues: Map<string, Queue> = new Map();
  private routeAssignments: Map<string, RouteAssignment> = new Map();
  private escalationRules: Map<string, EscalationRule> = new Map();
  private escalations: Map<string, Escalation> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private workflowExecutions: Map<string, WorkflowExecution> = new Map();

  // Follow-ups
  createFollowUp(data: Partial<FollowUp>): FollowUp {
    const followUp: FollowUp = {
      id: uuidv4(),
      leadId: data.leadId || '',
      dealId: data.dealId,
      type: data.type || 'email',
      channel: data.channel || 'email',
      template: data.template || '',
      subject: data.subject,
      scheduledAt: data.scheduledAt || new Date(),
      status: 'pending',
      attempts: 0,
      maxAttempts: data.maxAttempts || 5,
      sequence: data.sequence || 1,
      priority: data.priority || 'medium',
      metadata: data.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.followUps.set(followUp.id, followUp);
    return followUp;
  }

  getFollowUp(id: string): FollowUp | undefined {
    return this.followUps.get(id);
  }

  getAllFollowUps(): FollowUp[] {
    return Array.from(this.followUps.values());
  }

  updateFollowUp(id: string, data: Partial<FollowUp>): FollowUp | undefined {
    const followUp = this.followUps.get(id);
    if (followUp) {
      Object.assign(followUp, data, { updatedAt: new Date() });
      return followUp;
    }
    return undefined;
  }

  deleteFollowUp(id: string): boolean {
    return this.followUps.delete(id);
  }

  // Routing Rules
  createRoutingRule(data: Partial<RoutingRule>): RoutingRule {
    const rule: RoutingRule = {
      id: uuidv4(),
      name: data.name || '',
      description: data.description,
      conditions: data.conditions || [],
      targetQueue: data.targetQueue || 'general',
      targetAgent: data.targetAgent,
      priority: data.priority || 'medium',
      score: data.score,
      active: data.active !== false,
      order: data.order || 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.routingRules.set(rule.id, rule);
    return rule;
  }

  getRoutingRule(id: string): RoutingRule | undefined {
    return this.routingRules.get(id);
  }

  getAllRoutingRules(): RoutingRule[] {
    return Array.from(this.routingRules.values()).sort((a, b) => a.order - b.order);
  }

  updateRoutingRule(id: string, data: Partial<RoutingRule>): RoutingRule | undefined {
    const rule = this.routingRules.get(id);
    if (rule) {
      Object.assign(rule, data, { updatedAt: new Date() });
      return rule;
    }
    return undefined;
  }

  deleteRoutingRule(id: string): boolean {
    return this.routingRules.delete(id);
  }

  // Queues
  createQueue(data: Partial<Queue>): Queue {
    const queue: Queue = {
      id: uuidv4(),
      name: data.name || '',
      description: data.description,
      agents: data.agents || [],
      capacity: data.capacity || 10,
      currentLoad: 0,
      averageResponseTime: 0,
      priority: data.priority || 'medium',
      active: data.active !== false,
      createdAt: new Date()
    };
    this.queues.set(queue.id, queue);
    return queue;
  }

  getQueue(id: string): Queue | undefined {
    return this.queues.get(id);
  }

  getAllQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  // Route Assignments
  createRouteAssignment(data: Partial<RouteAssignment>): RouteAssignment {
    const assignment: RouteAssignment = {
      id: uuidv4(),
      leadId: data.leadId || '',
      dealId: data.dealId,
      ruleId: data.ruleId,
      queueId: data.queueId,
      agentId: data.agentId,
      priority: data.priority || 'medium',
      score: data.score || 0,
      assignedAt: new Date(),
      status: 'assigned'
    };
    this.routeAssignments.set(assignment.id, assignment);
    return assignment;
  }

  // Escalation Rules
  createEscalationRule(data: Partial<EscalationRule>): EscalationRule {
    const rule: EscalationRule = {
      id: uuidv4(),
      name: data.name || '',
      description: data.description,
      triggerType: data.triggerType || 'response_time',
      triggerCondition: data.triggerCondition,
      escalationLevels: data.escalationLevels || [],
      responseTimeMinutes: data.responseTimeMinutes || 60,
      urgentThresholdMinutes: data.urgentThresholdMinutes,
      active: data.active !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.escalationRules.set(rule.id, rule);
    return rule;
  }

  getEscalationRule(id: string): EscalationRule | undefined {
    return this.escalationRules.get(id);
  }

  getAllEscalationRules(): EscalationRule[] {
    return Array.from(this.escalationRules.values());
  }

  updateEscalationRule(id: string, data: Partial<EscalationRule>): EscalationRule | undefined {
    const rule = this.escalationRules.get(id);
    if (rule) {
      Object.assign(rule, data, { updatedAt: new Date() });
      return rule;
    }
    return undefined;
  }

  deleteEscalationRule(id: string): boolean {
    return this.escalationRules.delete(id);
  }

  // Escalations
  createEscalation(data: Partial<Escalation>): Escalation {
    const escalation: Escalation = {
      id: uuidv4(),
      ruleId: data.ruleId,
      leadId: data.leadId || '',
      dealId: data.dealId,
      currentLevel: data.currentLevel || 1,
      status: 'pending',
      triggeredAt: new Date(),
      notes: [],
      history: [{
        level: 1,
        action: 'triggered',
        timestamp: new Date()
      }],
      metadata: data.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.escalations.set(escalation.id, escalation);
    return escalation;
  }

  getEscalation(id: string): Escalation | undefined {
    return this.escalations.get(id);
  }

  getAllEscalations(): Escalation[] {
    return Array.from(this.escalations.values());
  }

  getPendingEscalations(): Escalation[] {
    return Array.from(this.escalations.values()).filter(e => e.status === 'pending' || e.status === 'in_progress');
  }

  updateEscalation(id: string, data: Partial<Escalation>): Escalation | undefined {
    const escalation = this.escalations.get(id);
    if (escalation) {
      Object.assign(escalation, data, { updatedAt: new Date() });
      return escalation;
    }
    return undefined;
  }

  // Workflows
  createWorkflow(data: Partial<Workflow>): Workflow {
    const workflow: Workflow = {
      id: uuidv4(),
      name: data.name || '',
      description: data.description,
      triggers: data.triggers || [],
      actions: data.actions || [],
      active: data.active || false,
      executionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  updateWorkflow(id: string, data: Partial<Workflow>): Workflow | undefined {
    const workflow = this.workflows.get(id);
    if (workflow) {
      Object.assign(workflow, data, { updatedAt: new Date() });
      return workflow;
    }
    return undefined;
  }

  deleteWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }

  // Workflow Executions
  createWorkflowExecution(data: Partial<WorkflowExecution>): WorkflowExecution {
    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId: data.workflowId || '',
      triggerType: data.triggerType || 'manual',
      triggerData: data.triggerData || {},
      actionsExecuted: 0,
      status: 'running',
      startedAt: new Date(),
      results: {}
    };
    this.workflowExecutions.set(execution.id, execution);
    return execution;
  }

  getWorkflowExecution(id: string): WorkflowExecution | undefined {
    return this.workflowExecutions.get(id);
  }

  getExecutionsByWorkflow(workflowId: string): WorkflowExecution[] {
    return Array.from(this.workflowExecutions.values()).filter(e => e.workflowId === workflowId);
  }

  // Stats
  getStats(): AutomationStats {
    const followUps = this.getAllFollowUps();
    const escalations = this.getAllEscalations();
    const workflows = this.getAllWorkflows();
    const assignments = Array.from(this.routeAssignments.values());

    return {
      followUps: {
        total: followUps.length,
        pending: followUps.filter(f => f.status === 'pending').length,
        sent: followUps.filter(f => f.status === 'sent').length,
        failed: followUps.filter(f => f.status === 'failed').length,
        completed: followUps.filter(f => f.status === 'completed').length
      },
      routing: {
        total: assignments.length,
        byPriority: {
          high: assignments.filter(a => a.priority === 'high').length,
          medium: assignments.filter(a => a.priority === 'medium').length,
          low: assignments.filter(a => a.priority === 'low').length
        },
        averageScore: assignments.length > 0
          ? assignments.reduce((sum, a) => sum + a.score, 0) / assignments.length
          : 0
      },
      escalations: {
        total: escalations.length,
        pending: escalations.filter(e => e.status === 'pending' || e.status === 'in_progress').length,
        resolved: escalations.filter(e => e.status === 'resolved').length,
        avgResolutionTime: 0
      },
      workflows: {
        total: workflows.length,
        active: workflows.filter(w => w.active).length,
        executions: Array.from(this.workflowExecutions.values()).length
      }
    };
  }
}

export const store = new AutomationStore();
