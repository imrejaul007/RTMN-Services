// Executive Copilot Types

export interface ExecutiveBriefing {
  id: string;
  date: string;
  title: string;
  summary: string;
  sections: BriefingSection[];
  metrics: MetricSnapshot;
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  actionItems: ActionItem[];
  generatedAt: Date;
  generatedBy: 'ai' | 'system';
}

export interface BriefingSection {
  title: string;
  content: string;
  icon?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MetricSnapshot {
  date: string;
  revenue?: number;
  revenueChange?: number;
  customers?: number;
  customersChange?: number;
  conversionRate?: number;
  conversionChange?: number;
  averageOrderValue?: number;
  aovChange?: number;
  keyMetrics: KeyMetric[];
}

export interface KeyMetric {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  status?: 'on-track' | 'at-risk' | 'off-track';
}

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'operational' | 'financial' | 'market' | 'regulatory' | 'strategic';
  impact: string;
  mitigation: string;
  owner?: string;
  dueDate?: string;
  status: 'active' | 'mitigated' | 'accepted' | 'resolved';
}

export interface OpportunityItem {
  id: string;
  title: string;
  description: string;
  potential: 'high' | 'medium' | 'low';
  category: 'growth' | 'efficiency' | 'market' | 'partnership' | 'innovation';
  estimatedValue?: number;
  timeline?: string;
  nextSteps: string[];
  status: 'identified' | 'evaluating' | 'pursuing' | 'captured';
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: string;
  owner?: string;
  dueDate?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delegated';
}

export interface ExecutiveAlert {
  id: string;
  type: 'risk' | 'opportunity' | 'milestone' | 'warning' | 'info';
  title: string;
  message: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  read: boolean;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata?: Record<string, unknown>;
  actionRequired: boolean;
  actionTaken?: string;
}

export interface ExecutiveSummary {
  id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  startDate: string;
  endDate: string;
  title: string;
  executiveSummary: string;
  highlights: SummaryHighlight[];
  keyWins: string[];
  challenges: string[];
  metrics: MetricSnapshot;
  outlook: string;
  preparedFor?: string;
  generatedAt: Date;
}

export interface SummaryHighlight {
  category: string;
  items: string[];
}

export interface Recommendation {
  id: string;
  category: 'strategy' | 'operations' | 'finance' | 'marketing' | 'hr' | 'technology';
  title: string;
  description: string;
  rationale: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  priority: number;
  dataPoints: string[];
  alternatives?: string[];
  risks?: string[];
  estimatedOutcome?: string;
  status: 'suggested' | 'under-review' | 'approved' | 'implemented' | 'rejected';
  createdAt: Date;
}

export interface Forecast {
  id: string;
  type: 'revenue' | 'customers' | 'growth' | 'market';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  startDate: string;
  endDate: string;
  predictions: ForecastPrediction[];
  confidence: number;
  methodology: string;
  assumptions: string[];
  risks: string[];
  generatedAt: Date;
}

export interface ForecastPrediction {
  date: string;
  value: number;
  lowerBound: number;
  upperBound: number;
  probability: number;
  drivers: string[];
}

export interface ExecutiveInsight {
  id: string;
  type: 'trend' | 'pattern' | 'anomaly' | 'correlation' | 'prediction';
  title: string;
  description: string;
  data: unknown;
  significance: 'high' | 'medium' | 'low';
  businessImpact: string;
  source: string;
  timestamp: Date;
  tags: string[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
