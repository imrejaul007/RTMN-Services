/**
 * HOJAI Tenant Repository
 * Tenant-scoped data access with isolation
 */

import { Model, FilterQuery } from 'mongoose';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base-repository.js';
import { ITenant, TenantSchema, IAgent, AgentSchema, IMemory, MemorySchema, IConversation, ConversationSchema } from '../schemas/tenant.js';

/**
 * Tenant-scoped repository
 */
export class TenantRepository<T extends { tenant_id: string }> extends BaseRepository<T> {
  protected tenantId: string;

  constructor(model: Model<T>, tenantId: string) {
    super(model);
    this.tenantId = tenantId;
  }

  /**
   * Get base filter with tenant isolation
   */
  protected getTenantFilter(additionalFilter: FilterQuery<T> = {}): FilterQuery<T> {
    return {
      tenant_id: this.tenantId,
      ...additionalFilter
    } as FilterQuery<T>;
  }

  /**
   * Find with tenant isolation
   */
  async findByTenant(options?: PaginationOptions): Promise<T[]> {
    return this.find(this.getTenantFilter(), options);
  }

  /**
   * Find one with tenant isolation
   */
  async findOneByTenant(additionalFilter: FilterQuery<T>): Promise<T | null> {
    return this.findOne(this.getTenantFilter(additionalFilter));
  }

  /**
   * Count with tenant isolation
   */
  async countByTenant(): Promise<number> {
    return this.count(this.getTenantFilter());
  }

  /**
   * Delete all with tenant isolation
   */
  async deleteAllByTenant(): Promise<number> {
    return this.deleteMany(this.getTenantFilter());
  }
}

/**
 * Agent Repository with tenant isolation
 */
export class AgentRepository extends TenantRepository<IAgent> {
  constructor(tenantId: string) {
    const schema = AgentSchema;
    const model = mongoose.models.Agent || mongoose.model<IAgent>('Agent', schema);
    super(model, tenantId);
  }

  /**
   * Find by type
   */
  async findByType(type: string, options?: PaginationOptions): Promise<IAgent[]> {
    return this.findByTenant({ type } as any, options);
  }

  /**
   * Find by role
   */
  async findByRole(role: IAgent['role'], options?: PaginationOptions): Promise<IAgent[]> {
    return this.findByTenant({ role } as any, options);
  }

  /**
   * Find active agents
   */
  async findActive(options?: PaginationOptions): Promise<IAgent[]> {
    return this.findByTenant({ status: 'active' } as any, options);
  }

  /**
   * Update agent status
   */
  async updateStatus(agentId: string, status: IAgent['status']): Promise<IAgent | null> {
    return this.updateById(agentId, { status } as any);
  }
}

/**
 * Memory Repository with tenant isolation
 */
export class MemoryRepository extends TenantRepository<IMemory> {
  constructor(tenantId: string) {
    const schema = MemorySchema;
    const model = mongoose.models.Memory || mongoose.model<IMemory>('Memory', schema);
    super(model, tenantId);
  }

  /**
   * Find by entity
   */
  async findByEntity(entityId: string, entityType?: string): Promise<IMemory[]> {
    const filter: any = { entity_id: entityId };
    if (entityType) filter.entity_type = entityType;
    return this.findByTenant(filter);
  }

  /**
   * Find by memory type
   */
  async findByType(memoryType: IMemory['memory_type']): Promise<IMemory[]> {
    return this.findByTenant({ memory_type: memoryType } as any);
  }

  /**
   * Search by content (simple text search)
   */
  async searchByContent(query: string, limit: number = 10): Promise<IMemory[]> {
    return this.find(
      this.getTenantFilter({ content: { $regex: query, $options: 'i' } } as any),
      { limit }
    );
  }

  /**
   * Get recent memories
   */
  async getRecent(limit: number = 20): Promise<IMemory[]> {
    return this.findByTenant({} as any, { limit, sort: { created_at: -1 } });
  }

  /**
   * Delete by entity
   */
  async deleteByEntity(entityId: string): Promise<number> {
    return this.deleteMany({ entity_id: entityId } as any);
  }
}

/**
 * Conversation Repository with tenant isolation
 */
export class ConversationRepository extends TenantRepository<IConversation> {
  constructor(tenantId: string) {
    const schema = ConversationSchema;
    const model = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', schema);
    super(model, tenantId);
  }

  /**
   * Find by customer
   */
  async findByCustomer(customerId: string): Promise<IConversation[]> {
    return this.findByTenant({ customer_id: customerId } as any, { sort: { created_at: -1 } });
  }

  /**
   * Find active conversations
   */
  async findActive(): Promise<IConversation[]> {
    return this.findByTenant({ status: 'active' } as any);
  }

  /**
   * Add message to conversation
   */
  async addMessage(conversationId: string, message: IConversation['messages'][0]): Promise<IConversation | null> {
    return this.model.findByIdAndUpdate(
      conversationId,
      { $push: { messages: message } },
      { new: true }
    ).exec();
  }

  /**
   * Close conversation
   */
  async close(conversationId: string): Promise<IConversation | null> {
    return this.updateById(conversationId, {
      status: 'closed',
      closed_at: new Date()
    } as any);
  }

  /**
   * Get conversation statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    closed: number;
    avgResponseTime: number;
  }> {
    const [total, active, closed] = await Promise.all([
      this.countByTenant(),
      this.model.countDocuments({ tenant_id: this.tenantId, status: 'active' }).exec(),
      this.model.countDocuments({ tenant_id: this.tenantId, status: 'closed' }).exec()
    ]);

    return { total, active, closed, avgResponseTime: 0 };
  }
}

// Import mongoose for schema initialization
import mongoose from 'mongoose';
