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
    projectId?: string;
    phase?: 'initiation' | 'planning' | 'execution' | 'closure';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  projectCharter?: ProjectCharter;
  statusReport?: StatusReport;
  recommendations?: string[];
  agent: string;
  timestamp: number;
}

export interface ProjectCharter {
  overview: {
    problemStatement: string;
    objectives: string[];
    scope: string;
    exclusions: string;
    successCriteria: string[];
  };
  stakeholders: StakeholderAnalysis;
  resources: ResourcePlan;
  risks: RiskAssessment;
}

export interface StakeholderAnalysis {
  sponsor: string;
  team: TeamMember[];
  keyStakeholders: Stakeholder[];
  communicationPlan: CommunicationPlan;
}

export interface TeamMember {
  name: string;
  role: string;
  responsibilities: string[];
}

export interface Stakeholder {
  name: string;
  influence: 'high' | 'medium' | 'low';
  interest: 'high' | 'medium' | 'low';
  engagement: string;
}

export interface CommunicationPlan {
  frequency: string;
  format: string;
  audience: string;
}

export interface ResourcePlan {
  teamComposition: string;
  budget: Budget;
  timeline: string;
  dependencies: string[];
}

export interface Budget {
  total: string;
  breakdown: Record<string, string>;
}

export interface RiskAssessment {
  risks: Risk[];
  mitigation: string[];
  successFactors: string[];
}

export interface Risk {
  description: string;
  impact: 'high' | 'medium' | 'low';
  probability: 'high' | 'medium' | 'low';
  mitigation: string;
}

export interface StatusReport {
  overallStatus: 'green' | 'yellow' | 'red';
  timeline: string;
  budget: string;
  nextMilestone: string;
  progress: ProgressUpdate;
  issues: Issue[];
  risks: RiskUpdate[];
}

export interface ProgressUpdate {
  completed: string[];
  planned: string[];
  metrics: Record<string, string>;
  teamPerformance: string;
}

export interface Issue {
  issue: string;
  impact: string;
  owner: string;
  resolution: string;
}

export interface RiskUpdate {
  risk: string;
  status: 'increased' | 'decreased' | 'unchanged';
  action: string;
}
