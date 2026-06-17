import { Router, Request, Response } from 'express';
import winston from 'winston';
import { voiceSessionService } from '../services/voiceSession.js';
import { transferService } from '../services/transfer.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

const router = Router();

// GET /api/sessions - List all sessions
router.get('/', (req: Request, res: Response) => {
  const { status, limit = 100, offset = 0 } = req.query;

  let sessions = Array.from(
    (voiceSessionService as any).sessions.values()
  );

  // Filter by status if provided
  if (status) {
    const statuses = (status as string).split(',');
    sessions = sessions.filter((s: any) => statuses.includes(s.status));
  }

  // Sort by start time (newest first)
  sessions.sort((a: any, b: any) => b.startTime - a.startTime);

  // Pagination
  const total = sessions.length;
  sessions = sessions.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    success: true,
    sessions,
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: Number(offset) + sessions.length < total,
    },
  });
});

// GET /api/sessions/:sessionId - Get session details
router.get('/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = voiceSessionService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found',
    });
  }

  res.json({
    success: true,
    session,
  });
});

// GET /api/sessions/:sessionId/transcript - Get session transcript
router.get('/:sessionId/transcript', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { format = 'text' } = req.query;

  const session = voiceSessionService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found',
    });
  }

  if (format === 'text') {
    // Plain text format
    const transcript = session.transcript
      .map(t => `[${new Date(t.timestamp).toISOString()}] ${t.role}: ${t.text}`)
      .join('\n');

    res.type('text/plain').send(transcript);
  } else if (format === 'summary') {
    // Get AI summary from transfer service
    res.json({
      success: true,
      sessionId,
      transcript: session.transcript,
      summary: {
        duration: session.duration,
        messageCount: session.transcript.length,
        customerMessages: session.transcript.filter(t => t.role === 'user').length,
        assistantMessages: session.transcript.filter(t => t.role === 'assistant').length,
      },
    });
  } else {
    res.json({
      success: true,
      transcript: session.transcript,
    });
  }
});

// POST /api/sessions/:sessionId/message - Add a message to transcript
router.post('/:sessionId/message', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { role, text, audioUrl } = req.body;

  if (!role || !text) {
    return res.status(400).json({
      success: false,
      message: 'role and text are required',
    });
  }

  if (!['user', 'assistant'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'role must be "user" or "assistant"',
    });
  }

  const session = voiceSessionService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found',
    });
  }

  voiceSessionService.addTranscriptEntry(sessionId, { role, text, audioUrl });

  res.json({
    success: true,
    message: 'Message added to transcript',
  });
});

// POST /api/sessions/:sessionId/end - End a session
router.post('/:sessionId/end', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { reason = 'completed' } = req.body;

  const session = voiceSessionService.endSession(sessionId, reason);
  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found',
    });
  }

  // Save to memory
  transferService.saveToMemory(session);

  res.json({
    success: true,
    session,
  });
});

// GET /api/sessions/active - List active sessions
router.get('/active', (req: Request, res: Response) => {
  const activeSessions = voiceSessionService.getActiveSessions();

  res.json({
    success: true,
    count: activeSessions.length,
    sessions: activeSessions.map(s => ({
      sessionId: s.sessionId,
      customerPhone: s.customerPhone,
      customerId: s.customerId,
      status: s.status,
      ivrState: s.ivrState,
      startTime: s.startTime,
      duration: Math.floor((Date.now() - s.startTime) / 1000),
      messageCount: s.transcript.length,
    })),
  });
});

// Webhook for session updates (from WebSocket handler)
router.post('/webhook/session-update', (req: Request, res: Response) => {
  const { sessionId, event, data } = req.body;

  if (!sessionId || !event) {
    return res.status(400).json({
      success: false,
      message: 'sessionId and event are required',
    });
  }

  switch (event) {
    case 'status_change':
      voiceSessionService.updateStatus(sessionId, data.status);
      break;
    case 'ivr_state':
      voiceSessionService.setIVRState(sessionId, data.state);
      break;
    case 'transcript':
      voiceSessionService.addTranscriptEntry(sessionId, data.entry);
      break;
  }

  res.json({ success: true });
});

export default router;
