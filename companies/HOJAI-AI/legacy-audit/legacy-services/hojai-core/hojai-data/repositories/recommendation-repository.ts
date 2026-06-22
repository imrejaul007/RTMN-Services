/**
 * Hojai Intelligence - Recommendation Repository
 * Version: 1.0.0 | Date: June 12, 2026
 */

import { Db } from 'mongodb';
import { BaseRepository, createIndexes, standardIndexes } from './base-repository.js';
import { IntelligenceRecommendation, RecommendationType } from '../entities/index.js';

/**
 * Recommendation Repository with tenant isolation
 */
export class RecommendationRepository extends BaseRepository<IntelligenceRecommendation> {
  constructor(db: Db, tenantId: string) {
    super(db, 'intelligence_recommendations', tenantId);
  }

  /**
   * Find recommendations by type
   */
  async findByType(type: RecommendationType): Promise<IntelligenceRecommendation[]> {
    return this.findMany({ type } as Partial<IntelligenceRecommendation>, {
      sort: { created_at: -1 }
    });
  }

  /**
   * Find recommendations for a user
   */
  async findByUser(userId: string): Promise<IntelligenceRecommendation[]> {
    return this.findMany({ user_id: userId } as Partial<IntelligenceRecommendation>, {
      sort: { created_at: -1 }
    });
  }

  /**
   * Find by strategy
   */
  async findByStrategy(strategy: string): Promise<IntelligenceRecommendation[]> {
    return this.findMany({ strategy } as Partial<IntelligenceRecommendation>);
  }

  /**
   * Count by type
   */
  async countByType(type: RecommendationType): Promise<number> {
    return this.count({ type } as Partial<IntelligenceRecommendation>);
  }
}

/**
 * Create indexes for recommendations collection
 */
export async function createRecommendationIndexes(db: Db): Promise<void> {
  const collection = db.collection('intelligence_recommendations');

  await createIndexes(collection, [
    standardIndexes.by_tenant_created,
    { key: { tenant_id: 1, type: 1 }, name: 'idx_tenant_type' },
    { key: { tenant_id: 1, user_id: 1, created_at: -1 }, name: 'idx_tenant_user_created' },
    { key: { tenant_id: 1, strategy: 1 }, name: 'idx_tenant_strategy' }
  ]);
}
