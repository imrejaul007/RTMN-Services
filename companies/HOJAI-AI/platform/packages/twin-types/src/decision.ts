/**
 * Decision Twin Types
 * Decision capture, reasoning extraction, and prediction
 */

/**
 * Decision type
 */
export type DecisionType =
  | 'purchasing'
  | 'hiring'
  | 'strategic'
  | 'operational'
  | 'negotiation'
  | 'approval'
  | 'risk'
  | 'investment';

/**
 * Decision domain
 */
export type DecisionDomain =
  | 'sales'
  | 'marketing'
  | 'finance'
  | 'hr'
  | 'operations'
  | 'technology'
  | 'legal'
  | 'strategy';

/**
 * Urgency level
 */
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk level
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Decision context
 */
export interface DecisionContext {
  type: DecisionType;
  domain: DecisionDomain;
  description?: string;
  stakeholders: string[];
  urgency: UrgencyLevel;
  amount?: number;           // financial amount
  riskLevel: RiskLevel;
  timeConstraint?: number;    // hours to decide
  dataAvailable: string[];
  dataQuality: 'low' | 'medium' | 'high';
  previousSimilarDecisions?: string[];  // decision IDs
}

/**
 * Reasoning step
 */
export interface ReasoningStep {
  order: number;
  description: string;
  evidence?: string[];
  confidence?: number;       // 0-100
  linksTo?: string[];         // other step IDs
}

/**
 * Reasoning factor
 */
export interface ReasoningFactor {
  name: string;
  weight: number;           // -1 to 1
  direction: 'positive' | 'negative' | 'neutral';
  source: 'explicit' | 'implied' | 'learned';
  category?: string;
}

/**
 * Trade-off analysis
 */
export interface Tradeoff {
  optionA: string;
  optionB: string;
 权衡: string;              // Trade-off description
  winner: 'A' | 'B' | 'neither';
}

/**
 * Constraint
 */
export interface Constraint {
  name: string;
  description: string;
  type: 'hard' | 'soft';
  enforcedBy?: string;
}

/**
 * Assumption
 */
export interface Assumption {
  description: string;
  confidence: number;       // 0-100
  verified: boolean;
  verifiedBy?: string;
}

/**
 * Reasoning chain
 */
export interface ReasoningChain {
  steps: ReasoningStep[];
  factors: ReasoningFactor[];
  constraints: Constraint[];
  assumptions: Assumption[];
  tradeoffs: Tradeoff[];
  model: 'rule-based' | 'experience' | 'data-driven' | 'intuition' | 'mixed';
  confidence: number;       // 0-100
  reasoningQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Alternative option
 */
export interface AlternativeOption {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  estimatedOutcome: string;
  riskLevel: RiskLevel;
}

/**
 * Primary Decision interface
 */
export interface Decision {
  id: string;
  employeeId: string;
  timestamp: string;
  context: DecisionContext;
  choice: string;
  alternatives: AlternativeOption[];
  reasoning: ReasoningChain;
  outcome?: string;
  actualOutcome?: string;
  feedback?: string;
  confidence: number;       // 0-100
  learnable: boolean;
  reversible: boolean;
  decisionMaker: 'employee' | 'twin' | 'joint';
  twinConfidenceAtDecision?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Decision prediction request
 */
export interface DecisionPredictionRequest {
  employeeId: string;
  context: Partial<DecisionContext>;
  options: string[];
  forceRecalculate?: boolean;
}

/**
 * Decision prediction result
 */
export interface DecisionPrediction {
  employeeId: string;
  predictedChoice: string;
  confidence: number;       // 0-100
  reasoning: string;
  alternativeConfidence: Record<string, number>;
  similarPastDecisions?: Decision[];
  warnings?: string[];
  suggestions?: string[];
}

/**
 * Decision pattern
 */
export interface DecisionPattern {
  id: string;
  employeeId: string;
  contextType: DecisionType;
  contextDomain: DecisionDomain;
  commonFactors: ReasoningFactor[];
  typicalReasoning: string;
  successRate: number;      // 0-1
  avgDecisionTime: number;  // minutes
  confidence: number;       // 0-100
  sampleDecisions: string[]; // decision IDs
  lastUpdated: string;
}

/**
 * Decision validation result
 */
export interface DecisionValidation {
  valid: boolean;
  warnings: string[];
  suggestions: string[];
  riskAssessment: {
    level: RiskLevel;
    factors: string[];
    mitigation?: string;
  };
}

/**
 * Decision feedback
 */
export interface DecisionFeedback {
  decisionId: string;
  employeeId: string;
  feedback: 'approved' | 'rejected' | 'corrected';
  correctedChoice?: string;
  correctedReasoning?: Partial<ReasoningChain>;
  outcome?: string;
  comments?: string;
  timestamp: string;
}

/**
 * Decision analytics
 */
export interface DecisionAnalytics {
  employeeId: string;
  totalDecisions: number;
  byType: Record<DecisionType, number>;
  byOutcome: Record<string, number>;
  avgConfidence: number;
  avgDecisionTime: number;
  successRate: number;       // decisions that achieved desired outcome
  mostCommonFactors: ReasoningFactor[];
  improvementAreas: string[];
  period: {
    start: string;
    end: string;
  };
}

/**
 * Context factor influence
 */
export interface FactorInfluence {
  factor: string;
  positiveInfluence: number;  // times it led to positive outcome
  negativeInfluence: number;   // times it led to negative outcome
  neutralInfluence: number;
  avgWeight: number;
  description: string;
}

/**
 * Learning event for decisions
 */
export interface DecisionLearningEvent {
  employeeId: string;
  decision: Decision;
  outcome?: string;
  feedback?: DecisionFeedback;
  timestamp: string;
  learningPoints?: string[];
}
