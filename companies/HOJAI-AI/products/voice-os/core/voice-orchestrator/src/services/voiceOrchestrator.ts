/**
 * Voice Orchestrator Service
 * ========================
 * Wires RAZO → Genie → VoiceOS pipeline
 */

import type { VoiceContext, VoiceResponse, VoiceDirectives, Action } from '../types/index.js';

const RAZO_URL = process.env.RAZO_URL || 'http://localhost:4299';
const GENIE_URL = process.env.GENIE_URL || 'http://localhost:4701';
const CP_URL = process.env.CONVERSATION_PHYSICS_URL || 'http://localhost:4891';
const VD_URL = process.env.VOICE_DIRECTOR_URL || 'http://localhost:4892';
const HP_URL = process.env.HUMAN_PRESENCE_URL || 'http://localhost:4896';
const REL_URL = process.env.RELATIONSHIP_URL || 'http://localhost:4897';
const TTS_URL = process.env.TTS_URL || 'http://localhost:4880';

export interface OrchestrateInput {
  userId: string;
  input: string | { audio: string; mimeType?: string };
  context?: Partial<VoiceContext>;
}

export interface OrchestrateOutput {
  response: string;
  audioBase64?: string;
  emotion: string;
  directives: VoiceDirectives;
  actions: Action[];
  conversationState: {
    turnComplete: boolean;
    backchannel?: string;
    repairNeeded?: boolean;
  };
  latencyMs: number;
}

export class VoiceOrchestrator {
  /**
   * Orchestrate a voice interaction
   */
  async orchestrate(input: OrchestrateInput): Promise<OrchestrateOutput> {
    const startTime = Date.now();

    // Step 1: Detect intent (RAZO)
    const intent = await this.detectIntent(input);

    // Step 2: Get presence/adaptation (Human Presence)
    const presence = await this.getPresence(input.userId);

    // Step 3: Get relationship context (Relationship OS)
    const relationship = await this.getRelationship(input.userId, input.context?.relationship);

    // Step 4: Analyze conversation physics
    const conversationState = await this.analyzeConversation(input);

    // Step 5: Generate response (Genie)
    const genieResponse = await this.generateGenieResponse(input, intent, presence, relationship);

    // Step 6: Generate voice directives (Voice Director)
    const directives = await this.generateDirectives(
      genieResponse.emotion,
      input.context?.relationship || 'friend'
    );

    // Step 7: Generate TTS audio
    const audio = await this.generateTTS(genieResponse.text, directives);

    return {
      response: genieResponse.text,
      audioBase64: audio.audioBase64,
      emotion: genieResponse.emotion || 'warm',
      directives,
      actions: genieResponse.actions || [],
      conversationState: {
        turnComplete: conversationState.turnComplete,
        backchannel: conversationState.backchannel,
        repairNeeded: conversationState.repairNeeded,
      },
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Step 1: Detect intent via RAZO
   */
  private async detectIntent(input: OrchestrateInput): Promise<{
    intent: string;
    entities: Record<string, string>;
    confidence: number;
  }> {
    try {
      const text = typeof input.input === 'string' ? input.input : 'voice input';

      const response = await fetch(`${RAZO_URL}/api/intent/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userId: input.userId }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          intent: data.intent || 'general',
          entities: data.entities || {},
          confidence: data.confidence || 0.8,
        };
      }
    } catch (error) {
      console.error('[orchestrator] RAZO error:', error);
    }

    // Fallback
    return {
      intent: 'general',
      entities: {},
      confidence: 0.5,
    };
  }

  /**
   * Step 2: Get presence adaptation
   */
  private async getPresence(userId: string): Promise<{
    adaptation: {
      responsePace: number;
      responseLength: 'short' | 'medium' | 'long';
      formality: number;
      warmth: number;
      interruptions: string;
    };
  } | null> {
    try {
      const response = await fetch(`${HP_URL}/api/presence/${userId}/adaptation`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[orchestrator] Human Presence error:', error);
    }
    return null;
  }

  /**
   * Step 3: Get relationship context
   */
  private async getRelationship(userId: string, targetId?: string): Promise<{
    voicePreferences?: {
      formality: number;
      warmth: number;
      humorLevel: string;
    };
    trustScore?: number;
  } | null> {
    if (!targetId) return null;

    try {
      const response = await fetch(
        `${REL_URL}/api/relationships/${userId}/${targetId}/voice-preferences`
      );
      if (response.ok) {
        const data = await response.json();
        return {
          voicePreferences: data.preferences,
          trustScore: data.trustScore,
        };
      }
    } catch (error) {
      console.error('[orchestrator] Relationship OS error:', error);
    }
    return null;
  }

  /**
   * Step 4: Analyze conversation physics
   */
  private async analyzeConversation(input: OrchestrateInput): Promise<{
    turnComplete: boolean;
    backchannel?: string;
    repairNeeded?: boolean;
  }> {
    const text = typeof input.input === 'string' ? input.input : 'voice';

    try {
      const response = await fetch(`${CP_URL}/api/conversation/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: input.userId,
          transcript: text,
          relationship: input.context?.relationship || 'friend',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          turnComplete: data.turnComplete ?? true,
          backchannel: data.backchannel,
          repairNeeded: data.repairNeeded,
        };
      }
    } catch (error) {
      console.error('[orchestrator] Conversation Physics error:', error);
    }

    return { turnComplete: true };
  }

  /**
   * Step 5: Generate Genie response
   */
  private async generateGenieResponse(
    input: OrchestrateInput,
    intent: { intent: string; entities: Record<string, string> },
    presence: { adaptation?: { warmth?: number; formality?: number } } | null,
    relationship: { voicePreferences?: { formality?: number; warmth?: number } } | null
  ): Promise<{
    text: string;
    emotion?: string;
    actions?: Action[];
  }> {
    try {
      const response = await fetch(`${GENIE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': process.env.INTERNAL_TOKEN || 'internal',
        },
        body: JSON.stringify({
          userId: input.userId,
          message: typeof input.input === 'string' ? input.input : 'Voice command',
          context: {
            intent: intent.intent,
            entities: intent.entities,
            warmth: presence?.adaptation?.warmth || relationship?.voicePreferences?.warmth || 0.7,
            formality: presence?.adaptation?.formality || relationship?.voicePreferences?.formality || 0.5,
            relationship: input.context?.relationship,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.response || data.message || data.text || 'I understand.',
          emotion: data.emotion,
          actions: data.actions,
        };
      }
    } catch (error) {
      console.error('[orchestrator] Genie error:', error);
    }

    // Fallback response
    return {
      text: 'I\'m here to help. What would you like to do?',
      emotion: 'warm',
    };
  }

  /**
   * Step 6: Generate voice directives
   */
  private async generateDirectives(
    emotion: string,
    relationship?: string
  ): Promise<VoiceDirectives> {
    try {
      const response = await fetch(`${VD_URL}/api/directive/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emotion: emotion || 'warm',
          relationship: relationship || 'friend',
          personalityMode: this.getPersonalityMode(relationship),
          context: {
            timeOfDay: this.getTimeOfDay(),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.directive;
      }
    } catch (error) {
      console.error('[orchestrator] Voice Director error:', error);
    }

    return this.getDefaultDirectives();
  }

  /**
   * Step 7: Generate TTS audio
   */
  private async generateTTS(
    text: string,
    directives: VoiceDirectives
  ): Promise<{ audioBase64?: string; durationMs?: number }> {
    try {
      const response = await fetch(`${TTS_URL}/api/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': process.env.INTERNAL_TOKEN || 'internal',
        },
        body: JSON.stringify({
          text,
          engine: 'hojai',
          voice: {
            emotion: directives.emotion,
            pace: directives.pace,
            volume: directives.volume,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          audioBase64: data.audioBase64,
          durationMs: data.durationMs,
        };
      }
    } catch (error) {
      console.error('[orchestrator] TTS error:', error);
    }

    return {};
  }

  /**
   * Get personality mode from relationship
   */
  private getPersonalityMode(relationship?: string): string {
    const modeMap: Record<string, string> = {
      mother: 'mother',
      father: 'professional',
      sibling: 'friend',
      friend: 'friend',
      colleague: 'professional',
      boss: 'professional',
      partner: 'friend',
    };
    return relationship ? modeMap[relationship] || 'friend' : 'friend';
  }

  /**
   * Get time of day
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Default voice directives
   */
  private getDefaultDirectives(): VoiceDirectives {
    return {
      emotion: 'warm',
      pace: 1.0,
      volume: 'medium',
      warmth: 0.7,
      formality: 0.3,
      pauseBeforeMs: 200,
      pauseAfterMs: 250,
      expressions: [],
    };
  }
}
