/**
 * HOJAI AI Studio
 *
 * No-code builder for AI employees, teams, and departments.
 *
 * Port: 4840
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PORT || '4840', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-studio';
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

// AI Employee Templates
const TemplateSchema = new mongoose.Schema({
  templateId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, index: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  industry: { type: String, default: 'general' },
  description: String,
  capabilities: [{ name: String, description: String }],
  skills: [String],
  prompts: {
    system: String,
    onboarding: String,
    task: String
  },
  tools: [{ name: String, type: String, config: mongoose.Schema.Types.Mixed }],
  memory: {
    context: [String],
    retention: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' }
  },
  companyDna: {
    culture: String,
    communication: String,
    brandVoice: String
  },
  metrics: [{ name: String, target: Number }],
  pricing: {
    monthly: Number,
    setup: Number
  },
  rating: { type: Number, default: 5.0 },
  installs: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Company DNA Configurations
const CompanyDnaSchema = new mongoose.Schema({
  dnaId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  culture: {
    type: { type: String, enum: ['conservative', 'aggressive', 'premium', 'budget', 'innovative', 'traditional'] },
    description: String
  },
  communication: {
    style: { type: String, enum: ['formal', 'casual', 'technical', 'luxury', 'friendly'] },
    tone: String,
    examples: [String]
  },
  sales: {
    philosophy: { type: String, enum: ['relationship', 'volume', 'consultative'] },
    followup: Number,
    discountPolicy: String
  },
  decisions: {
    framework: { type: String, enum: ['founder-led', 'committee', 'automated'] },
    approvalLevels: [String]
  },
  risk: {
    appetite: { type: String, enum: ['low', 'medium', 'high'] },
    description: String
  },
  brandVoice: {
    personality: [String],
    vocabulary: [String],
    examples: mongoose.Schema.Types.Mixed
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Team Templates
const TeamTemplateSchema = new mongoose.Schema({
  teamTemplateId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, index: true },
  name: { type: String, required: true },
  department: String,
  description: String,
  roles: [{
    role: String,
    count: Number,
    skills: [String]
  }],
  hierarchy: mongoose.Schema.Types.Mixed,
  workflows: [String],
  metrics: [{ name: String, target: Number }],
  pricing: {
    monthly: Number,
    setup: Number
  },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Workflow Templates
const WorkflowTemplateSchema = new mongoose.Schema({
  workflowId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, index: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['sales', 'support', 'hr', 'marketing', 'operations', 'custom'] },
  description: String,
  steps: [{
    order: Number,
    type: { type: String, enum: ['trigger', 'action', 'condition', 'delay', 'approval', 'notification'] },
    name: String,
    config: mongoose.Schema.Types.Mixed,
    retry: {
      maxAttempts: Number,
      backoff: String
    }
  }],
  integrations: [String],
  estimatedTime: String,
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// AI Employee Instances
const AIEmployeeInstanceSchema = new mongoose.Schema({
  instanceId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  templateId: String,
  department: String,
  teamId: String,
  managerId: String,
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  status: { type: String, enum: ['onboarding', 'active', 'training', 'inactive'], default: 'onboarding' },
  config: {
    capabilities: [String],
    skills: [String],
    prompts: mongoose.Schema.Types.Mixed,
    tools: mongoose.Schema.Types.Mixed,
    memory: mongoose.Schema.Types.Mixed
  },
  dna: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Template = mongoose.model('Template', TemplateSchema);
const CompanyDna = mongoose.model('CompanyDna', CompanyDnaSchema);
const TeamTemplate = mongoose.model('TeamTemplate', TeamTemplateSchema);
const WorkflowTemplate = mongoose.model('WorkflowTemplate', WorkflowTemplateSchema);
const AIEmployeeInstance = mongoose.model('AIEmployeeInstance', AIEmployeeInstanceSchema);

// ============================================
// VALIDATION
// ============================================

const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  industry: z.string().optional(),
  description: z.string().optional(),
  capabilities: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
  skills: z.array(z.string()).optional(),
  prompts: z.object({
    system: z.string().optional(),
    onboarding: z.string().optional(),
    task: z.string().optional()
  }).optional(),
  tools: z.array(z.object({ name: z.string(), type: z.string() })).optional()
});

const CreateDnaSchema = z.object({
  name: z.string().min(1),
  culture: z.object({ type: z.string(), description: z.string().optional() }),
  communication: z.object({ style: z.string(), tone: z.string().optional() }),
  sales: z.object({ philosophy: z.string(), followup: z.number().optional() }).optional(),
  decisions: z.object({ framework: z.string(), approvalLevels: z.array(z.string()).optional() }).optional(),
  risk: z.object({ appetite: z.string(), description: z.string().optional() }).optional(),
  brandVoice: z.object({ personality: z.array(z.string()), vocabulary: z.array(z.string()).optional() }).optional()
});

const CreateTeamSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  roles: z.array(z.object({ role: z.string(), count: z.number(), skills: z.array(z.string()).optional() })),
  hierarchy: z.record(z.any()).optional()
});

const CreateWorkflowSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['sales', 'support', 'hr', 'marketing', 'operations', 'custom']),
  description: z.string().optional(),
  steps: z.array(z.object({
    type: z.string(),
    name: z.string(),
    config: z.record(z.any()).optional()
  })),
  integrations: z.array(z.string()).optional()
});

// ============================================
// AUTH
// ============================================

async function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  try {
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).tenantId = decoded.tenantId || decoded.tenant_id;
    next();
  } catch { res.status(401).json({ error: 'AUTH_INVALID' }); }
}

// ============================================
// HEALTH
// ============================================

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'hojai-studio', version: '1.0.0' }));

// ============================================
// TEMPLATES
// ============================================

// Browse Templates
app.get('/api/templates', async (req, res) => {
  try {
    const { role, industry, sort = 'popular' } = req.query;
    const filter: any = { status: 'published' };
    if (role) filter.role = role;
    if (industry) filter.industry = industry;

    let sortOpt: any = { installs: -1 };
    if (sort === 'rating') sortOpt = { rating: -1 };
    if (sort === 'newest') sortOpt = { createdAt: -1 };

    const templates = await Template.find(filter).sort(sortOpt).limit(50);
    res.json({ success: true, data: templates });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get Template
app.get('/api/templates/:templateId', async (req, res) => {
  try {
    const template = await Template.findOne({ templateId: req.params.templateId });
    if (!template) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: template });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Create Template
app.post('/api/templates', auth, async (req, res) => {
  try {
    const data = CreateTemplateSchema.parse(req.body);
    const tenantId = (req as any).tenantId;
    const templateId = `tmpl_${uuid().slice(0, 8)}`;

    const template = new Template({ ...data, templateId, tenantId, status: 'published' });
    await template.save();
    res.status(201).json({ success: true, data: template });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================
// COMPANY DNA
// ============================================

// Get Company DNA
app.get('/api/dna', auth, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const dna = await CompanyDna.findOne({ tenantId });
    res.json({ success: true, data: dna });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Create/Update Company DNA
app.post('/api/dna', auth, async (req, res) => {
  try {
    const data = CreateDnaSchema.parse(req.body);
    const tenantId = (req as any).tenantId;
    const dnaId = `dna_${uuid().slice(0, 8)}`;

    const dna = await CompanyDna.findOneAndUpdate(
      { tenantId },
      { ...data, dnaId, tenantId },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: dna });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Apply DNA to AI Employee
app.post('/api/dna/apply', auth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    const tenantId = (req as any).tenantId;
    const dna = await CompanyDna.findOne({ tenantId });
    if (!dna) return res.status(404).json({ error: 'DNA_NOT_CONFIGURED' });

    const employee = await AIEmployeeInstance.findOneAndUpdate(
      { tenantId, instanceId: employeeId },
      { $set: { dna: dna.toObject() } },
      { new: true }
    );
    if (!employee) return res.status(404).json({ error: 'EMPLOYEE_NOT_FOUND' });

    res.json({ success: true, data: employee });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// AI EMPLOYEE CREATION
// ============================================

// Create from Template
app.post('/api/employees/create', auth, async (req, res) => {
  try {
    const { templateId, name, department, managerId } = req.body;
    const tenantId = (req as any).tenantId;

    const template = await Template.findOne({ templateId });
    if (!template) return res.status(404).json({ error: 'TEMPLATE_NOT_FOUND' });

    const dna = await CompanyDna.findOne({ tenantId });

    const instanceId = `ai_${uuid().slice(0, 8)}`;
    const employee = new AIEmployeeInstance({
      instanceId,
      tenantId,
      name: name || template.name,
      role: template.role,
      templateId,
      department,
      managerId,
      status: 'onboarding',
      config: {
        capabilities: template.capabilities?.map(c => c.name) || [],
        skills: template.skills || [],
        prompts: template.prompts || {},
        tools: template.tools || [],
        memory: template.memory || {}
      },
      dna: dna?.toObject()
    });

    await employee.save();

    res.status(201).json({ success: true, data: employee });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Create Custom AI Employee
app.post('/api/employees/custom', auth, async (req, res) => {
  try {
    const { name, role, skills, capabilities, prompts, tools } = req.body;
    const tenantId = (req as any).tenantId;

    const instanceId = `ai_${uuid().slice(0, 8)}`;
    const employee = new AIEmployeeInstance({
      instanceId,
      tenantId,
      name,
      role,
      status: 'onboarding',
      config: { capabilities, skills, prompts, tools }
    });

    await employee.save();
    res.status(201).json({ success: true, data: employee });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// List AI Employees
app.get('/api/employees', auth, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { role, status } = req.query;
    const filter: any = { tenantId };
    if (role) filter.role = role;
    if (status) filter.status = status;

    const employees = await AIEmployeeInstance.find(filter).sort({ updatedAt: -1 });
    res.json({ success: true, data: employees });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get AI Employee
app.get('/api/employees/:instanceId', auth, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const employee = await AIEmployeeInstance.findOne({ tenantId, instanceId: req.params.instanceId });
    if (!employee) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: employee });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Activate AI Employee
app.post('/api/employees/:instanceId/activate', auth, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const employee = await AIEmployeeInstance.findOneAndUpdate(
      { tenantId, instanceId: req.params.instanceId },
      { status: 'active' },
      { new: true }
    );
    if (!employee) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: employee });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// TEAMS
// ============================================

// Create Team from Template
app.post('/api/teams/create', auth, async (req, res) => {
  try {
    const { teamTemplateId, name, department } = req.body;
    const tenantId = (req as any).tenantId;

    const teamTemplate = await TeamTemplate.findOne({ teamTemplateId });
    const dna = await CompanyDna.findOne({ tenantId });

    // Create AI employees for each role
    const employees = [];
    for (const roleDef of (teamTemplate?.roles || [])) {
      for (let i = 0; i < roleDef.count; i++) {
        const instanceId = `ai_${uuid().slice(0, 8)}`;
        const employee = new AIEmployeeInstance({
          instanceId,
          tenantId,
          name: `${roleDef.role} ${i + 1}`,
          role: roleDef.role,
          department,
          skills: roleDef.skills,
          status: 'onboarding',
          dna: dna?.toObject()
        });
        await employee.save();
        employees.push(employee);
      }
    }

    res.status(201).json({ success: true, data: { teamName: name, employees } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// List Teams (from employees)
app.get('/api/teams', auth, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { department } = req.query;
    const filter: any = { tenantId };
    if (department) filter.department = department;

    const employees = await AIEmployeeInstance.find(filter);

    // Group by department
    const teams = employees.reduce((acc: any, emp) => {
      const dept = emp.department || 'Unassigned';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(emp);
      return acc;
    }, {});

    res.json({ success: true, data: teams });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// WORKFLOWS
// ============================================

// Browse Workflow Templates
app.get('/api/workflows/templates', async (req, res) => {
  try {
    const { category } = req.query;
    const filter: any = { status: 'published' };
    if (category) filter.category = category;

    const workflows = await WorkflowTemplate.find(filter).sort({ difficulty: 1 });
    res.json({ success: true, data: workflows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Create Workflow Template
app.post('/api/workflows/templates', auth, async (req, res) => {
  try {
    const data = CreateWorkflowSchema.parse(req.body);
    const tenantId = (req as any).tenantId;
    const workflowId = `wf_${uuid().slice(0, 8)}`;

    const workflow = new WorkflowTemplate({ ...data, workflowId, tenantId });
    await workflow.save();
    res.status(201).json({ success: true, data: workflow });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================
// START
// ============================================

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    // Seed sample templates
    const count = await Template.countDocuments();
    if (count === 0) {
      await Template.insertMany([
        { templateId: 'tmpl_sdr', name: 'AI SDR', role: 'SDR', industry: 'SaaS', description: 'AI Sales Development Rep', skills: ['cold_email', 'lead_qualification', 'appointment_scheduling'], capabilities: [{ name: 'Lead Qualification', description: 'Qualifies leads based on criteria' }], pricing: { monthly: 99, setup: 0 }, rating: 4.8, installs: 150, status: 'published' },
        { templateId: 'tmpl_ae', name: 'AI Account Executive', role: 'AE', industry: 'SaaS', description: 'AI Sales AE', skills: ['demo', 'proposal', 'negotiation'], pricing: { monthly: 199, setup: 0 }, rating: 4.9, installs: 89, status: 'published' },
        { templateId: 'tmpl_support', name: 'AI Support Agent', role: 'Support', industry: 'General', description: 'AI Customer Support', skills: ['ticket_resolution', 'faq', 'refund'], pricing: { monthly: 149, setup: 0 }, rating: 4.7, installs: 234, status: 'published' }
      ]);
      console.log('Sample templates seeded');
    }

    app.listen(PORT, () => {
      console.log(`\nHOJAI STUDIO v1.0.0 - Port ${PORT}\n`);
    });
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
}

start();

export default app;
