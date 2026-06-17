/**
 * MongoDB Database Connection & Models
 *
 * This module provides MongoDB integration for Workforce OS services.
 * Uses Mongoose ODM for data modeling.
 *
 * In production, set MONGODB_URI environment variable.
 * Falls back to in-memory storage if MongoDB is not available.
 */

import mongoose from 'mongoose';

// Connection state
let isConnected = false;

// MongoDB Connection
export async function connectDB(uri?: string) {
  if (isConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/rtmn-workforce';

  try {
    await mongoose.connect(mongoUri);
    isConnected = true;
    console.log(`MongoDB connected: ${mongoUri}`);
  } catch (error) {
    console.warn('MongoDB connection failed, using in-memory storage:', error.message);
    isConnected = false;
  }
}

// Disconnect
export async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected');
  }
}

// ============================================================
// EMPLOYEE SCHEMA
// ============================================================

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  employeeNumber: String,
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: String,
  departmentId: String,
  positionId: String,
  managerId: String,
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contractor', 'intern'],
    default: 'full-time'
  },
  status: {
    type: String,
    enum: ['active', 'on-leave', 'pending', 'terminated'],
    default: 'pending'
  },
  workLocation: String,
  joiningDate: Date,
  salary: {
    basic: Number,
    hra: Number,
    allowances: Number,
    variable: Number
  },
  skills: [String],
  certifications: [String],
  avatar: String,
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

employeeSchema.index({ email: 1 });
employeeSchema.index({ departmentId: 1 });
employeeSchema.index({ status: 1 });

export const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

// ============================================================
// LEAVE SCHEMA
// ============================================================

const leaveRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  leaveType: {
    type: String,
    enum: ['casual', 'sick', 'earned', 'parental', 'bereavement', 'work_from_home', 'loss_of_pay'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  managerNotes: String,
  approvedBy: String,
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

leaveRequestSchema.index({ employeeId: 1 });
leaveRequestSchema.index({ status: 1 });

export const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema);

// Leave Balance Schema
const leaveBalanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  casual: { type: Number, default: 6 },
  sick: { type: Number, default: 10 },
  earned: { type: Number, default: 18 },
  parental: { type: Number, default: 0 },
  bereavement: { type: Number, default: 5 },
  lop: { type: Number, default: 0 },
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

export const LeaveBalance = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema);

// ============================================================
// ATTENDANCE SCHEMA
// ============================================================

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  checkIn: Date,
  checkOut: Date,
  location: String,
  device: String,
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

// ============================================================
// PAYROLL SCHEMA
// ============================================================

const payrollRecordSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  month: { type: String, required: true }, // MM format
  year: { type: String, required: true }, // YYYY format
  earnings: {
    basic: Number,
    hra: Number,
    allowances: Number,
    variable: Number
  },
  deductions: {
    tds: Number,
    pf: Number,
    professionalTax: Number
  },
  gross: Number,
  totalDeductions: Number,
  netPay: Number,
  status: {
    type: String,
    enum: ['calculated', 'pending', 'approved', 'paid', 'failed'],
    default: 'pending'
  },
  runId: String,
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

payrollRecordSchema.index({ employeeId: 1 });
payrollRecordSchema.index({ month: 1, year: 1 });

export const PayrollRecord = mongoose.models.PayrollRecord || mongoose.model('PayrollRecord', payrollRecordSchema);

// ============================================================
// JOB SCHEMA (for Recruitment)
// ============================================================

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: String,
  departmentId: String,
  location: String,
  type: { type: String, enum: ['full-time', 'part-time', 'contract', 'intern'], default: 'full-time' },
  remote: { type: String, enum: ['onsite', 'hybrid', 'remote'] },
  salaryMin: Number,
  salaryMax: Number,
  currency: { type: String, default: 'INR' },
  description: String,
  requirements: [String],
  responsibilities: [String],
  skills: [String],
  status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  hiringManager: String,
  recruiter: String,
  benefits: [String],
  applicationCount: { type: Number, default: 0 },
  sourceBreakdown: { type: Map, of: Number },
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

jobSchema.index({ status: 1 });
jobSchema.index({ department: 1 });

export const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

// ============================================================
// CANDIDATE SCHEMA
// ============================================================

const candidateSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: String,
  location: String,
  currentCompany: String,
  currentTitle: String,
  experience: Number,
  currentSalary: Number,
  expectedSalary: Number,
  noticePeriod: String,
  linkedIn: String,
  portfolio: String,
  resume: String,
  skills: [String],
  education: [{
    degree: String,
    institution: String,
    year: Number
  }],
  workHistory: [{
    company: String,
    title: String,
    start: String,
    end: String
  }],
  source: { type: String, enum: ['linkedin', 'referral', 'indeed', 'website', 'naukri', 'behance', 'other'] },
  sourceDetails: String,
  referredBy: String,
  jobId: String,
  status: { type: String, enum: ['applied', 'active', 'interview', 'offer', 'hired', 'rejected'], default: 'applied' },
  stage: { type: String, enum: ['applied', 'screening', 'technical', 'cultural', 'offer', 'hired', 'rejected'], default: 'applied' },
  score: Number,
  scoreBreakdown: {
    skills: Number,
    experience: Number,
    cultureFit: Number,
    interview: Number
  },
  tags: [String],
  stageHistory: [{
    from: String,
    to: String,
    notes: String,
    movedAt: Date,
    by: String
  }],
  notes: [{
    text: String,
    author: String,
    date: Date
  }],
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

candidateSchema.index({ jobId: 1 });
candidateSchema.index({ stage: 1 });
candidateSchema.index({ email: 1 });

export const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

// ============================================================
// DEPARTMENT SCHEMA
// ============================================================

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: String,
  headCount: { type: Number, default: 0 },
  budget: Number,
  managerId: String,
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

export const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);

// ============================================================
// POSITION SCHEMA
// ============================================================

const positionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  level: String,
  departmentId: String,
  salaryMin: Number,
  salaryMid: Number,
  salaryMax: Number,
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

export const Position = mongoose.models.Position || mongoose.model('Position', positionSchema);

// ============================================================
// COURSE SCHEMA (for Learning)
// ============================================================

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: String,
  type: { type: String, enum: ['technical', 'leadership', 'compliance', 'soft-skills', 'mandatory'] },
  duration: String,
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  format: { type: String, enum: ['video', 'classroom', 'elearning', 'hybrid'] },
  instructor: String,
  description: String,
  skills: [String],
  modules: [{
    title: String,
    duration: String
  }],
  enrollmentCount: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },
  rating: { type: Number, default: 4.0 },
  mandatory: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active' },
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

courseSchema.index({ category: 1 });
courseSchema.index({ status: 1 });

export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

// ============================================================
// ENROLLMENT SCHEMA
// ============================================================

const enrollmentSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  employeeId: { type: String, required: true },
  pathId: String,
  status: { type: String, enum: ['enrolled', 'in-progress', 'completed', 'dropped'], default: 'enrolled' },
  progress: { type: Number, default: 0 },
  currentModule: { type: Number, default: 0 },
  enrolledAt: Date,
  startedAt: Date,
  completedAt: Date,
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

enrollmentSchema.index({ employeeId: 1 });
enrollmentSchema.index({ courseId: 1 });

export const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);

// ============================================================
// EXPENSE SCHEMA
// ============================================================

const expenseSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  category: {
    type: String,
    enum: ['travel', 'meals', 'accommodation', 'office_supplies', 'software', 'training', 'client_entertainment', 'other'],
    required: true
  },
  description: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  date: Date,
  receipt: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'reimbursed'], default: 'pending' },
  approvedBy: String,
  approvedAt: Date,
  tenantId: { type: String, default: 'default' }
}, { timestamps: true });

expenseSchema.index({ employeeId: 1 });
expenseSchema.index({ status: 1 });

export const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);

// ============================================================
// EXPORT DEFAULT CONNECTION
// ============================================================

export default {
  connectDB,
  disconnectDB,
  Employee,
  LeaveRequest,
  LeaveBalance,
  Attendance,
  PayrollRecord,
  Job,
  Candidate,
  Department,
  Position,
  Course,
  Enrollment,
  Expense
};
