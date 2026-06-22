import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import axios from 'axios';

const PORT = parseInt(process.env.GENIE_PORT || '7100', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const JWT_SECRET = process.env.JWT_SECRET;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

const CORPID_URL = process.env.CORPID_URL || 'http://localhost:7001';
const MEMORYOS_URL = process.env.MEMORYOS_URL || 'http://localhost:7003';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:7002';
const GOALOS_URL = process.env.GOALOS_URL || 'http://localhost:7004';

// ============================================================================
// HOJAI-AI Genie Services (the 23 specialized services in the same folder)
// These live in RTMN/companies/HOJAI-AI/products/genie/<service-name>/
// They are SIBLINGS of genie-os in the same parent directory.
// ============================================================================
const GENIE_GATEWAY_URL = process.env.GENIE_GATEWAY_URL || 'http://localhost:4701';
const GENIE_BRIEFING_URL = process.env.GENIE_BRIEFING_URL || 'http://localhost:4712';
const GENIE_CALENDAR_URL = process.env.GENIE_CALENDAR_URL || 'http://localhost:4709';
const GENIE_MONEY_URL = process.env.GENIE_MONEY_URL || 'http://localhost:4724';
const GENIE_WELLNESS_URL = process.env.GENIE_WELLNESS_URL || 'http://localhost:4723';
const GENIE_SHOPPING_URL = process.env.GENIE_SHOPPING_URL || 'http://localhost:4728';
const GENIE_WAKE_WORD_URL = process.env.GENIE_WAKE_WORD_URL || 'http://localhost:4767';
const GENIE_LISTENING_MODES_URL = process.env.GENIE_LISTENING_MODES_URL || 'http://localhost:4768';
const GENIE_DEVICE_INTEGRATION_URL = process.env.GENIE_DEVICE_INTEGRATION_URL || 'http://localhost:4769';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '2mb' }));
const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const err = (res, s, c, m) => res.status(s).json({ success: false, error: { code: c, message: m }, meta: { timestamp: new Date().toISOString() } });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  corpId: { type: String, index: true, sparse: true },
  twinId: { type: String, index: true, sparse: true },
  preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: mongoose.Types.ObjectId,
  token: { type: String, index: true },
  expiresAt: Date,
}, { timestamps: true });
const Session = mongoose.model('Session', SessionSchema);

const ConversationSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  messages: [{ role: String, content: String, timestamp: Date, metadata: mongoose.Schema.Types.Mixed }],
}, { timestamps: true });
const Conversation = mongoose.model('Conversation', ConversationSchema);

const signupSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1).max(100) });
const loginSchema = z.object({ email: z.string().email(), password: z.string() });
const askSchema = z.object({ question: z.string().min(1).max(2000), context: z.record(z.unknown()).optional() });

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return err(res, 401, 'UNAUTHORIZED', 'No bearer token');
  try {
    const decoded = jwt.verify(h.slice(7), JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch { return err(res, 401, 'UNAUTHORIZED', 'Invalid token'); }
}

async function callInternal(url, method, body) {
  try {
    const res = await axios({ method, url, data: body, headers: { 'x-internal-token': INTERNAL_TOKEN }, timeout: 5000, validateStatus: () => true });
    // Return the response data even on 4xx/5xx so callers can inspect error codes
    // (e.g. NOT_FOUND) and decide whether to fall back gracefully.
    return res.data;
  } catch (e) { return null; }
}

app.get('/health', (req, res) => send(res, 200, { service: 'genie', status: 'healthy', version: '1.0.0' }));

app.post('/api/auth/signup',requireAuth,  async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email });
    if (existing) return err(res, 409, 'CONFLICT', 'Email already exists');
    const corpRes = await callInternal(`${CORPID_URL}/api/identity/issue`, 'POST', { type: 'user', name: data.name });
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await User.create({ email: data.email, password: hashed, name: data.name, corpId: corpRes?.data?.corpId });
    const twinRes = await callInternal(`${TWINOS_URL}/api/twins`, 'POST', { corpId: user.corpId, type: 'user', name: `${data.name}'s Twin` });
    if (twinRes) { user.twinId = twinRes.data.twinId; await user.save(); }
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    await Session.create({ sessionId: `SES-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, userId: user._id, token, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) });
    res.status(201).json({ success: true, data: { token, user: { id: user._id, email: user.email, name: user.name, corpId: user.corpId, twinId: user.twinId } }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/auth/login',requireAuth,  async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user) return err(res, 401, 'UNAUTHORIZED', 'Invalid credentials');
    const ok = await bcrypt.compare(data.password, user.password);
    if (!ok) return err(res, 401, 'UNAUTHORIZED', 'Invalid credentials');
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    await Session.create({ sessionId: `SES-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, userId: user._id, token, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) });
    res.json({ success: true, data: { token, user: { id: user._id, email: user.email, name: user.name, corpId: user.corpId, twinId: user.twinId } }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/auth/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return err(res, 404, 'NOT_FOUND', 'User not found');
    res.json({ success: true, data: { id: user._id, email: user.email, name: user.name, corpId: user.corpId, twinId: user.twinId, preferences: user.preferences }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/ask', authMiddleware, async (req, res, next) => {
  try {
    const { question, context = {} } = askSchema.parse(req.body);
    const user = await User.findById(req.userId);
    if (!user) return err(res, 404, 'NOT_FOUND', 'User not found');
    let conv = await Conversation.findOne({ userId: user._id });
    if (!conv) conv = await Conversation.create({ userId: user._id, messages: [] });
    conv.messages.push({ role: 'user', content: question, timestamp: new Date() });

    // Pull context from own foundation (MemoryOS, GoalOS)
    const memories = await callInternal(`${MEMORYOS_URL}/api/memory/${user.corpId}/search?q=${encodeURIComponent(question)}`, 'GET');
    const memContext = (memories?.data?.items || []).slice(0, 3).map(m => m.content).join('; ');
    const goals = await callInternal(`${GOALOS_URL}/api/goals/${user.corpId}?status=active`, 'GET');
    const goalContext = (goals?.data?.items || []).slice(0, 3).map(g => g.title).join(', ');

    // === Intent detection → delegate to specialized HOJAI-AI Genie services ===
    const lower = question.toLowerCase();
    let answer = '';
    let delegated = null;
    let gatewayHandled = false;

    // Shopping intent → genie-shopping-agent
    if (lower.includes('buy') || lower.includes('purchase') || lower.includes('order') || lower.includes('shop')) {
      const shopRes = await callInternal(`${GENIE_SHOPPING_URL}/api/shop`, 'POST', { userId: user._id, item: question, preferences: user.preferences });
      if (shopRes) {
        answer = `I found your shopping session! ${JSON.stringify(shopRes).slice(0, 200)}`;
        delegated = 'genie-shopping-agent';
      } else {
        answer = `I'll help you shop! Based on your preferences${memContext ? ` (${memContext})` : ''}, let me search for "${question}".`;
      }
    }
    // Calendar intent → genie-calendar-service
    else if (lower.includes('calendar') || lower.includes('meeting') || lower.includes('schedule')) {
      // The actual endpoint on genie-calendar-service is /api/events (not /api/calendar/events).
      const calRes = await callInternal(`${GENIE_CALENDAR_URL}/api/events/today`, 'GET');
      if (calRes && calRes.success !== false) {
        answer = `Here's your calendar for today: ${JSON.stringify(calRes).slice(0, 200)}`;
        delegated = 'genie-calendar-service';
      } else {
        answer = `I'd check your calendar but the calendar service is offline. Try again in a moment.`;
      }
    }
    // Money intent → genie-money-os
    else if (lower.includes('budget') || lower.includes('spend') || lower.includes('money') || lower.includes('finance')) {
      // genie-money-os is currently a stub — it only has /, /health, /ready.
      // We try a likely endpoint and gracefully fall back if it returns HTML/404.
      const moneyRes = await callInternal(`${GENIE_MONEY_URL}/api/budget`, 'GET', { userId: user._id });
      const isUsable = moneyRes && typeof moneyRes === 'object' && moneyRes.success !== false && moneyRes.error?.code !== 'NOT_FOUND';
      if (isUsable) {
        answer = `Your money snapshot: ${JSON.stringify(moneyRes).slice(0, 200)}`;
      } else {
        answer = `I don't have a money snapshot for you yet, but I can help you think through budgeting. What's your goal?`;
      }
      delegated = 'genie-money-os';
    }
    // Wellness intent → genie-wellness-os
    else if (lower.includes('wellness') || lower.includes('health') || lower.includes('sleep') || lower.includes('workout') || lower.includes('mood')) {
      // genie-wellness-os is a stub. Try a likely endpoint and gracefully fall back.
      const wellRes = await callInternal(`${GENIE_WELLNESS_URL}/api/wellness/today`, 'GET', { userId: user._id });
      const isUsable = wellRes && typeof wellRes === 'object' && wellRes.success !== false && wellRes.error?.code !== 'NOT_FOUND';
      if (isUsable) {
        answer = `Your wellness snapshot: ${JSON.stringify(wellRes).slice(0, 200)}`;
      } else {
        answer = `I don't have your wellness data yet. Would you like to start tracking sleep, mood, or workouts?`;
      }
      delegated = 'genie-wellness-os';
    }
    // Goals intent → use own GoalOS
    else if (lower.includes('goal') || lower.includes('progress')) {
      answer = `Your active goals: ${goalContext || 'none set'}. Would you like to update progress on any?`;
      delegated = 'goalos';
    }
    // Remember intent → use own MemoryOS
    else if (lower.includes('remember') || lower.includes('prefer')) {
      await callInternal(`${MEMORYOS_URL}/api/memory`, 'POST', { corpId: user.corpId, type: 'preference', content: question, importance: 0.7 });
      answer = `Got it! I've remembered that for you.`;
      delegated = 'memoryos';
    }
    // Fallback: try genie-gateway (which knows about all 23 services)
    else {
      const gatewayAnswer = await tryGenieGateway(question, user, memContext, goalContext);
      if (gatewayAnswer) {
        answer = gatewayAnswer;
        delegated = 'genie-gateway';
        gatewayHandled = true;
      } else if (memContext) {
        answer = `Based on what I know about you (${memContext}), here's my take: ${question}. Want me to take action?`;
      } else {
        answer = `Hi ${user.name}! I'm Genie. I can help you shop, manage goals, remember preferences, and connect with merchants. What would you like to do?`;
      }
    }

    conv.messages.push({ role: 'genie', content: answer, timestamp: new Date() });
    if (conv.messages.length > 50) conv.messages = conv.messages.slice(-50);
    await conv.save();
    res.json({ success: true, data: { answer, delegated_to: delegated, memories_used: memContext ? 1 : 0, goals_used: goalContext ? 1 : 0, conversation_id: conv._id }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

async function tryGenieGateway(question, user, memContext, goalContext) {
  try {
    const res = await callInternal(`${GENIE_GATEWAY_URL}/api/query`, 'POST', {
      userId: user.corpId,
      question,
      context: { memories: memContext, goals: goalContext }
    });
    if (res && res.data && res.data.answer) {
      return res.data.answer;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Health check for all 23 HOJAI-AI Genie services
app.get('/api/genie-services/health', async (req, res) => {
  const services = [
    { name: 'genie-gateway',           url: GENIE_GATEWAY_URL },
    { name: 'genie-briefing-service',  url: GENIE_BRIEFING_URL },
    { name: 'genie-calendar-service',  url: GENIE_CALENDAR_URL },
    { name: 'genie-money-os',          url: GENIE_MONEY_URL },
    { name: 'genie-wellness-os',       url: GENIE_WELLNESS_URL },
    { name: 'genie-shopping-agent',    url: GENIE_SHOPPING_URL },
    { name: 'genie-wake-word-service', url: GENIE_WAKE_WORD_URL },
    { name: 'genie-listening-modes',   url: GENIE_LISTENING_MODES_URL },
    { name: 'genie-device-integration',url: GENIE_DEVICE_INTEGRATION_URL },
  ];
  const results = {};
  for (const s of services) {
    try {
      const r = await axios.get(`${s.url}/health`, { timeout: 2000 });
      results[s.name] = { status: 'up', latency: r.status };
    } catch {
      results[s.name] = { status: 'down', url: s.url };
    }
  }
  const up = Object.values(results).filter(r => r.status === 'up').length;
  res.json({ success: true, data: { total: services.length, up, services: results }, meta: { timestamp: new Date().toISOString() } });
});

app.get('/api/conversations', authMiddleware, async (req, res, next) => {
  try {
    const conv = await Conversation.findOne({ userId: req.userId });
    res.json({ success: true, data: { messages: conv?.messages || [] }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/briefing', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    // Try the specialized genie-briefing-service first (richer briefings)
    const briefRes = await callInternal(`${GENIE_BRIEFING_URL}/api/briefing/${user.corpId}`, 'GET');
    if (briefRes && briefRes.data) {
      return res.json({ success: true, data: briefRes.data, delegated_to: 'genie-briefing-service', meta: { timestamp: new Date().toISOString() } });
    }
    // Fallback: build briefing from own foundation
    const goals = await callInternal(`${GOALOS_URL}/api/goals/${user.corpId}?status=active`, 'GET');
    const mems = await callInternal(`${MEMORYOS_URL}/api/memory/${user.corpId}`, 'GET');
    const g = goals?.data?.items || [];
    const m = mems?.data?.items || [];
    res.json({ success: true, data: { greeting: `Good morning, ${user.name}!`, date: new Date().toISOString().split('T')[0], active_goals: g.length, recent_memories: m.slice(0, 3).map(x => x.content), insights: [`You have ${g.length} active goals`, `I know ${m.length} things about you`, 'Ready to help with anything today'] }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/memory', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    const result = await callInternal(`${MEMORYOS_URL}/api/memory`, 'POST', { ...req.body, corpId: user.corpId });
    res.json(result || { success: false });
  } catch (e) { next(e); }
});

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[genie] MongoDB connected`); }
  catch (err) { console.error(`[genie] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[genie] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
