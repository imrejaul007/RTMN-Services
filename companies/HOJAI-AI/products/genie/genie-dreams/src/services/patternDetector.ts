/**
 * Pattern Detector — Find recurring themes in dreams
 * Spec Part 33: Dream Journal
 */

import { Dream, DreamPattern, DreamInsight } from '../types/dream.js';
import { DreamCapture } from './dreamCapture.js';

export async function detectPatterns(userId: string): Promise<DreamInsight[]> {
  const dreams = await DreamCapture.getHistory(userId, 100);

  if (dreams.length < 3) {
    return [{
      type: 'recurring',
      title: 'Not enough data',
      description: 'Log at least 3 dreams to see patterns',
      patterns: [],
      interpretation: 'Continue logging dreams to enable pattern analysis',
      confidence: 0,
    }];
  }

  const insights: DreamInsight[] = [];

  // Recurring symbols
  const symbolCounts = new Map<string, Dream[]>();
  for (const dream of dreams) {
    if (!dream.symbols) continue;
    for (const symbol of dream.symbols) {
      if (!symbolCounts.has(symbol)) symbolCounts.set(symbol, []);
      symbolCounts.get(symbol)!.push(dream);
    }
  }

  const recurringSymbols = Array.from(symbolCounts.entries())
    .filter(([_, dreams]) => dreams.length >= 3)
    .map(([symbol, dreams]) => ({
      pattern: symbol,
      frequency: dreams.length,
      symbols: [symbol],
      emotions: extractCommon(dreams.flatMap(d => d.emotions || [])),
      occurrences: dreams.map(d => d.dreamDate),
    }));

  if (recurringSymbols.length > 0) {
    insights.push({
      type: 'recurring',
      title: 'Recurring symbols in your dreams',
      description: `${recurringSymbols.length} symbols appear repeatedly in your dreams`,
      patterns: recurringSymbols,
      interpretation: 'Recurring symbols often reflect ongoing concerns or themes in your waking life.',
      confidence: 0.8,
    });
  }

  // Dominant emotions
  const emotionCounts = new Map<string, number>();
  for (const dream of dreams) {
    if (!dream.emotions) continue;
    for (const emotion of dream.emotions) {
      emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
    }
  }

  const topEmotion = Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (topEmotion && topEmotion[1] >= 3) {
    insights.push({
      type: 'emotional',
      title: `Dominant emotion: ${topEmotion[0]}`,
      description: `"${topEmotion[0]}" appears in ${topEmotion[1]} of your dreams`,
      patterns: [],
      interpretation: `Your subconscious is processing ${topEmotion[0]} emotions frequently. This may indicate something in your waking life needs attention.`,
      confidence: 0.7,
    });
  }

  // Recurring people
  const peopleCounts = new Map<string, number>();
  for (const dream of dreams) {
    if (!dream.people) continue;
    for (const person of dream.people) {
      peopleCounts.set(person, (peopleCounts.get(person) || 0) + 1);
    }
  }

  const topPerson = Array.from(peopleCounts.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])[0];

  if (topPerson) {
    insights.push({
      type: 'person',
      title: `${topPerson[0]} appears frequently in dreams`,
      description: `${topPerson[1]} dreams feature this person`,
      patterns: [],
      interpretation: `This person is significant in your subconscious processing. Consider what role they play in your waking life.`,
      confidence: 0.75,
    });
  }

  return insights;
}

function extractCommon<T>(arr: T[]): T[] {
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([_, count]) => count >= 2)
    .map(([item]) => item);
}