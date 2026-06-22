// ============================================================================
// HOJAI VOICE PLATFORM - Transcription Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTranscriptionService } from '../services/transcription.service';
import { AuthenticatedRequest, STTEngine } from '../types';

const router = Router();
const transcriptionService = getTranscriptionService();

// Validation schemas
const transcribeSchema = z.object({
  audio: z.string().min(1),
  language: z.enum(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN']).optional(),
  engine: z.enum(['whisper', 'sarvam', 'google']).optional(),
  mimeType: z.string().optional(),
});

/**
 * Transcribe audio
 * POST /api/transcription
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = transcribeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const { audio, language = 'en-IN', engine, mimeType } = validationResult.data;

    const result = await transcriptionService.transcribe(
      audio,
      language as any,
      engine as STTEngine | undefined
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get transcript by ID
 * GET /api/transcription/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transcript = await transcriptionService.getById(req.params.id);

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
 * Get full transcript text
 * GET /api/transcription/:id/text
 */
router.get('/:id/text', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { format = 'plain' } = req.query;

    const text = await transcriptionService.getFullText(req.params.id);

    if (text === null) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Transcript not found' },
      });
    }

    if (format === 'json') {
      return res.json({
        success: true,
        data: { text, transcriptId: req.params.id },
      });
    }

    // Return as plain text
    res.setHeader('Content-Type', 'text/plain');
    res.send(text);
  } catch (error) {
    next(error);
  }
});

/**
 * Get speaker summary
 * GET /api/transcription/:id/speakers
 */
router.get('/:id/speakers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await transcriptionService.getSpeakerSummary(req.params.id);

    if (!summary) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Transcript not found' },
      });
    }

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get STT engine health
 * GET /api/transcription/health
 */
router.get('/health/engines', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await transcriptionService.getEngineHealth();
    const engines = transcriptionService.getAvailableEngines();

    res.json({
      success: true,
      data: {
        engines,
        health,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * List transcripts by organization
 * GET /api/transcription
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Organization ID not found' } });
    }

    const {
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await transcriptionService.listByOrganization(organizationId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json({
      success: true,
      data: result.transcripts,
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

export default router;
