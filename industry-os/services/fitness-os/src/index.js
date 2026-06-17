/**
 * Fitness OS - AI Company Platform
 *
 * Complete Fitness & Gym Management System
 * Port: 5110
 * Industry: Fitness (Gyms, Studios, Personal Training)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5110;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const INDUSTRY = 'fitness';

// In-memory database
const members = new Map();
const trainers = new Map();
const classes = new Map();
const enrollments = new Map();
const attendance = new Map();
const subscriptions = new Map();
const payments = new Map();
const goals = new Map();
const assessments = new Map();
const nutritionPlans = new Map();
const workoutPlans = new Map();
const invoices = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();

// Sample data - Members
const sampleMembers = [
  {
    id: 'MBR001',
    name: 'Arjun Patel',
    email: 'arjun.patel@email.com',
    phone: '+91 98765 43210',
    dob: '1992-05-15',
    gender: 'male',
    membershipType: 'premium',
    membershipExpiry: '2025-06-30',
    joinDate: '2023-01-10',
    height: 175,
    weight: 78,
    goal: 'muscle_gain',
    emergencyContact: '+91 98765 43211',
    avatar: '💪',
    status: 'active'
  },
  {
    id: 'MBR002',
    name: 'Priya Singh',
    email: 'priya.singh@email.com',
    phone: '+91 98765 43220',
    dob: '1995-08-20',
    gender: 'female',
    membershipType: 'standard',
    membershipExpiry: '2024-12-31',
    joinDate: '2023-06-15',
    height: 162,
    weight: 58,
    goal: 'weight_loss',
    emergencyContact: '+91 98765 43221',
    avatar: '🏋️‍♀️',
    status: 'active'
  },
  {
    id: 'MBR003',
    name: 'Rahul Sharma',
    email: 'rahul.s@email.com',
    phone: '+91 98765 43230',
    dob: '1988-03-10',
    gender: 'male',
    membershipType: 'premium',
    membershipExpiry: '2025-03-15',
    joinDate: '2022-09-01',
    height: 180,
    weight: 92,
    goal: 'general_fitness',
    emergencyContact: '+91 98765 43231',
    avatar: '🏃',
    status: 'active'
  }
];
sampleMembers.forEach(m => members.set(m.id, m));

// Sample data - Trainers
const sampleTrainers = [
  {
    id: 'TRN001',
    name: 'Coach Vikram',
    email: 'vikram@fitpro.in',
    phone: '+91 98765 43310',
    specialization: ['Strength Training', 'Bodybuilding'],
    certifications: ['ACE Certified', 'NSCA CSCS'],
    experience: 8,
    hourlyRate: 1000,
    rating: 4.8,
    classesTaken: 450,
    membersAssigned: 25,
    availability: 'full_time',
    avatar: '🏋️',
    status: 'active'
  },
  {
    id: 'TRN002',
    name: 'Trainer Neha',
    email: 'neha@fitpro.in',
    phone: '+91 98765 43320',
    specialization: ['Yoga', 'Pilates', 'Weight Loss'],
    certifications: ['RYT 500', 'ACE Group Fitness'],
    experience: 5,
    hourlyRate: 800,
    rating: 4.9,
    classesTaken: 320,
    membersAssigned: 30,
    availability: 'part_time',
    avatar: '🧘‍♀️',
    status: 'active'
  },
  {
    id: 'TRN003',
    name: 'Coach Amit',
    email: 'amit@fitpro.in',
    phone: '+91 98765 43330',
    specialization: ['CrossFit', 'HIIT', 'Cardio'],
    certifications: ['CrossFit L2', 'AFAA Group Exercise'],
    experience: 6,
    hourlyRate: 900,
    rating: 4.7,
    classesTaken: 380,
    membersAssigned: 20,
    availability: 'full_time',
    avatar: '💪',
    status: 'active'
  }
];
sampleTrainers.forEach(t => trainers.set(t.id, t));

// Sample data - Classes
const sampleClasses = [
  {
    id: 'CLS001',
    name: 'Morning Yoga',
    type: 'yoga',
    trainerId: 'TRN002',
    dayOfWeek: [1, 2, 3, 4, 5],
    startTime: '06:00',
    duration: 60,
    capacity: 20,
    enrolled: 15,
    level: 'all',
    room: 'Studio A',
    status: 'active'
  },
  {
    id: 'CLS002',
    name: 'HIIT Blast',
    type: 'hiit',
    trainerId: 'TRN003',
    dayOfWeek: [1, 3, 5],
    startTime: '18:00',
    duration: 45,
    capacity: 15,
    enrolled: 12,
    level: 'intermediate',
    room: 'Cardio Zone',
    status: 'active'
  },
  {
    id: 'CLS003',
    name: 'Strength Training',
    type: 'strength',
    trainerId: 'TRN001',
    dayOfWeek: [2, 4, 6],
    startTime: '07:00',
    duration: 60,
    capacity: 12,
    enrolled: 10,
    level: 'beginner',
    room: 'Weights Area',
    status: 'active'
  },
  {
    id: 'CLS004',
    name: 'Zumba Party',
    type: 'dance',
    trainerId: 'TRN002',
    dayOfWeek: [6],
    startTime: '10:00',
    duration: 60,
    capacity: 30,
    enrolled: 28,
    level: 'all',
    room: 'Dance Studio',
    status: 'active'
  }
];
sampleClasses.forEach(c => classes.set(c.id, c));

// Sample data - Enrollments
const sampleEnrollments = [
  { id: 'ENR001', memberId: 'MBR001', classId: 'CLS003', enrolledDate: '2024-01-15', status: 'active' },
  { id: 'ENR002', memberId: 'MBR001', classId: 'CLS002', enrolledDate: '2024-02-01', status: 'active' },
  { id: 'ENR003', memberId: 'MBR002', classId: 'CLS001', enrolledDate: '2024-03-10', status: 'active' },
  { id: 'ENR004', memberId: 'MBR002', classId: 'CLS004', enrolledDate: '2024-03-10', status: 'active' },
  { id: 'ENR005', memberId: 'MBR003', classId: 'CLS003', enrolledDate: '2023-09-15', status: 'active' }
];
sampleEnrollments.forEach(e => enrollments.set(e.id, e));

// Sample data - Subscriptions
const sampleSubscriptions = [
  { id: 'SUB001', memberId: 'MBR001', plan: 'premium', amount: 5000, duration: 12, startDate: '2024-06-01', endDate: '2025-06-01', status: 'active', autoRenew: true },
  { id: 'SUB002', memberId: 'MBR002', plan: 'standard', amount: 2500, duration: 6, startDate: '2024-07-01', endDate: '2024-12-31', status: 'active', autoRenew: false },
  { id: 'SUB003', memberId: 'MBR003', plan: 'premium', amount: 5000, duration: 12, startDate: '2024-03-15', endDate: '2025-03-15', status: 'active', autoRenew: true }
];
sampleSubscriptions.forEach(s => subscriptions.set(s.id, s));

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
  const user = { id: 'user_' + Date.now(), email, passwordHash: hashPassword(password), role: role || 'member', name: name || email.split('@')[0], industry: INDUSTRY, createdAt: new Date().toISOString() };
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

// Members
app.get('/api/members', requireAuth, (req, res) => {
  const { status, membershipType } = req.query;
  let result = Array.from(members.values());
  if (status) result = result.filter(m => m.status === status);
  if (membershipType) result = result.filter(m => m.membershipType === membershipType);
  res.json({ success: true, count: result.length, members: result });
});

app.get('/api/members/:id', requireAuth, (req, res) => {
  const member = members.get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  const memberEnrollments = Array.from(enrollments.values()).filter(e => e.memberId === member.id);
  const memberSubscriptions = Array.from(subscriptions.values()).filter(s => s.memberId === member.id);
  res.json({ success: true, member, enrollments: memberEnrollments, subscriptions: memberSubscriptions });
});

app.post('/api/members', requireAuth, (req, res) => {
  const member = { id: 'MBR' + String(members.size + 1).padStart(3, '0'), ...req.body, status: 'active', joinDate: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
  members.set(member.id, member);
  res.status(201).json({ success: true, member });
});

app.patch('/api/members/:id', requireAuth, (req, res) => {
  const member = members.get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  const updated = { ...member, ...req.body };
  members.set(member.id, updated);
  res.json({ success: true, member: updated });
});

// Trainers
app.get('/api/trainers', requireAuth, (req, res) => {
  const { specialization, status } = req.query;
  let result = Array.from(trainers.values());
  if (specialization) result = result.filter(t => t.specialization.includes(specialization));
  if (status) result = result.filter(t => t.status === status);
  res.json({ success: true, count: result.length, trainers: result });
});

app.get('/api/trainers/:id', requireAuth, (req, res) => {
  const trainer = trainers.get(req.params.id);
  if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
  const trainerClasses = Array.from(classes.values()).filter(c => c.trainerId === trainer.id);
  res.json({ success: true, trainer, classes: trainerClasses });
});

app.post('/api/trainers', requireAuth, (req, res) => {
  const trainer = { id: 'TRN' + String(trainers.size + 1).padStart(3, '0'), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  trainers.set(trainer.id, trainer);
  res.status(201).json({ success: true, trainer });
});

app.patch('/api/trainers/:id', requireAuth, (req, res) => {
  const trainer = trainers.get(req.params.id);
  if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
  const updated = { ...trainer, ...req.body };
  trainers.set(trainer.id, updated);
  res.json({ success: true, trainer: updated });
});

// Classes
app.get('/api/classes', requireAuth, (req, res) => {
  const { type, trainerId, dayOfWeek, level } = req.query;
  let result = Array.from(classes.values());
  if (type) result = result.filter(c => c.type === type);
  if (trainerId) result = result.filter(c => c.trainerId === trainerId);
  if (level) result = result.filter(c => c.level === level);
  if (dayOfWeek) result = result.filter(c => c.dayOfWeek.includes(parseInt(dayOfWeek)));
  res.json({ success: true, count: result.length, classes: result });
});

app.get('/api/classes/:id', requireAuth, (req, res) => {
  const cls = classes.get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const trainer = trainers.get(cls.trainerId);
  const classEnrollments = Array.from(enrollments.values()).filter(e => e.classId === cls.id);
  res.json({ success: true, class: cls, trainer, enrollments: classEnrollments });
});

app.post('/api/classes', requireAuth, (req, res) => {
  const cls = { id: 'CLS' + String(classes.size + 1).padStart(3, '0'), ...req.body, enrolled: 0, status: 'active', createdAt: new Date().toISOString() };
  classes.set(cls.id, cls);
  res.status(201).json({ success: true, class: cls });
});

app.patch('/api/classes/:id', requireAuth, (req, res) => {
  const cls = classes.get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const updated = { ...cls, ...req.body };
  classes.set(cls.id, updated);
  res.json({ success: true, class: updated });
});

// Enrollments
app.get('/api/enrollments', requireAuth, (req, res) => {
  const { memberId, classId, status } = req.query;
  let result = Array.from(enrollments.values());
  if (memberId) result = result.filter(e => e.memberId === memberId);
  if (classId) result = result.filter(e => e.classId === classId);
  if (status) result = result.filter(e => e.status === status);
  res.json({ success: true, count: result.length, enrollments: result });
});

app.post('/api/enrollments', requireAuth, (req, res) => {
  const { memberId, classId } = req.body;
  const cls = classes.get(classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (cls.enrolled >= cls.capacity) return res.status(400).json({ error: 'Class full' });

  const enrollment = { id: 'ENR' + Date.now(), memberId, classId, enrolledDate: new Date().toISOString().split('T')[0], status: 'active', createdAt: new Date().toISOString() };
  enrollments.set(enrollment.id, enrollment);

  cls.enrolled++;
  classes.set(cls.id, cls);

  res.status(201).json({ success: true, enrollment });
});

app.patch('/api/enrollments/:id', requireAuth, (req, res) => {
  const enrollment = enrollments.get(req.params.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  const updated = { ...enrollment, ...req.body };
  enrollments.set(enrollment.id, updated);
  res.json({ success: true, enrollment: updated });
});

// Attendance
app.get('/api/attendance', requireAuth, (req, res) => {
  const { memberId, date } = req.query;
  let result = Array.from(attendance.values());
  if (memberId) result = result.filter(a => a.memberId === memberId);
  if (date) result = result.filter(a => a.date === date);
  res.json({ success: true, count: result.length, attendance: result });
});

app.post('/api/attendance', requireAuth, (req, res) => {
  const { memberId, classId, checkIn, checkOut } = req.body;
  const record = { id: 'ATT' + Date.now(), memberId, classId: classId || null, date: new Date().toISOString().split('T')[0], checkIn: checkIn || new Date().toISOString(), checkOut, createdAt: new Date().toISOString() };
  attendance.set(record.id, record);
  res.status(201).json({ success: true, attendance: record });
});

// Subscriptions
app.get('/api/subscriptions', requireAuth, (req, res) => {
  const { memberId, status, plan } = req.query;
  let result = Array.from(subscriptions.values());
  if (memberId) result = result.filter(s => s.memberId === memberId);
  if (status) result = result.filter(s => s.status === status);
  if (plan) result = result.filter(s => s.plan === plan);
  res.json({ success: true, count: result.length, subscriptions: result });
});

app.post('/api/subscriptions', requireAuth, (req, res) => {
  const { memberId, plan, amount, duration } = req.body;
  const sub = { id: 'SUB' + Date.now(), memberId, plan, amount, duration, startDate: new Date().toISOString().split('T')[0], endDate: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'active', autoRenew: false, createdAt: new Date().toISOString() };
  subscriptions.set(sub.id, sub);
  res.status(201).json({ success: true, subscription: sub });
});

app.patch('/api/subscriptions/:id', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  const updated = { ...sub, ...req.body };
  subscriptions.set(sub.id, updated);
  res.json({ success: true, subscription: updated });
});

// Goals & Assessments
app.get('/api/goals', requireAuth, (req, res) => {
  const { memberId, status } = req.query;
  let result = Array.from(goals.values());
  if (memberId) result = result.filter(g => g.memberId === memberId);
  if (status) result = result.filter(g => g.status === status);
  res.json({ success: true, count: result.length, goals: result });
});

app.post('/api/goals', requireAuth, (req, res) => {
  const goal = { id: 'GOAL' + Date.now(), ...req.body, status: 'in_progress', createdAt: new Date().toISOString() };
  goals.set(goal.id, goal);
  res.status(201).json({ success: true, goal });
});

app.get('/api/assessments', requireAuth, (req, res) => {
  const { memberId } = req.query;
  let result = Array.from(assessments.values());
  if (memberId) result = result.filter(a => a.memberId === memberId);
  res.json({ success: true, count: result.length, assessments: result });
});

app.post('/api/assessments', requireAuth, (req, res) => {
  const assessment = { id: 'ASSESS' + Date.now(), ...req.body, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
  assessments.set(assessment.id, assessment);
  res.status(201).json({ success: true, assessment });
});

// Payments & Invoices
app.get('/api/payments', requireAuth, (req, res) => {
  const { memberId, status } = req.query;
  let result = Array.from(payments.values());
  if (memberId) result = result.filter(p => p.memberId === memberId);
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, payments: result });
});

app.post('/api/payments', requireAuth, (req, res) => {
  const { memberId, amount, method, description } = req.body;
  const payment = { id: 'PAY' + Date.now(), memberId, amount, method: method || 'online', description: description || 'Membership', status: 'completed', date: new Date().toISOString(), createdAt: new Date().toISOString() };
  payments.set(payment.id, payment);
  res.status(201).json({ success: true, payment });
});

app.get('/api/invoices', requireAuth, (req, res) => {
  const { memberId, status } = req.query;
  let result = Array.from(invoices.values());
  if (memberId) result = result.filter(i => i.memberId === memberId);
  if (status) result = result.filter(i => i.status === status);
  res.json({ success: true, count: result.length, invoices: result });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const { memberId, amount, description, dueDate } = req.body;
  const invoice = { id: 'INV' + Date.now(), invoiceNumber: `FIT/2024/${Date.now()}`, memberId, amount, tax: Math.round(amount * 0.18), total: Math.round(amount * 1.18), description: description || 'Gym Membership', status: 'pending', dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], createdAt: new Date().toISOString() };
  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, invoice });
});

// Analytics
app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const memberList = Array.from(members.values());
  const activeMembers = memberList.filter(m => m.status === 'active');
  const premiumMembers = activeMembers.filter(m => m.membershipType === 'premium');

  res.json({
    success: true,
    overview: {
      totalMembers: memberList.length,
      activeMembers: activeMembers.length,
      premiumMembers: premiumMembers.length,
      standardMembers: activeMembers.filter(m => m.membershipType === 'standard').length,
      totalTrainers: trainers.size,
      totalClasses: classes.size,
      totalEnrollments: enrollments.size,
      totalSubscriptions: subscriptions.size,
      activeSubscriptions: Array.from(subscriptions.values()).filter(s => s.status === 'active').length,
      monthlyRevenue: Array.from(payments.values()).filter(p => p.date && p.date.startsWith(new Date().toISOString().substring(0, 7))).reduce((sum, p) => sum + p.amount, 0)
    }
  });
});

app.get('/api/analytics/classes', requireAuth, (req, res) => {
  const classList = Array.from(classes.values());
  const classStats = classList.map(cls => {
    const trainer = trainers.get(cls.trainerId);
    return { classId: cls.id, name: cls.name, type: cls.type, enrolled: cls.enrolled, capacity: cls.capacity, utilization: cls.capacity > 0 ? (cls.enrolled / cls.capacity) * 100 : 0, trainer: trainer ? trainer.name : null };
  }).sort((a, b) => b.utilization - a.utilization);
  res.json({ success: true, classes: classStats });
});

app.get('/api/analytics/trainers', requireAuth, (req, res) => {
  const trainerList = Array.from(trainers.values());
  const trainerStats = trainerList.map(trn => ({
    trainerId: trn.id, name: trn.name, specialization: trn.specialization, rating: trn.rating, classesTaken: trn.classesTaken, membersAssigned: trn.membersAssigned, experience: trn.experience
  }));
  res.json({ success: true, trainers: trainerStats });
});

// RTMN Layer Integrations
app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({ layer: 1, name: 'Intelligence', capabilities: ['AI Workout Planner', 'Nutrition AI', 'Progress Prediction', 'Pose Detection'], status: 'available' });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({ layer: 2, name: 'Customer Growth', capabilities: ['Lead Generation', 'Referral Programs', 'Fitness Challenges', 'CRM'], status: 'available' });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({ layer: 3, name: 'Commerce', capabilities: ['Membership Sales', 'Personal Training', 'Supplements', 'Merchandise'], status: 'available' });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({ layer: 4, name: 'Finance', capabilities: ['Membership Billing', 'Payment Collection', 'Commission Tracking'], status: 'available' });
});

app.get('/api/layers', requireAuth, (req, res) => {
  res.json({ industry: INDUSTRY, service: 'Fitness OS', layers: 15, version: '2.0.0' });
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Fitness OS', version: '2.0.0', port: PORT, industry: 'Fitness', timestamp: new Date().toISOString(), stats: { members: members.size, trainers: trainers.size, classes: classes.size, enrollments: enrollments.size } });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                  FITNESS OS v2.0.0                   ║
║            Complete Gym & Fitness Management        ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Features:                                             ║
║  • Member Management                                  ║
║  • Trainer Management                                 ║
║  • Class Scheduling                                   ║
║  • Enrollments & Attendance                          ║
║  • Subscriptions & Billing                           ║
║  • Goals & Assessments                               ║
║  • Analytics & Reporting                             ║
╚══════════════════════════════════════════════════════════╝`);
});
