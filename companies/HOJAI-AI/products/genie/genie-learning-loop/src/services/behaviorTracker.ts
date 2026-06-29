/**
 * Behavior Tracker — Track patterns over time
 * Spec Part 23: Continuous Learning
 */

import { v4 as uuidv4 } from 'uuid';
import { BehaviorPattern } from '../types/preference.js';

interface BehaviorObservation {
  userId: string;
  action: string;       // What user did
  timestamp: Date;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: string;
  context?: string;
}

// In-memory storage for behavior patterns (production: Redis)
const patterns: Map<string, BehaviorPattern[]> = new Map();

export async function observeBehavior(obs: BehaviorObservation): Promise<void> {
  // Detect patterns from observation
  const pattern = detectPattern(obs);
  if (!pattern) return;

  const userId = obs.userId;
  const userPatterns = patterns.get(userId) || [];

  // Check if pattern exists
  const existing = userPatterns.find(p => p.pattern === pattern.pattern);
  if (existing) {
    existing.occurrences++;
    existing.confidence = Math.min(1, existing.confidence + 0.05);
    existing.observedTo = obs.timestamp;
  } else {
    userPatterns.push({
      id: `pat_${uuidv4()}`,
      userId,
      pattern: pattern.pattern,
      occurrences: 1,
      timeOfDay: obs.timeOfDay,
      dayOfWeek: obs.dayOfWeek,
      description: pattern.description,
      suggestedAction: pattern.suggestedAction,
      confidence: 0.5,
      observedFrom: obs.timestamp,
      observedTo: obs.timestamp,
    });
    patterns.set(userId, userPatterns);
  }
}

export async function getBehaviorPatterns(userId: string): Promise<BehaviorPattern[]> {
  return patterns.get(userId) || [];
}

export async function getHighConfidencePatterns(userId: string, threshold = 0.7): Promise<BehaviorPattern[]> {
  const all = await getBehaviorPatterns(userId);
  return all.filter(p => p.confidence >= threshold);
}

function detectPattern(obs: BehaviorObservation): { pattern: string; description: string; suggestedAction?: string } | null {
  // Pattern: Working in morning
  if (obs.timeOfDay === 'morning' && obs.action.includes('work')) {
    return {
      pattern: 'morning_work_pattern',
      description: 'User prefers working in the morning',
      suggestedAction: 'Reserve mornings for deep work',
    };
  }

  // Pattern: Avoid late meetings
  if (obs.timeOfDay === 'evening' && obs.action.includes('meeting')) {
    return {
      pattern: 'late_meetings',
      description: 'User has meetings in the evening',
      suggestedAction: 'Consider rescheduling to afternoon',
    };
  }

  return null;
}