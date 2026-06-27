/**
 * RTMN Employee Twin Service v2.0
 * Employee profiles, skills, performance, health
 *
 * Security: JWT Auth, Rate Limiting, Input Validation, Error Handling
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { PersistentStore } from '@rtmn/shared/lib/persistent-store';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import {
  requireAuth,
  optionalAuth,
  requireRole,
  preventPrototypePollution,
  sanitizeSearchInput,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger,
  defaultLimiter,
  strictLimiter,
  platform,
  publishAsync,
  installPhase5
} from '@rtmn/twinos-shared';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4730;
const SERVICE_NAME = 'employee-twin';

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);

// Rate limiting
app.use('/api/', defaultLimiter);
app.use('/api/write', strictLimiter);

// Persistent storage (file-backed JSON, survives restarts)
const STORE_OPTS = { serviceName: 'employee-twin' };
const employees = new PersistentStore('employees', STORE_OPTS);
const skills = new PersistentStore('skills', STORE_OPTS);
const certifications = new PersistentStore('certifications', STORE_OPTS);
const performances = new PersistentStore('performances', STORE_OPTS);

// Derived indexes - rebuilt from employees on startup, kept in-memory only
const byDepartment = new Map();
const byEmail = new Map();

function rebuildIndexes() {
  byDepartment.clear();
  byEmail.clear();
  for (const e of employees.values()) {
    if (!byDepartment.has(e.department)) byDepartment.set(e.department, new Set());
    byDepartment.get(e.department).add(e.id);
    if (e.email) byEmail.set(e.email.toLowerCase(), e.id);
  }
}

// Initialize sample employees
const sampleEmployees = [
  {
    id: 'emp-1', employeeId: 'RTMN-001', firstName: 'John', lastName: 'Smith',
    email: 'john.smith@rtmn.com', phone: '+1-555-0101',
    department: 'Engineering', title: 'Senior Software Engineer', level: 'L5',
    manager: null, status: 'active', type: 'full_time',
    location: { city: 'San Francisco', state: 'CA', country: 'USA', remote: true },
    compensation: { salary: 180000, currency: 'USD', bonus: 15 },
    hireDate: '2022-03-15', startDate: '2022-03-20',
    skills: ['JavaScript', 'React', 'Node.js', 'AWS', 'TypeScript'],
    health: { overall: 85, engagement: 90, productivity: 88, satisfaction: 82 },
    createdAt: new Date('2022-03-15').toISOString(),
    updatedAt: new Date('2025-06-15').toISOString()
  },
  {
    id: 'emp-2', employeeId: 'RTMN-002', firstName: 'Sarah', lastName: 'Johnson',
    email: 'sarah.johnson@rtmn.com', phone: '+1-555-0103',
    department: 'Sales', title: 'Account Executive', level: 'L4',
    manager: null, status: 'active', type: 'full_time',
    location: { city: 'New York', state: 'NY', country: 'USA', remote: false },
    compensation: { salary: 120000, currency: 'USD', bonus: 20 },
    hireDate: '2023-01-10', startDate: '2023-01-15',
    skills: ['Sales', 'CRM', 'Negotiation', 'Presentation'],
    health: { overall: 78, engagement: 75, productivity: 82, satisfaction: 80 },
    createdAt: new Date('2023-01-10').toISOString(),
    updatedAt: new Date('2025-06-10').toISOString()
  },
  {
    id: 'emp-3', employeeId: 'RTMN-003', firstName: 'Michael', lastName: 'Chen',
    email: 'michael.chen@rtmn.com', phone: '+1-555-0105',
    department: 'Marketing', title: 'Marketing Director', level: 'L6',
    manager: null, status: 'active', type: 'full_time',
    location: { city: 'San Francisco', state: 'CA', country: 'USA', remote: true },
    compensation: { salary: 200000, currency: 'USD', bonus: 25 },
    hireDate: '2021-06-01', startDate: '2021-06-15',
    skills: ['Digital Marketing', 'Strategy', 'Analytics', 'Brand Management'],
    health: { overall: 92, engagement: 95, productivity: 90, satisfaction: 88 },
    createdAt: new Date('2021-06-01').toISOString(),
    updatedAt: new Date('2025-06-12').toISOString()
  }
];

sampleEmployees.forEach(e => {
  employees.set(e.id, e);
});

// Rebuild derived indexes from whatever employees are now loaded (seed + on-disk)
rebuildIndexes();

// ==================== EMPLOYEES API ====================

/** GET /api/employees - List employees */
app.get('/api/employees', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { department, status, type, level, search, page = 1, limit = 20 } = req.query;

  let result = Array.from(employees.values());

  if (department) result = result.filter(e => e.department === department);
  if (status) result = result.filter(e => e.status === status);
  if (type) result = result.filter(e => e.type === type);
  if (level) result = result.filter(e => e.level === level);
  if (search) {
    const query = sanitizeSearchInput(search);
    result = result.filter(e =>
      e.firstName.toLowerCase().includes(query.toLowerCase()) ||
      e.lastName.toLowerCase().includes(query.toLowerCase()) ||
      e.email.toLowerCase().includes(query.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(query.toLowerCase())
    );
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = result.length;
  const start = (parseInt(page) - 1) * parseInt(limit);

  // Remove sensitive fields for non-admin users
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'hr') {
    result = result.map(e => sanitizeEmployee(e));
  }

  res.json({
    success: true,
    employees: result.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total }
  });
}));

/** GET /api/employees/:id - Get employee */
app.get('/api/employees/:id', requireAuth, asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  // Non-admin users can only see their own profile or basic info
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'hr') {
    // Check if it's their own profile
    if (employee.email !== req.user.email) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
    }
    res.json({ success: true, employee: sanitizeEmployee(employee) });
  } else {
    res.json({ success: true, employee });
  }
}));

/** POST /api/employees - Create employee (HR/Admin only) */
app.post('/api/employees', requireAuth, requireRole('admin', 'superadmin', 'hr'), strictLimiter, asyncHandler(async (req, res) => {
  const data = preventPrototypePollution(req.body);
  const { firstName, lastName, email, department, title, level, type, hireDate } = data;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'First name, last name, and email are required' } });
  }

  // Check for duplicate email
  if (byEmail.has(email.toLowerCase())) {
    return res.status(409).json({ success: false, error: { code: 'DUPLICATE_EMAIL', message: 'Employee with this email already exists' } });
  }

  // Validate compensation if provided
  let compensation = data.compensation || { salary: 0, currency: 'USD', bonus: 0 };
  if (typeof compensation === 'object') {
    compensation = {
      salary: Math.max(0, Math.min(10000000, compensation.salary || 0)),
      currency: compensation.currency || 'USD',
      bonus: Math.max(0, Math.min(100, compensation.bonus || 0))
    };
  }

  const count = employees.size + 1;
  const employee = {
    id: `emp-${uuidv4().slice(0, 8)}`,
    employeeId: data.employeeId || `RTMN-${String(count).padStart(3, '0')}`,
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone: data.phone || '',
    department: department || 'General',
    title: title || 'Employee',
    level: level || 'L1',
    manager: data.manager || null,
    status: 'onboarding',
    type: type || 'full_time',
    location: data.location || { city: '', state: '', country: 'USA', remote: false },
    compensation,
    hireDate: hireDate || new Date().toISOString().split('T')[0],
    startDate: null,
    skills: Array.isArray(data.skills) ? data.skills.slice(0, 50) : [],
    languages: Array.isArray(data.languages) ? data.languages : ['English'],
    emergencyContact: data.emergencyContact || {},
    health: { overall: 100, engagement: 100, productivity: 100, satisfaction: 100 },
    metadata: {},
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await employees.set(employee.id, employee);
  byEmail.set(employee.email.toLowerCase(), employee.id);

  if (!byDepartment.has(employee.department)) byDepartment.set(employee.department, new Set());
  byDepartment.get(employee.department).add(employee.id);

  // Platform integration
  platform.bridge.autoBind(employee.id, 'episodic');
  platform.memory.recordEvent('employee.created', { employeeId: employee.id, name: `${employee.firstName} ${employee.lastName}`, department: employee.department }, employee.id);
  platform.policy.audit('create', 'employee', { employeeId: employee.id });
  publishAsync('employee.employee.created', { id: employee.id, name: `${employee.firstName} ${employee.lastName}`, department: employee.department });

  logger.info('Employee created', { employeeId: employee.id, createdBy: req.user.id });

  res.status(201).json({ success: true, employee });
}));

/** PUT /api/employees/:id - Update employee */
app.put('/api/employees/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  // Non-admin can only update their own profile
  const canUpdateSensitive = ['admin', 'superadmin', 'hr'].includes(req.user.role);
  const isOwnProfile = employee.email === req.user.email;

  if (!canUpdateSensitive && !isOwnProfile) {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  }

  const data = preventPrototypePollution(req.body);

  // Non-admin can only update limited fields
  const basicFields = ['phone', 'location', 'skills', 'languages'];
  const sensitiveFields = ['firstName', 'lastName', 'email', 'department', 'title', 'level', 'manager', 'status', 'type', 'compensation'];

  basicFields.forEach(field => {
    if (data[field] !== undefined) employee[field] = data[field];
  });

  if (canUpdateSensitive) {
    sensitiveFields.forEach(field => {
      if (data[field] !== undefined) employee[field] = data[field];
    });

    // Validate compensation
    if (data.compensation && typeof data.compensation === 'object') {
      employee.compensation = {
        ...employee.compensation,
        ...data.compensation,
        salary: Math.max(0, Math.min(10000000, data.compensation.salary ?? employee.compensation.salary)),
        bonus: Math.max(0, Math.min(100, data.compensation.bonus ?? employee.compensation.bonus))
      };
    }
  }

  employee.updatedAt = new Date().toISOString();

  // Persist mutated record (silent-mutation fix: in-memory-only mutation is now flushed)
  await employees.set(employee.id, employee);

  // Platform integration: publish update event
  publishAsync('employee.employee.updated', { id: employee.id });

  logger.info('Employee updated', { employeeId: employee.id, updatedBy: req.user.id });

  res.json({ success: true, employee });
}));

/** DELETE /api/employees/:id - Delete employee (Admin only) */
app.delete('/api/employees/:id', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  employee.status = 'terminated';
  employee.terminatedAt = new Date().toISOString();
  employee.updatedAt = new Date().toISOString();

  // Persist soft-delete state (silent-mutation fix)
  await employees.set(employee.id, employee);

  // Platform integration: publish termination event
  publishAsync('employee.employee.terminated', { id: employee.id });

  logger.info('Employee terminated', { employeeId: employee.id, terminatedBy: req.user.id });

  res.json({ success: true, message: 'Employee terminated' });
}));

// ==================== SKILLS API ====================

/** GET /api/employees/:id/skills - Get employee skills */
app.get('/api/employees/:id/skills', requireAuth, asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  res.json({ success: true, skills: employee.skills || [] });
}));

/** POST /api/employees/:id/skills - Add skill */
app.post('/api/employees/:id/skills', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  const { skill, level, certified } = preventPrototypePollution(req.body);

  if (!skill || typeof skill !== 'string' || skill.length > 100) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid skill name required' } });
  }

  if (!employee.skills) employee.skills = [];

  const sanitizedSkill = sanitizeSearchInput(skill);
  if (!employee.skills.includes(sanitizedSkill)) {
    employee.skills.push(sanitizedSkill);
  }

  if (certified && ['admin', 'superadmin', 'hr'].includes(req.user.role)) {
    const certId = `cert-${uuidv4().slice(0, 8)}`;
    const cert = {
      id: certId,
      employeeId: employee.id,
      skill: sanitizedSkill,
      level: ['beginner', 'intermediate', 'advanced', 'expert'].includes(level) ? level : 'intermediate',
      issuedAt: new Date().toISOString(),
      expiresAt: null,
      issuedBy: req.user.id
    };
    await certifications.set(certId, cert);
  }

  employee.updatedAt = new Date().toISOString();

  // Persist mutated skills array (silent-mutation fix)
  await employees.set(employee.id, employee);

  res.json({ success: true, skills: employee.skills });
}));

// ==================== PERFORMANCE API ====================

/** GET /api/employees/:id/performance - Get performance reviews */
app.get('/api/employees/:id/performance', requireAuth, asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  const isOwnProfile = employee.email === req.user.email;
  const canViewAll = ['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role);

  if (!isOwnProfile && !canViewAll) {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  }

  const employeePerformance = Array.from(performances.values())
    .filter(p => p.employeeId === req.params.id)
    .sort((a, b) => b.period.localeCompare(a.period));

  res.json({ success: true, performance: employeePerformance });
}));

/** POST /api/employees/:id/performance - Create performance review (HR only) */
app.post('/api/employees/:id/performance', requireAuth, requireRole('admin', 'superadmin', 'hr'), strictLimiter, asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  const { period, score, objectives, achievements } = preventPrototypePollution(req.body);

  if (!period || score === undefined) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Period and score are required' } });
  }

  // Validate score range
  const validatedScore = Math.max(1, Math.min(5, parseFloat(score)));

  const performance = {
    id: `perf-${uuidv4().slice(0, 8)}`,
    employeeId: req.params.id,
    period,
    score: validatedScore,
    objectives: Array.isArray(objectives) ? objectives.slice(0, 20) : [],
    achievements: Array.isArray(achievements) ? achievements.slice(0, 20) : [],
    status: 'pending',
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  };

  await performances.set(performance.id, performance);

  // Platform integration: publish performance event
  publishAsync('employee.performance.created', { id: performance.id, employeeId: employee.id, score: performance.score });

  logger.info('Performance review created', { performanceId: performance.id, employeeId: employee.id });

  res.status(201).json({ success: true, performance });
}));

// ==================== HEALTH API ====================

/** GET /api/employees/:id/health - Get employee health (HR only) */
app.get('/api/employees/:id/health', requireAuth, requireRole('admin', 'superadmin', 'hr'), asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  res.json({
    success: true,
    employeeId: employee.id,
    health: employee.health,
    updatedAt: employee.updatedAt
  });
}));

/** PUT /api/employees/:id/health - Update health metrics (HR only) */
app.put('/api/employees/:id/health', requireAuth, requireRole('admin', 'superadmin', 'hr'), strictLimiter, asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  const { overall, engagement, productivity, satisfaction } = preventPrototypePollution(req.body);

  // Clamp values to 0-100
  if (overall !== undefined) employee.health.overall = Math.max(0, Math.min(100, overall));
  if (engagement !== undefined) employee.health.engagement = Math.max(0, Math.min(100, engagement));
  if (productivity !== undefined) employee.health.productivity = Math.max(0, Math.min(100, productivity));
  if (satisfaction !== undefined) employee.health.satisfaction = Math.max(0, Math.min(100, satisfaction));

  employee.updatedAt = new Date().toISOString();

  // Persist mutated health metrics (silent-mutation fix)
  await employees.set(employee.id, employee);

  res.json({ success: true, health: employee.health });
}));

// ==================== ORG CHART API ====================

/** GET /api/org-chart - Get org chart */
app.get('/api/org-chart', requireAuth, asyncHandler(async (req, res) => {
  const { rootId } = req.query;

  const root = rootId
    ? employees.get(rootId)
    : Array.from(employees.values()).find(e => !e.manager && e.status === 'active');

  if (!root) {
    return res.status(404).json({ success: false, error: { code: 'ROOT_NOT_FOUND', message: 'Root employee not found' } });
  }

  // Cycle detection
  const visited = new Set();

  function buildTree(employee, depth = 0) {
    if (depth > 100 || visited.has(employee.id)) {
      return { id: employee.id, name: `${employee.firstName} ${employee.lastName}`, hasCycle: true, children: [] };
    }

    visited.add(employee.id);

    const directReports = Array.from(employees.values())
      .filter(e => e.manager === employee.id && e.status === 'active');

    return {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      title: employee.title,
      department: employee.department,
      level: employee.level,
      children: directReports.map(r => buildTree(r, depth + 1))
    };
  }

  const orgChart = buildTree(root);

  res.json({ success: true, orgChart });
}));

// ==================== TEAM API ====================

/** GET /api/employees/:id/team - Get direct reports */
app.get('/api/employees/:id/team', requireAuth, asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  const team = Array.from(employees.values())
    .filter(e => e.manager === req.params.id && e.status === 'active')
    .map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, title: e.title, department: e.department }));

  res.json({ success: true, team, count: team.length });
}));

/** GET /api/employees/:id/manager - Get manager */
app.get('/api/employees/:id/manager', requireAuth, asyncHandler(async (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } });
  }

  if (!employee.manager) {
    return res.status(404).json({ success: false, error: { code: 'NO_MANAGER', message: 'No manager found' } });
  }

  const manager = employees.get(employee.manager);

  if (!manager) {
    return res.status(404).json({ success: false, error: { code: 'MANAGER_NOT_FOUND', message: 'Manager not found' } });
  }

  res.json({ success: true, manager: { id: manager.id, name: `${manager.firstName} ${manager.lastName}`, title: manager.title } });
}));

// ==================== STATISTICS API ====================

/** GET /api/statistics - Get employee statistics (HR only) */
app.get('/api/statistics', requireAuth, requireRole('admin', 'superadmin', 'hr'), asyncHandler(async (req, res) => {
  const allEmployees = Array.from(employees.values());

  const stats = {
    total: allEmployees.length,
    active: allEmployees.filter(e => e.status === 'active').length,
    onboarding: allEmployees.filter(e => e.status === 'onboarding').length,
    byDepartment: {},
    byLevel: {},
    byStatus: {},
    avgHealth: { overall: 0, engagement: 0, productivity: 0, satisfaction: 0 },
    topSkills: [],
    avgTenure: '0 years'
  };

  allEmployees.forEach(emp => {
    stats.byDepartment[emp.department] = (stats.byDepartment[emp.department] || 0) + 1;
    stats.byLevel[emp.level] = (stats.byLevel[emp.level] || 0) + 1;
    stats.byStatus[emp.status] = (stats.byStatus[emp.status] || 0) + 1;

    if (emp.health) {
      stats.avgHealth.overall += emp.health.overall || 0;
      stats.avgHealth.engagement += emp.health.engagement || 0;
      stats.avgHealth.productivity += emp.health.productivity || 0;
      stats.avgHealth.satisfaction += emp.health.satisfaction || 0;
    }
  });

  const count = allEmployees.length;
  if (count > 0) {
    stats.avgHealth.overall = Math.round(stats.avgHealth.overall / count);
    stats.avgHealth.engagement = Math.round(stats.avgHealth.engagement / count);
    stats.avgHealth.productivity = Math.round(stats.avgHealth.productivity / count);
    stats.avgHealth.satisfaction = Math.round(stats.avgHealth.satisfaction / count);
  }

  // Top skills
  const skillCounts = {};
  allEmployees.forEach(emp => {
    (emp.skills || []).forEach(skill => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });
  stats.topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  res.json({ success: true, statistics: stats });
}));

// ==================== HELPERS ====================

function sanitizeEmployee(employee) {
  // Remove sensitive fields for non-authorized users
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    department: employee.department,
    title: employee.title,
    level: employee.level,
    status: employee.status,
    type: employee.type,
    location: employee.location,
    skills: employee.skills,
    languages: employee.languages,
    hireDate: employee.hireDate,
    startDate: employee.startDate,
    health: employee.health,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt
  };
}

// ==================== HEALTH ENDPOINTS ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      employees: employees.size,
      active: Array.from(employees.values()).filter(e => e.status === 'active').length,
      performances: performances.size,
      certifications: certifications.size
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: SERVICE_NAME });
});

// ==================== ERROR HANDLING ====================

// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'employee',
  store: typeof employees !== 'undefined' ? employees : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: employees.size }),
})

app.use(notFoundHandler);
app.use(errorHandler);

// ==================== START ====================


;
const server = app.listen(PORT, () => {
  logger.info(`👤 Employee Twin Service v2.0 running on port ${PORT}`);
  logger.info(`   Employees: ${employees.size}`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
