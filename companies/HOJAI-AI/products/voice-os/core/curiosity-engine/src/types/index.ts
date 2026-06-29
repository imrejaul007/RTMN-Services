/**
 * Curiosity Engine Types
 */

export interface CuriosityQuestion {
  id: string;
  question: string;
  type: "follow_up" | "clarification" | "exploration" | "reflection";
  depth: number; // 1-5
  topic: string;
  intent: "understand" | "empathize" | "learn" | "explore";
  timing: number; // ms delay before asking}

export interface ConversationContext {
  userId: string;
  recentTopics: string[];
  currentTopic: string;
  conversationDepth: number;
  userInterests: string[];
  relationshipType: string;
  timeSinceLastQuestion: number;}

export interface TopicExploration {
  topic: string;
  subTopics: string[];
  userKnowledgeLevel: number; // 1-10
  interestLevel: number; // 1-10
  questionsAsked: number;
}

export interface FollowUpStrategy {
  strategy: "deeper" | "broader" | "practical" | "emotional" | "historical";
  exampleQuestions: string[];
}