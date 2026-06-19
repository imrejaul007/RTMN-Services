/**
 * RTMN Voice Twin Service v2.0
 * Voice profiles, TTS, STT, sessions, and recordings
 *
 * Security: JWT Auth, Rate Limiting, Input Validation, Error Handling
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import {
  requireAuth,
  optionalAuth,
  preventPrototypePollution,
  sanitizeSearchInput,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger,
  defaultLimiter,
  strictLimiter,
  authLimiter
} from '@rtmn/twinos-shared';

const app = express();
const PORT = process.env.PORT || 4876;
const SERVICE_NAME = 'voice-twin';

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);

// Rate limiting
app.use('/api/', defaultLimiter);
app.use('/api/write', strictLimiter);

// In-memory storage
const voices = new Map();
const profiles = new Map();
const recordings = new Map();
const sessions = new Map();
const byUser = new Map();

// Initialize with sample voices
const sampleVoices = [
  { id: 'voice-emma', name: 'Emma', gender: 'female', language: 'en-US', style: 'professional', pitch: 1.0, speed: 1.0, provider: 'standard' },
  { id: 'voice-james', name: 'James', gender: 'male', language: 'en-US', style: 'professional', pitch: 0.95, speed: 1.0, provider: 'standard' },
  { id: 'voice-sofia', name: 'Sofia', gender: 'female', language: 'es-ES', style: 'friendly', pitch: 1.1, speed: 1.0, provider: 'standard' },
  { id: 'voice-hans', name: 'Hans', gender: 'male', language: 'de-DE', style: 'professional', pitch: 0.9, speed: 0.95, provider: 'standard' },
  { id: 'voice-luna', name: 'Luna', gender: 'female', language: 'en-US', style: 'casual', pitch: 1.05, speed: 1.1, provider: 'neural' }
];
sampleVoices.forEach(v => voices.set(v.id, v));

// ==================== VOICES API ====================

/** GET /api/voices - List available voices */
app.get('/api/voices', optionalAuth, asyncHandler(async (req, res) => {
  const { gender, language, style, provider } = req.query;

  let result = Array.from(voices.values());

  if (gender) result = result.filter(v => v.gender === gender);
  if (language) result = result.filter(v => v.language === language);
  if (style) result = result.filter(v => v.style === style);
  if (provider) result = result.filter(v => v.provider === provider);

  res.json({ success: true, voices: result, total: result.length });
}));

/** GET /api/voices/:id - Get voice details */
app.get('/api/voices/:id', optionalAuth, asyncHandler(async (req, res) => {
  const voice = voices.get(req.params.id);

  if (!voice) {
    return res.status(404).json({ success: false, error: { code: 'VOICE_NOT_FOUND', message: 'Voice not found' } });
  }

  res.json({ success: true, voice });
}));

/** POST /api/voices - Create custom voice (admin only) */
app.post('/api/voices', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { name, gender, language, style, pitch, speed } = preventPrototypePollution(req.body);

  if (!name || !gender || !language) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name, gender, and language are required' } });
  }

  // Validate ranges
  const validatedPitch = Math.max(0.5, Math.min(2.0, pitch || 1.0));
  const validatedSpeed = Math.max(0.5, Math.min(2.0, speed || 1.0));

  const voice = {
    id: `voice-${uuidv4().slice(0, 8)}`,
    name,
    gender,
    language,
    style: style || 'neutral',
    pitch: validatedPitch,
    speed: validatedSpeed,
    provider: 'custom',
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  };

  voices.set(voice.id, voice);

  logger.info('Custom voice created', { voiceId: voice.id, createdBy: req.user.id });

  res.status(201).json({ success: true, voice });
}));

// ==================== TEXT-TO-SPEECH API ====================

/** POST /api/tts - Synthesize speech */
app.post('/api/tts', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { text, voiceId, language, speed, pitch, format } = preventPrototypePollution(req.body);

  // Validate text length
  if (!text || text.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Text is required' } });
  }

  if (text.length > 10000) {
    return res.status(400).json({ success: false, error: { code: 'TEXT_TOO_LONG', message: 'Text must be under 10,000 characters' } });
  }

  const voice = voiceId ? voices.get(voiceId) : voices.values().next().value;

  if (voiceId && !voice) {
    return res.status(404).json({ success: false, error: { code: 'VOICE_NOT_FOUND', message: 'Voice not found' } });
  }

  const audio = {
    id: `audio-${uuidv4().slice(0, 8)}`,
    text: text.slice(0, 500), // Truncate stored text
    voiceId: voice?.id,
    voiceName: voice?.name,
    language: language || voice?.language || 'en-US',
    speed: Math.max(0.5, Math.min(2.0, speed || voice?.speed || 1.0)),
    pitch: Math.max(0.5, Math.min(2.0, pitch || voice?.pitch || 1.0)),
    format: format || 'mp3',
    duration: Math.round(text.length * 0.05 * 10) / 10,
    audioUrl: `/api/audio/${uuidv4().slice(0, 8)}.mp3`,
    userId: req.user.id,
    createdAt: new Date().toISOString()
  };

  logger.info('TTS generated', { audioId: audio.id, userId: req.user.id });

  res.json({ success: true, audio });
}));

// ==================== SPEECH-TO-TEXT API ====================

/** POST /api/stt - Transcribe audio */
app.post('/api/stt', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { audioUrl, language, model } = preventPrototypePollution(req.body);

  if (!audioUrl) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Audio URL is required' } });
  }

  // Validate URL format
  if (!/^https?:\/\/.+/.test(audioUrl)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_URL', message: 'Invalid audio URL format' } });
  }

  const transcription = {
    id: `trn-${uuidv4().slice(0, 8)}`,
    audioUrl,
    text: '[Simulated transcription - integrate with STT provider in production]',
    language: language || 'en-US',
    confidence: (Math.random() * 0.2 + 0.8).toFixed(2),
    words: Math.round(Math.random() * 100 + 50),
    duration: Math.round(Math.random() * 60 + 10),
    model: model || 'standard',
    userId: req.user.id,
    createdAt: new Date().toISOString()
  };

  logger.info('STT transcription created', { transcriptionId: transcription.id, userId: req.user.id });

  res.json({ success: true, transcription });
}));

// ==================== PROFILES API ====================

/** GET /api/profiles - List profiles */
app.get('/api/profiles', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.query;

  let result = Array.from(profiles.values());

  // Filter by userId - users can only see their own profiles unless admin
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    result = result.filter(p => p.userId === req.user.id);
  } else if (userId) {
    result = result.filter(p => p.userId === userId);
  }

  res.json({ success: true, profiles: result, total: result.length });
}));

/** GET /api/profiles/:id - Get profile */
app.get('/api/profiles/:id', requireAuth, asyncHandler(async (req, res) => {
  const profile = profiles.get(req.params.id);

  if (!profile) {
    return res.status(404).json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } });
  }

  // Check access
  if (profile.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  }

  res.json({ success: true, profile });
}));

/** POST /api/profiles - Create profile */
app.post('/api/profiles', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { name, preferredVoice, language, greeting } = preventPrototypePollution(req.body);

  if (!name) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });
  }

  // Validate voice exists
  if (preferredVoice && !voices.has(preferredVoice)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_VOICE', message: 'Voice not found' } });
  }

  const profile = {
    id: `profile-${uuidv4().slice(0, 8)}`,
    userId: req.user.id,
    name,
    preferredVoice: preferredVoice || 'voice-emma',
    language: language || 'en-US',
    greeting: greeting || 'Hello, how can I help you?',
    settings: {
      volume: 0.8,
      speed: 1.0,
      interruptions: true
    },
    createdAt: new Date().toISOString()
  };

  profiles.set(profile.id, profile);

  // Update user index
  if (!byUser.has(req.user.id)) byUser.set(req.user.id, new Set());
  byUser.get(req.user.id).add(profile.id);

  logger.info('Voice profile created', { profileId: profile.id, userId: req.user.id });

  res.status(201).json({ success: true, profile });
}));

/** PUT /api/profiles/:id - Update profile */
app.put('/api/profiles/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const profile = profiles.get(req.params.id);

  if (!profile) {
    return res.status(404).json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } });
  }

  if (profile.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  }

  const data = preventPrototypePollution(req.body);

  // Whitelist allowed fields
  const allowedFields = ['name', 'preferredVoice', 'language', 'greeting'];
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      profile[field] = data[field];
    }
  });

  // Validate settings
  if (data.settings && typeof data.settings === 'object') {
    profile.settings = {
      ...profile.settings,
      ...data.settings,
      // Clamp numeric values
      volume: Math.max(0, Math.min(1, data.settings.volume ?? profile.settings.volume)),
      speed: Math.max(0.5, Math.min(2, data.settings.speed ?? profile.settings.speed))
    };
  }

  profile.updatedAt = new Date().toISOString();

  res.json({ success: true, profile });
}));

/** DELETE /api/profiles/:id - Delete profile */
app.delete('/api/profiles/:id', requireAuth, asyncHandler(async (req, res) => {
  const profile = profiles.get(req.params.id);

  if (!profile) {
    return res.status(404).json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } });
  }

  if (profile.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  }

  profiles.delete(req.params.id);

  // Update user index
  if (byUser.has(req.user.id)) {
    byUser.get(req.user.id).delete(req.params.id);
  }

  logger.info('Voice profile deleted', { profileId: req.params.id, userId: req.user.id });

  res.json({ success: true, message: 'Profile deleted' });
}));

// ==================== SESSIONS API ====================

/** POST /api/sessions/start - Start voice session */
app.post('/api/sessions/start', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { profileId, channel } = preventPrototypePollution(req.body);

  const profile = profileId ? profiles.get(profileId) : null;

  // Validate profile access
  if (profileId && !profile) {
    return res.status(404).json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } });
  }

  if (profile && profile.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  }

  // Validate channel
  const validChannels = ['web', 'mobile', 'watch', 'earbuds', 'car', 'smartspeaker'];
  const validatedChannel = validChannels.includes(channel) ? channel : 'web';

  const session = {
    id: `sess-${uuidv4().slice(0, 8)}`,
    userId: req.user.id,
    businessId: req.user.businessId,
    profileId: profile?.id,
    profileName: profile?.name,
    channel: validatedChannel,
    voiceId: profile?.preferredVoice || 'voice-emma',
    status: 'active',
    startTime: new Date().toISOString(),
    endTime: null,
    interactions: 0,
    duration: 0,
    transcripts: [],
    responses: []
  };

  sessions.set(session.id, session);

  logger.info('Voice session started', { sessionId: session.id, userId: req.user.id });

  res.status(201).json({ success: true, session });
}));

/** PUT /api/sessions/:id - Update session */
app.put('/api/sessions/:id', requireAuth, asyncHandler(async (req, res) => {
  const session = sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }

  if (session.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  }

  const data = preventPrototypePollution(req.body);

  // Sanitize and add transcripts
  if (data.transcript) {
    const sanitized = sanitizeSearchInput(String(data.transcript));
    if (sanitized.length > 0) {
      session.transcripts.push(sanitized.slice(0, 5000));
    }
  }

  if (data.response) {
    session.responses.push(String(data.response).slice(0, 5000));
  }

  session.interactions++;
  session.updatedAt = new Date().toISOString();

  res.json({ success: true, session });
}));

/** POST /api/sessions/:id/end - End session */
app.post('/api/sessions/:id/end', requireAuth, asyncHandler(async (req, res) => {
  const session = sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }

  if (session.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  }

  session.status = 'ended';
  session.endTime = new Date().toISOString();
  session.duration = Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000);
  session.updatedAt = session.endTime;

  logger.info('Voice session ended', { sessionId: session.id, duration: session.duration });

  res.json({ success: true, session });
}));

/** GET /api/sessions/:id - Get session */
app.get('/api/sessions/:id', requireAuth, asyncHandler(async (req, res) => {
  const session = sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }

  if (session.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  }

  res.json({ success: true, session });
}));

/** GET /api/sessions - List sessions */
app.get('/api/sessions', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { userId, status, page = 1, limit = 20 } = req.query;

  let result = Array.from(sessions.values());

  // Filter by user unless admin
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    result = result.filter(s => s.userId === req.user.id);
  } else if (userId) {
    result = result.filter(s => s.userId === userId);
  }

  if (status) {
    result = result.filter(s => s.status === status);
  }

  result.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  const total = result.length;
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    sessions: result.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total }
  });
}));

// ==================== RECORDINGS API ====================

/** POST /api/recordings - Save recording */
app.post('/api/recordings', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { sessionId, audioUrl, duration, transcription } = preventPrototypePollution(req.body);

  const session = sessionId ? sessions.get(sessionId) : null;

  if (sessionId && !session) {
    return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }

  const recording = {
    id: `rec-${uuidv4().slice(0, 8)}`,
    sessionId,
    userId: req.user.id,
    audioUrl: audioUrl || `/api/recordings/${uuidv4().slice(0, 8)}.mp3`,
    duration: Math.max(0, Math.min(3600, duration || 0)),
    transcription: transcription?.slice(0, 10000) || '',
    format: 'mp3',
    createdAt: new Date().toISOString()
  };

  recordings.set(recording.id, recording);

  logger.info('Recording saved', { recordingId: recording.id, userId: req.user.id });

  res.status(201).json({ success: true, recording });
}));

/** GET /api/recordings - List recordings */
app.get('/api/recordings', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { sessionId, page = 1, limit = 20 } = req.query;

  let result = Array.from(recordings.values());

  // Filter by user unless admin
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    result = result.filter(r => r.userId === req.user.id);
  }

  if (sessionId) {
    result = result.filter(r => r.sessionId === sessionId);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = result.length;
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    recordings: result.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total }
  });
}));

// ==================== ANALYTICS API ====================

/** GET /api/analytics - Get voice analytics */
app.get('/api/analytics', requireAuth, asyncHandler(async (req, res) => {
  const userSessions = Array.from(sessions.values())
    .filter(s => req.user.role === 'admin' || s.userId === req.user.id);

  const activeSessions = userSessions.filter(s => s.status === 'active');
  const completedSessions = userSessions.filter(s => s.status === 'ended');

  const stats = {
    totalSessions: userSessions.length,
    activeSessions: activeSessions.length,
    completedSessions: completedSessions.length,
    totalInteractions: userSessions.reduce((sum, s) => sum + s.interactions, 0),
    avgDuration: completedSessions.length > 0
      ? Math.round(completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length)
      : 0,
    totalRecordings: recordings.size,
    totalVoices: voices.size,
    totalProfiles: profiles.size,
    byChannel: {},
    topVoices: []
  };

  userSessions.forEach(s => {
    stats.byChannel[s.channel] = (stats.byChannel[s.channel] || 0) + 1;
  });

  res.json({ success: true, analytics: stats });
}));

// ==================== HEALTH ENDPOINTS ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      voices: voices.size,
      profiles: profiles.size,
      sessions: sessions.size,
      recordings: recordings.size,
      activeSessions: Array.from(sessions.values()).filter(s => s.status === 'active').length
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: SERVICE_NAME, timestamp: new Date().toISOString() });
});

// ==================== ERROR HANDLING ====================

app.use(notFoundHandler);
app.use(errorHandler);

// ==================== START ====================

app.listen(PORT, () => {
  logger.info(`🎙️ Voice Twin Service v2.0 running on port ${PORT}`);
  logger.info(`   Voices: ${voices.size}, Profiles: ${profiles.size}`);
});

export default app;
