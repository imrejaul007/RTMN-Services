export interface TwinContext {
  employeeId: string;
  timestamp: string;
  health: TwinHealth;
  twins: TwinData;
  summary: TwinSummary;
}

export interface TwinHealth {
  coverage: number;
  score: number;
  level: 'new' | 'developing' | 'healthy';
  twinsPopulated: number;
  twinsTotal: number;
}

export interface TwinData {
  identity?: any;
  memory?: any;
  knowledge?: any;
  communication?: any;
  workflow?: any;
  decision?: any;
  relationship?: any;
  reputation?: any;
  skill?: any;
}

export interface TwinSummary {
  name: string;
  role: string;
  level: number;
  totalPatterns: number;
  activeTasks: number;
  pendingFeedback: number;
  keyStrengths: string[];
  growthAreas: string[];
}

export type EventType = 'decision.made' | 'workflow.executed' | 'communication.sent' | 'skill.used';

export interface TaskSubmission {
  description: string;
  taskType: string;
  capability?: string;
  context?: Record<string, any>;
  priority?: 'critical' | 'high' | 'normal' | 'low';
}

export interface FeedbackSubmission {
  capability: string;
  feedbackType: 'approve' | 'reject' | 'correct' | 'explain' | 'suggest';
  twinAction?: any;
  correction?: any;
}
