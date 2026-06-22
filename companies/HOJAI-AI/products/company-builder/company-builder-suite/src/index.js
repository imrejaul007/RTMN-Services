/**
 * Company Builder Suite — entity formation, registrations, governance
 *
 * The founder's complete AI platform for company formation and ongoing legal:
 * - Entities (LLC, C-Corp, S-Corp, LLP, sole-prop, nonprofit) with formation status
 * - Registrations (EIN, state, foreign qualification, sales tax)
 * - Governance (bylaws, operating agreements, board minutes, resolutions)
 * - Founders (multiple founders with vesting schedules)
 * - Equity grants (option pool, ISO/NSO grants, vesting)
 * - Filings (annual reports, franchise tax, BOI reports)
 * - Compliance tasks (jurisdiction-specific deadlines)
 *
 * Composed from:
 * - Founder OS (founder context)
 * - Investor Copilot (cap-table, shareholders)
 * - Genie Calendar (filing deadlines, compliance tasks)
 *
 * Port: 4268
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
import bcrypt from 'bcryptjs';

import { createLogger } from '../../../../shared/lib/logger.js';
import { createModel } from '../../../../shared/lib/persistent-store.js';
import {
  errorMiddleware, asyncHandler,
  NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, ValidationError,
} from '../../../../shared/lib/errors.js';

process.env.SERVICE_NAME = 'company-builder-suite';
const logger = createLogger('company-builder-suite');

const PORT = process.env.PORT || 4268;
const JWT_SECRET = process.env.JWT_SECRET;
const TEST_MODE = process.env.NODE_ENV === 'test';

// ============ MODELS ============

const User = createModel('CBUser', { key: 'id' });
const Entity = createModel('CBEntity', { key: 'id' });
const Registration = createModel('CBRegistration', { key: 'id' });
const GovernanceDoc = createModel('CBGovernanceDoc', { key: 'id' });
const FounderMember = createModel('CBFounderMember', { key: 'id' });
const EquityGrant = createModel('CBEquityGrant', { key: 'id' });
const Filing = createModel('CBFiling', { key: 'id' });
const ComplianceTask = createModel('CBComplianceTask', { key: 'id' });

// ============ HELPERS ============

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function vestingSchedule(totalShares, cliffMonths, vestingMonths, startDate, asOfDate = new Date()) {
  const start = new Date(startDate);
  const elapsedMonths = Math.max(0, (asOfDate - start) / (1000 * 60 * 60 * 24 * 30.44));
  if (elapsedMonths < cliffMonths) return { vested: 0, unvested: totalShares, percentVested: 0 };
  const ratio = Math.min(1, elapsedMonths / vestingMonths);
  const vested = Math.floor(ratio * totalShares);
  return {
    vested,
    unvested: totalShares - vested,
    percentVested: ratio * 100,
  };
}

function daysUntil(date) {
  const ms = new Date(date) - new Date();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ============ AUTH MIDDLEWARE ============

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next(new UnauthorizedError('No token'));
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (e) {
    next(new UnauthorizedError('Invalid token'));
  }
}

// ============ APP ============

export function createApp() {
  const app = express();


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  if (!TEST_MODE) app.use(morgan('combined'));
  if (!TEST_MODE) {
    app.use(rateLimit({ windowMs: 60_000, max: 200 }));
  }

  // ---- Health ----
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'company-builder-suite' }));
  app.get('/ready', (_req, res) => res.json({ ready: true }));

  // ============ AUTH ============

  app.post('/v1/users/register',requireAuth,  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { email, password, name } = req.body;
    const existing = await User.findOne({ email });
    if (existing) throw new ConflictError('User already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      id: genId('u'),
      email, name, passwordHash,
      createdAt: new Date().toISOString(),
    });
    const token = jwt.sign({ sub: user.id, email }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: { id: user.id, email, name } });
  }));

  app.post('/v1/users/login', [
    body('email').isEmail(),
    body('password').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new UnauthorizedError('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');
    const token = jwt.sign({ sub: user.id, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email, name: user.name } });
  }));

  // ============ ENTITIES ============

  app.post('/v1/entities', requireAuth, [
    body('name').notEmpty(),
    body('type').isIn(['llc', 'c-corp', 's-corp', 'llp', 'sole-prop', 'nonprofit', 'partnership']),
    body('state').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { name, type, state, industry, formationDate, einNumber, fiscalYearEnd = '12-31' } = req.body;
    const entity = await Entity.create({
      id: genId('ent'),
      userId: req.user.id,
      name, type, state, industry, formationDate, einNumber, fiscalYearEnd,
      status: formationDate ? 'active' : 'in-formation',
      createdAt: new Date().toISOString(),
    });

    // Auto-generate compliance tasks for new entity
    const baseTasks = [
      { name: 'File Beneficial Ownership Information (BOI)', category: 'federal', dueDays: 90, description: 'Required for all LLCs and corps formed in 2024+' },
      { name: `File annual report for ${state}`, category: 'state', dueDays: 365, description: 'Most states require annual/biennial reports' },
      { name: 'Set up registered agent', category: 'governance', dueDays: 7, description: 'Required in most states' },
    ];
    for (const t of baseTasks) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + t.dueDays);
      await ComplianceTask.create({
        id: genId('ct'),
        userId: req.user.id,
        entityId: entity.id,
        name: t.name, description: t.description, category: t.category,
        dueDate: dueDate.toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({ entity });
  }));

  app.get('/v1/entities', requireAuth, asyncHandler(async (req, res) => {
    const { type, status } = req.query;
    const filter = { userId: req.user.id };
    if (type) filter.type = type;
    if (status) filter.status = status;
    const entities = await Entity.find(filter);
    res.json({ entities });
  }));

  app.get('/v1/entities/:id', requireAuth, asyncHandler(async (req, res) => {
    const entity = await Entity.findOne({ id: req.params.id, userId: req.user.id });
    if (!entity) throw new NotFoundError('Entity not found');
    const members = await FounderMember.find({ entityId: entity.id });
    const grants = await EquityGrant.find({ entityId: entity.id });
    const docs = await GovernanceDoc.find({ entityId: entity.id });
    const registrations = await Registration.find({ entityId: entity.id });
    res.json({ entity, members, grants, documents: docs, registrations });
  }));

  // ============ REGISTRATIONS ============

  app.post('/v1/entities/:id/registrations', requireAuth, [
    body('type').isIn(['ein', 'state', 'foreign-qual', 'sales-tax', 'employer', 'dba']),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const entity = await Entity.findOne({ id: req.params.id, userId: req.user.id });
    if (!entity) throw new NotFoundError('Entity not found');

    const { type, jurisdiction, number, filedDate, status = 'pending', renewalDate, notes } = req.body;
    const reg = await Registration.create({
      id: genId('reg'),
      userId: req.user.id,
      entityId: entity.id,
      type, jurisdiction, number, filedDate, status, renewalDate, notes,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ registration: reg });
  }));

  app.put('/v1/registrations/:id', requireAuth, asyncHandler(async (req, res) => {
    const reg = await Registration.findOne({ id: req.params.id, userId: req.user.id });
    if (!reg) throw new NotFoundError('Registration not found');
    const updatable = ['status', 'number', 'renewalDate', 'notes'];
    for (const f of updatable) if (req.body[f] !== undefined) reg[f] = req.body[f];
    reg.updatedAt = new Date().toISOString();
    await Registration.updateOne({ id: reg.id }, reg);
    res.json({ registration: reg });
  }));

  // ============ FOUNDERS / MEMBERS ============

  app.post('/v1/entities/:id/members', requireAuth, [
    body('name').notEmpty(),
    body('ownershipPercent').isFloat({ min: 0, max: 100 }),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const entity = await Entity.findOne({ id: req.params.id, userId: req.user.id });
    if (!entity) throw new NotFoundError('Entity not found');

    const { name, email, role = 'founder', ownershipPercent, title, vestingStart, vestingMonths = 48, cliffMonths = 12, shares } = req.body;
    const member = await FounderMember.create({
      id: genId('fm'),
      userId: req.user.id,
      entityId: entity.id,
      name, email, role, ownershipPercent, title,
      vestingStart: vestingStart || new Date().toISOString(),
      vestingMonths, cliffMonths,
      shares: shares || 0,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ member });
  }));

  app.get('/v1/entities/:id/members', requireAuth, asyncHandler(async (req, res) => {
    const members = await FounderMember.find({ entityId: req.params.id, userId: req.user.id });
    res.json({ members });
  }));

  // ============ EQUITY GRANTS ============

  app.post('/v1/entities/:id/grants', requireAuth, [
    body('recipientName').notEmpty(),
    body('shares').isInt({ min: 0 }),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const entity = await Entity.findOne({ id: req.params.id, userId: req.user.id });
    if (!entity) throw new NotFoundError('Entity not found');

    const { recipientName, recipientEmail, type = 'iso', shares, strikePrice, grantDate, vestingMonths = 48, cliffMonths = 12 } = req.body;
    const grant = await EquityGrant.create({
      id: genId('eg'),
      userId: req.user.id,
      entityId: entity.id,
      recipientName, recipientEmail, type, shares, strikePrice: strikePrice || 0,
      grantDate: grantDate || new Date().toISOString(),
      vestingMonths, cliffMonths,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ grant });
  }));

  app.get('/v1/grants/:id/vesting', requireAuth, asyncHandler(async (req, res) => {
    const grant = await EquityGrant.findOne({ id: req.params.id, userId: req.user.id });
    if (!grant) throw new NotFoundError('Grant not found');
    const schedule = vestingSchedule(grant.shares, grant.cliffMonths, grant.vestingMonths, grant.grantDate);
    res.json({ grant, schedule });
  }));

  // ============ GOVERNANCE DOCS ============

  app.post('/v1/entities/:id/documents', requireAuth, [
    body('type').isIn(['bylaws', 'operating-agreement', 'board-minutes', 'resolution', 'consent', 'minutes']),
    body('title').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const entity = await Entity.findOne({ id: req.params.id, userId: req.user.id });
    if (!entity) throw new NotFoundError('Entity not found');

    const { type, title, body: docBody, meetingDate, signatories = [], effectiveDate } = req.body;
    const doc = await GovernanceDoc.create({
      id: genId('gd'),
      userId: req.user.id,
      entityId: entity.id,
      type, title, body: docBody, meetingDate, signatories, effectiveDate,
      status: 'draft',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ document: doc });
  }));

  app.put('/v1/documents/:id/execute', requireAuth, asyncHandler(async (req, res) => {
    const doc = await GovernanceDoc.findOne({ id: req.params.id, userId: req.user.id });
    if (!doc) throw new NotFoundError('Document not found');
    doc.status = 'executed';
    doc.executedAt = new Date().toISOString();
    if (req.body.signatories) doc.signatories = req.body.signatories;
    await GovernanceDoc.updateOne({ id: doc.id }, doc);
    res.json({ document: doc });
  }));

  // ============ FILINGS ============

  app.post('/v1/entities/:id/filings', requireAuth, [
    body('type').notEmpty(),
    body('dueDate').isISO8601(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const entity = await Entity.findOne({ id: req.params.id, userId: req.user.id });
    if (!entity) throw new NotFoundError('Entity not found');

    const { type, dueDate, filedDate, status = 'pending', fee = 0, jurisdiction, confirmationNumber } = req.body;
    const filing = await Filing.create({
      id: genId('fil'),
      userId: req.user.id,
      entityId: entity.id,
      type, dueDate, filedDate, status, fee, jurisdiction, confirmationNumber,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ filing });
  }));

  app.put('/v1/filings/:id/filed', requireAuth, asyncHandler(async (req, res) => {
    const filing = await Filing.findOne({ id: req.params.id, userId: req.user.id });
    if (!filing) throw new NotFoundError('Filing not found');
    filing.status = 'filed';
    filing.filedDate = req.body.filedDate || new Date().toISOString();
    if (req.body.confirmationNumber) filing.confirmationNumber = req.body.confirmationNumber;
    await Filing.updateOne({ id: filing.id }, filing);
    res.json({ filing });
  }));

  // ============ COMPLIANCE TASKS ============

  app.get('/v1/compliance/upcoming', requireAuth, asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const tasks = await ComplianceTask.find({ userId: req.user.id, status: 'pending' });
    const filtered = tasks.filter(t => {
      const d = daysUntil(t.dueDate);
      return d >= 0 && d <= parseInt(days);
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    res.json({ tasks: filtered, count: filtered.length });
  }));

  app.put('/v1/compliance/:id/complete', requireAuth, asyncHandler(async (req, res) => {
    const task = await ComplianceTask.findOne({ id: req.params.id, userId: req.user.id });
    if (!task) throw new NotFoundError('Task not found');
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    if (req.body.notes) task.notes = req.body.notes;
    await ComplianceTask.updateOne({ id: task.id }, task);
    res.json({ task });
  }));

  // ============ DASHBOARD ============

  app.get('/v1/dashboard', requireAuth, asyncHandler(async (req, res) => {
    const entities = await Entity.find({ userId: req.user.id });
    const tasks = await ComplianceTask.find({ userId: req.user.id, status: 'pending' });
    const filings = await Filing.find({ userId: req.user.id });
    const upcomingTasks = tasks.filter(t => daysUntil(t.dueDate) <= 30);
    const overdueTasks = tasks.filter(t => daysUntil(t.dueDate) < 0);

    res.json({
      dashboard: {
        totalEntities: entities.length,
        activeEntities: entities.filter(e => e.status === 'active').length,
        inFormationEntities: entities.filter(e => e.status === 'in-formation').length,
        totalComplianceTasks: tasks.length,
        upcomingTasks: upcomingTasks.length,
        overdueTasks: overdueTasks.length,
        totalFilings: filings.length,
        pendingFilings: filings.filter(f => f.status === 'pending').length,
        entityBreakdown: entities.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  }));

  // ---- 404 ----
  app.use((_req, _res, next) => next(new NotFoundError('Route not found')));
  app.use(errorMiddleware(logger));

  return app;
}

// ============ START ============

export function startServer() {
  const app = createApp();
  const server = app.listen(PORT, () => logger.info(`Company Builder Suite listening on :${PORT}`));
  installGracefulShutdown(server);
  return server;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) startServer();
