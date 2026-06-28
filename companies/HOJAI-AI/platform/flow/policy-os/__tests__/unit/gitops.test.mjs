/**
 * PolicyOS — GitOps Service Tests (Phase P1)
 * All stateful tests use _resetGitOpsState() beforeEach to isolate module state.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ── Import once at top — module state reset between each describe ─────────────────

const gitops = await import('../../src/services/gitops.js');
const { default: svc } = gitops;
const { PolicyFile } = gitops;

beforeEach(() => {
  svc.configureGitOps({ policies: new Map() });
});

// ── PolicyFile — parse ─────────────────────────────────────────────────────────

describe('PolicyFile.parse', () => {
  it('parses valid JSON', () => {
    const pf = new PolicyFile({
      path: 'policies/test.json',
      content: JSON.stringify({ id: 'test', effect: 'allow', name: 'Test' }),
    });
    const { data, format, parseError } = pf.parse();
    assert.strictEqual(parseError, null);
    assert.strictEqual(format, 'json');
    assert.strictEqual(data.id, 'test');
    assert.strictEqual(data.effect, 'allow');
  });

  it('parses YAML top-level keys', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: test\neffect: allow\nname: Test',
    });
    const { data, format, parseError } = pf.parse();
    assert.strictEqual(parseError, null);
    assert.strictEqual(format, 'yaml');
    assert.strictEqual(data.id, 'test');
    assert.strictEqual(data.effect, 'allow');
  });

  it('parses YAML with nested objects', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: test\nconditions:\n  field: amount\n  operator: gt\n  value: 100',
    });
    const { data, parseError } = pf.parse();
    assert.strictEqual(parseError, null);
    assert.strictEqual(data.id, 'test');
    assert.strictEqual(data.conditions.field, 'amount');
    assert.strictEqual(data.conditions.operator, 'gt');
    assert.strictEqual(data.conditions.value, 100);
  });
});

// ── PolicyFile — validate ───────────────────────────────────────────────────────

describe('PolicyFile.validate', () => {
  it('validates well-formed policy', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: good\neffect: allow\nname: Good',
    });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, true, `Expected valid, got: ${JSON.stringify(errors)}`);
  });

  it('rejects invalid effect', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: bad\neffect: permit\nname: Bad',
    });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, false);
    assert.ok(errors.some(e => e.includes('Invalid effect')), `Got: ${JSON.stringify(errors)}`);
  });

  it('rejects non-array conditions', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: bad\neffect: allow\nconditions: nope',
    });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, false);
    assert.ok(errors.some(e => e.includes('conditions')), `Got: ${JSON.stringify(errors)}`);
  });
});

// ── PolicyFile — category & policyId ───────────────────────────────────────────

describe('PolicyFile.category & policyId', () => {
  it('extracts category from path', () => {
    const pf = new PolicyFile({ path: 'policies/finance/spending.yaml', content: 'id: t' });
    assert.strictEqual(pf.category(), 'finance');
  });

  it('uses id from content over filename', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: JSON.stringify({ id: 'my-policy' }),
    });
    assert.strictEqual(pf.policyId(), 'my-policy');
  });

  it('falls back to filename when no id in content', () => {
    const pf = new PolicyFile({
      path: 'policies/test/spending-v2.yaml',
      content: JSON.stringify({ name: 'Test' }),
    });
    assert.ok(pf.policyId().startsWith('spending'));
  });

  it('sanitizes filename to valid policy ID', () => {
    const pf = new PolicyFile({
      path: 'policies/test/Policy v2! special.yaml',
      content: JSON.stringify({ name: 'Test' }),
    });
    assert.ok(/^[a-z0-9-]+$/.test(pf.policyId()), `Got: ${pf.policyId()}`);
  });
});

// ── HMAC crypto ──────────────────────────────────────────────────────────────

describe('HMAC-SHA256', () => {
  it('computes 64-char hex digest', () => {
    const sig = crypto.createHmac('sha256', 'secret').update('payload').digest('hex');
    assert.strictEqual(sig.length, 64);
    assert.ok(/^[a-f0-9]{64}$/.test(sig));
  });

  it('timingSafeEqual matches identical buffers', () => {
    const a = crypto.randomBytes(32);
    assert.strictEqual(crypto.timingSafeEqual(a, Buffer.from(a)), true);
  });

  it('timingSafeEqual detects mismatch', () => {
    const a = Buffer.from('a'.repeat(32));
    const b = Buffer.from('b'.repeat(32));
    assert.strictEqual(crypto.timingSafeEqual(a, b), false);
  });

  it('timingSafeEqual throws on different lengths', () => {
    const a = Buffer.from('a'.repeat(16));
    const b = Buffer.from('b'.repeat(32)));
    assert.throws(() => crypto.timingSafeEqual(a, b));
  });
});

// ── configureGitOps ─────────────────────────────────────────────────────────

describe('configureGitOps', () => {
  beforeEach(() => { svc.configureGitOps({ policies: new Map() }); });

  it('returns disabled status when no repoUrl', () => {
    const s = svc.getSyncStatus();
    assert.strictEqual(s.status, 'disabled');
    assert.strictEqual(s.configured, false);
    assert.strictEqual(s.ready, false);
  });

  it('returns idle status when repoUrl is set', () => {
    svc.configureGitOps({ policies: new Map(), repoUrl: 'https://github.com/acme/repo' });
    const s = svc.getSyncStatus();
    assert.strictEqual(s.status, 'idle');
    assert.strictEqual(s.configured, true);
    assert.strictEqual(s.config.repoUrl, 'https://github.com/acme/repo');
  });

  it('masks gitToken in config output', () => {
    svc.configureGitOps({ policies: new Map(), repoUrl: 'https://github.com/test/repo', gitToken: 'secret' });
    const s = svc.getSyncStatus();
    assert.strictEqual(s.config.gitToken, '***');
    assert.notStrictEqual(s.config.gitToken, 'secret');
  });

  it('defaults branch to main', () => {
    svc.configureGitOps({ policies: new Map(), repoUrl: 'https://github.com/test/repo' });
    assert.strictEqual(svc.getSyncStatus().config.branch, 'main');
  });

  it('defaults sync interval to 60000ms', () => {
    assert.strictEqual(svc.getSyncStatus().config.syncInterval, 60000);
  });

  it('generates a UUID webhook secret', () => {
    const secret = svc.getSyncStatus().config.webhookSecret;
    assert.strictEqual(secret.length, 36);
    assert.ok(secret.includes('-'));
  });
});

// ── webhook signature ─────────────────────────────────────────────────────────

describe('verifyWebhookSignature', () => {
  beforeEach(() => { svc.configureGitOps({ policies: new Map() }); });

  it('returns false when no secret configured', () => {
    assert.strictEqual(svc.verifyWebhookSignature('payload', 'sha256=abc'), false);
  });

  it('returns false for null signature', () => {
    svc.configureGitOps({ policies: new Map(), webhookSecret: 'secret' });
    assert.strictEqual(svc.verifyWebhookSignature('payload', null), false);
  });

  it('returns true for valid HMAC-SHA256 with sha256= prefix', () => {
    const secret = 'webhook-secret';
    const payload = '{"action":"push"}';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    svc.configureGitOps({ policies: new Map(), webhookSecret: secret });
    assert.strictEqual(svc.verifyWebhookSignature(payload, `sha256=${sig}`), true);
  });

  it('returns false for invalid signature', () => {
    svc.configureGitOps({ policies: new Map(), webhookSecret: 'secret' });
    assert.strictEqual(svc.verifyWebhookSignature('payload', 'sha256=' + 'a'.repeat(64)), false);
  });

  it('accepts signature without sha256= prefix', () => {
    const secret = 'secret';
    const payload = 'data';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    svc.configureGitOps({ policies: new Map(), webhookSecret: secret });
    assert.strictEqual(svc.verifyWebhookSignature(payload, sig), true);
  });
});

// ── syncFromGit ───────────────────────────────────────────────────────────────

describe('syncFromGit', () => {
  beforeEach(() => { svc.configureGitOps({ policies: new Map() }); });

  it('returns error when disabled (no repoUrl)', async () => {
    const r = await svc.syncFromGit();
    assert.strictEqual(r.ok, false);
    assert.ok(r.error.includes('not configured'));
  });

  it('dry-run does not write to store', async () => {
    const policies = new Map();
    svc.configureGitOps({ policies, dryRun: true, branch: 'main' });
    const r = await svc.syncFromGit({ dryRun: true });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.dryRun, true);
    assert.ok(typeof r.summary === 'object');
    assert.strictEqual(policies.size, 0, 'Dry-run must not write');
  });
});

// ── handlePRLifecycle ─────────────────────────────────────────────────────────

describe('handlePRLifecycle', () => {
  beforeEach(() => { svc.configureGitOps({ policies: new Map() }); });

  it('skips non-merge PR actions', async () => {
    svc.configureGitOps({ policies: new Map(), repoUrl: 'https://github.com/test/repo' });
    const r = await svc.handlePRLifecycle({
      prNumber: 42, action: 'opened', branch: 'feature', targetBranch: 'main',
    });
    assert.strictEqual(r.skipped, true);
  });

  it('triggers sync on PR merge to target branch', async () => {
    svc.configureGitOps({
      policies: new Map(), repoUrl: 'https://github.com/test/repo',
      branch: 'main', dryRun: true,
    });
    const r = await svc.handlePRLifecycle({
      prNumber: 42, action: 'closed', branch: 'feature',
      targetBranch: 'main', commitSha: 'abc123',
    });
    assert.strictEqual(r.ok, true);
  });
});

// ── rollbackPolicy ─────────────────────────────────────────────────────────

describe('rollbackPolicy', () => {
  beforeEach(() => { svc.configureGitOps({ policies: new Map() }); });

  it('returns error for unknown policy', async () => {
    const r = await svc.rollbackPolicy('does-not-exist');
    assert.strictEqual(r.ok, false);
    assert.ok(r.error.includes('not found'));
  });

  it('returns error for non-gitops policy', async () => {
    const policies = new Map();
    policies.set('local-only', { id: 'local-only', _gitops: undefined });
    svc.configureGitOps({ policies });
    const r = await svc.rollbackPolicy('local-only');
    assert.strictEqual(r.ok, false);
    assert.ok(r.error.includes('not GitOps-managed'));
  });

  it('archives gitops-managed policy in dev/dry-run mode', async () => {
    const policies = new Map();
    policies.set('git-policy', { id: 'git-policy', _gitops: { sourcePath: 'policies/test.yaml' } });
    svc.configureGitOps({ policies, dryRun: true });
    const r = await svc.rollbackPolicy('git-policy');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.action, 'archived');
  });
});

// ── branch protection ─────────────────────────────────────────────────────────

describe('setBranchProtection', () => {
  beforeEach(() => { svc.configureGitOps({ policies: new Map() }); });

  it('sets protection with custom rules', () => {
    const r = svc.setBranchProtection('main', { requireReviews: true, requiredApprovals: 3 });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.protection.requiredApprovals, 3);
    assert.strictEqual(r.protection.requireReviews, true);
  });

  it('applies default values', () => {
    svc.setBranchProtection('develop');
    const p = svc.getBranchProtections('develop');
    assert.strictEqual(p.requireReviews, true);
    assert.strictEqual(p.requiredApprovals, 1);
  });

  it('returns null for unset branch', () => {
    assert.strictEqual(svc.getBranchProtections('nonexistent'), null);
  });

  it('returns all protections without args', () => {
    svc.setBranchProtection('release', { requiredApprovals: 5 });
    const all = svc.getBranchProtections();
    assert.ok(all.release);
    assert.strictEqual(all.release.requiredApprovals, 5);
  });
});

// ── getSyncHistory ─────────────────────────────────────────────────────────

describe('getSyncHistory', () => {
  beforeEach(() => { svc.configureGitOps({ policies: new Map() }); });

  it('returns empty array initially', () => {
    const h = svc.getSyncHistory();
    assert.ok(Array.isArray(h));
    assert.strictEqual(h.length, 0);
  });

  it('returns limited history', () => {
    const h = svc.getSyncHistory(5);
    assert.ok(Array.isArray(h));
  });
});
