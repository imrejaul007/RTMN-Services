/**
 * EconomyOS Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  walletService,
  transactionService,
  trustOS,
  setupCompanyEconomy,
  setupAgentEconomy,
} from '../index';

describe('EconomyOS', () => {
  beforeEach(() => {
    // Reset state between tests
    walletService.listAll().forEach(w => {
      // In real test, would reset properly
    });
  });

  describe('Corporate Wallets', () => {
    it('should create corporate wallet', () => {
      const wallet = walletService.createCorporateWallet('company_001');

      expect(wallet.id).toBeDefined();
      expect(wallet.type).toBe('corporate');
      expect(wallet.ownerType).toBe('company');
      expect(wallet.balance).toBe(0);
    });

    it('should credit and debit correctly', () => {
      const wallet = walletService.createCorporateWallet('company_002');

      walletService.credit(wallet.id, 100000, 'Initial funding');
      expect(walletService.get(wallet.id)?.balance).toBe(100000);

      const debitResult = walletService.debit(wallet.id, 25000, 'Office rent');
      expect(debitResult.success).toBe(true);
      expect(walletService.get(wallet.id)?.balance).toBe(75000);
    });

    it('should reject debit exceeding balance', () => {
      const wallet = walletService.createCorporateWallet('company_003');
      walletService.credit(wallet.id, 10000, 'Initial');

      const result = walletService.debit(wallet.id, 50000, 'Big purchase');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });

    it('should reject debit exceeding per-transaction limit', () => {
      const wallet = walletService.createCorporateWallet('company_004');
      walletService.credit(wallet.id, 10000000, 'Huge funding');

      const result = walletService.debit(wallet.id, 6000000, 'Massive purchase');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('limit');
    });
  });

  describe('User Wallets', () => {
    it('should create user wallet with lower limits', () => {
      const wallet = walletService.createUserWallet('user_001');

      expect(wallet.type).toBe('user');
      expect(wallet.spendingLimits.perTransactionMax).toBe(25000); // ₹25k
      expect(wallet.spendingLimits.dailyMax).toBe(50000); // ₹50k
    });
  });

  describe('Agent Wallets', () => {
    it('should create agent wallet with strict limits', () => {
      const wallet = walletService.createAgentWallet('ai-cfo');

      expect(wallet.type).toBe('agent');
      expect(wallet.spendingLimits.perTransactionMax).toBe(25000);
    });

    it('should register agent authority', () => {
      const wallet = walletService.createAgentWallet('ai-marketing');
      transactionService.registerAgentAuthority({
        agentId: 'ai-marketing',
        departmentId: 'marketing',
        walletId: wallet.id,
        approvedBy: 'human-ceo',
        approvalDate: new Date().toISOString(),
        limits: {
          canApproveTransactions: true,
          maxAutoApproveAmount: 10000,
          canHireServices: false,
          canMakePurchases: true,
          maxPurchaseAmount: 25000,
          canIssueRefunds: false,
          maxRefundAmount: 0,
        },
        policies: ['marketing_authority'],
      });

      const authority = transactionService.getAgentAuthority('ai-marketing');
      expect(authority).toBeDefined();
      expect(authority?.limits.maxAutoApproveAmount).toBe(10000);
    });
  });

  describe('Transactions', () => {
    it('should auto-approve small transactions', async () => {
      const wallet = walletService.createCorporateWallet('company_tx1');
      walletService.credit(wallet.id, 100000, 'Initial');

      const tx = await transactionService.execute({
        fromWalletId: wallet.id,
        type: 'purchase',
        amount: 5000,
        description: 'Office supplies',
        initiatorId: 'user_001',
        initiatorType: 'user',
      });

      expect(tx.status).toBe('completed');
    });

    it('should require approval for large user transactions', async () => {
      const wallet = walletService.createUserWallet('user_large');
      walletService.credit(wallet.id, 500000, 'Salary');

      const tx = await transactionService.execute({
        fromWalletId: wallet.id,
        type: 'purchase',
        amount: 150000, // Above ₹1 lakh limit
        description: 'Car purchase',
        initiatorId: 'user_large',
        initiatorType: 'user',
      });

      expect(tx.status).toBe('pending');
      expect(tx.requiresApproval).toBe(true);
    });

    it('should auto-approve within agent authority', async () => {
      const wallet = walletService.createAgentWallet('ai-agent-1');
      walletService.credit(wallet.id, 100000, 'Monthly budget');
      transactionService.registerAgentAuthority({
        agentId: 'ai-agent-1',
        departmentId: 'marketing',
        walletId: wallet.id,
        approvedBy: 'ceo',
        approvalDate: new Date().toISOString(),
        limits: {
          canApproveTransactions: true,
          maxAutoApproveAmount: 10000,
          canHireServices: false,
          canMakePurchases: true,
          maxPurchaseAmount: 50000,
          canIssueRefunds: false,
          maxRefundAmount: 0,
        },
        policies: [],
      });

      const tx = await transactionService.execute({
        fromWalletId: wallet.id,
        type: 'marketing',
        amount: 5000, // Within auto-approve
        description: 'Ad campaign',
        initiatorId: 'ai-agent-1',
        initiatorType: 'agent',
      });

      expect(tx.status).toBe('completed');
    });

    it('should approve pending transactions', async () => {
      const wallet = walletService.createUserWallet('user_approve');
      walletService.credit(wallet.id, 500000, 'Salary');

      const tx = await transactionService.execute({
        fromWalletId: wallet.id,
        type: 'purchase',
        amount: 150000,
        description: 'Big purchase',
        initiatorId: 'user_approve',
        initiatorType: 'user',
      });

      expect(tx.status).toBe('pending');

      const approved = transactionService.approve(tx.id, 'manager_001');
      expect(approved?.status).toBe('completed');
    });
  });

  describe('Trust & Reputation', () => {
    it('should initialize reputation at 50', () => {
      const score = trustOS.initialize('company_new', 'company');
      expect(score.score).toBe(50);
    });

    it('should increase reputation on positive events', () => {
      trustOS.initialize('company_pos', 'company');
      const updated = trustOS.recordEvent({
        entityId: 'company_pos',
        event: 'delivered_on_time',
        impact: 5,
      });
      expect(updated?.score).toBe(55);
    });

    it('should decrease reputation on negative events', () => {
      trustOS.initialize('company_neg', 'company');
      const updated = trustOS.recordEvent({
        entityId: 'company_neg',
        event: 'quality_issue',
        impact: -10,
      });
      expect(updated?.score).toBe(40);
    });

    it('should clamp score between 0-100', () => {
      trustOS.initialize('company_extreme', 'company');

      // Add lots of positive
      for (let i = 0; i < 20; i++) {
        trustOS.recordEvent({ entityId: 'company_extreme', event: 'great', impact: 10 });
      }
      expect(trustOS.get('company_extreme')?.score).toBe(100);

      // Add lots of negative
      for (let i = 0; i < 20; i++) {
        trustOS.recordEvent({ entityId: 'company_extreme', event: 'bad', impact: -10 });
      }
      expect(trustOS.get('company_extreme')?.score).toBe(0);
    });

    it('should assign trust levels', () => {
      expect(trustOS.getTrustLevel(95).level).toBe('Platinum');
      expect(trustOS.getTrustLevel(85).level).toBe('Gold');
      expect(trustOS.getTrustLevel(75).level).toBe('Silver');
      expect(trustOS.getTrustLevel(60).level).toBe('Bronze');
      expect(trustOS.getTrustLevel(30).level).toBe('New');
    });
  });

  describe('Company Economy Setup', () => {
    it('should setup complete company economy', async () => {
      const result = await setupCompanyEconomy('company_full', ['finance', 'marketing', 'sales']);

      expect(result.corporateWalletId).toBeDefined();
      expect(Object.keys(result.departmentWallets).length).toBe(3);
      expect(result.departmentWallets.finance).toBeDefined();
      expect(result.departmentWallets.marketing).toBeDefined();
      expect(result.departmentWallets.sales).toBeDefined();
    });
  });

  describe('Agent Economy Setup', () => {
    it('should setup agent with authority', async () => {
      const walletId = await setupAgentEconomy('ai-cfo', 'company_001', 'human-ceo');

      expect(walletId).toBeDefined();
      const wallet = walletService.get(walletId);
      expect(wallet?.type).toBe('agent');

      const authority = transactionService.getAgentAuthority('ai-cfo');
      expect(authority).toBeDefined();
    });
  });
});