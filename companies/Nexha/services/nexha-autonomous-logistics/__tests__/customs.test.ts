import { describe, it, expect } from 'vitest';
import {
  lookupHsCode,
  getCountryRules,
  calculateDuties,
  checkRestrictions,
  determineDocuments,
  checkRequirements
} from '../src/customs/agent.js';

describe('lookupHsCode', () => {
  it('looks up apparel duty rate (HS 62)', () => {
    const result = lookupHsCode('6203.42');
    expect(result.rate).toBe(0.16);
    expect(result.description).toContain('Apparel');
  });
  it('looks up electronics duty rate (HS 85)', () => {
    const result = lookupHsCode('8517.12');
    expect(result.rate).toBe(0.05);
  });
  it('returns default rate for unknown chapter', () => {
    const result = lookupHsCode('9999.99');
    expect(result.rate).toBe(0.05);
  });
});

describe('getCountryRules', () => {
  it('returns rules for known country (US)', () => {
    const rules = getCountryRules('US');
    expect(rules.vatRate).toBe(0);
    expect(rules.clearanceHours).toBe(48);
    expect(rules.documents.length).toBeGreaterThan(0);
  });
  it('returns default rules for unknown country', () => {
    const rules = getCountryRules('XX');
    expect(rules.clearanceHours).toBe(48);
  });
  it('returns India rules with GST', () => {
    const rules = getCountryRules('IN');
    expect(rules.vatRate).toBe(0.18);
  });
});

describe('calculateDuties', () => {
  it('calculates basic duty for DE import', () => {
    const result = calculateDuties({
      hsCode: '6203.42',
      origin: 'CN',
      destination: 'DE',
      value: 1000,
      currency: 'USD'
    });
    expect(result.duties.length).toBeGreaterThan(0);
    expect(result.totalDutiesUsd).toBeGreaterThan(0);
    expect(result.duties.some((d) => d.type === 'vat')).toBe(true);
  });
  it('zero duty for USMCA partners (US → CA)', () => {
    const result = calculateDuties({
      hsCode: '8517.12',
      origin: 'US',
      destination: 'CA',
      value: 10000,
      currency: 'USD'
    });
    // 5% base × 0.1 (USMCA 90% reduction) = 0.5%
    expect(result.duties[0].rate).toBeLessThan(0.01);
  });
  it('includes processing fee', () => {
    const result = calculateDuties({
      hsCode: '8517.12',
      origin: 'US',
      destination: 'US',
      value: 100,
      currency: 'USD'
    });
    expect(result.duties.some((d) => d.type === 'processing_fee' && d.amountUsd === 25)).toBe(true);
  });
});

describe('checkRestrictions', () => {
  it('prohibits shipments to sanctioned destinations (KP)', () => {
    const result = checkRestrictions({ origin: 'US', destination: 'KP', hsCode: '8517.12' });
    expect(result.prohibited).toBe(true);
    expect(result.allowed).toBe(false);
  });
  it('allows shipments to non-sanctioned countries', () => {
    const result = checkRestrictions({ origin: 'US', destination: 'IN', hsCode: '8517.12' });
    expect(result.allowed).toBe(true);
    expect(result.prohibited).toBe(false);
  });
  it('warns about arms shipments (HS 93)', () => {
    const result = checkRestrictions({ origin: 'US', destination: 'IN', hsCode: '9301.10' });
    expect(result.warnings.some((w) => w.includes('arms'))).toBe(true);
  });
});

describe('determineDocuments', () => {
  it('includes commercial invoice for any destination', () => {
    const docs = determineDocuments('US');
    expect(docs.some((d) => d.code === 'COMMERCIAL_INVOICE')).toBe(true);
  });
  it('includes phytosanitary for food products', () => {
    const docs = determineDocuments('US', '0406.40');
    expect(docs.some((d) => d.code === 'PHYTOSANITARY')).toBe(true);
  });
  it('includes drug license for pharmaceuticals', () => {
    const docs = determineDocuments('IN', '3004.90');
    expect(docs.some((d) => d.code === 'DRUG_LICENSE')).toBe(true);
  });
  it('marks required docs as required', () => {
    const docs = determineDocuments('US');
    expect(docs.find((d) => d.code === 'COMMERCIAL_INVOICE')?.required).toBe(true);
  });
});

describe('checkRequirements', () => {
  it('returns full requirements for shipment with HS code', async () => {
    const result = await checkRequirements({
      origin: 'CN',
      destination: 'US',
      hsCode: '6203.42',
      value: 5000,
      currency: 'USD'
    });
    expect(result.documents.length).toBeGreaterThan(0);
    expect(result.duties.length).toBeGreaterThan(0);
    expect(result.totalDutiesUsd).toBeGreaterThan(0);
    expect(result.estimatedClearanceHours).toBeGreaterThan(0);
    expect(result.restrictions.allowed).toBe(true);
  });
  it('handles missing HS code with placeholder duties', async () => {
    const result = await checkRequirements({
      origin: 'CN',
      destination: 'US',
      value: 1000,
      currency: 'USD'
    });
    expect(result.duties[0].notes).toContain('HS code required');
  });
});