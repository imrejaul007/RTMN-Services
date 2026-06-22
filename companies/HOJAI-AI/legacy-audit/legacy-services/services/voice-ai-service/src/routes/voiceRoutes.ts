// Voice Routes - Recording session management

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export const voiceRoutes = Router();

interface RecordingSession {
  id: string;
  profileId: string;
  status: 'pending' | 'recording' | 'paused' | 'completed' | 'failed';
  startedAt: string;
  endedAt?: string;
  duration?: number;
  audioFormat: string;
  sampleRate: number;
  channels: number;
  fileUrl?: string;
  transcriptId?: string;
  summaryId?: string;
  metadata: Record<string, any>;
}

// In-memory session store (use Redis in production)
const sessions = new Map<string, RecordingSession>();

/**
 * POST /api/voice/session - Start a new recording session
 */
voiceRoutes.post('/session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId, audioFormat, sampleRate, channels, metadata } = req.body;

    if (!profileId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'profileId is required' },
      });
      return;
    }

    const session: RecordingSession = {
      id: `voice_session_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
      profileId,
      status: 'pending',
      startedAt: new Date().toISOString(),
      audioFormat: audioFormat || 'mp3',
      sampleRate: sampleRate || 44100,
      channels: channels || 1,
      metadata: metadata || {},
    };

    sessions.set(session.id, session);

    logger.info(`Recording session created`, { sessionId: session.id, profileId });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        status: session.status,
        audioFormat: session.audioFormat,
        sampleRate: session.sampleRate,
        channels: session.channels,
        startedAt: session.startedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/voice/session/:id/start - Start recording
 */
voiceRoutes.post('/session/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = sessions.get(id);

    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording session not found' },
      });
      return;
    }

    session.status = 'recording';
    session.startedAt = new Date().toISOString();
    sessions.set(id, session);

    logger.info(`Recording started`, { sessionId: id });

    res.json({
      success: true,
      data: { sessionId: id, status: 'recording', startedAt: session.startedAt },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/voice/session/:id/pause - Pause recording
 */
voiceRoutes.post('/session/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = sessions.get(id);

    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording session not found' },
      });
      return;
    }

    if (session.status !== 'recording') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Session is not recording' },
      });
      return;
    }

    session.status = 'paused';
    sessions.set(id, session);

    logger.info(`Recording paused`, { sessionId: id });

    res.json({
      success: true,
      data: { sessionId: id, status: 'paused' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/voice/session/:id/resume - Resume recording
 */
voiceRoutes.post('/session/:id/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = sessions.get(id);

    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording session not found' },
      });
      return;
    }

    if (session.status !== 'paused') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Session is not paused' },
      });
      return;
    }

    session.status = 'recording';
    sessions.set(id, session);

    logger.info(`Recording resumed`, { sessionId: id });

    res.json({
      success: true,
      data: { sessionId: id, status: 'recording' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/voice/session/:id/stop - Stop recording and complete
 */
voiceRoutes.post('/session/:id/stop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { fileUrl } = req.body;
    const session = sessions.get(id);

    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording session not found' },
      });
      return;
    }

    if (session.status !== 'recording' && session.status !== 'paused') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Session is not active' },
      });
      return;
    }

    session.status = 'completed';
    session.endedAt = new Date().toISOString();
    session.fileUrl = fileUrl;

    // Calculate duration
    if (session.startedAt && session.endedAt) {
      session.duration = Math.round(
        (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
      );
    }

    sessions.set(id, session);

    logger.info(`Recording completed`, {
      sessionId: id,
      duration: session.duration,
      hasFile: !!fileUrl,
    });

    res.json({
      success: true,
      data: {
        sessionId: id,
        status: 'completed',
        duration: session.duration,
        fileUrl: session.fileUrl,
        canTranscribe: !!fileUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/voice/session/:id - Get session details
 */
voiceRoutes.get('/session/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = sessions.get(id);

    if (!session) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording session not found' },
      });
      return;
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
 * GET /api/voice/sessions - List sessions for a profile
 */
voiceRoutes.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId, status, limit = 20, offset = 0 } = req.query;

    let results = Array.from(sessions.values());

    if (profileId) {
      results = results.filter((s) => s.profileId === profileId);
    }

    if (status) {
      results = results.filter((s) => s.status === status);
    }

    // Sort by startedAt descending
    results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const total = results.length;
    const paginated = results.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: {
        sessions: paginated,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + paginated.length < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/voice/session/:id - Delete a session
 */
voiceRoutes.delete('/session/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!sessions.has(id)) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording session not found' },
      });
      return;
    }

    sessions.delete(id);

    logger.info(`Recording session deleted`, { sessionId: id });

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    next(error);
  }
});
