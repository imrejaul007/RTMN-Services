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
    portfolioId?: string;
    period?: string;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  portfolioPlan?: StrategicPortfolioPlan;
  review?: StrategicPortfolioReview;
  recommendations?: string[];
  agent: string;
  timestamp: number;
}

export interface StrategicPortfolioPlan {
  period: string;
  strategicObjectives: string;
  portfolioValue: string;
  marketOpportunity: string;
  resourceStrategy: string;
  projects: ProjectTier[];
  resourceAllocation: ResourceAllocation;
  riskManagement: RiskPlan;
}

export interface ProjectTier {
  tier: string;
  projects: Project[];
}

export interface Project {
  name: string;
  budget: string;
  timeline: string;
  expectedROI: string;
  strategicImpact: string;
  resourceAllocation: string;
  successMetrics: string;
}

export interface ResourceAllocation {
  teamCapacity: string;
  skillDevelopment: string[];
  externalPartners: string[];
  budgetDistribution: Record<string, string>;
}

export interface RiskPlan {
  portfolioRisks: string[];
  mitigation: string[];
  contingency: string[];
  successMetrics: string;
}

export interface StrategicPortfolioReview {
  period: string;
  portfolioPerformance: string;
  marketPosition: string;
  teamPerformance: string;
  strategicOutlook: string;
  metrics: PortfolioMetrics;
  achievements: Achievement[];
  priorities: Priority[];
}

export interface PortfolioMetrics {
  financialPerformance: string;
  projectDelivery: string;
  innovationPipeline: string;
  clientSatisfaction: string;
}

export interface Achievement {
  category: string;
  description: string;
  impact: string;
}

export interface Priority {
  area: string;
  rationale: string;
  investment: string;
}
