/**
 * RTMN Evaluation Harness
 *
 * LLM evaluation framework: benchmarks, runs, scoring, and head-to-head
 * model comparison. Runs benchmarks against the inference-gateway
 * (port 4770) and scores the outputs using a set of pluggable scorers.
 *
 * Port: 4775
 */

'use strict';

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// Scorer loading
// ---------------------------------------------------------------------------

const SCORER_FILES = {
  'exact-match': './eval/exactMatch.js',
  'substring-match': './eval/substringMatch.js',
  'substring-absence': './eval/substringAbsence.js',
  'json-schema-match': './eval/jsonSchemaMatch.js',
  'token-overlap': './eval/tokenOverlap.js',
  'levenshtein-similarity': './eval/levenshteinSimilarity.js',
  'numeric-tolerance': './eval/numericTolerance.js',
  'regex-match': './eval/regexMatch.js'
};

const scorers = {};
const scorerDescriptions = {};
for (const [type, file] of Object.entries(SCORER_FILES)) {
  const mod = require(file);
  scorers[type] = mod.score;
  scorerDescriptions[type] = mod.description;
}

const ALL_SCORER_TYPES = Object.keys(scorers);

// ---------------------------------------------------------------------------
// In-memory storage
// ---------------------------------------------------------------------------

const benchmarks = new PersistentMap('benchmarks', { serviceName: 'evaluation-harness' });   // id -> benchmark
const runs = new PersistentMap('runs', { serviceName: 'evaluation-harness' });         // id -> run
const comparisons = new PersistentMap('comparisons', { serviceName: 'evaluation-harness' });  // id -> comparison
const auditLog = [];            // chronological log

function logAudit(action, target, details) {
  const entry = {
    id: uuidv4(),
    action,
    target,
    details: details || null,
    at: new Date().toISOString()
  };
  auditLog.push(entry);
  if (auditLog.length > 100) auditLog.shift();
  return entry;
}

// ---------------------------------------------------------------------------
// Inference gateway helper
// ---------------------------------------------------------------------------

function callInferenceGateway(model, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      model
    });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4770,
        path: '/api/complete',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 30000
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON from gateway: ' + data.slice(0, 200)));
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('Gateway timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Pre-seeded data
// ---------------------------------------------------------------------------

function seedData() {
  // --- benchmark 1: basic-qa -------------------------------------------------
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
    { input: 'What is the smallest prime number?', expectedOutput: '2', expectedContains: '2', metadata: { tags: ['math'], difficulty: 'medium', category: 'qa' } }
  ].map((c) => ({ id: uuidv4(), ...c }));

  const basicQa = {
    id: basicQaId,
    slug: 'basic-qa',
    name: 'Basic Q&A',
    description: 'Ten short factual questions covering math, geography, science, literature, and general knowledge.',
    category: 'qa',
    testCases: basicQaCases,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  benchmarks.set(basicQaId, basicQa);

  // --- benchmark 2: json-format ---------------------------------------------
  const jsonFormatId = uuidv4();
  const jsonFormatCases = [
    {
      input: 'List 3 fruits as JSON',
      expectedJsonSchema: { type: 'array', items: { type: 'string' } },
      metadata: { tags: ['format'], difficulty: 'easy', category: 'format' }
    },
    {
      input: 'Return a JSON object with name and age fields',
      expectedJsonSchema: {
        type: 'object',
        required: ['name', 'age'],
        properties: { name: { type: 'string' }, age: { type: 'number' } }
      },
      metadata: { tags: ['format'], difficulty: 'easy', category: 'format' }
    },
    {
      input: 'Output a JSON array of 5 numbers',
      expectedJsonSchema: { type: 'array', items: { type: 'number' } },
      metadata: { tags: ['format'], difficulty: 'easy', category: 'format' }
    },
    {
      input: 'Return JSON describing a car with make and model',
      expectedJsonSchema: {
        type: 'object',
        required: ['make', 'model'],
        properties: { make: { type: 'string' }, model: { type: 'string' } }
      },
      metadata: { tags: ['format'], difficulty: 'medium', category: 'format' }
    },
    {
      input: 'Give me a JSON object with a single boolean field named active',
      expectedJsonSchema: {
        type: 'object',
        required: ['active'],
        properties: { active: { type: 'boolean' } }
      },
      metadata: { tags: ['format'], difficulty: 'easy', category: 'format' }
    }
  ].map((c) => ({ id: uuidv4(), ...c }));

  const jsonFormat = {
    id: jsonFormatId,
    slug: 'json-format',
    name: 'JSON Format',
    description: 'Five prompts that require a well-formed JSON response matching a small schema.',
    category: 'format',
    testCases: jsonFormatCases,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  benchmarks.set(jsonFormatId, jsonFormat);

  // --- example run: basic-qa against gpt-4o-mini (stubbed) ------------------
  const exampleRunId = uuidv4();
  const stubAnswers = {
    'What is 2+2?': '4',
    'What is the capital of France?': 'Paris',
    'What is the largest planet in our solar system?': 'Jupiter',
    'How many continents are there?': '7',
    'What color do you get when you mix red and blue?': 'Purple',
    'What is the chemical symbol for water?': 'H2O',
    'Who wrote Romeo and Juliet?': 'William Shakespeare',
    'What is the boiling point of water in Celsius?': '100',
    'How many days are in a week?': '7',
    'What is the smallest prime number?': '2'
  };
  const stubScorers = ['exact-match', 'substring-match'];
  const stubResults = basicQaCases.map((tc) => {
    const output = stubAnswers[tc.input] || '';
    const scores = {};
    let perScorerPassed = 0;
    let totalScore = 0;
    for (const s of stubScorers) {
      const r = scorers[s]({ output, testCase: tc });
      scores[s] = r;
      if (r.passed) perScorerPassed++;
      totalScore += r.score;
    }
    return {
      testCaseId: tc.id,
      input: tc.input,
      output,
      stubbed: true,
      scores,
      perScorerPassed,
      perScorerTotal: stubScorers.length,
      latencyMs: 0,
      usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 }
    };
  });
  const aggregate = aggregateResults(stubResults, stubScorers);
  const exampleRun = {
    id: exampleRunId,
    benchmarkId: basicQaId,
    benchmarkSlug: 'basic-qa',
    model: 'gpt-4o-mini',
    promptTemplate: '{{input}}',
    scorerTypes: stubScorers,
    status: 'completed',
    startedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 + 5000).toISOString(),
    results: stubResults,
    aggregate
  };
  runs.set(exampleRunId, exampleRun);

  // --- a second example run for comparison ---------------------------------
  const exampleRun2Id = uuidv4();
  const stubAnswers2 = {
    'What is 2+2?': 'four',
    'What is the capital of France?': 'Paris',
    'What is the largest planet in our solar system?': 'Jupiter',
    'How many continents are there?': 'seven',
    'What color do you get when you mix red and blue?': 'purple',
    'What is the chemical symbol for water?': 'H2O',
    'Who wrote Romeo and Juliet?': 'Shakespeare',
    'What is the boiling point of water in Celsius?': '100C',
    'How many days are in a week?': '7',
    'What is the smallest prime number?': '2'
  };
  const stubResults2 = basicQaCases.map((tc) => {
    const output = stubAnswers2[tc.input] || '';
    const scores = {};
    let perScorerPassed = 0;
    let totalScore = 0;
    for (const s of stubScorers) {
      const r = scorers[s]({ output, testCase: tc });
      scores[s] = r;
      if (r.passed) perScorerPassed++;
      totalScore += r.score;
    }
    return {
      testCaseId: tc.id,
      input: tc.input,
      output,
      stubbed: true,
      scores,
      perScorerPassed,
      perScorerTotal: stubScorers.length,
      latencyMs: 0,
      usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 }
    };
  });
  const aggregate2 = aggregateResults(stubResults2, stubScorers);
  const exampleRun2 = {
    id: exampleRun2Id,
    benchmarkId: basicQaId,
    benchmarkSlug: 'basic-qa',
    model: 'claude-haiku',
    promptTemplate: '{{input}}',
    scorerTypes: stubScorers,
    status: 'completed',
    startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 30 + 5000).toISOString(),
    results: stubResults2,
    aggregate: aggregate2
  };
  runs.set(exampleRun2Id, exampleRun2);

  // --- example comparison ---------------------------------------------------
  const comparisonId = uuidv4();
  const cmp = buildComparison(exampleRun, exampleRun2);
  cmp.id = comparisonId;
  cmp.createdAt = new Date().toISOString();
  comparisons.set(comparisonId, cmp);

  logAudit('seed', null, { benchmarks: 2, runs: 2, comparisons: 1 });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function aggregateResults(results, scorerTypes) {
  const total = results.length || 1;
  const passed = results.filter((r) => !r.error && r.perScorerPassed === r.perScorerTotal).length;
  const totalScore = results.reduce((sum, r) => {
    if (r.error) return sum;
    return sum + scorerTypes.reduce((s, t) => s + ((r.scores[t] && r.scores[t].score) || 0), 0);
  }, 0);
  const totalLatencyMs = results.reduce((s, r) => s + (r.latencyMs || 0), 0);
  const totalTokens = results.reduce((s, r) => {
    if (!r.usage) return s;
    return s + ((r.usage.tokensIn || 0) + (r.usage.tokensOut || 0));
  }, 0);
  const totalCostUsd = results.reduce((s, r) => s + ((r.usage && r.usage.costUsd) || 0), 0);
  const scorerAverages = {};
  for (const t of scorerTypes) {
    const sum = results.reduce((s, r) => s + ((r.scores[t] && r.scores[t].score) || 0), 0);
    scorerAverages[t] = results.length ? sum / results.length : 0;
  }
  return {
    passRate: passed / total,
    avgScore: totalScore / (total * scorerTypes.length || 1),
    totalLatencyMs,
    totalTokens,
    totalCostUsd,
    scorerAverages,
    totalTestCases: results.length,
    passedTestCases: passed
  };
}

function findBenchmark(idOrSlug) {
  if (benchmarks.has(idOrSlug)) return benchmarks.get(idOrSlug);
  for (const b of benchmarks.values()) {
    if (b.slug === idOrSlug) return b;
  }
  return null;
}

function buildComparison(runA, runB) {
  const perTestCase = [];
  const mapB = new Map(runB.results.map((r) => [r.testCaseId, r]));
  for (const rA of runA.results) {
    const rB = mapB.get(rA.testCaseId);
    if (!rB) continue;
    const scoreA = scorerAveragesForResult(rA, runA.scorerTypes);
    const scoreB = scorerAveragesForResult(rB, runB.scorerTypes);
    let winner = 'tie';
    if (scoreA > scoreB) winner = 'A';
    else if (scoreB > scoreA) winner = 'B';
    perTestCase.push({
      testCaseId: rA.testCaseId,
      input: rA.input,
      scoreA,
      scoreB,
      winner
    });
  }
  const passRateA = runA.aggregate ? runA.aggregate.passRate : 0;
  const passRateB = runB.aggregate ? runB.aggregate.passRate : 0;
  let aggregateWinner = 'tie';
  if (passRateA > passRateB) aggregateWinner = 'A';
  else if (passRateB > passRateA) aggregateWinner = 'B';
  return {
    runIdA: runA.id,
    runIdB: runB.id,
    perTestCase,
    aggregate: {
      winner: aggregateWinner,
      passRateA,
      passRateB,
      passRateDelta: passRateA - passRateB,
      scoreDelta: (runA.aggregate ? runA.aggregate.avgScore : 0) - (runB.aggregate ? runB.aggregate.avgScore : 0)
    }
  };
}

function scorerAveragesForResult(result, scorerTypes) {
  if (!scorerTypes || !scorerTypes.length) return 0;
  const sum = scorerTypes.reduce((s, t) => s + ((result.scores[t] && result.scores[t].score) || 0), 0);
  return sum / scorerTypes.length;
}

function applyPromptTemplate(template, input) {
  const t = template || '{{input}}';
  return t.split('{{input}}').join(input);
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));

app.use((req, _res, next) => {
  console.log(`[evaluation-harness] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/health', (_req, res) => res.redirect(302, '/api/health'));

// ---------------------------------------------------------------------------
// Benchmark endpoints
// ---------------------------------------------------------------------------

// POST /api/benchmarks
app.post('/api/benchmarks',requireAuth,  (req, res) => {
  const { slug, name, description, category, testCases } = req.body || {};
  if (!slug || !name) {
    return res.status(400).json({ error: 'slug and name are required' });
  }
  for (const b of benchmarks.values()) {
    if (b.slug === slug) return res.status(409).json({ error: 'slug already exists' });
  }
  const now = new Date().toISOString();
  const cases = Array.isArray(testCases) ? testCases : [];
  const benchmark = {
    id: uuidv4(),
    slug,
    name,
    description: description || '',
    category: category || 'general',
    testCases: cases.map((c) => ({
      id: uuidv4(),
      input: c.input,
      expectedOutput: c.expectedOutput,
      expectedContains: c.expectedContains,
      expectedNotContains: c.expectedNotContains,
      expectedJsonSchema: c.expectedJsonSchema,
      expectedRegex: c.expectedRegex,
      expectedTolerance: c.expectedTolerance,
      metadata: c.metadata || {}
    })),
    createdAt: now,
    updatedAt: now
  };
  benchmarks.set(benchmark.id, benchmark);
  logAudit('create_benchmark', benchmark.id, { slug });
  res.status(201).json(benchmark);
});

// GET /api/benchmarks
app.get('/api/benchmarks', (req, res) => {
  const { category } = req.query;
  let list = Array.from(benchmarks.values());
  if (category) list = list.filter((b) => b.category === category);
  list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  res.json({ count: list.length, benchmarks: list });
});

// GET /api/benchmarks/:idOrSlug
app.get('/api/benchmarks/:idOrSlug', (req, res) => {
  const b = findBenchmark(req.params.idOrSlug);
  if (!b) return res.status(404).json({ error: 'benchmark not found' });
  res.json(b);
});

// PATCH /api/benchmarks/:idOrSlug
app.patch('/api/benchmarks/:idOrSlug',requireAuth,  (req, res) => {
  const b = findBenchmark(req.params.idOrSlug);
  if (!b) return res.status(404).json({ error: 'benchmark not found' });
  const allowed = ['name', 'description', 'category'];
  for (const k of allowed) {
    if (k in req.body) b[k] = req.body[k];
  }
  b.updatedAt = new Date().toISOString();
  logAudit('update_benchmark', b.id, req.body);
  res.json(b);
});

// DELETE /api/benchmarks/:idOrSlug
app.delete('/api/benchmarks/:idOrSlug',requireAuth,  (req, res) => {
  const b = findBenchmark(req.params.idOrSlug);
  if (!b) return res.status(404).json({ error: 'benchmark not found' });
  benchmarks.delete(b.id);
  logAudit('delete_benchmark', b.id, { slug: b.slug });
  res.json({ deleted: true, id: b.id });
});

// POST /api/benchmarks/:idOrSlug/test-cases
app.post('/api/benchmarks/:idOrSlug/test-cases',requireAuth,  (req, res) => {
  const b = findBenchmark(req.params.idOrSlug);
  if (!b) return res.status(404).json({ error: 'benchmark not found' });
  const c = req.body || {};
  if (!c.input) return res.status(400).json({ error: 'input is required' });
  const tc = {
    id: uuidv4(),
    input: c.input,
    expectedOutput: c.expectedOutput,
    expectedContains: c.expectedContains,
    expectedNotContains: c.expectedNotContains,
    expectedJsonSchema: c.expectedJsonSchema,
    expectedRegex: c.expectedRegex,
    expectedTolerance: c.expectedTolerance,
    metadata: c.metadata || {}
  };
  b.testCases.push(tc);
  b.updatedAt = new Date().toISOString();
  logAudit('add_test_case', b.id, { testCaseId: tc.id });
  res.status(201).json(tc);
});

// ---------------------------------------------------------------------------
// Run endpoint (the main one)
// ---------------------------------------------------------------------------

// POST /api/run
app.post('/api/run',requireAuth,  async (req, res) => {
  const { benchmarkId, model, promptTemplate, scorerTypes } = req.body || {};
  if (!benchmarkId || !model) {
    return res.status(400).json({ error: 'benchmarkId and model are required' });
  }
  const benchmark = findBenchmark(benchmarkId);
  if (!benchmark) {
    logAudit('run_failed', benchmarkId, { reason: 'benchmark not found' });
    return res.status(404).json({ error: 'benchmark not found' });
  }
  const types = Array.isArray(scorerTypes) && scorerTypes.length
    ? scorerTypes.filter((t) => scorers[t])
    : ALL_SCORER_TYPES.slice();
  const runId = uuidv4();
  const startedAt = new Date().toISOString();
  const run = {
    id: runId,
    benchmarkId: benchmark.id,
    benchmarkSlug: benchmark.slug,
    model,
    promptTemplate: promptTemplate || '{{input}}',
    scorerTypes: types,
    status: 'running',
    startedAt,
    completedAt: null,
    results: [],
    aggregate: null
  };
  runs.set(runId, run);
  logAudit('start_run', runId, { benchmarkId: benchmark.id, model, scorers: types });

  // Execute the run asynchronously; respond with the run skeleton, then
  // mutate the same object as results stream in. The caller can poll
  // GET /api/runs/:id to check status. For simplicity we still update
  // results in place and the client can fetch the final state.
  res.status(202).json(run);

  (async () => {
    const results = [];
    for (const tc of benchmark.testCases) {
      const prompt = applyPromptTemplate(run.promptTemplate, tc.input);
      const perResult = {
        testCaseId: tc.id,
        input: tc.input,
        output: '',
        scores: {},
        perScorerPassed: 0,
        perScorerTotal: types.length,
        latencyMs: 0,
        usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 }
      };
      try {
        const t0 = Date.now();
        const gw = await callInferenceGateway(model, prompt);
        perResult.latencyMs = gw.latencyMs != null ? gw.latencyMs : Date.now() - t0;
        perResult.output = gw.text || '';
        perResult.usage = {
          tokensIn: (gw.usage && gw.usage.tokensIn) || 0,
          tokensOut: (gw.usage && gw.usage.tokensOut) || 0,
          costUsd: (gw.usage && gw.usage.costUsd) || 0
        };
        for (const s of types) {
          const r = scorers[s]({ output: perResult.output, testCase: tc });
          perResult.scores[s] = r;
          if (r.passed) perResult.perScorerPassed++;
        }
      } catch (err) {
        perResult.error = err.message;
        perResult.score = 0;
        perResult.passed = false;
      }
      results.push(perResult);
    }
    run.results = results;
    run.aggregate = aggregateResults(results, types);
    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    logAudit('complete_run', runId, { passRate: run.aggregate.passRate });
  })().catch((err) => {
    run.status = 'failed';
    run.error = err.message;
    run.completedAt = new Date().toISOString();
    logAudit('run_error', runId, { error: err.message });
  });
});

// GET /api/runs
app.get('/api/runs', (req, res) => {
  const { benchmarkId, model } = req.query;
  let list = Array.from(runs.values());
  if (benchmarkId) list = list.filter((r) => r.benchmarkId === benchmarkId);
  if (model) list = list.filter((r) => r.model === model);
  list.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  res.json({ count: list.length, runs: list });
});

// GET /api/runs/:runId
app.get('/api/runs/:runId', (req, res) => {
  const r = runs.get(req.params.runId);
  if (!r) return res.status(404).json({ error: 'run not found' });
  res.json(r);
});

// DELETE /api/runs/:runId
app.delete('/api/runs/:runId',requireAuth,  (req, res) => {
  const r = runs.get(req.params.runId);
  if (!r) return res.status(404).json({ error: 'run not found' });
  runs.delete(r.id);
  logAudit('delete_run', r.id, { benchmarkId: r.benchmarkId, model: r.model });
  res.json({ deleted: true, id: r.id });
});

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

// POST /api/compare
app.post('/api/compare',requireAuth,  (req, res) => {
  const { runIdA, runIdB } = req.body || {};
  if (!runIdA || !runIdB) {
    return res.status(400).json({ error: 'runIdA and runIdB are required' });
  }
  const a = runs.get(runIdA);
  const b = runs.get(runIdB);
  if (!a || !b) return res.status(404).json({ error: 'one or both runs not found' });
  if (a.status !== 'completed' || b.status !== 'completed') {
    return res.status(409).json({ error: 'both runs must be completed before comparing' });
  }
  const comparison = buildComparison(a, b);
  comparison.id = uuidv4();
  comparison.createdAt = new Date().toISOString();
  comparisons.set(comparison.id, comparison);
  logAudit('compare', comparison.id, { runIdA, runIdB });
  res.status(201).json(comparison);
});

// GET /api/comparisons
app.get('/api/comparisons', (_req, res) => {
  const list = Array.from(comparisons.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  res.json({ count: list.length, comparisons: list });
});

// GET /api/comparisons/:id
app.get('/api/comparisons/:id', (req, res) => {
  const c = comparisons.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'comparison not found' });
  res.json(c);
});

// ---------------------------------------------------------------------------
// Scorer management
// ---------------------------------------------------------------------------

// GET /api/scorers
app.get('/api/scorers', (_req, res) => {
  const list = Object.entries(scorerDescriptions).map(([type, description]) => ({
    type,
    description
  }));
  res.json({ count: list.length, scorers: list });
});

// GET /api/scorers/:type
app.get('/api/scorers/:type', (req, res) => {
  const type = req.params.type;
  if (!scorers[type]) return res.status(404).json({ error: 'scorer not found' });
  res.json({ type, description: scorerDescriptions[type] });
});

// ---------------------------------------------------------------------------
// Stats & audit
// ---------------------------------------------------------------------------

// GET /api/stats
app.get('/api/stats', (_req, res) => {
  const runList = Array.from(runs.values());
  const completed = runList.filter((r) => r.status === 'completed');
  const passRates = completed.map((r) => (r.aggregate ? r.aggregate.passRate : 0));
  const overallPassRate = passRates.length
    ? passRates.reduce((s, v) => s + v, 0) / passRates.length
    : 0;
  const totalResults = runList.reduce((s, r) => s + (r.results ? r.results.length : 0), 0);
  const totalPassed = runList.reduce(
    (s, r) => s + (r.aggregate ? r.aggregate.passedTestCases : 0),
    0
  );
  res.json({
    totals: {
      benchmarks: benchmarks.size,
      runs: runs.size,
      comparisons: comparisons.size,
      testCases: totalResults,
      passedTestCases: totalPassed
    },
    passRate: {
      overall: overallPassRate,
      byModel: completed.reduce((acc, r) => {
        if (!acc[r.model]) acc[r.model] = { runs: 0, passRateSum: 0 };
        acc[r.model].runs++;
        acc[r.model].passRateSum += r.aggregate ? r.aggregate.passRate : 0;
        return acc;
      }, {}),
      byBenchmark: completed.reduce((acc, r) => {
        if (!acc[r.benchmarkSlug]) acc[r.benchmarkSlug] = { runs: 0, passRateSum: 0 };
        acc[r.benchmarkSlug].runs++;
        acc[r.benchmarkSlug].passRateSum += r.aggregate ? r.aggregate.passRate : 0;
        return acc;
      }, {})
    },
    scorers: ALL_SCORER_TYPES,
    auditEntries: auditLog.length
  });
});

// GET /api/audit
app.get('/api/audit', (_req, res) => {
  const last = auditLog.slice(-100);
  res.json({ count: last.length, entries: last });
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({
    service: 'evaluation-harness',
    port: PORT,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    counts: {
      benchmarks: benchmarks.size,
      runs: runs.size,
      comparisons: comparisons.size
    }
  });
});

// ---------------------------------------------------------------------------
// 404 + error handlers
// ---------------------------------------------------------------------------

app.use((req, res, _next) => {
  res.status(404).json({ error: 'not found', path: req.originalUrl });
});

app.use((err, req, res, _next) => {
  console.error(`[evaluation-harness] error on ${req.method} ${req.url}:`, err);
  res.status(500).json({
    error: 'internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT, 10) || 4775;

seedData();

if (require.main === module) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => {
    console.log(`[evaluation-harness] listening on port ${PORT}`);
    console.log(`[evaluation-harness] health: http://localhost:${PORT}/api/health`);
    console.log(
      `[evaluation-harness] seeded: ${benchmarks.size} benchmarks, ${runs.size} runs, ${comparisons.size} comparisons`
    );
  });
  installGracefulShutdown(server);
}

module.exports = { app, benchmarks, runs, comparisons, scorers };
