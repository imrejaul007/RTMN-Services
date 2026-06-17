import type {
  DashboardData,
  Metric,
  Risk,
  Opportunity,
  TeamMember,
  DailyBriefing,
  HealthScore,
  RevenueData,
  CustomerMetric
} from './types';

// Mock data for demonstration
const generateMockMetrics = (): Metric[] => [
  {
    id: 'revenue',
    label: 'Total Revenue',
    value: '$2.4M',
    change: 12.5,
    changeType: 'increase',
    trend: 'up',
    format: 'currency'
  },
  {
    id: 'nps',
    label: 'NPS Score',
    value: 72,
    change: 5,
    changeType: 'increase',
    trend: 'up',
    format: 'number'
  },
  {
    id: 'csat',
    label: 'Customer Satisfaction',
    value: '94%',
    change: 2.3,
    changeType: 'increase',
    trend: 'up',
    format: 'percent'
  },
  {
    id: 'churn',
    label: 'Churn Rate',
    value: '2.1%',
    change: -0.5,
    changeType: 'decrease',
    trend: 'down',
    format: 'percent'
  },
  {
    id: 'arr',
    label: 'ARR',
    value: '$4.8M',
    change: 18.2,
    changeType: 'increase',
    trend: 'up',
    format: 'currency'
  },
  {
    id: 'cac',
    label: 'CAC',
    value: '$142',
    change: -8.4,
    changeType: 'decrease',
    trend: 'down',
    format: 'currency'
  }
];

const generateMockRevenue = (): RevenueData[] => [
  { month: 'Jan', revenue: 1.8, expenses: 1.2, profit: 0.6, target: 1.7 },
  { month: 'Feb', revenue: 1.9, expenses: 1.25, profit: 0.65, target: 1.8 },
  { month: 'Mar', revenue: 2.0, expenses: 1.3, profit: 0.7, target: 1.9 },
  { month: 'Apr', revenue: 2.1, expenses: 1.35, profit: 0.75, target: 2.0 },
  { month: 'May', revenue: 2.2, expenses: 1.4, profit: 0.8, target: 2.1 },
  { month: 'Jun', revenue: 2.4, expenses: 1.45, profit: 0.95, target: 2.3 }
];

const generateMockHealthScore = (): HealthScore => ({
  overall: 87,
  financial: 92,
  operational: 85,
  customer: 88,
  growth: 84,
  risk: 82
});

const generateMockRisks = (): Risk[] => [
  {
    id: 'risk-1',
    title: 'Supply Chain Disruption',
    description: 'Key supplier in Southeast Asia facing production delays due to geopolitical tensions.',
    severity: 'high',
    category: 'operational',
    probability: 65,
    impact: 8,
    status: 'active',
    createdAt: '2026-06-10',
    owner: 'Operations Team'
  },
  {
    id: 'risk-2',
    title: 'Regulatory Compliance Gap',
    description: 'New data privacy regulations require compliance updates within 60 days.',
    severity: 'critical',
    category: 'regulatory',
    probability: 90,
    impact: 9,
    status: 'monitoring',
    createdAt: '2026-06-08',
    owner: 'Legal Team'
  },
  {
    id: 'risk-3',
    title: 'Competitive Pricing Pressure',
    description: 'Two competitors have launched products with 15% lower pricing.',
    severity: 'medium',
    category: 'market',
    probability: 70,
    impact: 6,
    status: 'active',
    createdAt: '2026-06-05',
    owner: 'Sales Team'
  },
  {
    id: 'risk-4',
    title: 'Key Talent Retention',
    description: 'Three senior engineers have received competing offers.',
    severity: 'high',
    category: 'operational',
    probability: 60,
    impact: 7,
    status: 'monitoring',
    createdAt: '2026-06-12',
    owner: 'HR Team'
  },
  {
    id: 'risk-5',
    title: 'Currency Exchange Volatility',
    description: 'EUR/USD fluctuations affecting European revenue recognition.',
    severity: 'low',
    category: 'financial',
    probability: 40,
    impact: 4,
    status: 'mitigated',
    createdAt: '2026-05-20',
    owner: 'Finance Team'
  }
];

const generateMockOpportunities = (): Opportunity[] => [
  {
    id: 'opp-1',
    title: 'Enterprise Partnership - TechCorp',
    description: 'Potential 3-year contract worth $1.2M annually with TechCorp for enterprise solution.',
    value: 3600000,
    probability: 75,
    timeline: 'Q3 2026',
    status: 'qualified',
    category: 'expansion',
    createdAt: '2026-06-01',
    owner: 'Sales - John'
  },
  {
    id: 'opp-2',
    title: 'APAC Market Expansion',
    description: 'Enter Singapore and Japan markets with localized product offerings.',
    value: 2500000,
    probability: 60,
    timeline: 'Q4 2026',
    status: 'identified',
    category: 'new_market',
    createdAt: '2026-05-15',
    owner: 'Strategy Team'
  },
  {
    id: 'opp-3',
    title: 'Process Automation Initiative',
    description: 'AI-powered automation could reduce operational costs by 25%.',
    value: 800000,
    probability: 85,
    timeline: 'Q3 2026',
    status: 'pursuing',
    category: 'efficiency',
    createdAt: '2026-06-05',
    owner: 'Operations - Sarah'
  },
  {
    id: 'opp-4',
    title: 'Strategic Acquisition - DataFlow',
    description: 'DataFlow AI startup acquisition to enhance analytics capabilities.',
    value: 5000000,
    probability: 40,
    timeline: 'Q1 2027',
    status: 'identified',
    category: 'technology',
    createdAt: '2026-06-10',
    owner: 'M&A Team'
  }
];

const generateMockTeam = (): TeamMember[] => [
  { id: '1', name: 'Sarah Chen', role: 'VP Engineering', department: 'Engineering', performance: 95, tasks: 12, completed: 10 },
  { id: '2', name: 'Michael Ross', role: 'Sales Director', department: 'Sales', performance: 88, tasks: 15, completed: 12 },
  { id: '3', name: 'Emily Johnson', role: 'Product Manager', department: 'Product', performance: 92, tasks: 8, completed: 7 },
  { id: '4', name: 'David Kim', role: 'Marketing Lead', department: 'Marketing', performance: 85, tasks: 10, completed: 8 },
  { id: '5', name: 'Lisa Wang', role: 'Finance Manager', department: 'Finance', performance: 90, tasks: 6, completed: 6 }
];

const generateMockCustomerMetrics = (): CustomerMetric[] => [
  { id: 'nps', label: 'NPS Score', value: 72, change: 5, trend: 'up' },
  { id: 'csat', label: 'CSAT', value: 94, change: 2.3, trend: 'up' },
  { id: 'ces', label: 'CES', value: 4.2, change: 0.3, trend: 'up' },
  { id: 'retention', label: 'Retention Rate', value: 97.9, change: 1.2, trend: 'up' }
];

const generateMockBriefing = (): DailyBriefing => ({
  date: new Date().toISOString().split('T')[0],
  summary: 'Strong performance across all metrics. Revenue up 12.5% MoM, exceeding targets by 4.3%. Customer satisfaction at all-time high.',
  keyHighlights: [
    'Revenue exceeded Q2 target by $180K',
    'NPS improved from 67 to 72 (+5 points)',
    'New enterprise deal closed: $450K ACV',
    'Product launch on track for July 15',
    'Team headcount increased by 8 new hires'
  ],
  alerts: [
    { type: 'warning', title: 'Inventory Alert', message: 'Stock levels for Product X below reorder point' },
    { type: 'critical', title: 'Compliance Deadline', message: 'SOC 2 audit due in 14 days' },
    { type: 'info', title: 'Market Update', message: 'Competitor launched new pricing tier' }
  ],
  recommendations: [
    {
      id: 'rec-1',
      category: 'growth',
      title: 'Accelerate Enterprise Sales',
      description: 'Focus resources on TechCorp deal - 75% probability, $3.6M value.',
      impact: 'high',
      effort: 'medium',
      confidence: 88
    },
    {
      id: 'rec-2',
      category: 'efficiency',
      title: 'Automate Customer Onboarding',
      description: 'Implement self-service onboarding to reduce CAC by 15%.',
      impact: 'high',
      effort: 'low',
      confidence: 92
    },
    {
      id: 'rec-3',
      category: 'risk_mitigation',
      title: 'Diversify Supplier Base',
      description: 'Add 2 backup suppliers to reduce supply chain risk exposure.',
      impact: 'medium',
      effort: 'high',
      confidence: 78
    }
  ],
  metrics: generateMockMetrics()
});

// API Client
class DashboardAPI {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async getDashboard(): Promise<DashboardData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      metrics: generateMockMetrics(),
      revenue: generateMockRevenue(),
      healthScore: generateMockHealthScore(),
      risks: generateMockRisks(),
      opportunities: generateMockOpportunities(),
      team: generateMockTeam(),
      briefing: generateMockBriefing(),
      customerMetrics: generateMockCustomerMetrics()
    };
  }

  async getMetrics(): Promise<Metric[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockMetrics();
  }

  async getRisks(): Promise<Risk[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockRisks();
  }

  async getOpportunities(): Promise<Opportunity[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockOpportunities();
  }

  async getTeam(): Promise<TeamMember[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockTeam();
  }

  async getBriefing(): Promise<DailyBriefing> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockBriefing();
  }

  async getHealthScore(): Promise<HealthScore> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return generateMockHealthScore();
  }

  async getRevenueData(): Promise<RevenueData[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockRevenue();
  }
}

export const api = new DashboardAPI();
export default api;
