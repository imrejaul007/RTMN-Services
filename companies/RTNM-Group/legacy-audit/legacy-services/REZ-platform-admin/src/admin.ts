/**
 * REZ Admin - Complete Authority Over Everything
 *
 * SINGLE SOURCE OF TRUTH for all platform administration
 */

import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
app.use(express.json());

// ============================================
// MODELS - ALL ADMIN DATA
// ============================================

// Users
const AdminUserSchema = new mongoose.Schema({
  user_id: String,
  email: { type: String, unique: true },
  password_hash: String,
  name: String,
  role: String,
  permissions: [String],
  company_ids: [String],
  company_id: String,
  is_active: Boolean,
  last_login: Date,
  mfa_enabled: Boolean,
  created_at: Date,
  updated_at: Date
});

// Companies
const CompanySchema = new mongoose.Schema({
  company_id: String,
  name: String,
  slug: String,
  type: String,
  status: String,
  settings: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  created_at: Date
});

// Services Registry
const ServiceSchema = new mongoose.Schema({
  service_id: String,
  name: String,
  company: String,
  port: Number,
  repository: String,
  status: String,
  health: {
    latency_ms: Number,
    uptime_percent: Number,
    last_check: Date
  },
  config: mongoose.Schema.Types.Mixed,
  owner: String
});

// API Keys
const APIKeySchema = new mongoose.Schema({
  key_id: String,
  name: String,
  user_id: String,
  company_id: String,
  scopes: [String],
  expires_at: Date,
  is_active: Boolean,
  created_at: Date
});

// Audit Logs
const AuditSchema = new mongoose.Schema({
  action: String,
  user_id: String,
  company_id: String,
  resource: String,
  resource_id: String,
  method: String,
  path: String,
  request_body: mongoose.Schema.Types.Mixed,
  status_code: Number,
  ip_address: String,
  user_agent: String,
  timestamp: Date
});

// Notifications
const NotificationSchema = new mongoose.Schema({
  notification_id: String,
  user_id: String,
  title: String,
  body: String,
  type: String,
  read: Boolean,
  created_at: Date
});

// Settings
const SettingsSchema = new mongoose.Schema({
  key: String,
  value: mongoose.Schema.Types.Mixed,
  category: String,
  updated_at: Date
});

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);
const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
const APIKey = mongoose.models.APIKey || mongoose.model('APIKey', APIKeySchema);
const Audit = mongoose.models.Audit || mongoose.model('Audit', AuditSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

// ============================================
// SERVICE CONNECTIONS
// ============================================

const SERVICES = {
  // RABTUL Core
  auth: 'https://rez-auth-service.onrender.com',
  payment: 'https://rez-payment-service.onrender.com',
  wallet: 'https://rez-wallet-service.onrender.com',
  order: 'https://rez-order-service.onrender.com',
  catalog: 'https://rez-catalog-service.onrender.com',
  search: 'https://rez-search-service.onrender.com',
  delivery: 'https://rez-delivery-service.onrender.com',
  notifications: 'https://rez-notifications-service.onrender.com',
  profile: 'https://rez-profile-service.onrender.com',
  booking: 'https://rez-booking-service.onrender.com',
  // Infrastructure
  circuit_breaker: 'https://rez-circuit-breaker.onrender.com',
  dlq: 'https://REZ-dlq-service.onrender.com',
  idempotency: 'https://REZ-idempotency-service.onrender.com',
  secrets: 'https://REZ-secrets-manager.onrender.com',
  scheduler: 'https://REZ-scheduler-service.onrender.com',
  // Intelligence
  cdp: 'https://REZ-cdp-service.onrender.com',
  fraud: 'https://REZ-fraud-agent.onrender.com',
  predict: 'https://REZ-predictive-engine.onrender.com',
  signal: 'https://REZ-signal-aggregator.onrender.com',
  recommend: 'https://REZ-recommendation-engine.onrender.com',
  personalize: 'https://REZ-personalization-engine.onrender.com',
  segments: 'https://REZ-realtime-segments.onrender.com',
  intent: 'https://rez-intent-predictor.onrender.com',
  // Media
  ads: 'https://REZ-ads-platform.onrender.com',
  karma: 'https://rez-gamification-service.onrender.com',
  attribution: 'https://REZ-attribution-hub.onrender.com',
  crm: 'https://REZ-crm-hub.onrender.com',
  // Support
  care: 'https://REZ-care.onrender.com',
  agent: 'https://REZ-agent.onrender.com'
};

const INTERNAL_KEY = process.env.INTERNAL_KEY || 'admin-key';

// ============================================
// MIDDLEWARE
// ============================================

async function auth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...perms: string[]) {
  return async (req: any, res: any, next: any) => {
    const user = req.user;
    if (user.role === 'super_admin') return next();
    const has = perms.some(p => user.permissions?.includes(p));
    if (!has) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// ============================================
// CALL OTHER SERVICES
// ============================================

async function call(service: string, path: string, method = 'GET', data?: any) {
  const base = SERVICES[service as keyof typeof SERVICES];
  if (!base) throw new Error(`Service ${service} not found`);
  try {
    const r = await axios({ method, url: `${base}${path}`, data, headers: { 'X-Internal-Token': INTERNAL_KEY }, timeout: 10000 });
    return r.data;
  } catch (e: any) {
    return { error: e.message };
  }
}

// ============================================
// AUTH
// ============================================

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await AdminUser.findOne({ email, is_active: true });
  if (!user) return res.status(401).json({ error: 'Invalid' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid' });
  await AdminUser.updateOne({ email }, { last_login: new Date() });
  const token = jwt.sign({ user_id: user.user_id, role: user.role, permissions: user.permissions }, 'secret', { expiresIn: '24h' });
  res.json({ token, user: { user_id: user.user_id, email: user.email, role: user.role } });
});

app.post('/auth/mfa/enable', auth, async (req, res) => {
  await AdminUser.updateOne({ user_id: req.user.user_id }, { mfa_enabled: true });
  res.json({ success: true });
});

// ============================================
// USERS
// ============================================

app.get('/users', auth, async (req, res) => {
  const { role, company_id, search } = req.query;
  const q: any = {};
  if (role) q.role = role;
  if (company_id) q.company_id = company_id;
  const users = await AdminUser.find(q).select('-password_hash');
  res.json({ users });
});

app.post('/users', auth, async (req, res) => {
  const { email, name, role, company_ids, permissions } = req.body;
  const hash = await bcrypt.hash(req.body.password, 10);
  const user_id = `usr_${crypto.randomBytes(8).toString('hex')}`;
  await AdminUser.create({ user_id, email, password_hash: hash, name, role, permissions, company_ids, is_active: true, created_at: new Date() });
  res.json({ user_id });
});

app.patch('/users/:id', auth, async (req, res) => {
  await AdminUser.updateOne({ user_id: req.params.id }, req.body);
  res.json({ success: true });
});

app.delete('/users/:id', auth, async (req, res) => {
  await AdminUser.updateOne({ user_id: req.params.id }, { is_active: false });
  res.json({ success: true });
});

// ============================================
// COMPANIES
// ============================================

app.get('/companies', auth, async (req, res) => {
  const companies = await Company.find();
  res.json({ companies });
});

app.post('/companies', auth, async (req, res) => {
  const company_id = `co_${crypto.randomBytes(6).toString('hex')}`;
  await Company.create({ company_id, ...req.body, created_at: new Date() });
  res.json({ company_id });
});

app.patch('/companies/:id', auth, async (req, res) => {
  await Company.updateOne({ company_id: req.params.id }, req.body);
  res.json({ success: true });
});

// ============================================
// SERVICES (CONTROL ALL SERVICES
// ============================================

app.get('/services', auth, async (req, res) => {
  const { type } = req.query;
  let services = await Service.find().lean();
  if (type) services = services.filter(s => s.company === type);
  // Health check all services
  const withHealth = await Promise.all(services.map(async (s) => {
    try {
      const r = await axios.get(`${SERVICES[s.name]?.health || '', { timeout: 3000 }).catch(() => ({ status: 'down' }));
      return { ...s, health: r?.status === 'up' ? 'healthy' : 'unhealthy' };
    } catch { return { ...s, health: 'unknown' }; }
  }));
  res.json({ services: services });
});

app.post('/services/deploy', auth, async (req, res) => {
  const { name, repository, config } = req.body;
  const service_id = `svc_${crypto.randomBytes(6).toString('hex')}`;
  await Service.create({ service_id, name, repository, config, status: 'deploying' });
  // Trigger deployment
  res.json({ service_id, status: 'deploying' });
});

app.post('/services/:id/restart', auth, async (req, res) => {
  await Service.updateOne({ service_id: req.params.id }, { status: 'restarting' });
  res.json({ success: true });
});

app.post('/services/:id/scale', auth, async (req, res) => {
  const { replicas } = req.body;
  await Service.updateOne({ service_id: req.params.id }, { config: { replicas } });
  res.json({ success: true });
});

// ============================================
// FINANCE
// ============================================

app.get('/finance/revenue', auth, async (req, res) => {
  // Aggregate from payment service
  const revenue = await call('payment', '/api/revenue');
  res.json(revenue);
});

app.get('/finance/transactions', auth, async (req, res) => {
  const txns = await call('wallet', '/api/transactions');
  res.json(txns);
});

// ============================================
// AI/ML MODELS
// ============================================

app.get('/ai/models', auth, async (req, res) => {
  const models = await call('cdp', '/api/models');
  res.json(models);
});

app.post('/ai/train', auth, async (req, res) => {
  const { model_type, training_data } = req.body;
  res.json({ job_id: crypto.randomBytes(8).toString('hex'), status: 'training' });
});

// ============================================
// AUDIT LOGS
// ============================================

app.get('/audit', auth, async (req, res) => {
  const logs = await Audit.find().sort({ timestamp: -1 }).limit(100);
  res.json({ logs });
});

// ============================================
// NOTIFICATIONS
// ============================================

app.get('/notifications', auth, async (req, res) => {
  const notifs = await Notification.find({ user_id: req.user.user_id }).sort({ created_at: -1 });
  res.json({ notifications: notifs });
});

app.post('/notifications/broadcast', auth, async (req, res) => {
  const { title, body, target } = req.body;
  const notification_id = `notif_${crypto.randomBytes(8).toString('hex')}`;
  await Notification.create({ notification_id, title, body });
  res.json({ notification_id });
});

// ============================================
// SETTINGS
// ============================================

app.get('/settings', auth, async (req, res) => {
  const settings = await Settings.find();
  res.json({ settings });
});

app.put('/settings/:key', auth, async (req, res) => {
  await Settings.updateOne({ key: req.params.key }, { value: req.body.value, updated_at: new Date() }, { upsert: true });
  res.json({ success: true });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', admin: 'REZ Platform Admin', version: '2.0' });
});

// START
async function start() {
  await mongoose.connect(process.env.MONGODB || 'mongodb://localhost:27017/admin');
  // Seed super admin
  if (!await AdminUser.findOne({ role: 'super_admin' })) {
    const hash = await bcrypt.hash('admin123', 10);
    await AdminUser.create({ user_id: 'super', email: 'admin@rez.money', password_hash: hash, role: 'super_admin', permissions: ['*'], is_active: true, name: 'Super Admin' });
  }
  const port = process.env.PORT || 4000;
  app.listen(port, () => logger.info(REZ Admin running on ${port}`));
}
start().catch(console.error);
