import { GraphQLScalarType, Kind } from 'graphql';
import { companyMemoryClient, agentProtocolClient, hojaiApiClient } from '../../services/restClient.js';
import { logger } from '../../utils/logger.js';
import { forensicsQueryResolvers, forensicsMutationResolvers } from './forensicsResolvers.js';

// GraphQL Context type
export interface ResolverContext {
  tenantId: string;
  userId?: string;
  isAuthenticated: boolean;
}

// REST API Response types
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// DateTime scalar serializer
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 DateTime scalar',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    throw new Error('DateTime must be a Date or string');
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    throw new Error('DateTime must be a string or number');
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
});

// JSON scalar serializer
const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON scalar type',
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch {
        return ast.value;
      }
    }
    if (ast.kind === Kind.OBJECT) {
      return ast.fields;
    }
    return null;
  }
});

// Helper function to add tenant headers
function getHeaders(context: ResolverContext): Record<string, string> {
  const headers: Record<string, string> = {
    'x-tenant-id': context.tenantId
  };
  if (context.userId) {
    headers['x-user-id'] = context.userId;
  }
  return headers;
}

// Helper to paginate results
function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): { items: T[]; total: number; page: number; limit: number; hasMore: boolean } {
  return {
    items,
    total,
    page,
    limit,
    hasMore: page * limit < total
  };
}

// Query resolvers
export const queryResolvers = {
  DateTime: dateTimeScalar,
  JSON: jsonScalar,

  health: async (_: unknown, __: unknown, context: ResolverContext) => {
    const startTime = Date.now();
    const services: Array<{ name: string; status: string; latencyMs?: number; error?: string }> = [];

    const serviceChecks = [
      { name: 'company-memory', client: companyMemoryClient, path: '/health/live' },
      { name: 'agent-protocol', client: agentProtocolClient, path: '/health' },
      { name: 'hojai-api', client: hojaiApiClient, path: '/health' }
    ];

    for (const service of serviceChecks) {
      const serviceStart = Date.now();
      try {
        await service.client.get(service.path);
        services.push({
          name: service.name,
          status: 'healthy',
          latencyMs: Date.now() - serviceStart
        });
      } catch (error) {
        services.push({
          name: service.name,
          status: 'unhealthy',
          latencyMs: Date.now() - serviceStart,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      status: services.every(s => s.status === 'healthy') ? 'healthy' : 'degraded',
      version: '1.0.0',
      uptime: process.uptime(),
      services,
      timestamp: new Date().toISOString()
    };
  },

  // Company queries
  company: async (_: unknown, args: { entityId: string }, context: ResolverContext) => {
    try {
      const result = await companyMemoryClient.get(`/company/${args.entityId}`, {
        headers: getHeaders(context)
      });
      return result;
    } catch (error) {
      logger.error('resolver_company_error', { entityId: args.entityId, error });
      return null;
    }
  },

  companies: async (_: unknown, args: { filter?: Record<string, unknown>; page?: number; limit?: number }, context: ResolverContext) => {
    try {
      const page = args.page || 1;
      const limit = args.limit || 20;
      const params: Record<string, unknown> = { page, limit, ...args.filter };

      const result = await companyMemoryClient.get<PaginatedResponse<unknown>>('/companies', {
        headers: getHeaders(context),
        params
      });

      return createPaginatedResponse(
        result.items || [],
        result.total || 0,
        page,
        limit
      );
    } catch (error) {
      logger.error('resolver_companies_error', { error });
      return createPaginatedResponse([], 0, args.page || 1, args.limit || 20);
    }
  },

  memory: async (_: unknown, args: { entityType: string; entityId: string }, context: ResolverContext) => {
    try {
      const result = await companyMemoryClient.get(`/memory/${args.entityType}/${args.entityId}`, {
        headers: getHeaders(context)
      });
      return result;
    } catch (error) {
      logger.error('resolver_memory_error', { args, error });
      return null;
    }
  },

  // Memory Events
  memoryEvents: async (_: unknown, args: { filter?: Record<string, unknown>; page?: number; limit?: number }, context: ResolverContext) => {
    try {
      const page = args.page || 1;
      const limit = args.limit || 20;

      const result = await companyMemoryClient.get<PaginatedResponse<unknown>>('/events', {
        headers: getHeaders(context),
        params: { page, limit, ...args.filter }
      });

      return createPaginatedResponse(
        result.items || [],
        result.total || 0,
        page,
        limit
      );
    } catch (error) {
      logger.error('resolver_memoryEvents_error', { error });
      return createPaginatedResponse([], 0, args.page || 1, args.limit || 20);
    }
  },

  memoryEvent: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      return await companyMemoryClient.get(`/events/${args.id}`, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_memoryEvent_error', { id: args.id, error });
      return null;
    }
  },

  // Business Knowledge
  businessKnowledge: async (_: unknown, args: { entityId: string; category?: string }, context: ResolverContext) => {
    try {
      const params: Record<string, unknown> = { entityId: args.entityId };
      if (args.category) params.category = args.category;

      return await companyMemoryClient.get('/knowledge', {
        headers: getHeaders(context),
        params
      });
    } catch (error) {
      logger.error('resolver_businessKnowledge_error', { error });
      return [];
    }
  },

  businessKnowledgeItem: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      return await companyMemoryClient.get(`/knowledge/${args.id}`, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_businessKnowledgeItem_error', { id: args.id, error });
      return null;
    }
  },

  // Agent queries
  agents: async (_: unknown, args: { page?: number; limit?: number }, context: ResolverContext) => {
    try {
      const page = args.page || 1;
      const limit = args.limit || 20;

      const result = await agentProtocolClient.get<PaginatedResponse<unknown> | unknown[]>('/agents', {
        headers: getHeaders(context),
        params: { page, limit }
      });

      // Handle both paginated and non-paginated responses
      if (Array.isArray(result)) {
        return createPaginatedResponse(result, result.length, page, limit);
      }
      return createPaginatedResponse(
        result.items || [],
        result.total || 0,
        page,
        limit
      );
    } catch (error) {
      logger.error('resolver_agents_error', { error });
      return createPaginatedResponse([], 0, args.page || 1, args.limit || 20);
    }
  },

  agent: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      return await agentProtocolClient.get(`/agents/${args.id}`, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_agent_error', { id: args.id, error });
      return null;
    }
  },

  agentByName: async (_: unknown, args: { name: string }, context: ResolverContext) => {
    try {
      return await agentProtocolClient.get('/agents/by-name', {
        headers: getHeaders(context),
        params: { name: args.name }
      });
    } catch (error) {
      logger.error('resolver_agentByName_error', { name: args.name, error });
      return null;
    }
  },

  // Intelligence queries
  intelligence: async (_: unknown, args: { entityId: string }, context: ResolverContext) => {
    try {
      const [predictions, recommendations, signals] = await Promise.all([
        hojaiApiClient.get('/intelligence/predictions', {
          headers: getHeaders(context),
          params: { entityId: args.entityId }
        }).catch(() => []),
        hojaiApiClient.get('/intelligence/recommendations', {
          headers: getHeaders(context),
          params: { entityId: args.entityId }
        }).catch(() => []),
        hojaiApiClient.get('/intelligence/signals', {
          headers: getHeaders(context),
          params: { entityId: args.entityId }
        }).catch(() => [])
      ]);

      return {
        predictions: predictions || [],
        recommendations: recommendations || [],
        signals: signals || [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('resolver_intelligence_error', { entityId: args.entityId, error });
      return {
        predictions: [],
        recommendations: [],
        signals: [],
        lastUpdated: new Date().toISOString()
      };
    }
  },

  predictions: async (_: unknown, args: { entityId: string; type?: string }, context: ResolverContext) => {
    try {
      const params: Record<string, unknown> = { entityId: args.entityId };
      if (args.type) params.type = args.type;

      return await hojaiApiClient.get('/intelligence/predictions', {
        headers: getHeaders(context),
        params
      });
    } catch (error) {
      logger.error('resolver_predictions_error', { error });
      return [];
    }
  },

  recommendations: async (_: unknown, args: { entityId: string }, context: ResolverContext) => {
    try {
      return await hojaiApiClient.get('/intelligence/recommendations', {
        headers: getHeaders(context),
        params: { entityId: args.entityId }
      });
    } catch (error) {
      logger.error('resolver_recommendations_error', { error });
      return [];
    }
  },

  signals: async (_: unknown, args: { entityId: string; type?: string }, context: ResolverContext) => {
    try {
      const params: Record<string, unknown> = { entityId: args.entityId };
      if (args.type) params.type = args.type;

      return await hojaiApiClient.get('/intelligence/signals', {
        headers: getHeaders(context),
        params
      });
    } catch (error) {
      logger.error('resolver_signals_error', { error });
      return [];
    }
  }
};

// Mutation resolvers
export const mutationResolvers = {
  // Memory mutations
  createMemory: async (_: unknown, args: { input: Record<string, unknown> }, context: ResolverContext) => {
    try {
      return await companyMemoryClient.post('/memory', args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_createMemory_error', { input: args.input, error });
      throw error;
    }
  },

  updateMemory: async (
    _: unknown,
    args: { entityType: string; entityId: string; input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await companyMemoryClient.put(`/memory/${args.entityType}/${args.entityId}`, args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_updateMemory_error', { args, error });
      throw error;
    }
  },

  updateHealthScore: async (
    _: unknown,
    args: { entityType: string; entityId: string; score: number; trend?: string },
    context: ResolverContext
  ) => {
    try {
      return await companyMemoryClient.patch(`/memory/${args.entityType}/${args.entityId}/health`, {
        health_score: args.score,
        health_trend: args.trend
      }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_updateHealthScore_error', { args, error });
      throw error;
    }
  },

  addGoal: async (
    _: unknown,
    args: { entityType: string; entityId: string; input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await companyMemoryClient.post(`/memory/${args.entityType}/${args.entityId}/goals`, args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_addGoal_error', { args, error });
      throw error;
    }
  },

  updateGoalProgress: async (
    _: unknown,
    args: { entityType: string; entityId: string; goalId: string; progress: number },
    context: ResolverContext
  ) => {
    try {
      return await companyMemoryClient.patch(
        `/memory/${args.entityType}/${args.entityId}/goals/${args.goalId}`,
        { progress: args.progress },
        { headers: getHeaders(context) }
      );
    } catch (error) {
      logger.error('resolver_updateGoalProgress_error', { args, error });
      throw error;
    }
  },

  addDecision: async (
    _: unknown,
    args: { entityType: string; entityId: string; input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await companyMemoryClient.post(`/memory/${args.entityType}/${args.entityId}/decisions`, args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_addDecision_error', { args, error });
      throw error;
    }
  },

  // Event mutations
  createMemoryEvent: async (_: unknown, args: { input: Record<string, unknown> }, context: ResolverContext) => {
    try {
      return await companyMemoryClient.post('/events', args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_createMemoryEvent_error', { input: args.input, error });
      throw error;
    }
  },

  markEventImportance: async (
    _: unknown,
    args: { id: string; importance: string },
    context: ResolverContext
  ) => {
    try {
      return await companyMemoryClient.patch(`/events/${args.id}`, {
        importance: args.importance
      }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_markEventImportance_error', { id: args.id, error });
      throw error;
    }
  },

  // Knowledge mutations
  createBusinessKnowledge: async (_: unknown, args: { input: Record<string, unknown> }, context: ResolverContext) => {
    try {
      return await companyMemoryClient.post('/knowledge', args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_createBusinessKnowledge_error', { input: args.input, error });
      throw error;
    }
  },

  updateBusinessKnowledge: async (
    _: unknown,
    args: { id: string; input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await companyMemoryClient.put(`/knowledge/${args.id}`, args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_updateBusinessKnowledge_error', { id: args.id, error });
      throw error;
    }
  },

  deleteBusinessKnowledge: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      await companyMemoryClient.delete(`/knowledge/${args.id}`, {
        headers: getHeaders(context)
      });
      return true;
    } catch (error) {
      logger.error('resolver_deleteBusinessKnowledge_error', { id: args.id, error });
      return false;
    }
  },

  // Agent mutations
  createAgent: async (_: unknown, args: { input: Record<string, unknown> }, context: ResolverContext) => {
    try {
      return await agentProtocolClient.post('/agents', args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_createAgent_error', { input: args.input, error });
      throw error;
    }
  },

  updateAgent: async (
    _: unknown,
    args: { id: string; input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await agentProtocolClient.put(`/agents/${args.id}`, args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_updateAgent_error', { id: args.id, error });
      throw error;
    }
  },

  updateAgentStatus: async (
    _: unknown,
    args: { id: string; status: string },
    context: ResolverContext
  ) => {
    try {
      return await agentProtocolClient.patch(`/agents/${args.id}/status`, {
        status: args.status
      }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_updateAgentStatus_error', { id: args.id, status: args.status, error });
      throw error;
    }
  },

  deleteAgent: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      await agentProtocolClient.delete(`/agents/${args.id}`, {
        headers: getHeaders(context)
      });
      return true;
    } catch (error) {
      logger.error('resolver_deleteAgent_error', { id: args.id, error });
      return false;
    }
  },

  // Intelligence mutations
  addPrediction: async (
    _: unknown,
    args: {
      entityId: string;
      type: string;
      description: string;
      confidence: number;
      timeframe?: string;
      impact?: string;
      data?: unknown;
    },
    context: ResolverContext
  ) => {
    try {
      return await hojaiApiClient.post('/intelligence/predictions', {
        entity_id: args.entityId,
        type: args.type,
        description: args.description,
        confidence: args.confidence,
        timeframe: args.timeframe,
        impact: args.impact,
        data: args.data
      }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_addPrediction_error', { args, error });
      throw error;
    }
  },

  addRecommendation: async (
    _: unknown,
    args: {
      entityId: string;
      category: string;
      title: string;
      description: string;
      priority: number;
      actionItems: string[];
      expectedOutcome?: string;
      confidence?: number;
    },
    context: ResolverContext
  ) => {
    try {
      return await hojaiApiClient.post('/intelligence/recommendations', {
        entity_id: args.entityId,
        category: args.category,
        title: args.title,
        description: args.description,
        priority: args.priority,
        action_items: args.actionItems,
        expected_outcome: args.expectedOutcome,
        confidence: args.confidence
      }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_addRecommendation_error', { args, error });
      throw error;
    }
  },

  addSignal: async (
    _: unknown,
    args: {
      entityId: string;
      type: string;
      name: string;
      description: string;
      value: number;
      unit?: string;
      metadata?: unknown;
    },
    context: ResolverContext
  ) => {
    try {
      return await hojaiApiClient.post('/intelligence/signals', {
        entity_id: args.entityId,
        type: args.type,
        name: args.name,
        description: args.description,
        value: args.value,
        unit: args.unit,
        metadata: args.metadata
      }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_addSignal_error', { args, error });
      throw error;
    }
  },

  // Sync operation
  syncFromRestService: async (
    _: unknown,
    args: { service: string; entityType: string; entityId: string },
    context: ResolverContext
  ) => {
    try {
      logger.info('sync_from_rest_service', { service: args.service, entityType: args.entityType, entityId: args.entityId });

      let data;
      switch (args.service) {
        case 'company-memory':
          data = await companyMemoryClient.get(`/memory/${args.entityType}/${args.entityId}`, {
            headers: getHeaders(context)
          });
          break;
        case 'agent-protocol':
          data = await agentProtocolClient.get(`/agents/${args.entityId}`, {
            headers: getHeaders(context)
          });
          break;
        case 'hojai-api':
          data = await hojaiApiClient.get(`/entity/${args.entityId}`, {
            headers: getHeaders(context)
          });
          break;
        default:
          throw new Error(`Unknown service: ${args.service}`);
      }

      return data;
    } catch (error) {
      logger.error('resolver_syncFromRestService_error', { args, error });
      throw error;
    }
  }
};

// Export combined resolvers
export const resolvers = {
  Query: {
    ...queryResolvers,
    ...forensicsQueryResolvers
  },
  Mutation: {
    ...mutationResolvers,
    ...forensicsMutationResolvers
  }
};

export { dateTimeScalar, jsonScalar };
