// BOA-SUTAR Bridge Types

export type SyncStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'conflict';
export type SyncDirection = 'boa-to-sutar' | 'sutar-to-boa' | 'bidirectional';
export type AlignmentLevel = 'fully-aligned' | 'mostly-aligned' | 'partially-aligned' | 'misaligned';

export interface BridgeSync {
  id: string;
  boaObjectiveId: string;
  sutarGoalId: string;
  direction: SyncDirection;
  status: SyncStatus;
  lastSyncedAt: Date;
  syncCount: number;
  conflicts: SyncConflict[];
  metadata: Record<string, any>;
}

export interface SyncConflict {
  id: string;
  field: string;
  boaValue: any;
  sutarValue: any;
  detectedAt: Date;
  resolution?: 'pending' | 'boa-wins' | 'sutar-wins' | 'merged' | 'manual';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AlignmentRecord {
  id: string;
  businessUnit: string;
  strategyId: string;
  alignmentLevel: AlignmentLevel;
  alignmentScore: number; // 0-100
  objectives: { boaId: string; sutarId: string; aligned: boolean; drift: number }[];
  assessedAt: Date;
  nextAssessment: Date;
}

export interface FeedbackLoop {
  id: string;
  sutarGoalId: string;
  boaObjectiveId: string;
  feedbackType: 'progress' | 'blocker' | 'completion' | 'deviation' | 'insight';
  message: string;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
  createdAt: Date;
  processed: boolean;
}

export interface StrategicGoal {
  id: string;
  boaObjectiveId: string;
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: string;
  progress: number;
  owner: string;
  dueDate: Date;
  tags: string[];
  metrics: Array<{ name: string; target: number; current: number; unit: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionGoal {
  id: string;
  sutarGoalId: string;
  boaObjectiveId: string;
  status: string;
  progress: number;
  lastExecution: Date;
  executionLog: Array<{ timestamp: Date; event: string; result: string }>;
  blockers: string[];
}
