/**
 * Workflow Bridge - Type Definitions
 * Types for Agent <-> Workflow integration
 */

// ============================================
// EVENT TYPES
// ============================================

export type EventType =
  | 'agent.invoked'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.decision'
  | 'workflow.started'
  | 'workflow.step.completed'
  | 'workflow.step.failed'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.branch.entered'
  | 'workflow.approval.requested'
  | 'workflow.approval.granted'
  | 'workflow.approval.rejected'
  | 'workflow.rollback.started'
  | 'workflow.rollback.completed'
  | 'twin.updated'
  | 'crm.changed'
  | 'schedule.triggered';

export interface WorkflowEvent {
  id: string;
  type: EventType;
  source: 'agent' | 'workflow' | 'schedule' | 'event' | 'user';
  sourceId: string;
  timestamp: Date;
  payload: Record<string, unknown>;
  metadata?: {
    workflowId?: string;
    workflowRunId?: string;
    stepId?: string;
    agentId?: string;
    agentRunId?: string;
    correlationId?: string;
  };
}

// ============================================
// WORKFLOW TYPES
// ============================================

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type WorkflowRunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'rolled_back';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting_approval';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables: Record<string, unknown>;
  errorHandling: 'stop' | 'continue' | 'retry';
  timeout?: number; // seconds
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'agent' | 'manual' | 'api';
  config: {
    eventType?: string; // for event triggers
    cron?: string; // for schedule triggers
    agentId?: string; // for agent triggers
    webhookSecret?: string; // for api triggers
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'trigger' | 'action' | 'condition' | 'branch' | 'approval' | 'agent' | 'transform';
  config: StepConfig;
  next?: string[]; // step IDs
  onError?: 'stop' | 'continue' | 'retry';
  retryConfig?: {
    maxAttempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
}

export type StepConfig =
  | ActionStepConfig
  | ConditionStepConfig
  | BranchStepConfig
  | ApprovalStepConfig
  | AgentStepConfig
  | TransformStepConfig;

export interface ActionStepConfig {
  type: 'action';
  action: 'http' | 'twin' | 'notification' | 'webhook';
  params: Record<string, unknown>;
}

export interface ConditionStepConfig {
  type: 'condition';
  conditions: Condition[];
  operator: 'and' | 'or';
}

export interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists' | 'matches';
  value: unknown;
}

export interface BranchStepConfig {
  type: 'branch';
  branches: {
    id: string;
    name: string;
    condition: Condition | null; // null = default branch
    steps: string[]; // step IDs
  }[];
}

export interface ApprovalStepConfig {
  type: 'approval';
  approvers: string[];
  timeout?: number; // seconds
  reminderInterval?: number; // seconds
  autoApprove?: boolean;
}

export interface AgentStepConfig {
  type: 'agent';
  agentId: string;
  agentType?: string;
  input: Record<string, unknown>;
  waitForDecision?: boolean; // If true, workflow pauses until agent decision
  decisionTimeout?: number; // seconds
}

export interface TransformStepConfig {
  type: 'transform';
  template: string;
  outputVariable: string;
}

// ============================================
// WORKFLOW RUN TYPES
// ============================================

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: WorkflowRunStatus;
  context: Record<string, unknown>;
  currentStepId?: string;
  steps: WorkflowRunStep[];
  startedAt: Date;
  completedAt?: Date;
  triggeredBy: 'agent' | 'schedule' | 'event' | 'manual' | 'api';
  triggeredById?: string;
  error?: string;
  rollbackFrom?: string; // run ID if this is a rollback
}

export interface WorkflowRunStep {
  stepId: string;
  name: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retries: number;
  approvalId?: string;
}

// ============================================
// AGENT TYPES
// ============================================

export type AgentDecisionType =
  | 'approve'
  | 'reject'
  | 'continue'
  | 'branch'
  | 'escalate'
  | 'rollback';

export interface AgentDecision {
  type: AgentDecisionType;
  reason?: string;
  confidence?: number;
  branchId?: string; // for branch decisions
  data?: Record<string, unknown>;
  suggestedNextStep?: string;
}

export interface AgentWorkflowTrigger {
  agentId: string;
  agentRunId: string;
  triggerType: 'decision' | 'completion' | 'error' | 'threshold';
  workflowId: string;
  input: Record<string, unknown>;
  context: Record<string, unknown>;
}

// ============================================
// APPROVAL TYPES
// ============================================

export interface ApprovalRequest {
  id: string;
  workflowRunId: string;
  stepId: string;
  type: 'manual' | 'agent';
  requestedBy: string;
  approvers: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  requestedAt: Date;
  respondedAt?: Date;
  responder?: string;
  comment?: string;
  expiresAt: Date;
}

// ============================================
// API TYPES
// ============================================

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables?: Record<string, unknown>;
  errorHandling?: 'stop' | 'continue' | 'retry';
  timeout?: number;
}

export interface TriggerWorkflowRequest {
  workflowId: string;
  input?: Record<string, unknown>;
  triggeredBy?: 'agent' | 'manual' | 'api';
  triggeredById?: string;
  context?: Record<string, unknown>;
}

export interface AgentTriggerWorkflowRequest {
  agentId: string;
  agentRunId: string;
  workflowId: string;
  decision: AgentDecision;
  input: Record<string, unknown>;
  context: Record<string, unknown>;
}

export interface InvokeAgentInWorkflowRequest {
  agentId: string;
  agentType?: string;
  input: Record<string, unknown>;
  waitForDecision?: boolean;
  decisionTimeout?: number;
}
