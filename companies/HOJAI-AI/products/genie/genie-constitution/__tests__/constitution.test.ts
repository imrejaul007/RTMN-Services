/**
 * Constitution Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { extractValuesPattern } from '../src/services/valueExtractor.js';
import { checkAction } from '../src/services/boundaryEnforcer.js';
import { Constitution } from '../src/types/constitution.js';

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue('OK'),
  })),
}));

describe('Value Extractor (Pattern)', () => {
  it('should extract honesty value', () => {
    const values = extractValuesPattern('I always want to be honest and transparent');
    expect(values.find(v => v.name === 'honesty')).toBeDefined();
  });

  it('should extract family value', () => {
    const values = extractValuesPattern('My family always comes first');
    expect(values.find(v => v.name === 'family-first')).toBeDefined();
  });

  it('should extract multiple values', () => {
    const values = extractValuesPattern('I value honesty, family, and quality');
    expect(values.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Boundary Enforcer', () => {
  const constitution: Constitution = {
    userId: 'user_123',
    always: ['disclose AI identity'],
    never: ['lie to investors', 'make medical decisions'],
    requiresApproval: ['financial transfers over 1 lakh'],
    values: [
      { name: 'honesty', weight: 1.0 },
      { name: 'family-first', weight: 0.9 },
    ],
    ethicsLevel: 'strict',
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  it('should block action that violates never rule', async () => {
    const result = await checkAction(constitution, {
      userId: 'user_123',
      action: 'Lie to the investor about revenue',
      context: 'investor call',
    });

    expect(result.allowed).toBe(false);
    expect(result.violatedRules.length).toBeGreaterThan(0);
  });

  it('should block medical decision', async () => {
    const result = await checkAction(constitution, {
      userId: 'user_123',
      action: 'Make a medical decision for the patient',
      context: 'health',
    });

    expect(result.allowed).toBe(false);
  });

  it('should require approval for large financial transfer', async () => {
    const result = await checkAction(constitution, {
      userId: 'user_123',
      action: 'Transfer 2 lakh to vendor',
      amount: 200000,
      category: 'financial',
    });

    expect(result.requiresApproval).toBe(true);
  });

  it('should allow action aligned with values', async () => {
    const result = await checkAction(constitution, {
      userId: 'user_123',
      action: 'Tell the honest truth about progress',
      context: 'family meeting',
    });

    expect(result.allowed).toBe(true);
    expect(result.matchedValues).toContain('honesty');
  });

  it('should require approval for transfers over 1 lakh', async () => {
    const result = await checkAction(constitution, {
      userId: 'user_123',
      action: 'Send money',
      amount: 500000,
      category: 'financial',
    });

    expect(result.requiresApproval).toBe(true);
  });
});