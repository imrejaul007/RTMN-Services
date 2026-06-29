/**
 * Humor Engine Types
 */

export interface InsideJoke {
  id: string;
  relationshipId: string;
  content: string;
  context: string;
  createdAt: Date;
  usageCount: number;
  lastUsed: Date;
  tags: string[];
}

export interface HumorContext {
  userId: string;
  relationshipId: string;
  conversationHistory: ConversationTurn[];
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  userMood: HumorMood;
  culturalContext: string;
}

export type HumorMood = "happy" | "sad" | "stressed" | "tired" | "neutral";

export interface HumorAttempt {
  detected: boolean;
  type: "joke" | "sarcasm" | "self-deprecating" | "wordplay" | "irony";
  confidence: number;
  topic?: string;
}

export interface HumorResponse {
  humor: "supportive" | "matching" | "gentle" | "none";
  message?: string;
  laughResponse?: string;
  timing: number; // ms delay
}

export interface ConversationTurn {
  speaker: "user" | "assistant";
  text: string;
  timestamp: Date;
  emotion?: HumorMood;
}