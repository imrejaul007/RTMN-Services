/**
 * Silence Intelligence Service
 * ===========================
 * Understands what different silence durations mean and generates appropriate responses.
 */

import { SILENCE_MEANINGS, type SilenceMeaning, type ConversationContext } from '../types/index.js';

export class SilenceIntelligence {
  /**
   * Analyze silence duration and return its meaning + recommended action
   */
  static analyze(
    durationMs: number,
    context?: Partial<ConversationContext>
  ): SilenceAnalysis {
    let meaning: SilenceMeaning = 'THINKING';
    let response: string | null = null;
    let urgency: 'low' | 'medium' | 'high' = 'low';

    if (durationMs <= SILENCE_MEANINGS.THINKING.maxMs) {
      meaning = 'THINKING';
      response = null;
      urgency = 'low';
    } else if (durationMs <= SILENCE_MEANINGS.PROCESSING.maxMs) {
      meaning = 'PROCESSING';
      response = null;
      urgency = 'low';
    } else if (durationMs <= SILENCE_MEANINGS.CONFUSION.maxMs) {
      meaning = 'CONFUSION';
      response = this.generateConfusionResponse(context);
      urgency = 'medium';
    } else if (durationMs <= SILENCE_MEANINGS.DISTRACTED.maxMs) {
      meaning = 'DISTRACTED';
      response = this.generateDistractedResponse(context);
      urgency = 'high';
    } else {
      meaning = 'ABANDONED';
      response = this.generateAbandonedResponse(context);
      urgency = 'high';
    }

    return {
      meaning,
      durationMs,
      response,
      urgency,
      explanation: this.explainMeaning(meaning, durationMs, context)
    };
  }

  /**
   * Generate appropriate backchannel for silence
   */
  static generateBackchannel(
    durationMs: number,
    context?: Partial<ConversationContext>
  ): string | null {
    const meaning = this.analyze(durationMs, context);

    if (meaning.meaning === 'THINKING' || meaning.meaning === 'PROCESSING') {
      return null; // No backchannel needed for short silences
    }

    if (meaning.meaning === 'CONFUSION') {
      return 'take-your-time';
    }

    if (meaning.meaning === 'DISTRACTED') {
      return 'still-there';
    }

    return 'conversation-ended';
  }

  /**
   * Get context-appropriate silence response
   */
  static getContextualResponse(
    meaning: SilenceMeaning,
    context?: Partial<ConversationContext>
  ): string | null {
    const templates = this.getResponseTemplates(meaning, context?.relationship);

    if (!templates.length) return null;

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Private helpers
   */

  private static explainMeaning(
    meaning: SilenceMeaning,
    durationMs: number,
    context?: Partial<ConversationContext>
  ): string {
    const explanations: Record<SilenceMeaning, string> = {
      THINKING: 'Brief pause while formulating thoughts - normal conversation flow',
      PROCESSING: 'User processing complex information or emotional content',
      CONFUSION: 'User may be confused or unsure - may need clarification',
      DISTRACTED: 'User appears distracted - external interruption likely',
      ABANDONED: 'Conversation may have been abandoned or user disengaged'
    };

    return explanations[meaning];
  }

  private static generateConfusionResponse(context?: Partial<ConversationContext>): string | null {
    const responses = this.getContextualResponse('CONFUSION', context);
    return responses;
  }

  private static generateDistractedResponse(context?: Partial<ConversationContext>): string | null {
    const responses = this.getContextualResponse('DISTRACTED', context);
    return responses;
  }

  private static generateAbandonedResponse(context?: Partial<ConversationContext>): string | null {
    const responses = this.getContextualResponse('ABANDONED', context);
    return responses;
  }

  private static getResponseTemplates(
    meaning: SilenceMeaning,
    relationship?: string
  ): string[] {
    const templates: Record<SilenceMeaning, Record<string, string[]> | string[]> = {
      THINKING: [],
      PROCESSING: [],
      CONFUSION: {
        default: [
          'Take your time...',
          'No rush at all...',
          'Whenever you\'re ready...',
          'Let me know if I can clarify anything...',
          'No worries, take your time to think...'
        ],
        friend: [
          'Take your time, bro...',
          'No rush, take your time...',
          'Whenever you\'re ready, I\'m here...'
        ],
        mother: [
          'Beta, take your time...',
          'No hurry, beta...',
          'Whenever you\'re ready, dear...'
        ],
        investor: [
          'Take your time...',
          'No rush to answer...',
          'Take a moment to consider...'
        ],
        customer: [
          'No rush at all...',
          'Take your time, I\'m here to help...',
          'Whenever you\'re ready...'
        ]
      },
      DISTRACTED: {
        default: [
          'Still there?',
          'Did something come up?',
          'Are you still with me?',
          'I\'m here when you\'re ready...',
          'Take your time - I\'ll wait...'
        ],
        friend: [
          'Yo, you still there?',
          'Hey, you good?',
          'Bro, you there?'
        ],
        mother: [
          'Beta, are you there?',
          'Still with me, dear?',
          'Beta, kya hua?'
        ],
        investor: [
          'Are you still there?',
          'Let me know when you\'re ready to continue...',
          'I\'m here whenever you\'d like to proceed...'
        ],
        customer: [
          'Are you still there?',
          'I\'m here when you\'re ready...',
          'Take your time - I\'m happy to help...'
        ]
      },
      ABANDONED: {
        default: [
          'Looks like you had to go. I\'ll be here when you\'re back.',
          'No problem - catch you later!',
          'Conversation ended. I\'ll remember what we discussed.',
          'Hope everything is okay. I\'m here whenever you need me.',
          'Take care. Come back anytime!'
        ],
        friend: [
          'Looks like you had to dip. Catch you later, bro!',
          'No worries. I\'ll be around if you need me.',
          'Alright, talk soon!'
        ],
        mother: [
          'Beta, looks like you had to go. I\'ll be here.',
          'No problem, dear. Come back when you\'re free.',
          'Take care, beta.'
        ],
        investor: [
          'I\'ll be available when you\'re ready to continue.',
          'Thank you for your time. I look forward to our next conversation.',
          'I\'ll be here whenever you\'d like to resume.'
        ],
        customer: [
          'No problem! I\'ll be here to help whenever you\'re ready.',
          'Take care! Feel free to come back anytime.',
          'Thank you for reaching out. I\'m always here to help!'
        ]
      }
    };

    const templateSet = templates[meaning];
    if (Array.isArray(templateSet)) return templateSet;
    if (typeof templateSet === 'object' && relationship && templateSet[relationship]) {
      return templateSet[relationship];
    }
    if (typeof templateSet === 'object' && templateSet.default) {
      return templateSet.default;
    }
    return [];
  }
}

export interface SilenceAnalysis {
  meaning: SilenceMeaning;
  durationMs: number;
  response: string | null;
  urgency: 'low' | 'medium' | 'high';
  explanation: string;
}
