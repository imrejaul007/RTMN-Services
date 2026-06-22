# Governance Platform — Integration Guide

> Recipes for wiring policy-os, consent-engine, and compliance-engine into your service. Every service in the RTMN ecosystem can (and should) call these before touching user data.

For the endpoint reference, see [API.md](./API.md). For the SDK, see the [Governance SDK section in PRODUCTION-READY.md](./PRODUCTION-READY.md#governance-sdk-rtmnpolicysharedlibgovernance-sdk).

---

## 1. Use the SDK (recommended)

```js
import { createGovernanceClient } from '@rtmn/shared/lib/governance-sdk';

const gov = createGovernanceClient({
  // tokens: { policyOs, consentEngine, complianceEngine }   // optional, per-service
  // timeoutMs: 1500                                          // optional
});
```

**Service URLs** are auto-resolved from env (`POLICY_OS_URL`, `CONSENT_ENGINE_URL`, `COMPLIANCE_ENGINE_URL`) or fall back to the dev ports.

**Tokens** are auto-resolved from env (`POLICYOS_SERVICE_TOKEN`, `CONSENT_SERVICE_TOKEN`, `COMPLIANCE_SERVICE_TOKEN`).

### Available methods

| Method | What |
|---|---|
| `gov.evaluate({policyId, context})` | policy decision |
| `gov.evaluateComposition({composition, context})` | policy decision over many policies |
| `gov.getPolicy(id)` | fetch one policy |
| `gov.validatePolicy(body)` | dry-run validation |
| `gov.createPolicy(body)` | create (admin only) |
| `gov.checkConsent({subjectId, purpose})` | consent check (THE main one) |
| `gov.grantConsent({subjectId, purpose, ...})` | record consent |
| `gov.withdrawConsent(consentId)` | revoke |
| `gov.recordEvidence({controlId, kind, summary, ...})` | compliance evidence |
| `gov.frameworkSnapshot(framework)` | GDPR/SOC2/etc. readiness |
| `gov.coverage(framework?)` | gap report |

Every method returns `{ ok, ... }` and preserves fail-closed semantics on network errors.

---

## 2. Recipe: check authorization before acting

```js
import { governance } from '@rtmn/shared/lib/governance-sdk';

async function purchase(userId, amount, itemId) {
  const decision = await governance().evaluate({
    context: {
      action: 'purchase',
      user: { id: userId, role: 'customer' },
      amount, itemId
    }
  });

  if (!decision.ok || !decision.allowed) {
    // audit-log + return 403
    logger.warn({ userId, amount, reasons: decision.reasons }, 'purchase denied');
    return { ok: false, code: 'forbidden', reasons: decision.reasons };
  }
  return processPurchase(userId, amount, itemId);
}
```

**Note:** if `decision.ok === false`, that means the SDK couldn't reach policy-os. You MUST treat it as a deny (fail-closed). The `reasons` array on the response always explains why.

---

## 3. Recipe: check consent before sending marketing

```js
async function sendMarketingEmail(userId, template) {
  const consent = await governance().checkConsent({
    subjectId: userId,
    purpose: 'marketing.email'
  });

  if (!consent.allowed) {
    // silently drop, OR queue for a different channel (push, in-app)
    return { sent: false, reason: 'no_consent' };
  }
  return emailService.send(userId, template, { consentId: consent.consentId });
}
```

Add the consent record at signup:

```js
await governance().grantConsent({
  subjectId: userId,
  purpose: 'marketing.email',
  source: 'signup-form',
  evidence: 'checkbox-v2'
});
```

Respect withdrawal immediately:

```js
app.post('/api/account/withdraw-consent', async (req, res) => {
  const { subjectId, purpose } = req.body;
  await governance().withdrawConsent(req.body.consentId);
  // OR bulk-withdraw everything for this purpose:
  // await governance().bulkWithdraw(subjectId, purpose);  // not in SDK yet, call /api/consents/withdraw
  res.json({ ok: true });
});
```

---

## 4. Recipe: GDPR right-to-erasure flow

```js
async function gdprErasure(subjectId) {
  // 1. Withdraw all active consents
  for (const purpose of [
    'marketing.email', 'marketing.sms', 'marketing.push',
    'analytics.cohort', 'personalization.recommendations',
    'profiling', 'research.aggregated'
  ]) {
    await fetch(`${CONSENT_URL}/api/consents/withdraw`, {
      method: 'POST',
      headers: { 'X-Service-Token': TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, purpose })
    });
  }
  // 2. Audit it
  await governance().recordEvidence({
    controlId: 'gdpr.art17',
    kind: 'erasure',
    summary: `Right-to-erasure fulfilled for ${subjectId}`,
    source: 'gdpr-portal'
  });
  // 3. Trigger your service's actual delete
  await userService.deleteUser(subjectId);
}
```

---

## 5. Recipe: policy composition for "deploy to production"

```js
const deployPolicy = {
  name: 'deploy-to-production',
  category: 'security',
  status: 'published',
  composition: {
    mode: 'allOf',
    policyIds: [
      'pol-code-reviewed',       // must be approved
      'pol-tests-passed',        // must be approved
      'pol-security-signed-off'  // must be approved
    ]
  }
};

const result = await governance().createPolicy(deployPolicy);

// When a deploy is requested:
const decision = await governance().evaluateComposition({
  composition: deployPolicy.composition,
  context: { deployId, requester: userId }
});

if (!decision.ok || !decision.allowed) {
  return { ok: false, code: 'forbidden', which: decision.memberResults.filter(m => !m.allowed) };
}
```

---

## 6. Recipe: subscribe to policy events via webhook

```js
// Subscribe your downstream service to all policy changes:
await fetch(`${POLICYOS_URL}/api/webhooks`, {
  method: 'POST',
  headers: { 'X-Service-Token': TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://my-service.internal/policy-events',
    events: ['policy.created', 'policy.updated', 'policy.published', 'policy.deleted'],
    secret: 'shared-secret-for-hmac'
  })
});
```

Your handler verifies the HMAC:

```js
import crypto from 'crypto';

function verify(req) {
  const sig = req.headers['x-policyos-signature'];       // "sha256=..."
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET)
    .update(JSON.stringify(req.body)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
```

---

## 7. Recipe: time-bounded policy (e.g. blackout window)

Useful for "no purchases between 11pm and 6am":

```js
await governance().createPolicy({
  name: 'no-late-night-purchases',
  category: 'business',
  status: 'published',
  rules: [
    { if: { 'context.hour': { gte: 23 } }, then: { allow: false, action: 'blackout' } },
    { if: { 'context.hour': { lt: 6 } },  then: { allow: false, action: 'blackout' } }
  ],
  effectiveFrom: '2026-07-01T00:00:00Z',
  effectiveUntil: '2026-12-31T23:59:59Z',
  tags: ['blackout', 'seasonal']
});
```

Or schedule a temporary override for a one-off event:

```js
// Allow 24h of late-night purchases on Black Friday
await governance().createPolicy({
  name: 'black-friday-override',
  category: 'business',
  status: 'published',
  rules: [{ if: {}, then: { allow: true, action: 'override' } }],
  effectiveFrom: '2026-11-29T00:00:00Z',
  effectiveUntil: '2026-11-30T00:00:00Z'
});
```

The override is automatically inert outside that window — no manual cleanup.

---

## 8. Recipe: compliance evidence at deploy time

```js
// In your CI pipeline, after a successful deploy:
await governance().recordEvidence({
  controlId: 'soc2.cc8',  // change management
  kind: 'deploy',
  summary: `Production deploy ${deployId} completed`,
  source: 'ci-pipeline',
  metadata: { commit: process.env.GIT_SHA, actor: process.env.USER }
});
```

Or attestation after a security review:

```js
await fetch(`${COMPLIANCE_URL}/api/attestations`, {
  method: 'POST',
  headers: { 'X-Service-Token': TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    controlId: 'soc2.cc6',  // logical access
    attestedBy: 'ciso@example.com',
    validUntil: '2026-12-31T00:00:00Z',
    notes: 'Q2 access review completed'
  })
});
```

---

## 9. Recipe: dry-run validation before mass-creating

```js
const candidatePolicy = { name: '...', category: '...', rules: [...] };
const v = await governance().validatePolicy(candidatePolicy);
if (!v.ok) {
  console.error('Policy invalid:', v.errors);
  return;
}
await governance().createPolicy(candidatePolicy);
```

For migrations, use bulk:

```js
await fetch(`${POLICYOS_URL}/api/policies/bulk`, {
  method: 'POST',
  headers: { 'X-Service-Token': TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ policies: [...readFromFile()] })
});
```

The response is 207 (Multi-Status) with per-item success/error.

---

## 10. Recipe: graceful shutdown

If you embed the governance services in your own service (uncommon — they run standalone), use the shared shutdown helper:

```js
import { setupGracefulShutdown } from '@rtmn/shared/lib/shutdown';
// ... your express app ...
setupGracefulShutdown(server, [persistentStore1, persistentStore2]);
```

This installs SIGTERM/SIGINT handlers that call `flush()` on each store before exit. Without it, in-flight writes can be lost.

---

## Cross-cutting concerns

### Network failure → deny

The SDK returns `{ok: false, allowed: false}` on any network error. **Always check `ok` before `allowed`.**

```js
const d = await gov.evaluate({...});
if (!d.ok) return { ok: false, code: 'governance_unavailable' };  // safe default
if (!d.allowed) return { ok: false, code: 'forbidden', reasons: d.reasons };
return doTheThing();
```

### Audit trail continuity

Every governance service writes to a JSONL file in `data/<service>/audit.jsonl`. The RTMN Hub's central audit endpoint is a future addition; for now, ship the JSONL files to your log aggregator (Loki, Splunk, S3, etc.).

### Multi-region

State is per-process (file-backed). For multi-region, deploy one instance per region and replicate by:
- Policy + consent: event-sourced replication via webhooks
- Evidence + attestations: async replication to a central store

For most teams, single-region is fine until you have a compliance reason to replicate.

---

## See also

- [PRODUCTION-READY.md](./PRODUCTION-READY.md)
- [API.md](./API.md)
- [Governance SDK source](../../shared/lib/governance-sdk.js)
