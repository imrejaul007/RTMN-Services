/**
 * Voice AI Routes
 * 
 * Routes for HOJAI Voice Platform
 */

import { Router } from 'express';
import { createLogger } from '../utils/logger.js';
import { createErrorResponse } from '../types/index.js';

const logger = createLogger('voice-routes');
const router = Router();

// Environment configuration
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:4850';

// ============================================
// VOICE TRANSCRIPTION
// ============================================

/**
 * POST /api/voice/transcribe
 * Convert speech to text
 */
router.post('/transcribe', async (req, res) => {
  try {
    const { audio, language, options } = req.body;

    const response = await fetch(`${VOICE_SERVICE_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio, language, options }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Transcription failed');
    res.status(500).json(createErrorResponse('TRANSCRIBE_FAILED', error.message));
  }
});

// ============================================
// VOICE SYNTHESIS
// ============================================

/**
 * POST /api/voice/synthesize
 * Convert text to speech
 */
router.post('/synthesize', async (req, res) => {
  try {
    const { text, voice, language, options } = req.body;

    const response = await fetch(`${VOICE_SERVICE_URL}/api/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice, language, options }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Synthesis failed');
    res.status(500).json(createErrorResponse('SYNTHESIZE_FAILED', error.message));
  }
});

// ============================================
// VOICE AGENTS
// ============================================

/**
 * POST /api/voice/agent/invoke
 * Invoke a voice agent
 */
router.post('/agent/invoke', async (req, res) => {
  try {
    const { agentId, input, context } = req.body;

    const response = await fetch(`${VOICE_SERVICE_URL}/api/agents/${agentId}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string,
      },
      body: JSON.stringify({ input, context }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Voice agent invocation failed');
    res.status(500).json(createErrorResponse('AGENT_FAILED', error.message));
  }
});

/**
 * GET /api/voice/agents
 * List available voice agents
 */
router.get('/agents', async (req, res) => {
  try {
    const response = await fetch(`${VOICE_SERVICE_URL}/api/agents`, {
      method: 'GET',
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list agents');
    res.status(500).json(createErrorResponse('LIST_FAILED', error.message));
  }
});

// ============================================
// VOICE CONVERSATIONS
// ============================================

/**
 * POST /api/voice/conversation
 * Create a new voice conversation
 */
router.post('/conversation', async (req, res) => {
  try {
    const { agentId, language, voice } = req.body;

    const conversation = {
      id: `conv_${Date.now()}`,
      agentId,
      language: language || 'en',
      voice: voice || 'default',
      status: 'active',
      messages: [],
      createdAt: new Date().toISOString(),
    };

    res.status(201).json(conversation);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to create conversation');
    res.status(500).json(createErrorResponse('CREATE_FAILED', error.message));
  }
});

/**
 * POST /api/voice/conversation/:id/message
 * Send a message in a voice conversation
 */
router.post('/conversation/:id/message', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, content } = req.body;

    const message = {
      id: `msg_${Date.now()}`,
      conversationId: id,
      type, // 'text' or 'audio'
      content,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(message);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to send message');
    res.status(500).json(createErrorResponse('MESSAGE_FAILED', error.message));
  }
});

// ============================================
// VOICE SETTINGS
// ============================================

/**
 * GET /api/voice/settings
 * Get voice platform settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = {
      voices: [
        { id: 'female_en', name: 'English Female', language: 'en' },
        { id: 'male_en', name: 'English Male', language: 'en' },
        { id: 'female_hi', name: 'Hindi Female', language: 'hi' },
        { id: 'male_hi', name: 'Hindi Male', language: 'hi' },
      ],
      languages: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml'],
      features: {
        wakeWord: true,
        vad: true,
        diarization: true,
        translation: true,
      },
    };

    res.json(settings);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get settings');
    res.status(500).json(createErrorResponse('SETTINGS_FAILED', error.message));
  }
});

export default router;
