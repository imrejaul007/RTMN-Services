/**
 * REZ Platform Admin - Complete RBAC System
 *
 * HIERARCHY:
 *
 * 1. GLOBAL LEADERSHIP (Super Admin controls all)
 *    - Super Admin - Full access to everything
 *    - CFO - Finance & Revenue
 *    - CTO - Technology & Engineering
 *    - CMO - Marketing & Growth
 *    - COO - Operations & Logistics
 *    - CHRO - Human Resources
 *    - Chief AI Officer - AI & Intelligence
 *
 * 2. COMPANY ADMINISTRATION
 *    - Company CEO - Full control of their company
 *    - Company CTO - Tech of their company
 *    - Company CFO - Finance of their company
 *    - Company CMO - Marketing of their company
 *    - Company COO - Operations of their company
 *    - Company Admin - General company control
 *
 * 3. DEPARTMENT ROLES
 *    - Department Head
 *    - Team Lead
 *    - Manager
 *    - Team Member
 *    - Viewer
 */

import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const app = express();
app.use(express.json());

// ============================================
// MODELS
// ============================================

// Global User model (Super Admins & C-Suite)
const GlobalUserSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: String,
  name: String,
  role: {
    type: String,
    enum: [
      'super_admin',
      'cfo', 'cto', 'cmo', 'coo', 'chro', 'chief_ai_officer',
      'company_admin', 'company_ceo', 'company_cto', 'company_cfo', 'company_cmo', 'company_coo',
      'department_head', 'manager', 'team_lead', 'team_member', 'viewer'
    ]
  },
  permissions: [String],
  is_active: { type: Boolean, default: true },
  last_login: Date,
  created_at: { type: Date, default: Date.now }
});

const GlobalUser = mongoose.model('GlobalUser', GlobalUserSchema);

// Company model
const CompanySchema = new mongoose.Schema({
  company_id: { type: String, required: true, unique: true },
  name: String,
  slug: String,
  type: { enum: ['consumer', 'merchant', 'media', 'hospitality', 'corpperks', 'holding', 'rabtul'] },
  status: { enum: ['active', 'suspended', 'inactive'], default: 'active' },
  admin_user_id: String,
  settings: mongoose.Schema.Types.Mixed,
  created_at: Date
});

const Company = mongoose.model('Company', CompanySchema);

// Company User model (Company-specific users)
const CompanyUserSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  company_id: { type: String, required: true },
  email: String,
  password_hash: String,
  name: String,
  department: {
    type: String,
    enum: ['engineering', 'marketing', 'sales', 'operations', 'finance', 'hr', 'support', 'admin']
  },
  role: {
    type: String,
    enum: ['ceo', 'cto', 'cfo', 'cmo', 'coo', 'head', 'manager', 'lead', 'member', 'viewer']
  },
  permissions: [String],
  is_active: { type: Boolean, default: true },
  last_login: Date,
  created_at: Date
});

const CompanyUser = mongoose.model('CompanyUser', CompanyUserSchema);

// Audit Log
const AuditSchema = new mongoose.Schema({
  action: String,
  user_id: String,
  user_role: String,
  company_id: String,
  resource: String,
  method: String,
  status: Number,
  ip: String,
  timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', AuditSchema);

// ============================================
// PERMISSIONS SYSTEM
// ============================================

const PERMISSIONS = {
  // Super Admin
  SUPER_ADMIN: '*',

  // Finance (CFO)
  FINANCE_VIEW: 'finance.view',
  FINANCE_REVENUE: 'finance.revenue',
  FINANCE_COSTS: 'finance.costs',
  FINANCE_REPORTS: 'finance.reports',
  FINANCE_BUDGETS: 'finance.budgets',
  FINANCE_AUDIT: 'finance.audit',

  // Technology (CTO)
  TECH_SERVICES: 'tech.services',
  TECH_DEPLOY: 'tech.deploy',
  TECH_CONFIG: 'tech.config',
  TECH_DATABASES: 'tech.databases',
  TECH_SECURITY: 'tech.security',
  TECH_PERFORMANCE: 'tech.performance',

  // Marketing (CMO)
  MARKETING_CAMPAIGNS: 'marketing.campaigns',
  MARKETING_KARMA: 'marketing.karma',
  MARKETING_ADS: 'marketing.ads',
  MARKETING_CONTENT: 'marketing.content',
  MARKETING_AUDIENCES: 'marketing.audiences',
  MARKETING_ANALYTICS: 'marketing.analytics',

  // Operations (COO)
  OPS_DELIVERY: 'ops.delivery',
  OPS_ORDERS: 'ops.orders',
  OPS_INVENTORY: 'ops.inventory',
  OPS_FULFILLMENT: 'ops.fulfillment',
  OPS_WAREHOUSE: 'ops.warehouse',
  OPS_LOGISTICS: 'ops.logistics',

  // HR (CHRO)
  HR_EMPLOYEES: 'hr.employees',
  HR_RECRUITING: 'hr.recruiting',
  HR_PAYROLL: 'hr.payroll',
  HR_BENEFITS: 'hr.benefits',
  HR_TRAINING: 'hr.training',
  HR_PERFORMANCE: 'hr.performance',

  // AI (Chief AI Officer)
  AI_MODELS: 'ai.models',
  AI_TRAINING: 'ai.training',
  AI_DEPLOYMENT: 'ai.deployment',
  AI_MONITORING: 'ai.monitoring',
  AI_EXPERIMENTS: 'ai.experiments',
  AI_DATA: 'ai.data',

  // Company-specific
  COMPANY_USERS: 'company.users',
  COMPANY_SETTINGS: 'company.settings',
  COMPANY_ANALYTICS: 'company.analytics',
  COMPANY_INTEGRATIONS: 'company.integrations',

  // General
  VIEW_ALL: 'view.all',
  SUPPORT_TICKETS: 'support.tickets',
  REPORTS: 'reports',
  DASHBOARD: 'dashboard'
};

// ============================================
// ROLE PERMISSIONS MAP
// ============================================

const GLOBAL_ROLE_PERMISSIONS: Record<string, string[]> = {
  // Global Leadership
  super_admin: ['*'],

  cfo: [
    PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_REVENUE, PERMISSIONS.FINANCE_COSTS,
    PERMISSIONS.FINANCE_REPORTS, PERMISSIONS.FINANCE_BUDGETS, PERMISSIONS.FINANCE_AUDIT,
    PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD, PERMISSIONS.VIEW_ALL
  ],

  cto: [
    PERMISSIONS.TECH_SERVICES, PERMISSIONS.TECH_DEPLOY, PERMISSIONS.TECH_CONFIG,
    PERMISSIONS.TECH_DATABASES, PERMISSIONS.TECH_SECURITY, PERMISSIONS.TECH_PERFORMANCE,
    PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD, PERMISSIONS.VIEW_ALL
  ],

  cmo: [
    PERMISSIONS.MARKETING_CAMPAIGNS, PERMISSIONS.MARKETING_KARMA, PERMISSIONS.MARKETING_ADS,
    PERMISSIONS.MARKETING_CONTENT, PERMISSIONS.MARKETING_AUDIENCES, PERMISSIONS.MARKETING_ANALYTICS,
    PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD, PERMISSIONS.VIEW_ALL
  ],

  coo: [
    PERMISSIONS.OPS_DELIVERY, PERMISSIONS.OPS_ORDERS, PERMISSIONS.OPS_INVENTORY,
    PERMISSIONS.OPS_FULFILLMENT, PERMISSIONS.OPS_WAREHOUSE, PERMISSIONS.OPS_LOGISTICS,
    PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD, PERMISSIONS.VIEW_ALL
  ],

  chro: [
    PERMISSIONS.HR_EMPLOYEES, PERMISSIONS.HR_RECRUITING, PERMISSIONS.HR_PAYROLL,
    PERMISSIONS.HR_BENEFITS, PERMISSIONS.HR_TRAINING, PERMISSIONS.HR_PERFORMANCE,
    PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD, PERMISSIONS.VIEW_ALL
  ],

  chief_ai_officer: [
    PERMISSIONS.AI_MODELS, PERMISSIONS.AI_TRAINING, PERMISSIONS.AI_DEPLOYMENT,
    PERMISSIONS.AI_MONITORING, PERMISSIONS.AI_EXPERIMENTS, PERMISSIONS.AI_DATA,
    PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD, PERMISSIONS.VIEW_ALL
  ],

  // Company Admins
  company_admin: [
    PERMISSIONS.VIEW_ALL, PERMISSIONS.COMPANY_USERS, PERMISSIONS.COMPANY_SETTINGS,
    PERMISSIONS.COMPANY_ANALYTICS, PERMISSIONS.SUPPORT_TICKETS, PERMISSIONS.REPORTS,
    PERMISSIONS.DASHBOARD, PERMISSIONS.TECH_SERVICES, PERMISSIONS.MARKETING_ANALYTICS
  ],

  company_ceo: [
    PERMISSIONS.VIEW_ALL, PERMISSIONS.COMPANY_USERS, PERMISSIONS.COMPANY_SETTINGS,
    PERMISSIONS.COMPANY_ANALYTICS, PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD
  ],

  company_cto: [
    PERMISSIONS.TECH_SERVICES, PERMISSIONS.TECH_CONFIG, PERMISSIONS.TECH_SECURITY,
    PERMISSIONS.COMPANY_SETTINGS, PERMISSIONS.COMPANY_ANALYTICS, PERMISSIONS.REPORTS
  ],

  company_cfo: [
    PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_REVENUE, PERMISSIONS.FINANCE_COSTS,
    PERMISSIONS.COMPANY_ANALYTICS, PERMISSIONS.REPORTS
  ],

  company_cmo: [
    PERMISSIONS.MARKETING_CAMPAIGNS, PERMISSIONS.MARKETING_ADS, PERMISSIONS.MARKETING_ANALYTICS,
    PERMISSIONS.COMPANY_ANALYTICS, PERMISSIONS.REPORTS
  ],

  company_coo: [
    PERMISSIONS.OPS_ORDERS, PERMISSIONS.OPS_INVENTORY, PERMISSIONS.OPS_FULFILLMENT,
    PERMISSIONS.COMPANY_ANALYTICS, PERMISSIONS.REPORTS
  ],

  // Department Roles
  department_head: [
    PERMISSIONS.VIEW_ALL, PERMISSIONS.REPORTS, PERMISSIONS.DASHBOARD,
    PERMISSIONS.SUPPORT_TICKETS
  ],

  manager: [
    PERMISSIONS.VIEW_ALL, PERMISSIONS.REPORTS, PERMISSIONS.SUPPORT_TICKETS
  ],

  team_lead: [
    PERMISSIONS.REPORTS, PERMISSIONS.SUPPORT_TICKETS
  ],

  team_member: [
    PERMISSIONS.SUPPORT_TICKETS
  ],

  viewer: []
};

// ============================================
// MIDDLEWARE
// ============================================

function authenticate(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...requiredPermissions: string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user;

    // Super admin has all permissions
    if (user.role === 'super_admin') return next();

    const userPermissions = GLOBAL_ROLE_PERMISSIONS[user.role] || [];

    // Check if user has * (wildcard)
    if (userPermissions.includes('*')) return next();

    // Check all required permissions
    const hasAll = requiredPermissions.every(p => userPermissions.includes(p));
    if (!hasAll) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredPermissions,
        user_role: user.role
      });
    }

    next();
  };
}

// Company-scoped authorization
function authorizeCompany(companyIdParam = 'company_id') {
  return (req: any, res: any, next: any) => {
    const user = req.user;

    // Super admin and global C-suite can access all companies
    if (['super_admin', 'cfo', 'cto', 'cmo', 'coo', 'chro', 'chief_ai_officer'].includes(user.role)) {
      return next();
    }

    // Company admins can only access their company
    const requestedCompany = req.params[companyIdParam] || req.query.company_id || req.body.company_id;
    if (user.company_id === requestedCompany) {
      return next();
    }

    res.status(403).json({ error: 'Access denied to this company' });
  };
}

// ============================================
// GLOBAL AUTH ROUTES (Super Admin & C-Suite)
// ============================================

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await GlobalUser.findOne({ email, is_active: true });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  user.last_login = new Date();
  await user.save();

  const token = jwt.sign({
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    permissions: GLOBAL_ROLE_PERMISSIONS[user.role] || []
  }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

  res.json({
    token,
    user: {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: GLOBAL_ROLE_PERMISSIONS[user.role] || []
    }
  });
});

// ============================================
// GLOBAL DASHBOARD
// ============================================

// Dashboard based on role
app.get('/api/dashboard', authenticate, async (req, res) => {
  const user = req.user;

  const dashboards = {
    super_admin: {
      title: 'Super Admin Dashboard',
      widgets: [
        { type: 'ecosystem', title: 'Ecosystem Overview' },
        { type: 'companies', title: 'All Companies' },
        { type: 'users', title: 'All Users' },
        { type: 'services', title: 'All Services' },
        { type: 'alerts', title: 'System Alerts' },
        { type: 'audit', title: 'Audit Log' }
      ]
    },

    cfo: {
      title: 'CFO Dashboard - Finance',
      widgets: [
        { type: 'revenue', title: 'Total Revenue' },
        { type: 'revenue_trend', title: 'Revenue Trend' },
        { type: 'costs', title: 'Costs & Expenses' },
        { type: 'by_company', title: 'Revenue by Company' },
        { type: 'budgets', title: 'Budget Status' },
        { type: 'forecasts', title: 'Financial Forecasts' }
      ]
    },

    cto: {
      title: 'CTO Dashboard - Technology',
      widgets: [
        { type: 'services_health', title: 'Service Health' },
        { type: 'deployments', title: 'Recent Deployments' },
        { type: 'incidents', title: 'Incidents' },
        { type: 'performance', title: 'System Performance' },
        { type: 'security', title: 'Security Alerts' },
        { type: 'tech_debt', title: 'Technical Debt' }
      ]
    },

    cmo: {
      title: 'CMO Dashboard - Marketing',
      widgets: [
        { type: 'campaigns', title: 'Active Campaigns' },
        { type: 'karma_stats', title: 'Karma Program' },
        { type: 'ads_performance', title: 'Ads Performance' },
        { type: 'audiences', title: 'Audience Growth' },
        { type: 'funnel', title: 'Marketing Funnel' },
        { type: 'roi', title: 'Marketing ROI' }
      ]
    },

    coo: {
      title: 'COO Dashboard - Operations',
      widgets: [
        { type: 'orders', title: 'Order Volume' },
        { type: 'fulfillment', title: 'Fulfillment Rate' },
        { type: 'delivery', title: 'Delivery Metrics' },
        { type: 'inventory', title: 'Inventory Status' },
        { type: 'logistics', title: 'Logistics' },
        { type: 'warehouses', title: 'Warehouse Status' }
      ]
    },

    chro: {
      title: 'CHRO Dashboard - Human Resources',
      widgets: [
        { type: 'headcount', title: 'Headcount' },
        { type: 'hiring', title: 'Open Positions' },
        { type: 'turnover', title: 'Turnover Rate' },
        { type: 'training', title: 'Training Programs' },
        { type: 'performance', title: 'Performance Reviews' },
        { type: 'benefits', title: 'Benefits Utilization' }
      ]
    },

    chief_ai_officer: {
      title: 'Chief AI Officer Dashboard',
      widgets: [
        { type: 'ai_models', title: 'AI Models' },
        { type: 'training_jobs', title: 'Training Jobs' },
        { type: 'predictions', title: 'Prediction Accuracy' },
        { type: 'experiments', title: 'A/B Experiments' },
        { type: 'ai_metrics', title: 'AI Performance' },
        { type: 'data_quality', title: 'Data Quality' }
      ]
    }
  };

  res.json(dashboards[user.role as keyof typeof dashboards] || dashboards.viewer);
});

// ============================================
// COMPANIES (Global & Company-scoped)
// ============================================

app.get('/api/companies', authenticate, authorize('VIEW_ALL'), async (req, res) => {
  const companies = await Company.find();
  res.json({ companies, count: companies.length });
});

app.get('/api/companies/:id', authenticate, authorizeCompany(), async (req, res) => {
  const company = await Company.findOne({ company_id: req.params.id });
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json(company);
});

// Company users
app.get('/api/companies/:id/users', authenticate, authorizeCompany(), async (req, res) => {
  const users = await CompanyUser.find({ company_id: req.params.id }).select('-password_hash');
  res.json({ users, count: users.length });
});

// ============================================
// SERVICES (Global Only)
// ============================================

app.get('/api/services', authenticate, authorize('TECH_SERVICES'), async (req, res) => {
  // Return all services
  res.json({
    services: [
      { name: 'verify-qr', company: 'REZ-Consumer', status: 'healthy' },
      { name: 'safe-qr', company: 'REZ-Consumer', status: 'healthy' },
      { name: 'creator-qr', company: 'REZ-Consumer', status: 'healthy' },
      { name: 'ads-qr', company: 'REZ-Media', status: 'healthy' },
      { name: 'room-qr', company: 'StayOwn', status: 'healthy' },
      { name: 'auth-service', company: 'RABTUL', status: 'healthy' },
      { name: 'payment-service', company: 'RABTUL', status: 'healthy' },
      { name: 'wallet-service', company: 'RABTUL', status: 'healthy' },
      { name: 'cdp-service', company: 'REZ-Intelligence', status: 'healthy' },
      { name: 'karma-service', company: 'REZ-Media', status: 'healthy' }
    ]
  });
});

// ============================================
// FINANCE (CFO Only)
// ============================================

app.get('/api/finance/revenue', authenticate, authorize(PERMISSIONS.FINANCE_VIEW), async (req, res) => {
  res.json({
    total_revenue: 4580000,
    by_company: {
      'REZ-Consumer': 1800000,
      'REZ-Merchant': 1200000,
      'REZ-Media': 850000,
      'StayOwn': 450000,
      'CorpPerks': 280000
    },
    trend: [
      { month: 'Jan', revenue: 4200000 },
      { month: 'Feb', revenue: 4350000 },
      { month: 'Mar', revenue: 4480000 },
      { month: 'Apr', revenue: 4500000 },
      { month: 'May', revenue: 4580000 }
    ]
  });
});

// ============================================
// TECHNOLOGY (CTO Only)
// ============================================

app.get('/api/tech/services', authenticate, authorize(PERMISSIONS.TECH_SERVICES), async (req, res) => {
  res.json({
    services: [
      { name: 'verify-qr', status: 'healthy', latency: 45, uptime: 99.9 },
      { name: 'auth-service', status: 'healthy', latency: 32, uptime: 99.95 },
      { name: 'cdp-service', status: 'healthy', latency: 78, uptime: 99.5 }
    ],
    incidents: [],
    deployments: []
  });
});

// ============================================
// MARKETING (CMO Only)
// ============================================

app.get('/api/marketing/campaigns', authenticate, authorize(PERMISSIONS.MARKETING_CAMPAIGNS), async (req, res) => {
  res.json({
    campaigns: [
      { id: 'camp_001', name: 'Summer Sale', status: 'active', budget: 500000, spent: 320000 },
      { id: 'camp_002', name: 'New User Acquisition', status: 'active', budget: 250000, spent: 180000 }
    ],
    karma_stats: {
      total_points: 25000000,
      active_users: 45000
    }
  });
});

// ============================================
// OPERATIONS (COO Only)
// ============================================

app.get('/api/ops/orders', authenticate, authorize(PERMISSIONS.OPS_ORDERS), async (req, res) => {
  res.json({
    today_orders: 4523,
    fulfillment_rate: 94.5,
    avg_delivery_time: '2.3 hours',
    pending: 234,
    completed: 4289
  });
});

// ============================================
// HR (CHRO Only)
// ============================================

app.get('/api/hr/employees', authenticate, authorize(PERMISSIONS.HR_EMPLOYEES), async (req, res) => {
  res.json({
    total: 456,
    by_department: {
      engineering: 156,
      marketing: 45,
      operations: 123,
      support: 89,
      admin: 43
    },
    open_positions: 23,
    turnover_rate: 8.5
  });
});

// ============================================
// AI (Chief AI Officer Only)
// ============================================

app.get('/api/ai/models', authenticate, authorize(PERMISSIONS.AI_MODELS), async (req, res) => {
  res.json({
    models: [
      { name: 'intent-predictor', status: 'deployed', accuracy: 94.5 },
      { name: 'fraud-detector', status: 'deployed', accuracy: 97.2 },
      { name: 'churn-predictor', status: 'deployed', accuracy: 91.8 },
      { name: 'recommendation-engine', status: 'deployed', accuracy: 89.5 }
    ],
    active_experiments: 5,
    training_jobs: 2
  });
});

// ============================================
// AUDIT LOG
// ============================================

app.get('/api/audit', authenticate, authorize('*'), async (req, res) => {
  const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
  res.json({ logs, count: logs.length });
});

// ============================================
// USER MANAGEMENT
// ============================================

app.post('/api/users', authenticate, authorize('*'), async (req, res) => {
  const { email, password, name, role, company_id } = req.body;

  const password_hash = await bcrypt.hash(password, 10);
  const user_id = `usr_${Date.now()}`;

  if (company_id) {
    await CompanyUser.create({
      user_id, email, password_hash, name, role, company_id, is_active: true
    });
  } else {
    await GlobalUser.create({
      user_id, email, password_hash, name, role, is_active: true
    });
  }

  res.status(201).json({ user_id, email, role });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'platform-admin-rbac' });
});

// ============================================
// START
// ============================================

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/platform-admin');

  // Seed super admin
  const existing = await GlobalUser.findOne({ role: 'super_admin' });
  if (!existing) {
    const hash = await bcrypt.hash('superadmin123', 10);
    await GlobalUser.create({
      user_id: 'super_admin',
      email: 'super@rez.money',
      password_hash: hash,
      name: 'Super Admin',
      role: 'super_admin',
      is_active: true
    });

    // Seed C-Suite
    const executives = [
      { email: 'cfo@rez.money', name: 'CFO', role: 'cfo' },
      { email: 'cto@rez.money', name: 'CTO', role: 'cto' },
      { email: 'cmo@rez.money', name: 'CMO', role: 'cmo' },
      { email: 'coo@rez.money', name: 'COO', role: 'coo' },
      { email: 'chro@rez.money', name: 'CHRO', role: 'chro' },
      { email: 'caio@rez.money', name: 'Chief AI Officer', role: 'chief_ai_officer' }
    ];

    for (const exec of executives) {
      const hash = await bcrypt.hash(`${exec.role}123`, 10);
      await GlobalUser.create({
        user_id: exec.role,
        ...exec,
        password_hash: hash,
        is_active: true
      });
    }
  }

  // Seed companies
  const companies = [
    { company_id: 'co_rabtul', name: 'RABTUL Technologies', slug: 'rabtul', type: 'rabtul' },
    { company_id: 'co_consumer', name: 'REZ-Consumer', slug: 'rez-consumer', type: 'consumer' },
    { company_id: 'co_merchant', name: 'REZ-Merchant', slug: 'rez-merchant', type: 'merchant' },
    { company_id: 'co_media', name: 'REZ-Media', slug: 'rez-media', type: 'media' },
    { company_id: 'co_hospitality', name: 'StayOwn-Hospitality', slug: 'stayown', type: 'hospitality' },
    { company_id: 'co_corpperks', name: 'CorpPerks', slug: 'corpperks', type: 'corpperks' }
  ];

  for (const company of companies) {
    await Company.findOneAndUpdate({ company_id: company.company_id }, company, { upsert: true });
  }

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    logger.info(REZ Platform Admin with RBAC running on port ${PORT}`);
    logger.info(Health: http://localhost:${PORT}/health`);
  });
}

start().catch(console.error);
