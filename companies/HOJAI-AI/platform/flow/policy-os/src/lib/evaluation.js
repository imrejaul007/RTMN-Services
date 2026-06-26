/**
 * PolicyOS — Core Evaluation Engine
 *
 * Contains all the pure evaluation logic: condition matching, rule evaluation,
 * policy composition, exception handling, and auto-resolution.
 */

import { safeEval } from './expression-evaluator.js';

// =================================================================
// Path Utilities
// =================================================================

export function getPath(obj, path) {
  if (obj == null) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

// =================================================================
// Condition Evaluator
// =================================================================

export function compareValues(actual, op, expected) {
  switch (op) {
    case 'eq':
    case 'equals':      return actual === expected;
    case 'neq':
    case 'notEquals':   return actual !== expected;
    case 'gt':          return typeof actual === 'number' && actual > expected;
    case 'gte':         return typeof actual === 'number' && actual >= expected;
    case 'lt':          return typeof actual === 'number' && actual < expected;
    case 'lte':         return typeof actual === 'number' && actual <= expected;
    case 'in':          return Array.isArray(expected) && expected.includes(actual);
    case 'notIn':       return Array.isArray(expected) && !expected.includes(actual);
    case 'contains':    return Array.isArray(actual) && actual.includes(expected);
    case 'notContains': return Array.isArray(actual) && !actual.includes(expected);
    case 'startsWith':  return typeof actual === 'string' && actual.startsWith(expected);
    case 'endsWith':   return typeof actual === 'string' && actual.endsWith(expected);
    case 'exists':      return actual !== undefined && actual !== null;
    case 'notExists':  return actual === undefined || actual === null;
    case 'truthy':     return !!actual;
    case 'falsy':       return !actual;
    default:            return false;
  }
}

export function evaluateCondition(cond, context) {
  if (cond == null || typeof cond !== 'object') return true;
  for (const [key, spec] of Object.entries(cond)) {
    if (key.startsWith('context.')) {
      const path = key.slice('context.'.length);
      const actual = getPath(context, path);
      if (typeof spec === 'object' && spec !== null && !Array.isArray(spec)) {
        for (const [op, expected] of Object.entries(spec)) {
          if (!compareValues(actual, op, expected)) return false;
        }
      } else {
        if (actual !== spec) return false;
      }
    } else if (key.startsWith('user.')) {
      const path = key.slice('user.'.length);
      const user = context.user || {};
      const actual = getPath(user, path);
      if (typeof spec === 'object' && spec !== null && !Array.isArray(spec)) {
        for (const [op, expected] of Object.entries(spec)) {
          if (!compareValues(actual, op, expected)) return false;
        }
      } else {
        if (actual !== spec) return false;
      }
    } else {
      const actual = getPath(context, key);
      if (typeof spec === 'object' && spec !== null && !Array.isArray(spec)) {
        for (const [op, expected] of Object.entries(spec)) {
          if (!compareValues(actual, op, expected)) return false;
        }
      } else {
        if (actual !== spec) return false;
      }
    }
  }
  return true;
}

export function evaluateRule(rule, context) {
  return evaluateCondition(rule.if, context);
}

// =================================================================
// Suggestion Generator
// =================================================================

export function generateSuggestions(policy, context, reason) {
  const suggestions = [];
  const userId = context.user && context.user.id;
  const approvers = (policy.approvals && policy.approvals.requiredApprovers) || [];
  if (approvers.length > 0) {
    suggestions.push(`Request approval from ${approvers.join(', ')} via strategy '${policy.approvals.strategy}'`);
  }
  if (typeof context.amount === 'number') {
    if (context.amount > 5000) {
      suggestions.push('Reduce amount to <= 5000 to be auto-approved');
    } else {
      suggestions.push('Verify amount is within budget limits');
    }
  }
  if (context.user && typeof context.user.trustScore === 'number' && context.user.trustScore < 50) {
    suggestions.push(`Increase trust score to >= 50 (currently ${context.user.trustScore})`);
  }
  if (context.action && context.action.startsWith('ai.')) {
    suggestions.push('Verify AI confidence is >= 0.7');
  }
  if (context.action && ['twin.share', 'twin.export', 'twin.delegate'].includes(context.action)) {
    suggestions.push('Obtain owner consent before sharing the twin');
  }
  if (context.action && ['data.export', 'data.bulk_download'].includes(context.action)) {
    suggestions.push('Reduce record count to <= 100 or request approval');
  }
  if (context.action && context.action.startsWith('skill.')) {
    suggestions.push('Ensure the user has the required scope for this skill');
  }
  if (userId && reason) {
    suggestions.push('Contact ${userId} to verify identity');
  }
  return Array.from(new Set(suggestions)).slice(0, 6);
}

// =================================================================
// Policy Evaluator
// =================================================================

export function evaluatePolicy(policy, context) {
  const result = {
    allowed: false,
    reasons: [],
    suggestions: [],
    policyUsed: policy ? policy.id : null,
    evaluatedAt: new Date().toISOString(),
    matchedRule: null,
  };

  if (!policy) {
    result.reasons.push('No matching policy found - fail-closed default');
    result.suggestions.push('Define a policy for this action/category');
    return result;
  }
  if (policy.status !== 'published') {
    result.reasons.push(`Policy '${policy.id}' is in status '${policy.status}' and not enforced`);
    result.suggestions.push(`Publish policy '${policy.id}' to enforce it`);
    return result;
  }

  const nowIso = new Date().toISOString();
  if (policy.effectiveFrom && nowIso < policy.effectiveFrom) {
    result.reasons.push(`Policy '${policy.id}' is not yet effective (effective from ${policy.effectiveFrom})`);
    result.suggestions.push(`Wait until ${policy.effectiveFrom} or remove effectiveFrom`);
    return result;
  }
  if (policy.effectiveUntil && nowIso > policy.effectiveUntil) {
    result.reasons.push(`Policy '${policy.id}' has expired (effective until ${policy.effectiveUntil})`);
    result.suggestions.push('Archive or extend the policy');
    return result;
  }

  for (const rule of (policy.rules || [])) {
    if (evaluateRule(rule, context)) {
      result.matchedRule = rule;
      result.allowed = !!rule.then.allow;
      if (!result.allowed && rule.then.action) {
        result.reasons.push(`Rule denied: ${rule.then.action}`);
      }
      break;
    }
  }

  if (!result.matchedRule) {
    result.allowed = false;
    result.reasons.push(`No rule matched for action '${context.action || 'unknown'}' in policy '${policy.id}'`);
    result.suggestions.push('Add a rule covering this case');
  }

  if (!result.allowed) {
    result.suggestions = [...result.suggestions, ...generateSuggestions(policy, context, result.reasons[0])];
    result.suggestions = Array.from(new Set(result.suggestions));
  }

  return result;
}

// =================================================================
// Exception Handler
// =================================================================

export function applyExceptions(policy, context, evalResult) {
  if (!policy.exceptions || policy.exceptions.length === 0) return evalResult;
  for (const ex of policy.exceptions) {
    try {
      const result = safeEval(ex.condition, context, context.user || {});
      if (result) {
        evalResult.allowed = true;
        evalResult.reasons.push(`Exception applied: ${ex.name}`);
        return evalResult;
      }
    } catch (e) {
      console.warn(`[policy-os] Exception '${ex.name}' failed to evaluate:`, e.message);
    }
  }
  return evalResult;
}

// =================================================================
// Policy Auto-Resolution
// =================================================================

export function findPolicy(policyId, context, policies) {
  if (policyId && policyId !== 'default' && policies.has(policyId)) {
    return policies.get(policyId);
  }
  const action = context && context.action;
  const categoryHint = context && context.category;
  if (!action && !categoryHint) return null;

  const candidates = Array.from(policies.values()).filter((p) => p.status === 'published');
  if (categoryHint) {
    const byCat = candidates.find((p) => p.category === categoryHint);
    if (byCat) return byCat;
  }
  if (action) {
    const byAction = candidates.find((p) => {
      const conds = p.conditions || {};
      const keys = Object.keys(conds);
      return keys.some((k) => {
        const spec = conds[k];
        if (typeof spec !== 'object' || spec == null) return false;
        if (spec.startsWith && k.endsWith('action')) return action.startsWith(spec.startsWith);
        if (spec.in && k.endsWith('action')) return spec.in.includes(action);
        return false;
      });
    });
    if (byAction) return byAction;
  }
  return null;
}

// =================================================================
// Policy Composition
// =================================================================

export function evaluateComposition(composition, context, policies) {
  const memberIds = composition.policyIds || [];
  const mode = composition.mode || 'allOf';
  const threshold = typeof composition.threshold === 'number' ? composition.threshold : 0.5;

  if (memberIds.length === 0) {
    return { allowed: false, reasons: ['Composition has no member policies'], memberResults: [] };
  }

  const memberResults = [];
  let allows = 0;
  for (const mid of memberIds) {
    const mp = policies.get(mid);
    if (!mp) {
      memberResults.push({ policyId: mid, allowed: false, error: 'not-found' });
      continue;
    }
    const r = evaluatePolicy(mp, context);
    const final = applyExceptions(mp, context, r);
    memberResults.push({ policyId: mid, allowed: final.allowed, reasons: final.reasons });
    if (final.allowed) allows++;
  }

  let allowed = false;
  if (mode === 'anyOf') allowed = allows >= 1;
  else if (mode === 'allOf') allowed = allows === memberIds.length;
  else if (mode === 'majority') allowed = (allows / memberIds.length) >= threshold;

  return { allowed, mode, allows, total: memberIds.length, memberResults };
}
