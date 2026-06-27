/**
 * Investor Copilot — funding rounds, cap-table, dilution modeling
 *
 * The founder's complete AI copilot for managing investors and the cap-table:
 * - Funding Rounds (Seed, Series A/B/C, etc.) with round terms
 * - Investors (CRM-style with contact info, status, follow-ups)
 * - Cap-Table (shareholders, share classes, ownership %)
 * - Round Modeling (pre-money valuation, dilution, target raise)
 * - Investor Updates (monthly/quarterly auto-generated)
 * - Pipeline (lead → committed → closed)
 *
 * Composed from:
 * - Founder OS (founder's company context)
 * - Genie Calendar (investor follow-up reminders)
 * - Genie Thinking Engine (round modeling, dilution scenarios)
 * - TwinOS (investor twin, company twin)
 *
 * Port: 4265
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

process.env.SERVICE_NAME = 'investor-copilot';
const logger = createLogger('investor-copilot');

const PORT = process.env.PORT || 4265;
const JWT_SECRET = process.env.JWT_SECRET;
const TEST_MODE = process.env.NODE_ENV === 'test';

// ============ MODELS ============

const Founder = createModel('ICFounder', { key: 'id' });
const Round = createModel('ICRound', { key: 'id' });
const Investor = createModel('ICInvestor', { key: 'id' });
const Shareholder = createModel('ICShareholder', { key: 'id' });
const ShareClass = createModel('ICShareClass', { key: 'id' });
const RoundParticipation = createModel('ICRoundParticipation', { key: 'id' });
const InvestorUpdate = createModel('ICInvestorUpdate', { key: 'id' });
const FollowUp = createModel('ICFollowUp', { key: 'id' });

// ============ HELPERS ============

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function roundTypeFor(amount) {
  if (amount < 1_000_000) return 'Pre-Seed';
  if (amount < 3_000_000) return 'Seed';
  if (amount < 10_000_000) return 'Series A';
  if (amount < 30_000_000) return 'Series B';
  if (amount < 100_000_000) return 'Series C';
  return 'Series D+';
}

function calculateDilution(currentShares, newShares) {
  const total = currentShares + newShares;
  if (total === 0) return { prePercent: 0, postPercent: 0, dilution: 0 };
  return {
    prePercent: 100,
    postPercent: (currentShares / total) * 100,
    dilution: 100 - (currentShares / total) * 100,
  };
}

function postMoneyValuation(preMoney, raiseAmount) {
  return preMoney + raiseAmount;
}

function ownershipFor(investmentAmount, postMoney) {
  if (postMoney === 0) return 0;
  return (investmentAmount / postMoney) * 100;
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
  } catch (e) {
    next(new UnauthorizedError('Invalid token'));
  }
}

// ============ APP ============

export function createApp() {
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
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  if (!TEST_MODE) app.use(morgan('combined'));
  if (!TEST_MODE) {
    app.use(rateLimit({ windowMs: 60_000, max: 200 }));
  }

  // ---- Health ----
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'investor-copilot' }));
  app.get('/ready', (_req, res) => res.json({ ready: true }));

  // ============ AUTH ============

  app.post('/v1/founders/register',requireAuth,  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty(),
    body('companyName').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { email, password, name, companyName } = req.body;
    const existing = await Founder.findOne({ email });
    if (existing) throw new ConflictError('Founder already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const founder = await Founder.create({
      id: genId('founder'),
      email, name, companyName, passwordHash,
      createdAt: new Date().toISOString(),
    });

    // Auto-create a Common Stock share class for the founder
    await ShareClass.create({
      id: genId('sc'),
      founderId: founder.id,
      name: 'Common Stock',
      authorized: 10_000_000,
      parValue: 0.0001,
      createdAt: new Date().toISOString(),
    });

    const token = jwt.sign({ sub: founder.id, email }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, founder: { id: founder.id, email, name, companyName } });
  }));

  app.post('/v1/founders/login', [
    body('email').isEmail(),
    body('password').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { email, password } = req.body;
    const founder = await Founder.findOne({ email });
    if (!founder) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(password, founder.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const token = jwt.sign({ sub: founder.id, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, founder: { id: founder.id, email, name: founder.companyName } });
  }));

  app.get('/v1/founders/me', requireAuth, asyncHandler(async (req, res) => {
    const founder = await Founder.findOne({ id: req.founder.id });
    if (!founder) throw new NotFoundError('Founder not found');
    res.json({ founder: { id: founder.id, email: founder.email, name: founder.name, companyName: founder.companyName } });
  }));

  // ============ SHARE CLASSES ============

  app.post('/v1/share-classes', requireAuth, [
    body('name').notEmpty(),
    body('authorized').isInt({ min: 0 }),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { name, authorized, parValue = 0.0001, liquidationPreference = 1.0 } = req.body;
    const sc = await ShareClass.create({
      id: genId('sc'),
      founderId: req.founder.id,
      name, authorized, parValue, liquidationPreference,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ shareClass: sc });
  }));

  app.get('/v1/share-classes', requireAuth, asyncHandler(async (req, res) => {
    const scs = await ShareClass.find({ founderId: req.founder.id });
    res.json({ shareClasses: scs });
  }));

  // ============ SHAREHOLDERS (Cap-Table) ============

  app.post('/v1/shareholders', requireAuth, [
    body('name').notEmpty(),
    body('shares').isInt({ min: 0 }),
    body('shareClassId').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { name, shares, shareClassId, type = 'individual', email, isFounder = false } = req.body;
    const sc = await ShareClass.findOne({ id: shareClassId, founderId: req.founder.id });
    if (!sc) throw new NotFoundError('Share class not found');

    const sh = await Shareholder.create({
      id: genId('sh'),
      founderId: req.founder.id,
      name, shares, shareClassId, type, email, isFounder,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ shareholder: sh });
  }));

  app.get('/v1/shareholders', requireAuth, asyncHandler(async (req, res) => {
    const shareholders = await Shareholder.find({ founderId: req.founder.id });

    // Calculate ownership % per shareholder
    const totalShares = shareholders.reduce((sum, s) => sum + s.shares, 0);
    const enriched = shareholders.map(s => ({
      ...s,
      ownershipPercent: totalShares > 0 ? (s.shares / totalShares) * 100 : 0,
    }));
    res.json({ shareholders: enriched, totalShares });
  }));

  // ============ ROUNDS ============

  app.post('/v1/rounds', requireAuth, [
    body('name').notEmpty(),
    body('targetRaise').isFloat({ min: 0 }),
    body('preMoneyValuation').isFloat({ min: 0 }),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { name, targetRaise, preMoneyValuation, type, status = 'planning', closeDate, leadInvestor, notes } = req.body;
    const postMoney = postMoneyValuation(preMoneyValuation, targetRaise);

    const round = await Round.create({
      id: genId('round'),
      founderId: req.founder.id,
      name, type: type || roundTypeFor(targetRaise), status, targetRaise, preMoneyValuation,
      postMoneyValuation: postMoney,
      closeDate, leadInvestor, notes,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ round });
  }));

  app.get('/v1/rounds', requireAuth, asyncHandler(async (req, res) => {
    const { status, type } = req.query;
    const filter = { founderId: req.founder.id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    const rounds = await Round.find(filter);
    res.json({ rounds });
  }));

  app.get('/v1/rounds/:id', requireAuth, asyncHandler(async (req, res) => {
    const round = await Round.findOne({ id: req.params.id, founderId: req.founder.id });
    if (!round) throw new NotFoundError('Round not found');

    const participations = await RoundParticipation.find({ roundId: round.id });
    const committed = participations.reduce((sum, p) => sum + (p.status === 'committed' || p.status === 'closed' ? p.amount : 0), 0);
    const closed = participations.reduce((sum, p) => sum + (p.status === 'closed' ? p.amount : 0), 0);

    res.json({ round, participations, summary: { committed, closed, targetRaise: round.targetRaise, progress: round.targetRaise > 0 ? (committed / round.targetRaise) * 100 : 0 } });
  }));

  app.put('/v1/rounds/:id', requireAuth, asyncHandler(async (req, res) => {
    const round = await Round.findOne({ id: req.params.id, founderId: req.founder.id });
    if (!round) throw new NotFoundError('Round not found');
    if (req.body.status) round.status = req.body.status;
    if (req.body.leadInvestor !== undefined) round.leadInvestor = req.body.leadInvestor;
    if (req.body.notes !== undefined) round.notes = req.body.notes;
    if (req.body.closeDate !== undefined) round.closeDate = req.body.closeDate;
    round.updatedAt = new Date().toISOString();
    await Round.updateOne({ id: round.id }, round);
    res.json({ round });
  }));

  // ============ ROUND MODELING ============

  app.post('/v1/rounds/:id/model', requireAuth, [
    body('investmentAmount').isFloat({ min: 0 }),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const round = await Round.findOne({ id: req.params.id, founderId: req.founder.id });
    if (!round) throw new NotFoundError('Round not found');

    const { investmentAmount } = req.body;
    const ownership = ownershipFor(investmentAmount, round.postMoneyValuation);
    const newShares = round.postMoneyValuation > 0 ? Math.round((ownership / 100) * 1_000_000) : 0;
    const dilution = calculateDilution(1_000_000, newShares);

    res.json({
      modeling: {
        investmentAmount,
        postMoneyValuation: round.postMoneyValuation,
        ownershipPercent: ownership,
        estimatedShares: newShares,
        existingShareholderDilution: dilution.dilution,
      },
    });
  }));

  // ============ INVESTORS (CRM) ============

  app.post('/v1/investors', requireAuth, [
    body('name').notEmpty(),
    body('type').isIn(['angel', 'vc', 'fund', 'strategic', 'family-office']),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { name, type, firm, email, phone, linkedin, twitter, website, focusAreas, stage, status = 'lead', notes } = req.body;
    const investor = await Investor.create({
      id: genId('inv'),
      founderId: req.founder.id,
      name, type, firm, email, phone, linkedin, twitter, website,
      focusAreas: focusAreas || [], stage, status, notes,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ investor });
  }));

  app.get('/v1/investors', requireAuth, asyncHandler(async (req, res) => {
    const { status, type, stage } = req.query;
    const filter = { founderId: req.founder.id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (stage) filter.stage = stage;
    const investors = await Investor.find(filter);
    res.json({ investors });
  }));

  app.put('/v1/investors/:id', requireAuth, asyncHandler(async (req, res) => {
    const investor = await Investor.findOne({ id: req.params.id, founderId: req.founder.id });
    if (!investor) throw new NotFoundError('Investor not found');
    const updatable = ['name', 'type', 'firm', 'email', 'phone', 'linkedin', 'twitter', 'website', 'focusAreas', 'stage', 'status', 'notes'];
    for (const f of updatable) if (req.body[f] !== undefined) investor[f] = req.body[f];
    investor.updatedAt = new Date().toISOString();
    await Investor.updateOne({ id: investor.id }, investor);
    res.json({ investor });
  }));

  // ============ ROUND PARTICIPATION ============

  app.post('/v1/rounds/:id/participations', requireAuth, [
    body('investorId').notEmpty(),
    body('amount').isFloat({ min: 0 }),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const round = await Round.findOne({ id: req.params.id, founderId: req.founder.id });
    if (!round) throw new NotFoundError('Round not found');
    const investor = await Investor.findOne({ id: req.body.investorId, founderId: req.founder.id });
    if (!investor) throw new NotFoundError('Investor not found');

    const ownership = ownershipFor(req.body.amount, round.postMoneyValuation);
    const participation = await RoundParticipation.create({
      id: genId('part'),
      founderId: req.founder.id,
      roundId: round.id, investorId: investor.id,
      amount: req.body.amount,
      ownershipPercent: ownership,
      status: req.body.status || 'interested',
      createdAt: new Date().toISOString(),
    });

    // Update investor status to engaged
    investor.status = 'engaged';
    await Investor.updateOne({ id: investor.id }, investor);

    res.status(201).json({ participation });
  }));

  app.get('/v1/rounds/:id/participations', requireAuth, asyncHandler(async (req, res) => {
    const participations = await RoundParticipation.find({ roundId: req.params.id, founderId: req.founder.id });
    // Enrich with investor names
    const enriched = await Promise.all(participations.map(async p => {
      const inv = await Investor.findOne({ id: p.investorId });
      return { ...p, investorName: inv?.name, investorFirm: inv?.firm };
    }));
    res.json({ participations: enriched });
  }));

  // ============ FOLLOW-UPS ============

  app.post('/v1/investors/:id/follow-ups', requireAuth, [
    body('type').isIn(['call', 'email', 'meeting', 'note']),
    body('notes').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const investor = await Investor.findOne({ id: req.params.id, founderId: req.founder.id });
    if (!investor) throw new NotFoundError('Investor not found');

    const { type, notes, dueDate, outcome } = req.body;
    const followUp = await FollowUp.create({
      id: genId('fu'),
      founderId: req.founder.id,
      investorId: investor.id,
      type, notes, dueDate, outcome,
      status: outcome ? 'completed' : 'pending',
      createdAt: new Date().toISOString(),
    });

    investor.lastContactAt = new Date().toISOString();
    await Investor.updateOne({ id: investor.id }, investor);

    res.status(201).json({ followUp });
  }));

  app.get('/v1/investors/:id/follow-ups', requireAuth, asyncHandler(async (req, res) => {
    const followUps = await FollowUp.find({ investorId: req.params.id, founderId: req.founder.id });
    res.json({ followUps });
  }));

  // ============ INVESTOR UPDATES ============

  app.post('/v1/updates', requireAuth, [
    body('period').notEmpty(),
    body('content').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { period, content, highlights = [], metrics = {}, asks = [], sentAt } = req.body;
    const update = await InvestorUpdate.create({
      id: genId('upd'),
      founderId: req.founder.id,
      period, content, highlights, metrics, asks,
      sentAt: sentAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ update });
  }));

  app.get('/v1/updates', requireAuth, asyncHandler(async (req, res) => {
    const updates = await InvestorUpdate.find({ founderId: req.founder.id });
    res.json({ updates });
  }));

  // ============ DASHBOARD ============

  app.get('/v1/dashboard', requireAuth, asyncHandler(async (req, res) => {
    const rounds = await Round.find({ founderId: req.founder.id });
    const activeRound = rounds.find(r => r.status === 'open' || r.status === 'planning');
    const investors = await Investor.find({ founderId: req.founder.id });
    const shareholders = await Shareholder.find({ founderId: req.founder.id });
    const totalShares = shareholders.reduce((sum, s) => sum + s.shares, 0);
    const totalRaised = rounds.reduce((sum, r) => sum + (r.raised || 0), 0);

    const investorByStatus = investors.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      dashboard: {
        company: (await Founder.findOne({ id: req.founder.id }))?.companyName,
        totalRaised,
        totalRounds: rounds.length,
        activeRound: activeRound ? { id: activeRound.id, name: activeRound.name, target: activeRound.targetRaise, raised: activeRound.raised || 0 } : null,
        totalInvestors: investors.length,
        investorByStatus,
        totalShareholders: shareholders.length,
        totalShares,
        topShareholders: shareholders
          .sort((a, b) => b.shares - a.shares)
          .slice(0, 5)
          .map(s => ({ name: s.name, shares: s.shares, percent: totalShares > 0 ? (s.shares / totalShares) * 100 : 0 })),
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
  const server = app.listen(PORT, () => logger.info(`Investor Copilot listening on :${PORT}`));
  installGracefulShutdown(server);
  return server;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) startServer();
