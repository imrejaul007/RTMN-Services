/**
 * sutar-trust-engine — Verification service unit tests
 */

import { describe, it, expect } from 'vitest';
import verificationService from '../../src/services/verificationService';
import trustService from '../../src/services/trustService';

describe('VerificationService — basic verification flow', () => {
  it('rejects verification when no documents are provided', async () => {
    const entityId = `verify-nodocs-${Date.now()}-${Math.random()}`;
    const result = await verificationService.verifyEntity({
      entityId,
      verificationType: 'kyc',
      documents: [],
    });
    expect(result.entityId).toBe(entityId);
    expect(result.status).toBe('rejected');
    expect(result.result?.isVerified).toBe(false);
    expect(result.result?.riskIndicators).toContain('missing_documents');
  });

  it('verifies when at least one document is provided', async () => {
    const entityId = `verify-docs-${Date.now()}-${Math.random()}`;
    const result = await verificationService.verifyEntity({
      entityId,
      verificationType: 'document',
      documents: [{ type: 'passport', url: 'https://example.com/passport.jpg' }],
    });
    expect(result.status).toBe('verified');
    expect(result.result?.isVerified).toBe(true);
    expect(result.result?.confidence).toBeGreaterThan(0);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it('stores the verification request so it can be retrieved by ID', async () => {
    const entityId = `verify-store-${Date.now()}-${Math.random()}`;
    const result = await verificationService.verifyEntity({
      entityId,
      verificationType: 'address',
      documents: [{ type: 'utility_bill', url: 'https://example.com/bill.pdf' }],
    });
    const stored = verificationService.getVerificationRequest(result.requestId);
    expect(stored).not.toBeNull();
    expect(stored!.entityId).toBe(entityId);
    expect(stored!.status).toBe('verified');
  });

  it('adds the corresponding verification badge to the entity trust score', async () => {
    const entityId = `verify-badge-${Date.now()}-${Math.random()}`;
    // Seed a trust score so updateTrustScore has something to mutate
    trustService.calculateTrustScore({ entityId, entityType: 'user' });
    await verificationService.verifyEntity({
      entityId,
      verificationType: 'bank',
      documents: [{ type: 'bank_statement', url: 'https://example.com/stmt.pdf' }],
    });
    const after = trustService.getTrustScore(entityId);
    expect(after).not.toBeNull();
    expect(after!.badges).toContain('bank_verified');
  });
});

describe('VerificationService — entity lookup', () => {
  it('lists verifications for a given entity', async () => {
    const entityId = `verify-list-${Date.now()}-${Math.random()}`;
    await verificationService.verifyEntity({
      entityId,
      verificationType: 'document',
      documents: [{ type: 'id', url: 'https://example.com/id.jpg' }],
    });
    await verificationService.verifyEntity({
      entityId,
      verificationType: 'address',
      documents: [{ type: 'address', url: 'https://example.com/addr.jpg' }],
    });
    const list = verificationService.getEntityVerifications(entityId);
    expect(list.length).toBe(2);
    list.forEach(v => expect(v.entityId).toBe(entityId));
  });

  it('returns null for an unknown verification request ID', () => {
    const r = verificationService.getVerificationRequest(`ghost-${Date.now()}`);
    expect(r).toBeNull();
  });
});

describe('VerificationService — KYC flow', () => {
  it('rejects KYC when fewer than 2 documents are supplied', async () => {
    const entityId = `kyc-low-${Date.now()}-${Math.random()}`;
    const result = await verificationService.processKYC({
      entityId,
      personalInfo: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateOfBirth: '1815-12-10',
        nationality: 'British',
        address: {
          street: '1 St James Sq',
          city: 'London',
          state: 'London',
          postalCode: 'SW1Y 4PD',
          country: 'UK',
        },
      },
      documents: [{ type: 'passport', url: 'https://example.com/pp.jpg' }],
    });
    expect(result.status).toBe('rejected');
    expect(result.verificationBadges).toEqual([]);
  });

  it('verifies KYC when 2+ documents are supplied and stores the request', async () => {
    const entityId = `kyc-ok-${Date.now()}-${Math.random()}`;
    // Seed trust so KYC can write badges into it
    trustService.calculateTrustScore({ entityId, entityType: 'user' });

    const result = await verificationService.processKYC({
      entityId,
      personalInfo: {
        firstName: 'Grace',
        lastName: 'Hopper',
        dateOfBirth: '1906-12-09',
        nationality: 'US',
        address: {
          street: '1 Navy Yard',
          city: 'Washington',
          state: 'DC',
          postalCode: '20374',
          country: 'US',
        },
      },
      documents: [
        { type: 'passport', url: 'https://example.com/pp.jpg' },
        { type: 'utility_bill', url: 'https://example.com/bill.pdf' },
      ],
    });

    expect(result.status).toBe('verified');
    expect(result.verificationBadges).toContain('kyc_verified');
    expect(result.verifiedAt).toBeInstanceOf(Date);

    const stored = verificationService.getKYCRequest(result.requestId);
    expect(stored).not.toBeNull();
    expect(stored!.personalInfo.firstName).toBe('Grace');

    // The trust score should have been updated with the new verification score + badges
    const trust = trustService.getTrustScore(entityId);
    expect(trust).not.toBeNull();
    expect(trust!.verificationScore.kycStatus).toBe('verified');
    expect(trust!.badges).toContain('kyc_verified');
  });

  it('returns null when looking up an unknown KYC request', () => {
    const r = verificationService.getKYCRequest(`kyc-ghost-${Date.now()}`);
    expect(r).toBeNull();
  });
});