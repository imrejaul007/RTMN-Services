/**
 * sutar-economy-os — Redemption service unit tests
 */

import { describe, it, expect } from 'vitest';
import { redemptionService } from '../../src/services/redemption.service.js';

describe('redemption options', () => {
  it('creates a redemption option', async () => {
    const opt = await redemptionService.createOption({
      name: 'Coffee voucher',
      description: 'Redeem 100 points for a free coffee',
      type: 'voucher',
      pointsCost: 100,
      value: 5,
      currency: 'USD',
      available: true,
    });
    expect(opt.optionId).toBeDefined();
    expect(opt.pointsCost).toBe(100);
  });

  it('retrieves an option by id', async () => {
    const created = await redemptionService.createOption({
      name: 'X', description: 'y', type: 'cashback', pointsCost: 50, value: 5, currency: 'USD', available: true,
    });
    const got = await redemptionService.getOption(created.optionId);
    expect(got?.name).toBe('X');
  });

  it('updates an option', async () => {
    const created = await redemptionService.createOption({
      name: 'X', description: 'y', type: 'voucher', pointsCost: 50, value: 5, currency: 'USD', available: true,
    });
    const updated = await redemptionService.updateOption(created.optionId, { pointsCost: 75 });
    expect(updated?.pointsCost).toBe(75);
  });

  it('deactivates an option', async () => {
    const created = await redemptionService.createOption({
      name: 'X', description: 'y', type: 'voucher', pointsCost: 50, value: 5, currency: 'USD', available: true,
    });
    const ok = await redemptionService.deactivateOption(created.optionId);
    expect(ok).toBe(true);
    const got = await redemptionService.getOption(created.optionId);
    expect(got?.available).toBe(false);
  });

  it('filters options by type', async () => {
    await redemptionService.createOption({
      name: 'A', description: 'a', type: 'voucher', pointsCost: 50, value: 5, currency: 'USD', available: true,
    });
    await redemptionService.createOption({
      name: 'B', description: 'b', type: 'cashback', pointsCost: 50, value: 5, currency: 'USD', available: true,
    });
    const vouchers = await redemptionService.getAllOptions({ type: 'voucher' });
    expect(vouchers.every(o => o.type === 'voucher')).toBe(true);
  });
});

describe('redemption — voucher codes', () => {
  it('validates an unknown voucher code', async () => {
    const r = await redemptionService.validateVoucherCode('NEVER-EXISTED');
    expect(r.valid).toBe(false);
  });

  it('uses an unknown voucher code and returns success=false', async () => {
    const r = await redemptionService.useVoucherCode('NEVER-EXISTED');
    expect(r.success).toBe(false);
    expect(r.redemption).toBeNull();
  });

  it('returns redemption statistics for an entity', async () => {
    const eid = `red-stat-${Date.now()}-${Math.random()}`;
    const stats = await redemptionService.getRedemptionStatistics(eid);
    expect(stats.totalRedemptions).toBe(0);
    expect(stats.totalPointsSpent).toBe(0);
  });
});