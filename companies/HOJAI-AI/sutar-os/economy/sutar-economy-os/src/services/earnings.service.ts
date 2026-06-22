/**
 * SUTAR Economy OS - Earnings Service
 * Layer 10: Agent/service earnings tracking
 */

import { v4 as uuidv4 } from 'uuid';
import type { IEarning, IEarningsSummary, EarningStatus, EarningSource } from '../types/index.js';

// ============================================
// In-Memory Storage
// ============================================

interface EarningsStore {
  [earningId: string]: IEarning;
}

const earningsStore: EarningsStore = {};

// ============================================
// Earnings Service Class
// ============================================

export class EarningsService {
  /**
   * Create a new earning record
   */
  async createEarning(request: {
    entityId: string;
    entityType: 'user' | 'business' | 'agent';
    source: EarningSource;
    sourceId?: string;
    amount: number;
    currency?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IEarning> {
    const {
      entityId,
      entityType,
      source,
      sourceId,
      amount,
      currency = 'USD',
      metadata
    } = request;

    const earning: IEarning = {
      earningId: uuidv4(),
      entityId,
      entityType,
      source,
      sourceId,
      amount,
      currency,
      status: 'pending',
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    earningsStore[earning.earningId] = earning;
    return earning;
  }

  /**
   * Get earning by ID
   */
  async getEarning(earningId: string): Promise<IEarning | null> {
    return earningsStore[earningId] || null;
  }

  /**
   * Get earnings for an entity
   */
  async getEarnings(
    entityId: string,
    options: {
      page?: number;
      limit?: number;
      source?: EarningSource;
      status?: EarningStatus;
      currency?: string;
      startDate?: Date;
      endDate?: Date;
      sortBy?: 'createdAt' | 'amount' | 'source';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    earnings: IEarning[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      source,
      status,
      currency,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    let earnings = Object.values(earningsStore)
      .filter(e => e.entityId === entityId)
      .filter(e => !source || e.source === source)
      .filter(e => !status || e.status === status)
      .filter(e => !currency || e.currency === currency)
      .filter(e => !startDate || e.createdAt >= startDate)
      .filter(e => !endDate || e.createdAt <= endDate);

    // Sort earnings
    earnings.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'source':
          comparison = a.source.localeCompare(b.source);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = earnings.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    earnings = earnings.slice(startIndex, startIndex + limit);

    return {
      earnings,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Update earning status
   */
  async updateEarningStatus(earningId: string, status: EarningStatus): Promise<IEarning | null> {
    const earning = earningsStore[earningId];
    if (!earning) {
      return null;
    }

    earning.status = status;
    earning.updatedAt = new Date();

    if (status === 'calculated') {
      earning.calculatedAt = new Date();
    } else if (status === 'paid') {
      earning.paidAt = new Date();
    }

    earningsStore[earningId] = earning;
    return earning;
  }

  /**
   * Calculate earnings for a period
   */
  async calculateEarnings(
    entityId: string,
    periodStart: Date,
    periodEnd: Date,
    options: {
      source?: EarningSource;
      currency?: string;
      applyTrustMultiplier?: boolean;
      trustScore?: number;
    } = {}
  ): Promise<IEarningsSummary> {
    const { source, currency, applyTrustMultiplier = false, trustScore = 1 } = options;

    let earnings = Object.values(earningsStore)
      .filter(e => e.entityId === entityId)
      .filter(e => e.createdAt >= periodStart && e.createdAt <= periodEnd)
      .filter(e => e.status === 'pending' || e.status === 'calculated')
      .filter(e => !source || e.source === source)
      .filter(e => !currency || e.currency === currency);

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
    const pendingEarnings = earnings
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);
    const paidEarnings = earnings
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + e.amount, 0);

    // Apply trust multiplier if enabled
    const multiplier = applyTrustMultiplier ? Math.min(1.5, 0.5 + (trustScore * 0.1)) : 1;
    const adjustedEarnings = Math.round(totalEarnings * multiplier * 100) / 100;

    return {
      entityId,
      entityType: earnings[0]?.entityType || 'user',
      totalEarnings: adjustedEarnings,
      pendingEarnings,
      paidEarnings,
      currency: currency || 'USD',
      periodStart,
      periodEnd
    };
  }

  /**
   * Mark earnings as calculated
   */
  async markAsCalculated(earningIds: string[]): Promise<number> {
    let count = 0;

    for (const earningId of earningIds) {
      const earning = earningsStore[earningId];
      if (earning && earning.status === 'pending') {
        earning.status = 'calculated';
        earning.calculatedAt = new Date();
        earning.updatedAt = new Date();
        earningsStore[earningId] = earning;
        count++;
      }
    }

    return count;
  }

  /**
   * Mark earnings as paid
   */
  async markAsPaid(earningIds: string[]): Promise<number> {
    let count = 0;

    for (const earningId of earningIds) {
      const earning = earningsStore[earningId];
      if (earning && (earning.status === 'pending' || earning.status === 'calculated')) {
        earning.status = 'paid';
        earning.paidAt = new Date();
        earning.updatedAt = new Date();
        earningsStore[earningId] = earning;
        count++;
      }
    }

    return count;
  }

  /**
   * Cancel earnings
   */
  async cancelEarning(earningId: string, reason: string): Promise<IEarning | null> {
    const earning = earningsStore[earningId];
    if (!earning) {
      return null;
    }

    if (earning.status === 'paid') {
      throw new Error('Cannot cancel paid earnings');
    }

    earning.status = 'cancelled';
    earning.metadata = {
      ...earning.metadata,
      cancelledAt: new Date().toISOString(),
      cancelReason: reason
    };
    earning.updatedAt = new Date();

    earningsStore[earningId] = earning;
    return earning;
  }

  /**
   * Get earnings summary for an entity
   */
  async getEarningsSummary(
    entityId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<IEarningsSummary> {
    return this.calculateEarnings(entityId, periodStart, periodEnd);
  }

  /**
   * Get earnings by source
   */
  async getEarningsBySource(
    entityId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<EarningSource, { count: number; total: number; pending: number; paid: number }>> {
    const earnings = Object.values(earningsStore)
      .filter(e => e.entityId === entityId)
      .filter(e => e.createdAt >= periodStart && e.createdAt <= periodEnd);

    const sources: EarningSource[] = ['contract', 'negotiation', 'bonus', 'referral', 'other'];
    const result: Record<EarningSource, { count: number; total: number; pending: number; paid: number }> = {} as any;

    for (const source of sources) {
      const sourceEarnings = earnings.filter(e => e.source === source);
      result[source] = {
        count: sourceEarnings.length,
        total: sourceEarnings.reduce((sum, e) => sum + e.amount, 0),
        pending: sourceEarnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
        paid: sourceEarnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0)
      };
    }

    return result;
  }

  /**
   * Get top earners (across all entities)
   */
  async getTopEarners(
    periodStart: Date,
    periodEnd: Date,
    limit: number = 10
  ): Promise<Array<{
    entityId: string;
    entityType: string;
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
    rank: number;
  }>> {
    // Get all unique entity IDs
    const entityIds = [...new Set(Object.values(earningsStore).map(e => e.entityId))];

    const earners = await Promise.all(
      entityIds.map(async entityId => {
        const summary = await this.calculateEarnings(entityId, periodStart, periodEnd);
        return {
          entityId,
          entityType: summary.entityType,
          totalEarnings: summary.totalEarnings,
          pendingEarnings: summary.pendingEarnings,
          paidEarnings: summary.paidEarnings
        };
      })
    );

    return earners
      .filter(e => e.totalEarnings > 0)
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit)
      .map((e, index) => ({ ...e, rank: index + 1 }));
  }

  /**
   * Get earnings statistics
   */
  async getEarningsStatistics(
    entityId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
    cancelledEarnings: number;
    averageEarning: number;
    largestEarning: number;
    smallestEarning: number;
    earningsCount: number;
    bySource: Record<EarningSource, { count: number; total: number }>;
    byStatus: Record<EarningStatus, { count: number; total: number }>;
    dailyEarnings: Array<{ date: string; amount: number }>;
  }> {
    const earnings = Object.values(earningsStore)
      .filter(e => e.entityId === entityId)
      .filter(e => e.createdAt >= periodStart && e.createdAt <= periodEnd);

    const stats = {
      totalEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
      pendingEarnings: earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0),
      paidEarnings: earnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0),
      cancelledEarnings: earnings.filter(e => e.status === 'cancelled').reduce((sum, e) => sum + e.amount, 0),
      averageEarning: 0,
      largestEarning: 0,
      smallestEarning: 0,
      earningsCount: earnings.length,
      bySource: {} as Record<EarningSource, { count: number; total: number }>,
      byStatus: {} as Record<EarningStatus, { count: number; total: number }>,
      dailyEarnings: [] as Array<{ date: string; amount: number }>
    };

    if (earnings.length > 0) {
      const amounts = earnings.map(e => e.amount);
      stats.averageEarning = stats.totalEarnings / earnings.length;
      stats.largestEarning = Math.max(...amounts);
      stats.smallestEarning = Math.min(...amounts);
    }

    // By source
    const sources: EarningSource[] = ['contract', 'negotiation', 'bonus', 'referral', 'other'];
    for (const source of sources) {
      const sourceEarnings = earnings.filter(e => e.source === source);
      stats.bySource[source] = {
        count: sourceEarnings.length,
        total: sourceEarnings.reduce((sum, e) => sum + e.amount, 0)
      };
    }

    // By status
    const statuses: EarningStatus[] = ['pending', 'calculated', 'paid', 'cancelled'];
    for (const status of statuses) {
      const statusEarnings = earnings.filter(e => e.status === status);
      stats.byStatus[status] = {
        count: statusEarnings.length,
        total: statusEarnings.reduce((sum, e) => sum + e.amount, 0)
      };
    }

    // Daily earnings
    const dailyMap = new Map<string, number>();
    for (const earning of earnings) {
      const dateKey = earning.createdAt.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + earning.amount);
    }

    stats.dailyEarnings = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  }

  /**
   * Create bulk earnings (for batch processing)
   */
  async createBulkEarnings(
    requests: Array<{
      entityId: string;
      entityType: 'user' | 'business' | 'agent';
      source: EarningSource;
      sourceId?: string;
      amount: number;
      currency?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<{ successful: IEarning[]; failed: Array<{ request: typeof requests[0]; error: string }> }> {
    const successful: IEarning[] = [];
    const failed: Array<{ request: typeof requests[0]; error: string }> = [];

    for (const request of requests) {
      try {
        const earning = await this.createEarning(request);
        successful.push(earning);
      } catch (error) {
        failed.push({
          request,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get recent earnings
   */
  async getRecentEarnings(entityId: string, limit: number = 10): Promise<IEarning[]> {
    return Object.values(earningsStore)
      .filter(e => e.entityId === entityId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get pending payout amount
   */
  async getPendingPayout(entityId: string, currency: string = 'USD'): Promise<number> {
    const earnings = Object.values(earningsStore)
      .filter(e => e.entityId === entityId)
      .filter(e => e.currency === currency)
      .filter(e => e.status === 'calculated' || e.status === 'pending');

    return earnings.reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Adjust earning amount (admin)
   */
  async adjustEarning(earningId: string, newAmount: number, reason: string, adminId: string): Promise<IEarning | null> {
    const earning = earningsStore[earningId];
    if (!earning) {
      return null;
    }

    const oldAmount = earning.amount;
    earning.amount = newAmount;
    earning.metadata = {
      ...earning.metadata,
      adjustedBy: adminId,
      adjustedAt: new Date().toISOString(),
      adjustmentReason: reason,
      oldAmount
    };
    earning.updatedAt = new Date();

    earningsStore[earningId] = earning;
    return earning;
  }
}

// Export singleton instance
export const earningsService = new EarningsService();
