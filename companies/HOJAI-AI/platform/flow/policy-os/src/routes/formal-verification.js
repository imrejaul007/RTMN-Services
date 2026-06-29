/**
 * PolicyOS — Formal Verification Routes (Phase P1)
 *
 * REST endpoints for formal policy verification.
 * Detects conflicts, dead policies, privilege escalation, shadows, cycles.
 */

import {
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
} from '../services/formal-verification.js';

export function registerFormalVerificationRoutes(app, {
  policies,
  roles,
  customAuth,
  writeLimiter,
}) {

  // ── POST /api/verify — Full policy set verification ─────────────────────────────

  app.post('/api/verify', customAuth, writeLimiter, (req, res) => {
    const { safetyClaims = [] } = req.body || {};
    const result = verifyPolicySet({
      policies,
      roles,
      safetyClaims,
    });
    res.json({
      ok: result.ok,
      errorCount: result.summary.errors,
      warningCount: result.summary.warnings,
      summary: result.summary,
      issues: result.issues,
      proofs: result.proofs,
    });
  });

  // ── POST /api/verify/policy/:id — Verify single policy ──────────────────────────

  app.post('/api/verify/policy/:id', customAuth, writeLimiter, (req, res) => {
    const { id } = req.params;
    const { safetyClaims = [] } = req.body || {};

    const result = verifyPolicy(policies.get(id), {
      policies,
      roles,
      safetyClaims,
    });

    if (!result.issues || result.issues.length === 0) {
      return res.json({
        ok: true,
        policyId: id,
        issues: [],
        summary: result.summary,
        message: 'Policy passes all formal verification checks',
      });
    }

    res.json({
      ok: result.ok,
      policyId: id,
      issues: result.issues,
      summary: result.summary,
    });
  });

  // ── POST /api/verify/conflicts — Conflict detection only ──────────────────────

  app.post('/api/verify/conflicts', customAuth, (req, res) => {
    const policyList = [...policies.values()];
    const { resourceActionMap } = req.body || {};

    // Build index if not provided
    const idx = resourceActionMap
      ? JSON.parse(JSON.stringify(resourceActionMap)) // clone to avoid mutation
      : null;

    const issues = detectConflicts(policyList, idx);
    res.json({
      count: issues.length,
      issues,
    });
  });

  // ── POST /api/verify/shadows — Shadow detection only ──────────────────────────

  app.post('/api/verify/shadows', customAuth, (req, res) => {
    const policyList = [...policies.values()];
    const issues = detectShadows(policyList, buildIndex(policyList));
    res.json({
      count: issues.length,
      issues,
    });
  });

  // ── POST /api/verify/subsumption — Subsumption detection only ────────────────

  app.post('/api/verify/subsumption', customAuth, (req, res) => {
    const policyList = [...policies.values()];
    const issues = detectSubsumption(policyList);
    res.json({
      count: issues.length,
      issues,
    });
  });

  // ── POST /api/verify/dead-policies — Dead policy detection ─────────────────

  app.post('/api/verify/dead-policies', customAuth, (req, res) => {
    const policyList = [...policies.values()];
    const issues = detectDeadPolicies(policyList);
    res.json({
      count: issues.length,
      issues,
    });
  });

  // ── POST /api/verify/escalation — Privilege escalation detection ──────────────

  app.post('/api/verify/escalation', customAuth, (req, res) => {
    const policyList = [...policies.values()];
    const issues = detectPrivilegeEscalation(policyList);
    res.json({
      count: issues.length,
      issues,
    });
  });

  // ── POST /api/verify/roles/cycles — Role hierarchy cycle detection ────────────

  app.post('/api/verify/roles/cycles', customAuth, (req, res) => {
    const issues = roles ? detectCyclicRoleHierarchy(roles) : [];
    res.json({
      count: issues.length,
      issues,
    });
  });

  // ── POST /api/verify/safety — Prove a safety property ─────────────────────

  app.post('/api/verify/safety', customAuth, (req, res) => {
    const { claim } = req.body || {};
    if (!claim) return res.status(400).json({ error: 'claim is required' });

    const policyList = [...policies.values()];
    const proof = proveSafetyClaim(claim, policyList);

    res.json({
      claim: claim.description || claim.id,
      holds: proof.holds,
      severity: proof.severity,
      proof: proof.proof,
      counterexample: proof.counterexample,
      message: proof.holds
        ? `Safety claim holds: ${proof.proof}`
        : `Safety claim VIOLATED: ${proof.message}`,
    });
  });

  // ── GET /api/verify/issues — List all current issues ────────────────────────

  app.get('/api/verify/issues', customAuth, (req, res) => {
    const { severity, type, limit = 100 } = req.query;

    const policyList = [...policies.values()];
    const allIssues = [
      ...detectConflicts(policyList, buildIndex(policyList)),
      ...detectShadows(policyList, buildIndex(policyList)),
      ...detectSubsumption(policyList),
      ...detectDeadPolicies(policyList),
      ...detectPrivilegeEscalation(policyList),
      ...(roles ? detectCyclicRoleHierarchy(roles) : []),
    ];

    let filtered = allIssues;
    if (severity) {
      filtered = filtered.filter(i => i.severity === severity);
    }
    if (type) {
      filtered = filtered.filter(i => i.type === type);
    }

    const issues = filtered.slice(0, parseInt(limit));

    res.json({
      total: allIssues.length,
      filtered: issues.length,
      issues,
    });
  });

  // ── GET /api/verify/stats — Verification statistics ──────────────────────────

  app.get('/api/verify/stats', customAuth, (req, res) => {
    const policyList = [...policies.values()];
    const total = policyList.length;
    const active = policyList.filter(p => p.status === 'published').length;
    const archived = policyList.filter(p => p.status === 'archived' || p.status === 'retired').length;

    const conflicts = detectConflicts(policyList, buildIndex(policyList)).length;
    const shadows = detectShadows(policyList, buildIndex(policyList)).length;
    const subsumption = detectSubsumption(policyList).length;
    const dead = detectDeadPolicies(policyList).length;
    const escalation = detectPrivilegeEscalation(policyList).length;
    const cycles = roles ? detectCyclicRoleHierarchy(roles).length : 0;

    const totalIssues = conflicts + shadows + subsumption + dead + escalation + cycles;
    const errors = conflicts + dead + cycles;

    res.json({
      policies: { total, active, archived },
      issues: {
        total: totalIssues,
        errors,
        warnings: shadows + escalation,
        info: subsumption,
        byType: {
          conflicts,
          shadows,
          subsumption,
          deadPolicies: dead,
          privilegeEscalations: escalation,
          roleCycles: cycles,
        },
      },
      score: total > 0 ? Math.max(0, Math.round(((total - totalIssues) / total) * 100)) : 100,
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────

function buildIndex(policies) {
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
