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
    experimentId?: string;
    phase?: 'design' | 'execute' | 'analyze';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  experiment?: ExperimentDesign;
  results?: ExperimentResults;
  recommendations?: string[];
  agent: string;
  timestamp: number;
}

export interface ExperimentDesign {
  hypothesis: string;
  problemStatement: string;
  successMetrics: string;
  secondaryMetrics: string[];
  experimentType: string;
  population: string;
  sampleSize: number;
  duration: string;
  variants: Variant[];
  risks: string[];
  mitigation: string[];
}

export interface Variant {
  name: string;
  description: string;
}

export interface ExperimentResults {
  decision: 'go' | 'no-go' | 'inconclusive';
  primaryMetric: MetricResult;
  statisticalResults: StatisticalResults;
  businessImpact: string;
  sampleSize: number;
  duration: string;
  keyInsights: string[];
  unexpectedResults: string[];
}

export interface MetricResult {
  metric: string;
  control: number;
  variant: number;
  lift: number;
  confidenceInterval: [number, number];
  pValue: number;
  significant: boolean;
}

export interface StatisticalResults {
  testType: string;
  confidenceLevel: number;
  power: number;
  effectSize: number;
}

export interface ExperimentPortfolio {
  activeExperiments: number;
  successRate: number;
  averageLift: number;
  quarterlyVelocity: number;
}
