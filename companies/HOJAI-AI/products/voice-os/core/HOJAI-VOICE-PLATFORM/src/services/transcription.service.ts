// ============================================================================
// HOJAI VOICE PLATFORM - Transcription Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Transcript,
  TranscriptDocument,
  TranscriptMessage,
  TranscriptionResult,
  SupportedLanguage,
  STTEngine,
} from '../types';
import { TranscriptModel } from '../models/Transcript';
import { getSTTFactory } from '../stt';

/**
 * Transcription Service - Handles speech-to-text operations
 */
export class TranscriptionService {
  private sttFactory = getSTTFactory();

  /**
   * Create a new transcript
   */
  async createTranscript(
    callId: string,
    sessionId: string,
    organizationId: string,
    language: SupportedLanguage,
    engine: STTEngine = 'whisper'
  ): Promise<TranscriptDocument> {
    const transcriptId = uuidv4();

    const transcript = await TranscriptModel.create({
      _id: transcriptId,
      callId,
      sessionId,
      organizationId,
      messages: [],
      language,
      engine,
      totalDuration: 0,
      wordCount: 0,
      metadata: {},
    });

    return transcript;
  }

  /**
   * Get transcript by call ID
   */
  async getByCallId(callId: string): Promise<TranscriptDocument | null> {
    return TranscriptModel.findByCall(callId);
  }

  /**
   * Get transcript by session ID
   */
  async getBySessionId(sessionId: string): Promise<TranscriptDocument | null> {
    return TranscriptModel.findBySession(sessionId);
  }

  /**
   * Transcribe audio
   */
  async transcribe(
    audio: Buffer | string,
    language: SupportedLanguage,
    engine?: STTEngine
  ): Promise<TranscriptionResult> {
    const sttEngine = engine || 'whisper';

    if (typeof audio === 'string' && audio.startsWith('data:')) {
      // Base64 data URL
      const base64 = audio.split(',')[1];
      return this.sttFactory.transcribeFromBase64(base64, language, sttEngine);
    }

    if (typeof audio === 'string' && audio.startsWith('http')) {
      // URL
      return this.sttFactory.transcribeFromUrl(audio, language, sttEngine);
    }

    // Buffer
    return this.sttFactory.transcribe(audio, language, sttEngine);
  }

  /**
   * Add message to transcript
   */
  async addMessage(
    transcriptId: string,
    message: Omit<TranscriptMessage, 'id'>
  ): Promise<TranscriptDocument | null> {
    const transcript = await TranscriptModel.findById(transcriptId);

    if (!transcript) return null;

    await transcript.addMessage(message);

    return transcript;
  }

  /**
   * Add customer speech to transcript
   */
  async addCustomerSpeech(
    transcriptId: string,
    text: string,
    startTime: number,
    endTime: number,
    confidence: number = 0.9
  ): Promise<TranscriptDocument | null> {
    return this.addMessage(transcriptId, {
      speaker: 'customer',
      text,
      startTime,
      endTime,
      confidence,
    });
  }

  /**
   * Add agent speech to transcript
   */
  async addAgentSpeech(
    transcriptId: string,
    text: string,
    startTime: number,
    endTime: number,
    confidence: number = 0.95
  ): Promise<TranscriptDocument | null> {
    return this.addMessage(transcriptId, {
      speaker: 'agent',
      text,
      startTime,
      endTime,
      confidence,
    });
  }

  /**
   * Get full transcript text
   */
  async getFullText(transcriptId: string): Promise<string | null> {
    const transcript = await TranscriptModel.findById(transcriptId);

    if (!transcript) return null;

    return transcript.getFullText();
  }

  /**
   * Get speaker summary
   */
  async getSpeakerSummary(
    transcriptId: string
  ): Promise<Record<string, { messageCount: number; wordCount: number; duration: number }> | null> {
    const transcript = await TranscriptModel.findById(transcriptId);

    if (!transcript) return null;

    return transcript.getSpeakerSummary();
  }

  /**
   * Get transcript by ID
   */
  async getById(transcriptId: string): Promise<TranscriptDocument | null> {
    return TranscriptModel.findById(transcriptId);
  }

  /**
   * List transcripts by organization
   */
  async listByOrganization(
    organizationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ transcripts: TranscriptDocument[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [transcripts, total] = await Promise.all([
      TranscriptModel.findByOrganization(organizationId, options),
      TranscriptModel.countDocuments({
        organizationId,
        ...(options?.startDate || options?.endDate
          ? {
              createdAt: {
                ...(options.startDate ? { $gte: options.startDate } : {}),
                ...(options.endDate ? { $lte: options.endDate } : {}),
              },
            }
          : {}),
      }),
    ]);

    return { transcripts, total };
  }

  /**
   * Get STT engine health status
   */
  async getEngineHealth(): Promise<Record<STTEngine, boolean>> {
    return this.sttFactory.healthCheck();
  }

  /**
   * Get available STT engines
   */
  getAvailableEngines(): Array<{ engine: STTEngine; name: string; priority: number }> {
    return this.sttFactory.getAvailableEngines();
  }
}

// Singleton instance
let transcriptionServiceInstance: TranscriptionService | null = null;

export function getTranscriptionService(): TranscriptionService {
  if (!transcriptionServiceInstance) {
    transcriptionServiceInstance = new TranscriptionService();
  }
  return transcriptionServiceInstance;
}

export default TranscriptionService;
