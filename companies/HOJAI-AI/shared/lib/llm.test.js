/**
 * Smoke test for @rtmn/shared/lib/llm
 * Run with: node shared/lib/llm.test.js
 */

import { llmComplete, llmEmbed, llmStructured, isLLMAvailable } from './llm.js';

let p = 0, f = 0;
const a = (name, cond) => {
  if (cond) { p++; console.log(`  ✓ ${name}`); }
  else { f++; console.log(`  ✗ ${name}`); }
};

console.log('\n[LLM helper smoke test]');

const available = await isLLMAvailable();
a('isLLMAvailable returns boolean', typeof available === 'boolean');
console.log(`    [info] LLM available: ${available} (gateway: ${process.env.INFERENCE_GATEWAY_URL || 'http://localhost:4746'})`);

// Test 1: basic completion (stub fallback expected when gateway down)
const r1 = await llmComplete({
  messages: [{ role: 'user', content: 'What is 2+2?' }],
});
a('llmComplete returns ok=true', r1.ok === true);
a('llmComplete returns text', typeof r1.text === 'string' && r1.text.length > 0);
a('llmComplete returns model', typeof r1.model === 'string');
a('llmComplete returns latencyMs >= 0', r1.latencyMs >= 0);
a('llmComplete marks stub when gateway down', r1.stub === !available);

// Test 2: empty messages → ok=false
const r2 = await llmComplete({ messages: [] });
a('llmComplete with empty messages returns ok=false', r2.ok === false);

// Test 3: embedding always returns vector
const e1 = await llmEmbed('hello world');
a('llmEmbed returns array', Array.isArray(e1));
a('llmEmbed returns 384-dim vector', e1.length === 384);
a('llmEmbed values in [-1, 1]', e1.every((v) => v >= -1 && v <= 1));

// Test 4: same text → same embedding (deterministic)
const e2 = await llmEmbed('hello world');
a('llmEmbed is deterministic', JSON.stringify(e1) === JSON.stringify(e2));

// Test 5: different text → different embedding
const e3 = await llmEmbed('goodbye world');
a('llmEmbed differs for different text', JSON.stringify(e1) !== JSON.stringify(e3));

// Test 6: empty text → still works
const e4 = await llmEmbed('');
a('llmEmbed handles empty text', Array.isArray(e4) && e4.length === 384);

// Test 7: structured JSON
const r3 = await llmStructured({
  messages: [{ role: 'user', content: 'What is the sentiment of "I love this"?' }],
  schema: '{ sentiment: string, score: number }',
  defaultValue: { sentiment: 'unknown', score: 0 },
});
a('llmStructured returns object', typeof r3 === 'object' && r3 !== null);
a('llmStructured has sentiment key', typeof r3.sentiment === 'string');

console.log(`\n${p} passed, ${f} failed`);
process.exit(f > 0 ? 1 : 0);