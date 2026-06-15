import { karmaService } from './karmaService';
import { creditService } from './creditService';
import { accountService } from './accountService';
import { transactionService } from './transactionService';
import { escrowService } from './escrowService';
import { AgentEconomicProfile } from '../types';
import { NotFoundError } from '../utils/errors';

/**
 * Aggregates karma, credit, accounts, transactions, and trust
 * into a single agent economic profile view.
 */
export const agentProfileService = {
  get(agentId: string): AgentEconomicProfile {
    // Initialize all components if not present
    const karma = karmaService.get(agentId);
    const credit = creditService.get(agentId);
    const accounts = accountService.getByOwner(agentId);

    if (accounts.length === 0) {
      // Auto-create primary account for new agents
      accountService.getOrCreatePrimary(agentId, 'agent');
    }

    const allAccounts = accountService.getByOwner(agentId);
    const totalVolume = allAccounts.reduce((sum, a) => sum + a.lifetimeCredits, 0);
    const netFlow = allAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Determine status based on activity
    let status: AgentEconomicProfile['status'] = 'newcomer';
    if (karma.totalKarma >= 1000 || credit.score >= 700) status = 'veteran';
    else if (karma.totalKarma >= 50 || credit.score >= 500) status = 'active';

    // Trust score defaults to credit score proxy until trust-scorer provides real value
    const trustScore = credit.score;

    return {
      agentId,
      karma,
      credit,
      accounts: allAccounts,
      trustScore,
      totalVolume,
      netFlow,
      lastActivity: new Date().toISOString(),
      joinedAt: karma.createdAt,
      status,
    };
  },

  /**
   * Get a financial summary for an agent.
   */
  summary(agentId: string): {
    agentId: string;
    karma: { total: number; tier: string };
    credit: { score: number; tier: string };
    accounts: { total: number; balance: number; held: number };
    transactions: { total: number; volume: number };
    escrows: { held: number; released: number; disputed: number };
    status: string;
  } {
    const profile = this.get(agentId);
    const allTx = transactionService.list({ limit: 1000 }).filter(
      (t) =>
        t.fromAccountId &&
        profile.accounts.some((a) => a.id === t.fromAccountId) &&
        t.status === 'completed'
    );
    const escrows = escrowService.list().filter(
      (e) => profile.accounts.some((a) => a.id === e.payerAccountId || a.id === e.payeeAccountId)
    );

    return {
      agentId,
      karma: { total: profile.karma.totalKarma, tier: profile.karma.tier },
      credit: { score: profile.credit.score, tier: profile.credit.tier },
      accounts: {
        total: profile.accounts.length,
        balance: profile.accounts.reduce((s, a) => s + a.balance, 0),
        held: profile.accounts.reduce((s, a) => s + a.heldBalance, 0),
      },
      transactions: {
        total: allTx.length,
        volume: allTx.reduce((s, t) => s + t.amount, 0),
      },
      escrows: {
        held: escrows.filter((e) => e.status === 'held').length,
        released: escrows.filter((e) => e.status === 'released').length,
        disputed: escrows.filter((e) => e.status === 'disputed').length,
      },
      status: profile.status,
    };
  },
};
