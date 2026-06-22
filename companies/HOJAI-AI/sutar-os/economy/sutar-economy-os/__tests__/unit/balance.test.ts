/**
 * sutar-economy-os — Balance service unit tests
 */

import { describe, it, expect } from 'vitest';
import { balanceService } from '../../src/services/balance.service.js';
import { transactionService } from '../../src/services/transaction.service.js';

describe('balance — addFunds / deductFunds', () => {
  it('adds funds to a new entity', async () => {
    const eid = `bal-${Date.now()}-${Math.random()}`;
    const bal = await balanceService.addFunds(eid, 'user', 1000, 'INR');
    expect(bal.availableBalance).toBe(1000);
    expect(bal.totalBalance).toBe(1000);
    expect(bal.currency).toBe('INR');
  });

  it('rejects adding zero or negative funds', async () => {
    const eid = `bal-neg-${Date.now()}`;
    await expect(balanceService.addFunds(eid, 'user', 0, 'INR')).rejects.toThrow();
    await expect(balanceService.addFunds(eid, 'user', -50, 'INR')).rejects.toThrow();
  });

  it('deducts funds from existing balance', async () => {
    const eid = `bal-deduct-${Date.now()}`;
    await balanceService.addFunds(eid, 'user', 1000, 'INR');
    const after = await balanceService.deductFunds(eid, 300, 'INR');
    expect(after.availableBalance).toBe(700);
  });

  it('throws when deducting from non-existent entity', async () => {
    await expect(
      balanceService.deductFunds('does-not-exist-' + Date.now(), 100, 'INR')
    ).rejects.toThrow();
  });
});

describe('balance — transferFunds', () => {
  it('transfers funds between entities', async () => {
    const a = `bal-a-${Date.now()}-${Math.random()}`;
    const b = `bal-b-${Date.now()}-${Math.random()}`;
    await balanceService.addFunds(a, 'user', 1000, 'INR');
    const result = await balanceService.transferFunds(a, b, 250, 'INR');
    expect(result.fromBalance.availableBalance).toBe(750);
    expect(result.toBalance.availableBalance).toBe(250);
  });

  it('rejects transfer with zero or negative amount', async () => {
    const a = `bal-za-${Date.now()}`;
    const b = `bal-zb-${Date.now()}`;
    await balanceService.addFunds(a, 'user', 100, 'INR');
    await expect(balanceService.transferFunds(a, b, 0, 'INR')).rejects.toThrow();
  });
});

describe('balance — hasSufficientBalance', () => {
  it('returns true when balance is sufficient', async () => {
    const eid = `bal-suf-${Date.now()}`;
    await balanceService.addFunds(eid, 'user', 500, 'INR');
    const ok = await balanceService.hasSufficientBalance(eid, 300, 'INR');
    expect(ok).toBe(true);
  });

  it('returns false when balance is insufficient', async () => {
    const eid = `bal-insuf-${Date.now()}`;
    await balanceService.addFunds(eid, 'user', 100, 'INR');
    const ok = await balanceService.hasSufficientBalance(eid, 500, 'INR');
    expect(ok).toBe(false);
  });

  it('returns false for non-existent entity', async () => {
    const ok = await balanceService.hasSufficientBalance('does-not-exist-' + Date.now(), 1, 'INR');
    expect(ok).toBe(false);
  });
});

describe('balance — getBalance', () => {
  it('returns null for unknown entity', async () => {
    const bal = await balanceService.getBalance('never-' + Date.now(), 'INR');
    expect(bal).toBeNull();
  });

  it('returns the current balance after operations', async () => {
    const eid = `bal-get-${Date.now()}`;
    await balanceService.addFunds(eid, 'user', 800, 'INR');
    await balanceService.deductFunds(eid, 200, 'INR');
    const bal = await balanceService.getBalance(eid, 'INR');
    expect(bal).toBeDefined();
    expect(bal!.availableBalance).toBe(600);
  });
});
