/**
 * Growth Tracker Service
 * ====================
 * Tracks personal growth across skills, habits, goals, and values.
 */

import type { GrowthMetric, GrowthDataPoint, GrowthCategory, GrowthSummary, GrowthInsight } from '../types/index.js';

export class GrowthTracker {
  private metrics = new Map<string, GrowthMetric>();

  /**
   * Track a growth data point
   */
  track(userId: string, category: GrowthCategory, name: string, value: number, note?: string): GrowthMetric {
    const key = `${userId}:${category}:${name}`;

    let metric = this.metrics.get(key);

    if (!metric) {
      metric = {
        id: `metric-${Date.now()}`,
        userId,
        category,
        name,
        description: '',
        currentLevel: value,
        totalSessions: 1,
        lastUpdated: new Date().toISOString(),
        history: []
      };
    }

    // Update streak
    const now = new Date();
    const lastUpdate = new Date(metric.lastUpdated);
    const daysSince = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince === 1) {
      metric.streak = (metric.streak || 0) + 1;
    } else if (daysSince > 1) {
      metric.streak = 1;
    }

    metric.bestStreak = Math.max(metric.bestStreak || 0, metric.streak || 0);

    // Update level
    metric.currentLevel = value;
    metric.totalSessions++;
    metric.lastUpdated = now.toISOString();

    // Add to history
    metric.history.push({
      timestamp: now.toISOString(),
      value,
      note
    });

    // Keep last 365 data points
    if (metric.history.length > 365) {
      metric.history.shift();
    }

    this.metrics.set(key, metric);
    return metric;
  }

  /**
   * Get growth metric
   */
  get(userId: string, category: GrowthCategory, name: string): GrowthMetric | undefined {
    const key = `${userId}:${category}:${name}`;
    return this.metrics.get(key);
  }

  /**
   * Get all metrics for a user
   */
  getAllForUser(userId: string): GrowthMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.userId === userId);
  }

  /**
   * Calculate growth trend
   */
  calculateTrend(metric: GrowthMetric): 'improving' | 'stable' | 'declining' {
    const history = metric.history;
    if (history.length < 2) return 'stable';

    const recent = history.slice(-5);
    const earlier = history.slice(-10, -5);

    if (earlier.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b.value, 0) / earlier.length;

    const diff = recentAvg - earlierAvg;
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  }

  /**
   * Generate growth summary
   */
  generateSummary(userId: string, periodDays: number): GrowthSummary {
    const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
    const userMetrics = this.getAllForUser(userId).filter(m =>
      m.history.some(h => new Date(h.timestamp).getTime() >= cutoff)
    );

    const wins: string[] = [];
    const improvements: string[] = [];
    const skills: string[] = [];
    const insights: GrowthInsight[] = [];

    for (const metric of userMetrics) {
      const recentHistory = metric.history.filter(h => new Date(h.timestamp).getTime() >= cutoff);
      if (recentHistory.length === 0) continue;

      const trend = this.calculateTrend(metric);
      const firstValue = recentHistory[0].value;
      const lastValue = recentHistory[recentHistory.length - 1].value;
      const improvement = lastValue - firstValue;

      if (trend === 'improving' && improvement > 2) {
        wins.push(`${metric.name}: improved from ${firstValue.toFixed(1)} to ${lastValue.toFixed(1)}`);
        skills.push(metric.name);
      } else if (trend === 'declining' && improvement < -2) {
        improvements.push(`${metric.name}: dropped from ${firstValue.toFixed(1)} to ${lastValue.toFixed(1)}`);
      }

      if (metric.streak && metric.streak >= 7) {
        insights.push({
          type: 'achievement',
          title: `${metric.name} streak`,
          description: `${metric.streak} day streak on ${metric.name}`,
          actionable: false
        });
      }
    }

    const avgImprovement = userMetrics.length > 0
      ? userMetrics.reduce((sum, m) => {
          const recent = m.history.filter(h => new Date(h.timestamp).getTime() >= cutoff);
          if (recent.length < 2) return sum;
          return sum + (recent[recent.length - 1].value - recent[0].value);
        }, 0) / userMetrics.length
      : 0;

    return {
      userId,
      period: periodDays <= 7 ? 'week' : periodDays <= 30 ? 'month' : 'year',
      generatedAt: new Date().toISOString(),
      overallGrowth: Math.round((avgImprovement + 1) * 50), // Scale to 0-100
      topWins: wins.slice(0, 5),
      areasForImprovement: improvements.slice(0, 5),
      newHabitsFormed: wins.filter(w => w.includes('habit')).length,
      goalsCompleted: 0, // Would integrate with goals
      skillsImproved: skills.slice(0, 10),
      insights,
      recommendations: this.generateRecommendations(improvements, wins),
      reflection: this.generateReflection(wins, improvements, avgImprovement)
    };
  }

  /**
   * Generate recommendations based on growth data
   */
  private generateRecommendations(improvements: string[], wins: string[]): string[] {
    const recommendations: string[] = [];

    if (improvements.length > wins.length) {
      recommendations.push('Consider simplifying your approach - fewer focused goals may lead to better results');
    }

    if (wins.length === 0) {
      recommendations.push('Start with one small habit to build momentum');
    }

    const skillWins = wins.filter(w => w.includes('skill') || w.includes('learn'));
    if (skillWins.length > 0) {
      recommendations.push('Your learning streak is strong - consider teaching others to reinforce knowledge');
    }

    return recommendations;
  }

  /**
   * Generate AI reflection
   */
  private generateReflection(wins: string[], improvements: string[], avgImprovement: number): string {
    if (wins.length === 0 && improvements.length === 0) {
      return 'This period was about building foundations. Small consistent actions compound over time.';
    }

    let reflection = '';

    if (wins.length > improvements.length) {
      reflection += `You're making real progress. ${wins.length} areas showed improvement. `;
    } else if (improvements.length > wins.length) {
      reflection += `This was a challenging period. ${improvements.length} areas need attention. Consider adjusting your approach. `;
    }

    if (avgImprovement > 1) {
      reflection += 'Your consistency is paying off - keep going.';
    } else if (avgImprovement < 0) {
      reflection += 'Remember: progress isn\'t always linear. Small steps forward still count.';
    }

    return reflection || 'Keep showing up. Growth is a journey, not a destination.';
  }
}
