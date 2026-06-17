/**
 * Education OS - AI Company Platform
 *
 * Complete Education & Institute Management System
 * Port: 5060
 * Industry: Education (Schools, Colleges, Coaching, Training)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5060;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const INDUSTRY = 'education';

// In-memory database
const students = new Map();
const instructors = new Map();
const courses = new Map();
const batches = new Map();
const enrollments = new Map();
const attendance = new Map();
const grades = new Map();
const fees = new Map();
const payments = new Map();
const materials = new Map();
const schedules = new Map();
const announcements = new Map();
const assignments = new Map();
const submissions = new Map();
const invoices = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();

// Sample data - Students
const sampleStudents = [
  { id: 'STU001', name: 'Amit Sharma', email: 'amit.s@student.edu', phone: '+91 98765 44001', dob: '2002-05-15', gender: 'male', enrollmentDate: '2024-01-15', batchId: 'BTCH001', rollNumber: 'CS2024001', status: 'active', avatar: '👨‍🎓' },
  { id: 'STU002', name: 'Priya Patel', email: 'priya.p@student.edu', phone: '+91 98765 44002', dob: '2001-08-22', gender: 'female', enrollmentDate: '2024-01-15', batchId: 'BTCH001', rollNumber: 'CS2024002', status: 'active', avatar: '👩‍🎓' },
  { id: 'STU003', name: 'Rahul Gupta', email: 'rahul.g@student.edu', phone: '+91 98765 44003', dob: '2000-03-10', gender: 'male', enrollmentDate: '2023-07-01', batchId: 'BTCH002', rollNumber: 'CS2023001', status: 'active', avatar: '👨‍🎓' },
  { id: 'STU004', name: 'Sneha Reddy', email: 'sneha.r@student.edu', phone: '+91 98765 44004', dob: '2002-11-30', gender: 'female', enrollmentDate: '2024-01-15', batchId: 'BTCH001', rollNumber: 'CS2024003', status: 'active', avatar: '👩‍🎓' },
  { id: 'STU005', name: 'Vikram Singh', email: 'vikram.s@student.edu', phone: '+91 98765 44005', dob: '2001-07-18', gender: 'male', enrollmentDate: '2023-07-01', batchId: 'BTCH002', rollNumber: 'CS2023002', status: 'active', avatar: '👨‍🎓' }
];
sampleStudents.forEach(s => students.set(s.id, s));

// Sample data - Instructors
const sampleInstructors = [
  { id: 'INS001', name: 'Prof. Rajesh Kumar', email: 'rajesh.k@edu.in', phone: '+91 98765 44101', specialization: ['Data Structures', 'Algorithms', 'Python'], qualification: 'M.Tech, PhD', experience: 12, coursesAssigned: ['CRS001', 'CRS002'], rating: 4.8, avatar: '👨‍🏫', status: 'active' },
  { id: 'INS002', name: 'Dr. Priya Sharma', email: 'priya.s@edu.in', phone: '+91 98765 44102', specialization: ['Machine Learning', 'AI', 'Statistics'], qualification: 'PhD Stanford', experience: 8, coursesAssigned: ['CRS003'], rating: 4.9, avatar: '👩‍🏫', status: 'active' },
  { id: 'INS003', name: 'Prof. Amit Verma', email: 'amit.v@edu.in', phone: '+91 98765 44103', specialization: ['Web Development', 'Database', 'Cloud'], qualification: 'M.Tech', experience: 10, coursesAssigned: ['CRS004', 'CRS005'], rating: 4.6, avatar: '👨‍🏫', status: 'active' }
];
sampleInstructors.forEach(i => instructors.set(i.id, i));

// Sample data - Courses
const sampleCourses = [
  { id: 'CRS001', name: 'Data Structures & Algorithms', code: 'CS201', description: 'Fundamental data structures and algorithms', credits: 4, duration: '16 weeks', instructorId: 'INS001', level: 'intermediate', fee: 15000, seats: 60, enrolled: 55, status: 'active' },
  { id: 'CRS002', name: 'Python Programming', code: 'CS101', description: 'Introduction to Python programming', credits: 3, duration: '12 weeks', instructorId: 'INS001', level: 'beginner', fee: 10000, seats: 80, enrolled: 75, status: 'active' },
  { id: 'CRS003', name: 'Machine Learning Fundamentals', code: 'AI301', description: 'Core ML concepts and applications', credits: 4, duration: '16 weeks', instructorId: 'INS002', level: 'advanced', fee: 20000, seats: 40, enrolled: 38, status: 'active' },
  { id: 'CRS004', name: 'Full Stack Web Development', code: 'WD401', description: 'Modern web development with React & Node.js', credits: 4, duration: '20 weeks', instructorId: 'INS003', level: 'intermediate', fee: 18000, seats: 50, enrolled: 48, status: 'active' },
  { id: 'CRS005', name: 'Database Management Systems', code: 'CS302', description: 'SQL, NoSQL and database design', credits: 3, duration: '12 weeks', instructorId: 'INS003', level: 'intermediate', fee: 12000, seats: 60, enrolled: 52, status: 'active' }
];
sampleCourses.forEach(c => courses.set(c.id, c));

// Sample data - Batches
const sampleBatches = [
  { id: 'BTCH001', name: 'Batch 2024', year: 2024, courseIds: ['CRS001', 'CRS002', 'CRS003', 'CRS004', 'CRS005'], startDate: '2024-01-15', endDate: '2024-12-31', status: 'active' },
  { id: 'BTCH002', name: 'Batch 2023', year: 2023, courseIds: ['CRS001', 'CRS002', 'CRS004'], startDate: '2023-07-01', endDate: '2024-06-30', status: 'ongoing' }
];
sampleBatches.forEach(b => batches.set(b.id, b));

// Sample data - Enrollments
const sampleEnrollments = [
  { id: 'ENR001', studentId: 'STU001', courseId: 'CRS001', enrollmentDate: '2024-01-15', status: 'active', grade: null },
  { id: 'ENR002', studentId: 'STU001', courseId: 'CRS002', enrollmentDate: '2024-01-15', status: 'active', grade: 'A' },
  { id: 'ENR003', studentId: 'STU002', courseId: 'CRS001', enrollmentDate: '2024-01-15', status: 'active', grade: null },
  { id: 'ENR004', studentId: 'STU003', courseId: 'CRS004', enrollmentDate: '2023-07-01', status: 'active', grade: 'A+' },
  { id: 'ENR005', studentId: 'STU004', courseId: 'CRS003', enrollmentDate: '2024-01-15', status: 'active', grade: null },
  { id: 'ENR006', studentId: 'STU005', courseId: 'CRS004', enrollmentDate: '2023-07-01', status: 'active', grade: 'B+' }
];
sampleEnrollments.forEach(e => enrollments.set(e.id, e));

// Sample data - Study Materials
const sampleMaterials = [
  { id: 'MAT001', courseId: 'CRS001', title: 'Arrays and Linked Lists', type: 'notes', fileUrl: '/materials/dsa-arrays.pdf', uploadedBy: 'INS001', uploadedAt: '2024-01-20', status: 'active' },
  { id: 'MAT002', courseId: 'CRS001', title: 'Stack and Queue Implementation', type: 'code', fileUrl: '/materials/dsa-stack.cpp', uploadedBy: 'INS001', uploadedAt: '2024-01-25', status: 'active' },
  { id: 'MAT003', courseId: 'CRS003', title: 'Linear Regression Tutorial', type: 'video', fileUrl: '/materials/ml-linear-reg.mp4', uploadedBy: 'INS002', uploadedAt: '2024-02-01', status: 'active' }
];
sampleMaterials.forEach(m => materials.set(m.id, m));

// Sample data - Announcements
const sampleAnnouncements = [
  { id: 'ANN001', courseId: 'CRS001', title: 'Mid-term Exam Schedule', content: 'Mid-term exam on March 15, 2024', postedBy: 'INS001', postedAt: '2024-02-28', priority: 'high' },
  { id: 'ANN002', courseId: null, title: 'Campus Placement Drive', content: 'Google and Microsoft coming for campus placements next week', postedBy: 'admin', postedAt: '2024-03-01', priority: 'high' }
];
sampleAnnouncements.forEach(a => announcements.set(a.id, a));

// Auth functions
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { email, password, role, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });
  if (authUsers.has(email)) return res.status(409).json({ error: 'User exists' });
  const user = { id: 'user_' + Date.now(), email, passwordHash: hashPassword(password), role: role || 'student', name: name || email.split('@')[0], industry: INDUSTRY, createdAt: new Date().toISOString() };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid token' });
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid token' });
  req.session = session;
  next();
}

// Students
app.get('/api/students', requireAuth, (req, res) => {
  const { batchId, status } = req.query;
  let result = Array.from(students.values());
  if (batchId) result = result.filter(s => s.batchId === batchId);
  if (status) result = result.filter(s => s.status === status);
  res.json({ success: true, count: result.length, students: result });
});

app.get('/api/students/:id', requireAuth, (req, res) => {
  const student = students.get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const studentEnrollments = Array.from(enrollments.values()).filter(e => e.studentId === student.id);
  const studentGrades = Array.from(grades.values()).filter(g => g.studentId === student.id);
  res.json({ success: true, student, enrollments: studentEnrollments, grades: studentGrades });
});

app.post('/api/students', requireAuth, (req, res) => {
  const student = { id: 'STU' + String(students.size + 1).padStart(3, '0'), ...req.body, status: 'active', enrollmentDate: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
  students.set(student.id, student);
  res.status(201).json({ success: true, student });
});

app.patch('/api/students/:id', requireAuth, (req, res) => {
  const student = students.get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const updated = { ...student, ...req.body };
  students.set(student.id, updated);
  res.json({ success: true, student: updated });
});

// Instructors
app.get('/api/instructors', requireAuth, (req, res) => {
  const { specialization, status } = req.query;
  let result = Array.from(instructors.values());
  if (status) result = result.filter(i => i.status === status);
  res.json({ success: true, count: result.length, instructors: result });
});

app.get('/api/instructors/:id', requireAuth, (req, res) => {
  const instructor = instructors.get(req.params.id);
  if (!instructor) return res.status(404).json({ error: 'Instructor not found' });
  const instructorCourses = Array.from(courses.values()).filter(c => c.instructorId === instructor.id);
  res.json({ success: true, instructor, courses: instructorCourses });
});

app.post('/api/instructors', requireAuth, (req, res) => {
  const instructor = { id: 'INS' + String(instructors.size + 1).padStart(3, '0'), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  instructors.set(instructor.id, instructor);
  res.status(201).json({ success: true, instructor });
});

app.patch('/api/instructors/:id', requireAuth, (req, res) => {
  const instructor = instructors.get(req.params.id);
  if (!instructor) return res.status(404).json({ error: 'Instructor not found' });
  const updated = { ...instructor, ...req.body };
  instructors.set(instructor.id, updated);
  res.json({ success: true, instructor: updated });
});

// Courses
app.get('/api/courses', requireAuth, (req, res) => {
  const { instructorId, level, status } = req.query;
  let result = Array.from(courses.values());
  if (instructorId) result = result.filter(c => c.instructorId === instructorId);
  if (level) result = result.filter(c => c.level === level);
  if (status) result = result.filter(c => c.status === status);
  res.json({ success: true, count: result.length, courses: result });
});

app.get('/api/courses/:id', requireAuth, (req, res) => {
  const course = courses.get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const instructor = instructors.get(course.instructorId);
  const courseEnrollments = Array.from(enrollments.values()).filter(e => e.courseId === course.id);
  const courseMaterials = Array.from(materials.values()).filter(m => m.courseId === course.id);
  res.json({ success: true, course, instructor, enrollments: courseEnrollments, materials: courseMaterials });
});

app.post('/api/courses', requireAuth, (req, res) => {
  const course = { id: 'CRS' + String(courses.size + 1).padStart(3, '0'), ...req.body, enrolled: 0, status: 'active', createdAt: new Date().toISOString() };
  courses.set(course.id, course);
  res.status(201).json({ success: true, course });
});

app.patch('/api/courses/:id', requireAuth, (req, res) => {
  const course = courses.get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const updated = { ...course, ...req.body };
  courses.set(course.id, updated);
  res.json({ success: true, course: updated });
});

// Batches
app.get('/api/batches', requireAuth, (req, res) => {
  const { status, year } = req.query;
  let result = Array.from(batches.values());
  if (status) result = result.filter(b => b.status === status);
  if (year) result = result.filter(b => b.year === parseInt(year));
  res.json({ success: true, count: result.length, batches: result });
});

app.get('/api/batches/:id', requireAuth, (req, res) => {
  const batch = batches.get(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  const batchStudents = Array.from(students.values()).filter(s => s.batchId === batch.id);
  res.json({ success: true, batch, students: batchStudents });
});

app.post('/api/batches', requireAuth, (req, res) => {
  const batch = { id: 'BTCH' + Date.now(), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  batches.set(batch.id, batch);
  res.status(201).json({ success: true, batch });
});

// Enrollments
app.get('/api/enrollments', requireAuth, (req, res) => {
  const { studentId, courseId, status } = req.query;
  let result = Array.from(enrollments.values());
  if (studentId) result = result.filter(e => e.studentId === studentId);
  if (courseId) result = result.filter(e => e.courseId === courseId);
  if (status) result = result.filter(e => e.status === status);
  res.json({ success: true, count: result.length, enrollments: result });
});

app.post('/api/enrollments', requireAuth, (req, res) => {
  const { studentId, courseId } = req.body;
  const course = courses.get(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.enrolled >= course.seats) return res.status(400).json({ error: 'Course full' });

  const enrollment = { id: 'ENR' + Date.now(), studentId, courseId, enrollmentDate: new Date().toISOString().split('T')[0], status: 'active', grade: null, createdAt: new Date().toISOString() };
  enrollments.set(enrollment.id, enrollment);

  course.enrolled++;
  courses.set(course.id, course);

  res.status(201).json({ success: true, enrollment });
});

// Attendance
app.get('/api/attendance', requireAuth, (req, res) => {
  const { studentId, courseId, date } = req.query;
  let result = Array.from(attendance.values());
  if (studentId) result = result.filter(a => a.studentId === studentId);
  if (courseId) result = result.filter(a => a.courseId === courseId);
  if (date) result = result.filter(a => a.date === date);
  res.json({ success: true, count: result.length, attendance: result });
});

app.post('/api/attendance', requireAuth, (req, res) => {
  const { studentId, courseId, date, status } = req.body;
  const record = { id: 'ATT' + Date.now(), studentId, courseId, date: date || new Date().toISOString().split('T')[0], status: status || 'present', createdAt: new Date().toISOString() };
  attendance.set(record.id, record);
  res.status(201).json({ success: true, attendance: record });
});

// Grades
app.get('/api/grades', requireAuth, (req, res) => {
  const { studentId, courseId } = req.query;
  let result = Array.from(grades.values());
  if (studentId) result = result.filter(g => g.studentId === studentId);
  if (courseId) result = result.filter(g => g.courseId === courseId);
  res.json({ success: true, count: result.length, grades: result });
});

app.post('/api/grades', requireAuth, (req, res) => {
  const { studentId, courseId, assessmentType, score, maxScore, grade, remarks } = req.body;
  const gradeRecord = { id: 'GRD' + Date.now(), studentId, courseId, assessmentType, score, maxScore, grade, remarks, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
  grades.set(gradeRecord.id, gradeRecord);

  // Update enrollment grade if final
  if (assessmentType === 'final') {
    const enrollment = Array.from(enrollments.values()).find(e => e.studentId === studentId && e.courseId === courseId);
    if (enrollment) {
      enrollment.grade = grade;
      enrollments.set(enrollment.id, enrollment);
    }
  }

  res.status(201).json({ success: true, grade: gradeRecord });
});

// Fees & Payments
app.get('/api/fees', requireAuth, (req, res) => {
  const { studentId, status } = req.query;
  let result = Array.from(fees.values());
  if (studentId) result = result.filter(f => f.studentId === studentId);
  if (status) result = result.filter(f => f.status === status);
  res.json({ success: true, count: result.length, fees: result });
});

app.post('/api/fees', requireAuth, (req, res) => {
  const { studentId, amount, description, dueDate } = req.body;
  const fee = { id: 'FEE' + Date.now(), studentId, amount, description: description || 'Course Fee', status: 'pending', dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], createdAt: new Date().toISOString() };
  fees.set(fee.id, fee);
  res.status(201).json({ success: true, fee });
});

app.get('/api/payments', requireAuth, (req, res) => {
  const { studentId, status } = req.query;
  let result = Array.from(payments.values());
  if (studentId) result = result.filter(p => p.studentId === studentId);
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, payments: result });
});

app.post('/api/payments', requireAuth, (req, res) => {
  const { studentId, feeId, amount, method, reference } = req.body;
  const payment = { id: 'PAY' + Date.now(), studentId, feeId, amount, method: method || 'online', reference, status: 'completed', date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
  payments.set(payment.id, payment);

  // Update fee status
  if (feeId) {
    const fee = fees.get(feeId);
    if (fee) {
      const totalPaid = Array.from(payments.values()).filter(p => p.feeId === feeId).reduce((sum, p) => sum + p.amount, 0);
      fee.status = totalPaid >= fee.amount ? 'paid' : 'partial';
      fees.set(fee.id, fee);
    }
  }

  res.status(201).json({ success: true, payment });
});

// Study Materials
app.get('/api/materials', requireAuth, (req, res) => {
  const { courseId, type } = req.query;
  let result = Array.from(materials.values());
  if (courseId) result = result.filter(m => m.courseId === courseId);
  if (type) result = result.filter(m => m.type === type);
  res.json({ success: true, count: result.length, materials: result });
});

app.post('/api/materials', requireAuth, (req, res) => {
  const material = { id: 'MAT' + Date.now(), ...req.body, uploadedBy: req.session.userId, uploadedAt: new Date().toISOString().split('T')[0], status: 'active', createdAt: new Date().toISOString() };
  materials.set(material.id, material);
  res.status(201).json({ success: true, material });
});

// Announcements
app.get('/api/announcements', requireAuth, (req, res) => {
  const { courseId, priority } = req.query;
  let result = Array.from(announcements.values());
  if (courseId) result = result.filter(a => a.courseId === courseId);
  if (priority) result = result.filter(a => a.priority === priority);
  res.json({ success: true, count: result.length, announcements: result });
});

app.post('/api/announcements', requireAuth, (req, res) => {
  const announcement = { id: 'ANN' + Date.now(), ...req.body, postedBy: req.session.userId, postedAt: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
  announcements.set(announcement.id, announcement);
  res.status(201).json({ success: true, announcement });
});

// Assignments & Submissions
app.get('/api/assignments', requireAuth, (req, res) => {
  const { courseId } = req.query;
  let result = Array.from(assignments.values());
  if (courseId) result = result.filter(a => a.courseId === courseId);
  res.json({ success: true, count: result.length, assignments: result });
});

app.post('/api/assignments', requireAuth, (req, res) => {
  const assignment = { id: 'ASN' + Date.now(), ...req.body, postedBy: req.session.userId, postedAt: new Date().toISOString().split('T')[0], status: 'active', createdAt: new Date().toISOString() };
  assignments.set(assignment.id, assignment);
  res.status(201).json({ success: true, assignment });
});

app.get('/api/submissions', requireAuth, (req, res) => {
  const { assignmentId, studentId } = req.query;
  let result = Array.from(submissions.values());
  if (assignmentId) result = result.filter(s => s.assignmentId === assignmentId);
  if (studentId) result = result.filter(s => s.studentId === studentId);
  res.json({ success: true, count: result.length, submissions: result });
});

app.post('/api/submissions', requireAuth, (req, res) => {
  const submission = { id: 'SUB' + Date.now(), ...req.body, submittedAt: new Date().toISOString(), status: 'submitted', createdAt: new Date().toISOString() };
  submissions.set(submission.id, submission);
  res.status(201).json({ success: true, submission });
});

// Analytics
app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const studentList = Array.from(students.values());
  const enrollmentList = Array.from(enrollments.values());

  res.json({
    success: true,
    overview: {
      totalStudents: studentList.length,
      activeStudents: studentList.filter(s => s.status === 'active').length,
      totalInstructors: instructors.size,
      activeInstructors: Array.from(instructors.values()).filter(i => i.status === 'active').length,
      totalCourses: courses.size,
      activeCourses: Array.from(courses.values()).filter(c => c.status === 'active').length,
      totalEnrollments: enrollmentList.length,
      activeEnrollments: enrollmentList.filter(e => e.status === 'active').length,
      avgGrade: enrollmentList.filter(e => e.grade).length > 0 ? 'B+' : null,
      totalFees: Array.from(fees.values()).reduce((sum, f) => sum + f.amount, 0),
      totalCollections: Array.from(payments.values()).reduce((sum, p) => sum + p.amount, 0)
    }
  });
});

app.get('/api/analytics/courses', requireAuth, (req, res) => {
  const courseList = Array.from(courses.values());
  const courseStats = courseList.map(c => {
    const instructor = instructors.get(c.instructorId);
    return { courseId: c.id, name: c.name, code: c.code, enrolled: c.enrolled, seats: c.seats, utilization: c.seats > 0 ? (c.enrolled / c.seats) * 100 : 0, fee: c.fee, instructor: instructor ? instructor.name : null };
  }).sort((a, b) => b.utilization - a.utilization);
  res.json({ success: true, courses: courseStats });
});

app.get('/api/analytics/students', requireAuth, (req, res) => {
  const studentList = Array.from(students.values());
  const studentStats = studentList.map(s => {
    const studentEnrollments = Array.from(enrollments.values()).filter(e => e.studentId === s.id);
    const grades = Array.from(grades.values()).filter(g => g.studentId === s.id);
    const attendanceList = Array.from(attendance.values()).filter(a => a.studentId === s.id);
    return { studentId: s.id, name: s.name, batchId: s.batchId, enrollments: studentEnrollments.length, avgScore: grades.length > 0 ? Math.round(grades.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / grades.length) : null, attendanceRate: attendanceList.length > 0 ? Math.round((attendanceList.filter(a => a.status === 'present').length / attendanceList.length) * 100) : 100 };
  });
  res.json({ success: true, students: studentStats });
});

// RTMN Layer Integrations
app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({ layer: 1, name: 'Intelligence', capabilities: ['AI Tutor', 'Smart Grading', 'Learning Analytics', 'Content Recommendation'], status: 'available' });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({ layer: 2, name: 'Customer Growth', capabilities: ['Student Acquisition', 'Enrollment Campaigns', 'Referral Programs', 'CRM'], status: 'available' });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({ layer: 3, name: 'Commerce', capabilities: ['Course Sales', 'Certification', 'Books & Materials', 'Tutoring Services'], status: 'available' });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({ layer: 4, name: 'Finance', capabilities: ['Fee Collection', 'Scholarship Management', 'Payment Plans', 'Financial Aid'], status: 'available' });
});

app.get('/api/layers', requireAuth, (req, res) => {
  res.json({ industry: INDUSTRY, service: 'Education OS', layers: 15, version: '2.0.0' });
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Education OS', version: '2.0.0', port: PORT, industry: 'Education', timestamp: new Date().toISOString(), stats: { students: students.size, instructors: instructors.size, courses: courses.size, enrollments: enrollments.size } });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                  EDUCATION OS v2.0.0                ║
║            Complete Institute Management             ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Features:                                             ║
║  • Student Management                                 ║
║  • Instructor Management                              ║
║  • Course & Batch Management                         ║
║  • Enrollment & Attendance                           ║
║  • Grades & Assessments                               ║
║  • Fee Management & Payments                          ║
║  • Study Materials & Announcements                   ║
║  • Assignments & Submissions                          ║
║  • Analytics & Reporting                             ║
╚══════════════════════════════════════════════════════════╝`);
});
