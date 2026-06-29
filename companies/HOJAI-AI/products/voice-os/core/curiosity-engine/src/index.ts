/**
 * Voice Curiosity Engine
 * Intelligent follow-up questions for VoiceOS
 */

import { questionGenerator } from "./services/questionGenerator.js";
import { topicExplorer } from "./services/topicExplorer.js";
import type { CuriosityQuestion, ConversationContext, TopicExploration } from "./types/index.js";

export class VoiceCuriosityEngine {
  /**
   * Generate next question based on conversation
   */
  askNextQuestion(context: ConversationContext): CuriosityQuestion | null {
    // Don't ask too many questions
    if (context.conversationDepth > 5) {
      return null;
    }

    // Start topic exploration if new
    if (context.currentTopic && !topicExplorer.getExploration(context.currentTopic)) {
      topicExplorer.startExploration(context.currentTopic);
    }

    // Generate question
    const question = questionGenerator.generateFollowUp(context);

    // Update exploration
    if (context.currentTopic) {
      topicExplorer.incrementQuestions(context.currentTopic);
    }

    return question;
  }

  /**
   * Generate clarification for unclear statement
   */
  askForClarification(context: ConversationContext, unclearPhrase: string): CuriosityQuestion {
    return questionGenerator.generateClarification(context, unclearPhrase);
  }

  /**
   * Start exploring a new topic
   */
  startExploringTopic(topic: string): TopicExploration {
    return topicExplorer.startExploration(topic);
  }

  /**
   * Get topic exploration data
   */
  getTopicExploration(topic: string): TopicExploration | null {
    return topicExplorer.getExploration(topic);
  }

  /**
   * Get related topics
   */
  getRelatedTopics(topic: string): string[] {
    return topicExplorer.getRelatedTopics(topic);
  }

  /**
   * Update user's topic knowledge
   */
  updateTopicKnowledge(topic: string, knowledgeLevel: number, interestLevel: number): void {
    topicExplorer.updateKnowledge(topic, knowledgeLevel, interestLevel);
  }

  /**
   * Should we ask a question right now?
   */
  shouldAskQuestion(context: ConversationContext): boolean {
    // Don't overwhelm with questions
    if (context.conversationDepth >= 4) return false;

    // Don't ask if user just asked a question
    if (context.recentTopics.length > 2) return false;

    // Don't ask if conversation is brief
    if (context.timeSinceLastQuestion < 30000) return false;

    return true;
  }
}

export const voiceCuriosityEngine = new VoiceCuriosityEngine();
export default voiceCuriosityEngine;