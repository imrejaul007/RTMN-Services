/**
 * Federation Layer Tests
 */

import { describe, it, expect } from 'vitest';
import { federationLayer } from '../federation-layer';

describe('FederationLayer', () => {
  it('should create federation', () => {
    const federation = federationLayer.createFederation({
      name: 'APAC Network',
      type: 'regional',
      countries: ['IN', 'SG', 'AE'],
      currencies: ['INR', 'USD', 'AED'],
    });
    expect(federation.id).toBeDefined();
    expect(federation.currencies).toContain('INR');
  });

  it('should initiate cross-border transaction', () => {
    const txn = federationLayer.initiateCrossBorder({
      fromCompany: 'company_a',
      toCompany: 'company_b',
      fromCountry: 'IN',
      toCountry: 'US',
      amount: 100000,
      currency: 'INR',
    });
    expect(txn.exchangeRate).toBeDefined();
    expect(txn.convertedAmount).toBeDefined();
  });

  it('should create settlement', () => {
    const settlement = federationLayer.createSettlement({
      networkId: 'net_test',
      parties: ['company_a', 'company_b', 'company_c'],
      totalAmount: 1000000,
      currency: 'INR',
    });
    expect(settlement.id).toBeDefined();
  });

  it('should check compliance', () => {
    const compliance = federationLayer.checkCompliance({
      transactionId: 'txn_test',
      fromCountry: 'IN',
      toCountry: 'US',
      amount: 50000,
    });
    expect(compliance.checks.length).toBe(4);
  });
});
