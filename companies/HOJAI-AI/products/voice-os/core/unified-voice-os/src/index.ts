/**
 * Unified Voice OS Gateway
 * Connects all 12 Voice OS engines into one cohesive system
 *
 * Engines:
 * 1. Conversation Physics - Turn management, silence, backchannels
 * 2. Voice Director - Speech directives, pacing, emotion
 * 3. Life Timeline - Life chapters, milestones
 * 4. Human Presence - Attention, energy, context
 * 5. Voice Identity - Verification, consent
 * 6. Human Growth - Skills, habits, progress
 * 7. Humor Engine - Jokes, laughter, inside jokes
 * 8. Curiosity Engine - Follow-ups, exploration
 * 9. Attention Engine - Focus, distraction
 * 10. Social Intelligence - Relationships, communication style
 * 11. Conflict Engine - Disagreement, pushback
 * 12. Multi-Agent Voice - Agent orchestration
 */

import { voiceConversationPhysics } from "./engines/conversationPhysics.js";
import { voiceDirector } from "./engines/voiceDirector.js";
import { voiceLifeTimeline } from "./engines/lifeTimeline.js";
import { voiceHumanPresence } from "./engines/humanPresence.js";
import { voiceIdentity } from "./engines/voiceIdentity.js";
import { voiceHumanGrowth } from "./engines/humanGrowth.js";
import { voiceHumorEngine } from "./engines/humor.js";
import { voiceCuriosityEngine } from "./engines/curiosity.js";
import { voiceAttentionEngine } from "./engines/attention.js";
import { voiceSocialIntelligence } from "./engines/socialIntelligence.js";
import { voiceConflictEngine } from "./engines/conflict.js";
import { voiceMultiAgentNetwork } from "./engines/multiAgent.js";

import type { Request, Response } from "express";

// ─── Types ────────────────────────────────────────────────────────────────────────

export interface UnifiedVoiceInput {
  userId: string;
  text: string;
  audioContext?: {
    speakingSpeed?: number;
    pauses?: number;
    energy?: number;
    interruptions?: number;
    silence?: number;
  };
  conversationContext?: {
    relationshipId?: string;
    relationshipType?: string;
    conversationDepth?: number;
    timeSinceLastQuestion?: number;
    mood?: string;
  };
  presenceContext?: {
    location?: string;
    activity?: string;
    timeOfDay?: string;
    device?: string;
  };
}

export interface UnifiedVoiceOutput {
  response: string;
  audio?: {
    directives: VoiceDirectives;
    backchannel?: string;
    pauseMs?: number;
  };
  emotion: {
    detected: string;
    generated: string;
    intensity: number;
  };
  actions: {
    shouldAskQuestion?: boolean;
    question?: string;
    shouldPushback?: boolean;
    pushbackMessage?: string;
    multiAgentCommands?: string[];
  };
  presence: {
    userState: string;
    recommendedResponseLength: "short" | "medium" | "long";
    engagementResponse?: string;
  };
  social: {
    communicationStyle: string;
    topics: string[];
    humorAppropriate: boolean;
  };
  timeline?: {
    milestones?: string[];
    lifeChapter?: string;
    sharedMemories?: string[];
  };
  processing: {
    latencyMs: number;
    enginesUsed: string[];
  };
}

export interface VoiceDirectives {
  pace: number; // 0.5-1.5
  volume: "soft" | "normal" | "loud";
  emotion: string;
  pauses: number;
  emphasis: string[];
  smile: boolean;
}

// ─── Unified Voice Gateway ────────────────────────────────────────────────────────

export class UnifiedVoiceGateway {
  private engines = {
    conversationPhysics: voiceConversationPhysics,
    voiceDirector: voiceDirector,
    lifeTimeline: voiceLifeTimeline,
    humanPresence: voiceHumanPresence,
    voiceIdentity: voiceIdentity,
    humanGrowth: voiceHumanGrowth,
    humor: voiceHumorEngine,
    curiosity: voiceCuriosityEngine,
    attention: voiceAttentionEngine,
    social: voiceSocialIntelligence,
    conflict: voiceConflictEngine,
    multiAgent: voiceMultiAgentNetwork,
  };

  /**
   * Process voice input through all engines
   */
  async process(input: UnifiedVoiceInput): Promise<UnifiedVoiceOutput> {
    const startTime = Date.now();
    const enginesUsed: string[] = [];

    // Step 1: Human Presence (what's the user's state?)
    let presence = { state: "focused", confidence: 0.8 };
    if (input.audioContext) {
      presence = voiceHumanPresence.analyzePresence(input.audioContext);
      enginesUsed.push("humanPresence");
    }

    // Step 2: Attention Engine (are they distracted?)
    let attentionMetrics = {
      state: "focused" as string,
      confidence: 0.8,
      signals: [],
      duration: 0,
      trend: "stable" as string,
    };
    if (input.audioContext) {
      attentionMetrics = voiceAttentionEngine.analyzeAttention({
        userId: input.userId,
        speakingSpeed: input.audioContext.speakingSpeed || 130,
        pausesCount: input.audioContext.pauses || 0,
        energyLevel: input.audioContext.energy || 7,
        interruptions: input.audioContext.interruptions || 0,
        topicCoherence: 0.8,
      });
      enginesUsed.push("attention");
    }

    // Step 3: Social Intelligence (how should we communicate?)
    let socialStyle = {
      formality: "casual" as string,
      warmth: 7,
      humor: 5,
      directness: 6,
      empathy: 7,
      vocabulary: "simple" as string,
      topics: [],
      avoidTopics: [],
    };
    if (input.conversationContext?.relationshipId) {
      socialStyle = voiceSocialIntelligence.getCommunicationStyle(
        input.conversationContext.relationshipId
      );
      enginesUsed.push("social");
    }

    // Step 4: Conflict Engine (should we disagree?)
    let pushback = {
      shouldChallenge: false,
      approach: "none" as string,
      message: "",
      offerAlternative: false,
    };
    pushback = voiceConflictEngine.processStatement(
      input.text,
      input.userId
    );
    if (pushback.shouldChallenge) {
      enginesUsed.push("conflict");
    }

    // Step 5: Humor Engine (any humor to respond to?)
    let humor = { humor: "none" as string, timing: 0 };
    if (input.conversationContext) {
      const humorResult = await voiceHumorEngine.processHumor(input.text, {
        userId: input.userId,
        relationshipId: input.conversationContext.relationshipId || "default",
        conversationHistory: [],
        timeOfDay: (input.presenceContext?.timeOfDay as any) || "afternoon",
        userMood: (input.conversationContext.mood as any) || "neutral",
        culturalContext: "global",
      });
      humor = humorResult;
      if (humor.humor !== "none") {
        enginesUsed.push("humor");
      }
    }

    // Step 6: Curiosity Engine (should we ask a question?)
    let curiosity = null;
    if (input.conversationContext) {
      const shouldAsk = voiceCuriosityEngine.shouldAskQuestion({
        userId: input.userId,
        recentTopics: [],
        currentTopic: input.text.slice(0, 50),
        conversationDepth: input.conversationContext.conversationDepth || 0,
        userInterests: [],
        relationshipType: input.conversationContext.relationshipType || "friend",
        timeSinceLastQuestion: input.conversationContext.timeSinceLastQuestion || 60000,
      });

      if (shouldAsk) {
        curiosity = voiceCuriosityEngine.askNextQuestion({
          userId: input.userId,
          recentTopics: [],
          currentTopic: input.text.slice(0, 50),
          conversationDepth: input.conversationContext.conversationDepth || 0,
          userInterests: [],
          relationshipType: input.conversationContext.relationshipType || "friend",
          timeSinceLastQuestion: input.conversationContext.timeSinceLastQuestion || 60000,
        });
        enginesUsed.push("curiosity");
      }
    }

    // Step 7: Conversation Physics (how should the conversation flow?)
    let conversationState = {
      shouldSpeak: true,
      backchannel: undefined as string | undefined,
      pauseMs: 0,
      interrupt: false,
    };
    if (input.audioContext) {
      conversationState = voiceConversationPhysics.manageTurn(input.text, []);
      enginesUsed.push("conversationPhysics");
    }

    // Step 8: Voice Director (how should we sound?)
    let directives: VoiceDirectives = {
      pace: 1.0,
      volume: "normal",
      emotion: "neutral",
      pauses: 1,
      emphasis: [],
      smile: false,
    };
    directives = voiceDirector.generateDirectives({
      emotion: presence.state === "focused" ? "engaged" : "patient",
      content: input.text,
      context: {
        formality: socialStyle.formality,
        warmth: socialStyle.warmth,
      },
    });
    enginesUsed.push("voiceDirector");

    // Step 9: Multi-Agent (any commands to execute?)
    let agentCommands: string[] = [];
    if (input.text.match(/\b(reduce|cut|increase|find|negotiate|renegotiate|create|schedule)\b/i)) {
      const command = voiceMultiAgentNetwork.createCommand(input.text, input.userId);
      const result = await voiceMultiAgentNetwork.executeCommand(command);
      if (result.responses.length > 0) {
        agentCommands.push(result.summary);
        enginesUsed.push("multiAgent");
      }
    }

    // Step 10: Life Timeline (any relevant memories?)
    let timeline = {};
    if (input.conversationContext?.relationshipId) {
      const memories = voiceSocialIntelligence.getSharedMemories(
        input.conversationContext.relationshipId,
        3
      );
      timeline = { sharedMemories: memories.map((m) => m.content) };
      enginesUsed.push("lifeTimeline");
    }

    // ─── Build Response ─────────────────────────────────────────────────────

    let responseText = "";

    // Handle pushback first
    if (pushback.shouldChallenge && pushback.message) {
      responseText = pushback.message;
    }
    // Handle humor
    else if (humor.humor !== "none" && humor.message) {
      responseText = humor.message;
    }
    // Handle curiosity question
    else if (curiosity?.question) {
      responseText = curiosity.question;
    }
    // Handle engagement response
    else if (attentionMetrics.state !== "focused") {
      responseText = voiceAttentionEngine.getEngagementResponse(
        attentionMetrics.state as any
      ) || "I understand.";
    }
    // Default: pass through to main AI
    else {
      responseText = "[AI_GENERATED_RESPONSE]";
    }

    return {
      response: responseText,
      audio: {
        directives,
        backchannel: conversationState.backchannel,
        pauseMs: conversationState.pauseMs,
      },
      emotion: {
        detected: presence.state,
        generated: directives.emotion,
        intensity: presence.confidence,
      },
      actions: {
        shouldAskQuestion: curiosity !== null,
        question: curiosity?.question,
        shouldPushback: pushback.shouldChallenge,
        pushbackMessage: pushback.message,
        multiAgentCommands: agentCommands,
      },
      presence: {
        userState: attentionMetrics.state,
        recommendedResponseLength: voiceAttentionEngine.getResponseLength(
          attentionMetrics as any
        ),
        engagementResponse: voiceAttentionEngine.getEngagementResponse(
          attentionMetrics.state as any
        ) || undefined,
      },
      social: {
        communicationStyle: socialStyle.formality,
        topics: socialStyle.topics,
        humorAppropriate: humor.humor !== "none",
      },
      timeline,
      processing: {
        latencyMs: Date.now() - startTime,
        enginesUsed: [...new Set(enginesUsed)],
      },
    };
  }

  /**
   * Get all available engines
   */
  getEngines(): string[] {
    return Object.keys(this.engines);
  }

  /**
   * Health check all engines
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, engine] of Object.entries(this.engines)) {
      results[name] = engine !== undefined;
    }
    return results;
  }
}

export const unifiedVoiceGateway = new UnifiedVoiceGateway();
export default unifiedVoiceGateway;