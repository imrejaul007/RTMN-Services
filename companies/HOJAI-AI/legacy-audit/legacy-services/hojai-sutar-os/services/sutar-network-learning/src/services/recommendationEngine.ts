// ============================================================================
// SUTAR Network Learning - Recommendation Engine Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Recommendation,
  RecommendedAction,
  RecommendationFeedback,
  RecommendationConfidence,
  Pattern,
  Strategy,
  Trend
} from './types';

interface RecommendationContext {
  userId?: string;
  sessionId?: string;
  currentState: Record<string, any>;
  historicalPreferences?: string[];
  constraints?: Record<string, any>;
  timeOfDay?: string;
  dayOfWeek?: string;
}

interface CollaborativeFilter {
  userId: string;
  itemScores: Map<string, number>;
  feedbackHistory: Map<string, RecommendationFeedback>;
}

interface RecommendationMetrics {
  totalRecommendations: number;
  acceptedRecommendations: number;
  rejectedRecommendations: number;
  averageRating: number;
  clickThroughRate: number;
  conversionRate: number;
}

class RecommendationEngineService {
  private recommendations: Map<string, Recommendation> = new Map();
  private userPreferences: Map<string, CollaborativeFilter> = new Map();
  private itemSimilarity: Map<string, Map<string, number>> = new Map();
  private metrics: RecommendationMetrics = {
    totalRecommendations: 0,
    acceptedRecommendations: 0,
    rejectedRecommendations: 0,
    averageRating: 0,
    clickThroughRate: 0,
    conversionRate: 0
  };

  // Generate recommendations based on context
  generateRecommendations(context: RecommendationContext, patterns: Pattern[], strategies: Strategy[], trends: Trend[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const patternRecs = this.generatePatternRecommendations(context, patterns);
    recommendations.push(...patternRecs);

    const strategyRecs = this.generateStrategyRecommendations(context, strategies);
    recommendations.push(...strategyRecs);

    const trendRecs = this.generateTrendRecommendations(context, trends);
    recommendations.push(...trendRecs);

    const personalizedRecs = this.generatePersonalizedRecommendations(context, patterns, strategies);
    recommendations.push(...personalizedRecs);

    recommendations.sort((a, b) => b.score - a.score);

    recommendations.forEach(rec => {
      this.recommendations.set(rec.id, rec);
    });

    this.metrics.totalRecommendations += recommendations.length;

    return recommendations.slice(0, 10);
  }

  // Generate recommendations from patterns
  private generatePatternRecommendations(context: RecommendationContext, patterns: Pattern[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const highConfidencePatterns = patterns
      .filter(p => p.confidence >= 0.6)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    for (const pattern of highConfidencePatterns) {
      if (pattern.type === 'success' && pattern.successRate > 70) {
        recommendations.push(this.createPatternRecommendation(pattern, context));
      } else if (pattern.type === 'failure' && pattern.frequency > 5) {
        recommendations.push(this.createAvoidanceRecommendation(pattern, context));
      }
    }

    return recommendations;
  }

  // Create recommendation from pattern
  private createPatternRecommendation(pattern: Pattern, context: RecommendationContext): Recommendation {
    const confidence = this.calculateConfidence(pattern.confidence, pattern.frequency);

    return {
      id: `rec-${uuidv4()}`,
      type: 'pattern',
      title: `Leverage successful pattern: ${pattern.description.substring(0, 50)}`,
      description: `This pattern has ${pattern.successRate.toFixed(1)}% success rate and has been observed ${pattern.frequency} times.`,
      confidence,
      score: pattern.successRate * pattern.confidence,
      actions: this.generateActionsFromPattern(pattern),
      context: context.currentState,
      basedOnPatterns: [pattern.id],
      createdAt: new Date().toISOString()
    };
  }

  // Create avoidance recommendation
  private createAvoidanceRecommendation(pattern: Pattern, context: RecommendationContext): Recommendation {
    return {
      id: `rec-${uuidv4()}`,
      type: 'pattern',
      title: `Avoid risky pattern: ${pattern.description.substring(0, 50)}`,
      description: `This pattern has only ${pattern.successRate.toFixed(1)}% success rate. Consider alternative approaches.`,
      confidence: this.calculateConfidence(pattern.confidence, pattern.frequency),
      score: (100 - pattern.successRate) * pattern.confidence,
      actions: [{
        action: 'avoid',
        description: 'Do not execute actions associated with this pattern',
        priority: 1,
        expectedOutcome: 'reduced failure rate',
        risk: 'low'
      }],
      context: context.currentState,
      basedOnPatterns: [pattern.id],
      createdAt: new Date().toISOString()
    };
  }

  // Generate recommendations from strategies
  private generateStrategyRecommendations(context: RecommendationContext, strategies: Strategy[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const applicableStrategies = strategies
      .filter(s => s.status === 'active')
      .filter(s => this.checkStrategyConditions(s, context.currentState))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3);

    for (const strategy of applicableStrategies) {
      recommendations.push(this.createStrategyRecommendation(strategy, context));
    }

    return recommendations;
  }

  // Create recommendation from strategy
  private createStrategyRecommendation(strategy: Strategy, context: RecommendationContext): Recommendation {
    return {
      id: `rec-${uuidv4()}`,
      type: 'strategy',
      title: `Apply strategy: ${strategy.name}`,
      description: strategy.description,
      confidence: this.mapSuccessRateToConfidence(strategy.successRate),
      score: strategy.successRate * 0.8,
      actions: strategy.actions.map((action, i) => ({
        action,
        description: `Execute action ${i + 1}`,
        priority: i + 1,
        expectedOutcome: strategy.expectedOutcome,
        risk: strategy.metadata?.riskLevel as any || 'medium'
      })),
      context: context.currentState,
      basedOnPatterns: strategy.metadata?.sourcePatterns as string[] || [],
      createdAt: new Date().toISOString()
    };
  }

  // Generate trend-based recommendations
  private generateTrendRecommendations(context: RecommendationContext, trends: Trend[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const emergingTrends = trends
      .filter(t => t.direction === 'up' && t.strength > 0.7)
      .slice(0, 2);

    for (const trend of emergingTrends) {
      recommendations.push({
        id: `rec-${uuidv4()}`,
        type: 'trend',
        title: `Capitalize on emerging trend: ${trend.name}`,
        description: trend.description,
        confidence: this.mapStrengthToConfidence(trend.strength),
        score: trend.strength * 100,
        actions: [{
          action: 'align_with_trend',
          description: 'Adjust strategy to align with upward trend',
          priority: 1,
          expectedOutcome: 'trend capture',
          risk: 'medium'
        }],
        context: context.currentState,
        basedOnPatterns: trend.relatedPatterns,
        createdAt: new Date().toISOString()
      });
    }

    return recommendations;
  }

  // Generate personalized recommendations
  private generatePersonalizedRecommendations(
    context: RecommendationContext,
    patterns: Pattern[],
    strategies: Strategy[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (!context.userId) return recommendations;

    const userPrefs = this.userPreferences.get(context.userId);
    if (!userPrefs) return recommendations;

    const likedPatterns = this.getPatternsFromFeedback(userPrefs, true);
    const dislikedPatterns = this.getPatternsFromFeedback(userPrefs, false);

    for (const likedPattern of likedPatterns) {
      const similarPatterns = this.findSimilarPatterns(likedPattern, patterns);
      for (const similar of similarPatterns) {
        if (!dislikedPatterns.some(d => d.id === similar.id)) {
          recommendations.push({
            id: `rec-${uuidv4()}`,
            type: 'pattern',
            title: `Similar to what you liked: ${similar.description.substring(0, 50)}`,
            description: 'Based on your preferences, you might also like this pattern.',
            confidence: 'medium',
            score: 70,
            actions: this.generateActionsFromPattern(similar),
            context: context.currentState,
            basedOnPatterns: [similar.id],
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    return recommendations.slice(0, 3);
  }

  // Get patterns from user feedback
  private getPatternsFromFeedback(prefs: CollaborativeFilter, helpful: boolean): Pattern[] {
    const patternIds: string[] = [];
    prefs.feedbackHistory.forEach((feedback, patternId) => {
      if (feedback.helpful === helpful) {
        patternIds.push(patternId);
      }
    });
    return [];
  }

  // Find similar patterns
  private findSimilarPatterns(pattern: Pattern, allPatterns: Pattern[]): Pattern[] {
    return allPatterns
      .filter(p => p.id !== pattern.id)
      .filter(p => p.type === pattern.type)
      .slice(0, 3);
  }

  // Generate actions from pattern
  private generateActionsFromPattern(pattern: Pattern): RecommendedAction[] {
    return pattern.triggers
      .filter(t => !t.includes(':'))
      .map((action, i) => ({
        action,
        description: `Trigger: ${action}`,
        priority: i + 1,
        expectedOutcome: pattern.type,
        risk: pattern.type === 'success' ? 'low' : 'high'
      }));
  }

  // Calculate confidence level
  private calculateConfidence(patternConfidence: number, frequency: number): RecommendationConfidence {
    const combinedScore = patternConfidence * Math.min(1, frequency / 10);
    if (combinedScore >= 0.8) return 'very_high';
    if (combinedScore >= 0.6) return 'high';
    if (combinedScore >= 0.4) return 'medium';
    return 'low';
  }

  // Map success rate to confidence
  private mapSuccessRateToConfidence(successRate: number): RecommendationConfidence {
    if (successRate >= 85) return 'very_high';
    if (successRate >= 70) return 'high';
    if (successRate >= 50) return 'medium';
    return 'low';
  }

  // Map strength to confidence
  private mapStrengthToConfidence(strength: number): RecommendationConfidence {
    if (strength >= 0.9) return 'very_high';
    if (strength >= 0.7) return 'high';
    if (strength >= 0.5) return 'medium';
    return 'low';
  }

  // Check if strategy conditions match context
  private checkStrategyConditions(strategy: Strategy, context: Record<string, any>): boolean {
    return strategy.conditions.every(condition => {
      const value = context[condition.field];
      switch (condition.operator) {
        case 'eq': return value === condition.value;
        case 'ne': return value !== condition.value;
        case 'gt': return value > condition.value;
        case 'lt': return value < condition.value;
        case 'gte': return value >= condition.value;
        case 'lte': return value <= condition.value;
        case 'contains': return String(value).includes(String(condition.value));
        default: return false;
      }
    });
  }

  // Record feedback on recommendation
  recordFeedback(recommendationId: string, feedback: RecommendationFeedback): void {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation ${recommendationId} not found`);
    }

    recommendation.feedback = {
      ...feedback,
      timestamp: new Date().toISOString()
    };

    if (feedback.userId) {
      this.updateUserPreferences(feedback.userId, recommendation, feedback);
    }

    if (feedback.helpful) {
      this.metrics.acceptedRecommendations++;
    } else {
      this.metrics.rejectedRecommendations++;
    }

    if (feedback.rating !== undefined) {
      this.updateAverageRating(feedback.rating);
    }

    if (feedback.applied) {
      this.metrics.conversionRate = (this.metrics.conversionRate * 0.9) + 0.1;
    }
  }

  // Update user preferences
  private updateUserPreferences(userId: string, recommendation: Recommendation, feedback: RecommendationFeedback): void {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {
        userId,
        itemScores: new Map(),
        feedbackHistory: new Map()
      });
    }

    const prefs = this.userPreferences.get(userId)!;

    recommendation.basedOnPatterns.forEach(patternId => {
      const currentScore = prefs.itemScores.get(patternId) || 0;
      const newScore = feedback.helpful ? currentScore + 0.1 : currentScore - 0.1;
      prefs.itemScores.set(patternId, Math.max(-1, Math.min(1, newScore)));
    });

    prefs.feedbackHistory.set(recommendation.id, feedback);
  }

  // Update average rating
  private updateAverageRating(newRating: number): void {
    const totalRatings = this.metrics.totalRecommendations;
    const currentAvg = this.metrics.averageRating;
    this.metrics.averageRating = (currentAvg * (totalRatings - 1) + newRating) / totalRatings;
  }

  // Get recommendation by ID
  getRecommendation(id: string): Recommendation | undefined {
    return this.recommendations.get(id);
  }

  // Get all recommendations
  getAllRecommendations(filters?: {
    type?: Recommendation['type'];
    minScore?: number;
    userId?: string;
  }): Recommendation[] {
    let result = Array.from(this.recommendations.values());

    if (filters?.type) {
      result = result.filter(r => r.type === filters.type);
    }
    if (filters?.minScore !== undefined) {
      result = result.filter(r => r.score >= filters.minScore!);
    }
    if (filters?.userId) {
      result = result.filter(r => r.feedback?.userId === filters.userId);
    }

    return result.sort((a, b) => b.score - a.score);
  }

  // Get metrics
  getMetrics(): RecommendationMetrics {
    return { ...this.metrics };
  }

  // Calculate click-through rate
  calculateClickThroughRate(): number {
    const viewed = this.metrics.acceptedRecommendations + this.metrics.rejectedRecommendations;
    return viewed > 0 ? this.metrics.acceptedRecommendations / viewed : 0;
  }

  // Get user preferences
  getUserPreferences(userId: string): CollaborativeFilter | undefined {
    return this.userPreferences.get(userId);
  }

  // Get top recommendations for user
  getTopRecommendationsForUser(userId: string, limit: number = 5): Recommendation[] {
    const prefs = this.userPreferences.get(userId);
    if (!prefs) return [];

    return Array.from(this.recommendations.values())
      .filter(r => !r.feedback)
      .sort((a, b) => {
        const aScore = prefs.itemScores.get(a.basedOnPatterns[0]) || 0;
        const bScore = prefs.itemScores.get(b.basedOnPatterns[0]) || 0;
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  // Clear old recommendations
  clearOldRecommendations(olderThanHours: number = 24): void {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - olderThanHours);

    this.recommendations.forEach((rec, id) => {
      if (new Date(rec.createdAt) < cutoff && !rec.feedback) {
        this.recommendations.delete(id);
      }
    });
  }

  // Export recommendations for analysis
  exportRecommendations(): {
    recommendations: Recommendation[];
    metrics: RecommendationMetrics;
    topPatterns: string[];
  } {
    const allRecs = Array.from(this.recommendations.values());

    const patternCounts = new Map<string, number>();
    allRecs.forEach(r => {
      r.basedOnPatterns.forEach(p => {
        patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
      });
    });

    const topPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    return {
      recommendations: allRecs,
      metrics: this.metrics,
      topPatterns
    };
  }

  // Clear all data
  clearData(): void {
    this.recommendations.clear();
    this.userPreferences.clear();
    this.itemSimilarity.clear();
    this.metrics = {
      totalRecommendations: 0,
      acceptedRecommendations: 0,
      rejectedRecommendations: 0,
      averageRating: 0,
      clickThroughRate: 0,
      conversionRate: 0
    };
  }
}

export const recommendationEngineService = new RecommendationEngineService();
export default recommendationEngineService;
