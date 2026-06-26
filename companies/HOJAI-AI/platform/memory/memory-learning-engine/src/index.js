/**
 * Memory Learning Engine - Outcome tracking, failure analysis
 * Port: 4788
 */
import express from 'express';
const app = express();
const PORT = process.env.MEMORY_LEARNING_PORT || 4788;
const outcomes = [];
const learningRules = new Map();
const stats = { totalOutcomes: 0, successes: 0, failures: 0, learningsApplied: 0 };
function nowIso() { return new Date().toISOString(); }
function ok(res, d) { res.json({ success: true, ...d }); }
function fail(res, code, msg) { res.status(400).json({ success: false, error: code, message: msg }); }
function generateId() { return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
app.use(express.json());
app.get('/health', (_req, res) => { ok(res, { status: 'healthy', port: PORT }); });
app.get('/', (_req, res) => { ok(res, { service: 'memory-learning-engine' }); });

// Record outcome
app.post('/api/outcome', (req, res) => {
  const { memoryId, success, feedback } = req.body || {};
  if (!memoryId || success === undefined) return fail(res, 'INVALID_INPUT', 'memoryId and success required');
  const outcome = { id: `out-${Date.now()}`, memoryId, success, feedback, timestamp: nowIso() };
  outcomes.push(outcome);
  stats.totalOutcomes++;
  if (success) stats.successes++; else stats.failures++;

  // Apply learning
  const rule = { id: generateId(), memoryId, action: success ? 'reinforce' : 'weaken', confidence: Math.abs(outcome.confidenceChange || 0.5), 应用次数: 0 };
  learningRules.set(rule.id, rule);
  stats.learningsApplied++;

  ok(res, { outcome, rule: { id: rule.id, action: rule.action } });
});

// Failure analysis
app.post('/api/analyze/failures', (req, res) => {
  const { twinId, days = 7 } = req.body || {};
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const failures = outcomes.filter(o => !o.success && new Date(o.timestamp).getTime() > cutoff);
  const patterns = [];
  const byMemory = {};
  for (const f of failures) { byMemory[f.memoryId] = (byMemory[f.memoryId] || 0) + 1; }
  for (const [memoryId, count] of Object.entries(byMemory)) {
    if (count >= 2) patterns.push({ memoryId, failureCount: count, likelyCauses: ['unknown', 'needs_review'] });
  }
  ok(res, { twinId: twinId || 'all', totalFailures: failures.length, patterns });
});

// Root cause analysis
app.post('/api/analyze/root-cause', (req, res) => {
  const { memoryId } = req.body || {};
  if (!memoryId) return fail(res, 'INVALID_INPUT', 'memoryId required');
  const memoryOutcomes = outcomes.filter(o => o.memoryId === memoryId);
  const successRate = memoryOutcomes.length > 0 ? memoryOutcomes.filter(o => o.success).length / memoryOutcomes.length : null;
  const rootCauses = successRate !== null && successRate < 0.7 ? ['confidence_issue'] : [];
  ok(res, { memoryId, outcomesAnalyzed: memoryOutcomes.length, successRate, rootCauses });
});

// Behavior patterns
app.get('/api/patterns', (req, res) => {
  const { limit = 50 } = req.query;
  const patterns = Array.from(learningRules.values()).slice(-Number(limit));
  ok(res, { count: patterns.length, patterns });
});

// Insights
app.get('/api/insights', (req, res) => {
  const { days = 30 } = req.query;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = outcomes.filter(o => new Date(o.timestamp).getTime() > cutoff);
  const successRate = recent.length > 0 ? recent.filter(o => o.success).length / recent.length : 0;
  ok(res, { trend: { days: Number(days), successRate, totalOutcomes: recent.length }, stats });
});

app.get('/api/stats', (_req, res) => {
  ok(res, { ...stats, learningRules: learningRules.size });
});

app.listen(PORT, () => console.log(`Memory Learning running on port ${PORT}`));
