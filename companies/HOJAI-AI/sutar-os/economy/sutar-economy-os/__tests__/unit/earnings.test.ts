/**
 * sutar-economy-os — Earnings service unit tests
 */

import { describe, it, expect } from 'vitest';
import { earningsService } from '../../src/services/earnings.service.js';

describe('earnings — create + read', () => {
  it('creates an earning with default status=pending', async () => {
    const eid = `earn-${Date.now()}-${Math.random()}`;
    const e = await earningsService.createEarning({
      entityId: eid,
      entityType: 'user',
      source: 'contract',
      amount: 250,
      currency: 'USD',
    });
    expect(e.earningId).toBeDefined();
    expect(e.amount).toBe(250);
    expect(e.status).toBe('pending');
    expect(e.currency).toBe('USD');
  });

  it('updates earning status', async () => {
    const e = await earningsService.createEarning({
      entityId: `earn-${Date.now()}`,
      entityType: 'agent',
      source: 'negotiation',
      amount: 100,
    });
    const updated = await earningsService.updateEarningStatus(e.earningId, 'calculated');
    expect(updated?.status).toBe('calculated');
  });

  it('cancels a pending earning with reason', async () => {
    const e = await earningsService.createEarning({
      entityId: `earn-${Date.now()}`,
      entityType: 'user',
      source: 'bonus',
      amount: 50,
    });
    const cancelled = await earningsService.cancelEarning(e.earningId, 'wrong amount');
    expect(cancelled?.status).toBe('cancelled');
  });

  it('refuses to cancel a paid earning', async () => {
    const e = await earningsService.createEarning({
      entityId: `earn-${Date.now()}`,
      entityType: 'user',
      source: 'bonus',
      amount: 50,
    });
    await earningsService.updateEarningStatus(e.earningId, 'paid');
    await expect(earningsService.cancelEarning(e.earningId, 'too late')).rejects.toThrow(/paid/i);
  });
});

describe('earnings — bulk + summary + payout', () => {
  it('marks a batch of earnings as paid', async () => {
    const eid = `earn-batch-${Date.now()}-${Math.random()}`;
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const e = await earningsService.createEarning({
        entityId: eid,
        entityType: 'user',
        source: 'contract',
        amount: 10 + i,
      });
      ids.push(e.earningId);
    }
    const count = await earningsService.markAsPaid(ids);
    expect(count).toBe(3);
  });

  it('returns summary with totals by status', async () => {
    const eid = `earn-sum-${Date.now()}-${Math.random()}`;
    await earningsService.createEarning({ entityId: eid, entityType: 'user', source: 'contract', amount: 100 });
    await earningsService.createEarning({ entityId: eid, entityType: 'user', source: 'bonus', amount: 25 });
    const start = new Date(Date.now() - 1000);
    const end = new Date(Date.now() + 1000);
    const summary = await earningsService.getEarningsSummary(eid, start, end);
    expect(summary.totalEarnings).toBeGreaterThanOrEqual(2);
    expect(summary.pendingEarnings).toBeGreaterThanOrEqual(125);
  });

  it('returns pending payout = sum of pending earnings for a currency', async () => {
    const eid = `earn-payout-${Date.now()}-${Math.random()}`;
    await earningsService.createEarning({ entityId: eid, entityType: 'user', source: 'contract', amount: 77 });
    await earningsService.createEarning({ entityId: eid, entityType: 'user', source: 'bonus', amount: 33 });
    const pending = await earningsService.getPendingPayout(eid, 'USD');
    expect(pending).toBeGreaterThanOrEqual(110);
  });

  it('bulk-create returns all successful for valid requests', async () => {
    const eid = `earn-bulk-${Date.now()}-${Math.random()}`;
    const r = await earningsService.createBulkEarnings([
      { entityId: eid, entityType: 'user', source: 'contract', amount: 10 },
      { entityId: eid, entityType: 'user', source: 'contract', amount: 20 },
      { entityId: eid, entityType: 'user', source: 'contract', amount: 30 },
    ]);
    expect(r.successful.length).toBe(3);
  });

  it('returns most recent N earnings', async () => {
    const eid = `earn-recent-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 4; i++) {
      await earningsService.createEarning({ entityId: eid, entityType: 'user', source: 'contract', amount: i });
    }
    const recent = await earningsService.getRecentEarnings(eid, 2);
    expect(recent.length).toBe(2);
  });
});