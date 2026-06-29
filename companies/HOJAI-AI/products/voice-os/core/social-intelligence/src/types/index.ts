/**
 * Social Intelligence Types
 */

export type RelationshipType =
  | "mother" | "father" | "sibling" | "spouse" | "child"
  | "friend" | "close_friend" | "acquaintance"
  | "colleague" | "boss" | "employee" | "investor"
  | "customer" | "client" | "partner" | "stranger";

export type FormalityLevel = "formal" | "semi-formal" | "casual" | "intimate";

export interface CommunicationStyle {
  formality: FormalityLevel;
  warmth: number; // 1-10
  humor: number; // 1-10
  directness: number; // 1-10
  empathy: number; // 1-10
  vocabulary: "professional" | "simple" | "colloquial";
  topics: string[];
  avoidTopics: string[];
}

export interface RelationshipProfile {
  relationshipId: string;
  type: RelationshipType;
  style: CommunicationStyle;
  trustLevel: number; // 1-10
  sharedHistory: SharedMemory[];
  boundaries: string[];
}

export interface SharedMemory {
  id: string;
  content: string;
  timestamp: Date;
  emotion: string;
}