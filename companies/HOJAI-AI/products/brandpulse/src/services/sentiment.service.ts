// @ts-ignore - sentiment module has no types
import Sentiment from 'sentiment';
import axios from 'axios';

// ============================================================================
// SENTIMENT ANALYSIS SERVICE
// ============================================================================

export interface SentimentResult {
  score: number;              // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;         // 0 to 1
  aspects: {
    name: string;
    score: number;
    mentions: number;
  }[];
  keywords: string[];
  comparative: number;
  positiveWords: string[];
  negativeWords: string[];
}

export interface AspectConfig {
  name: string;
  keywords: string[];
  positiveKeywords: string[];
  negativeKeywords: string[];
}

// Default aspect configurations
const DEFAULT_ASPECTS: AspectConfig[] = [
  {
    name: 'service',
    keywords: ['service', 'staff', 'help', 'support', 'assist', 'waiter', 'server', 'employee'],
    positiveKeywords: ['friendly', 'helpful', 'attentive', 'professional', 'great service', 'excellent service'],
    negativeKeywords: ['rude', 'slow', 'bad service', 'poor service', 'terrible service', 'waited too long']
  },
  {
    name: 'food',
    keywords: ['food', 'meal', 'dish', 'menu', 'eat', 'taste', 'flavor', 'fresh', 'delicious'],
    positiveKeywords: ['delicious', 'tasty', 'fresh', 'amazing food', 'great food', 'excellent'],
    negativeKeywords: ['cold', 'bad', 'terrible', 'gross', 'spoiled', 'tasteless']
  },
  {
    name: 'ambiance',
    keywords: ['ambiance', 'atmosphere', 'environment', 'decor', 'music', 'lighting', 'vibe', 'mood'],
    positiveKeywords: ['beautiful', 'cozy', 'nice ambiance', 'great atmosphere', 'lovely'],
    negativeKeywords: ['dirty', 'noisy', 'loud', 'crowded', 'uncomfortable']
  },
  {
    name: 'value',
    keywords: ['price', 'value', 'cost', 'worth', 'money', 'expensive', 'cheap', 'affordable'],
    positiveKeywords: ['worth it', 'good value', 'affordable', 'reasonable', 'fair price'],
    negativeKeywords: ['overpriced', 'expensive', 'too costly', 'not worth']
  },
  {
    name: 'cleanliness',
    keywords: ['clean', 'dirty', 'hygiene', 'bathroom', 'restroom', 'tidy', 'sanitary'],
    positiveKeywords: ['clean', 'spotless', 'tidy', 'hygienic', 'well maintained'],
    negativeKeywords: ['dirty', 'filthy', 'gross', 'unclean', 'smelly']
  },
  {
    name: 'location',
    keywords: ['location', 'parking', 'easy', 'convenient', 'access', 'near', 'far'],
    positiveKeywords: ['easy parking', 'convenient', 'great location', 'accessible'],
    negativeKeywords: ['hard to find', 'no parking', 'far', 'inconvenient']
  }
];

export class SentimentService {
  private analyzer: Sentiment;
  private openaiClient: any;
  private aspects: AspectConfig[];

  constructor() {
    this.analyzer = new Sentiment();
    this.aspects = DEFAULT_ASPECTS;

    // Initialize OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyze(text: string): Promise<SentimentResult> {
    if (!text || text.trim().length === 0) {
      return this.getNeutralResult();
    }

    // Use AFINN-based analysis
    const afinnResult = this.analyzer.analyze(text);

    // Calculate normalized score (-1 to 1)
    const score = afinnResult.comparative;

    // Determine label based on score
    let label: 'positive' | 'neutral' | 'negative';
    if (score > 0.1) {
      label = 'positive';
    } else if (score < -0.1) {
      label = 'negative';
    } else {
      label = 'neutral';
    }

    // Calculate confidence based on word count and sentiment strength
    const wordCount = text.split(/\s+/).length;
    const confidence = Math.min(1, (afinnResult.positive.length + afinnResult.negative.length) / Math.max(10, wordCount));

    // Extract aspects
    const aspects = this.extractAspects(text, afinnResult);

    // Extract keywords
    const keywords = this.extractKeywords(text, afinnResult);

    return {
      score: Math.max(-1, Math.min(1, score)),
      label,
      confidence: Math.max(0, Math.min(1, confidence)),
      aspects,
      keywords,
      comparative: afinnResult.comparative,
      positiveWords: afinnResult.positive,
      negativeWords: afinnResult.negative
    };
  }

  /**
   * Advanced sentiment analysis using OpenAI
   */
  async analyzeWithAI(text: string): Promise<SentimentResult> {
    if (!this.openaiClient) {
      console.warn('[Sentiment] OpenAI not configured, using fallback');
      return this.analyze(text);
    }

    try {
      const response = await this.openaiClient.post('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `You are a sentiment analysis expert. Analyze the following text and return a JSON object with:
- score: number from -1 (very negative) to 1 (very positive)
- label: "positive", "neutral", or "negative"
- confidence: number from 0 to 1
- aspects: array of {name, score, mentions} for service, food, ambiance, value, cleanliness, location
- keywords: array of important sentiment words
- positiveWords: array of positive words found
- negativeWords: array of negative words found

Only return the JSON object, no explanation.`
        }, {
          role: 'user',
          content: text
        }],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.data.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          score: parsed.score,
          label: parsed.label,
          confidence: parsed.confidence,
          aspects: parsed.aspects || [],
          keywords: parsed.keywords || [],
          comparative: parsed.score,
          positiveWords: parsed.positiveWords || [],
          negativeWords: parsed.negativeWords || []
        };
      }
    } catch (error) {
      console.error('[Sentiment] OpenAI analysis failed:', error);
    }

    // Fallback to standard analysis
    return this.analyze(text);
  }

  /**
   * Extract aspects from text
   */
  private extractAspects(text: string, afinnResult: any): SentimentResult['aspects'] {
    const lowerText = text.toLowerCase();
    const results: SentimentResult['aspects'] = [];

    for (const aspect of this.aspects) {
      let mentions = 0;
      let totalScore = 0;

      // Check for aspect keywords
      for (const keyword of aspect.keywords) {
        if (lowerText.includes(keyword)) {
          mentions++;
        }
      }

      // Check for positive/negative modifiers
      for (const keyword of aspect.positiveKeywords) {
        if (lowerText.includes(keyword)) {
          totalScore += 0.5;
          mentions++;
        }
      }

      for (const keyword of aspect.negativeKeywords) {
        if (lowerText.includes(keyword)) {
          totalScore -= 0.5;
          mentions++;
        }
      }

      if (mentions > 0) {
        results.push({
          name: aspect.name,
          score: totalScore / mentions,
          mentions
        });
      }
    }

    return results;
  }

  /**
   * Extract important keywords
   */
  private extractKeywords(text: string, afinnResult: any): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const significantWords = words.filter(word => {
      return word.length > 3 &&
        !this.isStopWord(word) &&
        (afinnResult.positive.includes(word) ||
          afinnResult.negative.includes(word) ||
          /^[A-Z]/.test(word));
    });

    return [...new Set(significantWords)].slice(0, 20);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
      'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Get neutral result
   */
  private getNeutralResult(): SentimentResult {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0,
      aspects: [],
      keywords: [],
      comparative: 0,
      positiveWords: [],
      negativeWords: []
    };
  }

  /**
   * Calculate brand sentiment score from reviews
   */
  async calculateBrandScore(reviews: { sentiment?: { score: number } }[]): Promise<{
    score: number;
    positivePercent: number;
    neutralPercent: number;
    negativePercent: number;
  }> {
    if (reviews.length === 0) {
      return { score: 0, positivePercent: 0, neutralPercent: 0, negativePercent: 0 };
    }

    let totalScore = 0;
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    for (const review of reviews) {
      const score = review.sentiment?.score || 0;
      totalScore += score;

      if (score > 0.1) positive++;
      else if (score < -0.1) negative++;
      else neutral++;
    }

    const count = reviews.length;
    return {
      score: totalScore / count,
      positivePercent: (positive / count) * 100,
      neutralPercent: (neutral / count) * 100,
      negativePercent: (negative / count) * 100
    };
  }

  /**
   * Detect sentiment trend
   */
  detectTrend(scores: number[]): {
    direction: 'improving' | 'declining' | 'stable';
    change: number;
    percentChange: number;
  } {
    if (scores.length < 2) {
      return { direction: 'stable', change: 0, percentChange: 0 };
    }

    const recent = scores.slice(-7); // Last 7 data points
    const older = scores.slice(-14, -7);

    if (older.length === 0) {
      return { direction: 'stable', change: 0, percentChange: 0 };
    }

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = recentAvg - olderAvg;
    const percentChange = olderAvg !== 0 ? (change / olderAvg) * 100 : 0;

    let direction: 'improving' | 'declining' | 'stable';
    if (change > 0.1) {
      direction = 'improving';
    } else if (change < -0.1) {
      direction = 'declining';
    } else {
      direction = 'stable';
    }

    return { direction, change, percentChange };
  }
}

export const sentimentService = new SentimentService();
