/**
 * Workflow Twin Types
 * Workflow patterns, task sequences, and SOPs
 */

/**
 * Workflow trigger types
 */
export type WorkflowTriggerType = 'event' | 'schedule' | 'manual' | 'webhook' | 'api';

/**
 * Workflow status
 */
export type WorkflowStatus = 'active' | 'paused' | 'archived' | 'draft';

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  action: string;
  tool: string;
  expectedOutput?: string;
  alternatePaths: string[];
  avgDuration: number;       // minutes
  successConditions: string[];
  canBeSkipped: boolean;
  requiresApproval: boolean;
  approverRole?: string;
}

/**
 * Workflow trigger configuration
 */
export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  eventType?: string;         // for event-based
  schedule?: string;          // cron expression for scheduled
  enabled: boolean;
  conditions?: Record<string, any>;
}

/**
 * Approval step
 */
export interface ApprovalStep {
  id: string;
  order: number;
  name: string;
  threshold: number;          // amount, urgency, etc.
  approvers: string[];        // role IDs or user IDs
  escalationTimeout?: number; // minutes
  escalationPath?: string[];
}

/**
 * Workflow pattern
 */
export interface WorkflowPattern {
  id: string;
  employeeId: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  approvals: ApprovalStep[];
  tools: string[];
  avgDuration: number;        // minutes
  frequency: number;          // per month
  successRate: number;        // 0-1
  confidence: number;         // 0-100
  variations: number;
  learnedFrom: number;        // number of observations
  lastTriggered?: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Task sequence action
 */
export interface TaskSequenceAction {
  type: 'click' | 'type' | 'navigate' | 'extract' | 'wait' | 'approve' | 'reject' | 'custom';
  target?: string;
  value?: any;
  timestamp: string;
  duration?: number;          // milliseconds
  outcome: 'success' | 'failure' | 'skipped';
  error?: string;
}

/**
 * Task sequence
 */
export interface TaskSequence {
  id: string;
  employeeId: string;
  workflowId?: string;
  name: string;
  steps: TaskSequenceAction[];
  startTime: string;
  endTime?: string;
  totalDuration?: number;     // milliseconds
  outcome?: 'completed' | 'failed' | 'cancelled' | 'pending';
  context?: Record<string, any>;
  parentTaskId?: string;
}

/**
 * Observed action from employee
 */
export interface ObservedAction {
  id: string;
  employeeId: string;
  tool: string;
  action: string;
  target: string;
  timestamp: string;
  duration?: number;
  outcome: 'success' | 'failure';
  result?: any;
  error?: string;
  context?: Record<string, any>;
}

/**
 * SOP (Standard Operating Procedure)
 */
export interface StandardOperatingProcedure {
  id: string;
  employeeId?: string;         // null for company-wide SOPs
  departmentId?: string;
  name: string;
  description: string;
  category: string;
  version: string;
  steps: WorkflowStep[];
  approvalRequired: boolean;
  approvers: string[];
  effectiveDate: string;
  reviewDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Workflow simulation request
 */
export interface WorkflowSimulationRequest {
  employeeId: string;
  workflowId?: string;
  context: Record<string, any>;
  dryRun?: boolean;
}

/**
 * Workflow simulation result
 */
export interface WorkflowSimulationResult {
  employeeId: string;
  predictedSteps: WorkflowStep[];
  confidence: number;
  estimatedDuration: number;
  warnings?: string[];
  suggestions?: string[];
}

/**
 * Workflow learning event
 */
export interface WorkflowLearningEvent {
  employeeId: string;
  workflowName?: string;
  actions: ObservedAction[];
  timestamp: string;
  context: Record<string, any>;
  outcome: 'success' | 'failure' | 'partial';
  lessons?: string[];
}

/**
 * Workflow analytics
 */
export interface WorkflowAnalytics {
  employeeId: string;
  totalWorkflows: number;
  activeWorkflows: number;
  avgCompletionTime: number;
  successRate: number;
  mostUsedTools: string[];
  bottleneckSteps: WorkflowStep[];
  improvementSuggestions: string[];
  period: {
    start: string;
    end: string;
  };
}

/**
 * Workflow comparison
 */
export interface WorkflowComparison {
  workflowA: WorkflowPattern;
  workflowB: WorkflowPattern;
  similarities: string[];
  differences: string[];
  efficiencyScore: number;     // 0-100
  recommendation: string;
}

/**
 * Automation opportunity
 */
export interface AutomationOpportunity {
  id: string;
  employeeId: string;
  workflowName: string;
  currentSteps: WorkflowStep[];
  automatableSteps: string[];
  estimatedTimeSaved: number;  // minutes per execution
  estimatedCostSavings: number;
  confidence: number;
  roi: number;
  priority: 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
}
