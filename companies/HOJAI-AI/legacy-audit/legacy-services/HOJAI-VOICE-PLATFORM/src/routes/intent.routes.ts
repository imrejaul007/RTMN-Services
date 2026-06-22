// ============================================================================
// HOJAI VOICE PLATFORM - Intent Routes
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getIntentService } from '../services/intent.service';
import { SupportedLanguage, IntentDefinition } from '../types';

const router = Router();
const intentService = getIntentService();

// Validation schemas
const analyzeSchema = z.object({
  text: z.string().min(1),
  intents: z.array(z.object({
    name: z.string(),
    description: z.string(),
    examples: z.array(z.string()),
    action: z.string(),
    parameters: z.record(z.any()).optional(),
    requiredParameters: z.array(z.string()).optional(),
    followUp: z.string().optional(),
    escalationThreshold: z.number().optional(),
  })),
  context: z.array(z.string()).optional(),
  language: z.enum(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN']).optional(),
});

const sentimentSchema = z.object({
  text: z.string().min(1),
  language: z.enum(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN']).optional(),
});

const extractEntitiesSchema = z.object({
  text: z.string().min(1),
  entityTypes: z.array(z.string()),
  language: z.enum(['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN']).optional(),
});

/**
 * Analyze text (intent + sentiment)
 * POST /api/intent/analyze
 */
router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = analyzeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const { text, intents, context, language = 'en-IN' } = validationResult.data;

    const result = await intentService.analyze(text, intents as IntentDefinition[], context, language as SupportedLanguage);

    res.json({
      success: true,
      data: {
        intent: result.intent,
        sentiment: result.sentiment,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Classify intent only
 * POST /api/intent/classify
 */
router.post('/classify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = analyzeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const { text, intents, context, language = 'en-IN' } = validationResult.data;

    const result = await intentService.classifyIntent(
      text,
      intents as IntentDefinition[],
      context,
      language as SupportedLanguage
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
 * Analyze sentiment only
 * POST /api/intent/sentiment
 */
router.post('/sentiment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = sentimentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const { text, language = 'en-IN' } = validationResult.data;

    const result = await intentService.analyzeSentiment(text, language as SupportedLanguage);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Extract entities
 * POST /api/intent/entities
 */
router.post('/entities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = extractEntitiesSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.errors,
        },
      });
    }

    const { text, entityTypes, language = 'en-IN' } = validationResult.data;

    const result = await intentService.extractEntities(text, entityTypes, language as SupportedLanguage);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Batch analyze
 * POST /api/intent/batch
 */
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Items must be an array' },
      });
    }

    const results = await intentService.batchAnalyze(items);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Detect sentiment shift
 * POST /api/intent/sentiment/shift
 */
router.post('/sentiment/shift', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { previousSentiments, currentSentiment } = req.body;

    if (!Array.isArray(previousSentiments) || !currentSentiment) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      });
    }

    const result = await intentService.detectSentimentShift(previousSentiments, currentSentiment);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
