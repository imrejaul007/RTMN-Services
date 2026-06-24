/**
 * REZ Coin — service
 *
 * Manages wallets, mints, burns, transfers, and tracks total supply.
 * Supply is elastic: mints when merchants pay commission, burns when
 * customers spend. Inactive wallets lose 2%/year to encourage circulation.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Wallet, WalletStatus, RezTransaction, RezTxKind, SupplyStats
} from '../types/index.js';

class RezCoinService {
  private wallets = new Map<string, Wallet>();
  private transactions: RezTransaction[] = [];
  private totalBurned = 0;
  private totalMinted = 0;
  /** Wallets scheduled for decay (computed lazily). */
  private readonly ANNUAL_DECAY_RATE = 0.02;

  seedDemo(): { wallets: number; txs: number; supply: number } {
    if (this.wallets.size > 0) {
      return {
        wallets: this.wallets.size,
        txs: this.transactions.length,
        supply: this.getTotalSupply()
      };
    }

    const now = new Date().toISOString();

    // Seed a few demo wallets
    const seeds: Array<Omit<Wallet, 'id' | 'createdAt' | 'updatedAt' | 'lifetimeEarned' | 'lifetimeSpent' | 'stakedBalance'>> = [
      { ownerId: 'nexha-maya-collective', ownerType: 'nexha', displayName: 'Maya Collective', balance: 5000, lastActivityAt: now, status: 'active' },
      { ownerId: 'customer-alice', ownerType: 'customer', displayName: 'Alice', balance: 250, lastActivityAt: now, status: 'active' },
      { ownerId: 'customer-bob', ownerType: 'customer', displayName: 'Bob', balance: 75, lastActivityAt: now, status: 'active' },
      { ownerId: 'merchant-fastfashion', ownerType: 'merchant', displayName: 'Fast Fashion Co', balance: 1200, lastActivityAt: now, status: 'active' },
      { ownerId: 'agent-procurement', ownerType: 'agent', displayName: 'Procurement Agent', balance: 350, lastActivityAt: now, status: 'active' },
      { ownerId: 'system-treasury', ownerType: 'system', displayName: 'REZ Treasury', balance: 10000, lastActivityAt: now, status: 'active' }
    ];

    for (const seed of seeds) {
      const id = `wallet-${uuidv4().slice(0, 8)}`;
      const wallet: Wallet = {
        ...seed,
        id,
        stakedBalance: 0,
        lifetimeEarned: seed.balance, // assume all balance is from initial mint for demo
        lifetimeSpent: 0,
        createdAt: now,
        updatedAt: now
      };
      this.wallets.set(id, wallet);
      this.totalMinted += seed.balance;
    }

    // Seed a few demo transactions
    this.recordTx({
      kind: 'mint',
      toWalletId: 'system-treasury',
      amount: 10000,
      memo: 'Initial treasury mint',
      balanceAfter: 10000
    });
    this.recordTx({
      kind: 'mint',
      toWalletId: this.findByOwner('nexha-maya-collective')?.id ?? '',
      amount: 5000,
      memo: 'Maya Collective: founder bonus',
      balanceAfter: 5000
    });
    this.recordTx({
      kind: 'cashback',
      toWalletId: this.findByOwner('customer-alice')?.id ?? '',
      amount: 100,
      reference: 'purchase-fx-2026-06',
      memo: 'Cashback from fashion purchase',
      balanceAfter: 100
    });
    this.recordTx({
      kind: 'cashback',
      toWalletId: this.findByOwner('customer-alice')?.id ?? '',
      amount: 50,
      reference: 'purchase-photo-2026-06',
      memo: 'Cashback from photo service',
      balanceAfter: 150
    });
    this.recordTx({
      kind: 'mint',
      toWalletId: this.findByOwner('customer-alice')?.id ?? '',
      amount: 100,
      memo: 'Referral bonus',
      balanceAfter: 250
    });
    this.recordTx({
      kind: 'mint',
      toWalletId: this.findByOwner('merchant-fastfashion')?.id ?? '',
      amount: 1200,
      memo: 'Merchant sales commission payout',
      balanceAfter: 1200
    });
    this.recordTx({
      kind: 'mint',
      toWalletId: this.findByOwner('agent-procurement')?.id ?? '',
      amount: 350,
      memo: 'Agent task reward',
      balanceAfter: 350
    });
    this.recordTx({
      kind: 'reward',
      toWalletId: this.findByOwner('customer-bob')?.id ?? '',
      amount: 75,
      reference: 'signup-bonus-2026-05',
      memo: 'Welcome bonus',
      balanceAfter: 75
    });

    return { wallets: this.wallets.size, txs: this.transactions.length, supply: this.getTotalSupply() };
  }

  private recordTx(input: Omit<RezTransaction, 'id' | 'hash' | 'occurredAt'>): RezTransaction {
    const id = `tx-${uuidv4().slice(0, 8)}`;
    const hash = `0x${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const tx: RezTransaction = { ...input, id, hash, occurredAt: new Date().toISOString() };
    this.transactions.push(tx);
    return tx;
  }

  private findByOwner(ownerId: string): Wallet | null {
    for (const w of this.wallets.values()) {
      if (w.ownerId === ownerId) return w;
    }
    return null;
  }

  // ─── Wallet management ─────────────────────────────────────────

  createWallet(input: Omit<Wallet, 'id' | 'balance' | 'stakedBalance' | 'lifetimeEarned' | 'lifetimeSpent' | 'lastActivityAt' | 'createdAt' | 'updatedAt'>): Wallet {
    if (this.findByOwner(input.ownerId)) {
      throw new Error(`Wallet for owner ${input.ownerId} already exists`);
    }
    const id = `wallet-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const wallet: Wallet = {
      ...input,
      id,
      balance: 0,
      stakedBalance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now
    };
    this.wallets.set(id, wallet);
    return wallet;
  }

  getWallet(id: string): Wallet | null {
    return this.wallets.get(id) ?? null;
  }

  getWalletByOwner(ownerId: string): Wallet | null {
    return this.findByOwner(ownerId);
  }

  listWallets(filter: { ownerType?: Wallet['ownerType']; status?: WalletStatus; minBalance?: number } = {}): Wallet[] {
    let results = Array.from(this.wallets.values());
    if (filter.ownerType) results = results.filter((w) => w.ownerType === filter.ownerType);
    if (filter.status) results = results.filter((w) => w.status === filter.status);
    if (filter.minBalance !== undefined) results = results.filter((w) => w.balance >= filter.minBalance!);
    return results.sort((a, b) => b.balance - a.balance);
  }

  // ─── Mint / Burn ───────────────────────────────────────────────

  mint(toWalletId: string, amount: number, memo?: string, reference?: string): RezTransaction {
    const wallet = this.wallets.get(toWalletId);
    if (!wallet) throw new Error(`Wallet ${toWalletId} not found`);
    if (amount <= 0) throw new Error('Amount must be positive');
    wallet.balance += amount;
    wallet.lifetimeEarned += amount;
    wallet.lastActivityAt = new Date().toISOString();
    wallet.updatedAt = wallet.lastActivityAt;
    this.totalMinted += amount;
    return this.recordTx({ kind: 'mint', toWalletId, amount, memo, reference, balanceAfter: wallet.balance });
  }

  burn(fromWalletId: string, amount: number, memo?: string, reference?: string): RezTransaction {
    const wallet = this.wallets.get(fromWalletId);
    if (!wallet) throw new Error(`Wallet ${fromWalletId} not found`);
    if (amount <= 0) throw new Error('Amount must be positive');
    if (wallet.balance < amount) throw new Error(`Insufficient balance: ${wallet.balance} < ${amount}`);
    wallet.balance -= amount;
    wallet.lifetimeSpent += amount;
    wallet.lastActivityAt = new Date().toISOString();
    wallet.updatedAt = wallet.lastActivityAt;
    this.totalBurned += amount;
    return this.recordTx({ kind: 'burn', fromWalletId, amount, memo, reference, balanceAfter: wallet.balance });
  }

  // ─── Transfer ────────────────────────────────────────────────

  transfer(fromWalletId: string, toWalletId: string, amount: number, memo?: string): RezTransaction {
    if (fromWalletId === toWalletId) throw new Error('Cannot transfer to self');
    const from = this.wallets.get(fromWalletId);
    const to = this.wallets.get(toWalletId);
    if (!from) throw new Error(`Wallet ${fromWalletId} not found`);
    if (!to) throw new Error(`Wallet ${toWalletId} not found`);
    if (amount <= 0) throw new Error('Amount must be positive');
    if (from.balance < amount) throw new Error(`Insufficient balance: ${from.balance} < ${amount}`);

    from.balance -= amount;
    from.lifetimeSpent += amount;
    from.lastActivityAt = new Date().toISOString();
    from.updatedAt = from.lastActivityAt;

    to.balance += amount;
    to.lifetimeEarned += amount;
    to.lastActivityAt = new Date().toISOString();
    to.updatedAt = to.lastActivityAt;

    // Two transactions: debit from sender, credit to recipient
    this.recordTx({ kind: 'transfer', fromWalletId, amount: -amount, memo, balanceAfter: from.balance });
    return this.recordTx({ kind: 'transfer', toWalletId, amount, memo, balanceAfter: to.balance });
  }

  // ─── Read history ────────────────────────────────────────────

  getTransactions(walletId?: string, kind?: RezTxKind, limit: number = 50): RezTransaction[] {
    let results = this.transactions;
    if (walletId) results = results.filter((t) => t.fromWalletId === walletId || t.toWalletId === walletId);
    if (kind) results = results.filter((t) => t.kind === kind);
    return results.slice(-limit).reverse(); // newest first
  }

  // ─── Supply stats ────────────────────────────────────────────

  getTotalSupply(): number {
    let total = 0;
    for (const w of this.wallets.values()) total += w.balance;
    return total;
  }

  getSupplyStats(): SupplyStats {
    const all = Array.from(this.wallets.values());
    const total = this.getTotalSupply();
    const topHolders = [...all]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10)
      .map((w) => ({ ownerId: w.ownerId, displayName: w.displayName, balance: w.balance }));

    return {
      totalSupply: total,
      totalWallets: this.wallets.size,
      totalTransactions: this.transactions.length,
      totalBurned: this.totalBurned,
      totalMinted: this.totalMinted,
      averageBalance: this.wallets.size > 0 ? Math.round(total / this.wallets.size) : 0,
      topHolders,
      annualDecayRate: this.ANNUAL_DECAY_RATE,
      generatedAt: new Date().toISOString()
    };
  }

  reset(): void {
    this.wallets.clear();
    this.transactions = [];
    this.totalBurned = 0;
    this.totalMinted = 0;
  }
}

const rezCoinService = new RezCoinService();
export default rezCoinService;