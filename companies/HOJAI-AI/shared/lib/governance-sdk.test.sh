#!/bin/bash
# Governance SDK - smoke test via the running services
# Verifies the SDK can talk to policy-os, consent-engine, compliance-engine.
# Note: not `set -u` because the heredoc + nested expansions get fragile.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOJAI_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SDK_PATH="$HOJAI_ROOT/shared/lib/governance-sdk.js"

cat > /tmp/_gov_sdk_test.mjs <<EOF
import { createGovernanceClient } from '${SDK_PATH}';

const polToken = process.env.POLICYOS_TOKEN;
const cmpToken = process.env.COMPLIANCE_TOKEN;
const conToken = process.env.CONSENT_TOKEN;
const gov = createGovernanceClient({
  tokens: { policyOs: polToken, complianceEngine: cmpToken, consentEngine: conToken }
});

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { console.log('  PASS  ' + label); pass++; }
  else { console.log('  FAIL  ' + label); fail++; }
}

// 1. evaluate (no policy) should fail-closed
const r1 = await gov.evaluate({ context: { action: 'noop' } });
check('evaluate returns ok=true (got response)', r1.ok === true);
check('evaluate fail-closed: allowed=false when no policy matches', r1.allowed === false);

// 2. validate a bad policy
const r2 = await gov.validatePolicy({ name: 'x', category: 'unknown-cat' });
check('validatePolicy returns ok=false on bad category', r2.ok === false);
check('validatePolicy returns errors array', Array.isArray(r2.errors) && r2.errors.length > 0);

// 3. checkConsent (no record) should deny
const r3 = await gov.checkConsent({ subjectId: 'sdk-test-user', purpose: 'marketing.email' });
check('checkConsent returns ok=true (got response)', r3.ok === true);
check('checkConsent fail-closed: allowed=false when no consent', r3.allowed === false);

// 4. recordEvidence on a valid control
const r4 = await gov.recordEvidence({
  controlId: 'gdpr.art32',
  kind: 'config',
  summary: 'SDK smoke test evidence',
  source: 'sdk-test'
});
check('recordEvidence ok', r4.ok === true);

// 5. frameworkSnapshot
const r5 = await gov.frameworkSnapshot('gdpr');
check('frameworkSnapshot ok', r5.ok === true);
check('frameworkSnapshot has controls', Array.isArray(r5.snapshot && r5.snapshot.controls));

console.log('  Result: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
EOF

POLICYOS_TOKEN=$(grep "Service token" /tmp/policy-os-phase4.log 2>/dev/null | head -1 | awk '{print $NF}')
COMPLIANCE_TOKEN=$(grep "Service token" /tmp/compliance-engine.log 2>/dev/null | head -1 | awk '{print $NF}')
CONSENT_TOKEN=$(grep "Service token" /tmp/consent-engine.log 2>/dev/null | head -1 | awk '{print $NF}')
export POLICYOS_TOKEN COMPLIANCE_TOKEN CONSENT_TOKEN
node /tmp/_gov_sdk_test.mjs 2>&1 | tail -20
rm -f /tmp/_gov_sdk_test.mjs
