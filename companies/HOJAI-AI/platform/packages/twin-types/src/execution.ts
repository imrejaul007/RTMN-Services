/**
 * Execution Types
 * Task execution, autonomy control, and 24x7 operation
 */

/**
 * Execution mode
 */
export type ExecutionMode = 'shadow' | 'assist' | 'delegate' | 'autonomous';

/**
 * Task status
 */
export type TaskStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'rolled_back'
  | 'cancelled';

/**
 * Task priority
 */
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Task type
 */
export type TaskType =
  | 'email'
  | 'crm'
  | 'calendar'
  | 'document'
  | 'approval'
  | 'payment'
  | 'procurement'
  | 'communication';

/**
 * Tool permission
 */
export interface ToolPermission {
  id: string;
  name: string;
  category: 'communication' | 'data' | 'operations' | 'workflow';
  risk: 'low' | 'medium' | 'high' | 'critical';
  allowed: boolean;
}

/**
 * Task context
 */
export interface TaskContext {
  [key: string]: any;
}

/**
 * Task result
 */
export interface TaskResult {
  success: boolean;
  output?: any;
  executionTime?: number;      // milliseconds
  nextSteps?: string[];
}

/**
 * Task error
 */
export interface TaskError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, any>;
}

/**
 * Primary Task interface
 */
export interface Task {
  id: string;
  employeeId: string;
  description: string;
  taskType: TaskType;
  capability?: string;
  context: TaskContext;
  priority: TaskPriority;
  status: TaskStatus;
  confidence: number;           // 0-100
  autoApprove: boolean;
  requiresApproval: boolean;
  retryCount: number;
  maxRetries: number;
  scheduledFor?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  rolledBackAt?: string;
  executionId?: string;
  result?: TaskResult;
  error?: TaskError;
}

/**
 * Confidence thresholds
 */
export interface ConfidenceThresholds {
  critical: number;           // 99 - always ask
  high: number;               // 95 - manager approval
  medium: number;             // 85 - auto-execute
  low: number;               // 70 - auto-execute
}

/**
 * Boundary configuration
 */
export interface Boundary {
  id: string;
  type: 'amount' | 'vendor' | 'risk' | 'department' | 'time';
  condition: string;
  allowed: boolean;
  maxValue?: number;
  approverRole?: string;
  createdAt: string;
}

/**
 * Working hours configuration
 */
export interface WorkingHours {
  enabled: boolean;
  timezone: string;
  schedule: {
    day: string;
    enabled: boolean;
    startTime?: string;
    endTime?: string;
  }[];
  weekendMode: 'off' | 'limited' | 'full';
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  push: boolean;
  email: boolean;
  slack: boolean;
  teams: boolean;
  threshold: 'critical' | 'high' | 'all';
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

/**
 * Emergency stop configuration
 */
export interface EmergencyStop {
  enabled: boolean;
  triggers: string[];
  contacts: {
    name: string;
    phone: string;
    email: string;
    role: string;
  }[];
  autoEscalate: boolean;
  escalationMinutes: number;
}

/**
 * Autonomy settings
 */
export interface AutonomySettings {
  employeeId: string;
  mode: ExecutionMode;
  boundaries: Boundary[];
  confidenceThresholds: ConfidenceThresholds;
  workingHours: WorkingHours;
  notificationSettings: NotificationSettings;
  emergencyStop: EmergencyStop;
  learning: {
    askForFeedback: boolean;
    learnFromDecisions: boolean;
    updateConfidence: boolean;
  };
  updatedAt: string;
}

/**
 * Approval request
 */
export interface ApprovalRequest {
  id: string;
  taskId: string;
  employeeId: string;
  approverId: string;
  description: string;
  context: TaskContext;
  priority: TaskPriority;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  comments?: string;
  requestedAt: string;
  respondedAt?: string;
  escalatedAt?: string;
}

/**
 * Sleep mode configuration
 */
export interface SleepMode {
  actions: 'none' | 'critical_only' | 'limited';
  notifications: boolean;
  urgentOnly: boolean;
}

/**
 * Standby mode configuration
 */
export interface StandbyMode {
  actions: ('suggestions' | 'drafts' | 'scheduled')[];
  preExecute: boolean;
  notifications: boolean;
}

/**
 * Sleep schedule
 */
export interface SleepSchedule {
  employeeId: string;
  timezone: string;
  sleepHours: {
    start: string;           // "22:00"
    end: string;             // "06:00"
  };
  modes: {
    sleep: SleepMode;
    standby: StandbyMode;
    active: {
      fullExecution: boolean;
      notifications: boolean;
    };
  };
  emergency: {
    wakeTriggers: string[];
    alwaysOn: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Execution queue item
 */
export interface QueueItem {
  id: string;
  taskId: string;
  employeeId: string;
  priority: TaskPriority;
  scheduledFor?: string;
  enqueuedAt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

/**
 * Execution history
 */
export interface ExecutionHistory {
  employeeId: string;
  period: {
    start: string;
    end: string;
  };
  totalTasks: number;
  completed: number;
  failed: number;
  cancelled: number;
  byType: Record<TaskType, number>;
  byPriority: Record<TaskPriority, number>;
  avgConfidence: number;
  avgExecutionTime: number;     // milliseconds
  autoApproved: number;
  humanApproved: number;
}

/**
 * Escalation record
 */
export interface Escalation {
  id: string;
  taskId: string;
  employeeId: string;
  reason: string;
  escalatedTo: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

/**
 * Skill permission
 */
export interface SkillPermission {
  skillId: string;
  allowed: boolean;
  maxUsage?: number;
  usageCount?: number;
  expiresAt?: string;
}

/**
 * Twin capability
 */
export interface TwinCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  confidence: number;           // 0-100
  learnable: boolean;
  autoExecutable: boolean;
  requiresApproval: boolean;
  relatedSkills: string[];
}

/**
 * Shadow session
 */
export interface ShadowSession {
  id: string;
  employeeId: string;
  startedAt: string;
  endedAt?: string;
  actionsObserved: number;
  suggestionsGenerated: number;
  suggestionsAccepted: number;
  status: 'active' | 'paused' | 'ended';
}

/**
 * Suggestion from twin
 */
export interface TwinSuggestion {
  id: string;
  sessionId: string;
  employeeId: string;
  description: string;
  confidence: number;           // 0-100
  reasoning: string;
  taskContext: TaskContext;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  feedback?: string;
  createdAt: string;
  respondedAt?: string;
}

/**
 * Emergency stop event
 */
export interface EmergencyStopEvent {
  id: string;
  employeeId: string;
  reason: string;
  triggeredBy: 'system' | 'user';
  affectedTasks: string[];
  status: 'triggered' | 'acknowledged' | 'resolved';
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolution?: string;
}
