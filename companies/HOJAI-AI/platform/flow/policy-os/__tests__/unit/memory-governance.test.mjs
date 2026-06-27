/**
 * PolicyOS — Memory Governance tests (Phase 6)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ACCESS_LEVELS,
  RETENTION_LEVELS,
  PII_CATEGORIES,
  detectPII,
  evaluateMemoryAccess,
} from '../../src/routes/memory-governance.js';

// ── detectPII tests ───────────────────────────────────────────────────────────

describe('detectPII', () => {
  it('returns empty array for clean text', () => {
    const findings = detectPII('This is a clean sentence with no PII.');
    assert.deepStrictEqual(findings, []);
  });

  it('detects email addresses', () => {
    const findings = detectPII('Contact user@domain.com for support');
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].type, PII_CATEGORIES.EMAIL);
    assert.strictEqual(findings[0].masked, 'u***@d******.com');
  });

  it('detects phone numbers', () => {
    const findings = detectPII('Call 987-654-3210');
    assert.ok(findings.some(f => f.type === PII_CATEGORIES.PHONE));
  });

  it('detects SSN-like patterns', () => {
    const findings = detectPII('SSN: 123-45-6789');
    assert.ok(findings.some(f => f.type === PII_CATEGORIES.SSN));
  });

  it('detects credit card patterns', () => {
    const findings = detectPII('Card: 4111-1111-1111-1111');
    assert.ok(findings.some(f => f.type === PII_CATEGORIES.CREDIT_CARD));
  });

  it('detects Aadhar patterns', () => {
    const findings = detectPII('Aadhar: 1234-5678-9012');
    assert.ok(findings.some(f => f.type === PII_CATEGORIES.AADHAR));
  });

  it('detects IP addresses', () => {
    const findings = detectPII('IP: 192.168.1.100');
    assert.ok(findings.some(f => f.type === PII_CATEGORIES.IP));
  });

  it('returns index of each finding', () => {
    const findings = detectPII('Email: test@example.com');
    assert.ok(findings[0].index >= 0);
  });

  it('detects multiple PII in same text', () => {
    const findings = detectPII('Email test@test.com and phone 987-654-3210');
    assert.strictEqual(findings.length, 2);
    assert.ok(findings.some(f => f.type === PII_CATEGORIES.EMAIL));
    assert.ok(findings.some(f => f.type === PII_CATEGORIES.PHONE));
  });
});

// ── evaluateMemoryAccess tests ────────────────────────────────────────────────

describe('evaluateMemoryAccess', () => {
  it('returns not found for unknown policy', () => {
    const result = evaluateMemoryAccess('nonexistent', { subject: 'user:1', action: 'read' });
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason.includes('not found'));
  });
});

// ── ACCESS_LEVELS constants ───────────────────────────────────────────────────

describe('ACCESS_LEVELS', () => {
  it('has all expected levels', () => {
    assert.strictEqual(ACCESS_LEVELS.FULL, 'full');
    assert.strictEqual(ACCESS_LEVELS.READ, 'read');
    assert.strictEqual(ACCESS_LEVELS.APPEND, 'append');
    assert.strictEqual(ACCESS_LEVELS.NONE, 'none');
  });
});

// ── RETENTION_LEVELS constants ───────────────────────────────────────────────

describe('RETENTION_LEVELS', () => {
  it('has ephemeral level (0 days)', () => {
    assert.strictEqual(RETENTION_LEVELS.EPHEMERAL.name, 'ephemeral');
    assert.strictEqual(RETENTION_LEVELS.EPHEMERAL.days, 0);
  });

  it('has short level (30 days)', () => {
    assert.strictEqual(RETENTION_LEVELS.SHORT.name, 'short');
    assert.strictEqual(RETENTION_LEVELS.SHORT.days, 30);
  });

  it('has medium level (90 days)', () => {
    assert.strictEqual(RETENTION_LEVELS.MEDIUM.name, 'medium');
    assert.strictEqual(RETENTION_LEVELS.MEDIUM.days, 90);
  });

  it('has long level (365 days)', () => {
    assert.strictEqual(RETENTION_LEVELS.LONG.name, 'long');
    assert.strictEqual(RETENTION_LEVELS.LONG.days, 365);
  });

  it('has permanent level (-1 days)', () => {
    assert.strictEqual(RETENTION_LEVELS.PERMANENT.name, 'permanent');
    assert.strictEqual(RETENTION_LEVELS.PERMANENT.days, -1);
  });

  it('has exactly 5 retention levels', () => {
    assert.strictEqual(Object.keys(RETENTION_LEVELS).length, 5);
  });
});

// ── PII_CATEGORIES constants ──────────────────────────────────────────────────

describe('PII_CATEGORIES', () => {
  it('has all expected categories', () => {
    assert.strictEqual(PII_CATEGORIES.EMAIL, 'email');
    assert.strictEqual(PII_CATEGORIES.PHONE, 'phone');
    assert.strictEqual(PII_CATEGORIES.SSN, 'ssn');
    assert.strictEqual(PII_CATEGORIES.CREDIT_CARD, 'credit_card');
    assert.strictEqual(PII_CATEGORIES.AADHAR, 'aadhar');
    assert.strictEqual(PII_CATEGORIES.NAME, 'name');
    assert.strictEqual(PII_CATEGORIES.ADDRESS, 'address');
    assert.strictEqual(PII_CATEGORIES.DOB, 'dob');
    assert.strictEqual(PII_CATEGORIES.IP, 'ip_address');
    assert.strictEqual(PII_CATEGORIES.CUSTOM, 'custom');
  });

  it('has exactly 10 categories', () => {
    assert.strictEqual(Object.keys(PII_CATEGORIES).length, 10);
  });
});