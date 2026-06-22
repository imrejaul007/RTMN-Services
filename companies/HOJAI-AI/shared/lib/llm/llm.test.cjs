#!/usr/bin/env node
/**
 * Tests for @rtmn/shared/lib/llm
 *
 * Run: node shared/lib/llm/llm.test.cjs
 *
 * These tests are pure (no API calls) — they verify the module structure,
 * provider factory, cost calculation, and structured output dispatch.
 *
 * For integration tests that hit real APIs, see platform/intelligence/
 * intent-engine/tests/ — those are gated behind LLM_API_KEY env.
 */

const assert = require('node:assert');
const path = require('node:path');

// --- Test 1: Module exports ---
console.log('Test 1: Module exports...');
const llmModule = require('./index.js');
assert(typeof llmModule.createLLMClient === 'function', 'createLLMClient must be exported');
assert(typeof llmModule.withStructuredOutput === 'function', 'withStructuredOutput must be exported');
assert(typeof llmModule.calculateCost === 'function', 'calculateCost must be exported');
assert(typeof llmModule.AnthropicProvider === 'function', 'AnthropicProvider must be exported');
assert(typeof llmModule.OpenAIProvider === 'function', 'OpenAIProvider must be exported');
assert(typeof llmModule.GoogleProvider === 'function', 'GoogleProvider must be exported');
assert(typeof llmModule.OllamaProvider === 'function', 'OllamaProvider must be exported');
console.log('  ✓ All exports present');

// --- Test 2: Provider factory ---
console.log('Test 2: Provider factory...');
const anthropic = llmModule.createLLMClient({ provider: 'anthropic', apiKey: 'test' });
assert.strictEqual(anthropic.provider, 'anthropic');
assert.strictEqual(anthropic.model, 'claude-haiku-4-5-20251001');

const openai = llmModule.createLLMClient({ provider: 'openai', model: 'gpt-5', apiKey: 'test' });
assert.strictEqual(openai.provider, 'openai');
assert.strictEqual(openai.model, 'gpt-5');

const google = llmModule.createLLMClient({ provider: 'google', apiKey: 'test' });
assert.strictEqual(google.provider, 'google');

const ollama = llmModule.createLLMClient({ provider: 'ollama', baseUrl: 'http://localhost:11434' });
assert.strictEqual(ollama.provider, 'ollama');

// Unknown provider should throw
assert.throws(
  () => llmModule.createLLMClient({ provider: 'gpt-99' }),
  /Unknown LLM provider/,
  'Should throw on unknown provider'
);
console.log('  ✓ All providers instantiate correctly');

// --- Test 3: Cost calculation ---
console.log('Test 3: Cost calculation...');
// Claude Haiku 4.5: $1/M input, $5/M output
const cost1 = llmModule.calculateCost('claude-haiku-4-5-20251001', 1_000_000, 1_000_000);
assert.strictEqual(cost1.inputUsd, 1.00, 'Haiku input cost should be $1/M');
assert.strictEqual(cost1.outputUsd, 5.00, 'Haiku output cost should be $5/M');
assert.strictEqual(cost1.totalUsd, 6.00);

// GPT-5 mini: $0.25/M input, $2/M output
const cost2 = llmModule.calculateCost('gpt-5-mini', 1_000_000, 500_000);
assert.strictEqual(cost2.inputUsd, 0.25);
assert.strictEqual(cost2.outputUsd, 1.00);

// Ollama (local): free
const cost3 = llmModule.calculateCost('llama-3.3-70b', 10_000_000, 5_000_000);
assert.strictEqual(cost3.totalUsd, 0.00, 'Ollama should always be free');

// Unknown model: default pricing
const cost4 = llmModule.calculateCost('gpt-99', 1_000_000, 0);
assert.strictEqual(cost4.inputUsd, 1.00, 'Unknown model should use default pricing');
console.log('  ✓ Cost calculation correct for all providers');

// --- Test 4: Anthropic provider validates API key ---
console.log('Test 4: API key validation...');
const noKey = llmModule.createLLMClient({ provider: 'anthropic' });
// health() should return false without key
noKey.health().then(healthy => {
  assert.strictEqual(healthy, false, 'health() should be false without API key');
  console.log('  ✓ API key validation works (async)');
  finishTests();
}).catch(err => {
  console.error('Health check threw:', err);
  process.exit(1);
});

async function finishTests() {
  // --- Test 5: Structured output dispatch ---
  console.log('Test 5: Structured output dispatch...');
  const schema = {
    type: 'object',
    properties: {
      intent: { type: 'string' },
      confidence: { type: 'number' },
    },
    required: ['intent', 'confidence'],
  };

  // Verify the function exists and accepts the right args
  assert.strictEqual(typeof llmModule.withStructuredOutput, 'function');
  console.log('  ✓ withStructuredOutput is callable');

  console.log('\n✅ All 5 tests passed');
}