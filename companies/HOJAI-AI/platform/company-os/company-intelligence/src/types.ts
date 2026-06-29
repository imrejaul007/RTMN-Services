/**
 * Company Intelligence Types
 *
 * AI CEO layer for companies.
 */

export interface CompanyCopilot {
  companyId: string;
  name: string;
  role: 'ceo' | 'cfo' | 'cmo' | 'coo' | 'hr';
  personality: string;
  enabled: boolean;
}

export interface DailyBriefing {
  id: string;
  companyId: string;
  date: string;
  summary: string;
  keyMetrics: Metric[];
  alerts: Alert[];
  recommendations: Recommendation[];
  createdAt: string;
}

export interface Metric {
  name: string;
  value: number;
  change: number;        // % change
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

export interface Alert {
  type: 'risk' | 'opportunity' | 'compliance';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

export interface Recommendation {
  type: 'growth' | 'cost' | 'risk' | 'efficiency';
  title: string;
  description: string;
  expectedImpact: string;
  confidence: number;    // 0-100
  effort: 'low' | 'medium' | 'high';
}

export interface CompanyForecast {
  companyId: string;
  period: string;        // "2026-Q3"
  revenue: { projected: number; confidence: number };
  expenses: { projected: number; confidence: number };
  profit: { projected: number; confidence: number };
  metrics: Record<string, number>;
}

export interface RiskAnalysis {
  companyId: string;
  overallScore: number;  // 0-100 (100 = most risk)
  risks: Risk[];
  opportunities: Opportunity[];
  analyzedAt: string;
}

export interface Risk {
  id: string;
  category: 'financial' | 'operational' | 'market' | 'compliance';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;    // 0-100
  impact: number;        // 0-100
  mitigation?: string;
}

export interface Opportunity {
  id: string;
  category: 'growth' | 'efficiency' | 'market';
  title: string;
  description: string;
  potential: number;     // 0-100
  timeline: string;
  requirements: string[];
}
