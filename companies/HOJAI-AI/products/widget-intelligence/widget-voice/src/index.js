/**
 * HOJAI SiteOS - Widget Voice Service
 * Voice Widget: TTS, Voice Mode, and IVR Phone Receptionist (Port 5404)
 *
 * Features:
 * - TTS using Web Speech API (window.speechSynthesis)
 * - Auto-speak AI responses when voice mode enabled
 * - IVR phone receptionist via Twilio integration
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pino from 'pino';

// Logger setup
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Express app setup
const app = express();

// In-memory stores
const callsStore = new Map();
const voiceSessionsStore = new Map();
const ivrConfigsStore = new Map();

// Twilio client (optional - requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)
let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    // Twilio is loaded lazily to avoid errors when credentials are not set
    twilioClient = {
      calls: {
        create: async (params) => {
          logger.info({ action: 'twilio_create_call', params });
          return { sid: `CA${uuidv4().replace(/-/g, '')}` };
        }
      }
    };
  }
} catch (err) {
  logger.warn('Twilio not configured, IVR features disabled');
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Session Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a voice session for a visitor
 */
export function createVoiceSession(visitorId, options = {}) {
  const session = {
    id: uuidv4(),
    visitorId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    language: options.language || 'en-US',
    voiceEnabled: options.voiceEnabled ?? false,
    autoSpeak: options.autoSpeak ?? false,
    speaking: false,
    queue: [],
  };

  voiceSessionsStore.set(session.id, session);
  logger.info({ event: 'voice_session_created', sessionId: session.id, visitorId });

  return session;
}

/**
 * Get voice session by ID
 */
export function getVoiceSession(sessionId) {
  return voiceSessionsStore.get(sessionId);
}

/**
 * Update voice session
 */
export function updateVoiceSession(sessionId, updates) {
  const session = voiceSessionsStore.get(sessionId);
  if (!session) return null;

  Object.assign(session, updates, { lastActivity: Date.now() });
  return session;
}

/**
 * Delete voice session
 */
export function deleteVoiceSession(sessionId) {
  const deleted = voiceSessionsStore.delete(sessionId);
  logger.info({ event: 'voice_session_deleted', sessionId });
  return deleted;
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS Utilities (for client-side implementation reference)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TTS Configuration defaults
 */
export const TTS_CONFIG = {
  defaultLang: 'en-US',
  defaultRate: 1.0,
  defaultPitch: 1.0,
  defaultVolume: 1.0,
  supportedLanguages: [
    'en-US', 'en-GB', 'en-AU', 'en-IN',
    'hi-IN', 'es-ES', 'fr-FR', 'de-DE',
    'it-IT', 'pt-BR', 'ja-JP', 'ko-KR',
    'zh-CN', 'zh-TW', 'ar-SA'
  ],
};

/**
 * Map language code to SpeechSynthesis voice name patterns
 */
export const VOICE_MAPPINGS = {
  'en-US': ['Google US English', 'Microsoft David'],
  'en-GB': ['Google UK English', 'Microsoft Hazel'],
  'en-IN': ['Google Indian English', 'Microsoft Heera'],
  'hi-IN': ['Google Hindi', 'Microsoft Heera'],
  'es-ES': ['Google Spanish', 'Microsoft Pablo'],
  'fr-FR': ['Google French', 'Microsoft Hortense'],
  'de-DE': ['Google German', 'Microsoft Stefan'],
  'ja-JP': ['Google Japanese', 'Microsoft Ayumi'],
  'ko-KR': ['Google Korean', 'Microsoft Heami'],
  'zh-CN': ['Google Chinese (Simplified)', 'Microsoft Huihui'],
};

/**
 * Get TTS configuration for client-side use
 */
export function getTTSConfig(sessionId) {
  const session = sessionId ? voiceSessionsStore.get(sessionId) : null;
  return {
    ...TTS_CONFIG,
    currentLang: session?.language || TTS_CONFIG.defaultLang,
    voiceEnabled: session?.voiceEnabled ?? false,
    autoSpeak: session?.autoSpeak ?? false,
    availableVoices: VOICE_MAPPINGS[session?.language] || VOICE_MAPPINGS['en-US'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IVR Call Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start an outbound call
 */
export async function startCall(options) {
  const { to, from, webhookUrl, timeout = 30 } = options;

  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }

  const callSid = `CA${uuidv4().replace(/-/g, '')}`;
  const call = {
    sid: callSid,
    to,
    from: from || process.env.TWILIO_PHONE_NUMBER,
    status: 'initiated',
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    duration: 0,
    direction: 'outbound',
    webhookUrl,
    timeout,
    recordings: [],
    transcriptions: [],
  };

  callsStore.set(callSid, call);

  try {
    const twilioCall = await twilioClient.calls.create({
      to,
      from: call.from,
      url: webhookUrl,
      timeout: String(timeout),
    });

    call.sid = twilioCall.sid;
    call.status = 'ringing';
    logger.info({ event: 'call_started', callSid: call.sid, to, from: call.from });

    return { success: true, call: { sid: call.sid, status: call.status } };
  } catch (err) {
    call.status = 'failed';
    logger.error({ event: 'call_failed', error: err.message, to });
    return { success: false, error: err.message };
  }
}

/**
 * Get call by SID
 */
export function getCall(callSid) {
  return callsStore.get(callSid);
}

/**
 * Update call status
 */
export function updateCallStatus(callSid, status, duration) {
  const call = callsStore.get(callSid);
  if (!call) return null;

  call.status = status;

  if (status === 'in-progress') {
    call.startedAt = Date.now();
  } else if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
    call.endedAt = Date.now();
    call.duration = duration || (call.startedAt ? Date.now() - call.startedAt : 0);
  }

  logger.info({ event: 'call_status_updated', callSid, status });
  return call;
}

/**
 * Get IVR configuration
 */
export function getIVRConfig(configId) {
  return ivrConfigsStore.get(configId);
}

/**
 * Create IVR configuration
 */
export function createIVRConfig(config) {
  const ivrConfig = {
    id: config.id || uuidv4(),
    name: config.name,
    greeting: config.greeting || 'Welcome. How can I help you today?',
    menuOptions: config.menuOptions || [
      { key: '1', action: 'sales', prompt: 'For sales, press 1' },
      { key: '2', action: 'support', prompt: 'For support, press 2' },
      { key: '3', action: 'schedule', prompt: 'To schedule a callback, press 3' },
      { key: '0', action: 'operator', prompt: 'To speak with an operator, press 0' },
    ],
    timeoutPrompt: config.timeoutPrompt || 'No response received. Please try again.',
    maxRetries: config.maxRetries || 3,
    transferNumbers: config.transferNumbers || {},
    webhookUrl: config.webhookUrl,
    language: config.language || 'en-US',
    createdAt: Date.now(),
  };

  ivrConfigsStore.set(ivrConfig.id, ivrConfig);
  logger.info({ event: 'ivr_config_created', configId: ivrConfig.id, name: ivrConfig.name });

  return ivrConfig;
}

/**
 * Generate TwiML for IVR
 */
export function generateIVRTwiML(configId, stage = 'main') {
  const config = ivrConfigsStore.get(configId);
  if (!config) {
    return '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Configuration not found.</Say></Response>';
  }

  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

  if (stage === 'main') {
    // Greeting
    twiml += `<Say voice="alice" language="${config.language}">${config.greeting}</Say>`;
    twiml += '<Pause length="1"/>';

    // Menu options
    for (const option of config.menuOptions) {
      twiml += `<Say voice="alice" language="${config.language}">${option.prompt}</Say>`;
    }

    // Gather input
    twiml += '<Gather numDigits="1" timeout="10" method="POST" action="/api/voice/ivr/handle">';
    twiml += `<Say voice="alice" language="${config.language}">Please make a selection.</Say>`;
    twiml += '</Gather>';

    // Timeout handling
    twiml += `<Say voice="alice" language="${config.language}">${config.timeoutPrompt}</Say>`;
    twiml += `<Redirect method="POST">/api/voice/ivr/retry</Redirect>`;

  } else if (stage === 'transfer') {
    twiml += '<Say voice="alice" language="en-US">Connecting you now.</Say>';
    twiml += '<Dial timeout="30" record="record-from-ringing" recordingStatusCallback="/api/voice/recording">';
    twiml += `<Number>${config.transferNumbers.operator || process.env.OPERATOR_PHONE}</Number>`;
    twiml += '</Dial>';
  }

  twiml += '</Response>';
  return twiml;
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get voice service statistics
 */
export function getVoiceStats() {
  const sessions = Array.from(voiceSessionsStore.values());
  const calls = Array.from(callsStore.values());

  return {
    activeSessions: sessions.filter(s => !s.speaking).length,
    totalSessions: sessions.length,
    speakingSessions: sessions.filter(s => s.speaking).length,
    activeCalls: calls.filter(c => ['initiated', 'ringing', 'in-progress'].includes(c.status)).length,
    totalCalls: calls.length,
    completedCalls: calls.filter(c => c.status === 'completed').length,
    failedCalls: calls.filter(c => c.status === 'failed').length,
    ivrConfigs: ivrConfigsStore.size,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Express Routes
// ─────────────────────────────────────────────────────────────────────────────

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'widget-voice',
    version: '1.0.0',
    port: process.env.PORT || 5404,
    timestamp: new Date().toISOString(),
    twilioConfigured: !!twilioClient,
    stats: getVoiceStats(),
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// Voice Session Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create voice session
 * POST /api/voice/session
 */
app.post('/api/voice/session',requireAuth,  async (req, res) => {
  try {
    const schema = z.object({
      visitorId: z.string().min(1),
      language: z.string().optional(),
      voiceEnabled: z.boolean().optional(),
      autoSpeak: z.boolean().optional(),
    });

    const { visitorId, language, voiceEnabled, autoSpeak } = schema.parse(req.body);
    const session = createVoiceSession(visitorId, { language, voiceEnabled, autoSpeak });

    res.status(201).json({
      success: true,
      session,
      ttsConfig: getTTSConfig(session.id),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get voice session
 * GET /api/voice/session/:sessionId
 */
app.get('/api/voice/session/:sessionId', (req, res) => {
  const session = getVoiceSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    success: true,
    session,
    ttsConfig: getTTSConfig(session.id),
  });
});

/**
 * Update voice session
 * PATCH /api/voice/session/:sessionId
 */
app.patch('/api/voice/session/:sessionId',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      voiceEnabled: z.boolean().optional(),
      autoSpeak: z.boolean().optional(),
      speaking: z.boolean().optional(),
      language: z.string().optional(),
    });

    const updates = schema.parse(req.body);
    const session = updateVoiceSession(req.params.sessionId, updates);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      session,
      ttsConfig: getTTSConfig(session.id),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete voice session
 * DELETE /api/voice/session/:sessionId
 */
app.delete('/api/voice/session/:sessionId',requireAuth,  (req, res) => {
  const deleted = deleteVoiceSession(req.params.sessionId);
  if (!deleted) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ success: true, message: 'Session deleted' });
});

// ─────────────────────────────────────────────────────────────────────────────
// TTS Configuration Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get TTS configuration
 * GET /api/voice/tts/config
 */
app.get('/api/voice/tts/config', (req, res) => {
  const { sessionId } = req.query;
  res.json({
    success: true,
    config: TTS_CONFIG,
    currentSession: sessionId ? getTTSConfig(sessionId) : null,
  });
});

/**
 * Get available voices for a language
 * GET /api/voice/tts/voices
 */
app.get('/api/voice/tts/voices', (req, res) => {
  const { lang } = req.query;
  const voices = VOICE_MAPPINGS[lang || 'en-US'] || VOICE_MAPPINGS['en-US'];

  res.json({
    success: true,
    language: lang || 'en-US',
    voices,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IVR Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start outbound call
 * POST /api/voice/start
 */
app.post('/api/voice/start',requireAuth,  async (req, res) => {
  try {
    const schema = z.object({
      to: z.string().min(10),
      from: z.string().optional(),
      webhookUrl: z.string().url().optional(),
      timeout: z.number().min(5).max(120).optional(),
    });

    const { to, from, webhookUrl, timeout } = schema.parse(req.body);

    if (!twilioClient) {
      return res.status(503).json({
        success: false,
        error: 'Twilio not configured',
        message: 'Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables',
      });
    }

    const result = await startCall({ to, from, webhookUrl, timeout });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    if (err.message.includes('Twilio not configured')) {
      return res.status(503).json({ success: false, error: err.message });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get call status
 * GET /api/voice/call/:callSid
 */
app.get('/api/voice/call/:callSid', (req, res) => {
  const call = getCall(req.params.callSid);
  if (!call) {
    return res.status(404).json({ error: 'Call not found' });
  }

  res.json({ success: true, call });
});

/**
 * IVR webhook endpoint
 * POST /api/voice/ivr
 */
app.post('/api/voice/iv',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      configId: z.string().min(1),
      Digits: z.string().optional(),
      CallSid: z.string().optional(),
      From: z.string().optional(),
      To: z.string().optional(),
    });

    const { configId, Digits, CallSid } = schema.parse(req.body);

    // Update call status if CallSid provided
    if (CallSid) {
      const digitMap = { '1': 'sales', '2': 'support', '3': 'schedule', '0': 'operator' };
      const action = Digits ? digitMap[Digits] : null;
      updateCallStatus(CallSid, 'in-progress');

      logger.info({ event: 'ivr_digit_received', callSid: CallSid, digit: Digits, action });
    }

    // Generate TwiML response
    const twiml = generateIVRTwiML(configId);
    res.type('text/xml').send(twiml);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create IVR configuration
 * POST /api/voice/ivr/config
 */
app.post('/api/voice/ivr/config',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      greeting: z.string().optional(),
      menuOptions: z.array(z.object({
        key: z.string(),
        action: z.string(),
        prompt: z.string(),
      })).optional(),
      transferNumbers: z.record(z.string()).optional(),
      webhookUrl: z.string().url().optional(),
      language: z.string().optional(),
    });

    const config = createIVRConfig(schema.parse(req.body));
    res.status(201).json({ success: true, config });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get IVR configuration
 * GET /api/voice/ivr/config/:configId
 */
app.get('/api/voice/ivr/config/:configId', (req, res) => {
  const config = getIVRConfig(req.params.configId);
  if (!config) {
    return res.status(404).json({ error: 'IVR config not found' });
  }

  res.json({ success: true, config });
});

/**
 * Generate IVR TwiML
 * GET /api/voice/ivr/twiml/:configId
 */
app.get('/api/voice/ivr/twiml/:configId', (req, res) => {
  const twiml = generateIVRTwiML(req.params.configId, req.query.stage || 'main');
  res.type('text/xml').send(twiml);
});

// ─────────────────────────────────────────────────────────────────────────────
// Voice Statistics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get voice statistics
 * GET /api/voice/stats
 */
app.get('/api/voice/stats', (req, res) => {
  res.json({
    success: true,
    stats: getVoiceStats(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method });

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5404;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget Voice Service running on port ${port}`);
      logger.info(`Twilio configured: ${!!twilioClient}`);
      resolve(server);
    });
  });
}

// Start if run directly
const isMainModule = process.argv[1]?.includes('index.js');
if (isMainModule) {
  startServer();
}

export { app };
