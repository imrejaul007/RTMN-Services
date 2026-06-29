/**
 * HOJAI VoiceOS SDK
 * Unified SDK for all VoiceOS services
 */

import axios from 'axios';

// Service URLs
const SERVICES = {
  voiceGateway: process.env.VOICE_GATEWAY_URL || 'http://localhost:4880',
  voiceOrchestrator: process.env.VOICE_ORCH_URL || 'http://localhost:4898',
  voiceCommands: process.env.VOICE_COMMANDS_URL || 'http://localhost:4885',
  conversationPhysics: process.env.CP_URL || 'http://localhost:4891',
  humanPresence: process.env.HP_URL || 'http://localhost:4896',
  relationshipOS: process.env.REL_URL || 'http://localhost:4897',
  humanGrowth: process.env.HG_URL || 'http://localhost:4895',
  lifeTimeline: process.env.LT_URL || 'http://localhost:4893',
  appDetection: process.env.APP_DETECTION_URL || 'http://localhost:4899',
  memoryOS: process.env.MEMORY_URL || 'http://localhost:4703',
  emotionalMemory: process.env.EMOTION_URL || 'http://localhost:4761',
};

// Types
export interface VoiceResult {
  text: string;
  audio?: string;
  emotion?: string;
  directives?: VoiceDirectives;
  actions?: Action[];
  confidence?: number;
}

export interface VoiceDirectives {
  pace: number;
  warmth: number;
  volume: string;
  pauseBeforeMs?: number;
  pauseAfterMs?: number;
  formality?: number;
}

export interface Action {
  type: string;
  executed: boolean;
  result?: unknown;
}

export interface CommandResult {
  transcript: string;
  commands: VoiceCommand[];
  cleanedTranscript: string;
}

export interface VoiceCommand {
  type: string;
  action: string;
  raw: string;
  value?: string;
}

export interface PresenceResult {
  state: string;
  energy: {
    mental: string;
    physical: string;
    emotional: string;
    overall: string;
  };
  attention: {
    level: number;
    pattern: string;
  };
}

export interface RelationshipResult {
  targetName: string;
  type: string;
  trustLevel: string;
  trustScore: number;
  voicePreferences?: VoicePreferences;
}

export interface VoicePreferences {
  formality: number;
  warmth: number;
  humorLevel: string;
  greeting?: string;
}

export interface VoiceOSConfig {
  userId: string;
}

// VoiceOS Class
export class VoiceOS {
  private userId: string;

  constructor(config: VoiceOSConfig) {
    this.userId = config.userId;
  }

  // Full voice pipeline
  async speak(input: string | { audio: string }): Promise<VoiceResult> {
    const response = await axios.post(
      `${SERVICES.voiceOrchestrator}/api/voice/orchestrate`,
      {
        userId: this.userId,
        input: typeof input === 'string' ? input : input.audio,
      }
    );
    return response.data;
  }

  // TTS
  async tts(text: string): Promise<string> {
    const response = await axios.post(`${SERVICES.voiceGateway}/api/v1/tts`, {
      text,
      engine: 'hojai',
    });
    return response.data.audioBase64;
  }

  // STT
  async stt(audio: string): Promise<string> {
    const response = await axios.post(`${SERVICES.voiceGateway}/api/v1/stt`, {
      audio,
      engine: 'whisper',
    });
    return response.data.text;
  }

  // Parse voice commands (Wispr Flow style)
  async parseCommands(transcript: string): Promise<CommandResult> {
    const response = await axios.post(`${SERVICES.voiceCommands}/parse`, {
      transcript,
    });
    return response.data;
  }

  // Memory - remember
  async remember(key: string, value: unknown): Promise<void> {
    await axios.post(`${SERVICES.memoryOS}/api/memory/remember`, {
      userId: this.userId,
      key,
      value,
    });
  }

  // Memory - recall
  async recall(key: string): Promise<unknown | undefined> {
    try {
      const response = await axios.get(
        `${SERVICES.memoryOS}/api/memory/${this.userId}/${key}`
      );
      return response.data.value;
    } catch {
      return undefined;
    }
  }

  // Emotional memory - store emotion
  async storeEmotion(emotion: string, intensity: number, context?: string): Promise<void> {
    await axios.post(`${SERVICES.emotionalMemory}/emotion`, {
      entityId: this.userId,
      emotion,
      intensity,
      context,
    });
  }

  // Presence - get state
  async getPresence(): Promise<PresenceResult | null> {
    try {
      const response = await axios.get(
        `${SERVICES.humanPresence}/api/presence/${this.userId}`
      );
      return response.data.presence;
    } catch {
      return null;
    }
  }

  // Presence - update state
  async updatePresence(updates: { state?: string; energy?: Record<string, string> }): Promise<void> {
    await axios.post(`${SERVICES.humanPresence}/api/presence`, {
      userId: this.userId,
      ...updates,
    });
  }

  // Relationship - get
  async getRelationship(targetId: string): Promise<RelationshipResult | null> {
    try {
      const response = await axios.get(
        `${SERVICES.relationshipOS}/api/relationships/${this.userId}/${targetId}`
      );
      return response.data.relationship;
    } catch {
      return null;
    }
  }

  // Relationship - create
  async setRelationship(
    targetId: string,
    targetName: string,
    type: string
  ): Promise<void> {
    await axios.post(`${SERVICES.relationshipOS}/api/relationships`, {
      userId: this.userId,
      targetId,
      targetName,
      targetType: 'human',
      type,
    });
  }

  // Growth - track habit
  async trackHabit(category: string, name: string, value: number): Promise<void> {
    await axios.post(`${SERVICES.humanGrowth}/api/growth/track`, {
      userId: this.userId,
      category,
      name,
      value,
    });
  }

  // Life - add milestone
  async addMilestone(title: string, date: string, category: string): Promise<void> {
    await axios.post(`${SERVICES.lifeTimeline}/api/milestones`, {
      userId: this.userId,
      title,
      date,
      category,
    });
  }

  // App detection
  async detectApp(windowTitle: string): Promise<{ appId: string; appName: string; category: string }> {
    try {
      const response = await axios.post(`${SERVICES.appDetection}/api/app/detect`, {
        windowTitle,
      });
      return response.data.context;
    } catch {
      return { appId: 'unknown', appName: 'Unknown', category: 'unknown' };
    }
  }

  // Health check
  async health(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const checks = Object.entries(SERVICES).map(async ([name, url]) => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 1000 });
        results[name] = response.data.status === 'healthy';
      } catch {
        results[name] = false;
      }
    });
    await Promise.all(checks);
    return results;
  }
}

export default VoiceOS;
