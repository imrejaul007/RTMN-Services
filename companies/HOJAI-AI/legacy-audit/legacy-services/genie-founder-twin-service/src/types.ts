/**
 * GENIE Founder Twin Service
 * Version: 1.0.0 | June 2026
 */
export interface FounderTwin {
  id: string;
  user_id: string;
  companies: CompanyTwin[];
  portfolio: CompanyTwin[];
  investments: Investment[];
  strategic_goals: Goal[];
  decisions: Decision[];
  team: TeamMember[];
  metrics: FounderMetrics;
  created_at: string;
  updated_at: string;
}

export interface CompanyTwin {
  id: string;
  name: string;
  industry: string;
  stage: 'idea' | 'seed' | 'series_a' | 'series_b' | 'profitability' | 'scale';
  revenue?: number;
  revenue_growth?: number;
  team_size?: number;
  metrics: CompanyMetrics;
}

export interface CompanyMetrics {
  revenue: number;
  revenue_growth: number;
  burn_rate: number;
  runway_months: number;
  customers: number;
  cac: number;
  ltv: number;
  nps: number;
}

export interface Investment {
  id: string;
  company_name: string;
  amount: number;
  date: string;
  stage: string;
  sector: string;
}

export interface Goal {
  id: string;
  title: string;
  status: 'active' | 'completed';
  progress: number;
  target_date: string;
}

export interface Decision {
  id: string;
  title: string;
  context: string;
  decision: string;
  outcome?: string;
  date: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  tenure_months: number;
  performance_score: number;
}

export interface FounderMetrics {
  total_companies: number;
  total_investments: number;
  portfolio_value: number;
  active_deals: number;
  pending_decisions: number;
  team_members: number;
}
