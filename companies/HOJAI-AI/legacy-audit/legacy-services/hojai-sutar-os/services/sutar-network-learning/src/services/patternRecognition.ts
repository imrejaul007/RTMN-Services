// ============================================================================
// SUTAR Network Learning - Pattern Recognition Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Pattern,
  LearningData,
  PatternType,
  PatternInsights,
  ApiResponse,
  PaginatedRequest
} from './types';

interface PatternCluster {
  id: string;
  centroid: number[];
  patterns: string[];
  size: number;
  avgSuccessRate: number;
}

interface PatternSequence {
  id: string;
  patterns: string[];
  frequency: number;
  successRate: number;
  transitions: Map<string, number>;
}

class PatternRecognitionService {
  private patterns: Map<string, Pattern> = new Map();
  private learningData: Map<string, LearningData[]> = new Map();
  private clusters: Map<string, PatternCluster> = new Map();
  private sequences: Map<string, PatternSequence> = new Map();
  private featureExtractors: Map<string, (data: LearningData) => number[]> = new Map();

  constructor() {
    this.initializeFeatureExtractors();
  }

  private initializeFeatureExtractors(): void {
    this.featureExtractors.set('basic', (data: LearningData) => {
      const features: number[] = [];
      features.push(data.reward || 0);
      features.push(data.outcome === 'success' ? 1 : 0);
      features.push(data.outcome === 'failure' ? 1 : 0);
      features.push(Object.keys(data.context).length);
      return features;
    });

    this.featureExtractors.set('contextual', (data: LearningData) => {
      const features: number[] = [];
      const contextValues = Object.values(data.context);
      contextValues.forEach(v => {
        if (typeof v === 'number') features.push(v);
        else if (typeof v === 'string') features.push(this.hashString(v));
      });
      while (features.length < 10) features.push(0);
      return features.slice(0, 10);
    });

    this.featureExtractors.set('temporal', (data: LearningData) => {
      const timestamp = new Date(data.timestamp).getTime();
      const hour = new Date(data.timestamp).getHours();
      const dayOfWeek = new Date(data.timestamp).getDay();
      return [
        (timestamp % 86400000) / 86400000,
        hour / 24,
        dayOfWeek / 7,
        timestamp / 1e12
      ];
    });
  }

  // Learn a new pattern from data
  learnPattern(data: LearningData): Pattern {
    const patternId = `pattern-${uuidv4()}`;
    const features = this.extractFeatures(data);

    const pattern: Pattern = {
      id: patternId,
      type: data.outcome,
      description: this.generatePatternDescription(data),
      frequency: 1,
      successRate: data.outcome === 'success' ? 100 : (data.outcome === 'failure' ? 0 : 50),
      triggers: this.extractTriggers(data),
      outcomes: [data.outcome],
      confidence: 0.1,
      lastObserved: data.timestamp,
      createdAt: data.timestamp,
      metadata: data.metadata,
      features: features
    };

    this.patterns.set(patternId, pattern);
    this.storeLearningData(data);
    this.updateClusters(pattern);
    this.updateSequences(pattern, data);

    return pattern;
  }

  // Extract features from learning data
  private extractFeatures(data: LearningData): number[] {
    const allFeatures: number[] = [];

    this.featureExtractors.forEach((extractor) => {
      allFeatures.push(...extractor(data));
    });

    return allFeatures;
  }

  // Generate human-readable pattern description
  private generatePatternDescription(data: LearningData): string {
    const contextKeys = Object.keys(data.context).slice(0, 3);
    const contextDesc = contextKeys.map(k => `${k}=${data.context[k]}`).join(', ');
    return `When ${data.action} occurs with ${contextDesc || 'no context'}, outcome is ${data.outcome}`;
  }

  // Extract triggers from learning data
  private extractTriggers(data: LearningData): string[] {
    const triggers: string[] = [data.action];
    Object.entries(data.context).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length < 50) {
        triggers.push(`${key}:${value}`);
      }
    });
    return triggers;
  }

  // Store learning data for analysis
  private storeLearningData(data: LearningData): void {
    const key = `${data.action}-${data.outcome}`;
    if (!this.learningData.has(key)) {
      this.learningData.set(key, []);
    }
    this.learningData.get(key)!.push(data);
  }

  // Update pattern clusters using simple k-means-like algorithm
  private updateClusters(pattern: Pattern): void {
    if (!pattern.features || pattern.features.length === 0) return;

    let assignedCluster: PatternCluster | undefined = undefined;
    let minDistance = Infinity;

    for (const cluster of this.clusters.values()) {
      const distance = this.calculateDistance(pattern.features!, cluster.centroid);
      if (distance < minDistance) {
        minDistance = distance;
        assignedCluster = cluster;
      }
    }

    if (assignedCluster && minDistance < 1.0) {
      assignedCluster.patterns.push(pattern.id);
      assignedCluster.size++;
      assignedCluster.centroid = this.updateCentroid(assignedCluster.centroid, pattern.features!);
      assignedCluster.avgSuccessRate = (assignedCluster.avgSuccessRate * (assignedCluster.size - 1) + pattern.successRate) / assignedCluster.size;
      pattern.clusterId = assignedCluster.id;
    } else {
      const newCluster: PatternCluster = {
        id: `cluster-${uuidv4()}`,
        centroid: [...pattern.features!],
        patterns: [pattern.id],
        size: 1,
        avgSuccessRate: pattern.successRate
      };
      this.clusters.set(newCluster.id, newCluster);
      pattern.clusterId = newCluster.id;
    }
  }

  // Hash string to number
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash % 1000) / 1000;
  }

  // Calculate Euclidean distance
  private calculateDistance(a: number[], b: number[]): number {
    const len = Math.max(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const ai = a[i] || 0;
      const bi = b[i] || 0;
      sum += Math.pow(ai - bi, 2);
    }
    return Math.sqrt(sum);
  }

  // Update centroid with new pattern
  private updateCentroid(centroid: number[], features: number[]): number[] {
    const len = Math.max(centroid.length, features.length);
    const newCentroid: number[] = [];
    for (let i = 0; i < len; i++) {
      newCentroid.push((centroid[i] || 0 + features[i] || 0) / 2);
    }
    return newCentroid;
  }

  // Update pattern sequences
  private updateSequences(pattern: Pattern, data: LearningData): void {
    const sequenceKey = data.action;
    let sequence = this.sequences.get(sequenceKey);

    if (!sequence) {
      sequence = {
        id: `seq-${uuidv4()}`,
        patterns: [pattern.id],
        frequency: 1,
        successRate: pattern.successRate,
        transitions: new Map()
      };
      this.sequences.set(sequenceKey, sequence);
    } else {
      sequence.patterns.push(pattern.id);
      sequence.frequency++;
      sequence.successRate = (sequence.successRate * (sequence.frequency - 1) + pattern.successRate) / sequence.frequency;
    }

    // Update transitions
    const outcome = data.outcome;
    const currentTransitions = sequence.transitions.get(outcome) || 0;
    sequence.transitions.set(outcome, currentTransitions + 1);
  }

  // Get pattern by ID
  getPattern(id: string): Pattern | undefined {
    return this.patterns.get(id);
  }

  // Get all patterns with filtering
  getPatterns(filters?: {
    type?: PatternType;
    minConfidence?: number;
    clusterId?: string;
  }): Pattern[] {
    let result = Array.from(this.patterns.values());

    if (filters?.type) {
      result = result.filter(p => p.type === filters.type);
    }
    if (filters?.minConfidence !== undefined) {
      result = result.filter(p => p.confidence >= filters.minConfidence!);
    }
    if (filters?.clusterId) {
      result = result.filter(p => p.clusterId === filters.clusterId);
    }

    return result.sort((a, b) => b.confidence - a.confidence);
  }

  // Get pattern insights
  getPatternInsights(patternId: string): PatternInsights | null {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    const similarPatterns = this.findSimilarPatterns(pattern);
    const usageHistory = this.calculateUsageHistory(patternId);
    const performanceMetrics = this.calculatePerformanceMetrics(patternId);

    return {
      pattern,
      similarPatterns,
      usageHistory,
      performanceMetrics,
      recommendations: this.generatePatternRecommendations(pattern)
    };
  }

  // Find similar patterns
  private findSimilarPatterns(pattern: Pattern, limit: number = 5): Pattern[] {
    if (!pattern.features) return [];

    return Array.from(this.patterns.values())
      .filter(p => p.id !== pattern.id && p.features)
      .map(p => ({
        pattern: p,
        distance: this.calculateDistance(pattern.features!, p.features!)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(item => item.pattern);
  }

  // Calculate usage history
  private calculateUsageHistory(patternId: string): { date: string; count: number; successRate: number }[] {
    const history: { date: string; count: number; successRate: number }[] = [];
    const pattern = this.patterns.get(patternId);

    if (!pattern) return history;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = Array.from(this.learningData.values()).flat()
        .filter(d => d.timestamp.startsWith(dateStr) && d.action === pattern.triggers[0]);

      const count = dayData.length;
      const successes = dayData.filter(d => d.outcome === 'success').length;
      const successRate = count > 0 ? (successes / count) * 100 : 0;

      history.push({ date: dateStr, count, successRate });
    }

    return history;
  }

  // Calculate performance metrics
  private calculatePerformanceMetrics(patternId: string): {
    averageReward: number;
    winRate: number;
    riskScore: number;
  } {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return { averageReward: 0, winRate: 0, riskScore: 0 };

    const relatedData = Array.from(this.learningData.values()).flat()
      .filter(d => d.action === pattern.triggers[0]);

    const rewards = relatedData.map(d => d.reward || 0);
    const averageReward = rewards.length > 0 ? rewards.reduce((a, b) => a + b, 0) / rewards.length : 0;

    const successes = relatedData.filter(d => d.outcome === 'success').length;
    const winRate = relatedData.length > 0 ? (successes / relatedData.length) * 100 : 0;

    const variance = rewards.length > 0
      ? rewards.reduce((sum, r) => sum + Math.pow(r - averageReward, 2), 0) / rewards.length
      : 0;
    const riskScore = Math.sqrt(variance);

    return { averageReward, winRate, riskScore };
  }

  // Generate recommendations based on pattern
  private generatePatternRecommendations(pattern: Pattern): string[] {
    const recommendations: string[] = [];

    if (pattern.confidence < 0.5) {
      recommendations.push('Collect more data to increase confidence in this pattern');
    }

    if (pattern.type === 'success' && pattern.successRate > 80) {
      recommendations.push('This pattern shows high success rate - consider automating');
    }

    if (pattern.type === 'failure' && pattern.frequency > 10) {
      recommendations.push('Frequent failures detected - investigate root causes');
    }

    if (pattern.clusterId) {
      const cluster = this.clusters.get(pattern.clusterId);
      if (cluster && cluster.size > 5) {
        recommendations.push(`This pattern belongs to a cluster of ${cluster.size} patterns`);
      }
    }

    return recommendations;
  }

  // Detect emerging patterns
  detectEmergingPatterns(timeWindow: number = 7): Pattern[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeWindow);

    const recentPatterns = Array.from(this.patterns.values())
      .filter(p => new Date(p.lastObserved) >= cutoff);

    return recentPatterns
      .filter(p => {
        const historicalRate = this.getHistoricalSuccessRate(p.triggers[0]);
        return Math.abs(p.successRate - historicalRate) > 20;
      })
      .sort((a, b) => Math.abs(b.successRate - this.getHistoricalSuccessRate(b.triggers[0])) -
                      Math.abs(a.successRate - this.getHistoricalSuccessRate(a.triggers[0])));
  }

  // Get historical success rate
  private getHistoricalSuccessRate(action: string): number {
    const allData = Array.from(this.learningData.values()).flat()
      .filter(d => d.action === action);

    if (allData.length === 0) return 50;

    const successes = allData.filter(d => d.outcome === 'success').length;
    return (successes / allData.length) * 100;
  }

  // Update pattern from external learning data
  updatePatternFromData(data: LearningData): void {
    const key = `${data.action}-${data.outcome}`;
    let pattern = Array.from(this.patterns.values()).find(p => p.triggers.includes(data.action));

    if (!pattern) {
      this.learnPattern(data);
      return;
    }

    pattern.frequency++;
    pattern.lastObserved = data.timestamp;
    pattern.confidence = Math.min(1, pattern.frequency / 10);

    if (data.outcome === 'success') {
      pattern.successRate = (pattern.successRate * 0.9) + 10;
    } else if (data.outcome === 'failure') {
      pattern.successRate = (pattern.successRate * 0.9) + 0;
    }

    this.patterns.set(pattern.id, pattern);
    this.storeLearningData(data);
  }

  // Get cluster information
  getClusters(): PatternCluster[] {
    return Array.from(this.clusters.values());
  }

  // Get sequences
  getSequences(): PatternSequence[] {
    return Array.from(this.sequences.values());
  }

  // Export patterns for model training
  exportPatternsForTraining(): { features: number[][]; labels: number[] } {
    const patterns = this.getPatterns({ minConfidence: 0.3 });

    return {
      features: patterns.map(p => p.features || []),
      labels: patterns.map(p => p.type === 'success' ? 1 : (p.type === 'failure' ? -1 : 0))
    };
  }

  // Clear all patterns
  clearPatterns(): void {
    this.patterns.clear();
    this.learningData.clear();
    this.clusters.clear();
    this.sequences.clear();
  }

  // Get statistics
  getStatistics(): {
    totalPatterns: number;
    totalLearningData: number;
    clusters: number;
    sequences: number;
    avgConfidence: number;
    avgSuccessRate: number;
  } {
    const allPatterns = Array.from(this.patterns.values());
    const allData = Array.from(this.learningData.values()).flat();

    return {
      totalPatterns: allPatterns.length,
      totalLearningData: allData.length,
      clusters: this.clusters.size,
      sequences: this.sequences.size,
      avgConfidence: allPatterns.length > 0
        ? allPatterns.reduce((sum, p) => sum + p.confidence, 0) / allPatterns.length
        : 0,
      avgSuccessRate: allPatterns.length > 0
        ? allPatterns.reduce((sum, p) => sum + p.successRate, 0) / allPatterns.length
        : 0
    };
  }
}

export const patternRecognitionService = new PatternRecognitionService();
export default patternRecognitionService;
