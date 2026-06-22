/**
 * CorpPerks Routes
 * Benefits, Employees, HRIS
 */

const express = require('express');
const router = express.Router();

// In-memory stores
const benefitsStore = [
  { id: 'B001', name: 'Meal Allowance', type: 'meal', amount: 2000, frequency: 'monthly', status: 'active' },
  { id: 'B002', name: 'Travel Allowance', type: 'travel', amount: 10000, frequency: 'monthly', status: 'active' },
  { id: 'B003', name: 'Wellness Budget', type: 'wellness', amount: 3000, frequency: 'monthly', status: 'active' },
  { id: 'B004', name: 'Learning Fund', type: 'learning', amount: 5000, frequency: 'yearly', status: 'active' },
  { id: 'B005', name: 'Gift Budget', type: 'gift', amount: 2500, frequency: 'yearly', status: 'active' },
];

const employeesStore = [
  { id: 'E001', employeeId: 'EMP001', name: 'John Doe', email: 'john@company.com', phone: '+919876543210', department: 'Engineering', level: 'L3', status: 'enrolled', benefits: ['B001', 'B002', 'B003'] },
  { id: 'E002', employeeId: 'EMP002', name: 'Jane Smith', email: 'jane@company.com', phone: '+919876543211', department: 'Marketing', level: 'L4', status: 'enrolled', benefits: ['B001', 'B002', 'B004'] },
  { id: 'E003', employeeId: 'EMP003', name: 'Bob Wilson', email: 'bob@company.com', phone: '+919876543212', department: 'Sales', level: 'L2', status: 'pending', benefits: [] },
];

// Auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// ============ BENEFITS ============

// GET /api/corp/benefits
router.get('/benefits', (req, res) => {
  res.json({ success: true, data: benefitsStore });
});

// POST /api/corp/benefits
router.post('/benefits', requireAuth, (req, res) => {
  const { name, type, amount, frequency } = req.body;
  const benefit = {
    id: `B${Date.now()}`,
    name, type, amount, frequency,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  benefitsStore.push(benefit);
  res.status(201).json({ success: true, data: benefit });
});

// GET /api/corp/benefits/:id
router.get('/benefits/:id', (req, res) => {
  const benefit = benefitsStore.find(b => b.id === req.params.id);
  if (!benefit) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: benefit });
});

// PUT /api/corp/benefits/:id
router.put('/benefits/:id', requireAuth, (req, res) => {
  const idx = benefitsStore.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  benefitsStore[idx] = { ...benefitsStore[idx], ...req.body };
  res.json({ success: true, data: benefitsStore[idx] });
});

// DELETE /api/corp/benefits/:id
router.delete('/benefits/:id', requireAuth, (req, res) => {
  const idx = benefitsStore.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  benefitsStore.splice(idx, 1);
  res.json({ success: true, message: 'Deleted' });
});

// ============ EMPLOYEES ============

// GET /api/corp/employees
router.get('/employees', (req, res) => {
  const { status, department } = req.query;
  let employees = employeesStore;
  if (status) employees = employees.filter(e => e.status === status);
  if (department) employees = employees.filter(e => e.department === department);
  res.json({ success: true, data: employees });
});

// POST /api/corp/employees
router.post('/employees', requireAuth, (req, res) => {
  const { name, email, phone, department, level } = req.body;
  const employee = {
    id: `E${Date.now()}`,
    employeeId: `EMP${String(employeesStore.length + 1).padStart(3, '0')}`,
    name, email, phone, department, level,
    status: 'pending',
    benefits: [],
    createdAt: new Date().toISOString(),
  };
  employeesStore.push(employee);
  res.status(201).json({ success: true, data: employee });
});

// GET /api/corp/employees/:id
router.get('/employees/:id', (req, res) => {
  const employee = employeesStore.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: employee });
});

// POST /api/corp/employees/:id/benefits
router.post('/employees/:id/benefits', requireAuth, (req, res) => {
  const { benefitIds } = req.body;
  const employee = employeesStore.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Not found' });
  employee.benefits = benefitIds;
  employee.status = 'enrolled';
  res.json({ success: true, data: employee });
});

// ============ MY PROFILE ============

// GET /api/corp/me
router.get('/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'E001',
      employeeId: 'EMP001',
      name: 'John Doe',
      email: 'john@company.com',
      department: 'Engineering',
      level: 'L3',
      company: 'TechCorp',
      companyId: 'C001',
    }
  });
});

// GET /api/corp/me/benefits
router.get('/me/benefits', (req, res) => {
  const employee = employeesStore.find(e => e.id === 'E001');
  const benefits = benefitsStore.filter(b => employee?.benefits.includes(b.id));
  res.json({ success: true, data: benefits });
});

// GET /api/corp/me/usage
router.get('/me/usage', (req, res) => {
  res.json({
    success: true,
    data: {
      meal: { allocated: 2000, used: 500, remaining: 1500 },
      travel: { allocated: 10000, used: 2000, remaining: 8000 },
      wellness: { allocated: 3000, used: 0, remaining: 3000 },
      learning: { allocated: 5000, used: 1500, remaining: 3500 },
    }
  });
});

module.exports = router;
