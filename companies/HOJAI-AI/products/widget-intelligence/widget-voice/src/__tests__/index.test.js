/**
 * Widget Voice Service Tests
 */

import { jest } from '@jest/globals';

// Mock pino before importing the module
jest.unstable_mockModule('pino', () => ({
  default: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Widget Voice Service', () => {
  let voiceService;
  let app;

  beforeAll(async () => {
    const module = await import('../index.js');
    voiceService = module;
    app = module.app;
  });

  describe('Voice Session Management', () => {
    test('should create a voice session', () => {
      const session = voiceService.createVoiceSession('visitor-123', {
        language: 'en-US',
        voiceEnabled: true,
        autoSpeak: false,
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.visitorId).toBe('visitor-123');
      expect(session.language).toBe('en-US');
      expect(session.voiceEnabled).toBe(true);
      expect(session.autoSpeak).toBe(false);
      expect(session.speaking).toBe(false);
    });

    test('should get voice session by ID', () => {
      const created = voiceService.createVoiceSession('visitor-456');
      const retrieved = voiceService.getVoiceSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.visitorId).toBe('visitor-456');
    });

    test('should return null for non-existent session', () => {
      const result = voiceService.getVoiceSession('non-existent-id');
      expect(result).toBeUndefined();
    });

    test('should update voice session', () => {
      const session = voiceService.createVoiceSession('visitor-789');
      const updated = voiceService.updateVoiceSession(session.id, {
        voiceEnabled: true,
        autoSpeak: true,
      });

      expect(updated).toBeDefined();
      expect(updated.voiceEnabled).toBe(true);
      expect(updated.autoSpeak).toBe(true);
    });

    test('should delete voice session', () => {
      const session = voiceService.createVoiceSession('visitor-delete');
      const deleted = voiceService.deleteVoiceSession(session.id);

      expect(deleted).toBe(true);
      expect(voiceService.getVoiceSession(session.id)).toBeUndefined();
    });
  });

  describe('TTS Configuration', () => {
    test('should return TTS configuration', () => {
      const config = voiceService.TTS_CONFIG;

      expect(config).toBeDefined();
      expect(config.defaultLang).toBe('en-US');
      expect(config.defaultRate).toBe(1.0);
      expect(config.defaultPitch).toBe(1.0);
      expect(config.defaultVolume).toBe(1.0);
      expect(Array.isArray(config.supportedLanguages)).toBe(true);
    });

    test('should return voice mappings', () => {
      const mappings = voiceService.VOICE_MAPPINGS;

      expect(mappings).toBeDefined();
      expect(mappings['en-US']).toBeDefined();
      expect(mappings['hi-IN']).toBeDefined();
    });

    test('should get TTS config for session', () => {
      const session = voiceService.createVoiceSession('visitor-tts');
      const ttsConfig = voiceService.getTTSConfig(session.id);

      expect(ttsConfig).toBeDefined();
      expect(ttsConfig.currentLang).toBe(session.language);
      expect(ttsConfig.voiceEnabled).toBe(session.voiceEnabled);
    });
  });

  describe('IVR Configuration', () => {
    test('should create IVR configuration', () => {
      const config = voiceService.createIVRConfig({
        name: 'Test IVR',
        greeting: 'Welcome to test',
        language: 'en-US',
      });

      expect(config).toBeDefined();
      expect(config.id).toBeDefined();
      expect(config.name).toBe('Test IVR');
      expect(config.greeting).toBe('Welcome to test');
      expect(Array.isArray(config.menuOptions)).toBe(true);
    });

    test('should get IVR configuration', () => {
      const created = voiceService.createIVRConfig({
        name: 'Get Test IVR',
      });
      const retrieved = voiceService.getIVRConfig(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Get Test IVR');
    });

    test('should generate IVR TwiML', () => {
      const config = voiceService.createIVRConfig({
        name: 'TwiML Test',
      });

      const twiml = voiceService.generateIVRTwiML(config.id);
      expect(twiml).toContain('<?xml');
      expect(twiml).toContain('<Response>');
      expect(twiml).toContain('Welcome');
    });

    test('should return error TwiML for non-existent config', () => {
      const twiml = voiceService.generateIVRTwiML('non-existent-id');
      expect(twiml).toContain('Configuration not found');
    });
  });

  describe('Voice Statistics', () => {
    test('should return voice statistics', () => {
      voiceService.createVoiceSession('stats-visitor-1');
      voiceService.createVoiceSession('stats-visitor-2');

      const stats = voiceService.getVoiceStats();

      expect(stats).toBeDefined();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(2);
      expect(stats.activeSessions).toBeGreaterThanOrEqual(2);
      expect(stats.ivrConfigs).toBeGreaterThanOrEqual(3);
    });
  });

  describe('HTTP Endpoints', () => {
    const request = require('supertest');

    test('GET /health should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('widget-voice');
      expect(response.body.port).toBe(5404);
    });

    test('GET /ready should return ready status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });

    test('POST /api/voice/session should create session', async () => {
      const response = await request(app)
        .post('/api/voice/session')
        .send({ visitorId: 'http-test-visitor' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.session).toBeDefined();
      expect(response.body.ttsConfig).toBeDefined();
    });

    test('POST /api/voice/session should validate visitorId', async () => {
      const response = await request(app)
        .post('/api/voice/session')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('GET /api/voice/session/:id should get session', async () => {
      const createResponse = await request(app)
        .post('/api/voice/session')
        .send({ visitorId: 'get-test-visitor' });

      const sessionId = createResponse.body.session.id;

      const response = await request(app)
        .get(`/api/voice/session/${sessionId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.session.id).toBe(sessionId);
    });

    test('GET /api/voice/session/:id should return 404 for non-existent', async () => {
      const response = await request(app)
        .get('/api/voice/session/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Session not found');
    });

    test('PATCH /api/voice/session/:id should update session', async () => {
      const createResponse = await request(app)
        .post('/api/voice/session')
        .send({ visitorId: 'patch-test-visitor' });

      const sessionId = createResponse.body.session.id;

      const response = await request(app)
        .patch(`/api/voice/session/${sessionId}`)
        .send({ voiceEnabled: true, autoSpeak: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.session.voiceEnabled).toBe(true);
      expect(response.body.session.autoSpeak).toBe(true);
    });

    test('DELETE /api/voice/session/:id should delete session', async () => {
      const createResponse = await request(app)
        .post('/api/voice/session')
        .send({ visitorId: 'delete-test-visitor' });

      const sessionId = createResponse.body.session.id;

      const deleteResponse = await request(app)
        .delete(`/api/voice/session/${sessionId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      const getResponse = await request(app)
        .get(`/api/voice/session/${sessionId}`);

      expect(getResponse.status).toBe(404);
    });

    test('GET /api/voice/tts/config should return TTS config', async () => {
      const response = await request(app).get('/api/voice/tts/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.defaultLang).toBe('en-US');
    });

    test('GET /api/voice/tts/voices should return voices for language', async () => {
      const response = await request(app)
        .get('/api/voice/tts/voices')
        .query({ lang: 'en-US' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.voices).toBeDefined();
    });

    test('POST /api/voice/ivr/config should create IVR config', async () => {
      const response = await request(app)
        .post('/api/voice/ivr/config')
        .send({
          name: 'HTTP Test IVR',
          greeting: 'Welcome via HTTP',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.name).toBe('HTTP Test IVR');
    });

    test('GET /api/voice/ivr/config/:id should get IVR config', async () => {
      const createResponse = await request(app)
        .post('/api/voice/ivr/config')
        .send({ name: 'Get IVR Test' });

      const configId = createResponse.body.config.id;

      const response = await request(app)
        .get(`/api/voice/ivr/config/${configId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.id).toBe(configId);
    });

    test('GET /api/voice/stats should return stats', async () => {
      const response = await request(app).get('/api/voice/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(typeof response.body.stats.totalSessions).toBe('number');
    });

    test('404 for unknown routes', async () => {
      const response = await request(app).get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });
});
