/**
 * Hojai Intelligence - Insight Repository
 * Version: 1.0.0 | Date: June 12, 2026
 */

import { Db } from 'mongodb';
import { BaseRepository, createIndexes, standardIndexes } from './base-repository.js';
import { IntelligenceInsight, InsightType, InsightSeverity } from '../entities/index.js';

/**
 * Insight Repository with tenant isolation
 */
export class InsightRepository extends BaseRepository<IntelligenceInsight> {
  constructor(db: Db, tenantId: string) {
    super(db, 'intelligence_insights', tenantId);
  }

  /**
   * Find insights by type
   */
  async findByType(type: InsightType): Promise<IntelligenceInsight[]> {
    return this.findMany({ type } as Partial<IntelligenceInsight>, {
      sort: { created_at: -1 }
    });
  }

  /**
   * Find insights by severity
   */
  async findBySeverity(severity: InsightSeverity): Promise<IntelligenceInsight[]> {
    return this.findMany({ severity } as Partial<IntelligenceInsight>, {
      sort: { created_at: -1 }
    });
  }

  /**
   * Find insights for a user
   */
  async findByUser(userId: string): Promise<IntelligenceInsight[]> {
    return this.findMany({ user_id: userId } as Partial<IntelligenceInsight>, {
      sort: { created_at: -1 }
    });
  }

  /**
   * Find critical insights
   */
  async findCritical(): Promise<IntelligenceInsight[]> {
    return this.findBySeverity('critical');
  }

  /**
   * Find high priority insights
   */
  async findHighPriority(): Promise<IntelligenceInsight[]> {
    const high = await this.findMany({ severity: 'high' } as Partial<IntelligenceInsight>);
    const critical = await this.findCritical();
    return [...critical, ...high].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Count by type
   */
  async countByType(type: InsightType): Promise<number> {
    return this.count({ type } as Partial<IntelligenceInsight>);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    const insights = await this.findMany();

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const i of insights) {
      byType[i.type] = (byType[i.type] || 0) + 1;
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    }

    return { total: insights.length, byType, bySeverity };
  }
}

/**
 * Create indexes for insights collection
 */
export async function createInsightIndexes(db: Db): Promise<void> {
  const collection = db.collection('intelligence_insights');

  await createIndexes(collection, [
    standardIndexes.by_tenant_created,
    { key: { tenant_id: 1, type: 1 }, name: 'idx_tenant_type' },
    { key: { tenant_id: 1, severity: 1 }, name: 'idx_tenant_severity' },
    { key: { tenant_id: 1, user_id: 1, created_at: -1 }, name: 'idx_tenant_user_created' }
  ]);
}
