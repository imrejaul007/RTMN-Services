/**
 * PolicyOS — Attribute Policy Engine (Phase 2.3)
 *
 * Prevents attribute spoofing: governs which subjects can set which
 * attribute values in a context object.
 *
 * An attribute policy says: "Only source X can set attribute Y".
 * Used to validate that context.user.trustScore actually came from
 * reputation-os and wasn't injected by a malicious caller.
 */

export function registerAttributePolicyRoutes(app, { auditLog, customAuth }) {

  // ── Attribute Policy Store ───────────────────────────────────────────────

  /**
   * Attribute policies: Map<attributePath, Policy>
   * Policy says: who (which sources) can set this attribute.
   */
  const attributePolicies = new Map();

  // Seed default attribute policies
  function seedPolicies() {
    const seeds = [
      {
        path: 'user.trustScore',
        allowedSources: ['reputation-os', 'agent-trust-os'],
        requireTamperProof: true,
        description: 'Trust scores must come from reputation-os, not from request context',
      },
      {
        path: 'user.department',
        allowedSources: ['workforce-os'],
        requireTamperProof: false,
        description: 'Department must be set by workforce-os',
      },
      {
        path: 'user.id',
        allowedSources: ['corpid'],
        requireTamperProof: true,
        description: 'User ID must come from corpid',
      },
      {
        path: 'context.amount',
        allowedSources: ['commerce-os', 'payment-os'],
        requireTamperProof: true,
        description: 'Transaction amounts must come from commerce-os',
      },
      {
        path: 'context.currency',
        allowedSources: ['commerce-os', 'payment-os'],
        requireTamperProof: false,
        description: 'Currency must come from commerce-os',
      },
      {
        path: 'environment.ip',
        allowedSources: ['gateway'],
        requireTamperProof: true,
        description: 'IP address must be determined by gateway, not by caller',
      },
      {
        path: 'environment.network.internal',
        allowedSources: ['gateway'],
        requireTamperProof: true,
        description: 'Internal network flag must be set by gateway',
      },
      {
        path: 'resource.owner',
        allowedSources: ['industry-os', 'storage-os'],
        requireTamperProof: true,
        description: 'Resource owner must come from the resource\'s owning service',
      },
      {
        path: 'user.attributes.vip',
        allowedSources: ['crm', 'sales-os'],
        requireTamperProof: false,
        description: 'VIP flag must come from CRM or sales-os',
      },
    ];

    for (const p of seeds) {
      attributePolicies.set(p.path, p);
    }
  }
  seedPolicies();

  // ── Evaluation ─────────────────────────────────────────────────────────

  /**
   * Evaluate whether a proposed attribute value is allowed.
   * Returns { allowed, reason }.
   */
  function evaluateAttributePolicy(path, source, value) {
    const policy = attributePolicies.get(path);
    if (!policy) {
      // No policy — attribute is unrestricted (open)
      return { allowed: true, reason: 'no policy defined' };
    }
    if (!policy.allowedSources.includes(source)) {
      return {
        allowed: false,
        reason: `Attribute '${path}' can only be set by [${policy.allowedSources.join(', ')}], not by '${source}'`,
      };
    }
    return { allowed: true, reason: 'source authorized' };
  }

  /**
   * Validate an entire context object against attribute policies.
   * Returns list of violations.
   */
  function validateContext(context, source = 'unknown') {
    const violations = [];
    function walk(obj, prefix = '') {
      if (obj === null || typeof obj !== 'object') return;
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          walk(value, path);
        } else {
          const result = evaluateAttributePolicy(path, source, value);
          if (!result.allowed) {
            violations.push({ path, source, value, reason: result.reason });
          }
        }
      }
    }
    walk(context);
    return violations;
  }

  // ── Endpoints ────────────────────────────────────────────────────────

  // GET /api/attribute-policies — list all attribute policies
  app.get('/api/attribute-policies', (req, res) => {
    const list = Array.from(attributePolicies.values());
    res.json({ count: list.length, policies: list });
  });

  // POST /api/attribute-policies — create/update an attribute policy
  app.post('/api/attribute-policies', customAuth, (req, res) => {
    const body = req.body || {};
    if (!body.path) return res.status(400).json({ error: 'path is required' });
    if (!Array.isArray(body.allowedSources) || body.allowedSources.length === 0) {
      return res.status(400).json({ error: 'allowedSources must be a non-empty array' });
    }
    const policy = {
      path: body.path,
      allowedSources: body.allowedSources,
      requireTamperProof: body.requireTamperProof ?? true,
      description: body.description || '',
    };
    attributePolicies.set(body.path, policy);
    auditLog({ type: 'attribute-policy.updated', actor: req.auth?.sub || 'unknown', details: { path: body.path } });
    res.json({ ok: true, policy });
  });

  // GET /api/attribute-policies/:path — get one policy
  app.get('/api/attribute-policies/:path', (req, res) => {
    const p = attributePolicies.get(req.params.path);
    if (!p) return res.status(404).json({ error: `No policy for '${req.params.path}'` });
    res.json(p);
  });

  // DELETE /api/attribute-policies/:path — remove a policy
  app.delete('/api/attribute-policies/:path', customAuth, (req, res) => {
    if (!attributePolicies.has(req.params.path)) {
      return res.status(404).json({ error: `No policy for '${req.params.path}'` });
    }
    attributePolicies.delete(req.params.path);
    auditLog({ type: 'attribute-policy.deleted', actor: req.auth?.sub || 'unknown', details: { path: req.params.path } });
    res.json({ ok: true });
  });

  // POST /api/attribute-policies/validate-context — validate a context against policies
  app.post('/api/attribute-policies/validate-context', customAuth, (req, res) => {
    const { context, source } = req.body || {};
    if (!context || typeof context !== 'object') {
      return res.status(400).json({ error: 'context (object) is required' });
    }
    const violations = validateContext(context, source || 'unknown');
    auditLog({
      type: 'attribute-context.validated',
      actor: req.auth?.sub || 'unknown',
      details: { violations: violations.length, source },
    });
    res.json({
      valid: violations.length === 0,
      violations,
      contextKeys: Object.keys(context),
    });
  });

  // POST /api/attribute-policies/validate — validate a single attribute
  app.post('/api/attribute-policies/validate', customAuth, (req, res) => {
    const { path, source, value } = req.body || {};
    if (!path) return res.status(400).json({ error: 'path is required' });
    const result = evaluateAttributePolicy(path, source || 'unknown', value);
    res.json(result);
  });

  return { evaluateAttributePolicy, validateContext };
}
