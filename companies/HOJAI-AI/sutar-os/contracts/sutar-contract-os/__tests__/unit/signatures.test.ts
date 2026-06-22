/**
 * SUTAR Contract OS - Signature Service Unit Tests
 *
 * The signature service uses module-level state for requests and logs.
 * We use vi.resetModules() + dynamic import to get a fresh store per test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import type { Party } from '../../src/types/index.js';

async function loadService() {
  vi.resetModules();
  const mod = await import('../../src/services/signatures.js');
  return mod.signatureService;
}

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: `party-${Math.random()}`,
    name: 'Rejaul Karim',
    email: 'rejaul@example.com',
    role: 'client',
    signed: false,
    ...overrides,
  } as Party;
}

describe('signatureService.createSignatureRequest', () => {
  let signatureService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    signatureService = await loadService();
  });

  it('creates a request with default 7-day expiry', () => {
    const party = makeParty();
    const req = signatureService.createSignatureRequest('contract-1', party);
    expect(req.id).toMatch(/^sig-req-/);
    expect(req.contractId).toBe('contract-1');
    expect(req.partyId).toBe(party.id);
    expect(req.partyName).toBe(party.name);
    expect(req.partyEmail).toBe(party.email);
    expect(req.status).toBe('pending');

    const createdAt = new Date(req.createdAt).getTime();
    const expiresAt = new Date(req.expiresAt).getTime();
    const diffDays = Math.round((expiresAt - createdAt) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(7);
  });

  it('honours a custom expiryDays option', () => {
    const req = signatureService.createSignatureRequest('c', makeParty(), { expiryDays: 30 });
    const diffDays = Math.round(
      (new Date(req.expiresAt).getTime() - new Date(req.createdAt).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    expect(diffDays).toBe(30);
  });

  it('stores message and redirectUrl in metadata when provided', () => {
    const req = signatureService.createSignatureRequest('c', makeParty(), {
      message: 'Please sign',
      redirectUrl: 'https://example.com/done',
    });
    expect(req.metadata?.message).toBe('Please sign');
    expect(req.metadata?.redirectUrl).toBe('https://example.com/done');
  });
});

describe('signatureService.sendSignatureRequest / viewSignatureRequest / cancel', () => {
  let signatureService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    signatureService = await loadService();
  });

  it('sends a request and transitions status to "sent"', async () => {
    const req = signatureService.createSignatureRequest('c', makeParty());
    const ok = await signatureService.sendSignatureRequest(req.id);
    expect(ok).toBe(true);
    expect(signatureService.getSignatureRequest(req.id)?.status).toBe('sent');
  });

  it('returns false when sending a non-existent request', async () => {
    expect(await signatureService.sendSignatureRequest('missing')).toBe(false);
  });

  it('marks a request as viewed and logs the action', () => {
    const req = signatureService.createSignatureRequest('c', makeParty());
    const ok = signatureService.viewSignatureRequest(req.id, '127.0.0.1', 'Mozilla/5.0');
    expect(ok).toBe(true);
    expect(signatureService.getSignatureRequest(req.id)?.status).toBe('viewed');

    const logs = signatureService.getSignatureLogs('c');
    const viewedLog = logs.find((l) => l.action === 'viewed');
    expect(viewedLog).toBeDefined();
    expect(viewedLog?.ipAddress).toBe('127.0.0.1');
  });

  it('cancels a pending request', () => {
    const req = signatureService.createSignatureRequest('c', makeParty());
    expect(signatureService.cancelSignatureRequest(req.id, 'changed mind')).toBe(true);
    expect(signatureService.getSignatureRequest(req.id)?.status).toBe('cancelled');
  });

  it('returns false when cancelling a non-existent request', () => {
    expect(signatureService.cancelSignatureRequest('missing')).toBe(false);
  });
});

describe('signatureService.signDocument', () => {
  let signatureService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    signatureService = await loadService();
  });

  it('creates a Signature with status "signed" and a sha256 hash', () => {
    const req = signatureService.createSignatureRequest('contract-9', makeParty());
    const sig = signatureService.signDocument(req.id, 'my-signature-data');
    expect(sig).toBeDefined();
    expect(sig?.status).toBe('signed');
    expect(sig?.signature).toBe('my-signature-data');
    expect(sig?.hash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
    expect(sig?.certificate).toBeTruthy();
  });

  it('updates the request to status "signed" with signedAt timestamp', () => {
    const req = signatureService.createSignatureRequest('c', makeParty());
    signatureService.signDocument(req.id, 'sig-data');
    const refreshed = signatureService.getSignatureRequest(req.id);
    expect(refreshed?.status).toBe('signed');
    expect(refreshed?.signedAt).toBeTruthy();
    expect(refreshed?.signatureData).toBe('sig-data');
  });

  it('returns undefined for an unknown request id', () => {
    expect(signatureService.signDocument('missing', 'data')).toBeUndefined();
  });

  it('expires a request and refuses to sign when past expiry', () => {
    const req = signatureService.createSignatureRequest('c', makeParty(), { expiryDays: -1 });
    // expiryDays=-1 → expiresAt is in the past, so signDocument should refuse.
    const sig = signatureService.signDocument(req.id, 'data');
    expect(sig).toBeUndefined();
    expect(signatureService.getSignatureRequest(req.id)?.status).toBe('expired');
  });
});

describe('signatureService.createTypedSignature / createInitialSignature / signatureStyles', () => {
  let signatureService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    signatureService = await loadService();
  });

  it('creates a typed signature', () => {
    const sig = signatureService.createTypedSignature('John Doe', '127.0.0.1');
    expect(sig.signature).toContain('TYPED:JOHN DOE');
    expect(sig.signatureType).toBe('electronic');
    expect(sig.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('creates an initial signature', () => {
    const sig = signatureService.createInitialSignature('JD', '127.0.0.1');
    expect(sig.signature).toContain('INITIAL:JD');
    expect(sig.signatureType).toBe('electronic');
  });

  it('exposes a non-empty signatureStyles list', async () => {
    vi.resetModules();
    const mod = await import('../../src/services/signatures.js');
    expect(mod.signatureStyles.length).toBeGreaterThan(0);
    expect(mod.signatureStyles).toContain('cursive');
  });
});

describe('signatureService.getSignatureRequestsForContract / getAuditTrail / getSignatureStats', () => {
  let signatureService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    signatureService = await loadService();
  });

  it('returns requests scoped to a contract', () => {
    signatureService.createSignatureRequest('A', makeParty());
    signatureService.createSignatureRequest('A', makeParty());
    signatureService.createSignatureRequest('B', makeParty());
    const forA = signatureService.getSignatureRequestsForContract('A');
    expect(forA.length).toBe(2);
    expect(forA.every((r) => r.contractId === 'A')).toBe(true);
  });

  it('audit trail returns all logged events for a contract', () => {
    const req = signatureService.createSignatureRequest('A', makeParty());
    signatureService.sendSignatureRequest(req.id);
    signatureService.viewSignatureRequest(req.id);
    const trail = signatureService.getAuditTrail('A');
    const actions = trail.map((l) => l.action);
    expect(actions).toContain('created');
    expect(actions).toContain('sent');
    expect(actions).toContain('viewed');
  });

  it('stats reflect the current state of requests', () => {
    const pending = signatureService.createSignatureRequest('A', makeParty());
    const signed = signatureService.createSignatureRequest('A', makeParty());
    const cancelled = signatureService.createSignatureRequest('A', makeParty());

    signatureService.signDocument(signed.id, 'x');
    signatureService.cancelSignatureRequest(cancelled.id);

    const stats = signatureService.getSignatureStats();
    expect(stats.totalRequests).toBe(3);
    expect(stats.pending).toBe(1);
    expect(stats.signed).toBe(1);
    expect(stats.cancelled).toBe(1);

    // Avoid unused-var lint
    expect(pending).toBeDefined();
  });
});

describe('signatureService.bulkCreateSignatureRequests / resendSignatureRequest / verifySignature', () => {
  let signatureService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    signatureService = await loadService();
  });

  it('creates one request per party', () => {
    const parties = [makeParty(), makeParty(), makeParty()];
    const requests = signatureService.bulkCreateSignatureRequests('C', parties);
    expect(requests.length).toBe(3);
    expect(new Set(requests.map((r) => r.id)).size).toBe(3);
  });

  it('cannot resend a signed or cancelled request', async () => {
    const req = signatureService.createSignatureRequest('C', makeParty());
    signatureService.signDocument(req.id, 'sig');
    expect(await signatureService.resendSignatureRequest(req.id)).toBe(false);

    const req2 = signatureService.createSignatureRequest('C', makeParty());
    signatureService.cancelSignatureRequest(req2.id);
    expect(await signatureService.resendSignatureRequest(req2.id)).toBe(false);
  });

  it('can resend a pending request', async () => {
    const req = signatureService.createSignatureRequest('C', makeParty());
    expect(await signatureService.resendSignatureRequest(req.id)).toBe(true);
  });

  it('verifySignature returns a result object (placeholder implementation)', () => {
    const result = signatureService.verifySignature('c', 'p', 'h');
    expect(result).toBeDefined();
    expect(typeof result.isValid).toBe('boolean');
  });
});
