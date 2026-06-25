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
// JWT_SECRET is used for signing user auth tokens. INTERNAL_TOKEN is for inter-service calls.

const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const MEMORYOS_URL = process.env.MEMORYOS_URL || 'http://localhost:4703';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';
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
const GENIE_MEMORY_INBOX_URL = process.env.GENIE_MEMORY_INBOX_URL || 'http://localhost:4710';
const GENIE_UNIVERSAL_SEARCH_URL = process.env.GENIE_UNIVERSAL_SEARCH_URL || 'http://localhost:4713';
const GENIE_SERENDIPITY_URL = process.env.GENIE_SERENDIPITY_URL || 'http://localhost:4714';
const GENIE_MEMORY_GRAPH_URL = process.env.GENIE_MEMORY_GRAPH_URL || 'http://localhost:4717';
const GENIE_RELATIONSHIP_OS_URL = process.env.GENIE_RELATIONSHIP_OS_URL || 'http://localhost:4718';
const GENIE_LEARNING_OS_URL = process.env.GENIE_LEARNING_OS_URL || 'http://localhost:4722';
// Phase 9 services — final 8 specialists (completes the 23-specialist surface)
const GENIE_COMPANION_URL = process.env.GENIE_COMPANION_URL || 'http://localhost:4716';
const GENIE_SMART_FORGETTING_URL = process.env.GENIE_SMART_FORGETTING_URL || 'http://localhost:4715';
const GENIE_THINKING_ENGINE_URL = process.env.GENIE_THINKING_ENGINE_URL || 'http://localhost:4719';
const GENIE_LIFE_GPS_URL = process.env.GENIE_LIFE_GPS_URL || 'http://localhost:4721';
const GENIE_EXECUTION_ENGINE_URL = process.env.GENIE_EXECUTION_ENGINE_URL || 'http://localhost:4726';
const GENIE_LIFE_UNIVERSITY_URL = process.env.GENIE_LIFE_UNIVERSITY_URL || 'http://localhost:4727';
const GENIE_CREATION_OS_URL = process.env.GENIE_CREATION_OS_URL || 'http://localhost:4298';
const GENIE_CONSULTANT_AGENT_URL = process.env.GENIE_CONSULTANT_AGENT_URL || 'http://localhost:4739';
// New Phase 1 services (Personal Intelligence OS)
const INTENT_ENGINE_URL = process.env.INTENT_ENGINE_URL || 'http://localhost:4792';
const MEMORY_SUBSTRATE_URL = process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791';
const MORNING_BRIEFING_V2_URL = process.env.MORNING_BRIEFING_V2_URL || 'http://localhost:4794';
const COLD_START_ONBOARDING_URL = process.env.COLD_START_ONBOARDING_URL || 'http://localhost:4793';
const USE_INTENT_ENGINE = process.env.USE_INTENT_ENGINE !== 'false';  // opt-out flag

// Phase 2 services (Reasoning + Reflection + Proactive)
const REASONING_ENGINE_URL = process.env.REASONING_ENGINE_URL || 'http://localhost:4795';
const REFLECTION_ENGINE_URL = process.env.REFLECTION_ENGINE_URL || 'http://localhost:4796';
const PROACTIVE_ENGINE_URL = process.env.PROACTIVE_ENGINE_URL || 'http://localhost:4797';
// Phase 3 services
const PI_SCORE_URL = process.env.PI_SCORE_URL || 'http://localhost:4798';
const RELATIONSHIP_GRAPH_URL = process.env.RELATIONSHIP_GRAPH_URL || 'http://localhost:4799';
const LEARNING_OS_V2_URL = process.env.LEARNING_OS_V2_URL || 'http://localhost:4800';
// Phase 4 services
const AMBIENT_BRIEFINGS_URL = process.env.AMBIENT_BRIEFINGS_URL || 'http://localhost:4801';
const DEVICE_SYNC_URL = process.env.DEVICE_SYNC_URL || 'http://localhost:4802';
// Phase 5 services — Life OS Integration (6 connectors)
const HEALTH_CONNECTOR_URL = process.env.HEALTH_CONNECTOR_URL || 'http://localhost:4803';
const CALENDAR_CONNECTOR_URL = process.env.CALENDAR_CONNECTOR_URL || 'http://localhost:4804';
const EMAIL_CONNECTOR_URL = process.env.EMAIL_CONNECTOR_URL || 'http://localhost:4805';
const CONTACTS_CONNECTOR_URL = process.env.CONTACTS_CONNECTOR_URL || 'http://localhost:4806';
const PHOTOS_CONNECTOR_URL = process.env.PHOTOS_CONNECTOR_URL || 'http://localhost:4807';
const TASKS_CONNECTOR_URL = process.env.TASKS_CONNECTOR_URL || 'http://localhost:4808';
// Phase 6 services — Agentic & Marketplace
const BACKGROUND_AGENTS_URL = process.env.BACKGROUND_AGENTS_URL || 'http://localhost:4809';
const ONE_SHOT_ACTIONS_URL = process.env.ONE_SHOT_ACTIONS_URL || 'http://localhost:4810';
const GENIE_SKILLS_URL = process.env.GENIE_SKILLS_URL || 'http://localhost:4811';
const LONG_RUNNING_TASKS_URL = process.env.LONG_RUNNING_TASKS_URL || 'http://localhost:4812';
const USE_REASONING_ENGINE = process.env.USE_REASONING_ENGINE !== 'false';
const USE_BACKGROUND_AGENTS = process.env.USE_BACKGROUND_AGENTS !== 'false';
const USE_SKILLS_MARKETPLACE = process.env.USE_SKILLS_MARKETPLACE !== 'false';

// Voice OS — Enterprise TTS/STT/NLU/telecom platform
const VOICE_OS_URL = process.env.VOICE_OS_URL || 'http://localhost:4850';
const VOICE_COMMERCE_URL = process.env.VOICE_COMMERCE_URL || 'http://localhost:4880';
const VOICE_AI_SERVICE_URL = process.env.VOICE_AI_SERVICE_URL || 'http://localhost:4590';
// Voice Twin (TwinOS sibling) — voice profiles
const VOICE_TWIN_URL = process.env.VOICE_TWIN_URL || 'http://localhost:4876';
// RAZO Keyboard — Communication OS (consumer-side input)
const RAZO_KEYBOARD_URL = process.env.RAZO_KEYBOARD_URL || 'http://localhost:4725';
const USE_VOICE_OS = process.env.USE_VOICE_OS !== 'false';
const USE_RAZO = process.env.USE_RAZO !== 'false';

const app = express();

// Validate required env at startup
requireEnv(['GENIE_PORT'], { allowDev: true });
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
  } catch (e) {
    // Log the error so downstream failures are traceable in production.
    // Return an error sentinel so callers can distinguish network failures from null.
    const msg = e?.message || String(e);
    console.error(`[callInternal] ${method} ${url} failed: ${msg}`);
    return { __callInternalError: msg, url, method };
  }
}

app.get('/health', (req, res) => send(res, 200, { service: 'genie', status: 'healthy', version: '1.0.0' }));

app.post('/api/auth/signup', async (req, res, next) => {
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

app.post('/api/auth/login', async (req, res, next) => {
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
    // Phase 9: fall through to intent-engine when genie-gateway has no answer
    if (USE_INTENT_ENGINE) {
      const intent = await tryIntentEngine(question, user);
      if (intent && intent.intent) {
        const conf = intent.confidence ? ` (confidence ${(intent.confidence * 100).toFixed(0)}%)` : '';
        const reason = intent.reasoning ? ` — ${intent.reasoning}` : '';
        return `I think you want to ${intent.intent}${conf}${reason}`;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Health check for ALL Genie-related services: 23 original specialists + Voice OS + RAZO + Voice Twin + all PIOS
app.get('/api/genie-services/health', async (req, res) => {
  const services = [
    // Original 23 specialists
    { name: 'genie-gateway',           url: GENIE_GATEWAY_URL },
    { name: 'genie-briefing-service',  url: GENIE_BRIEFING_URL },
    { name: 'genie-calendar-service',  url: GENIE_CALENDAR_URL },
    { name: 'genie-money-os',          url: GENIE_MONEY_URL },
    { name: 'genie-wellness-os',       url: GENIE_WELLNESS_URL },
    { name: 'genie-shopping-agent',    url: GENIE_SHOPPING_URL },
    { name: 'genie-wake-word-service', url: GENIE_WAKE_WORD_URL },
    { name: 'genie-listening-modes',   url: GENIE_LISTENING_MODES_URL },
    { name: 'genie-device-integration',url: GENIE_DEVICE_INTEGRATION_URL },
    { name: 'genie-memory-inbox',      url: GENIE_MEMORY_INBOX_URL },
    { name: 'genie-universal-search',  url: GENIE_UNIVERSAL_SEARCH_URL },
    { name: 'genie-serendipity',       url: GENIE_SERENDIPITY_URL },
    { name: 'genie-memory-graph',      url: GENIE_MEMORY_GRAPH_URL },
    { name: 'genie-relationship-os',   url: GENIE_RELATIONSHIP_OS_URL },
    { name: 'genie-learning-os',       url: GENIE_LEARNING_OS_URL },
    // Phase 9: final 8 specialists
    { name: 'genie-companion-service',     url: GENIE_COMPANION_URL },
    { name: 'genie-smart-forgetting-service', url: GENIE_SMART_FORGETTING_URL },
    { name: 'genie-thinking-engine',       url: GENIE_THINKING_ENGINE_URL },
    { name: 'genie-life-gps',              url: GENIE_LIFE_GPS_URL },
    { name: 'genie-execution-engine',      url: GENIE_EXECUTION_ENGINE_URL },
    { name: 'genie-life-university',       url: GENIE_LIFE_UNIVERSITY_URL },
    { name: 'genie-creation-os',           url: GENIE_CREATION_OS_URL },
    { name: 'genie-consultant-agent',      url: GENIE_CONSULTANT_AGENT_URL },
    // Voice OS enterprise platform
    { name: 'voice-os',                url: VOICE_OS_URL,           skip: !USE_VOICE_OS },
    { name: 'voice-commerce',          url: VOICE_COMMERCE_URL,     skip: !USE_VOICE_OS },
    { name: 'voice-ai-service',        url: VOICE_AI_SERVICE_URL,   skip: !USE_VOICE_OS },
    { name: 'voice-twin',              url: VOICE_TWIN_URL },
    // RAZO Keyboard (consumer input)
    { name: 'razo-keyboard',           url: RAZO_KEYBOARD_URL,      skip: !USE_RAZO },
  ];
  const results = {};
  let up = 0;
  for (const s of services) {
    if (s.skip) {
      results[s.name] = { status: 'disabled' };
      continue;
    }
    try {
      const r = await axios.get(`${s.url}/health`, { timeout: 2000 });
      results[s.name] = { status: 'up', latency: r.status };
      up++;
    } catch {
      results[s.name] = { status: 'down', url: s.url };
    }
  }
  res.json({
    success: true,
    data: {
      total: services.length,
      up,
      voice_os_enabled: USE_VOICE_OS,
      razo_enabled: USE_RAZO,
      services: results,
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

// =====================================================================================
// PHASE 1-6 PIOS ROUTES — Personal Intelligence OS unified surface
// =====================================================================================

// === Phase 1-6: PIOS health probe — all 25+ new services ===
app.get('/api/pios/health', async (req, res) => {
  const services = [
    { name: 'intent-engine', url: INTENT_ENGINE_URL },
    { name: 'memory-substrate', url: MEMORY_SUBSTRATE_URL },
    { name: 'morning-briefing-v2', url: MORNING_BRIEFING_V2_URL },
    { name: 'cold-start-onboarding', url: COLD_START_ONBOARDING_URL },
    { name: 'reasoning-engine', url: REASONING_ENGINE_URL },
    { name: 'reflection-engine', url: REFLECTION_ENGINE_URL },
    { name: 'proactive-engine', url: PROACTIVE_ENGINE_URL },
    { name: 'pi-score', url: PI_SCORE_URL },
    { name: 'relationship-graph', url: RELATIONSHIP_GRAPH_URL },
    { name: 'learning-os-v2', url: LEARNING_OS_V2_URL },
    { name: 'ambient-briefings', url: AMBIENT_BRIEFINGS_URL },
    { name: 'device-sync', url: DEVICE_SYNC_URL },
    { name: 'health-connector', url: HEALTH_CONNECTOR_URL },
    { name: 'calendar-connector', url: CALENDAR_CONNECTOR_URL },
    { name: 'email-connector', url: EMAIL_CONNECTOR_URL },
    { name: 'contacts-connector', url: CONTACTS_CONNECTOR_URL },
    { name: 'photos-connector', url: PHOTOS_CONNECTOR_URL },
    { name: 'tasks-connector', url: TASKS_CONNECTOR_URL },
    { name: 'background-agents', url: BACKGROUND_AGENTS_URL },
    { name: 'one-shot-actions', url: ONE_SHOT_ACTIONS_URL },
    { name: 'genie-skills', url: GENIE_SKILLS_URL },
    { name: 'long-running-tasks', url: LONG_RUNNING_TASKS_URL },
  ];
  const results = {};
  let up = 0;
  for (const s of services) {
    try {
      const r = await axios.get(`${s.url}/health`, { timeout: 2000 });
      const status = r.data?.data?.status || r.data?.status || 'up';
      results[s.name] = { status, url: s.url };
      if (status === 'healthy' || status === 'up') up++;
    } catch {
      results[s.name] = { status: 'down', url: s.url };
    }
  }
  res.json({
    success: true,
    data: {
      total: services.length,
      up,
      intent_engine_enabled: USE_INTENT_ENGINE,
      reasoning_engine_enabled: USE_REASONING_ENGINE,
      background_agents_enabled: USE_BACKGROUND_AGENTS,
      skills_marketplace_enabled: USE_SKILLS_MARKETPLACE,
      services: results,
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

// === Phase 5 widget — aggregated home screen for the user ===
app.get('/api/pios/widget/:userId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const headers = { 'x-internal-token': INTERNAL_TOKEN };
    const fetchJson = async (url, options = {}) => {
      try {
        const r = await axios({ url, method: options.method || 'GET', data: options.body, headers, timeout: 3000 });
        return r.data?.data || r.data || null;
      } catch { return null; }
    };
    const [piScore, stale, learningDue, reflection, proactive, calendarToday, tasksToday] = await Promise.all([
      fetchJson(`${PI_SCORE_URL}/api/pi-score/${userId}/widget`),
      fetchJson(`${RELATIONSHIP_GRAPH_URL}/api/relationships/${userId}/stale?minStrength=30&minDays=7&limit=3`),
      fetchJson(`${LEARNING_OS_V2_URL}/api/learning/due/${userId}?threshold=0.7&limit=3`),
      fetchJson(`${REFLECTION_ENGINE_URL}/api/reflection/${userId}`),
      fetchJson(`${PROACTIVE_ENGINE_URL}/api/proactive/check`, { method: 'POST', body: { userId } }),
      fetchJson(`${CALENDAR_CONNECTOR_URL}/api/calendar/${userId}/events`),
      fetchJson(`${TASKS_CONNECTOR_URL}/api/tasks/${userId}/today`),
    ]);
    res.json({
      success: true,
      data: {
        userId,
        piScore: piScore ? { score: piScore.overall, level: piScore.levelName, emoji: piScore.levelEmoji, nextLevel: piScore.nextLevel?.name, pointsToNext: piScore.nextLevel?.pointsToNext, progress: piScore.progressToNext } : null,
        reachOut: (stale?.candidates || []).map((p) => ({ personId: p.personId, name: p.name, daysSince: p.daysSince, strength: p.strength })),
        factsToRefresh: (learningDue?.due || []).map((f) => ({ factId: f.factId, text: f.text, category: f.category, retention: f.retention })),
        lastReflection: reflection ? { weekOf: reflection.weekOf, summary: reflection.summary, insightCount: reflection.insights?.length || 0 } : null,
        proactive: (proactive?.suggestions || []).map((s) => ({ category: s.category, title: s.title, message: s.message })),
        calendar: (calendarToday?.events || []).slice(0, 3).map((e) => ({ eventId: e.id, title: e.title, start: e.start, end: e.end })),
        tasks: (tasksToday?.tasks || []).slice(0, 5).map((t) => ({ taskId: t.id, title: t.title, dueAt: t.dueAt, priority: t.priority })),
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) { next(e); }
});

// === Phase 4 ambient briefing ===
app.get('/api/pios/schedule/:userId', authMiddleware, async (req, res, next) => {
  try {
    const tz = req.query.tz || 'UTC';
    const r = await axios.get(`${AMBIENT_BRIEFINGS_URL}/api/ambient/schedule?tz=${encodeURIComponent(tz)}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: true, data: { currentKind: null, todaySchedule: [], error: 'ambient-briefings unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/pios/ambient/:userId/:kind', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${AMBIENT_BRIEFINGS_URL}/api/ambient/${req.params.kind}`, { userId: req.params.userId }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 8000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'ambient-briefings unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// === Phase 4 device sync ===
app.post('/api/pios/device/:userId/handoff', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${DEVICE_SYNC_URL}/api/sync/session/handoff`, { ...req.body, userId: req.params.userId }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'device-sync unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/pios/device/:userId/active', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${DEVICE_SYNC_URL}/api/sync/devices/${req.params.userId}/active`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'device-sync unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// === Phase 5: Health, Calendar, Email, Contacts, Photos, Tasks (6 connectors) ===
app.get('/api/pios/health/:userId/today', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${HEALTH_CONNECTOR_URL}/api/health/${req.params.userId}/summary`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 }).catch(() => ({ data: { data: null } }));
    res.json({ success: true, data: r.data?.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/pios/calendar/:userId/today', authMiddleware, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const r = await axios.get(`${CALENDAR_CONNECTOR_URL}/api/calendar/${req.params.userId}/events?from=${today}&to=${tomorrow}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 }).catch(() => ({ data: { data: { events: [] } } }));
    res.json({ success: true, data: { events: r.data?.data?.events || [] }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/pios/tasks/:userId/today', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${TASKS_CONNECTOR_URL}/api/tasks/${req.params.userId}/today`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 }).catch(() => ({ data: { data: { tasks: [] } } }));
    res.json({ success: true, data: r.data?.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/pios/email/:userId/digest', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${EMAIL_CONNECTOR_URL}/api/email/${req.params.userId}/digest`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'EMAIL_DISABLED', message: 'email not opted in' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/pios/contacts/:userId/stale', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${CONTACTS_CONNECTOR_URL}/api/contacts/${req.params.userId}/stale`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/pios/photos/:userId/year-ago', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${PHOTOS_CONNECTOR_URL}/api/photos/${req.params.userId}/year-ago`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

// === Phase 6: Background agents, one-shot actions, genie skills, long-running tasks ===
app.get('/api/pios/agents/:userId/agents', authMiddleware, async (req, res, next) => {
  if (!USE_BACKGROUND_AGENTS) return res.json({ success: true, data: { agents: [], disabled: true }, meta: { timestamp: new Date().toISOString() } });
  try {
    const r = await axios.get(`${BACKGROUND_AGENTS_URL}/api/agents/${req.params.userId}/agents`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/pios/agents/built-ins', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${BACKGROUND_AGENTS_URL}/api/agents/built-ins`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/pios/actions/:userId/plan', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${ONE_SHOT_ACTIONS_URL}/api/actions/${req.params.userId}/plan`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.get('/api/pios/skills/catalog', authMiddleware, async (req, res, next) => {
  if (!USE_SKILLS_MARKETPLACE) return res.json({ success: true, data: { skills: [], disabled: true }, meta: { timestamp: new Date().toISOString() } });
  try {
    const r = await axios.get(`${GENIE_SKILLS_URL}/api/skills/catalog`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/pios/skills/:userId/installed', authMiddleware, async (req, res, next) => {
  if (!USE_SKILLS_MARKETPLACE) return res.json({ success: true, data: { skills: [], disabled: true }, meta: { timestamp: new Date().toISOString() } });
  try {
    const r = await axios.get(`${GENIE_SKILLS_URL}/api/skills/${req.params.userId}/installed`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/pios/skills/:userId/install', authMiddleware, async (req, res, next) => {
  if (!USE_SKILLS_MARKETPLACE) return err(res, 503, 'DISABLED', 'skills marketplace disabled');
  try {
    const r = await axios.post(`${GENIE_SKILLS_URL}/api/skills/${req.params.userId}/install`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.post('/api/pios/skills/:userId/revoke', authMiddleware, async (req, res, next) => {
  if (!USE_SKILLS_MARKETPLACE) return err(res, 503, 'DISABLED', 'skills marketplace disabled');
  try {
    const r = await axios.post(`${GENIE_SKILLS_URL}/api/skills/${req.params.userId}/revoke`, {}, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/pios/skills/:userId/match', authMiddleware, async (req, res, next) => {
  if (!USE_SKILLS_MARKETPLACE) return res.json({ success: true, data: { matches: [], disabled: true }, meta: { timestamp: new Date().toISOString() } });
  try {
    const r = await axios.post(`${GENIE_SKILLS_URL}/api/skills/${req.params.userId}/match`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/pios/lrt/:userId/tasks', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${LONG_RUNNING_TASKS_URL}/api/lrt/${req.params.userId}/tasks`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/pios/lrt/:userId/tasks', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${LONG_RUNNING_TASKS_URL}/api/lrt/${req.params.userId}/tasks`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

// =====================================================================================
// PHASE 8: MEMORY-INBOX + UNIVERSAL-SEARCH + SERENDIPITY wiring
// =====================================================================================
// These three specialists round out Genie's "personal intelligence" surface so
// /api/ask can capture user notes, search across everything, and surface
// random serendipitous memories.

// --- memory-inbox: capture a thought/note into the user's inbox ---
app.post('/api/genie-inbox/capture', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return err(res, 404, 'NOT_FOUND', 'user not found');
    const r = await axios.post(`${GENIE_MEMORY_INBOX_URL}/api/capture`, {
      ...req.body,
      userId: req.userId,
      corpId: user.corpId,
    }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-memory-inbox', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'memory-inbox unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- memory-inbox: list user's recent captures ---
app.get('/api/genie-inbox/recent', authMiddleware, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const r = await axios.get(`${GENIE_MEMORY_INBOX_URL}/api/recent`, {
      params: { userId: req.userId, limit },
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-memory-inbox', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'memory-inbox unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- universal-search: search across memories + twins + calendar + tasks ---
app.get('/api/genie-search', authMiddleware, async (req, res, next) => {
  try {
    const { q, kind = 'all', limit = 10 } = req.query;
    if (!q) return err(res, 400, 'INVALID_INPUT', 'q (search query) required');
    const path = kind === 'all' ? '/api/search' : `/api/search/${kind}`;
    const r = await axios.get(`${GENIE_UNIVERSAL_SEARCH_URL}${path}`, {
      params: { q, userId: req.userId, limit },
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 5000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-universal-search', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'universal-search unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- serendipity: surface a random resurfaced memory ---
app.get('/api/genie-serendipity/random', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_SERENDIPITY_URL}/api/serendipity`, {
      params: { userId: req.userId, kind: req.query.kind },
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-serendipity', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'serendipity unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// =====================================================================================
// PHASE 8 (cont.): MEMORY-GRAPH + RELATIONSHIP-OS + LEARNING-OS wiring
// =====================================================================================
// Three more specialists that round out Genie's persistent, long-term surface area.
// All routes are auth-gated and degrade gracefully when the downstream is offline.

// --- memory-graph: user's unified graph overview (identity + knowledge + relationships + goals + timeline) ---
app.get('/api/genie-graph/:userId', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_MEMORY_GRAPH_URL}/api/user/${req.params.userId}/graph`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-memory-graph', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'memory-graph unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- relationship-os: high-value endpoints ---

// Dashboard: people + reminders + upcoming events + weak relationships in one shot
app.get('/api/genie-relationships/:userId/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_RELATIONSHIP_OS_URL}/api/${req.params.userId}/dashboard`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-relationship-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'relationship-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// AI-generated insights: who needs attention, relationship patterns
app.get('/api/genie-relationships/:userId/insights', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_RELATIONSHIP_OS_URL}/api/intelligence/${req.params.userId}/insights`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-relationship-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'relationship-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// Stale relationships — who you haven't talked to in a while
app.get('/api/genie-relationships/:userId/stale', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_RELATIONSHIP_OS_URL}/api/health/${req.params.userId}/weak`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-relationship-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'relationship-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// List people the user tracks
app.get('/api/genie-relationships/:userId/people', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_RELATIONSHIP_OS_URL}/api/people/${req.params.userId}`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-relationship-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'relationship-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// Add a person to the user's relationship network
app.post('/api/genie-relationships/:userId/people', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_RELATIONSHIP_OS_URL}/api/people`, {
      ...req.body,
      userId: req.params.userId,
    }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.status(r.status === 200 ? 201 : r.status).json({ success: true, data: r.data, delegated_to: 'genie-relationship-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'relationship-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// Log an interaction with a person
app.post('/api/genie-relationships/:userId/interactions', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_RELATIONSHIP_OS_URL}/api/interactions`, {
      ...req.body,
      userId: req.params.userId,
    }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.status(r.status === 200 ? 201 : r.status).json({ success: true, data: r.data, delegated_to: 'genie-relationship-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'relationship-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// List user's reminders (birthdays, follow-ups, etc.)
app.get('/api/genie-relationships/:userId/reminders', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_RELATIONSHIP_OS_URL}/api/reminders/${req.params.userId}`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-relationship-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'relationship-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- learning-os: high-value endpoints ---

// User's full curriculum
app.get('/api/genie-learning/:userId/curriculum', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LEARNING_OS_URL}/${req.params.userId}`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-learning-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'learning-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// Business track curriculum (catalog)
app.get('/api/genie-learning/business/curriculum', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LEARNING_OS_URL}/curriculum`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-learning-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'learning-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// User's progress on the business track
app.get('/api/genie-learning/:userId/progress', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LEARNING_OS_URL}/progress/${req.params.userId}`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-learning-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'learning-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// Skill recommendations for the user
app.get('/api/genie-learning/:userId/recommendations', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LEARNING_OS_URL}/recommendations/${req.params.userId}`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-learning-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'learning-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// Enroll user in a business track
app.post('/api/genie-learning/:userId/enroll', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_LEARNING_OS_URL}/enroll/${req.params.userId}`, req.body, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.status(r.status === 200 ? 201 : r.status).json({ success: true, data: r.data, delegated_to: 'genie-learning-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'learning-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// Start a course
app.post('/api/genie-learning/:userId/course/:courseId/start', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_LEARNING_OS_URL}/course/${req.params.courseId}/start/${req.params.userId}`, req.body, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
      timeout: 3000,
      validateStatus: () => true,
    });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.status(r.status === 200 ? 201 : r.status).json({ success: true, data: r.data, delegated_to: 'genie-learning-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'learning-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// =====================================================================================
// PHASE 9: FINAL 8 SPECIALISTS — companion, thinking, life-gps, execution,
//          life-university, creation-os, consultant, smart-forgetting
// =====================================================================================
// Completes the 23-specialist wiring. All routes are auth-gated and degrade
// gracefully when the downstream service is unreachable.

// --- companion-service: life story, journal, milestones ---
app.get('/api/genie-companion/:userId/story', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_COMPANION_URL}/story/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-companion-service', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'companion-service unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/genie-companion/:userId/journal', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_COMPANION_URL}/journal/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-companion-service', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'companion-service unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-companion/:userId/journal', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_COMPANION_URL}/journal/${req.params.userId}`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.status(r.status === 200 ? 201 : r.status).json({ success: true, data: r.data, delegated_to: 'genie-companion-service', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'companion-service unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- thinking-engine: decision support, brainstorming, analysis ---
app.post('/api/genie-thinking/decide/pros-cons', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_THINKING_ENGINE_URL}/decide/pros-cons`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-thinking-engine', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'thinking-engine unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-thinking/decide/go-no-go', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_THINKING_ENGINE_URL}/decide/go-no-go`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-thinking-engine', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'thinking-engine unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-thinking/brainstorm', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_THINKING_ENGINE_URL}/brainstorm`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-thinking-engine', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'thinking-engine unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-thinking/analyze/swot', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_THINKING_ENGINE_URL}/analyze/swot`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-thinking-engine', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'thinking-engine unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-thinking/research/summarize', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_THINKING_ENGINE_URL}/research/summarize`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 8000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-thinking-engine', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'thinking-engine unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- life-gps: future-self, life goals, vision ---
app.get('/api/genie-life-gps/:userId/future-self', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LIFE_GPS_URL}/future/self/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-life-gps', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'life-gps unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/genie-life-gps/:userId/next', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LIFE_GPS_URL}/gps/next/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-life-gps', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'life-gps unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/genie-life-gps/:userId/goals', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LIFE_GPS_URL}/goals/life/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-life-gps', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'life-gps unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-life-gps/:userId/goals', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_LIFE_GPS_URL}/goals/life`, { ...req.body, userId: req.params.userId }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.status(r.status === 200 ? 201 : r.status).json({ success: true, data: r.data, delegated_to: 'genie-life-gps', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'life-gps unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- execution-engine: tasks, automations, routines ---
app.get('/api/genie-execution/:userId/tasks', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_EXECUTION_ENGINE_URL}/tasks/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-execution-engine', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'execution-engine unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-execution/:userId/tasks', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_EXECUTION_ENGINE_URL}/tasks`, { ...req.body, userId: req.params.userId }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.status(r.status === 200 ? 201 : r.status).json({ success: true, data: r.data, delegated_to: 'genie-execution-engine', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'execution-engine unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-execution/:userId/automations/:automationId/run', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_EXECUTION_ENGINE_URL}/automation/${req.params.automationId}/run`, { ...req.body, userId: req.params.userId }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 10000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-execution-engine', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'execution-engine unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- life-university: courses, lessons, certifications ---
app.get('/api/genie-university/:userId', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LIFE_UNIVERSITY_URL}/progress/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-life-university', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'life-university unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/genie-university/courses', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LIFE_UNIVERSITY_URL}/courses/featured/all`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-life-university', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'life-university unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-university/courses/:courseId/lessons/:lessonId/complete', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_LIFE_UNIVERSITY_URL}/lessons/${req.params.courseId}/${req.params.lessonId}/complete`, { ...req.body, userId: req.userId }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-life-university', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'life-university unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/genie-university/verify/:verificationId', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_LIFE_UNIVERSITY_URL}/certification/verify/${req.params.verificationId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-life-university', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'life-university unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- creation-os: tts, podcast, music, voiceover ---
app.post('/api/genie-creation/tts', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_CREATION_OS_URL}/audio/tts`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 10000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-creation-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'creation-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-creation/podcast', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_CREATION_OS_URL}/audio/podcast`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 30000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-creation-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'creation-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-creation/music', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_CREATION_OS_URL}/audio/music`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 30000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-creation-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'creation-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-creation/voiceover', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_CREATION_OS_URL}/audio/voiceover`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 10000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-creation-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'creation-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/genie-creation/:userId/projects', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_CREATION_OS_URL}/video/projects/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-creation-os', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'creation-os unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- consultant-agent: domain-specific advice ---
app.post('/api/genie-consult', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_CONSULTANT_AGENT_URL}/consult`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 8000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-consultant-agent', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'consultant-agent unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/genie-consult/domains', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_CONSULTANT_AGENT_URL}/consult/domains`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-consultant-agent', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'consultant-agent unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/genie-consult/:userId/history', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_CONSULTANT_AGENT_URL}/consult/history/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-consultant-agent', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'consultant-agent unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// --- smart-forgetting-service: retention curves, archive, presets ---
app.get('/api/genie-forgetting/config', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_SMART_FORGETTING_URL}/api/config`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-smart-forgetting-service', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'smart-forgetting-service unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.put('/api/genie-forgetting/config', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.put(`${GENIE_SMART_FORGETTING_URL}/api/config`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-smart-forgetting-service', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'smart-forgetting-service unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.get('/api/genie-forgetting/presets', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${GENIE_SMART_FORGETTING_URL}/api/config/presets`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-smart-forgetting-service', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'smart-forgetting-service unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/genie-forgetting/cleanup', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${GENIE_SMART_FORGETTING_URL}/api/archive/cleanup`, req.body || {}, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 10000, validateStatus: () => true });
    if (r.status >= 400) return res.status(r.status).json(r.data);
    res.json({ success: true, data: r.data, delegated_to: 'genie-smart-forgetting-service', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'smart-forgetting-service unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

// =====================================================================================
// PHASE 9 (cont.): AGGREGATOR + INTENT ENGINE INTEGRATION
// =====================================================================================
//
// /api/genie/personal/:userId — fans out to all 23 specialists in parallel and
// returns a unified "personal snapshot". Mirrors the /api/pios/widget/:userId
// pattern but for the Genie specialists (memory-inbox, relationship-os, etc.).
//
// /api/ask now ALSO consults the intent-engine when its own keyword match
// can't decide, so the 6-intent ladder is augmented by a learned fallback.

// === Helper: parallel fetch with graceful degradation (used by aggregator) ===
async function parallelFetch(specs) {
  const results = await Promise.allSettled(
    specs.map(async (s) => {
      const r = await axios.get(s.url, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: s.timeout || 3000, validateStatus: () => true });
      return { key: s.key, status: r.status, data: r.data?.data || r.data || null };
    })
  );
  const out = {};
  for (let i = 0; i < specs.length; i++) {
    const r = results[i];
    out[specs[i].key] = r.status === 'fulfilled' && r.value.status < 400
      ? { ok: true, data: r.value.data }
      : { ok: false, error: 'downstream_unreachable' };
  }
  return out;
}

// === Aggregator: personal snapshot for a user ===
app.get('/api/genie/personal/:userId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const results = await parallelFetch([
      { key: 'memoryGraph',      url: `${GENIE_MEMORY_GRAPH_URL}/api/user/${userId}/graph` },
      { key: 'memoryInbox',      url: `${GENIE_MEMORY_INBOX_URL}/api/recent?userId=${userId}&limit=5` },
      { key: 'serendipity',      url: `${GENIE_SERENDIPITY_URL}/api/serendipity?userId=${userId}` },
      { key: 'relationships',    url: `${GENIE_RELATIONSHIP_OS_URL}/api/${userId}/dashboard` },
      { key: 'relationshipHealth', url: `${GENIE_RELATIONSHIP_OS_URL}/api/health/${userId}/overview` },
      { key: 'learning',         url: `${GENIE_LEARNING_OS_URL}/progress/${userId}` },
      { key: 'lifeGps',          url: `${GENIE_LIFE_GPS_URL}/gps/next/${userId}` },
      { key: 'lifeGoals',        url: `${GENIE_LIFE_GPS_URL}/goals/life/${userId}` },
      { key: 'thinking',         url: `${GENIE_THINKING_ENGINE_URL}/decide/pros-cons`, timeout: 5000 },
      { key: 'companion',        url: `${GENIE_COMPANION_URL}/story/${userId}` },
      { key: 'execution',        url: `${GENIE_EXECUTION_ENGINE_URL}/tasks/${userId}` },
      { key: 'consultant',       url: `${GENIE_CONSULTANT_AGENT_URL}/consult/history/${userId}` },
      { key: 'university',       url: `${GENIE_LIFE_UNIVERSITY_URL}/progress/${userId}` },
      { key: 'creation',         url: `${GENIE_CREATION_OS_URL}/video/projects/${userId}` },
      { key: 'forgetting',       url: `${GENIE_SMART_FORGETTING_URL}/api/config` },
    ]);
    const upCount = Object.values(results).filter((r) => r.ok).length;
    res.json({
      success: true,
      data: {
        userId,
        up: upCount,
        total: Object.keys(results).length,
        specialists: results,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    next(e);
  }
});

// === Intent engine integration: when keyword routing can't decide, ask intent-engine ===
async function tryIntentEngine(question, user) {
  try {
    const r = await axios.post(`${INTENT_ENGINE_URL}/api/intent`, {
      text: question,
      userId: user._id?.toString() || user.userId,
      corpId: user.corpId,
      context: { source: 'runtime-genie', version: '1.0.0' },
    }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 2000, validateStatus: () => true });
    if (r.status >= 400 || !r.data) return null;
    return r.data?.data || r.data;
  } catch (e) {
    return null;
  }
}

// === Hook into /api/ask: add intent-engine helper that the keyword flow can call ===
// We don't wrap /api/ask (too invasive). Instead we expose a helper that the
// existing flow (or external callers) can use. The intent-engine URL is
// already declared at the top, and USE_INTENT_ENGINE is honored.
app.post('/api/genie/intent', authMiddleware, async (req, res, next) => {
  if (!USE_INTENT_ENGINE) return err(res, 503, 'DISABLED', 'intent-engine disabled (set USE_INTENT_ENGINE=true)');
  try {
    const user = await User.findById(req.userId);
    if (!user) return err(res, 404, 'NOT_FOUND', 'user not found');
    const intent = await tryIntentEngine(req.body?.text || req.body?.question, user);
    if (!intent) {
      return res.json({ success: false, error: { code: 'DOWNSTREAM', message: 'intent-engine unreachable' }, meta: { timestamp: new Date().toISOString() } });
    }
    res.json({ success: true, data: intent, delegated_to: 'intent-engine', meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    next(e);
  }
});

// =====================================================================================
// VOICE OS + VOICE TWIN + RAZO KEYBOARD — unified voice & communication surface
// =====================================================================================

// === Voice Twin — voice profiles, TTS/STT per twin ===
app.get('/api/voice/twin/:userId/profiles', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.get(`${VOICE_TWIN_URL}/api/twins/voice/${req.params.userId}/profiles`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) {
    res.json({ success: true, data: { profiles: [], error: 'voice-twin unreachable' }, meta: { timestamp: new Date().toISOString() } });
  }
});

app.post('/api/voice/twin/synthesize', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${VOICE_TWIN_URL}/api/twins/voice/synthesize`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.post('/api/voice/twin/transcribe', authMiddleware, async (req, res, next) => {
  try {
    const r = await axios.post(`${VOICE_TWIN_URL}/api/twins/voice/transcribe`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

// === Voice OS — enterprise TTS/STT/NLU/telecom/agents ===
app.post('/api/voice/synthesize', authMiddleware, async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled (set USE_VOICE_OS=true)');
  try {
    const r = await axios.post(`${VOICE_OS_URL}/api/voice/synthesize`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 8000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.post('/api/voice/transcribe', authMiddleware, async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled');
  try {
    const r = await axios.post(`${VOICE_OS_URL}/api/voice/transcribe`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 8000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.post('/api/voice/nlu/intent', authMiddleware, async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled');
  try {
    const r = await axios.post(`${VOICE_OS_URL}/api/voice/nlu/intent`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.post('/api/voice/nlu/sentiment', authMiddleware, async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled');
  try {
    const r = await axios.post(`${VOICE_OS_URL}/api/voice/nlu/sentiment`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.post('/api/voice/agents/:agentId/invoke', authMiddleware, async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled');
  try {
    const r = await axios.post(`${VOICE_OS_URL}/api/voice/agents/${req.params.agentId}/invoke`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 10000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.post('/api/voice/calls', authMiddleware, async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled');
  try {
    const r = await axios.post(`${VOICE_OS_URL}/api/voice/calls`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 10000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.get('/api/voice/calls/:callId', authMiddleware, async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled');
  try {
    const r = await axios.get(`${VOICE_OS_URL}/api/voice/calls/${req.params.callId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

// === Voice Commerce — voice-driven transactions ===
app.post('/api/voice/commerce/checkout', authMiddleware, async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled');
  try {
    const r = await axios.post(`${VOICE_COMMERCE_URL}/api/voice/commerce/checkout`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 10000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.get('/api/voice/commerce/orders/:userId', authMiddleware, async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled');
  try {
    const r = await axios.get(`${VOICE_COMMERCE_URL}/api/voice/commerce/orders/${req.params.userId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

// === RAZO Keyboard — Communication OS (consumer-side input) ===
// Detect intent in user text via RAZO
app.post('/api/razo/intent', authMiddleware, async (req, res, next) => {
  if (!USE_RAZO) return err(res, 503, 'DISABLED', 'razo disabled (set USE_RAZO=true)');
  try {
    const r = await axios.post(`${RAZO_KEYBOARD_URL}/api/intent`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

// Send message via RAZO channel bridge (WhatsApp/Slack/email/SMS/etc.)
app.post('/api/razo/send', authMiddleware, async (req, res, next) => {
  if (!USE_RAZO) return err(res, 503, 'DISABLED', 'razo disabled');
  try {
    const r = await axios.post(`${RAZO_KEYBOARD_URL}/api/message`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 5000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

// RAZO session — for keyboard context persistence
app.post('/api/razo/session', authMiddleware, async (req, res, next) => {
  if (!USE_RAZO) return err(res, 503, 'DISABLED', 'razo disabled');
  try {
    const r = await axios.post(`${RAZO_KEYBOARD_URL}/api/session`, req.body, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.status(r.status).json(r.data);
  } catch (e) {
    if (e.response) res.status(e.response.status).json(e.response.data);
    else next(e);
  }
});

app.get('/api/razo/session/:sessionId', authMiddleware, async (req, res, next) => {
  if (!USE_RAZO) return err(res, 503, 'DISABLED', 'razo disabled');
  try {
    const r = await axios.get(`${RAZO_KEYBOARD_URL}/api/session/${req.params.sessionId}`, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 3000 });
    res.json({ success: true, data: r.data?.data || r.data, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

// RAZO webhook — receive async callbacks (delivery confirmations, etc.)
// RAZO posts here; we forward to the appropriate downstream service or persist.
app.post('/api/razo/webhook', async (req, res, next) => {
  if (!USE_RAZO) return res.json({ success: true, skipped: true, reason: 'razo disabled' });
  try {
    // For now: just acknowledge. Real implementation: route by event type.
    // event types: message.delivered, message.read, channel.error, intent.resolved
    const event = req.body?.event || req.body?.type;
    log_line('info', `razo webhook event=${event}`);
    res.json({ success: true, received: true, event, ts: new Date().toISOString() });
  } catch (e) { next(e); }
});

// RAZO callback to ask Genie — keyboard types a question, RAZO asks Genie, Genie answers
app.post('/api/razo/ask-genie', authMiddleware, async (req, res, next) => {
  if (!USE_RAZO) return err(res, 503, 'DISABLED', 'razo disabled');
  try {
    // Forward to Genie's own /api/ask
    const user = await User.findById(req.userId);
    if (!user) return err(res, 404, 'NOT_FOUND', 'User not found');
    const askRes = await callInternal(`http://localhost:${PORT}/api/ask`, 'POST', {
      question: req.body?.text || req.body?.question,
      context: req.body?.context || {},
    });
    res.json({
      success: true,
      data: {
        answer: askRes?.data?.answer,
        delegated_to: askRes?.data?.delegated_to,
        via: 'razo-keyboard',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) { next(e); }
});

// =====================================================================================
// UNIFIED VOICE PIPELINE — wake word → genie ask → voice response
// =====================================================================================

// Wake-word service calls this when "Hey Genie" is detected.
// We open an audio capture session and return a sessionId.
// The device then streams audio (e.g. POST /api/voice/wake/:sessionId/audio),
// runtime/genie transcribes via Voice OS, calls /api/ask, and synthesizes the response.
app.post('/api/voice/wake', async (req, res, next) => {
  try {
    const { userId, wakeWord, deviceId, language } = req.body || {};
    if (!userId) return err(res, 400, 'INVALID_INPUT', 'userId required');
    const sessionId = `vsess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    log_line('info', `voice/wake session=${sessionId} userId=${userId} device=${deviceId} lang=${language} word=${wakeWord}`);
    res.json({
      success: true,
      data: {
        sessionId,
        userId,
        deviceId,
        language: language || 'en',
        status: 'listening',
        captureTimeoutMs: 8000,
        audioEndpoint: `/api/voice/wake/${sessionId}/audio`,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) { next(e); }
});

// Device streams the post-wake-word audio here. We:
//  1. Transcribe via Voice OS
//  2. Run /api/ask with the transcript
//  3. Optionally synthesize the answer back to speech
app.post('/api/voice/wake/:sessionId/audio', async (req, res, next) => {
  if (!USE_VOICE_OS) return err(res, 503, 'DISABLED', 'voice-os disabled');
  try {
    const { sessionId } = req.params;
    const { userId, audio, audioBase64, language = 'en', respondWithVoice = true } = req.body || {};
    if (!userId) return err(res, 400, 'INVALID_INPUT', 'userId required');

    // 1) Transcribe audio → text
    const transcribeRes = await axios.post(`${VOICE_OS_URL}/api/voice/transcribe`, {
      audio: audio || audioBase64,
      language,
      userId,
    }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 8000, validateStatus: () => true });
    const transcript = transcribeRes.data?.data?.text || transcribeRes.data?.text || '';

    if (!transcript || transcript.trim().length === 0) {
      return res.json({
        success: true,
        data: { sessionId, transcript: '', answer: "I didn't catch that. Could you try again?", status: 'no_input' },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    // 2) Run the ask pipeline (same as /api/ask, but using userId from body)
    const askRes = await axios.post(`http://localhost:${PORT}/api/ask`, {
      question: transcript,
      context: { source: 'voice-wake', sessionId, language },
    }, {
      headers: {
        'x-internal-token': INTERNAL_SERVICE_TOKEN,
        // We can't easily forward the user's JWT here, so use internal token
        // and resolve the user from userId in the body
      },
      timeout: 10000,
      validateStatus: () => true,
    });
    const answer = askRes.data?.data?.answer || "I'm having trouble answering right now.";

    // 3) Optionally synthesize the answer
    let audioOut = null;
    if (respondWithVoice) {
      const synthRes = await axios.post(`${VOICE_OS_URL}/api/voice/synthesize`, {
        text: answer,
        language,
        userId,
      }, { headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN }, timeout: 8000, validateStatus: () => true });
      audioOut = synthRes.data?.data?.audio || synthRes.data?.audio || null;
    }

    res.json({
      success: true,
      data: {
        sessionId,
        transcript,
        answer,
        audio: audioOut,
        delegated_to: askRes.data?.data?.delegated_to,
        status: 'answered',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) { next(e); }
});

function log_line(level, msg) {
  // Lightweight logger so we don't depend on winston config here
  const line = JSON.stringify({ level, msg, ts: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else console.log(line);
}

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
