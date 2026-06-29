/**
 * Turn Manager Service
 * ====================
 * Handles turn-taking logic: when to speak, wait, interrupt, continue.
 */

import type { TurnState, TurnDecision, ConversationSession, ConversationContext } from '../types/index.js';

export class TurnManager {
  /**
   * Decide what action to take based on conversation state
   */
  static decide(
    session: ConversationSession,
    userJustSpoke: boolean,
    userTranscript?: string
  ): TurnDecision {
    // If user just spoke, decide whether AI should respond
    if (userJustSpoke) {
      return this.decideAfterUserSpeech(session, userTranscript);
    }

    // If AI just spoke, decide whether to wait or continue
    return this.decideAfterAISpeech(session);
  }

  /**
   * Decide AI action after user speech
   */
  private static decideAfterUserSpeech(
    session: ConversationSession,
    transcript?: string
  ): TurnDecision {
    // Check for interruption patterns in user speech
    if (transcript) {
      const interruptionPatterns = [
        /^(actually|wait|no\s|hold\s|hold\s?on|let\s?me|i\s?mean|sorry)/i,
        /nevermind|never\s?mind/i,
        /^(oh|ah|uh)\s*(sorry|wait)/i
      ];

      for (const pattern of interruptionPatterns) {
        if (pattern.test(transcript)) {
          return {
            action: 'wait',
            confidence: 0.9,
            reason: 'User appears to be correcting or interrupting themselves',
            delayMs: 0
          };
        }
      }

      // Check for self-corrections (X -> Y patterns)
      if (/[-–—]\s*(sorry|actually|no|wait|i\s?mean)/i.test(transcript)) {
        return {
          action: 'wait',
          confidence: 0.95,
          reason: 'Self-correction detected - let user finish',
          delayMs: 0
        };
      }
    }

    // Check silence duration
    const lastTurn = session.turns[session.turns.length - 1];
    if (lastTurn?.hadSilence && lastTurn.silenceDurationMs) {
      if (lastTurn.silenceDurationMs > 3000) {
        return {
          action: 'backchannel',
          confidence: 0.85,
          reason: `User was silent for ${lastTurn.silenceDurationMs}ms - showing acknowledgment`,
          suggestedBackchannel: this.selectBackchannel(session.context),
          delayMs: 500
        };
      }
    }

    // Short user utterance - likely confirmation, not request
    if (transcript && transcript.split(' ').length <= 3) {
      const confirmations = /^(yes|yeah|yep|sure|ok|okay|no|nope|nah|correct|right|exactly|go\s?ahead)/i;
      if (confirmations.test(transcript)) {
        return {
          action: 'continue',
          confidence: 0.8,
          reason: 'Short confirmation - continue previous thought',
          delayMs: 200
        };
      }
    }

    // Normal case: user finished speaking, AI should respond
    return {
      action: 'speak',
      confidence: 0.9,
      reason: 'User finished speaking normally'
    };
  }

  /**
   * Decide AI action after AI speech
   */
  private static decideAfterAISpeech(session: ConversationSession): TurnDecision {
    // AI just spoke - wait for user response
    return {
      action: 'wait',
      confidence: 0.95,
      reason: 'AI just spoke, waiting for user response'
    };
  }

  /**
   * Select appropriate backchannel based on context
   */
  static selectBackchannel(context?: Partial<ConversationContext>): string {
    const backchannels = [
      'mm-hmm...',
      'right...',
      'i see...',
      'i understand...',
      'go on...',
      'tell me more',
      'what happened next'
    ];

    if (!context?.relationship) {
      return backchannels[Math.floor(Math.random() * 3)]; // Neutral
    }

    // Relationship-specific backchannels
    const relationshipBackchannels: Record<string, string[]> = {
      mother: ['i see, beta...', 'tell me more, beta...', 'oh, okay...'],
      friend: ['bro...', 'wait, what happened?', 'bro that\'s crazy...'],
      investor: ['understood...', 'i see your point...', 'noted...'],
      employee: ['understood...', 'noted...', 'continue...'],
      customer: ['i understand...', 'of course...', 'let me help...'],
      partner: ['mm-hmm...', 'i see...', 'tell me more...']
    };

    const options = relationshipBackchannels[context.relationship] || backchannels;
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Detect if user interrupted
   */
  static detectInterruption(
    aiTranscript: string,
    userTranscript: string,
    timestamp: number,
    aiEndTime: number
  ): boolean {
    // If user started speaking within 500ms of AI ending, consider it overlap
    const overlapMs = timestamp - aiEndTime;
    return overlapMs < 500 && overlapMs > -500;
  }

  /**
   * Calculate optimal response delay based on context
   */
  static calculateDelay(
    userTranscript: string,
    context?: Partial<ConversationContext>
  ): number {
    let baseDelay = 200; // Minimum human-like pause

    // Longer delay after emotional statements
    const emotionalPatterns = [
      /^(i\'m\s+sad|i\s+felt|i\s+was\s+(?:so\s+)?(angry|happy|sad|scared))/i,
      /(?:bad|terrible|horrible|amazing|incredible)/i
    ];

    for (const pattern of emotionalPatterns) {
      if (pattern.test(userTranscript)) {
        baseDelay += 300; // Give space for emotion
        break;
      }
    }

    // Adjust for relationship formality
    if (context?.relationship) {
      const formalRelationships = ['investor', 'customer', 'employee'];
      if (formalRelationships.includes(context.relationship)) {
        baseDelay += 100;
      }
    }

    // Adjust for time of day
    if (context?.timeOfDay === 'night') {
      baseDelay += 200; // Calmer, slower pace at night
    }

    return baseDelay;
  }
}
