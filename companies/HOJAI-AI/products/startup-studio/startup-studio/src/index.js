/**
 * Startup Studio — cohorts, mentors, programs
 *
 * The operator's complete AI platform for running startup accelerator/studio programs:
 * - Cohorts (batches of startups, with start/end dates, themes)
 * - Programs (long-running accelerator/incubator programs)
 * - Mentors (experts with expertise areas, availability, ratings)
 * - Applications (startups applying to cohorts)
 * - Mentor-Mentee matching (auto-match based on expertise + needs)
 * - Sessions (1:1 mentor-mentee meetings)
 * - Progress tracking (milestones, KPIs, demo days)
 *
 * Composed from:
 * - Founder OS (startup's founder context)
 * - Investor Copilot (demo day prep, investor intros)
 * - Genie Calendar (cohort milestones, sessions)
 * - Genie Thinking Engine (mentor matching)
 *
 * Port: 4267
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

process.env.SERVICE_NAME = 'startup-studio';
const logger = createLogger('startup-studio');

const PORT = process.env.PORT || 4267;
const JWT_SECRET = process.env.JWT_SECRET;
const TEST_MODE = process.env.NODE_ENV === 'test';

// ============ MODELS ============

const Operator = createModel('SSOperator', { key: 'id' });
const Program = createModel('SSProgram', { key: 'id' });
const Cohort = createModel('SSCohort', { key: 'id' });
const Mentor = createModel('SSMentor', { key: 'id' });
const Application = createModel('SSApplication', { key: 'id' });
const Match = createModel('SSMatch', { key: 'id' });
const Session = createModel('SSSession', { key: 'id' });
const Milestone = createModel('SSMilestone', { key: 'id' });

// ============ HELPERS ============

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function matchScore(mentor, application) {
  let score = 0;
  // Expertise overlap
  const overlap = (mentor.expertise || []).filter(e => (application.needs || []).includes(e));
  score += overlap.length * 20;
  // Stage match
  if (mentor.preferredStages?.includes(application.stage)) score += 30;
  // Industry match
  if (mentor.industries?.includes(application.industry)) score += 25;
  // Availability bonus
  if (mentor.availability && mentor.availability > 0) score += 10;
  return Math.min(100, score);
}

// ============ AUTH MIDDLEWARE ============

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next(new UnauthorizedError('No token'));
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.operator = { id: decoded.sub, email: decoded.email };
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
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'startup-studio' }));
  app.get('/ready', (_req, res) => res.json({ ready: true }));

  // ============ AUTH ============

  app.post('/v1/operators/register',requireAuth,  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty(),
    body('studioName').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { email, password, name, studioName, role = 'operator' } = req.body;
    const existing = await Operator.findOne({ email });
    if (existing) throw new ConflictError('Operator already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const operator = await Operator.create({
      id: genId('op'),
      email, name, studioName, role, passwordHash,
      createdAt: new Date().toISOString(),
    });

    const token = jwt.sign({ sub: operator.id, email }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, operator: { id: operator.id, email, name, studioName, role } });
  }));

  app.post('/v1/operators/login',requireAuth,  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { email, password } = req.body;
    const operator = await Operator.findOne({ email });
    if (!operator) throw new UnauthorizedError('Invalid credentials');
    const valid = await bcrypt.compare(password, operator.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const token = jwt.sign({ sub: operator.id, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, operator: { id: operator.id, email, name: operator.name, role: operator.role } });
  }));

  // ============ PROGRAMS ============

  app.post('/v1/programs', requireAuth, [
    body('name').notEmpty(),
    body('type').isIn(['accelerator', 'incubator', 'studio', 'pre-accelerator']),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { name, type, description, durationWeeks, equityStake = 0, investmentAmount = 0 } = req.body;
    const program = await Program.create({
      id: genId('prog'),
      operatorId: req.operator.id,
      name, type, description, durationWeeks, equityStake, investmentAmount,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ program });
  }));

  app.get('/v1/programs', requireAuth, asyncHandler(async (req, res) => {
    const programs = await Program.find({ operatorId: req.operator.id });
    res.json({ programs });
  }));

  // ============ COHORTS ============

  app.post('/v1/cohorts', requireAuth, [
    body('name').notEmpty(),
    body('programId').notEmpty(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { name, programId, startDate, endDate, theme, maxStartups = 20 } = req.body;
    const program = await Program.findOne({ id: programId, operatorId: req.operator.id });
    if (!program) throw new NotFoundError('Program not found');

    const cohort = await Cohort.create({
      id: genId('co'),
      operatorId: req.operator.id,
      programId, name, startDate, endDate, theme, maxStartups,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ cohort });
  }));

  app.get('/v1/cohorts', requireAuth, asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = { operatorId: req.operator.id };
    if (status) filter.status = status;
    const cohorts = await Cohort.find(filter);
    res.json({ cohorts });
  }));

  app.put('/v1/cohorts/:id', requireAuth, asyncHandler(async (req, res) => {
    const cohort = await Cohort.findOne({ id: req.params.id, operatorId: req.operator.id });
    if (!cohort) throw new NotFoundError('Cohort not found');
    const updatable = ['name', 'startDate', 'endDate', 'theme', 'maxStartups', 'status', 'demoDate'];
    for (const f of updatable) if (req.body[f] !== undefined) cohort[f] = req.body[f];
    cohort.updatedAt = new Date().toISOString();
    await Cohort.updateOne({ id: cohort.id }, cohort);
    res.json({ cohort });
  }));

  // ============ MENTORS ============

  app.post('/v1/mentors', requireAuth, [
    body('name').notEmpty(),
    body('email').isEmail(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { name, email, bio, expertise = [], industries = [], preferredStages = [], availability = 0, linkedin, twitter, company, title } = req.body;
    const existing = await Mentor.findOne({ email, operatorId: req.operator.id });
    if (existing) throw new ConflictError('Mentor already exists');

    const mentor = await Mentor.create({
      id: genId('men'),
      operatorId: req.operator.id,
      name, email, bio, expertise, industries, preferredStages, availability,
      linkedin, twitter, company, title,
      rating: 0,
      totalSessions: 0,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ mentor });
  }));

  app.get('/v1/mentors', requireAuth, asyncHandler(async (req, res) => {
    const { expertise, industry } = req.query;
    const filter = { operatorId: req.operator.id };
    if (expertise) filter.expertise = expertise;
    if (industry) filter.industries = industry;
    const mentors = await Mentor.find(filter);
    res.json({ mentors });
  }));

  app.put('/v1/mentors/:id/rate', requireAuth, [
    body('rating').isInt({ min: 1, max: 5 }),
  ], asyncHandler(async (req, res) => {
    const mentor = await Mentor.findOne({ id: req.params.id, operatorId: req.operator.id });
    if (!mentor) throw new NotFoundError('Mentor not found');
    // Running average
    const oldTotal = mentor.rating * mentor.totalSessions;
    mentor.totalSessions += 1;
    mentor.rating = (oldTotal + req.body.rating) / mentor.totalSessions;
    await Mentor.updateOne({ id: mentor.id }, mentor);
    res.json({ mentor });
  }));

  // ============ APPLICATIONS ============

  app.post('/v1/applications', requireAuth, [
    body('cohortId').notEmpty(),
    body('startupName').notEmpty(),
    body('founderName').notEmpty(),
    body('founderEmail').isEmail(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { cohortId, startupName, founderName, founderEmail, pitch, industry, stage, needs = [], traction, teamSize } = req.body;
    const cohort = await Cohort.findOne({ id: cohortId, operatorId: req.operator.id });
    if (!cohort) throw new NotFoundError('Cohort not found');

    const application = await Application.create({
      id: genId('app'),
      operatorId: req.operator.id,
      cohortId, startupName, founderName, founderEmail, pitch,
      industry, stage, needs, traction, teamSize,
      status: 'submitted',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ application });
  }));

  app.get('/v1/applications', requireAuth, asyncHandler(async (req, res) => {
    const { cohortId, status } = req.query;
    const filter = { operatorId: req.operator.id };
    if (cohortId) filter.cohortId = cohortId;
    if (status) filter.status = status;
    const applications = await Application.find(filter);
    res.json({ applications });
  }));

  app.put('/v1/applications/:id/status', requireAuth, [
    body('status').isIn(['submitted', 'reviewing', 'interview', 'accepted', 'rejected']),
  ], asyncHandler(async (req, res) => {
    const application = await Application.findOne({ id: req.params.id, operatorId: req.operator.id });
    if (!application) throw new NotFoundError('Application not found');
    application.status = req.body.status;
    application.reviewedAt = new Date().toISOString();
    if (req.body.notes) application.notes = req.body.notes;
    await Application.updateOne({ id: application.id }, application);
    res.json({ application });
  }));

  // ============ MENTOR MATCHING ============

  app.post('/v1/applications/:id/match', requireAuth, asyncHandler(async (req, res) => {
    const application = await Application.findOne({ id: req.params.id, operatorId: req.operator.id });
    if (!application) throw new NotFoundError('Application not found');
    const mentors = await Mentor.find({ operatorId: req.operator.id });
    if (mentors.length === 0) return res.json({ matches: [] });

    const scored = mentors
      .map(m => ({ mentorId: m.id, mentorName: m.name, score: matchScore(m, application) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Persist top match
    if (scored.length > 0) {
      await Match.create({
        id: genId('mtch'),
        operatorId: req.operator.id,
        applicationId: application.id,
        mentorId: scored[0].mentorId,
        score: scored[0].score,
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ matches: scored });
  }));

  // ============ SESSIONS ============

  app.post('/v1/sessions', requireAuth, [
    body('mentorId').notEmpty(),
    body('applicationId').notEmpty(),
    body('scheduledAt').isISO8601(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { mentorId, applicationId, scheduledAt, durationMinutes = 30, agenda, location } = req.body;
    const mentor = await Mentor.findOne({ id: mentorId, operatorId: req.operator.id });
    if (!mentor) throw new NotFoundError('Mentor not found');
    const application = await Application.findOne({ id: applicationId, operatorId: req.operator.id });
    if (!application) throw new NotFoundError('Application not found');

    const session = await Session.create({
      id: genId('ses'),
      operatorId: req.operator.id,
      mentorId, applicationId, scheduledAt, durationMinutes, agenda, location,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ session });
  }));

  app.put('/v1/sessions/:id/complete', requireAuth, [
    body('notes').notEmpty(),
  ], asyncHandler(async (req, res) => {
    const session = await Session.findOne({ id: req.params.id, operatorId: req.operator.id });
    if (!session) throw new NotFoundError('Session not found');
    session.status = 'completed';
    session.notes = req.body.notes;
    session.completedAt = new Date().toISOString();
    await Session.updateOne({ id: session.id }, session);
    res.json({ session });
  }));

  app.get('/v1/mentors/:id/sessions', requireAuth, asyncHandler(async (req, res) => {
    const sessions = await Session.find({ mentorId: req.params.id, operatorId: req.operator.id });
    res.json({ sessions });
  }));

  // ============ MILESTONES ============

  app.post('/v1/milestones', requireAuth, [
    body('cohortId').notEmpty(),
    body('name').notEmpty(),
    body('dueDate').isISO8601(),
  ], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0].msg);

    const { cohortId, name, dueDate, description, category = 'general' } = req.body;
    const cohort = await Cohort.findOne({ id: cohortId, operatorId: req.operator.id });
    if (!cohort) throw new NotFoundError('Cohort not found');

    const milestone = await Milestone.create({
      id: genId('mile'),
      operatorId: req.operator.id,
      cohortId, name, dueDate, description, category,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ milestone });
  }));

  app.put('/v1/milestones/:id/complete', requireAuth, asyncHandler(async (req, res) => {
    const milestone = await Milestone.findOne({ id: req.params.id, operatorId: req.operator.id });
    if (!milestone) throw new NotFoundError('Milestone not found');
    milestone.status = 'completed';
    milestone.completedAt = new Date().toISOString();
    await Milestone.updateOne({ id: milestone.id }, milestone);
    res.json({ milestone });
  }));

  app.get('/v1/cohorts/:id/milestones', requireAuth, asyncHandler(async (req, res) => {
    const milestones = await Milestone.find({ cohortId: req.params.id, operatorId: req.operator.id });
    res.json({ milestones });
  }));

  // ============ DASHBOARD ============

  app.get('/v1/dashboard', requireAuth, asyncHandler(async (req, res) => {
    const programs = await Program.find({ operatorId: req.operator.id });
    const cohorts = await Cohort.find({ operatorId: req.operator.id });
    const activeCohorts = cohorts.filter(c => c.status === 'active' || c.status === 'upcoming');
    const mentors = await Mentor.find({ operatorId: req.operator.id });
    const applications = await Application.find({ operatorId: req.operator.id });
    const sessions = await Session.find({ operatorId: req.operator.id });
    const completedSessions = sessions.filter(s => s.status === 'completed');

    res.json({
      dashboard: {
        totalPrograms: programs.length,
        totalCohorts: cohorts.length,
        activeCohorts: activeCohorts.length,
        totalMentors: mentors.length,
        totalApplications: applications.length,
        acceptedApplications: applications.filter(a => a.status === 'accepted').length,
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        upcomingMilestones: (await Milestone.find({ operatorId: req.operator.id, status: 'pending' })).length,
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
  const server = app.listen(PORT, () => logger.info(`Startup Studio listening on :${PORT}`));
  installGracefulShutdown(server);
  return server;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) startServer();
