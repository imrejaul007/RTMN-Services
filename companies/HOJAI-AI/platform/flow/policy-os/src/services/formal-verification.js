/**
 * PolicyOS — Formal Verification Engine (Phase P1)
 *
 * Proves properties about a policy set without executing them.
 * Detections: conflicts, dead policies, privilege escalation, shadows, cycles.
 */

import { getPath } from '../lib/evaluation.js';

// ── Constants ─────────────────────────────────────────────────────────────────

export const ISSUE_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

export const ISSUE_TYPE = {
  CONFLICT: 'conflict',
  SHADOW: 'shadow',
  SUBSUMPTION: 'subsumption',
  DEAD_POLICY: 'dead_policy',
  DEAD_CONDITION: 'dead_condition',
  PRIVILEGE_ESCALATION: 'privilege_escalation',
  UNREACHABLE_ROLE: 'unreachable_role',
  GAP: 'gap',
  CYCLIC_DEPENDENCY: 'cyclic_dependency',
  CIRCULAR_ROLE_HIERARCHY: 'circular_role_hierarchy',
  SAFETY_VIOLATION: 'safety_violation',
};

// ── Resource Action Index ─────────────────────────────────────────────────────

function buildResourceActionIndex(policies) {
  const map = new Map();
  for (const policy of policies) {
    if (policy.status === 'archived' || policy.status === 'retired') continue;
    const resources = Array.isArray(policy.resources) ? policy.resources : [policy.resources || '*'];
    const actions = Array.isArray(policy.actions) ? policy.actions : [policy.actions || '*'];
    const effect = policy.effect === 'deny' ? 'deny' : 'allow';
    for (const resource of resources) {
      if (!map.has(resource)) map.set(resource, { allow: new Set(), deny: new Set(), policyIds: new Set() });
      const entry = map.get(resource);
      for (const action of actions) {
        if (effect === 'allow') entry.allow.add(action); else entry.deny.add(action);
      }
      entry.policyIds.add(policy.id);
    }
  }
  return map;
}

// ── Wildcard Matching ──────────────────────────────────────────────────────────

function wildcardMatch(pattern, value) {
  if (pattern === '*') return true;
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1);
    return value.startsWith(prefix + ':') || value === prefix;
  }
  if (pattern.includes('*')) {
    const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return re.test(value);
  }
  return pattern === value;
}

function resourceSuperset(bResources, aResources) {
  // Does b cover all of a's resources?
  return aResources.every(ar => bResources.some(br => wildcardMatch(br, ar)));
}

function actionSuperset(bActions, aActions) {
  return aActions.every(aa => bActions.some(ba => wildcardMatch(ba, aa)));
}

// ── Conflict Detection ─────────────────────────────────────────────────────────

/**
 * Detect allow/deny conflicts on overlapping resource+action.
 */
export function detectConflicts(policies, resourceActionMap) {
  const issues = [];
  const seen = new Set();
  const map = resourceActionMap || buildResourceActionIndex(policies);

  for (const [resource, entry] of map.entries()) {
    if (entry.allow.size === 0 || entry.deny.size === 0) continue;

    const allowActions = [...entry.allow];
    const denyActions = [...entry.deny];

    // Wildcard overlap
    const allowHasWildcard = allowActions.some(a => wildcardMatch(a, '*'));
    if (allowHasWildcard && denyActions.length > 0) {
      const key = [...entry.policyIds].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        issues.push({
          type: ISSUE_TYPE.CONFLICT,
          severity: ISSUE_SEVERITY.ERROR,
          resource,
          conflictingPolicies: [...entry.policyIds],
          message: `Allow wildcard overlaps with deny on resource '${resource}'`,
          resolution: 'Add more specific deny or restrict the allow scope',
        });
        continue;
      }
    }

    // Specific action overlap
    const denyHasWildcard = denyActions.some(d => wildcardMatch(d, '*'));
    if (denyHasWildcard && allowActions.length > 0) {
      const key = [...entry.policyIds].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        issues.push({
          type: ISSUE_TYPE.CONFLICT,
          severity: ISSUE_SEVERITY.ERROR,
          resource,
          conflictingPolicies: [...entry.policyIds],
          message: `Deny wildcard overlaps with allow on resource '${resource}'`,
          resolution: 'Add more specific allow or restrict the deny scope',
        });
        continue;
      }
    }

    // Exact match
    for (const allowAction of allowActions) {
      for (const denyAction of denyActions) {
        if (wildcardMatch(allowAction, denyAction) || wildcardMatch(denyAction, allowAction)) {
          const key = [...entry.policyIds].sort().join('|');
          if (!seen.has(key)) {
            seen.add(key);
            issues.push({
              type: ISSUE_TYPE.CONFLICT,
              severity: ISSUE_SEVERITY.ERROR,
              resource,
              action: allowAction,
              conflictingPolicies: [...entry.policyIds],
              message: `Allow and deny both match '${resource}' + '${allowAction}'`,
              resolution: 'Use priority or more specific conditions to resolve',
            });
          }
        }
      }
    }
  }

  return issues;
}

// ── Shadow Detection ────────────────────────────────────────────────────────────

/**
 * Detect policies shadowed by earlier (higher-priority) policies.
 */
export function detectShadows(policies, resourceActionMap) {
  const issues = [];
  const sorted = [...policies]
    .filter(p => p.status !== 'archived' && p.status !== 'retired')
    .sort((a, b) => (b.priority || 50) - (a.priority || 50));

  for (let i = 1; i < sorted.length; i++) {
    for (let j = 0; j < i; j++) {
      const earlier = sorted[j];
      const later = sorted[i];

      const earlierResources = Array.isArray(earlier.resources) ? earlier.resources : [earlier.resources || '*'];
      const earlierActions = Array.isArray(earlier.actions) ? earlier.actions : [earlier.actions || '*'];
      const laterResources = Array.isArray(later.resources) ? later.resources : [later.resources || '*'];
      const laterActions = Array.isArray(later.actions) ? later.actions : [later.actions || '*'];

      // Does earlier shadow later?
      if (resourceSuperset(earlierResources, laterResources) && actionSuperset(earlierActions, laterActions)) {
        if (earlier.effect === later.effect) {
          issues.push({
            type: ISSUE_TYPE.SUBSUMPTION,
            severity: ISSUE_SEVERITY.INFO,
            subsumedPolicy: later.id,
            subsumingPolicy: earlier.id,
            message: `Policy '${later.id}' is subsumed by '${earlier.id}'`,
            resolution: 'Remove or merge the subsumed policy',
          });
        } else {
          issues.push({
            type: ISSUE_TYPE.SHADOW,
            severity: ISSUE_SEVERITY.WARNING,
            shadowedPolicy: later.id,
            shadowingPolicy: earlier.id,
            message: `Policy '${later.id}' is shadowed by '${earlier.id}'`,
            resolution: 'Raise priority or narrow earlier policy scope',
          });
        }
      }
    }
  }

  return issues;
}

// ── Subsumption Detection ───────────────────────────────────────────────────────

export function detectSubsumption(policies) {
  // Subsumption is handled in detectShadows (same pass)
  return detectShadows(policies, buildResourceActionIndex(policies))
    .filter(i => i.type === ISSUE_TYPE.SUBSUMPTION);
}

// ── Dead Policy Detection ───────────────────────────────────────────────────────

export function detectDeadPolicies(policies) {
  const issues = [];

  for (const policy of policies) {
    if (policy.status === 'archived' || policy.status === 'retired') continue;
    if (!policy.conditions || policy.conditions.length === 0) continue;

    for (const cond of policy.conditions) {
      // Time range impossibility
      if ((cond.gte !== undefined && cond.lte !== undefined && cond.gte > cond.lte) ||
          (cond.gt !== undefined && cond.lt !== undefined && cond.gt >= cond.lt)) {
        issues.push({
          type: ISSUE_TYPE.DEAD_CONDITION,
          severity: ISSUE_SEVERITY.ERROR,
          policyId: policy.id,
          condition: cond,
          message: `Impossible time/numeric range in policy '${policy.id}'`,
          reason: 'Range lower bound exceeds upper bound',
        });
      }

      // Empty IN array
      if (cond.operator === 'in' && Array.isArray(cond.value) && cond.value.length === 0) {
        issues.push({
          type: ISSUE_TYPE.DEAD_CONDITION,
          severity: ISSUE_SEVERITY.ERROR,
          policyId: policy.id,
          condition: cond,
          message: `IN with empty array can never match`,
          reason: 'Empty array in IN operator',
        });
      }
    }

    // Contradictory eq + neq on same field
    const byField = new Map();
    for (const cond of policy.conditions || []) {
      const f = cond.field || cond.path || 'unknown';
      if (!byField.has(f)) byField.set(f, []);
      byField.get(f).push(cond);
    }

    for (const [field, conds] of byField.entries()) {
      if (conds.length < 2) continue;
      const eq = conds.find(c => c.operator === 'eq' || c.operator === 'equals');
      const neq = conds.find(c => c.operator === 'neq' || c.operator === 'notEquals');
      if (eq && neq && eq.value === neq.value) {
        issues.push({
          type: ISSUE_TYPE.DEAD_CONDITION,
          severity: ISSUE_SEVERITY.ERROR,
          policyId: policy.id,
          condition: [eq, neq],
          message: `Field '${field}' requires =${eq.value} AND !=${neq.value} simultaneously`,
          reason: 'Contradictory eq and neq on same field',
        });
      }
    }
  }

  return issues;
}

// ── Privilege Escalation ────────────────────────────────────────────────────────

export function detectPrivilegeEscalation(policies) {
  const issues = [];

  const denies = policies.filter(p => p.effect === 'deny' && p.status !== 'archived');
  const allows = policies.filter(p => p.effect === 'allow' && p.status !== 'archived');

  for (const deny of denies) {
    for (const allow of allows) {
      const denyResources = Array.isArray(deny.resources) ? deny.resources : [deny.resources || '*'];
      const denyActions = Array.isArray(deny.actions) ? deny.actions : [deny.actions || '*'];
      const allowResources = Array.isArray(allow.resources) ? allow.resources : [allow.resources || '*'];
      const allowActions = Array.isArray(allow.actions) ? allow.actions : [allow.actions || '*'];

      // Does allow cover a superset of deny's scope?
      if (resourceSuperset(allowResources, denyResources) && actionSuperset(allowActions, denyActions)) {
        const denyConds = (deny.conditions || []).length;
        const allowConds = (allow.conditions || []).length;

        if (allowConds < denyConds) {
          issues.push({
            type: ISSUE_TYPE.PRIVILEGE_ESCALATION,
            severity: ISSUE_SEVERITY.WARNING,
            denyPolicy: deny.id,
            allowPolicy: allow.id,
            message: `Allow '${allow.id}' (${allowConds} conditions) undermines deny '${deny.id}' (${denyConds} conditions)`,
            resolution: 'Add conditions to the allow policy or extend deny conditions',
          });
        }
      }
    }
  }

  return issues;
}

// ── Cyclic Role Hierarchy ───────────────────────────────────────────────────────

export function detectCyclicRoleHierarchy(roles) {
  const issues = [];
  const map = roles instanceof Map ? roles : new Map(Object.entries(roles));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...map.keys()].map(k => [k, WHITE]));
  const parent = new Map([...map.keys()].map(k => [k, null]));

  function dfs(role) {
    color.set(role, GRAY);
    const r = map.get(role);
    if (!r) { color.set(role, BLACK); return; }

    const inherits = Array.isArray(r.hierarchy) ? r.hierarchy
      : Array.isArray(r.inheritsFrom) ? r.inheritsFrom
      : (r.hierarchy ? [r.hierarchy] : [])
      .concat(r.inheritsFrom ? [r.inheritsFrom] : []);

    for (const child of inherits) {
      if (child === role) continue;
      if (!map.has(child)) continue;
      if (color.get(child) === GRAY) {
        const cycle = [child, role];
        let cur = parent.get(role);
        while (cur && cur !== child) { cycle.unshift(cur); cur = parent.get(cur); }
        cycle.unshift(child);
        issues.push({
          type: ISSUE_TYPE.CIRCULAR_ROLE_HIERARCHY,
          severity: ISSUE_SEVERITY.ERROR,
          cycle,
          message: `Circular role hierarchy: ${cycle.join(' -> ')}`,
          resolution: 'Remove one link in the inheritance chain',
        });
      } else if (color.get(child) === WHITE) {
        parent.set(child, role);
        dfs(child);
      }
    }

    color.set(role, BLACK);
  }

  for (const name of map.keys()) {
    if (color.get(name) === WHITE) dfs(name);
  }

  return issues;
}

// ── Safety Property Proof ────────────────────────────────────────────────────────

export function proveSafetyClaim(claim, policies) {
  const sensitive = claim.sensitiveResources || [];

  const sensitivePolicies = policies.filter(p => {
    const resources = Array.isArray(p.resources) ? p.resources : [p.resources || '*'];
    return p.effect === 'allow' && resources.some(r => sensitive.some(s => wildcardMatch(r, s)));
  });

  if (sensitivePolicies.length === 0) {
    return { holds: true, proof: 'No allow policies touch sensitive resources', severity: 'info' };
  }

  const denies = policies.filter(p => p.effect === 'deny' && p.status !== 'archived');

  let fullyProtected = 0;
  for (const allow of sensitivePolicies) {
    const ar = Array.isArray(allow.resources) ? allow.resources : [allow.resources || '*'];
    const aa = Array.isArray(allow.actions) ? allow.actions : [allow.actions || '*'];
    const hasProtection = denies.some(d => {
      const dr = Array.isArray(d.resources) ? d.resources : [d.resources || '*'];
      const da = Array.isArray(d.actions) ? d.actions : [d.actions || '*'];
      return resourceSuperset(dr, ar) && actionSuperset(da, aa) &&
        ((d.conditions || []).length >= (allow.conditions || []).length);
    });
    if (hasProtection) fullyProtected++;
  }

  if (fullyProtected === sensitivePolicies.length) {
    return {
      holds: true,
      proof: `All ${sensitivePolicies.length} sensitive allow policies are protected by deny policies`,
      severity: 'info',
    };
  }

  const unprotected = sensitivePolicies.filter(p => {
    const ar = Array.isArray(p.resources) ? p.resources : [p.resources || '*'];
    const aa = Array.isArray(p.actions) ? p.actions : [p.actions || '*'];
    return !denies.some(d => {
      const dr = Array.isArray(d.resources) ? d.resources : [d.resources || '*'];
      const da = Array.isArray(d.actions) ? d.actions : [d.actions || '*'];
      return resourceSuperset(dr, ar) && actionSuperset(da, aa);
    });
  });

  return {
    holds: false,
    counterexample: unprotected.map(p => ({ policyId: p.id, resources: p.resources, actions: p.actions })),
    severity: 'error',
    message: `${unprotected.length} allow policies on sensitive resources lack deny protection`,
  };
}

// ── Coverage Gaps ────────────────────────────────────────────────────────────────

export function detectCoverageGaps(policies, resourceActionMap, safetyClaims) {
  const issues = [];
  const map = resourceActionMap || buildResourceActionIndex(policies);

  for (const claim of safetyClaims || []) {
    const resources = claim.resources || [];
    const actions = claim.actions || [];

    for (const resource of resources) {
      for (const action of actions) {
        const entry = map.get(resource);
        const covered = entry && (
          entry.allow.has(action) || entry.deny.has(action) ||
          [...entry.allow].some(a => wildcardMatch(a, action)) ||
          [...entry.deny].some(d => wildcardMatch(d, action))
        );
        if (!covered) {
          issues.push({
            type: ISSUE_TYPE.GAP,
            severity: ISSUE_SEVERITY.WARNING,
            resource,
            action,
            claim: claim.description || claim.id,
            message: `No policy covers '${resource}' + '${action}'`,
            resolution: 'Add explicit allow or deny for this combination',
          });
        }
      }
    }
  }

  return issues;
}

// ── Full Policy Set Verification ───────────────────────────────────────────────

export function verifyPolicySet({ policies, roles, safetyClaims = [] }) {
  const policyList = policies instanceof Map
    ? [...policies.values()]
    : Array.isArray(policies) ? policies : [...Object.values(policies)];

  const issues = [];
  const map = buildResourceActionIndex(policyList);

  const conflicts = detectConflicts(policyList, map);
  const shadows = detectShadows(policyList, map);
  const subsumption = detectSubsumption(policyList);
  const dead = detectDeadPolicies(policyList);
  const escalation = detectPrivilegeEscalation(policyList);
  const cycles = roles ? detectCyclicRoleHierarchy(roles) : [];

  issues.push(...conflicts, ...shadows, ...subsumption, ...dead, ...escalation, ...cycles);

  // Safety proofs
  const proofs = [];
  for (const claim of safetyClaims) {
    const proof = proveSafetyClaim(claim, policyList);
    proofs.push(proof);
    if (!proof.holds && proof.severity === 'error') {
      issues.push({
        type: 'safety_violation',
        severity: ISSUE_SEVERITY.ERROR,
        claim: claim.description || claim.id,
        counterexample: proof.counterexample,
        message: `Safety claim violated: ${claim.description || claim.id}`,
      });
    }
  }

  const coverageGaps = detectCoverageGaps(policyList, map, safetyClaims);
  issues.push(...coverageGaps);

  const errors = issues.filter(i => i.severity === ISSUE_SEVERITY.ERROR).length;
  const warnings = issues.filter(i => i.severity === ISSUE_SEVERITY.WARNING).length;

  return {
    ok: errors === 0,
    issues,
    proofs,
    summary: {
      total: policyList.length,
      errors,
      warnings,
      info: issues.length - errors - warnings,
      conflicts: conflicts.length,
      shadows: shadows.length,
      subsumption: subsumption.length,
      deadPolicies: dead.length,
      privilegeEscalations: escalation.length,
      roleCycles: cycles.length,
    },
  };
}

// ── Single Policy Verification ─────────────────────────────────────────────────

export function verifyPolicy(policy, { policies, roles, safetyClaims = [] }) {
  const allPolicies = [
    ...(policies instanceof Map ? [...policies.values()] : Object.values(policies)),
    policy,
  ];
  const result = verifyPolicySet({ policies: allPolicies, roles, safetyClaims });

  const relevant = result.issues.filter(i =>
    i.policyId === policy.id ||
    i.conflictingPolicies?.includes(policy.id) ||
    i.denyPolicy === policy.id ||
    i.allowPolicy === policy.id ||
    i.shadowingPolicy === policy.id ||
    i.shadowedPolicy === policy.id ||
    i.subsumingPolicy === policy.id ||
    i.subsumedPolicy === policy.id
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
