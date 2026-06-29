/**
 * Sleep Optimizer — Analyze sleep patterns
 * Spec Part 28: Health Intelligence
 */

import axios from 'axios';
import { SleepLog, HealthInsight } from '../types/health.js';

const GENIE_WELLNESS_URL = process.env.GENIE_WELLNESS_URL || 'http://localhost:4723';

export async function analyzeSleep(userId: string, days: number = 30): Promise<HealthInsight> {
  const logs = await fetchSleepLogs(userId, days);

  if (logs.length < 5) {
    return {
      type: 'sleep',
      severity: 'info',
      title: 'Not enough sleep data',
      description: 'Log sleep for at least 5 days for insights',
      patterns: [],
      recommendations: ['Track sleep daily'],
      confidence: 0,
    };
  }

  const avgHours = logs.reduce((sum, l) => sum + l.hours, 0) / logs.length;
  const poorNights = logs.filter(l => l.quality === 'poor').length;
  const poorRate = poorNights / logs.length;

  const patterns: string[] = [];
  const recommendations: string[] = [];
  let severity: 'info' | 'warning' | 'alert' = 'info';
  let confidence = 0.7;

  // Analyze average sleep
  if (avgHours < 6) {
    patterns.push(`Average sleep: ${avgHours.toFixed(1)} hours (below 6)`);
    severity = 'alert';
    recommendations.push('Aim for 7-8 hours per night');
    recommendations.push('Set consistent bedtime');
  } else if (avgHours < 7) {
    patterns.push(`Average sleep: ${avgHours.toFixed(1)} hours (slightly low)`);
    severity = 'warning';
    recommendations.push('Try to increase to 7+ hours');
  } else {
    patterns.push(`Average sleep: ${avgHours.toFixed(1)} hours (good)`);
  }

  // Analyze quality
  if (poorRate > 0.3) {
    patterns.push(`${Math.round(poorRate * 100)}% of nights are poor quality`);
    if (severity === 'info') severity = 'warning';
    recommendations.push('Review what affects sleep quality');
    confidence = 0.8;
  }

  // Analyze trend
  const recentHalf = logs.slice(0, Math.floor(logs.length / 2));
  const olderHalf = logs.slice(Math.floor(logs.length / 2));
  const recentAvg = recentHalf.reduce((sum, l) => sum + l.hours, 0) / recentHalf.length;
  const olderAvg = olderHalf.reduce((sum, l) => sum + l.hours, 0) / olderHalf.length;

  if (recentAvg < olderAvg - 0.5) {
    patterns.push('Sleep hours declining');
    severity = severity === 'info' ? 'warning' : severity;
    recommendations.push('Identify recent changes affecting sleep');
  } else if (recentAvg > olderAvg + 0.5) {
    patterns.push('Sleep hours improving');
  }

  return {
    type: 'sleep',
    severity,
    title: avgHours >= 7 && poorRate < 0.2 ? 'Sleep looks good' : 'Sleep needs attention',
    description: `Based on ${logs.length} nights`,
    patterns,
    recommendations,
    confidence,
  };
}

async function fetchSleepLogs(userId: string, days: number): Promise<SleepLog[]> {
  try {
    const response = await axios.get(
      `${GENIE_WELLNESS_URL}/api/sleep/logs/${userId}`,
      { params: { days }, timeout: 10000 }
    );
    return response.data?.data || response.data || [];
  } catch {
    return [];
  }
}