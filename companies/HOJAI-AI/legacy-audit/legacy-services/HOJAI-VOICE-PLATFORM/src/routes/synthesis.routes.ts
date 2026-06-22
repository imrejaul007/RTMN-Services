// ============================================================================
// HOJAI VOICE PLATFORM - Synthesis Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSynthesisService } from '../services/synthesis.service';
import { SupportedLanguage, SupportedVoice, TTSEngine } from '../types';

const router = Router();
const synthesisService = getSynthesisService();

// Validation schemas
const synthesizeSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
  language: z.enum(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN']).optional(),
  engine: z.enum(['elevenlabs', 'cartesia', 'sarvam']).optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
  pitch: z.number().min(0.5).max(2.0).optional(),
});

/**
 * Synthesize speech
 * POST /api/synthesis
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = synthesizeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const {
      text,
      voiceId = '预设-indian-female-1',
      language = 'en-IN',
      engine,
      speed,
      pitch,
    } = validationResult.data;

    const result = await synthesisService.synthesize(
      text,
      voiceId as SupportedVoice,
      language as SupportedLanguage,
      engine as TTSEngine | undefined,
      { speed, pitch }
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
 * Get available engines
 * GET /api/synthesis/engines
 */
router.get('/engines', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const engines = synthesisService.getAvailableEngines();
    const health = await synthesisService.getEngineHealth();

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
 * Get available voices
 * GET /api/synthesis/voices
 */
router.get('/voices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language, engine } = req.query;

    const allVoices = await synthesisService.getAvailableVoices();

    // Filter by language or engine if specified
    let voices = Object.values(allVoices).flat();

    if (engine) {
      voices = voices.filter(v => allVoices[engine as TTSEngine]?.some(av => av.id === v.id));
    }

    res.json({
      success: true,
      data: voices,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get best engine for language
 * GET /api/synthesis/engines/best
 */
router.get('/engines/best', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language = 'en-IN' } = req.query;

    const engine = synthesisService.getBestEngine(language as SupportedLanguage);

    res.json({
      success: true,
      data: {
        language,
        recommendedEngine: engine,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
