export interface Task {
  id: string;
  employeeId: string;
  description: string;
  taskType: string;
  capability?: string;
  context: Record<string, any>;
  priority: number;
  status: TaskStatus;
  confidence: number;
  autoApprove: boolean;
  requiresApproval: boolean;
  retryCount: number;
  maxRetries: number;
  scheduledFor?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  rolledBackAt?: string;
  executionId?: string;
  result?: any;
  error?: string;
  rejectionReason?: string;
}

export type TaskStatus = 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed' | 'rolled_back' | 'cancelled';

export interface ToolPermission {
  id: string;
  name: string;
  category: 'communication' | 'data' | 'operations' | 'workflow';
  risk: 'critical' | 'high' | 'medium' | 'low';
  allowed: boolean;
}

export interface TaskSubmission {
  employeeId: string;
  description: string;
  taskType: string;
  capability?: string;
  context?: Record<string, any>;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  scheduledFor?: string;
}
