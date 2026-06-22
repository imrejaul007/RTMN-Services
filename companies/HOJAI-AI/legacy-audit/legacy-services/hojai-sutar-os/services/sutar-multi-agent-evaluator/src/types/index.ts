// Agent Types
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: string[];
  status: AgentStatus;
  score: number;
  metrics: AgentMetrics;
  createdAt: string;
  updatedAt: string;
}

export type AgentType = 'coordinator' | 'executor' | 'evaluator' | 'specialist';

export type AgentStatus = 'available' | 'busy' | 'offline' | 'error';

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  averageScore: number;
  responseTime: number;
  uptime: number;
  collaborationScore: number;
}

// Task Types
export interface Task {
  id: string;
  type: TaskType;
  description: string;
  priority: TaskPriority;
  requiredCapabilities: string[];
  assignedAgents: string[];
  status: TaskStatus;
  result?: TaskResult;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type TaskType = 'analysis' | 'execution' | 'evaluation' | 'coordination' | 'collaborative';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface TaskResult {
  output: unknown;
  score: number;
  feedback: string;
  executionTime: number;
}

// Evaluation Types
export interface Evaluation {
  id: string;
  taskId: string;
  agentId: string;
  criteria: EvaluationCriteria[];
  overallScore: number;
  verdict: EvaluationVerdict;
  feedback: string;
  timestamp: string;
}

export interface EvaluationCriteria {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  notes?: string;
}

export type EvaluationVerdict = 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed';

// Consensus Types
export interface ConsensusRequest {
  taskId: string;
  agentIds: string[];
  decisionType: DecisionType;
  context: Record<string, unknown>;
}

export type DecisionType = 'task_assignment' | 'agent_selection' | 'performance_review' | 'capability_assessment';

export interface ConsensusResult {
  consensusId: string;
  agreed: boolean;
  decision: unknown;
  confidence: number;
  agentVotes: AgentVote[];
  timestamp: string;
}

export interface AgentVote {
  agentId: string;
  vote: unknown;
  confidence: number;
  reasoning: string;
}

// Collaboration Types
export interface CollaborationSession {
  id: string;
  taskId: string;
  participants: string[];
  status: CollaborationStatus;
  rounds: CollaborationRound[];
  finalResult?: unknown;
  createdAt: string;
  updatedAt: string;
}

export type CollaborationStatus = 'pending' | 'active' | 'converging' | 'completed' | 'failed';

export interface CollaborationRound {
  roundNumber: number;
  agentContributions: AgentContribution[];
  aggregatedInsight: string;
  timestamp: string;
}

export interface AgentContribution {
  agentId: string;
  contribution: unknown;
  relevance: number;
}

// Performance Types
export interface PerformanceReport {
  agentId: string;
  period: TimePeriod;
  metrics: PerformanceMetrics;
  trends: PerformanceTrend[];
  recommendations: string[];
}

export interface TimePeriod {
  start: string;
  end: string;
}

export interface PerformanceMetrics {
  totalTasks: number;
  successRate: number;
  averageScore: number;
  averageResponseTime: number;
  collaborationRate: number;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
}

// API Request/Response Types
export interface EvaluateRequest {
  agentIds: string[];
  taskId?: string;
  criteria?: Partial<EvaluationCriteria>[];
}

export interface AssignRequest {
  taskId: string;
  preferredAgents?: string[];
  requiredCapabilities?: string[];
  priority?: TaskPriority;
}

export interface CollaborateRequest {
  taskId: string;
  agentIds: string[];
  maxRounds?: number;
  strategy?: CollaborationStrategy;
}

export type CollaborationStrategy = 'sequential' | 'parallel' | 'hierarchical' | 'democratic';

// External Service Integration
export interface AgentNetworkAgent {
  id: string;
  name: string;
  capabilities: string[];
  availability: boolean;
  currentLoad: number;
}

export interface DecisionEngineRequest {
  type: string;
  agents: string[];
  task: {
    id: string;
    type: string;
    requirements: string[];
  };
  context: Record<string, unknown>;
}

// API Response Wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// Config and Health
export interface Config {
  port: number;
  environment: string;
  agentNetworkUrl: string;
  decisionEngineUrl: string;
  rateLimitWindow: number;
  rateLimitMax: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  dependencies: {
    agentNetwork: string;
    decisionEngine: string;
  };
}
