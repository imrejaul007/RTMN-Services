/**
 * sutar-economy-os — Escrow service unit tests
 */

import { describe, it, expect } from 'vitest';
import { escrowService, ReleaseCondition } from '../../src/services/escrow.service.js';

const baseEscrow = {
  amount: 10_000,
  currency: 'INR',
  releaseCondition: 'manual' as unknown as ReleaseCondition,
  title: 'Test escrow',
};

describe('escrow — lifecycle', () => {
  it('creates an escrow in pending status', async () => {
    const e = await escrowService.createEscrow({
      senderId: 'buyer-1',
      recipientId: 'seller-1',
      ...baseEscrow,
    });
    expect(e.status).toBe('pending');
    expect(e.amount).toBe(10_000);
    expect(e.currency).toBe('INR');
  });

  it('rejects escrow with zero or negative amount', async () => {
    await expect(
      escrowService.createEscrow({
        senderId: 'b',
        recipientId: 's',
        amount: 0,
        currency: 'INR',
        releaseCondition: 'manual' as unknown as ReleaseCondition,
        title: 'zero',
      })
    ).rejects.toThrow();
  });

  it('rejects escrow where sender == recipient', async () => {
    await expect(
      escrowService.createEscrow({
        senderId: 'same',
        recipientId: 'same',
        amount: 100,
        currency: 'INR',
        releaseCondition: 'manual' as unknown as ReleaseCondition,
        title: 'self',
      })
    ).rejects.toThrow();
  });

  it('throws when funding a non-existent escrow', async () => {
    await expect(
      escrowService.fundEscrow('does-not-exist', 'anyone')
    ).rejects.toThrow();
  });

  it('throws when releasing a non-existent escrow', async () => {
    await expect(
      escrowService.releaseEscrow('does-not-exist', 'anyone')
    ).rejects.toThrow();
  });
});

describe('escrow — listing', () => {
  it('lists escrows by entity', async () => {
    const entityId = `entity-${Date.now()}-${Math.random()}`;
    await escrowService.createEscrow({
      senderId: entityId,
      recipientId: 's',
      amount: 100,
      currency: 'INR',
      releaseCondition: 'manual' as unknown as ReleaseCondition,
      title: 'Test',
    });
    const result: any = await escrowService.getEscrows(entityId);
    const list = Array.isArray(result) ? result : result.escrows || [];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty list for entity with no escrows', async () => {
    const result: any = await escrowService.getEscrows('never-seen-' + Date.now());
    const list = Array.isArray(result) ? result : result.escrows || [];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(0);
  });
});
