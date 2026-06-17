/**
 * RTMN Organization OS - Org Design and Planning Platform
 *
 * Provides:
 * - Visual Org Chart Builder
 * - AI Organization Design
 * - Workforce Planning
 * - Headcount Management
 * - Succession Planning
 *
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const PORT = process.env.PORT || 5072;
const SERVICE_NAME = 'organization-os';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) =>
      `${timestamp} [${level}] ${SERVICE_NAME}: ${message}`
    )
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
// IN-MEMORY DATA
// ============================================================

const db = {
  positions: new Map(),
  headcountPlans: new Map(),
  successionPlans: new Map(),
  restructuringProposals: new Map()
};

function initializeData() {
  // Sample positions
  const positions = [
    { id: 'POS001', title: 'CEO', level: 'L10', department: 'Executive', headCount: 1, filledCount: 1, budget: 50000000 },
    { id: 'POS002', title: 'CTO', level: 'L9', department: 'Technology', headCount: 1, filledCount: 1, budget: 30000000 },
    { id: 'POS003', title: 'CFO', level: 'L9', department: 'Finance', headCount: 1, filledCount: 1, budget: 25000000 },
    { id: 'POS004', title: 'VP Engineering', level: 'L8', department: 'Technology', headCount: 1, filledCount: 1, budget: 15000000 },
    { id: 'POS005', title: 'VP Sales', level: 'L8', department: 'Sales', headCount: 1, filledCount: 1, budget: 12000000 },
    { id: 'POS006', title: 'Engineering Manager', level: 'L6', department: 'Technology', headCount: 4, filledCount: 3, budget: 5000000 },
    { id: 'POS007', title: 'Senior Software Engineer', level: 'L4', department: 'Technology', headCount: 20, filledCount: 18, budget: 2000000 },
    { id: 'POS008', title: 'Software Engineer', level: 'L3', department: 'Technology', headCount: 25, filledCount: 22, budget: 1200000 },
    { id: 'POS009', title: 'Sales Manager', level: 'L6', department: 'Sales', headCount: 3, filledCount: 2, budget: 4000000 },
    { id: 'POS010', title: 'Sales Executive', level: 'L3', department: 'Sales', headCount: 15, filledCount: 12, budget: 800000 }
  ];

  positions.forEach(p => db.positions.set(p.id, p));

  // Sample headcount plans
  const plans = [
    {
      id: 'PLAN001',
      title: 'Q3 2026 Hiring Plan',
      quarter: 'Q3 2026',
      status: 'approved',
      positions: [
        { positionId: 'POS007', currentHC: 18, approvedHC: 22, reason: 'Product expansion' },
        { positionId: 'POS009', currentHC: 2, approvedHC: 4, reason: 'Sales team growth' }
      ],
      totalNewHires: 6,
      estimatedCost: 12000000,
      createdAt: '2026-06-01'
    }
  ];

  plans.forEach(p => db.headcountPlans.set(p.id, p));

  // Succession plans
  const successions = [
    {
      id: 'SUC001',
      positionId: 'POS002',
      positionTitle: 'CTO',
      incumbents: ['EMP003'],
      candidates: [
        { employeeId: 'EMP009', name: 'Senior Engineer', readyness: '2-3 years', status: 'identified' }
      ],
      status: 'in_progress'
    }
  ];

  successions.forEach(s => db.successionPlans.set(s.id, s));

  logger.info(`Initialized ${positions.length} positions, ${plans.length} headcount plans`);
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    port: PORT,
    uptime: process.uptime()
  });
});

app.get('/status', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    stats: {
      positions: db.positions.size,
      headcountPlans: db.headcountPlans.size,
      successionPlans: db.successionPlans.size
    },
    integrations: {
      workforceOs: 'http://localhost:5065',
      talentOs: 'http://localhost:5066'
    }
  });
});

// ============================================================
// ORG CHART MODULE
// ============================================================

app.get('/api/org/chart', (req, res) => {
  const positions = Array.from(db.positions.values());

  // Build hierarchical org chart
  const chart = {
    id: 'root',
    title: 'CEO',
    level: 'L10',
    department: 'Executive',
    children: [
      {
        id: 'POS002',
        title: 'CTO',
        level: 'L9',
        department: 'Technology',
        children: [
          { id: 'POS004', title: 'VP Engineering', level: 'L8', department: 'Technology', children: [
            { id: 'POS006', title: 'Engineering Manager (x4)', level: 'L6', department: 'Technology', children: [
              { id: 'POS007', title: 'Senior SWE (x20)', level: 'L4', department: 'Technology', children: [] },
              { id: 'POS008', title: 'SWE (x25)', level: 'L3', department: 'Technology', children: [] }
            ]}
          ]}
        ]
      },
      {
        id: 'POS003',
        title: 'CFO',
        level: 'L9',
        department: 'Finance',
        children: []
      },
      {
        id: 'POS005',
        title: 'VP Sales',
        level: 'L8',
        department: 'Sales',
        children: [
          { id: 'POS009', title: 'Sales Manager (x3)', level: 'L6', department: 'Sales', children: [
            { id: 'POS010', title: 'Sales Executive (x15)', level: 'L3', department: 'Sales', children: [] }
          ]}
        ]
      }
    ]
  };

  res.json(chart);
});

app.get('/api/org/chart/:employeeId', (req, res) => {
  const employeeId = req.params.employeeId;

  // Return employee's position in org chart
  const subtree = {
    employeeId,
    position: 'Engineering Manager',
    level: 'L6',
    reportsTo: { id: 'EMP003', name: 'Amit Patel', title: 'VP Engineering' },
    directReports: [
      { id: 'EMP009', name: 'Arjun Verma', title: 'Senior Engineer' },
      { id: 'EMP001', name: 'Rajesh Kumar', title: 'Senior Engineer' }
    ],
    totalUnderlings: 5
  };

  res.json(subtree);
});

// ============================================================
// ORG HEALTH & AI RECOMMENDATIONS
// ============================================================

app.get('/api/org/health', (req, res) => {
  const health = {
    overallScore: 76,
    grade: 'B+',

    metrics: {
      spanOfControl: {
        score: 72,
        ideal: '5-8',
        actual: 9,
        assessment: 'Slightly high - consider restructuring'
      },
      levels: {
        score: 85,
        currentLevels: 6,
        recommendedLevels: 5,
        assessment: 'Good - minimal hierarchy'
      },
      topHeavy: {
        score: 90,
        ratio: 0.08,
        assessment: 'Healthy ratio'
      },
      diversity: {
        score: 68,
        assessment: 'Room for improvement in leadership diversity'
      }
    },

    recommendations: [
      {
        priority: 'medium',
        category: 'restructure',
        title: 'Merge Product and Engineering',
        description: 'Consider combining Product and Engineering under CTO for faster delivery',
        impact: 'Cost savings: ₹20L/year, Faster time-to-market',
        effort: '6 months',
        risk: 'medium'
      },
      {
        priority: 'low',
        category: 'span',
        title: 'Reduce VP Sales direct reports',
        description: 'VP Sales has 8 direct reports. Consider adding layer.',
        impact: 'Better management bandwidth',
        effort: '3 months',
        risk: 'low'
      }
    ]
  };

  res.json(health);
});

app.get('/api/org/recommendations', (req, res) => {
  const recommendations = {
    generatedAt: new Date().toISOString(),

    strategic: [
      {
        id: 'REC001',
        type: 'restructure',
        title: 'Create Head of AI Role',
        description: 'Given AI initiatives, create dedicated Head of AI position reporting to CTO',
        impact: 'Accelerate AI initiatives',
        estimatedCost: 4000000,
        effort: '1 month'
      }
    ],

    operational: [
      {
        id: 'REC002',
        type: 'span',
        title: 'Balance Team Sizes',
        description: 'Frontend team (12) much larger than Backend (8). Consider rebalancing.',
        affectedTeams: ['Frontend', 'Backend'],
        recommendation: 'Hire 2 backend engineers before adding frontend'
      }
    ]
  };

  res.json(recommendations);
});

// ============================================================
// HEADCOUNT MODULE
// ============================================================

app.get('/api/headcount', (req, res) => {
  const { department, status } = req.query;
  let positions = Array.from(db.positions.values());

  if (department) positions = positions.filter(p => p.department === department);

  const summary = {
    totalPositions: positions.reduce((sum, p) => sum + p.headCount, 0),
    filled: positions.reduce((sum, p) => sum + p.filledCount, 0),
    open: positions.reduce((sum, p) => sum + (p.headCount - p.filledCount), 0),
    utilizationRate: 0
  };

  summary.utilizationRate = ((summary.filled / summary.totalPositions) * 100).toFixed(1);

  res.json({
    summary,
    byDepartment: positions.reduce((acc, p) => {
      if (!acc[p.department]) acc[p.department] = { headCount: 0, filled: 0, open: 0 };
      acc[p.department].headCount += p.headCount;
      acc[p.department].filled += p.filledCount;
      acc[p.department].open += (p.headCount - p.filledCount);
      return acc;
    }, {}),
    positions
  });
});

app.get('/api/headcount/projections', (req, res) => {
  const projections = {
    current: 100,
    quarters: [
      { quarter: 'Q3 2026', projected: 106, newHires: 8, exits: 2 },
      { quarter: 'Q4 2026', projected: 112, newHires: 9, exits: 3 },
      { quarter: 'Q1 2027', projected: 118, newHires: 8, exits: 2 },
      { quarter: 'Q2 2027', projected: 124, newHires: 8, exits: 2 }
    ],
    growthRate: 6.2,
    estimatedCost: {
      currentMonthly: 25000000,
      projectedMonthly: 31000000,
      additionalAnnualCost: 72000000
    }
  };

  res.json(projections);
});

app.post('/api/headcount/plan', (req, res) => {
  const id = `PLAN${uuidv4().slice(0, 8).toUpperCase()}`;
  const plan = {
    id,
    ...req.body,
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  db.headcountPlans.set(id, plan);
  res.status(201).json(plan);
});

app.get('/api/headcount/plans', (req, res) => {
  const { status } = req.query;
  let plans = Array.from(db.headcountPlans.values());
  if (status) plans = plans.filter(p => p.status === status);
  res.json(plans);
});

// ============================================================
// POSITIONS MODULE
// ============================================================

app.get('/api/positions', (req, res) => {
  const { department, level, filled } = req.query;
  let positions = Array.from(db.positions.values());

  if (department) positions = positions.filter(p => p.department === department);
  if (level) positions = positions.filter(p => p.level === level);
  if (filled === 'false') positions = positions.filter(p => p.filledCount < p.headCount);

  res.json(positions);
});

app.get('/api/positions/:id', (req, res) => {
  const position = db.positions.get(req.params.id);
  if (!position) return res.status(404).json({ error: 'Position not found' });
  res.json(position);
});

app.post('/api/positions', (req, res) => {
  const id = `POS${uuidv4().slice(0, 8).toUpperCase()}`;
  const position = { id, ...req.body };
  db.positions.set(id, position);
  res.status(201).json(position);
});

app.patch('/api/positions/:id', (req, res) => {
  const position = db.positions.get(req.params.id);
  if (!position) return res.status(404).json({ error: 'Position not found' });

  const updated = { ...position, ...req.body };
  db.positions.set(req.params.id, updated);
  res.json(updated);
});

// ============================================================
// SUCCESSION PLANNING
// ============================================================

app.get('/api/succession', (req, res) => {
  const plans = Array.from(db.successionPlans.values());
  res.json(plans);
});

app.get('/api/succession/:positionId', (req, res) => {
  const plan = Array.from(db.successionPlans.values())
    .find(p => p.positionId === req.params.positionId);

  if (!plan) {
    // Return template for position
    return res.json({
      positionId: req.params.positionId,
      status: 'not_started',
      candidates: [],
      timeline: '12 months'
    });
  }

  res.json(plan);
});

app.post('/api/succession', (req, res) => {
  const id = `SUC${uuidv4().slice(0, 8).toUpperCase()}`;
  const plan = {
    id,
    ...req.body,
    createdAt: new Date().toISOString()
  };

  db.successionPlans.set(id, plan);
  res.status(201).json(plan);
});

app.post('/api/succession/:id/candidate', (req, res) => {
  const plan = db.successionPlans.get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Succession plan not found' });

  plan.candidates = plan.candidates || [];
  plan.candidates.push({
    employeeId: req.body.employeeId,
    name: req.body.name,
    readyness: req.body.readyness || 'TBD',
    developmentPlan: req.body.developmentPlan || [],
    status: 'identified'
  });

  db.successionPlans.set(req.params.id, plan);
  res.json(plan);
});

// ============================================================
// RESTRUCTURING
// ============================================================

app.post('/api/org/restructure', (req, res) => {
  const id = `REST${uuidv4().slice(0, 8).toUpperCase()}`;
  const proposal = {
    id,
    ...req.body,
    status: 'draft',
    impactAnalysis: {
      affectedEmployees: req.body.changes?.reduce((sum, c) => sum + (c.affectedCount || 0), 0) || 0,
      costSavings: 0, // Calculate based on changes
      timeline: '3-6 months'
    },
    risks: [
      'Employee uncertainty',
      'Temporary productivity dip',
      'Client relationship impact'
    ],
    createdAt: new Date().toISOString()
  };

  db.restructuringProposals.set(id, proposal);
  res.status(201).json(proposal);
});

app.get('/api/org/restructure', (req, res) => {
  const proposals = Array.from(db.restructuringProposals.values());
  res.json(proposals);
});

app.post('/api/org/simulate', (req, res) => {
  // Simulate organizational changes
  const simulation = {
    changes: req.body.changes || [],
    impact: {
      spanOfControl: { before: 9, after: 7 },
      levels: { before: 6, after: 5 },
      headcount: { before: 100, after: 95 },
      costSavings: 15000000
    },
    risks: ['Low', 'Low', 'Medium'],
    timeline: '6 months',
    confidence: 85
  };

  res.json(simulation);
});

// ============================================================
// ANALYTICS
// ============================================================

app.get('/api/analytics/departments', (req, res) => {
  const departments = [
    { name: 'Technology', headcount: 55, budget: 80000000, utilization: 92, health: 82 },
    { name: 'Sales', headcount: 20, budget: 25000000, utilization: 85, health: 75 },
    { name: 'Marketing', headcount: 12, budget: 15000000, utilization: 88, health: 78 },
    { name: 'Finance', headcount: 8, budget: 10000000, utilization: 95, health: 80 },
    { name: 'Operations', headcount: 5, budget: 5000000, utilization: 90, health: 85 }
  ];

  res.json(departments);
});

app.get('/api/analytics/cost-centers', (req, res) => {
  const costCenters = [
    { id: 'CC001', name: 'Product Development', totalCost: 45000000, costPerEmployee: 1500000, trend: 'up' },
    { id: 'CC002', name: 'Sales & Marketing', totalCost: 35000000, costPerEmployee: 1200000, trend: 'stable' },
    { id: 'CC003', name: 'Operations', totalCost: 15000000, costPerEmployee: 1200000, trend: 'down' },
    { id: 'CC004', name: 'G&A', totalCost: 10000000, costPerEmployee: 800000, trend: 'stable' }
  ];

  res.json(costCenters);
});

// ============================================================
// START SERVER
// ============================================================

initializeData();

app.listen(PORT, () => {
  logger.info(`🚀 RTMN Organization OS v1.0.0 started on port ${PORT}`);
  logger.info(`📊 Org Design & Planning`);
  logger.info(`🔗 Connected to Workforce OS (Port 5065)`);
  logger.info(`👥 Connected to Talent OS (Port 5066)`);
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  GET  /health                           - Health check');
  logger.info('  GET  /api/org/chart                    - Org chart');
  logger.info('  GET  /api/org/health                   - Org health');
  logger.info('  GET  /api/headcount                    - Headcount');
  logger.info('  GET  /api/headcount/projections       - Future headcount');
  logger.info('  GET  /api/positions                    - All positions');
  logger.info('  GET  /api/succession                  - Succession plans');
  logger.info('  POST /api/org/restructure              - Propose restructure');
  logger.info('  POST /api/org/simulate                - Simulate changes');
});

export default app;
