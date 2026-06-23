import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { setupTestDb, clearTestDb, teardownTestDb, syncIndexes } from '../helpers/db.js';

let svc;

beforeAll(async () => {
  await setupTestDb();
  await syncIndexes();
  svc = await import('../../src/services/hooksService.js');
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('signPayload / verifySignature', () => {
  it('signs with sha256= prefix', () => {
    const sig = svc.signPayload('secret', 'body');
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('round-trips: sign then verify', () => {
    const secret = 'whsec_abc';
    const body = JSON.stringify({ event: 'order.placed', id: 1 });
    const sig = svc.signPayload(secret, body);
    expect(svc.verifySignature(secret, body, sig)).toBe(true);
  });

  it('rejects wrong secret', () => {
    const body = 'hello';
    const sig = svc.signPayload('secret-a', body);
    expect(svc.verifySignature('secret-b', body, sig)).toBe(false);
  });

  it('rejects tampered body', () => {
    const sig = svc.signPayload('secret', 'original');
    expect(svc.verifySignature('secret', 'tampered', sig)).toBe(false);
  });

  it('rejects malformed signature header', () => {
    expect(svc.verifySignature('secret', 'body', 'md5=abc')).toBe(false);
    expect(svc.verifySignature('secret', 'body', '')).toBe(false);
  });
});

describe('getRetryDelay / getMaxAttempts', () => {
  it('returns the correct schedule', () => {
    expect(svc.getRetryDelay(0)).toBe(60_000);
    expect(svc.getRetryDelay(1)).toBe(300_000);
    expect(svc.getRetryDelay(2)).toBe(1_800_000);
    expect(svc.getRetryDelay(3)).toBe(7_200_000);
    expect(svc.getRetryDelay(4)).toBe(43_200_000);
    expect(svc.getRetryDelay(5)).toBe(86_400_000);
  });

  it('returns null when out of attempts', () => {
    expect(svc.getRetryDelay(6)).toBe(null);
    expect(svc.getRetryDelay(99)).toBe(null);
  });

  it('returns 1m for negative input (defensive)', () => {
    expect(svc.getRetryDelay(-1)).toBe(60_000);
  });

  it('max attempts = 6', () => {
    expect(svc.getMaxAttempts()).toBe(6);
  });
});

describe('createSubscription', () => {
  it('creates with a fresh secret', async () => {
    const sub = await svc.createSubscription({
      tenantId: 't1',
      url: 'https://example.com/hook',
      eventTypes: ['order.placed'],
    });
    expect(sub.subscriptionId).toMatch(/^sub_/);
    expect(sub.secret).toMatch(/^whsec_/);
    expect(sub.status).toBe('ACTIVE');
  });

  it('rejects bad URL', async () => {
    await expect(svc.createSubscription({
      tenantId: 't1',
      url: 'not-a-url',
      eventTypes: ['order.placed'],
    })).rejects.toThrow(svc.ValidationError);
  });

  it('rejects non-http(s) URL', async () => {
    await expect(svc.createSubscription({
      tenantId: 't1',
      url: 'ftp://example.com',
      eventTypes: ['order.placed'],
    })).rejects.toThrow(svc.ValidationError);
  });

  it('rejects empty eventTypes', async () => {
    await expect(svc.createSubscription({
      tenantId: 't1',
      url: 'https://example.com',
      eventTypes: [],
    })).rejects.toThrow(svc.ValidationError);
  });

  it('rejects unknown eventType', async () => {
    await expect(svc.createSubscription({
      tenantId: 't1',
      url: 'https://example.com',
      eventTypes: ['bogus.event'],
    })).rejects.toThrow(svc.ValidationError);
  });

  it('accepts wildcard "*"', async () => {
    const sub = await svc.createSubscription({
      tenantId: 't1',
      url: 'https://example.com',
      eventTypes: ['*'],
    });
    expect(sub.eventTypes).toEqual(['*']);
  });

  it('two subscriptions get different secrets', async () => {
    const s1 = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    const s2 = await svc.createSubscription({ tenantId: 't1', url: 'https://b.com', eventTypes: ['*'] });
    expect(s1.secret).not.toBe(s2.secret);
  });
});

describe('getSubscription / listSubscriptions', () => {
  it('getSubscription returns the sub for its tenant', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    const got = await svc.getSubscription(created.subscriptionId, { tenantId: 't1' });
    expect(got.subscriptionId).toBe(created.subscriptionId);
  });

  it('getSubscription returns NotFoundError for other tenant (no leak)', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await expect(svc.getSubscription(created.subscriptionId, { tenantId: 't2' })).rejects.toThrow(svc.NotFoundError);
  });

  it('listSubscriptions filters by tenant + status', async () => {
    await svc.createSubscription({ tenantId: 'a', url: 'https://a.com', eventTypes: ['*'] });
    await svc.createSubscription({ tenantId: 'a', url: 'https://b.com', eventTypes: ['*'] });
    await svc.createSubscription({ tenantId: 'b', url: 'https://c.com', eventTypes: ['*'] });
    const a = await svc.listSubscriptions({ tenantId: 'a' });
    expect(a.items).toHaveLength(2);
  });

  it('listSubscriptions filters by eventType', async () => {
    await svc.createSubscription({ tenantId: 'a', url: 'https://a.com', eventTypes: ['order.placed'] });
    await svc.createSubscription({ tenantId: 'a', url: 'https://b.com', eventTypes: ['*'] });
    const r = await svc.listSubscriptions({ tenantId: 'a', eventType: 'order.placed' });
    expect(r.items).toHaveLength(2); // the explicit + the wildcard
  });
});

describe('updateSubscription', () => {
  it('updates url', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    const updated = await svc.updateSubscription(created.subscriptionId, { url: 'https://b.com' }, { tenantId: 't1' });
    expect(updated.url).toBe('https://b.com');
  });

  it('updates eventTypes', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    const updated = await svc.updateSubscription(created.subscriptionId, { eventTypes: ['order.placed'] }, { tenantId: 't1' });
    expect(updated.eventTypes).toEqual(['order.placed']);
  });

  it('rejects bad url', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await expect(svc.updateSubscription(created.subscriptionId, { url: 'ftp://x' }, { tenantId: 't1' })).rejects.toThrow(svc.ValidationError);
  });

  it('rejects empty eventTypes', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await expect(svc.updateSubscription(created.subscriptionId, { eventTypes: [] }, { tenantId: 't1' })).rejects.toThrow(svc.ValidationError);
  });
});

describe('subscription state machine', () => {
  it('ACTIVE → DISABLED → ACTIVE', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    const d = await svc.disableSubscription(created.subscriptionId, { tenantId: 't1' });
    expect(d.status).toBe('DISABLED');
    const e = await svc.enableSubscription(created.subscriptionId, { tenantId: 't1' });
    expect(e.status).toBe('ACTIVE');
  });

  it('ACTIVE → DELETED is allowed (terminal)', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    const d = await svc.deleteSubscription(created.subscriptionId, { tenantId: 't1' });
    expect(d.status).toBe('DELETED');
  });

  it('DELETED → anything is forbidden', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.deleteSubscription(created.subscriptionId, { tenantId: 't1' });
    await expect(svc.enableSubscription(created.subscriptionId, { tenantId: 't1' })).rejects.toThrow(svc.StateTransitionError);
  });

  it('DISABLED → DELETED is allowed', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.disableSubscription(created.subscriptionId, { tenantId: 't1' });
    const d = await svc.deleteSubscription(created.subscriptionId, { tenantId: 't1' });
    expect(d.status).toBe('DELETED');
  });
});

describe('rotateSecret', () => {
  it('rotates the secret and returns new plaintext', async () => {
    const created = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    const rotated = await svc.rotateSecret(created.subscriptionId, { tenantId: 't1' });
    expect(rotated.secret).not.toBe(created.secret);
    expect(rotated.secret).toMatch(/^whsec_/);
  });
});

describe('emitEvent', () => {
  it('creates a delivery for a matching subscription', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['order.placed'] });
    const result = await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: { orderId: 123 } });
    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries[0].subscriptionId).toBe(sub.subscriptionId);
    expect(result.deliveries[0].eventType).toBe('order.placed');
    expect(result.deliveries[0].payload.signature).toMatch(/^sha256=/);
  });

  it('creates no deliveries when no subscription matches', async () => {
    await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['order.placed'] });
    const result = await svc.emitEvent({ tenantId: 't1', eventType: 'partner.invited', payload: {} });
    expect(result.deliveries).toHaveLength(0);
  });

  it('wildcard subscription catches every event', async () => {
    await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    const r1 = await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    const r2 = await svc.emitEvent({ tenantId: 't1', eventType: 'partner.invited', payload: {} });
    expect(r1.deliveries).toHaveLength(1);
    expect(r2.deliveries).toHaveLength(1);
  });

  it('does not deliver to DISABLED subscriptions', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.disableSubscription(sub.subscriptionId, { tenantId: 't1' });
    const result = await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    expect(result.deliveries).toHaveLength(0);
  });

  it('does not deliver to other tenant subscriptions', async () => {
    await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.createSubscription({ tenantId: 't2', url: 'https://b.com', eventTypes: ['*'] });
    const result = await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries[0].tenantId).toBe('t1');
  });

  it('rejects unknown eventType', async () => {
    await expect(svc.emitEvent({ tenantId: 't1', eventType: 'bogus', payload: {} })).rejects.toThrow(svc.ValidationError);
  });

  it('fan-out to multiple matching subscriptions', async () => {
    await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['order.placed'] });
    await svc.createSubscription({ tenantId: 't1', url: 'https://b.com', eventTypes: ['*'] });
    await svc.createSubscription({ tenantId: 't1', url: 'https://c.com', eventTypes: ['order.placed', 'order.paid'] });
    const result = await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    expect(result.deliveries).toHaveLength(3);
  });
});

describe('processDeliveries', () => {
  it('processes a pending delivery successfully (default client returns 200)', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: { x: 1 } });
    const result = await svc.processDeliveries();
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('retries on 5xx', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    const failingClient = async () => ({ status: 500, body: 'oops' });
    const result = await svc.processDeliveries({ httpClient: failingClient });
    expect(result.succeeded).toBe(0);
    expect(result.scheduledNext).toBe(1);
  });

  it('marks as FAILED after maxAttempts', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    const failingClient = async () => ({ status: 500, body: 'oops' });
    // Force nextAttemptAt to the past between calls so each one processes
    const { HookDelivery } = await import('../../src/models/HookDelivery.js');
    // Run 6 times to exhaust
    for (let i = 0; i < 6; i++) {
      await HookDelivery.updateMany({}, { $set: { nextAttemptAt: new Date(Date.now() - 1000) } });
      await svc.processDeliveries({ httpClient: failingClient });
    }
    const dlv = await svc.listDeliveries({ tenantId: 't1' });
    const d = dlv.items[0];
    expect(d.status).toBe('FAILED');
    expect(d.attempt).toBe(6);
  });

  it('skips deliveries whose nextAttemptAt is in the future', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    const failingClient = async () => ({ status: 500, body: 'oops' });
    // First attempt → RETRYING
    await svc.processDeliveries({ httpClient: failingClient });
    // Second immediate attempt should be skipped (nextAttemptAt in future)
    const result = await svc.processDeliveries({ httpClient: failingClient });
    expect(result.processed).toBe(0);
  });

  it('updates subscription stats on success', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    await svc.processDeliveries();
    const updated = await svc.getSubscription(sub.subscriptionId, { tenantId: 't1' });
    expect(updated.totalDeliveries).toBe(1);
    expect(updated.successfulDeliveries).toBe(1);
    expect(updated.failedDeliveries).toBe(0);
    expect(updated.lastSuccessAt).toBeDefined();
  });

  it('updates subscription stats on failure', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    const failingClient = async () => ({ status: 500, body: 'oops' });
    await svc.processDeliveries({ httpClient: failingClient });
    const updated = await svc.getSubscription(sub.subscriptionId, { tenantId: 't1' });
    expect(updated.failedDeliveries).toBe(1);
    expect(updated.lastFailureAt).toBeDefined();
  });
});

describe('listDeliveries / getDelivery', () => {
  it('listDeliveries filters by tenant', async () => {
    await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.createSubscription({ tenantId: 't2', url: 'https://b.com', eventTypes: ['*'] });
    await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    await svc.emitEvent({ tenantId: 't2', eventType: 'order.placed', payload: {} });
    const t1 = await svc.listDeliveries({ tenantId: 't1' });
    expect(t1.items).toHaveLength(1);
    expect(t1.items[0].tenantId).toBe('t1');
  });

  it('listDeliveries filters by status', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    await svc.processDeliveries();
    const success = await svc.listDeliveries({ tenantId: 't1', status: 'SUCCESS' });
    expect(success.items).toHaveLength(1);
  });

  it('getDelivery returns NotFoundError for other tenant (no leak)', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    const r = await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    await expect(svc.getDelivery(r.deliveries[0].deliveryId, { tenantId: 't2' })).rejects.toThrow(svc.NotFoundError);
  });
});

describe('getStats', () => {
  it('returns aggregate stats', async () => {
    const sub = await svc.createSubscription({ tenantId: 't1', url: 'https://a.com', eventTypes: ['*'] });
    await svc.createSubscription({ tenantId: 't1', url: 'https://b.com', eventTypes: ['*'] });
    await svc.disableSubscription(sub.subscriptionId, { tenantId: 't1' });
    await svc.emitEvent({ tenantId: 't1', eventType: 'order.placed', payload: {} });
    await svc.processDeliveries();
    const stats = await svc.getStats('t1');
    expect(stats.subscriptions.total).toBe(2);
    expect(stats.subscriptions.active).toBe(1);
    expect(stats.subscriptions.disabled).toBe(1);
    expect(stats.deliveries.total).toBe(1);
    expect(stats.deliveries.success).toBe(1);
    expect(stats.totalsByEventType['order.placed']).toBe(1);
  });
});
