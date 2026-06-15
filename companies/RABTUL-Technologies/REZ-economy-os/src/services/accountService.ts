import { v4 as uuidv4 } from 'uuid';
import { Account, AccountType } from '../types';
import { accountStore } from '../models/Account';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { eventBus, ECONOMY_TOPICS } from '../utils/eventBus';
import { logger } from '../utils/logger';

export const accountService = {
  /**
   * Create a new account.
   */
  create(input: {
    ownerId: string;
    ownerType?: AccountType;
    type?: AccountType;
    currency?: string;
    metadata?: Record<string, any>;
  }): Account {
    if (!input.ownerId) throw new ValidationError('ownerId is required');

    const now = new Date().toISOString();
    const account: Account = {
      id: `acct_${uuidv4()}`,
      ownerId: input.ownerId,
      ownerType: input.ownerType || 'agent',
      type: input.type || 'agent',
      currency: input.currency || 'USD',
      balance: 0,
      availableBalance: 0,
      heldBalance: 0,
      lifetimeCredits: 0,
      lifetimeDebits: 0,
      transactionCount: 0,
      status: 'active',
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    accountStore.upsert(account);
    logger.info(`Account created: ${account.id} for ${account.ownerId}`);
    return account;
  },

  /**
   * Get an account by ID.
   */
  get(accountId: string): Account {
    const account = accountStore.get(accountId);
    if (!account) throw new NotFoundError(`Account ${accountId}`);
    return account;
  },

  /**
   * Get all accounts owned by an entity.
   */
  getByOwner(ownerId: string): Account[] {
    return accountStore.getByOwner(ownerId);
  },

  /**
   * Get the primary active account for an owner of given type.
   * Auto-creates if not exists.
   */
  getOrCreatePrimary(ownerId: string, type: AccountType = 'agent', currency: string = 'USD'): Account {
    const existing = accountStore.getPrimary(ownerId, type);
    if (existing) return existing;
    return this.create({ ownerId, ownerType: type, type, currency });
  },

  /**
   * Update balance (used by ledger service).
   * Should not be called directly - use transaction service.
   */
  updateBalance(accountId: string, delta: number, heldDelta: number = 0): Account {
    const account = this.get(accountId);
    const newBalance = account.balance + delta;
    const newHeld = account.heldBalance + heldDelta;

    if (newBalance < 0) throw new ValidationError(`Account ${accountId} would have negative balance`);
    if (newHeld < 0) throw new ValidationError(`Account ${accountId} would have negative held balance`);

    account.balance = newBalance;
    account.heldBalance = newHeld;
    account.availableBalance = account.balance - account.heldBalance;
    if (delta > 0) account.lifetimeCredits += delta;
    if (delta < 0) account.lifetimeDebits += Math.abs(delta);
    account.transactionCount++;
    account.updatedAt = new Date().toISOString();
    accountStore.upsert(account);
    return account;
  },

  /**
   * Freeze an account.
   */
  async freeze(accountId: string, reason?: string): Promise<Account> {
    const account = this.get(accountId);
    account.status = 'frozen';
    account.metadata.freezeReason = reason;
    account.updatedAt = new Date().toISOString();
    accountStore.upsert(account);
    await eventBus.publish(ECONOMY_TOPICS.ACCOUNT_FROZEN, { accountId, ownerId: account.ownerId, reason });
    logger.warn(`Account frozen: ${accountId} (${reason || 'no reason given'})`);
    return account;
  },

  /**
   * Activate a previously frozen account.
   */
  async activate(accountId: string): Promise<Account> {
    const account = this.get(accountId);
    account.status = 'active';
    delete account.metadata.freezeReason;
    account.updatedAt = new Date().toISOString();
    accountStore.upsert(account);
    await eventBus.publish(ECONOMY_TOPICS.ACCOUNT_ACTIVATED, { accountId, ownerId: account.ownerId });
    logger.info(`Account activated: ${accountId}`);
    return account;
  },

  /**
   * List accounts with optional filtering.
   */
  list(filter?: { type?: AccountType; status?: string }): Account[] {
    let list = accountStore.list();
    if (filter?.type) list = list.filter((a) => a.type === filter.type);
    if (filter?.status) list = list.filter((a) => a.status === filter.status);
    return list;
  },

  /**
   * Statistics.
   */
  stats(): { total: number; byType: Record<AccountType, number>; totalBalance: number } {
    const all = accountStore.list();
    const byType: Record<AccountType, number> = {
      agent: 0,
      user: 0,
      merchant: 0,
      platform: 0,
      escrow: 0,
      fee: 0,
    };
    let totalBalance = 0;
    for (const a of all) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      totalBalance += a.balance;
    }
    return { total: all.length, byType, totalBalance };
  },
};
