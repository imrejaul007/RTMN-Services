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

const PORT = process.env.TEMPORAL_KG_PORT || 4784;
const nodes = new Map();
const relationships = new Map();
const facts = new Map();
function nowIso() { return new Date().toISOString(); }
function ok(res, d) { res.json({ success: true, ...d }); }
function fail(res, code, msg) { res.status(400).json({ success: false, error: code, message: msg }); }
function generateId() { return `tkg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function isValidAt(ts, validFrom, validUntil) {
  const t = ts ? new Date(ts).getTime() : Date.now();
  const from = validFrom ? new Date(validFrom).getTime() : 0;
  const until = validUntil ? new Date(validUntil).getTime() : Number.MAX_SAFE_INTEGER;
  return t >= from && t <= until;
}
app.use(express.json());
app.get('/health', (_req, res) => { ok(res, { status: 'healthy', service: 'memory-temporal', port: PORT }); });
app.get('/', (_req, res) => { ok(res, { service: 'memory-temporal', port: PORT }); });
app.post('/api/nodes', requireInternal, (req, res) => {
  const { id, type, validFrom, validUntil } = req.body || {};
  if (!id || !type) return fail(res, 'INVALID_INPUT', 'id and type required');
  const node = { id, type, validFrom, validUntil, versions: [{ type, validFrom, validUntil, createdAt: nowIso() }], createdAt: nowIso() };
  nodes.set(id, node);
  ok(res, { node });
});
app.post('/api/relationships', requireInternal, (req, res) => {
  const { from, to, type, validFrom, validUntil } = req.body || {};
  if (!from || !to || !type) return fail(res, 'INVALID_INPUT', 'from, to, type required');
  const rel = { id: generateId(), from, to, type, validFrom: validFrom || nowIso(), validUntil, versions: [{ validFrom, validUntil, createdAt: nowIso() }], createdAt: nowIso() };
  relationships.set(rel.id, rel);
  ok(res, { relationship: rel });
});
app.post('/api/facts', requireInternal, (req, res) => {
  const { twinId, subject, predicate, object, validFrom, validUntil } = req.body || {};
  if (!twinId || !subject || !predicate || object === undefined) return fail(res, 'INVALID_INPUT', 'twinId, subject, predicate, object required');
  const factId = `${twinId}:${subject}:${predicate}`;
  const fact = { id: factId, twinId, subject, predicate, object, validFrom: validFrom || nowIso(), validUntil, versions: [{ object, validFrom, validUntil, createdAt: nowIso() }], createdAt: nowIso() };
  if (facts.has(factId)) {
    const existing = facts.get(factId);
    existing.versions[existing.versions.length - 1].validUntil = validFrom || nowIso();
    existing.versions.push(fact.versions[0]);
    existing.object = object;
    existing.updatedAt = nowIso();
    return ok(res, { fact: existing, isUpdate: true });
  }
  facts.set(factId, fact);
  ok(res, { fact, isUpdate: false });
});
app.get('/api/facts/:id/history', (req, res) => {
  const fact = facts.get(req.params.id);
  if (!fact) return fail(res, 'NOT_FOUND', 'Fact not found');
  ok(res, { factId: fact.id, history: fact.versions });
});
app.post('/api/query/as-of', requireInternal, (req, res) => {
  const { twinId, asOf } = req.body || {};
  if (!twinId || !asOf) return fail(res, 'INVALID_INPUT', 'twinId and asOf required');
  const twinFacts = Array.from(facts.values()).filter(f => f.twinId === twinId);
  const results = twinFacts.filter(f => isValidAt(asOf, f.validFrom, f.validUntil)).map(f => ({ subject: f.subject, predicate: f.predicate, object: f.object, validFrom: f.validFrom }));
  ok(res, { asOf, count: results.length, facts: results });
});
app.get('/api/stats', (_req, res) => { ok(res, { nodes: nodes.size, relationships: relationships.size, facts: facts.size }); });
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => console.log(`Temporal KG running on port ${PORT}`));
