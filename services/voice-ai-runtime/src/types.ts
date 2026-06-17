import { z } from 'zod';

// Voice Session Schema
export const VoiceSessionSchema = z.object({
  sessionId: z.string(),
  callSid: z.string().optional(),
  customerId: z.string().optional(),
  customerPhone: z.string(),
  status: z.enum(['initiated', 'in_progress', 'waiting', 'transferred', 'completed', 'failed']),
  ivrState: z.string().optional(),
  startTime: z.number(),
  endTime: z.number().optional(),
  duration: z.number().optional(),
  transcript: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string(),
    timestamp: z.number(),
    audioUrl: z.string().optional(),
  })).default([]),
  metadata: z.record(z.any()).default({}),
});

export type VoiceSession = z.infer<typeof VoiceSessionSchema>;

// IVR Menu Option
export interface IVROption {
  digit: string;
  prompt: string;
  action: string;
  params?: Record<string, any>;
}

// IVR Flow
export interface IVRFlow {
  id: string;
  name: string;
  initialState: string;
  states: Record<string, {
    prompt: string;
    timeout?: number;
    maxAttempts?: number;
    options?: IVROption[];
    onFallback?: string;
  }>;
}

// Call Types
export const CallRequestSchema = z.object({
  to: z.string().describe('Phone number to call'),
  from: z.string().optional().describe('Caller ID (uses TWILIO_PHONE_NUMBER if not provided)'),
  customerId: z.string().optional(),
  metadata: z.record(z.any).optional(),
  ivrFlowId: z.string().optional(),
  language: z.string().default('en-US'),
});

export type CallRequest = z.infer<typeof CallRequestSchema>;

export const CallResponseSchema = z.object({
  success: z.boolean(),
  callSid: z.string().optional(),
  sessionId: z.string(),
  message: z.string().optional(),
});

export type CallResponse = z.infer<typeof CallResponseSchema>;

// Transfer Request
export const TransferRequestSchema = z.object({
  sessionId: z.string(),
  targetType: z.enum(['agent', 'queue', 'department']),
  targetId: z.string(),
  reason: z.string().optional(),
  priority: z.number().min(1).max(5).default(3),
});

export type TransferRequest = z.infer<typeof TransferRequestSchema>;

// Voice Message (WebSocket)
export interface VoiceMessage {
  type: 'audio' | 'transcript' | 'text' | 'action' | 'status' | 'transfer' | 'end';
  sessionId: string;
  data?: any;
  timestamp: number;
}

// STT Response
export interface STTResponse {
  text: string;
  confidence: number;
  language?: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

// TTS Options
export interface TTSOptions {
  voice?: string;
  model?: string;
  speed?: number;
  language?: string;
}

// LLM Message
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Voice Handler Interface
export interface VoiceHandler {
  onAudio(sessionId: string, audioChunk: Buffer): Promise<void>;
  onTranscript(sessionId: string, text: string): Promise<void>;
  onTransfer(sessionId: string, target: string): Promise<void>;
  onEnd(sessionId: string, reason: string): Promise<void>;
}

// Integration Types
export interface TicketPayload {
  customerId?: string;
  customerPhone: string;
  sessionId: string;
  transcript: VoiceSession['transcript'];
  summary: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  metadata?: Record<string, any>;
}

export interface CustomerProfileUpdate {
  customerId?: string;
  phone: string;
  lastCallSession?: string;
  callCount?: number;
  preferences?: Record<string, any>;
}

export interface AgentSuggestion {
  type: 'response' | 'action' | 'information' | 'transfer';
  content: string;
  confidence: number;
  reason: string;
}
