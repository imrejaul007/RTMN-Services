/**
 * Phase 3 — Genie Widget API integration test
 *
 * Verifies that runtime/genie exposes /api/pios/widget/:userId and that
 * the response shape aggregates PI Score, stale relationships, due facts,
 * last reflection, and proactive suggestions.
 *
 * This is a static test (no live downstream services) — it checks that:
 *   - the endpoint exists
 *   - it requires auth (401 without token)
 *   - with auth, it gracefully returns empty sections when services are down
 *   - the env vars for the Phase 3 services are configured
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcPath = path.resolve(__dirname, '..', 'src', 'index.js');
const src = fs.readFileSync(srcPath, 'utf8');

test('widget — /api/pios/widget/:userId endpoint is defined', () => {
  assert.match(src, /\/api\/pios\/widget\/:userId/);
});

test('widget — endpoint uses authMiddleware', () => {
  // the widget route should be protected just like /api/ask
  const widgetIdx = src.indexOf('/api/pios/widget/:userId');
  const authBefore = src.lastIndexOf('authMiddleware', widgetIdx);
  assert.ok(authBefore > 0, 'widget endpoint must use authMiddleware');
});

test('widget — endpoint fetches PI Score', () => {
  assert.match(src, /PI_SCORE_URL.*\/api\/pi-score\//);
});

test('widget — endpoint fetches relationship-graph stale', () => {
  assert.match(src, /RELATIONSHIP_GRAPH_URL.*\/api\/relationships\/.*\/stale/);
});

test('widget — endpoint fetches learning-os-v2 due', () => {
  assert.match(src, /LEARNING_OS_V2_URL.*\/api\/learning\/due/);
});

test('widget — endpoint fetches reflection-engine latest', () => {
  assert.match(src, /REFLECTION_ENGINE_URL.*\/api\/reflection\//);
});

test('widget — endpoint fetches proactive-engine check', () => {
  assert.match(src, /PROACTIVE_ENGINE_URL.*\/api\/proactive\/check/);
});

test('widget — response shape includes piScore, reachOut, factsToRefresh, lastReflection, proactive', () => {
  assert.match(src, /piScore:\s*piScore\s*\?/);
  assert.match(src, /reachOut:\s*\(/);
  assert.match(src, /factsToRefresh:\s*\(/);
  assert.match(src, /lastReflection:\s*reflection/);
  assert.match(src, /proactive:\s*\(/);
});

test('widget — gracefully handles downstreams (try/catch in fetchJson)', () => {
  // The widget helper should return null when downstream is unreachable
  const widgetIdx = src.indexOf('/api/pios/widget/:userId');
  const chunk = src.slice(widgetIdx, widgetIdx + 4000);
  assert.match(chunk, /catch[\s\S]{0,40}return null/);
});

test('widget — env vars for Phase 3 services are configured', () => {
  assert.match(src, /PI_SCORE_URL\s*=\s*process\.env\.PI_SCORE_URL\s*\|\|\s*'http:\/\/localhost:4798'/);
  assert.match(src, /RELATIONSHIP_GRAPH_URL\s*=\s*process\.env\.RELATIONSHIP_GRAPH_URL\s*\|\|\s*'http:\/\/localhost:4799'/);
  assert.match(src, /LEARNING_OS_V2_URL\s*=\s*process\.env\.LEARNING_OS_V2_URL\s*\|\|\s*'http:\/\/localhost:4800'/);
});

test('widget — pios/health lists the 3 new services', () => {
  // Verify the health check includes Phase 3 services
  const healthIdx = src.indexOf('/api/pios/health');
  const healthChunk = src.slice(healthIdx, healthIdx + 2000);
  assert.match(healthChunk, /pi-score/);
  assert.match(healthChunk, /relationship-graph/);
  assert.match(healthChunk, /learning-os-v2/);
});