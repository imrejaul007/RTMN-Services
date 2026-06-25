/**
 * nexha-capability-os — Capability service unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import capabilityService from '../../src/services/capabilityService.js';

describe('Capability Service — seeding', () => {
  beforeEach(() => {
    capabilityService.clear();
  });

  it('seeds demo capabilities on first call', () => {
    const count = capabilityService.seedDemoCapabilities();
    expect(count).toBeGreaterThan(0);
    expect(capabilityService.total()).toBe(count);
  });

  it('does not double-seed', () => {
    capabilityService.seedDemoCapabilities();
    const firstCount = capabilityService.total();
    capabilityService.seedDemoCapabilities();
    expect(capabilityService.total()).toBe(firstCount);
  });

  it('seeds capabilities with valid categories', () => {
    capabilityService.seedDemoCapabilities();
    const all = capabilityService.listAll();
    const categories = new Set(all.map((c) => c.category));
    expect(categories.size).toBeGreaterThan(0);
    // Each capability must have at least one tag
    for (const cap of all) {
      expect(cap.tags.length).toBeGreaterThan(0);
    }
  });
});

describe('Capability Service — CRUD', () => {
  beforeEach(() => {
    capabilityService.clear();
  });

  it('registers a new capability with generated id + timestamps', () => {
    const cap = capabilityService.register({
      nexhaId: 'nexha-test',
      name: 'Test Capability',
      description: 'For unit testing',
      category: 'service',
      tags: ['test'],
      pricing: { model: 'free' },
      trust: { verified: false, kycLevel: 'none' },
      regions: ['US'],
      languages: ['en'],
      status: 'active'
    });
    expect(cap.id).toMatch(/^cap-/);
    expect(cap.createdAt).toBeTruthy();
    expect(cap.updatedAt).toBeTruthy();
  });

  it('rejects registration without required fields', () => {
    expect(() => capabilityService.register({
      nexhaId: '',
      name: 'x',
      description: 'x',
      category: 'service',
      tags: [],
      pricing: { model: 'free' },
      trust: { verified: false, kycLevel: 'none' },
      regions: [],
      languages: [],
      status: 'active'
    })).toThrow(/nexhaId/);
  });

  it('updates existing capability', async () => {
    const cap = capabilityService.register({
      nexhaId: 'nexha-test',
      name: 'Original',
      description: 'd',
      category: 'service',
      tags: [],
      pricing: { model: 'free' },
      trust: { verified: false, kycLevel: 'none' },
      regions: [],
      languages: [],
      status: 'active'
    });
    // Wait at least 1ms so updatedAt timestamp differs
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = capabilityService.update(cap.id, { name: 'Renamed' });
    expect(updated?.name).toBe('Renamed');
    expect(updated?.id).toBe(cap.id); // id preserved
    expect(updated?.updatedAt > cap.updatedAt).toBe(true); // timestamp advanced
  });

  it('returns null when updating non-existent capability', () => {
    const result = capabilityService.update('cap-does-not-exist', { name: 'x' });
    expect(result).toBeNull();
  });

  it('deletes a capability', () => {
    const cap = capabilityService.register({
      nexhaId: 'nexha-test',
      name: 'ToDelete',
      description: 'd',
      category: 'service',
      tags: [],
      pricing: { model: 'free' },
      trust: { verified: false, kycLevel: 'none' },
      regions: [],
      languages: [],
      status: 'active'
    });
    expect(capabilityService.delete(cap.id)).toBe(true);
    expect(capabilityService.get(cap.id)).toBeNull();
    expect(capabilityService.delete(cap.id)).toBe(false);
  });
});

describe('Capability Service — match scoring', () => {
  beforeEach(() => {
    capabilityService.clear();
    capabilityService.seedDemoCapabilities();
  });

  it('returns all capabilities with no filters', () => {
    const result = capabilityService.match({});
    expect(result.total).toBeGreaterThan(0);
    expect(result.matches.length).toBeGreaterThan(0);
    // Sorted by score desc
    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score);
    }
  });

  it('filters by category', () => {
    const result = capabilityService.match({ category: 'agent' });
    for (const m of result.matches) {
      expect(m.capability.category).toBe('agent');
    }
  });

  it('filters by nexhaId', () => {
    const result = capabilityService.match({ nexhaId: 'nexha-maya-collective' });
    for (const m of result.matches) {
      expect(m.capability.nexhaId).toBe('nexha-maya-collective');
    }
  });

  it('filters by region', () => {
    const result = capabilityService.match({ region: 'IN' });
    for (const m of result.matches) {
      expect(m.capability.regions).toContain('IN');
    }
  });

  it('filters by language', () => {
    const result = capabilityService.match({ language: 'hi' });
    for (const m of result.matches) {
      expect(m.capability.languages).toContain('hi');
    }
  });

  it('filters by verifiedOnly', () => {
    const result = capabilityService.match({ verifiedOnly: true });
    for (const m of result.matches) {
      expect(m.capability.trust.verified).toBe(true);
    }
  });

  it('filters by max price + currency', () => {
    const result = capabilityService.match({ maxPrice: 100, currency: 'USD' });
    for (const m of result.matches) {
      if (m.capability.pricing.amount !== undefined) {
        expect(m.capability.pricing.amount).toBeLessThanOrEqual(100);
        expect(m.capability.pricing.currency).toBe('USD');
      }
    }
  });

  it('free-text search boosts score', () => {
    const result = capabilityService.match({ q: 'fashion' });
    const top = result.matches[0];
    expect(top.capability.name.toLowerCase()).toContain('fashion') ||
           top.capability.description.toLowerCase().includes('fashion') ||
           top.capability.tags.some((t) => t.includes('fashion'));
  });

  it('tag overlap contributes to score', () => {
    const result = capabilityService.match({ tags: ['negotiation', 'procurement'] });
    expect(result.matches.length).toBeGreaterThan(0);
    const top = result.matches[0];
    // Tag overlap + verified bonus yields ~0.29
    expect(top.score).toBeGreaterThan(0.25);
  });

  it('reasons are explainable', () => {
    const result = capabilityService.match({
      category: 'agent',
      tags: ['negotiation'],
      region: 'IN',
      verifiedOnly: true
    });
    expect(result.matches.length).toBeGreaterThan(0);
    const top = result.matches[0];
    expect(top.reasons.length).toBeGreaterThan(0);
    expect(top.reasons.some((r) => r.startsWith('category:'))).toBe(true);
  });

  it('pagination works (limit + offset)', () => {
    const all = capabilityService.match({});
    expect(all.matches.length).toBeGreaterThan(2);
    const page1 = capabilityService.match({ limit: 2, offset: 0 });
    const page2 = capabilityService.match({ limit: 2, offset: 2 });
    expect(page1.matches.length).toBe(2);
    expect(page1.matches[0].capability.id).not.toBe(page2.matches[0].capability.id);
  });
});

describe('Capability Service — stats', () => {
  beforeEach(() => {
    capabilityService.clear();
    capabilityService.seedDemoCapabilities();
  });

  it('computes per-Nexha stats', () => {
    const stats = capabilityService.getNexhaStats('nexha-maya-collective');
    expect(stats.nexhaId).toBe('nexha-maya-collective');
    expect(stats.totalCapabilities).toBeGreaterThan(0);
    // Sum of categories should equal total
    const sum = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.totalCapabilities);
  });

  it('computes federation-wide stats', () => {
    const stats = capabilityService.getFederationStats();
    expect(stats.nexhas).toBeGreaterThan(0);
    expect(stats.totalCapabilities).toBeGreaterThan(0);
    expect(stats.byNexha.length).toBe(stats.nexhas);
  });

  it('returns empty stats for unknown nexha', () => {
    const stats = capabilityService.getNexhaStats('nexha-does-not-exist');
    expect(stats.totalCapabilities).toBe(0);
  });
});

describe('Capability Service — Verifiable Credentials (v1.1)', () => {
  beforeEach(() => {
    capabilityService.clear();
    capabilityService.seedDemoCapabilities();
  });

  it('issues an attestation and stores it', () => {
    const caps = capabilityService.listAll();
    const capId = caps[0].id;
    const result = capabilityService.attest({
      capabilityId: capId,
      issuerId: 'test-issuer',
      issuerName: 'Test Issuer',
      claimType: 'capability',
      level: 'audit',
      claim: 'This capability works as described',
      secret: 'test-secret'
    });
    expect(result.attestation.attestationId).toMatch(/^att-/);
    expect(result.attestation.capabilityId).toBe(capId);
    expect(result.attestation.issuerId).toBe('test-issuer');
    expect(result.attestation.signature).toHaveLength(64); // SHA256 hex
    expect(result.verificationUrl).toContain(capId);
    expect(result.verificationUrl).toContain(result.attestation.attestationId);
  });

  it('throws when attesting a non-existent capability', () => {
    expect(() => capabilityService.attest({
      capabilityId: 'cap-does-not-exist',
      issuerId: 'test-issuer',
      issuerName: 'Test Issuer',
      claimType: 'capability',
      level: 'self',
      claim: 'test'
    })).toThrow(/not found/);
  });

  it('lists attestations for a capability', () => {
    const caps = capabilityService.listAll();
    const capId = caps[0].id;
    // Issue two attestations
    capabilityService.attest({ capabilityId: capId, issuerId: 'a', issuerName: 'A', claimType: 'identity', level: 'peer', claim: 'identity check', secret: 's' });
    capabilityService.attest({ capabilityId: capId, issuerId: 'b', issuerName: 'B', claimType: 'capability', level: 'audit', claim: 'capability check', secret: 's' });
    const atts = capabilityService.listAttestations(capId);
    expect(atts.length).toBe(2);
  });

  it('returns empty attestations for unattested capability', () => {
    const caps = capabilityService.listAll();
    const uniqIds = [...new Set(caps.map((c) => c.id))];
    const atts = capabilityService.listAttestations(uniqIds[uniqIds.length - 1] + '-fake');
    expect(atts).toEqual([]);
  });

  it('verifies a valid attestation with correct secret', () => {
    const caps = capabilityService.listAll();
    const capId = caps[0].id;
    const result = capabilityService.attest({
      capabilityId: capId,
      issuerId: 'verifier',
      issuerName: 'Verifier',
      claimType: 'certification',
      level: 'certified',
      claim: 'ISO 9001 certified',
      secret: 'my-secret'
    });
    const verified = capabilityService.verifyAttestation(capId, result.attestation.attestationId, 'my-secret');
    expect(verified.valid).toBe(true);
    expect(verified.attestation?.issuerId).toBe('verifier');
    expect(verified.expired).toBeUndefined();
    expect(verified.tampered).toBeUndefined();
  });

  it('fails verification with wrong secret', () => {
    const caps = capabilityService.listAll();
    const capId = caps[0].id;
    const result = capabilityService.attest({
      capabilityId: capId,
      issuerId: 'x',
      issuerName: 'X',
      claimType: 'identity',
      level: 'self',
      claim: 'test',
      secret: 'correct'
    });
    const verified = capabilityService.verifyAttestation(capId, result.attestation.attestationId, 'wrong-secret');
    expect(verified.valid).toBe(false);
    expect(verified.tampered).toBe(true);
  });

  it('fails verification for unknown attestation ID', () => {
    const caps = capabilityService.listAll();
    const verified = capabilityService.verifyAttestation(caps[0].id, 'att-nonexistent', 's');
    expect(verified.valid).toBe(false);
    expect(verified.reason).toContain('not found');
  });

  it('fails verification for expired attestation', () => {
    const caps = capabilityService.listAll();
    const result = capabilityService.attest({
      capabilityId: caps[0].id,
      issuerId: 'x',
      issuerName: 'X',
      claimType: 'performance',
      level: 'audit',
      claim: '99.9% uptime',
      expiresAt: '2020-01-01T00:00:00.000Z',
      secret: 's'
    });
    const verified = capabilityService.verifyAttestation(caps[0].id, result.attestation.attestationId, 's');
    expect(verified.valid).toBe(false);
    expect(verified.expired).toBe(true);
  });

  it('verifyAll returns a summary with highest level', () => {
    const caps = capabilityService.listAll();
    const capId = caps[0].id;
    capabilityService.attest({ capabilityId: capId, issuerId: 'a', issuerName: 'A', claimType: 'identity', level: 'self', claim: 'a', secret: 's' });
    capabilityService.attest({ capabilityId: capId, issuerId: 'b', issuerName: 'B', claimType: 'capability', level: 'peer', claim: 'b', secret: 's' });
    capabilityService.attest({ capabilityId: capId, issuerId: 'c', issuerName: 'C', claimType: 'certification', level: 'certified', claim: 'c', secret: 's' });
    const summary = capabilityService.verifyAll(capId, 's');
    expect(summary.capabilityId).toBe(capId);
    expect(summary.attestationCount).toBe(3);
    expect(summary.highestLevel).toBe('certified');
    expect(summary.isSelfAttested).toBe(false);
    expect(summary.byLevel.self).toBe(1);
    expect(summary.byLevel.peer).toBe(1);
    expect(summary.byLevel.certified).toBe(1);
    expect(summary.byClaimType.identity).toBe(1);
    expect(summary.byClaimType.certification).toBe(1);
    expect(summary.attestations.length).toBe(3);
    expect(summary.attestations.every((a) => a._verified)).toBe(true);
  });

  it('revokes an attestation', () => {
    const caps = capabilityService.listAll();
    const capId = caps[0].id;
    const result = capabilityService.attest({ capabilityId: capId, issuerId: 'x', issuerName: 'X', claimType: 'identity', level: 'peer', claim: 'to-revoke', secret: 's' });
    expect(capabilityService.listAttestations(capId).length).toBe(1);
    expect(capabilityService.revokeAttestation(capId, result.attestation.attestationId)).toBe(true);
    expect(capabilityService.listAttestations(capId).length).toBe(0);
    expect(capabilityService.revokeAttestation(capId, 'att-does-not-exist')).toBe(false);
  });

  it('auto-marks capability verified when attestation level >= audit', () => {
    const caps = capabilityService.listAll();
    const capId = caps[0].id;
    // Find a capability that is not verified
    const cap = capabilityService.get(capId)!;
    const wasVerified = cap.trust.verified;
    capabilityService.attest({ capabilityId: capId, issuerId: 'x', issuerName: 'X', claimType: 'capability', level: 'audit', claim: 'audit-level', secret: 's' });
    const updated = capabilityService.get(capId);
    if (!wasVerified) {
      expect(updated?.trust.verified).toBe(true);
    }
  });

  it('seedDemoAttestations seeds without throwing', () => {
    const count = capabilityService.seedDemoAttestations();
    expect(count).toBeGreaterThan(0);
  });
});