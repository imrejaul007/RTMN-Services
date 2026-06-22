import { v4 as uuidv4 } from 'uuid';
import {
  ReviewRequest,
  ReviewResponse,
  Review,
  ReviewAnalysis,
} from '../types';

/**
 * Review Management Service
 * Analyzes reviews, generates response suggestions, and creates review strategies
 */
export class ReviewManagerService {
  private readonly SENTIMENT_WEIGHTS = {
    positive: 1.0,
    neutral: 0.5,
    negative: 0.0,
  };

  /**
   * Analyze reviews and generate management strategy
   */
  async analyze(request: ReviewRequest): Promise<ReviewResponse> {
    // Analyze sentiment if not provided
    const processedReviews = this.processReviews(request.reviews);

    // Generate analysis
    const analysis = this.generateAnalysis(processedReviews, request.competitorRatings);

    // Generate response suggestions
    const responseSuggestions = this.generateResponseSuggestions(
      processedReviews,
      request.responseTemplates
    );

    // Generate strategy
    const strategy = this.generateStrategy(analysis);

    // Generate campaigns
    const campaigns = this.generateCampaigns(analysis, request.platform);

    // Generate automation rules
    const automation = this.generateAutomation(processedReviews);

    return {
      analysis,
      responseSuggestions,
      strategy,
      campaigns,
      automation,
    };
  }

  /**
   * Process and analyze reviews for sentiment
   */
  private processReviews(reviews: Omit<Review, 'id'>[]): Review[] {
    return reviews.map(r => ({
      ...r,
      id: uuidv4(),
      sentiment: r.sentiment || this.detectSentiment(r.text),
      categories: r.categories || this.extractCategories(r.text),
    }));
  }

  /**
   * Simple sentiment detection based on keywords
   */
  private detectSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['amazing', 'excellent', 'great', 'love', 'best', 'perfect', 'delicious', 'fantastic', 'wonderful', 'outstanding', 'recommend', 'fresh', 'tasty', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'horrible', 'disgusting', 'cold', 'slow', 'rude', 'expensive', 'dirty', 'overpriced', 'never', 'disappointed', 'mediocre'];

    const lowerText = text.toLowerCase();
    let score = 0;

    for (const word of positiveWords) {
      if (lowerText.includes(word)) score += 1;
    }
    for (const word of negativeWords) {
      if (lowerText.includes(word)) score -= 1;
    }

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Extract category mentions from review text
   */
  private extractCategories(text: string): string[] {
    const categories: string[] = [];
    const lowerText = text.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
      food: ['food', 'taste', 'flavor', 'dish', 'meal', 'menu', 'portion', 'fresh', 'delicious'],
      service: ['service', 'staff', 'server', 'waiter', 'attentive', 'rude', 'friendly', 'slow'],
      ambiance: ['ambiance', 'atmosphere', 'decor', 'music', 'lighting', 'clean', 'comfortable'],
      value: ['value', 'price', 'expensive', 'cheap', 'worth', 'money', 'affordable', 'overpriced'],
      hygiene: ['hygiene', 'clean', 'dirty', 'sanitary', 'germs', 'restroom', 'bathroom'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => lowerText.includes(k))) {
        categories.push(category);
      }
    }

    return categories.length > 0 ? categories : ['general'];
  }

  /**
   * Generate comprehensive review analysis
   */
  private generateAnalysis(
    reviews: Review[],
    competitorRatings?: { name: string; rating: number }[]
  ): ReviewAnalysis {
    // Calculate overall rating
    const overallRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    // Rating distribution
    const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
      const count = reviews.filter(r => Math.round(r.rating) === stars).length;
      return {
        stars,
        count,
        percent: reviews.length > 0 ? (count / reviews.length) * 100 : 0,
      };
    });

    // Sentiment breakdown
    const sentimentCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    for (const review of reviews) {
      if (review.sentiment) {
        sentimentCounts[review.sentiment]++;
      }
    }
    const sentimentBreakdown = (['positive', 'neutral', 'negative'] as const).map(s => ({
      sentiment: s,
      count: sentimentCounts[s] || 0,
      percent: reviews.length > 0 ? ((sentimentCounts[s] || 0) / reviews.length) * 100 : 0,
    }));

    // Category scores
    const categoryScores = this.calculateCategoryScores(reviews);

    // Response metrics
    const respondedReviews = reviews.filter(r => r.response);
    const responseRate = reviews.length > 0 ? (respondedReviews.length / reviews.length) * 100 : 0;
    const avgResponseTime = 24; // Hours (would calculate from actual data)

    // Recent trends (simulated)
    const recentTrends = [
      { period: 'Last 7 days', avgRating: overallRating * 0.98, reviewCount: Math.round(reviews.length * 0.15) },
      { period: 'Last 30 days', avgRating: overallRating, reviewCount: Math.round(reviews.length * 0.5) },
      { period: 'Last 90 days', avgRating: overallRating * 1.02, reviewCount: reviews.length },
    ];

    // Competitor average
    const competitorAvg = competitorRatings
      ? competitorRatings.reduce((sum, c) => sum + c.rating, 0) / competitorRatings.length
      : undefined;

    return {
      overallRating,
      ratingDistribution,
      sentimentBreakdown,
      categoryScores,
      responseRate,
      avgResponseTime,
      recentTrends,
      competitorAvg,
    };
  }

  /**
   * Calculate scores for each category
   */
  private calculateCategoryScores(reviews: Review[]): ReviewAnalysis['categoryScores'] {
    const categories = ['food', 'service', 'ambiance', 'value', 'hygiene'];
    const scores: ReviewAnalysis['categoryScores'] = [];

    for (const category of categories) {
      const relevantReviews = reviews.filter(r => r.categories && r.categories.includes(category));
      if (relevantReviews.length === 0) {
        scores.push({ category, score: 0, trend: 'stable', reviewCount: 0 });
        continue;
      }

      const avgScore = relevantReviews.reduce((sum, r) => sum + r.rating, 0) / relevantReviews.length;
      const trend = this.calculateTrend(relevantReviews);

      scores.push({
        category,
        score: avgScore,
        trend,
        reviewCount: relevantReviews.length,
      });
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate trend based on recent vs older reviews
   */
  private calculateTrend(reviews: Review[]): 'up' | 'down' | 'stable' {
    if (reviews.length < 5) return 'stable';

    // Sort by date (newest first)
    const sorted = [...reviews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recent = sorted.slice(0, Math.ceil(sorted.length / 2));
    const older = sorted.slice(Math.ceil(sorted.length / 2));

    const recentAvg = recent.reduce((sum, r) => sum + r.rating, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.rating, 0) / older.length;

    const diff = recentAvg - olderAvg;
    if (diff > 0.2) return 'up';
    if (diff < -0.2) return 'down';
    return 'stable';
  }

  /**
   * Generate response suggestions for reviews
   */
  private generateResponseSuggestions(
    reviews: Review[],
    templates?: { sentiment: string; template: string }[]
  ): ReviewResponse['responseSuggestions'] {
    const defaultTemplates: Record<string, string> = {
      positive: 'Thank you so much for your wonderful review! We\'re thrilled to hear you enjoyed your experience. Our team will be delighted to hear your kind words. We look forward to serving you again soon!',
      neutral: 'Thank you for your feedback. We appreciate you taking the time to share your experience. We\'re committed to continuously improving and would love to hear more about how we can better serve you.',
      negative: 'We sincerely apologize for falling short of your expectations. Your feedback has been shared with our team, and we\'re taking immediate steps to address the issues you mentioned. We hope you\'ll give us another chance to provide a better experience.',
    };

    return reviews.slice(0, 10).map(review => {
      const sentiment = review.sentiment || 'neutral';
      const template = templates?.find(t => t.sentiment === sentiment)?.template
        || defaultTemplates[sentiment] || defaultTemplates.neutral;

      return {
        reviewId: review.id,
        suggestedResponse: template,
        sentiment: sentiment,
      };
    });
  }

  /**
   * Generate review management strategy
   */
  private generateStrategy(analysis: ReviewAnalysis): ReviewResponse['strategy'] {
    const strategy: ReviewResponse['strategy'] = [];

    // Urgency based on negative reviews
    const negativeReviews = analysis.sentimentBreakdown.find(s => s.sentiment === 'negative');
    if (negativeReviews && negativeReviews.percent > 20) {
      strategy.push({
        priority: 'urgent',
        action: 'Address negative reviews immediately - negative sentiment exceeds 20%',
        reason: 'High negative review rate can significantly impact reputation',
      });
    }

    // Rating based on overall score
    if (analysis.overallRating < 3.5) {
      strategy.push({
        priority: 'urgent',
        action: 'Launch comprehensive review generation campaign',
        reason: 'Rating below 3.5 requires immediate attention',
      });
    } else if (analysis.overallRating < 4.0) {
      strategy.push({
        priority: 'high',
        action: 'Focus on increasing 5-star reviews',
        reason: 'Room to improve from current rating',
      });
    }

    // Category-based strategies
    const lowestCategory = analysis.categoryScores[analysis.categoryScores.length - 1];
    if (lowestCategory && lowestCategory.score < 3.5) {
      strategy.push({
        priority: 'high',
        action: `Improve ${lowestCategory.category} scores - currently the weakest area`,
        reason: `Category score of ${lowestCategory.score.toFixed(1)} is dragging down overall rating`,
      });
    }

    // Response rate strategy
    if (analysis.responseRate < 50) {
      strategy.push({
        priority: 'medium',
        action: 'Implement review response automation',
        reason: `Only ${analysis.responseRate.toFixed(0)}% of reviews responded to`,
      });
    }

    // Competitor comparison
    if (analysis.competitorAvg && analysis.overallRating < analysis.competitorAvg - 0.5) {
      strategy.push({
        priority: 'high',
        action: 'Benchmark against competitors and identify differentiation opportunities',
        reason: `Rating (${analysis.overallRating.toFixed(1)}) below competitor average (${analysis.competitorAvg.toFixed(1)})`,
      });
    }

    return strategy;
  }

  /**
   * Generate review generation campaigns
   */
  private generateCampaigns(
    analysis: ReviewAnalysis,
    platform?: string
  ): ReviewResponse['campaigns'] {
    const campaigns: ReviewResponse['campaigns'] = [];

    // Calculate reviews needed to reach target
    const targetRating = 4.5;
    const reviewsNeeded = this.calculateReviewsNeeded(analysis.overallRating, targetRating, 50);

    if (reviewsNeeded > 0) {
      campaigns.push({
        name: 'Review Generation Campaign',
        trigger: 'After dining experience',
        action: `Request ${reviewsNeeded} additional 5-star reviews`,
        expectedLift: 0.2,
      });
    }

    // Platform-specific campaigns
    if (!platform || platform === 'zomato') {
      campaigns.push({
        name: 'Zomato Review Drive',
        trigger: 'Post-order confirmation',
        action: 'Encourage Zomato app review with 50 bonus points',
        expectedLift: 15,
      });
    }

    if (!platform || platform === 'swiggy') {
      campaigns.push({
        name: 'Swiggy Review Drive',
        trigger: 'Delivery confirmation',
        action: 'Request Swiggy review with discount on next order',
        expectedLift: 12,
      });
    }

    // Negative review recovery
    campaigns.push({
      name: 'Service Recovery Program',
      trigger: 'Negative review detected',
      action: 'Auto-trigger private outreach for issue resolution',
      expectedLift: 30,
    });

    return campaigns;
  }

  /**
   * Calculate number of reviews needed to reach target rating
   */
  private calculateReviewsNeeded(
    currentRating: number,
    targetRating: number,
    currentReviewCount: number
  ): number {
    if (currentRating >= targetRating) return 0;

    // Estimate based on weighted average formula
    const requiredPositiveReviews = Math.ceil(
      (targetRating * (currentReviewCount + 100) - currentRating * currentReviewCount) / 5
    );

    return Math.max(0, requiredPositiveReviews - currentReviewCount);
  }

  /**
   * Generate automation rules
   */
  private generateAutomation(reviews: Review[]): ReviewResponse['automation'] {
    return [
      {
        trigger: 'New 5-star review',
        action: 'Auto-post public thank you response + private reward offer',
        enabled: true,
      },
      {
        trigger: 'New 1-2 star review',
        action: 'Alert manager + trigger recovery outreach within 2 hours',
        enabled: true,
      },
      {
        trigger: 'Keyword: "cold food"',
        action: 'Alert kitchen manager + auto-respond with compensation offer',
        enabled: true,
      },
      {
        trigger: 'Keyword: "long wait"',
        action: 'Alert floor manager + offer discount code',
        enabled: true,
      },
      {
        trigger: 'Post-visit (24h)',
        action: 'Send review request via email/SMS',
        enabled: true,
      },
      {
        trigger: 'No review in 7 days',
        action: 'Send reminder with incentive',
        enabled: false,
      },
    ];
  }

  /**
   * Generate review report
   */
  async generateReport(request: ReviewRequest, response: ReviewResponse): Promise<string> {
    const sentimentTrend = response.analysis.recentTrends.length >= 2
      ? response.analysis.recentTrends[0].avgRating - response.analysis.recentTrends[1].avgRating
      : 0;

    return `
# REVIEW MANAGEMENT REPORT
Generated: ${new Date().toISOString()}
Restaurant ID: ${request.restaurantId}

## OVERALL METRICS
- Overall Rating: ${response.analysis.overallRating.toFixed(2)}/5
- Total Reviews: ${response.analysis.ratingDistribution.reduce((sum, r) => sum + r.count, 0)}
- Response Rate: ${response.analysis.responseRate.toFixed(0)}%
- Avg Response Time: ${response.analysis.avgResponseTime.toFixed(0)} hours
${response.analysis.competitorAvg ? `- Competitor Avg: ${response.analysis.competitorAvg.toFixed(2)}/5` : ''}

## RATING DISTRIBUTION
${response.analysis.ratingDistribution.map(r => `${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)} ${r.count} (${r.percent.toFixed(0)}%)`).join('\n')}

## SENTIMENT BREAKDOWN
- Positive: ${response.analysis.sentimentBreakdown.find(s => s.sentiment === 'positive')?.percent.toFixed(0)}%
- Neutral: ${response.analysis.sentimentBreakdown.find(s => s.sentiment === 'neutral')?.percent.toFixed(0)}%
- Negative: ${response.analysis.sentimentBreakdown.find(s => s.sentiment === 'negative')?.percent.toFixed(0)}%

## CATEGORY SCORES
${response.analysis.categoryScores.map(c => `- ${c.category}: ${c.score.toFixed(1)}/5 ${c.trend === 'up' ? '↑' : c.trend === 'down' ? '↓' : '→'}`).join('\n')}

## STRATEGY PRIORITIES
${response.strategy.map(s => `[${s.priority.toUpperCase()}] ${s.action}`).join('\n')}

## CAMPAIGNS
${response.campaigns.map(c => `- ${c.name}: ${c.action} (Expected ${c.expectedLift}% lift)`).join('\n')}

## AUTOMATION RULES
${response.automation.filter(a => a.enabled).map(a => `- ${a.trigger}: ${a.action}`).join('\n')}
`.trim();
  }
}

export const reviewManagerService = new ReviewManagerService();
