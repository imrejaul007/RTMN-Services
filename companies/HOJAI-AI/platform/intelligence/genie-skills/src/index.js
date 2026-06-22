/**
 * Genie Skills Marketplace Service
 *
 * Port: 4811
 *
 * Phase 6.3 of Personal Intelligence OS. A curated marketplace of skills
 * the LLM can call. Handles install/uninstall, trigger matching for the
 * router, rate limits, and a safety-review queue for third-party skills.
 *
 * Storage: PersistentMap. Per-user namespace. Three stores:
 *   - skills-data    : per-user custom skills (id -> skill)
 *   - installed-data : per-user install map (skillId -> { installedAt, enabled })
 *   - usage-data     : per-user usage map (skillId -> { 'YYYY-MM-DD': count })
 *
 * Routes:
 *   GET    /api/skills/catalog                          — full catalog (built-ins)
 *   GET    /api/skills/pending                          — pending third-party submissions
 *   POST   /api/skills/:userId/install                  — install a skill
 *   DELETE /api/skills/:userId/install/:skillId         — uninstall
 *   GET    /api/skills/:userId/installed                — list installed
 *   POST   /api/skills/:userId/install/:skillId/toggle  — enable/disable
 *   POST   /api/skills/:userId/skills                   — submit a third-party skill
 *   PUT    /api/skills/review/:skillId                  — approve/reject a submission
 *   POST   /api/skills/:userId/match                    — pick skills for a user text
 *   POST   /api/skills/:userId/check-rate               — check rate limit
 *   POST   /api/skills/:userId/record-usage             — record a call
 *   POST   /api/skills/:userId/revoke                   — one-click revoke all access
 *   GET    /api/skills/built-ins                        — alias for catalog
 *   GET    /health
 *   GET    /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { createLogger } from '@rtmn/shared/lib/logger';
import {
  BUILT_IN_SKILLS,
  SAFETY_REVIEW_STATES,
  validateSkill,
  scoreTriggerMatch,
  findMatchingSkills,
  checkRateLimit,
  recordUsage,
} from '../lib/skills.js';

const PORT = parseInt(process.env.PORT || '4811', 10);
const log = createLogger('genie-skills');

const skills = new PersistentMap('skills-data', { serviceName: 'genie-skills' });
const installed = new PersistentMap('installed-data', { serviceName: 'genie-skills' });
const usage = new PersistentMap('usage-data', { serviceName: 'genie-skills' });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) =>
  res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) =>
  res.status(s).json({
    success: false,
    error: { code, message: msg },
    meta: { timestamp: new Date().toISOString() },
  });

function installedKey(userId, skillId) { return `${userId}:${skillId}`; }
function usageKey(userId, skillId) { return `${userId}:${skillId}`; }
function skillKey(skillId) { return skillId; }

function getCatalog() {
  // Built-ins are always available. Add any third-party submissions that are approved.
  const out = [...BUILT_IN_SKILLS];
  for (const [, s] of skills) {
    if (s && s.safetyReview === SAFETY_REVIEW_STATES.APPROVED && !s.builtin) {
      out.push(s);
    }
  }
  return out;
}

function getSkillById(skillId) {
  const builtIn = BUILT_IN_SKILLS.find((s) => s.id === skillId);
  if (builtIn) return builtIn;
  return skills.get(skillKey(skillId)) || null;
}

function listInstalled(userId) {
  const out = [];
  for (const [k, v] of installed) {
    if (k.startsWith(`${userId}:`) && v) out.push({ ...v, skillId: k.split(':')[1] });
  }
  return out;
}

app.get('/health', (_req, res) => send(res, 200, { status: 'healthy', service: 'genie-skills' }));
app.get('/ready', (_req, res) => send(res, 200, { status: 'ready', service: 'genie-skills' }));

app.get('/api/skills/built-ins', (_req, res) => send(res, 200, { skills: BUILT_IN_SKILLS }));
app.get('/api/skills/catalog', (_req, res) => send(res, 200, { skills: getCatalog() }));
app.get('/api/skills/pending', requireAuth, (_req, res) => {
  const pending = [];
  for (const [, s] of skills) {
    if (s && s.safetyReview === SAFETY_REVIEW_STATES.PENDING) pending.push(s);
  }
  send(res, 200, { skills: pending });
});

app.post('/api/skills/:userId/install', requireAuth, (req, res) => {
  const skillId = req.body?.skillId;
  if (!skillId) return sendErr(res, 400, 'invalid_input', 'skillId required');
  const skill = getSkillById(skillId);
  if (!skill) return sendErr(res, 404, 'not_found', 'Skill not found');
  if (skill.safetyReview !== SAFETY_REVIEW_STATES.APPROVED && !skill.builtin) {
    return sendErr(res, 403, 'not_approved', 'Skill has not passed safety review');
  }
  const record = { installedAt: new Date().toISOString(), enabled: true };
  installed.set(installedKey(req.params.userId, skillId), record);
  send(res, 201, { skillId, ...record });
});

app.delete('/api/skills/:userId/install/:skillId', requireAuth, (req, res) => {
  const ok = installed.delete(installedKey(req.params.userId, req.params.skillId));
  if (!ok) return sendErr(res, 404, 'not_installed', 'Skill not installed');
  usage.delete(usageKey(req.params.userId, req.params.skillId));
  send(res, 200, { uninstalled: true });
});

app.get('/api/skills/:userId/installed', requireAuth, (req, res) => {
  send(res, 200, { skills: listInstalled(req.params.userId) });
});

app.post('/api/skills/:userId/install/:skillId/toggle', requireAuth, (req, res) => {
  const key = installedKey(req.params.userId, req.params.skillId);
  const current = installed.get(key);
  if (!current) return sendErr(res, 404, 'not_installed', 'Skill not installed');
  const next = { ...current, enabled: req.body?.enabled !== false };
  installed.set(key, next);
  send(res, 200, { skillId: req.params.skillId, ...next });
});

app.post('/api/skills/:userId/skills', requireAuth, (req, res) => {
  try {
    const skill = validateSkill({ ...req.body, builtin: false });
    // Third-party submissions go to the review queue (pending) until reviewed
    skills.set(skill.id, skill);
    send(res, 201, skill);
  } catch (e) {
    sendErr(res, 400, 'invalid_skill', e.message);
  }
});

app.put('/api/skills/review/:skillId', requireAuth, (req, res) => {
  const skill = skills.get(skillKey(req.params.skillId));
  if (!skill) return sendErr(res, 404, 'not_found', 'Skill not found');
  const verdict = req.body?.verdict;
  if (verdict !== SAFETY_REVIEW_STATES.APPROVED && verdict !== SAFETY_REVIEW_STATES.REJECTED) {
    return sendErr(res, 400, 'invalid_verdict', 'verdict must be approved or rejected');
  }
  const next = { ...skill, safetyReview: verdict, reviewedAt: new Date().toISOString() };
  skills.set(skillKey(req.params.skillId), next);
  send(res, 200, next);
});

app.post('/api/skills/:userId/match', requireAuth, (req, res) => {
  const text = String(req.body?.text || '');
  const minScore = Number(req.body?.minScore) || 0.5;
  const userInstalled = listInstalled(req.params.userId).filter((s) => s.enabled);
  const installedIds = new Set(userInstalled.map((s) => s.skillId));
  const available = getCatalog().filter((s) => installedIds.has(s.id));
  const matches = findMatchingSkills(text, available, minScore);
  send(res, 200, { matches });
});

app.post('/api/skills/:userId/check-rate', requireAuth, (req, res) => {
  const skillId = req.body?.skillId;
  if (!skillId) return sendErr(res, 400, 'invalid_input', 'skillId required');
  const skill = getSkillById(skillId);
  if (!skill) return sendErr(res, 404, 'not_found', 'Skill not found');
  const u = usage.get(usageKey(req.params.userId, skillId)) || {};
  const result = checkRateLimit(skill, u);
  send(res, 200, { skillId, ...result });
});

app.post('/api/skills/:userId/record-usage', requireAuth, (req, res) => {
  const skillId = req.body?.skillId;
  if (!skillId) return sendErr(res, 400, 'invalid_input', 'skillId required');
  const u = usage.get(usageKey(req.params.userId, skillId)) || {};
  const next = recordUsage(u);
  usage.set(usageKey(req.params.userId, skillId), next);
  send(res, 200, { skillId, usage: next });
});

app.post('/api/skills/:userId/revoke', requireAuth, (req, res) => {
  let count = 0;
  const userInstalled = listInstalled(req.params.userId);
  for (const item of userInstalled) {
    installed.delete(installedKey(req.params.userId, item.skillId));
    usage.delete(usageKey(req.params.userId, item.skillId));
    count++;
  }
  send(res, 200, { revoked: count });
});

requireEnv(['INTERNAL_SERVICE_TOKEN'], { soft: true });
installGracefulShutdown({ server: app, log });

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => log.info(`genie-skills listening on :${PORT}`));
}

export default app;