/**
 * PolicyOS — GitOps Service Tests (Phase P1)
 * Resets singleton state before each test to avoid ESM state pollution.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const gitops = await import('../../src/services/gitops.js');
const { default: svc, PolicyFile } = gitops;

beforeEach(() => {
  svc.configureGitOps({ policies: new Map() });
});

// ── PolicyFile — parse ───────────────────────────────────────────────────────

describe('PolicyFile.parse', () => {
  it('parses valid JSON', () => {
    const pf = new PolicyFile({
      path: 'policies/test.json',
      content: JSON.stringify({ id: 'test-p1', effect: 'allow', name: 'Test' }),
    });
    const { data, format, parseError } = pf.parse();
    assert.strictEqual(parseError, null);
    assert.strictEqual(format, 'json');
    assert.strictEqual(data.id, 'test-p1');
  });

  it('parses YAML top-level keys', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: test-p2\neffect: allow\nname: Test',
    });
    const { data, format, parseError } = pf.parse();
    assert.strictEqual(parseError, null);
    assert.strictEqual(format, 'yaml');
    assert.strictEqual(data.id, 'test-p2');
  });

  it('parses YAML with nested objects', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: test-p3\nconditions:\n  field: amount\n  operator: gt\n  value: 100',
    });
    const { data, parseError } = pf.parse();
    assert.strictEqual(parseError, null);
    assert.strictEqual(data.id, 'test-p3');
    assert.strictEqual(data.conditions.field, 'amount');
    assert.strictEqual(data.conditions.operator, 'gt');
    assert.strictEqual(data.conditions.value, 100);
  });
});

// ── PolicyFile — validate ────────────────────────────────────────────────────

describe('PolicyFile.validate', () => {
  it('validates well-formed policy', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: valid-p1\neffect: allow\nname: Good',
    });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, true);
  });

  it('rejects invalid effect', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: invalid-p1\neffect: permit\nname: Bad',
    });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, false);
    assert.ok(errors.some(e => e.includes('Invalid effect')));
  });

  it('rejects non-array conditions', () => {
    const pf = new PolicyFile({
      path: 'policies/test.yaml',
      content: 'id: invalid-p2\neffect: allow\nconditions: nope',
    });
    const { valid, errors } = pf.validate();
    assert.strictEqual(valid, false);
    assert.ok(errors.some(e => e.includes('conditions')));
  });
});

// ── PolicyFile — path helpers ────────────────────────────────────────────────

describe('PolicyFile.path', () => {
  it('extracts category from path', () => {
    const pf = new PolicyFile({ path: 'policies/finance/spending.yaml', content: 'id: t' });
    assert.strictEqual(pf.category(), 'finance');
  });

  it('returns id from content over filename', () => {
    const content = JSON.stringify({ id: 'content-id' });
    const pf = new PolicyFile({ path: 'policies/test.yaml', content });
    assert.strictEqual(pf.policyId(), 'content-id');
  });

  it('falls back to filename', () => {
    const content = JSON.stringify({ name: 'Test' });
    const pf = new PolicyFile({ path: 'policies/finance/spending-v2.yaml', content });
    const id = pf.policyId();
    assert.ok(id.startsWith('spending'));
  });

  it('sanitizes invalid filename chars', () => {
    const content = JSON.stringify({ name: 'Test' });
    const pf = new PolicyFile({ path: 'policies/test/Policy v2! special.yaml', content });
    const id = pf.policyId();
    assert.ok(/^[a-z0-9-]+$/.test(id));
  });
});

// ── HMAC-SHA256 ──────────────────────────────────────────────────────────────

describe('HMAC-SHA256', () => {
  it('computes 64-char hex digest', () => {
    const sig = crypto.createHmac('sha256', 'secret').update('payload').digest('hex');
    assert.strictEqual(sig.length, 64);
  });

  it('timingSafeEqual matches identical buffers', () => {
    const a = crypto.randomBytes(32);
    assert.strictEqual(crypto.timingSafeEqual(a, Buffer.from(a)), true);
  });

  it('detects mismatch', () => {
    const a = Buffer.from('a'.repeat(32));
    const b = Buffer.from('b'.repeat(32));
    assert.strictEqual(crypto.timingSafeEqual(a, b), false);
  });

  it('throws on different lengths', () => {
    const a = Buffer.from('a'.repeat(16));
    const b = Buffer.from('b'.repeat(32));
    assert.throws(() => crypto.timingSafeEqual(a, b));
  });
});

// ── configureGitOps ────────────────────────────────────────────────────────

describe('configureGitOps', () => {
  it('returns disabled status when no repoUrl', () => {
    const s = svc.getSyncStatus();
    assert.strictEqual(s.status, 'disabled');
  });

  it('returns idle status when repoUrl is set', () => {
    svc.configureGitOps({ policies: new Map(), repoUrl: 'https://github.com/test/repo' });
    assert.strictEqual(svc.getSyncStatus().status, 'idle');
  });

  it('masks gitToken in config output', () => {
    svc.configureGitOps({ policies: new Map(), gitToken: 'secret' });
    assert.strictEqual(svc.getSyncStatus().config.gitToken, '***');
  });
});

// ── verifyWebhookSignature ─────────────────────────────────────────────────

describe('verifyWebhookSignature', () => {
  it('returns false when no secret configured', () => {
    assert.strictEqual(svc.verifyWebhookSignature('payload', 'sha256=abc'), false);
  });

  it('returns false for null signature', () => {
    svc.configureGitOps({ policies: new Map(), webhookSecret: 'secret' });
    assert.strictEqual(svc.verifyWebhookSignature('payload', null), false);
  });

  it('returns true for valid HMAC-SHA256', () => {
    const secret = 'webhook-secret';
    const payload = '{"action":"push"}';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    svc.configureGitOps({ policies: new Map(), webhookSecret: secret });
    assert.strictEqual(svc.verifyWebhookSignature(payload, 'sha256=' + sig), true);
  });

  it('returns false for invalid signature', () => {
    svc.configureGitOps({ policies: new Map(), webhookSecret: 'secret' });
    assert.strictEqual(svc.verifyWebhookSignature('payload', 'sha256=' + '0'.repeat(64)), false);
  });
});

// ── syncFromGit ───────────────────────────────────────────────────────────

describe('syncFromGit', () => {
  it('returns error when disabled', async () => {
    const r = await svc.syncFromGit();
    assert.strictEqual(r.ok, false);
  });
});

// ── rollbackPolicy ───────────────────────────────────────────────────────

describe('rollbackPolicy', () => {
  it('returns error for unknown policy', async () => {
    const r = await svc.rollbackPolicy('unknown-policy');
    assert.strictEqual(r.ok, false);
  });
});

// ── setBranchProtection ─────────────────────────────────────────────────

describe('setBranchProtection', () => {
  it('sets protection rules', () => {
    const r = svc.setBranchProtection('main', { requireReviews: true, requiredApprovals: 2 });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.protection.requiredApprovals, 2);
  });

  it('returns null for unset branch', () => {
    assert.strictEqual(svc.getBranchProtections('nonexistent'), null);
  });
});

// ── getSyncHistory ─────────────────────────────────────────────────────

describe('getSyncHistory', () => {
  it('returns empty array initially', () => {
    const h = svc.getSyncHistory();
    assert.ok(Array.isArray(h));
    assert.strictEqual(h.length, 0);
  });
});
