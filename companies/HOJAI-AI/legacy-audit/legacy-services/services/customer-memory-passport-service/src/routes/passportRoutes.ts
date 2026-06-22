import { Router, Request, Response, NextFunction } from 'express';
import { passportService } from '../services/passportService.js';
import { contextService } from '../services/contextService.js';
import { memoryGraphService } from '../services/memoryGraphService.js';
import {
  validateCreatePassport,
  validateAddMemory,
  validateUpdateMemory,
  validateDeleteMemory,
  validateMemoryFilters,
  validateSearchQuery,
  validateLinkCompany,
  validateContextOptions,
  validateCreateNode,
  validateCreateEdge,
  validateFindPath,
  validateAddInteraction,
  validateMergePassports,
  validateCustomerId,
  validateMemoryId,
} from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const sendSuccess = (res: Response, data: unknown, message?: string, statusCode = 200): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void => {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  });
};

// ============================================
// PASSPORT CRUD
// ============================================

router.post(
  '/passport',
  validateCreatePassport,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    const passport = await passportService.createPassport(req.body);

    logger.info('Passport created via API', {
      customerId: req.body.customerId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, passport, 'Passport created successfully', 201);
  })
);

router.get(
  '/passport/:customerId',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const startTime = Date.now();

    const passport = await passportService.getPassport(customerId);

    if (!passport) {
      sendError(res, 404, 'NOT_FOUND', `Passport not found for customer: ${customerId}`);
      return;
    }

    logger.info('Passport retrieved via API', {
      customerId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, passport);
  })
);

// ============================================
// MEMORY OPERATIONS
// ============================================

router.put(
  '/passport/:customerId/memory',
  validateCustomerId,
  validateAddMemory,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const startTime = Date.now();

    const memory = await passportService.addMemory(customerId, req.body);

    logger.info('Memory added via API', {
      customerId,
      memoryId: memory.id,
      type: memory.type,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, memory, 'Memory added successfully', 201);
  })
);

router.get(
  '/passport/:customerId/memories',
  validateCustomerId,
  validateMemoryFilters,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const startTime = Date.now();

    const filters = {
      type: req.query.type as any,
      importance: req.query.importance as any,
      tags: req.query.tags as string[],
      source: req.query.source as string,
      channel: req.query.channel as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      includeDeleted: req.query.includeDeleted === 'true',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await passportService.getMemories(customerId, filters);

    logger.info('Memories retrieved via API', {
      customerId,
      total: result.total,
      returned: result.memories.length,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, result);
  })
);

router.get(
  '/passport/:customerId/timeline',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const startTime = Date.now();

    const timeline = await passportService.getMemoryTimeline(customerId, limit);

    logger.info('Timeline retrieved via API', {
      customerId,
      count: timeline.length,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, timeline);
  })
);

router.put(
  '/passport/memory/:memoryId',
  validateMemoryId,
  validateUpdateMemory,
  asyncHandler(async (req: Request, res: Response) => {
    const { memoryId } = req.params;
    const startTime = Date.now();

    const memory = await passportService.updateMemory(memoryId, req.body);

    if (!memory) {
      sendError(res, 404, 'NOT_FOUND', `Memory not found: ${memoryId}`);
      return;
    }

    logger.info('Memory updated via API', {
      memoryId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, memory, 'Memory updated successfully');
  })
);

router.delete(
  '/passport/memory/:memoryId',
  validateMemoryId,
  asyncHandler(async (req: Request, res: Response) => {
    const { memoryId } = req.params;
    const { deletedBy } = req.body || {};
    const startTime = Date.now();

    const deleted = await passportService.deleteMemory(memoryId, deletedBy);

    if (!deleted) {
      sendError(res, 404, 'NOT_FOUND', `Memory not found: ${memoryId}`);
      return;
    }

    logger.info('Memory deleted via API', {
      memoryId,
      deletedBy,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, null, 'Memory deleted successfully');
  })
);

router.get(
  '/passport/:customerId/search',
  validateCustomerId,
  validateSearchQuery,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const { query, limit, offset, types, companyId } = req.query as {
      query: string;
      limit?: number;
      offset?: number;
      types?: string[];
      companyId?: string;
    };
    const startTime = Date.now();

    const result = await passportService.searchMemories(customerId, {
      query,
      limit,
      offset,
      types: types as any,
      companyId,
    });

    logger.info('Memories searched via API', {
      customerId,
      query,
      total: result.total,
      returned: result.memories.length,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, result);
  })
);

// ============================================
// COMPANY CONTEXT
// ============================================

router.post(
  '/passport/:customerId/link/:companyId',
  validateCustomerId,
  validateLinkCompany,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, companyId } = req.params;
    const startTime = Date.now();

    const companyContext = await passportService.linkToCompany(customerId, {
      companyId,
      companyName: req.body.companyName,
      linkedBy: req.body.linkedBy,
      status: req.body.status,
      lifetimeValue: req.body.lifetimeValue,
      engagementScore: req.body.engagementScore,
      preferences: req.body.preferences,
    });

    logger.info('Company linked via API', {
      customerId,
      companyId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, companyContext, 'Company linked successfully', 201);
  })
);

router.get(
  '/passport/:customerId/context/:companyId',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, companyId } = req.params;
    const startTime = Date.now();

    const context = await passportService.getCompanyContext(customerId, companyId);

    if (!context) {
      sendError(
        res,
        404,
        'NOT_FOUND',
        `Company context not found for customer: ${customerId}, company: ${companyId}`
      );
      return;
    }

    logger.info('Company context retrieved via API', {
      customerId,
      companyId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, context);
  })
);

// ============================================
// CONTEXT SERVICE ROUTES
// ============================================

router.get(
  '/passport/:customerId/conversation-context',
  validateCustomerId,
  validateContextOptions,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const { companyId, includeMemories, includeInteractions, includePreferences, includeSentiment, includePatterns } = req.query as {
      companyId?: string;
      includeMemories?: number;
      includeInteractions?: number;
      includePreferences?: boolean;
      includeSentiment?: boolean;
      includePatterns?: boolean;
    };
    const startTime = Date.now();

    const context = await contextService.buildConversationContext(customerId, companyId, {
      includeMemories,
      includeInteractions,
      includePreferences,
      includeSentiment,
      includePatterns,
    });

    logger.info('Conversation context built via API', {
      customerId,
      companyId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, context);
  })
);

router.get(
  '/passport/:customerId/history',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const startTime = Date.now();

    const history = await contextService.getRecentHistory(customerId, limit);

    logger.info('History retrieved via API', {
      customerId,
      count: history.length,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, history);
  })
);

router.get(
  '/passport/:customerId/preferences',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const companyId = req.query.companyId as string | undefined;
    const startTime = Date.now();

    const preferences = await contextService.getPreferences(customerId, companyId);

    logger.info('Preferences retrieved via API', {
      customerId,
      companyId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, preferences);
  })
);

router.get(
  '/passport/:customerId/sentiment',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const companyId = req.query.companyId as string | undefined;
    const startTime = Date.now();

    const sentimentHistory = await contextService.getSentimentHistory(customerId, days);

    logger.info('Sentiment history retrieved via API', {
      customerId,
      days,
      companyId,
      count: sentimentHistory.length,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, sentimentHistory);
  })
);

router.get(
  '/passport/:customerId/patterns',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const companyId = req.query.companyId as string | undefined;
    const startTime = Date.now();

    const patterns = await contextService.detectPatterns(customerId, companyId);

    logger.info('Patterns detected via API', {
      customerId,
      companyId,
      count: patterns.length,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, patterns);
  })
);

// ============================================
// MEMORY GRAPH ROUTES
// ============================================

router.get(
  '/passport/:customerId/graph',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const startTime = Date.now();

    const graph = await memoryGraphService.getGraph(customerId);

    if (!graph) {
      sendError(res, 404, 'NOT_FOUND', `Graph not found for customer: ${customerId}`);
      return;
    }

    logger.info('Graph retrieved via API', {
      customerId,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, graph);
  })
);

router.post(
  '/passport/:customerId/graph/nodes',
  validateCustomerId,
  validateCreateNode,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const startTime = Date.now();

    const node = await memoryGraphService.createGraphNode(customerId, req.body);

    if (!node) {
      sendError(res, 404, 'NOT_FOUND', `Passport not found for customer: ${customerId}`);
      return;
    }

    logger.info('Graph node created via API', {
      customerId,
      nodeId: node.id,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, node, 'Node created successfully', 201);
  })
);

router.post(
  '/passport/:customerId/graph/edges',
  validateCustomerId,
  validateCreateEdge,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const startTime = Date.now();

    const edge = await memoryGraphService.connectNodes(customerId, req.body);

    if (!edge) {
      sendError(res, 400, 'INVALID_REQUEST', 'Failed to create edge - nodes may not exist');
      return;
    }

    logger.info('Graph edge created via API', {
      customerId,
      edgeId: edge.id,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, edge, 'Edge created successfully', 201);
  })
);

router.get(
  '/passport/:customerId/graph/path',
  validateCustomerId,
  validateFindPath,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const { startType, endType } = req.query as { startType: string; endType: string };
    const startTime = Date.now();

    const path = await memoryGraphService.findPath(
      customerId,
      startType as any,
      endType as any
    );

    if (!path) {
      sendError(res, 404, 'NOT_FOUND', 'No path found between specified node types');
      return;
    }

    logger.info('Path found via API', {
      customerId,
      startType,
      endType,
      pathLength: path.path.length,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, path);
  })
);

router.get(
  '/passport/:customerId/graph/related/:entityId',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, entityId } = req.params;
    const depth = req.query.depth ? parseInt(req.query.depth as string) : 1;
    const startTime = Date.now();

    const related = await memoryGraphService.getRelatedEntities(customerId, entityId, depth);

    logger.info('Related entities retrieved via API', {
      customerId,
      entityId,
      depth,
      count: related.length,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, related);
  })
);

router.get(
  '/passport/:customerId/graph/stats',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const startTime = Date.now();

    const stats = await memoryGraphService.getGraphStats(customerId);

    if (!stats) {
      sendError(res, 404, 'NOT_FOUND', `Graph not found for customer: ${customerId}`);
      return;
    }

    logger.info('Graph stats retrieved via API', {
      customerId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, stats);
  })
);

router.get(
  '/passport/:customerId/health-score',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const startTime = Date.now();

    const healthScore = await memoryGraphService.calculateHealthScore(customerId);

    logger.info('Health score calculated via API', {
      customerId,
      score: healthScore.overall,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, healthScore);
  })
);

router.delete(
  '/passport/:customerId/graph/nodes/:nodeId',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, nodeId } = req.params;
    const startTime = Date.now();

    const deleted = await memoryGraphService.deleteNode(customerId, nodeId);

    if (!deleted) {
      sendError(res, 404, 'NOT_FOUND', 'Node not found or cannot be deleted');
      return;
    }

    logger.info('Graph node deleted via API', {
      customerId,
      nodeId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, null, 'Node deleted successfully');
  })
);

router.delete(
  '/passport/:customerId/graph/edges/:edgeId',
  validateCustomerId,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, edgeId } = req.params;
    const startTime = Date.now();

    const deleted = await memoryGraphService.deleteEdge(customerId, edgeId);

    if (!deleted) {
      sendError(res, 404, 'NOT_FOUND', 'Edge not found');
      return;
    }

    logger.info('Graph edge deleted via API', {
      customerId,
      edgeId,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, null, 'Edge deleted successfully');
  })
);

// ============================================
// INTERACTION ROUTES
// ============================================

router.post(
  '/passport/:customerId/interactions',
  validateCustomerId,
  validateAddInteraction,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const startTime = Date.now();

    const passport = await passportService.getPassport(customerId);

    if (!passport) {
      sendError(res, 404, 'NOT_FOUND', `Passport not found for customer: ${customerId}`);
      return;
    }

    const { CustomerMemoryPassportModel } = await import('../models/passport.js');
    const { v4: uuidv4 } = await import('uuid');

    const interaction = {
      id: uuidv4(),
      ...req.body,
      timestamp: new Date(req.body.timestamp),
    };

    const updatedPassport = await CustomerMemoryPassportModel.findOneAndUpdate(
      { customerId },
      {
        $push: { interactions: interaction },
        $inc: { totalInteractions: 1 },
        $set: { lastActivity: new Date() },
      },
      { new: true }
    );

    logger.info('Interaction added via API', {
      customerId,
      interactionId: interaction.id,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, interaction, 'Interaction added successfully', 201);
  })
);

// ============================================
// MERGE ROUTES
// ============================================

router.post(
  '/passport/merge',
  validateMergePassports,
  asyncHandler(async (req: Request, res: Response) => {
    const { sourceId, targetId, strategy } = req.body;
    const startTime = Date.now();

    const merged = await passportService.mergePassports(sourceId, targetId, strategy);

    if (!merged) {
      sendError(res, 404, 'NOT_FOUND', 'One or both passports not found');
      return;
    }

    logger.info('Passports merged via API', {
      sourceId,
      targetId,
      strategy,
      duration: Date.now() - startTime,
    });

    sendSuccess(res, merged, 'Passports merged successfully');
  })
);

// ============================================
// HEALTH CHECK
// ============================================

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'memory-passport-service',
    timestamp: new Date().toISOString(),
  });
});

export default router;
