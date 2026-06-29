/**
 * Wallet Service
 *
 * Manages three types of wallets:
 * - Corporate Wallet
 * - User Wallet
 * - Agent Wallet
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Wallet,
  WalletType,
  WalletStatus,
  SpendingLimits,
} from './types';

// ============================================
// Default Limits by Wallet Type
// ============================================

const DEFAULT_LIMITS: Record<WalletType, SpendingLimits> = {
  corporate: {
    dailyMax: 10000000,           // ₹1 crore/day
    perTransactionMax: 5000000,   // ₹50 lakh/transaction
    monthlyMax: 100000000,        // ₹10 crore/month
    requiresApprovalAbove: 1000000, // ₹10 lakh
  },
  user: {
    dailyMax: 50000,              // ₹50k/day
    perTransactionMax: 25000,    // ₹25k/transaction
    monthlyMax: 500000,           // ₹5 lakh/month
    requiresApprovalAbove: 100000, // ₹1 lakh
  },
  agent: {
    dailyMax: 100000,             // ₹1 lakh/day
    perTransactionMax: 25000,    // ₹25k/transaction
    monthlyMax: 500000,           // ₹5 lakh/month
    requiresApprovalAbove: 50000,  // ₹50k
  },
};

// ============================================
// In-Memory Store
// ============================================

const wallets = new Map<string, Wallet>();
const walletsByOwner = new Map<string, Set<string>>();

function getOrCreateSet(key: string): Set<string> {
  if (!walletsByOwner.has(key)) {
    walletsByOwner.set(key, new Set());
  }
  return walletsByOwner.get(key)!;
}

// ============================================
// Wallet Service
// ============================================

export class WalletService {
  /**
   * Create a corporate wallet for a company
   */
  createCorporateWallet(companyId: string, currency: string = 'INR'): Wallet {
    const id = `wallet_corp_${uuidv4().slice(0, 8)}`;
    const wallet: Wallet = {
      id,
      type: 'corporate',
      ownerId: companyId,
      ownerType: 'company',
      balance: 0,
      currency,
      status: 'active',
      spendingLimits: { ...DEFAULT_LIMITS.corporate },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    wallets.set(id, wallet);
    getOrCreateSet(`company:${companyId}`).add(id);

    return wallet;
  }

  /**
   * Create a user wallet (employee or customer)
   */
  createUserWallet(userId: string, currency: string = 'INR'): Wallet {
    const id = `wallet_user_${uuidv4().slice(0, 8)}`;
    const wallet: Wallet = {
      id,
      type: 'user',
      ownerId: userId,
      ownerType: 'user',
      balance: 0,
      currency,
      status: 'active',
      spendingLimits: { ...DEFAULT_LIMITS.user },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    wallets.set(id, wallet);
    getOrCreateSet(`user:${userId}`).add(id);

    return wallet;
  }

  /**
   * Create an agent wallet (AI worker)
   */
  createAgentWallet(agentId: string, currency: string = 'INR', customLimits?: Partial<SpendingLimits>): Wallet {
    const id = `wallet_agent_${uuidv4().slice(0, 8)}`;
    const wallet: Wallet = {
      id,
      type: 'agent',
      ownerId: agentId,
      ownerType: 'agent',
      balance: 0,
      currency,
      status: 'active',
      spendingLimits: { ...DEFAULT_LIMITS.agent, ...customLimits },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    wallets.set(id, wallet);
    getOrCreateSet(`agent:${agentId}`).add(id);

    return wallet;
  }

  /**
   * Get wallet by ID
   */
  get(walletId: string): Wallet | null {
    return wallets.get(walletId) || null;
  }

  /**
   * Get wallets for an owner
   */
  getByOwner(ownerId: string, ownerType: 'company' | 'user' | 'agent'): Wallet[] {
    const ids = walletsByOwner.get(`${ownerType}:${ownerId}`);
    if (!ids) return [];
    return Array.from(ids).map(id => wallets.get(id)!).filter(Boolean);
  }

  /**
   * Credit (add money)
   */
  credit(walletId: string, amount: number, description: string): Wallet | null {
    const wallet = wallets.get(walletId);
    if (!wallet || wallet.status !== 'active') return null;

    wallet.balance += amount;
    wallet.updatedAt = new Date().toISOString();
    return wallet;
  }

  /**
   * Debit (spend money)
   */
  debit(walletId: string, amount: number, description: string): { success: boolean; wallet: Wallet | null; reason?: string } {
    const wallet = wallets.get(walletId);
    if (!wallet || wallet.status !== 'active') {
      return { success: false, wallet: null, reason: 'Wallet not found or inactive' };
    }

    if (wallet.balance < amount) {
      return { success: false, wallet, reason: 'Insufficient balance' };
    }

    if (amount > wallet.spendingLimits.perTransactionMax) {
      return { success: false, wallet, reason: 'Exceeds per-transaction limit' };
    }

    wallet.balance -= amount;
    wallet.updatedAt = new Date().toISOString();
    return { success: true, wallet };
  }

  /**
   * Freeze wallet
   */
  freeze(walletId: string): boolean {
    const wallet = wallets.get(walletId);
    if (!wallet) return false;
    wallet.status = 'frozen';
    wallet.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Unfreeze wallet
   */
  unfreeze(walletId: string): boolean {
    const wallet = wallets.get(walletId);
    if (!wallet) return false;
    wallet.status = 'active';
    wallet.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Update spending limits
   */
  updateLimits(walletId: string, limits: Partial<SpendingLimits>): Wallet | null {
    const wallet = wallets.get(walletId);
    if (!wallet) return null;
    wallet.spendingLimits = { ...wallet.spendingLimits, ...limits };
    wallet.updatedAt = new Date().toISOString();
    return wallet;
  }

  /**
   * Get total balance for owner
   */
  getTotalBalance(ownerId: string, ownerType: 'company' | 'user' | 'agent'): number {
    return this.getByOwner(ownerId, ownerType)
      .reduce((sum, w) => sum + w.balance, 0);
  }

  /**
   * List all wallets
   */
  listAll(): Wallet[] {
    return Array.from(wallets.values());
  }
}

export const walletService = new WalletService();