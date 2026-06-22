// ============================================================================
// SUTAR Decision Engine - Type Definitions
// ============================================================================

/**
 * Decision types supported by the decision engine
 */
export enum DecisionType {
  OFFER = 'OFFER',
  CASHBACK = 'CASHBACK',
  PERSONALIZATION = 'PERSONALIZATION',
  ROUTING = 'ROUTING',
  FRAUD = 'FRAUD',
  PRICING = 'PRICING',
  NEXT_ACTION = 'NEXT_ACTION',
  RETENTION = 'RETENTION',
  APPROVAL = 'APPROVAL',
  RISK = 'RISK',
}

/**
 * Decision outcomes
 */
export enum DecisionOutcome {
  PROCEED = 'PROCEED',
  HOLD = 'HOLD',
  REJECT = 'REJECT',
}

/**
 * Risk levels
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Condition operators for policy rules
 */
export enum ConditionOperator {
  EQ = 'eq',
  NE = 'ne',
  GT = 'gt',
  LT = 'lt',
  GTE = 'gte',
  LTE = 'lte',
  IN = 'in',
  CONTAINS = 'contains',
}

/**
 * Condition for evaluating a single rule
 */
export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | string[] | number[];
}

/**
 * Policy rule combining conditions
 */
export interface PolicyRule {
  id: string;
  name: string;
  conditions: Condition[];
  conditionLogic: 'AND' | 'OR';
  outcome: DecisionOutcome;
  priority: number;
  reason: string;
}

/**
 * Policy for a specific decision type
 */
export interface Policy {
  id: string;
  name: string;
  decisionType: DecisionType;
  rules: PolicyRule[];
  defaultOutcome: DecisionOutcome;
  description: string;
  enabled: boolean;
}

/**
 * Risk factor contributing to risk score
 */
export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
  category: 'behavioral' | 'transactional' | 'historical' | 'contextual';
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  overallScore: number;
  level: RiskLevel;
  factors: RiskFactor[];
  maxPossibleScore: number;
  confidence: number;
  assessmentDate: string;
  riskIndicators: string[];
}

/**
 * Context data for making a decision
 */
export interface DecisionContext {
  userId?: string;
  sessionId?: string;
  decisionType: DecisionType;
  amount?: number;
  currency?: string;
  customerTier?: 'standard' | 'premium' | 'vip';
  customerAge?: number;
  accountAge?: number;
  transactionCount?: number;
  riskScore?: number;
  previousDecisions?: Array<{
    type: DecisionType;
    outcome: DecisionOutcome;
    timestamp: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * A single decision result
 */
export interface Decision {
  id: string;
  decisionType: DecisionType;
  outcome: DecisionOutcome;
  confidence: number;
  policyId: string;
  ruleId?: string;
  reason: string;
  riskAssessment: RiskAssessment;
  context: DecisionContext;
  timestamp: string;
  processingTimeMs: number;
}

/**
 * Request to make a decision
 */
export interface DecisionRequest {
  context: DecisionContext;
  skipRiskAssessment?: boolean;
  overridePolicyId?: string;
}

/**
 * Simulation request for what-if analysis
 */
export interface SimulationRequest {
  context: DecisionContext;
  scenarioVariations: Array<{
    name: string;
    modifications: Partial<DecisionContext>;
  }>;
  comparePolicies?: boolean;
}

/**
 * Simulation result for what-if analysis
 */
export interface SimulationResult {
  baselineDecision: Decision;
  variations: Array<{
    name: string;
    decision: Decision;
    delta: {
      outcomeChanged: boolean;
      riskScoreDelta: number;
      reason: string;
    };
  }>;
  executionTimeMs: number;
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
 * Individual health check result
 */
export interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  latencyMs?: number;
  message?: string;
}

/**
 * Decision statistics
 */
export interface DecisionStats {
  totalDecisions: number;
  byOutcome: Record<DecisionOutcome, number>;
  byDecisionType: Record<DecisionType, number>;
  averageRiskScore: number;
  averageProcessingTimeMs: number;
  last24Hours: {
    total: number;
    byOutcome: Record<DecisionOutcome, number>;
  };
}

/**
 * Configuration for the decision engine
 */
export interface DecisionEngineConfig {
  port: number;
  environment: string;
  simulationOsUrl: string;
  simulationOsTimeout: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
