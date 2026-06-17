import OpenAI from 'openai';
import winston from 'winston';
import type { STTResponse } from '../types.js';

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

export class STTService {
  private client: OpenAI | null = null;
  private model: string;

  constructor() {
    this.model = process.env.WHISPER_MODEL || 'whisper-1';
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('OpenAI API key not configured - STT service will not work');
      return;
    }

    this.client = new OpenAI({ apiKey });
    logger.info('STT Service initialized', { model: this.model });
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    options: {
      language?: string;
      prompt?: string;
      responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    } = {}
  ): Promise<STTResponse> {
    if (!this.client) {
      throw new Error('STT client not initialized - missing API key');
    }

    try {
      const file = new File([audioBuffer], 'audio.webm', {
        type: 'audio/webm'
      });

      const response = await this.client.audio.transcriptions.create({
        file: file,
        model: this.model,
        language: options.language,
        prompt: options.prompt,
        response_format: options.responseFormat || 'verbose_json',
      });

      logger.debug('Transcription completed', {
        textLength: response.text?.length || 0,
        language: response.language,
      });

      // Extract word timings if available
      const words = (response as any).words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })) || [];

      return {
        text: response.text,
        confidence: 1.0, // Whisper doesn't provide confidence directly
        language: response.language,
        words: words.length > 0 ? words : undefined,
      };
    } catch (error) {
      logger.error('Transcription failed', { error });
      throw error;
    }
  }

  async transcribeStream(
    audioStream: NodeJS.ReadableStream,
    options: {
      language?: string;
    } = {}
  ): Promise<STTResponse> {
    // For streaming, collect audio chunks and transcribe
    const chunks: Buffer[] = [];

    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }

    const audioBuffer = Buffer.concat(chunks);
    return this.transcribeAudio(audioBuffer, options);
  }

  isAvailable(): boolean {
    return this.client !== null;
  }
}

export const sttService = new STTService();
