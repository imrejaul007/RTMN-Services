import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import multer from 'multer';
import winston from 'winston';
import { CallRequestSchema, TransferRequestSchema } from '../types.js';
import { voiceSessionService } from '../services/voiceSession.js';
import { transferService } from '../services/transfer.js';
import { ttsService } from '../services/tts.js';

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

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

// Twilio client initialization
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  return twilio(accountSid, authToken);
};

// POST /api/calls - Initiate an outbound call
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = CallRequestSchema.parse(req.body);

    // Create voice session
    const session = voiceSessionService.createSession({
      customerPhone: validatedData.to,
      customerId: validatedData.customerId,
      metadata: validatedData.metadata,
    });

    const client = getTwilioClient();
    if (!client) {
      // If no Twilio, simulate call initiation
      voiceSessionService.updateStatus(session.sessionId, 'in_progress');

      return res.status(200).json({
        success: true,
        sessionId: session.sessionId,
        message: 'Call initiated (simulation mode - Twilio not configured)',
      });
    }

    const from = validatedData.from || process.env.TWILIO_PHONE_NUMBER;

    // Initiate Twilio call
    const call = await client.calls.create({
      to: validatedData.to,
      from: from!,
      url: `${process.env.PUBLIC_URL || 'http://localhost:4876'}/api/calls/twiml/${session.sessionId}`,
      statusCallback: `${process.env.PUBLIC_URL || 'http://localhost:4876'}/api/calls/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    voiceSessionService.updateSession(session.sessionId, {
      callSid: call.sid,
      status: 'initiated',
    });

    logger.info('Outbound call initiated', {
      sessionId: session.sessionId,
      callSid: call.sid,
      to: validatedData.to,
    });

    res.status(200).json({
      success: true,
      callSid: call.sid,
      sessionId: session.sessionId,
    });
  } catch (error: any) {
    logger.error('Call initiation failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate call',
    });
  }
});

// GET /api/calls/:sessionId - Get call details
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

// POST /api/calls/:sessionId/transfer - Transfer call to agent
router.post('/:sessionId/transfer', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const validatedData = TransferRequestSchema.parse({
      ...req.body,
      sessionId,
    });

    const session = voiceSessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const result = await transferService.transferToAgent(validatedData, session);

    if (result.success) {
      voiceSessionService.updateStatus(sessionId, 'transferred');
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Transfer failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message || 'Transfer failed',
    });
  }
});

// Twilio webhook: Status callback
router.post('/status', async (req: Request, res: Response) => {
  const {
    CallSid,
    CallStatus,
    CallDuration,
    RecordingUrl,
    TranscriptionText,
  } = req.body;

  logger.info('Twilio status callback', {
    callSid: CallSid,
    status: CallStatus,
    duration: CallDuration,
  });

  // Find session by call SID
  const session = voiceSessionService.getSessionByCallSid(CallSid);
  if (!session) {
    return res.status(200).send('OK');
  }

  switch (CallStatus) {
    case 'in-progress':
      voiceSessionService.updateStatus(session.sessionId, 'in_progress');
      break;

    case 'completed':
    case 'busy':
    case 'no-answer':
    case 'failed':
      voiceSessionService.endSession(
        session.sessionId,
        CallStatus === 'completed' ? 'completed' : 'failed'
      );

      // Save recording if available
      if (RecordingUrl) {
        voiceSessionService.updateSession(session.sessionId, {
          metadata: {
            ...session.metadata,
            recordingUrl: RecordingUrl,
          },
        });
      }
      break;
  }

  res.status(200).send('OK');
});

// Twilio webhook: Voice request (TwiML)
router.post('/twiml/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = voiceSessionService.getSession(sessionId);
  if (!session) {
    return res.status(404).send('Session not found');
  }

  // Generate TwiML response
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="wss://${req.headers.host}/ws/voice/${sessionId}" />
  </Start>
  <Say voice="alice">Thank you for calling. Please wait while we connect you.</Say>
  <Pause length="1"/>
  <Say voice="alice">Connecting now.</Say>
</Response>`;

  res.type('text/xml').send(twiml);
});

// POST /api/calls/:sessionId/voice - Upload voice recording
router.post('/:sessionId/voice', upload.single('audio'), async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file provided',
    });
  }

  const session = voiceSessionService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found',
    });
  }

  // Store audio URL in session metadata
  voiceSessionService.updateSession(sessionId, {
    metadata: {
      ...session.metadata,
      lastAudioUpload: new Date().toISOString(),
      audioSize: req.file.size,
    },
  });

  res.json({
    success: true,
    message: 'Audio uploaded successfully',
    size: req.file.size,
  });
});

// GET /api/calls/stats - Get call statistics
router.get('/stats', (req: Request, res: Response) => {
  const stats = voiceSessionService.getSessionStats();
  const queueStatus = transferService.getQueueStatus();

  res.json({
    success: true,
    stats,
    queues: queueStatus,
  });
});

export default router;
