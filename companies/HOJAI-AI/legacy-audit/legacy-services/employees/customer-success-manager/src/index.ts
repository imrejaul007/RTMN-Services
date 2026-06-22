/**
 * Customer Success Manager
 * Port: 4823
 *
 * Role: Onboarding, retention, health monitoring, customer advocacy
 * Persona: Empathetic advisor, growth partner, advocate for customers
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4823;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Customer {
  id: string;
  name: string;
  company: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  csm: string;
  healthScore: number;
  healthTrend: 'improving' | 'stable' | 'declining';
  onboardingStatus: 'not_started' | 'in_progress' | 'completed';
  renewalDate: Date;
  arr: number;
  industry: string;
  employees: number;
  useCases: string[];
  adoptionMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    featuresUsed: number;
    totalFeatures: number;
    lastActivity: Date;
  };
}

interface HealthScore {
  overall: number;
  factors: {
    name: string;
    score: number;
    weight: number;
    status: 'green' | 'yellow' | 'red';
  }[];
  trend: 'improving' | 'stable' | 'declining';
  riskFactors: string[];
  recommendations: string[];
}

interface OnboardingMilestone {
  id: string;
  name: string;
  description: string;
  day: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
  tasks: { name: string; status: string }[];
}

interface RenewalRisk {
  customerId: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  factors: string[];
  mitigation: string[];
  suggestedActions: string[];
}

// Calculate health score
function calculateHealthScore(customer: Partial<Customer>): HealthScore {
  const factors = [
    { name: 'Product Adoption', score: 75, weight: 30 },
    { name: 'Engagement', score: 60, weight: 25 },
    { name: 'Support Tickets', score: 85, weight: 15 },
    { name: 'Feature Usage', score: 70, weight: 20 },
    { name: 'Timely Payments', score: 95, weight: 10 }
  ];

  const overall = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight / 100, 0)
  );

  const riskFactors: string[] = [];
  if (factors[0].score < 60) riskFactors.push('Low product adoption');
  if (factors[1].score < 50) riskFactors.push('Declining engagement');
  if (factors[2].score < 70) riskFactors.push('High support ticket volume');

  const recommendations: string[] = [];
  if (overall < 60) {
    recommendations.push('Schedule immediate check-in call');
    recommendations.push('Offer training session');
  } else if (overall < 80) {
    recommendations.push('Proactive outreach with tips');
    recommendations.push('Highlight unused features');
  } else {
    recommendations.push('Identify expansion opportunities');
    recommendations.push('Request referral');
  }

  return {
    overall,
    factors: factors.map(f => ({
      ...f,
      status: f.score >= 80 ? 'green' : f.score >= 60 ? 'yellow' : 'red'
    })),
    trend: overall >= 75 ? 'improving' : overall >= 60 ? 'stable' : 'declining',
    riskFactors,
    recommendations
  };
}

// Default onboarding milestones
const defaultMilestones: OnboardingMilestone[] = [
  {
    id: 'mile-1',
    name: 'Account Setup',
    description: 'Complete basic account configuration',
    day: 1,
    status: 'pending',
    tasks: [
      { name: 'Verify email', status: 'pending' },
      { name: 'Set up profile', status: 'pending' },
      { name: 'Configure notifications', status: 'pending' }
    ]
  },
  {
    id: 'mile-2',
    name: 'First Workflow',
    description: 'Create and run first workflow',
    day: 3,
    status: 'pending',
    tasks: [
      { name: 'Create workflow', status: 'pending' },
      { name: 'Add trigger', status: 'pending' },
      { name: 'Add action', status: 'pending' },
      { name: 'Test workflow', status: 'pending' }
    ]
  },
  {
    id: 'mile-3',
    name: 'Integration Setup',
    description: 'Connect external tools',
    day: 5,
    status: 'pending',
    tasks: [
      { name: 'Connect CRM', status: 'pending' },
      { name: 'Connect email', status: 'pending' },
      { name: 'Test integration', status: 'pending' }
    ]
  },
  {
    id: 'mile-4',
    name: 'Team Training',
    description: 'Train team members',
    day: 7,
    status: 'pending',
    tasks: [
      { name: 'Schedule training', status: 'pending' },
      { name: 'Complete training', status: 'pending' },
      { name: 'Invite team', status: 'pending' }
    ]
  },
  {
    id: 'mile-5',
    name: 'First Results',
    description: 'Achieve first measurable outcome',
    day: 14,
    status: 'pending',
    tasks: [
      { name: 'Review analytics', status: 'pending' },
      { name: 'Celebrate wins', status: 'pending' }
    ]
  }
];

// Get customer dashboard
app.get('/api/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const customer: Customer = {
    id,
    name: 'Rajesh Sharma',
    company: 'TechCorp Solutions',
    tier: 'professional',
    csm: 'priya@hojai.com',
    healthScore: 78,
    healthTrend: 'improving',
    onboardingStatus: 'completed',
    renewalDate: new Date('2027-01-15'),
    arr: 50000,
    industry: 'Technology',
    employees: 150,
    useCases: ['Lead Automation', 'Email Marketing', 'CRM Sync'],
    adoptionMetrics: {
      dailyActiveUsers: 12,
      weeklyActiveUsers: 35,
      featuresUsed: 18,
      totalFeatures: 45,
      lastActivity: new Date()
    }
  };

  const health = calculateHealthScore(customer);

  res.json({
    customer,
    health,
    recentActivity: [
      { date: '2026-05-28', action: 'Created workflow', type: 'positive' },
      { date: '2026-05-25', action: 'Opened 3 features', type: 'positive' },
      { date: '2026-05-20', action: 'Submitted support ticket', type: 'neutral' }
    ],
    upcoming: {
      qbr: new Date('2026-06-15'),
      renewal: new Date('2027-01-15'),
      training: new Date('2026-06-01')
    }
  });
});

// Get customer list
app.get('/api/customers', (req: Request, res: Response) => {
  const { tier, health, csm } = req.query;

  const customers: Partial<Customer>[] = [
    { id: 'cust-1', name: 'Rajesh Sharma', company: 'TechCorp Solutions', tier: 'professional', healthScore: 78, healthTrend: 'improving', arr: 50000 },
    { id: 'cust-2', name: 'Priya Patel', company: 'DataSoft Inc', tier: 'enterprise', healthScore: 92, healthTrend: 'stable', arr: 250000 },
    { id: 'cust-3', name: 'Amit Kumar', company: 'GlobalRetail', tier: 'starter', healthScore: 45, healthTrend: 'declining', arr: 12000 },
    { id: 'cust-4', name: 'Sunita Verma', company: 'MediCare Plus', tier: 'enterprise', healthScore: 68, healthTrend: 'improving', arr: 180000 }
  ];

  res.json({
    customers,
    summary: {
      total: customers.length,
      byTier: {
        enterprise: customers.filter(c => c.tier === 'enterprise').length,
        professional: customers.filter(c => c.tier === 'professional').length,
        starter: customers.filter(c => c.tier === 'starter').length,
        free: customers.filter(c => c.tier === 'free').length
      },
      byHealth: {
        healthy: customers.filter(c => (c.healthScore || 0) >= 80).length,
        atRisk: customers.filter(c => (c.healthScore || 0) >= 50 && (c.healthScore || 0) < 80).length,
        critical: customers.filter(c => (c.healthScore || 0) < 50).length
      },
      totalARR: customers.reduce((sum, c) => sum + (c.arr || 0), 0)
    }
  });
});

// Onboarding plan
app.get('/api/onboarding/:customerId', (req: Request, res: Response) => {
  const { customerId } = req.params;

  const milestones = defaultMilestones.map(m => ({
    ...m,
    status: Math.random() > 0.5 ? 'completed' : 'pending',
    completedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined
  }));

  const progress = Math.round(
    (milestones.filter(m => m.status === 'completed').length / milestones.length) * 100
  );

  res.json({
    customerId,
    progress,
    milestones,
    timeline: {
      started: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      daysRemaining: 7
    },
    nextAction: {
      task: milestones.find(m => m.status !== 'completed')?.tasks[0].name || 'Complete',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    },
    resources: [
      { name: 'Quick Start Guide', type: 'article', url: '/kb/quick-start' },
      { name: 'Video Tutorials', type: 'video', url: '/videos' },
      { name: 'Community Forum', type: 'forum', url: '/community' }
    ]
  });
});

// Create onboarding plan
app.post('/api/onboarding', (req: Request, res: Response) => {
  const { customerId, tier, industry, customMilestones } = req.body;

  const milestones = customMilestones || defaultMilestones;

  res.json({
    customerId,
    plan: {
      milestones,
      totalDays: Math.max(...milestones.map(m => m.day)),
      keyDates: milestones.filter(m => m.day <= 7).map(m => ({ day: m.day, name: m.name }))
    },
    tasks: {
      preOnboarding: [
        { task: 'Send welcome email', assignedTo: 'automation', dueIn: 0 },
        { task: 'Schedule kickoff call', assignedTo: 'csm', dueIn: 1 },
        { task: 'Provision account', assignedTo: 'system', dueIn: 0 }
      ],
      duringOnboarding: milestones.flatMap(m =>
        m.tasks.map(t => ({ ...t, milestone: m.name, dueDay: m.day }))
      ),
      postOnboarding: [
        { task: '30-day check-in', assignedTo: 'csm', dueIn: 30 },
        { task: 'QBR scheduling', assignedTo: 'csm', dueIn: 60 }
      ]
    },
    communications: {
      day0: 'Welcome email with getting started',
      day1: 'Kickoff call invite',
      day3: 'Mid-point check-in',
      day7: 'Completion celebration',
      day30: 'Success review'
    }
  });
});

// Health check
app.post('/api/health/:customerId', (req: Request, res: Response) => {
  const { customerId } = req.params;

  const customer: Partial<Customer> = {
    id: customerId,
    name: 'Sample Customer',
    tier: 'professional',
    adoptionMetrics: { dailyActiveUsers: 10, weeklyActiveUsers: 30, featuresUsed: 15, totalFeatures: 45, lastActivity: new Date() }
  };

  const health = calculateHealthScore(customer);

  res.json({
    customerId,
    health,
    alerts: health.overall < 60 ? ['Low health score detected', 'Schedule immediate check-in'] : [],
    recommendedActions: health.recommendations
  });
});

// Renewal risk assessment
app.get('/api/renewal/:customerId', (req: Request, res: Response) => {
  const { customerId } = req.params;

  const risk: RenewalRisk = {
    customerId,
    riskLevel: 'medium',
    factors: [
      'Health score below target',
      'Feature adoption plateau',
      'Competitor mention in conversation'
    ],
    mitigation: [
      'Schedule executive sponsor call',
      'Offer training refresh',
      'Highlight new features'
    ],
    suggestedActions: [
      { action: 'Schedule QBR', priority: 'high', impact: 'High' },
      { action: 'Send ROI report', priority: 'medium', impact: 'Medium' },
      { action: 'Propose expansion', priority: 'low', impact: 'High' }
    ]
  };

  res.json({
    risk,
    timeline: {
      renewalDate: new Date('2027-01-15'),
      daysUntilRenewal: 230,
      engagementWindow: new Date('2026-10-01')
    },
    conversation: {
      lastContact: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalTouches: 8
    }
  });
});

// Get at-risk customers
app.get('/api/at-risk', (req: Request, res: Response) => {
  const atRisk: Partial<Customer>[] = [
    { id: 'cust-3', name: 'Amit Kumar', company: 'GlobalRetail', healthScore: 45, healthTrend: 'declining', arr: 12000, renewalDate: new Date('2026-08-15') },
    { id: 'cust-5', name: 'Vikram Singh', company: 'RetailMax', healthScore: 52, healthTrend: 'declining', arr: 25000, renewalDate: new Date('2026-09-01') }
  ];

  res.json({
    atRiskCustomers: atRisk,
    summary: {
      total: atRisk.length,
      totalARR: atRisk.reduce((sum, c) => sum + (c.arr || 0), 0),
      avgDaysToRenewal: Math.round(atRisk.reduce((sum, c) => {
        return sum + (new Date(c.renewalDate || Date.now()).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      }, 0) / atRisk.length)
    },
    recommendedActions: [
      'Immediate outreach to critical accounts',
      'Prepare custom retention offers',
      'Escalate to management if needed'
    ]
  });
});

// Expansion opportunities
app.get('/api/expansion', (req: Request, res: Response) => {
  const opportunities = [
    {
      customerId: 'cust-2',
      company: 'DataSoft Inc',
      currentARR: 250000,
      potentialARR: 350000,
      opportunity: 'Upgrade to Enterprise Plus',
      reason: 'Exceeded user limit, needs advanced features',
      score: 92
    },
    {
      customerId: 'cust-1',
      company: 'TechCorp Solutions',
      currentARR: 50000,
      potentialARR: 75000,
      opportunity: 'Add-on modules',
      reason: 'Only using 40% of available features',
      score: 78
    }
  ];

  res.json({
    opportunities,
    summary: {
      totalPotential: opportunities.reduce((sum, o) => sum + o.potentialARR - o.currentARR, 0),
      avgScore: Math.round(opportunities.reduce((sum, o) => sum + o.score, 0) / opportunities.length),
      bestTiming: 'Q3 for upsell campaigns'
    },
    recommendations: [
      'Prioritize high-score opportunities',
      'Prepare case studies for upsell pitch',
      'Offer limited-time discounts to accelerate'
    ]
  });
});

// Quarterly business review (QBR) prep
app.post('/api/qbr/prepare', (req: Request, res: Response) => {
  const { customerId, date } = req.body;

  res.json({
    customerId,
    qbrDate: date || new Date(),
    agenda: [
      { item: 'Review of past quarter', duration: '15 min', presenter: 'Customer' },
      { item: 'Success metrics review', duration: '20 min', presenter: 'CSM' },
      { item: 'Achievements & wins', duration: '15 min', presenter: 'Both' },
      { item: 'Roadmap & new features', duration: '15 min', presenter: 'CSM' },
      { item: 'Future goals', duration: '20 min', presenter: 'Both' },
      { item: 'Expansion discussion', duration: '15 min', presenter: 'CSM' }
    ],
    materials: {
      roiReport: '/reports/roi/{customerId}',
      usageReport: '/reports/usage/{customerId}',
      healthTrend: '/reports/health/{customerId}',
      benchmarks: '/reports/benchmarks'
    },
    slides: [
      'Executive Summary',
      'Quarter in Review',
      'Key Metrics',
      'ROI Delivered',
      'Feature Adoption',
      'Upcoming Features',
      'Expansion Proposal'
    ]
  });
});

// CSM dashboard
app.get('/api/dashboard', (req: Request, res: Response) => {
  res.json({
    overview: {
      totalCustomers: 25,
      totalARR: 2500000,
      avgHealthScore: 78,
      atRiskCount: 3,
      expansionPipeline: 500000
    },
    thisWeek: {
      calls: 12,
      qbrs: 3,
      renewals: 2,
      expansions: 1
    },
    upcoming: {
      renewals: [
        { customer: 'DataSoft Inc', date: '2026-06-15', arr: 250000, risk: 'low' },
        { customer: 'GlobalRetail', date: '2026-07-01', arr: 12000, risk: 'high' }
      ],
      qbrs: [
        { customer: 'TechCorp Solutions', date: '2026-06-15' },
        { customer: 'MediCare Plus', date: '2026-06-20' }
      ]
    },
    healthDistribution: {
      healthy: 18,
      atRisk: 5,
      critical: 2
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'customer-success-manager',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Customer Success Manager running on port ${PORT}`);
  console.log('Role: Onboarding, retention, health monitoring');
});

export default app;
