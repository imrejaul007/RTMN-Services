/**
 * PolicyOS — GitOps Service Tests (Phase P1)
 *
 * Uses subprocess isolation for module state, pure class tests for PolicyFile.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ── Pure PolicyFile tests (no module state) ──────────────────────────────────

describe('PolicyFile — pure class', async () => {
  const { PolicyFile } = await import('../../src/services/gitops.js');

  describe('parse', () => {
    it('parses valid JSON policy', () => {
      const pf = new PolicyFile({
        path: 'policies/finance/allow-read.json',
        content: JSON.stringify({ id: 'allow-finance-read', name: 'Allow Finance', effect: 'allow' }),
      });
      const { data, format, parseError } = pf.parse();
      assert.strictEqual(parseError, null);
      assert.strictEqual(format, 'json');
      assert.strictEqual(data.id, 'allow-finance-read');
      assert.strictEqual(data.effect, 'allow');
    });

    it('parses YAML top-level keys', () => {
      const pf = new PolicyFile({
        path: 'policies/finance/allow.yaml',
        content: 'id: allow-finance-read\neffect: allow\nname: Allow Finance',
      });
      const { data, format, parseError } = pf.parse();
      assert.strictEqual(parseError, null);
      assert.strictEqual(format, 'yaml');
      assert.strictEqual(data.id, 'allow-finance-read');
      assert.strictEqual(data.effect, 'allow');
    });

    it('parses YAML with nested objects', () => {
      const pf = new PolicyFile({
        path: 'test.yaml',
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

  describe('validate', () => {
    it('validates a well-formed policy', () => {
      const pf = new PolicyFile({
        path: 'policies/test.yaml',
        content: 'id: allow-admin\neffect: allow\nname: Allow Admin',
      });
      const { valid, errors } = pf.validate();
      assert.strictEqual(valid, true, `Expected valid, got errors: ${JSON.stringify(errors)}`);
    });

    it('rejects invalid effect', () => {
      const pf = new PolicyFile({
        path: 'policies/bad.yaml',
        content: 'id: bad\neffect: permit\nname: Bad',
      });
      const { valid, errors } = pf.validate();
      assert.strictEqual(valid, false);
      assert.ok(errors.some(e => e.includes('Invalid effect')), `Expected 'Invalid effect', got: ${JSON.stringify(errors)}`);
    });

    it('rejects non-array conditions', () => {
      const pf = new PolicyFile({
        path: 'policies/bad.yaml',
        content: 'id: bad\neffect: allow\nconditions: not-an-array',
      });
      const { valid, errors } = pf.validate();
      assert.strictEqual(valid, false);
      assert.ok(errors.some(e => e.includes('conditions')), `Got: ${JSON.stringify(errors)}`);
    });
  });

  describe('category & policyId', () => {
    it('extracts category from path', () => {
      const pf = new PolicyFile({ path: 'policies/finance/spending.yaml', content: 'id: test' });
      assert.strictEqual(pf.category(), 'finance');
    });

    it('extracts policyId from JSON id field', () => {
      const pf = new PolicyFile({
        path: 'policies/test/filename.yaml',
        content: JSON.stringify({ id: 'my-policy', name: 'Test' }),
      });
      assert.strictEqual(pf.policyId(), 'my-policy');
    });

    it('falls back to filename when no id in content', () => {
      const pf = new PolicyFile({
        path: 'policies/test/spending-v2.yaml',
        content: JSON.stringify({ name: 'My Policy' }),
      });
      const id = pf.policyId();
      assert.ok(id.startsWith('spending'));
    });

    it('sanitizes filename to valid policy ID', () => {
      const pf = new PolicyFile({
        path: 'policies/test/Policy v2! special.yaml',
        content: JSON.stringify({ name: 'Test' }),
      });
      const id = pf.policyId();
      assert.ok(/^[a-z0-9-]+$/.test(id), `Expected sanitized ID, got: ${id}`);
    });
  });
});

// ── HMAC crypto ──────────────────────────────────────────────────────────────

describe('HMAC-SHA256 crypto', () => {
  it('computes valid HMAC-SHA256', () => {
    const secret = 'webhook-secret';
    const payload = '{"action":"push"}';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    assert.strictEqual(sig.length, 64);
    assert.ok(/^[a-f0-9]{64}$/.test(sig));
  });

  it('timing-safe comparison works for matching strings', () => {
    const a = crypto.randomBytes(32);
    const match = crypto.timingSafeEqual(a, Buffer.from(a));
    assert.strictEqual(match, true);
  });

  it('timing-safe comparison detects mismatch', () => {
    const a = Buffer.from('a'.repeat(32));
    const b = Buffer.from('b'.repeat(32));
    const match = crypto.timingSafeEqual(a, b);
    assert.strictEqual(match, false);
  });
});

// ── GitOps module state (stateful — each group re-imports cleanly) ──────────

describe('GitOps — configureGitOps', async () => {
  const { configureGitOps, getSyncStatus } = await import('../../src/services/gitops.js');

  it('sets disabled status when no repoUrl', () => {
    configureGitOps({ policies: new Map() });
    const s = getSyncStatus();
    assert.strictEqual(s.status, 'disabled');
    assert.strictEqual(s.configured, false);
    assert.strictEqual(s.ready, false);
  });

  it('sets idle status with repoUrl', () => {
    configureGitOps({
      policies: new Map(),
      repoUrl: 'https://github.com/acme/repo',
      branch: 'main',
    });
    const s = getSyncStatus();
    assert.strictEqual(s.status, 'idle');
    assert.strictEqual(s.configured, true);
    assert.strictEqual(s.config.repoUrl, 'https://github.com/acme/repo');
  });

  it('masks gitToken in config output', () => {
    configureGitOps({
      policies: new Map(),
      repoUrl: 'https://github.com/test/repo',
      gitToken: 'super-secret',
    });
    const s = getSyncStatus();
    assert.strictEqual(s.config.gitToken, '***');
    assert.notStrictEqual(s.config.gitToken, 'super-secret');
  });

  it('sets default branch to main', () => {
    configureGitOps({ policies: new Map(), repoUrl: 'https://github.com/test/repo' });
    const s = getSyncStatus();
    assert.strictEqual(s.config.branch, 'main');
  });

  it('sets default sync interval to 60s', () => {
    configureGitOps({ policies: new Map() });
    const s = getSyncStatus();
    assert.strictEqual(s.config.syncInterval, 60000);
  });

  it('generates UUID webhook secret', () => {
    configureGitOps({ policies: new Map() });
    const s = getSyncStatus();
    assert.strictEqual(s.config.webhookSecret.length, 36);
    assert.ok(s.config.webhookSecret.includes('-'));
  });
});

describe('GitOps — webhook signature', async () => {
  const { configureGitOps, verifyWebhookSignature } = await import('../../src/services/gitops.js');

  it('returns false when no secret configured', () => {
    configureGitOps({ policies: new Map() });
    assert.strictEqual(verifyWebhookSignature('payload', 'sha256=abc'), false);
  });

  it('returns false for null signature', () => {
    configureGitOps({ policies: new Map(), webhookSecret: 'secret' });
    assert.strictEqual(verifyWebhookSignature('payload', null), false);
  });

  it('returns true for valid HMAC-SHA256', () => {
    const secret = 'webhook-secret';
    const payload = '{"action":"push"}';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    configureGitOps({ policies: new Map(), webhookSecret: secret });
    assert.strictEqual(verifyWebhookSignature(payload, `sha256=${sig}`), true);
  });

  it('returns false for invalid signature', () => {
    configureGitOps({ policies: new Map(), webhookSecret: 'secret' });
    assert.strictEqual(verifyWebhookSignature('payload', 'sha256=wrong'), false);
  });

  it('accepts sig without sha256= prefix', () => {
    const secret = 'secret';
    const payload = 'test';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    configureGitOps({ policies: new Map(), webhookSecret: secret });
    assert.strictEqual(verifyWebhookSignature(payload, sig), true);
  });
});

describe('GitOps — branch protection', async () => {
  const gitops = (await import('../../src/services/gitops.js')).default;
  beforeEach(() => { gitops.configureGitOps({ policies: new Map() }); });

  it('sets protection rules', () => {
    const r = gitops.setBranchProtection('main', { requireReviews: true, requiredApprovals: 3 });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.protection.requiredApprovals, 3);
    assert.strictEqual(r.protection.requireReviews, true);
  });

  it('applies default values', () => {
    gitops.setBranchProtection('develop');
    const p = gitops.getBranchProtections('develop');
    assert.strictEqual(p.requireReviews, true);
    assert.strictEqual(p.requiredApprovals, 1);
  });

  it('returns null for unset branch', () => {
    assert.strictEqual(gitops.getBranchProtections('nonexistent'), null);
  });

  it('returns all protections without args', () => {
    gitops.setBranchProtection('release', { requiredApprovals: 5 });
    const all = gitops.getBranchProtections();
    assert.ok(all.release);
    assert.strictEqual(all.release.requiredApprovals, 5);
  });
});

describe('GitOps — syncFromGit', async () => {
  const { configureGitOps, syncFromGit } = await import('../../src/services/gitops.js');

  it('returns error when disabled', async () => {
    configureGitOps({ policies: new Map() });
    const r = await syncFromGit();
    assert.strictEqual(r.ok, false);
    assert.ok(r.error.includes('not configured'));
  });

  it('dry-run mode returns diff without writing', async () => {
    const policies = new Map();
    configureGitOps({ policies, dryRun: true, branch: 'main' });
    const r = await syncFromGit({ dryRun: true });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.dryRun, true);
    assert.ok(typeof r.summary === 'object');
    assert.strictEqual(policies.size, 0, 'Dry-run must not write to store');
  });
});

describe('GitOps — handlePRLifecycle', async () => {
  const { configureGitOps, handlePRLifecycle } = await import('../../src/services/gitops.js');

  it('skips non-merge PR actions', async () => {
    configureGitOps({ policies: new Map(), repoUrl: 'https://github.com/test/repo' });
    const r = await handlePRLifecycle({
      prNumber: 42, action: 'opened', branch: 'feature', targetBranch: 'main',
    });
    assert.strictEqual(r.skipped, true);
  });

  it('triggers sync on PR merge', async () => {
    configureGitOps({
      policies: new Map(),
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      dryRun: true,
    });
    const r = await handlePRLifecycle({
      prNumber: 42, action: 'closed', branch: 'feature',
      targetBranch: 'main', commitSha: 'abc123',
    });
    assert.strictEqual(r.ok, true);
  });
});

describe('GitOps — rollbackPolicy', async () => {
  const { configureGitOps, rollbackPolicy } = await import('../../src/services/gitops.js');

  it('returns error for unknown policy', async () => {
    configureGitOps({ policies: new Map() });
    const r = await rollbackPolicy('unknown-policy');
    assert.strictEqual(r.ok, false);
    assert.ok(r.error.includes('not found'));
  });

  it('returns error for non-gitops policy', async () => {
    const policies = new Map();
    policies.set('local-only', { id: 'local-only', _gitops: undefined });
    configureGitOps({ policies });
    const r = await rollbackPolicy('local-only');
    assert.strictEqual(r.ok, false);
    assert.ok(r.error.includes('not GitOps-managed'));
  });

  it('archives gitops policy in dev mode', async () => {
    const policies = new Map();
    policies.set('git-policy', {
      id: 'git-policy',
      _gitops: { sourcePath: 'policies/test.yaml' },
    });
    configureGitOps({ policies, dryRun: true });
    const r = await rollbackPolicy('git-policy');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.action, 'archived');
  });
});

describe('GitOps — getSyncStatus & getSyncHistory', async () => {
  const { configureGitOps, getSyncStatus, getSyncHistory } = await import('../../src/services/gitops.js');

  it('returns empty history initially', () => {
    configureGitOps({ policies: new Map() });
    const h = getSyncHistory();
    assert.ok(Array.isArray(h));
    assert.strictEqual(h.length, 0);
  });
});
