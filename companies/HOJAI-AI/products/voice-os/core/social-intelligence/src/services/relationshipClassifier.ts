/**
 * Relationship Classifier
 * Classifies relationship type from conversation
 */

import { RelationshipType, CommunicationStyle } from "../types/index.js";

// Default styles per relationship
const DEFAULT_STYLES: Record<RelationshipType, CommunicationStyle> = {
  mother: {
    formality: "intimate",
    warmth: 9,
    humor: 6,
    directness: 4,
    empathy: 10,
    vocabulary: "simple",
    topics: ["family", "health", "emotions", "food", "traditions"],
    avoidTopics: ["politics", "money", "work stress"],
  },
  father: {
    formality: "semi-formal",
    warmth: 7,
    humor: 5,
    directness: 7,
    empathy: 6,
    vocabulary: "simple",
    topics: ["work", "sports", "family", "health"],
    avoidTopics: ["deep emotions", "relationships"],
  },
  spouse: {
    formality: "intimate",
    warmth: 10,
    humor: 8,
    directness: 6,
    empathy: 10,
    vocabulary: "colloquial",
    topics: ["everything"],
    avoidTopics: [],
  },
  friend: {
    formality: "casual",
    warmth: 8,
    humor: 9,
    directness: 7,
    empathy: 8,
    vocabulary: "colloquial",
    topics: ["life", "work", "entertainment", "shared interests"],
    avoidTopics: [],
  },
  close_friend: {
    formality: "intimate",
    warmth: 9,
    humor: 10,
    directness: 8,
    empathy: 9,
    vocabulary: "colloquial",
    topics: ["everything"],
    avoidTopics: [],
  },
  colleague: {
    formality: "formal",
    warmth: 5,
    humor: 4,
    directness: 6,
    empathy: 5,
    vocabulary: "professional",
    topics: ["work", "projects", "industry"],
    avoidTopics: ["personal", "politics", "religion"],
  },
  boss: {
    formality: "formal",
    warmth: 3,
    humor: 2,
    directness: 8,
    empathy: 4,
    vocabulary: "professional",
    topics: ["work", "projects", "career"],
    avoidTopics: ["personal", "complaints", "others"],
  },
  investor: {
    formality: "formal",
    warmth: 4,
    humor: 3,
    directness: 8,
    empathy: 4,
    vocabulary: "professional",
    topics: ["metrics", "growth", "progress", "numbers"],
    avoidTopics: ["excuses", "problems without solutions"],
  },
  customer: {
    formality: "semi-formal",
    warmth: 7,
    humor: 4,
    directness: 5,
    empathy: 7,
    vocabulary: "simple",
    topics: ["their needs", "solutions", "value"],
    avoidTopics: ["competitors", "internal issues"],
  },
  child: {
    formality: "intimate",
    warmth: 10,
    humor: 8,
    directness: 3,
    empathy: 10,
    vocabulary: "simple",
    topics: ["fun", "learning", "family", "friends"],
    avoidTopics: ["adult topics", "worries"],
  },
  sibling: {
    formality: "casual",
    warmth: 8,
    humor: 9,
    directness: 7,
    empathy: 7,
    vocabulary: "colloquial",
    topics: ["everything"],
    avoidTopics: [],
  },
  partner: {
    formality: "intimate",
    warmth: 10,
    humor: 7,
    directness: 6,
    empathy: 10,
    vocabulary: "colloquial",
    topics: ["everything"],
    avoidTopics: [],
  },
  employee: {
    formality: "semi-formal",
    warmth: 6,
    humor: 4,
    directness: 8,
    empathy: 6,
    vocabulary: "professional",
    topics: ["work", "growth", "feedback"],
    avoidTopics: ["personal", "gossip"],
  },
  client: {
    formality: "formal",
    warmth: 6,
    humor: 3,
    directness: 6,
    empathy: 6,
    vocabulary: "professional",
    topics: ["their needs", "solutions", "outcomes"],
    avoidTopics: ["problems", "delays"],
  },
  acquaintance: {
    formality: "formal",
    warmth: 4,
    humor: 3,
    directness: 5,
    empathy: 5,
    vocabulary: "professional",
    topics: ["weather", "current events", "work"],
    avoidTopics: ["personal", "deep topics"],
  },
  stranger: {
    formality: "formal",
    warmth: 3,
    humor: 1,
    directness: 5,
    empathy: 4,
    vocabulary: "professional",
    topics: ["general"],
    avoidTopics: ["everything personal"],
  },
};

export class RelationshipClassifier {
  /**
   * Classify relationship type
   */
  classify(conversationHistory: string[]): RelationshipType {
    // Simple heuristic - would use ML in production
    const text = conversationHistory.join(" ").toLowerCase();

    if (text.includes("mom") || text.includes("mother")) return "mother";
    if (text.includes("dad") || text.includes("father")) return "father";
    if (text.includes("wife") || text.includes("husband")) return "spouse";
    if (text.includes("boss") || text.includes("manager")) return "boss";
    if (text.includes("investor") || text.includes("vc")) return "investor";
    if (text.includes("team") || text.includes("colleague")) return "colleague";
    if (text.includes("friend") || text.includes("bro")) return "friend";

    return "acquaintance";
  }

  /**
   * Get default communication style
   */
  getDefaultStyle(type: RelationshipType): CommunicationStyle {
    return DEFAULT_STYLES[type] || DEFAULT_STYLES.acquaintance;
  }
}

export const relationshipClassifier = new RelationshipClassifier();