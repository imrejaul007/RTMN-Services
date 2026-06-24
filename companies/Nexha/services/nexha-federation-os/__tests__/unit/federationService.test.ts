/**
 * nexha-federation-os — Federation service unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import federationService from '../../src/services/federationService.js';

describe('Federation Service — seeding', () => {
  beforeEach(() => {
    federationService.reset();
  });

  it('seeds demo federation on first call', () => {
    const stats = federationService.seedDemo();
    expect(stats.nexhas).toBeGreaterThan(0);
    expect(stats.handshakes).toBeGreaterThan(0);
    expect(stats.policies).toBeGreaterThan(0);
  });

  it('does not double-seed', () => {
    federationService.seedDemo();
    const first = federationService.getStats();
    federationService.seedDemo();
    expect(federationService.getStats().totalNexhas).toBe(first.totalNexhas);
  });

  it('seeds mix of tiers + statuses', () => {
    federationService.seedDemo();
    const stats = federationService.getStats();
    // Should have at least founding + strategic + standard tiers
    expect(stats.byTier.founding + stats.byTier.strategic + stats.byTier.standard).toBeGreaterThan(0);
    // Should have both active and pending (or suspended)
    expect(stats.byStatus.active).toBeGreaterThan(0);
  });
});

describe('Federation Service — Nexha registration', () => {
  beforeEach(() => {
    federationService.reset();
  });

  it('registers a new Nexha in pending status with observer tier', () => {
    const nexha = federationService.register({
      name: 'Test Nexha',
      description: 'Test',
      region: 'US',
      contactEmail: 'test@example.com',
      publicKey: 'fp:test123',
      categories: ['service'],
      osVersion: 'nexha-os-1.4.0'
    });
    expect(nexha.id).toMatch(/^nexha-/);
    expect(nexha.status).toBe('pending');
    expect(nexha.tier).toBe('observer');
  });

  it('rejects duplicate names', () => {
    federationService.register({
      name: 'Unique', description: 'd', region: 'US',
      contactEmail: 'a@b.com', publicKey: 'fp:x',
      categories: [], osVersion: '1.0.0'
    });
    expect(() => federationService.register({
      name: 'Unique', description: 'd', region: 'US',
      contactEmail: 'a@b.com', publicKey: 'fp:y',
      categories: [], osVersion: '1.0.0'
    })).toThrow(/already exists/);
  });

  it('validates required fields', () => {
    expect(() => federationService.register({
      name: '', description: 'd', region: 'US',
      contactEmail: 'a@b.com', publicKey: 'fp:x',
      categories: [], osVersion: '1.0.0'
    })).toThrow(/name/);
  });

  it('updates a Nexha', () => {
    const n = federationService.register({
      name: 'X', description: 'd', region: 'US',
      contactEmail: 'a@b.com', publicKey: 'fp:x',
      categories: [], osVersion: '1.0.0'
    });
    const updated = federationService.update(n.id, { status: 'active', tier: 'standard' });
    expect(updated?.status).toBe('active');
    expect(updated?.tier).toBe('standard');
  });

  it('suspends and reactivates a Nexha', () => {
    const n = federationService.register({
      name: 'X', description: 'd', region: 'US',
      contactEmail: 'a@b.com', publicKey: 'fp:x',
      categories: [], osVersion: '1.0.0'
    });
    federationService.activate(n.id);
    const suspended = federationService.suspend(n.id, 'fraud detected');
    expect(suspended?.status).toBe('suspended');
    expect(suspended?.metadata?.suspension_reason).toBe('fraud detected');
    const reactivated = federationService.activate(n.id);
    expect(reactivated?.status).toBe('active');
  });
});

describe('Federation Service — listing + filtering', () => {
  beforeEach(() => {
    federationService.reset();
    federationService.seedDemo();
  });

  it('lists all Nexhas', () => {
    const all = federationService.list();
    expect(all.length).toBeGreaterThan(0);
  });

  it('filters by tier', () => {
    const founding = federationService.list({ tier: 'founding' });
    for (const n of founding) {
      expect(n.tier).toBe('founding');
    }
  });

  it('filters by status', () => {
    const active = federationService.list({ status: 'active' });
    for (const n of active) {
      expect(n.status).toBe('active');
    }
  });

  it('filters by region', () => {
    const inNexhas = federationService.list({ region: 'IN' });
    for (const n of inNexhas) {
      expect(n.region).toBe('IN');
    }
  });

  it('filters by category', () => {
    const agentNexhas = federationService.list({ category: 'agent' });
    for (const n of agentNexhas) {
      expect(n.categories).toContain('agent');
    }
  });

  it('sorts by name', () => {
    const all = federationService.list();
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].name.localeCompare(all[i].name)).toBeLessThanOrEqual(0);
    }
  });
});

describe('Federation Service — handshakes', () => {
  beforeEach(() => {
    federationService.reset();
    federationService.seedDemo();
  });

  it('initiates a handshake in pending state', () => {
    const hs = federationService.initiateHandshake('nexha-maya-collective', 'nexha-finance-singapore', {
      mutualCapabilities: ['agent'],
      dataSharing: 'public',
      paymentTerms: 'standard'
    });
    expect(hs.id).toMatch(/^hs-/);
    expect(hs.status).toBe('pending');
    expect(hs.initiatorSignature).toBeTruthy();
    expect(hs.targetSignature).toBeUndefined();
  });

  it('rejects handshake with non-existent Nexha', () => {
    expect(() => federationService.initiateHandshake('nexha-maya-collective', 'nexha-doesnt-exist', {
      mutualCapabilities: [], dataSharing: 'public', paymentTerms: 'standard'
    })).toThrow(/not registered/);
  });

  it('rejects self-handshake', () => {
    expect(() => federationService.initiateHandshake('nexha-maya-collective', 'nexha-maya-collective', {
      mutualCapabilities: [], dataSharing: 'public', paymentTerms: 'standard'
    })).toThrow(/self/);
  });

  it('responds to a pending handshake (accept)', () => {
    const hs = federationService.initiateHandshake('nexha-maya-collective', 'nexha-logistics-mumbai', {
      mutualCapabilities: [], dataSharing: 'public', paymentTerms: 'standard'
    });
    const responded = federationService.respondToHandshake(hs.id, true, 'sig-target');
    expect(responded?.status).toBe('accepted');
    expect(responded?.targetSignature).toBe('sig-target');
  });

  it('responds to a pending handshake (reject)', () => {
    const hs = federationService.initiateHandshake('nexha-maya-collective', 'nexha-logistics-mumbai', {
      mutualCapabilities: [], dataSharing: 'public', paymentTerms: 'standard'
    });
    const responded = federationService.respondToHandshake(hs.id, false, 'sig-reject');
    expect(responded?.status).toBe('rejected');
  });

  it('rejects responding to non-pending handshake', () => {
    const hs = federationService.initiateHandshake('nexha-maya-collective', 'nexha-logistics-mumbai', {
      mutualCapabilities: [], dataSharing: 'public', paymentTerms: 'standard'
    });
    federationService.respondToHandshake(hs.id, true, 'sig-1');
    const second = federationService.respondToHandshake(hs.id, false, 'sig-2');
    expect(second).toBeNull();
  });

  it('revokes a handshake', () => {
    const hs = federationService.initiateHandshake('nexha-maya-collective', 'nexha-logistics-mumbai', {
      mutualCapabilities: [], dataSharing: 'public', paymentTerms: 'standard'
    });
    federationService.respondToHandshake(hs.id, true, 'sig-1');
    const revoked = federationService.revokeHandshake(hs.id);
    expect(revoked?.status).toBe('revoked');
  });

  it('returns accepted peers for a Nexha', () => {
    const peers = federationService.getPeers('nexha-maya-collective');
    expect(peers.length).toBeGreaterThan(0);
    for (const p of peers) {
      expect(p.id).not.toBe('nexha-maya-collective');
      expect(['active', 'pending', 'suspended']).toContain(p.status);
    }
  });

  it('returns empty peers for unknown Nexha', () => {
    const peers = federationService.getPeers('nexha-doesnt-exist');
    expect(peers.length).toBe(0);
  });
});

describe('Federation Service — governance policies', () => {
  beforeEach(() => {
    federationService.reset();
    federationService.seedDemo();
  });

  it('creates a new policy with version 1', () => {
    const p = federationService.createPolicy({
      title: 'New Policy',
      description: 'test',
      category: 'technical',
      enforcement: 'mandatory',
      rules: [{ when: 'X', then: 'Y' }]
    });
    expect(p.id).toMatch(/^pol-/);
    expect(p.version).toBe(1);
  });

  it('updates policy with incremented version', () => {
    const p = federationService.createPolicy({
      title: 'X', description: 'd',
      category: 'conduct', enforcement: 'mandatory',
      rules: [{ when: 'a', then: 'b' }]
    });
    const updated = federationService.updatePolicy(p.id, { title: 'X2' });
    expect(updated?.version).toBe(2);
    expect(updated?.title).toBe('X2');
  });

  it('deletes a policy', () => {
    const p = federationService.createPolicy({
      title: 'X', description: 'd',
      category: 'conduct', enforcement: 'mandatory',
      rules: [{ when: 'a', then: 'b' }]
    });
    expect(federationService.deletePolicy(p.id)).toBe(true);
    expect(federationService.getPolicy(p.id)).toBeNull();
  });

  it('filters policies by category', () => {
    const dataPolicies = federationService.listPolicies({ category: 'data-privacy' });
    for (const p of dataPolicies) {
      expect(p.category).toBe('data-privacy');
    }
  });

  it('filters policies by enforcement', () => {
    const mandatory = federationService.listPolicies({ enforcement: 'mandatory' });
    for (const p of mandatory) {
      expect(p.enforcement).toBe('mandatory');
    }
  });
});

describe('Federation Service — federation stats', () => {
  beforeEach(() => {
    federationService.reset();
    federationService.seedDemo();
  });

  it('computes aggregate stats', () => {
    const stats = federationService.getStats();
    expect(stats.totalNexhas).toBeGreaterThan(0);
    expect(stats.totalHandshakes).toBeGreaterThan(0);
    expect(stats.totalPolicies).toBeGreaterThan(0);
    expect(stats.regions.length).toBeGreaterThan(0);
    // Sum of byTier should equal totalNexhas
    const tierSum = Object.values(stats.byTier).reduce((s, n) => s + n, 0);
    expect(tierSum).toBe(stats.totalNexhas);
  });

  it('counts active handshakes', () => {
    const stats = federationService.getStats();
    expect(stats.activeHandshakes).toBeGreaterThan(0);
    expect(stats.activeHandshakes).toBeLessThanOrEqual(stats.totalHandshakes);
  });
});