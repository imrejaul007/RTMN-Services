/**
 * Emotion Trajectory Service
 * ==========================
 * Tracks emotional flow over time and generates contextual insights.
 */

import type { EmotionalTrajectory } from '../types/index.js';

export class EmotionTrajectory {
  private history: Map<string, EmotionalTrajectory[]> = new Map();
  private readonly MAX_HISTORY = 100;

  /**
   * Track an emotional data point
   */
  track(userId: string, emotion: string, intensity: number): EmotionalTrajectory {
    const trend = this.calculateTrend(userId);

    const dataPoint: EmotionalTrajectory = {
      timestamp: Date.now(),
      emotion: this.normalizeEmotion(emotion),
      intensity: Math.max(1, Math.min(10, intensity)),
      trend
    };

    // Add to history
    const userHistory = this.history.get(userId) || [];
    userHistory.push(dataPoint);

    // Keep only last N points
    if (userHistory.length > this.MAX_HISTORY) {
      userHistory.shift();
    }

    this.history.set(userId, userHistory);

    return dataPoint;
  }

  /**
   * Get current emotional state
   */
  getCurrentState(userId: string): EmotionalState {
    const history = this.history.get(userId) || [];

    if (history.length === 0) {
      return {
        emotion: 'neutral',
        intensity: 5,
        trend: 'stable',
        confidence: 0
      };
    }

    const recent = history.slice(-5);
    const latest = recent[recent.length - 1];

    // Calculate weighted average (more recent = higher weight)
    let totalWeight = 0;
    let weightedEmotion: Record<string, number> = {};
    let weightedIntensity = 0;

    recent.forEach((point, i) => {
      const weight = i + 1; // More recent = higher weight
      totalWeight += weight;
      weightedIntensity += point.intensity * weight;
      weightedEmotion[point.emotion] = (weightedEmotion[point.emotion] || 0) + weight;
    });

    // Dominant emotion
    const dominantEmotion = Object.entries(weightedEmotion)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    return {
      emotion: dominantEmotion,
      intensity: weightedIntensity / totalWeight,
      trend: latest.trend,
      confidence: Math.min(1, history.length / 10), // Higher confidence with more data
      history: recent
    };
  }

  /**
   * Calculate emotional trajectory trend
   */
  calculateTrend(userId: string): EmotionalTrajectory['trend'] {
    const history = this.history.get(userId) || [];

    if (history.length < 3) {
      return 'stable';
    }

    const recent = history.slice(-5);

    // Simple linear regression on intensity
    const xMean = (recent.length - 1) / 2;
    const yMean = recent.reduce((a, b) => a + b.intensity, 0) / recent.length;

    let numerator = 0;
    let denominator = 0;

    recent.forEach((point, i) => {
      numerator += (i - xMean) * (point.intensity - yMean);
      denominator += (i - xMean) * (i - xMean);
    });

    const slope = denominator !== 0 ? numerator / denominator : 0;

    if (slope > 0.3) return 'improving';
    if (slope < -0.3) return 'declining';
    return 'stable';
  }

  /**
   * Generate contextual response based on emotional trajectory
   */
  generateTrajectoryResponse(userId: string, currentEmotion: string): TrajectoryInsight | null {
    const state = this.getCurrentState(userId);
    const history = this.history.get(userId) || [];

    if (history.length < 3) return null;

    // Check for significant shifts
    const emotionalShift = this.detectEmotionalShift(history);
    if (emotionalShift) {
      return {
        type: 'emotional_shift',
        insight: emotionalShift.insight,
        suggestedResponse: emotionalShift.response,
        emotion: currentEmotion,
        trend: state.trend
      };
    }

    // Check for recurring patterns
    const pattern = this.detectPattern(history);
    if (pattern) {
      return {
        type: 'pattern',
        insight: pattern.insight,
        suggestedResponse: pattern.response,
        emotion: currentEmotion,
        trend: state.trend
      };
    }

    return null;
  }

  /**
   * Detect significant emotional shifts
   */
  private detectEmotionalShift(history: EmotionalTrajectory[]): {
    insight: string;
    response: string;
  } | null {
    if (history.length < 3) return null;

    const recent = history.slice(-3);
    const earlier = history.slice(-6, -3);

    const recentAvg = recent.reduce((a, b) => a + b.intensity, 0) / recent.length;
    const earlierAvg = earlier.length > 0
      ? earlier.reduce((a, b) => a + b.intensity, 0) / earlier.length
      : recentAvg;

    const shift = recentAvg - earlierAvg;

    if (Math.abs(shift) > 2) {
      if (shift > 0) {
        return {
          insight: 'User emotional state has significantly improved',
          response: "You sound much better than before. What's been going well?"
        };
      } else {
        return {
          insight: 'User emotional state has declined significantly',
          response: "I noticed you seem a bit down compared to before. Want to talk about it?"
        };
      }
    }

    // Check for emotion type shifts
    const recentEmotions = recent.map(r => r.emotion);
    const earlierEmotions = earlier.map(e => e.emotion);

    const hasShifted = !recentEmotions.some(e => earlierEmotions.includes(e)) &&
      recentEmotions.length > 0 && earlierEmotions.length > 0;

    if (hasShifted) {
      return {
        insight: `Emotional shift from ${earlierEmotions[0]} to ${recentEmotions[0]}`,
        response: "I noticed the shift. What's changed?"
      };
    }

    return null;
  }

  /**
   * Detect emotional patterns
   */
  private detectPattern(history: EmotionalTrajectory[]): {
    insight: string;
    response: string;
  } | null {
    if (history.length < 10) return null;

    // Check for weekly patterns (e.g., stressed on Mondays)
    const hourGroups = this.groupByHour(history);
    for (const [hour, points] of hourGroups) {
      if (points.length >= 3) {
        const avgIntensity = points.reduce((a, b) => a + b.intensity, 0) / points.length;
        if (avgIntensity < 4) {
          return {
            insight: `User tends to feel low around ${hour}:00`,
            response: "Is it that time of day again? You've seemed down around this hour before."
          };
        }
      }
    }

    return null;
  }

  /**
   * Group emotional data by hour
   */
  private groupByHour(history: EmotionalTrajectory[]): Map<number, EmotionalTrajectory[]> {
    const groups = new Map<number, EmotionalTrajectory[]>();

    history.forEach(point => {
      const hour = new Date(point.timestamp).getHours();
      if (!groups.has(hour)) {
        groups.set(hour, []);
      }
      groups.get(hour)!.push(point);
    });

    return groups;
  }

  /**
   * Normalize emotion to standard set
   */
  private normalizeEmotion(emotion: string): string {
    const mappings: Record<string, string> = {
      // Positive
      'happy': 'joy',
      'excited': 'joy',
      'thrilled': 'joy',
      'grateful': 'joy',
      'content': 'joy',
      'proud': 'joy',

      // Love
      'loved': 'love',
      'connected': 'love',
      'appreciated': 'love',

      // Negative
      'sad': 'sadness',
      'unhappy': 'sadness',
      'down': 'sadness',
      'lonely': 'sadness',
      'grieving': 'sadness',

      'angry': 'anger',
      'mad': 'anger',
      'frustrated': 'anger',
      'annoyed': 'anger',

      'scared': 'fear',
      'afraid': 'fear',
      'worried': 'fear',
      'anxious': 'fear',
      'stressed': 'fear',

      // Surprise
      'surprised': 'surprise',
      'amazed': 'surprise',
      'shocked': 'surprise',

      // Neutral
      'okay': 'neutral',
      'fine': 'neutral',
      'alright': 'neutral'
    };

    const lower = emotion.toLowerCase().trim();
    return mappings[lower] || lower;
  }

  /**
   * Get emotional summary for a time period
   */
  getSummary(userId: string, periodMs: number = 86400000): EmotionalSummary {
    const cutoff = Date.now() - periodMs;
    const history = (this.history.get(userId) || [])
      .filter(p => p.timestamp >= cutoff);

    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;

    history.forEach(point => {
      emotionCounts[point.emotion] = (emotionCounts[point.emotion] || 0) + 1;
      totalIntensity += point.intensity;
    });

    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    return {
      totalDataPoints: history.length,
      dominantEmotion,
      averageIntensity: history.length > 0 ? totalIntensity / history.length : 5,
      emotionDistribution: emotionCounts,
      trajectory: history.slice(-10)
    };
  }
}

export interface EmotionalState {
  emotion: string;
  intensity: number;
  trend: EmotionalTrajectory['trend'];
  confidence: number;
  history?: EmotionalTrajectory[];
}

export interface TrajectoryInsight {
  type: 'emotional_shift' | 'pattern' | 'milestone';
  insight: string;
  suggestedResponse: string;
  emotion: string;
  trend: EmotionalTrajectory['trend'];
}

export interface EmotionalSummary {
  totalDataPoints: number;
  dominantEmotion: string;
  averageIntensity: number;
  emotionDistribution: Record<string, number>;
  trajectory: EmotionalTrajectory[];
}
