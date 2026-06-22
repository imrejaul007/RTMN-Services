// Synthesis Routes - Text to Speech

import { Router, Request, Response, NextFunction } from 'express';
import { synthesisService } from '../services/synthesisService.js';
import { logger } from '../utils/logger.js';

export const synthesisRoutes = Router();

/**
 * POST /api/synthesize - Convert text to speech
 */
synthesisRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, voiceId, language, speed, format } = req.body;

    if (!text) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'text is required' },
      });
      return;
    }

    logger.info(`Synthesis request received`, {
      textLength: text.length,
      voiceId,
      language,
    });

    const result = await synthesisService.synthesize({
      text,
      voiceId,
      language,
      speed: speed || 1,
      format: format || 'mp3',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/synthesize/voices - List available voice templates
 */
synthesisRoutes.get('/voices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language } = req.query;

    let voices = synthesisService.getVoiceTemplates();

    if (language) {
      voices = synthesisService.getVoicesByLanguage(language as string);
    }

    res.json({
      success: true,
      data: {
        voices,
        languages: [...new Set(voices.map((v) => v.language))],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/synthesize/healthcare - Generate healthcare-specific message
 */
synthesisRoutes.post('/healthcare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, content, language } = req.body;

    if (!type || !content) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'type and content are required' },
      });
      return;
    }

    const validTypes = ['reminder', 'instruction', 'alert', 'summary'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `type must be one of: ${validTypes.join(', ')}`,
        },
      });
      return;
    }

    logger.info(`Healthcare synthesis request`, { type, contentLength: content.length });

    const result = await synthesisService.generateHealthcareMessage(type, content, language || 'en');

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/synthesize/batch - Batch synthesis multiple texts
 */
synthesisRoutes.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { texts, voiceId, language, format } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'texts array is required' },
      });
      return;
    }

    if (texts.length > 10) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Maximum 10 texts per batch' },
      });
      return;
    }

    logger.info(`Batch synthesis request`, { count: texts.length });

    const results = await Promise.all(
      texts.map((text: string) =>
        synthesisService.synthesize({
          text,
          voiceId,
          language,
          format: format || 'mp3',
        })
      )
    );

    res.json({
      success: true,
      data: {
        results,
        count: results.length,
      },
    });
  } catch (error) {
    next(error);
  }
});
