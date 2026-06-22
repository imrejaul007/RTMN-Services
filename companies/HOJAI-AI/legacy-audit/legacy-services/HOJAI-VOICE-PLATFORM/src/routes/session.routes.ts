// ============================================================================
// HOJAI VOICE PLATFORM - Session Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSessionService } from '../services/session.service';
import { AuthenticatedRequest } from '../types';

const router = Router();
const sessionService = getSessionService();

// Validation schemas
const startSessionSchema = z.object({
  agentId: z.string().min(1),
  callId: z.string().optional(),
  customerId: z.string().optional(),
  customerPhone: z.string().optional(),
  language: z.enum(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN']).optional(),
  context: z.object({
    customerName: z.string().optional(),
    customerEmail: z.string().email().optional(),
    previousInteractions: z.number().optional(),
    preferences: z.record(z.any()).optional(),
    customData: z.record(z.any()).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
  audioUrl: z.string().optional(),
});

/**
 * Start a new session
 * POST /api/sessions
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const validationResult = startSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const { session, agent } = await sessionService.start(validationResult.data, organizationId);

    // Emit greeting via WebSocket would happen here
    // For now, return session info

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        agentId: session.agentId,
        language: session.language,
        status: session.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get session by ID
 * GET /api/sessions/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const session = await sessionService.getById(req.params.id, organizationId);

    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * List sessions
 * GET /api/sessions
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const {
      agentId,
      status,
      customerId,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await sessionService.list(organizationId, {
      agentId: agentId as string,
      status: status as any,
      customerId: customerId as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      data: result.sessions,
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
 * Send message in session
 * POST /api/sessions/:id/message
 */
router.post('/:id/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const validationResult = sendMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const result = await sessionService.sendMessage(
      req.params.id,
      organizationId,
      validationResult.data.content
    );

    res.json({
      success: true,
      data: {
        userMessage: result.message,
        response: result.response,
        intent: result.intent,
        sentiment: result.sentiment,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Process audio in session
 * POST /api/sessions/:id/audio
 */
router.post('/:id/audio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { audio, mimeType = 'audio/webm' } = req.body;

    if (!audio) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Audio data is required' },
      });
    }

    const result = await sessionService.processAudio(
      req.params.id,
      organizationId,
      audio,
      mimeType
    );

    res.json({
      success: true,
      data: {
        text: result.text,
        response: result.response,
        responseAudio: result.responseAudio,
        intent: result.intent,
        confidence: result.confidence,
        sentiment: result.sentiment,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get session history
 * GET /api/sessions/:id/history
 */
router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const session = await sessionService.getHistory(req.params.id, organizationId);

    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        messageHistory: session.messageHistory,
        context: session.context,
        startTime: session.startTime,
        endTime: session.endTime,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * End session
 * POST /api/sessions/:id/end
 */
router.post('/:id/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const session = await sessionService.end(req.params.id, organizationId);

    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get session statistics
 * GET /api/sessions/:id/stats
 */
router.get('/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const stats = await sessionService.getStats(req.params.id, organizationId);

    if (!stats) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update session context
 * PATCH /api/sessions/:id/context
 */
router.patch('/:id/context', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { customerName, customerEmail, preferences, customData } = req.body;

    const session = await sessionService.updateContext(req.params.id, organizationId, {
      customerName,
      customerEmail,
      preferences,
      customData,
    });

    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get active sessions count
 * GET /api/sessions/active/count
 */
router.get('/active/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = sessionService.getActiveSessionsCount();

    res.json({
      success: true,
      data: { activeSessions: count },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
