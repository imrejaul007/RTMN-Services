/**
 * RTMN Governance SDK
 *
 * Tiny client for the three governance services in the HOJAI AI platform:
 *   - policy-os          (port 4254) — policy evaluation
 *   - consent-engine     (port 4262) — purpose-bound consent check
 *   - compliance-engine  (port 4261) — control mapping + evidence
 *
 * Usage:
 *   import { createGovernanceClient } from '@rtmn/shared/lib/governance-sdk';
 *   const gov = createGovernanceClient({ policyOs: 'http://localhost:4254', ... });
 *   const decision = await gov.evaluate({ action: 'purchase', context: {...} });
 *   const consent  = await gov.checkConsent({ subjectId: 'u-1', purpose: 'marketing.email' });
 *   const evidence = await gov.recordEvidence({ controlId: 'gdpr.art32', kind: 'config', summary: '...' });
 *
 * All methods return { ok, data, error } so the caller never has to catch.
 * Fail-closed semantics are preserved: a network error returns ok:false and
 * the caller MUST treat that as "deny" for any policy/decision.
 */

const DEFAULT_TIMEOUT_MS = 1500;

async function call(baseUrl, method, path, body, { token, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!baseUrl) {
    return { ok: false, error: 'baseUrl not configured' };
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Service-Token'] = token;
  try {
    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ac.signal
    });
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

export function createGovernanceClient(opts = {}) {
  const policyOs = opts.policyOs || process.env.POLICY_OS_URL || 'http://localhost:4254';
  const consentEngine = opts.consentEngine || process.env.CONSENT_ENGINE_URL || 'http://localhost:4262';
  const complianceEngine = opts.complianceEngine || process.env.COMPLIANCE_ENGINE_URL || 'http://localhost:4261';
  // Per-service tokens (preferred); fall back to a single shared token.
  const tokens = {
    policyOs: opts.tokens?.policyOs || opts.token || process.env.POLICYOS_SERVICE_TOKEN || null,
    consentEngine: opts.tokens?.consentEngine || opts.token || process.env.CONSENT_SERVICE_TOKEN || null,
    complianceEngine: opts.tokens?.complianceEngine || opts.token || process.env.COMPLIANCE_SERVICE_TOKEN || null
  };
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const _pol = { token: tokens.policyOs, timeoutMs };
  const _con = { token: tokens.consentEngine, timeoutMs };
  const _cmp = { token: tokens.complianceEngine, timeoutMs };

  return {
    // ---------------------------------------------------------
    // PolicyOS
    // ---------------------------------------------------------
    /**
     * Evaluate a policy. Returns { ok, allowed, reasons, policyUsed }.
     * If `ok === false`, the caller MUST treat as DENY (fail-closed).
     */
    async evaluate({ policyId, context = {} } = {}) {
      const r = await call(policyOs, 'POST', '/api/policies/evaluate', { policyId, context }, _pol);
      if (!r.ok) return { ok: false, allowed: false, error: r.error || r.data?.error || 'evaluate failed' };
      return { ok: true, ...r.data };
    },

    /**
     * Evaluate a composition of policies (anyOf / allOf / majority).
     * composition: { mode: 'anyOf'|'allOf'|'majority', policyIds: [...], threshold?: number }
     */
    async evaluateComposition({ composition, context = {} } = {}) {
      const r = await call(policyOs, 'POST', '/api/composition-evaluate', { composition, context }, _pol);
      if (!r.ok) return { ok: false, allowed: false, error: r.error || r.data?.error || 'evaluateComposition failed' };
      return { ok: true, ...r.data };
    },

    /**
     * Check if a policy is currently effective (published + within time bounds).
     */
    async getPolicy(policyId) {
      const r = await call(policyOs, 'GET', `/api/policies/${encodeURIComponent(policyId)}`, null, _pol);
      if (!r.ok) return { ok: false, error: r.error || r.data?.error };
      return { ok: true, policy: r.data };
    },

    /**
     * Validate a policy body without persisting.
     */
    async validatePolicy(body) {
      const r = await call(policyOs, 'POST', '/api/policies/validate', body, _pol);
      return { ok: r.ok, errors: r.data?.errors || [], validated: r.data };
    },

    /**
     * Create a policy (requires admin token).
     */
    async createPolicy(body) {
      const r = await call(policyOs, 'POST', '/api/policies', body, _pol);
      return { ok: r.ok, policy: r.data, error: r.data?.error };
    },

    // ---------------------------------------------------------
    // Consent engine
    // ---------------------------------------------------------
    /**
     * Check consent for a subject+purpose. Fail-CLOSED: no record = deny.
     * Returns { ok, allowed, reason, consentId? }.
     */
    async checkConsent({ subjectId, purpose }) {
      const r = await call(consentEngine, 'POST', '/api/check', { subjectId, purpose }, _con);
      if (!r.ok) return { ok: false, allowed: false, error: r.error || r.data?.error };
      return { ok: true, ...r.data };
    },

    /**
     * Record a consent grant.
     */
    async grantConsent({ subjectId, purpose, source, evidence, validUntil, metadata }) {
      const r = await call(consentEngine, 'POST', '/api/consents', { subjectId, purpose, source, evidence, validUntil, metadata }, _con);
      return { ok: r.ok, consent: r.data, error: r.data?.error };
    },

    /**
     * Withdraw a single consent by id.
     */
    async withdrawConsent(consentId) {
      const r = await call(consentEngine, 'POST', `/api/consents/${encodeURIComponent(consentId)}/withdraw`, {}, _con);
      return { ok: r.ok, consent: r.data };
    },

    // ---------------------------------------------------------
    // Compliance engine
    // ---------------------------------------------------------
    /**
     * Record evidence linked to a control.
     */
    async recordEvidence({ controlId, kind, summary, source, metadata }) {
      const r = await call(complianceEngine, 'POST', '/api/evidence', { controlId, kind, summary, source, metadata }, _cmp);
      return { ok: r.ok, evidence: r.data, error: r.data?.error };
    },

    /**
     * Get the readiness snapshot for a framework (gdpr, soc2, hipaa, pci-dss, iso27001).
     */
    async frameworkSnapshot(framework) {
      const r = await call(complianceEngine, 'GET', `/api/frameworks/${encodeURIComponent(framework)}/snapshot`, null, _cmp);
      return { ok: r.ok, snapshot: r.data, error: r.data?.error };
    },

    /**
     * Coverage report: which controls are mapped, which are gaps.
     */
    async coverage(framework) {
      const path = framework ? `/api/coverage?framework=${encodeURIComponent(framework)}` : '/api/coverage';
      const r = await call(complianceEngine, 'GET', path, null, _cmp);
      return { ok: r.ok, coverage: r.data };
    }
  };
}

// Singleton default instance for simple callers
let _default;
export function governance() {
  if (!_default) _default = createGovernanceClient();
  return _default;
}
