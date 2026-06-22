// Transcription Routes

import { Router, Request, Response, NextFunction } from 'express';
import { transcriptionService } from '../services/transcriptionService.js';
import { logger } from '../utils/logger.js';

export const transcriptionRoutes = Router();

/**
 * POST /api/transcribe - Transcribe audio file
 */
transcriptionRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { audioUrl, language, speakerLabels, format } = req.body;
    const audioBuffer = req.file?.buffer;

    if (!audioUrl && !audioBuffer) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'audioUrl or audio file is required' },
      });
      return;
    }

    logger.info(`Transcription request received`, {
      hasAudioBuffer: !!audioBuffer,
      hasAudioUrl: !!audioUrl,
      language,
    });

    const result = await transcriptionService.transcribe({
      audioUrl,
      audioBuffer,
      language,
      speakerLabels,
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
 * POST /api/transcribe/medical - Transcribe medical audio with entity extraction
 */
transcriptionRoutes.post('/medical', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { audioUrl, language, extractEntities, speakerCount } = req.body;
    const audioBuffer = req.file?.buffer;

    if (!audioUrl && !audioBuffer) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'audioUrl or audio file is required' },
      });
      return;
    }

    logger.info(`Medical transcription request received`, {
      extractEntities,
      speakerCount,
    });

    const result = await transcriptionService.transcribe({
      audioUrl,
      audioBuffer,
      language,
      speakerLabels: speakerCount ? true : false,
    });

    // If entity extraction is requested, we would call medicalNlpService
    // For now, return the transcription
    res.json({
      success: true,
      data: {
        ...result,
        entities: extractEntities ? { medications: [], diagnoses: [], symptoms: [] } : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/transcribe/:id - Get transcription by ID
 */
transcriptionRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // In production, fetch from database
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Transcription not found' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/transcribe/:id/subtitles - Generate subtitles from transcription
 */
transcriptionRoutes.post('/:id/subtitles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { format = 'srt', maxLength = 80 } = req.body;

    // Get word timings for the transcription
    const wordTimings = await transcriptionService.getWordTimings(id);

    // Generate subtitles based on format
    let subtitles: string;
    if (format === 'srt') {
      subtitles = generateSRT(wordTimings, maxLength);
    } else {
      subtitles = generateVTT(wordTimings, maxLength);
    }

    res.json({
      success: true,
      data: {
        format,
        subtitles,
        wordCount: wordTimings.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

function generateSRT(words: { word: string; start: number; end: number }[], maxLength: number): string {
  let srt = '';
  let index = 1;
  let currentLine = '';
  let currentStart = 0;
  let currentEnd = 0;

  words.forEach((word, i) => {
    if (currentLine.length + word.word.length + 1 <= maxLength) {
      if (!currentLine) {
        currentStart = word.start;
      }
      currentLine += (currentLine ? ' ' : '') + word.word;
      currentEnd = word.end;
    } else {
      if (currentLine) {
        srt += `${index}\n`;
        srt += `${formatTimeSRT(currentStart)} --> ${formatTimeSRT(currentEnd)}\n`;
        srt += `${currentLine}\n\n`;
        index++;
      }
      currentLine = word.word;
      currentStart = word.start;
      currentEnd = word.end;
    }
  });

  // Add last line
  if (currentLine) {
    srt += `${index}\n`;
    srt += `${formatTimeSRT(currentStart)} --> ${formatTimeSRT(currentEnd)}\n`;
    srt += `${currentLine}\n`;
  }

  return srt;
}

function generateVTT(words: { word: string; start: number; end: number }[], maxLength: number): string {
  const srt = generateSRT(words, maxLength);
  return 'WEBVTT\n\n' + srt;
}

function formatTimeSRT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
