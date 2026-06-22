// ============================================================================
// HOJAI VOICE PLATFORM - Type Definitions
// ============================================================================

import { Request } from 'express';

// ----------------------------------------------------------------------------
// Language & Voice Types
// ----------------------------------------------------------------------------

export type SupportedLanguage =
  | 'en-IN' | 'hi-IN' | 'ta-IN' | 'te-IN' | 'bn-IN'
  | 'kn-IN' | 'ml-IN' | 'mr-IN' | 'gu-IN' | 'pa-IN';

export type SupportedVoice =
  | '预设-indian-female-1' | '预设-indian-female-2' | '预设-indian-male-1'
  | '预设-indian-male-2' | '预设-indian-child-1';

export type TTSEngine = 'elevenlabs' | 'cartesia' | 'sarvam';
export type STTEngine = 'whisper' | 'sarvam' | 'google';

export interface VoiceConfig {
  language: SupportedLanguage;
  voiceId: SupportedVoice;
  ttsEngine: TTSEngine;
  sttEngine: STTEngine;
  speed?: number; // 0.5 - 2.0
  pitch?: number; // 0.5 - 2.0
  volume?: number; // 0.0 - 1.0
}

// ----------------------------------------------------------------------------
// Voice Agent Types
// ----------------------------------------------------------------------------

export type AgentType =
  | 'customer-service'
  | 'voice-commerce'
  | 'voice-search'
  | 'appointment';

export type AgentStatus = 'active' | 'inactive' | 'training' | 'error';

export interface VoiceAgent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  language: SupportedLanguage;
  voiceConfig: VoiceConfig;
  greeting: string;
  farewell: string;
  intents: IntentDefinition[];
  entities: EntityDefinition[];
  contextWindow: number; // Number of previous messages to consider
  escalationNumber?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntentDefinition {
  id: string;
  name: string;
  description: string;
  examples: string[];
  action: string; // Function to call when intent is matched
  parameters?: Record<string, ParameterDefinition>;
  requiredParameters?: string[];
  followUp?: string; // Next question to ask
  escalationThreshold?: number; // Negative sentiment threshold
}

export interface EntityDefinition {
  id: string;
  name: string;
  type: 'regex' | 'list' | 'builtin';
  values?: string[];
  patterns?: string[];
  builtinType?: 'date' | 'time' | 'number' | 'phone' | 'email';
}

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'time' | 'boolean' | 'enum';
  description: string;
  defaultValue?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowedValues?: string[];
  };
}

// ----------------------------------------------------------------------------
// Call Types
// ----------------------------------------------------------------------------

export type CallStatus =
  | 'initiated' | 'ringing' | 'in-progress' | 'completed'
  | 'failed' | 'busy' | 'no-answer' | 'transferred' | 'voicemail';

export type CallDirection = 'inbound' | 'outbound';

export type CallOutcome =
  | 'completed' | 'transferred' | 'voicemail' | 'abandoned' | 'failed';

export interface Call {
  id: string;
  agentId: string;
  direction: CallDirection;
  status: CallStatus;
  from: string;
  to: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in seconds
  outcome?: CallOutcome;
  transcriptId?: string;
  sentiment?: SentimentScore;
  recordingUrl?: string;
  transferTo?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallTransfer {
  id: string;
  callId: string;
  fromAgentId: string;
  toNumber: string;
  reason: string;
  timestamp: Date;
}

// ----------------------------------------------------------------------------
// Session Types
// ----------------------------------------------------------------------------

export type SessionStatus = 'active' | 'completed' | 'expired' | 'error';

export interface Session {
  id: string;
  agentId: string;
  callId?: string;
  customerId?: string;
  customerPhone?: string;
  status: SessionStatus;
  language: SupportedLanguage;
  context: SessionContext;
  messageHistory: Message[];
  currentIntent?: string;
  currentParameters: Record<string, unknown>;
  sentimentHistory: SentimentScore[];
  startTime: Date;
  endTime?: Date;
  lastActivityTime: Date;
  metadata: Record<string, unknown>;
}

export interface SessionContext {
  customerName?: string;
  customerEmail?: string;
  previousInteractions?: number;
  preferences?: Record<string, unknown>;
  customData?: Record<string, unknown>;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  audioUrl?: string;
  transcriptId?: string;
  intent?: string;
  confidence?: number;
  entities?: ExtractedEntity[];
  sentiment?: SentimentScore;
  timestamp: Date;
}

export interface ExtractedEntity {
  entity: string;
  type: string;
  value: unknown;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

// ----------------------------------------------------------------------------
// Transcription Types
// ----------------------------------------------------------------------------

export interface Transcript {
  id: string;
  callId: string;
  sessionId: string;
  messages: TranscriptMessage[];
  language: SupportedLanguage;
  engine: STTEngine;
  totalDuration: number;
  wordCount: number;
  createdAt: Date;
}

export interface TranscriptMessage {
  id: string;
  speaker: 'customer' | 'agent' | 'unknown';
  text: string;
  startTime: number; // milliseconds
  endTime: number;
  confidence: number;
  words?: WordTiming[];
}

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  words?: WordTiming[];
  duration?: number;
}

// ----------------------------------------------------------------------------
// Synthesis Types
// ----------------------------------------------------------------------------

export interface SynthesisRequest {
  text: string;
  language: SupportedLanguage;
  voiceId: SupportedVoice;
  engine: TTSEngine;
  speed?: number;
  pitch?: number;
}

export interface SynthesisResult {
  audioUrl: string;
  duration: number; // in seconds
  format: 'mp3' | 'wav' | 'ogg';
}

// ----------------------------------------------------------------------------
// Intent & NLU Types
// ----------------------------------------------------------------------------

export interface IntentResult {
  intent: string;
  confidence: number;
  parameters: Record<string, unknown>;
  entities: ExtractedEntity[];
  sentiment?: SentimentScore;
  followUp?: string;
}

export interface SentimentScore {
  label: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  confidence: number;
}

export interface ConversationTurn {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

// ----------------------------------------------------------------------------
// Analytics Types
// ----------------------------------------------------------------------------

export interface AnalyticsSummary {
  totalCalls: number;
  completedCalls: number;
  averageDuration: number;
  averageSentiment: number;
  topIntents: IntentCount[];
  callsByHour: HourlyCount[];
  sentimentTrend: SentimentTrend[];
  completionRate: number;
  transferRate: number;
  abandonmentRate: number;
}

export interface IntentCount {
  intent: string;
  count: number;
  percentage: number;
}

export interface HourlyCount {
  hour: number;
  count: number;
}

export interface SentimentTrend {
  date: string;
  averageSentiment: number;
  totalCalls: number;
}

export interface AgentAnalytics {
  agentId: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: AnalyticsSummary;
  callDetails: Call[];
}

// ----------------------------------------------------------------------------
// Telecom Types
// ----------------------------------------------------------------------------

export type TelecomProvider = 'twilio' | 'exotel' | 'knowlarity';

export interface TelecomConfig {
  provider: TelecomProvider;
  credentials: TelecomCredentials;
  webhookUrl: string;
}

export interface TelecomCredentials {
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  apiToken?: string;
  number?: string;
}

export interface OutboundCallRequest {
  to: string;
  from?: string;
  agentId: string;
  metadata?: Record<string, unknown>;
}

export interface InboundCallEvent {
  callId: string;
  from: string;
  to: string;
  direction: 'inbound';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// WebSocket Types
// ----------------------------------------------------------------------------

export type WSMessageType =
  | 'audio' | 'transcript' | 'intent' | 'synthesis' | 'error'
  | 'heartbeat' | 'session-update' | 'status';

export interface WSMessage {
  type: WSMessageType;
  sessionId: string;
  data: unknown;
  timestamp: Date;
}

export interface WSAudioMessage {
  type: 'audio';
  sessionId: string;
  data: {
    audio: string; // base64 encoded
    format: string;
  };
  timestamp: Date;
}

export interface WSTranscriptMessage {
  type: 'transcript';
  sessionId: string;
  data: {
    text: string;
    confidence: number;
    isFinal: boolean;
  };
  timestamp: Date;
}

export interface WSIntentMessage {
  type: 'intent';
  sessionId: string;
  data: IntentResult;
  timestamp: Date;
}

// ----------------------------------------------------------------------------
// API Request/Response Types
// ----------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  type: AgentType;
  language?: SupportedLanguage;
  voiceConfig?: Partial<VoiceConfig>;
  greeting?: string;
  farewell?: string;
  intents?: Omit<IntentDefinition, 'id'>[];
  entities?: Omit<EntityDefinition, 'id'>[];
  contextWindow?: number;
  escalationNumber?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {}

export interface CreateCallRequest {
  to: string;
  from?: string;
  agentId: string;
  metadata?: Record<string, unknown>;
}

export interface StartSessionRequest {
  agentId: string;
  callId?: string;
  customerId?: string;
  customerPhone?: string;
  language?: SupportedLanguage;
  context?: Partial<SessionContext>;
  metadata?: Record<string, unknown>;
}

export interface SendMessageRequest {
  content: string;
  audioUrl?: string;
}

export interface WebhookPayload {
  CallSid?: string;
  From?: string;
  To?: string;
  CallStatus?: string;
  RecordingUrl?: string;
  TranscriptionText?: string;
  [key: string]: unknown;
}

// ----------------------------------------------------------------------------
// User & Auth Types
// ----------------------------------------------------------------------------

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role: 'admin' | 'user' | 'viewer';
  };
}

export interface TokenPayload {
  userId: string;
  organizationId: string;
  role: 'admin' | 'user' | 'viewer';
}

// ----------------------------------------------------------------------------
// Plan & Billing Types
// ----------------------------------------------------------------------------

export type PlanType = 'starter' | 'growth' | 'enterprise';

export interface Plan {
  id: PlanType;
  name: string;
  price: number; // in INR
  currency: 'INR';
  features: {
    minutes: number;
    agents: number;
    languages: number;
    integrations: string[];
    support: 'email' | 'chat' | 'dedicated';
  };
}

export interface UsageMetrics {
  organizationId: string;
  plan: PlanType;
  minutesUsed: number;
  minutesIncluded: number;
  agentsUsed: number;
  agentsIncluded: number;
  billingPeriod: {
    start: Date;
    end: Date;
  };
}

// ----------------------------------------------------------------------------
// Export all types
// ----------------------------------------------------------------------------

export {
  // Re-exported types are already exported above
};
