import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5110;
const logger = winston.createLogger({ level: 'info', format: winston.format.combine(winston.format.timestamp(), winston.format.json()), transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })] });
app.use(helmet()); app.use(cors()); app.use(express.json());

const members = new Map(), trainers = new Map(), classes = new Map(), memberships = new Map(), attendance = new Map(), workouts = new Map();

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'fitness-os', version: '1.0.0' }));

app.get('/api/members', (req, res) => res.json({ success: true, count: members.size, members: Array.from(members.values()) }));
app.post('/api/members', (req, res) => {
  const { name, email, phone, emergencyContact } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const member = { id: uuidv4(), name, email: email || null, phone: phone || null, emergencyContact: emergencyContact || {}, membershipType: 'basic', status: 'active', createdAt: new Date().toISOString() };
  members.set(member.id, member);
  res.status(201).json({ success: true, member });
});

app.get('/api/trainers', (req, res) => res.json({ success: true, count: trainers.size, trainers: Array.from(trainers.values()) }));
app.post('/api/trainers', (req, res) => {
  const { name, specialties, certifications } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const trainer = { id: uuidv4(), name, specialties: specialties || [], certifications: certifications || [], status: 'available', createdAt: new Date().toISOString() };
  trainers.set(trainer.id, trainer);
  res.status(201).json({ success: true, trainer });
});

app.get('/api/classes', (req, res) => res.json({ success: true, count: classes.size, classes: Array.from(classes.values()) }));
app.post('/api/classes', (req, res) => {
  const { name, trainerId, schedule, capacity, duration } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const cls = { id: uuidv4(), name, trainerId: trainerId || null, schedule: schedule || {}, capacity: capacity || 20, duration: duration || 60, enrolled: 0, status: 'active', createdAt: new Date().toISOString() };
  classes.set(cls.id, cls);
  res.status(201).json({ success: true, class: cls });
});

app.get('/api/memberships', (req, res) => res.json({ success: true, count: memberships.size, memberships: Array.from(memberships.values()) }));
app.post('/api/memberships', (req, res) => {
  const { memberId, type, startDate, endDate, price } = req.body;
  if (!memberId) return res.status(400).json({ success: false, error: 'memberId required' });
  const membership = { id: uuidv4(), memberId, type: type || 'monthly', startDate: startDate || new Date().toISOString(), endDate: endDate || null, price: price || 0, status: 'active', createdAt: new Date().toISOString() };
  memberships.set(membership.id, membership);
  res.status(201).json({ success: true, membership });
});

app.get('/api/attendance', (req, res) => {
  let result = Array.from(attendance.values());
  if (req.query.memberId) result = result.filter(a => a.memberId === req.query.memberId);
  res.json({ success: true, count: result.length, attendance: result });
});
app.post('/api/attendance', (req, res) => {
  const { memberId, classId, checkIn, checkOut } = req.body;
  if (!memberId) return res.status(400).json({ success: false, error: 'memberId required' });
  const record = { id: uuidv4(), memberId, classId: classId || null, checkIn: checkIn || new Date().toISOString(), checkOut: checkOut || null, createdAt: new Date().toISOString() };
  attendance.set(record.id, record);
  res.status(201).json({ success: true, attendance: record });
});

app.get('/api/analytics', (req, res) => {
  res.json({ success: true, analytics: { totalMembers: members.size, totalTrainers: trainers.size, totalClasses: classes.size, totalMemberships: memberships.size, todayCheckIns: Array.from(attendance.values()).filter(a => a.checkIn.startsWith(new Date().toISOString().split('T')[0])).length } });
});

app.use((err, req, res) => { logger.error(err); res.status(500).json({ success: false, error: err.message }); });

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
    if (u.email === email && u.industry === 'fitness') {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
  }
  const businessId = 'BIZ_fitness_' + Date.now();
  const ownerId = 'OWN_fitness_' + Date.now();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const token = genToken();
  authBusinesses.set(businessId, {
    id: businessId, name: businessName, industry: 'fitness', email, phone: phone || '',
    plan: plan || 'starter', status: 'active', createdAt: new Date().toISOString()
  });
  authUsers.set(ownerId, {
    id: ownerId, businessId, industry: 'fitness', email, name: ownerName,
    role: 'owner', passwordHash, status: 'active', createdAt: new Date().toISOString()
  });
  authSessions.set(token, {
    userId: ownerId, businessId, industry: 'fitness', role: 'owner',
    createdAt: Date.now(), expiresAt: Date.now() + 2592000000
  });
  res.status(201).json({
    success: true, message: 'fitness registered',
    business: { id: businessId, name: businessName, industry: 'fitness' },
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
    if (user.email === email && user.industry === 'fitness') {
      if (user.passwordHash !== passwordHash) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      const token = genToken();
      authSessions.set(token, {
        userId, businessId: user.businessId, industry: 'fitness', role: user.role,
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

app.listen(PORT, () => logger.info(`💪 Fitness OS running on port ${PORT}`));
export default app;
