import { describe, it, expect, beforeEach } from 'vitest';
import rezCoinService from '../../src/services/rezCoinService.js';

describe('REZ Coin — seeding', () => {
  beforeEach(() => rezCoinService.reset());
  it('seeds demo wallets', () => {
    const s = rezCoinService.seedDemo();
    expect(s.wallets).toBeGreaterThan(0);
    expect(s.txs).toBeGreaterThan(0);
    expect(s.supply).toBeGreaterThan(0);
  });
  it('idempotent', () => {
    rezCoinService.seedDemo();
    const first = rezCoinService.getSupplyStats().totalWallets;
    rezCoinService.seedDemo();
    expect(rezCoinService.getSupplyStats().totalWallets).toBe(first);
  });
});

describe('REZ Coin — wallets', () => {
  beforeEach(() => rezCoinService.reset());
  it('creates a wallet with 0 balance', () => {
    const w = rezCoinService.createWallet({ ownerId: 'test', ownerType: 'customer', displayName: 'T', status: 'active' });
    expect(w.balance).toBe(0);
    expect(w.id).toMatch(/^wallet-/);
  });
  it('rejects duplicate ownerId', () => {
    rezCoinService.createWallet({ ownerId: 'x', ownerType: 'customer', displayName: 'X', status: 'active' });
    expect(() => rezCoinService.createWallet({ ownerId: 'x', ownerType: 'customer', displayName: 'X', status: 'active' })).toThrow(/already exists/);
  });
  it('lists wallets sorted by balance desc', () => {
    rezCoinService.seedDemo();
    const list = rezCoinService.listWallets();
    for (let i = 1; i < list.length; i++) expect(list[i - 1].balance).toBeGreaterThanOrEqual(list[i].balance);
  });
  it('filters by ownerType', () => {
    rezCoinService.seedDemo();
    const customers = rezCoinService.listWallets({ ownerType: 'customer' });
    for (const w of customers) expect(w.ownerType).toBe('customer');
  });
});

describe('REZ Coin — mint / burn / transfer', () => {
  beforeEach(() => rezCoinService.reset());
  it('mints REZ to a wallet', () => {
    const w = rezCoinService.createWallet({ ownerId: 'm1', ownerType: 'customer', displayName: 'M', status: 'active' });
    const tx = rezCoinService.mint(w.id, 100, 'signup bonus');
    expect(tx.kind).toBe('mint');
    expect(rezCoinService.getWallet(w.id)!.balance).toBe(100);
  });
  it('refuses to mint negative amount', () => {
    const w = rezCoinService.createWallet({ ownerId: 'm2', ownerType: 'customer', displayName: 'M', status: 'active' });
    expect(() => rezCoinService.mint(w.id, -10)).toThrow(/positive/);
  });
  it('burns REZ from a wallet', () => {
    const w = rezCoinService.createWallet({ ownerId: 'b1', ownerType: 'customer', displayName: 'B', status: 'active' });
    rezCoinService.mint(w.id, 200);
    const tx = rezCoinService.burn(w.id, 50, 'purchase');
    expect(tx.kind).toBe('burn');
    expect(rezCoinService.getWallet(w.id)!.balance).toBe(150);
  });
  it('refuses to burn more than balance', () => {
    const w = rezCoinService.createWallet({ ownerId: 'b2', ownerType: 'customer', displayName: 'B', status: 'active' });
    rezCoinService.mint(w.id, 10);
    expect(() => rezCoinService.burn(w.id, 50)).toThrow(/Insufficient/);
  });
  it('transfers between wallets', () => {
    const a = rezCoinService.createWallet({ ownerId: 'a', ownerType: 'customer', displayName: 'A', status: 'active' });
    const b = rezCoinService.createWallet({ ownerId: 'b', ownerType: 'customer', displayName: 'B', status: 'active' });
    rezCoinService.mint(a.id, 100);
    rezCoinService.transfer(a.id, b.id, 30, 'gift');
    expect(rezCoinService.getWallet(a.id)!.balance).toBe(70);
    expect(rezCoinService.getWallet(b.id)!.balance).toBe(30);
    expect(rezCoinService.getWallet(a.id)!.lifetimeSpent).toBe(30);
    expect(rezCoinService.getWallet(b.id)!.lifetimeEarned).toBe(30);
  });
  it('refuses self-transfer', () => {
    const a = rezCoinService.createWallet({ ownerId: 's', ownerType: 'customer', displayName: 'S', status: 'active' });
    expect(() => rezCoinService.transfer(a.id, a.id, 10)).toThrow(/self/);
  });
  it('conserves supply across mint + burn', () => {
    const a = rezCoinService.createWallet({ ownerId: 'c1', ownerType: 'customer', displayName: 'C1', status: 'active' });
    const b = rezCoinService.createWallet({ ownerId: 'c2', ownerType: 'customer', displayName: 'C2', status: 'active' });
    rezCoinService.mint(a.id, 100);
    rezCoinService.transfer(a.id, b.id, 50);
    // Total supply is unchanged (100)
    expect(rezCoinService.getSupplyStats().totalSupply).toBe(100);
    // Now burn
    rezCoinService.burn(b.id, 20);
    expect(rezCoinService.getSupplyStats().totalSupply).toBe(80);
  });
});

describe('REZ Coin — supply + history', () => {
  beforeEach(() => rezCoinService.reset());
  it('reports totalSupply = sum of balances', () => {
    rezCoinService.seedDemo();
    const stats = rezCoinService.getSupplyStats();
    let sum = 0;
    for (const w of rezCoinService.listWallets()) sum += w.balance;
    expect(stats.totalSupply).toBe(sum);
  });
  it('history includes all transactions for a wallet', () => {
    rezCoinService.seedDemo();
    const alice = rezCoinService.getWalletByOwner('customer-alice')!;
    const history = rezCoinService.getTransactions(alice.id);
    expect(history.length).toBeGreaterThan(0);
    for (const tx of history) {
      expect(tx.fromWalletId === alice.id || tx.toWalletId === alice.id).toBe(true);
    }
  });
  it('filters history by kind', () => {
    rezCoinService.seedDemo();
    const mints = rezCoinService.getTransactions(undefined, 'mint');
    for (const tx of mints) expect(tx.kind).toBe('mint');
  });
  it('tracks topHolders', () => {
    rezCoinService.seedDemo();
    const stats = rezCoinService.getSupplyStats();
    expect(stats.topHolders.length).toBeGreaterThan(0);
    expect(stats.topHolders[0].balance).toBeGreaterThanOrEqual(stats.topHolders[stats.topHolders.length - 1].balance);
  });
});