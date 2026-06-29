/**
 * Unified Wallet Manager
 *
 * Connects all wallet types to CompanyOS EconomyOS:
 * - REZ Wallet (user/corporate)
 * - Agent Wallet (AI workers)
 * - HOJAI Wallet (HOJAI agents)
 * - Cross-Wallet (multi-provider)
 */

import { REZWalletAdapter } from './rez-wallet-adapter';
import { createAgentWalletAdapter } from './agent-wallet-adapter';
import { createHOJAIWalletAdapter } from './hojai-wallet-adapter';
import { createCrossWalletAdapter } from './cross-wallet-adapter';

/**
 * Unified Wallet Configuration
 */
export interface UnifiedWalletConfig {
  rezWalletUrl?: string;
  agentWalletUrl?: string;
  hojaiWalletUrl?: string;
  crossWalletUrl?: string;
}

/**
 * CompanyOS Wallet Types
 */
export type CompanyOSWalletType = 'corporate' | 'user' | 'agent';

/**
 * Unified Wallet Manager
 */
export class UnifiedWalletManager {
  private rezAdapter: REZWalletAdapter;
  private agentAdapter: any;
  private hojaiAdapter: any;
  private crossAdapter: any;

  constructor(config: UnifiedWalletConfig = {}) {
    this.rezAdapter = new REZWalletAdapter({
      baseUrl: config.rezWalletUrl || 'http://localhost:4004',
    });
  }

  /**
   * Get wallet adapter for a type
   */
  getAdapter(type: CompanyOSWalletType) {
    switch (type) {
      case 'corporate':
      case 'user':
        return this.rezAdapter;
      case 'agent':
        return this.agentAdapter || this.rezAdapter;
      default:
        return this.rezAdapter;
    }
  }

  /**
   * Create corporate wallet
   */
  async createCorporateWallet(companyId: string): Promise<{ walletId: string; type: 'corporate' }> {
    // In production: call REZ Wallet API
    return {
      walletId: `corp_${companyId}`,
      type: 'corporate',
    };
  }

  /**
   * Create user wallet (employee/customer)
   */
  async createUserWallet(userId: string): Promise<{ walletId: string; type: 'user' }> {
    return {
      walletId: `user_${userId}`,
      type: 'user',
    };
  }

  /**
   * Create agent wallet (AI worker)
   */
  async createAgentWallet(agentId: string): Promise<{ walletId: string; type: 'agent' }> {
    return {
      walletId: `agent_${agentId}`,
      type: 'agent',
    };
  }

  /**
   * Get balance for any wallet
   */
  async getBalance(walletId: string): Promise<{ available: number; total: number }> {
    try {
      const balance = await this.rezAdapter.getBalance(walletId);
      return {
        available: balance.available,
        total: balance.total,
      };
    } catch {
      return { available: 0, total: 0 };
    }
  }

  /**
   * Transfer between wallets
   */
  async transfer(fromWalletId: string, toWalletId: string, amount: number): Promise<boolean> {
    // Debit source
    const debitResult = await this.rezAdapter.debit(fromWalletId, amount, 'Transfer');
    if (!debitResult.success) return false;

    // Credit destination
    const creditResult = await this.rezAdapter.credit(toWalletId, amount, 'Transfer received');
    return creditResult.success;
  }

  /**
   * Get aggregated balance across wallet types
   */
  async getAggregatedBalance(ownerId: string, types: CompanyOSWalletType[]): Promise<number> {
    let total = 0;

    for (const type of types) {
      const walletId = this.getWalletId(ownerId, type);
      const balance = await this.getBalance(walletId);
      total += balance.total;
    }

    return total;
  }

  /**
   * Generate wallet ID from owner ID
   */
  private getWalletId(ownerId: string, type: CompanyOSWalletType): string {
    return `${type}_${ownerId}`;
  }
}

/**
 * Singleton instance
 */
export const unifiedWalletManager = new UnifiedWalletManager();
