/**
 * EconomyOS - Main Module
 *
 * Powers all monetary flows:
 * - Wallets (Corporate, User, Agent)
 * - Transactions with authority limits
 * - Trust/Reputation
 * - Treasury Management
 * - Rewards/Loyalty
 */

export * from './types';
export * from './wallets';
export * from './transactions';
export * from './trust';

import { walletService } from './wallets';
import { transactionService } from './transactions';
import { trustOS } from './trust';

/**
 * Setup Company Economy
 * Creates corporate + department wallets + agent wallets for a new company
 */
export async function setupCompanyEconomy(companyId: string, departments: string[]): Promise<{
  corporateWalletId: string;
  departmentWallets: Record<string, string>;
}> {
  // 1. Create corporate wallet
  const corporate = walletService.createCorporateWallet(companyId);

  // 2. Create department wallets
  const departmentWallets: Record<string, string> = {};
  for (const dept of departments) {
    const wallet = walletService.createUserWallet(`${companyId}:${dept}`);
    departmentWallets[dept] = wallet.id;
  }

  // 3. Initialize reputation
  trustOS.initialize(companyId, 'company');

  return {
    corporateWalletId: corporate.id,
    departmentWallets,
  };
}

/**
 * Setup AI Worker Economy
 * Creates an agent wallet with appropriate authority
 */
export async function setupAgentEconomy(agentId: string, companyId: string, approvedBy: string): Promise<string> {
  const wallet = walletService.createAgentWallet(agentId);

  transactionService.registerAgentAuthority({
    agentId,
    departmentId: 'unknown',
    walletId: wallet.id,
    approvedBy,
    approvalDate: new Date().toISOString(),
    limits: {
      canApproveTransactions: true,
      maxAutoApproveAmount: 25000,        // ₹25k auto-approve
      canHireServices: false,
      canMakePurchases: true,
      maxPurchaseAmount: 50000,
      canIssueRefunds: false,
      maxRefundAmount: 0,
    },
    policies: ['standard_agent_authority'],
  });

  trustOS.initialize(agentId, 'agent');

  return wallet.id;
}