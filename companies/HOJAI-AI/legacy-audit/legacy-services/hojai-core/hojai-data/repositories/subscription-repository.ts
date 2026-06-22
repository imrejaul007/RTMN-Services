/**
 * Hojai Event Bus - Subscription Repository
 * Version: 1.0.0 | Date: June 12, 2026
 */

import { Db } from 'mongodb';
import { Collection } from 'mongodb';
import { BaseRepository, createIndexes, standardIndexes } from './base-repository.js';
import { EventSubscription } from '../entities/index.js';

/**
 * Subscription Repository with tenant isolation
 */
export class SubscriptionRepository extends BaseRepository<EventSubscription> {
  constructor(db: Db, tenantId: string) {
    super(db, 'event_subscriptions', tenantId);
  }

  /**
   * Find by event type
   */
  async findByEventType(eventType: string): Promise<EventSubscription[]> {
    return this.findMany({ event_type: eventType } as Partial<EventSubscription>);
  }

  /**
   * Find active subscriptions
   */
  async findActive(): Promise<EventSubscription[]> {
    return this.findMany({ active: true } as Partial<EventSubscription>);
  }

  /**
   * Find subscriptions matching event pattern
   */
  async findMatchingPattern(eventType: string): Promise<EventSubscription[]> {
    const allSubscriptions = await this.findActive();
    return allSubscriptions.filter(sub => {
      if (!sub.event_pattern) return false;
      // Simple wildcard matching (e.g., "commerce.*")
      const pattern = sub.event_pattern.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(eventType);
    });
  }

  /**
   * Increment subscription stats
   */
  async incrementStats(
    id: string,
    field: 'received' | 'processed' | 'failed'
  ): Promise<void> {
    await this.collection.updateOne(
      this.scopeQuery({ id } as Partial<EventSubscription>),
      {
        $inc: { [`stats.${field}`]: 1 }
      }
    );
  }

  /**
   * Reset subscription stats
   */
  async resetStats(id: string): Promise<void> {
    await this.updateOne(
      { id } as Partial<EventSubscription>,
      { stats: { received: 0, processed: 0, failed: 0 } } as Partial<EventSubscription>
    );
  }

  /**
   * Activate subscription
   */
  async activate(id: string): Promise<void> {
    await this.updateOne(
      { id } as Partial<EventSubscription>,
      { active: true } as Partial<EventSubscription>
    );
  }

  /**
   * Deactivate subscription
   */
  async deactivate(id: string): Promise<void> {
    await this.updateOne(
      { id } as Partial<EventSubscription>,
      { active: false } as Partial<EventSubscription>
    );
  }

  /**
   * Get subscription statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const all = await this.findMany();
    return {
      total: all.length,
      active: all.filter(s => s.active).length,
      inactive: all.filter(s => !s.active).length
    };
  }
}

/**
 * Create indexes for subscriptions collection
 */
export async function createSubscriptionIndexes(db: Db): Promise<void> {
  const collection = db.collection('event_subscriptions');

  await createIndexes(collection, [
    standardIndexes.by_tenant_created,
    { key: { tenant_id: 1, event_type: 1, active: 1 }, name: 'idx_tenant_type_active' },
    { key: { tenant_id: 1, active: 1 }, name: 'idx_tenant_active' }
  ]);
}
