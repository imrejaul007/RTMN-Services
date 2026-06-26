/**
 * Type definitions for Twin Learning OS
 */

// ============================================================
// TWIN TYPES
// ============================================================

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

export interface TwinSummary {
  who: string | null;
  skills: string[];
  recent: string[];
  patterns: string[];
  connections: number;
}

export interface TwinData {
  identity?: any;
  memory?: any;
  knowledge?: any;
  skills?: any;
  communication?: any;
  workflow?: any;
  decisions?: any;
  relationships?: any;
  reputation?: any;
}

// ============================================================
// LEARNING TYPES
// ============================================================

export interface LearningEvent {
  id?: string;
  employeeId: string;
  type: EventType;
  context?: Record<string, any>;
  choice?: string;
  reasoning?: string;
  workflow?: string;
  steps?: string[];
  outcome?: string;
  channel?: string;
  tone?: string;
  skill?: string;
  proficiency?: number;
  timestamp?: string;
}

export type EventType =
  | 'decision.made'
  | 'workflow.executed'
  | 'communication.sent'
  | 'skill.used'
  | 'employee.created'
  | 'employee.updated'
  | 'employee.deleted'
  | 'meeting.completed'
  | 'performance.review';

export interface LearningPatterns {
  decisionPatterns: DecisionPattern[];
  workflowPatterns: WorkflowPattern[];
  communicationPatterns: CommunicationPattern[];
  skillPatterns: SkillPattern[];
}

export interface DecisionPattern {
  context: Record<string, any>;
  choice: string;
  reasoning: string;
  timestamp: string;
}

export interface WorkflowPattern {
  workflow: string;
  steps: string[];
  outcome: string;
  timestamp: string;
}

export interface CommunicationPattern {
  channel: string;
  tone: string;
  responseTime?: number;
  timestamp: string;
}

export interface SkillPattern {
  skill: string;
  proficiency: number;
  timestamp: string;
}

export interface PatternLearningResult {
  employeeId: string;
  patternsLearned: {
    decisions: number;
    workflows: number;
    communications: number;
    skills: number;
  };
  confidence: number;
}

// ============================================================
// OBSERVATION TYPES
// ============================================================

export interface Observation {
  twinId: string;
  event: LearningEvent;
  timestamp: string;
}

export interface ObservationResult {
  observed: boolean;
  eventType: string;
}

// ============================================================
// TWIN SERVICE TYPES
// ============================================================

export interface TwinServiceConfig {
  name: string;
  url: string;
  timeout: number;
  retries: number;
}

export interface TwinServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// API TYPES
// ============================================================

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  twinsConnected: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
