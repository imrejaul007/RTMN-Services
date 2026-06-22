// ============================================================================
// HOJAI VOICE SDK - Type Definitions
// ============================================================================

export type SupportedLanguage =
  | 'en-IN' | 'hi-IN' | 'ta-IN' | 'te-IN' | 'bn-IN'
  | 'kn-IN' | 'ml-IN' | 'mr-IN' | 'gu-IN' | 'pa-IN';

export type SupportedVoice =
  | '预设-indian-female-1' | '预设-indian-female-2'
  | '预设-indian-male-1' | '预设-indian-male-2'
  | '预设-indian-child-1';

export type TTSEngine = 'elevenlabs' | 'cartesia' | 'sarvam';
export type STTEngine = 'whisper' | 'sarvam' | 'google';

export type AgentType = 'customer-service' | 'voice-commerce' | 'voice-search' | 'appointment';

export type SessionStatus = 'active' | 'completed' | 'expired' | 'error';

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface VoiceConfig {
  language: SupportedLanguage;
  voiceId: SupportedVoice;
  ttsEngine: TTSEngine;
  sttEngine: STTEngine;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export interface IntentResult {
  intent: string;
  confidence: number;
  parameters: Record<string, unknown>;
  entities: Array<{
    entity: string;
    type: string;
    value: unknown;
    confidence: number;
  }>;
}

export interface SentimentScore {
  label: SentimentLabel;
  score: number;
  confidence: number;
}

export interface SessionInfo {
  sessionId: string;
  agentId: string;
  status: SessionStatus;
  language: SupportedLanguage;
  startTime: Date;
}

export interface Message {
  role: 'user' | 'agent';
  content: string;
  intent?: string;
  confidence?: number;
  sentiment?: SentimentScore;
  audioUrl?: string;
  timestamp: Date;
}

export interface AgentInfo {
  id: string;
  name: string;
  type: AgentType;
  language: SupportedLanguage;
  greeting: string;
  farewell: string;
}

export interface VoiceSessionOptions {
  apiKey: string;
  baseUrl?: string;
  agentId?: string;
  language?: SupportedLanguage;
  voiceConfig?: Partial<VoiceConfig>;
  autoConnect?: boolean;
}

export interface VoiceAgentOptions extends VoiceSessionOptions {
  agentId: string;
}

export interface SynthesisOptions {
  text: string;
  language?: SupportedLanguage;
  voiceId?: SupportedVoice;
  engine?: TTSEngine;
  speed?: number;
  pitch?: number;
}

export interface TranscriptionOptions {
  audio: Blob | ArrayBuffer | string;
  language?: SupportedLanguage;
  engine?: STTEngine;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface ConnectionState {
  connected: boolean;
  sessionId?: string;
  error?: string;
}

// Events
export interface VoiceSessionEvents {
  'connected': (session: SessionInfo) => void;
  'disconnected': () => void;
  'error': (error: Error) => void;
  'speech': (text: string, intent?: IntentResult) => void;
  'response': (text: string, audio?: string) => void;
  'sentiment': (sentiment: SentimentScore) => void;
  'status': (status: SessionStatus) => void;
}
