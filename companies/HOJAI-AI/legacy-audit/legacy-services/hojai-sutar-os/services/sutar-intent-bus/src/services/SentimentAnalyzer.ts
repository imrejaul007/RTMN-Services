// ============================================================================
// Sentiment Analysis Service - Intent sentiment
// ============================================================================

import { Intent } from '../index';

export interface SentimentResult {
  sentiment: SentimentLabel;
  score: number;
  confidence: number;
  aspects: AspectSentiment[];
  emotions: EmotionScore[];
  intensity: IntensityLevel;
  subjectivity: SubjectivityLevel;
  keyPhrases: string[];
  comparativeScore?: number;
}

export type SentimentLabel = 'positive' | 'negative' | 'neutral' | 'mixed';
export type IntensityLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type SubjectivityLevel = 'objective' | 'somewhat_subjective' | 'subjective';

export interface AspectSentiment {
  aspect: string;
  sentiment: SentimentLabel;
  score: number;
  mentions: number;
}

export interface EmotionScore {
  emotion: Emotion;
  score: number;
  indicators: string[];
}

export type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'anticipation' | 'trust' | 'gratitude' | 'frustration';

interface SentimentWord {
  word: string;
  sentiment: 1 | -1 | 0;
  intensity?: number;
  emotion?: Emotion;
}

const POSITIVE_WORDS: SentimentWord[] = [
  { word: 'good', sentiment: 1, intensity: 0.5 },
  { word: 'great', sentiment: 1, intensity: 0.8 },
  { word: 'excellent', sentiment: 1, intensity: 1.0 },
  { word: 'amazing', sentiment: 1, intensity: 1.0, emotion: 'joy' },
  { word: 'wonderful', sentiment: 1, intensity: 1.0, emotion: 'joy' },
  { word: 'fantastic', sentiment: 1, intensity: 1.0, emotion: 'joy' },
  { word: 'love', sentiment: 1, intensity: 0.9, emotion: 'joy' },
  { word: 'like', sentiment: 1, intensity: 0.5 },
  { word: 'happy', sentiment: 1, intensity: 0.8, emotion: 'joy' },
  { word: 'pleased', sentiment: 1, intensity: 0.6 },
  { word: 'satisfied', sentiment: 1, intensity: 0.6 },
  { word: 'perfect', sentiment: 1, intensity: 1.0 },
  { word: 'best', sentiment: 1, intensity: 0.9 },
  { word: 'awesome', sentiment: 1, intensity: 0.9, emotion: 'joy' },
  { word: 'beautiful', sentiment: 1, intensity: 0.8 },
  { word: 'nice', sentiment: 1, intensity: 0.4 },
  { word: 'helpful', sentiment: 1, intensity: 0.6, emotion: 'trust' },
  { word: 'friendly', sentiment: 1, intensity: 0.5, emotion: 'trust' },
  { word: 'quick', sentiment: 1, intensity: 0.5 },
  { word: 'fast', sentiment: 1, intensity: 0.5 },
  { word: 'easy', sentiment: 1, intensity: 0.6 },
  { word: 'recommend', sentiment: 1, intensity: 0.7, emotion: 'trust' },
  { word: 'thanks', sentiment: 1, intensity: 0.6, emotion: 'gratitude' },
  { word: 'thank', sentiment: 1, intensity: 0.6, emotion: 'gratitude' },
  { word: 'appreciate', sentiment: 1, intensity: 0.7, emotion: 'gratitude' },
  { word: 'excited', sentiment: 1, intensity: 0.8, emotion: 'anticipation' },
  { word: 'impressed', sentiment: 1, intensity: 0.7 },
  { word: 'quality', sentiment: 1, intensity: 0.6 },
  { word: 'value', sentiment: 1, intensity: 0.5 },
  { word: 'deal', sentiment: 1, intensity: 0.5, emotion: 'anticipation' },
  { word: 'discount', sentiment: 1, intensity: 0.6, emotion: 'anticipation' },
  { word: 'save', sentiment: 1, intensity: 0.5 },
  { word: 'free', sentiment: 1, intensity: 0.7 },
  { word: 'promotion', sentiment: 1, intensity: 0.5, emotion: 'anticipation' },
  { word: 'sale', sentiment: 1, intensity: 0.5, emotion: 'anticipation' }
];

const NEGATIVE_WORDS: SentimentWord[] = [
  { word: 'bad', sentiment: -1, intensity: 0.5 },
  { word: 'terrible', sentiment: -1, intensity: 1.0, emotion: 'anger' },
  { word: 'awful', sentiment: -1, intensity: 1.0, emotion: 'disgust' },
  { word: 'horrible', sentiment: -1, intensity: 1.0, emotion: 'fear' },
  { word: 'hate', sentiment: -1, intensity: 0.9, emotion: 'anger' },
  { word: 'dislike', sentiment: -1, intensity: 0.6 },
  { word: 'sad', sentiment: -1, intensity: 0.7, emotion: 'sadness' },
  { word: 'angry', sentiment: -1, intensity: 0.8, emotion: 'anger' },
  { word: 'frustrated', sentiment: -1, intensity: 0.8, emotion: 'anger' },
  { word: 'disappointed', sentiment: -1, intensity: 0.7, emotion: 'sadness' },
  { word: 'upset', sentiment: -1, intensity: 0.7, emotion: 'anger' },
  { word: 'annoyed', sentiment: -1, intensity: 0.6, emotion: 'anger' },
  { word: 'poor', sentiment: -1, intensity: 0.6 },
  { word: 'worst', sentiment: -1, intensity: 0.9 },
  { word: 'slow', sentiment: -1, intensity: 0.5 },
  { word: 'broken', sentiment: -1, intensity: 0.7 },
  { word: 'damaged', sentiment: -1, intensity: 0.7 },
  { word: 'defective', sentiment: -1, intensity: 0.8 },
  { word: 'useless', sentiment: -1, intensity: 0.8, emotion: 'disgust' },
  { word: 'waste', sentiment: -1, intensity: 0.7, emotion: 'disgust' },
  { word: 'expensive', sentiment: -1, intensity: 0.5 },
  { word: 'overpriced', sentiment: -1, intensity: 0.6 },
  { word: 'scam', sentiment: -1, intensity: 1.0, emotion: 'anger' },
  { word: 'fraud', sentiment: -1, intensity: 1.0, emotion: 'anger' },
  { word: 'problem', sentiment: -1, intensity: 0.6, emotion: 'frustration' },
  { word: 'issue', sentiment: -1, intensity: 0.5 },
  { word: 'error', sentiment: -1, intensity: 0.6 },
  { word: 'bug', sentiment: -1, intensity: 0.6 },
  { word: 'crash', sentiment: -1, intensity: 0.7 },
  { word: 'fail', sentiment: -1, intensity: 0.7 },
  { word: 'failed', sentiment: -1, intensity: 0.7 },
  { word: 'wrong', sentiment: -1, intensity: 0.6 },
  { word: 'unacceptable', sentiment: -1, intensity: 0.9, emotion: 'anger' },
  { word: 'refund', sentiment: -1, intensity: 0.5 },
  { word: 'return', sentiment: -1, intensity: 0.5 },
  { word: 'cancel', sentiment: -1, intensity: 0.5 },
  { word: 'complaint', sentiment: -1, intensity: 0.7, emotion: 'anger' }
];

const INTENSIFIERS = ['very', 'really', 'extremely', 'absolutely', 'completely', 'totally', 'highly', 'incredibly'];
const NEGATORS = ['not', "n't", 'no', 'never', 'neither', 'without', 'none', 'hardly', 'barely'];
const QUESTION_WORDS = ['what', 'which', 'who', 'where', 'when', 'why', 'how', 'can', 'could', 'would'];

export class SentimentAnalyzer {
  private positiveWords: Map<string, SentimentWord>;
  private negativeWords: Map<string, SentimentWord>;
  private intensifiers: Set<string>;
  private negators: Set<string>;
  private emotionKeywords: Map<Emotion, string[]>;

  constructor() {
    this.positiveWords = new Map();
    this.negativeWords = new Map();
    this.intensifiers = new Set(INTENSIFIERS);
    this.negators = new Set(NEGATORS);
    this.emotionKeywords = new Map();

    // Initialize sentiment words
    POSITIVE_WORDS.forEach(w => this.positiveWords.set(w.word, w));
    NEGATIVE_WORDS.forEach(w => this.negativeWords.set(w.word, w));

    // Initialize emotion keywords
    this.emotionKeywords.set('joy', ['happy', 'joy', 'delighted', 'pleased', 'glad', 'cheerful', 'excited']);
    this.emotionKeywords.set('sadness', ['sad', 'unhappy', 'disappointed', 'depressed', 'miserable', 'gloomy']);
    this.emotionKeywords.set('anger', ['angry', 'furious', 'annoyed', 'irritated', 'frustrated', 'mad']);
    this.emotionKeywords.set('fear', ['afraid', 'scared', 'worried', 'anxious', 'nervous', 'terrified']);
    this.emotionKeywords.set('surprise', ['surprised', 'amazed', 'astonished', 'shocked', 'unexpected']);
    this.emotionKeywords.set('disgust', ['disgusted', 'revolted', 'repulsed', 'sickened', 'nauseated']);
    this.emotionKeywords.set('anticipation', ['excited', 'eager', 'hopeful', 'expecting', 'looking forward']);
    this.emotionKeywords.set('trust', ['trust', 'rely', 'confident', 'believe', 'assured', 'certain']);
  }

  /**
   * Analyze sentiment of text
   */
  analyze(text: string, intent?: Intent): SentimentResult {
    const normalizedText = this.normalizeText(text);
    const words = normalizedText.split(/\s+/);

    // Calculate sentiment score
    const { score, wordScores } = this.calculateSentimentScore(words);

    // Determine sentiment label
    const sentiment = this.determineSentimentLabel(score);

    // Calculate confidence
    const confidence = this.calculateConfidence(wordScores, words.length);

    // Extract aspects
    const aspects = this.extractAspectSentiments(text, wordScores);

    // Detect emotions
    const emotions = this.detectEmotions(normalizedText);

    // Determine intensity
    const intensity = this.determineIntensity(wordScores, words);

    // Determine subjectivity
    const subjectivity = this.determineSubjectivity(wordScores, words);

    // Extract key phrases
    const keyPhrases = this.extractKeyPhrases(normalizedText, wordScores);

    return {
      sentiment,
      score,
      confidence,
      aspects,
      emotions,
      intensity,
      subjectivity,
      keyPhrases
    };
  }

  /**
   * Analyze sentiment for an intent
   */
  analyzeIntent(intent: Intent): SentimentResult {
    return this.analyze(intent.intent, intent);
  }

  /**
   * Batch analyze sentiments
   */
  batchAnalyze(texts: string[]): SentimentResult[] {
    return texts.map(text => this.analyze(text));
  }

  /**
   * Compare sentiments between two texts
   */
  compareSentiments(text1: string, text2: string): number {
    const result1 = this.analyze(text1);
    const result2 = this.analyze(text2);
    return result1.score - result2.score;
  }

  /**
   * Get sentiment trend over time
   */
  getSentimentTrend(results: SentimentResult[]): {
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
    recentAverage: number;
    olderAverage: number;
  } {
    if (results.length === 0) {
      return { averageScore: 0, trend: 'stable', recentAverage: 0, olderAverage: 0 };
    }

    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const midpoint = Math.floor(results.length / 2);

    const recentResults = results.slice(midpoint);
    const olderResults = results.slice(0, midpoint);

    const recentAverage = recentResults.reduce((sum, r) => sum + r.score, 0) / Math.max(recentResults.length, 1);
    const olderAverage = olderResults.reduce((sum, r) => sum + r.score, 0) / Math.max(olderResults.length, 1);

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAverage > olderAverage * 1.1) trend = 'improving';
    else if (recentAverage < olderAverage * 0.9) trend = 'declining';

    return { averageScore, trend, recentAverage, olderAverage };
  }

  // Private helper methods

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateSentimentScore(words: string[]): { score: number; wordScores: Array<{ word: string; score: number }> } {
    let totalScore = 0;
    let negationActive = false;
    let intensifierActive = false;
    let intensifierMultiplier = 1;
    const wordScores: Array<{ word: string; score: number }> = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Check for negators
      if (this.negators.has(word)) {
        negationActive = true;
        continue;
      }

      // Check for intensifiers
      if (this.intensifiers.has(word)) {
        intensifierActive = true;
        intensifierMultiplier = 1.5;
        continue;
      }

      // Check positive words
      const positiveWord = this.positiveWords.get(word);
      if (positiveWord) {
        let score = positiveWord.sentiment * (positiveWord.intensity || 0.5);
        if (intensifierActive) score *= intensifierMultiplier;
        if (negationActive) score = -score;

        totalScore += score;
        wordScores.push({ word, score });
        negationActive = false;
        intensifierActive = false;
        intensifierMultiplier = 1;
        continue;
      }

      // Check negative words
      const negativeWord = this.negativeWords.get(word);
      if (negativeWord) {
        let score = negativeWord.sentiment * (negativeWord.intensity || 0.5);
        if (intensifierActive) score *= intensifierMultiplier;
        if (negationActive) score = -score;

        totalScore += score;
        wordScores.push({ word, score });
        negationActive = false;
        intensifierActive = false;
        intensifierMultiplier = 1;
        continue;
      }

      // Reset modifiers if we've moved past them
      if (intensifierActive && i > 0) {
        intensifierActive = false;
        intensifierMultiplier = 1;
      }
    }

    // Normalize score to -1 to 1 range
    const normalizedScore = Math.max(-1, Math.min(1, totalScore / Math.max(words.length, 1) * 2));

    return { score: normalizedScore, wordScores };
  }

  private determineSentimentLabel(score: number): SentimentLabel {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    if (score > -0.2 && score < 0.2) return 'neutral';
    return 'mixed';
  }

  private calculateConfidence(wordScores: Array<{ word: string; score: number }>, totalWords: number): number {
    if (wordScores.length === 0) return 0.3;

    // Higher confidence if we have more sentiment-bearing words
    const coverage = wordScores.length / totalWords;

    // Higher confidence if scores are consistent
    const avgMagnitude = wordScores.reduce((sum, ws) => sum + Math.abs(ws.score), 0) / wordScores.length;

    return Math.min(0.95, Math.max(0.3, coverage * 0.5 + avgMagnitude * 0.5));
  }

  private extractAspectSentiments(text: string, wordScores: Array<{ word: string; score: number }>): AspectSentiment[] {
    const aspects: Map<string, AspectSentiment> = new Map();

    // Define aspect keywords
    const aspectKeywords: Record<string, string[]> = {
      'product': ['product', 'item', 'quality', 'item'],
      'service': ['service', 'support', 'help', 'assistant'],
      'price': ['price', 'cost', 'value', 'money', 'affordable'],
      'delivery': ['delivery', 'shipping', 'arrived', 'fast'],
      'experience': ['experience', 'using', 'easy', 'simple'],
      'communication': ['communication', 'response', 'reply', 'contact']
    };

    // Extract aspects
    for (const [aspect, keywords] of Object.entries(aspectKeywords)) {
      const aspectWordScores = wordScores.filter(ws =>
        keywords.some(kw => ws.word.includes(kw))
      );

      if (aspectWordScores.length > 0) {
        const avgScore = aspectWordScores.reduce((sum, ws) => sum + ws.score, 0) / aspectWordScores.length;
        aspects.set(aspect, {
          aspect,
          sentiment: this.determineSentimentLabel(avgScore),
          score: avgScore,
          mentions: aspectWordScores.length
        });
      }
    }

    return Array.from(aspects.values());
  }

  private detectEmotions(text: string): EmotionScore[] {
    const emotionScores: EmotionScore[] = [];

    this.emotionKeywords.forEach((keywords, emotion) => {
      const indicators: string[] = [];
      let score = 0;

      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          indicators.push(keyword);
          score += 0.3;
        }
      }

      if (indicators.length > 0) {
        emotionScores.push({
          emotion,
          score: Math.min(1, score),
          indicators
        });
      }
    });

    return emotionScores.sort((a, b) => b.score - a.score);
  }

  private determineIntensity(wordScores: Array<{ word: string; score: number }>, words: string[]): IntensityLevel {
    if (wordScores.length === 0) return 'very_low';

    const avgMagnitude = wordScores.reduce((sum, ws) => sum + Math.abs(ws.score), 0) / wordScores.length;
    const coverage = wordScores.length / words.length;

    // Check for intensifiers
    const hasIntensifier = words.some(w => this.intensifiers.has(w));

    let intensity: IntensityLevel = 'very_low';
    if (avgMagnitude > 0.7 && coverage > 0.3) intensity = 'very_high';
    else if (avgMagnitude > 0.5 && coverage > 0.2) intensity = 'high';
    else if (avgMagnitude > 0.3 && coverage > 0.1) intensity = 'medium';
    else if (avgMagnitude > 0.1) intensity = 'low';

    if (hasIntensifier && intensity !== 'very_high') {
      const nextLevel: Record<IntensityLevel, IntensityLevel> = {
        'very_low': 'low',
        'low': 'medium',
        'medium': 'high',
        'high': 'very_high',
        'very_high': 'very_high'
      };
      intensity = nextLevel[intensity];
    }

    return intensity;
  }

  private determineSubjectivity(wordScores: Array<{ word: string; score: number }>, words: string[]): SubjectivityLevel {
    if (wordScores.length === 0) return 'objective';

    const coverage = wordScores.length / words.length;

    if (coverage < 0.05) return 'objective';
    if (coverage < 0.15) return 'somewhat_subjective';
    return 'subjective';
  }

  private extractKeyPhrases(text: string, wordScores: Array<{ word: string; score: number }>): string[] {
    const keyPhrases: string[] = [];

    // Get top sentiment words
    const sortedScores = [...wordScores].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
    const topWords = sortedScores.slice(0, 5);

    for (const ws of topWords) {
      if (Math.abs(ws.score) > 0.3) {
        keyPhrases.push(ws.word);
      }
    }

    return keyPhrases;
  }
}

// Export singleton instance
export const sentimentAnalyzer = new SentimentAnalyzer();
