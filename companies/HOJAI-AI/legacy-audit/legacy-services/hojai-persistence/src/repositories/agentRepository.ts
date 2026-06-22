/**
 * Agent Repository
 *
 * MongoDB repository for managing AI agents and their executions.
 *
 * @example
 * ```typescript
 * import { AgentRepository } from '@hojai/persistence';
 *
 * const repo = new AgentRepository(db);
 *
 * // Create agent
 * const agent = await repo.create({
 *   tenantId: 'tenant-123',
 *   name: 'Sales Bot',
 *   type: 'sales',
 *   config: { model: 'claude-3' }
 * });
 *
 * // Find agents
 * const agents = await repo.findByTenant('tenant-123');
 *
 * // Record execution
 * await repo.recordExecution({
 *   agentId: agent._id.toString(),
 *   status: 'success',
 *   latencyMs: 150,
 *   cost: 0.001
 * });
 * ```
 */

import { Collection, ObjectId, Db, Filter, WithId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Agent status enum
 */
export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  FAILED = 'failed'
}

/**
 * Agent execution status
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
  memoryEnabled?: boolean;
  customSettings?: Record<string, unknown>;
}

/**
 * Agent document
 */
export interface Agent {
  _id?: ObjectId;
  agentId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: string;
  status: AgentStatus;
  config: AgentConfig;
  version: number;
  lastExecutionAt?: Date;
  executionCount: number;
  successRate: number;
  avgLatencyMs: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent execution record
 */
export interface AgentExecution {
  _id?: ObjectId;
  executionId: string;
  agentId: string;
  tenantId: string;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  latencyMs: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Agent analytics summary
 */
export interface AgentAnalytics {
  agentId: string;
  period: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  totalCost: number;
  totalTokensUsed: number;
  executionsByDay: Array<{
    date: string;
    count: number;
    successRate: number;
  }>;
}

/**
 * Create agent input
 */
export interface CreateAgentInput {
  tenantId: string;
  name: string;
  description?: string;
  type: string;
  config?: Partial<AgentConfig>;
}

/**
 * Update agent input
 */
export interface UpdateAgentInput {
  name?: string;
  description?: string;
  status?: AgentStatus;
  config?: Partial<AgentConfig>;
}

/**
 * Find agents filter
 */
export interface FindAgentsFilter {
  tenantId: string;
  status?: AgentStatus;
  type?: string;
  search?: string;
}

/**
 * Execution stats aggregation result
 */
interface ExecutionStatsResult {
  _id: string | null;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

// ============================================================================
// AGENT REPOSITORY
// ============================================================================

/**
 * Repository for managing agents
 */
export class AgentRepository {
  private collection: Collection<Agent>;
  private executionsCollection: Collection<AgentExecution>;

  constructor(db: Db) {
    this.collection = db.collection<Agent>('agents');
    this.executionsCollection = db.collection<AgentExecution>('agent_executions');
    this.ensureIndexes();
  }

  /**
   * Ensure required indexes exist
   */
  private async ensureIndexes(): Promise<void> {
    // Agent indexes
    await this.collection.createIndexes([
      { key: { agentId: 1 }, unique: true },
      { key: { tenantId: 1 } },
      { key: { tenantId: 1, status: 1 } },
      { key: { tenantId: 1, type: 1 } },
      { key: { lastExecutionAt: -1 } },
    ]);

    // Execution indexes
    await this.executionsCollection.createIndexes([
      { key: { executionId: 1 }, unique: true },
      { key: { agentId: 1 } },
      { key: { agentId: 1, startedAt: -1 } },
      { key: { tenantId: 1 } },
      { key: { status: 1 } },
      { key: { startedAt: -1 } },
    ]);
  }

  // ==========================================================================
  // AGENT CRUD
  // ==========================================================================

  /**
   * Create a new agent
   */
  async create(input: CreateAgentInput): Promise<Agent> {
    const now = new Date();
    const agent: Agent = {
      agentId: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: AgentStatus.ACTIVE,
      config: {
        model: 'claude-3-5-sonnet-20240620',
        temperature: 0.7,
        maxTokens: 4096,
        memoryEnabled: true,
        ...input.config,
      },
      version: 1,
      executionCount: 0,
      successRate: 0,
      avgLatencyMs: 0,
      totalCost: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(agent as Agent);
    return { ...agent, _id: result.insertedId };
  }

  /**
   * Find agent by ID
   */
  async findById(agentId: string): Promise<Agent | null> {
    return this.collection.findOne({ agentId });
  }

  /**
   * Find agents by tenant
   */
  async findByTenant(filter: FindAgentsFilter): Promise<Agent[]> {
    const query: Filter<Agent> = { tenantId: filter.tenantId };

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.type) {
      query.type = filter.type;
    }

    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } },
      ];
    }

    return this.collection.find(query).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Update an agent
   */
  async update(agentId: string, input: UpdateAgentInput): Promise<Agent | null> {
    const updateDoc: Record<string, unknown> = {
      $set: {
        updatedAt: new Date(),
      },
      $inc: {
        version: 1,
      },
    };

    if (input.name !== undefined) (updateDoc.$set as Record<string, unknown>).name = input.name;
    if (input.description !== undefined) (updateDoc.$set as Record<string, unknown>).description = input.description;
    if (input.status !== undefined) (updateDoc.$set as Record<string, unknown>).status = input.status;
    if (input.config !== undefined) {
      (updateDoc.$set as Record<string, unknown>).config = input.config;
    }

    const result = await this.collection.findOneAndUpdate(
      { agentId },
      updateDoc,
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Delete an agent (soft delete by archiving)
   */
  async archive(agentId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { agentId },
      {
        $set: {
          status: AgentStatus.ARCHIVED,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Hard delete an agent and its executions
   */
  async delete(agentId: string): Promise<boolean> {
    const [agentResult, executionsResult] = await Promise.all([
      this.collection.deleteOne({ agentId }),
      this.executionsCollection.deleteMany({ agentId }),
    ]);
    return agentResult.deletedCount > 0;
  }

  // ==========================================================================
  // EXECUTION TRACKING
  // ==========================================================================

  /**
   * Record an agent execution
   */
  async recordExecution(execution: Omit<AgentExecution, '_id' | 'executionId' | 'startedAt'>): Promise<AgentExecution> {
    const now = new Date();
    const record: AgentExecution = {
      ...execution,
      executionId: uuidv4(),
      startedAt: now,
      completedAt: execution.status === ExecutionStatus.SUCCESS || execution.status === ExecutionStatus.FAILED
        ? now
        : undefined,
    };

    await this.executionsCollection.insertOne(record);

    // Update agent stats
    await this.updateAgentStats(execution.agentId, execution);

    return record;
  }

  /**
   * Update agent statistics after execution
   */
  private async updateAgentStats(agentId: string, execution: Partial<AgentExecution>): Promise<void> {
    const update: Record<string, unknown> = {
      $set: {
        lastExecutionAt: new Date(),
        updatedAt: new Date(),
      },
      $inc: {
        executionCount: 1,
      },
    };

    if (execution.cost !== undefined) {
      (update.$inc as Record<string, number>).totalCost = execution.cost;
    }

    await this.collection.updateOne({ agentId }, update);

    // Recalculate success rate and avg latency
    const stats = await this.getExecutionStats(agentId, 100);
    if (stats) {
      await this.collection.updateOne(
        { agentId },
        {
          $set: {
            successRate: stats.successRate,
            avgLatencyMs: stats.avgLatencyMs,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  /**
   * Get execution statistics for an agent
   */
  async getExecutionStats(agentId: string, recentCount = 100): Promise<ExecutionStatsResult | null> {
    const stats = await this.executionsCollection
      .aggregate<ExecutionStatsResult>([
        { $match: { agentId } },
        { $sort: { startedAt: -1 } },
        { $limit: recentCount },
        {
          $group: {
            _id: null,
            totalExecutions: { $sum: 1 },
            successfulExecutions: {
              $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.SUCCESS] }, 1, 0] },
            },
            failedExecutions: {
              $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.FAILED] }, 1, 0] },
            },
            avgLatencyMs: { $avg: '$latencyMs' },
            minLatencyMs: { $min: '$latencyMs' },
            maxLatencyMs: { $max: '$latencyMs' },
            totalCost: { $sum: '$cost' },
            totalInputTokens: { $sum: { $ifNull: ['$tokensUsed.input', 0] } },
            totalOutputTokens: { $sum: { $ifNull: ['$tokensUsed.output', 0] } },
          },
        },
      ])
      .toArray();

    if (!stats.length) return null;

    const result = stats[0];
    return {
      ...result,
      successRate: result.totalExecutions > 0
        ? (result.successfulExecutions / result.totalExecutions) * 100
        : 0,
    };
  }

  /**
   * Get recent executions for an agent
   */
  async getRecentExecutions(agentId: string, limit = 50): Promise<AgentExecution[]> {
    return this.executionsCollection
      .find({ agentId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get failed executions for an agent
   */
  async getFailedExecutions(agentId: string, limit = 50): Promise<AgentExecution[]> {
    return this.executionsCollection
      .find({ agentId, status: ExecutionStatus.FAILED })
      .sort({ startedAt: -1 })
      .limit(limit)
      .toArray();
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Get analytics for an agent over a time period
   */
  async getAnalytics(agentId: string, days = 7): Promise<AgentAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [stats, dailyStats] = await Promise.all([
      this.getExecutionStats(agentId, days * 1000),
      this.getDailyStats(agentId, startDate),
    ]);

    return {
      agentId,
      period: `${days}d`,
      totalExecutions: stats?.totalExecutions || 0,
      successfulExecutions: stats?.successfulExecutions || 0,
      failedExecutions: stats?.failedExecutions || 0,
      successRate: stats?.successRate || 0,
      avgLatencyMs: stats?.avgLatencyMs || 0,
      minLatencyMs: stats?.minLatencyMs || 0,
      maxLatencyMs: stats?.maxLatencyMs || 0,
      totalCost: stats?.totalCost || 0,
      totalTokensUsed: (stats?.totalInputTokens || 0) + (stats?.totalOutputTokens || 0),
      executionsByDay: dailyStats,
    };
  }

  /**
   * Get daily execution statistics
   */
  private async getDailyStats(
    agentId: string,
    startDate: Date
  ): Promise<Array<{ date: string; count: number; successRate: number }>> {
    const results = await this.executionsCollection
      .aggregate<{ _id: string; count: number; successful: number }>([
        {
          $match: {
            agentId,
            startedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$startedAt' },
            },
            count: { $sum: 1 },
            successful: {
              $sum: { $cond: [{ $eq: ['$status', ExecutionStatus.SUCCESS] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    return results.map((r) => ({
      date: r._id,
      count: r.count,
      successRate: r.count > 0 ? (r.successful / r.count) * 100 : 0,
    }));
  }

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  /**
   * Archive inactive agents
   */
  async archiveInactiveAgents(tenantId: string, daysInactive = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const result = await this.collection.updateMany(
      {
        tenantId,
        status: AgentStatus.ACTIVE,
        lastExecutionAt: { $lt: cutoffDate },
      },
      {
        $set: {
          status: AgentStatus.INACTIVE,
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Delete old executions (for cleanup)
   */
  async deleteOldExecutions(agentId: string, daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.executionsCollection.deleteMany({
      agentId,
      startedAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  AgentStatus,
  ExecutionStatus,
  type AgentConfig,
  type Agent,
  type AgentExecution,
  type AgentAnalytics,
  type CreateAgentInput,
  type UpdateAgentInput,
  type FindAgentsFilter,
};

export default AgentRepository;
