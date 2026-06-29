/**
 * Repair Engine Service
 * ====================
 * Handles self-corrections, repairs, and context updates from user speech.
 */

import type { SelfCorrection } from '../types/index.js';

export class RepairEngine {
  /**
   * Detect self-correction patterns in user speech
   */
  static detectSelfCorrection(transcript: string): SelfCorrection | null {
    // Pattern: "X —sorry— Y" or "X - sorry - Y" or "X -- Y"
    const patterns = [
      // Dash-based corrections
      /^(.+?)\s*[–——-]\s*(?:sorry|apologize|excuse\s*me|i\s?mean|wait|no|actually)\s*[–——-]?\s*(.+)$/i,
      // Comma-based corrections
      /^(.+?),\s*(?:sorry|apologize|i\s?mean|wait|no|actually),\s*(.+)$/i,
      // "X not Y" pattern
      /^(.+?)\s+(?:not|but|rather)\s+(.+)$/i,
      // "I meant X" pattern
      /^(.+?)\s*[,;]\s*(?:i\s?mean|meant|sorry)\s*[,;]?\s*(.+)$/i
    ];

    for (let i = 0; i < patterns.length; i++) {
      const match = transcript.match(patterns[i]);
      if (match) {
        return {
          type: this.determineCorrectionType(match, i),
          originalText: match[1]?.trim() || '',
          correctedText: match[2]?.trim() || '',
          position: {
            start: transcript.indexOf(match[1] || ''),
            end: transcript.indexOf(match[2] || '') + (match[2]?.length || 0)
          }
        };
      }
    }

    return null;
  }

  /**
   * Extract the final intended meaning from a transcript with corrections
   */
  static extractFinalIntent(transcript: string): string {
    // Replace corrections with their corrected versions
    let cleaned = transcript;

    // Remove apology phrases
    const apologyPatterns = [
      /,\s*sorry\s*,?\s*/gi,
      /–—-\s*sorry\s*[–—]-?\s*/gi,
      /,\s*i\s?mean\s*,?\s*/gi,
      /,\s*actually\s*,?\s*/gi,
      /\s*not\s+(?=the|a|an|that|this|what|where|when|who)/gi // "X not the Y" -> "X the Y"
    ];

    for (const pattern of apologyPatterns) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    // Remove filler corrections
    cleaned = cleaned
      .replace(/—\s*/g, ' ')
      .replace(/–\s*/g, ' ')
      .replace(/--\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  /**
   * Update conversation context based on self-corrections
   */
  static updateContextFromCorrection(
    currentContext: Record<string, unknown>,
    correction: SelfCorrection
  ): Record<string, unknown> {
    const updated = { ...currentContext };

    // If user corrected something about themselves, update relevant context
    const selfKeywords = ['i ', 'my ', 'me ', 'myself', "i'm", "i've", "i'll"];
    const isSelfCorrection = selfKeywords.some(k =>
      correction.originalText.toLowerCase().includes(k)
    );

    if (isSelfCorrection) {
      // User is clarifying something about themselves - this is valuable info
      updated.clarificationCount = (updated.clarificationCount as number || 0) + 1;
      updated.lastClarified = new Date().toISOString();
    }

    // If user corrected a fact, mark for memory update
    if (correction.correctedText && correction.correctedText.length > 2) {
      updated.hasFactualCorrection = true;
      updated.correctedClaim = correction.originalText;
      updated.correctedTo = correction.correctedText;
    }

    return updated;
  }

  /**
   * Generate acknowledgment for a self-correction
   */
  static generateRepairAcknowledgment(
    correction: SelfCorrection,
    relationship?: string
  ): string {
    // Casual relationships get casual acknowledgment
    if (relationship === 'friend') {
      const options = [
        'No worries, got it.',
        'Ah, makes sense now.',
        'Gotcha.',
        'Understood.',
        'Cool, noted.'
      ];
      return options[Math.floor(Math.random() * options.length)];
    }

    // Family gets warm acknowledgment
    if (relationship === 'mother' || relationship === 'family') {
      const options = [
        'No problem, beta.',
        'That\'s okay, dear.',
        'No worries at all.',
        'I understand now.',
        'Got it, take your time.'
      ];
      return options[Math.floor(Math.random() * options.length)];
    }

    // Formal relationships get professional acknowledgment
    if (relationship === 'investor' || relationship === 'customer') {
      const options = [
        'Understood.',
        'Noted.',
        'I appreciate the clarification.',
        'Thank you for clarifying.',
        'Got it.'
      ];
      return options[Math.floor(Math.random() * options.length)];
    }

    // Default
    const options = [
      'No worries, got it.',
      'Understood.',
      'Got it.',
      'I see.',
      'Noted.'
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Determine the type of correction
   */
  private static determineCorrectionType(match: RegExpMatchArray, patternIndex: number): SelfCorrection['type'] {
    if (patternIndex === 0 || patternIndex === 1) {
      // Dash or comma-based = replacement
      return 'replacement';
    }
    if (patternIndex === 2) {
      // "not/but/rather" pattern = deletion of wrong part
      return 'replacement';
    }
    return 'addition';
  }

  /**
   * Detect topic drift or completions
   */
  static detectTopicTransition(transcript: string, previousTopics: string[]): TopicTransition | null {
    const transitionPhrases = [
      /^(?:anyway|anyhow|so|okay|right)\s*,?\s*/i,
      /^(?:moving\s+on|changing\s+subject|btw|by\s+the\s+way)\s*:?\s*/i,
      /^(?:on\s+a\s+different\s+note|sidebar|speaking\s+of\s+which)\s*:?\s*/i
    ];

    for (const pattern of transitionPhrases) {
      if (pattern.test(transcript)) {
        return {
          isTransition: true,
          type: 'topic_change',
          confidence: 0.85
        };
      }
    }

    // Check if this might be a completion
    const completionPatterns = [
      /(?:that\'s\s+all|that\'s\s+it|nothing\s+else|done|finished|complete)/i,
      /(?:thanks?\s+though?|appreciate\s+it|talk\s+later|gotta\s+go)/i
    ];

    for (const pattern of completionPatterns) {
      if (pattern.test(transcript)) {
        return {
          isTransition: true,
          type: 'conversation_end',
          confidence: 0.9
        };
      }
    }

    return null;
  }
}

export interface TopicTransition {
  isTransition: boolean;
  type: 'topic_change' | 'conversation_end' | 'dig_deeper' | 'tangential';
  confidence: number;
}
