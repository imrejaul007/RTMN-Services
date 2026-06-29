/**
 * Curiosity Engine
 */

export interface CuriosityContext {
  userId: string;
  recentTopics: string[];
  currentTopic: string;
  conversationDepth: number;
  userInterests: string[];
  relationshipType: string;
  timeSinceLastQuestion: number;
}

export class CuriosityEngine {
  shouldAskQuestion(context: CuriosityContext): boolean {
    if (context.conversationDepth >= 4) return false;
    if (context.timeSinceLastQuestion < 30000) return false;
    return true;
  }

  askNextQuestion(context: CuriosityContext): { question: string; topic: string; type: string } {
    const questions = [
      "What made you decide to try this approach?",
      "How's that working out for you?",
      "What's the most challenging part?",
      "What outcome are you hoping for?",
      "How does this connect to your bigger goals?",
    ];

    return {
      question: questions[Math.floor(Math.random() * questions.length)],
      topic: context.currentTopic,
      type: "follow_up",
    };
  }
}

export const voiceCuriosityEngine = new CuriosityEngine();