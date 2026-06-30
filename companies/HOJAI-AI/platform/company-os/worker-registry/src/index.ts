/**
 * CompanyOS Unified Worker Registry
 *
 * Single source of truth for all workers (Human, AI, Contractor, Partner).
 *
 * This bridges:
 * - CorpPerks PeopleOS (Human workers)
 * - AgentOS (AI agents)
 * - SUTAR Agent Network
 *
 * Canonical: One Worker model. Human and AI differ only by ownership.
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

const PORT = parseInt(process.env.PORT || '4012', 10);
const SERVICE_NAME = 'worker-registry';
const VERSION = '1.0.0';

// External services
const CORPPERKS_URL = process.env.CORPPERKS_URL || 'http://localhost:4000';
const AGENT_OS_URL = process.env.AGENT_OS_URL || 'http://localhost:4802';
const SALAR_URL = process.env.SALAR_URL || 'http://localhost:4710';
const SUTAR_ACN_URL = process.env.SUTAR_ACN_URL || 'http://localhost:4801';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

interface Worker {
  workerId: string;
  type: 'HUMAN' | 'AI' | 'CONTRACTOR' | 'PARTNER';
  name: string;
  role: string;
  department: string;
  companyId: string;

  // Identity
  corpId: string;
  email?: string;
  phone?: string;

  // Capabilities
  capabilities: string[];
  skills: string[];
  certifications: string[];

  // Status
  status: 'active' | 'inactive' | 'onboarding' | 'offboarding';
  hireDate?: string;
  endDate?: string;

  // Ownership
  ownership: 'self' | 'company';
  employer?: string;

  // Compensation
  compensation: {
    type: 'salary' | 'hourly' | 'per_task' | 'subscription';
    amount?: number;
    currency?: string;
  };

  // Trust
  trustScore: number;
  trustLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PLATINUM';

  // Capacity
  capacity: {
    maxHoursPerWeek: number;
    currentHoursPerWeek: number;
    maxConcurrentTasks: number;
    currentTasks: number;
  };

  // Metadata
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const workers = new Map<string, Worker>();

// Seed some default workers
const defaultWorkers: Worker[] = [
  {
    workerId: 'HR-MANAGER-001',
    type: 'AI',
    name: 'HR Manager',
    role: 'HR Manager',
    department: 'Human Resources',
    companyId: 'default',
    corpId: 'corp-hr-manager-001',
    capabilities: ['recruitment', 'onboarding', 'performance_management', 'employee_relations'],
    skills: ['interviewing', 'policy_compliance', 'hris_management'],
    certifications: [],
    status: 'active',
    ownership: 'company',
    compensation: { type: 'subscription', amount: 5000, currency: 'INR' },
    trustScore: 0.85,
    trustLevel: 'HIGH',
    capacity: { maxHoursPerWeek: 168, currentHoursPerWeek: 0, maxConcurrentTasks: 10, currentTasks: 0 },
    metadata: { source: 'system' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    workerId: 'CFO-AGENT-001',
    type: 'AI',
    name: 'CFO Agent',
    role: 'Chief Financial Officer',
    department: 'Finance',
    companyId: 'default',
    corpId: 'corp-cfo-001',
    capabilities: ['financial_analysis', 'budgeting', 'forecasting', 'treasury_management', 'risk_assessment'],
    skills: ['financial_modeling', 'gaap_compliance', 'cash_flow_management'],
    certifications: [],
    status: 'active',
    ownership: 'company',
    compensation: { type: 'subscription', amount: 10000, currency: 'INR' },
    trustScore: 0.9,
    trustLevel: 'PLATINUM',
    capacity: { maxHoursPerWeek: 168, currentHoursPerWeek: 0, maxConcurrentTasks: 20, currentTasks: 0 },
    metadata: { source: 'system' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    workerId: 'MARKETING-AGENT-001',
    type: 'AI',
    name: 'Marketing Agent',
    role: 'Marketing Manager',
    department: 'Marketing',
    companyId: 'default',
    corpId: 'corp-marketing-001',
    capabilities: ['campaign_management', 'seo', 'content_marketing', 'social_media', 'email_marketing'],
    skills: ['copywriting', 'analytics', 'brand_management'],
    certifications: [],
    status: 'active',
    ownership: 'company',
    compensation: { type: 'subscription', amount: 5000, currency: 'INR' },
    trustScore: 0.8,
    trustLevel: 'HIGH',
    capacity: { maxHoursPerWeek: 168, currentHoursPerWeek: 0, maxConcurrentTasks: 10, currentTasks: 0 },
    metadata: { source: 'system' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    workerId: 'SUPPORT-AGENT-001',
    type: 'AI',
    name: 'Support Agent',
    role: 'Customer Support',
    department: 'Customer Success',
    companyId: 'default',
    corpId: 'corp-support-001',
    capabilities: ['ticketing', 'chat_support', 'email_support', 'complaint_resolution', 'crm'],
    skills: ['problem_solving', 'communication', 'empathy'],
    certifications: [],
    status: 'active',
    ownership: 'company',
    compensation: { type: 'subscription', amount: 3000, currency: 'INR' },
    trustScore: 0.75,
    trustLevel: 'HIGH',
    capacity: { maxHoursPerWeek: 168, currentHoursPerWeek: 0, maxConcurrentTasks: 50, currentTasks: 0 },
    metadata: { source: 'system' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    workerId: 'SALES-AGENT-001',
    type: 'AI',
    name: 'Sales Agent',
    role: 'Sales Representative',
    department: 'Sales',
    companyId: 'default',
    corpId: 'corp-sales-001',
    capabilities: ['lead_qualification', 'cold_outreach', 'demo_scheduling', 'proposal_generation', 'negotiation'],
    skills: ['sales_process', 'crm', 'presentation'],
    certifications: [],
    status: 'active',
    ownership: 'company',
    compensation: { type: 'per_task', amount: 100, currency: 'INR' },
    trustScore: 0.8,
    trustLevel: 'HIGH',
    capacity: { maxHoursPerWeek: 168, currentHoursPerWeek: 0, maxConcurrentTasks: 20, currentTasks: 0 },
    metadata: { source: 'system' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

for (const w of defaultWorkers) {
  workers.set(w.workerId, w);
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

// Health
app.get('/health', (_req, res) => {
  res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============================================================================
// WORKER CRUD
// ============================================================================

/**
 * GET /api/workers
 * List all workers with filters.
 */
app.get('/api/workers', (req, res) => {
  const { type, department, status, companyId, capability } = req.query;

  let result = Array.from(workers.values());

  if (type) result = result.filter(w => w.type === type);
  if (department) result = result.filter(w => w.department === department);
  if (status) result = result.filter(w => w.status === status);
  if (companyId) result = result.filter(w => w.companyId === companyId);
  if (capability) {
    result = result.filter(w =>
      w.capabilities.some(c => c.toLowerCase().includes(String(capability).toLowerCase()))
    );
  }

  res.json({
    success: true,
    data: {
      workers: result,
      total: result.length,
      byType: {
        HUMAN: result.filter(w => w.type === 'HUMAN').length,
        AI: result.filter(w => w.type === 'AI').length,
        CONTRACTOR: result.filter(w => w.type === 'CONTRACTOR').length,
        PARTNER: result.filter(w => w.type === 'PARTNER').length,
      },
    },
  });
});

/**
 * GET /api/workers/:workerId
 * Get a single worker.
 */
app.get('/api/workers/:workerId', (req, res) => {
  const worker = workers.get(req.params.workerId);
  if (!worker) {
    return res.status(404).json({ success: false, error: 'Worker not found' });
  }
  res.json({ success: true, data: worker });
});

/**
 * POST /api/workers
 * Create a new worker.
 */
app.post('/api/workers', async (req, res) => {
  try {
    const { type, name, role, department, companyId, capabilities, skills, ownership, compensation } = req.body;

    if (!type || !name || !role || !department) {
      return res.status(400).json({
        success: false,
        error: 'type, name, role, department are required',
      });
    }

    const workerId = `WRK-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const worker: Worker = {
      workerId,
      type,
      name,
      role,
      department,
      companyId: companyId || 'default',
      corpId: `corp-${workerId.toLowerCase()}`,
      capabilities: capabilities || [],
      skills: skills || [],
      certifications: [],
      status: 'onboarding',
      ownership: ownership || (type === 'AI' ? 'company' : 'self'),
      compensation: compensation || { type: type === 'AI' ? 'subscription' : 'salary' },
      trustScore: 0.5,
      trustLevel: 'MEDIUM',
      capacity: { maxHoursPerWeek: 168, currentHoursPerWeek: 0, maxConcurrentTasks: 5, currentTasks: 0 },
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    workers.set(workerId, worker);

    // Sync to external systems
    await syncWorkerToExternal(worker, 'create');

    res.status(201).json({
      success: true,
      data: worker,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/workers/:workerId
 * Update a worker.
 */
app.patch('/api/workers/:workerId', async (req, res) => {
  try {
    const worker = workers.get(req.params.workerId);
    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    const updates = req.body;
    const updatedWorker = {
      ...worker,
      ...updates,
      workerId: worker.workerId,
      updatedAt: new Date().toISOString(),
    };

    workers.set(worker.workerId, updatedWorker);

    // Sync to external systems
    await syncWorkerToExternal(updatedWorker, 'update');

    res.json({ success: true, data: updatedWorker });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/workers/:workerId
 * Archive a worker.
 */
app.delete('/api/workers/:workerId', async (req, res) => {
  try {
    const worker = workers.get(req.params.workerId);
    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    worker.status = 'offboarding';
    worker.endDate = new Date().toISOString();
    worker.updatedAt = new Date().toISOString();
    workers.set(worker.workerId, worker);

    // Sync to external systems
    await syncWorkerToExternal(worker, 'archive');

    res.json({ success: true, data: { workerId: worker.workerId, status: 'archived' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CAPABILITY SEARCH
// ============================================================================

/**
 * POST /api/workers/search
 * Search workers by capabilities.
 */
app.post('/api/workers/search', async (req, res) => {
  try {
    const { capabilities, department, type, status, limit = 10 } = req.body;

    let result = Array.from(workers.values()).filter(w => w.status === 'active');

    if (department) result = result.filter(w => w.department === department);
    if (type) result = result.filter(w => w.type === type);
    if (status) result = result.filter(w => w.status === status);

    if (capabilities && capabilities.length > 0) {
      // Score by capability match
      const scored = result.map(w => {
        const matched = w.capabilities.filter(c =>
          capabilities.some(req =>
            c.toLowerCase().includes(req.toLowerCase())
          )
        );
        return { worker: w, score: matched.length / capabilities.length };
      });

      scored.sort((a, b) => b.score - a.score);
      result = scored.slice(0, limit).map(s => s.worker);
    } else {
      result = result.slice(0, limit);
    }

    res.json({
      success: true,
      data: {
        workers: result,
        total: result.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// EXTERNAL SYNC
// ============================================================================

async function syncWorkerToExternal(worker: Worker, action: 'create' | 'update' | 'archive'): Promise<void> {
  // Sync to Salar
  if (worker.type === 'AI') {
    await callService(`${SALAR_URL}/agent-twin`, 'POST', {
      agentId: worker.workerId,
      name: worker.name,
      role: worker.role,
      department: worker.department,
      capabilities: worker.capabilities,
      status: worker.status,
    });
  } else {
    await callService(`${SALAR_URL}/human-twin`, 'POST', {
      corpId: worker.corpId,
      name: worker.name,
      role: worker.role,
      department: worker.department,
      capabilities: worker.capabilities,
      status: worker.status,
    });
  }

  // Sync to AgentOS (for AI workers)
  if (worker.type === 'AI' && action !== 'archive') {
    await callService(`${AGENT_OS_URL}/api/agent/registry`, 'POST', {
      name: worker.name,
      type: 'custom',
      owner: worker.companyId,
      capabilities: worker.capabilities,
      metadata: { workerId: worker.workerId },
    });
  }
}

// ============================================================================
// DEPARTMENT VIEW
// ============================================================================

/**
 * GET /api/departments
 * Get all departments with worker counts.
 */
app.get('/api/departments', (_req, res) => {
  const allWorkers = Array.from(workers.values());

  const departments = new Map<string, any>();

  for (const worker of allWorkers) {
    if (!departments.has(worker.department)) {
      departments.set(worker.department, {
        name: worker.department,
        workers: { HUMAN: 0, AI: 0, CONTRACTOR: 0, PARTNER: 0, total: 0 },
        capabilities: new Set<string>(),
      });
    }
    const dept = departments.get(worker.department)!;
    dept.workers[worker.type]++;
    dept.workers.total++;
    for (const cap of worker.capabilities) {
      dept.capabilities.add(cap);
    }
  }

  const result = Array.from(departments.values()).map(d => ({
    ...d,
    capabilities: Array.from(d.capabilities),
  }));

  res.json({
    success: true,
    data: {
      departments: result,
      total: result.length,
    },
  });
});

// ============================================================================
// STATS
// ============================================================================

/**
 * GET /api/stats
 * Get worker statistics.
 */
app.get('/api/stats', (_req, res) => {
  const allWorkers = Array.from(workers.values());

  res.json({
    success: true,
    data: {
      total: allWorkers.length,
      byType: {
        HUMAN: allWorkers.filter(w => w.type === 'HUMAN').length,
        AI: allWorkers.filter(w => w.type === 'AI').length,
        CONTRACTOR: allWorkers.filter(w => w.type === 'CONTRACTOR').length,
        PARTNER: allWorkers.filter(w => w.type === 'PARTNER').length,
      },
      byStatus: {
        active: allWorkers.filter(w => w.status === 'active').length,
        inactive: allWorkers.filter(w => w.status === 'inactive').length,
        onboarding: allWorkers.filter(w => w.status === 'onboarding').length,
        offboarding: allWorkers.filter(w => w.status === 'offboarding').length,
      },
      departments: new Set(allWorkers.map(w => w.department)).size,
      avgTrustScore: allWorkers.reduce((sum, w) => sum + w.trustScore, 0) / allWorkers.length,
    },
  });
});

// ============================================================================
// START
// ============================================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
    console.log(`[${SERVICE_NAME}] Workers: ${workers.size}`);
  });
}

module.exports = { app, SERVICE_NAME, VERSION, PORT };
