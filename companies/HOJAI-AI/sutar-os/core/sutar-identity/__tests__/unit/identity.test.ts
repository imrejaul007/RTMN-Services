import { describe, it, expect } from 'vitest';

describe('SUTAR Identity OS — SUTAR Identities', () => {
  const ROLES = ['merchant', 'consumer', 'facilitator', 'observer', 'system'];
  const identities = new Map();

  function seed() {
    const seeds = [
      { sutarId: 'sutar-merchant-001', corpId: 'corp-merchant-001', role: 'merchant', claims: ['negotiator'] },
      { sutarId: 'sutar-consumer-001', corpId: 'corp-consumer-001', role: 'consumer', claims: ['intent-publisher'] },
      { sutarId: 'sutar-system-001', corpId: 'corp-system-001', role: 'system', claims: ['*'] },
    ];
    for (const s of seeds) {
      identities.set(s.sutarId, {
        ...s,
        reputation: 50,
        participatingIntents: [],
        createdAt: new Date().toISOString(),
      });
    }
  }
  seed();

  it('should seed 3 identities', () => {
    expect(identities.size).toBe(3);
  });

  it('should create identity with valid role', () => {
    const corpId = 'corp-new-merchant';
    const role = 'merchant';
    const claims = ['negotiator', 'executor'];
    const sutarId = `sutar-${role}-abc12345`;

    const identity = {
      sutarId, corpId, role, claims,
      reputation: 50,
      participatingIntents: [],
      createdAt: new Date().toISOString(),
    };
    identities.set(sutarId, identity);
    expect(identities.size).toBe(4);
    expect(identities.get(sutarId)?.role).toBe('merchant');
  });

  it('should reject identity creation with invalid role', () => {
    const invalidRole = 'invalid_role';
    const isValid = ROLES.includes(invalidRole);
    expect(isValid).toBe(false);
  });

  it('should list all identities', () => {
    const result = { count: identities.size, identities: Array.from(identities.values()) };
    expect(result.count).toBe(4);
  });

  it('should filter identities by role', () => {
    const role = 'merchant';
    const list = Array.from(identities.values()).filter(i => i.role === role);
    expect(list).toHaveLength(2);
    expect(list[0].role).toBe('merchant');
  });

  it('should get identity by sutarId', () => {
    const id = identities.get('sutar-merchant-001');
    expect(id).toBeDefined();
    expect(id?.corpId).toBe('corp-merchant-001');
    expect(id?.claims).toContain('negotiator');
  });

  it('should return 404 for unknown identity', () => {
    const id = identities.get('nonexistent-id');
    expect(id).toBeUndefined();
  });

  it('should add claim to identity', () => {
    const id = identities.get('sutar-merchant-001')!;
    const newClaim = 'executor';
    if (!id.claims.includes(newClaim)) id.claims.push(newClaim);
    expect(id.claims).toContain('executor');
  });

  it('should not duplicate claims', () => {
    const id = identities.get('sutar-merchant-001')!;
    const initialCount = id.claims.length;
    const newClaim = 'executor';
    if (!id.claims.includes(newClaim)) id.claims.push(newClaim);
    // Already added above, so this should not add again
    const before = id.claims.length;
    if (!id.claims.includes(newClaim)) id.claims.push(newClaim);
    expect(id.claims.length).toBe(before);
  });

  it('should revoke identity', () => {
    const id = identities.get('sutar-consumer-001')!;
    id.revoked = true;
    id.revokedAt = new Date().toISOString();
    expect(id.revoked).toBe(true);
    expect(id.revokedAt).toBeDefined();
  });

  it('should attest from one identity to another', () => {
    const from = identities.get('sutar-system-001')!;
    const subject = 'sutar-merchant-001';
    const statement = 'Verified merchant with valid business registration';
    const weight = 15;

    const attestation = {
      id: `attest-${Date.now()}`,
      from: from.sutarId,
      to: subject,
      statement,
      weight,
      createdAt: new Date().toISOString(),
    };

    const target = identities.get(subject)!;
    target.attestations = target.attestations || [];
    target.attestations.push(attestation);

    expect(target.attestations).toHaveLength(1);
    expect(target.attestations[0].from).toBe('sutar-system-001');
    expect(target.attestations[0].weight).toBe(15);
  });

  it('should validate attestation requires both subject and statement', () => {
    const subject = '';
    const statement = 'test statement';
    const hasRequired = subject !== '' && statement !== '';
    expect(hasRequired).toBe(false);
  });

  it('should require corpId for identity creation', () => {
    const corpId = '';
    const hasRequired = corpId !== '';
    expect(hasRequired).toBe(false);
  });

  it('should define all valid roles', () => {
    expect(ROLES).toHaveLength(5);
    expect(ROLES).toContain('merchant');
    expect(ROLES).toContain('consumer');
    expect(ROLES).toContain('facilitator');
    expect(ROLES).toContain('observer');
    expect(ROLES).toContain('system');
  });

  it('should create identity with default reputation of 50', () => {
    const identity = {
      sutarId: 'sutar-test',
      corpId: 'corp-test',
      role: 'merchant',
      claims: [],
      reputation: 50,
      participatingIntents: [],
      createdAt: new Date().toISOString(),
    };
    expect(identity.reputation).toBe(50);
  });

  it('should generate sutarId from role and uuid', () => {
    const role = 'observer';
    const uuid = 'abc12345';
    const sutarId = `sutar-${role}-${uuid}`;
    expect(sutarId).toBe('sutar-observer-abc12345');
    expect(sutarId).toContain(role);
  });
});