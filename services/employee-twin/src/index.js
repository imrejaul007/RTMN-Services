const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4730;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const employees = new Map();
const skills = new Map();
const certifications = new Map();
const performances = new Map();
const syncEvents = new Map();

// Initialize with sample employees
const sampleEmployees = [
  {
    id: 'emp-1',
    employeeId: 'RTMN-001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@rtmn.com',
    phone: '+1-555-0101',
    department: 'Engineering',
    title: 'Senior Software Engineer',
    level: 'L5',
    manager: null,
    status: 'active',
    type: 'full_time',
    location: { city: 'San Francisco', state: 'CA', country: 'USA', remote: true },
    compensation: { salary: 180000, currency: 'USD', bonus: 15 },
    hireDate: '2022-03-15',
    startDate: '2022-03-20',
    avatar: 'john-smith.jpg',
    skills: ['JavaScript', 'React', 'Node.js', 'AWS', 'TypeScript'],
    education: [{ degree: 'BS Computer Science', school: 'MIT', year: 2021 }],
    languages: ['English', 'Spanish'],
    emergencyContact: { name: 'Jane Smith', phone: '+1-555-0102', relationship: 'Spouse' },
    health: {
      overall: 85,
      engagement: 90,
      productivity: 88,
      satisfaction: 82
    },
    metadata: {},
    createdAt: new Date('2022-03-15').toISOString(),
    updatedAt: new Date('2025-06-15').toISOString()
  },
  {
    id: 'emp-2',
    employeeId: 'RTMN-002',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@rtmn.com',
    phone: '+1-555-0103',
    department: 'Sales',
    title: 'Account Executive',
    level: 'L4',
    manager: null,
    status: 'active',
    type: 'full_time',
    location: { city: 'New York', state: 'NY', country: 'USA', remote: false },
    compensation: { salary: 120000, currency: 'USD', bonus: 20 },
    hireDate: '2023-01-10',
    startDate: '2023-01-15',
    avatar: 'sarah-johnson.jpg',
    skills: ['Sales', 'CRM', 'Negotiation', 'Presentation', 'Account Management'],
    education: [{ degree: 'MBA', school: 'NYU', year: 2022 }],
    languages: ['English'],
    emergencyContact: { name: 'Mike Johnson', phone: '+1-555-0104', relationship: 'Spouse' },
    health: {
      overall: 78,
      engagement: 75,
      productivity: 82,
      satisfaction: 80
    },
    metadata: {},
    createdAt: new Date('2023-01-10').toISOString(),
    updatedAt: new Date('2025-06-10').toISOString()
  },
  {
    id: 'emp-3',
    employeeId: 'RTMN-003',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@rtmn.com',
    phone: '+1-555-0105',
    department: 'Marketing',
    title: 'Marketing Director',
    level: 'L6',
    manager: null,
    status: 'active',
    type: 'full_time',
    location: { city: 'San Francisco', state: 'CA', country: 'USA', remote: true },
    compensation: { salary: 200000, currency: 'USD', bonus: 25 },
    hireDate: '2021-06-01',
    startDate: '2021-06-15',
    avatar: 'michael-chen.jpg',
    skills: ['Digital Marketing', 'Strategy', 'Analytics', 'Brand Management', 'Team Leadership'],
    education: [{ degree: 'MBA Marketing', school: 'Stanford', year: 2020 }],
    languages: ['English', 'Mandarin'],
    emergencyContact: { name: 'Lisa Chen', phone: '+1-555-0106', relationship: 'Sister' },
    health: {
      overall: 92,
      engagement: 95,
      productivity: 90,
      satisfaction: 88
    },
    metadata: {},
    createdAt: new Date('2021-06-01').toISOString(),
    updatedAt: new Date('2025-06-12').toISOString()
  }
];

sampleEmployees.forEach(e => employees.set(e.id, e));

// Sample performance records
const samplePerformances = [
  { id: 'perf-1', employeeId: 'emp-1', period: '2025-Q1', score: 4.5, objectives: ['Ship v2.0', 'Mentor team'], achievements: ['Reduced latency 40%', 'Led migration'], status: 'completed' },
  { id: 'perf-2', employeeId: 'emp-2', period: '2025-Q1', score: 4.2, objectives: ['$500K quota', '10 new accounts'], achievements: ['Achieved 115% quota', '2 enterprise deals'], status: 'completed' }
];

samplePerformances.forEach(p => performances.set(p.id, p));

// ==================== EMPLOYEES API ====================

// Get all employees
app.get('/api/employees', (req, res) => {
  const { department, status, type, level, search, skills } = req.query;

  let result = Array.from(employees.values());

  if (department) result = result.filter(e => e.department === department);
  if (status) result = result.filter(e => e.status === status);
  if (type) result = result.filter(e => e.type === type);
  if (level) result = result.filter(e => e.level === level);
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(e =>
      e.firstName.toLowerCase().includes(searchLower) ||
      e.lastName.toLowerCase().includes(searchLower) ||
      e.email.toLowerCase().includes(searchLower) ||
      e.employeeId.toLowerCase().includes(searchLower)
    );
  }
  if (skills) {
    const skillList = skills.split(',').map(s => s.trim());
    result = result.filter(e => skillList.some(skill => e.skills.includes(skill)));
  }

  res.json({ employees: result, total: result.length });
});

// Get single employee
app.get('/api/employees/:id', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json(employee);
});

// Create employee
app.post('/api/employees', (req, res) => {
  const { firstName, lastName, email, department, title, level, type, compensation, hireDate } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'First name, last name, and email are required' });
  }

  const count = employees.size + 1;
  const employee = {
    id: `emp-${uuidv4().slice(0, 8)}`,
    employeeId: `RTMN-${String(count).padStart(3, '0')}`,
    firstName,
    lastName,
    email,
    phone: req.body.phone || '',
    department: department || 'General',
    title: title || 'Employee',
    level: level || 'L1',
    manager: req.body.manager || null,
    status: 'onboarding',
    type: type || 'full_time',
    location: req.body.location || { city: '', state: '', country: 'USA', remote: false },
    compensation: compensation || { salary: 0, currency: 'USD', bonus: 0 },
    hireDate: hireDate || new Date().toISOString().split('T')[0],
    startDate: null,
    avatar: '',
    skills: req.body.skills || [],
    education: req.body.education || [],
    languages: req.body.languages || ['English'],
    emergencyContact: req.body.emergencyContact || {},
    health: { overall: 100, engagement: 100, productivity: 100, satisfaction: 100 },
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  employees.set(employee.id, employee);

  res.status(201).json(employee);
});

// Update employee
app.put('/api/employees/:id', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const fields = ['firstName', 'lastName', 'email', 'phone', 'department', 'title', 'level', 'manager', 'status', 'type', 'location', 'compensation', 'skills', 'languages'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) employee[field] = req.body[field];
  });

  employee.updatedAt = new Date().toISOString();

  res.json(employee);
});

// Delete employee
app.delete('/api/employees/:id', (req, res) => {
  if (!employees.has(req.params.id)) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  employees.delete(req.params.id);

  res.json({ message: 'Employee deleted successfully' });
});

// ==================== SKILLS API ====================

// Get employee skills
app.get('/api/employees/:id/skills', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json({ skills: employee.skills });
});

// Add skill
app.post('/api/employees/:id/skills', (req, res) => {
  const { skill, level, certified } = req.body;

  if (!skill) {
    return res.status(400).json({ error: 'Skill name is required' });
  }

  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  if (!employee.skills.includes(skill)) {
    employee.skills.push(skill);
  }

  if (certified) {
    const certId = `cert-${uuidv4().slice(0, 8)}`;
    const cert = {
      id: certId,
      employeeId: employee.id,
      skill,
      level: level || 'intermediate',
      issuedAt: new Date().toISOString(),
      expiresAt: null
    };
    certifications.set(certId, cert);
  }

  employee.updatedAt = new Date().toISOString();

  res.json({ skills: employee.skills });
});

// ==================== PERFORMANCE API ====================

// Get employee performance
app.get('/api/employees/:id/performance', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const employeePerformance = Array.from(performances.values())
    .filter(p => p.employeeId === req.params.id)
    .sort((a, b) => b.period.localeCompare(a.period));

  res.json({ performance: employeePerformance });
});

// Create performance review
app.post('/api/employees/:id/performance', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const { period, score, objectives, achievements } = req.body;

  if (!period || score === undefined) {
    return res.status(400).json({ error: 'Period and score are required' });
  }

  const performance = {
    id: `perf-${uuidv4().slice(0, 8)}`,
    employeeId: req.params.id,
    period,
    score,
    objectives: objectives || [],
    achievements: achievements || [],
    status: 'pending'
  };

  performances.set(performance.id, performance);

  res.status(201).json(performance);
});

// ==================== HEALTH API ====================

// Get employee health
app.get('/api/employees/:id/health', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json({
    employeeId: employee.id,
    health: employee.health,
    updatedAt: employee.updatedAt
  });
});

// Update health metrics
app.put('/api/employees/:id/health', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const { overall, engagement, productivity, satisfaction } = req.body;

  if (overall !== undefined) employee.health.overall = overall;
  if (engagement !== undefined) employee.health.engagement = engagement;
  if (productivity !== undefined) employee.health.productivity = productivity;
  if (satisfaction !== undefined) employee.health.satisfaction = satisfaction;

  employee.updatedAt = new Date().toISOString();

  res.json(employee.health);
});

// ==================== ORG CHART API ====================

// Get org chart
app.get('/api/org-chart', (req, res) => {
  const { rootId } = req.query;

  const root = rootId ? employees.get(rootId) : Array.from(employees.values()).find(e => !e.manager);

  if (!root) {
    return res.status(404).json({ error: 'Root employee not found' });
  }

  function buildTree(employee) {
    const directReports = Array.from(employees.values()).filter(e => e.manager === employee.id);
    return {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      title: employee.title,
      department: employee.department,
      children: directReports.map(r => buildTree(r))
    };
  }

  const orgChart = buildTree(root);

  res.json(orgChart);
});

// ==================== TEAM API ====================

// Get team members
app.get('/api/employees/:id/team', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const team = Array.from(employees.values()).filter(e => e.manager === req.params.id);

  res.json({ team });
});

// Get manager
app.get('/api/employees/:id/manager', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  if (!employee.manager) {
    return res.status(404).json({ error: 'No manager found' });
  }

  const manager = employees.get(employee.manager);

  res.json(manager);
});

// ==================== STATISTICS API ====================

app.get('/api/statistics', (req, res) => {
  const allEmployees = Array.from(employees.values());

  const stats = {
    total: allEmployees.length,
    byDepartment: {},
    byLevel: {},
    byStatus: {},
    avgHealth: { overall: 0, engagement: 0, productivity: 0, satisfaction: 0 },
    topSkills: [],
    avgTenure: 0
  };

  allEmployees.forEach(emp => {
    stats.byDepartment[emp.department] = (stats.byDepartment[emp.department] || 0) + 1;
    stats.byLevel[emp.level] = (stats.byLevel[emp.level] || 0) + 1;
    stats.byStatus[emp.status] = (stats.byStatus[emp.status] || 0) + 1;

    stats.avgHealth.overall += emp.health.overall;
    stats.avgHealth.engagement += emp.health.engagement;
    stats.avgHealth.productivity += emp.health.productivity;
    stats.avgHealth.satisfaction += emp.health.satisfaction;
  });

  const count = allEmployees.length;
  stats.avgHealth.overall = Math.round(stats.avgHealth.overall / count);
  stats.avgHealth.engagement = Math.round(stats.avgHealth.engagement / count);
  stats.avgHealth.productivity = Math.round(stats.avgHealth.productivity / count);
  stats.avgHealth.satisfaction = Math.round(stats.avgHealth.satisfaction / count);

  // Calculate average tenure
  const totalDays = allEmployees.reduce((sum, emp) => {
    const hireDate = new Date(emp.hireDate);
    const today = new Date();
    return sum + Math.floor((today - hireDate) / (1000 * 60 * 60 * 24));
  }, 0);
  stats.avgTenure = (totalDays / count / 365).toFixed(1) + ' years';

  // Top skills
  const skillCounts = {};
  allEmployees.forEach(emp => {
    emp.skills.forEach(skill => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });
  stats.topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'employee-twin',
    port: PORT,
    employees: employees.size,
    performances: performances.size,
    certifications: certifications.size
  });
});

app.listen(PORT, () => {
  console.log('👤 Employee Twin Service running on port ' + PORT);
  console.log('   Employees: ' + employees.size);
  console.log('   Performance Records: ' + performances.size);
});
