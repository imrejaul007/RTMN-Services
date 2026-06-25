// ============================================================================
// HOJAI VOICE GATEWAY - Shared Types
// ============================================================================

export type STTEngine = 'whisper' | 'deepgram' | 'google' | 'sarvam' | 'hojai';
export type TTSEngine = 'elevenlabs' | 'cartesia' | 'hojai';
export type RoutingMode = STTEngine | TTSEngine | 'auto';

export interface TranscriptionResult {
  text: string;
  language?: string;
  confidence?: number;
  words?: WordTiming[];
  engine: string;
  processingTimeMs: number;
}

export interface SynthesisResult {
  audioBase64: string;
  mimeType: string;
  durationMs?: number;
  engine: string;
  processingTimeMs: number;
}

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface TrainingSample {
  id: string;
  audioHash: string;
  transcript: string;
  language: string;
  engine: STTEngine;
  confidence: number;
  audioDurationMs: number;
  timestamp: number;
  metadata?: {
    userId?: string;
    sessionId?: string;
    domain?: string;
  };
}

export interface BenchmarkResult {
  engine: STTEngine;
  accuracy: number;
  wordErrorRate: number;
  samplesTested: number;
  testedAt: number;
  comparisonAgainst?: STTEngine;
  wins?: number;
  losses?: number;
  ties?: number;
}

export interface EngineInfo {
  engine: STTEngine | TTSEngine;
  name: string;
  provider: string;
  accuracy?: number;          // STT only
  trainingStatus: 'collecting' | 'benchmarked' | 'promoted';
  sampleCount: number;
  isDefault: boolean;
  supportsLanguages: string[];
}

export interface TrainingStats {
  totalSamples: number;
  byEngine: Record<string, number>;
  benchmarkResults: Record<string, BenchmarkResult>;
  recommendedEngine: STTEngine;
  hojaiReady: boolean;
  benchmarkIntervalHours: number;
  minSamplesRequired: number;
}

export interface STTRequest {
  audio: string;              // base64-encoded audio
  engine?: RoutingMode;
  language?: string;
  userId?: string;
  sessionId?: string;
  domain?: string;
}

export interface TTSRequest {
  text: string;
  engine?: RoutingMode;
  language?: string;
  voiceId?: string;
  speed?: number;
}
