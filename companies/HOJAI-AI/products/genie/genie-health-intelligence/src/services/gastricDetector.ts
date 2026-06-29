/**
 * Gastric Trigger Detector — Find food → symptom correlations
 * Spec Part 28: Health Intelligence
 */

import axios from 'axios';
import { FoodLog, GastricTrigger, HealthInsight } from '../types/health.js';

const GENIE_WELLNESS_URL = process.env.GENIE_WELLNESS_URL || 'http://localhost:4723';

export async function detectGastricTriggers(userId: string, days: number = 60): Promise<{
  triggers: GastricTrigger[];
  insight: HealthInsight;
}> {
  const logs = await fetchFoodLogs(userId, days);

  if (logs.length < 10) {
    return {
      triggers: [],
      insight: {
        type: 'food',
        severity: 'info',
        title: 'Not enough food data',
        description: 'Log food for at least 10 days',
        patterns: [],
        recommendations: ['Track meals daily'],
        confidence: 0,
      },
    };
  }

  // Find correlations: food → symptoms
  const triggerMap = new Map<string, GastricTrigger>();

  for (const log of logs) {
    if (!log.symptoms || log.symptoms.length === 0) continue;
    if (!log.reaction || log.reaction === 'none') continue;

    for (const symptom of log.symptoms) {
      const key = `${log.food.toLowerCase()}:${symptom.toLowerCase()}`;
      const existing = triggerMap.get(key);
      if (existing) {
        existing.occurrences++;
      } else {
        triggerMap.set(key, {
          food: log.food,
          symptom,
          correlation: 0,
          occurrences: 1,
          timeOfDay: log.mealType,
        });
      }
    }
  }

  // Calculate correlation (occurrences / total logs with this food)
  const foodCounts = new Map<string, number>();
  for (const log of logs) {
    const food = log.food.toLowerCase();
    foodCounts.set(food, (foodCounts.get(food) || 0) + 1);
  }

  const triggers = Array.from(triggerMap.values()).map(t => {
    const totalFoodOccurrences = foodCounts.get(t.food.toLowerCase()) || 1;
    t.correlation = t.occurrences / totalFoodOccurrences;
    return t;
  });

  // Sort by correlation
  triggers.sort((a, b) => b.correlation - a.correlation);

  // Generate insight
  const significantTriggers = triggers.filter(t => t.correlation >= 0.3 && t.occurrences >= 2);
  const severity: 'info' | 'warning' | 'alert' =
    significantTriggers.length >= 3 ? 'alert' :
    significantTriggers.length >= 1 ? 'warning' : 'info';

  const patterns: string[] = significantTriggers.slice(0, 5).map(t =>
    `${t.food} → ${t.symptom} (${Math.round(t.correlation * 100)}% correlation)`
  );

  const recommendations = [
    'Avoid high-correlation trigger foods',
    'Keep a food-symptom diary',
    'Consider elimination diet for top triggers',
  ];

  const insight: HealthInsight = {
    type: 'food',
    severity,
    title: significantTriggers.length > 0
      ? `${significantTriggers.length} food trigger${significantTriggers.length > 1 ? 's' : ''} detected`
      : 'No significant food triggers',
    description: `Analyzed ${logs.length} food logs over ${days} days`,
    patterns,
    recommendations,
    confidence: 0.75,
  };

  return { triggers: significantTriggers.slice(0, 10), insight };
}

async function fetchFoodLogs(userId: string, days: number): Promise<FoodLog[]> {
  try {
    const response = await axios.get(
      `${GENIE_WELLNESS_URL}/api/food/logs/${userId}`,
      { params: { days }, timeout: 10000 }
    );
    return response.data?.data || response.data || [];
  } catch {
    return [];
  }
}