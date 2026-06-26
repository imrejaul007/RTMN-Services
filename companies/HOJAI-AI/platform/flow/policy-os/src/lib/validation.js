/**
 * PolicyOS — Policy Schema Validation
 *
 * Lightweight, zero-dependency validator for Policy bodies.
 * Returns {ok, errors[]}. Used by all write endpoints.
 */

export const CATEGORIES = [
  'security', 'business', 'commerce', 'ai',
  'financial', 'privacy', 'memory', 'twin', 'skill',
];

export const POLICY_STATUSES = ['draft', 'review', 'published', 'archived', 'retired'];

export const APPROVAL_STRATEGIES = ['single', 'multi', 'sequential', 'parallel', 'emergency'];

function isStr(v, max = 200) { return typeof v === 'string' && v.length > 0 && v.length <= max; }
function isInt(v) { return Number.isInteger(v); }
function isIsoDate(v) {
  if (typeof v !== 'string') return false;
  const d = new Date(v);
  return !isNaN(d.getTime()) && d.toISOString() === v;
}

function validateRuleShape(rule, errors, path) {
  if (!rule || typeof rule !== 'object') { errors.push(`${path}: rule must be an object`); return; }
  if (rule.if == null) errors.push(`${path}: rule.if is required`);
  if (!rule.then || typeof rule.then !== 'object') errors.push(`${path}: rule.then is required`);
  if (rule.then && rule.then.allow !== undefined && typeof rule.then.allow !== 'boolean') {
    errors.push(`${path}: rule.then.allow must be boolean`);
  }
}

export function validatePolicyBody(body, { partial = false } = {}) {
  const errors = [];
  if (!partial) {
    if (!isStr(body.name, 200)) errors.push('name: required, string 1-200 chars');
    if (!isStr(body.category, 50)) errors.push('category: required, string 1-50 chars');
    else if (!CATEGORIES.includes(body.category)) errors.push(`category: must be one of ${CATEGORIES.join(', ')}`);
  } else {
    if (body.name !== undefined && !isStr(body.name, 200)) errors.push('name: string 1-200 chars');
    if (body.category !== undefined) {
      if (!isStr(body.category, 50)) errors.push('category: string 1-50 chars');
      else if (!CATEGORIES.includes(body.category)) errors.push(`category: must be one of ${CATEGORIES.join(', ')}`);
    }
  }
  if (body.status !== undefined && !POLICY_STATUSES.includes(body.status)) {
    errors.push(`status: must be one of ${POLICY_STATUSES.join(', ')}`);
  }
  if (body.priority !== undefined && !isInt(body.priority)) {
    errors.push('priority: must be integer');
  }
  if (body.approvals !== undefined) {
    if (typeof body.approvals !== 'object') errors.push('approvals: must be object');
    else if (body.approvals.strategy && !APPROVAL_STRATEGIES.includes(body.approvals.strategy)) {
      errors.push(`approvals.strategy: must be one of ${APPROVAL_STRATEGIES.join(', ')}`);
    }
    if (body.approvals.requiredApprovers !== undefined && !Array.isArray(body.approvals.requiredApprovers)) {
      errors.push('approvals.requiredApprovers: must be array');
    }
  }
  if (body.effectiveFrom !== undefined && !isIsoDate(body.effectiveFrom)) {
    errors.push('effectiveFrom: must be ISO-8601 string');
  }
  if (body.effectiveUntil !== undefined && !isIsoDate(body.effectiveUntil)) {
    errors.push('effectiveUntil: must be ISO-8601 string');
  }
  if (body.effectiveFrom && body.effectiveUntil && body.effectiveFrom > body.effectiveUntil) {
    errors.push('effectiveFrom must be <= effectiveUntil');
  }
  if (body.rules !== undefined) {
    if (!Array.isArray(body.rules)) errors.push('rules: must be array');
    else body.rules.forEach((r, i) => validateRuleShape(r, errors, `rules[${i}]`));
  }
  if (body.composition !== undefined) {
    if (typeof body.composition !== 'object') errors.push('composition: must be object');
    else {
      if (body.composition.mode && !['anyOf', 'allOf', 'majority'].includes(body.composition.mode)) {
        errors.push('composition.mode: must be one of anyOf|allOf|majority');
      }
      if (body.composition.policyIds !== undefined && !Array.isArray(body.composition.policyIds)) {
        errors.push('composition.policyIds: must be array of policy ids');
      }
      if (body.composition.mode === 'majority' && (typeof body.composition.threshold !== 'number' || body.composition.threshold <= 0 || body.composition.threshold > 1)) {
        errors.push('composition.threshold: for mode=majority, must be number 0 < t <= 1');
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
