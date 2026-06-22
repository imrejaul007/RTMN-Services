// ============================================================================
// HOJAI VOICE PLATFORM - Call Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getCallService } from '../services/call.service';
import { getTranscriptionService } from '../services/transcription.service';
import { AuthenticatedRequest } from '../types';

const router = Router();
const callService = getCallService();
const transcriptionService = getTranscriptionService();

// Validation schemas
const createCallSchema = z.object({
  to: z.string().min(1),
  from: z.string().optional(),
  agentId: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

const transferCallSchema = z.object({
  transferTo: z.string().min(1),
});

/**
 * Initiate outbound call
 * POST /api/calls
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const validationResult = createCallSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const call = await callService.initiateCall(validationResult.data, organizationId);

    res.status(201).json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * List calls
 * GET /api/calls
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
      direction,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await callService.list(organizationId, {
      agentId: agentId as string,
      status: status as any,
      direction: direction as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      data: result.calls,
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
 * Get call by ID
 * GET /api/calls/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const call = await callService.getById(req.params.id, organizationId);

    if (!call) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Call not found' },
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Transfer call
 * POST /api/calls/:id/transfer
 */
router.post('/:id/transfer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const validationResult = transferCallSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const result = await callService.transfer(req.params.id, organizationId, validationResult.data.transferTo);

    if (!result.success) {
      return res.status(400).json({
        error: { code: 'TRANSFER_FAILED', message: result.message },
      });
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get call transcript
 * GET /api/calls/:id/transcript
 */
router.get('/:id/transcript', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const transcript = await transcriptionService.getByCallId(req.params.id);

    if (!transcript) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Transcript not found' },
      });
    }

    res.json({
      success: true,
      data: transcript,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * End call
 * POST /api/calls/:id/end
 */
router.post('/:id/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { reason } = req.body;

    const call = await callService.endCall(req.params.id, organizationId, reason);

    if (!call) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Call not found' },
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get call statistics
 * GET /api/calls/stats
 */
router.get('/stats/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { startDate, endDate } = req.query;

    const stats = await callService.getStats(
      organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get recent calls
 * GET /api/calls/recent
 */
router.get('/list/recent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const { limit = '10' } = req.query;

    const calls = await callService.getRecent(organizationId, parseInt(limit as string, 10));

    res.json({
      success: true,
      data: calls,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
