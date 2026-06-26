import express from 'express';
const app = express();
const PORT = process.env.PROCEDURAL_MEMORY_PORT || 4783;
const skills = new Map();
const workflows = new Map();
const bestPractices = new Map();
const learnedBehaviors = new Map();
function nowIso() { return new Date().toISOString(); }
function ok(res, d) { res.json({ success: true, ...d }); }
function fail(res, code, msg) { res.status(400).json({ success: false, error: code, message: msg }); }
function generateId() { return `proc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
app.use(express.json());
app.get('/health', (_req, res) => { ok(res, { status: 'healthy', service: 'memory-procedural', port: PORT }); });
app.get('/', (_req, res) => { ok(res, { service: 'memory-procedural', port: PORT }); });
app.post('/api/skills', (req, res) => {
  const { name, twinId, category, description, steps } = req.body || {};
  if (!name || !twinId) return fail(res, 'INVALID_INPUT', 'name and twinId required');
  const skill = { id: generateId(), name, twinId, category: category || 'general', description: description || '', steps: steps || [], version: 1, successRate: 0.5, executionCount: 0, createdAt: nowIso() };
  skills.set(skill.id, skill);
  ok(res, { id: skill.id, skill });
});
app.post('/api/skills/:id/execute', (req, res) => {
  const { success } = req.body || {};
  const skill = skills.get(req.params.id);
  if (!skill) return fail(res, 'NOT_FOUND', 'Skill not found');
  skill.executionCount++;
  if (success) skill.successRate = Math.min(1, skill.successRate + 0.02);
  else skill.successRate = Math.max(0, skill.successRate - 0.05);
  ok(res, { skill });
});
app.get('/api/skills', (req, res) => {
  const { twinId } = req.query;
  let results = Array.from(skills.values());
  if (twinId) results = results.filter(s => s.twinId === twinId);
  ok(res, { count: results.length, skills: results });
});
app.post('/api/best-practices', (req, res) => {
  const { name, twinId, context } = req.body || {};
  if (!name || !twinId) return fail(res, 'INVALID_INPUT', 'name and twinId required');
  const practice = { id: generateId(), name, twinId, context: context || {}, confidence: 0.5, createdAt: nowIso() };
  bestPractices.set(practice.id, practice);
  ok(res, { id: practice.id, practice });
});
app.post('/api/behaviors', (req, res) => {
  const { twinId, behavior } = req.body || {};
  if (!twinId || !behavior) return fail(res, 'INVALID_INPUT', 'twinId and behavior required');
  const learnedBehavior = { id: generateId(), twinId, behavior, confidence: 0.5, createdAt: nowIso() };
  learnedBehaviors.set(learnedBehavior.id, learnedBehavior);
  ok(res, { id: learnedBehavior.id, learnedBehavior });
});
app.get('/api/stats', (_req, res) => { ok(res, { skills: skills.size, bestPractices: bestPractices.size, learnedBehaviors: learnedBehaviors.size }); });
app.listen(PORT, () => console.log(`Procedural Memory running on port ${PORT}`));
