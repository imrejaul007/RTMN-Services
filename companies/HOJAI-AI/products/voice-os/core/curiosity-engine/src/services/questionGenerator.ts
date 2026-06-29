/**
 * Question Generator
 * Generates intelligent follow-up questions
 */

import { CuriosityQuestion, ConversationContext } from "../types/index.js";

export class QuestionGenerator {
  /**
   * Generate follow-up question
   */
  generateFollowUp(context: ConversationContext): CuriosityQuestion {
    const depth = Math.min(context.conversationDepth + 1, 5);

    // Determine question type based on context
    if (context.conversationDepth < 2) {
      return this.generateExplorationQuestion(context, depth);
    } else if (context.conversationDepth < 4) {
      return this.generateFollowUpQuestion(context, depth);
    } else {
      return this.generateReflectionQuestion(context, depth);
    }
  }

  /**
   * Generate exploration question (shallow depth)
   */
  private generateExplorationQuestion(context: ConversationContext, depth: number): CuriosityQuestion {
    const topic = context.currentTopic || context.recentTopics[0] || "this";

    const questions = [
      `What made you interested in ${topic}?`,
      `How did you first get involved with ${topic}?`,
      `What aspects of ${topic} do you find most engaging?`,
      `Tell me more about ${topic}.`,
    ];

    return {
      id: `q_${Date.now()}`,
      question: questions[Math.floor(Math.random() * questions.length)],
      type: "exploration",
      depth,
      topic,
      intent: "learn",
      timing: 1500,
    };
  }

  /**
   * Generate follow-up question (medium depth)
   */
  private generateFollowUpQuestion(context: ConversationContext, depth: number): CuriosityQuestion {
    const topic = context.currentTopic;

    const questions = [
      `What's the most challenging part of ${topic}?`,
      `Have you noticed any patterns in ${topic} recently?`,
      `What outcome are you hoping for with ${topic}?`,
      `How does ${topic} fit into your bigger goals?`,
      `What surprised you most about ${topic}?`,
    ];

    return {
      id: `q_${Date.now()}`,
      question: questions[Math.floor(Math.random() * questions.length)],
      type: "follow_up",
      depth,
      topic,
      intent: "understand",
      timing: 2000,
    };
  }

  /**
   * Generate reflection question (deep)
   */
  private generateReflectionQuestion(context: ConversationContext, depth: number): CuriosityQuestion {
    const topic = context.currentTopic;

    const questions = [
      `Looking back, how has ${topic} changed your perspective?`,
      `What would you tell someone starting their journey with ${topic}?`,
      `If ${topic} was a chapter in your life, what would you title it?`,
      `How do you want to feel about ${topic} in a year from now?`,
      `What's the most important lesson ${topic} has taught you?`,
    ];

    return {
      id: `q_${Date.now()}`,
      question: questions[Math.floor(Math.random() * questions.length)],
      type: "reflection",
      depth,
      topic,
      intent: "empathize",
      timing: 2500,
    };
  }

  /**
   * Generate clarification question
   */
  generateClarification(context: ConversationContext, unclearPhrase: string): CuriosityQuestion {
    return {
      id: `q_${Date.now()}`,
      question: `I want to make sure I understand. When you say "${unclearPhrase}", do you mean...?`,
      type: "clarification",
      depth: context.conversationDepth,
      topic: context.currentTopic,
      intent: "understand",
      timing: 800,
    };
  }
}

export const questionGenerator = new QuestionGenerator();