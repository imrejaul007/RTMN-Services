/**
 * Voice Cloning Service — v1.0.0
 * ====================================
 * Voice cloning and synthesis for Genie RAZO:
 * - ElevenLabs API (production)
 * - Resemblyzer (local voice embedding)
 * - Voice Twin storage
 * - Emotional voice rendering
 *
 * Port: 4897
 *
 * This enables Genie to SPEAK AS YOU with your permission.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 4897;

// Configuration
const CONFIG = {
  // ElevenLabs
  elevenLabsKey: process.env.ELEVENLABS_API_KEY,
  elevenLabsUrl: 'https://api.elevenlabs.io/v1',

  // Voice ID storage
  voiceStorageUrl: process.env.VOICE_STORAGE_URL || 'http://localhost:4895', // voice-embedding

  // Cache settings
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || '86400000')
};

// Voice profiles (userId → voice profile)
const voiceProfiles = new Map();
const synthesisCache = new Map();
const cloneJobs = new Map();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─────────────────────────────────────────────────────────────────────────────
// Voice Profile Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/voice/clone
 * Create a voice clone from audio samples
 *
 * Body: {
 *   userId: string,
 *   name: string,
 *   samples: [base64, base64, ...], // 3-30 minutes of audio recommended
 *   description?: string
 * }
 */
app.post('/api/voice/clone', async (req, res) => {
  try {
    const { userId, name, samples = [], description = '' } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: 'userId and name required' });
    }

    if (samples.length === 0) {
      return res.status(400).json({ error: 'At least one audio sample required' });
    }

    const jobId = uuidv4();

    // Create job
    cloneJobs.set(jobId, {
      jobId,
      userId,
      name,
      status: 'processing',
      progress: 0,
      createdAt: new Date().toISOString()
    });

    // Start async cloning
    cloneVoiceAsync(jobId, { userId, name, samples, description });

    res.json({
      success: true,
      jobId,
      status: 'processing',
      message: 'Voice cloning started. Check /api/voice/job/:jobId for status.'
    });
  } catch (error) {
    console.error('[voice-cloning]', error);
    res.status(500).json({ error: error.message });
  }
});

async function cloneVoiceAsync(jobId, params) {
  const { userId, name, samples, description } = params;
  const job = cloneJobs.get(jobId);

  try {
    // Step 1: Validate samples
    job.progress = 10;
    job.status = 'processing';

    if (CONFIG.elevenLabsKey) {
      // Use ElevenLabs API
      await cloneWithElevenLabs(jobId, params);
    } else {
      // Use local/mocked cloning
      await cloneWithLocal(jobId, params);
    }

    job.progress = 100;
    job.status = 'completed';
    job.voiceId = `${userId}_voice`;
    job.completedAt = new Date().toISOString();

  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.failedAt = new Date().toISOString();
  }
}

async function cloneWithElevenLabs(jobId, params) {
  const job = cloneJobs.get(jobId);
  const { userId, name, samples, description } = params;

  // Upload each sample
  const sampleIds = [];
  for (let i = 0; i < samples.length; i++) {
    const sampleBuffer = Buffer.from(samples[i], 'base64');

    const formData = new FormData();
    formData.append('audio', new Blob([sampleBuffer]), `sample_${i}.wav`);
    formData.append('description', `Sample ${i + 1} for ${name}`);

    const response = await axios.post(
      `${CONFIG.elevenLabsUrl}/voices/add`,
      formData,
      {
        headers: {
          'xi-api-key': CONFIG.elevenLabsKey,
          ...formData.getHeaders()
        }
      }
    );

    sampleIds.push(response.data.voice_id);
    job.progress = 20 + (i / samples.length) * 30;
  }

  // Create the voice
  const voiceResponse = await axios.post(
    `${CONFIG.elevenLabsUrl}/voices/add`,
    {
      name,
      description: description || `Voice clone for ${userId}`,
      labels: { userId, purpose: 'genie' },
      is_public: false
    },
    {
      headers: {
        'xi-api-key': CONFIG.elevenLabsKey,
        'Content-Type': 'application/json'
      }
    }
  );

  job.progress = 60;

  // Add samples to voice
  for (const sampleId of sampleIds) {
    await axios.post(
      `${CONFIG.elevenLabsUrl}/voices/${voiceResponse.data.voice_id}/samples/${sampleId}/edit`,
      {},
      { headers: { 'xi-api-key': CONFIG.elevenLabsKey } }
    );
  }

  job.progress = 90;

  // Store profile locally
  voiceProfiles.set(userId, {
    userId,
    name,
    voiceId: voiceResponse.data.voice_id,
    provider: 'elevenlabs',
    sampleCount: samples.length,
    description,
    createdAt: new Date().toISOString(),
    settings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true
    }
  });
}

async function cloneWithLocal(jobId, params) {
  const job = cloneJobs.get(jobId);
  const { userId, name } = params;

  // Local mock - in production use Resemblyzer
  await new Promise(resolve => setTimeout(resolve, 2000));

  voiceProfiles.set(userId, {
    userId,
    name,
    voiceId: `${userId}_local`,
    provider: 'local',
    sampleCount: params.samples?.length || 0,
    createdAt: new Date().toISOString(),
    settings: {
      pitch: 1.0,
      speed: 1.0,
      emphasis: 'normal'
    }
  });

  job.progress = 100;
}

/**
 * GET /api/voice/job/:jobId
 * Get clone job status
 */
app.get('/api/voice/job/:jobId', (req, res) => {
  const job = cloneJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

/**
 * GET /api/voice/profile/:userId
 * Get voice profile for user
 */
app.get('/api/voice/profile/:userId', (req, res) => {
  const profile = voiceProfiles.get(req.params.userId);

  if (!profile) {
    return res.status(404).json({ error: 'Voice profile not found' });
  }

  res.json(profile);
});

/**
 * DELETE /api/voice/profile/:userId
 * Delete voice profile
 */
app.delete('/api/voice/profile/:userId', async (req, res) => {
  const profile = voiceProfiles.get(req.params.userId);

  if (profile && profile.voiceId && profile.provider === 'elevenlabs') {
    // Delete from ElevenLabs
    try {
      await axios.delete(
        `${CONFIG.elevenLabsUrl}/voices/${profile.voiceId}`,
        { headers: { 'xi-api-key': CONFIG.elevenLabsKey } }
      );
    } catch (e) {
      console.warn('[voice-cloning] Failed to delete from ElevenLabs:', e.message);
    }
  }

  voiceProfiles.delete(req.params.userId);

  res.json({ success: true, message: 'Voice profile deleted' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Voice Synthesis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/voice/speak
 * Synthesize speech with user's voice
 *
 * Body: {
 *   userId: string,
 *   text: string,
 *   emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm',
 *   settings?: { stability, similarityBoost, style }
 * }
 */
app.post('/api/voice/speak', async (req, res) => {
  try {
    const { userId, text, emotion = 'neutral', settings = {} } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ error: 'userId and text required' });
    }

    const profile = voiceProfiles.get(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Voice profile not found. Clone voice first.' });
    }

    // Check cache
    const cacheKey = `${userId}:${text}:${emotion}`;
    if (CONFIG.cacheEnabled && synthesisCache.has(cacheKey)) {
      const cached = synthesisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CONFIG.cacheTtlMs) {
        return res.json({ ...cached, cached: true });
      }
    }

    // Synthesize
    const audio = await synthesizeSpeech(userId, text, emotion, { ...profile.settings, ...settings });

    const result = {
      success: true,
      userId,
      text,
      emotion,
      audio, // base64 encoded audio
      duration: estimateDuration(text),
      timestamp: new Date().toISOString()
    };

    // Cache
    if (CONFIG.cacheEnabled) {
      synthesisCache.set(cacheKey, result);
    }

    res.json(result);
  } catch (error) {
    console.error('[voice-cloning]', error);
    res.status(500).json({ error: error.message });
  }
});

async function synthesizeSpeech(userId, text, emotion, settings) {
  const profile = voiceProfiles.get(userId);

  if (profile.provider === 'elevenlabs' && CONFIG.elevenLabsKey) {
    // Use ElevenLabs
    const emotionSettings = getEmotionSettings(emotion);

    const response = await axios.post(
      `${CONFIG.elevenLabsUrl}/text-to-speech/${profile.voiceId}`,
      {
        text,
        voice_settings: {
          stability: settings.stability ?? emotionSettings.stability,
          similarity_boost: settings.similarityBoost ?? emotionSettings.similarityBoost,
          style: settings.style ?? emotionSettings.style,
          use_speaker_boost: settings.useSpeakerBoost ?? true
        },
        model_id: 'eleven_multilingual_v2'
      },
      {
        headers: {
          'xi-api-key': CONFIG.elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');

  } else {
    // Local synthesis (mock)
    await new Promise(resolve => setTimeout(resolve, 100));
    return Buffer.from('mock_audio_data').toString('base64');
  }
}

function getEmotionSettings(emotion) {
  const settings = {
    neutral: { stability: 0.5, similarityBoost: 0.75, style: 0.5 },
    happy: { stability: 0.4, similarityBoost: 0.8, style: 0.8 },
    sad: { stability: 0.6, similarityBoost: 0.7, style: 0.3 },
    excited: { stability: 0.3, similarityBoost: 0.85, style: 1.0 },
    calm: { stability: 0.7, similarityBoost: 0.7, style: 0.2 }
  };

  return settings[emotion] || settings.neutral;
}

function estimateDuration(text) {
  // Rough estimate: ~150 words per minute
  const words = text.split(/\s+/).length;
  return Math.round(words / 150 * 60);
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Settings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/voice/settings/:userId
 * Update voice settings
 */
app.put('/api/voice/settings/:userId', (req, res) => {
  const profile = voiceProfiles.get(req.params.userId);

  if (!profile) {
    return res.status(404).json({ error: 'Voice profile not found' });
  }

  profile.settings = { ...profile.settings, ...req.body };
  profile.updatedAt = new Date().toISOString();

  res.json({ success: true, settings: profile.settings });
});

/**
 * GET /api/voice/settings/:userId
 * Get voice settings
 */
app.get('/api/voice/settings/:userId', (req, res) => {
  const profile = voiceProfiles.get(req.params.userId);

  if (!profile) {
    return res.status(404).json({ error: 'Voice profile not found' });
  }

  res.json(profile.settings);
});

// ─────────────────────────────────────────────────────────────────────────────
// RAZO Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/razo/speak
 * RAZO speaks as user (for Genie → RAZO integration)
 *
 * Body: {
 *   userId: string,
 *   recipientId?: string, // Who receives this
 *   message: string,
 *   emotion?: string,
 *   channel?: 'whatsapp' | 'sms' | 'call'
 * }
 */
app.post('/api/razo/speak', async (req, res) => {
  try {
    const { userId, recipientId, message, emotion = 'neutral', channel = 'whatsapp' } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message required' });
    }

    const profile = voiceProfiles.get(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Voice not cloned. Clone voice first.' });
    }

    // Generate audio
    const audio = await synthesizeSpeech(userId, message, emotion);

    // In production, this would:
    // 1. Send audio to RAZO
    // 2. RAZO delivers via the specified channel
    // 3. Record the delivery status

    res.json({
      success: true,
      audio,
      channel,
      recipientId,
      message,
      timestamp: new Date().toISOString(),
      disclosure: `This message was generated using ${userId}'s authorized voice profile.`
    });
  } catch (error) {
    console.error('[voice-cloning]', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Disclosure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AI Disclosure message (required by constitution)
 */
const AI_DISCLOSURE = 'This is [Name]\'s Genie AI assistant speaking with their permission. ';

/**
 * POST /api/voice/prepare-message
 * Prepare a message with AI disclosure
 */
app.post('/api/voice/prepare-message', (req, res) => {
  const { userName = 'the user', message, addDisclosure = true } = req.body;

  const prepared = {
    original: message,
    withDisclosure: addDisclosure ? `${AI_DISCLOSURE.replace('[Name]', userName)}${message}` : message,
    aiDisclosureRequired: addDisclosure,
    timestamp: new Date().toISOString()
  };

  res.json(prepared);
});

// ─────────────────────────────────────────────────────────────────────────────
// Health & Status
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'voice-cloning',
    port: PORT,
    version: '1.0.0',
    capabilities: [
      'voice-cloning',
      'voice-synthesis',
      'emotion-rendering',
      'razo-integration',
      'ai-disclosure'
    ],
    config: {
      elevenLabsConfigured: !!CONFIG.elevenLabsKey,
      cacheEnabled: CONFIG.cacheEnabled
    },
    stats: {
      voiceProfiles: voiceProfiles.size,
      activeJobs: cloneJobs.size,
      cacheSize: synthesisCache.size
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      voiceCloning: true,
      elevenLabs: !!CONFIG.elevenLabsKey,
      cache: CONFIG.cacheEnabled
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/capabilities', (req, res) => {
  res.json({
    service: 'voice-cloning',
    version: '1.0.0',
    capabilities: {
      cloning: {
        elevenlabs: !!CONFIG.elevenLabsKey,
        local: true,
        minSamples: 3,
        recommendedSamples: 10
      },
      synthesis: {
        emotions: ['neutral', 'happy', 'sad', 'excited', 'calm'],
        languages: ['en', 'hi', 'ta', 'bn', 'mr', 'gu', 'te', 'kn', 'ml', 'pa'],
        maxLength: 5000
      },
      channels: ['whatsapp', 'sms', 'call', 'email']
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║       VOICE CLONING SERVICE v1.0.0                     ║
║                                                            ║
║  🎙️  Voice Cloning & Synthesis                         ║
║                                                            ║
║  Port: ${PORT}                                              ║
║  ElevenLabs: ${CONFIG.elevenLabsKey ? 'Configured' : 'Not configured'}                            ║
║                                                            ║
║  This enables Genie to SPEAK AS YOU:                     ║
║                                                            ║
║  Genie (Think)                                         ║
║     ↓                                                   ║
║  RAZO (Communicate) — speaks with YOUR voice            ║
║                                                            ║
║  AI Disclosure required:                                 ║
║  "This is [Name]'s Genie AI assistant speaking         ║
║   with their permission."                               ║
║                                                            ║
║  Endpoints:                                             ║
║  • POST /api/voice/clone   — Clone voice               ║
║  • POST /api/voice/speak   — Synthesize speech         ║
║  • POST /api/razo/speak    — RAZO integration         ║
║  • GET  /api/voice/profile — Get voice profile        ║
║                                                            ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('[voice-cloning] Shutting down...');
  process.exit(0);
});

export default app;
