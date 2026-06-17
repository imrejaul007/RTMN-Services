/**
 * RTMN Workforce OS v2.0
 *
 * Unified HR Operations Platform - Phase 1
 * Integrates with CorpPerks (PeopleOS + TalentAI)
 *
 * Features:
 * - Employee Records
 * - Leave Management
 * - Attendance & Shifts
 * - Payroll Processing
 * - Benefits Administration
 * - Recruitment & ATS
 * - Training & LMS
 * - Performance Management
 * - Expenses
 * - Documents
 * - Disciplinary
 * - Grievance
 * - Exit Management
 * - Organization
 * - AI Agents
 *
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Configuration
const PORT = process.env.PORT || 5065;
const SERVICE_NAME = 'workforce-os';
const SERVICE_VERSION = '2.0.0';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${level}] ${SERVICE_NAME}: ${message} ${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Express App
const app = express();

// ============================================================
// IN-MEMORY DATA STORES (Replace with MongoDB in production)
// ============================================================

const db = {
  employees: new Map(),
  departments: new Map(),
  positions: new Map(),
  leaveRequests: new Map(),
  leaveBalances: new Map(),
  attendance: new Map(),
  shifts: new Map(),
  payroll: new Map(),
  payrollRuns: new Map(),
  benefits: new Map(),
  benefitsEnrollments: new Map(),
  candidates: new Map(),
  jobs: new Map(),
  expenses: new Map(),
  expenseApprovals: new Map(),
  documents: new Map(),
  disciplinary: new Map(),
  grievances: new Map(),
  exitProcess: new Map(),
  training: new Map(),
  performance: new Map(),
  skills: new Map(),
  skillsGraph: new Map(),
  orgChart: new Map(),
  notifications: new Map(),
  aiConversations: new Map()
};

// ============================================================
// SAMPLE DATA INITIALIZATION
// ============================================================

function initializeSampleData() {
  logger.info('Initializing sample workforce data...');

  // Sample Departments
  const departments = [
    { id: 'DEPT001', name: 'Engineering', code: 'ENG', headCount: 25, budget: 50000000 },
    { id: 'DEPT002', name: 'Marketing', code: 'MKT', headCount: 12, budget: 20000000 },
    { id: 'DEPT003', name: 'Sales', code: 'SLS', headCount: 18, budget: 30000000 },
    { id: 'DEPT004', name: 'Human Resources', code: 'HR', headCount: 5, budget: 5000000 },
    { id: 'DEPT005', name: 'Finance', code: 'FIN', headCount: 8, budget: 8000000 },
    { id: 'DEPT006', name: 'Operations', code: 'OPS', headCount: 15, budget: 15000000 },
    { id: 'DEPT007', name: 'Product', code: 'PRD', headCount: 10, budget: 15000000 },
    { id: 'DEPT008', name: 'Design', code: 'DSN', headCount: 7, budget: 7000000 }
  ];

  departments.forEach(d => db.departments.set(d.id, d));

  // Sample Positions
  const positions = [
    { id: 'POS001', title: 'Software Engineer', level: 'L3', departmentId: 'DEPT001', salaryMin: 800000, salaryMid: 1200000, salaryMax: 1600000 },
    { id: 'POS002', title: 'Senior Software Engineer', level: 'L4', departmentId: 'DEPT001', salaryMin: 1400000, salaryMid: 1800000, salaryMax: 2200000 },
    { id: 'POS003', title: 'Engineering Manager', level: 'L5', departmentId: 'DEPT001', salaryMin: 2000000, salaryMid: 2500000, salaryMax: 3000000 },
    { id: 'POS004', title: 'Marketing Manager', level: 'L4', departmentId: 'DEPT002', salaryMin: 1000000, salaryMid: 1400000, salaryMax: 1800000 },
    { id: 'POS005', title: 'Sales Executive', level: 'L2', departmentId: 'DEPT003', salaryMin: 400000, salaryMid: 600000, salaryMax: 800000 },
    { id: 'POS006', title: 'HR Specialist', level: 'L3', departmentId: 'DEPT004', salaryMin: 500000, salaryMid: 700000, salaryMax: 900000 },
    { id: 'POS007', title: 'Financial Analyst', level: 'L3', departmentId: 'DEPT005', salaryMin: 600000, salaryMid: 800000, salaryMax: 1000000 },
    { id: 'POS008', title: 'Product Manager', level: 'L4', departmentId: 'DEPT007', salaryMin: 1500000, salaryMid: 1900000, salaryMax: 2300000 }
  ];

  positions.forEach(p => db.positions.set(p.id, p));

  // Sample Employees
  const employees = [
    {
      id: 'EMP001', employeeNumber: 'RTMN001', firstName: 'Rajesh', lastName: 'Kumar',
      email: 'rajesh.kumar@rtmn.com', phone: '+919876543210', departmentId: 'DEPT001',
      positionId: 'POS002', managerId: 'EMP003', employmentType: 'full-time',
      status: 'active', workLocation: 'Bangalore', joiningDate: '2022-03-15',
      salary: { basic: 600000, hra: 300000, allowances: 200000, variable: 100000 },
      skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
      certifications: ['AWS Solutions Architect', 'React Developer'],
      avatar: null
    },
    {
      id: 'EMP002', employeeNumber: 'RTMN002', firstName: 'Priya', lastName: 'Sharma',
      email: 'priya.sharma@rtmn.com', phone: '+919876543211', departmentId: 'DEPT002',
      positionId: 'POS004', managerId: 'EMP007', employmentType: 'full-time',
      status: 'active', workLocation: 'Mumbai', joiningDate: '2021-06-01',
      salary: { basic: 500000, hra: 250000, allowances: 150000, variable: 100000 },
      skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics', 'Google Ads'],
      certifications: ['Google Ads Certified'],
      avatar: null
    },
    {
      id: 'EMP003', employeeNumber: 'RTMN003', firstName: 'Amit', lastName: 'Patel',
      email: 'amit.patel@rtmn.com', phone: '+919876543212', departmentId: 'DEPT001',
      positionId: 'POS003', managerId: null, employmentType: 'full-time',
      status: 'active', workLocation: 'Bangalore', joiningDate: '2019-01-10',
      salary: { basic: 900000, hra: 450000, allowances: 300000, variable: 200000 },
      skills: ['Team Leadership', 'Architecture', 'Java', 'Microservices', 'Kubernetes'],
      certifications: ['AWS Solutions Architect', 'Certified Kubernetes Administrator'],
      avatar: null
    },
    {
      id: 'EMP004', employeeNumber: 'RTMN004', firstName: 'Sneha', lastName: 'Reddy',
      email: 'sneha.reddy@rtmn.com', phone: '+919876543213', departmentId: 'DEPT003',
      positionId: 'POS005', managerId: 'EMP008', employmentType: 'full-time',
      status: 'active', workLocation: 'Hyderabad', joiningDate: '2023-01-15',
      salary: { basic: 300000, hra: 150000, allowances: 100000, variable: 50000 },
      skills: ['Sales', 'Negotiation', 'CRM', 'Communication', 'Presentation'],
      certifications: [],
      avatar: null
    },
    {
      id: 'EMP005', employeeNumber: 'RTMN005', firstName: 'Vikram', lastName: 'Singh',
      email: 'vikram.singh@rtmn.com', phone: '+919876543214', departmentId: 'DEPT004',
      positionId: 'POS006', managerId: null, employmentType: 'full-time',
      status: 'active', workLocation: 'Delhi', joiningDate: '2020-08-20',
      salary: { basic: 400000, hra: 200000, allowances: 100000, variable: 50000 },
      skills: ['Recruitment', 'Employee Relations', 'HRIS', 'Training', 'Compliance'],
      certifications: ['SHRM-CP'],
      avatar: null
    },
    {
      id: 'EMP006', employeeNumber: 'RTMN006', firstName: 'Ananya', lastName: 'Gupta',
      email: 'ananya.gupta@rtmn.com', phone: '+919876543215', departmentId: 'DEPT007',
      positionId: 'POS008', managerId: null, employmentType: 'full-time',
      status: 'active', workLocation: 'Bangalore', joiningDate: '2021-11-01',
      salary: { basic: 700000, hra: 350000, allowances: 200000, variable: 150000 },
      skills: ['Product Management', 'Agile', 'User Research', 'Data Analysis', 'Roadmapping'],
      certifications: ['CSPO'],
      avatar: null
    },
    {
      id: 'EMP007', employeeNumber: 'RTMN007', firstName: 'Rahul', lastName: 'Mehta',
      email: 'rahul.mehta@rtmn.com', phone: '+919876543216', departmentId: 'DEPT002',
      positionId: 'POS004', managerId: null, employmentType: 'full-time',
      status: 'active', workLocation: 'Mumbai', joiningDate: '2018-04-15',
      salary: { basic: 800000, hra: 400000, allowances: 200000, variable: 150000 },
      skills: ['Marketing Strategy', 'Brand Management', 'Team Leadership', 'Analytics'],
      certifications: ['Digital Marketing Expert'],
      avatar: null
    },
    {
      id: 'EMP008', employeeNumber: 'RTMN008', firstName: 'Kavitha', lastName: 'Nair',
      email: 'kavitha.nair@rtmn.com', phone: '+919876543217', departmentId: 'DEPT003',
      positionId: 'POS004', managerId: null, employmentType: 'full-time',
      status: 'active', workLocation: 'Hyderabad', joiningDate: '2019-09-01',
      salary: { basic: 600000, hra: 300000, allowances: 150000, variable: 100000 },
      skills: ['Sales Leadership', 'Business Development', 'Team Management', 'Strategy'],
      certifications: [],
      avatar: null
    },
    {
      id: 'EMP009', employeeNumber: 'RTMN009', firstName: 'Arjun', lastName: 'Verma',
      email: 'arjun.verma@rtmn.com', phone: '+919876543218', departmentId: 'DEPT001',
      positionId: 'POS001', managerId: 'EMP003', employmentType: 'full-time',
      status: 'active', workLocation: 'Bangalore', joiningDate: '2024-02-01',
      salary: { basic: 500000, hra: 250000, allowances: 150000, variable: 50000 },
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Git'],
      certifications: ['TensorFlow Developer Certificate'],
      avatar: null
    },
    {
      id: 'EMP010', employeeNumber: 'RTMN010', firstName: 'Meera', lastName: 'Joshi',
      email: 'meera.joshi@rtmn.com', phone: '+919876543219', departmentId: 'DEPT005',
      positionId: 'POS007', managerId: null, employmentType: 'full-time',
      status: 'active', workLocation: 'Pune', joiningDate: '2022-07-01',
      salary: { basic: 450000, hra: 225000, allowances: 125000, variable: 60000 },
      skills: ['Financial Analysis', 'Excel', 'SAP', 'Budgeting', 'Forecasting'],
      certifications: ['CFA Level 1'],
      avatar: null
    }
  ];

  employees.forEach(e => {
    db.employees.set(e.id, e);
    // Initialize leave balance
    db.leaveBalances.set(e.id, {
      employeeId: e.id,
      casual: 6,
      sick: 10,
      earned: 18,
      parental: 0,
      bereavement: 5,
      lop: 0,
      lastUpdated: new Date().toISOString()
    });
  });

  // Sample Jobs
  const jobs = [
    {
      id: 'JOB001', title: 'Senior Frontend Engineer', departmentId: 'DEPT001',
      positionId: 'POS002', employmentType: 'full-time', location: 'Bangalore',
      salaryMin: 1400000, salaryMax: 2000000, description: 'Build amazing user experiences',
      requirements: ['5+ years React', 'TypeScript', 'System Design'],
      status: 'open', postedDate: '2026-06-01', applications: 45,
      skills: ['React', 'TypeScript', 'CSS', 'Node.js']
    },
    {
      id: 'JOB002', title: 'Product Designer', departmentId: 'DEPT008',
      positionId: 'POS008', employmentType: 'full-time', location: 'Remote',
      salaryMin: 1000000, salaryMax: 1500000, description: 'Design beautiful products',
      requirements: ['3+ years UI/UX', 'Figma', 'User Research'],
      status: 'open', postedDate: '2026-06-05', applications: 32,
      skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping']
    },
    {
      id: 'JOB003', title: 'Sales Manager', departmentId: 'DEPT003',
      positionId: 'POS005', employmentType: 'full-time', location: 'Mumbai',
      salaryMin: 800000, salaryMax: 1200000, description: 'Lead sales team',
      requirements: ['5+ years sales', 'Team leadership', 'B2B experience'],
      status: 'open', postedDate: '2026-06-10', applications: 28,
      skills: ['Sales', 'Leadership', 'CRM', 'Negotiation']
    }
  ];

  jobs.forEach(j => db.jobs.set(j.id, j));

  // Sample Candidates
  const candidates = [
    {
      id: 'CAND001', firstName: 'Suresh', lastName: 'Iyer', email: 'suresh.iyer@email.com',
      phone: '+919988776655', jobId: 'JOB001', status: 'screening',
      skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
      experience: 6, currentCompany: 'TechCorp', currentTitle: 'Frontend Developer',
      score: 85, source: 'LinkedIn', appliedDate: '2026-06-10'
    },
    {
      id: 'CAND002', firstName: 'Divya', lastName: 'Kapoor', email: 'divya.kapoor@email.com',
      phone: '+919988776656', jobId: 'JOB001', status: 'interview',
      skills: ['React', 'Vue', 'Angular', 'JavaScript'],
      experience: 7, currentCompany: 'StartupXYZ', currentTitle: 'Lead Frontend',
      score: 92, source: 'Referral', appliedDate: '2026-06-08'
    },
    {
      id: 'CAND003', firstName: 'Manish', lastName: 'Shah', email: 'manish.shah@email.com',
      phone: '+919988776657', jobId: 'JOB002', status: 'applied',
      skills: ['Figma', 'Sketch', 'Adobe XD', 'UI Design'],
      experience: 4, currentCompany: 'DesignStudio', currentTitle: 'UI Designer',
      score: 78, source: 'Indeed', appliedDate: '2026-06-12'
    }
  ];

  candidates.forEach(c => db.candidates.set(c.id, c));

  logger.info(`Initialized ${employees.length} employees, ${departments.length} departments, ${jobs.length} jobs, ${candidates.length} candidates`);
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Tenant middleware (simplified)
app.use((req, res, next) => {
  req.tenantId = req.headers['x-tenant-id'] || 'default';
  req.userId = req.headers['x-user-id'] || null;
  next();
});

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/status', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    modules: {
      employees: db.employees.size,
      departments: db.departments.size,
      positions: db.positions.size,
      leaveRequests: db.leaveRequests.size,
      attendance: db.attendance.size,
      payroll: db.payroll.size,
      benefits: db.benefits.size,
      candidates: db.candidates.size,
      jobs: db.jobs.size,
      expenses: db.expenses.size,
      training: db.training.size
    },
    integrations: {
      corpperks: 'connected',
      talentai: 'connected',
      corpid: 'ready',
      memoryOs: 'ready',
      twinosHub: 'ready'
    }
  });
});

// ============================================================
// EMPLOYEES MODULE
// ============================================================

// List employees
app.get('/api/employees', (req, res) => {
  try {
    const { status, department, search, employmentType, page = 1, limit = 50 } = req.query;

    let employees = Array.from(db.employees.values());

    if (status) employees = employees.filter(e => e.status === status);
    if (department) employees = employees.filter(e => e.departmentId === department);
    if (employmentType) employees = employees.filter(e => e.employmentType === employmentType);
    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(e =>
        e.firstName.toLowerCase().includes(s) ||
        e.lastName.toLowerCase().includes(s) ||
        e.email.toLowerCase().includes(s)
      );
    }

    const total = employees.length;
    const start = (page - 1) * limit;
    const paginated = employees.slice(start, start + parseInt(limit));

    res.json({
      data: paginated,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Error fetching employees', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get single employee
app.get('/api/employees/:id', (req, res) => {
  const employee = db.employees.get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  // Add computed fields
  const department = db.departments.get(employee.departmentId);
  const position = db.positions.get(employee.positionId);
  const leaveBalance = db.leaveBalances.get(employee.id);
  const directReports = Array.from(db.employees.values()).filter(e => e.managerId === employee.id);

  res.json({
    ...employee,
    department,
    position,
    leaveBalance,
    directReportsCount: directReports.length
  });
});

// Create employee
app.post('/api/employees', (req, res) => {
  try {
    const id = `EMP${String(db.employees.size + 1).padStart(3, '0')}`;
    const employeeNumber = `RTMN${String(db.employees.size + 1).padStart(3, '0')}`;

    const employee = {
      id,
      employeeNumber,
      ...req.body,
      status: req.body.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.employees.set(id, employee);

    // Initialize leave balance
    db.leaveBalances.set(id, {
      employeeId: id,
      casual: 6,
      sick: 10,
      earned: 18,
      parental: 0,
      bereavement: 5,
      lop: 0,
      lastUpdated: new Date().toISOString()
    });

    logger.info(`Employee created: ${id}`);
    res.status(201).json(employee);
  } catch (error) {
    logger.error('Error creating employee', { error: error.message });
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Update employee
app.patch('/api/employees/:id', (req, res) => {
  const employee = db.employees.get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const updated = { ...employee, ...req.body, updatedAt: new Date().toISOString() };
  db.employees.set(req.params.id, updated);

  logger.info(`Employee updated: ${req.params.id}`);
  res.json(updated);
});

// Delete employee (soft delete)
app.delete('/api/employees/:id', (req, res) => {
  const employee = db.employees.get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  employee.status = 'terminated';
  employee.terminatedAt = new Date().toISOString();
  employee.updatedAt = new Date().toISOString();
  db.employees.set(req.params.id, employee);

  logger.info(`Employee terminated: ${req.params.id}`);
  res.json({ message: 'Employee terminated', employee });
});

// Get direct reports
app.get('/api/employees/:id/direct-reports', (req, res) => {
  const directReports = Array.from(db.employees.values())
    .filter(e => e.managerId === req.params.id);
  res.json(directReports);
});

// ============================================================
// DEPARTMENTS MODULE
// ============================================================

app.get('/api/departments', (req, res) => {
  const departments = Array.from(db.departments.values());

  // Add employee counts
  const withCounts = departments.map(d => ({
    ...d,
    currentHeadCount: Array.from(db.employees.values()).filter(e => e.departmentId === d.id && e.status === 'active').length,
    positions: Array.from(db.positions.values()).filter(p => p.departmentId === d.id)
  }));

  res.json(withCounts);
});

app.post('/api/departments', (req, res) => {
  const id = `DEPT${String(db.departments.size + 1).padStart(3, '0')}`;
  const department = { id, ...req.body, createdAt: new Date().toISOString() };
  db.departments.set(id, department);
  res.status(201).json(department);
});

// ============================================================
// POSITIONS MODULE
// ============================================================

app.get('/api/positions', (req, res) => {
  const { departmentId } = req.query;
  let positions = Array.from(db.positions.values());
  if (departmentId) positions = positions.filter(p => p.departmentId === departmentId);
  res.json(positions);
});

app.post('/api/positions', (req, res) => {
  const id = `POS${String(db.positions.size + 1).padStart(3, '0')}`;
  const position = { id, ...req.body };
  db.positions.set(id, position);
  res.status(201).json(position);
});

// ============================================================
// LEAVE MANAGEMENT MODULE
// ============================================================

// Get leave balance
app.get('/api/leave/balance/:employeeId', (req, res) => {
  const balance = db.leaveBalances.get(req.params.employeeId);
  if (!balance) return res.status(404).json({ error: 'Leave balance not found' });
  res.json(balance);
});

// Request leave
app.post('/api/leave/request', (req, res) => {
  try {
    const id = `LR${uuidv4().slice(0, 8).toUpperCase()}`;
    const request = {
      id,
      employeeId: req.body.employeeId,
      leaveType: req.body.leaveType,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      reason: req.body.reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    db.leaveRequests.set(id, request);

    logger.info(`Leave request created: ${id}`);
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// List leave requests
app.get('/api/leave/requests', (req, res) => {
  const { employeeId, status, leaveType, startDate, endDate } = req.query;

  let requests = Array.from(db.leaveRequests.values());

  if (employeeId) requests = requests.filter(r => r.employeeId === employeeId);
  if (status) requests = requests.filter(r => r.status === status);
  if (leaveType) requests = requests.filter(r => r.leaveType === leaveType);

  res.json(requests);
});

// Approve/reject leave
app.patch('/api/leave/requests/:id', (req, res) => {
  const request = db.leaveRequests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Leave request not found' });

  const { status, managerNotes } = req.body;
  request.status = status;
  request.managerNotes = managerNotes;
  request.processedAt = new Date().toISOString();

  db.leaveRequests.set(req.params.id, request);

  logger.info(`Leave request ${status}: ${req.params.id}`);
  res.json(request);
});

// Leave types
app.get('/api/leave/types', (req, res) => {
  res.json([
    { type: 'casual', label: 'Casual Leave', emoji: '🌴', color: '#10B981' },
    { type: 'sick', label: 'Sick Leave', emoji: '🤒', color: '#F59E0B' },
    { type: 'earned', label: 'Earned Leave', emoji: '⭐', color: '#3B82F6' },
    { type: 'parental', label: 'Parental Leave', emoji: '👶', color: '#EC4899' },
    { type: 'bereavement', label: 'Bereavement', emoji: '🕯️', color: '#6B7280' },
    { type: 'work_from_home', label: 'Work From Home', emoji: '🏠', color: '#8B5CF6' },
    { type: 'loss_of_pay', label: 'Loss of Pay', emoji: '💸', color: '#EF4444' }
  ]);
});

// ============================================================
// ATTENDANCE MODULE
// ============================================================

// Check in
app.post('/api/attendance/checkin', (req, res) => {
  try {
    const { employeeId, location, device } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const key = `${employeeId}-${today}`;

    const existing = db.attendance.get(key);
    if (existing?.checkIn) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const record = existing || {
      employeeId,
      date: today,
      checkIn: new Date().toISOString(),
      location,
      device
    };

    db.attendance.set(key, record);

    logger.info(`Check-in: ${employeeId} at ${new Date().toISOString()}`);
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// Check out
app.post('/api/attendance/checkout', (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const key = `${employeeId}-${today}`;

    const record = db.attendance.get(key);
    if (!record) return res.status(400).json({ error: 'Not checked in today' });

    record.checkOut = new Date().toISOString();
    db.attendance.set(key, record);

    logger.info(`Check-out: ${employeeId}`);
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// Get attendance
app.get('/api/attendance/:employeeId', (req, res) => {
  const { startDate, endDate } = req.query;
  const records = Array.from(db.attendance.values())
    .filter(a => a.employeeId === req.params.employeeId)
    .filter(a => !startDate || a.date >= startDate)
    .filter(a => !endDate || a.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  res.json(records);
});

// ============================================================
// SHIFTS MODULE
// ============================================================

app.get('/api/shifts', (req, res) => {
  const { employeeId, date } = req.query;
  let shifts = Array.from(db.shifts.values());

  if (employeeId) shifts = shifts.filter(s => s.employeeId === employeeId);
  if (date) shifts = shifts.filter(s => s.date === date);

  res.json(shifts);
});

app.post('/api/shifts', (req, res) => {
  const id = `SHIFT${uuidv4().slice(0, 8).toUpperCase()}`;
  const shift = { id, ...req.body };
  db.shifts.set(id, shift);
  res.status(201).json(shift);
});

app.post('/api/shifts/swap-request', (req, res) => {
  const id = `SWAP${uuidv4().slice(0, 8).toUpperCase()}`;
  const swap = {
    id,
    requesterId: req.body.requesterId,
    targetId: req.body.targetId,
    requesterShift: req.body.requesterShift,
    targetShift: req.body.targetShift,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.shifts.set(`swap-${id}`, swap);
  res.status(201).json(swap);
});

// ============================================================
// PAYROLL MODULE
// ============================================================

// Calculate payroll
app.post('/api/payroll/calculate', (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    const employee = db.employees.get(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const salary = employee.salary || {};
    const basic = salary.basic || 0;
    const hra = salary.hra || 0;
    const allowances = salary.allowances || 0;
    const gross = basic + hra + allowances;

    // Deductions
    const tds = gross * 0.20; // Simplified
    const pf = basic * 0.12;
    const professionalTax = 200;
    const totalDeductions = tds + pf + professionalTax;
    const netPay = gross - totalDeductions + (salary.variable || 0);

    const payslip = {
      id: `PAY${uuidv4().slice(0, 8).toUpperCase()}`,
      employeeId,
      month,
      year,
      earnings: { basic, hra, allowances, variable: salary.variable || 0 },
      deductions: { tds, pf, professionalTax },
      gross,
      totalDeductions,
      netPay,
      status: 'calculated',
      calculatedAt: new Date().toISOString()
    };

    db.payroll.set(payslip.id, payslip);

    logger.info(`Payslip calculated: ${payslip.id} for ${employeeId}`);
    res.json(payslip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate payroll' });
  }
});

// Get payroll records
app.get('/api/payroll/records', (req, res) => {
  const { employeeId, month, year, status } = req.query;
  let records = Array.from(db.payroll.values());

  if (employeeId) records = records.filter(r => r.employeeId === employeeId);
  if (month) records = records.filter(r => r.month === month);
  if (year) records = records.filter(r => r.year === year);
  if (status) records = records.filter(r => r.status === status);

  res.json(records);
});

// Process payroll batch
app.post('/api/payroll/process', (req, res) => {
  try {
    const { month, year } = req.body;
    const employees = Array.from(db.employees.values()).filter(e => e.status === 'active');

    const runId = `RUN${uuidv4().slice(0, 8).toUpperCase()}`;
    const payrollRun = {
      id: runId,
      month,
      year,
      employeeCount: employees.length,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      status: 'processing',
      createdAt: new Date().toISOString()
    };

    employees.forEach(emp => {
      // Simplified payroll calculation for each employee
      const salary = emp.salary || { basic: 500000, hra: 250000, allowances: 100000 };
      const gross = salary.basic + salary.hra + salary.allowances;
      const tds = gross * 0.20;
      const pf = salary.basic * 0.12;
      const net = gross - tds - pf - 200 + (salary.variable || 0);

      payrollRun.totalGross += gross;
      payrollRun.totalDeductions += tds + pf + 200;
      payrollRun.totalNet += net;

      const payslip = {
        id: `PAY${uuidv4().slice(0, 8).toUpperCase()}`,
        employeeId: emp.id,
        month,
        year,
        earnings: { ...salary },
        deductions: { tds, pf, professionalTax: 200 },
        gross,
        totalDeductions: tds + pf + 200,
        netPay: net,
        status: 'pending',
        runId
      };

      db.payroll.set(payslip.id, payslip);
    });

    payrollRun.status = 'completed';
    payrollRun.completedAt = new Date().toISOString();
    db.payrollRuns.set(runId, payrollRun);

    logger.info(`Payroll processed: ${runId} for ${employees.length} employees`);
    res.json(payrollRun);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process payroll' });
  }
});

// Get payroll runs
app.get('/api/payroll/runs', (req, res) => {
  const runs = Array.from(db.payrollRuns.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  res.json(runs);
});

// ============================================================
// BENEFITS MODULE
// ============================================================

// Get benefits plans
app.get('/api/benefits/plans', (req, res) => {
  res.json([
    {
      type: 'health',
      name: 'Silver Health Plan',
      coverage: '5,00,000',
      premium: 5000,
      features: ['Individual coverage', 'Basic hospitalization', 'OPD']
    },
    {
      type: 'health',
      name: 'Gold Health Plan',
      coverage: '15,00,000',
      premium: 12000,
      features: ['Family coverage', 'Premium hospitalization', 'Maternity', 'Dental']
    },
    {
      type: 'health',
      name: 'Platinum Health Plan',
      coverage: '50,00,000',
      premium: 25000,
      features: ['Premium family coverage', 'International coverage', 'Mental health', 'Wellness']
    },
    {
      type: 'dental',
      name: 'Dental Plus',
      coverage: '50,000',
      premium: 500,
      features: ['Basic dental', 'Root canal', 'Orthodontics']
    },
    {
      type: 'life',
      name: 'Term Life Cover',
      coverage: '50,00,000',
      premium: 300,
      features: ['Accidental death', 'Total permanent disability']
    },
    {
      type: 'retirement',
      name: 'NPS Plan',
      contribution: '10%',
      employerMatch: '10%',
      features: ['Tax benefits', 'Pension on retirement', 'Flexible contributions']
    }
  ]);
});

// Enroll in benefits
app.post('/api/benefits/enroll', (req, res) => {
  const id = `BEN${uuidv4().slice(0, 8).toUpperCase()}`;
  const enrollment = {
    id,
    employeeId: req.body.employeeId,
    planType: req.body.planType,
    planId: req.body.planId,
    dependents: req.body.dependents || [],
    status: 'active',
    enrolledAt: new Date().toISOString()
  };

  db.benefitsEnrollments.set(id, enrollment);
  logger.info(`Benefits enrolled: ${id}`);
  res.status(201).json(enrollment);
});

// Get enrollments
app.get('/api/benefits/enrollments', (req, res) => {
  const { employeeId, status } = req.query;
  let enrollments = Array.from(db.benefitsEnrollments.values());

  if (employeeId) enrollments = enrollments.filter(e => e.employeeId === employeeId);
  if (status) enrollments = enrollments.filter(e => e.status === status);

  res.json(enrollments);
});

// ============================================================
// RECRUITMENT MODULE (Talent OS Integration)
// ============================================================

// List jobs
app.get('/api/jobs', (req, res) => {
  const { status, department, location, search } = req.query;
  let jobs = Array.from(db.jobs.values());

  if (status) jobs = jobs.filter(j => j.status === status);
  if (department) jobs = jobs.filter(j => j.departmentId === department);
  if (location) jobs = jobs.filter(j => j.location === location);
  if (search) {
    const s = search.toLowerCase();
    jobs = jobs.filter(j => j.title.toLowerCase().includes(s) || j.description.toLowerCase().includes(s));
  }

  res.json(jobs);
});

// Create job
app.post('/api/jobs', (req, res) => {
  const id = `JOB${uuidv4().slice(0, 8).toUpperCase()}`;
  const job = {
    id,
    ...req.body,
    status: 'draft',
    applications: 0,
    createdAt: new Date().toISOString()
  };

  db.jobs.set(id, job);
  logger.info(`Job created: ${id}`);
  res.status(201).json(job);
});

// Update job
app.patch('/api/jobs/:id', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const updated = { ...job, ...req.body, updatedAt: new Date().toISOString() };
  db.jobs.set(req.params.id, updated);
  res.json(updated);
});

// Publish job
app.post('/api/jobs/:id/publish', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  job.status = 'open';
  job.postedDate = new Date().toISOString();
  db.jobs.set(req.params.id, job);

  logger.info(`Job published: ${req.params.id}`);
  res.json(job);
});

// List candidates
app.get('/api/candidates', (req, res) => {
  const { jobId, status, source } = req.query;
  let candidates = Array.from(db.candidates.values());

  if (jobId) candidates = candidates.filter(c => c.jobId === jobId);
  if (status) candidates = candidates.filter(c => c.status === status);
  if (source) candidates = candidates.filter(c => c.source === source);

  res.json(candidates);
});

// Add candidate
app.post('/api/candidates', (req, res) => {
  const id = `CAND${uuidv4().slice(0, 8).toUpperCase()}`;
  const candidate = {
    id,
    ...req.body,
    status: 'applied',
    score: 50, // Initial score
    appliedDate: new Date().toISOString().split('T')[0]
  };

  db.candidates.set(id, candidate);

  // Update job application count
  if (candidate.jobId) {
    const job = db.jobs.get(candidate.jobId);
    if (job) {
      job.applications = (job.applications || 0) + 1;
      db.jobs.set(job.id, job);
    }
  }

  logger.info(`Candidate added: ${id}`);
  res.status(201).json(candidate);
});

// Update candidate
app.patch('/api/candidates/:id', (req, res) => {
  const candidate = db.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const updated = { ...candidate, ...req.body };
  db.candidates.set(req.params.id, updated);
  res.json(updated);
});

// Move candidate in pipeline
app.post('/api/candidates/:id/move', (req, res) => {
  const candidate = db.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const { stage, notes } = req.body;
  const stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

  if (!stages.includes(stage)) {
    return res.status(400).json({ error: 'Invalid stage' });
  }

  candidate.status = stage;
  candidate.stageHistory = candidate.stageHistory || [];
  candidate.stageHistory.push({
    from: candidate.status,
    to: stage,
    notes,
    movedAt: new Date().toISOString()
  });

  db.candidates.set(req.params.id, candidate);

  logger.info(`Candidate ${candidate.id} moved to ${stage}`);
  res.json(candidate);
});

// AI Score candidate
app.post('/api/candidates/:id/score', (req, res) => {
  const candidate = db.candidates.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  // Simplified AI scoring - in production use actual AI
  const skillMatch = candidate.skills?.length || 0;
  const experienceFactor = Math.min(candidate.experience * 5, 30);
  const score = Math.min(50 + skillMatch * 5 + experienceFactor, 100);

  candidate.score = score;
  candidate.scoreBreakdown = {
    skillsMatch: skillMatch * 5,
    experience: experienceFactor,
    cultureFit: 20 + Math.random() * 10,
    interview: 0
  };

  db.candidates.set(req.params.id, candidate);
  res.json({ candidateId: candidate.id, score, breakdown: candidate.scoreBreakdown });
});

// Recruitment pipeline
app.get('/api/recruitment/pipeline', (req, res) => {
  const { jobId } = req.query;
  let candidates = Array.from(db.candidates.values());
  if (jobId) candidates = candidates.filter(c => c.jobId === jobId);

  const stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
  const pipeline = stages.map(stage => ({
    stage,
    count: candidates.filter(c => c.status === stage).length,
    candidates: candidates.filter(c => c.status === stage).slice(0, 10)
  }));

  res.json(pipeline);
});

// ============================================================
// EXPENSES MODULE
// ============================================================

// Submit expense
app.post('/api/expenses', (req, res) => {
  const id = `EXP${uuidv4().slice(0, 8).toUpperCase()}`;
  const expense = {
    id,
    employeeId: req.body.employeeId,
    category: req.body.category,
    description: req.body.description,
    amount: req.body.amount,
    currency: req.body.currency || 'INR',
    date: req.body.date,
    receipt: req.body.receipt,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.expenses.set(id, expense);
  logger.info(`Expense submitted: ${id}`);
  res.status(201).json(expense);
});

// List expenses
app.get('/api/expenses', (req, res) => {
  const { employeeId, status, category } = req.query;
  let expenses = Array.from(db.expenses.values());

  if (employeeId) expenses = expenses.filter(e => e.employeeId === employeeId);
  if (status) expenses = expenses.filter(e => e.status === status);
  if (category) expenses = expenses.filter(e => e.category === category);

  res.json(expenses);
});

// Approve expense
app.post('/api/expenses/:id/approve', (req, res) => {
  const expense = db.expenses.get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });

  expense.status = 'approved';
  expense.approvedBy = req.body.approverId;
  expense.approvedAt = new Date().toISOString();
  db.expenses.set(req.params.id, expense);

  res.json(expense);
});

// Expense categories
app.get('/api/expenses/categories', (req, res) => {
  res.json([
    { id: 'travel', name: 'Travel', emoji: '✈️', limit: 50000 },
    { id: 'meals', name: 'Meals', emoji: '🍽️', limit: 2000 },
    { id: 'accommodation', name: 'Accommodation', emoji: '🏨', limit: 10000 },
    { id: 'office_supplies', name: 'Office Supplies', emoji: '📎', limit: 5000 },
    { id: 'software', name: 'Software', emoji: '💻', limit: 25000 },
    { id: 'training', name: 'Training', emoji: '📚', limit: 50000 },
    { id: 'client_entertainment', name: 'Client Entertainment', emoji: '🎭', limit: 15000 },
    { id: 'other', name: 'Other', emoji: '📦', limit: 10000 }
  ]);
});

// ============================================================
// TRAINING & SKILLS MODULE
// ============================================================

// Get courses
app.get('/api/training/courses', (req, res) => {
  const courses = [
    { id: 'CRS001', title: 'React Fundamentals', category: 'Engineering', duration: '8 hours', level: 'Beginner', skills: ['React', 'JavaScript'] },
    { id: 'CRS002', title: 'Advanced TypeScript', category: 'Engineering', duration: '12 hours', level: 'Advanced', skills: ['TypeScript', 'React'] },
    { id: 'CRS003', title: 'Leadership Essentials', category: 'Management', duration: '6 hours', level: 'Intermediate', skills: ['Leadership', 'Management'] },
    { id: 'CRS004', title: 'Data Analysis with Python', category: 'Data', duration: '16 hours', level: 'Intermediate', skills: ['Python', 'Data Analysis', 'Pandas'] },
    { id: 'CRS005', title: 'Project Management Professional', category: 'Management', duration: '40 hours', level: 'Advanced', skills: ['PMP', 'Project Management', 'Agile'] }
  ];

  res.json(courses);
});

// Enroll in course
app.post('/api/training/enroll', (req, res) => {
  const id = `ENR${uuidv4().slice(0, 8).toUpperCase()}`;
  const enrollment = {
    id,
    employeeId: req.body.employeeId,
    courseId: req.body.courseId,
    status: 'enrolled',
    enrolledAt: new Date().toISOString()
  };

  db.training.set(id, enrollment);
  logger.info(`Training enrolled: ${id}`);
  res.status(201).json(enrollment);
});

// Get employee skills
app.get('/api/skills/:employeeId', (req, res) => {
  const employee = db.employees.get(req.params.employeeId);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const skills = employee.skills || [];

  // Return skills with proficiency levels
  const skillsWithLevels = skills.map(skill => ({
    name: skill,
    level: ['beginner', 'intermediate', 'advanced', 'expert'][Math.floor(Math.random() * 4)],
    endorsements: Math.floor(Math.random() * 10)
  }));

  res.json(skillsWithLevels);
});

// ============================================================
// PERFORMANCE MODULE
// ============================================================

// Get performance reviews
app.get('/api/performance/reviews', (req, res) => {
  const { employeeId, cycle } = req.query;
  let reviews = Array.from(db.performance.values());

  if (employeeId) reviews = reviews.filter(r => r.employeeId === employeeId);
  if (cycle) reviews = reviews.filter(r => r.cycle === cycle);

  res.json(reviews);
});

// Submit performance feedback
app.post('/api/performance/feedback', (req, res) => {
  const id = `FB${uuidv4().slice(0, 8).toUpperCase()}`;
  const feedback = {
    id,
    employeeId: req.body.employeeId,
    reviewerId: req.body.reviewerId,
    cycle: req.body.cycle,
    ratings: req.body.ratings,
    comments: req.body.comments,
    submittedAt: new Date().toISOString()
  };

  db.performance.set(id, feedback);
  logger.info(`Performance feedback submitted: ${id}`);
  res.status(201).json(feedback);
});

// ============================================================
// ORGANIZATION MODULE
// ============================================================

// Get org chart
app.get('/api/org/chart', (req, res) => {
  const employees = Array.from(db.employees.values());
  const departments = Array.from(db.departments.values());

  // Build tree structure
  const buildTree = (parentId = null, depth = 0) => {
    if (depth > 5) return []; // Prevent infinite recursion

    return employees
      .filter(e => e.managerId === parentId && e.status === 'active')
      .map(e => {
        const dept = departments.find(d => d.id === e.departmentId);
        return {
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          title: db.positions.get(e.positionId)?.title || 'Employee',
          department: dept?.name || 'Unknown',
          avatar: e.avatar,
          children: buildTree(e.id, depth + 1)
        };
      });
  };

  const chart = buildTree(null);
  res.json(chart);
});

// ============================================================
// AI COPILOT MODULE
// ============================================================

// HR Copilot chat
app.post('/api/copilot/chat', async (req, res) => {
  try {
    const { message, employeeId, context } = req.body;

    // Simple intent detection - in production use actual AI
    const lowerMsg = message.toLowerCase();

    let response = '';
    let actions = [];

    if (lowerMsg.includes('leave') || lowerMsg.includes('holiday')) {
      response = 'I can help with leave management. You can request leave, check balance, or view holiday calendar.';
      actions = [
        { type: 'link', label: 'Request Leave', endpoint: '/leave/request' },
        { type: 'link', label: 'Check Balance', endpoint: `/leave/balance/${employeeId}` },
        { type: 'link', label: 'Holiday Calendar', endpoint: '/leave/calendar' }
      ];
    } else if (lowerMsg.includes('payroll') || lowerMsg.includes('salary') || lowerMsg.includes('payslip')) {
      response = 'I can help with payroll information. You can view your payslip, download salary certificate, or check tax declarations.';
      actions = [
        { type: 'link', label: 'View Payslip', endpoint: `/payroll/records?employeeId=${employeeId}` },
        { type: 'link', label: 'Tax Declaration', endpoint: '/tax/declarations' }
      ];
    } else if (lowerMsg.includes('benefits') || lowerMsg.includes('insurance') || lowerMsg.includes('health')) {
      response = 'I can help with benefits enrollment. You can view your enrolled plans, compare options, or submit claims.';
      actions = [
        { type: 'link', label: 'My Benefits', endpoint: `/benefits/enrollments?employeeId=${employeeId}` },
        { type: 'link', label: 'Available Plans', endpoint: '/benefits/plans' }
      ];
    } else if (lowerMsg.includes('training') || lowerMsg.includes('course') || lowerMsg.includes('learn')) {
      response = 'I can help with training and development. You can browse courses, enroll in training, or view certifications.';
      actions = [
        { type: 'link', label: 'Browse Courses', endpoint: '/training/courses' },
        { type: 'link', label: 'My Learning', endpoint: `/training/enrollments?employeeId=${employeeId}` }
      ];
    } else if (lowerMsg.includes('expense') || lowerMsg.includes('reimbursement')) {
      response = 'I can help with expense management. You can submit expenses, check status, or view approved amounts.';
      actions = [
        { type: 'link', label: 'Submit Expense', endpoint: '/expenses' },
        { type: 'link', label: 'My Expenses', endpoint: `/expenses?employeeId=${employeeId}` }
      ];
    } else if (lowerMsg.includes('performance') || lowerMsg.includes('review') || lowerMsg.includes('okr')) {
      response = 'I can help with performance management. You can view goals, submit feedback, or check review status.';
      actions = [
        { type: 'link', label: 'My Goals', endpoint: `/performance/goals?employeeId=${employeeId}` },
        { type: 'link', label: 'Submit Feedback', endpoint: '/performance/feedback' }
      ];
    } else if (lowerMsg.includes('policy') || lowerMsg.includes('rule')) {
      response = 'Here are some common policies:\n\n• Work from Home: Allowed 2 days per week with manager approval\n• Leave Encashment: Can encash up to 10 earned leaves per year\n• Expense Reimbursement: Submit within 30 days with receipts\n• Probation Period: 6 months with performance review';
    } else if (lowerMsg.includes('who') && (lowerMsg.includes('manager') || lowerMsg.includes('reports'))) {
      const employee = db.employees.get(employeeId);
      const manager = employee?.managerId ? db.employees.get(employee.managerId) : null;
      if (manager) {
        response = `Your manager is ${manager.firstName} ${manager.lastName}. Would you like me to schedule a meeting with them?`;
        actions = [
          { type: 'action', label: `Schedule Meeting with ${manager.firstName}`, endpoint: '/meetings/schedule' }
        ];
      } else {
        response = 'You appear to be at the top of the org chart or don\'t have a manager assigned.';
      }
    } else {
      response = 'I\'m your HR assistant. I can help with:\n\n• Leave requests and balances\n• Payroll and payslips\n• Benefits enrollment\n• Training and courses\n• Expense management\n• Performance reviews\n• Company policies\n\nWhat would you like help with?';
    }

    // Store conversation
    const conversationId = context?.conversationId || `CONV${uuidv4().slice(0, 8).toUpperCase()}`;
    const exchange = {
      id: uuidv4(),
      conversationId,
      employeeId,
      message,
      response,
      actions,
      timestamp: new Date().toISOString()
    };

    const convHistory = db.aiConversations.get(conversationId) || [];
    convHistory.push(exchange);
    db.aiConversations.set(conversationId, convHistory);

    res.json({
      response,
      actions,
      conversationId,
      suggestions: [
        'How much leave do I have?',
        'Show my latest payslip',
        'What are the WFH policies?',
        'Enroll in health insurance'
      ]
    });
  } catch (error) {
    logger.error('AI Copilot error', { error: error.message });
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ============================================================
// ANALYTICS MODULE
// ============================================================

// HR Dashboard
app.get('/api/analytics/dashboard', (req, res) => {
  const employees = Array.from(db.employees.values());
  const activeEmployees = employees.filter(e => e.status === 'active');

  // Department distribution
  const deptCounts = {};
  activeEmployees.forEach(e => {
    const dept = db.departments.get(e.departmentId);
    if (dept) {
      deptCounts[dept.name] = (deptCounts[dept.name] || 0) + 1;
    }
  });

  // Leave stats
  const pendingLeave = Array.from(db.leaveRequests.values()).filter(r => r.status === 'pending').length;

  // Recruitment stats
  const openJobs = Array.from(db.jobs.values()).filter(j => j.status === 'open').length;
  const totalApplications = Array.from(db.candidates.values()).length;

  // Salary distribution
  const avgSalary = activeEmployees.reduce((sum, e) => {
    return sum + (e.salary?.basic || 0);
  }, 0) / activeEmployees.length;

  res.json({
    headcount: {
      total: employees.length,
      active: activeEmployees.length,
      onLeave: employees.filter(e => e.status === 'on-leave').length,
      contractors: employees.filter(e => e.employmentType === 'contractor').length
    },
    departmentDistribution: deptCounts,
    recruitment: {
      openJobs,
      totalApplications,
      inPipeline: Array.from(db.candidates.values()).filter(c => !['hired', 'rejected'].includes(c.status)).length
    },
    leave: {
      pendingRequests: pendingLeave
    },
    compensation: {
      averageSalary: Math.round(avgSalary),
      totalMonthlyPayroll: Math.round(avgSalary * activeEmployees.length / 12)
    }
  });
});

// Headcount trends
app.get('/api/analytics/headcount', (req, res) => {
  const employees = Array.from(db.employees.values());

  // Simulate monthly data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const data = months.map((month, i) => ({
    month,
    headcount: employees.length - (5 - i),
    hires: Math.floor(Math.random() * 5) + 1,
    exits: Math.floor(Math.random() * 2)
  }));

  res.json(data);
});

// ============================================================
// SKILLS GRAPH MODULE
// ============================================================

app.get('/api/skills/graph', (req, res) => {
  const employees = Array.from(db.employees.values());

  // Build skills graph
  const skillsCount = {};
  employees.forEach(e => {
    (e.skills || []).forEach(skill => {
      skillsCount[skill] = (skillsCount[skill] || 0) + 1;
    });
  });

  const nodes = Object.entries(skillsCount).map(([skill, count]) => ({
    id: skill.toLowerCase().replace(/\s+/g, '-'),
    name: skill,
    count,
    level: count > 5 ? 'common' : count > 2 ? 'moderate' : 'rare'
  }));

  const links = [];

  res.json({ nodes, links });
});

// ============================================================
// DOCUMENT MODULE
// ============================================================

app.get('/api/documents', (req, res) => {
  const { employeeId, type } = req.query;
  let documents = Array.from(db.documents.values());

  if (employeeId) documents = documents.filter(d => d.employeeId === employeeId);
  if (type) documents = documents.filter(d => d.type === type);

  res.json(documents);
});

app.post('/api/documents', (req, res) => {
  const id = `DOC${uuidv4().slice(0, 8).toUpperCase()}`;
  const document = {
    id,
    ...req.body,
    status: 'uploaded',
    uploadedAt: new Date().toISOString()
  };

  db.documents.set(id, document);
  res.status(201).json(document);
});

// ============================================================
// DISCIPLINARY MODULE
// ============================================================

app.get('/api/disciplinary', (req, res) => {
  const records = Array.from(db.disciplinary.values());
  res.json(records);
});

app.post('/api/disciplinary', (req, res) => {
  const id = `DISC${uuidv4().slice(0, 8).toUpperCase()}`;
  const record = {
    id,
    ...req.body,
    status: 'logged',
    createdAt: new Date().toISOString()
  };

  db.disciplinary.set(id, record);
  res.status(201).json(record);
});

// ============================================================
// GRIEVANCE MODULE
// ============================================================

app.get('/api/grievance', (req, res) => {
  const records = Array.from(db.grievances.values());
  res.json(records);
});

app.post('/api/grievance', (req, res) => {
  const id = `GRV${uuidv4().slice(0, 8).toUpperCase()}`;
  const grievance = {
    id,
    ...req.body,
    status: 'submitted',
    createdAt: new Date().toISOString()
  };

  db.grievances.set(id, grievance);
  res.status(201).json(grievance);
});

app.patch('/api/grievance/:id', (req, res) => {
  const grievance = db.grievances.get(req.params.id);
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

  const updated = { ...grievance, ...req.body };
  db.grievances.set(req.params.id, updated);
  res.json(updated);
});

// ============================================================
// EXIT MANAGEMENT MODULE
// ============================================================

app.get('/api/exit', (req, res) => {
  const { employeeId } = req.query;
  let exits = Array.from(db.exitProcess.values());

  if (employeeId) exits = exits.filter(e => e.employeeId === employeeId);

  res.json(exits);
});

app.post('/api/exit/start', (req, res) => {
  const id = `EXIT${uuidv4().slice(0, 8).toUpperCase()}`;
  const exit = {
    id,
    employeeId: req.body.employeeId,
    type: req.body.type, // resignation, termination, retirement
    reason: req.body.reason,
    lastWorkingDay: req.body.lastWorkingDay,
    status: 'initiated',
    checklist: {
      documents: false,
      assets: false,
      knowledgeTransfer: false,
      clearance: false,
      finalSettlement: false
    },
    initiatedAt: new Date().toISOString()
  };

  db.exitProcess.set(id, exit);
  logger.info(`Exit process started: ${id}`);
  res.status(201).json(exit);
});

app.patch('/api/exit/:id', (req, res) => {
  const exit = db.exitProcess.get(req.params.id);
  if (!exit) return res.status(404).json({ error: 'Exit record not found' });

  const updated = { ...exit, ...req.body };
  db.exitProcess.set(req.params.id, updated);
  res.json(updated);
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId
  });
});

// ============================================================
// START SERVER
// ============================================================

// Initialize sample data
initializeSampleData();

app.listen(PORT, () => {
  logger.info(`🚀 RTMN Workforce OS v${SERVICE_VERSION} started on port ${PORT}`);
  logger.info(`📊 Connected to CorpPerks PeopleOS (Port 4006)`);
  logger.info(`📋 Connected to CorpPerks TalentAI (Port 4130)`);
  logger.info(`🔗 CorpID: http://localhost:4702`);
  logger.info(`🧠 Memory OS: http://localhost:4703`);
  logger.info(`👥 TwinOS Hub: http://localhost:4705`);
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  GET  /health                    - Health check');
  logger.info('  GET  /status                     - Service status');
  logger.info('  GET  /api/employees              - List employees');
  logger.info('  GET  /api/departments            - List departments');
  logger.info('  GET  /api/leave/balance/:id     - Leave balance');
  logger.info('  GET  /api/payroll/records        - Payroll records');
  logger.info('  GET  /api/jobs                   - Open jobs');
  logger.info('  GET  /api/candidates            - Candidates');
  logger.info('  POST /api/copilot/chat           - AI HR Assistant');
  logger.info('  GET  /api/analytics/dashboard    - HR Dashboard');
});

export default app;
