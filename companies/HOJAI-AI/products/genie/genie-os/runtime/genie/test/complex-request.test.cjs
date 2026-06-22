/**
 * Phase 2.5 unit test: isComplexRequest heuristic
 *
 * Tests the regex patterns that decide whether to route to the Reasoning Engine
 * vs. the Intent Engine / keyword router.
 *
 * Run: node products/genie/genie-os/runtime/genie/test/complex-request.test.cjs
 */

const assert = require('node:assert');

// Re-implement isComplexRequest with the same logic as the runtime
const COMPLEX_REQUEST_PATTERNS = [
  /\bplan (me|my) .*(trip|week|day|evening|weekend)\b/i,
  /\b(make|move|transfer) .*\b(and|then|,).*\b(to|into|from)\b/i,
  /\b(help me|can you) (figure out|decide|organize|set up)\b/i,
  /\bremember .* and .* remind me\b/i,
  /\b(burned out|stressed|overwhelmed)\b.*\b(what|should|help)\b/i,
  /\bI just got paid\b/i,
  /\b(add|create|book|schedule|find|search) .* (and|then|,).*(and|then|,)?.*\b(add|create|book|schedule|find|search|tell|show)\b/i,
];

function isComplexRequest(question) {
  if (!question || question.length < 10) return false;
  for (const p of COMPLEX_REQUEST_PATTERNS) {
    if (p.test(question)) return true;
  }
  const lower = question.toLowerCase();
  const hasMultipleClauses = (lower.match(/\b(and|then|,)\b/g) || []).length >= 2;
  const hasActionVerbs = (lower.match(/\b(add|create|book|schedule|find|search|move|transfer|plan|send|tell|show|remind|set up)\b/g) || []).length >= 2;
  return hasMultipleClauses && hasActionVerbs;
}

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
};

console.log('Phase 2.5: isComplexRequest tests:');

// === Should be complex (route to Reasoning Engine) ===
t('"Plan me a weekend trip" → complex', isComplexRequest('Plan me a weekend trip to Tokyo with my wife'));
t('"I just got paid" → complex', isComplexRequest('I just got paid, move $500 to savings and pay the Visa bill'));
t('"Help me figure out my week" → complex', isComplexRequest('Help me figure out what to focus on this week'));
t('"Burned out" → complex', isComplexRequest("I'm burned out. What should I cut from my schedule?"));
t('"Add to calendar and tell me" → complex', isComplexRequest('Add the meeting to my calendar and tell me when to leave'));
t('"Book restaurant and add to calendar" → complex (multi-action)', isComplexRequest('Book a table for 2 at 8pm and add it to my calendar'));
t('"Move money to savings" → complex', isComplexRequest('Move $500 to savings and pay my Visa bill, then tell me what is left'));

// === Should NOT be complex (route to Intent Engine / keyword router) ===
t('"What\'s on my calendar?" → simple', !isComplexRequest("What's on my calendar today?"));
t('"Buy me a laptop" → simple', !isComplexRequest('Help me buy a laptop'));
t('"I need to sleep more" → simple', !isComplexRequest('I need to sleep more'));
t('"Schedule a meeting" → simple', !isComplexRequest('Schedule a meeting with Reza tomorrow'));
t('"How am I doing on goals?" → simple', !isComplexRequest('How am I doing on my goals?'));
t('Empty string → simple', !isComplexRequest(''));
t('"hi" → simple (too short)', !isComplexRequest('hi'));
t('"Set up a meeting" → simple (one action)', !isComplexRequest('Set up a meeting with Reza'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
process.exit(0);
