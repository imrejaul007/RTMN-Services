/**
 * CorpPerks HRIS Integration Routes
 * GreytHR, BambooHR, Zoho People, SAP SuccessFactors
 */

const express = require('express');
const router = express.Router();

// Supported HRIS providers
const PROVIDERS = {
  greythr: {
    name: 'GreytHR',
    apiVersion: 'v1',
    baseUrl: 'https://api.greythr.com',
  },
  bamboohr: {
    name: 'BambooHR',
    apiVersion: 'v1',
    baseUrl: 'https://api.bamboohr.com',
  },
  zoho: {
    name: 'Zoho People',
    apiVersion: 'v1',
    baseUrl: 'https://people.zoho.com',
  },
};

// In-memory sync status
const syncStatus = {
  greythr: { lastSync: null, status: 'disconnected', employees: 0 },
  bamboohr: { lastSync: null, status: 'disconnected', employees: 0 },
  zoho: { lastSync: null, status: 'disconnected', employees: 0 },
};

// Demo employees
const demoEmployees = [
  { id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@company.com', department: 'Engineering', designation: 'Senior Developer', status: 'Active', dateOfJoining: '2024-01-15' },
  { id: 'EMP002', firstName: 'Jane', lastName: 'Smith', email: 'jane@company.com', department: 'Marketing', designation: 'Marketing Manager', status: 'Active', dateOfJoining: '2023-06-01' },
  { id: 'EMP003', firstName: 'Bob', lastName: 'Wilson', email: 'bob@company.com', department: 'Sales', designation: 'Sales Executive', status: 'Active', dateOfJoining: '2024-03-01' },
  { id: 'EMP004', firstName: 'Alice', lastName: 'Brown', email: 'alice@company.com', department: 'HR', designation: 'HR Manager', status: 'Active', dateOfJoining: '2022-09-15' },
];

// Auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// ============ PROVIDER MANAGEMENT ============

// GET /api/hris/providers
router.get('/providers', (req, res) => {
  const providers = Object.entries(PROVIDERS).map(([key, value]) => ({
    id: key,
    name: value.name,
    connected: syncStatus[key]?.status === 'connected',
    lastSync: syncStatus[key]?.lastSync,
  }));

  res.json({ success: true, data: providers });
});

// GET /api/hris/providers/:id
router.get('/providers/:id', (req, res) => {
  const { id } = req.params;
  if (!PROVIDERS[id]) {
    return res.status(404).json({ success: false, message: 'Provider not found' });
  }

  res.json({
    success: true,
    data: {
      ...PROVIDERS[id],
      id,
      connected: syncStatus[id]?.status === 'connected',
      lastSync: syncStatus[id]?.lastSync,
      employeeCount: syncStatus[id]?.employees || 0,
    },
  });
});

// ============ CONNECTION MANAGEMENT ============

// POST /api/hris/connect
router.post('/connect', requireAuth, (req, res) => {
  const { provider, apiKey, apiSecret, subdomain } = req.body;

  if (!PROVIDERS[provider]) {
    return res.status(400).json({ success: false, message: 'Invalid provider' });
  }

  if (!apiKey) {
    return res.status(400).json({ success: false, message: 'API key required' });
  }

  // Simulate connection
  syncStatus[provider] = {
    ...syncStatus[provider],
    status: 'connected',
    lastSync: new Date().toISOString(),
    config: { apiKey: '***', subdomain },
  };

  res.json({
    success: true,
    data: {
      message: `Connected to ${PROVIDERS[provider].name}`,
      provider,
      status: 'connected',
    },
  });
});

// POST /api/hris/disconnect
router.post('/disconnect', requireAuth, (req, res) => {
  const { provider } = req.body;

  if (syncStatus[provider]) {
    syncStatus[provider].status = 'disconnected';
  }

  res.json({ success: true, message: `Disconnected from ${provider}` });
});

// ============ EMPLOYEE SYNC ============

// GET /api/hris/employees
router.get('/employees', (req, res) => {
  const { provider, department, status } = req.query;
  let employees = demoEmployees;

  if (department) {
    employees = employees.filter(e => e.department === department);
  }
  if (status) {
    employees = employees.filter(e => e.status === status);
  }

  res.json({
    success: true,
    data: employees,
    count: employees.length,
    syncedAt: new Date().toISOString(),
  });
});

// POST /api/hris/sync
router.post('/sync', requireAuth, async (req, res) => {
  const { provider } = req.body;

  if (!syncStatus[provider] || syncStatus[provider].status !== 'connected') {
    return res.status(400).json({ success: false, message: 'Provider not connected' });
  }

  // Simulate sync
  await new Promise(resolve => setTimeout(resolve, 2000));

  syncStatus[provider].lastSync = new Date().toISOString();
  syncStatus[provider].employees = demoEmployees.length;

  res.json({
    success: true,
    data: {
      message: `Synced ${demoEmployees.length} employees from ${PROVIDERS[provider].name}`,
      provider,
      employeesUpdated: demoEmployees.length,
      syncedAt: syncStatus[provider].lastSync,
    },
  });
});

// GET /api/hris/employees/:id
router.get('/employees/:id', (req, res) => {
  const employee = demoEmployees.find(e => e.id === req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  res.json({ success: true, data: employee });
});

// ============ AUTO-ENROLLMENT ============

// POST /api/hris/auto-enroll
router.post('/auto-enroll', requireAuth, (req, res) => {
  const { provider, defaultBenefits } = req.body;

  const enrollments = demoEmployees.map(emp => ({
    employeeId: emp.id,
    name: `${emp.firstName} ${emp.lastName}`,
    status: 'enrolled',
    benefits: defaultBenefits || ['B001', 'B002', 'B003'],
    enrolledAt: new Date().toISOString(),
  }));

  res.json({
    success: true,
    data: {
      message: `Auto-enrolled ${enrollments.length} employees`,
      provider,
      enrollments,
    },
  });
});

// ============ WEBHOOK HANDLERS ============

// POST /api/hris/webhook/greythr
router.post('/webhook/greythr', (req, res) => {
  const { event, data } = req.body;

  if (event === 'employee.added') {
    // Auto-enroll new employee
    console.log('[HRIS] New employee:', data);
  } else if (event === 'employee.updated') {
    // Update employee benefits
    console.log('[HRIS] Employee updated:', data);
  } else if (event === 'employee.terminated') {
    // Suspend employee
    console.log('[HRIS] Employee terminated:', data);
  }

  res.json({ success: true, received: true });
});

// POST /api/hris/webhook/bamboohr
router.post('/webhook/bamboohr', (req, res) => {
  const { type, data } = req.body;

  if (type === 'employeeCreated') {
    console.log('[HRIS] New employee:', data);
  } else if (type === 'employeeUpdated') {
    console.log('[HRIS] Employee updated:', data);
  }

  res.json({ success: true, received: true });
});

// POST /api/hris/webhook/zoho
router.post('/webhook/zoho', (req, res) => {
  const { payload } = req.body;

  if (payload?.event === 'employee.onAdd') {
    console.log('[HRIS] New employee:', payload.data);
  } else if (payload?.event === 'employee.onDelete') {
    console.log('[HRIS] Employee deleted:', payload.data);
  }

  res.json({ success: true, received: true });
});

// ============ SYNC STATUS ============

// GET /api/hris/sync-status
router.get('/sync-status', (req, res) => {
  res.json({
    success: true,
    data: syncStatus,
  });
});

module.exports = router;
