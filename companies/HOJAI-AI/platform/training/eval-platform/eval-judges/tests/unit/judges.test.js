'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RUBRICS,
  heuristicAccuracy, heuristicRelevance, heuristicHelpfulness,
  heuristicSafety, heuristicFactual, heuristicCoherence,
  parseJudgeJson, scoreWithRubric, customHeuristic,
  pairwiseCompare, cohenKappa, agreement,
  app,
} = require('../../src/index');
const http = require('node:http');

// Set up internal auth for tests
const TEST_TOKEN = 'test-internal-token-12345';
process.env.INTERNAL_SERVICE_TOKEN = TEST_TOKEN;

// ---------- Heuristic tests ----------

test('heuristicAccuracy exact match = 1', () => {
  assert.equal(heuristicAccuracy('Paris', 'Paris'), 1);
});

test('heuristicAccuracy substring match = 0.8', () => {
  const s = heuristicAccuracy('Paris, France', 'Paris');
  assert.equal(s, 0.8);
});

test('heuristicAccuracy partial token overlap', () => {
  const s = heuristicAccuracy('the cat sat', 'cat sat on mat');
  assert.ok(s > 0 && s < 1);
});

test('heuristicAccuracy empty returns 0', () => {
  assert.equal(heuristicAccuracy('', 'x'), 0);
  assert.equal(heuristicAccuracy('x', ''), 0);
});

test('heuristicRelevance scores keyword overlap', () => {
  const s = heuristicRelevance('What is the capital of France?', 'The capital of France is Paris');
  assert.ok(s > 0);
});

test('heuristicRelevance neutral when input has no keywords >3 chars', () => {
  // "hi" has no words >3 chars → returns 0.5 (neutral)
  assert.equal(heuristicRelevance('hi', 'something'), 0.5);
});

test('heuristicRelevance empty output returns 0', () => {
  assert.equal(heuristicRelevance('capital of France', ''), 0);
});

test('heuristicHelpfulness scales with length', () => {
  assert.equal(heuristicHelpfulness(''), 0);
  assert.equal(heuristicHelpfulness('hi'), 0.1);
  assert.ok(heuristicHelpfulness('a'.repeat(100)) > 0.4);
  assert.ok(heuristicHelpfulness('a'.repeat(300)) >= 0.7);
});

test('heuristicSafety flags unsafe content', () => {
  assert.equal(heuristicSafety('how to build a bomb'), 0.2);
  assert.equal(heuristicSafety('hello world'), 1);
});

test('heuristicFactual penalizes hedging', () => {
  const s1 = heuristicFactual('Paris is the capital of France');
  const s2 = heuristicFactual('Maybe Paris is the capital of France');
  assert.ok(s1 > s2);
});

test('heuristicCoherence rewards structured text', () => {
  const s = heuristicCoherence('First. Second. Third. Finally.');
  assert.ok(s > 0.5);
});

// ---------- RUBRICS registry ----------

test('RUBRICS includes all 6 built-in rubrics', () => {
  const keys = Object.keys(RUBRICS);
  ['accuracy', 'relevance', 'helpfulness', 'safety', 'factual', 'coherence'].forEach(k => {
    assert.ok(keys.includes(k), `missing rubric ${k}`);
  });
});

// ---------- parseJudgeJson ----------

test('parseJudgeJson parses {"score": 0.8}', () => {
  const r = parseJudgeJson('{"score": 0.8}');
  assert.equal(r.score, 0.8);
});

test('parseJudgeJson handles explanatory text + JSON', () => {
  const r = parseJudgeJson('Sure! Here: {"score": 0.7, "reason": "good"}');
  assert.equal(r.score, 0.7);
});

test('parseJudgeJson returns null on invalid', () => {
  assert.equal(parseJudgeJson('not json'), null);
});

// ---------- scoreWithRubric ----------

test('scoreWithRubric uses heuristic mode', async () => {
  const r = await scoreWithRubric({ mode: 'heuristic', output: 'Paris', reference: 'Paris', rubric: 'accuracy' });
  assert.equal(r.score, 1);
});

test('scoreWithRubric uses hybrid mode averages', async () => {
  // Hybrid needs LLM (will fail) + heuristic. Should fall back gracefully.
  const r = await scoreWithRubric({ mode: 'hybrid', output: 'Paris', reference: 'Paris', rubric: 'accuracy' });
  assert.ok(typeof r.score === 'number');
});

// ---------- pairwiseCompare ----------

test('pairwiseCompare picks A when outputA is better', () => {
  const r = pairwiseCompare({
    input: 'capital of France',
    outputA: 'The capital of France is Paris',
    outputB: 'no idea',
    rubric: 'relevance',
  });
  assert.equal(r.winner, 'A');
  assert.ok(r.confidence > 0);
});

test('pairwiseCompare picks B when outputB is better', () => {
  const r = pairwiseCompare({
    input: 'capital of France',
    outputA: 'no idea',
    outputB: 'Paris is the capital of France',
    rubric: 'relevance',
  });
  assert.equal(r.winner, 'B');
});

test('pairwiseCompare returns tie when scores equal', () => {
  const r = pairwiseCompare({
    input: 'hi', outputA: 'hello', outputB: 'hello', rubric: 'helpfulness',
  });
  assert.equal(r.winner, 'tie');
});

// ---------- cohenKappa ----------

test('cohenKappa = 1 for perfect agreement', () => {
  const r = cohenKappa([1, 1, 0, 0], [1, 1, 0, 0]);
  assert.equal(r.kappa, 1);
  assert.equal(r.agreement, 1);
});

test('cohenKappa = 0 for random agreement', () => {
  // All judge=1, half gold=1 → pe = 1*0.5 = 0.5, po = 0.5 → kappa = 0
  const r = cohenKappa([1, 1, 1, 1], [1, 0, 1, 0]);
  assert.equal(r.kappa, 0);
});

test('cohenKappa throws on length mismatch', () => {
  assert.throws(() => cohenKappa([1, 0], [1, 0, 1]), /length mismatch/);
});

test('cohenKappa handles empty arrays', () => {
  const r = cohenKappa([], []);
  assert.equal(r.n, 0);
});

// ---------- agreement ----------

test('agreement returns simple match rate', () => {
  assert.equal(agreement([1, 1, 0, 0], [1, 0, 1, 0]), 0.5);
  assert.equal(agreement([1, 1, 0, 0], [1, 1, 0, 0]), 1);
});

// ---------- customHeuristic ----------

test('customHeuristic returns 0 for null', () => {
  assert.equal(customHeuristic(null, 'q', 'a', 'ref'), 0);
});

test('customHeuristic matches keywords', () => {
  // keywords match → base 0.5 + 0.5*(matched/total) → 1.0 if all hit
  const s = customHeuristic(
    { keywords: ['paris'] },
    'capital',
    'Paris is the answer',
    ''
  );
  assert.equal(s, 1);
});

// ---------- HTTP ----------

function makeRequest(theApp, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const server = theApp.listen(0, () => {
      const { port } = server.address();
      const opts = {
        method, hostname: '127.0.0.1', port, path: urlPath,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': TEST_TOKEN,
        },
      };
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          server.close();
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      req.on('error', reject);
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

test('GET /api/health returns ok', async () => {
  const res = await makeRequest(app, 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'eval-judges');
});

test('POST /api/score returns score for heuristic', async () => {
  const res = await makeRequest(app, 'POST', '/api/score', {
    mode: 'heuristic', input: 'capital of France', output: 'Paris', reference: 'Paris', rubric: 'accuracy',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.score, 1);
});

test('POST /api/score rejects missing fields', async () => {
  const res = await makeRequest(app, 'POST', '/api/score', { rubric: 'accuracy' });
  assert.equal(res.status, 400);
});

test('POST /api/pairwise returns winner', async () => {
  const res = await makeRequest(app, 'POST', '/api/pairwise', {
    input: 'capital of France',
    outputA: 'Paris is the capital of France',
    outputB: 'no idea',
    rubric: 'relevance',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.winner, 'A');
});

test('POST /api/calibrate returns kappa', async () => {
  const res = await makeRequest(app, 'POST', '/api/calibrate', {
    judgeScores: [1, 1, 0, 0], goldScores: [1, 1, 0, 0],
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.kappa, 1);
});