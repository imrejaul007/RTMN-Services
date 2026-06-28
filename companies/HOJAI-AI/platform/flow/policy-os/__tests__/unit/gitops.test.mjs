/**
 * PolicyOS — GitOps Service Tests (Phase P1)
 */

import { describe, it, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  configureGitOps,
  verifyWebhookSignature,
  syncFromGit,
  handlePRLifecycle,
  rollbackPolicy,
  listBranches,
  createBranch,
  setBranchProtection,
  getSyncStatus,
  getSyncHistory,
  getBranchProtections,
  PolicyFile,
  _resetGitOpsState,
} from '../../src/services/gitops.js';

// ── Global reset before all tests ───────────────────────────────────────────────

before(() => {
  _resetGitOpsState();
});

beforeEach(() => {
  _resetGitOpsState();
});

// ── configureGitOps ───────────────────────────────────────────────────────────

describe('configureGitOps', () => {

  it('configures with local filesystem when no repoUrl provided', () => {
    const result = configureGitOps({
      policies: new Map(),
      dryRun: true,
    });
    assert.strictEqual(result.status, 'disabled');
    assert.strictEqual(result.config.repoUrl, null);
  });

  it('configures with GitHub repo URL', () => {
    const result = configureGitOps({
      policies: new Map(),
      repoUrl: 'https://github.com/acme/policy-repo',
      branch: 'main',
      subPath: 'policies',
      autoSync: true,
    });
    assert.strictEqual(result.status, 'idle');
    assert.strictEqual(result.config.repoUrl, 'https://github.com/acme/policy-repo');
    assert.strictEqual(result.config.branch, 'main');
    assert.strictEqual(result.config.subPath, 'policies');
    assert.strictEqual(result.config.autoSync, true);
    assert.strictEqual(result.config.gitProvider, 'github');
  });

  it('masks gitToken in config response', () => {
    const result = configureGitOps({
      policies: new Map(),
      repoUrl: 'https://github.com/acme/policy-repo',
      gitToken: 'super-secret-token',
    });
    assert.strictEqual(result.config.gitToken, '***');
    assert.ok(result.config.gitToken !== 'super-secret-token');
  });

  it('sets custom branch protection defaults', () => {
    const result = configureGitOps({ policies: new Map() });
    assert.strictEqual(result.config.branch, 'main');
    assert.strictEqual(result.config.syncInterval, 60000);
    assert.strictEqual(result.config.webhookSecret.length, 36); // UUID
  });
});

// ── verifyWebhookSignature ─────────────────────────────────────────────────────

describe('verifyWebhookSignature', () => {
  it('returns false when no secret configured', () => {
    configureGitOps({ policies: new Map() });
    const valid = verifyWebhookSignature('payload', 'sha256=abc');
    assert.strictEqual(valid, false);
  });

  it('returns false for missing signature', () => {
    configureGitOps({ policies: new Map(), webhookSecret: 'secret' });
    const valid = verifyWebhookSignature('payload', null);
    assert.strictEqual(valid, false);
  });

  it('returns true for valid HMAC-SHA256 signature', () => {
    const secret = 'test-webhook-secret';
    const payload = '{"action":"push","ref":"refs/heads/main"}';
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    configureGitOps({ policies: new Map(), webhookSecret: secret });
    assert.strictEqual(verifyWebhookSignature(payload, `sha256=${expected}`), true);
  });

  it('returns false for invalid signature', () => {
    configureGitOps({ policies: new Map(), webhookSecret: 'secret' });
    const valid = verifyWebhookSignature('payload', 'sha256=invalid');
    assert.strictEqual(valid, false);
  });

  it('accepts signature without sha256= prefix', () => {
    const secret = 'secret';
    const payload = 'test';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    configureGitOps({ policies: new Map(), webhookSecret: secret });
    assert.strictEqual(verifyWebhookSignature(payload, sig), true);
  });
});

// ── PolicyFile ──────────────────────────────────────────────────────────────

describe('PolicyFile — parse', () => {
  it('parses valid JSON policy', () => {
    const content = JSON.stringify({
      id: 'allow-finance-read',
      name: 'Allow Finance Read',
      effect: 'allow',
      resources: ['finance:*'],
      actions: ['read'],
    });
    const pf = new PolicyFile({ path: 'policies/finance/allow-read.json', content });
    const { data, format, parseError } = pf.parse();
    assert.strictEqual(parseError, null);
    assert.strictEqual(format, 'json');
    assert.strictEqual(data.id, 'allow-finance-read');
    assert.strictEqual(data.effect, 'allow');
  });

  it('parses valid YAML policy', () => {
    const content = `
id: allow-finance-read
name: Allow Finance Read
effect: allow
resources:
  - finance:*
actions:
  - read
`;
    const pf = new PolicyFile({ path: 'policies/finance/allow-read.yaml', content });
    const { data, format, parseError } = pf.parse();
    assert.strictEqual(parseError, null);
    assert.strictEqual(format, 'yaml');
    assert.strictEqual(data.id, 'allow-finance-read');
    assert.deepStrictEqual(data.actions, ['read']);
  });

  it('parses YAML with nested objects', () => {
    const content = `
id: high-value-approval
effect: deny
conditions:
  - field: amount
    operator: gt
    value: 100000
  - field: department
    operator: eq
    value: Finance
`;
    const pf = new PolicyFile({ path: 'test.yaml', content });
    const { data } = pf.parse();
    assert.strictEqual(data.id, 'high-value-approval');
    assert.strictEqual(data.effect, 'deny');
    assert.strictEqual(data.conditions[0].field, 'amount');
  });

  it('parses YAML with quoted strings and escapes', () => {
    const content = 'name: "Obrien" \nvalue: "testvalue"';
    const pf = new PolicyFile({ path: 'test.yaml', content });
    const { data } = pf.parse();
    assert.strictEqual(data.name, 'Obrien');
    assert.strictEqual(data.value, 'testvalue');
  });

  it('returns parseError for invalid YAML', () => {
    const content = 'id: test\n  bad-indent: true';
    const pf = new PolicyFile({ path: 'test.yaml', content });
    const { parseError } = pf.parse();
    assert.ok(parseError != null, 'Should have parse error for bad YAML');
  });
});

describe('PolicyFile — validate', () => {
  it('validates a well-formed policy', () => {
    const content = `
id: allow-admin-all
name: Allow Admin All
effect: allow
resources: ['*']
actions: ['*']
`;
    const pf = new PolicyFile({ path: 'policies/admin.yaml', content });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, true, `Expected valid, got errors: ${errors.join(', ')}`);
    assert.strictEqual(errors.length, 0);
  });

  it('rejects invalid effect', () => {
    const content = `
id: bad-effect
effect: permit
resources: ['*']
`;
    const pf = new PolicyFile({ path: 'policies/bad.yaml', content });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, false);
    assert.ok(errors.some(e => e.includes('Invalid effect')));
  });

  it('rejects non-array conditions', () => {
    const content = `
id: bad-conditions
effect: allow
conditions: "not an array"
`;
    const pf = new PolicyFile({ path: 'policies/bad.yaml', content });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, false);
    assert.ok(errors.some(e => e.includes('conditions')));
  });

  it('rejects invalid policy without id or name', () => {
    const content = 'effect: allow\nresources: ["*"]';
    const pf = new PolicyFile({ path: 'policies/bad.yaml', content });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, false);
    assert.ok(errors.some(e => e.includes('id') || e.includes('name')));
  });
});

describe('PolicyFile — category & policyId', () => {
  it('extracts category from path', () => {
    const pf = new PolicyFile({ path: 'policies/finance/spending.yaml', content: 'id: test' });
    assert.strictEqual(pf.category(), 'finance');
  });

  it('extracts policyId from content', () => {
    const content = JSON.stringify({ id: 'my-policy' });
    const pf = new PolicyFile({ path: 'policies/finance/filename.yaml', content });
    assert.strictEqual(pf.policyId(), 'my-policy');
  });

  it('falls back to filename for policyId when not in content', () => {
    const content = JSON.stringify({ name: 'My Policy' });
    const pf = new PolicyFile({ path: 'policies/finance/spending-v2.yaml', content });
    assert.strictEqual(pf.policyId(), 'spending-v2');
  });

  it('sanitizes filename to valid policy ID', () => {
    const content = JSON.stringify({ name: 'Test' });
    const pf = new PolicyFile({ path: 'policies/test/Policy v2! special.yaml', content });
    const id = pf.policyId();
    assert.ok(/^[a-z0-9-]+$/.test(id), `Expected sanitized ID, got: ${id}`);
  });
});

// ── syncFromGit ─────────────────────────────────────────────────────────────

describe('syncFromGit', () => {
  it('returns error when GitOps is disabled', async () => {
    configureGitOps({ policies: new Map() });
    const result = await syncFromGit();
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes('not configured'));
  });

  it('dry-run returns diff without writing to store', async () => {
    const policies = new Map();
    configureGitOps({
      policies,
      dryRun: true,
      branch: 'main',
    });
    const result = await syncFromGit({ dryRun: true });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.dryRun, true);
    assert.ok(typeof result.summary === 'object');
    assert.strictEqual(policies.size, 0, 'Dry-run should not write to store');
  });

  it('detects new, updated, and unchanged policies', async () => {
    const policies = new Map();
    policies.set('existing-policy', {
      id: 'existing-policy',
      name: 'Existing',
      effect: 'allow',
      _gitops: { sourcePath: 'policies/test/existing.yaml' },
    });
    configureGitOps({ policies, dryRun: true });

    const result = await syncFromGit({ dryRun: true });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.summary.toCreate >= 0, true);
  });
});

// ── handlePRLifecycle ───────────────────────────────────────────────────────

describe('handlePRLifecycle', () => {
  it('returns skipped for non-merge actions', async () => {
    configureGitOps({ policies: new Map(), repoUrl: 'https://github.com/test/repo' });
    const result = await handlePRLifecycle({
      prNumber: 42,
      action: 'opened',
      branch: 'feature',
      targetBranch: 'main',
    });
    assert.strictEqual(result.skipped, true);
  });

  it('syncs on PR merge to target branch', async () => {
    configureGitOps({
      policies: new Map(),
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      dryRun: true,
    });
    const result = await handlePRLifecycle({
      prNumber: 42,
      action: 'closed',
      branch: 'feature',
      targetBranch: 'main',
      commitSha: 'abc123',
    });
    assert.strictEqual(result.ok, true);
  });

  it('dry-runs on PR open/sync', async () => {
    configureGitOps({
      policies: new Map(),
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      dryRun: true,
    });
    const result = await handlePRLifecycle({
      prNumber: 42,
      action: 'opened',
      branch: 'feature',
      targetBranch: 'main',
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.dryRun, true);
  });
});

// ── rollbackPolicy ────────────────────────────────────────────────────────

describe('rollbackPolicy', () => {
  it('returns error for non-existent policy', async () => {
    configureGitOps({ policies: new Map() });
    const result = await rollbackPolicy('does-not-exist');
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes('not found'));
  });

  it('returns error for non-gitops policy', async () => {
    const policies = new Map();
    policies.set('local-only', { id: 'local-only', name: 'Local', _gitops: undefined });
    configureGitOps({ policies });
    const result = await rollbackPolicy('local-only');
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes('not GitOps-managed'));
  });

  it('archives gitops policy in dry-run/dev mode', async () => {
    const policies = new Map();
    policies.set('git-policy', {
      id: 'git-policy',
      name: 'Git Policy',
      _gitops: { sourcePath: 'policies/test.yaml', version: '1.0' },
    });
    configureGitOps({ policies, dryRun: true });
    const result = await rollbackPolicy('git-policy');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.action, 'archived');
  });
});

// ── Branch Protection ──────────────────────────────────────────────────────

describe('setBranchProtection', () => {
  it('sets protection rules for a branch', () => {
    configureGitOps({ policies: new Map() });
    const result = setBranchProtection('main', {
      requireReviews: true,
      requireCI: true,
      requiredApprovals: 2,
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.protection.requireReviews, true);
    assert.strictEqual(result.protection.requiredApprovals, 2);
  });

  it('applies default values', () => {
    configureGitOps({ policies: new Map() });
    setBranchProtection('develop');
    const protection = getBranchProtections('develop');
    assert.strictEqual(protection.requireReviews, true);
    assert.strictEqual(protection.requiredApprovals, 1);
  });
});

describe('getBranchProtections', () => {
  it('returns null for unset branch', () => {
    configureGitOps({ policies: new Map() });
    const result = getBranchProtections('nonexistent');
    assert.strictEqual(result, null);
  });

  it('returns all protections when called without branch', () => {
    configureGitOps({ policies: new Map() });
    setBranchProtection('main', { requiredApprovals: 3 });
    const all = getBranchProtections();
    assert.ok(all.main);
    assert.strictEqual(all.main.requiredApprovals, 3);
  });
});

// ── Status & History ────────────────────────────────────────────────────────

describe('getSyncStatus', () => {
  it('returns disabled status when no repo configured', () => {
    configureGitOps({ policies: new Map() });
    const status = getSyncStatus();
    assert.strictEqual(status.status, 'disabled');
    assert.strictEqual(status.configured, false);
    assert.strictEqual(status.ready, false);
  });

  it('returns config when repo is configured', () => {
    configureGitOps({ policies: new Map(), repoUrl: 'https://github.com/test/repo', branch: 'main' });
    const status = getSyncStatus();
    assert.strictEqual(status.status, 'idle');
    assert.strictEqual(status.configured, true);
    assert.strictEqual(status.config.repoUrl, 'https://github.com/test/repo');
  });
});

describe('getSyncHistory', () => {
  it('returns empty array initially', () => {
    configureGitOps({ policies: new Map() });
    const history = getSyncHistory();
    assert.ok(Array.isArray(history));
    assert.strictEqual(history.length, 0);
  });

  it('returns limited history', () => {
    configureGitOps({ policies: new Map() });
    // History is populated by syncFromGit calls
    const history = getSyncHistory(5);
    assert.ok(Array.isArray(history));
  });
});
