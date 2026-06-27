/**
 * Founder OS Product — OKRs + journal
 *
 * The founder's complete AI operating system for daily rituals:
 * - Objectives & Key Results (OKRs) — quarterly goals with measurable outcomes
 * - Journal entries — daily/weekly reflections
 * - Daily check-ins — quick status, blockers, gratitude
 * - Weekly reviews — auto-summarized from journal + OKRs
 *
 * Composed from:
 * - Genie Calendar (scheduled check-ins, weekly reviews)
 * - Genie Memory Graph (auto-link journal entries to OKRs)
 * - Genie Thinking Engine (decompose goals into KRs)
 * - TwinOS (founder twin tracks state)
 *
 * Port: 4266
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

import { createLogger } from '../../../../shared/lib/logger.js';
import { createModel } from '../../../../shared/lib/persistent-store.js';
import {
  errorMiddleware, asyncHandler,
  NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, ValidationError,
} from '../../../../shared/lib/errors.js';

process.env.SERVICE_NAME = 'founder-os-product';
const logger = createLogger('founder-os-product');

const PORT = process.env.PORT || 4266;
const JWT_SECRET = process.env.JWT_SECRET;
const TEST_MODE = process.env.NODE_ENV === 'test';

// ============ MODELS ============

const Objective = createModel('FounderObjective', { key: 'id' });
const KeyResult = createModel('FounderKeyResult', { key: 'id' });
const JournalEntry = createModel('FounderJournal', { key: 'id' });
const CheckIn = createModel('FounderCheckIn', { key: 'id' });
const WeeklyReview = createModel('FounderWeeklyReview', { key: 'id' });
const Founder = createModel('Founder', { key: 'id' });

// ============ HELPERS ============

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function quarterFor(date) {
  const d = new Date(date);
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  const q = Math.floor(month / 3) + 1;
  return `${year}-Q${q}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setUTCDate(diff));
}

// ============ AUTH MIDDLEWARE ============

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next(new UnauthorizedError('No token'));
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.founder = { id: decoded.sub, email: decoded.email };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

// ============ APP ============

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}



// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '5mb' }));

const defaultLimiter = TEST_MODE ? (req, res, n) => n() : rateLimit({ windowMs: 60_000, max: 200 });
app.use(defaultLimiter);

// ============ HEALTH ============

app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'founder-os-product',
    version: '1.0.0',
    port: PORT,
    storage: 'persistent',
    timestamp: new Date().toISOString(),
    stats: {
      objectives: await Objective.countDocuments(),
      keyResults: await KeyResult.countDocuments(),
      journalEntries: await JournalEntry.countDocuments(),
      checkIns: await CheckIn.countDocuments(),
    },
  });
});

app.get('/ready', async (req, res) => {
  try {
    const c = await Objective.countDocuments();
    res.json({ status: 'ready', dataLayer: 'ok', objectiveCount: c });
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});

// ============ FOUNDER AUTH ============

app.post('/v1/founders/register',requireAuth,  asyncHandler(async (req, res) => {
  const { email, name, company } = req.body || {};
  if (!email || !name) throw new ValidationError('email and name required');
  if (await Founder.findOne({ email })) throw new ConflictError('founder already exists');
  const founder = await Founder.create({
    id: genId('found'),
    email, name,
    company: company || null,
    createdAt: new Date().toISOString(),
  });
  const token = jwt.sign({ sub: founder.id, email }, JWT_SECRET, { expiresIn: '30d' });
  logger.info({ founderId: founder.id, email }, 'Founder registered');
  res.status(201).json({ success: true, founder: { id: founder.id, email, name }, token });
}));

app.post('/v1/founders/login', asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw new ValidationError('email required');
  const founder = await Founder.findOne({ email });
  if (!founder) throw new NotFoundError('founder not found');
  const token = jwt.sign({ sub: founder.id, email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, founder: { id: founder.id, email: founder.email, name: founder.name }, token });
}));

app.get('/v1/founders/me', requireAuth, asyncHandler(async (req, res) => {
  const founder = await Founder.findOne(req.founder.id);
  if (!founder) throw new NotFoundError('founder not found');
  res.json({ success: true, founder });
}));

// ============ OBJECTIVES (OKRs) ============

app.post('/v1/objectives', requireAuth, [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isLength({ max: 1000 }),
  body('quarter').optional().matches(/^\d{4}-Q[1-4]$/),
  validate,
], asyncHandler(async (req, res) => {
  const { title, description, quarter } = req.body;
  const obj = await Objective.create({
    id: genId('obj'),
    founderId: req.founder.id,
    title,
    description: description || '',
    quarter: quarter || quarterFor(new Date()),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  logger.info({ founderId: req.founder.id, objectiveId: obj.id }, 'Objective created');
  res.status(201).json({ success: true, objective: obj });
}));

app.get('/v1/objectives', requireAuth, asyncHandler(async (req, res) => {
  const quarter = req.query.quarter;
  let all = await Objective.find({ founderId: req.founder.id });
  if (quarter) all = all.filter(o => o.quarter === quarter);
  if (req.query.status) all = all.filter(o => o.status === req.query.status);
  res.json({ success: true, count: all.length, objectives: all });
}));

app.get('/v1/objectives/:id', requireAuth, asyncHandler(async (req, res) => {
  const obj = await Objective.findOne(req.params.id);
  if (!obj) throw new NotFoundError('objective not found');
  if (obj.founderId !== req.founder.id) throw new ForbiddenError('not your objective');
  const krs = await KeyResult.find({ objectiveId: obj.id });
  res.json({ success: true, objective: obj, keyResults: krs });
}));

app.put('/v1/objectives/:id', requireAuth, asyncHandler(async (req, res) => {
  const obj = await Objective.findOne(req.params.id);
  if (!obj) throw new NotFoundError('objective not found');
  if (obj.founderId !== req.founder.id) throw new ForbiddenError('not your objective');
  const updates = req.body || {};
  delete updates.id;
  delete updates.founderId;
  updates.updatedAt = new Date().toISOString();
  const updated = await Objective.updateOne({ id: obj.id }, updates);
  res.json({ success: true, objective: updated });
}));

app.delete('/v1/objectives/:id', requireAuth, asyncHandler(async (req, res) => {
  const obj = await Objective.findOne(req.params.id);
  if (!obj) throw new NotFoundError('objective not found');
  if (obj.founderId !== req.founder.id) throw new ForbiddenError('not your objective');
  await Objective.deleteOne({ id: obj.id });
  // Cascade: delete key results
  const krs = await KeyResult.find({ objectiveId: obj.id });
  for (const kr of krs) await KeyResult.deleteOne({ id: kr.id });
  res.json({ success: true, deleted: obj.id, keyResultsDeleted: krs.length });
}));

// ============ KEY RESULTS ============

app.post('/v1/objectives/:objectiveId/key-results', requireAuth, [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('target').isFloat({ min: 0 }),
  body('unit').optional().isLength({ max: 50 }),
  validate,
], asyncHandler(async (req, res) => {
  const obj = await Objective.findOne(req.params.objectiveId);
  if (!obj) throw new NotFoundError('objective not found');
  if (obj.founderId !== req.founder.id) throw new ForbiddenError('not your objective');

  const kr = await KeyResult.create({
    id: genId('kr'),
    objectiveId: obj.id,
    founderId: req.founder.id,
    title: req.body.title,
    target: req.body.target,
    current: req.body.current || 0,
    unit: req.body.unit || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json({ success: true, keyResult: kr });
}));

app.put('/v1/key-results/:id', requireAuth, asyncHandler(async (req, res) => {
  const kr = await KeyResult.findOne(req.params.id);
  if (!kr) throw new NotFoundError('key result not found');
  if (kr.founderId !== req.founder.id) throw new ForbiddenError('not your KR');
  const updates = req.body || {};
  delete updates.id;
  delete updates.founderId;
  delete updates.objectiveId;
  updates.updatedAt = new Date().toISOString();
  const updated = await KeyResult.updateOne({ id: kr.id }, updates);
  res.json({ success: true, keyResult: updated });
}));

// ============ JOURNAL ============

app.post('/v1/journal', requireAuth, [
  body('content').trim().isLength({ min: 1, max: 10000 }),
  body('mood').optional().isIn(['great', 'good', 'neutral', 'low', 'rough']),
  body('tags').optional().isArray(),
  body('linkedObjectiveId').optional().isString(),
  validate,
], asyncHandler(async (req, res) => {
  const { content, mood, tags, linkedObjectiveId } = req.body;
  const entry = await JournalEntry.create({
    id: genId('jr'),
    founderId: req.founder.id,
    content,
    mood: mood || 'neutral',
    tags: tags || [],
    linkedObjectiveId: linkedObjectiveId || null,
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ success: true, entry });
}));

app.get('/v1/journal', requireAuth, asyncHandler(async (req, res) => {
  let entries = await JournalEntry.find({ founderId: req.founder.id });
  if (req.query.date) entries = entries.filter(e => e.date === req.query.date);
  if (req.query.mood) entries = entries.filter(e => e.mood === req.query.mood);
  if (req.query.tag) entries = entries.filter(e => (e.tags || []).includes(req.query.tag));
  // Sort by createdAt desc
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Pagination
  const limit = parseInt(req.query.limit) || 30;
  const page = parseInt(req.query.page) || 1;
  const start = (page - 1) * limit;
  const paginated = entries.slice(start, start + limit);
  res.json({ success: true, count: entries.length, page, limit, entries: paginated });
}));

app.delete('/v1/journal/:id', requireAuth, asyncHandler(async (req, res) => {
  const entry = await JournalEntry.findOne(req.params.id);
  if (!entry) throw new NotFoundError('entry not found');
  if (entry.founderId !== req.founder.id) throw new ForbiddenError('not your entry');
  await JournalEntry.deleteOne({ id: entry.id });
  res.json({ success: true, deleted: entry.id });
}));

// ============ CHECK-INS ============

app.post('/v1/check-ins', requireAuth, [
  body('status').trim().isLength({ min: 1, max: 500 }),
  body('blockers').optional().isLength({ max: 1000 }),
  body('wins').optional().isLength({ max: 1000 }),
  body('gratitude').optional().isLength({ max: 500 }),
  validate,
], asyncHandler(async (req, res) => {
  const { status, blockers, wins, gratitude } = req.body;
  const checkIn = await CheckIn.create({
    id: genId('ci'),
    founderId: req.founder.id,
    status, blockers: blockers || '', wins: wins || '', gratitude: gratitude || '',
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ success: true, checkIn });
}));

app.get('/v1/check-ins', requireAuth, asyncHandler(async (req, res) => {
  let entries = await CheckIn.find({ founderId: req.founder.id });
  if (req.query.date) entries = entries.filter(e => e.date === req.query.date);
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ success: true, count: entries.length, entries });
}));

// ============ WEEKLY REVIEW (auto-generated summary) ============

app.post('/v1/weekly-reviews', requireAuth, asyncHandler(async (req, res) => {
  const founderId = req.founder.id;
  const now = new Date();
  const weekStart = startOfWeek(now).toISOString().slice(0, 10);
  const weekEnd = now.toISOString().slice(0, 10);

  // Gather week's data
  const allCheckIns = await CheckIn.find({ founderId });
  const allJournal = await JournalEntry.find({ founderId });
  const allKRs = await KeyResult.find({ founderId });
  const allObjs = await Objective.find({ founderId, status: 'active' });

  const weekCheckIns = allCheckIns.filter(c => c.date >= weekStart && c.date <= weekEnd);
  const weekJournal = allJournal.filter(j => j.date >= weekStart && j.date <= weekEnd);

  // Compute progress
  const progress = allObjs.map(obj => {
    const krs = allKRs.filter(kr => kr.objectiveId === obj.id);
    const avgProgress = krs.length
      ? krs.reduce((sum, kr) => sum + (kr.current / kr.target), 0) / krs.length
      : 0;
    return { objective: obj.title, keyResults: krs.length, progress: Math.round(avgProgress * 100) };
  });

  const review = await WeeklyReview.create({
    id: genId('wr'),
    founderId,
    weekStart,
    weekEnd,
    checkInCount: weekCheckIns.length,
    journalCount: weekJournal.length,
    blockersReported: weekCheckIns.filter(c => c.blockers).length,
    winsReported: weekCheckIns.filter(c => c.wins).length,
    objectiveProgress: progress,
    summary: `Week of ${weekStart}: ${weekCheckIns.length} check-ins, ${weekJournal.length} journal entries, ${progress.length} active OKRs.`,
    createdAt: new Date().toISOString(),
  });

  logger.info({ founderId, reviewId: review.id, weekStart }, 'Weekly review generated');
  res.status(201).json({ success: true, review });
}));

app.get('/v1/weekly-reviews', requireAuth, asyncHandler(async (req, res) => {
  let reviews = await WeeklyReview.find({ founderId: req.founder.id });
  reviews.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  res.json({ success: true, count: reviews.length, reviews });
}));

// ============ DASHBOARD (composite view) ============

app.get('/v1/dashboard', requireAuth, asyncHandler(async (req, res) => {
  const founderId = req.founder.id;
  const objs = await Objective.find({ founderId });
  const krs = await KeyResult.find({ founderId });
  const activeObjs = objs.filter(o => o.status === 'active');

  const progress = activeObjs.map(obj => {
    const objKRs = krs.filter(kr => kr.objectiveId === obj.id);
    const avgProgress = objKRs.length
      ? objKRs.reduce((sum, kr) => sum + (kr.current / kr.target), 0) / objKRs.length
      : 0;
    return { objectiveId: obj.id, title: obj.title, progress: Math.round(avgProgress * 100) };
  });

  const recentJournal = (await JournalEntry.find({ founderId }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const recentCheckIns = (await CheckIn.find({ founderId }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  res.json({
    success: true,
    dashboard: {
      objectives: { total: objs.length, active: activeObjs.length },
      keyResults: { total: krs.length, averageProgress: progress.length ? Math.round(progress.reduce((s, p) => s + p.progress, 0) / progress.length) : 0 },
      progress,
      recentJournal,
      recentCheckIns,
      generatedAt: new Date().toISOString(),
    },
  });
}));

// ============ ERROR HANDLERS ============

app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
});
app.use(errorMiddleware(logger));

// ============ START ============

export async function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`🚀 Founder OS Product v1.0.0 running on port ${port}`);
      resolve(server);
    });
    installGracefulShutdown(server);
    server.on('error', reject);
  });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  startServer().catch(err => { logger.error({ err }, 'Failed to start'); process.exit(1); });
}

export default app;

// ============ HELPERS (validate) ============
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: errors.array().map(e => ({ field: e.path, message: e.msg })),
      },
    });
  }
  next();
}
