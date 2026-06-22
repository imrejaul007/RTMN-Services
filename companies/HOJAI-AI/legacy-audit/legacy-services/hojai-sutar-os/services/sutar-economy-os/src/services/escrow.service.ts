/**
 * SUTAR Economy OS - Escrow Service
 * Layer 10: Hold funds until conditions are met
 */

import { v4 as uuidv4 } from 'uuid';
import { balanceService } from './balance.service.js';

// ============================================
// Types
// ============================================

export type EscrowStatus = 'pending' | 'funded' | 'released' | 'cancelled' | 'expired' | 'disputed';
export type ReleaseCondition = {
  type: 'time' | 'approval' | 'milestone' | 'automatic';
  value?: string | number;
  requiredApprovals?: string[];
  description: string;
};

export interface Escrow {
  escrowId: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  status: EscrowStatus;
  title: string;
  description?: string;
  conditions: ReleaseCondition[];
  releaseCondition: ReleaseCondition;
  milestones?: Array<{
    id: string;
    title: string;
    description: string;
    amount: number;
    completed: boolean;
    completedAt?: Date;
    approvedBy?: string[];
  }>;
  approvedBy: string[];
  releasedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelReason?: string;
  expiresAt?: Date;
  disputeId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscrowActivity {
  activityId: string;
  escrowId: string;
  action: 'created' | 'funded' | 'milestone_completed' | 'approved' | 'released' | 'cancelled' | 'disputed' | 'expired';
  actorId: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// In-Memory Storage
// ============================================

interface EscrowStore {
  [escrowId: string]: Escrow;
}

interface EscrowActivityStore {
  [activityId: string]: EscrowActivity;
}

const escrowStore: EscrowStore = {};
const escrowActivityStore: EscrowActivityStore = {};

// ============================================
// Escrow Service Class
// ============================================

export class EscrowService {
  /**
   * Create escrow
   */
  async createEscrow(request: {
    senderId: string;
    recipientId: string;
    amount: number;
    currency?: string;
    title: string;
    description?: string;
    releaseCondition: ReleaseCondition;
    milestones?: Escrow['milestones'];
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<Escrow> {
    const {
      senderId,
      recipientId,
      amount,
      currency = 'USD',
      title,
      description,
      releaseCondition,
      milestones,
      expiresAt,
      metadata
    } = request;

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (senderId === recipientId) {
      throw new Error('Sender and recipient cannot be the same');
    }

    const escrow: Escrow = {
      escrowId: uuidv4(),
      senderId,
      recipientId,
      amount,
      currency,
      status: 'pending',
      title,
      description,
      conditions: [releaseCondition],
      releaseCondition,
      milestones,
      approvedBy: [],
      expiresAt,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    escrowStore[escrow.escrowId] = escrow;

    await this.logActivity(escrow.escrowId, 'created', senderId, { amount, currency });

    return escrow;
  }

  /**
   * Fund escrow
   */
  async fundEscrow(escrowId: string, funderId: string): Promise<Escrow> {
    const escrow = escrowStore[escrowId];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'pending') {
      throw new Error('Escrow is not in pending status');
    }

    if (escrow.senderId !== funderId) {
      throw new Error('Only the sender can fund the escrow');
    }

    // Check balance
    const hasSufficient = await balanceService.hasSufficientBalance(funderId, escrow.amount, escrow.currency);
    if (!hasSufficient) {
      throw new Error('Insufficient balance');
    }

    // Reserve funds from sender
    await balanceService.reserveFunds(funderId, escrow.amount, escrow.currency);

    escrow.status = 'funded';
    escrow.updatedAt = new Date();
    escrowStore[escrow.escrowId] = escrow;

    await this.logActivity(escrow.escrowId, 'funded', funderId);

    return escrow;
  }

  /**
   * Release escrow
   */
  async releaseEscrow(escrowId: string, releaserId: string): Promise<Escrow> {
    const escrow = escrowStore[escrowId];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'funded') {
      throw new Error('Escrow is not in funded status');
    }

    // Check if conditions are met
    const conditionsMet = await this.checkReleaseConditions(escrow);
    if (!conditionsMet) {
      throw new Error('Release conditions not met');
    }

    // Release funds to recipient
    await balanceService.releaseFunds(escrow.recipientId, escrow.amount, escrow.currency, true);
    await balanceService.releaseFunds(escrow.senderId, 0, escrow.currency, false);

    escrow.status = 'released';
    escrow.releasedAt = new Date();
    escrow.updatedAt = new Date();
    escrowStore[escrow.escrowId] = escrow;

    await this.logActivity(escrow.escrowId, 'released', releaserId);

    return escrow;
  }

  /**
   * Release partial escrow (for milestones)
   */
  async releasePartialEscrow(escrowId: string, milestoneId: string, releaserId: string): Promise<Escrow> {
    const escrow = escrowStore[escrowId];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (!escrow.milestones) {
      throw new Error('No milestones defined for this escrow');
    }

    const milestone = escrow.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.completed) {
      throw new Error('Milestone already completed');
    }

    // Mark milestone as complete
    milestone.completed = true;
    milestone.completedAt = new Date();
    milestone.approvedBy = [releaserId];

    // Release milestone amount
    await balanceService.addFunds(escrow.recipientId, 'user', milestone.amount, escrow.currency);

    escrow.updatedAt = new Date();
    escrowStore[escrow.escrowId] = escrow;

    await this.logActivity(escrow.escrowId, 'milestone_completed', releaserId, { milestoneId, amount: milestone.amount });

    // Check if all milestones are complete
    const allComplete = escrow.milestones.every(m => m.completed);
    if (allComplete) {
      escrow.status = 'released';
      escrow.releasedAt = new Date();
      escrowStore[escrow.escrowId] = escrow;
      await this.logActivity(escrow.escrowId, 'released', releaserId, { reason: 'All milestones completed' });
    }

    return escrow;
  }

  /**
   * Approve escrow release
   */
  async approveRelease(escrowId: string, approverId: string): Promise<Escrow> {
    const escrow = escrowStore[escrowId];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'funded') {
      throw new Error('Escrow is not in funded status');
    }

    if (!escrow.releaseCondition.requiredApprovals) {
      throw new Error('No approval required for this escrow');
    }

    if (escrow.approvedBy.includes(approverId)) {
      throw new Error('Already approved');
    }

    escrow.approvedBy.push(approverId);
    escrow.updatedAt = new Date();
    escrowStore[escrow.escrowId] = escrow;

    await this.logActivity(escrow.escrowId, 'approved', approverId);

    // Check if all required approvals are received
    const required = escrow.releaseCondition.requiredApprovals;
    if (required.every(r => escrow.approvedBy.includes(r))) {
      if (escrow.releaseCondition.type === 'approval') {
        return this.releaseEscrow(escrowId, approverId);
      }
    }

    return escrow;
  }

  /**
   * Cancel escrow
   */
  async cancelEscrow(escrowId: string, cancellerId: string, reason: string): Promise<Escrow> {
    const escrow = escrowStore[escrowId];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status === 'released' || escrow.status === 'cancelled') {
      throw new Error('Escrow cannot be cancelled');
    }

    if (escrow.senderId !== cancellerId && escrow.recipientId !== cancellerId) {
      throw new Error('Only sender or recipient can cancel escrow');
    }

    // Release reserved funds if funded
    if (escrow.status === 'funded') {
      await balanceService.releaseFunds(escrow.senderId, escrow.amount, escrow.currency, true);
    }

    escrow.status = 'cancelled';
    escrow.cancelledAt = new Date();
    escrow.cancelledBy = cancellerId;
    escrow.cancelReason = reason;
    escrow.updatedAt = new Date();
    escrowStore[escrow.escrowId] = escrow;

    await this.logActivity(escrow.escrowId, 'cancelled', cancellerId, { reason });

    return escrow;
  }

  /**
   * Open dispute
   */
  async openDispute(escrowId: string, disputerId: string, reason: string): Promise<Escrow> {
    const escrow = escrowStore[escrowId];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'funded') {
      throw new Error('Can only dispute funded escrows');
    }

    if (escrow.senderId !== disputerId && escrow.recipientId !== disputerId) {
      throw new Error('Only sender or recipient can open a dispute');
    }

    escrow.status = 'disputed';
    escrow.disputeId = uuidv4();
    escrow.metadata = {
      ...escrow.metadata,
      disputeReason: reason,
      disputedBy: disputerId,
      disputedAt: new Date().toISOString()
    };
    escrow.updatedAt = new Date();
    escrowStore[escrow.escrowId] = escrow;

    await this.logActivity(escrow.escrowId, 'disputed', disputerId, { reason });

    return escrow;
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(escrowId: string, resolverId: string, resolution: 'release' | 'refund' | 'split', splitPercent?: number): Promise<Escrow> {
    const escrow = escrowStore[escrowId];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'disputed') {
      throw new Error('Escrow is not in disputed status');
    }

    const amountToRecipient = resolution === 'release' ? escrow.amount
      : resolution === 'refund' ? 0
      : Math.round(escrow.amount * (splitPercent || 50) / 100);
    const amountToSender = resolution === 'refund' ? escrow.amount
      : resolution === 'release' ? 0
      : escrow.amount - amountToRecipient;

    // Release funds according to resolution
    if (amountToRecipient > 0) {
      await balanceService.addFunds(escrow.recipientId, 'user', amountToRecipient, escrow.currency);
    }
    if (amountToSender > 0) {
      await balanceService.addFunds(escrow.senderId, 'user', amountToSender, escrow.currency);
    }

    escrow.status = 'released';
    escrow.releasedAt = new Date();
    escrow.metadata = {
      ...escrow.metadata,
      disputeResolution: resolution,
      resolvedBy: resolverId,
      resolvedAt: new Date().toISOString(),
      splitPercent
    };
    escrow.updatedAt = new Date();
    escrowStore[escrow.escrowId] = escrow;

    await this.logActivity(escrow.escrowId, 'released', resolverId, { reason: 'Dispute resolved', resolution });

    return escrow;
  }

  /**
   * Get escrow by ID
   */
  async getEscrow(escrowId: string): Promise<Escrow | null> {
    return escrowStore[escrowId] || null;
  }

  /**
   * Get escrows for entity (as sender or recipient)
   */
  async getEscrows(
    entityId: string,
    options: {
      page?: number;
      limit?: number;
      role?: 'sender' | 'recipient' | 'both';
      status?: EscrowStatus;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    escrows: Escrow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, role = 'both', status, startDate, endDate } = options;

    let escrows = Object.values(escrowStore)
      .filter(e => {
        if (role === 'sender') return e.senderId === entityId;
        if (role === 'recipient') return e.recipientId === entityId;
        return e.senderId === entityId || e.recipientId === entityId;
      })
      .filter(e => !status || e.status === status)
      .filter(e => !startDate || e.createdAt >= startDate)
      .filter(e => !endDate || e.createdAt <= endDate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = escrows.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    escrows = escrows.slice(startIndex, startIndex + limit);

    return {
      escrows,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Get escrow activity
   */
  async getEscrowActivity(escrowId: string): Promise<EscrowActivity[]> {
    return Object.values(escrowActivityStore)
      .filter(a => a.escrowId === escrowId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Check if release conditions are met
   */
  private async checkReleaseConditions(escrow: Escrow): Promise<boolean> {
    const condition = escrow.releaseCondition;

    switch (condition.type) {
      case 'automatic':
        return true;

      case 'time':
        if (!condition.value) return true;
        const releaseTime = new Date(condition.value as string);
        return new Date() >= releaseTime;

      case 'approval':
        if (!condition.requiredApprovals) return true;
        return condition.requiredApprovals.every(r => escrow.approvedBy.includes(r));

      case 'milestone':
        if (!escrow.milestones) return false;
        return escrow.milestones.every(m => m.completed);

      default:
        return false;
    }
  }

  /**
   * Log activity
   */
  private async logActivity(escrowId: string, action: EscrowActivity['action'], actorId: string, details?: Record<string, unknown>): Promise<void> {
    const activity: EscrowActivity = {
      activityId: uuidv4(),
      escrowId,
      action,
      actorId,
      details,
      createdAt: new Date()
    };

    escrowActivityStore[activity.activityId] = activity;
  }

  /**
   * Mark expired escrows
   */
  async markExpiredEscrows(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const escrow of Object.values(escrowStore)) {
      if (
        escrow.status === 'funded' &&
        escrow.expiresAt &&
        escrow.expiresAt < now
      ) {
        escrow.status = 'expired';
        escrow.updatedAt = new Date();
        escrowStore[escrow.escrowId] = escrow;

        // Refund to sender
        await balanceService.releaseFunds(escrow.senderId, escrow.amount, escrow.currency, true);

        await this.logActivity(escrow.escrowId, 'expired', 'system');
        count++;
      }
    }

    return count;
  }

  /**
   * Get escrow statistics
   */
  async getEscrowStatistics(entityId: string): Promise<{
    totalEscrows: number;
    activeEscrows: number;
    totalHeldAmount: number;
    completedAmount: number;
    byStatus: Record<EscrowStatus, { count: number; amount: number }>;
  }> {
    const escrows = Object.values(escrowStore)
      .filter(e => e.senderId === entityId || e.recipientId === entityId);

    const stats = {
      totalEscrows: escrows.length,
      activeEscrows: escrows.filter(e => e.status === 'funded').length,
      totalHeldAmount: escrows.filter(e => e.status === 'funded').reduce((sum, e) => sum + e.amount, 0),
      completedAmount: escrows.filter(e => e.status === 'released').reduce((sum, e) => sum + e.amount, 0),
      byStatus: {} as Record<EscrowStatus, { count: number; amount: number }>
    };

    const statuses: EscrowStatus[] = ['pending', 'funded', 'released', 'cancelled', 'expired', 'disputed'];
    for (const status of statuses) {
      const statusEscrows = escrows.filter(e => e.status === status);
      stats.byStatus[status] = {
        count: statusEscrows.length,
        amount: statusEscrows.reduce((sum, e) => sum + e.amount, 0)
      };
    }

    return stats;
  }

  /**
   * Add milestone to escrow
   */
  async addMilestone(escrowId: string, milestone: { id: string; title: string; description: string; amount: number }): Promise<Escrow> {
    const escrow = escrowStore[escrowId];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'pending') {
      throw new Error('Can only add milestones to pending escrows');
    }

    if (!escrow.milestones) {
      escrow.milestones = [];
    }

    escrow.milestones.push({
      ...milestone,
      completed: false,
      approvedBy: []
    });

    escrow.updatedAt = new Date();
    escrowStore[escrow.escrowId] = escrow;

    return escrow;
  }
}

// Export singleton instance
export const escrowService = new EscrowService();
