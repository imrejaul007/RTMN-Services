/**
 * Hojai Intelligence - Prediction Repository
 * Version: 1.0.0 | Date: June 12, 2026
 */

import { Db } from 'mongodb';
import { BaseRepository, createIndexes, standardIndexes } from './base-repository.js';
import { IntelligencePrediction, PredictionType } from '../entities/index.js';

/**
 * Prediction Repository with tenant isolation
 */
export class PredictionRepository extends BaseRepository<IntelligencePrediction> {
  constructor(db: Db, tenantId: string) {
    super(db, 'intelligence_predictions', tenantId);
  }

  /**
   * Find predictions by type
   */
  async findByType(type: PredictionType, options?: { limit?: number }): Promise<IntelligencePrediction[]> {
    return this.findMany({ type } as Partial<IntelligencePrediction>, {
      limit: options?.limit,
      sort: { created_at: -1 }
    });
  }

  /**
   * Find predictions for a user
   */
  async findByUser(userId: string): Promise<IntelligencePrediction[]> {
    return this.findMany({ user_id: userId } as Partial<IntelligencePrediction>, {
      sort: { created_at: -1 }
    });
  }

  /**
   * Find predictions by model
   */
  async findByModel(model: string): Promise<IntelligencePrediction[]> {
    return this.findMany({ model } as Partial<IntelligencePrediction>);
  }

  /**
   * Count by type
   */
  async countByType(type: PredictionType): Promise<number> {
    return this.count({ type } as Partial<IntelligencePrediction>);
  }

  /**
   * Get prediction statistics
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    avgConfidence: number;
  }> {
    const predictions = await this.findMany();

    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const p of predictions) {
      byType[p.type] = (byType[p.type] || 0) + 1;
      totalConfidence += p.confidence;
    }

    return {
      total: predictions.length,
      byType,
      avgConfidence: predictions.length > 0 ? totalConfidence / predictions.length : 0
    };
  }
}

/**
 * Create indexes for predictions collection
 */
export async function createPredictionIndexes(db: Db): Promise<void> {
  const collection = db.collection('intelligence_predictions');

  await createIndexes(collection, [
    standardIndexes.by_tenant_created,
    { key: { tenant_id: 1, type: 1 }, name: 'idx_tenant_type' },
    { key: { tenant_id: 1, user_id: 1, created_at: -1 }, name: 'idx_tenant_user_created' },
    { key: { tenant_id: 1, model: 1 }, name: 'idx_tenant_model' }
  ]);
}
