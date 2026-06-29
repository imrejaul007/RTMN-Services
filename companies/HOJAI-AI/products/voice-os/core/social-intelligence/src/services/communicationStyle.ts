/**
 * Communication Style Adapter
 * Adapts responses based on relationship
 */

import { CommunicationStyle, RelationshipType } from "../types/index.js";
import { relationshipClassifier } from "./relationshipClassifier.js";

export class CommunicationStyleAdapter {
  /**
   * Adapt greeting based on relationship
   */
  getGreeting(type: RelationshipType): string {
    switch (type) {
      case "mother":
      case "father":
      case "spouse":
      case "child":
        return "Hey! How are you doing?";
      case "friend":
      case "close_friend":
        return "What's up?";
      case "colleague":
      case "boss":
        return "Good to connect. How can I help?";
      case "investor":
        return "Thank you for your time. Let me update you on our progress.";
      default:
        return "Hello. How can I assist you today?";
    }
  }

  /**
   * Adapt question style based on relationship
   */
  getQuestionStyle(style: CommunicationStyle): {
    prefix: string;
    length: "short" | "medium" | "long";
    direct: boolean;
  } {
    switch (style.formality) {
      case "intimate":
        return { prefix: "So", length: "medium", direct: true };
      case "casual":
        return { prefix: "Hey, quick question", length: "short", direct: true };
      case "semi-formal":
        return { prefix: "I wanted to ask", length: "medium", direct: false };
      case "formal":
        return { prefix: "I would like to inquire about", length: "long", direct: false };
    }
  }

  /**
   * Should we use humor?
   */
  shouldUseHumor(style: CommunicationStyle, contextMood: string): boolean {
    if (style.humor < 4) return false;
    if (contextMood === "sad" || contextMood === "stressed") return false;
    return style.humor > 6;
  }

  /**
   * Get vocabulary level
   */
  getVocabularyLevel(style: CommunicationStyle): string[] {
    switch (style.vocabulary) {
      case "professional":
        return ["facilitate", "implement", "optimize", "leverage", "stakeholder"];
      case "simple":
        return ["help", "make", "do", "get", "find"];
      case "colloquial":
        return ["gonna", "wanna", "kinda", "stuff", "things"];
      default:
        return [];
    }
  }

  /**
   * Check if topic is appropriate
   */
  isTopicAppropriate(topic: string, style: CommunicationStyle): boolean {
    const lowerTopic = topic.toLowerCase();
    return !style.avoidTopics.some((t) => lowerTopic.includes(t));
  }
}

export const communicationStyleAdapter = new CommunicationStyleAdapter();