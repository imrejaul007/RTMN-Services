/**
 * HOJAI Workforce
 *
 * AI Employee Marketplace and Management Platform.
 * Manages AI workers, teams, departments, and performance.
 *
 * Port: 4820
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PORT || '4820', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-workforce';
const JWT_SECRET = process.env.JWT_SECRET || 'hojai-workforce-dev-secret-change-in-production';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

// ============================================
// DATA MODELS
// ============================================

// AI Employee Schema
const AIEmployeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  role: { type: String, required: true, index: true },
  department: { type: String, index: true },
  level: { type: Number, default: 1, min: 1, max: 10 },
  xp: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'training', 'onboarding'], default: 'active' },
  skills: [{ type: String }],
  capabilities: [{ type: String }],
  managerId: { type: String, default: null },
  teamId: { type: String, default: null },
  departmentId: { type: String, default: null },
  metrics: {
    tasksCompleted: { type: Number, default: 0 },
    tasksFailed: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    satisfaction: { type: Number, default: 100 },
    revenue: { type: Number, default: 0 },
    cost: { type: Number, default: 0 }
  },
  pricing: {
    monthly: { type: Number, default: 99 },
    perTask: { type: Number, default: 0.50 }
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Team Schema
const TeamSchema = new mongoose.Schema({
  teamId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  managerId: { type: String, default: null },
  leadAIEmployeeId: { type: String, default: null },
  memberIds: [{ type: String }],
  metrics: {
    tasksCompleted: { type: Number, default: 0 },
    successRate: { type: Number, default: 100 },
    avgResponseTime: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Department Schema
const DepartmentSchema = new mongoose.Schema({
  departmentId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['sales', 'marketing', 'support', 'hr', 'operations', 'finance', 'engineering', 'custom'], default: 'custom' },
  managerId: { type: String, default: null },
  teamIds: [{ type: String }],
  aiEmployeeIds: [{ type: String }],
  budget: { type: Number, default: 0 },
  metrics: {
    totalEmployees: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Marketplace Listing Schema
const ListingSchema = new mongoose.Schema({
  listingId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true, index: true },
  industry: { type: String, default: 'general' },
  skills: [{ type: String }],
  description: { type: String, required: true },
  pricing: {
    monthly: { type: Number, default: 99 },
    setup: { type: Number, default: 0 }
  },
  stats: {
    installs: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    reviews: { type: Number, default: 0 }
  },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Performance Log Schema
const PerformanceLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true, index: true },
  employeeId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  metric: { type: String, required: true },
  value: { type: Number, required: true },
  context: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const AIEmployee = mongoose.model('AIEmployee', AIEmployeeSchema);
const Team = mongoose.model('Team', TeamSchema);
const Department = mongoose.model('Department', DepartmentSchema);
const Listing = mongoose.model('Listing', ListingSchema);
const PerformanceLog = mongoose.model('PerformanceLog', PerformanceLogSchema);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateAIEmployeeSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  department: z.string().optional(),
  skills: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  managerId: z.string().optional(),
  pricing: z.object({
    monthly: z.number().optional(),
    perTask: z.number().optional()
  }).optional()
});

const CreateTeamSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  managerId: z.string().optional(),
  leadAIEmployeeId: z.string().optional()
});

const CreateDepartmentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['sales', 'marketing', 'support', 'hr', 'operations', 'finance', 'engineering', 'custom']).optional(),
  managerId: z.string().optional(),
  budget: z.number().optional()
});

const CreateListingSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  industry: z.string().optional(),
  skills: z.array(z.string()).optional(),
  description: z.string().min(10),
  pricing: z.object({
    monthly: z.number().optional(),
    setup: z.number().optional()
  }).optional()
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header', code: 'AUTH_REQUIRED' });
  }

  try {
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).tenantId = decoded.tenantId || decoded.tenant_id;
    (req as any).userId = decoded.sub;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', code: 'AUTH_INVALID' });
  }
}

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-workforce',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// AI EMPLOYEE ENDPOINTS
// ============================================

// Create AI Employee
app.post('/api/employees', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = CreateAIEmployeeSchema.parse(req.body);
    const tenantId = (req as any).tenantId;
    const employeeId = `ai_${uuid().slice(0, 8)}`;

    const employee = new AIEmployee({
      ...data,
      employeeId,
      tenantId
    });

    await employee.save();

    res.status(201).json({ success: true, data: employee });
  } catch (error: any) {
    console.error('Create employee error:', error);
    res.status(400).json({ error: error.message, code: 'CREATE_ERROR' });
  }
});

// List AI Employees
app.get('/api/employees', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { role, department, status, limit = 50, skip = 0 } = req.query;

    const filter: any = { tenantId };
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (status) filter.status = status;

    const employees = await AIEmployee.find(filter)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .sort({ updatedAt: -1 });

    const total = await AIEmployee.countDocuments(filter);

    res.json({
      success: true,
      data: employees,
      pagination: { total, limit: parseInt(limit as string), skip: parseInt(skip as string) }
    });
  } catch (error: any) {
    console.error('List employees error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// Get AI Employee
app.get('/api/employees/:employeeId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const employee = await AIEmployee.findOne({
      tenantId,
      employeeId: req.params.employeeId
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found', code: 'NOT_FOUND' });
    }

    res.json({ success: true, data: employee });
  } catch (error: any) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: error.message, code: 'GET_ERROR' });
  }
});

// Update AI Employee
app.patch('/api/employees/:employeeId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, role, department, status, level, skills, capabilities, managerId, teamId, departmentId, pricing } = req.body;

    const employee = await AIEmployee.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      {
        $set: {
          ...(name && { name }),
          ...(role && { role }),
          ...(department && { department }),
          ...(status && { status }),
          ...(level && { level }),
          ...(skills && { skills }),
          ...(capabilities && { capabilities }),
          ...(managerId !== undefined && { managerId }),
          ...(teamId !== undefined && { teamId }),
          ...(departmentId !== undefined && { departmentId }),
          ...(pricing && { pricing }),
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found', code: 'NOT_FOUND' });
    }

    res.json({ success: true, data: employee });
  } catch (error: any) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: error.message, code: 'UPDATE_ERROR' });
  }
});

// Update AI Employee Metrics
app.post('/api/employees/:employeeId/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { metric, value, context } = req.body;

    // Update employee metrics
    const updatePath = `metrics.${metric}`;
    const employee = await AIEmployee.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      { $set: { [updatePath]: value, updatedAt: new Date() } },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found', code: 'NOT_FOUND' });
    }

    // Log performance
    const log = new PerformanceLog({
      logId: uuid(),
      employeeId: req.params.employeeId,
      tenantId,
      metric,
      value,
      context
    });
    await log.save();

    // Check for level up
    if (metric === 'xp' && value >= employee.level * 1000) {
      await AIEmployee.updateOne(
        { tenantId, employeeId: req.params.employeeId },
        { $inc: { level: 1 }, $set: { xp: 0 } }
      );
    }

    res.json({ success: true, data: employee });
  } catch (error: any) {
    console.error('Update metrics error:', error);
    res.status(500).json({ error: error.message, code: 'UPDATE_ERROR' });
  }
});

// ============================================
// TEAM ENDPOINTS
// ============================================

// Create Team
app.post('/api/teams', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = CreateTeamSchema.parse(req.body);
    const tenantId = (req as any).tenantId;
    const teamId = `team_${uuid().slice(0, 8)}`;

    const team = new Team({
      ...data,
      teamId,
      tenantId,
      memberIds: []
    });

    await team.save();

    res.status(201).json({ success: true, data: team });
  } catch (error: any) {
    console.error('Create team error:', error);
    res.status(400).json({ error: error.message, code: 'CREATE_ERROR' });
  }
});

// List Teams
app.get('/api/teams', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { department, limit = 50, skip = 0 } = req.query;

    const filter: any = { tenantId };
    if (department) filter.department = department;

    const teams = await Team.find(filter)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: teams });
  } catch (error: any) {
    console.error('List teams error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// Get Team
app.get('/api/teams/:teamId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const team = await Team.findOne({ tenantId, teamId: req.params.teamId });

    if (!team) {
      return res.status(404).json({ error: 'Team not found', code: 'NOT_FOUND' });
    }

    // Get team members
    const members = await AIEmployee.find({
      tenantId,
      teamId: req.params.teamId
    });

    res.json({ success: true, data: { ...team.toObject(), members } });
  } catch (error: any) {
    console.error('Get team error:', error);
    res.status(500).json({ error: error.message, code: 'GET_ERROR' });
  }
});

// Add Employee to Team
app.post('/api/teams/:teamId/members', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { employeeId } = req.body;

    // Add to team
    await Team.updateOne(
      { tenantId, teamId: req.params.teamId },
      { $addToSet: { memberIds: employeeId } }
    );

    // Update employee
    await AIEmployee.updateOne(
      { tenantId, employeeId },
      { $set: { teamId: req.params.teamId } }
    );

    res.json({ success: true, added: employeeId });
  } catch (error: any) {
    console.error('Add member error:', error);
    res.status(500).json({ error: error.message, code: 'UPDATE_ERROR' });
  }
});

// ============================================
// DEPARTMENT ENDPOINTS
// ============================================

// Create Department
app.post('/api/departments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = CreateDepartmentSchema.parse(req.body);
    const tenantId = (req as any).tenantId;
    const departmentId = `dept_${uuid().slice(0, 8)}`;

    const department = new Department({
      ...data,
      departmentId,
      tenantId,
      teamIds: [],
      aiEmployeeIds: []
    });

    await department.save();

    res.status(201).json({ success: true, data: department });
  } catch (error: any) {
    console.error('Create department error:', error);
    res.status(400).json({ error: error.message, code: 'CREATE_ERROR' });
  }
});

// List Departments
app.get('/api/departments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const departments = await Department.find({ tenantId }).sort({ name: 1 });

    res.json({ success: true, data: departments });
  } catch (error: any) {
    console.error('List departments error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// Get Department
app.get('/api/departments/:departmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const department = await Department.findOne({ tenantId, departmentId: req.params.departmentId });

    if (!department) {
      return res.status(404).json({ error: 'Department not found', code: 'NOT_FOUND' });
    }

    // Get department members
    const employees = await AIEmployee.find({
      tenantId,
      departmentId: req.params.departmentId
    });

    // Get department teams
    const teams = await Team.find({
      tenantId,
      department: department.name
    });

    res.json({
      success: true,
      data: {
        ...department.toObject(),
        employees,
        teams
      }
    });
  } catch (error: any) {
    console.error('Get department error:', error);
    res.status(500).json({ error: error.message, code: 'GET_ERROR' });
  }
});

// ============================================
// MARKETPLACE ENDPOINTS
// ============================================

// Create Listing
app.post('/api/marketplace/listings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = CreateListingSchema.parse(req.body);
    const tenantId = (req as any).tenantId;
    const listingId = `listing_${uuid().slice(0, 8)}`;

    const listing = new Listing({
      ...data,
      listingId,
      tenantId,
      status: 'published'
    });

    await listing.save();

    res.status(201).json({ success: true, data: listing });
  } catch (error: any) {
    console.error('Create listing error:', error);
    res.status(400).json({ error: error.message, code: 'CREATE_ERROR' });
  }
});

// Browse Marketplace
app.get('/api/marketplace', async (req: Request, res: Response) => {
  try {
    const { role, industry, sort = 'rating', limit = 20, skip = 0 } = req.query;

    const filter: any = { status: 'published' };
    if (role) filter.role = role;
    if (industry) filter.industry = industry;

    let sortOption: any = { 'stats.rating': -1 };
    if (sort === 'popular') sortOption = { 'stats.installs': -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'price_low') sortOption = { 'pricing.monthly': 1 };
    if (sort === 'price_high') sortOption = { 'pricing.monthly': -1 };

    const listings = await Listing.find(filter)
      .sort(sortOption)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string));

    const total = await Listing.countDocuments(filter);

    res.json({
      success: true,
      data: listings,
      pagination: { total, limit: parseInt(limit as string), skip: parseInt(skip as string) }
    });
  } catch (error: any) {
    console.error('Browse marketplace error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// Install AI Employee
app.post('/api/marketplace/listings/:listingId/install', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const listing = await Listing.findOne({ listingId: req.params.listingId, status: 'published' });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found', code: 'NOT_FOUND' });
    }

    // Clone the AI employee
    const newEmployeeId = `ai_${uuid().slice(0, 8)}`;
    const employee = new AIEmployee({
      employeeId: newEmployeeId,
      tenantId,
      name: listing.name,
      role: listing.role,
      industry: listing.industry,
      skills: listing.skills,
      pricing: listing.pricing,
      status: 'onboarding'
    });

    await employee.save();

    // Update install count
    await Listing.updateOne(
      { listingId: req.params.listingId },
      { $inc: { 'stats.installs': 1 } }
    );

    res.status(201).json({
      success: true,
      data: {
        employee,
        message: 'AI Employee installed successfully. Complete onboarding to activate.'
      }
    });
  } catch (error: any) {
    console.error('Install error:', error);
    res.status(500).json({ error: error.message, code: 'INSTALL_ERROR' });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

// Get Workforce Analytics
app.get('/api/analytics/workforce', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    const [
      totalEmployees,
      activeEmployees,
      departmentCount,
      teamCount
    ] = await Promise.all([
      AIEmployee.countDocuments({ tenantId }),
      AIEmployee.countDocuments({ tenantId, status: 'active' }),
      Department.countDocuments({ tenantId }),
      Team.countDocuments({ tenantId })
    ]);

    // Get top performers
    const topPerformers = await AIEmployee.find({ tenantId, status: 'active' })
      .sort({ 'metrics.tasksCompleted': -1 })
      .limit(5)
      .select('employeeId name role metrics');

    // Get cost analysis
    const costAnalysis = await AIEmployee.aggregate([
      { $match: { tenantId } },
      { $group: {
        _id: null,
        totalCost: { $sum: '$metrics.cost' },
        totalRevenue: { $sum: '$metrics.revenue' },
        avgCost: { $avg: '$metrics.cost' }
      }}
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalEmployees,
          activeEmployees,
          departmentCount,
          teamCount,
          activationRate: totalEmployees > 0 ? (activeEmployees / totalEmployees) * 100 : 0
        },
        topPerformers,
        costAnalysis: costAnalysis[0] || { totalCost: 0, totalRevenue: 0, avgCost: 0 }
      }
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message, code: 'ANALYTICS_ERROR' });
  }
});

// Get AI Employee Performance
app.get('/api/employees/:employeeId/performance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === '30d') startDate.setDate(now.getDate() - 30);
    else if (period === '90d') startDate.setDate(now.getDate() - 90);

    const logs = await PerformanceLog.find({
      tenantId,
      employeeId: req.params.employeeId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    // Calculate metrics
    const metrics = logs.reduce((acc: any, log) => {
      if (!acc[log.metric]) acc[log.metric] = [];
      acc[log.metric].push({ value: log.value, date: log.createdAt });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        employeeId: req.params.employeeId,
        period,
        metrics,
        logCount: logs.length
      }
    });
  } catch (error: any) {
    console.error('Performance error:', error);
    res.status(500).json({ error: error.message, code: 'PERFORMANCE_ERROR' });
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Workforce error:', err);
  res.status(500).json({ error: 'Internal error', code: 'INTERNAL_ERROR' });
});

// Start server
async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           HOJAI WORKFORCE v1.0.0                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                              ║
║  Services: AI Employees, Teams, Departments, Marketplace   ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();

export default app;
