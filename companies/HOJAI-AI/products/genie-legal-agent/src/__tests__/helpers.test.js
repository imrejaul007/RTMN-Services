const { test } = require('node:test');
const assert = require('node:assert/strict');

const { detectRisks, computeRiskScore, draftTemplate } = require('../index.js');

// ─── detectRisks ───────────────────────────────────────────────────────

test('detectRisks: finds unlimited liability', () => {
  const risks = detectRisks('The party accepts unlimited liability for any damages.');
  assert.ok(risks.some((r) => r.label === 'Unlimited liability clause'));
});

test('detectRisks: finds broad indemnification', () => {
  const risks = detectRisks('Party shall indemnify and hold harmless against all claims.');
  assert.ok(risks.some((r) => r.label === 'Broad indemnification'));
});

test('detectRisks: returns sorted by severity (critical first)', () => {
  const text = 'Standard contract. Party accepts unlimited liability. Governing law Singapore.';
  const risks = detectRisks(text);
  if (risks.length >= 2) {
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    for (let i = 1; i < risks.length; i++) {
      assert.ok(sevOrder[risks[i - 1].severity] <= sevOrder[risks[i].severity]);
    }
  }
});

test('detectRisks: returns empty for clean text', () => {
  const risks = detectRisks('This is a standard employment agreement.');
  // No critical/high/medium risk patterns expected
  const significant = risks.filter((r) => ['critical', 'high', 'medium'].includes(r.severity));
  assert.equal(significant.length, 0);
});

test('detectRisks: counts multiple matches of same pattern', () => {
  const risks = detectRisks('unlimited liability applies. unlimited liability also.');
  const ul = risks.find((r) => r.label === 'Unlimited liability clause');
  assert.ok(ul.count >= 2);
});

test('detectRisks: case-insensitive', () => {
  const risks = detectRisks('UNLIMITED LIABILITY applies.');
  assert.ok(risks.some((r) => r.label === 'Unlimited liability clause'));
});

// ─── computeRiskScore ──────────────────────────────────────────────────

test('computeRiskScore: 0 for no risks', () => {
  assert.equal(computeRiskScore([]), 0);
});

test('computeRiskScore: 40 for one critical risk', () => {
  const risks = [{ severity: 'critical' }];
  assert.equal(computeRiskScore(risks), 40);
});

test('computeRiskScore: caps at 100', () => {
  const risks = Array(10).fill({ severity: 'critical' });
  assert.equal(computeRiskScore(risks), 100);
});

test('computeRiskScore: medium risk = 8 points', () => {
  const risks = [{ severity: 'medium' }];
  assert.equal(computeRiskScore(risks), 8);
});

test('computeRiskScore: info risks subtract 1 each', () => {
  const risks = [{ severity: 'info' }];
  assert.equal(computeRiskScore(risks), 0); // 0 - 1 clamped to 0
});

// ─── draftTemplate ─────────────────────────────────────────────────────

test('draftTemplate: NDA includes both parties', () => {
  const doc = draftTemplate('nda', { partyA: 'Acme Inc', partyB: 'Beta LLC', jurisdiction: 'US', term: '2 years' });
  assert.ok(doc.includes('Acme Inc'));
  assert.ok(doc.includes('Beta LLC'));
});

test('draftTemplate: NDA includes term', () => {
  const doc = draftTemplate('nda', { partyA: 'A', partyB: 'B', jurisdiction: 'US', term: '5 years' });
  assert.ok(doc.includes('5 years'));
});

test('draftTemplate: MSA includes payment terms', () => {
  const doc = draftTemplate('msa', { partyA: 'A', partyB: 'B', jurisdiction: 'US', term: '1 year' });
  assert.ok(/payment/i.test(doc));
});

test('draftTemplate: SOW includes scope section', () => {
  const doc = draftTemplate('sow', { partyA: 'A', partyB: 'B', jurisdiction: 'US', term: '3 months' });
  assert.ok(/scope/i.test(doc));
});

test('draftTemplate: includes jurisdiction', () => {
  const doc = draftTemplate('nda', { partyA: 'A', partyB: 'B', jurisdiction: 'Singapore', term: '1 year' });
  assert.ok(doc.includes('Singapore'));
});

test('draftTemplate: NDA has today date', () => {
  const doc = draftTemplate('nda', { partyA: 'A', partyB: 'B', jurisdiction: 'US', term: '1 year' });
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(doc.includes(today));
});