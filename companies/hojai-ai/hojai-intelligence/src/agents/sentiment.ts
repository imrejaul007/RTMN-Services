/**
 * HOJAI Intelligence - Sentiment Analysis Agent
 * Analyzes sentiment and emotions in customer communications
 */

import { SentimentResult } from '../types';

// Sentiment word lists
const POSITIVE_WORDS: Record<string, number> = {
  'love': 0.9, 'excellent': 0.95, 'amazing': 0.9, 'great': 0.8,
  'wonderful': 0.9, 'fantastic': 0.9, 'awesome': 0.85, 'perfect': 0.95,
  'happy': 0.8, 'satisfied': 0.75, 'impressed': 0.85, 'delighted': 0.9,
  'helpful': 0.7, 'friendly': 0.7, 'professional': 0.65, 'quick': 0.6,
  'easy': 0.7, 'efficient': 0.7, 'reliable': 0.7, 'thank': 0.6,
  'appreciate': 0.75, 'grateful': 0.8, 'recommend': 0.7, 'best': 0.85,
  'outstanding': 0.9, 'brilliant': 0.85, 'superb': 0.9, 'pleasant': 0.7,
};

const NEGATIVE_WORDS: Record<string, number> = {
  'hate': -0.9, 'terrible': -0.9, 'awful': -0.9, 'horrible': -0.9,
  'worst': -0.95, 'disappointing': -0.8, 'disappointed': -0.8, 'frustrating': -0.85,
  'frustrated': -0.85, 'angry': -0.85, 'upset': -0.75, 'annoyed': -0.7,
  'useless': -0.85, 'broken': -0.8, 'failed': -0.8, 'failed': -0.8,
  'problem': -0.6, 'issue': -0.5, 'bug': -0.7, 'error': -0.65,
  'slow': -0.5, 'rude': -0.8, 'unhelpful': -0.8, 'unprofessional': -0.75,
  'refund': -0.5, 'cancel': -0.6, 'complaint': -0.7, 'unacceptable': -0.9,
  'ridiculous': -0.85, 'outrageous': -0.9, 'scam': -0.95, 'fraud': -0.95,
};

// Emotion indicators
const EMOTION_PATTERNS: Record<string, { words: string[]; intensity: number }> = {
  'anger': {
    words: ['angry', 'furious', 'outraged', 'livid', 'infuriated', 'mad', 'steaming'],
    intensity: 0.9,
  },
  'frustration': {
    words: ['frustrat', 'annoy', 'irritat', 'exasperat', 'fed up', 'enough is enough'],
    intensity: 0.75,
  },
  'sadness': {
    words: ['sad', 'upset', 'disappoint', 'unhappy', 'unfortunate', 'regret'],
    intensity: 0.6,
  },
  'anxiety': {
    words: ['worried', 'concern', 'afraid', 'nervous', 'anxious', 'panic', 'urgent'],
    intensity: 0.7,
  },
  'satisfaction': {
    words: ['happy', 'satisf', 'pleased', 'content', 'delight', 'impress'],
    intensity: 0.8,
  },
  'excitement': {
    words: ['excited', 'thrilled', 'amazed', 'awesome', 'can\'t wait', 'eager'],
    intensity: 0.85,
  },
  'confusion': {
    words: ['confus', 'unclear', 'don\'t understand', 'lost', 'what do you mean', 'how do'],
    intensity: 0.5,
  },
};

// Intensifiers and negators
const INTENSIFIERS = ['very', 'extremely', 'really', 'absolutely', 'totally', 'completely', 'so', 'incredibly'];
const NEGATORS = ['not', 'no', 'never', 'neither', 'none', 'without', 'don\'t', 'doesn\'t', 'didn\'t', 'won\'t', 'wouldn\'t', 'can\'t', 'couldn\'t'];

// Key phrases for analysis
const NEGATIVE_PHRASES = [
  'not happy', 'not satisfied', 'not working', 'not helpful', 'not good',
  'very disappointed', 'extremely frustrated', 'totally unacceptable',
  'worst ever', 'never again', 'want my money back', 'speak to manager',
  'file a complaint', 'take legal action', 'report you', 'write a review',
];

const POSITIVE_PHRASES = [
  'very happy', 'extremely helpful', 'highly recommend', 'best ever',
  'excellent service', 'amazing experience', 'love it', 'perfect solution',
  '超出预期', '非常满意', '强烈推荐', '服务一流',
];

// Negation words to check
const NEGATION_WORDS = new Set([
  'not', 'no', 'never', 'neither', 'none', 'without',
  "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't",
  "isn't", "aren't", "wasn't", "weren't",
]);

export class SentimentAgent {
  /**
   * Analyze sentiment of text
   */
  async analyze(text: string): Promise<SentimentResult> {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;

    // Calculate base sentiment
    let positiveScore = 0;
    let negativeScore = 0;
    let foundWords = { positive: 0, negative: 0 };

    // Check for phrase matches first
    const lowerText = text.toLowerCase();
    for (const phrase of NEGATIVE_PHRASES) {
      if (lowerText.includes(phrase)) {
        negativeScore += 0.4;
        foundWords.negative++;
      }
    }
    for (const phrase of POSITIVE_PHRASES) {
      if (lowerText.includes(phrase)) {
        positiveScore += 0.4;
        foundWords.positive++;
      }
    }

    // Word-by-word analysis
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:]/g, '');
      const prevWord = i > 0 ? words[i - 1].replace(/[.,!?;:]/g, '') : '';

      // Check for positive words
      if (POSITIVE_WORDS[word]) {
        let score = POSITIVE_WORDS[word];
        // Apply intensifier
        if (INTENSIFIERS.includes(prevWord)) {
          score = Math.min(score * 1.5, 1.0);
        }
        // Apply negator
        if (NEGATION_WORDS.has(prevWord)) {
          score = -score * 0.5;
        }
        if (score > 0) {
          positiveScore += score;
          foundWords.positive++;
        } else {
          negativeScore += Math.abs(score);
          foundWords.negative++;
        }
      }

      // Check for negative words
      if (NEGATIVE_WORDS[word]) {
        let score = NEGATIVE_WORDS[word];
        // Apply intensifier
        if (INTENSIFIERS.includes(prevWord)) {
          score = Math.min(score * 1.5, -1.0);
        }
        // Apply negator (turns negative to positive)
        if (NEGATION_WORDS.has(prevWord)) {
          score = -score * 0.5;
        }
        if (score < 0) {
          negativeScore += Math.abs(score);
          foundWords.negative++;
        } else {
          positiveScore += score;
          foundWords.positive++;
        }
      }
    }

    // Calculate final sentiment score (-1 to 1)
    const totalSentiment = positiveScore + Math.abs(negativeScore);
    const rawScore = totalSentiment > 0
      ? (positiveScore - Math.abs(negativeScore)) / totalSentiment
      : 0;
    const score = Math.max(-1, Math.min(1, rawScore));

    // Determine sentiment category
    let sentiment: SentimentResult['sentiment'];
    if (score > 0.2) {
      sentiment = 'positive';
    } else if (score < -0.2) {
      sentiment = 'negative';
    } else if (foundWords.positive > 0 && foundWords.negative > 0) {
      sentiment = 'mixed';
    } else {
      sentiment = 'neutral';
    }

    // Calculate confidence based on word matches
    const matchCount = foundWords.positive + foundWords.negative;
    const confidence = Math.min(0.5 + (matchCount * 0.1), 0.98);

    // Detect emotions
    const emotions = this.detectEmotions(text);

    // Extract key phrases
    const keyPhrases = this.extractKeyPhrases(text, score);

    return {
      sentiment,
      score: Math.round(score * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      emotions,
      keyPhrases,
    };
  }

  /**
   * Detect emotions in text
   */
  private detectEmotions(text: string): Array<{ emotion: string; intensity: number }> {
    const lowerText = text.toLowerCase();
    const detectedEmotions: Array<{ emotion: string; intensity: number }> = [];

    for (const [emotion, config] of Object.entries(EMOTION_PATTERNS)) {
      let matchCount = 0;
      for (const word of config.words) {
        if (lowerText.includes(word)) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        const intensity = Math.min(config.intensity * (1 + matchCount * 0.1), 1.0);
        detectedEmotions.push({
          emotion,
          intensity: Math.round(intensity * 100) / 100,
        });
      }
    }

    // Sort by intensity and return top 3
    return detectedEmotions
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 3);
  }

  /**
   * Extract key phrases from text
   */
  private extractKeyPhrases(text: string, sentiment: number): string[] {
    const phrases: string[] = [];
    const lowerText = text.toLowerCase();

    // Extract sentiment-bearing phrases
    const patterns = [
      /(?:very|really|extremely)\s+(\w+)/gi,
      /(not|never)\s+(\w+)/gi,
      /(love|hate|like|dislike)\s+(?:the\s+)?(\w+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const phrase = match[0].toLowerCase();
        if (phrase.length > 3 && !phrases.includes(phrase)) {
          phrases.push(phrase);
        }
      }
    }

    // Extract multi-word sentiment phrases
    const multiWordPatterns = [
      /customer\s+service/gi,
      /tech(nical)?\s+support/gi,
      /money\s+back/gi,
      /speak\s+to\s+(a\s+)?manager/gi,
      /highly\s+recommend/gi,
    ];

    for (const pattern of multiWordPatterns) {
      let match;
      while ((match = pattern.exec(lowerText)) !== null) {
        if (!phrases.includes(match[0])) {
          phrases.push(match[0]);
        }
      }
    }

    return phrases.slice(0, 10);
  }

  /**
   * Get overall sentiment trend from array of scores
   */
  calculateTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 2) return 'stable';

    const recent = scores.slice(-3);
    const older = scores.slice(0, Math.max(0, scores.length - 3));

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }
}

export const sentimentAgent = new SentimentAgent();
