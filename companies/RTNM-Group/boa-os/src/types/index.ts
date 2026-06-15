// ============================================================================
// BOA OS - Strategy Layer Types
// ============================================================================

export type StrategyStatus = 'draft' | 'active' | 'archived' | 'paused';
export type ObjectiveStatus = 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface StrategicPillar {
  id: string;
  name: string;
  description: string;
  theme: string;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Strategy {
  id: string;
  name: string;
  vision: string;
  mission: string;
  description: string;
  pillars: string[]; // StrategicPillar IDs
  horizon: '1-year' | '3-year' | '5-year' | '10-year';
  status: StrategyStatus;
  owner: string;
  startDate: Date;
  endDate: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  description: string;
  metric: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number; // 0-100
  dueDate: Date;
  status: ObjectiveStatus;
}

export interface Objective {
  id: string;
  strategyId: string;
  pillarId: string;
  title: string;
  description: string;
  priority: Priority;
  status: ObjectiveStatus;
  progress: number; // 0-100
  owner: string;
  keyResults: KeyResult[];
  parentObjectiveId?: string;
  tags: string[];
  startDate: Date;
  dueDate: Date;
  sutarGoalId?: string; // Synced to SUTAR GoalOS
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  roadmapId: string;
  title: string;
  description: string;
  targetDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  dependencies: string[]; // Milestone IDs
  deliverables: string[];
  owner: string;
}

export interface Roadmap {
  id: string;
  strategyId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
  status: 'planning' | 'executing' | 'completed' | 'on-hold';
  createdAt: Date;
  updatedAt: Date;
}

export interface NorthStarMetric {
  id: string;
  name: string;
  description: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

export interface SwotAnalysis {
  id: string;
  context: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  createdAt: Date;
}

export interface AlignmentScore {
  businessUnit: string;
  strategyId: string;
  score: number; // 0-100
  alignedObjectives: number;
  totalObjectives: number;
  lastAssessed: Date;
}
