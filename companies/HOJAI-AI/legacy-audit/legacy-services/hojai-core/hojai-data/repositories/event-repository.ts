/**
 * Hojai Event Bus - Event Repository
 * Version: 1.0.0 | Date: June 12, 2026
 */

import { Db } from 'mongodb';
import { BaseRepository, createIndexes, standardIndexes } from './base-repository.js';
import { HojaiEvent, EventCategory } from '../entities/index.js';

/**
 * Event Repository with tenant isolation
 */
export class EventRepository extends BaseRepository<HojaiEvent> {
  constructor(db: Db, tenantId: string) {
    super(db, 'events', tenantId);
  }

  /**
   * Find events by type
   */
  async findByType(type: string, options?: { limit?: number }): Promise<HojaiEvent[]> {
    return this.findMany({ type } as Partial<HojaiEvent>, {
      limit: options?.limit,
      sort: { occurred_at: -1 }
    });
  }

  /**
   * Find events by category
   */
  async findByCategory(category: EventCategory): Promise<HojaiEvent[]> {
    return this.findMany({ category } as Partial<HojaiEvent>, {
      sort: { occurred_at: -1 }
    });
  }

  /**
   * Find events by source
   */
  async findBySource(source: string): Promise<HojaiEvent[]> {
    return this.findMany({ source } as Partial<HojaiEvent>, {
      sort: { occurred_at: -1 }
    });
  }

  /**
   * Find events by subject
   */
  async findBySubject(subjectType: string, subjectId: string): Promise<HojaiEvent[]> {
    return this.findMany({
      subject_type: subjectType,
      subject_id: subjectId
    } as Partial<HojaiEvent>, {
      sort: { occurred_at: -1 }
    });
  }

  /**
   * Find events by correlation ID
   */
  async findByCorrelationId(correlationId: string): Promise<HojaiEvent[]> {
    return this.findMany({ correlation_id: correlationId } as Partial<HojaiEvent>);
  }

  /**
   * Find events within a time range
   */
  async findByTimeRange(start: string, end: string): Promise<HojaiEvent[]> {
    return this.aggregate([
      {
        $match: {
          occurred_at: {
            $gte: start,
            $lte: end
          }
        }
      },
      { $sort: { occurred_at: -1 } }
    ]);
  }

  /**
   * Count by type
   */
  async countByType(type: string): Promise<number> {
    return this.count({ type } as Partial<HojaiEvent>);
  }

  /**
   * Get event statistics
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const events = await this.findMany();

    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const e of events) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    }

    return { total: events.length, byType, byCategory };
  }

  /**
   * Delete expired events
   */
  async deleteExpired(beforeDate: string): Promise<number> {
    return this.deleteMany({
      expires_at: { $lt: beforeDate }
    } as any);
  }
}

/**
 * Create indexes for events collection
 */
export async function createEventIndexes(db: Db): Promise<void> {
  const collection = db.collection('events');

  await createIndexes(collection, [
    standardIndexes.by_tenant_created,
    { key: { tenant_id: 1, type: 1, occurred_at: -1 }, name: 'idx_tenant_type_time' },
    { key: { tenant_id: 1, category: 1, occurred_at: -1 }, name: 'idx_tenant_category_time' },
    { key: { tenant_id: 1, source: 1, occurred_at: -1 }, name: 'idx_tenant_source_time' },
    { key: { tenant_id: 1, subject_type: 1, subject_id: 1 }, name: 'idx_tenant_subject' },
    { key: { correlation_id: 1 }, name: 'idx_correlation' },
    { key: { expires_at: 1 }, name: 'idx_expires', unique: false } as any
  ]);
}
