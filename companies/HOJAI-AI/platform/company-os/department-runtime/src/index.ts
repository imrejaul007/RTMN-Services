/**
 * CompanyOS Department Runtime
 *
 * Makes departments functional units that execute autonomously.
 *
 * Each department has:
 * - Workers (Human + AI)
 * - Goals
 * - Budgets
 * - Knowledge
 * - Policies
 * - Communication channels
 * - Memory
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONFIG
// ============================================================================

const PORT = parseInt(process.env.PORT || '4013', 10);
const SERVICE_NAME = 'department-runtime';
const VERSION = '1.0.0';

const WORKER_REGISTRY_URL = process.env.WORKER_REGISTRY_URL || 'http://localhost:4012';
const SALAR_URL = process.env.SALAR_URL || 'http://localhost:4710';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

interface DepartmentGoal {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedWorkers: string[];
  progress: number;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

interface Department {
  id: string;
  name: string;
  companyId: string;

  // Workers
  workerIds: string[];
  aiWorkerIds: string[];
  humanWorkerIds: string[];

  // Goals
  goals: DepartmentGoal[];

  // Budget
  budget: {
    allocated: number;
    spent: number;
    currency: string;
  };

  // Capabilities
  capabilities: string[];

  // Knowledge
  knowledgeAreas: string[];

  // Policies
  policies: string[];

  // Status
  status: 'active' | 'inactive' | 'setup';

  // Metrics
  metrics: {
    tasksCompleted: number;
    tasksInProgress: number;
    avgWorkerUtilization: number;
  };

  createdAt: string;
  updatedAt: string;
}

const departments = new Map<string, Department>();

// Seed default departments
const defaultDepartments: Department[] = [
  {
    id: 'DEPT-HR-001',
    name: 'Human Resources',
    companyId: 'default',
    workerIds: [],
    aiWorkerIds: ['HR-MANAGER-001'],
    humanWorkerIds: [],
    goals: [],
    budget: { allocated: 100000, spent: 0, currency: 'INR' },
    capabilities: ['recruitment', 'onboarding', 'training', 'performance_management', 'employee_relations'],
    knowledgeAreas: ['hiring_process', 'benefits', 'policies', 'compliance'],
    policies: ['hiring_policy', 'remote_work_policy', 'code_of_conduct'],
    status: 'active',
    metrics: { tasksCompleted: 0, tasksInProgress: 0, avgWorkerUtilization: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'DEPT-FINANCE-001',
    name: 'Finance',
    companyId: 'default',
    workerIds: [],
    aiWorkerIds: ['CFO-AGENT-001'],
    humanWorkerIds: [],
    goals: [],
    budget: { allocated: 500000, spent: 0, currency: 'INR' },
    capabilities: ['financial_analysis', 'budgeting', 'forecasting', 'treasury', 'accounting', 'tax'],
    knowledgeAreas: ['financial_planning', 'compliance', 'audit'],
    policies: ['expense_policy', 'approval_policy', 'signatory_policy'],
    status: 'active',
    metrics: { tasksCompleted: 0, tasksInProgress: 0, avgWorkerUtilization: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'DEPT-MARKETING-001',
    name: 'Marketing',
    companyId: 'default',
    workerIds: [],
    aiWorkerIds: ['MARKETING-AGENT-001'],
    humanWorkerIds: [],
    goals: [],
    budget: { allocated: 200000, spent: 0, currency: 'INR' },
    capabilities: ['campaign_management', 'seo', 'content', 'social_media', 'email', 'analytics'],
    knowledgeAreas: ['brand_guidelines', 'campaign_strategies', 'market_research'],
    policies: ['brand_policy', 'social_media_policy'],
    status: 'active',
    metrics: { tasksCompleted: 0, tasksInProgress: 0, avgWorkerUtilization: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'DEPT-SALES-001',
    name: 'Sales',
    companyId: 'default',
    workerIds: [],
    aiWorkerIds: ['SALES-AGENT-001'],
    humanWorkerIds: [],
    goals: [],
    budget: { allocated: 150000, spent: 0, currency: 'INR' },
    capabilities: ['lead_generation', 'qualification', 'proposals', 'negotiation', 'crm'],
    knowledgeAreas: ['sales_playbook', 'product_knowledge', 'competitive_analysis'],
    policies: ['discount_policy', 'commission_policy'],
    status: 'active',
    metrics: { tasksCompleted: 0, tasksInProgress: 0, avgWorkerUtilization: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'DEPT-SUPPORT-001',
    name: 'Customer Success',
    companyId: 'default',
    workerIds: [],
    aiWorkerIds: ['SUPPORT-AGENT-001'],
    humanWorkerIds: [],
    goals: [],
    budget: { allocated: 100000, spent: 0, currency: 'INR' },
    capabilities: ['ticketing', 'chat', 'email', 'complaints', 'crm', 'knowledge_base'],
    knowledgeAreas: ['product_docs', 'faqs', 'troubleshooting'],
    policies: ['sla_policy', 'escalation_policy'],
    status: 'active',
    metrics: { tasksCompleted: 0, tasksInProgress: 0, avgWorkerUtilization: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

for (const dept of defaultDepartments) {
  departments.set(dept.id, dept);
}

// ============================================================================
// HELPERS
// ============================================================================

async function callService(url: string, method: string, body?: any): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (INTERNAL_TOKEN) headers['x-internal-token'] = INTERNAL_TOKEN;

  try {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error: any) {
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => {
  res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============================================================================
// DEPARTMENT CRUD
// ============================================================================

/**
 * GET /api/departments
 * List all departments.
 */
app.get('/api/departments', (req, res) => {
  const { companyId, status } = req.query;

  let result = Array.from(departments.values());

  if (companyId) result = result.filter(d => d.companyId === companyId);
  if (status) result = result.filter(d => d.status === status);

  res.json({
    success: true,
    data: {
      departments: result,
      total: result.length,
    },
  });
});

/**
 * GET /api/departments/:id
 * Get a single department.
 */
app.get('/api/departments/:id', (req, res) => {
  const dept = departments.get(req.params.id);
  if (!dept) {
    return res.status(404).json({ success: false, error: 'Department not found' });
  }
  res.json({ success: true, data: dept });
});

/**
 * POST /api/departments
 * Create a new department.
 */
app.post('/api/departments', async (req, res) => {
  try {
    const { name, companyId, capabilities, knowledgeAreas, policies, budget } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const id = `DEPT-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const department: Department = {
      id,
      name,
      companyId: companyId || 'default',
      workerIds: [],
      aiWorkerIds: [],
      humanWorkerIds: [],
      goals: [],
      budget: budget || { allocated: 0, spent: 0, currency: 'INR' },
      capabilities: capabilities || [],
      knowledgeAreas: knowledgeAreas || [],
      policies: policies || [],
      status: 'setup',
      metrics: { tasksCompleted: 0, tasksInProgress: 0, avgWorkerUtilization: 0 },
      createdAt: now,
      updatedAt: now,
    };

    departments.set(id, department);

    // Register department in Salar
    await callService(`${SALAR_URL}/capabilities/department`, 'POST', {
      departmentId: id,
      name,
      capabilities,
    });

    res.status(201).json({ success: true, data: department });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/departments/:id
 * Update a department.
 */
app.patch('/api/departments/:id', async (req, res) => {
  try {
    const dept = departments.get(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const updates = req.body;
    const updated = {
      ...dept,
      ...updates,
      id: dept.id,
      updatedAt: new Date().toISOString(),
    };

    departments.set(dept.id, updated);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// WORKERS
// ============================================================================

/**
 * POST /api/departments/:id/workers
 * Add a worker to a department.
 */
app.post('/api/departments/:id/workers', async (req, res) => {
  try {
    const dept = departments.get(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const { workerId, type } = req.body;
    if (!workerId) {
      return res.status(400).json({ success: false, error: 'workerId is required' });
    }

    if (!dept.workerIds.includes(workerId)) {
      dept.workerIds.push(workerId);

      if (type === 'AI' || !type) {
        dept.aiWorkerIds.push(workerId);
      } else {
        dept.humanWorkerIds.push(workerId);
      }

      dept.updatedAt = new Date().toISOString();
      departments.set(dept.id, dept);
    }

    res.json({ success: true, data: dept });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/departments/:id/workers/:workerId
 * Remove a worker from a department.
 */
app.delete('/api/departments/:id/workers/:workerId', async (req, res) => {
  try {
    const dept = departments.get(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    dept.workerIds = dept.workerIds.filter(id => id !== req.params.workerId);
    dept.aiWorkerIds = dept.aiWorkerIds.filter(id => id !== req.params.workerId);
    dept.humanWorkerIds = dept.humanWorkerIds.filter(id => id !== req.params.workerId);
    dept.updatedAt = new Date().toISOString();
    departments.set(dept.id, dept);

    res.json({ success: true, data: dept });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GOALS
// ============================================================================

/**
 * POST /api/departments/:id/goals
 * Add a goal to a department.
 */
app.post('/api/departments/:id/goals', async (req, res) => {
  try {
    const dept = departments.get(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const { name, description, assignedWorkers, dueDate } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const goal: DepartmentGoal = {
      id: `GOAL-${uuidv4().slice(0, 8).toUpperCase()}`,
      name,
      description: description || '',
      status: 'pending',
      assignedWorkers: assignedWorkers || dept.workerIds.slice(0, 3),
      progress: 0,
      dueDate,
      createdAt: new Date().toISOString(),
    };

    dept.goals.push(goal);
    dept.updatedAt = new Date().toISOString();
    departments.set(dept.id, dept);

    res.status(201).json({ success: true, data: goal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/departments/:id/goals/:goalId
 * Update a goal.
 */
app.patch('/api/departments/:id/goals/:goalId', async (req, res) => {
  try {
    const dept = departments.get(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const goal = dept.goals.find(g => g.id === req.params.goalId);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const updates = req.body;
    Object.assign(goal, updates);

    if (updates.progress >= 100 || updates.status === 'completed') {
      goal.status = 'completed';
      goal.progress = 100;
      goal.completedAt = new Date().toISOString();
      dept.metrics.tasksCompleted++;
    }

    dept.updatedAt = new Date().toISOString();
    departments.set(dept.id, dept);

    res.json({ success: true, data: goal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// BUDGET
// ============================================================================

/**
 * POST /api/departments/:id/budget/allocate
 * Allocate budget to a department.
 */
app.post('/api/departments/:id/budget/allocate', async (req, res) => {
  try {
    const dept = departments.get(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const { amount } = req.body;
    if (typeof amount !== 'number') {
      return res.status(400).json({ success: false, error: 'amount is required' });
    }

    dept.budget.allocated += amount;
    dept.updatedAt = new Date().toISOString();
    departments.set(dept.id, dept);

    res.json({ success: true, data: dept.budget });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/departments/:id/budget/spend
 * Record spending.
 */
app.post('/api/departments/:id/budget/spend', async (req, res) => {
  try {
    const dept = departments.get(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const { amount, description } = req.body;
    if (typeof amount !== 'number') {
      return res.status(400).json({ success: false, error: 'amount is required' });
    }

    dept.budget.spent += amount;
    dept.updatedAt = new Date().toISOString();
    departments.set(dept.id, dept);

    res.json({
      success: true,
      data: {
        budget: dept.budget,
        remaining: dept.budget.allocated - dept.budget.spent,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// EXECUTE
// ============================================================================

/**
 * POST /api/departments/:id/execute
 * Execute a task in the department using assigned workers.
 */
app.post('/api/departments/:id/execute', async (req, res) => {
  try {
    const dept = departments.get(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const { task, goalId, priority } = req.body;
    if (!task) {
      return res.status(400).json({ success: false, error: 'task is required' });
    }

    // Find available workers
    const availableWorkers = dept.workerIds.filter(workerId => {
      // Simple check - in real implementation would check capacity
      return true;
    });

    if (availableWorkers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No available workers in department',
      });
    }

    // Update goal if provided
    if (goalId) {
      const goal = dept.goals.find(g => g.id === goalId);
      if (goal) {
        goal.status = 'in_progress';
        dept.metrics.tasksInProgress++;
        dept.updatedAt = new Date().toISOString();
        departments.set(dept.id, dept);
      }
    }

    res.json({
      success: true,
      data: {
        taskId: `TASK-${uuidv4().slice(0, 8).toUpperCase()}`,
        department: dept.name,
        assignedWorkers: availableWorkers,
        status: 'queued',
        goalId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// STATS
// ============================================================================

/**
 * GET /api/stats
 * Get department statistics.
 */
app.get('/api/stats', (_req, res) => {
  const allDepts = Array.from(departments.values());

  res.json({
    success: true,
    data: {
      total: allDepts.length,
      active: allDepts.filter(d => d.status === 'active').length,
      totalWorkers: allDepts.reduce((sum, d) => sum + d.workerIds.length, 0),
      aiWorkers: allDepts.reduce((sum, d) => sum + d.aiWorkerIds.length, 0),
      humanWorkers: allDepts.reduce((sum, d) => sum + d.humanWorkerIds.length, 0),
      totalGoals: allDepts.reduce((sum, d) => sum + d.goals.length, 0),
      completedGoals: allDepts.reduce((sum, d) => sum + d.goals.filter(g => g.status === 'completed').length, 0),
      totalBudget: allDepts.reduce((sum, d) => sum + d.budget.allocated, 0),
      totalSpent: allDepts.reduce((sum, d) => sum + d.budget.spent, 0),
    },
  });
});

// ============================================================================
// START
// ============================================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
    console.log(`[${SERVICE_NAME}] Departments: ${departments.size}`);
  });
}

module.exports = { app, SERVICE_NAME, VERSION, PORT };
