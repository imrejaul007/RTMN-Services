import Sentiment from 'sentiment';
import natural from 'natural';

interface SentimentResult {
  score: number;
  comparative: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords: string[];
  highlights?: string[];
}

export class SentimentAnalysisService {
  private sentiment: Sentiment;
  private tokenizer: natural.WordTokenizer;
  private TfIdf: typeof natural.TfIdf;
  private positiveWords: Set<string>;
  private negativeWords: Set<string>;

  constructor() {
    this.sentiment = new Sentiment();
    this.tokenizer = new natural.WordTokenizer();
    this.TfIdf = natural.TfIdf;

    // Initialize lexicons (common brand-related terms)
    this.positiveWords = new Set([
      'love', 'amazing', 'excellent', 'great', 'best', 'awesome', 'fantastic',
      'wonderful', 'perfect', 'brilliant', 'outstanding', 'superb', 'recommend',
      'happy', 'satisfied', 'impressed', 'quality', 'innovative', 'reliable',
      'friendly', 'professional', 'helpful', 'efficient', 'fast', 'easy'
    ]);

    this.negativeWords = new Set([
      'hate', 'terrible', 'awful', 'worst', 'horrible', 'disgusting', 'disappointing',
      'frustrated', 'angry', 'annoyed', 'poor', 'slow', 'broken', 'useless',
      'waste', 'scam', 'fraud', 'fake', 'complaint', 'problem', 'issue',
      'bug', 'crash', 'fail', 'refuse', 'cancel', 'terrible', 'never'
    ]);
  }

  async analyzeText(text: string, language: string = 'en'): Promise<SentimentResult> {
    if (!text || text.trim().length === 0) {
      return {
        score: 0,
        comparative: 0,
        label: 'neutral',
        confidence: 0,
        keywords: []
      };
    }

    // Use the sentiment library for base analysis
    const result = this.sentiment.analyze(text);

    // Calculate additional metrics
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const positiveMatches = tokens.filter(t => this.positiveWords.has(t)).length;
    const negativeMatches = tokens.filter(t => this.negativeWords.has(t)).length;

    // Extract keywords using TF-IDF style approach
    const wordFreq = new Map<string, number>();
    for (const token of tokens) {
      if (token.length > 3) {
        wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
      }
    }

    const keywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Determine label based on score
    let label: 'positive' | 'neutral' | 'negative';
    const threshold = parseFloat(process.env.SENTIMENT_THRESHOLD_NEGATIVE || '-0.3');
    const posThreshold = parseFloat(process.env.SENTIMENT_THRESHOLD_POSITIVE || '0.3');

    if (result.comparative > posThreshold) {
      label = 'positive';
    } else if (result.comparative < threshold) {
      label = 'negative';
    } else {
      label = 'neutral';
    }

    // Calculate confidence (0-1)
    // Higher confidence when sentiment is clear (many matches) and score is polarized
    const totalMatches = positiveMatches + negativeMatches;
    const scoreRange = Math.abs(result.comparative);
    const confidence = Math.min(1, (totalMatches * 0.1 + scoreRange) / 1.5);

    // Extract highlights (intense emotional phrases)
    const highlights = this.extractHighlights(text, label);

    return {
      score: result.comparative,
      comparative: result.comparative,
      label,
      confidence: Math.round(confidence * 100) / 100,
      keywords,
      highlights
    };
  }

  private extractHighlights(text: string, sentiment: 'positive' | 'neutral' | 'negative'): string[] {
    const highlights: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    const targetWords = sentiment === 'positive' ? this.positiveWords :
                         sentiment === 'negative' ? this.negativeWords :
                         new Set();

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      let matchCount = 0;

      for (const word of targetWords) {
        if (lowerSentence.includes(word)) {
          matchCount++;
        }
      }

      if (matchCount >= 2) {
        highlights.push(sentence.trim());
      }
    }

    return highlights.slice(0, 3);
  }

  async analyzeBatch(texts: string[], language: string = 'en'): Promise<SentimentResult[]> {
    return Promise.all(texts.map(text => this.analyzeText(text, language)));
  }

  // Calculate sentiment trend over time
  calculateTrend(scores: number[]): {
    direction: 'improving' | 'declining' | 'stable';
    changePercent: number;
    velocity: number;
  } {
    if (scores.length < 2) {
      return { direction: 'stable', changePercent: 0, velocity: 0 };
    }

    const halfIndex = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, halfIndex);
    const secondHalf = scores.slice(halfIndex);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const changePercent = firstAvg !== 0 ? ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0;

    // Calculate velocity (rate of change)
    const differences: number[] = [];
    for (let i = 1; i < scores.length; i++) {
      differences.push(scores[i] - scores[i - 1]);
    }
    const velocity = differences.reduce((a, b) => a + b, 0) / differences.length;

    let direction: 'improving' | 'declining' | 'stable';
    if (changePercent > 10) {
      direction = 'improving';
    } else if (changePercent < -10) {
      direction = 'declining';
    } else {
      direction = 'stable';
    }

    return {
      direction,
      changePercent: Math.round(changePercent * 100) / 100,
      velocity: Math.round(velocity * 100) / 100
    };
  }

  // Get aspect-based sentiment (e.g., sentiment about "service", "product", "price")
  async analyzeAspects(text: string, aspects: string[]): Promise<Record<string, SentimentResult>> {
    const results: Record<string, SentimentResult> = {};
    const sentences = text.split(/[.!?]+/);

    for (const aspect of aspects) {
      const aspectSentences = sentences.filter(s =>
        s.toLowerCase().includes(aspect.toLowerCase())
      );

      if (aspectSentences.length > 0) {
        results[aspect] = await this.analyzeText(aspectSentences.join('. '));
      } else {
        results[aspect] = {
          score: 0,
          comparative: 0,
          label: 'neutral',
          confidence: 0,
          keywords: []
        };
      }
    }

    return results;
  }
}
