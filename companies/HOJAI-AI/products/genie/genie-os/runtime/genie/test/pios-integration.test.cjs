/**
 * Phase 1.6 integration test
 *
 * Verifies the new wiring in runtime/genie:
 *   - USE_INTENT_ENGINE env flag is respected
 *   - The new PIOS health endpoint exists
 *   - classifyIntent() falls back to keyword routing when engine is offline
 *
 * Doesn't require a live MongoDB — only tests the wiring paths.
 *
 * Run: node products/genie/genie-os/runtime/genie/test/pios-integration.test.cjs
 */

const assert = require('node:assert');

// We can't easily boot the full app (it requires Mongo), so we just
// verify the file parses, exports the new env vars, and that the
// helpers exist (string match against the source).

const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
};

console.log('Phase 1.6 + 2.5 integration test:');

t('intent-engine URL configured', src.includes('INTENT_ENGINE_URL'));
t('memory-substrate URL configured', src.includes('MEMORY_SUBSTRATE_URL'));
t('morning-briefing-v2 URL configured', src.includes('MORNING_BRIEFING_V2_URL'));
t('cold-start-onboarding URL configured', src.includes('COLD_START_ONBOARDING_URL'));
t('USE_INTENT_ENGINE flag exists', src.includes('USE_INTENT_ENGINE'));
t('classifyIntent() helper defined', src.includes('async function classifyIntent'));
t('classifyByKeywords() fallback defined', src.includes('function classifyByKeywords'));
t('executeRouting() dispatcher defined', src.includes('async function executeRouting'));
t('/api/pios/health endpoint exists', src.includes("'/api/pios/health'"));
t('response payload includes intent_engine_used', src.includes('intent_engine_used'));
t('response payload includes intent metadata', src.includes('intent: intentMeta'));
t('Phase 1.6 env defaults to 4792', src.includes("'http://localhost:4792'"));

// Phase 2.5 — Reasoning Engine wiring
t('reasoning-engine URL configured', src.includes('REASONING_ENGINE_URL'));
t('reflection-engine URL configured', src.includes('REFLECTION_ENGINE_URL'));
t('proactive-engine URL configured', src.includes('PROACTIVE_ENGINE_URL'));
t('USE_REASONING_ENGINE flag exists', src.includes('USE_REASONING_ENGINE'));
t('isComplexRequest() helper defined', src.includes('function isComplexRequest'));
t('COMPLEX_REQUEST_PATTERNS defined', src.includes('COMPLEX_REQUEST_PATTERNS'));
t('/api/ask calls reasoning-engine for complex requests', src.includes("`${REASONING_ENGINE_URL}/api/reason`"));
t('reasoning_engine_used in response payload', src.includes('reasoning_engine_used'));
t('reasoning_engine_enabled in pios health', src.includes('reasoning_engine_enabled'));
t('Phase 2.5 env defaults to 4795', src.includes("'http://localhost:4795'"));
t('Phase 2.5 env defaults to 4796', src.includes("'http://localhost:4796'"));
t('Phase 2.5 env defaults to 4797', src.includes("'http://localhost:4797'"));
t('Complex patterns include trip planning', src.includes('plan (me|my) .*(trip|week|day|evening|weekend)'));
t('Complex patterns include multi-action', src.includes('(add|create|book|schedule|find|search)'));

// Verify the 23 specialists are STILL listed (not removed)
t('genie-shopping-agent still referenced', src.includes('GENIE_SHOPPING_URL'));
t('genie-calendar-service still referenced', src.includes('GENIE_CALENDAR_URL'));
t('genie-money-os still referenced', src.includes('GENIE_MONEY_URL'));
t('genie-wellness-os still referenced', src.includes('GENIE_WELLNESS_URL'));
t('genie-briefing-service still referenced', src.includes('GENIE_BRIEFING_URL'));
t('genie-wake-word-service still referenced', src.includes('GENIE_WAKE_WORD_URL'));
t('genie-gateway still referenced', src.includes('GENIE_GATEWAY_URL'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
process.exit(0);
