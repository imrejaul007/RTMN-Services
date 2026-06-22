/**
 * HOJAI CorpOS - Command Center
 *
 * Human + AI Organization Dashboard
 *
 * Port: 4850
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PORT || '4850', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-corpos';
const JWT_SECRET = process.env.JWT_SECRET || throw new Error('JWT_SECRET environment variable is required');

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
// MODELS
// ============================================

// Organization
const OrgSchema = new mongoose.Schema({
  orgId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  tenantId: { type: String, required: true, index: true },
  industry: String,
  size: { type: String, enum: ['startup', 'smb', 'midmarket', 'enterprise'] },
  plan: { type: String, default: 'starter' },
  metrics: {
    totalEmployees: { type: Number, default: 0 },
    totalAI: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }
  },
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

// Human Employee
const HumanSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, index: true },
  orgId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  email: String,
  department: String,
  role: String,
  managerId: String,
  status: { type: String, enum: ['active', 'inactive', 'onboarding'], default: 'active' },
  joinedAt: Date
}, { timestamps: true });

// AI Employee
const AIEmployeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, index: true },
  orgId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  role: String,
  department: String,
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  managerId: String,
  status: { type: String, enum: ['active', 'inactive', 'onboarding', 'training'], default: 'active' },
  metrics: {
    tasksCompleted: { type: Number, default: 0 },
    satisfaction: { type: Number, default: 100 },
    cost: { type: Number, default: 0 }
  },
  cost: { type: Number, default: 99 }
}, { timestamps: true });

// Department
const DepartmentSchema = new mongoose.Schema({
  departmentId: { type: String, required: true, unique: true, index: true },
  orgId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['sales', 'marketing', 'support', 'hr', 'operations', 'finance', 'engineering', 'custom'] },
  headId: String,
  headType: { type: String, enum: ['human', 'ai'] },
  humanCount: { type: Number, default: 0 },
  aiCount: { type: Number, default: 0 }
}, { timestamps: true });

// Workflow Status
const WorkflowStatusSchema = new mongoose.Schema({
  workflowId: { type: String, required: true, unique: true, index: true },
  orgId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: String,
  status: { type: String, enum: ['running', 'paused', 'completed', 'failed'] },
  progress: { type: Number, default: 0 },
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

// Alert
const AlertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true, index: true },
  orgId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['error', 'warning', 'info', 'success'] },
  title: String,
  message: String,
  source: String,
  acknowledged: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Org = mongoose.model('Org', OrgSchema);
const Human = mongoose.model('Human', HumanSchema);
const AIEmployee = mongoose.model('AIEmployee', AIEmployeeSchema);
const Department = mongoose.model('Department', DepartmentSchema);
const WorkflowStatus = mongoose.model('WorkflowStatus', WorkflowStatusSchema);
const Alert = mongoose.model('Alert', AlertSchema);

// ============================================
// AUTH
// ============================================

async function auth(req: Request, res: Response, next: Function) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  try {
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).tenantId = decoded.tenantId || decoded.tenant_id;
    (req as any).orgId = decoded.orgId || decoded.tenantId;
    next();
  } catch { res.status(401).json({ error: 'AUTH_INVALID' }); }
}

// ============================================
// HEALTH
// ============================================

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'hojai-corpos', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ============================================
// ORGANIZATION
// ============================================

app.get('/api/org', auth, async (req: Request, res: Response) => {
  try {
    const org = await Org.findOne({ tenantId: (req as any).tenantId });
    if (!org) return res.status(404).json({ error: 'ORG_NOT_FOUND' });
    res.json({ success: true, data: org });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/org', auth, async (req: Request, res: Response) => {
  try {
    const { name, industry, size } = req.body;
    const orgId = `org_${uuid().slice(0, 8)}`;
    const org = new Org({ orgId, tenantId: (req as any).tenantId, name, industry, size });
    await org.save();
    res.status(201).json({ success: true, data: org });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================
// ORG CHART
// ============================================

app.get('/api/orgchart', auth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const orgId = (req as any).orgId;

    const [humans, aiEmployees, departments] = await Promise.all([
      Human.find({ tenantId, orgId }),
      AIEmployee.find({ tenantId, orgId }),
      Department.find({ tenantId, orgId })
    ]);

    // Build org chart tree
    const orgChart = {
      organization: { orgId, humanCount: humans.length, aiCount: aiEmployees.length },
      departments: departments.map(d => ({
        ...d.toObject(),
        humans: humans.filter(h => h.department === d.name),
        ais: aiEmployees.filter(a => a.department === d.name)
      })),
      unassigned: {
        humans: humans.filter(h => !h.department),
        ais: aiEmployees.filter(a => !a.department)
      }
    };

    res.json({ success: true, data: orgChart });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// HUMANS
// ============================================

app.get('/api/humans', auth, async (req: Request, res: Response) => {
  try {
    const { department, status } = req.query;
    const filter: any = { tenantId: (req as any).tenantId };
    if (department) filter.department = department;
    if (status) filter.status = status;
    const humans = await Human.find(filter);
    res.json({ success: true, data: humans });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/humans', auth, async (req: Request, res: Response) => {
  try {
    const { name, email, department, role, managerId } = req.body;
    const employeeId = `human_${uuid().slice(0, 8)}`;
    const human = new Human({
      employeeId,
      tenantId: (req as any).tenantId,
      orgId: (req as any).orgId,
      name, email, department, role, managerId
    });
    await human.save();
    res.status(201).json({ success: true, data: human });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.patch('/api/humans/:id', auth, async (req: Request, res: Response) => {
  try {
    const human = await Human.findOneAndUpdate(
      { employeeId: req.params.id, tenantId: (req as any).tenantId },
      req.body,
      { new: true }
    );
    if (!human) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: human });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// AI EMPLOYEES
// ============================================

app.get('/api/ai-employees', auth, async (req: Request, res: Response) => {
  try {
    const { department, status, level } = req.query;
    const filter: any = { tenantId: (req as any).tenantId };
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (level) filter.level = level;
    const ais = await AIEmployee.find(filter).sort({ level: -1, xp: -1 });
    res.json({ success: true, data: ais });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai-employees', auth, async (req: Request, res: Response) => {
  try {
    const { name, role, department, level, cost } = req.body;
    const employeeId = `ai_${uuid().slice(0, 8)}`;
    const ai = new AIEmployee({
      employeeId,
      tenantId: (req as any).tenantId,
      orgId: (req as any).orgId,
      name, role, department, level: level || 1, cost: cost || 99
    });
    await ai.save();
    res.status(201).json({ success: true, data: ai });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.patch('/api/ai-employees/:id', auth, async (req: Request, res: Response) => {
  try {
    const ai = await AIEmployee.findOneAndUpdate(
      { employeeId: req.params.id, tenantId: (req as any).tenantId },
      req.body,
      { new: true }
    );
    if (!ai) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: ai });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// DEPARTMENTS
// ============================================

app.get('/api/departments', auth, async (req: Request, res: Response) => {
  try {
    const departments = await Department.find({ tenantId: (req as any).tenantId });
    res.json({ success: true, data: departments });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/departments', auth, async (req: Request, res: Response) => {
  try {
    const { name, type, headId, headType } = req.body;
    const departmentId = `dept_${uuid().slice(0, 8)}`;
    const dept = new Department({
      departmentId,
      tenantId: (req as any).tenantId,
      orgId: (req as any).orgId,
      name, type, headId, headType
    });
    await dept.save();
    res.status(201).json({ success: true, data: dept });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================
// WORKFLOWS
// ============================================

app.get('/api/workflows', auth, async (req: Request, res: Response) => {
  try {
    const workflows = await WorkflowStatus.find({ tenantId: (req as any).tenantId });
    res.json({ success: true, data: workflows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/workflows', auth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const workflowId = `wf_${uuid().slice(0, 8)}`;
    const wf = new WorkflowStatus({
      workflowId,
      tenantId: (req as any).tenantId,
      orgId: (req as any).orgId,
      name,
      status: 'running',
      startedAt: new Date()
    });
    await wf.save();
    res.status(201).json({ success: true, data: wf });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================
// ALERTS
// ============================================

app.get('/api/alerts', auth, async (req: Request, res: Response) => {
  try {
    const { acknowledged } = req.query;
    const filter: any = { tenantId: (req as any).tenantId };
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';
    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: alerts });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/alerts', auth, async (req: Request, res: Response) => {
  try {
    const { type, title, message, source } = req.body;
    const alertId = `alert_${uuid().slice(0, 8)}`;
    const alert = new Alert({
      alertId,
      tenantId: (req as any).tenantId,
      orgId: (req as any).orgId,
      type, title, message, source
    });
    await alert.save();
    res.status(201).json({ success: true, data: alert });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.patch('/api/alerts/:id/acknowledge', auth, async (req: Request, res: Response) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { alertId: req.params.id, tenantId: (req as any).tenantId },
      { acknowledged: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: alert });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// DASHBOARD
// ============================================

app.get('/api/dashboard', auth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const orgId = (req as any).orgId;

    const [org, humans, ais, departments, workflows, alerts] = await Promise.all([
      Org.findOne({ tenantId }),
      Human.countDocuments({ tenantId, orgId, status: 'active' }),
      AIEmployee.countDocuments({ tenantId, orgId, status: 'active' }),
      Department.find({ tenantId, orgId }),
      WorkflowStatus.find({ tenantId, orgId, status: 'running' }),
      Alert.countDocuments({ tenantId, orgId, acknowledged: false })
    ]);

    // Get department breakdown
    const deptBreakdown = await Promise.all(
      departments.map(async (d: any) => ({
        name: d.name,
        type: d.type,
        humans: await Human.countDocuments({ tenantId, orgId, department: d.name }),
        ais: await AIEmployee.countDocuments({ tenantId, orgId, department: d.name })
      }))
    );

    res.json({
      success: true,
      data: {
        overview: {
          orgName: org?.name || 'Unknown',
          plan: org?.plan || 'starter',
          humans: humans,
          ais: ais,
          totalHeadcount: humans + ais,
          aiRatio: humans > 0 ? Math.round((ais / humans) * 100) : 0
        },
        departments: deptBreakdown,
        activeWorkflows: workflows.length,
        unacknowledgedAlerts: alerts,
        recentActivity: {
          workflows: workflows.slice(0, 5),
          alerts: alerts
        }
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// START
// ============================================

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`\n╔═══════════════════════════════════════════════════════╗
║           HOJAI CORPOS v1.0.0
╠═══════════════════════════════════════════════════════╣
║  Port:     ${PORT}
║  Features: Org Chart, Human + AI Dashboard
╚═══════════════════════════════════════════════════════╝\n`);
    });
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
}

start();

export default app;
