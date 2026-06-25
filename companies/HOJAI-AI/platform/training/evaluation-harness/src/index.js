/**
 * HOJAI Evaluation Harness (port 4775) — Phase 20
 *
 * LLM evaluation framework: benchmarks, runs, scoring, and head-to-head
 * model comparison. Scores outputs using pluggable scorers.
 *
 * Storage:  file-backed JSON (atomic temp+rename writes)
 * Auth:     X-Internal-Token header
 * Scorers:  8 built-in (exact-match, substring-match, substring-absence,
 *            json-schema-match, token-overlap, levenshtein-similarity,
 *            numeric-tolerance, regex-match)
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

// ---------------------------------------------------------------------------
// Config (env-read at require-time for constants; DATA_DIR as function)
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '4775', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'eval-harness-internal-token';
const DATA_DIR = () => process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '4770', 10);

function ensureDir() {
  const dd = DATA_DIR();
  if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true });
}

function bmkFile() { return path.join(DATA_DIR(), 'benchmarks.json'); }
function runsFile() { return path.join(DATA_DIR(), 'runs.json'); }
function cmpFile()  { return path.join(DATA_DIR(), 'comparisons.json'); }

function load(file) {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return { data: [] }; }
}
function save(file, d) {
  ensureDir();
  const dd = DATA_DIR();
  const f = file();
  const tmp = path.join(dd, '.tmp_' + crypto.randomBytes(4).toString('hex'));
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, f);
}
const loadBenchmarks = () => load(bmkFile());
const saveBenchmarks = (d) => save(bmkFile, d);
const loadRuns      = () => load(runsFile());
const saveRuns      = (d) => save(runsFile, d);
const loadComparisons = () => load(cmpFile());
const saveComparisons = (d) => save(cmpFile, d);

function nowIso() { return new Date().toISOString(); }
function newId()  { return crypto.randomBytes(16).toString('hex'); }
function uuidv4() { return newId(); }

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// ---------------------------------------------------------------------------
// 8 Built-in scorers (copied from ./eval/*.js)
// ---------------------------------------------------------------------------

// exactMatch.js
function exactMatch({ output, testCase }) {
  const expected = (testCase.expectedOutput || '').trim();
  const actual = (output || '').trim();
  const matched = actual === expected;
  return { score: matched ? 1 : 0, passed: matched, details: { expected, actual, scorer: 'exact-match' } };
}

// substringMatch.js
function substringMatch({ output, testCase }) {
  const actual = (output || '').toLowerCase();
  const expected = testCase.expectedContains;
  if (!expected) return { score: 1, passed: true, details: {} };
  const targets = Array.isArray(expected) ? expected : [expected];
  const allFound = targets.every(t => actual.includes(String(t).toLowerCase()));
  return {
    score: allFound ? 1 : targets.filter(t => actual.includes(String(t).toLowerCase())).length / targets.length,
    passed: allFound,
    details: { targets, found: targets.filter(t => actual.includes(String(t).toLowerCase())) }
  };
}

// substringAbsence.js
function substringAbsence({ output, testCase }) {
  const actual = (output || '').toLowerCase();
  const forbidden = testCase.expectedNotContains;
  if (!forbidden) return { score: 1, passed: true, details: {} };
  const targets = Array.isArray(forbidden) ? forbidden : [forbidden];
  const anyFound = targets.filter(t => actual.includes(String(t).toLowerCase()));
  return {
    score: anyFound.length === 0 ? 1 : 0,
    passed: anyFound.length === 0,
    details: { forbidden: targets, found: anyFound }
  };
}

// jsonSchemaMatch.js
function jsonSchemaMatch({ output, testCase }) {
  const schema = testCase.expectedJsonSchema;
  if (!schema) return { score: 1, passed: true, details: {} };
  let parsed = null;
  try { parsed = JSON.parse(output || ''); } catch (_) { /* not JSON */ }
  if (!parsed) return { score: 0, passed: false, details: { reason: 'not valid JSON' } };
  const typeOk = !schema.type || typeof parsed === schema.type;
  const propsOk = !schema.properties || Object.keys(schema.properties || {}).every(k =>
    parsed[k] !== undefined
  );
  const passed = typeOk && propsOk;
  return { score: passed ? 1 : 0, passed, details: { typeOk, propsOk, parsedType: typeof parsed } };
}

// tokenOverlap.js
function tokenOverlap({ output, testCase }) {
  const outTokens = new Set((output || '').split(/\s+/).filter(Boolean));
  const expTokens = new Set((testCase.expectedOutput || '').split(/\s+/).filter(Boolean));
  if (outTokens.size === 0) return { score: 0, passed: false, details: { overlap: 0 } };
  const intersection = [...outTokens].filter(t => expTokens.has(t));
  const score = intersection.length / Math.max(outTokens.size, expTokens.size);
  return { score, passed: score >= 0.5, details: { overlap: intersection.length, outTokens: outTokens.size, expTokens: expTokens.size } };
}

// levenshteinSimilarity.js
function levenshteinSimilarity({ output, testCase }) {
  const a = output || '';
  const b = testCase.expectedOutput || '';
  const max = Math.max(a.length, b.length);
  if (max === 0) return { score: 1, passed: true, details: { similarity: 1 } };
  const dist = levenshtein(a, b);
  const score = 1 - dist / max;
  return { score, passed: score >= 0.8, details: { similarity: Math.round(score * 100) / 100, distance: dist } };
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// numericTolerance.js
function numericTolerance({ output, testCase }) {
  const tol = testCase.expectedTolerance || 0;
  const actual = parseFloat(output || '');
  const expected = parseFloat(testCase.expectedOutput || '');
  if (isNaN(actual) || isNaN(expected)) return { score: 0, passed: false, details: { reason: 'not numeric' } };
  const diff = Math.abs(actual - expected);
  const score = tol === 0 ? (diff === 0 ? 1 : 0) : Math.max(0, 1 - diff / tol);
  return { score, passed: diff <= tol, details: { expected, actual, diff } };
}

// regexMatch.js
function regexMatch({ output, testCase }) {
  const pattern = testCase.expectedRegex;
  if (!pattern) return { score: 1, passed: true, details: {} };
  try {
    const re = new RegExp(pattern);
    const matched = re.test(output || '');
    return { score: matched ? 1 : 0, passed: matched, details: { pattern } };
  } catch (_) {
    return { score: 0, passed: false, details: { reason: 'invalid regex' } };
  }
}

const scorers = {
  'exact-match':         { score: exactMatch,      description: 'Output string (trimmed) must exactly equal expectedOutput. Score 1 on match, 0 otherwise.' },
  'substring-match':     { score: substringMatch,   description: 'Output must contain all expected substrings (case-insensitive). Partial credit for partial matches.' },
  'substring-absence':   { score: substringAbsence, description: 'Output must NOT contain any forbidden substrings. Score 1 on absence, 0 on any hit.' },
  'json-schema-match':   { score: jsonSchemaMatch,  description: 'Output must be valid JSON matching the expected schema type and required properties.' },
  'token-overlap':       { score: tokenOverlap,     description: 'Jaccard-like token overlap between output and expected. Score 0-1; pass threshold 0.5.' },
  'levenshtein-similarity': { score: levenshteinSimilarity, description: '1 - normalized Levenshtein distance. Score 0-1; pass threshold 0.8.' },
  'numeric-tolerance':   { score: numericTolerance, description: 'Numeric output within expectedTolerance of expectedOutput. Default tolerance 0 (exact).' },
  'regex-match':         { score: regexMatch,       description: 'Output must match the expectedRegex pattern. Score 1 on match, 0 otherwise.' },
};
const ALL_SCORER_TYPES = Object.keys(scorers);

// ---------------------------------------------------------------------------
// Audit log (in-memory, bounded)
// ---------------------------------------------------------------------------

const auditLog = [];
function logAudit(action, target, details) {
  auditLog.push({ id: uuidv4(), action, target, details: details || null, at: nowIso() });
  if (auditLog.length > 100) auditLog.shift();
  return auditLog[auditLog.length - 1];
}

// ---------------------------------------------------------------------------
// Inference gateway helper (stubbed for tests)
// ---------------------------------------------------------------------------

function callInferenceGateway(model, prompt, gatewayPort) {
  return new Promise((resolve, _reject) => {
    // In production: call real gateway. In tests with gatewayPort=0: stub.
    if (!gatewayPort) {
      return resolve({ text: 'stub answer', latencyMs: 10, usage: { tokensIn: 5, tokensOut: 3, costUsd: 0.0001 } });
    }
    const body = JSON.stringify({ messages: [{ role: 'user', content: prompt }], model });
    const req = http.request(
      { hostname: 'localhost', port: gatewayPort, path: '/api/complete', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 30000 },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch (_) { resolve({ text: data }); } });
      }
    );
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve({ text: 'gateway unreachable', latencyMs: 0, usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 } }));
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

function aggregateResults(results, scorerTypes) {
  const total = results.length || 1;
  const passed = results.filter((r) => !r.error && r.perScorerPassed === r.perScorerTotal).length;
  const totalScore = results.reduce((sum, r) => {
    if (r.error) return sum;
    return sum + scorerTypes.reduce((s, t) => s + ((r.scores[t] && r.scores[t].score) || 0), 0);
  }, 0);
  const scorerAverages = {};
  for (const t of scorerTypes) {
    scorerAverages[t] = results.length
      ? results.reduce((s, r) => s + ((r.scores[t] && r.scores[t].score) || 0), 0) / results.length
      : 0;
  }
  return {
    passRate: passed / total,
    avgScore: totalScore / (total * scorerTypes.length || 1),
    totalLatencyMs: results.reduce((s, r) => s + (r.latencyMs || 0), 0),
    totalTokens: results.reduce((s, r) => s + ((r.usage && (r.usage.tokensIn + r.usage.tokensOut)) || 0), 0),
    totalCostUsd: results.reduce((s, r) => s + ((r.usage && r.usage.costUsd) || 0), 0),
    scorerAverages,
    totalTestCases: results.length,
    passedTestCases: passed,
  };
}

function findBenchmark(bmkData, idOrSlug) {
  const list = bmkData.data || [];
  if (list.find(b => b.id === idOrSlug)) return list.find(b => b.id === idOrSlug);
  return list.find(b => b.slug === idOrSlug) || null;
}

function buildComparison(runA, runB) {
  const perTestCase = [];
  const mapB = new Map(runB.results.map(r => [r.testCaseId, r]));
  for (const rA of runA.results) {
    const rB = mapB.get(rA.testCaseId);
    if (!rB) continue;
    const avg = (r, types) => types.reduce((s, t) => s + ((r.scores[t] && r.scores[t].score) || 0), 0) / (types.length || 1);
    const scoreA = avg(rA, runA.scorerTypes);
    const scoreB = avg(rB, runB.scorerTypes);
    perTestCase.push({ testCaseId: rA.testCaseId, input: rA.input, scoreA, scoreB, winner: scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'tie' });
  }
  const passRateA = runA.aggregate ? runA.aggregate.passRate : 0;
  const passRateB = runB.aggregate ? runB.aggregate.passRate : 0;
  return {
    runIdA: runA.id, runIdB: runB.id, perTestCase,
    aggregate: {
      winner: passRateA > passRateB ? 'A' : passRateB > passRateA ? 'B' : 'tie',
      passRateA, passRateB,
      passRateDelta: passRateA - passRateB,
      scoreDelta: (runA.aggregate ? runA.aggregate.avgScore : 0) - (runB.aggregate ? runB.aggregate.avgScore : 0),
    },
  };
}

function applyPromptTemplate(template, input) {
  return (template || '{{input}}').split('{{input}}').join(input);
}

// ---------------------------------------------------------------------------
// Bootstrap / seed
// ---------------------------------------------------------------------------

function seedBenchmarks() {
  const bmkData = loadBenchmarks();
  if (bmkData.data && bmkData.data.length > 0) return bmkData;

  const basicQaId = uuidv4();
  const basicQaCases = [
    { input: 'What is 2+2?', expectedOutput: '4', expectedContains: '4', metadata: { tags: ['math'], difficulty: 'easy', category: 'qa' } },
    { input: 'What is the capital of France?', expectedOutput: 'Paris', expectedContains: 'Paris', metadata: { tags: ['geography'], difficulty: 'easy', category: 'qa' } },
    { input: 'What is the largest planet in our solar system?', expectedOutput: 'Jupiter', expectedContains: 'Jupiter', metadata: { tags: ['science'], difficulty: 'easy', category: 'qa' } },
    { input: 'How many continents are there?', expectedOutput: '7', expectedContains: '7', metadata: { tags: ['geography'], difficulty: 'easy', category: 'qa' } },
    { input: 'What color do you get when you mix red and blue?', expectedOutput: 'Purple', expectedContains: ['purple', 'violet'], metadata: { tags: ['science'], difficulty: 'easy', category: 'qa' } },
    { input: 'What is the chemical symbol for water?', expectedOutput: 'H2O', expectedContains: 'H2O', metadata: { tags: ['science'], difficulty: 'easy', category: 'qa' } },
    { input: 'Who wrote Romeo and Juliet?', expectedOutput: 'Shakespeare', expectedContains: 'Shakespeare', metadata: { tags: ['literature'], difficulty: 'easy', category: 'qa' } },
    { input: 'What is the boiling point of water in Celsius?', expectedOutput: '100', expectedContains: '100', metadata: { tags: ['science'], difficulty: 'easy', category: 'qa' } },
    { input: 'How many days are in a week?', expectedOutput: '7', expectedContains: '7', metadata: { tags: ['general'], difficulty: 'easy', category: 'qa' } },
    { input: 'What is the smallest prime number?', expectedOutput: '2', expectedContains: '2', metadata: { tags: ['math'], difficulty: 'medium', category: 'qa' } },
  ].map(c => ({ id: uuidv4(), ...c }));

  const jsonFormatId = uuidv4();
  const jsonFormatCases = [
    { input: 'List 3 fruits as JSON', expectedJsonSchema: { type: 'array', items: { type: 'string' } }, metadata: { tags: ['format'], difficulty: 'easy', category: 'format' } },
    { input: 'Return a JSON object with name and age fields', expectedJsonSchema: { type: 'object', required: ['name', 'age'], properties: { name: { type: 'string' }, age: { type: 'number' } } }, metadata: { tags: ['format'], difficulty: 'easy', category: 'format' } },
    { input: 'Output a JSON array of 5 numbers', expectedJsonSchema: { type: 'array', items: { type: 'number' } }, metadata: { tags: ['format'], difficulty: 'easy', category: 'format' } },
    { input: 'Return JSON describing a car with make and model', expectedJsonSchema: { type: 'object', required: ['make', 'model'], properties: { make: { type: 'string' }, model: { type: 'string' } } }, metadata: { tags: ['format'], difficulty: 'medium', category: 'format' } },
    { input: 'Give me a JSON object with a single boolean field named active', expectedJsonSchema: { type: 'object', required: ['active'], properties: { active: { type: 'boolean' } } }, metadata: { tags: ['format'], difficulty: 'easy', category: 'format' } },
  ].map(c => ({ id: uuidv4(), ...c }));

  bmkData.data = [
    { id: basicQaId, slug: 'basic-qa', name: 'Basic Q&A',
      description: 'Ten short factual questions covering math, geography, science, literature, and general knowledge.',
      category: 'qa', testCases: basicQaCases, createdAt: nowIso(), updatedAt: nowIso() },
    { id: jsonFormatId, slug: 'json-format', name: 'JSON Format',
      description: 'Five prompts that require a well-formed JSON response matching a small schema.',
      category: 'format', testCases: jsonFormatCases, createdAt: nowIso(), updatedAt: nowIso() },
  ];
  saveBenchmarks(bmkData);

  // Stub two runs for comparison
  const stubScorers = ['exact-match', 'substring-match'];
  const stubAnswers = { 'What is 2+2?': '4', 'What is the capital of France?': 'Paris', 'What is the largest planet in our solar system?': 'Jupiter', 'How many continents are there?': '7', 'What color do you get when you mix red and blue?': 'Purple', 'What is the chemical symbol for water?': 'H2O', 'Who wrote Romeo and Juliet?': 'William Shakespeare', 'What is the boiling point of water in Celsius?': '100', 'How many days are in a week?': '7', 'What is the smallest prime number?': '2' };
  const stubAnswers2 = { 'What is 2+2?': 'four', 'What is the capital of France?': 'Paris', 'What is the largest planet in our solar system?': 'Jupiter', 'How many continents are there?': 'seven', 'What color do you get when you mix red and blue?': 'purple', 'What is the chemical symbol for water?': 'H2O', 'Who wrote Romeo and Juliet?': 'Shakespeare', 'What is the boiling point of water in Celsius?': '100C', 'How many days are in a week?': '7', 'What is the smallest prime number?': '2' };

  function makeStubResults(answers) {
    return basicQaCases.map(tc => {
      const output = answers[tc.input] || '';
      const scores = {};
      let perScorerPassed = 0;
      for (const s of stubScorers) {
        const r = scorers[s].score({ output, testCase: tc });
        scores[s] = r;
        if (r.passed) perScorerPassed++;
      }
      return { testCaseId: tc.id, input: tc.input, output, scores, perScorerPassed, perScorerTotal: stubScorers.length, latencyMs: 0, usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 } };
    });
  }

  const stubResults = makeStubResults(stubAnswers);
  const stubResults2 = makeStubResults(stubAnswers2);
  const runA = { id: uuidv4(), benchmarkId: basicQaId, benchmarkSlug: 'basic-qa', model: 'gpt-4o-mini', promptTemplate: '{{input}}', scorerTypes: stubScorers, status: 'completed', startedAt: nowIso(), completedAt: nowIso(), results: stubResults, aggregate: aggregateResults(stubResults, stubScorers) };
  const runB = { id: uuidv4(), benchmarkId: basicQaId, benchmarkSlug: 'basic-qa', model: 'claude-haiku', promptTemplate: '{{input}}', scorerTypes: stubScorers, status: 'completed', startedAt: nowIso(), completedAt: nowIso(), results: stubResults2, aggregate: aggregateResults(stubResults2, stubScorers) };

  const runsData = loadRuns();
  if (!runsData.data) runsData.data = [];
  runsData.data.push(runA, runB);
  saveRuns(runsData);

  const cmpData = loadComparisons();
  if (!cmpData.data) cmpData.data = [];
  const cmp = buildComparison(runA, runB);
  cmp.id = uuidv4();
  cmp.createdAt = nowIso();
  cmpData.data.push(cmp);
  saveComparisons(cmpData);

  logAudit('seed', null, { benchmarks: 2, runs: 2, comparisons: 1 });
  return loadBenchmarks();
}

// ---------------------------------------------------------------------------
// Express app factory
// ---------------------------------------------------------------------------

function createApp(deps = {}) {
  const _seed = deps.seed || seedBenchmarks;
  const _callGateway = deps.callGateway || callInferenceGateway;
  const _gatewayPort = deps.gatewayPort || (process.env.GATEWAY_PORT ? parseInt(process.env.GATEWAY_PORT) : GATEWAY_PORT);

  _seed();

  const a = express();
  a.use(express.json({ limit: '5mb' }));

  // Convenience: redirect /health → /api/health
  a.get('/health', (_req, res) => res.redirect(302, '/api/health'));

  // Readiness probe
  a.get('/ready', (_req, res) => res.json({ ready: true, timestamp: nowIso() }));

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------
  a.get('/api/health', (_req, res) => {
    const bmkData = loadBenchmarks();
    const runsData = loadRuns();
    const cmpData = loadComparisons();
    res.json({
      service: 'evaluation-harness', port: PORT, status: 'ok',
      uptime: process.uptime(), timestamp: nowIso(),
      counts: { benchmarks: (bmkData.data || []).length, runs: (runsData.data || []).length, comparisons: (cmpData.data || []).length },
    });
  });

  // -------------------------------------------------------------------------
  // Benchmark CRUD
  // -------------------------------------------------------------------------
  a.post('/api/benchmarks', requireInternal, (req, res) => {
    const { slug, name, description, category, testCases } = req.body || {};
    if (!slug || !name) return res.status(400).json({ error: 'slug and name are required' });
    const bmkData = loadBenchmarks();
    if ((bmkData.data || []).find(b => b.slug === slug)) return res.status(409).json({ error: 'slug already exists' });
    const cases = Array.isArray(testCases) ? testCases : [];
    const now = nowIso();
    const benchmark = {
      id: uuidv4(), slug, name,
      description: description || '',
      category: category || 'general',
      testCases: cases.map(c => ({ id: uuidv4(), input: c.input, expectedOutput: c.expectedOutput, expectedContains: c.expectedContains, expectedNotContains: c.expectedNotContains, expectedJsonSchema: c.expectedJsonSchema, expectedRegex: c.expectedRegex, expectedTolerance: c.expectedTolerance, metadata: c.metadata || {} })),
      createdAt: now, updatedAt: now,
    };
    bmkData.data = bmkData.data || [];
    bmkData.data.push(benchmark);
    saveBenchmarks(bmkData);
    logAudit('create_benchmark', benchmark.id, { slug });
    res.status(201).json(benchmark);
  });

  a.get('/api/benchmarks', (req, res) => {
    const bmkData = loadBenchmarks();
    let list = bmkData.data || [];
    if (req.query.category) list = list.filter(b => b.category === req.query.category);
    list = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    res.json({ count: list.length, benchmarks: list });
  });

  a.get('/api/benchmarks/:idOrSlug', (req, res) => {
    const bmkData = loadBenchmarks();
    const b = findBenchmark(bmkData, req.params.idOrSlug);
    if (!b) return res.status(404).json({ error: 'benchmark not found' });
    res.json(b);
  });

  a.patch('/api/benchmarks/:idOrSlug', requireInternal, (req, res) => {
    const bmkData = loadBenchmarks();
    const b = findBenchmark(bmkData, req.params.idOrSlug);
    if (!b) return res.status(404).json({ error: 'benchmark not found' });
    for (const k of ['name', 'description', 'category']) { if (k in req.body) b[k] = req.body[k]; }
    b.updatedAt = nowIso();
    saveBenchmarks(bmkData);
    logAudit('update_benchmark', b.id, req.body);
    res.json(b);
  });

  a.delete('/api/benchmarks/:idOrSlug', requireInternal, (req, res) => {
    const bmkData = loadBenchmarks();
    const idx = (bmkData.data || []).findIndex(b => b.id === req.params.idOrSlug || b.slug === req.params.idOrSlug);
    if (idx < 0) return res.status(404).json({ error: 'benchmark not found' });
    const [deleted] = bmkData.data.splice(idx, 1);
    saveBenchmarks(bmkData);
    logAudit('delete_benchmark', deleted.id, { slug: deleted.slug });
    res.json({ deleted: true, id: deleted.id });
  });

  a.post('/api/benchmarks/:idOrSlug/test-cases', requireInternal, (req, res) => {
    const bmkData = loadBenchmarks();
    const b = findBenchmark(bmkData, req.params.idOrSlug);
    if (!b) return res.status(404).json({ error: 'benchmark not found' });
    const c = req.body || {};
    if (!c.input) return res.status(400).json({ error: 'input is required' });
    const tc = { id: uuidv4(), input: c.input, expectedOutput: c.expectedOutput, expectedContains: c.expectedContains, expectedNotContains: c.expectedNotContains, expectedJsonSchema: c.expectedJsonSchema, expectedRegex: c.expectedRegex, expectedTolerance: c.expectedTolerance, metadata: c.metadata || {} };
    b.testCases = b.testCases || [];
    b.testCases.push(tc);
    b.updatedAt = nowIso();
    saveBenchmarks(bmkData);
    logAudit('add_test_case', b.id, { testCaseId: tc.id });
    res.status(201).json(tc);
  });

  // -------------------------------------------------------------------------
  // Run
  // -------------------------------------------------------------------------
  a.post('/api/run', requireInternal, async (req, res) => {
    const { benchmarkId, model, promptTemplate, scorerTypes } = req.body || {};
    if (!benchmarkId || !model) return res.status(400).json({ error: 'benchmarkId and model are required' });
    const bmkData = loadBenchmarks();
    const benchmark = findBenchmark(bmkData, benchmarkId);
    if (!benchmark) return res.status(404).json({ error: 'benchmark not found' });

    const types = Array.isArray(scorerTypes) && scorerTypes.length
      ? scorerTypes.filter(t => scorers[t])
      : ALL_SCORER_TYPES.slice();

    const runId = uuidv4();
    const startedAt = nowIso();
    const run = { id: runId, benchmarkId: benchmark.id, benchmarkSlug: benchmark.slug, model, promptTemplate: promptTemplate || '{{input}}', scorerTypes: types, status: 'running', startedAt, completedAt: null, results: [], aggregate: null };

    const runsData = loadRuns();
    runsData.data = runsData.data || [];
    runsData.data.push(run);
    saveRuns(runsData);
    logAudit('start_run', runId, { benchmarkId: benchmark.id, model, scorers: types });
    res.status(202).json(run);

    (async () => {
      const results = [];
      for (const tc of benchmark.testCases) {
        const prompt = applyPromptTemplate(run.promptTemplate, tc.input);
        const perResult = { testCaseId: tc.id, input: tc.input, output: '', scores: {}, perScorerPassed: 0, perScorerTotal: types.length, latencyMs: 0, usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 } };
        try {
          const t0 = Date.now();
          const gw = await _callGateway(model, prompt, _gatewayPort);
          perResult.latencyMs = gw.latencyMs != null ? gw.latencyMs : Date.now() - t0;
          perResult.output = gw.text || '';
          perResult.usage = { tokensIn: (gw.usage && gw.usage.tokensIn) || 0, tokensOut: (gw.usage && gw.usage.tokensOut) || 0, costUsd: (gw.usage && gw.usage.costUsd) || 0 };
          for (const s of types) {
            const r = scorers[s].score({ output: perResult.output, testCase: tc });
            perResult.scores[s] = r;
            if (r.passed) perResult.perScorerPassed++;
          }
        } catch (err) {
          perResult.error = err.message;
        }
        results.push(perResult);
      }
      run.results = results;
      run.aggregate = aggregateResults(results, types);
      run.status = 'completed';
      run.completedAt = nowIso();
      const runsData2 = loadRuns();
      const runIdx = (runsData2.data || []).findIndex(r => r.id === runId);
      if (runIdx >= 0) runsData2.data[runIdx] = run;
      saveRuns(runsData2);
      logAudit('complete_run', runId, { passRate: run.aggregate.passRate });
    })().catch(err => {
      run.status = 'failed';
      run.error = err.message;
      run.completedAt = nowIso();
      const runsData2 = loadRuns();
      const runIdx = (runsData2.data || []).findIndex(r => r.id === runId);
      if (runIdx >= 0) runsData2.data[runIdx] = run;
      saveRuns(runsData2);
      logAudit('run_error', runId, { error: err.message });
    });
  });

  a.get('/api/runs', (req, res) => {
    const runsData = loadRuns();
    let list = runsData.data || [];
    if (req.query.benchmarkId) list = list.filter(r => r.benchmarkId === req.query.benchmarkId);
    if (req.query.model) list = list.filter(r => r.model === req.query.model);
    list = [...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    res.json({ count: list.length, runs: list });
  });

  a.get('/api/runs/:runId', (req, res) => {
    const runsData = loadRuns();
    const r = (runsData.data || []).find(r => r.id === req.params.runId);
    if (!r) return res.status(404).json({ error: 'run not found' });
    res.json(r);
  });

  a.delete('/api/runs/:runId', requireInternal, (req, res) => {
    const runsData = loadRuns();
    const idx = (runsData.data || []).findIndex(r => r.id === req.params.runId);
    if (idx < 0) return res.status(404).json({ error: 'run not found' });
    const [deleted] = runsData.data.splice(idx, 1);
    saveRuns(runsData);
    logAudit('delete_run', deleted.id, { benchmarkId: deleted.benchmarkId, model: deleted.model });
    res.json({ deleted: true, id: deleted.id });
  });

  // -------------------------------------------------------------------------
  // Compare
  // -------------------------------------------------------------------------
  a.post('/api/compare', requireInternal, (req, res) => {
    const { runIdA, runIdB } = req.body || {};
    if (!runIdA || !runIdB) return res.status(400).json({ error: 'runIdA and runIdB are required' });
    const runsData = loadRuns();
    const a = (runsData.data || []).find(r => r.id === runIdA);
    const b = (runsData.data || []).find(r => r.id === runIdB);
    if (!a || !b) return res.status(404).json({ error: 'one or both runs not found' });
    if (a.status !== 'completed' || b.status !== 'completed') return res.status(409).json({ error: 'both runs must be completed before comparing' });
    const cmpData = loadComparisons();
    cmpData.data = cmpData.data || [];
    const comparison = buildComparison(a, b);
    comparison.id = uuidv4();
    comparison.createdAt = nowIso();
    cmpData.data.push(comparison);
    saveComparisons(cmpData);
    logAudit('compare', comparison.id, { runIdA, runIdB });
    res.status(201).json(comparison);
  });

  a.get('/api/comparisons', (_req, res) => {
    const cmpData = loadComparisons();
    const list = [...(cmpData.data || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ count: list.length, comparisons: list });
  });

  a.get('/api/comparisons/:id', (req, res) => {
    const cmpData = loadComparisons();
    const c = (cmpData.data || []).find(c => c.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'comparison not found' });
    res.json(c);
  });

  // -------------------------------------------------------------------------
  // Scorers
  // -------------------------------------------------------------------------
  a.get('/api/scorers', (_req, res) => {
    const list = Object.entries(scorers).map(([type, { description }]) => ({ type, description }));
    res.json({ count: list.length, scorers: list });
  });

  a.get('/api/scorers/:type', (req, res) => {
    const s = scorers[req.params.type];
    if (!s) return res.status(404).json({ error: 'scorer not found' });
    res.json({ type: req.params.type, description: s.description });
  });

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------
  a.get('/api/stats', (_req, res) => {
    const runsData = loadRuns();
    const bmkData = loadBenchmarks();
    const cmpData = loadComparisons();
    const runList = runsData.data || [];
    const completed = runList.filter(r => r.status === 'completed');
    const passRates = completed.map(r => r.aggregate ? r.aggregate.passRate : 0);
    const overallPassRate = passRates.length ? passRates.reduce((s, v) => s + v, 0) / passRates.length : 0;
    res.json({
      totals: { benchmarks: (bmkData.data || []).length, runs: runList.length, comparisons: (cmpData.data || []).length, testCases: runList.reduce((s, r) => s + (r.results ? r.results.length : 0), 0), passedTestCases: runList.reduce((s, r) => s + (r.aggregate ? r.aggregate.passedTestCases : 0), 0) },
      passRate: { overall: overallPassRate, byModel: completed.reduce((acc, r) => { if (!acc[r.model]) acc[r.model] = { runs: 0, passRateSum: 0 }; acc[r.model].runs++; acc[r.model].passRateSum += r.aggregate ? r.aggregate.passRate : 0; return acc; }, {}), byBenchmark: completed.reduce((acc, r) => { if (!acc[r.benchmarkSlug]) acc[r.benchmarkSlug] = { runs: 0, passRateSum: 0 }; acc[r.benchmarkSlug].runs++; acc[r.benchmarkSlug].passRateSum += r.aggregate ? r.aggregate.passRate : 0; return acc; }, {}) },
      scorers: ALL_SCORER_TYPES,
      auditEntries: auditLog.length,
    });
  });

  // Audit log
  a.get('/api/audit', (_req, res) => res.json({ count: auditLog.length, entries: auditLog.slice(-100) }));

  // -------------------------------------------------------------------------
  // 404 + error
  // -------------------------------------------------------------------------
  a.use((req, res) => res.status(404).json({ error: 'not found', path: req.originalUrl }));
  a.use((err, req, res, _next) => { console.error(`[eval-harness] error:`, err); res.status(500).json({ error: 'internal server error', message: err.message }); });

  return a;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function start() {
  const a = createApp();
  a.listen(PORT, () => {
    console.log(`[evaluation-harness] listening on :${PORT}`);
    console.log(`[evaluation-harness] health: http://localhost:${PORT}/api/health`);
  });
}

if (require.main === module) {
  start();
}

module.exports = {
  app: createApp,
  start,
  scorers,
  ALL_SCORER_TYPES,
  seedBenchmarks,
  buildComparison,
  aggregateResults,
  findBenchmark,
  applyPromptTemplate,
};
