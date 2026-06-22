// ============================================================================
// SUTAR GoalOS - Type Definitions
// ============================================================================

/**
 * Goal status types
 */
export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Priority levels for goals
 */
export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Goal category types
 */
export enum GoalCategory {
  FINANCIAL = 'FINANCIAL',
  OPERATIONAL = 'OPERATIONAL',
  GROWTH = 'GROWTH',
  CUSTOMER = 'CUSTOMER',
  INTERNAL = 'INTERNAL',
  COMPLIANCE = 'COMPLIANCE',
  INNOVATION = 'INNOVATION',
  OTHER = 'OTHER',
}

/**
 * Milestone status
 */
export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  SKIPPED = 'SKIPPED',
}

/**
 * OKR status
 */
export enum OKRStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Key Result type
 */
export enum KeyResultType {
  NUMBER = 'NUMBER',
  PERCENTAGE = 'PERCENTAGE',
  CURRENCY = 'CURRENCY',
  BOOLEAN = 'BOOLEAN',
  RATING = 'RATING',
}

/**
 * Progress tracking
 */
export interface Progress {
  current: number;
  target: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

/**
 * Milestone interface
 */
export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  targetDate: string;
  status: MilestoneStatus;
  progress: Progress;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Key Result interface
 */
export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  description?: string;
  type: KeyResultType;
  currentValue: number;
  targetValue: number;
  unit?: string;
  progress: number;
  confidence?: number;
  status: OKRStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * OKR Objective interface
 */
export interface Objective {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  quarter?: string;
  year?: number;
  status: OKRStatus;
  progress: Progress;
  keyResults: KeyResult[];
  parentObjectiveId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * OKR set interface (Objective + Key Results)
 */
export interface OKRSet {
  id: string;
  goalId: string;
  objective: Objective;
  keyResults: KeyResult[];
  overallProgress: number;
  status: OKRStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Goal interface - main entity
 */
export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  status: GoalStatus;
  priority: Priority;
  progress: Progress;
  deadline?: string;
  startDate: string;
  completedAt?: string;
  parentGoalId?: string;
  childGoalIds: string[];
  milestoneIds: string[];
  okrIds: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Goal analytics
 */
export interface GoalAnalytics {
  goalId: string;
  totalSubGoals: number;
  completedSubGoals: number;
  completionRate: number;
  averageProgress: number;
  onTrack: boolean;
  atRisk: boolean;
  overdueMilestones: number;
  totalMilestones: number;
  totalKeyResults: number;
  krProgress: number;
  trend: 'improving' | 'declining' | 'stable';
  predictedCompletionDate?: string;
  velocity?: number;
  historicalProgress: Array<{ date: string; progress: number }>;
}

/**
 * Goal creation request
 */
export interface CreateGoalRequest {
  title: string;
  description?: string;
  category: GoalCategory;
  priority?: Priority;
  deadline?: string;
  startDate?: string;
  parentGoalId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Goal update request
 */
export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  category?: GoalCategory;
  status?: GoalStatus;
  priority?: Priority;
  deadline?: string;
  progress?: Partial<Progress>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Goal decomposition request
 */
export interface DecomposeGoalRequest {
  strategy?: 'auto' | 'manual';
  maxSubGoals?: number;
  depth?: number;
}

/**
 * Decomposition result
 */
export interface DecompositionResult {
  parentGoal: Goal;
  subGoals: Goal[];
  recommendations?: string[];
}

/**
 * Milestone creation request
 */
export interface CreateMilestoneRequest {
  title: string;
  description?: string;
  targetDate: string;
}

/**
 * Milestone update request
 */
export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  targetDate?: string;
  status?: MilestoneStatus;
  progress?: Partial<Progress>;
}

/**
 * OKR creation request
 */
export interface CreateOKRRequest {
  objectiveTitle: string;
  objectiveDescription?: string;
  quarter?: string;
  year?: number;
  keyResults: Array<{
    title: string;
    description?: string;
    type: KeyResultType;
    targetValue: number;
    unit?: string;
  }>;
}

/**
 * Key Result update request
 */
export interface UpdateKeyResultRequest {
  title?: string;
  description?: string;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  status?: OKRStatus;
}

/**
 * Objective update request
 */
export interface UpdateObjectiveRequest {
  title?: string;
  description?: string;
  status?: OKRStatus;
  quarter?: string;
  year?: number;
}

/**
 * External service integrations
 */
export interface IntegrationConfig {
  decisionEngineUrl: string;
  simulationOsUrl: string;
  timeout: number;
}

/**
 * Decision context for decision engine
 */
export interface DecisionContext {
  userId?: string;
  sessionId?: string;
  decisionType: string;
  amount?: number;
  currency?: string;
  customerTier?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Decision result from decision engine
 */
export interface DecisionResult {
  id: string;
  decisionType: string;
  outcome: string;
  confidence: number;
  reason: string;
  riskAssessment: {
    overallScore: number;
    level: string;
  };
}

/**
 * Simulation result from simulation OS
 */
export interface SimulationResult {
  id: string;
  name: string;
  status: string;
  result?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks?: Record<string, HealthCheckResult>;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  latencyMs?: number;
  message?: string;
}

/**
 * Goal statistics
 */
export interface GoalStats {
  total: number;
  byStatus: Record<GoalStatus, number>;
  byPriority: Record<Priority, number>;
  byCategory: Record<GoalCategory, number>;
  averageProgress: number;
  completedThisPeriod: number;
  overdueGoals: number;
}

/**
 * List query options
 */
export interface ListQueryOptions {
  status?: GoalStatus;
  priority?: Priority;
  category?: GoalCategory;
  parentGoalId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Pagination response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Configuration
 */
export interface Config {
  port: number;
  environment: string;
  decisionEngineUrl: string;
  simulationOsUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}