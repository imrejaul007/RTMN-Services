/**
 * Relationship OS Types
 * ===================
 * Full relationship graph with trust hierarchy, context, and history.
 */

export type RelationshipType =
  | 'family'
  | 'friend'
  | 'colleague'
  | 'boss'
  | 'partner'
  | 'client'
  | 'acquaintance'
  | 'service'
  | 'ai';

export type TrustLevel =
  | 'stranger'
  | 'acquaintance'
  | 'trusted'
  | 'close'
  | 'intimate';

export type RelationshipStatus = 'active' | 'paused' | 'blocked';

export interface RelationshipNode {
  id: string;
  userId: string;
  targetId: string;
  targetName: string;
  targetType: 'human' | 'ai' | 'bot' | 'company';
  type: RelationshipType;
  trustLevel: TrustLevel;
  status: RelationshipStatus;
  context: RelationshipContext;
  trustScore: number; // 0-100
  sharedMemories: string[]; // Memory IDs
  interactionHistory: InteractionSummary[];
  lastInteraction: string;
  nextReminder?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipContext {
  howMet?: string;
  commonInterests: string[];
  sharedGroups: string[];
  location?: string;
  language?: string;
  timeZone?: string;
  formalityLevel: number; // 0-1
  emotionalTone: 'formal' | 'casual' | 'warm' | 'intimate';
}

export interface InteractionSummary {
  date: string;
  type: 'call' | 'message' | 'meeting' | 'email' | 'voice';
  duration?: number; // seconds
  topic?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  notes?: string;
}

// Relationship graph
export interface RelationshipGraph {
  userId: string;
  nodes: RelationshipNode[];
  clusters: RelationshipCluster[];
  generatedAt: string;
}

export interface RelationshipCluster {
  id: string;
  name: string;
  type: 'family' | 'work' | 'social' | 'community' | 'custom';
  members: string[]; // Relationship IDs
  sharedValues?: string[];
}

// Voice interaction preferences
export interface VoicePreferences {
  relationshipId: string;
  greeting?: string;
  formality: number; // 0-1
  useName: boolean;
  nameStyle?: 'first' | 'nickname' | 'full' | 'honorific';
  humorLevel: 'none' | 'light' | 'moderate' | 'high';
  interruptionAllowed: boolean;
  speakingPace: 'slow' | 'normal' | 'fast';
  volumeLevel: 'soft' | 'normal' | 'loud';
  specialNotes?: string;
}

// API types
export interface CreateRelationshipRequest {
  userId: string;
  targetId: string;
  targetName: string;
  targetType: 'human' | 'ai' | 'bot' | 'company';
  type: RelationshipType;
  context?: Partial<RelationshipContext>;
}

export interface UpdateTrustRequest {
  relationshipId: string;
  delta: number; // positive or negative
  reason: string;
  interactionType?: InteractionSummary['type'];
}

export interface GetRelationshipRequest {
  userId: string;
  targetId?: string;
  type?: RelationshipType;
  trustLevel?: TrustLevel;
}
