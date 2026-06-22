export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  metadata?: {
    processType?: 'sop' | 'optimization' | 'resource';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  sop?: SOP;
  efficiencyReport?: EfficiencyReport;
  recommendations?: string[];
  agent: string;
  timestamp: number;
}

export interface SOP {
  name: string;
  overview: {
    purpose: string;
    scope: string;
    responsibleParties: string[];
    frequency: string;
  };
  prerequisites: {
    requiredTools: string[];
    requiredPermissions: string[];
    dependencies: string[];
  };
  steps: ProcessStep[];
  qualityControl: {
    successCriteria: string;
    commonIssues: string[];
    escalation: string;
  };
}

export interface ProcessStep {
  name: string;
  input: string;
  action: string;
  output: string;
  qualityCheck: string;
}

export interface EfficiencyReport {
  period: string;
  overallEfficiency: number;
  costOptimization: string;
  teamSatisfaction: number;
  systemUptime: number;
  performanceMetrics: MetricData;
  improvements: Improvement[];
}

export interface MetricData {
  processEfficiency: number;
  resourceUtilization: number;
  qualityMetrics: number;
  responseTimes: number;
}

export interface Improvement {
  type: 'automation' | 'workflow' | 'system' | 'training';
  description: string;
  impact: string;
  effort: string;
}

export interface ContinuousImprovementPlan {
  opportunities: string[];
  plannedInitiatives: Initiative[];
  resourceRequirements: string;
  expectedBenefits: string;
}
