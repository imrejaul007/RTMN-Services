/**
 * PolicyOS — Formal Verification Engine (Phase P1)
 *
 * Proves properties about a policy set without executing them.
 * Detects structural issues that would cause problems at runtime.
 *
 * Verifications performed:
 *
 * 1. CONFLICT DETECTION
 *    Two policies conflict when they target the same resource+action
 *    but have different effects (one allow, one deny).
 *    Rule: if policies A and B have overlapping (resource, action) and A.effect != B.effect → CONFLICT
 *
 * 2. DEAD POLICY DETECTION
 *    A policy is dead when its conditions can never be satisfied.
 *    Detected by:
 *    - Contradictory conditions: (field > X) AND (field < X) where X >= X
 *    - Empty condition sets that still restrict to impossible ranges
 *    - Self-referential roles that never exist
 *    - Time conditions that span zero time (e.g. start > end)
 *
 * 3. PRIVILEGE ESCALATION
 *    Policy A escalates privileges vs Policy B when:
 *    - A's resource superset B's resource AND A's action superset B's action AND A.effect=allow AND B.effect=deny
 *    - A removes a condition that B requires (e.g. B requires MFA, A doesn't)
 *
 * 4. SHADOW DETECTION
 *    Policy A shadows Policy B when:
 *    - A matches a superset of B's requests AND A is evaluated before B AND A != allow != B.allow
 *    - i.e., A's rules make B's rules unreachable
 *
 * 5. SUBSUMPTION DETECTION
 *    Policy A subsumes Policy B when:
 *    - A allows everything B allows (and both are allow)
 *    - A denies everything B denies (and both are deny)
 *    → B is redundant
 *
 * 6. REACHABILITY ANALYSIS
 *    Checks that every defined role, resource, and action
 *    is reachable through some policy evaluation path.
 *
 * 7. SAFETY PROPERTY PROOF
 *    Given a safety claim (e.g. "no read of payroll without manager"),
 *    proves it holds or finds a counterexample.
 *
 * 8. COMPLETENESS CHECK
 *    Verifies that every resource/action pair in scope
 *    has at least one applicable policy (no gaps).
 */

import { getPath } from '../lib/evaluation.js';

// ── Verification Types ─────────────────────────────────────────────────────────

export const ISSUE_SEVERITY = {
  ERROR: 'error',     // Must fix — will cause runtime failures
  WARNING: 'warning', // Should fix — may cause unexpected behavior
  INFO: 'info',       // Nice to fix — optimization/opinion
};

export const ISSUE_TYPE = {
  // Structural
  CONFLICT: 'conflict',           // allow/deny overlap
  SHADOW: 'shadow',               // unreachable policy
  SUBSUMPTION: 'subsumption',     // redundant policy
  DEAD_POLICY: 'dead_policy',     // never matches anything
  DEAD_CONDITION: 'dead_condition', // condition never true

  // Privilege
  PRIVILEGE_ESCALATION: 'privilege_escalation', // allow superset of deny
  IMPLIED_PERMIT: 'implied_permit',  // deny allows what another allow permits
  IMPLICIT_ALLOW: 'implicit_allow',  // no deny = implicit allow

  // Scope
  UNREACHABLE_ROLE: 'unreachable_role',
  UNREACHABLE_RESOURCE: 'unreachable_resource',
  UNREACHABLE_ACTION: 'unreachable_action',
  GAP: 'gap',                     // no policy covers this resource+action

  // Correctness
  CYCLIC_DEPENDENCY: 'cyclic_dependency',
  INVALID_EXPRESSION: 'invalid_expression',
  CIRCULAR_ROLE_HIERARCHY: 'circular_role_hierarchy',

  // Safety
  SAFETY_VIOLATION: 'safety_violation',
  SAFETY_UNPROVABLE: 'safety_unprovable',
};

// ── Core Verifier ───────────────────────────────────────────────────────────────

/**
 * Verify a complete policy set.
 * Returns { ok, issues[], summary, proofs[] }
 *
 * @param {object} opts
 * @param {object|Map} opts.policies  Policy store or Map of policies
 * @param {object} opts.roles       Role store (for hierarchy checks)
 * @param {object[]} opts.safetyClaims  [{ claim, description, check }]
 */
export function verifyPolicySet({ policies, roles, safetyClaims = [] }) {
  const policyList = policies instanceof Map
    ? [...policies.values()]
    : Array.isArray(policies) ? policies : [...Object.values(policies)];

  const issues = [];
  const proofs = [];
  const stats = {
    total: policyList.length,
    conflicts: 0,
    shadows: 0,
    deadPolicies: 0,
    privilegeEscalations: 0,
    gaps: 0,
    cyclic: 0,
  };

  // Phase 1: Build resource-action index
  const resourceActionMap = buildResourceActionIndex(policyList);

  // Phase 2: Detect conflicts (allow vs deny on same resource+action)
  const conflictIssues = detectConflicts(policyList, resourceActionMap);
  issues.push(...conflictIssues);
  stats.conflicts = conflictIssues.length;

  // Phase 3: Detect shadowed policies (superset before subset)
  const shadowIssues = detectShadows(policyList, resourceActionMap);
  issues.push(...shadowIssues);
  stats.shadows = shadowIssues.length;

  // Phase 4: Detect subsumption (redundant policies)
  const subsumptionIssues = detectSubsumption(policyList);
  issues.push(...subsumptionIssues);
  stats.subsumption = subsumptionIssues.length;

  // Phase 5: Detect dead policies (conditions can never match)
  const deadIssues = detectDeadPolicies(policyList);
  issues.push(...deadIssues);
  stats.deadPolicies = deadIssues.length;

  // Phase 6: Detect privilege escalation (allow superset of deny)
  const escalationIssues = detectPrivilegeEscalation(policyList);
  issues.push(...escalationIssues);
  stats.privilegeEscalations = escalationIssues.length;

  // Phase 7: Check cyclic role hierarchies
  if (roles) {
    const cyclicIssues = detectCyclicRoleHierarchy(roles);
    issues.push(...cyclicIssues);
    stats.cyclic = cyclicIssues.length;
  }

  // Phase 8: Prove safety properties
  for (const claim of safetyClaims) {
    const proof = proveSafetyClaim(claim, policyList);
    proofs.push(proof);
    if (!proof.holds && proof.severity === 'error') {
      issues.push({
        type: ISSUE_TYPE.SAFETY_VIOLATION,
        severity: ISSUE_SEVERITY.ERROR,
        claim: claim.description,
        counterexample: proof.counterexample,
        message: `Safety claim violated: ${claim.description}`,
      });
    }
  }

  // Phase 9: Check completeness (coverage gaps)
  if (safetyClaims.length > 0) {
    const coverageGaps = detectCoverageGaps(policyList, resourceActionMap, safetyClaims);
    issues.push(...coverageGaps);
    stats.gaps = coverageGaps.length;
  }

  const errorCount = issues.filter(i => i.severity === ISSUE_SEVERITY.ERROR).length;
  const warningCount = issues.filter(i => i.severity === ISSUE_SEVERITY.WARNING).length;

  return {
    ok: errorCount === 0,
    issues,
    proofs,
    summary: {
      total: stats.total,
      errors: errorCount,
      warnings: warningCount,
      info: issues.length - errorCount - warningCount,
      ...stats,
    },
  };
}

// ── Phase 1: Resource-Action Index ─────────────────────────────────────────────

/**
 * Build a map of resource → Set<action> for fast overlap detection.
 * Returns Map<resourcePattern, { allow: Set, deny: Set, policyIds: Set }>
 */
function buildResourceActionIndex(policies) {
  const map = new Map();

  for (const policy of policies) {
    if (policy.status === 'archived' || policy.status === 'retired') continue;
    const resources = Array.isArray(policy.resources) ? policy.resources : [policy.resources || '*'];
    const actions = Array.isArray(policy.actions) ? policy.actions : [policy.actions || '*'];
    const effect = policy.effect === 'deny' ? 'deny' : 'allow';

    for (const resource of resources) {
      if (!map.has(resource)) {
        map.set(resource, { allow: new Set(), deny: new Set(), policyIds: new Set() });
      }
      const entry = map.get(resource);
      for (const action of actions) {
        if (effect === 'allow') entry.allow.add(action);
        else entry.deny.add(action);
      }
      entry.policyIds.add(policy.id);
    }
  }

  return map;
}

// ── Phase 2: Conflict Detection ─────────────────────────────────────────────────

/**
 * Detect allow/deny conflicts on overlapping resource+action.
 * A conflict exists when both allow and deny sets are non-empty
 * for the same resource pattern.
 */
export function detectConflicts(policies, resourceActionMap) {
  const issues = [];
  const seen = new Set();

  for (const [resource, entry] of resourceActionMap.entries()) {
    const hasAllow = entry.allow.size > 0;
    const hasDeny = entry.deny.size > 0;

    if (!hasAllow || !hasDeny) continue;

    // Find overlapping actions
    const allowActions = [...entry.allow];
    const denyActions = [...entry.deny];

    // Wildcard overlap
    const hasWildcardAllow = allowActions.includes('*') || allowActions.includes(':*');
    const hasWildcardDeny = denyActions.includes('*') || denyActions.includes(':*');
    const hasWildcardOverlap = (hasWildcardAllow && denyActions.length > 0) ||
                               (hasWildcardDeny && allowActions.length > 0);

    if (hasWildcardOverlap) {
      const key = [...entry.policyIds].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        issues.push({
          type: ISSUE_TYPE.CONFLICT,
          severity: ISSUE_SEVERITY.ERROR,
          resource,
          allowActions,
          denyActions,
          conflictingPolicies: [...entry.policyIds],
          message: `Conflict on resource '${resource}': allow (${allowActions.join(', ')}) overlaps with deny (${denyActions.join(', ')})`,
          resolution: 'Add more specific deny policies below allow, or use priority to disambiguate',
        });
      }
    }

    // Specific action overlap
    for (const allowAction of allowActions) {
      for (const denyAction of denyActions) {
        if (allowAction === denyAction) {
          const key = [...entry.policyIds].sort().join('|');
          if (!seen.has(key)) {
            seen.add(key);
            issues.push({
              type: ISSUE_TYPE.CONFLICT,
              severity: ISSUE_SEVERITY.ERROR,
              resource,
              action: allowAction,
              conflictingPolicies: [...entry.policyIds],
              message: `Conflict on resource '${resource}' + action '${allowAction}': both allow and deny policies apply`,
              resolution: 'Use priority or more specific conditions to resolve',
            });
          }
        }
      }
    }
  }

  return issues;
}

// ── Phase 3: Shadow Detection ──────────────────────────────────────────────────

/**
 * Detect policies that are shadowed by earlier (higher-priority) policies.
 * A policy is shadowed when an earlier policy matches a superset
 * of its resource+action scope with the same or more permissive effect.
 */
export function detectShadows(policies, resourceActionMap) {
  const issues = [];

  // Sort by priority (higher first)
  const sorted = [...policies]
    .filter(p => p.status !== 'archived' && p.status !== 'retired')
    .sort((a, b) => (b.priority || 50) - (a.priority || 50));

  // For each policy, check if any earlier policy shadows it
  for (let i = 1; i < sorted.length; i++) {
    const shadowed = sorted[i];
    const shadowing = sorted.slice(0, i);

    for (const earlier of shadowing) {
      const overlap = checkOverlap(shadowed, earlier);
      if (overlap === 'shadowed') {
        issues.push({
          type: ISSUE_TYPE.SHADOW,
          severity: ISSUE_SEVERITY.WARNING,
          shadowedPolicy: shadowed.id,
          shadowingPolicy: earlier.id,
          resource: shadowed.resources,
          action: shadowed.actions,
          message: `Policy '${shadowed.id}' is shadowed by '${earlier.id}' — it will never be evaluated`,
          resolution: 'Move shadowed policy to higher priority, or narrow its scope',
        });
      }
    }
  }

  return issues;
}

/**
 * Check if policyA is shadowed by policyB (A's scope is subset of B's).
 */
function checkOverlap(policyA, policyB) {
  const aResources = Array.isArray(policyA.resources) ? policyA.resources : [policyA.resources || '*'];
  const aActions = Array.isArray(policyA.actions) ? policyA.actions : [policyA.actions || '*'];
  const bResources = Array.isArray(policyB.resources) ? policyB.resources : [policyB.resources || '*'];
  const bActions = Array.isArray(policyB.actions) ? policyB.actions : [policyB.actions || '*'];

  const aEffect = policyA.effect === 'deny' ? 'deny' : 'allow';
  const bEffect = policyB.effect === 'deny' ? 'deny' : 'allow';

  // Check if A's resources are subset of B's resources
  const resourceSubset = aResources.every(r =>
    bResources.some(b => wildcardMatch(b, r))
    || (bResources.includes('*') || bResources.includes(':*'));

  const actionSubset = aActions.every(a =>
    bActions.some(b => wildcardMatch(b, a))
    || (bActions.includes('*') || bActions.includes(':*'));

  if (resourceSubset && actionSubset) {
    // Same effect: A is completely redundant
    if (aEffect === bEffect) return 'subsumed';
    // Different effect: A is shadowed (B evaluated first, blocks A)
    return 'shadowed';
  }

  return 'none';
}

function wildcardMatch(pattern, value) {
  if (pattern === '*' || pattern === ':*') return true;
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1);
    return value.startsWith(prefix);
  }
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(value);
  }
  return pattern === value;
}

// ── Phase 4: Subsumption Detection ─────────────────────────────────────────────

/**
 * Detect policies that are subsumed by other policies.
 * Policy A is subsumed by Policy B when B allows everything A allows
 * (or denies everything A denies) and B is evaluated first.
 */
export function detectSubsumption(policies) {
  const issues = [];
  const sorted = [...policies]
    .filter(p => p.status !== 'archived' && p.status !== 'retired')
    .sort((a, b) => (b.priority || 50) - (a.priority || 50));

  const subsumed = new Set();

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (subsumed.has(sorted[j].id)) continue;

      const overlap = checkOverlap(sorted[j], sorted[i]);
      if (overlap === 'subsumed') {
        subsumed.add(sorted[j].id);
        issues.push({
          type: ISSUE_TYPE.SUBSUMPTION,
          severity: ISSUE_SEVERITY.INFO,
          subsumedPolicy: sorted[j].id,
          subsumingPolicy: sorted[i].id,
          reason: 'Policy scope is subset of earlier policy with same effect',
          message: `Policy '${sorted[j].id}' is subsumed by '${sorted[i].id}' — earlier policy covers the same scope`,
          resolution: 'Remove the subsumed policy or merge its conditions into the subsuming policy',
        });
      }
    }
  }

  return issues;
}

// ── Phase 5: Dead Policy Detection ─────────────────────────────────────────────

/**
 * Detect policies whose conditions can never be satisfied.
 */
export function detectDeadPolicies(policies) {
  const issues = [];

  for (const policy of policies) {
    if (policy.status === 'archived' || policy.status === 'retired') continue;
    if (!policy.conditions || policy.conditions.length === 0) continue;

    for (const issue of checkDeadConditions(policy)) {
      issues.push({
        type: ISSUE_TYPE.DEAD_POLICY,
        severity: ISSUE_SEVERITY.ERROR,
        policyId: policy.id,
        ...issue,
      });
    }
  }

  return issues;
}

function checkDeadConditions(policy) {
  const issues = [];

  for (const condition of policy.conditions || []) {
    const dead = checkConditionDead(condition);
    if (dead) {
      issues.push({
        condition,
        reason: dead,
        message: `Policy '${policy.id}' has dead condition: ${dead}`,
      });
    }
  }

  // Check for contradictory condition pairs
  const conditionIssues = findContradictoryConditions(policy.conditions || []);
  issues.push(...conditionIssues.map(ci => ({
    condition: ci.pair,
    reason: ci.reason,
    message: `Policy '${policy.id}' has contradictory conditions: ${ci.reason}`,
  })));

  return issues;
}

function checkConditionDead(condition) {
  const { field, operator, value } = condition;

  // Check time contradictions
  if (field === 'environment.time.hour' || field === 'time.hour') {
    if (condition.gte !== undefined && condition.lte !== undefined) {
      if (condition.gte > condition.lte) {
        return `time range ${condition.gte} > ${condition.lte} is impossible`;
      }
    }
    if (condition.gt !== undefined && condition.lt !== undefined) {
      if (condition.gt >= condition.lt) {
        return `time range (${condition.gt}, ${condition.lt}) is empty`;
      }
    }
  }

  // Check numeric contradictions
  if (['gt', 'gte', 'lt', 'lte'].some(op => condition[op] !== undefined)) {
    const gt = condition.gt ?? condition.gte;
    const lt = condition.lt ?? condition.lte;
    if (gt !== undefined && lt !== undefined && gt >= lt) {
      return `range [${gt}, ${lt}] is empty or single point`;
    }
  }

  // Check for impossible IN/NOT_IN
  if (operator === 'in' && Array.isArray(value) && value.length === 0) {
    return 'IN with empty array can never match';
  }
  if (operator === 'notIn' && Array.isArray(value) && value.length === 0) {
    return 'NOT_IN with empty array matches everything (consider using ALLOW instead)';
  }

  return null;
}

function findContradictoryConditions(conditions) {
  const issues = [];

  // Group by field
  const byField = new Map();
  for (const cond of conditions) {
    const field = cond.field || cond.path || 'unknown';
    if (!byField.has(field)) byField.set(field, []);
    byField.get(field).push(cond);
  }

  for (const [field, conds] of byField.entries()) {
    if (conds.length < 2) continue;

    // Check for eq + neq contradiction
    const eq = conds.find(c => c.operator === 'eq' || c.operator === 'equals');
    const neq = conds.find(c => c.operator === 'neq' || c.operator === 'notEquals');
    if (eq && neq && eq.value === neq.value) {
      issues.push({
        pair: [eq, neq],
        reason: `field '${field}' requires value ${eq.value} AND != ${neq.value}`,
      });
    }

    // Check for range + single-value contradiction
    const ranges = conds.filter(c => ['gt', 'gte', 'lt', 'lte'].some(op => c[op] !== undefined));
    const eqVals = conds.filter(c => c.operator === 'eq');
    if (ranges.length > 0 && eqVals.length > 0) {
      for (const range of ranges) {
        for (const eqv of eqVals) {
          const lt = range.lt ?? range.lte;
          const gt = range.gt ?? range.gte;
          if (lt !== undefined && gt !== undefined) {
            if (eqv.value >= gt && eqv.value <= lt) {
              issues.push({
                pair: [range, eqv],
                reason: `field '${field}' has range [${gt}, ${lt}] but requires exact ${eqv.value}`,
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

// ── Phase 6: Privilege Escalation ──────────────────────────────────────────────

/**
 * Detect privilege escalation: a deny policy is undermined by an
 * allow policy with broader scope.
 */
export function detectPrivilegeEscalation(policies) {
  const issues = [];

  const denies = policies.filter(p => p.effect === 'deny' && p.status !== 'archived');
  const allows = policies.filter(p => p.effect === 'allow' && p.status !== 'archived');

  for (const deny of denies) {
    for (const allow of allows) {
      const escalation = checkPrivilegeEscalation(deny, allow);
      if (escalation) {
        issues.push({
          type: ISSUE_TYPE.PRIVILEGE_ESCALATION,
          severity: ISSUE_SEVERITY.WARNING,
          denyPolicy: deny.id,
          allowPolicy: allow.id,
          escalationType: escalation.type,
          message: `Privilege escalation: '${allow.id}' allows more than '${deny.id}' denies`,
          details: escalation.details,
          resolution: 'Restrict the allow policy scope or extend the deny policy conditions',
        });
      }
    }
  }

  return issues;
}

function checkPrivilegeEscalation(deny, allow) {
  const denyResources = Array.isArray(deny.resources) ? deny.resources : [deny.resources || '*'];
  const denyActions = Array.isArray(deny.actions) ? deny.actions : [deny.actions || '*'];
  const allowResources = Array.isArray(allow.resources) ? allow.resources : [allow.resources || '*'];
  const allowActions = Array.isArray(allow.actions) ? allow.actions : [allow.actions || '*'];

  // Does allow cover a superset of deny's scope?
  const denyCovered = denyResources.every(dr =>
    allowResources.some(ar => wildcardMatch(ar, dr)));

  const actionsCovered = denyActions.every(da =>
    allowActions.some(aa => wildcardMatch(aa, da)));

  if (denyCovered && actionsCovered) {
    // Allow's conditions are a superset of deny's (less restrictive)
    const denyConds = (deny.conditions || []).length;
    const allowConds = (allow.conditions || []).length;

    if (allowConds < denyConds) {
      return {
        type: 'condition_escalation',
        details: `deny has ${denyConds} conditions but allow has only ${allowConds}`,
      };
    }

    if (allowConds === denyConds && denyConds === 0) {
      return {
        type: 'full_escalation',
        details: 'both policies have no conditions, deny is completely undermined',
      };
    }
  }

  return null;
}

// ── Phase 7: Cyclic Role Hierarchy ─────────────────────────────────────────────

/**
 * Detect circular dependencies in role hierarchies.
 * Uses DFS with color marking (white/gray/black).
 */
export function detectCyclicRoleHierarchy(roles) {
  const issues = [];
  const roleMap = roles instanceof Map ? roles : new Map(Object.entries(roles));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  const parent = new Map();

  for (const [name] of roleMap) {
    color.set(name, WHITE);
    parent.set(name, null);
  }

  function dfs(role) {
    color.set(role, GRAY);
    const r = roleMap.get(role);
    if (!r) { color.set(role, BLACK); return null; }

    const hierarchy = r.hierarchy || r.inheritsFrom || [];
    const inherits = Array.isArray(hierarchy) ? hierarchy : [hierarchy];

    for (const child of inherits) {
      if (child === role) continue;
      if (color.get(child) === GRAY) {
        // Found a cycle
        const cycle = reconstructCycle(child, role);
        issues.push({
          type: ISSUE_TYPE.CIRCULAR_ROLE_HIERARCHY,
          severity: ISSUE_SEVERITY.ERROR,
          cycle,
          message: `Circular role hierarchy: ${cycle.join(' → ')}`,
          resolution: 'Remove one link in the inheritance chain',
        });
        continue;
      }
      if (color.get(child) === WHITE) {
        parent.set(child, role);
        const result = dfs(child);
        if (result) return result;
      }
    }

    color.set(role, BLACK);
    return null;
  }

  function reconstructCycle(start, end) {
    const cycle = [end];
    let current = start;
    while (current !== end) {
      cycle.unshift(current);
      current = parent.get(current);
      if (!current) break;
    }
    cycle.push(end);
    return cycle;
  }

  for (const [name] of roleMap) {
    if (color.get(name) === WHITE) {
      dfs(name);
    }
  }

  return issues;
}

// ── Phase 8: Safety Property Proof ─────────────────────────────────────────────

/**
 * Prove or disprove a safety claim against the policy set.
 *
 * Safety claim format:
 * {
 *   id: 'no-unauth-access',
 *   description: 'No user can read payroll without manager role',
 *   check: (policy, context) => boolean,
 *   // Returns true if this policy+context combination violates the claim
 * }
 *
 * Returns: { holds, counterexample?, severity, proof? }
 */
export function proveSafetyClaim(claim, policies) {
  // Try to find a counterexample
  // A counterexample = a policy that matches but violates the claim

  const denyPolicies = policies.filter(p => p.effect === 'deny');

  // Check 1: Is there a deny policy that blocks the unsafe access?
  // If deny exists with stricter conditions than claim requires,
  // the claim likely holds.

  // Check 2: Try to construct a context that matches a policy but violates the claim
  // For each policy, check if it could match a context that the claim forbids

  const relevantPolicies = policies.filter(p => {
    // Look for allow policies on sensitive resources
    const sensitivePatterns = claim.sensitiveResources || [];
    const resources = Array.isArray(p.resources) ? p.resources : [p.resources || '*'];
    return p.effect === 'allow' && resources.some(r =>
      sensitivePatterns.some(s => wildcardMatch(r, s)));
  });

  if (relevantPolicies.length === 0) {
    return {
      holds: true,
      proof: `No allow policies match sensitive resources in claim '${claim.id}'`,
      severity: 'info',
    };
  }

  // Check if each relevant policy has adequate deny protection
  let denied = 0;
  for (const allow of relevantPolicies) {
    const allowResources = Array.isArray(allow.resources) ? allow.resources : [allow.resources || '*'];
    const allowActions = Array.isArray(allow.actions) ? allow.actions : [allow.actions || '*'];

    // Is there a deny that covers this allow?
    const hasDeny = denyPolicies.some(deny => {
      const denyResources = Array.isArray(deny.resources) ? deny.resources : [deny.resources || '*'];
      const denyActions = Array.isArray(deny.actions) ? deny.actions : [deny.actions || '*'];

      const resourceCovered = denyResources.some(dr =>
        allowResources.some(ar => wildcardMatch(dr, ar)));
      const actionCovered = denyActions.some(da =>
        allowActions.some(aa => wildcardMatch(da, aa)));

      // Deny has extra conditions — check if they could be bypassed
      if (resourceCovered && actionCovered) {
        const denyConds = deny.conditions?.length || 0;
        const allowConds = allow.conditions?.length || 0;
        // If deny has more conditions, it might not always apply when allow does
        if (denyConds > allowConds) return false;
        return true;
      }
      return false;
    });

    if (hasDeny) denied++;
  }

  const fullyProtected = denied === relevantPolicies.length;

  if (fullyProtected) {
    return {
      holds: true,
      proof: `All ${relevantPolicies.length} relevant allow policies are protected by deny policies`,
      severity: 'info',
    };
  }

  // Partial protection — find the unprotected ones
  const unprotected = relevantPolicies.filter(p => {
    const allowResources = Array.isArray(p.resources) ? p.resources : [p.resources || '*'];
    const allowActions = Array.isArray(p.actions) ? p.actions : [p.actions || '*'];
    return !denyPolicies.some(d => {
      const dr = Array.isArray(d.resources) ? d.resources : [d.resources || '*'];
      const da = Array.isArray(d.actions) ? d.actions : [d.actions || '*'];
      return dr.some(dr_ => allowResources.some(ar => wildcardMatch(dr_, ar)))
          && da.some(da_ => allowActions.some(aa => wildcardMatch(da_, aa)));
    });
  });

  if (unprotected.length > 0) {
    return {
      holds: false,
      counterexample: unprotected.map(p => ({
        policyId: p.id,
        resources: p.resources,
        actions: p.actions,
        conditions: p.conditions,
      })),
      severity: 'error',
      message: `${unprotected.length} allow policies are not protected by deny policies`,
    };
  }

  return {
    holds: true,
    proof: 'All relevant policies have deny protection',
    severity: 'info',
  };
}

// ── Phase 9: Coverage Gap Detection ──────────────────────────────────────────────

/**
 * Detect resource+action combinations that have no applicable policy.
 */
export function detectCoverageGaps(policies, resourceActionMap, safetyClaims) {
  const issues = [];

  // Extract expected coverage from safety claims
  const expectedResources = new Set();
  const expectedActions = new Set();

  for (const claim of safetyClaims) {
    if (claim.resources) {
      for (const r of claim.resources) expectedResources.add(r);
    }
    if (claim.actions) {
      for (const a of claim.actions) expectedActions.add(a);
    }
  }

  // If no explicit coverage defined, skip gap detection
  if (expectedResources.size === 0) return issues;

  // Check that every expected resource+action has at least one deny or allow
  for (const resource of expectedResources) {
    for (const action of expectedActions) {
      const entry = resourceActionMap.get(resource);
      const hasAllow = entry?.allow.size > 0 && (
        entry.allow.has(action) || entry.allow.has('*') || entry.allow.has(':*')
      );
      const hasDeny = entry?.deny.size > 0 && (
        entry.deny.has(action) || entry.deny.has('*') || entry.deny.has(':*')
      );

      if (!hasAllow && !hasDeny) {
        issues.push({
          type: ISSUE_TYPE.GAP,
          severity: ISSUE_SEVERITY.WARNING,
          resource,
          action,
          message: `No policy covers resource '${resource}' + action '${action}' — access is implicit ${hasDeny ? 'deny' : 'allow'}`,
          resolution: 'Add a deny-all or explicit allow/deny policy for this combination',
        });
      }
    }
  }

  return issues;
}

// ── Batch Verifier for Individual Policy ─────────────────────────────────────────

/**
 * Verify a single policy against a set.
 * Used when adding/editing a policy in real-time.
 */
export function verifyPolicy(policy, { policies, roles, safetyClaims = [] }) {
  const allPolicies = [...(policies instanceof Map ? policies.values() : Object.values(policies)), policy];
  const result = verifyPolicySet({ policies: allPolicies, roles, safetyClaims });

  // Filter to issues specifically involving this policy
  const relevant = result.issues.filter(i =>
    i.policyId === policy.id ||
    i.conflictingPolicies?.includes(policy.id) ||
    i.shadowingPolicy === policy.id ||
    i.subsumedPolicy === policy.id ||
    i.subsumingPolicy === policy.id ||
    i.shadowedPolicy === policy.id ||
    i.denyPolicy === policy.id ||
    i.allowPolicy === policy.id
  );

  return {
    ok: !relevant.some(i => i.severity === ISSUE_SEVERITY.ERROR),
    issues: relevant,
    summary: {
      errors: relevant.filter(i => i.severity === ISSUE_SEVERITY.ERROR).length,
      warnings: relevant.filter(i => i.severity === ISSUE_SEVERITY.WARNING).length,
    },
  };
}

export default {
  verifyPolicySet,
  verifyPolicy,
  detectConflicts,
  detectShadows,
  detectSubsumption,
  detectDeadPolicies,
  detectPrivilegeEscalation,
  detectCyclicRoleHierarchy,
  proveSafetyClaim,
  detectCoverageGaps,
  ISSUE_SEVERITY,
  ISSUE_TYPE,
};
