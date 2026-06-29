/**
 * Voice Social Intelligence Engine
 * Relationship-aware communication
 */

import { relationshipClassifier } from "./services/relationshipClassifier.js";
import { communicationStyleAdapter } from "./services/communicationStyle.js";
import type {
  RelationshipType,
  CommunicationStyle,
  RelationshipProfile,
  SharedMemory
} from "./types/index.js";

export class VoiceSocialIntelligence {
  private profiles: Map<string, RelationshipProfile> = new Map();

  /**
   * Get or create relationship profile
   */
  getProfile(relationshipId: string, conversationHistory?: string[]): RelationshipProfile {
    let profile = this.profiles.get(relationshipId);

    if (!profile) {
      const type = conversationHistory
        ? relationshipClassifier.classify(conversationHistory)
        : "acquaintance";

      const style = relationshipClassifier.getDefaultStyle(type);

      profile = {
        relationshipId,
        type,
        style,
        trustLevel: 5,
        sharedHistory: [],
        boundaries: [],
      };

      this.profiles.set(relationshipId, profile);
    }

    return profile;
  }

  /**
   * Update relationship type
   */
  updateRelationshipType(relationshipId: string, type: RelationshipType): void {
    const profile = this.profiles.get(relationshipId);
    if (profile) {
      profile.type = type;
      profile.style = relationshipClassifier.getDefaultStyle(type);
    }
  }

  /**
   * Update communication style
   */
  updateStyle(relationshipId: string, style: Partial<CommunicationStyle>): void {
    const profile = this.profiles.get(relationshipId);
    if (profile) {
      profile.style = { ...profile.style, ...style };
    }
  }

  /**
   * Add shared memory
   */
  addSharedMemory(relationshipId: string, content: string, emotion: string): void {
    const profile = this.profiles.get(relationshipId);
    if (profile) {
      profile.sharedHistory.push({
        id: `mem_${Date.now()}`,
        content,
        timestamp: new Date(),
        emotion,
      });

      // Keep last 50 memories
      if (profile.sharedHistory.length > 50) {
        profile.sharedHistory.shift();
      }
    }
  }

  /**
   * Get communication style for relationship
   */
  getCommunicationStyle(relationshipId: string): CommunicationStyle {
    const profile = this.profiles.get(relationshipId);
    return profile?.style || relationshipClassifier.getDefaultStyle("stranger");
  }

  /**
   * Get adapted greeting
   */
  getAdaptedGreeting(relationshipId: string): string {
    const profile = this.profiles.get(relationshipId);
    const type = profile?.type || "stranger";
    return communicationStyleAdapter.getGreeting(type);
  }

  /**
   * Check if we should use humor
   */
  shouldUseHumor(relationshipId: string, mood: string): boolean {
    const style = this.getCommunicationStyle(relationshipId);
    return communicationStyleAdapter.shouldUseHumor(style, mood);
  }

  /**
   * Check if topic is appropriate
   */
  isTopicAppropriate(relationshipId: string, topic: string): boolean {
    const style = this.getCommunicationStyle(relationshipId);
    return communicationStyleAdapter.isTopicAppropriate(topic, style);
  }

  /**
   * Get shared memories for conversation
   */
  getSharedMemories(relationshipId: string, limit: number = 5): SharedMemory[] {
    const profile = this.profiles.get(relationshipId);
    if (!profile) return [];

    return profile.sharedHistory.slice(-limit);
  }

  /**
   * Update trust level
   */
  updateTrustLevel(relationshipId: string, delta: number): void {
    const profile = this.profiles.get(relationshipId);
    if (profile) {
      profile.trustLevel = Math.max(1, Math.min(10, profile.trustLevel + delta));
    }
  }
}

export const voiceSocialIntelligence = new VoiceSocialIntelligence();
export default voiceSocialIntelligence;