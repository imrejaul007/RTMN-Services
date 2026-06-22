import { logger } from '../../utils/logger.js';
import {
  evidenceClient,
  deepfakeClient,
  custodyClient,
  forensicsClient,
  socialClient,
  financialClient,
  locationClient,
  reportsClient,
  forensicsGatewayClient
} from '../../services/forensicsClient.js';
import { ResolverContext } from './index.js';

// Helper function to add auth headers
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

// ===== FORENSICS QUERY RESOLVERS =====
export const forensicsQueryResolvers = {
  // Investigation queries
  investigation: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      return await forensicsClient.get(`/investigations/${args.id}`, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_investigation_error', { id: args.id, error });
      return null;
    }
  },

  investigations: async (
    _: unknown,
    args: { filter?: Record<string, unknown>; page?: number; limit?: number },
    context: ResolverContext
  ) => {
    try {
      const page = args.page || 1;
      const limit = args.limit || 20;
      const result = await forensicsClient.get<{ items: unknown[]; total: number }>('/investigations', {
        headers: getHeaders(context),
        params: { page, limit, ...args.filter }
      });
      return createPaginatedResponse(result.items || [], result.total || 0, page, limit);
    } catch (error) {
      logger.error('resolver_investigations_error', { error });
      return createPaginatedResponse([], 0, args.page || 1, args.limit || 20);
    }
  },

  // Evidence queries
  evidence: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      return await evidenceClient.get(`/evidence/${args.id}`, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_evidence_error', { id: args.id, error });
      return null;
    }
  },

  evidenceByHash: async (_: unknown, args: { hash: string }, context: ResolverContext) => {
    try {
      return await evidenceClient.get('/evidence/by-hash', {
        headers: getHeaders(context),
        params: { hash: args.hash }
      });
    } catch (error) {
      logger.error('resolver_evidenceByHash_error', { hash: args.hash, error });
      return null;
    }
  },

  evidenceList: async (
    _: unknown,
    args: { filter?: Record<string, unknown>; page?: number; limit?: number },
    context: ResolverContext
  ) => {
    try {
      const page = args.page || 1;
      const limit = args.limit || 20;
      const result = await evidenceClient.get<{ items: unknown[]; total: number }>('/evidence', {
        headers: getHeaders(context),
        params: { page, limit, ...args.filter }
      });
      return createPaginatedResponse(result.items || [], result.total || 0, page, limit);
    } catch (error) {
      logger.error('resolver_evidenceList_error', { error });
      return createPaginatedResponse([], 0, args.page || 1, args.limit || 20);
    }
  },

  // Deepfake queries
  deepfakeAnalysis: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      return await deepfakeClient.get(`/analysis/${args.id}`, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_deepfakeAnalysis_error', { id: args.id, error });
      return null;
    }
  },

  deepfakeAnalyses: async (
    _: unknown,
    args: { filter?: Record<string, unknown>; page?: number; limit?: number },
    context: ResolverContext
  ) => {
    try {
      const page = args.page || 1;
      const limit = args.limit || 20;
      const result = await deepfakeClient.get<{ items: unknown[]; total: number }>('/analysis', {
        headers: getHeaders(context),
        params: { page, limit, ...args.filter }
      });
      return createPaginatedResponse(result.items || [], result.total || 0, page, limit);
    } catch (error) {
      logger.error('resolver_deepfakeAnalyses_error', { error });
      return createPaginatedResponse([], 0, args.page || 1, args.limit || 20);
    }
  },

  // Chain of Custody queries
  custodyChain: async (_: unknown, args: { evidenceId: string }, context: ResolverContext) => {
    try {
      return await custodyClient.get(`/chain/${args.evidenceId}`, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_custodyChain_error', { evidenceId: args.evidenceId, error });
      return null;
    }
  },

  custodyTransfer: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      return await custodyClient.get(`/transfer/${args.id}`, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_custodyTransfer_error', { id: args.id, error });
      return null;
    }
  },

  // Financial queries
  financialAnalysis: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      return await financialClient.get(`/analysis/${args.id}`, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_financialAnalysis_error', { id: args.id, error });
      return null;
    }
  },

  financialAnomalies: async (
    _: unknown,
    args: { filter?: Record<string, unknown>; page?: number; limit?: number },
    context: ResolverContext
  ) => {
    try {
      const page = args.page || 1;
      const limit = args.limit || 20;
      const result = await financialClient.get<{ items: unknown[]; total: number }>('/analysis', {
        headers: getHeaders(context),
        params: { page, limit, ...args.filter }
      });
      return createPaginatedResponse(result.items || [], result.total || 0, page, limit);
    } catch (error) {
      logger.error('resolver_financialAnomalies_error', { error });
      return createPaginatedResponse([], 0, args.page || 1, args.limit || 20);
    }
  },

  // Social/OSINT queries
  socialProfile: async (_: unknown, args: { identifier: string }, context: ResolverContext) => {
    try {
      return await socialClient.get('/profile', {
        headers: getHeaders(context),
        params: { identifier: args.identifier }
      });
    } catch (error) {
      logger.error('resolver_socialProfile_error', { identifier: args.identifier, error });
      return null;
    }
  },

  socialConnections: async (_: unknown, args: { identifier: string }, context: ResolverContext) => {
    try {
      return await socialClient.get('/connections', {
        headers: getHeaders(context),
        params: { identifier: args.identifier }
      });
    } catch (error) {
      logger.error('resolver_socialConnections_error', { identifier: args.identifier, error });
      return [];
    }
  },

  // Location queries
  locationData: async (_: unknown, args: { identifier: string }, context: ResolverContext) => {
    try {
      return await locationClient.get('/lookup', {
        headers: getHeaders(context),
        params: { identifier: args.identifier }
      });
    } catch (error) {
      logger.error('resolver_locationData_error', { identifier: args.identifier, error });
      return null;
    }
  },

  // Forensics tools listing
  forensicsTools: async (_: unknown, __: unknown, context: ResolverContext) => {
    try {
      const result = await forensicsGatewayClient.getTools({
        headers: getHeaders(context)
      });
      return result.tools.map((tool: {
        name: string;
        description: string;
        endpoint: string;
        capabilities: string[];
      }) => ({
        name: tool.name,
        description: tool.description,
        endpoint: tool.endpoint,
        capabilities: tool.capabilities,
        mcpPort: parseInt(tool.endpoint.split(':').pop() || '0', 10)
      }));
    } catch (error) {
      logger.error('resolver_forensicsTools_error', { error });
      // Return default tools if gateway is unavailable
      return [
        { name: 'evidence', description: 'Evidence Ingestion', endpoint: 'http://localhost:3120', capabilities: ['whatsapp', 'email', 'cctv'], mcpPort: 3120 },
        { name: 'deepfake', description: 'Deepfake Detection', endpoint: 'http://localhost:3121', capabilities: ['image', 'video', 'audio'], mcpPort: 3121 },
        { name: 'custody', description: 'Chain of Custody', endpoint: 'http://localhost:3122', capabilities: ['legal', 'tracking'], mcpPort: 3122 },
        { name: 'forensics', description: 'Digital Forensics', endpoint: 'http://localhost:3123', capabilities: ['disk', 'mobile', 'ram'], mcpPort: 3123 },
        { name: 'social', description: 'Social Intelligence', endpoint: 'http://localhost:3130', capabilities: ['osint', 'networks'], mcpPort: 3130 },
        { name: 'financial', description: 'Financial Forensics', endpoint: 'http://localhost:3131', capabilities: ['invoice', 'fraud'], mcpPort: 3131 },
        { name: 'location', description: 'Location Intelligence', endpoint: 'http://localhost:3132', capabilities: ['gps', 'cell', 'ip'], mcpPort: 3132 },
        { name: 'reports', description: 'Expert Reports', endpoint: 'http://localhost:3133', capabilities: ['court', 'pdf'], mcpPort: 3133 }
      ];
    }
  }
};

// ===== FORENSICS MUTATION RESOLVERS =====
export const forensicsMutationResolvers = {
  // Investigation mutations
  createInvestigation: async (
    _: unknown,
    args: { input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await forensicsGatewayClient.startInvestigation(
        {
          query: args.input.query as string,
          type: args.input.type as string,
          priority: args.input.priority as string,
          mcpServices: args.input.mcpServices as string[]
        },
        { headers: getHeaders(context) }
      );
    } catch (error) {
      logger.error('resolver_createInvestigation_error', { input: args.input, error });
      throw error;
    }
  },

  updateInvestigation: async (
    _: unknown,
    args: { id: string; input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await forensicsClient.put(`/investigations/${args.id}`, args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_updateInvestigation_error', { args, error });
      throw error;
    }
  },

  deleteInvestigation: async (_: unknown, args: { id: string }, context: ResolverContext) => {
    try {
      await forensicsClient.delete(`/investigations/${args.id}`, {
        headers: getHeaders(context)
      });
      return true;
    } catch (error) {
      logger.error('resolver_deleteInvestigation_error', { id: args.id, error });
      return false;
    }
  },

  // Evidence mutations
  ingestEvidence: async (
    _: unknown,
    args: { input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await evidenceClient.post('/evidence', args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_ingestEvidence_error', { input: args.input, error });
      throw error;
    }
  },

  verifyEvidence: async (_: unknown, args: { hash: string }, context: ResolverContext) => {
    try {
      return await evidenceClient.post('/evidence/verify', { hash: args.hash }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_verifyEvidence_error', { hash: args.hash, error });
      throw error;
    }
  },

  // Deepfake mutations
  analyzeDeepfake: async (
    _: unknown,
    args: { input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await deepfakeClient.post('/analysis', args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_analyzeDeepfake_error', { input: args.input, error });
      throw error;
    }
  },

  // Chain of Custody mutations
  createCustodyChain: async (
    _: unknown,
    args: { evidenceId: string },
    context: ResolverContext
  ) => {
    try {
      return await custodyClient.post('/chain', { evidenceId: args.evidenceId }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_createCustodyChain_error', { evidenceId: args.evidenceId, error });
      throw error;
    }
  },

  transferCustody: async (
    _: unknown,
    args: { input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await custodyClient.post('/transfer', args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_transferCustody_error', { input: args.input, error });
      throw error;
    }
  },

  verifyChain: async (_: unknown, args: { evidenceId: string }, context: ResolverContext) => {
    try {
      return await custodyClient.post(`/chain/${args.evidenceId}/verify`, {}, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_verifyChain_error', { evidenceId: args.evidenceId, error });
      throw error;
    }
  },

  // Financial mutations
  analyzeFinancial: async (
    _: unknown,
    args: { input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await financialClient.post('/analysis', args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_analyzeFinancial_error', { input: args.input, error });
      throw error;
    }
  },

  // Social mutations
  lookupSocialProfile: async (
    _: unknown,
    args: { identifier: string; platform?: string },
    context: ResolverContext
  ) => {
    try {
      return await socialClient.post('/profile', {
        identifier: args.identifier,
        platform: args.platform
      }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_lookupSocialProfile_error', { identifier: args.identifier, error });
      throw error;
    }
  },

  analyzeSocialConnections: async (
    _: unknown,
    args: { identifier: string },
    context: ResolverContext
  ) => {
    try {
      return await socialClient.post('/connections', {
        identifier: args.identifier
      }, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_analyzeSocialConnections_error', { identifier: args.identifier, error });
      throw error;
    }
  },

  // Location mutations
  lookupLocation: async (
    _: unknown,
    args: { input: Record<string, unknown> },
    context: ResolverContext
  ) => {
    try {
      return await locationClient.post('/lookup', args.input, {
        headers: getHeaders(context)
      });
    } catch (error) {
      logger.error('resolver_lookupLocation_error', { input: args.input, error });
      throw error;
    }
  },

  // Report mutations
  generateForensicsReport: async (
    _: unknown,
    args: { investigationId: string; type: string; format?: string },
    context: ResolverContext
  ) => {
    try {
      const result = await forensicsGatewayClient.generateReport(
        {
          investigationId: args.investigationId,
          type: args.type,
          format: args.format
        },
        { headers: getHeaders(context) }
      );
      return { id: result.reportId, reportUrl: result.downloadUrl };
    } catch (error) {
      logger.error('resolver_generateForensicsReport_error', { args, error });
      throw error;
    }
  },

  // Full investigation
  runFullInvestigation: async (
    _: unknown,
    args: { query: string; priority?: string },
    context: ResolverContext
  ) => {
    try {
      return await forensicsGatewayClient.startInvestigation(
        {
          query: args.query,
          type: 'full',
          priority: args.priority || 'medium',
          mcpServices: ['evidence', 'deepfake', 'custody', 'forensics', 'social', 'financial', 'location', 'reports']
        },
        { headers: getHeaders(context) }
      );
    } catch (error) {
      logger.error('resolver_runFullInvestigation_error', { args, error });
      throw error;
    }
  }
};
