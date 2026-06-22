/**
 * Voice Service - STT/TTS
 *
 * Features:
 * - Speech to Text (OpenAI Whisper)
 * - Text to Speech (ElevenLabs)
 * - Streaming support
 */

import express from 'express';
import multer from 'multer';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import axios from 'axios';

const app = express();
const PORT = parseInt(process.env.PORT || '4033', 10);

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: "10kb" }));

// Health
app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'voice-service' });
});

// ============================================================================
// SPEECH TO TEXT
// ============================================================================

/**
 * POST /api/stt
 * Convert speech to text
 */
app.post('/api/stt', upload.single('audio'), async (req, res) => {
  try {
    const audioBuffer = req.file?.buffer;
    const language = req.body.language || 'en';

    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio provided' });
    }

    // Option 1: OpenAI Whisper
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.m4a',
        contentType: 'audio/m4a',
      });
      formData.append('model', 'whisper-1');
      formData.append('language', language);

      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            ...formData.getHeaders(),
          },
        }
      );

      return res.json({ text: response.data.text });
    }

    // Fallback: Mock response
    res.json({ text: 'Mock transcription' });
  } catch (error) {
    console.error('[STT] Error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

/**
 * POST /api/stt/stream
 * Streaming transcription (WebSocket in production)
 */
app.post('/api/stt/stream', async (req, res) => {
  res.json({ message: 'Use WebSocket for streaming' });
});

// ============================================================================
// TEXT TO SPEECH
// ============================================================================

/**
 * POST /api/tts
 * Convert text to speech
 */
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice_id, settings } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const elevenlabsKey = process.env.ELEVENLABS_API_KEY;

    if (elevenlabsKey) {
      // ElevenLabs API
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice_id || 'pMszSj1HjHeNapYHGDby'}/stream`,
        {
          text,
          voice_settings: settings || {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': elevenlabsKey,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      res.setHeader('Content-Type', 'audio/mpeg');
      await pipeline(response.data, res);
      return;
    }

    // Fallback: Return placeholder
    res.json({ audioUrl: 'mock://audio' });
  } catch (error) {
    console.error('[TTS] Error:', error);
    res.status(500).json({ error: 'Synthesis failed' });
  }
});

/**
 * GET /api/tts/preview
 * Get voice preview URL
 */
app.get('/api/tts/preview', async (req, res) => {
  const { voice_id } = req.query;

  const elevenlabsKey = process.env.ELEVENLABS_API_KEY;

  if (elevenlabsKey) {
    const response = await axios.get(
      `https://api.elevenlabs.io/v1/voices/${voice_id}/audio`,
      {
        headers: { 'xi-api-key': elevenlabsKey },
        responseType: 'stream',
      }
    );

    res.setHeader('Content-Type', 'audio/mpeg');
    await pipeline(response.data, res);
    return;
  }

  res.json({ previewUrl: 'mock://preview' });
});

// ============================================================================
// VOICE MANAGEMENT
// ============================================================================

/**
 * GET /api/voices
 * List available voices
 */
app.get('/api/voices', async (req, res) => {
  const elevenlabsKey = process.env.ELEVENLABS_API_KEY;

  if (elevenlabsKey) {
    const response = await axios.get(
      'https://api.elevenlabs.io/v1/voices',
      {
        headers: { 'xi-api-key': elevenlabsKey },
      }
    );

    return res.json({ voices: response.data.voices });
  }

  // Default voices
  res.json({
    voices: [
      {
        voice_id: 'pMszSj1HjHeNapYHGDby',
        name: 'Professional',
        category: 'professional',
      },
      {
        voice_id: 'TX3LPaxmHKxFVD7kaB2a',
        name: 'Friendly',
        category: 'friendly',
      },
    ],
  });
});

// ============================================================================
// START
// ============================================================================

app.listen(PORT, () => {
  console.log(`[Voice] Service running on port ${PORT}`);
});

export default app;
