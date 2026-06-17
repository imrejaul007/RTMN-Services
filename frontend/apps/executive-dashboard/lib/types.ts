// Dashboard Types

export interface Metric {
  id: string;
  label: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
  format?: 'currency' | 'percent' | 'number' | 'days';
}

export interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  target: number;
}

export interface CustomerMetric {
  id: string;
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'financial' | 'operational' | 'market' | 'regulatory' | 'technical';
  probability: number;
  impact: number;
  status: 'active' | 'mitigated' | 'monitoring';
  createdAt: string;
  owner?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  value: number;
  probability: number;
  timeline: string;
  status: 'identified' | 'qualified' | 'pursuing' | 'won' | 'lost';
  category: 'expansion' | 'new_market' | 'efficiency' | 'partnership' | 'technology';
  createdAt: string;
  owner?: string;
}

export interface HealthScore {
  overall: number;
  financial: number;
  operational: number;
  customer: number;
  growth: number;
  risk: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  performance: number;
  tasks: number;
  completed: number;
  avatar?: string;
}

export interface DailyBriefing {
  date: string;
  summary: string;
  keyHighlights: string[];
  alerts: BriefingAlert[];
  recommendations: AIRecommendation[];
  metrics: Metric[];
}

export interface BriefingAlert {
  type: 'warning' | 'critical' | 'info' | 'success';
  title: string;
  message: string;
}

export interface AIRecommendation {
  id: string;
  category: 'growth' | 'efficiency' | 'risk_mitigation' | 'customer' | 'operations';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  confidence: number;
}

export interface DashboardData {
  metrics: Metric[];
  revenue: RevenueData[];
  healthScore: HealthScore;
  risks: Risk[];
  opportunities: Opportunity[];
  team: TeamMember[];
  briefing: DailyBriefing;
  customerMetrics: CustomerMetric[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}
