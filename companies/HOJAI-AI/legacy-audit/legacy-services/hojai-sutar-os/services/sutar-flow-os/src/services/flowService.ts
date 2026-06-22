/**
 * SUTAR Flow OS - Flow Service
 * Handles flow definition CRUD operations
 */

import { v4 as uuid } from 'uuid';
import { FlowDefinitionModel, IFlowDefinition } from '../models/index.js';
import { CreateFlowInput, UpdateFlowInput } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('flow-service');

export interface FlowListOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FlowListResult {
  flows: IFlowDefinition[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const flowService = {
  /**
   * List flow definitions for a tenant
   */
  async list(tenantId: string, options: FlowListOptions = {}): Promise<FlowListResult> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const query: Record<string, unknown> = { tenantId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [flows, total] = await Promise.all([
      FlowDefinitionModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
      FlowDefinitionModel.countDocuments(query)
    ]);

    return {
      flows: flows as unknown as IFlowDefinition[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Get a flow definition by ID
   */
  async getById(tenantId: string, flowId: string): Promise<IFlowDefinition | null> {
    const flow = await FlowDefinitionModel.findOne({ id: flowId, tenantId }).lean();
    return flow as unknown as IFlowDefinition | null;
  },

  /**
   * Create a new flow definition
   */
  async create(tenantId: string, userId: string, input: CreateFlowInput): Promise<IFlowDefinition> {
    const id = uuid();
    const flow = new FlowDefinitionModel({
      id,
      tenantId,
      name: input.name,
      description: input.description,
      version: 1,
      steps: input.steps,
      triggers: input.triggers,
      variables: input.variables,
      createdBy: userId
    });

    await flow.save();
    logger.info('flow_created', { flowId: id, tenantId, name: input.name });
    return flow.toObject();
  },

  /**
   * Update a flow definition
   */
  async update(
    tenantId: string,
    flowId: string,
    input: UpdateFlowInput
  ): Promise<IFlowDefinition | null> {
    const flow = await FlowDefinitionModel.findOne({ id: flowId, tenantId });
    if (!flow) {
      return null;
    }

    if (input.name !== undefined) flow.name = input.name;
    if (input.description !== undefined) flow.description = input.description;
    if (input.steps !== undefined) flow.steps = input.steps;
    if (input.triggers !== undefined) flow.triggers = input.triggers;
    if (input.variables !== undefined) flow.variables = input.variables;

    flow.version += 1;
    await flow.save();

    logger.info('flow_updated', { flowId, tenantId, version: flow.version });
    return flow.toObject();
  },

  /**
   * Delete a flow definition
   */
  async delete(tenantId: string, flowId: string): Promise<boolean> {
    const result = await FlowDefinitionModel.deleteOne({ id: flowId, tenantId });
    if (result.deletedCount > 0) {
      logger.info('flow_deleted', { flowId, tenantId });
      return true;
    }
    return false;
  },

  /**
   * Get flow statistics
   */
  async getStats(tenantId: string, flowId: string): Promise<{
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    avgDuration: number;
    successRate: number;
  }> {
    const { FlowRunModel } = await import('../models/index.js');

    const runs = await FlowRunModel.find({ flowId, tenantId }).lean();
    const totalRuns = runs.length;
    const completedRuns = runs.filter(r => r.status === 'completed').length;
    const failedRuns = runs.filter(r => r.status === 'failed').length;

    const completedWithDuration = runs.filter(
      r => r.status === 'completed' && r.startedAt && r.completedAt
    );
    const avgDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, r) => {
          const duration = new Date(r.completedAt!).getTime() - new Date(r.startedAt).getTime();
          return sum + duration;
        }, 0) / completedWithDuration.length
      : 0;

    const successRate = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

    return { totalRuns, completedRuns, failedRuns, avgDuration, successRate };
  }
};

export default flowService;
