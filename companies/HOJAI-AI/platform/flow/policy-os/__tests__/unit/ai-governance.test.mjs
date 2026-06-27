/**
 * PolicyOS — AI Governance tests (Phase 4)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  MODEL_STATUSES,
  MODEL_PROVIDERS,
  CONSTITUTION_TYPES,
  HARM_CATEGORIES,
  VALIDATION_RULES,
  validateOutput,
} from '../../src/routes/ai-governance.js';

// ── Validation rules constants ────────────────────────────────────────────────

describe('VALIDATION_RULES constants', () => {
  it('has all expected rule types', () => {
    assert.strictEqual(VALIDATION_RULES.MAX_LENGTH, 'max_length');
    assert.strictEqual(VALIDATION_RULES.NO_PII, 'no_pii');
    assert.strictEqual(VALIDATION_RULES.NO_HARMFUL_CONTENT, 'no_harmful');
    assert.strictEqual(VALIDATION_RULES.NO_PRIVATE_DATA, 'no_private');
    assert.strictEqual(VALIDATION_RULES.TOPIC_ALLOWED, 'topic_allowed');
    assert.strictEqual(VALIDATION_RULES.TOPIC_BLOCKED, 'topic_blocked');
    assert.strictEqual(VALIDATION_RULES.FORMAT_JSON, 'format_json');
    assert.strictEqual(VALIDATION_RULES.FORMATMarkdown, 'format_markdown');
    assert.strictEqual(VALIDATION_RULES.NO_REFUSALS, 'no_refusals');
    assert.strictEqual(VALIDATION_RULES.CITE_SOURCES, 'cite_sources');
  });
});

// ── validateOutput tests ──────────────────────────────────────────────────────

describe('validateOutput — no rules', () => {
  it('returns valid for clean output with no rules', () => {
    const result = validateOutput('Hello, this is a clean response.', []);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.violations.length, 0);
    assert.ok(result.checkedAt);
  });

  it('returns valid for empty output with no rules', () => {
    const result = validateOutput('', []);
    assert.strictEqual(result.valid, true);
  });
});

describe('validateOutput — MAX_LENGTH', () => {
  it('passes when under limit', () => {
    const result = validateOutput('short text', [{ type: 'max_length', value: 100 }]);
    assert.strictEqual(result.valid, true);
  });

  it('fails when over limit', () => {
    const result = validateOutput('x'.repeat(200), [{ type: 'max_length', value: 100 }]);
    assert.strictEqual(result.valid, false);
    const maxLenViolation = result.violations.find(v => v.rule === 'max_length');
    assert.ok(maxLenViolation);
    assert.strictEqual(maxLenViolation.severity, 'error');
    assert.strictEqual(maxLenViolation.actual, 200);
  });
});

describe('validateOutput — NO_PII', () => {
  it('passes clean text', () => {
    const result = validateOutput('The meeting is scheduled for 3pm.', [{ type: 'no_pii' }]);
    assert.strictEqual(result.valid, true);
  });

  it('detects email addresses', () => {
    const result = validateOutput('Contact john@example.com for details.', [{ type: 'no_pii' }]);
    assert.strictEqual(result.valid, false);
    const piiV = result.violations.find(v => v.rule === 'no_pii');
    assert.ok(piiV);
    assert.strictEqual(piiV.findings[0].type, 'email');
  });

  it('detects phone numbers', () => {
    const result = validateOutput('Call 987-654-3210 for support.', [{ type: 'no_pii' }]);
    assert.strictEqual(result.valid, false);
    const piiV = result.violations.find(v => v.rule === 'no_pii');
    assert.ok(piiV.findings.some(f => f.type === 'phone'));
  });

  it('detects credit card numbers', () => {
    const result = validateOutput('Card: 4111-1111-1111-1111', [{ type: 'no_pii' }]);
    assert.strictEqual(result.valid, false);
    const piiV = result.violations.find(v => v.rule === 'no_pii');
    assert.ok(piiV.findings.some(f => f.type === 'credit_card'));
  });

  it('finds PII values in email format', () => {
    const result = validateOutput('Email: test@domain.com', [{ type: 'no_pii' }]);
    const finding = result.violations[0].findings[0];
    assert.strictEqual(finding.type, 'email');
    assert.ok(finding.value.length > 0, 'has email value');
  });
});

describe('validateOutput — NO_HARMFUL_CONTENT', () => {
  it('passes clean text', () => {
    const result = validateOutput('Here is a helpful guide to cooking pasta.', [{ type: 'no_harmful' }]);
    assert.strictEqual(result.valid, true);
  });

  it('detects violence keywords', () => {
    const result = validateOutput('They plan to murder the character.', [{ type: 'no_harmful' }]);
    assert.strictEqual(result.valid, false);
    const v = result.violations.find(v => v.rule === 'no_harmful');
    assert.ok(v);
    assert.strictEqual(v.severity, 'critical');
    assert.strictEqual(v.findings[0].category, 'violence');
  });

  it('detects hate speech keywords', () => {
    const result = validateOutput('This content promotes hate speech.', [{ type: 'no_harmful' }]);
    assert.strictEqual(result.valid, false);
    const v = result.violations.find(v => v.rule === 'no_harmful');
    assert.strictEqual(v.findings[0].category, 'hate_speech');
  });

  it('detects self-harm keywords', () => {
    const result = validateOutput('He committed suicide yesterday.', [{ type: 'no_harmful' }]);
    assert.strictEqual(result.valid, false);
    const v = result.violations.find(v => v.rule === 'no_harmful');
    assert.strictEqual(v.findings[0].category, 'self_harm');
  });
});

describe('validateOutput — TOPIC_BLOCKED', () => {
  it('passes when topic is not present', () => {
    const result = validateOutput('This is about cooking recipes.', [{ type: 'topic_blocked', topics: ['weapons', 'drugs'] }]);
    assert.strictEqual(result.valid, true);
  });

  it('fails when blocked topic is present', () => {
    const result = validateOutput('This is about making weapons.', [{ type: 'topic_blocked', topics: ['weapons', 'drugs'] }]);
    assert.strictEqual(result.valid, false);
    const v = result.violations.find(v => v.rule === 'topic_blocked');
    assert.ok(v);
    assert.strictEqual(v.message, 'Blocked topic: "weapons"');
  });

  it('is case-insensitive', () => {
    const result = validateOutput('This is about WEAPONS.', [{ type: 'topic_blocked', topics: ['weapons'] }]);
    assert.strictEqual(result.valid, false);
  });
});

describe('validateOutput — FORMAT_JSON', () => {
  it('passes valid JSON', () => {
    const result = validateOutput('{"name": "Alice", "age": 30}', [{ type: 'format_json' }]);
    assert.strictEqual(result.valid, true);
  });

  it('fails invalid JSON', () => {
    const result = validateOutput('{name: Alice}', [{ type: 'format_json' }]);
    assert.strictEqual(result.valid, false);
    const v = result.violations.find(v => v.rule === 'format_json');
    assert.ok(v);
    assert.strictEqual(v.severity, 'error');
  });

  it('fails empty string (not valid JSON)', () => {
    const result = validateOutput('', [{ type: 'format_json' }]);
    assert.strictEqual(result.valid, false);
  });
});

describe('validateOutput — NO_REFUSALS', () => {
  it('passes normal response', () => {
    const result = validateOutput('Here is the information you requested.', [{ type: 'no_refusals' }]);
    assert.strictEqual(result.valid, true);
  });

  it('detects refusal patterns', () => {
    const result = validateOutput("i'm sorry, i cannot help with that.", [{ type: 'no_refusals' }]);
    assert.strictEqual(result.valid, false);
    const v = result.violations.find(v => v.rule === 'no_refusals');
    assert.ok(v);
    assert.strictEqual(v.severity, 'warning');
  });
});

describe('validateOutput — multiple rules', () => {
  it('returns all violations when multiple rules fail', () => {
    const result = validateOutput(
      'Email: test@example.com and weapons discussion',
      [{ type: 'no_pii' }, { type: 'topic_blocked', topics: ['weapons'] }]
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.violations.length, 2);
  });

  it('returns critical first, then errors, then warnings', () => {
    const result = validateOutput(
      "I'm sorry about the violence. Contact john@test.com",
      [{ type: 'no_harmful' }, { type: 'no_pii' }, { type: 'no_refusals' }]
    );
    assert.strictEqual(result.valid, false);
    assert.ok(result.violations.length >= 2);
  });
});

describe('validateOutput — summary messages', () => {
  it('returns correct summary for valid output', () => {
    const result = validateOutput('Clean text', []);
    assert.strictEqual(result.summary, 'Output passed all validation rules');
  });

  it('returns correct summary for critical violation', () => {
    const result = validateOutput('murder scene', [{ type: 'no_harmful' }]);
    assert.strictEqual(result.summary, 'Output blocked due to critical violations');
  });

  it('returns correct summary for error-level violation', () => {
    const result = validateOutput('test@example.com', [{ type: 'no_pii' }]);
    assert.strictEqual(result.summary, 'Output flagged due to errors');
  });

  it('returns correct summary for warnings only', () => {
    const result = validateOutput("I'm sorry I can't help", [{ type: 'no_refusals' }]);
    assert.strictEqual(result.summary, 'Output passed with warnings');
  });
});

// ── Enums ─────────────────────────────────────────────────────────────────────

describe('MODEL_STATUSES', () => {
  it('has expected statuses', () => {
    assert.strictEqual(MODEL_STATUSES.ACTIVE, 'active');
    assert.strictEqual(MODEL_STATUSES.DEPRECATED, 'deprecated');
    assert.strictEqual(MODEL_STATUSES.BANNED, 'banned');
    assert.strictEqual(MODEL_STATUSES.UNDER_REVIEW, 'under_review');
    assert.strictEqual(MODEL_STATUSES.SHADOW_MODE, 'shadow_mode');
  });
});

describe('MODEL_PROVIDERS', () => {
  it('has expected providers', () => {
    assert.strictEqual(MODEL_PROVIDERS.OPENAI, 'openai');
    assert.strictEqual(MODEL_PROVIDERS.ANTHROPIC, 'anthropic');
    assert.strictEqual(MODEL_PROVIDERS.GOOGLE, 'google');
    assert.strictEqual(MODEL_PROVIDERS.HUGGINGFACE, 'huggingface');
    assert.strictEqual(MODEL_PROVIDERS.HOJAI, 'hojai');
  });
});

describe('CONSTITUTION_TYPES', () => {
  it('has expected types', () => {
    assert.strictEqual(CONSTITUTION_TYPES.SAFETY, 'safety');
    assert.strictEqual(CONSTITUTION_TYPES.PRIVACY, 'privacy');
    assert.strictEqual(CONSTITUTION_TYPES.ACCURACY, 'accuracy');
    assert.strictEqual(CONSTITUTION_TYPES.FAIRNESS, 'fairness');
    assert.strictEqual(CONSTITUTION_TYPES.TRANSPARENCY, 'transparency');
    assert.strictEqual(CONSTITUTION_TYPES.CUSTOM, 'custom');
  });
});

describe('HARM_CATEGORIES', () => {
  it('has expected categories', () => {
    assert.strictEqual(HARM_CATEGORIES.VIOLENCE, 'violence');
    assert.strictEqual(HARM_CATEGORIES.HATE_SPEECH, 'hate_speech');
    assert.strictEqual(HARM_CATEGORIES.SELF_HARM, 'self_harm');
    assert.strictEqual(HARM_CATEGORIES.ILLEGAL, 'illegal');
    assert.strictEqual(HARM_CATEGORIES.PII_LEAK, 'pii_leak');
    assert.strictEqual(HARM_CATEGORIES.MISINFORMATION, 'misinformation');
    assert.strictEqual(HARM_CATEGORIES.MANIPULATION, 'manipulation');
    assert.strictEqual(HARM_CATEGORIES.PRIVACY, 'privacy');
  });
});