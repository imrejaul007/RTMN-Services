import OpenAI from 'openai';
import winston from 'winston';
import type { TTSOptions } from '../types.js';

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

export class TTSService {
  private client: OpenAI | null = null;
  private defaultVoice: string;
  private defaultModel: string;

  constructor() {
    this.defaultVoice = process.env.TTS_VOICE || 'alloy';
    this.defaultModel = process.env.TTS_MODEL || 'tts-1';
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OpenAI API key not configured - TTS service will not work');
      return;
    }

    this.client = new OpenAI({ apiKey });
    logger.info('TTS Service initialized', {
      model: this.defaultModel,
      voice: this.defaultVoice,
    });
  }

  async synthesizeSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<Buffer> {
    if (!this.client) {
      throw new Error('TTS client not initialized - missing API key');
    }

    try {
      const response = await this.client.audio.speech.create({
        model: options.model || this.defaultModel,
        voice: options.voice || this.defaultVoice,
        input: text,
        speed: options.speed || 1.0,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await response.arrayBuffer());

      logger.debug('Speech synthesized', {
        textLength: text.length,
        durationEstimate: buffer.length / 16000, // rough estimate
      });

      return buffer;
    } catch (error) {
      logger.error('Speech synthesis failed', { error, textLength: text.length });
      throw error;
    }
  }

  async synthesizeStream(
    text: string,
    options: TTSOptions = {}
  ): Promise<ReadableStream> {
    if (!this.client) {
      throw new Error('TTS client not initialized - missing API key');
    }

    try {
      const response = await this.client.audio.speech.create({
        model: options.model || this.defaultModel,
        voice: options.voice || this.defaultVoice,
        input: text,
        speed: options.speed || 1.0,
        response_format: 'mp3',
      });

      const stream = response.body;

      logger.debug('Speech synthesis stream started', { textLength: text.length });

      return stream;
    } catch (error) {
      logger.error('Speech synthesis stream failed', { error });
      throw error;
    }
  }

  // Generate silence audio (for pauses between sentences)
  generateSilence(durationMs: number = 500): Buffer {
    // Generate a simple WAV silence file
    const sampleRate = 16000;
    const numSamples = Math.floor(sampleRate * (durationMs / 1000));
    const dataSize = numSamples * 2; // 16-bit mono
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // chunk size
    buffer.writeUInt16LE(1, 20); // audio format (PCM)
    buffer.writeUInt16LE(1, 22); // num channels
    buffer.writeUInt32LE(sampleRate, 24); // sample rate
    buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
    buffer.writeUInt16LE(2, 32); // block align
    buffer.writeUInt16LE(16, 34); // bits per sample

    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Silence is already zeros, just return
    return buffer;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }
}

export const ttsService = new TTSService();
