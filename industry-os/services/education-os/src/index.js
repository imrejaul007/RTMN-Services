import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5060;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Stores
const courses = new Map();
const students = new Map();
const instructors = new Map();
const enrollments = new Map();
const assignments = new Map();
const grades = new Map();

function initSampleData() {
  const sampleCourses = [
    { id: 'c1', title: 'Introduction to Programming', code: 'CS101', credits: 3, status: 'active' },
    { id: 'c2', title: 'Data Structures', code: 'CS201', credits: 4, status: 'active' },
  ];
  sampleCourses.forEach(c => courses.set(c.id, { ...c, createdAt: new Date().toISOString() }));
  logger.info('Education OS initialized');
}
initSampleData();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'education-os', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Courses
app.get('/api/courses', (req, res) => {
  const { status, department } = req.query;
  let result = Array.from(courses.values());
  if (status) result = result.filter(c => c.status === status);
  if (department) result = result.filter(c => c.department === department);
  res.json({ success: true, count: result.length, courses: result });
});

app.post('/api/courses', (req, res) => {
  const { title, code, credits, description, department, instructorId } = req.body;
  if (!title || !code) {
    return res.status(400).json({ success: false, error: 'Title and code required' });
  }
  const course = {
    id: uuidv4(),
    title,
    code,
    credits: credits || 3,
    description: description || '',
    department: department || 'general',
    instructorId: instructorId || null,
    enrolled: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  courses.set(course.id, course);
  res.status(201).json({ success: true, course });
});

app.put('/api/courses/:id', (req, res) => {
  const course = courses.get(req.params.id);
  if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
  const updated = { ...course, ...req.body, id: course.id };
  courses.set(course.id, updated);
  res.json({ success: true, course: updated });
});

// Students
app.get('/api/students', (req, res) => {
  const { status, year } = req.query;
  let result = Array.from(students.values());
  if (status) result = result.filter(s => s.status === status);
  if (year) result = result.filter(s => s.year === parseInt(year));
  res.json({ success: true, count: result.length, students: result });
});

app.post('/api/students', (req, res) => {
  const { name, email, studentId, year, major } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email required' });
  }
  const student = {
    id: uuidv4(),
    name,
    email,
    studentId: studentId || `STU-${Date.now().toString(36).toUpperCase()}`,
    year: year || 1,
    major: major || 'undeclared',
    gpa: 0,
    creditsCompleted: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  students.set(student.id, student);
  res.status(201).json({ success: true, student });
});

// Instructors
app.get('/api/instructors', (req, res) => {
  const { department, status } = req.query;
  let result = Array.from(instructors.values());
  if (department) result = result.filter(i => i.department === department);
  if (status) result = result.filter(i => i.status === status);
  res.json({ success: true, count: result.length, instructors: result });
});

app.post('/api/instructors', (req, res) => {
  const { name, email, department, title } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email required' });
  }
  const instructor = {
    id: uuidv4(),
    name,
    email,
    department: department || 'general',
    title: title || 'Instructor',
    courses: [],
    status: 'active',
    createdAt: new Date().toISOString()
  };
  instructors.set(instructor.id, instructor);
  res.status(201).json({ success: true, instructor });
});

// Enrollments
app.get('/api/enrollments', (req, res) => {
  const { courseId, studentId, status } = req.query;
  let result = Array.from(enrollments.values());
  if (courseId) result = result.filter(e => e.courseId === courseId);
  if (studentId) result = result.filter(e => e.studentId === studentId);
  if (status) result = result.filter(e => e.status === status);
  res.json({ success: true, count: result.length, enrollments: result });
});

app.post('/api/enrollments', (req, res) => {
  const { courseId, studentId, semester } = req.body;
  if (!courseId || !studentId) {
    return res.status(400).json({ success: false, error: 'courseId and studentId required' });
  }
  const enrollment = {
    id: uuidv4(),
    courseId,
    studentId,
    semester: semester || '2026-Fall',
    status: 'enrolled',
    progress: 0,
    finalGrade: null,
    createdAt: new Date().toISOString()
  };
  enrollments.set(enrollment.id, enrollment);

  // Update course enrolled count
  const course = courses.get(courseId);
  if (course) { course.enrolled++; courses.set(course.id, course); }

  res.status(201).json({ success: true, enrollment });
});

// Assignments
app.get('/api/assignments', (req, res) => {
  const { courseId, status } = req.query;
  let result = Array.from(assignments.values());
  if (courseId) result = result.filter(a => a.courseId === courseId);
  if (status) result = result.filter(a => a.status === status);
  res.json({ success: true, count: result.length, assignments: result });
});

app.post('/api/assignments', (req, res) => {
  const { courseId, title, description, dueDate, maxPoints } = req.body;
  if (!courseId || !title) {
    return res.status(400).json({ success: false, error: 'courseId and title required' });
  }
  const assignment = {
    id: uuidv4(),
    courseId,
    title,
    description: description || '',
    dueDate: dueDate || null,
    maxPoints: maxPoints || 100,
    status: 'active',
    submissions: 0,
    createdAt: new Date().toISOString()
  };
  assignments.set(assignment.id, assignment);
  res.status(201).json({ success: true, assignment });
});

// Grades
app.get('/api/grades', (req, res) => {
  const { studentId, courseId } = req.query;
  let result = Array.from(grades.values());
  if (studentId) result = result.filter(g => g.studentId === studentId);
  if (courseId) result = result.filter(g => g.courseId === courseId);
  res.json({ success: true, count: result.length, grades: result });
});

app.post('/api/grades', (req, res) => {
  const { studentId, courseId, assignmentId, points, feedback } = req.body;
  if (!studentId || !courseId || points === undefined) {
    return res.status(400).json({ success: false, error: 'studentId, courseId, and points required' });
  }
  const grade = {
    id: uuidv4(),
    studentId,
    courseId,
    assignmentId: assignmentId || null,
    points,
    percentage: 0,
    letter: 'F',
    feedback: feedback || '',
    gradedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // Calculate percentage and letter grade
  const assignment = assignmentId ? assignments.get(assignmentId) : null;
  const maxPoints = assignment?.maxPoints || 100;
  grade.percentage = (points / maxPoints) * 100;
  if (grade.percentage >= 90) grade.letter = 'A';
  else if (grade.percentage >= 80) grade.letter = 'B';
  else if (grade.percentage >= 70) grade.letter = 'C';
  else if (grade.percentage >= 60) grade.letter = 'D';

  grades.set(grade.id, grade);
  res.status(201).json({ success: true, grade });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const allEnrollments = Array.from(enrollments.values());
  const courseIds = new Set(allEnrollments.map(e => e.courseId));

  res.json({
    success: true,
    analytics: {
      totalCourses: courses.size,
      activeCourses: Array.from(courses.values()).filter(c => c.status === 'active').length,
      totalStudents: students.size,
      totalInstructors: instructors.size,
      totalEnrollments: allEnrollments.length,
      totalAssignments: assignments.size,
      totalGrades: grades.size,
      averageGrade: grades.size > 0
        ? (Array.from(grades.values()).reduce((s, g) => s + g.percentage, 0) / grades.size).toFixed(1)
        : 0
    }
  });
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: err.message });
});


// ============= AUTH + DATABASE =============

const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = import('crypto');

function genToken() { return crypto.randomBytes(32).toString('hex'); }

// MongoDB support
let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;
const CRM_HUB_URL = process.env.CRM_HUB_URL || 'http://localhost:4056';

async function initDatabase() {
  if (!MONGODB_URI) return;
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.warn('MongoDB failed:', err.message);
  }
}

async function syncToCRM(endpoint, data) {
  if (!dbConnected) return;
  try {
    await fetch(`${CRM_HUB_URL}/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('CRM sync failed:', err.message);
  }
}

// Register business
app.post('/auth/register', (req, res) => {
  const { businessName, ownerName, email, phone, password, plan } = req.body;
  if (!businessName || !ownerName || !email || !password) {
    return res.status(400).json({ success: false, error: 'businessName, ownerName, email, password required' });
  }
  for (const [, u] of authUsers) {
    if (u.email === email && u.industry === 'education') {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
  }
  const businessId = 'BIZ_education_' + Date.now();
  const ownerId = 'OWN_education_' + Date.now();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const token = genToken();
  authBusinesses.set(businessId, {
    id: businessId, name: businessName, industry: 'education', email, phone: phone || '',
    plan: plan || 'starter', status: 'active', createdAt: new Date().toISOString()
  });
  authUsers.set(ownerId, {
    id: ownerId, businessId, industry: 'education', email, name: ownerName,
    role: 'owner', passwordHash, status: 'active', createdAt: new Date().toISOString()
  });
  authSessions.set(token, {
    userId: ownerId, businessId, industry: 'education', role: 'owner',
    createdAt: Date.now(), expiresAt: Date.now() + 2592000000
  });
  res.status(201).json({
    success: true, message: 'education registered',
    business: { id: businessId, name: businessName, industry: 'education' },
    user: { id: ownerId, name: ownerName, email, role: 'owner' },
    token
  });
});

// Login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  for (const [userId, user] of authUsers) {
    if (user.email === email && user.industry === 'education') {
      if (user.passwordHash !== passwordHash) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      const token = genToken();
      authSessions.set(token, {
        userId, businessId: user.businessId, industry: 'education', role: user.role,
        createdAt: Date.now(), expiresAt: Date.now() + 2592000000
      });
      return res.json({
        success: true, message: 'Login successful',
        user: { id: userId, name: user.name, email, role: user.role, businessId: user.businessId },
        business: authBusinesses.get(user.businessId),
        token
      });
    }
  }
  res.status(401).json({ success: false, error: 'User not found' });
});

// Verify token
app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token' });
  const token = authHeader.substring(7);
  const session = authSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) authSessions.delete(token);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  const user = authUsers.get(session.userId);
  res.json({ success: true, valid: true, user: { id: session.userId, name: user?.name, email: user?.email, role: session.role }, businessId: session.businessId });
});

// Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Authentication required' });
  const token = authHeader.substring(7);
  const session = authSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  req.session = session;
  next();
}

// Initialize database
initDatabase().catch(console.warn);

app.listen(PORT, () => {
  logger.info(`🎓 Education OS running on port ${PORT}`);
});

export default app;
