/**
 * Social Intelligence Engine
 */

export interface RelationshipProfile {
  relationshipId: string;
  type: string;
  style: { formality: string; warmth: number; humor: number };
  trustLevel: number;
}

export interface SharedMemory {
  id: string;
  content: string;
  timestamp: Date;
  emotion: string;
}

export class SocialIntelligenceEngine {
  private profiles: Map<string, RelationshipProfile> = new Map();
  private memories: Map<string, SharedMemory[]> = new Map();

  getCommunicationStyle(relationshipId: string) {
    const profile = this.profiles.get(relationshipId);
    if (profile) return profile.style;

    // Default styles
    const defaults: Record<string, typeof profile.style> = {
      mother: { formality: "intimate", warmth: 9, humor: 6 },
      friend: { formality: "casual", warmth: 8, humor: 9 },
      boss: { formality: "formal", warmth: 4, humor: 2 },
    };

    return defaults[relationshipId] || { formality: "casual", warmth: 5, humor: 5 };
  }

  updateRelationshipType(relationshipId: string, type: string): void {
    const profile = this.profiles.get(relationshipId) || {
      relationshipId,
      type,
      style: { formality: "casual", warmth: 5, humor: 5 },
      trustLevel: 5,
    };
    profile.type = type;
    this.profiles.set(relationshipId, profile);
  }

  addSharedMemory(relationshipId: string, content: string, emotion: string): void {
    const memory = { id: `m_${Date.now()}`, content, timestamp: new Date(), emotion };
    const existing = this.memories.get(relationshipId) || [];
    existing.push(memory);
    if (existing.length > 50) existing.shift();
    this.memories.set(relationshipId, existing);
  }

  getSharedMemories(relationshipId: string, limit = 5): SharedMemory[] {
    return (this.memories.get(relationshipId) || []).slice(-limit);
  }

  shouldUseHumor(relationshipId: string, mood: string): boolean {
    const style = this.getCommunicationStyle(relationshipId);
    if (mood === "sad" || mood === "stressed") return false;
    return style.humor > 6;
  }
}

export const voiceSocialIntelligence = new SocialIntelligenceEngine();