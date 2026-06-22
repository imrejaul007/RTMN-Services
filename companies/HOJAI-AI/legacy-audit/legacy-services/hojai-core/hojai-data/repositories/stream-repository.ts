/**
 * Hojai Event Bus - Stream Repository
 * Version: 1.0.0 | Date: June 12, 2026
 */

import { Db } from 'mongodb';
import { BaseRepository, createIndexes, standardIndexes } from './base-repository.js';
import { EventStream } from '../entities/index.js';

/**
 * Stream Repository with tenant isolation
 */
export class StreamRepository extends BaseRepository<EventStream> {
  constructor(db: Db, tenantId: string) {
    super(db, 'event_streams', tenantId);
  }

  /**
   * Find by name
   */
  async findByName(name: string): Promise<EventStream | null> {
    return this.findOne({ name } as Partial<EventStream>);
  }

  /**
   * Find streams by event type
   */
  async findByEventType(eventType: string): Promise<EventStream[]> {
    const allStreams = await this.findMany();
    return allStreams.filter(stream =>
      stream.event_types.includes(eventType)
    );
  }

  /**
   * Update stream event types
   */
  async updateEventTypes(id: string, eventTypes: string[]): Promise<void> {
    await this.updateOne(
      { id } as Partial<EventStream>,
      { event_types: eventTypes } as Partial<EventStream>
    );
  }

  /**
   * Update retention days
   */
  async updateRetentionDays(id: string, retentionDays: number): Promise<void> {
    await this.updateOne(
      { id } as Partial<EventStream>,
      { retention_days: retentionDays } as Partial<EventStream>
    );
  }

  /**
   * Check if stream exists
   */
  async exists(name: string): Promise<boolean> {
    const stream = await this.findByName(name);
    return stream !== null;
  }
}

/**
 * Create indexes for streams collection
 */
export async function createStreamIndexes(db: Db): Promise<void> {
  const collection = db.collection('event_streams');

  await createIndexes(collection, [
    standardIndexes.by_tenant_created,
    { key: { tenant_id: 1, name: 1 }, name: 'idx_tenant_name', unique: true } as any
  ]);
}
