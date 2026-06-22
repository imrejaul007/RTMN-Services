// ============================================================================
// HOJAI VOICE PLATFORM - Agent Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getAgentService } from '../services/agent.service';
import { AuthenticatedRequest } from '../types';

const router = Router();
const agentService = getAgentService();

// Validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['customer-service', 'voice-commerce', 'voice-search', 'appointment']),
  language: z.enum(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN']).optional(),
  voiceConfig: z.object({
    voiceId: z.string().optional(),
    ttsEngine: z.enum(['elevenlabs', 'cartesia', 'sarvam']).optional(),
    sttEngine: z.enum(['whisper', 'sarvam', 'google']).optional(),
    speed: z.number().min(0.5).max(2.0).optional(),
    pitch: z.number().min(0.5).max(2.0).optional(),
    volume: z.number().min(0).max(1).optional(),
  }).optional(),
  greeting: z.string().max(500).optional(),
  farewell: z.string().max(500).optional(),
  intents: z.array(z.object({
    name: z.string(),
    description: z.string(),
    examples: z.array(z.string()),
    action: z.string(),
    parameters: z.record(z.any()).optional(),
    requiredParameters: z.array(z.string()).optional(),
    followUp: z.string().optional(),
    escalationThreshold: z.number().optional(),
  })).optional(),
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['regex', 'list', 'builtin']),
    values: z.array(z.string()).optional(),
    patterns: z.array(z.string()).optional(),
    builtinType: z.enum(['date', 'time', 'number', 'phone', 'email']).optional(),
  })).optional(),
  contextWindow: z.number().min(1).max(50).optional(),
  escalationNumber: z.string().optional(),
});

const updateAgentSchema = createAgentSchema.partial();

/**
 * Create a new voice agent
 * POST /api/agents
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const validationResult = createAgentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const agent = await agentService.create(validationResult.data, organizationId);

    res.status(201).json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * List all agents for organization
 * GET /api/agents
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const {
      type,
      status,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await agentService.list(organizationId, {
      type: type as any,
      status: status as any,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      data: result.agents,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit as string, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get agent by ID
 * GET /api/agents/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const agent = await agentService.getById(req.params.id, organizationId);

    if (!agent) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update agent
 * PUT /api/agents/:id
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const validationResult = updateAgentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const agent = await agentService.update(req.params.id, organizationId, validationResult.data);

    if (!agent) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete agent
 * DELETE /api/agents/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const deleted = await agentService.delete(req.params.id, organizationId);

    if (!deleted) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add intent to agent
 * POST /api/agents/:id/intents
 */
router.post('/:id/intents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const agent = await agentService.addIntent(req.params.id, organizationId, req.body);

    if (!agent) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Remove intent from agent
 * DELETE /api/agents/:id/intents/:intentId
 */
router.delete('/:id/intents/:intentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const agent = await agentService.removeIntent(req.params.id, organizationId, req.params.intentId);

    if (!agent) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update agent status
 * PATCH /api/agents/:id/status
 */
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { status } = req.body;

    if (!['active', 'inactive', 'training', 'error'].includes(status)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid status' },
      });
    }

    const agent = await agentService.updateStatus(req.params.id, organizationId, status);

    if (!agent) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Duplicate agent
 * POST /api/agents/:id/duplicate
 */
router.post('/:id/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Name is required' },
      });
    }

    const agent = await agentService.duplicate(req.params.id, organizationId, name);

    if (!agent) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.status(201).json({
      success: true,
      data: agent,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get agent statistics
 * GET /api/agents/:id/stats
 */
router.get('/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const stats = await agentService.getStats(req.params.id, organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Train agent
 * POST /api/agents/:id/train
 */
router.post('/:id/train', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const result = await agentService.train(req.params.id, organizationId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
