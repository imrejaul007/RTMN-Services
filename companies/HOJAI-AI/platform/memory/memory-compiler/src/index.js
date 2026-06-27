import express from 'express';
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

const PORT = process.env.MEMORY_COMPILER_PORT || 4789;
const artifacts = new Map();
function nowIso() { return new Date().toISOString(); }
function ok(res, d) { res.json({ success: true, ...d }); }
function fail(res, code, msg) { res.status(400).json({ success: false, error: code, message: msg }); }
function generateId() { return `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function estimateTokens(obj) { return JSON.stringify(obj).split(/\s+/).length; }
function formatFactsAsBullets(facts) { return (facts || []).map(f => `• ${f.object || f.content || ''}`).join('\n'); }
app.use(express.json());
app.get('/health', (_req, res) => { ok(res, { status: 'healthy', service: 'memory-compiler', port: PORT }); });
app.get('/', (_req, res) => { ok(res, { service: 'memory-compiler', port: PORT }); });
app.post('/api/compile', requireInternal, (req, res) => {
  const { twinId, type, facts } = req.body || {};
  if (!twinId || !type) return fail(res, 'INVALID_INPUT', 'twinId and type required');
  const rawTokens = estimateTokens(facts);
  const sections = { facts: { title: 'Compiled Facts', content: formatFactsAsBullets(facts), sources: (facts || []).length } };
  const compiledTokens = estimateTokens(sections);
  const artifact = { id: generateId(), twinId, type, title: type.replace(/_/g, ' '), sections, version: 1, metadata: { factCount: (facts || []).length, rawTokens, compiledTokens, tokenSavings: rawTokens > 0 ? `${((1 - compiledTokens / rawTokens) * 100).toFixed(1)}%` : '0%' }, createdAt: nowIso() };
  artifacts.set(artifact.id, artifact);
  ok(res, { artifact, tokenReduction: artifact.metadata.tokenSavings });
});
app.get('/api/artifacts', (req, res) => {
  const { twinId, type } = req.query;
  let results = Array.from(artifacts.values());
  if (twinId) results = results.filter(a => a.twinId === twinId);
  if (type) results = results.filter(a => a.type === type);
  ok(res, { count: results.length, artifacts: results });
});
app.get('/api/artifacts/:id', (req, res) => {
  const artifact = artifacts.get(req.params.id);
  if (!artifact) return fail(res, 'NOT_FOUND', 'Artifact not found');
  ok(res, { artifact });
});
app.get('/api/stats', (_req, res) => {
  const byType = {};
  for (const a of artifacts.values()) byType[a.type] = (byType[a.type] || 0) + 1;
  ok(res, { totalArtifacts: artifacts.size, byType });
});
app.listen(PORT, () => console.log(`Knowledge Compiler running on port ${PORT}`));
