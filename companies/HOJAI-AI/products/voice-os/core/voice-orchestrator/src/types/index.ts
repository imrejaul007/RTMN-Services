/**
 * Voice Orchestrator Types
 * =======================
 * Wires RAZO → Genie → VoiceOS pipeline
 */

export interface VoiceIntent {
  type: 'voice' | 'text' | 'command';
  text: string;
  confidence: number;
  detectedIntent?: string;
  entities?: Record<string, string>;
}

export interface VoiceContext {
  userId: string;
  relationship?: string;
  presence?: 'alone' | 'with-others' | 'meeting' | 'commuting';
  emotion?: string;
  energy?: 'high' | 'medium' | 'low';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface VoiceResponse {
  text: string;
  audioBase64?: string;
  mimeType?: string;
  durationMs?: number;
  emotion: string;
  directives: VoiceDirectives;
  actions?: Action[];
}

export interface VoiceDirectives {
  emotion: string;
  pace: number;
  volume: string;
  warmth: number;
  formality: number;
  pauseBeforeMs: number;
  pauseAfterMs: number;
  expressions: string[];
}

export interface Action {
  type: 'api-call' | 'reminder' | 'message' | 'booking' | 'search';
  intent: string;
  params: Record<string, unknown>;
  executed: boolean;
  result?: unknown;
}

export interface OrchestratorConfig {
  raZOUrl: string;
  genieUrl: string;
  conversationPhysicsUrl: string;
  voiceDirectorUrl: string;
  humanPresenceUrl: string;
  relationshipUrl: string;
  ttsUrl: string;
}
