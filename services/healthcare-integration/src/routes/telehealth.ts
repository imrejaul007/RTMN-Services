import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { logger } from '../services/logger';
import { TelehealthSession, ApiResponse, PaginatedResponse } from '../models/PatientProfile';

const router = Router();
const customerOpsBridge = new CustomerOpsBridge();

// In-memory store (replace with database in production)
const telehealthSessions: Map<string, TelehealthSession> = new Map();

// Get all telehealth sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const patientId = req.query.patientId as string;
    const providerId = req.query.providerId as string;
    const status = req.query.status as string;

    let sessions = Array.from(telehealthSessions.values());

    if (patientId) {
      sessions = sessions.filter(s => s.patientId === patientId);
    }
    if (providerId) {
      sessions = sessions.filter(s => s.providerId === providerId);
    }
    if (status) {
      sessions = sessions.filter(s => s.status === status);
    }

    sessions.sort((a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );

    const total = sessions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedSessions = sessions.slice(startIndex, startIndex + limit);

    const response: PaginatedResponse<TelehealthSession> = {
      success: true,
      data: paginatedSessions,
      pagination: { page, limit, total, totalPages },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching telehealth sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch telehealth sessions',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get telehealth session by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = telehealthSessions.get(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Telehealth session not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const response: ApiResponse<TelehealthSession> = {
      success: true,
      data: session,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching telehealth session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch telehealth session',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Schedule telehealth session
router.post('/', async (req: Request, res: Response) => {
  try {
    const sessionData: Omit<TelehealthSession, 'id' | 'createdAt' | 'updatedAt' | 'voiceAIConversationId'> = req.body;

    const session: TelehealthSession = {
      ...sessionData,
      id: `TH-${uuidv4().substring(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as TelehealthSession;

    telehealthSessions.set(session.id, session);

    // Initialize Voice AI Runtime session
    try {
      const voiceAIResult = await customerOpsBridge.initializeVoiceAISession({
        sessionId: session.id,
        patientId: session.patientId,
        providerId: session.providerId,
        sessionType: session.sessionType,
        scheduledAt: session.scheduledAt
      });

      if (voiceAIResult.success && voiceAIResult.data) {
        session.voiceAIConversationId = (voiceAIResult.data as any).conversationId;
        telehealthSessions.set(session.id, session);
      }
    } catch (voiceAIError) {
      logger.warn('Voice AI initialization failed:', voiceAIError);
    }

    // Publish telehealth scheduled event
    try {
      await customerOpsBridge.publishEvent('telehealth.scheduled', {
        sessionId: session.id,
        patientId: session.patientId,
        providerId: session.providerId,
        scheduledAt: session.scheduledAt,
        sessionType: session.sessionType
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<TelehealthSession> = {
      success: true,
      data: session,
      message: 'Telehealth session scheduled and Voice AI initialized',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error scheduling telehealth session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule telehealth session',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Start telehealth session (join call)
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = telehealthSessions.get(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Telehealth session not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    if (session.status === 'in-progress') {
      return res.status(400).json({
        success: false,
        error: 'Session already in progress',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    session.status = 'in-progress';
    session.startedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    telehealthSessions.set(id, session);

    // Activate Voice AI Runtime
    if (session.voiceAIConversationId) {
      try {
        await customerOpsBridge.activateVoiceAI(session.voiceAIConversationId);
      } catch (voiceAIError) {
        logger.warn('Voice AI activation failed:', voiceAIError);
      }
    }

    // Publish session started event
    try {
      await customerOpsBridge.publishEvent('telehealth.started', {
        sessionId: session.id,
        patientId: session.patientId,
        startedAt: session.startedAt
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<TelehealthSession> = {
      success: true,
      data: session,
      message: 'Telehealth session started',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error starting telehealth session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start telehealth session',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// End telehealth session
router.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, prescriptionIds, followUpScheduled } = req.body;
    const session = telehealthSessions.get(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Telehealth session not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    if (session.status !== 'in-progress' && session.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: 'Session is not active',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const endedAt = new Date().toISOString();
    const duration = session.startedAt
      ? Math.round((new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
      : 0;

    session.status = 'completed';
    session.endedAt = endedAt;
    session.duration = duration;
    session.notes = notes || session.notes;
    session.prescriptionIds = prescriptionIds || session.prescriptionIds;
    session.followUpScheduled = followUpScheduled;
    session.updatedAt = new Date().toISOString();

    telehealthSessions.set(id, session);

    // Deactivate Voice AI Runtime
    if (session.voiceAIConversationId) {
      try {
        await customerOpsBridge.deactivateVoiceAI(session.voiceAIConversationId, {
          duration,
          notes
        });
      } catch (voiceAIError) {
        logger.warn('Voice AI deactivation failed:', voiceAIError);
      }
    }

    // Publish session ended event
    try {
      await customerOpsBridge.publishEvent('telehealth.ended', {
        sessionId: session.id,
        patientId: session.patientId,
        endedAt,
        duration,
        hasFollowUp: followUpScheduled
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<TelehealthSession> = {
      success: true,
      data: session,
      message: `Telehealth session ended. Duration: ${duration} seconds.`,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error ending telehealth session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end telehealth session',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Cancel telehealth session
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = telehealthSessions.get(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Telehealth session not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed session',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    session.status = 'cancelled';
    session.updatedAt = new Date().toISOString();

    telehealthSessions.set(id, session);

    // Cancel Voice AI Runtime
    if (session.voiceAIConversationId) {
      try {
        await customerOpsBridge.cancelVoiceAISession(session.voiceAIConversationId);
      } catch (voiceAIError) {
        logger.warn('Voice AI cancellation failed:', voiceAIError);
      }
    }

    // Publish session cancelled event
    try {
      await customerOpsBridge.publishEvent('telehealth.cancelled', {
        sessionId: session.id,
        patientId: session.patientId,
        providerId: session.providerId
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<TelehealthSession> = {
      success: true,
      data: session,
      message: 'Telehealth session cancelled',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error cancelling telehealth session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel telehealth session',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get session analytics
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const sessions = Array.from(telehealthSessions.values());

    const summary = {
      totalSessions: sessions.length,
      byStatus: {
        scheduled: sessions.filter(s => s.status === 'scheduled').length,
        waiting: sessions.filter(s => s.status === 'waiting').length,
        'in-progress': sessions.filter(s => s.status === 'in-progress').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length
      },
      byType: {
        video: sessions.filter(s => s.sessionType === 'video').length,
        audio: sessions.filter(s => s.sessionType === 'audio').length,
        chat: sessions.filter(s => s.sessionType === 'chat').length
      },
      totalDuration: sessions.reduce((acc, s) => acc + (s.duration || 0), 0),
      averageDuration: sessions.length > 0
        ? Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / sessions.filter(s => s.duration).length) || 0
        : 0,
      followUpRate: sessions.filter(s => s.followUpScheduled).length /
        (sessions.filter(s => s.status === 'completed').length || 1) * 100
    };

    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching telehealth analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch telehealth analytics',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

export default router;
