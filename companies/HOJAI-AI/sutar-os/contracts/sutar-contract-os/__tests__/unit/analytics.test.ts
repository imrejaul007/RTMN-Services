/**
 * SUTAR Contract OS - Analytics Service Unit Tests
 * Phase B.5: Tests for the new analytics service
 */

import { describe, it, expect } from 'vitest';
import {
  getContractAnalytics,
  getContractTrends,
  getContractsByParty,
  getHighValueContracts,
} from '../../src/services/analytics.js';
import type { Contract } from '../../src/types/index.js';

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: `contract-${Math.random()}`,
    type: 'service',
    title: 'Test Contract',
    terms: 'Sample terms',
    clauses: [],
    parties: [],
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    status: 'active',
    signatures: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Contract;
}

describe('getContractAnalytics', () => {
  it('returns zero counts for an empty array', () => {
    const result = getContractAnalytics([]);
    expect(result.total).toBe(0);
    expect(result.byStatus).toEqual({});
    expect(result.byType).toEqual({});
    expect(result.totalValue).toBe(0);
    expect(result.avgValue).toBe(0);
  });

  it('counts contracts by status', () => {
    const contracts = [
      makeContract({ status: 'active' }),
      makeContract({ status: 'active' }),
      makeContract({ status: 'expired' }),
    ];
    const result = getContractAnalytics(contracts);
    expect(result.total).toBe(3);
    expect(result.byStatus.active).toBe(2);
    expect(result.byStatus.expired).toBe(1);
  });

  it('counts contracts by type', () => {
    const contracts = [
      makeContract({ type: 'service' }),
      makeContract({ type: 'service' }),
      makeContract({ type: 'nda' }),
      makeContract({ type: 'employment' }),
    ];
    const result = getContractAnalytics(contracts);
    expect(result.byType.service).toBe(2);
    expect(result.byType.nda).toBe(1);
    expect(result.byType.employment).toBe(1);
  });

  it('handles a mix of statuses and types', () => {
    const contracts = [
      makeContract({ type: 'service', status: 'active' }),
      makeContract({ type: 'nda', status: 'pending' }),
      makeContract({ type: 'service', status: 'expired' }),
    ];
    const result = getContractAnalytics(contracts);
    expect(result.total).toBe(3);
    expect(Object.keys(result.byStatus).length).toBe(3);
    expect(Object.keys(result.byType).length).toBe(2);
  });

  it('sums contract values and computes average', () => {
    const contracts = [
      makeContract({ value: 1000 }),
      makeContract({ value: 2000 }),
      makeContract({ value: 3000 }),
    ];
    const result = getContractAnalytics(contracts);
    expect(result.totalValue).toBe(6000);
    expect(result.avgValue).toBe(2000);
  });

  it('counts disputed contracts as breached', () => {
    const contracts = [
      makeContract({ status: 'disputed' }),
      makeContract({ status: 'disputed' }),
      makeContract({ status: 'active' }),
    ];
    const result = getContractAnalytics(contracts);
    expect(result.breached).toBe(2);
  });
});

describe('getContractTrends', () => {
  it('returns N months of trend buckets', () => {
    const trends = getContractTrends([], 6);
    expect(trends).toHaveLength(6);
    expect(trends[0]).toHaveProperty('period');
    expect(trends[0]).toHaveProperty('created');
    expect(trends[0]).toHaveProperty('activated');
    expect(trends[0]).toHaveProperty('terminated');
  });

  it('periods are sorted oldest → newest', () => {
    const trends = getContractTrends([], 3);
    expect(new Date(trends[0].period).getTime()).toBeLessThan(new Date(trends[2].period).getTime());
  });
});

describe('getContractsByParty', () => {
  it('returns only contracts involving the given party', () => {
    const alice = { id: 'alice', name: 'Alice', role: 'buyer' as any, email: 'a@x.com' };
    const bob = { id: 'bob', name: 'Bob', role: 'seller' as any, email: 'b@x.com' };
    const contracts = [
      makeContract({ parties: [alice, bob] }),
      makeContract({ parties: [bob] }),
      makeContract({ parties: [alice] }),
    ];
    expect(getContractsByParty('alice', contracts)).toHaveLength(2);
    expect(getContractsByParty('bob', contracts)).toHaveLength(2);
    expect(getContractsByParty('nobody', contracts)).toHaveLength(0);
  });
});

describe('getHighValueContracts', () => {
  it('returns contracts above the threshold, sorted desc by value', () => {
    const contracts = [
      makeContract({ value: 100 }),
      makeContract({ value: 5000 }),
      makeContract({ value: 1000 }),
      makeContract({ value: 50 }),
    ];
    const result = getHighValueContracts(500, contracts);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(5000);
    expect(result[1].value).toBe(1000);
  });
});
