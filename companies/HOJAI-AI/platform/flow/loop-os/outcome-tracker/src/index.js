/**
 * LoopOS Outcome Tracker
 * Track agent outcomes for learning and improvement
 * Port: 4737
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4737;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Outcome statuses
const STATUS = {
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
  PENDING: 'pending'
};

// In-memory stores
const outcomes = new Map();      // outcomeId -> Outcome
const skillProfiles = new Map(); // twinId -> SkillProfile
const patterns = new Map();      // patternId -> Pattern
const learnings = new Map();     // learningId -> Learning

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'outcome-tracker',
  version: '1.0.0',
  port: PORT,
  outcomes: outcomes.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Outcome Recording ───────────────────────────────────

/**
 * Record task outcome
 * POST /api/outcomes
 */
app.post('/api/outcomes', requireAuth, (req, res) => {
  const {
    twinId,
    taskId,
    taskType,
    action,
    input,
    output,
    status = STATUS.PENDING,
    success = null,
    score = null,
    duration = null,
    cost = 0,
    tokens = 0,
    feedback = null,
    metadata = {}
  } = req.body || {};

  if (!twinId) return res.status(400).json({ error: 'twinId is required' });
  if (!taskId) return res.status(400).json({ error: 'taskId is required' });

  const id = `outcome-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  // Determine actual status
  const actualStatus = success !== null
    ? (success ? STATUS.SUCCESS : STATUS.FAILED)
    : (status === STATUS.PENDING ? STATUS.PENDING : status);

  const outcome = {
    id,
    twinId,
    taskId,
    taskType: taskType || 'general',
    action: action || '',
    input: input || null,
    output: output || null,
    status: actualStatus,
    success: success !== null ? success : (actualStatus === STATUS.SUCCESS),
    score,
    duration,
    cost,
    tokens,
    feedback,
    metadata,
    improvementSuggestions: [],
    createdAt: now,
    completedAt: actualStatus !== STATUS.PENDING ? now : null
  };

  outcomes.set(id, outcome);

  // Update skill profile
  updateSkillProfile(twinId, taskType, actualStatus, score);

  // Detect patterns
  detectPatterns(outcome);

  logger.info(`Outcome recorded: ${id} for ${twinId} (${actualStatus})`);
  res.status(201).json(outcome);
});

/**
 * Get outcome
 * GET /api/outcomes/:id
 */
app.get('/api/outcomes/:id', (req, res) => {
  const outcome = outcomes.get(req.params.id);
  if (!outcome) return res.status(404).json({ error: 'outcome not found' });
  res.json(outcome);
});

/**
 * List outcomes for twin
 * GET /api/outcomes
 */
app.get('/api/outcomes', (req, res) => {
  const { twinId, taskType, status, limit = 100 } = req.query;
  let items = [...outcomes.values()];

  if (twinId) items = items.filter(o => o.twinId === twinId);
  if (taskType) items = items.filter(o => o.taskType === taskType);
  if (status) items = items.filter(o => o.status === status);

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(0, Number(limit));

  res.json({ count: items.length, outcomes: items });
});

/**
 * Update outcome (add feedback, score, etc.)
 * PUT /api/outcomes/:id
 */
app.put('/api/outcomes/:id', requireAuth, (req, res) => {
  const outcome = outcomes.get(req.params.id);
  if (!outcome) return res.status(404).json({ error: 'outcome not found' });

  const { score, feedback, status, improvementSuggestions } = req.body || {};

  if (score !== undefined) outcome.score = score;
  if (feedback !== undefined) outcome.feedback = feedback;
  if (status !== undefined) {
    outcome.status = status;
    outcome.completedAt = new Date().toISOString();
  }
  if (improvementSuggestions) outcome.improvementSuggestions = improvementSuggestions;

  res.json(outcome);
});

/**
 * Get outcomes for twin
 * GET /api/outcomes/:twinId/twin
 */
app.get('/api/outcomes/:twinId/twin', (req, res) => {
  const twinOutcomes = [...outcomes.values()]
    .filter(o => o.twinId === req.params.twinId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const stats = calculateOutcomeStats(twinOutcomes);

  res.json({
    twinId: req.params.twinId,
    count: twinOutcomes.length,
    stats,
    outcomes: twinOutcomes.slice(0, 50)
  });
});

// ── Skill Profiles ─────────────────────────────────────

/**
 * Get skill profile
 * GET /api/skills/:twinId
 */
app.get('/api/skills/:twinId', (req, res) => {
  const profile = skillProfiles.get(req.params.twinId);
  if (!profile) {
    return res.status(404).json({ error: 'skill profile not found' });
  }
  res.json(profile);
});

/**
 * Get all skill profiles
 * GET /api/skills
 */
app.get('/api/skills', (req, res) => {
  const { limit = 50 } = req.query;
  const profiles = [...skillProfiles.values()].slice(0, Number(limit));
  res.json({ count: profiles.length, profiles });
});

/**
 * Update skill (evolution)
 * POST /api/skills/:twinId/evolve
 */
app.post('/api/skills/:twinId/evolve', requireAuth, (req, res) => {
  const { skill, improvement, reason } = req.body || {};
  const profile = skillProfiles.get(req.params.twinId);

  if (!profile) return res.status(404).json({ error: 'skill profile not found' });
  if (!skill) return res.status(400).json({ error: 'skill is required' });

  if (!profile.skills[skill]) {
    profile.skills[skill] = {
      name: skill,
      proficiency: 0.5,
      attempts: 0,
      successRate: 0,
      lastImprovedAt: null
    };
  }

  const skillData = profile.skills[skill];
  skillData.attempts++;

  if (improvement) {
    skillData.proficiency = Math.min(1, skillData.proficiency + (improvement || 0.05));
    skillData.lastImprovedAt = new Date().toISOString();
  }

  // Recalculate success rate
  const skillOutcomes = [...outcomes.values()]
    .filter(o => o.twinId === req.params.twinId && o.taskType === skill);
  if (skillOutcomes.length > 0) {
    const successes = skillOutcomes.filter(o => o.success).length;
    skillData.successRate = Math.round((successes / skillOutcomes.length) * 100) / 100;
  }

  profile.updatedAt = new Date().toISOString();

  const event = {
    type: 'skill_evolved',
    skill,
    improvement,
    reason,
    timestamp: new Date().toISOString()
  };
  profile.history.push(event);

  logger.info(`Skill evolved for ${req.params.twinId}: ${skill} = ${skillData.proficiency}`);
  res.json(profile);
});

/**
 * Get top skills for twin
 * GET /api/skills/:twinId/top
 */
app.get('/api/skills/:twinId/top', (req, res) => {
  const { limit = 10 } = req.query;
  const profile = skillProfiles.get(req.params.twinId);

  if (!profile) return res.status(404).json({ error: 'skill profile not found' });

  const skills = Object.values(profile.skills)
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, Number(limit));

  res.json({ twinId: req.params.twinId, skills });
});

// ── Pattern Detection ────────────────────────────────────

/**
 * Get detected patterns
 * GET /api/patterns
 */
app.get('/api/patterns', (req, res) => {
  const { twinId, type, minOccurrences = 3 } = req.query;
  let items = [...patterns.values()];

  if (twinId) items = items.filter(p => p.twinId === twinId);
  if (type) items = items.filter(p => p.type === type);
  items = items.filter(p => p.occurrences >= Number(minOccurrences));

  res.json({ count: items.length, patterns: items });
});

/**
 * Get pattern by ID
 * GET /api/patterns/:id
 */
app.get('/api/patterns/:id', (req, res) => {
  const pattern = patterns.get(req.params.id);
  if (!pattern) return res.status(404).json({ error: 'pattern not found' });
  res.json(pattern);
});

/**
 * Get learnings from patterns
 * GET /api/patterns/:id/learnings
 */
app.get('/api/patterns/:id/learnings', (req, res) => {
  const pattern = patterns.get(req.params.id);
  if (!pattern) return res.status(404).json({ error: 'pattern not found' });

  const patternLearnings = [...learnings.values()]
    .filter(l => l.patternId === req.params.id);

  res.json({ count: patternLearnings.length, learnings: patternLearnings });
});

// ── Organizational Learning ──────────────────────────────

/**
 * Get organizational learnings
 * GET /api/org-learning
 */
app.get('/api/org-learning', (req, res) => {
  const { approved = true, limit = 50 } = req.query;
  let items = [...learnings.values()];

  if (approved === 'true') items = items.filter(l => l.approved);
  items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(0, Number(limit));

  res.json({ count: items.length, learnings: items });
});

/**
 * Distribute learning to org
 * POST /api/org-learning/distribute
 */
app.post('/api/org-learning/distribute', requireAuth, (req, res) => {
  const { twinId, learning, approved = false } = req.body || {};

  if (!learning) return res.status(400).json({ error: 'learning is required' });

  const id = `learning-${randomUUID().slice(0, 8)}`;
  const item = {
    id,
    twinId: twinId || null,
    learning,
    approved,
    approvedBy: null,
    approvedAt: null,
    distributedTo: [],
    createdAt: new Date().toISOString()
  };

  learnings.set(id, item);

  if (approved) {
    distributeToOrg(item);
  }

  logger.info(`Learning distributed: ${id}`);
  res.status(201).json(item);
});

/**
 * Approve learning
 * POST /api/org-learning/:id/approve
 */
app.post('/api/org-learning/:id/approve', requireAuth, (req, res) => {
  const { approver } = req.body || {};
  const item = learnings.get(req.params.id);

  if (!item) return res.status(404).json({ error: 'learning not found' });

  item.approved = true;
  item.approvedBy = approver || 'system';
  item.approvedAt = new Date().toISOString();

  distributeToOrg(item);

  res.json(item);
});

// ── Analytics ───────────────────────────────────────────

/**
 * Get outcome analytics
 * GET /api/analytics
 */
app.get('/api/analytics', (req, res) => {
  const { twinId, period = '7d' } = req.query;
  const allOutcomes = twinId
    ? [...outcomes.values()].filter(o => o.twinId === twinId)
    : [...outcomes.values()];

  // Filter by period
  const now = new Date();
  const periodMs = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }[period] || periodMs['7d'];

  const periodOutcomes = allOutcomes.filter(o =>
    new Date(o.createdAt).getTime() > now.getTime() - periodMs
  );

  const successRate = periodOutcomes.length > 0
    ? periodOutcomes.filter(o => o.success).length / periodOutcomes.length
    : 0;

  const avgScore = periodOutcomes.length > 0
    ? periodOutcomes.filter(o => o.score !== null)
        .reduce((sum, o) => sum + o.score, 0) / periodOutcomes.filter(o => o.score !== null).length
    : 0;

  // By task type
  const byType = {};
  for (const outcome of periodOutcomes) {
    if (!byType[outcome.taskType]) {
      byType[outcome.taskType] = { total: 0, success: 0 };
    }
    byType[outcome.taskType].total++;
    if (outcome.success) byType[outcome.taskType].success++;
  }

  // Trends (daily success rate)
  const trends = [];
  const days = period === '30d' ? 30 : (period === '7d' ? 7 : 1);
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayOutcomes = periodOutcomes.filter(o => {
      const d = new Date(o.createdAt);
      return d >= dayStart && d < dayEnd;
    });

    trends.push({
      date: dayStart.toISOString().split('T')[0],
      total: dayOutcomes.length,
      success: dayOutcomes.filter(o => o.success).length,
      rate: dayOutcomes.length > 0
        ? Math.round((dayOutcomes.filter(o => o.success).length / dayOutcomes.length) * 100)
        : 0
    });
  }

  res.json({
    period,
    twinId: twinId || 'all',
    total: periodOutcomes.length,
    successRate: Math.round(successRate * 100),
    avgScore: Math.round((avgScore || 0) * 100) / 100,
    byTaskType: byType,
    trends,
    timestamp: new Date().toISOString()
  });
});

// ── Helper Functions ───────────────────────────────────

function updateSkillProfile(twinId, taskType, status, score) {
  if (!skillProfiles.has(twinId)) {
    skillProfiles.set(twinId, {
      twinId,
      skills: {},
      history: [],
      updatedAt: new Date().toISOString()
    });
  }

  const profile = skillProfiles.get(twinId);

  if (!profile.skills[taskType]) {
    profile.skills[taskType] = {
      name: taskType,
      proficiency: 0.5,
      attempts: 0,
      successRate: 0,
      lastImprovedAt: null
    };
  }

  const skill = profile.skills[taskType];
  skill.attempts++;

  if (status === STATUS.SUCCESS) {
    skill.successRate = ((skill.successRate * (skill.attempts - 1)) + 1) / skill.attempts;
    // Incrementally update proficiency
    skill.proficiency = Math.min(1, skill.proficiency + 0.01);
  } else if (status === STATUS.FAILED) {
    skill.proficiency = Math.max(0, skill.proficiency - 0.02);
  }

  profile.updatedAt = new Date().toISOString();
}

function detectPatterns(outcome) {
  // Simple pattern detection
  const twinOutcomes = [...outcomes.values()]
    .filter(o => o.twinId === outcome.twinId && o.taskType === outcome.taskType)
    .slice(-10);

  if (twinOutcomes.length >= 5) {
    // Detect time-of-day pattern
    const hours = twinOutcomes.map(o => new Date(o.createdAt).getHours());
    const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;

    // Detect success correlation
    const successes = twinOutcomes.filter(o => o.success);
    if (successes.length >= 3) {
      const patternKey = `${outcome.twinId}:${outcome.taskType}:time`;

      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          id: patternKey,
          twinId: outcome.twinId,
          type: 'time_of_day',
          description: `Best performance around ${Math.round(avgHour)}:00`,
          occurrences: successes.length,
          confidence: successes.length / twinOutcomes.length,
          firstSeen: twinOutcomes[0].createdAt,
          lastSeen: outcome.createdAt
        });
      } else {
        const pattern = patterns.get(patternKey);
        pattern.occurrences = successes.length;
        pattern.lastSeen = outcome.createdAt;
        pattern.confidence = successes.length / twinOutcomes.length;
      }
    }
  }
}

function calculateOutcomeStats(outcomesList) {
  if (outcomesList.length === 0) {
    return {
      total: 0,
      successRate: 0,
      avgScore: 0,
      avgDuration: 0,
      avgCost: 0
    };
  }

  const successes = outcomesList.filter(o => o.success).length;
  const withScores = outcomesList.filter(o => o.score !== null);
  const withDuration = outcomesList.filter(o => o.duration !== null);

  return {
    total: outcomesList.length,
    successRate: Math.round((successes / outcomesList.length) * 100),
    avgScore: withScores.length > 0
      ? Math.round((withScores.reduce((s, o) => s + o.score, 0) / withScores.length) * 100) / 100
      : 0,
    avgDuration: withDuration.length > 0
      ? Math.round(withDuration.reduce((s, o) => s + o.duration, 0) / withDuration.length)
      : 0,
    avgCost: Math.round(outcomesList.reduce((s, o) => s + (o.cost || 0), 0) / outcomesList.length * 100) / 100
  };
}

function distributeToOrg(learning) {
  learning.distributedTo.push({
    twinId: 'org-wide',
    distributedAt: new Date().toISOString()
  });
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Outcome Tracker listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
