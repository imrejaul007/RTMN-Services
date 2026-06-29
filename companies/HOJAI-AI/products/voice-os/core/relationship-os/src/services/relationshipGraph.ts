/**
 * Relationship Graph Service
 * =======================
 * Manages relationship nodes, trust, and clusters.
 */

import type {
  RelationshipNode,
  RelationshipGraph,
  RelationshipCluster,
  RelationshipType,
  TrustLevel,
  VoicePreferences,
  InteractionSummary
} from '../types/index.js';

export class RelationshipGraphService {
  private relationships = new Map<string, RelationshipNode>();
  private voicePreferences = new Map<string, VoicePreferences>();

  /**
   * Create a new relationship
   */
  createRelationship(
    userId: string,
    targetId: string,
    targetName: string,
    targetType: 'human' | 'ai' | 'bot' | 'company',
    type: RelationshipType,
    context?: Partial<RelationshipNode['context']>
  ): RelationshipNode {
    const id = `rel-${userId}-${targetId}`;

    // Check if exists
    if (this.relationships.has(id)) {
      throw new Error('Relationship already exists');
    }

    const node: RelationshipNode = {
      id,
      userId,
      targetId,
      targetName,
      targetType,
      type,
      trustLevel: this.inferInitialTrust(type),
      status: 'active',
      context: {
        formalityLevel: this.inferFormality(type),
        emotionalTone: this.inferEmotionalTone(type),
        commonInterests: [],
        sharedGroups: [],
        ...context,
      },
      trustScore: this.getInitialTrustScore(type),
      sharedMemories: [],
      interactionHistory: [],
      lastInteraction: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.relationships.set(id, node);

    // Create default voice preferences
    this.createDefaultVoicePreferences(id, type);

    return node;
  }

  /**
   * Get relationship by ID
   */
  getRelationship(relationshipId: string): RelationshipNode | undefined {
    return this.relationships.get(relationshipId);
  }

  /**
   * Get relationship between user and target
   */
  getRelationshipByTarget(userId: string, targetId: string): RelationshipNode | undefined {
    return this.relationships.get(`rel-${userId}-${targetId}`);
  }

  /**
   * Get all relationships for a user
   */
  getAllForUser(userId: string): RelationshipNode[] {
    return Array.from(this.relationships.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => b.trustScore - a.trustScore);
  }

  /**
   * Get relationships by type
   */
  getByType(userId: string, type: RelationshipType): RelationshipNode[] {
    return this.getAllForUser(userId).filter(r => r.type === type);
  }

  /**
   * Update trust score
   */
  updateTrust(
    relationshipId: string,
    delta: number,
    reason: string,
    interactionType?: InteractionSummary['type']
  ): RelationshipNode {
    const node = this.relationships.get(relationshipId);
    if (!node) {
      throw new Error('Relationship not found');
    }

    // Apply delta with bounds
    node.trustScore = Math.max(0, Math.min(100, node.trustScore + delta));

    // Update trust level
    node.trustLevel = this.scoreToTrustLevel(node.trustScore);

    // Add to interaction history
    node.interactionHistory.push({
      date: new Date().toISOString(),
      type: interactionType || 'message',
      sentiment: delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral',
      notes: reason,
    });

    // Keep last 100 interactions
    if (node.interactionHistory.length > 100) {
      node.interactionHistory.shift();
    }

    node.lastInteraction = new Date().toISOString();
    node.updatedAt = new Date().toISOString();

    return node;
  }

  /**
   * Build relationship graph for user
   */
  buildGraph(userId: string): RelationshipGraph {
    const nodes = this.getAllForUser(userId);
    const clusters = this.detectClusters(nodes);

    return {
      userId,
      nodes,
      clusters,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Detect relationship clusters (family, work, social, etc.)
   */
  private detectClusters(nodes: RelationshipNode[]): RelationshipCluster[] {
    const clusters: RelationshipCluster[] = [];

    // Family cluster
    const family = nodes.filter(n => n.type === 'family');
    if (family.length > 0) {
      clusters.push({
        id: 'cluster-family',
        name: 'Family',
        type: 'family',
        members: family.map(n => n.id),
      });
    }

    // Work cluster
    const work = nodes.filter(n => ['colleague', 'boss', 'client'].includes(n.type));
    if (work.length > 0) {
      clusters.push({
        id: 'cluster-work',
        name: 'Work',
        type: 'work',
        members: work.map(n => n.id),
      });
    }

    // Friends cluster
    const friends = nodes.filter(n => n.type === 'friend');
    if (friends.length > 0) {
      clusters.push({
        id: 'cluster-social',
        name: 'Friends',
        type: 'social',
        members: friends.map(n => n.id),
      });
    }

    return clusters;
  }

  /**
   * Get voice preferences for relationship
   */
  getVoicePreferences(relationshipId: string): VoicePreferences | undefined {
    return this.voicePreferences.get(relationshipId);
  }

  /**
   * Update voice preferences
   */
  updateVoicePreferences(
    relationshipId: string,
    updates: Partial<VoicePreferences>
  ): VoicePreferences {
    const prefs = this.voicePreferences.get(relationshipId);
    if (!prefs) {
      throw new Error('Voice preferences not found');
    }

    Object.assign(prefs, updates);
    this.voicePreferences.set(relationshipId, prefs);

    return prefs;
  }

  /**
   * Infer initial trust from relationship type
   */
  private inferInitialTrust(type: RelationshipType): TrustLevel {
    const trustMap: Record<RelationshipType, TrustLevel> = {
      family: 'close',
      partner: 'intimate',
      friend: 'trusted',
      colleague: 'trusted',
      boss: 'acquaintance',
      client: 'acquaintance',
      acquaintance: 'acquaintance',
      service: 'stranger',
      ai: 'trusted',
    };
    return trustMap[type];
  }

  /**
   * Get initial trust score
   */
  private getInitialTrustScore(type: RelationshipType): number {
    const scoreMap: Record<RelationshipType, number> = {
      family: 80,
      partner: 90,
      friend: 60,
      colleague: 50,
      boss: 40,
      client: 30,
      acquaintance: 20,
      service: 10,
      ai: 50,
    };
    return scoreMap[type];
  }

  /**
   * Infer formality from relationship type
   */
  private inferFormality(type: RelationshipType): number {
    const formalityMap: Record<RelationshipType, number> = {
      family: 0.2,
      partner: 0.1,
      friend: 0.3,
      colleague: 0.6,
      boss: 0.8,
      client: 0.9,
      acquaintance: 0.7,
      service: 0.5,
      ai: 0.3,
    };
    return formalityMap[type];
  }

  /**
   * Infer emotional tone from relationship type
   */
  private inferEmotionalTone(type: RelationshipType): RelationshipNode['context']['emotionalTone'] {
    const toneMap: Record<RelationshipType, RelationshipNode['context']['emotionalTone']> = {
      family: 'warm',
      partner: 'intimate',
      friend: 'casual',
      colleague: 'formal',
      boss: 'formal',
      client: 'formal',
      acquaintance: 'casual',
      service: 'casual',
      ai: 'casual',
    };
    return toneMap[type];
  }

  /**
   * Convert trust score to level
   */
  private scoreToTrustLevel(score: number): TrustLevel {
    if (score >= 90) return 'intimate';
    if (score >= 70) return 'close';
    if (score >= 50) return 'trusted';
    if (score >= 20) return 'acquaintance';
    return 'stranger';
  }

  /**
   * Create default voice preferences
   */
  private createDefaultVoicePreferences(
    relationshipId: string,
    type: RelationshipType
  ): void {
    const prefsMap: Record<RelationshipType, Omit<VoicePreferences, 'relationshipId'>> = {
      family: {
        greeting: 'Hi [name]!',
        formality: 0.2,
        useName: true,
        nameStyle: 'first',
        humorLevel: 'moderate',
        interruptionAllowed: true,
        speakingPace: 'normal',
        volumeLevel: 'normal',
      },
      friend: {
        greeting: 'Hey!',
        formality: 0.3,
        useName: false,
        humorLevel: 'high',
        interruptionAllowed: true,
        speakingPace: 'normal',
        volumeLevel: 'normal',
      },
      colleague: {
        greeting: 'Hi [name],',
        formality: 0.6,
        useName: true,
        nameStyle: 'first',
        humorLevel: 'light',
        interruptionAllowed: false,
        speakingPace: 'normal',
        volumeLevel: 'normal',
      },
      boss: {
        greeting: 'Good [morning/afternoon] [name],',
        formality: 0.8,
        useName: true,
        nameStyle: 'full',
        humorLevel: 'none',
        interruptionAllowed: false,
        speakingPace: 'slow',
        volumeLevel: 'normal',
      },
      client: {
        greeting: 'Dear [name],',
        formality: 0.9,
        useName: true,
        nameStyle: 'full',
        humorLevel: 'none',
        interruptionAllowed: false,
        speakingPace: 'slow',
        volumeLevel: 'soft',
      },
      partner: {
        greeting: 'Hey love,',
        formality: 0.1,
        useName: true,
        nameStyle: 'nickname',
        humorLevel: 'high',
        interruptionAllowed: true,
        speakingPace: 'normal',
        volumeLevel: 'normal',
      },
      acquaintance: {
        formality: 0.7,
        useName: true,
        nameStyle: 'first',
        humorLevel: 'light',
        interruptionAllowed: false,
        speakingPace: 'normal',
        volumeLevel: 'normal',
      },
      service: {
        formality: 0.5,
        useName: false,
        humorLevel: 'light',
        interruptionAllowed: false,
        speakingPace: 'normal',
        volumeLevel: 'normal',
      },
      ai: {
        formality: 0.4,
        useName: false,
        humorLevel: 'moderate',
        interruptionAllowed: true,
        speakingPace: 'normal',
        volumeLevel: 'normal',
      },
    };

    this.voicePreferences.set(relationshipId, {
      relationshipId,
      ...prefsMap[type],
    });
  }
}
