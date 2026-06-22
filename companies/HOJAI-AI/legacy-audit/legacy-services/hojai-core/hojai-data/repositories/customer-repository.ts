/**
 * Hojai Data Platform - Customer Repository
 * Version: 1.0 | Date: May 29, 2026
 */

import { Db } from 'mongodb';
import { BaseRepository } from './base-repository';
import { Customer } from '../entities';

/**
 * Customer Repository
 */
export class CustomerRepository extends BaseRepository<Customer> {
  constructor(db: Db, tenant_id: string) {
    super(db, 'customers', tenant_id);
  }

  /**
   * Find by phone
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    return this.collection.findOne({ phone } as any);
  }

  /**
   * Find by email
   */
  async findByEmail(email: string): Promise<Customer | null> {
    return this.collection.findOne({ email: email.toLowerCase() } as any);
  }

  /**
   * Find by tags
   */
  async findByTags(tags: string[]): Promise<Customer[]> {
    return this.collection
      .find({ tags: { $in: tags } } as any)
      .toArray();
  }

  /**
   * Find by segment
   */
  async findBySegment(segmentId: string): Promise<Customer[]> {
    return this.collection
      .find({ segments: segmentId } as any)
      .toArray();
  }

  /**
   * Find high-value customers
   */
  async findHighValue(limit = 100): Promise<Customer[]> {
    return this.collection
      .find({ status: 'active' } as any)
      .sort({ lifetime_value: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Find at-risk customers
   */
  async findAtRisk(): Promise<Customer[]> {
    return this.collection
      .find({ churn_risk: 'high', status: 'active' } as any)
      .toArray();
  }

  /**
   * Update engagement score
   */
  async updateEngagementScore(
    customerId: string,
    score: number
  ): Promise<void> {
    await this.updateOne({ id: customerId } as any, { engagement_score: score } as any);
  }

  /**
   * Add tag to customer
   */
  async addTag(customerId: string, tag: string): Promise<void> {
    await this.collection.updateOne(
      { id: customerId, tenant_id: this.tenant_id } as any,
      { $addToSet: { tags: tag }, $set: { updated_at: new Date().toISOString() } }
    );
  }

  /**
   * Add segment to customer
   */
  async addSegment(customerId: string, segmentId: string): Promise<void> {
    await this.collection.updateOne(
      { id: customerId, tenant_id: this.tenant_id } as any,
      { $addToSet: { segments: segmentId }, $set: { updated_at: new Date().toISOString() } }
    );
  }

  /**
   * Update customer stats
   */
  async updateStats(
    customerId: string,
    stats: {
      lifetime_value?: number;
      order_count?: number;
      avg_order_value?: number;
      last_order_date?: string;
    }
  ): Promise<void> {
    await this.collection.updateOne(
      { id: customerId, tenant_id: this.tenant_id } as any,
      { $set: { ...stats, updated_at: new Date().toISOString() } }
    );
  }
}
