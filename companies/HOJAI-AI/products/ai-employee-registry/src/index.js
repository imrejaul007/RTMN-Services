/**
 * AI Employee Registry — canonical registry for all AI Employees.
 *
 * Port: 5500
 * Purpose: Single source of truth for the 13 vision-genie agents, the 245
 * BAM catalog entries, and any new AI Employees added later.
 *
 * Endpoints:
 *   GET    /health
 *   GET    /ready
 *   GET    /api/v1/employees                    — list all (with filters)
 *   GET    /api/v1/employees/:id               — get one
 *   GET    /api/v1/employees/slug/:slug         — get by slug
 *   POST   /api/v1/employees                    — register new (admin)
 *   PATCH  /api/v1/employees/:id               — update (admin)
 *   DELETE /api/v1/employees/:id               — retire (admin)
 *   GET    /api/v1/employees/:id/install       — get install instructions
 *   POST   /api/v1/employees/:id/install       — record install (audit log)
 *   GET    /api/v1/vision-agents                — list the 13 vision-genie agents
 *   GET    /api/v1/vision-agents/missing        — gap report (what's not built)
 *   GET    /api/v1/categories                   — distinct categories
 *   GET    /api/v1/capabilities                 — distinct capabilities
 *   GET    /api/v1/agents-by-agentos            — fetch from AgentOS if available
 *
 * Seed data: 13 vision-genie agents + 16 employees (3 missing + 13 vision)
 *
 * Authoritative spec: .claude/plans/bam-complete-spec.md §AI Employees
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const { SEED_EMPLOYEES } = require('./seed-data.js');
const { fetchFromAgentOS, buildCapabilityMap } = require('./agentos-sync.js');

const PORT = parseInt(process.env.AI_REGISTRY_PORT || '5500');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUIRE_AUTH = process.env.AI_REGISTRY_REQUIRE_AUTH !== 'false';
const AGENTOS_URL = process.env.AGENTOS_URL || '';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

// ─── In-memory store (replace with MongoDB / Postgres in production) ───
const employees = new Map(); // id → employee
const installLog = []; // audit log

// Seed
for (const emp of SEED_EMPLOYEES) {
  employees.set(emp.id, emp);
}

// ─��─ Auth ─────────────────────────────────────────────────────────────
function apiKeyAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const auth = req.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing Authorization header' });
  }
  if (HOJAI_API_KEY && token !== HOJAI_API_KEY) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  next();
}

const apiResponse = (success, data, error) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString()
});

// ─── Helpers ──────────────────────────────────────────────────────────
function findEmployee(idOrSlug) {
  // Try by id first
  let emp = employees.get(idOrSlug);
  if (emp) return emp;
  // Then by slug
  for (const e of employees.values()) {
    if (e.slug === idOrSlug) return e;
  }
  return null;
}

function filterEmployees({ category, capability, status, visionOnly, search } = {}) {
  let list = Array.from(employees.values());
  if (category) list = list.filter((e) => e.category === category);
  if (capability) {
    list = list.filter((e) => Array.isArray(e.capabilities) && e.capabilities.includes(capability));
  }
  if (status) list = list.filter((e) => e.status === status);
  if (visionOnly) list = list.filter((e) => e.visionAgent);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((e) =>
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }
  return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

// ─── Routes ───────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-employee-registry',
    version: '1.0.0',
    uptime: process.uptime(),
    employees: employees.size
  });
});

app.get('/ready', (_req, res) => {
  res.json({
    ready: true,
    service: 'ai-employee-registry',
    employees: employees.size,
    visionAgents: filterEmployees({ visionOnly: true }).length,
    installed: installLog.length
  });
});

// ─── Employees CRUD ───────────────────────────────────────────────────

app.get('/api/v1/employees', apiKeyAuth, (req, res) => {
  const { category, capability, status, vision, search, limit, offset } = req.query;
  let list = filterEmployees({
    category,
    capability,
    status,
    visionOnly: vision === 'true',
    search
  });
  const total = list.length;
  const off = parseInt(offset || '0');
  const lim = parseInt(limit || '100');
  list = list.slice(off, off + lim);
  res.json(apiResponse(true, {
    total,
    offset: off,
    limit: lim,
    employees: list
  }));
});

app.get('/api/v1/employees/:id', apiKeyAuth, (req, res) => {
  const emp = findEmployee(req.params.id);
  if (!emp) return res.status(404).json(apiResponse(false, undefined, 'Employee not found'));
  res.json(apiResponse(true, emp));
});

app.get('/api/v1/employees/slug/:slug', apiKeyAuth, (req, res) => {
  const emp = findEmployee(req.params.slug);
  if (!emp) return res.status(404).json(apiResponse(false, undefined, 'Employee not found'));
  res.json(apiResponse(true, emp));
});

app.post('/api/v1/employees', apiKeyAuth, (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name || !body.slug) {
      return res.status(400).json(apiResponse(false, undefined, 'name and slug are required'));
    }
    if (findEmployee(body.slug)) {
      return res.status(409).json(apiResponse(false, undefined, 'slug already exists'));
    }
    const emp = {
      id: body.id || `emp_${uuidv4().slice(0, 8)}`,
      slug: body.slug,
      name: body.name,
      description: body.description || '',
      category: body.category || 'general',
      capabilities: Array.isArray(body.capabilities) ? body.capabilities : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      serviceUrl: body.serviceUrl || null,
      port: body.port || null,
      version: body.version || '1.0.0',
      pricing: body.pricing || { model: 'free' },
      rating: body.rating || null,
      installs: body.installs || 0,
      status: body.status || 'available',
      visionAgent: !!body.visionAgent,
      visionRole: body.visionRole || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    employees.set(emp.id, emp);
    res.status(201).json(apiResponse(true, emp));
  } catch (err) {
    res.status(500).json(apiResponse(false, undefined, err.message));
  }
});

app.patch('/api/v1/employees/:id', apiKeyAuth, (req, res) => {
  const emp = findEmployee(req.params.id);
  if (!emp) return res.status(404).json(apiResponse(false, undefined, 'Employee not found'));
  const allowed = ['name', 'description', 'category', 'capabilities', 'tags', 'serviceUrl', 'port', 'version', 'pricing', 'status', 'rating'];
  for (const k of allowed) {
    if (k in req.body) emp[k] = req.body[k];
  }
  emp.updatedAt = new Date().toISOString();
  res.json(apiResponse(true, emp));
});

app.delete('/api/v1/employees/:id', apiKeyAuth, (req, res) => {
  const emp = findEmployee(req.params.id);
  if (!emp) return res.status(404).json(apiResponse(false, undefined, 'Employee not found'));
  emp.status = 'retired';
  emp.retiredAt = new Date().toISOString();
  res.json(apiResponse(true, { id: emp.id, status: 'retired' }));
});

// ─── Install flow ─────────────────────────────────────────────────────

app.get('/api/v1/employees/:id/install', apiKeyAuth, (req, res) => {
  const emp = findEmployee(req.params.id);
  if (!emp) return res.status(404).json(apiResponse(false, undefined, 'Employee not found'));
  res.json(apiResponse(true, {
    employeeId: emp.id,
    slug: emp.slug,
    serviceUrl: emp.serviceUrl,
    port: emp.port,
    steps: buildInstallSteps(emp)
  }));
});

app.post('/api/v1/employees/:id/install', apiKeyAuth, (req, res) => {
  const emp = findEmployee(req.params.id);
  if (!emp) return res.status(404).json(apiResponse(false, undefined, 'Employee not found'));
  const record = {
    id: `inst_${uuidv4().slice(0, 12)}`,
    employeeId: emp.id,
    installedBy: req.body?.installedBy || 'anonymous',
    companyId: req.body?.companyId || null,
    installedAt: new Date().toISOString(),
    status: 'completed'
  };
  installLog.push(record);
  emp.installs = (emp.installs || 0) + 1;
  res.status(201).json(apiResponse(true, record));
});

function buildInstallSteps(emp) {
  const steps = [
    { step: 1, action: 'verify_health', description: `Confirm ${emp.name} is reachable at ${emp.serviceUrl || `http://localhost:${emp.port || 'unknown'}`}` },
    { step: 2, action: 'register_capability', description: `Register ${emp.slug} in CapabilityOS (companies/Nexha/services/nexha-capability-os)` },
    { step: 3, action: 'wire_agentos', description: `Create agent record in AgentOS (companies/HOJAI-AI/platform/agent-os/agent-registry)` },
    { step: 4, action: 'install_for_company', description: 'POST /api/v1/employees/:id/install with companyId to record install' },
    { step: 5, action: 'test_invocation', description: `curl ${emp.serviceUrl}/health — confirm running` }
  ];
  return steps;
}

// ─── Vision-genie agents (the 13) ────────────────────────────────────

app.get('/api/v1/vision-agents', apiKeyAuth, (_req, res) => {
  const list = filterEmployees({ visionOnly: true });
  res.json(apiResponse(true, {
    total: list.length,
    visionAgents: list
  }));
});

app.get('/api/v1/vision-agents/missing', apiKeyAuth, (_req, res) => {
  const list = filterEmployees({ visionOnly: true });
  const gaps = list.filter((e) => e.status !== 'available' || (e.serviceUrl == null));
  res.json(apiResponse(true, {
    total: list.length,
    built: list.filter((e) => e.serviceUrl).length,
    missing: list.filter((e) => !e.serviceUrl).map((e) => ({
      visionRole: e.visionRole,
      name: e.name,
      status: e.status,
      notes: e.notes || ''
    })),
    summary: `Built ${list.filter((e) => e.serviceUrl).length} of ${list.length} vision agents`
  }));
});

// ─── Discovery endpoints ──────────────────────────────────────────────

app.get('/api/v1/categories', apiKeyAuth, (_req, res) => {
  const cats = new Set();
  for (const e of employees.values()) cats.add(e.category);
  res.json(apiResponse(true, { categories: Array.from(cats).sort() }));
});

app.get('/api/v1/capabilities', apiKeyAuth, (_req, res) => {
  const caps = new Set();
  for (const e of employees.values()) {
    if (Array.isArray(e.capabilities)) e.capabilities.forEach((c) => caps.add(c));
  }
  res.json(apiResponse(true, { capabilities: Array.from(caps).sort() }));
});

app.get('/api/v1/agents-by-agentos', apiKeyAuth, async (_req, res) => {
  try {
    const result = await fetchFromAgentOS(AGENTOS_URL);
    res.json(apiResponse(true, result));
  } catch (err) {
    res.json(apiResponse(true, {
      agentosUrl: AGENTOS_URL || '(not configured)',
      reachable: false,
      agents: [],
      message: 'AgentOS unreachable. Set AGENTOS_URL to enable live sync.'
    }));
  }
});

app.get('/api/v1/capability-map', apiKeyAuth, (_req, res) => {
  res.json(apiResponse(true, buildCapabilityMap(Array.from(employees.values()))));
});

// ─── 404 + error handler ──────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json(apiResponse(false, undefined, `Not found: ${req.method} ${req.path}`));
});

app.use((err, _req, res, _next) => {
  console.error('[ai-registry] error:', err);
  res.status(500).json(apiResponse(false, undefined, err.message || 'Internal error'));
});

// ─── Boot ──────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[ai-registry] listening on :${PORT}`);
  console.log(`[ai-registry] seeded with ${employees.size} employees`);
  console.log(`[ai-registry] vision agents: ${filterEmployees({ visionOnly: true }).length}`);
  console.log(`[ai-registry] auth: ${REQUIRE_AUTH ? 'required' : 'disabled'}`);
  if (AGENTOS_URL) {
    console.log(`[ai-registry] AgentOS sync: ${AGENTOS_URL}`);
  }
});

module.exports = { app, employees, filterEmployees, findEmployee };