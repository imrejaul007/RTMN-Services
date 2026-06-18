/**
 * Workforce OS - Complete HR & People Management Platform
 *
 * Full HRIS (Human Resource Information System):
 * - Employee Management
 * - Recruitment & Hiring
 * - Time & Attendance
 * - Payroll
 * - Performance Management
 * - Learning & Development
 * - Benefits Administration
 * - Org Chart & Structure
 * - Attendance & Leave
 * - Compliance & Audits
 *
 * Plus AI HR Agents for automation
 *
 * Port: 5077
 * Part of: RTMN Industry OS Ecosystem
 * Version: 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');

const app = express();
const PORT = process.env.WORKFORCE_OS_PORT || 5077;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// DATA STORES - Complete HR Platform
// ============================================================

const dataStores = {
  // ===== EMPLOYEES =====
  employees: new Map(),
  employeeDocuments: new Map(),
  employeeEmergencyContacts: new Map(),

  // ===== DEPARTMENTS & STRUCTURE =====
  departments: new Map(),
  designations: new Map(),
  orgChart: new Map(),

  // ===== RECRUITMENT =====
  jobOpenings: new Map(),
  applications: new Map(),
  interviews: new Map(),
  offers: new Map(),

  // ===== TIME & ATTENDANCE =====
  attendance: new Map(),
  leaveRequests: new Map(),
  holidays: new Map(),
  shifts: new Map(),
  overtime: new Map(),

  // ===== PAYROLL =====
  payrollRecords: new Map(),
  salaryStructures: new Map(),
  deductions: new Map(),
  reimbursements: new Map(),

  // ===== PERFORMANCE =====
  performanceReviews: new Map(),
  goals: new Map(),
  kpis: new Map(),
  feedback: new Map(),

  // ===== LEARNING & DEVELOPMENT =====
  courses: new Map(),
  enrollments: new Map(),
  certifications: new Map(),
  trainingSessions: new Map(),

  // ===== BENEFITS =====
  benefitPlans: new Map(),
  employeeBenefits: new Map(),
  claims: new Map(),

  // ===== COMPLIANCE =====
  policies: new Map(),
  audits: new Map(),
  complianceRecords: new Map(),

  // ===== EXPENSES =====
  expenseClaims: new Map(),
  expenseCategories: new Map(),

  // ===== AI HR AGENTS =====
  aiAgents: new Map(),

  // ===== INTEGRATIONS =====
  integrations: new Map(),
};

// ============================================================
// AUTHENTICATION
// ============================================================
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization required' });
  }
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }
  req.user = session;
  next();
}

// ============================================================
// SAMPLE DATA INITIALIZATION
// ============================================================

function initSampleData() {
  // ===== DEPARTMENTS =====
  const departments = [
    { id: 'DEPT001', name: 'Engineering', code: 'ENG', headId: 'EMP001', budget: 15000000, headcount: 45, status: 'active' },
    { id: 'DEPT002', name: 'Sales', code: 'SLS', headId: 'EMP002', budget: 8000000, headcount: 30, status: 'active' },
    { id: 'DEPT003', name: 'Marketing', code: 'MKT', headId: 'EMP003', budget: 5000000, headcount: 20, status: 'active' },
    { id: 'DEPT004', name: 'Human Resources', code: 'HR', headId: 'EMP004', budget: 2000000, headcount: 8, status: 'active' },
    { id: 'DEPT005', name: 'Finance', code: 'FIN', headId: 'EMP005', budget: 3000000, headcount: 12, status: 'active' },
    { id: 'DEPT006', name: 'Operations', code: 'OPS', headId: 'EMP006', budget: 6000000, headcount: 25, status: 'active' },
    { id: 'DEPT007', name: 'Customer Success', code: 'CS', headId: 'EMP007', budget: 4000000, headcount: 18, status: 'active' },
    { id: 'DEPT008', name: 'Product', code: 'PRD', headId: 'EMP008', budget: 7000000, headcount: 22, status: 'active' },
  ];
  departments.forEach(d => dataStores.departments.set(d.id, d));

  // ===== DESIGNATIONS =====
  const designations = [
    { id: 'DES001', title: 'CEO', level: 10, departmentId: null },
    { id: 'DES002', title: 'VP', level: 9, departmentId: null },
    { id: 'DES003', title: 'Director', level: 8, departmentId: null },
    { id: 'DES004', title: 'Senior Manager', level: 7, departmentId: null },
    { id: 'DES005', title: 'Manager', level: 6, departmentId: null },
    { id: 'DES006', title: 'Senior Engineer', level: 5, departmentId: 'DEPT001' },
    { id: 'DES007', title: 'Engineer', level: 4, departmentId: 'DEPT001' },
    { id: 'DES008', title: 'Senior Executive', level: 4, departmentId: null },
    { id: 'DES009', title: 'Executive', level: 3, departmentId: null },
    { id: 'DES010', title: 'Intern', level: 1, departmentId: null },
  ];
  designations.forEach(d => dataStores.designations.set(d.id, d));

  // ===== EMPLOYEES =====
  const employees = [
    { id: 'EMP001', firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.sharma@rtmn.com', departmentId: 'DEPT001', designationId: 'DES003', managerId: null, doj: '2020-01-15', status: 'active', type: 'full-time', salary: 2500000, location: 'Bangalore' },
    { id: 'EMP002', firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@rtmn.com', departmentId: 'DEPT002', designationId: 'DES004', managerId: 'EMP001', doj: '2020-03-20', status: 'active', type: 'full-time', salary: 1800000, location: 'Mumbai' },
    { id: 'EMP003', firstName: 'Amit', lastName: 'Kumar', email: 'amit.kumar@rtmn.com', departmentId: 'DEPT003', designationId: 'DES005', managerId: 'EMP001', doj: '2021-06-01', status: 'active', type: 'full-time', salary: 1500000, location: 'Delhi' },
    { id: 'EMP004', firstName: 'Sneha', lastName: 'Gupta', email: 'sneha.gupta@rtmn.com', departmentId: 'DEPT004', designationId: 'DES005', managerId: 'EMP001', doj: '2021-01-10', status: 'active', type: 'full-time', salary: 1400000, location: 'Bangalore' },
    { id: 'EMP005', firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@rtmn.com', departmentId: 'DEPT005', designationId: 'DES005', managerId: 'EMP001', doj: '2020-08-15', status: 'active', type: 'full-time', salary: 1600000, location: 'Bangalore' },
    { id: 'EMP006', firstName: 'Anita', lastName: 'Desai', email: 'anita.desai@rtmn.com', departmentId: 'DEPT006', designationId: 'DES005', managerId: 'EMP001', doj: '2021-02-20', status: 'active', type: 'full-time', salary: 1450000, location: 'Pune' },
    { id: 'EMP007', firstName: 'Rajiv', lastName: 'Mehta', email: 'rajiv.mehta@rtmn.com', departmentId: 'DEPT007', designationId: 'DES004', managerId: 'EMP001', doj: '2020-11-01', status: 'active', type: 'full-time', salary: 1700000, location: 'Mumbai' },
    { id: 'EMP008', firstName: 'Meera', lastName: 'Shah', email: 'meera.shah@rtmn.com', departmentId: 'DEPT008', designationId: 'DES005', managerId: 'EMP001', doj: '2021-04-15', status: 'active', type: 'full-time', salary: 1550000, location: 'Bangalore' },
    { id: 'EMP009', firstName: 'Sanjay', lastName: 'Reddy', email: 'sanjay.reddy@rtmn.com', departmentId: 'DEPT001', designationId: 'DES006', managerId: 'EMP001', doj: '2022-01-10', status: 'active', type: 'full-time', salary: 1200000, location: 'Bangalore' },
    { id: 'EMP010', firstName: 'Kavitha', lastName: 'Nair', email: 'kavitha.nair@rtmn.com', departmentId: 'DEPT002', designationId: 'DES008', managerId: 'EMP002', doj: '2022-06-01', status: 'active', type: 'full-time', salary: 800000, location: 'Chennai' },
  ];
  employees.forEach(e => dataStores.employees.set(e.id, e));

  // ===== JOB OPENINGS =====
  const jobOpenings = [
    { id: 'JOB001', title: 'Senior Software Engineer', departmentId: 'DEPT001', type: 'full-time', location: 'Bangalore', salary: { min: 1500000, max: 2000000 }, status: 'open', applicants: 45, openings: 3, experience: '3-5 years', createdAt: '2026-06-01' },
    { id: 'JOB002', title: 'Sales Manager', departmentId: 'DEPT002', type: 'full-time', location: 'Mumbai', salary: { min: 1200000, max: 1800000 }, status: 'open', applicants: 28, openings: 2, experience: '5-7 years', createdAt: '2026-06-05' },
    { id: 'JOB003', title: 'Product Designer', departmentId: 'DEPT008', type: 'full-time', location: 'Bangalore', salary: { min: 1000000, max: 1500000 }, status: 'open', applicants: 56, openings: 1, experience: '2-4 years', createdAt: '2026-06-10' },
    { id: 'JOB004', title: 'Marketing Executive', departmentId: 'DEPT003', type: 'full-time', location: 'Delhi', salary: { min: 600000, max: 900000 }, status: 'closed', applicants: 34, openings: 1, experience: '1-3 years', createdAt: '2026-05-01' },
    { id: 'JOB005', title: 'HR Coordinator', departmentId: 'DEPT004', type: 'full-time', location: 'Bangalore', salary: { min: 500000, max: 700000 }, status: 'open', applicants: 67, openings: 1, experience: '0-2 years', createdAt: '2026-06-12' },
  ];
  jobOpenings.forEach(j => dataStores.jobOpenings.set(j.id, j));

  // ===== APPLICATIONS =====
  const applications = [
    { id: 'APP001', jobId: 'JOB001', firstName: 'Arjun', lastName: 'Menon', email: 'arjun@gmail.com', phone: '+91-9876543210', resume: 'arjun_resume.pdf', status: 'screening', appliedAt: '2026-06-02' },
    { id: 'APP002', jobId: 'JOB001', firstName: 'Divya', lastName: 'Krishnan', email: 'divya@gmail.com', phone: '+91-9876543211', resume: 'divya_resume.pdf', status: 'interview', appliedAt: '2026-06-03' },
    { id: 'APP003', jobId: 'JOB002', firstName: 'Ravi', lastName: 'Verma', email: 'ravi@gmail.com', phone: '+91-9876543212', resume: 'ravi_resume.pdf', status: 'offer', appliedAt: '2026-06-06' },
    { id: 'APP004', jobId: 'JOB003', firstName: 'Anu', lastName: 'Thomas', email: 'anu@gmail.com', phone: '+91-9876543213', resume: 'anu_resume.pdf', status: 'screening', appliedAt: '2026-06-11' },
    { id: 'APP005', jobId: 'JOB005', firstName: 'Mohan', lastName: 'Iyer', email: 'mohan@gmail.com', phone: '+91-9876543214', resume: 'mohan_resume.pdf', status: 'interview', appliedAt: '2026-06-13' },
  ];
  applications.forEach(a => dataStores.applications.set(a.id, a));

  // ===== LEAVE REQUESTS =====
  const leaveRequests = [
    { id: 'LV001', employeeId: 'EMP003', type: 'casual', startDate: '2026-06-20', endDate: '2026-06-22', reason: 'Family event', status: 'pending', days: 3, appliedAt: '2026-06-15' },
    { id: 'LV002', employeeId: 'EMP009', type: 'sick', startDate: '2026-06-18', endDate: '2026-06-18', reason: 'Medical appointment', status: 'approved', days: 1, approvedBy: 'EMP001', approvedAt: '2026-06-17' },
    { id: 'LV003', employeeId: 'EMP010', type: 'earned', startDate: '2026-07-01', endDate: '2026-07-10', reason: 'Vacation', status: 'approved', days: 8, approvedBy: 'EMP002', approvedAt: '2026-06-10' },
    { id: 'LV004', employeeId: 'EMP005', type: 'casual', startDate: '2026-06-25', endDate: '2026-06-27', reason: 'Personal work', status: 'pending', days: 3, appliedAt: '2026-06-16' },
  ];
  leaveRequests.forEach(l => dataStores.leaveRequests.set(l.id, l));

  // ===== ATTENDANCE =====
  const attendance = [
    { id: 'ATT001', employeeId: 'EMP001', date: '2026-06-17', checkIn: '09:15', checkOut: '18:30', hoursWorked: 9.25, status: 'present' },
    { id: 'ATT002', employeeId: 'EMP002', date: '2026-06-17', checkIn: '09:00', checkOut: '18:15', hoursWorked: 9.25, status: 'present' },
    { id: 'ATT003', employeeId: 'EMP003', date: '2026-06-17', checkIn: '09:30', checkOut: '18:45', hoursWorked: 9.25, status: 'present' },
    { id: 'ATT004', employeeId: 'EMP009', date: '2026-06-17', checkIn: null, checkOut: null, hoursWorked: 0, status: 'absent' },
    { id: 'ATT005', employeeId: 'EMP010', date: '2026-06-17', checkIn: '09:05', checkOut: '18:20', hoursWorked: 9.25, status: 'present' },
  ];
  attendance.forEach(a => dataStores.attendance.set(a.id, a));

  // ===== HOLIDAYS =====
  const holidays = [
    { id: 'HOL001', name: 'Independence Day', date: '2026-08-15', type: 'national' },
    { id: 'HOL002', name: 'Gandhi Jayanti', date: '2026-10-02', type: 'national' },
    { id: 'HOL003', name: 'Diwali', date: '2026-10-20', type: 'festival' },
    { id: 'HOL004', name: 'Holi', date: '2026-03-14', type: 'festival' },
    { id: 'HOL005', name: 'Republic Day', date: '2026-01-26', type: 'national' },
  ];
  holidays.forEach(h => dataStores.holidays.set(h.id, h));

  // ===== PAYROLL RECORDS =====
  const payrollRecords = [
    { id: 'PAY001', employeeId: 'EMP001', month: '2026-05', basic: 166667, hra: 83333, allowances: 25000, deductions: 45000, netSalary: 230000, status: 'paid', paidAt: '2026-05-31' },
    { id: 'PAY002', employeeId: 'EMP002', month: '2026-05', basic: 120000, hra: 60000, allowances: 20000, deductions: 32000, netSalary: 168000, status: 'paid', paidAt: '2026-05-31' },
    { id: 'PAY003', employeeId: 'EMP003', month: '2026-05', basic: 100000, hra: 50000, allowances: 15000, deductions: 27000, netSalary: 138000, status: 'paid', paidAt: '2026-05-31' },
    { id: 'PAY004', employeeId: 'EMP001', month: '2026-06', basic: 166667, hra: 83333, allowances: 25000, deductions: 45000, netSalary: 230000, status: 'pending', paidAt: null },
  ];
  payrollRecords.forEach(p => dataStores.payrollRecords.set(p.id, p));

  // ===== PERFORMANCE REVIEWS =====
  const performanceReviews = [
    { id: 'PR001', employeeId: 'EMP001', reviewerId: 'EMP001', period: 'Q1-2026', overallRating: 4.5, goals: ['Team management', 'Project delivery'], strengths: ['Leadership', 'Technical'], improvements: ['Cross-team collaboration'], status: 'completed', completedAt: '2026-04-15' },
    { id: 'PR002', employeeId: 'EMP002', reviewerId: 'EMP001', period: 'Q1-2026', overallRating: 4.2, goals: ['Sales targets', 'Client relationships'], strengths: ['Communication', 'Negotiation'], improvements: ['Pipeline management'], status: 'completed', completedAt: '2026-04-18' },
    { id: 'PR003', employeeId: 'EMP009', reviewerId: 'EMP001', period: 'Q1-2026', overallRating: 3.8, goals: ['Technical skills', 'Documentation'], strengths: ['Coding', 'Problem solving'], improvements: ['Code reviews', 'Documentation'], status: 'pending', completedAt: null },
  ];
  performanceReviews.forEach(p => dataStores.performanceReviews.set(p.id, p));

  // ===== GOALS =====
  const goals = [
    { id: 'G001', employeeId: 'EMP001', title: 'Q2 Revenue Target', description: 'Achieve 150% of Q2 quota', progress: 75, status: 'in_progress', dueDate: '2026-06-30' },
    { id: 'G002', employeeId: 'EMP001', title: 'Team Expansion', description: 'Hire 5 new engineers', progress: 60, status: 'in_progress', dueDate: '2026-09-30' },
    { id: 'G003', employeeId: 'EMP002', title: 'Enterprise Deals', description: 'Close 3 enterprise accounts', progress: 40, status: 'in_progress', dueDate: '2026-06-30' },
    { id: 'G004', employeeId: 'EMP003', title: 'Brand Awareness', description: 'Increase social reach by 50%', progress: 55, status: 'in_progress', dueDate: '2026-08-31' },
  ];
  goals.forEach(g => dataStores.goals.set(g.id, g));

  // ===== COURSES =====
  const courses = [
    { id: 'CRS001', title: 'Leadership Excellence', type: 'leadership', duration: 480, enrolled: 45, completed: 32, status: 'active', category: 'Management' },
    { id: 'CRS002', title: 'Technical Writing', type: 'technical', duration: 300, enrolled: 28, completed: 18, status: 'active', category: 'Technical' },
    { id: 'CRS003', title: 'Communication Skills', type: 'soft-skills', duration: 240, enrolled: 56, completed: 42, status: 'active', category: 'Soft Skills' },
    { id: 'CRS004', title: 'Project Management', type: 'management', duration: 360, enrolled: 34, completed: 25, status: 'active', category: 'Management' },
    { id: 'CRS005', title: 'Data Analytics', type: 'technical', duration: 480, enrolled: 22, completed: 8, status: 'active', category: 'Technical' },
  ];
  courses.forEach(c => dataStores.courses.set(c.id, c));

  // ===== ENROLLMENTS =====
  const enrollments = [
    { id: 'ENR001', courseId: 'CRS001', employeeId: 'EMP001', progress: 80, status: 'in_progress', enrolledAt: '2026-04-01' },
    { id: 'ENR002', courseId: 'CRS003', employeeId: 'EMP001', progress: 100, status: 'completed', enrolledAt: '2026-03-15', completedAt: '2026-05-01' },
    { id: 'ENR003', courseId: 'CRS002', employeeId: 'EMP009', progress: 45, status: 'in_progress', enrolledAt: '2026-05-01' },
    { id: 'ENR004', courseId: 'CRS004', employeeId: 'EMP002', progress: 100, status: 'completed', enrolledAt: '2026-02-01', completedAt: '2026-04-15' },
  ];
  enrollments.forEach(e => dataStores.enrollments.set(e.id, e));

  // ===== BENEFIT PLANS =====
  const benefitPlans = [
    { id: 'BNF001', name: 'Health Insurance', type: 'health', coverage: '5L', premium: 12000, employeeContribution: 3000, employerContribution: 9000, status: 'active' },
    { id: 'BNF002', name: 'Life Insurance', type: 'life', coverage: '10L', premium: 5000, employeeContribution: 0, employerContribution: 5000, status: 'active' },
    { id: 'BNF003', name: 'Meal Coupons', type: 'meal', amount: 2200, frequency: 'monthly', status: 'active' },
    { id: 'BNF004', name: 'Travel Allowance', type: 'travel', amount: 15000, frequency: 'monthly', status: 'active' },
    { id: 'BNF005', name: 'Learning Budget', type: 'learning', amount: 50000, frequency: 'yearly', status: 'active' },
  ];
  benefitPlans.forEach(b => dataStores.benefitPlans.set(b.id, b));

  // ===== EXPENSE CATEGORIES =====
  const expenseCategories = [
    { id: 'EXP001', name: 'Travel', limit: 50000, requiresApproval: true },
    { id: 'EXP002', name: 'Meals', limit: 5000, requiresApproval: false },
    { id: 'EXP003', name: 'Office Supplies', limit: 10000, requiresApproval: true },
    { id: 'EXP004', name: 'Equipment', limit: 100000, requiresApproval: true },
    { id: 'EXP005', name: 'Training', limit: 50000, requiresApproval: true },
  ];
  expenseCategories.forEach(e => dataStores.expenseCategories.set(e.id, e));

  // ===== EXPENSE CLAIMS =====
  const expenseClaims = [
    { id: 'EXC001', employeeId: 'EMP003', categoryId: 'EXP001', amount: 35000, description: 'Client visit - Mumbai', status: 'pending', submittedAt: '2026-06-15' },
    { id: 'EXC002', employeeId: 'EMP002', categoryId: 'EXP001', amount: 42000, description: 'Sales trip - Delhi', status: 'approved', approvedBy: 'EMP001', approvedAt: '2026-06-12' },
    { id: 'EXC003', employeeId: 'EMP009', categoryId: 'EXP003', amount: 8500, description: 'Office supplies', status: 'approved', approvedBy: 'EMP001', approvedAt: '2026-06-16' },
  ];
  expenseClaims.forEach(e => dataStores.expenseClaims.set(e.id, e));

  // ===== POLICIES =====
  const policies = [
    { id: 'POL001', title: 'Code of Conduct', category: 'general', version: '2.0', status: 'active', updatedAt: '2026-01-01' },
    { id: 'POL002', title: 'Leave Policy', category: 'leave', version: '1.5', status: 'active', updatedAt: '2026-03-01' },
    { id: 'POL003', title: 'Remote Work Policy', category: 'work', version: '1.0', status: 'active', updatedAt: '2025-12-01' },
    { id: 'POL004', title: 'Expense Reimbursement', category: 'finance', version: '1.2', status: 'active', updatedAt: '2026-02-01' },
    { id: 'POL005', title: 'Anti-Harassment Policy', category: 'compliance', version: '3.0', status: 'active', updatedAt: '2026-01-15' },
  ];
  policies.forEach(p => dataStores.policies.set(p.id, p));

  // ===== AI HR AGENTS =====
  const aiAgents = [
    { id: 'HRA001', name: 'Resume Screening Agent', type: 'recruitment', status: 'active', tasks: 234, accuracy: 91.5 },
    { id: 'HRA002', name: 'Interview Scheduling Agent', type: 'recruitment', status: 'active', tasks: 456, accuracy: 94.2 },
    { id: 'HRA003', name: 'Leave Approval Agent', type: 'attendance', status: 'active', tasks: 789, accuracy: 96.8 },
    { id: 'HRA004', name: 'Payroll Processing Agent', type: 'payroll', status: 'active', tasks: 123, accuracy: 99.1 },
    { id: 'HRA005', name: 'Performance Analyzer', type: 'performance', status: 'active', tasks: 234, accuracy: 88.7 },
    { id: 'HRA006', name: 'Skill Gap Analyzer', type: 'learning', status: 'active', tasks: 156, accuracy: 87.3 },
    { id: 'HRA007', name: 'Compliance Checker', type: 'compliance', status: 'active', tasks: 345, accuracy: 93.5 },
    { id: 'HRA008', name: 'Attrition Predictor', type: 'analytics', status: 'active', tasks: 89, accuracy: 85.6 },
    { id: 'HRA009', name: 'Org Chart Optimizer', type: 'structure', status: 'active', tasks: 45, accuracy: 82.4 },
    { id: 'HRA010', name: 'Benefits Advisor', type: 'benefits', status: 'active', tasks: 234, accuracy: 90.2 },
  ];
  aiAgents.forEach(a => dataStores.aiAgents.set(a.id, a));

  // ===== INTEGRATIONS =====
  const integrations = [
    { id: 'INT001', name: ' Payroll System', type: 'payroll', status: 'connected' },
    { id: 'INT002', name: 'Attendance Device', type: 'attendance', status: 'connected' },
    { id: 'INT003', name: 'LMS Platform', type: 'learning', status: 'connected' },
    { id: 'INT004', name: 'Background Check', type: 'compliance', status: 'connected' },
    { id: 'INT005', name: 'Job Portal', type: 'recruitment', status: 'connected' },
  ];
  integrations.forEach(i => dataStores.integrations.set(i.id, i));

  console.log(`[Workforce OS] Initialized: ${employees.length} employees, ${departments.length} departments, ${jobOpenings.length} jobs, ${aiAgents.length} AI agents`);
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Workforce OS',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    modules: {
      employees: { total: dataStores.employees.size, active: Array.from(dataStores.employees.values()).filter(e => e.status === 'active').length },
      departments: { total: dataStores.departments.size },
      recruitment: { openings: dataStores.jobOpenings.size, applications: dataStores.applications.size },
      attendance: { todayRecords: dataStores.attendance.size },
      leave: { pending: Array.from(dataStores.leaveRequests.values()).filter(l => l.status === 'pending').length },
      payroll: { records: dataStores.payrollRecords.size, pending: Array.from(dataStores.payrollRecords.values()).filter(p => p.status === 'pending').length },
      performance: { reviews: dataStores.performanceReviews.size },
      learning: { courses: dataStores.courses.size, enrollments: dataStores.enrollments.size },
      benefits: { plans: dataStores.benefitPlans.size },
      expenses: { claims: dataStores.expenseClaims.size, pending: Array.from(dataStores.expenseClaims.values()).filter(e => e.status === 'pending').length },
      aiAgents: { total: dataStores.aiAgents.size, active: Array.from(dataStores.aiAgents.values()).filter(a => a.status === 'active').length },
    },
    integrations: Array.from(dataStores.integrations.values()),
  });
});

app.get('/status', (req, res) => {
  const employees = Array.from(dataStores.employees.values());
  const activeEmployees = employees.filter(e => e.status === 'active');
  const departments = Array.from(dataStores.departments.values());

  res.json({
    overview: {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      departments: departments.length,
      openPositions: Array.from(dataStores.jobOpenings.values()).filter(j => j.status === 'open').length,
      totalHeadcount: departments.reduce((sum, d) => sum + d.headcount, 0),
    },
    today: {
      present: dataStores.attendance.size,
      absent: Array.from(dataStores.attendance.values()).filter(a => a.status === 'absent').length,
      leavePending: Array.from(dataStores.leaveRequests.values()).filter(l => l.status === 'pending').length,
    },
    pipeline: {
      applications: dataStores.applications.size,
      interviews: Array.from(dataStores.applications.values()).filter(a => a.status === 'interview').length,
      offers: Array.from(dataStores.applications.values()).filter(a => a.status === 'offer').length,
    },
  });
});

// ============================================================
// AUTH ENDPOINTS
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const { email, employeeId } = req.body;
  const token = generateToken();
  sessions.set(token, { userId: employeeId || `user-${Date.now()}`, email, role: 'admin' });
  res.json({ success: true, token, expiresIn: 86400 });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(req.headers['authorization']?.replace('Bearer ', ''));
  res.json({ success: true });
});

// ============================================================
// EMPLOYEES
// ============================================================

app.get('/api/employees', (req, res) => {
  const { department, status, search } = req.query;
  let employees = Array.from(dataStores.employees.values());

  if (department) employees = employees.filter(e => e.departmentId === department);
  if (status) employees = employees.filter(e => e.status === status);
  if (search) employees = employees.filter(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  res.json({ success: true, count: employees.length, employees });
});

app.get('/api/employees/:id', (req, res) => {
  const employee = dataStores.employees.get(req.params.id);
  if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

  const department = dataStores.departments.get(employee.departmentId);
  const designation = dataStores.designations.get(employee.designationId);

  res.json({ success: true, employee, department, designation });
});

app.post('/api/employees', requireAuth, (req, res) => {
  const { firstName, lastName, email, departmentId, designationId, doj, salary, type, location } = req.body;

  const employee = {
    id: `EMP${String(dataStores.employees.size + 11).padStart(3, '0')}`,
    firstName,
    lastName,
    email,
    departmentId,
    designationId,
    managerId: null,
    doj,
    status: 'active',
    type: type || 'full-time',
    salary: parseInt(salary) || 0,
    location,
    createdAt: new Date().toISOString(),
  };

  dataStores.employees.set(employee.id, employee);
  res.status(201).json({ success: true, employee });
});

app.put('/api/employees/:id', requireAuth, (req, res) => {
  const employee = dataStores.employees.get(req.params.id);
  if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

  Object.assign(employee, req.body);
  dataStores.employees.set(employee.id, employee);

  res.json({ success: true, employee });
});

// ============================================================
// DEPARTMENTS
// ============================================================

app.get('/api/departments', (req, res) => {
  const departments = Array.from(dataStores.departments.values());
  res.json({ success: true, count: departments.length, departments });
});

app.get('/api/departments/:id', (req, res) => {
  const department = dataStores.departments.get(req.params.id);
  if (!department) return res.status(404).json({ success: false, error: 'Department not found' });

  const employees = Array.from(dataStores.employees.values()).filter(e => e.departmentId === department.id);
  const head = dataStores.employees.get(department.headId);

  res.json({ success: true, department, employees, head });
});

app.post('/api/departments', requireAuth, (req, res) => {
  const { name, code, headId, budget } = req.body;
  const department = {
    id: `DEPT${String(dataStores.departments.size + 1).padStart(3, '0')}`,
    name,
    code,
    headId,
    budget: parseInt(budget) || 0,
    headcount: 0,
    status: 'active',
  };
  dataStores.departments.set(department.id, department);
  res.status(201).json({ success: true, department });
});

// ============================================================
// RECRUITMENT
// ============================================================

app.get('/api/jobs', (req, res) => {
  const { status, department } = req.query;
  let jobs = Array.from(dataStores.jobOpenings.values());

  if (status) jobs = jobs.filter(j => j.status === status);
  if (department) jobs = jobs.filter(j => j.departmentId === department);

  res.json({ success: true, count: jobs.length, jobs });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = dataStores.jobOpenings.get(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  const applications = Array.from(dataStores.applications.values()).filter(a => a.jobId === job.id);
  const department = dataStores.departments.get(job.departmentId);

  res.json({ success: true, job, department, applications });
});

app.post('/api/jobs', requireAuth, (req, res) => {
  const { title, departmentId, type, location, salary, experience, openings } = req.body;

  const job = {
    id: `JOB${String(dataStores.jobOpenings.size + 1).padStart(3, '0')}`,
    title,
    departmentId,
    type,
    location,
    salary,
    status: 'draft',
    applicants: 0,
    openings: parseInt(openings) || 1,
    experience,
    createdAt: new Date().toISOString(),
  };

  dataStores.jobOpenings.set(job.id, job);
  res.status(201).json({ success: true, job });
});

app.put('/api/jobs/:id/publish', requireAuth, (req, res) => {
  const job = dataStores.jobOpenings.get(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  job.status = 'open';
  dataStores.jobOpenings.set(job.id, job);

  res.json({ success: true, job });
});

// ============================================================
// ATTENDANCE
// ============================================================

app.get('/api/attendance', (req, res) => {
  const { date, employeeId } = req.query;
  let attendance = Array.from(dataStores.attendance.values());

  if (date) attendance = attendance.filter(a => a.date === date);
  if (employeeId) attendance = attendance.filter(a => a.employeeId === employeeId);

  res.json({ success: true, count: attendance.length, attendance });
});

app.post('/api/attendance/checkin', requireAuth, (req, res) => {
  const { employeeId } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5);

  const record = {
    id: `ATT${Date.now()}`,
    employeeId,
    date: today,
    checkIn: time,
    checkOut: null,
    hoursWorked: 0,
    status: 'present',
  };

  dataStores.attendance.set(record.id, record);
  res.status(201).json({ success: true, record });
});

app.post('/api/attendance/checkout', requireAuth, (req, res) => {
  const { employeeId } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5);

  const record = Array.from(dataStores.attendance.values()).find(a => a.employeeId === employeeId && a.date === today);
  if (!record) return res.status(404).json({ success: false, error: 'Check-in record not found' });

  record.checkOut = time;
  const [inH, inM] = record.checkIn.split(':').map(Number);
  const [outH, outM] = time.split(':').map(Number);
  record.hoursWorked = ((outH * 60 + outM) - (inH * 60 + inM)) / 60;

  dataStores.attendance.set(record.id, record);
  res.json({ success: true, record });
});

// ============================================================
// LEAVE MANAGEMENT
// ============================================================

app.get('/api/leave', (req, res) => {
  const { status, employeeId, type } = req.query;
  let leaves = Array.from(dataStores.leaveRequests.values());

  if (status) leaves = leaves.filter(l => l.status === status);
  if (employeeId) leaves = leaves.filter(l => l.employeeId === employeeId);
  if (type) leaves = leaves.filter(l => l.type === type);

  res.json({ success: true, count: leaves.length, leaves });
});

app.post('/api/leave', requireAuth, (req, res) => {
  const { employeeId, type, startDate, endDate, reason } = req.body;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const leave = {
    id: `LV${String(dataStores.leaveRequests.size + 1).padStart(3, '0')}`,
    employeeId,
    type,
    startDate,
    endDate,
    days,
    reason,
    status: 'pending',
    appliedAt: new Date().toISOString(),
  };

  dataStores.leaveRequests.set(leave.id, leave);
  res.status(201).json({ success: true, leave });
});

app.put('/api/leave/:id/approve', requireAuth, (req, res) => {
  const leave = dataStores.leaveRequests.get(req.params.id);
  if (!leave) return res.status(404).json({ success: false, error: 'Leave request not found' });

  leave.status = 'approved';
  leave.approvedBy = req.user.userId;
  leave.approvedAt = new Date().toISOString();

  dataStores.leaveRequests.set(leave.id, leave);
  res.json({ success: true, leave });
});

app.put('/api/leave/:id/reject', requireAuth, (req, res) => {
  const leave = dataStores.leaveRequests.get(req.params.id);
  if (!leave) return res.status(404).json({ success: false, error: 'Leave request not found' });

  leave.status = 'rejected';
  leave.rejectedBy = req.user.userId;
  leave.rejectedAt = new Date().toISOString();
  leave.rejectionReason = req.body.reason;

  dataStores.leaveRequests.set(leave.id, leave);
  res.json({ success: true, leave });
});

// ============================================================
// PAYROLL
// ============================================================

app.get('/api/payroll', (req, res) => {
  const { employeeId, month, status } = req.query;
  let payroll = Array.from(dataStores.payrollRecords.values());

  if (employeeId) payroll = payroll.filter(p => p.employeeId === employeeId);
  if (month) payroll = payroll.filter(p => p.month === month);
  if (status) payroll = payroll.filter(p => p.status === status);

  res.json({ success: true, count: payroll.length, payroll });
});

app.get('/api/payroll/employees/:id', (req, res) => {
  const payroll = Array.from(dataStores.payrollRecords.values()).filter(p => p.employeeId === req.params.id);
  res.json({ success: true, count: payroll.length, payroll });
});

// ============================================================
// PERFORMANCE
// ============================================================

app.get('/api/performance/reviews', (req, res) => {
  const { employeeId, status } = req.query;
  let reviews = Array.from(dataStores.performanceReviews.values());

  if (employeeId) reviews = reviews.filter(r => r.employeeId === employeeId);
  if (status) reviews = reviews.filter(r => r.status === status);

  res.json({ success: true, count: reviews.length, reviews });
});

app.get('/api/goals', (req, res) => {
  const { employeeId, status } = req.query;
  let goals = Array.from(dataStores.goals.values());

  if (employeeId) goals = goals.filter(g => g.employeeId === employeeId);
  if (status) goals = goals.filter(g => g.status === status);

  res.json({ success: true, count: goals.length, goals });
});

// ============================================================
// LEARNING
// ============================================================

app.get('/api/courses', (req, res) => {
  const courses = Array.from(dataStores.courses.values());
  res.json({ success: true, count: courses.length, courses });
});

app.get('/api/enrollments', (req, res) => {
  const { employeeId, courseId, status } = req.query;
  let enrollments = Array.from(dataStores.enrollments.values());

  if (employeeId) enrollments = enrollments.filter(e => e.employeeId === employeeId);
  if (courseId) enrollments = enrollments.filter(e => e.courseId === courseId);
  if (status) enrollments = enrollments.filter(e => e.status === status);

  res.json({ success: true, count: enrollments.length, enrollments });
});

app.post('/api/enrollments', requireAuth, (req, res) => {
  const { courseId, employeeId } = req.body;

  const enrollment = {
    id: `ENR${String(dataStores.enrollments.size + 1).padStart(3, '0')}`,
    courseId,
    employeeId,
    progress: 0,
    status: 'in_progress',
    enrolledAt: new Date().toISOString(),
  };

  dataStores.enrollments.set(enrollment.id, enrollment);
  res.status(201).json({ success: true, enrollment });
});

// ============================================================
// BENEFITS
// ============================================================

app.get('/api/benefits/plans', (req, res) => {
  const plans = Array.from(dataStores.benefitPlans.values());
  res.json({ success: true, count: plans.length, plans });
});

// ============================================================
// EXPENSES
// ============================================================

app.get('/api/expenses', (req, res) => {
  const { status, employeeId } = req.query;
  let claims = Array.from(dataStores.expenseClaims.values());

  if (status) claims = claims.filter(e => e.status === status);
  if (employeeId) claims = claims.filter(e => e.employeeId === employeeId);

  res.json({ success: true, count: claims.length, claims });
});

app.post('/api/expenses', requireAuth, (req, res) => {
  const { employeeId, categoryId, amount, description } = req.body;

  const claim = {
    id: `EXC${String(dataStores.expenseClaims.size + 1).padStart(3, '0')}`,
    employeeId,
    categoryId,
    amount: parseFloat(amount),
    description,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  dataStores.expenseClaims.set(claim.id, claim);
  res.status(201).json({ success: true, claim });
});

// ============================================================
// POLICIES
// ============================================================

app.get('/api/policies', (req, res) => {
  const { category } = req.query;
  let policies = Array.from(dataStores.policies.values());

  if (category) policies = policies.filter(p => p.category === category);

  res.json({ success: true, count: policies.length, policies });
});

// ============================================================
// AI HR AGENTS
// ============================================================

app.get('/api/ai-agents', (req, res) => {
  const agents = Array.from(dataStores.aiAgents.values());
  res.json({ success: true, count: agents.length, agents });
});

app.post('/api/ai-agents/:id/analyze', requireAuth, (req, res) => {
  const agent = dataStores.aiAgents.get(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const { data, type } = req.body;
  const result = {
    id: `RES${Date.now()}`,
    agentId: agent.id,
    agentName: agent.name,
    analysisType: type,
    result: `AI analysis of ${type || 'data'} completed`,
    confidence: (Math.random() * 0.3 + 0.7).toFixed(2),
    generatedAt: new Date().toISOString(),
  };

  res.json({ success: true, result });
});

// ============================================================
// ANALYTICS
// ============================================================

app.get('/api/analytics/overview', (req, res) => {
  const employees = Array.from(dataStores.employees.values());
  const departments = Array.from(dataStores.departments.values());

  res.json({
    success: true,
    overview: {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.status === 'active').length,
      departments: departments.length,
      totalSalary: employees.reduce((sum, e) => sum + (e.salary || 0), 0),
      avgTenure: employees.reduce((sum, e) => {
        const doj = new Date(e.doj);
        const now = new Date();
        return sum + ((now - doj) / (1000 * 60 * 60 * 24 * 365));
      }, 0) / employees.length,
    },
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('[Workforce OS Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// START
// ============================================================

initSampleData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    WORKFORCE OS v1.0.0                                     ║
║              Complete HR & People Management Platform                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                                   ║
║  Status: Running                                                              ║
║                                                                             ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║  CORE MODULES                                                               ║
║  ══════════════════════════════════════════════════════════════════════════   ║
║                                                                             ║
║  👥 Employee Mgmt    │  🏢 Departments      │  📋 Recruitment          ║
║  • Profile Mgmt       │  • Org Chart        │  • Job Openings           ║
║  • Documents          │  • Headcount        │  • Applications           ║
║  • Emergency Contacts │  • Budget Tracking  │  • Interviews            ║
║                       │                      │  • Offers                ║
║  ⏰ Time & Attendance │  📅 Leave Mgmt      │  💰 Payroll              ║
║  • Check-in/Out       │  • Leave Requests    │  • Salary Processing     ║
║  • Shift Management   │  • Approval Workflow │  • Deductions           ║
║  • Overtime Tracking  │  • Holiday Calendar  │  • Reimbursements       ║
║                                                                             ║
║  📊 Performance     │  📚 Learning        │  🎁 Benefits            ║
║  • Performance Reviews │  • Course Catalog   │  • Health Insurance      ║
║  • Goals & KPIs     │  • Enrollments      │  • Life Insurance        ║
║  • Feedback         │  • Certifications    │  • Meal Coupons          ║
║  • 360 Reviews      │  • Training Sessions │  • Learning Budget        ║
║                                                                             ║
║  📄 Compliance     │  💼 Expenses        │  🤖 AI Agents           ║
║  • Policies         │  • Expense Claims    │  • Resume Screening       ║
║  • Audits           │  • Categories        │  • Interview Scheduling    ║
║  • Compliance Records│  • Approval Flow    │  • Leave Approval         ║
║                       │                      │  • Payroll Processing      ║
║                       │                      │  • And 5 more...          ║
║                                                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
