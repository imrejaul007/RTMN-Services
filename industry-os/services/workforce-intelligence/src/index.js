/**
 * RTMN Workforce Intelligence - AI-Powered HR Command Center
 *
 * Intelligence Layer for RTMN Workforce OS
 * Provides:
 * - Real-time workforce health monitoring
 * - Sentiment analysis
 * - Predictive analytics
 * - AI-powered insights
 * - Digital twins integration
 *
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const PORT = process.env.PORT || 5073;
const SERVICE_NAME = 'workforce-intelligence';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${level}] ${SERVICE_NAME}: ${message} ${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/status', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    capabilities: [
      'sentiment-analysis',
      'attrition-prediction',
      'flight-risk-detection',
      'burnout-detection',
      'skills-graph',
      'knowledge-graph',
      'culture-intelligence',
      'health-monitoring'
    ],
    integrations: {
      workforceOs: 'http://localhost:5065',
      corpid: 'http://localhost:4702',
      memoryOs: 'http://localhost:4703',
      twinosHub: 'http://localhost:4705'
    }
  });
});

// ============================================================
// ANALYTICS - CEO DASHBOARD
// ============================================================

app.get('/api/analytics/overview', (req, res) => {
  // Simulated workforce health data
  const overview = {
    timestamp: new Date().toISOString(),
    period: 'current',

    // Headcount
    headcount: {
      total: 100,
      active: 95,
      contractors: 8,
      openPositions: 12,
      growth: 5.2,
      growthTrend: 'up'
    },

    // Org Health Score (0-100)
    healthScore: {
      overall: 78,
      trend: 'stable',
      components: {
        engagement: 82,
        retention: 75,
        productivity: 80,
        culture: 76
      }
    },

    // Key Metrics
    metrics: {
      avgTenure: 2.4,
      attritionRate: 12.5,
      timeToHire: 28,
      productivityIndex: 85,
      engagementScore: 78,
      absenteeism: 2.3
    },

    // Alerts Summary
    alertsSummary: {
      critical: 2,
      warning: 8,
      info: 15
    },

    // Financial
    financial: {
      monthlyPayroll: 25000000,
      costPerEmployee: 250000,
      revenuePerEmployee: 1200000,
      laborCostRatio: 28.5
    },

    // Trends (last 6 months)
    trends: {
      headcount: [85, 88, 90, 93, 97, 100],
      attrition: [15, 14, 13, 12, 11, 12.5],
      engagement: [72, 74, 75, 77, 78, 78],
      productivity: [78, 80, 82, 83, 84, 85]
    }
  };

  res.json(overview);
});

app.get('/api/analytics/hr-dashboard', (req, res) => {
  const dashboard = {
    timestamp: new Date().toISOString(),

    // Leave & Attendance
    leave: {
      pendingRequests: 12,
      onLeave: 8,
      upcomingHolidays: 5,
      avgLeaveUtilization: 68
    },

    // Recruitment
    recruitment: {
      openPositions: 12,
      totalCandidates: 156,
      inPipeline: 89,
      offersExtended: 8,
      offersAccepted: 6,
      conversionRate: 75
    },

    // Payroll
    payroll: {
      nextRunDate: '2026-06-25',
      employeesProcessed: 95,
      totalAmount: 25000000,
      pendingAdjustments: 3
    },

    // Performance
    performance: {
      reviewsCompleted: 45,
      reviewsPending: 50,
      avgRating: 3.8,
      topPerformers: 12,
      underperformers: 5
    },

    // Compliance
    compliance: {
      documentsPending: 15,
      policiesAcknowledged: 92,
      pendingTrainings: 28
    },

    // Quick Actions
    quickActions: [
      { action: 'Approve Leave', count: 12, priority: 'high' },
      { action: 'Review Expense', count: 8, priority: 'medium' },
      { action: 'Complete Onboarding', count: 4, priority: 'high' },
      { action: 'Schedule Reviews', count: 15, priority: 'medium' }
    ]
  };

  res.json(dashboard);
});

// ============================================================
// ORGANIZATION HEALTH
// ============================================================

app.get('/api/analytics/health', (req, res) => {
  const health = {
    overall: 78,
    grade: 'B+',
    status: 'healthy',

    components: [
      {
        name: 'Employee Engagement',
        score: 82,
        status: 'good',
        trend: 'improving',
        insights: ['Recent team events boosted morale', 'Remote work satisfaction high']
      },
      {
        name: 'Retention Risk',
        score: 75,
        status: 'warning',
        trend: 'stable',
        insights: ['3 employees flagged for exit risk', 'Compensation below market in Engineering']
      },
      {
        name: 'Productivity',
        score: 80,
        status: 'good',
        trend: 'stable',
        insights: ['Remote work productivity maintained', 'Meeting overload in Sales']
      },
      {
        name: 'Culture Health',
        score: 76,
        status: 'fair',
        trend: 'improving',
        insights: ['Recognition programs showing impact', 'Work-life balance concern in Product']
      },
      {
        name: 'Leadership Effectiveness',
        score: 74,
        status: 'fair',
        trend: 'stable',
        insights: ['Manager training completed by 60%', '1-on-1 frequency increased']
      }
    ],

    recommendations: [
      { priority: 'high', action: 'Review Engineering salary bands', reason: 'Risk of attrition' },
      { priority: 'medium', action: 'Reduce meetings in Sales', reason: 'Improving productivity' },
      { priority: 'medium', action: 'Expand recognition program', reason: 'Culture boost' }
    ],

    historicalScores: [
      { month: 'Jan', score: 72 },
      { month: 'Feb', score: 73 },
      { month: 'Mar', score: 75 },
      { month: 'Apr', score: 76 },
      { month: 'May', score: 77 },
      { month: 'Jun', score: 78 }
    ]
  };

  res.json(health);
});

app.get('/api/analytics/health/team/:teamId', (req, res) => {
  const teamHealth = {
    teamId: req.params.teamId,
    teamName: 'Engineering Team A',
    managerId: 'EMP003',
    managerName: 'Amit Patel',

    healthScore: 82,
    memberCount: 8,

    metrics: {
      engagement: 85,
      collaboration: 88,
      productivity: 80,
      satisfaction: 78
    },

    risks: [
      { type: 'workload', severity: 'medium', description: '2 members showing signs of burnout' },
      { type: 'skill', severity: 'low', description: 'Skills gap in ML expertise' }
    ],

    insights: [
      'Strong collaboration between frontend and backend',
      'ML knowledge sharing sessions showing positive results',
      'Consider adding ML specialist for Q3 projects'
    ]
  };

  res.json(teamHealth);
});

// ============================================================
// PREDICTIVE ANALYTICS
// ============================================================

app.get('/api/predictions/attrition', (req, res) => {
  const predictions = {
    generatedAt: new Date().toISOString(),

    // Overall prediction
    overall: {
      predictedRate: 14.2,
      currentRate: 12.5,
      trend: 'increasing',
      confidence: 87
    },

    // Risk factors
    riskFactors: [
      { factor: 'Below-market compensation', impact: 'high', affectedEmployees: 18 },
      { factor: 'Limited growth opportunities', impact: 'medium', affectedEmployees: 25 },
      { factor: 'Workload pressure', impact: 'medium', affectedEmployees: 12 },
      { factor: 'Manager relationship issues', impact: 'low', affectedEmployees: 5 }
    ],

    // Predicted attrition by department
    byDepartment: [
      { dept: 'Engineering', predicted: 15.2, current: 10, risk: 'high' },
      { dept: 'Sales', predicted: 18.5, current: 15, risk: 'high' },
      { dept: 'Marketing', predicted: 12.0, current: 11, risk: 'medium' },
      { dept: 'Operations', predicted: 8.5, current: 9, risk: 'low' }
    ],

    // Predicted exits next quarter
    atRiskEmployees: [
      { id: 'EMP012', name: 'Senior Engineer', risk: 85, reason: 'No promotion in 3 years' },
      { id: 'EMP034', name: 'Sales Rep', risk: 78, reason: 'Below quota for 2 quarters' },
      { id: 'EMP056', name: 'Designer', risk: 72, reason: 'Received external offer' }
    ],

    // Recommendations
    recommendations: [
      { action: 'Conduct salary review for Engineering', priority: 'high', impact: 'high' },
      { action: 'Launch promotion cycle', priority: 'high', impact: 'medium' },
      { action: 'Add growth path for IC track', priority: 'medium', impact: 'high' }
    ]
  };

  res.json(predictions);
});

app.get('/api/predictions/flight-risk', (req, res) => {
  const { minRisk = 50 } = req.query;

  const employees = [
    { id: 'EMP012', name: 'Vikram Rao', department: 'Engineering', riskScore: 85, signals: ['No promotion 3 years', 'Below market salary', 'LinkedIn active'], recommendation: 'Schedule retention conversation' },
    { id: 'EMP034', name: 'Priya Menon', department: 'Sales', riskScore: 78, signals: ['Below quota', 'Missed bonus', 'Quiet quitting signs'], recommendation: 'Performance coaching + comp review' },
    { id: 'EMP056', name: 'Arjun Singh', department: 'Design', riskScore: 72, signals: ['External offer received', 'Team changes', 'Low engagement'], recommendation: 'Counter-offer consideration' },
    { id: 'EMP078', name: 'Neha Patel', department: 'Product', riskScore: 65, signals: ['Workload increase', 'Limited growth'], recommendation: 'Workload review + career discussion' },
    { id: 'EMP091', name: 'Rahul Kumar', department: 'Engineering', riskScore: 58, signals: ['Remote work concern'], recommendation: 'WFH policy clarification' }
  ].filter(e => e.riskScore >= parseInt(minRisk));

  res.json({
    generatedAt: new Date().toISOString(),
    atRiskCount: employees.length,
    employees
  });
});

app.get('/api/predictions/burnout', (req, res) => {
  const burnout = {
    generatedAt: new Date().toISOString(),

    overview: {
      atRiskCount: 8,
      criticalCount: 2,
      moderateCount: 6,
      averageScore: 42
    },

    criticalCases: [
      { id: 'EMP015', name: 'Kiran Sharma', department: 'Engineering', score: 92, factors: ['12+ hour days', 'Weekend work', 'No vacation'], recommendation: 'Immediate intervention required' },
      { id: 'EMP042', name: 'Sneha Gupta', department: 'Sales', score: 87, factors: ['High targets', 'Client pressure', 'Manager conflict'], recommendation: 'Manager coaching + workload reduction' }
    ],

    patterns: [
      { pattern: 'Month-end crunch', affectedTeams: ['Sales', 'Finance'], frequency: 'monthly' },
      { pattern: 'Product launch crunch', affectedTeams: ['Engineering', 'Product'], frequency: 'quarterly' }
    ],

    recommendations: [
      { priority: 'high', action: 'Mandate PTO for 2 critical cases', impact: 'prevention' },
      { priority: 'medium', action: 'Review project timelines', impact: 'workload' },
      { priority: 'medium', action: 'Manager burnout training', impact: 'awareness' }
    ]
  };

  res.json(burnout);
});

app.get('/api/predictions/performance', (req, res) => {
  const performance = {
    generatedAt: new Date().toISOString(),

    currentQuarter: {
      topPerformers: 15,
      meetingExpectations: 65,
      needsImprovement: 12,
      underperformers: 5
    },

    predictions: {
      nextQuarter: {
        topPerformers: 18,
        meetingExpectations: 62,
        needsImprovement: 14,
        underperformers: 4
      },
      factors: ['New training programs', 'Increased 1-on-1s', 'Goal clarity improvement']
    },

    atRiskOfDecline: [
      { id: 'EMP078', name: 'Team member', current: 4.0, predicted: 3.5, reason: 'Increasing workload, reduced engagement' }
    ],

    starCandidates: [
      { id: 'EMP009', name: 'Top performer', rating: 4.8, trend: 'up', retentionRisk: 'low' }
    ]
  };

  res.json(performance);
});

app.get('/api/predictions/headcount', (req, res) => {
  const headcount = {
    generatedAt: new Date().toISOString(),

    current: 100,

    projections: [
      { month: 'Jul', headcount: 102, hires: 5, exits: 3 },
      { month: 'Aug', headcount: 106, hires: 6, exits: 2 },
      { month: 'Sep', headcount: 110, hires: 7, exits: 3 },
      { month: 'Oct', headcount: 114, hires: 6, exits: 2 }
    ],

    hiringPlan: [
      { role: 'Senior Engineer', dept: 'Engineering', target: 3, priority: 'high' },
      { role: 'Sales Manager', dept: 'Sales', target: 2, priority: 'high' },
      { role: 'Product Designer', dept: 'Design', target: 2, priority: 'medium' }
    ],

    budget: {
      currentMonthlyPayroll: 25000000,
      projectedMonthlyPayroll: 28000000,
      hiringBudgetAvailable: 5000000
    }
  };

  res.json(headcount);
});

// ============================================================
// SENTIMENT INTELLIGENCE
// ============================================================

app.get('/api/intelligence/sentiment', (req, res) => {
  const sentiment = {
    generatedAt: new Date().toISOString(),

    overallScore: 72,
    sentiment: 'positive',

    dimensions: {
      leadership: { score: 75, trend: 'up', insight: 'Employees appreciate recent leadership changes' },
      workLifeBalance: { score: 68, trend: 'stable', insight: 'WFH policy well-received' },
      compensation: { score: 55, trend: 'down', insight: 'Market adjustments needed' },
      growth: { score: 70, trend: 'up', insight: 'Promotion opportunities improved' },
      culture: { score: 78, trend: 'up', insight: 'Team events effective' }
    },

    recentFeedback: [
      { theme: 'Recognition', sentiment: 'positive', frequency: 45 },
      { theme: 'Workload', sentiment: 'negative', frequency: 32 },
      { theme: 'Career Growth', sentiment: 'neutral', frequency: 28 },
      { theme: 'Compensation', sentiment: 'negative', frequency: 25 }
    ],

    weeklyTrend: [68, 70, 71, 72, 72, 72],

    alerts: [
      { type: 'compensation', severity: 'high', message: '25% of feedback mentions below-market pay' }
    ]
  };

  res.json(sentiment);
});

app.get('/api/intelligence/sentiment/team/:teamId', (req, res) => {
  const teamSentiment = {
    teamId: req.params.teamId,
    score: 78,
    trend: 'improving',

    metrics: {
      collaboration: 82,
      psychologicalSafety: 75,
      recognition: 80,
      workloadSatisfaction: 72
    },

    insights: [
      'Team members appreciate flexible work hours',
      'Cross-team collaboration increased',
      'Meeting overload affecting productivity'
    ],

    recommendations: [
      'Implement meeting-free days',
      'Recognition program showing positive results',
      'Consider team offsites'
    ]
  };

  res.json(teamSentiment);
});

// ============================================================
// CULTURE INTELLIGENCE
// ============================================================

app.get('/api/intelligence/culture', (req, res) => {
  const culture = {
    generatedAt: new Date().toISOString(),

    overallScore: 76,
    grade: 'B',
    status: 'healthy',

    dimensions: [
      { name: 'Collaboration', score: 82, trend: 'up', benchmark: 78 },
      { name: 'Communication', score: 75, trend: 'stable', benchmark: 75 },
      { name: 'Recognition', score: 70, trend: 'up', benchmark: 65 },
      { name: 'Psychological Safety', score: 78, trend: 'stable', benchmark: 72 },
      { name: 'Innovation', score: 72, trend: 'up', benchmark: 70 },
      { name: 'Leadership', score: 74, trend: 'up', benchmark: 73 }
    ],

    culturalStrengths: [
      'Strong cross-functional collaboration',
      'High psychological safety scores',
      'Innovation initiatives gaining traction'
    ],

    areasForImprovement: [
      'Recognition frequency below benchmark',
      'Communication clarity in remote settings',
      'Career path visibility'
    ],

    benchmarks: {
      industry: 72,
      bestInClass: 85,
      percentile: 68
    },

    recommendations: [
      { priority: 'high', action: 'Launch peer recognition program', impact: 'quick win' },
      { priority: 'medium', action: 'Improve async communication guidelines', impact: 'culture' },
      { priority: 'medium', action: 'Create clear career ladders', impact: 'long-term' }
    ]
  };

  res.json(culture);
});

// ============================================================
// SKILLS INTELLIGENCE
// ============================================================

app.get('/api/intelligence/skills', (req, res) => {
  const skills = {
    generatedAt: new Date().toISOString(),

    overview: {
      totalSkills: 245,
      uniqueSkills: 180,
      avgSkillsPerEmployee: 8.5,
      mostCommonSkill: 'JavaScript'
    },

    supplyDemand: [
      { skill: 'React', supply: 'high', demand: 'high', gap: 'balanced' },
      { skill: 'Python', supply: 'medium', demand: 'very-high', gap: 'shortage' },
      { skill: 'Machine Learning', supply: 'low', demand: 'very-high', gap: 'critical-shortage' },
      { skill: 'Sales', supply: 'high', demand: 'medium', gap: 'surplus' },
      { skill: 'Kubernetes', supply: 'low', demand: 'high', gap: 'shortage' }
    ],

    skillClusters: [
      { cluster: 'Frontend', skills: ['React', 'Vue', 'Angular', 'TypeScript'], coverage: 85 },
      { cluster: 'Backend', skills: ['Node.js', 'Python', 'Java', 'Go'], coverage: 78 },
      { cluster: 'Data/ML', skills: ['Python', 'TensorFlow', 'SQL', 'Spark'], coverage: 45 },
      { cluster: 'DevOps', skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'], coverage: 55 }
    ],

    skillGaps: [
      { skill: 'Machine Learning', severity: 'critical', affectedProjects: 5, recommendedAction: 'Hire 2 ML specialists + upskill 5 engineers' },
      { skill: 'Kubernetes', severity: 'high', affectedProjects: 3, recommendedAction: 'Certify 8 engineers + hire 1 SRE' }
    ],

    recommendations: [
      { priority: 'high', action: 'ML bootcamp for 10 engineers', timeline: 'Q3', investment: 500000 },
      { priority: 'high', action: 'Kubernetes certification program', timeline: 'Q3', investment: 200000 },
      { priority: 'medium', action: 'External ML consultant for project guidance', timeline: 'immediate', investment: 300000 }
    ]
  };

  res.json(skills);
});

app.get('/api/intelligence/skills/:employeeId', (req, res) => {
  const employeeSkills = {
    employeeId: req.params.employeeId,
    skills: [
      { name: 'JavaScript', level: 'expert', years: 6, endorsements: 8 },
      { name: 'React', level: 'expert', years: 4, endorsements: 12 },
      { name: 'Node.js', level: 'advanced', years: 3, endorsements: 5 },
      { name: 'TypeScript', level: 'advanced', years: 2, endorsements: 4 },
      { name: 'AWS', level: 'intermediate', years: 2, endorsements: 3 }
    ],
    gaps: [
      { skill: 'Machine Learning', gap: 'high', recommendation: 'Take ML fundamentals course' },
      { skill: 'Leadership', gap: 'medium', recommendation: 'Consider manager training' }
    ],
    developmentAreas: ['System Design', 'Team Leadership', 'Mentoring']
  };

  res.json(employeeSkills);
});

// ============================================================
// AI INSIGHTS & RECOMMENDATIONS
// ============================================================

app.get('/api/insights/cards', (req, res) => {
  const cards = [
    {
      id: 'INS001',
      type: 'retention_risk',
      priority: 'high',
      title: 'Attrition Risk in Engineering',
      description: '3 senior engineers flagged for flight risk due to below-market compensation. Immediate action recommended.',
      affectedEmployees: 3,
      potentialImpact: 'Loss of institutional knowledge and project delays',
      recommendedActions: [
        { action: 'Conduct salary benchmarking', timeline: 'This week', owner: 'HR' },
        { action: 'Schedule retention conversations', timeline: 'This week', owner: 'Manager' },
        { action: 'Prepare retention package', timeline: 'Next week', owner: 'HR + Finance' }
      ],
      confidence: 87
    },
    {
      id: 'INS002',
      type: 'burnout_risk',
      priority: 'high',
      title: 'Team Burnout Alert',
      description: 'Engineering team showing signs of burnout with 12+ hour average workdays. 2 critical cases identified.',
      affectedEmployees: 8,
      potentialImpact: 'Quality issues, increased errors, eventual attrition',
      recommendedActions: [
        { action: 'Mandate 1 week PTO for critical cases', timeline: 'Immediate', owner: 'Manager' },
        { action: 'Review project deadlines', timeline: 'This week', owner: 'PMO' },
        { action: 'Hire contractor for workload分担', timeline: '2 weeks', owner: 'HR' }
      ],
      confidence: 92
    },
    {
      id: 'INS003',
      type: 'hiring_opportunity',
      priority: 'medium',
      title: 'Cost-Effective Hiring',
      description: '2 former employees in talent pool who left on good terms. Consider for open positions.',
      potentialSavings: '₹8L in recruitment costs',
      recommendedActions: [
        { action: 'Review talent pool profiles', timeline: 'This week', owner: 'Recruiting' }
      ],
      confidence: 95
    },
    {
      id: 'INS004',
      type: 'skill_gap',
      priority: 'medium',
      title: 'Critical Skill Gap: ML',
      description: 'Machine Learning skill gap affecting 5 projects. 3-month project delays expected without intervention.',
      affectedProjects: 5,
      recommendedActions: [
        { action: 'Launch ML upskilling program', timeline: 'Q3', owner: 'Learning' },
        { action: 'Hire 2 ML specialists', timeline: 'ASAP', owner: 'Recruiting' }
      ],
      confidence: 88
    },
    {
      id: 'INS005',
      type: 'engagement',
      priority: 'low',
      title: 'Recognition Impact',
      description: 'Recent peer recognition program showing 15% improvement in employee satisfaction scores.',
      positiveImpact: true,
      recommendedActions: [
        { action: 'Expand recognition program', timeline: 'Q3', owner: 'Culture Team' }
      ],
      confidence: 90
    }
  ];

  res.json({
    generatedAt: new Date().toISOString(),
    totalCards: cards.length,
    byPriority: {
      high: cards.filter(c => c.priority === 'high').length,
      medium: cards.filter(c => c.priority === 'medium').length,
      low: cards.filter(c => c.priority === 'low').length
    },
    cards
  });
});

app.get('/api/insights/recommendations', (req, res) => {
  const recommendations = [
    {
      category: 'retention',
      priority: 'high',
      title: 'Conduct Engineering Salary Review',
      rationale: 'Attrition risk is 35% above normal due to market lag. Benchmark against top 25th percentile.',
      estimatedCost: 2500000,
      estimatedImpact: 'Reduce attrition by 30%',
      roi: 'high',
      timeline: 'This quarter'
    },
    {
      category: 'engagement',
      priority: 'medium',
      title: 'Launch Peer Recognition Platform',
      rationale: 'Recognition frequency 40% below benchmark. Simple intervention with high engagement impact.',
      estimatedCost: 100000,
      estimatedImpact: 'Improve engagement by 10%',
      roi: 'very-high',
      timeline: '4 weeks'
    },
    {
      category: 'productivity',
      priority: 'medium',
      title: 'Implement Meeting-Free Days',
      rationale: 'Meeting overload identified in Sales and Product teams. 4 hours/week lost per person.',
      estimatedCost: 0,
      estimatedImpact: 'Gain 15% productivity time',
      roi: 'very-high',
      timeline: '2 weeks'
    },
    {
      category: 'hiring',
      priority: 'medium',
      title: 'Accelerate ML Specialist Hiring',
      rationale: 'Critical skill gap affecting 5 key projects. Delays will compound.',
      estimatedCost: 6000000,
      estimatedImpact: 'Onboard by Q3 end',
      roi: 'high',
      timeline: 'Immediate'
    },
    {
      category: 'culture',
      priority: 'low',
      title: 'Quarterly Team Offsites',
      rationale: 'Remote work affecting team cohesion scores. Offsites show 20% improvement.',
      estimatedCost: 500000,
      estimatedImpact: 'Improve collaboration by 15%',
      roi: 'medium',
      timeline: 'Q3'
    }
  ];

  res.json({
    generatedAt: new Date().toISOString(),
    recommendations
  });
});

app.get('/api/insights/trends', (req, res) => {
  const trends = {
    period: 'Last 6 months',

    workforce: [
      { metric: 'Headcount', current: 100, change: 5.2, trend: 'up', forecast: 'increasing' },
      { metric: 'Productivity', current: 85, change: 3.2, trend: 'up', forecast: 'stable' },
      { metric: 'Engagement', current: 78, change: 0, trend: 'stable', forecast: 'improving' },
      { metric: 'Attrition', current: 12.5, change: -0.5, trend: 'down', forecast: 'stable' }
    ],

    departmentComparison: [
      { dept: 'Engineering', health: 82, trend: 'stable', topMetric: 'Collaboration', concern: 'Workload' },
      { dept: 'Sales', health: 75, trend: 'down', topMetric: 'Productivity', concern: 'Targets' },
      { dept: 'Marketing', health: 78, trend: 'up', topMetric: 'Engagement', concern: 'Resources' },
      { dept: 'Operations', health: 80, trend: 'stable', topMetric: 'Culture', concern: 'Growth' }
    ],

    industryBenchmarks: {
      engagement: { company: 78, industry: 72, bestInClass: 85 },
      attrition: { company: 12.5, industry: 15, bestInClass: 8 },
      productivity: { company: 85, industry: 78, bestInClass: 92 }
    }
  };

  res.json(trends);
});

// ============================================================
// ALERTS
// ============================================================

app.get('/api/analytics/alerts', (req, res) => {
  const { severity, type } = req.query;

  let alerts = [
    { id: 'ALT001', type: 'retention', severity: 'critical', title: 'Senior Engineer flagged for exit risk', employeeId: 'EMP012', createdAt: '2026-06-16T10:00:00Z', message: 'Vikram Rao has multiple exit signals. Immediate retention action required.' },
    { id: 'ALT002', type: 'burnout', severity: 'critical', title: 'Critical burnout case detected', employeeId: 'EMP015', createdAt: '2026-06-16T09:00:00Z', message: 'Kiran Sharma averaging 12+ hour days. Intervention required.' },
    { id: 'ALT003', type: 'compliance', severity: 'high', title: 'Document expiry warning', employeeId: 'EMP023', createdAt: '2026-06-15T14:00:00Z', message: 'Passport expires in 30 days. Travel restrictions apply.' },
    { id: 'ALT004', type: 'attendance', severity: 'medium', title: 'Attendance pattern anomaly', employeeId: 'EMP045', createdAt: '2026-06-15T11:00:00Z', message: 'Unusual late arrivals pattern detected for past 2 weeks.' },
    { id: 'ALT005', type: 'performance', severity: 'medium', title: 'Declining performance trend', employeeId: 'EMP078', createdAt: '2026-06-14T16:00:00Z', message: 'Performance rating declined for 2 consecutive quarters.' },
    { id: 'ALT006', type: 'compensation', severity: 'high', title: 'Below-market salary detected', department: 'Engineering', createdAt: '2026-06-14T10:00:00Z', message: 'Engineering salaries 15% below market median. Flight risk elevated.' },
    { id: 'ALT007', type: 'training', severity: 'low', title: 'Compliance training overdue', employeeId: 'EMP089', createdAt: '2026-06-13T09:00:00Z', message: 'Annual compliance training pending for 5 days.' }
  ];

  if (severity) alerts = alerts.filter(a => a.severity === severity);
  if (type) alerts = alerts.filter(a => a.type === type);

  res.json({
    total: alerts.length,
    bySeverity: {
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    },
    alerts: alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
  });
});

// ============================================================
// KNOWLEDGE GRAPH
// ============================================================

app.get('/api/intelligence/knowledge', (req, res) => {
  const knowledge = {
    overview: {
      totalEntities: 1250,
      relationships: 4800,
      lastUpdated: new Date().toISOString()
    },

    entityTypes: [
      { type: 'Employees', count: 100 },
      { type: 'Departments', count: 8 },
      { type: 'Projects', count: 35 },
      { type: 'Skills', count: 245 },
      { type: 'Documents', count: 500 },
      { type: 'Policies', count: 42 }
    ],

    insights: [
      { insight: 'Engineering drives 60% of company patents', entities: ['Engineering', 'R&D'] },
      { insight: 'Cross-functional projects have 25% higher success', entities: ['Projects', 'Teams'] },
      { insight: 'Mentorship correlates with 40% higher retention', entities: ['Mentors', 'Mentees'] }
    ],

    queryExamples: [
      'Who has Kubernetes skills?',
      'Which projects involve React?',
      'Who worked with Amit Patel?',
      'What policies apply to remote work?'
    ]
  };

  res.json(knowledge);
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  logger.error('Error', { error: err.message });
  res.status(500).json({ error: 'Internal server error', requestId: req.requestId });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  logger.info(`🚀 RTMN Workforce Intelligence v1.0.0 started on port ${PORT}`);
  logger.info(`🤖 AI-Powered HR Command Center`);
  logger.info(`📊 Connected to Workforce OS (Port 5065)`);
  logger.info(`🔗 Connected to CorpID (Port 4702)`);
  logger.info(`🧠 Connected to Memory OS (Port 4703)`);
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  GET  /health                              - Health check');
  logger.info('  GET  /api/analytics/overview              - CEO dashboard');
  logger.info('  GET  /api/analytics/hr-dashboard          - HR dashboard');
  logger.info('  GET  /api/analytics/health                - Org health');
  logger.info('  GET  /api/predictions/attrition           - Attrition prediction');
  logger.info('  GET  /api/predictions/flight-risk         - Flight risk detection');
  logger.info('  GET  /api/predictions/burnout             - Burnout detection');
  logger.info('  GET  /api/intelligence/sentiment          - Sentiment analysis');
  logger.info('  GET  /api/intelligence/culture           - Culture intelligence');
  logger.info('  GET  /api/intelligence/skills             - Skills graph');
  logger.info('  GET  /api/insights/cards                  - Decision cards');
  logger.info('  GET  /api/insights/recommendations        - AI recommendations');
  logger.info('  GET  /api/analytics/alerts                - Active alerts');
});

export default app;
