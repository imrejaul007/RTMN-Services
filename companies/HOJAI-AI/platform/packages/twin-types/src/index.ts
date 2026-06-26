/**
 * Twin Types - Shared types for all Twin services
 *
 * A comprehensive type system for the Employee Twin ecosystem
 *
 * @package @hojai/twin-types
 * @version 1.0.0
 */

// ============================================================
// Common Types
// ============================================================
export * from './common.js';

// ============================================================
// Employee Types
// ============================================================
export * from './employee.js';

// ============================================================
// Communication Twin Types
// ============================================================
export * from './communication.js';

// ============================================================
// Workflow Twin Types
// ============================================================
export * from './workflow.js';

// ============================================================
// Decision Twin Types
// ============================================================
export * from './decision.js';

// ============================================================
// Relationship Twin Types
// ============================================================
export * from './relationship.js';

// ============================================================
// Behavioral Twin Types
// ============================================================
export * from './behavioral.js';

// ============================================================
// Knowledge Twin Types
// ============================================================
export * from './knowledge.js';

// ============================================================
// Reputation Twin Types
// ============================================================
export * from './reputation.js';

// ============================================================
// Execution Types
// ============================================================
export * from './execution.js';

// ============================================================
// Observation Types
// ============================================================
export * from './observation.js';

// ============================================================
// Twin Service Types
// ============================================================

/**
 * Twin service identifiers
 */
export const TWIN_SERVICES = {
  EMPLOYEE_TWIN: 4730,
  MEMORY_TWIN: 4738,
  KNOWLEDGE_TWIN: 4739,
  SKILL_TWIN: 4740,
  WORKFLOW_TWIN: 4741,
  DECISION_TWIN: 4742,
  COMMUNICATION_TWIN: 4743,
  RELATIONSHIP_TWIN: 4744,
  REPUTATION_TWIN: 4745,
  BEHAVIORAL_TWIN: 4746,
  TWIN_OBSERVER: 4747,
  HUMAN_TEACHING: 4748,
  MEETING_INTELLIGENCE: 4749,
  SKILL_WALLET: 4750,
  BROWSER_AGENT: 4751,
  DESKTOP_AGENT: 4752,
  CONNECTOR_REGISTRY: 4753,
  SKILL_CREATOR_STUDIO: 4754,
  SKILL_CERTIFICATION: 4755,
  SKILL_ANALYTICS: 4756,
  CREATOR_PAYOUT: 4757,
  BAM_SKILL_ADAPTER: 4758,
  ENTERPRISE_SKILL_PORTAL: 4759,
  TWIN_AUTONOMY_CONTROLLER: 4760,
  EXECUTION_ENGINE_24X7: 4761,
  TWIN_SHADOW_MODE: 4762,
  EMERGENCY_STOP: 4763,
  NOTIFICATION_ORCHESTRATOR: 4764,
  TWIN_DASHBOARD: 4770,
  TWIN_MOBILE: 4771,
  TWIN_ANALYTICS: 4772,
  TWIN_HEALTH_MONITOR: 4773,
} as const;

/**
 * All 9 twin types
 */
export const TWIN_TYPES = [
  'identity',
  'memory',
  'knowledge',
  'communication',
  'workflow',
  'decision',
  'relationship',
  'behavioral',
  'reputation',
] as const;

export type TwinType = typeof TWIN_TYPES[number];

/**
 * Twin health levels
 */
export type TwinHealthLevel = 'new' | 'developing' | 'healthy' | 'mature';

/**
 * Twin status
 */
export type TwinStatus = 'new' | 'learning' | 'active' | 'paused' | 'archived';

/**
 * Twin health response
 */
export interface TwinHealth {
  coverage: number;         // 0-100
  score: number;            // 0-100
  level: TwinHealthLevel;
  twinsPopulated: number;
  twinsTotal: number;
  lastUpdated: string;
}

/**
 * Complete twin context
 */
export interface TwinContext {
  employeeId: string;
  timestamp: string;
  health: TwinHealth;
  twins: {
    identity?: any;
    memory?: any;
    knowledge?: any;
    skills?: any;
    communication?: any;
    workflow?: any;
    decisions?: any;
    relationships?: any;
    reputation?: any;
  };
  summary: {
    who: string | null;
    skills: string[];
    recent: string[];
    patterns: string[];
    connections: number;
  };
}

/**
 * Learning event types
 */
export const LEARNING_EVENT_TYPES = {
  DECISION_MADE: 'decision.made',
  WORKFLOW_EXECUTED: 'workflow.executed',
  COMMUNICATION_SENT: 'communication.sent',
  SKILL_USED: 'skill.used',
  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_DELETED: 'employee.deleted',
  MEETING_COMPLETED: 'meeting.completed',
  PERFORMANCE_REVIEW: 'performance.review',
} as const;

/**
 * Event type for learning
 */
export type LearningEventType = typeof LEARNING_EVENT_TYPES[keyof typeof LEARNING_EVENT_TYPES];

/**
 * Learning pattern summary
 */
export interface LearningPatternSummary {
  employeeId: string;
  patternsLearned: {
    decisions: number;
    workflows: number;
    communications: number;
    skills: number;
    relationships: number;
  };
  confidence: number;
  lastUpdated: string;
}

/**
 * Observation result
 */
export interface ObservationResult {
  observed: boolean;
  eventType: string;
  confidence: number;
  linkedTwins: TwinType[];
}

/**
 * Twin service configuration
 */
export interface TwinServiceConfig {
  name: string;
  url: string;
  port: number;
  timeout: number;
  retries: number;
  enabled: boolean;
}

/**
 * Twin service response
 */
export interface TwinServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
