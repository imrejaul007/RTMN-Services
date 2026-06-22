import {
  SentimentResult,
  SentimentLabel,
  AspectSentiment,
  EntitySentiment,
  SentimentSummary,
  SentimentTrend,
  TopicSentiment,
  Review,
} from '../types/index.js';
import { reviewStore } from './reviewService.js';
import { historyService } from './historyService.js';

// Sentiment lexicons for basic analysis
const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
  'love', 'loved', 'best', 'perfect', 'outstanding', 'superb', 'brilliant',
  'exceptional', 'magnificent', 'delightful', 'pleasant', 'satisfied', 'happy',
  'recommend', 'recommended', 'helpful', 'friendly', 'professional', 'quality',
  'reliable', 'trustworthy', 'efficient', 'fast', 'quick', 'easy', 'smooth',
  'beautiful', 'clean', 'fresh', 'comfortable', 'affordable', 'value', 'worth',
  'impressive', 'incredible', 'remarkable', 'exceptional', 'positive', 'pleased',
  'satisfied', 'delighted', 'grateful', 'thankful', 'appreciate', 'appreciated',
  'awesome', 'cool', 'nice', 'decent', 'solid', 'impressive', 'outstanding',
  'superb', 'terrific', 'marvelous', 'splendid', 'fabulous', 'gorgeous', 'lovely',
  'acceptable', 'adequate', 'satisfactory', 'fine', 'good', 'fair', 'better',
  'improved', 'improving', 'enhanced', 'upgraded', 'resolved', 'fixed',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor', 'disappointing',
  'disappointed', 'disappointment', 'hate', 'hated', 'horrible', 'dreadful',
  'pathetic', 'useless', 'waste', 'wasted', 'broken', 'broken', 'damage',
  'damaged', 'scam', 'fraud', 'fake', 'lies', 'lying', 'dishonest', 'untrustworthy',
  'unreliable', 'slow', 'delayed', 'rude', 'unprofessional', 'incompetent',
  'frustrated', 'frustrating', 'annoying', 'annoyed', 'irritating', 'irritated',
  'difficult', 'hard', 'complicated', 'confusing', 'confused', 'misleading',
  'overpriced', 'expensive', 'cheap', 'inferior', 'low', 'worst', 'never',
  'avoid', 'warning', 'caution', 'problem', 'problems', 'issue', 'issues',
  'bug', 'bugs', 'error', 'errors', 'fail', 'failed', 'failure', 'crash',
  'crashed', 'refund', 'return', 'returned', 'complaint', 'complain', 'negative',
  'upset', 'angry', 'mad', 'furious', 'disgusted', 'disgusting', 'nasty',
  'terrible', 'dreadful', 'appalling', 'atrocious', 'abysmal', 'dire', 'grim',
]);

const INTENSIFIERS = new Set([
  'very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely',
  'really', 'highly', 'super', 'ultra', 'exceptionally', 'remarkably',
]);

const NEGATORS = new Set([
  'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', 'hardly',
  'barely', 'scarcely', 'seldom', 'rarely', 'dont', 'doesnt',
  'didnt', 'wont', 'wouldnt', 'couldnt', 'shouldnt', 'isnt', 'arent',
  'wasnt', 'werent', 'havent', 'hasnt', 'hadnt',
]);

// Aspect keywords mapping
const ASPECT_KEYWORDS: Record<string, string[]> = {
  quality: ['quality', 'build', 'material', 'craftsmanship', 'construction', 'design'],
  service: ['service', 'support', 'help', 'assist', 'response', 'staff', 'customer'],
  price: ['price', 'cost', 'value', 'money', 'worth', 'affordable', 'expensive', 'cheap'],
  delivery: ['delivery', 'shipping', 'arrived', 'shipped', 'package', 'delivery', 'fast', 'slow'],
  product: ['product', 'item', 'device', 'app', 'software', 'features', 'functionality'],
  experience: ['experience', 'overall', 'using', 'using', 'easy', 'simple', 'intuitive'],
};

export class SentimentService {
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const words = this.tokenize(text);
    let score = 0;
    let wordCount = 0;
    const keywords: string[] = [];
    let isNegated = false;
    let intensifier = 1;

    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();

      // Check for negators
      if (NEGATORS.has(word)) {
        isNegated = true;
        continue;
      }

      // Check for intensifiers
      if (INTENSIFIERS.has(word)) {
        intensifier = 1.5;
        continue;
      }

      // Score positive words
      if (POSITIVE_WORDS.has(word)) {
        const wordScore = isNegated ? -1 : 1;
        score += wordScore * intensifier;
        keywords.push(word);
        wordCount++;
      }

      // Score negative words
      if (NEGATIVE_WORDS.has(word)) {
        const wordScore = isNegated ? 1 : -1;
        score += wordScore * intensifier;
        keywords.push(word);
        wordCount++;
      }

      // Reset modifiers after a few words
      if (i > 0 && i % 3 === 0) {
        isNegated = false;
        intensifier = 1;
      }
    }

    // Normalize score to -1 to 1 range
    const normalizedScore = wordCount > 0
      ? Math.max(-1, Math.min(1, score / Math.max(wordCount, 1)))
      : 0;

    // Determine label
    let label: SentimentLabel;
    if (normalizedScore > 0.2) label = 'positive';
    else if (normalizedScore < -0.2) label = 'negative';
    else label = 'neutral';

    // Analyze aspects
    const aspects = await this.extractAspects(text, words);

    // Calculate confidence based on word count and keyword matches
    const confidence = Math.min(0.9, 0.3 + (keywords.length / 10) + (wordCount / 20));

    return {
      label,
      score: Math.round(normalizedScore * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      keywords: [...new Set(keywords)].slice(0, 10),
      aspects,
    };
  }

  async getEntitySentiment(entityId: string): Promise<EntitySentiment> {
    const reviews = reviewStore.getReviewsByEntity(entityId);

    if (reviews.length === 0) {
      return {
        entityId,
        overall: {
          overall: 'neutral',
          score: 0,
          positiveRatio: 0,
          negativeRatio: 0,
          neutralRatio: 0,
          trend: 'stable',
          periodComparison: { current: 0, previous: 0, change: 0, changePercent: 0 },
        },
        recent: [],
        trends: [],
        topics: [],
      };
    }

    // Analyze all reviews
    const sentiments = await Promise.all(
      reviews.map(r => this.analyzeSentiment(r.content))
    );

    // Calculate overall summary
    const positiveCount = sentiments.filter(s => s.label === 'positive').length;
    const negativeCount = sentiments.filter(s => s.label === 'negative').length;
    const neutralCount = sentiments.filter(s => s.label === 'neutral').length;
    const totalScore = sentiments.reduce((acc, s) => acc + s.score, 0);

    const overall: SentimentSummary = {
      overall: totalScore / reviews.length > 0.2 ? 'positive' : totalScore / reviews.length < -0.2 ? 'negative' : 'neutral',
      score: Math.round((totalScore / reviews.length) * 100) / 100,
      positiveRatio: Math.round((positiveCount / reviews.length) * 100) / 100,
      negativeRatio: Math.round((negativeCount / reviews.length) * 100) / 100,
      neutralRatio: Math.round((neutralCount / reviews.length) * 100) / 100,
      trend: 'stable',
      periodComparison: { current: 0, previous: 0, change: 0, changePercent: 0 },
    };

    // Get recent sentiments (last 10)
    const recent = sentiments.slice(0, 10);

    // Calculate trends
    const trends = this.calculateTrends(reviews, sentiments);

    // Extract topics
    const topics = this.extractTopics(reviews, sentiments);

    // Record sentiment history
    await historyService.recordMetric(entityId, 'sentiment', overall.score);

    return {
      entityId,
      overall,
      recent,
      trends,
      topics,
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private async extractAspects(text: string, words: string[]): Promise<AspectSentiment[]> {
    const aspects: AspectSentiment[] = [];
    const textLower = text.toLowerCase();

    for (const [aspect, keywords] of Object.entries(ASPECT_KEYWORDS)) {
      const mentions = words.filter(w => keywords.includes(w)).length;
      if (mentions > 0) {
        // Find sentences containing this aspect
        const sentences = textLower.split(/[.!?]+/);
        const aspectSentences = sentences.filter(s =>
          keywords.some(k => s.includes(k))
        );

        // Analyze sentiment of aspect-specific sentences
        const aspectText = aspectSentences.join(' ');
        const sentiment = aspectSentences.length > 0
          ? await this.analyzeSentiment(aspectText)
          : { label: 'neutral' as SentimentLabel, score: 0 };

        aspects.push({
          aspect,
          label: sentiment.label,
          score: sentiment.score,
          mentions,
        });
      }
    }

    return aspects;
  }

  private calculateTrends(reviews: Review[], sentiments: SentimentResult[]): SentimentTrend[] {
    if (reviews.length < 5) return [];

    const trends: SentimentTrend[] = [];
    const sortedReviews = [...reviews].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Group into periods (weekly)
    const periodSize = Math.max(1, Math.floor(reviews.length / 4));
    for (let i = 0; i < sortedReviews.length; i += periodSize) {
      const periodReviews = sortedReviews.slice(i, i + periodSize);
      const periodSentiments = sentiments.slice(i, i + periodSize);

      if (periodReviews.length > 0) {
        const avgScore = periodSentiments.reduce((acc, s) => acc + s.score, 0) / periodSentiments.length;
        const date = new Date(periodReviews[0].createdAt);

        trends.push({
          period: date.toISOString().split('T')[0],
          score: Math.round(avgScore * 100) / 100,
          volume: periodReviews.length,
        });
      }
    }

    return trends;
  }

  private extractTopics(reviews: Review[], sentiments: SentimentResult[]): TopicSentiment[] {
    // Extract most common keywords as topics
    const wordFrequency: Map<string, number> = new Map();
    const wordSentiments: Map<string, number[]> = new Map();

    reviews.forEach((review, index) => {
      const words = this.tokenize(review.content);
      const sentiment = sentiments[index];

      words.forEach(word => {
        if (word.length > 4 && !POSITIVE_WORDS.has(word) && !NEGATIVE_WORDS.has(word)) {
          wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
          if (!wordSentiments.has(word)) {
            wordSentiments.set(word, []);
          }
          wordSentiments.get(word)!.push(sentiment.score);
        }
      });
    });

    // Get top topics by frequency
    const topics: TopicSentiment[] = [];
    const sortedWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [word, volume] of sortedWords) {
      const scores = wordSentiments.get(word) || [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      topics.push({
        topic: word,
        sentiment: avgScore > 0.2 ? 'positive' : avgScore < -0.2 ? 'negative' : 'neutral',
        score: Math.round(avgScore * 100) / 100,
        volume,
        trend: 'stable',
      });
    }

    return topics;
  }

  async batchAnalyze(texts: string[]): Promise<SentimentResult[]> {
    return Promise.all(texts.map(text => this.analyzeSentiment(text)));
  }
}

export const sentimentService = new SentimentService();
