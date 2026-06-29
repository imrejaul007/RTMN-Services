/**
 * Schedule Optimizer — Find optimal meeting times
 * Spec Part 31: FocusOS
 */

import { FocusSession, OptimalTime, FocusInsight } from '../types/focus.js';
import { DeepWorkTracker } from './deepWorkTracker.js';

export async function findOptimalTimes(userId: string): Promise<OptimalTime[]> {
  const sessions = await DeepWorkTracker.getHistory(userId, 60);

  if (sessions.length < 5) {
    return getDefaultOptimalTimes();
  }

  // Analyze quality by hour and day of week
  const grid: Record<string, { total: number; quality: number; count: number }> = {};

  for (const session of sessions) {
    if (!session.durationMinutes || session.durationMinutes < 15) continue;

    const hour = new Date(session.startTime).getHours();
    const dow = new Date(session.startTime).getDay();
    const key = `${dow}-${hour}`;

    if (!grid[key]) grid[key] = { total: 0, quality: 0, count: 0 };
    grid[key].count++;
    grid[key].total += session.durationMinutes;

    const qualityScore = { excellent: 4, good: 3, fair: 2, poor: 1 }[session.quality] || 2;
    grid[key].quality += qualityScore;
  }

  // Build optimal times list
  const optimalTimes: OptimalTime[] = Object.entries(grid)
    .map(([key, data]) => {
      const [dow, hour] = key.split('-').map(Number);
      const avgQuality = data.quality / data.count;
      const totalMinutes = data.total;

      return {
        hour,
        dayOfWeek: dow,
        quality: Math.round((avgQuality / 4) * 100),
        confidence: Math.min(1, data.count / 5),
      };
    })
    .filter(t => t.quality >= 60 && t.confidence >= 0.4)
    .sort((a, b) => b.quality - a.quality)
    .slice(0, 10);

  return optimalTimes.length > 0 ? optimalTimes : getDefaultOptimalTimes();
}

function getDefaultOptimalTimes(): OptimalTime[] {
  // If no data, suggest general best times
  return [
    { hour: 9, dayOfWeek: 1, quality: 85, confidence: 0.5 },    // Mon 9 AM
    { hour: 10, dayOfWeek: 2, quality: 80, confidence: 0.5 },   // Tue 10 AM
    { hour: 14, dayOfWeek: 3, quality: 75, confidence: 0.5 },  // Wed 2 PM
    { hour: 9, dayOfWeek: 4, quality: 82, confidence: 0.5 },    // Thu 9 AM
    { hour: 15, dayOfWeek: 5, quality: 70, confidence: 0.5 },   // Fri 3 PM
  ];
}

export async function generateInsights(userId: string): Promise<FocusInsight[]> {
  const insights: FocusInsight[] = [];

  const sessions = await DeepWorkTracker.getHistory(userId, 60);
  const stats = await DeepWorkTracker.getStats(userId, 60);

  if (sessions.length === 0) {
    return [{
      type: 'productivity_pattern',
      description: 'No focus data yet. Start tracking to see insights.',
      data: {},
      recommendations: ['Start a focus session today'],
    }];
  }

  // Best day insight
  const dayMap = new Map<number, number>();
  for (const s of sessions) {
    const dow = new Date(s.startTime).getDay();
    dayMap.set(dow, (dayMap.get(dow) || 0) + (s.durationMinutes || 0));
  }
  const bestDay = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0];
  if (bestDay) {
    insights.push({
      type: 'best_day',
      description: `Your most productive day is ${getDayName(bestDay[0])} (${bestDay[1]} minutes total)`,
      data: { dayOfWeek: bestDay[0], minutes: bestDay[1] },
      recommendations: [`Schedule important work on ${getDayName(bestDay[0])}s`],
    });
  }

  // Quality insight
  if (stats.avgQuality < 2.5) {
    insights.push({
      type: 'productivity_pattern',
      description: 'Focus quality is below average. Consider longer uninterrupted sessions.',
      data: { avgQuality: stats.avgQuality },
      recommendations: [
        'Try 90-minute focused work blocks',
        'Reduce interruptions by silencing notifications',
      ],
    });
  }

  // Interruption insight
  if (stats.totalInterruptions > stats.totalSessions * 3) {
    insights.push({
      type: 'interruption_source',
      description: `You had ${stats.totalInterruptions} interruptions across ${stats.totalSessions} sessions`,
      data: { totalInterruptions: stats.totalInterruptions },
      recommendations: [
        'Use Do Not Disturb mode',
        'Schedule specific times for email/messages',
        'Identify your biggest interruption source',
      ],
    });
  }

  return insights;
}

function getDayName(day: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
}