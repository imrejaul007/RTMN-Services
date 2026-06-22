/**
 * RAZO Keyboard - Voice/STT Client
 *
 * Integrates with RTNM voice-service for:
 * - Speech-to-Text (Whisper)
 * - Text-to-Speech (ElevenLabs)
 */

import FormData from 'form-data';
import axios from 'axios';

// Configuration
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:4033';
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base';

// ============================================
// TYPES
// ============================================

export interface STTResult {
  text: string;
  confidence: number;
  language?: string;
}

export interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

export interface TTSResult {
  audioUrl?: string;
  audioBase64?: string;
}

export interface VoiceProcessingResult {
  text: string;
  intent?: string;
  entities?: Record<string, string>;
  confidence: number;
}

// ============================================
// VOICE SERVICE CLIENT
// ============================================

export class VoiceClient {
  private baseUrl: string;
  private whisperModel: string;

  constructor(baseUrl = VOICE_SERVICE_URL, whisperModel = WHISPER_MODEL) {
    this.baseUrl = baseUrl;
    this.whisperModel = whisperModel;
  }

  /**
   * Speech-to-Text using Whisper
   */
  async speechToText(
    audioBuffer: Buffer,
    options: {
      language?: string;
      format?: string;
    } = {}
  ): Promise<STTResult> {
    const { language = 'en', format = 'm4a' } = options;

    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: `audio.${format}`,
        contentType: `audio/${format}`,
      });
      formData.append('model', this.whisperModel);
      formData.append('language', language);

      const response = await axios.post(`${this.baseUrl}/api/stt`, formData, {
        headers: {
          ...formData.getHeaders(),
          ...(process.env.INTERNAL_SERVICE_TOKEN && {
            'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN,
          }),
        },
        timeout: 30000,
      });

      return {
        text: response.data.text || '',
        confidence: response.data.confidence || 0.9,
        language: response.data.language || language,
      };
    } catch (error: any) {
      console.error('STT error:', error.message);
      // Return empty result on failure
      return {
        text: '',
        confidence: 0,
        language,
      };
    }
  }

  /**
   * Text-to-Speech using ElevenLabs
   */
  async textToSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    const {
      voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00tcm4el8am8noocxocnqwd',
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0,
    } = options;

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.warn('ElevenLabs API key not configured');
      return {};
    }

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          text,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
          },
        },
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }
      );

      // Return as base64 for streaming services
      const audioBase64 = Buffer.from(response.data, 'binary').toString('base64');
      return { audioBase64 };
    } catch (error: any) {
      console.error('TTS error:', error.message);
      return {};
    }
  }

  /**
   * Full voice pipeline: STT -> Intent -> Response
   */
  async processVoiceCommand(
    audioBuffer: Buffer,
    userId: string,
    options: { language?: string } = {}
  ): Promise<VoiceProcessingResult> {
    // Step 1: Speech to text
    const sttResult = await this.speechToText(audioBuffer, options);

    if (!sttResult.text) {
      return {
        text: '',
        confidence: 0,
      };
    }

    // Step 2: Basic intent detection
    const text = sttResult.text.toLowerCase();
    let intent = 'general';

    if (text.includes('book') || text.includes('order')) intent = 'booking';
    else if (text.includes('call') || text.includes('dial')) intent = 'call';
    else if (text.includes('message') || text.includes('send')) intent = 'message';
    else if (text.includes('remind') || text.includes('schedule')) intent = 'schedule';
    else if (text.includes('search') || text.includes('find')) intent = 'search';
    else if (text.includes('play') || text.includes('music')) intent = 'music';
    else if (text.includes('weather')) intent = 'weather';
    else if (text.includes('news')) intent = 'news';

    // Step 3: Extract basic entities
    const entities: Record<string, string> = {};

    // Extract time
    const timeMatch = text.match(/\d{1,2}:\d{2}/);
    if (timeMatch) entities.time = timeMatch[0];

    // Extract numbers
    const numMatch = text.match(/\d+/);
    if (numMatch) entities.number = numMatch[0];

    // Extract common keywords
    ['cab', 'flight', 'hotel', 'food', 'movie', 'song'].forEach((keyword) => {
      if (text.includes(keyword)) entities[keyword] = keyword;
    });

    return {
      text: sttResult.text,
      intent,
      entities,
      confidence: sttResult.confidence,
    };
  }
}

// Singleton instance
let voiceClient: VoiceClient | null = null;

/**
 * Get voice client instance
 */
export function getVoiceClient(): VoiceClient {
  if (!voiceClient) {
    voiceClient = new VoiceClient();
  }
  return voiceClient;
}

/**
 * Process voice input with fallback
 */
export async function processVoiceInput(
  audioBuffer: Buffer,
  userId: string,
  options: { language?: string } = {}
): Promise<VoiceProcessingResult> {
  const client = getVoiceClient();

  try {
    return await client.processVoiceCommand(audioBuffer, userId, options);
  } catch (error) {
    console.error('Voice processing failed:', error);
    return {
      text: '',
      confidence: 0,
    };
  }
}

/**
 * Grammar correction with voice-style adaptations
 */
export function cleanupVoiceText(text: string): {
  cleaned: string;
  grammar: string[];
  suggestions: string[];
} {
  const grammar: string[] = [];
  const suggestions: string[] = [];

  // Remove filler words
  const fillers = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally'];
  let cleaned = text;

  fillers.forEach((f) => {
    const regex = new RegExp(`\\b${f}\\b`, 'gi');
    if (regex.test(cleaned)) {
      grammar.push(`Removed filler: "${f}"`);
      cleaned = cleaned.replace(regex, '');
    }
  });

  // Remove duplicate words
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
  if (cleaned !== text) {
    grammar.push('Removed duplicate words');
  }

  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }

  // Add period if missing
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return {
    cleaned,
    grammar,
    suggestions,
  };
}

/**
 * Hinglish detection and handling
 */
export function detectHinglish(text: string): {
  isHinglish: boolean;
  languageMix: string[];
  suggestions: string[];
} {
  const hindiWords = [
    'hai', 'ka', 'ki', 'ke', 'me', 'se', 'ko', 'na', 'or', 'aur', 'yeh', 'woh',
    'kya', 'kaise', 'kyun', 'kab', 'kitna', 'kaha', 'batao', 'bol', 'deko',
    'thoda', 'bahut', 'sirf', 'hi', 'bhi', 'toh', 'to', 'ya', 'ab', 'phir',
    'theek', 'haan', 'nahi', 'matlab', 'samajh', 'lo', 'ja', 'raha', 'rahi',
  ];

  const words = text.toLowerCase().split(/\s+/);
  const hindiCount = words.filter((w) => hindiWords.includes(w)).length;
  const isHinglish = hindiCount > words.length * 0.2;

  return {
    isHinglish,
    languageMix: isHinglish ? ['en', 'hi'] : ['en'],
    suggestions: isHinglish ? ['Consider using English-only for formal communication'] : [],
  };
}
