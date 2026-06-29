/**
 * Conversation Physics Engine - Types
 * ===================================
 * Core type definitions for human conversation dynamics.
 */

// Silence meanings based on duration
export const SILENCE_MEANINGS = {
  THINKING: { maxMs: 500, meaning: 'thinking', response: null },
  PROCESSING: { maxMs: 3000, meaning: 'processing', response: null },
  CONFUSION: { maxMs: 10000, meaning: 'confusion', response: 'take-your-time' },
  DISTRACTED: { maxMs: 30000, meaning: 'distracted', response: 'still-there' },
  ABANDONED: { maxMs: 60000, meaning: 'abandoned', response: 'conversation-ended' }
} as const;

export type SilenceMeaning = keyof typeof SILENCE_MEANINGS;

// Conversation states
export type ConversationState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'waiting'
  | 'interrupted'
  | 'paused'
  | 'ended';

export interface TurnState {
  id: string;
  speaker: 'user' | 'ai';
  startTime: number;
  endTime?: number;
  transcript: string;
  emotion?: string;
  isComplete: boolean;
  wasInterrupted: boolean;
  hadSilence: boolean;
  silenceDurationMs?: number;
  backchannels: string[];
}

export interface ConversationSession {
  id: string;
  userId: string;
  state: ConversationState;
  turns: TurnState[];
  currentTurn: TurnState | null;
  startedAt: number;
  lastActivityAt: number;
  totalUserSpeechMs: number;
  totalAISpeechMs: number;
  totalSilenceMs: number;
  interruptions: number;
  backchannels: number;
  context: ConversationContext;
  metrics: ConversationMetrics;
}

export interface ConversationContext {
  relationship?: 'mother' | 'friend' | 'investor' | 'employee' | 'customer' | 'partner' | 'stranger';
  mode?: 'work' | 'casual' | 'emergency' | 'social' | 'prayer';
  energy?: 'high' | 'medium' | 'low';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  location?: 'driving' | 'meeting' | 'home' | 'office' | 'travel';
}

export interface ConversationMetrics {
  avgUserTurnLength: number;
  avgAITurnLength: number;
  userSpeechRatio: number;
  interruptionsPerMinute: number;
  backchannelsPerMinute: number;
  silenceRatio: number;
  topicChanges: number;
  corrections: number;
  emotionalTrajectory: EmotionalTrajectory[];
}

export interface EmotionalTrajectory {
  timestamp: number;
  emotion: string;
  intensity: number;
  trend: 'improving' | 'stable' | 'declining';
}

// Backchannel types
export const BACKCHANNELS = {
  USER_TO_AI: [
    'mm-hmm', 'right', 'got it', 'exactly', 'i see', 'yeah', 'uh-huh',
    'sure', 'okay', 'makes sense', 'i understand', 'go on'
  ],
  AI_TO_USER: [
    'mm-hmm...', 'right...', 'i see...', 'i understand...',
    'go on', 'tell me more', 'what happened next', 'and then?'
  ]
} as const;

// Repair/correction patterns
export interface SelfCorrection {
  type: 'replacement' | 'addition' | 'deletion' | 'reordering';
  originalText: string;
  correctedText: string;
  position: { start: number; end: number };
}

// Voice directive for Voice Director
export interface VoiceDirective {
  emotion: string;
  pace: number; // 0.5 - 1.5 (0.85 = slightly slower)
  volume: 'soft' | 'normal' | 'loud';
  pauseBeforeMs: number;
  pauseAfterMs: number;
  emphasis: string[];
  expressions: VoiceExpression[];
  smile: boolean;
  energy: 'low' | 'medium' | 'high';
}

export type VoiceExpression =
  | 'SOFT_LAUGH'
  | 'CHUCKLE'
  | 'SMILE'
  | 'WHISPER'
  | 'BREATH'
  | 'EXCITED'
  | 'SERIOUS'
  | 'THOUGHTFUL'
  | 'WARM'
  | 'CONCERNED';

// Turn management decisions
export interface TurnDecision {
  action: 'speak' | 'wait' | 'backchannel' | 'interrupt' | 'continue';
  confidence: number;
  reason: string;
  delayMs?: number;
  suggestedResponse?: string;
  voiceDirective?: Partial<VoiceDirective>;
}

// API Request/Response types
export interface StartConversationRequest {
  userId: string;
  context?: Partial<ConversationContext>;
}

export interface StartConversationResponse {
  sessionId: string;
  state: ConversationState;
  greeting?: string;
  voiceDirective?: Partial<VoiceDirective>;
}

export interface UserSpeechRequest {
  sessionId: string;
  transcript: string;
  emotion?: string;
  intensity?: number;
  silenceDurationMs?: number;
  corrections?: SelfCorrection[];
}

export interface UserSpeechResponse {
  acknowledged: boolean;
  shouldAIRespond: boolean;
  turnDecision: TurnDecision;
  suggestedBackchannel?: string;
  conversationMetrics?: Partial<ConversationMetrics>;
}

export interface AISpeechRequest {
  sessionId: string;
  plannedResponse: string;
  targetEmotion?: string;
  relationship?: string;
}

export interface AISpeechResponse {
  voiceDirective: VoiceDirective;
  finalResponse: string;
  timing: {
    estimatedDurationMs: number;
    pausePoints: number[];
  };
}

export interface EndConversationRequest {
  sessionId: string;
  reason?: 'completed' | 'user-ended' | 'timeout' | 'error';
  summary?: boolean;
}

export interface EndConversationResponse {
  sessionId: string;
  duration: number;
  metrics: ConversationMetrics;
  summary?: string;
  followUp?: string[];
}
