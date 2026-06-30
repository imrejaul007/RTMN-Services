/**
 * Emotion Detector + Buttons
 *
 * Detects emotional state from incoming messages + user behavior.
 * Surfaces 4 universal emotion buttons:
 * - 😡 Calm This Down
 * - 💝 Say Something Nice
 * - 🤔 What Should I Reply?
 * - ⚡ Quick Reply
 *
 * Universal. Everyone understands them.
 */

class EmotionDetector {
  constructor({ logger } = {}) {
    this.logger = logger || console;

    // Emotion lexicons (simple keyword-based for now; production uses LLM)
    this.lexicons = {
      anger: {
        keywords: ['angry', 'furious', 'mad', 'frustrated', 'annoyed', 'pissed', 'outraged', 'unacceptable', 'ridiculous', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'useless', 'pathetic', 'disgusted', 'fed up', 'sick of', 'frustrating', 'frustrated'],
        patterns: [/[A-Z]{3,}/, /!{2,}/, /\?\!+/],
        emoji: ['😡', '😤', '🤬', '😠'],
        score: 0
      },
      sadness: {
        keywords: ['sad', 'sorry', 'unfortunately', 'regret', 'miss', 'lost', 'passed away', 'died', 'death', 'sick', 'ill', 'hospital', 'condolences', 'sympathy', 'thoughts', 'prayers', 'difficult', 'tough time', 'hard time', 'crying', 'tears'],
        patterns: [/\.\.\./, /sigh/i],
        emoji: ['😢', '😭', '🥺', '💔', '😞'],
        score: 0
      },
      confusion: {
        keywords: ['confused', 'unsure', 'don\'t know', 'unclear', 'what do you mean', 'huh', 'puzzled', 'wondering', 'maybe', 'perhaps', 'possibly'],
        patterns: [/\?{2,}/],
        emoji: ['🤔', '😕', '🧐'],
        score: 0
      },
      urgency: {
        keywords: ['urgent', 'asap', 'immediately', 'now', 'hurry', 'quick', 'fast', 'right now', 'emergency', 'critical', 'important'],
        patterns: [/!/],
        emoji: ['⏰', '🚨', '⚡'],
        score: 0
      },
      happiness: {
        keywords: ['thanks', 'thank you', 'great', 'awesome', 'amazing', 'wonderful', 'love', 'happy', 'excited', 'fantastic', 'perfect', 'best', 'brilliant', '😊', '❤️', '🎉'],
        patterns: [],
        emoji: ['😊', '🎉', '❤️', '🥰'],
        score: 0
      }
    };

    this.stats = {
      totalAnalyses: 0,
      emotionsDetected: { anger: 0, sadness: 0, confusion: 0, urgency: 0, happiness: 0, none: 0 },
      suggestionsShown: { calm: 0, kind: 0, thinking: 0, quick: 0 }
    };
  }

  /**
   * Analyze incoming message for emotion
   */
  analyze(message) {
    if (!message || typeof message !== 'string') {
      return this._emptyResult();
    }

    this.stats.totalAnalyses++;
    const text = message.toLowerCase();
    const scores = {};

    // Score each emotion
    for (const [emotion, lexicon] of Object.entries(this.lexicons)) {
      let score = 0;

      // Keyword matching
      for (const keyword of lexicon.keywords) {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(text)) {
          score += 0.3;
        }
      }

      // Pattern matching
      for (const pattern of lexicon.patterns) {
        if (pattern.test(message)) {
          score += 0.2;
        }
      }

      // Emoji detection
      for (const emoji of lexicon.emoji) {
        if (message.includes(emoji)) {
          score += 0.4;
        }
      }

      scores[emotion] = Math.min(score, 1.0);
    }

    // Determine primary emotion
    const sortedEmotions = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);

    const primaryEmotion = sortedEmotions[0][0];
    const primaryScore = sortedEmotions[0][1];

    // Threshold: emotion is "detected" if score > 0.3
    const detected = primaryScore > 0.3 ? primaryEmotion : 'none';

    if (this.stats.emotionsDetected[detected] !== undefined) {
      this.stats.emotionsDetected[detected]++;
    }

    return {
      scores,
      primary: detected,
      primaryScore,
      confidence: primaryScore,
      raw: sortedEmotions
    };
  }

  /**
   * Detect user behavior signals (stuck, busy, etc.)
   */
  detectBehaviorSignals(behavior = {}) {
    const signals = {
      stuck: false,
      busy: false,
      deleting: false,
      confused: false
    };

    // Typing for > 30s
    if (behavior.typingDuration && behavior.typingDuration > 30000) {
      signals.stuck = true;
    }

    // Many pauses
    if (behavior.pauseCount && behavior.pauseCount > 5) {
      signals.stuck = true;
      signals.confused = true;
    }

    // Many deletions
    if (behavior.deletions && behavior.deletions > 3) {
      signals.deleting = true;
      signals.confused = true;
    }

    // Time-based busy detection
    const hour = new Date().getHours();
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 17)) {
      signals.busy = true;
    }

    // Recently opened calendar
    if (behavior.recentApp === 'calendar') {
      signals.busy = true;
    }

    return signals;
  }

  /**
   * Decide which emotion button to show
   */
  suggestEmotionButton(emotionResult, behaviorSignals) {
    // Priority 1: Anger (incoming hostile message)
    if (emotionResult?.primary === 'anger' && emotionResult.confidence > 0.3) {
      this.stats.suggestionsShown.calm++;
      return {
        emotion: 'anger',
        button: '😡 Calm This Down',
        action: 'calm_this_down',
        priority: 'high',
        confidence: emotionResult.confidence
      };
    }

    // Priority 2: Sadness
    if (emotionResult?.primary === 'sadness' && emotionResult.confidence > 0.3) {
      this.stats.suggestionsShown.kind++;
      return {
        emotion: 'sadness',
        button: '💝 Say Something Nice',
        action: 'say_something_nice',
        priority: 'high',
        confidence: emotionResult.confidence
      };
    }

    // Priority 3: User is confused/stuck
    if (behaviorSignals?.stuck || behaviorSignals?.confused) {
      this.stats.suggestionsShown.thinking++;
      return {
        emotion: 'confusion',
        button: '🤔 What Should I Reply?',
        action: 'suggest_replies',
        priority: 'medium',
        confidence: behaviorSignals.stuck ? 0.7 : 0.5
      };
    }

    // Priority 4: User is busy (typing fast or during work hours)
    if (behaviorSignals?.busy) {
      this.stats.suggestionsShown.quick++;
      return {
        emotion: 'urgency',
        button: '⚡ Quick Reply',
        action: 'quick_reply',
        priority: 'low',
        confidence: 0.6
      };
    }

    return null;
  }

  /**
   * Generate emotion-appropriate replies
   */
  async generateReply(emotion, incomingMessage, language = 'en') {
    const replies = {
      anger: {
        prompt: `Generate 3 de-escalation responses for an angry/frustrated message.
                Each response should:
                1. Acknowledge the frustration without being defensive
                2. Stay professional and calm
                3. Move toward resolution
                4. Be 1-2 sentences max
                Original message: "${incomingMessage}"
                Language: ${language}
                Return as JSON: { replies: ["reply1", "reply2", "reply3"] }`,
        labels: {
          en: ['Acknowledge & Apologize', 'Take Responsibility', 'Offer Solution']
        }
      },
      sadness: {
        prompt: `Generate 3 empathetic responses for sad/difficult news.
                Each response should:
                1. Show genuine care and empathy
                2. Not minimize their pain
                3. Offer support if appropriate
                4. Be warm and human
                Original message: "${incomingMessage}"
                Language: ${language}
                Return as JSON: { replies: ["reply1", "reply2", "reply3"] }`,
        labels: {
          en: ['Warm & Caring', 'Supportive', 'Thoughtful']
        }
      },
      confusion: {
        prompt: `Generate 3 thoughtful reply options when user doesn't know what to say.
                Each response should:
                1. Be appropriate for uncertain situations
                2. Cover different angles (clarifying, diplomatic, deferring)
                3. Be polite and non-committal where needed
                Original message: "${incomingMessage}"
                Language: ${language}
                Return as JSON: { replies: ["reply1", "reply2", "reply3"] }`,
        labels: {
          en: ['Ask for Clarification', 'Diplomatic Response', 'Polite Defer']
        }
      },
      urgency: {
        prompt: `Generate 3 short, complete quick replies (max 10 words each).
                These should be efficient, action-oriented responses.
                Original message: "${incomingMessage}"
                Language: ${language}
                Return as JSON: { replies: ["reply1", "reply2", "reply3"] }`,
        labels: {
          en: ['Acknowledge', 'Action Item', 'Brief Response']
        }
      }
    };

    const config = replies[emotion];
    if (!config) {
      return { replies: [], labels: [] };
    }

    // In production, this would call Genie/LLM
    // For now, return mock replies based on emotion
    const mockReplies = {
      anger: [
        "I understand your frustration. Let me look into this for you right away.",
        "I apologize for the inconvenience. I'll personally make sure this gets resolved.",
        "Thank you for bringing this to my attention. I'll get back to you within the hour."
      ],
      sadness: [
        "I'm so sorry to hear that. My thoughts are with you and your family.",
        "Sending you love and strength during this difficult time. Please let me know if you need anything.",
        "My heartfelt condolences. Wishing you peace and comfort."
      ],
      confusion: [
        "Thank you for your message. Could you help me understand a bit more?",
        "I appreciate you reaching out. Let me check on this and get back to you shortly.",
        "Thanks for letting me know. I'll review and follow up with you soon."
      ],
      urgency: [
        "On it. Will update shortly.",
        "Got it. Taking action now.",
        "Acknowledged. Will respond ASAP."
      ]
    };

    return {
      emotion,
      replies: mockReplies[emotion] || [],
      labels: config.labels[language] || config.labels.en
    };
  }

  _emptyResult() {
    return {
      scores: { anger: 0, sadness: 0, confusion: 0, urgency: 0, happiness: 0 },
      primary: 'none',
      primaryScore: 0,
      confidence: 0,
      raw: []
    };
  }

  getStats() {
    return this.stats;
  }
}

module.exports = EmotionDetector;