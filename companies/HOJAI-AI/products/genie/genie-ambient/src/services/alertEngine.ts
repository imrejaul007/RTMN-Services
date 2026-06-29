/**
 * Alert Engine — Aggregate alerts from all checkers
 * Spec Part 25: Ambient Intelligence
 */

import { v4 as uuidv4 } from 'uuid';
import { AmbientSignals, AmbientAlert } from '../types/alert.js';
import { checkWellness } from './wellnessChecker.js';
import { checkRelationships } from './relationshipChecker.js';

export async function generateAlerts(signals: AmbientSignals): Promise<AmbientAlert[]> {
  // Run all checkers in parallel
  const [wellnessAlerts, relationshipAlerts] = await Promise.all([
    checkWellness(signals),
    checkRelationships(signals),
  ]);

  // Add mindfulness reminder based on time of day
  const mindfulnessAlerts = generateMindfulnessReminders(signals);

  const allAlerts = [...wellnessAlerts, ...relationshipAlerts, ...mindfulnessAlerts];

  // Sort by severity (urgent > gentle > info)
  return allAlerts.sort((a, b) => {
    const sev = { urgent: 3, gentle: 2, info: 1 };
    return sev[b.severity] - sev[a.severity];
  });
}

function generateMindfulnessReminders(signals: AmbientSignals): AmbientAlert[] {
  const alerts: AmbientAlert[] = [];
  const hour = new Date().getHours();

  // Lunch reminder
  if (hour === 12 || hour === 13) {
    alerts.push({
      id: `alert_${uuidv4()}`,
      userId: signals.userId,
      type: 'mindfulness',
      severity: 'info',
      title: 'Lunch break',
      message: 'Have you eaten? Take a real break.',
      reason: 'Time-based reminder',
      actions: [
        { id: 'act_1', label: 'Set lunch', type: 'rest' },
        { id: 'act_2', label: 'Dismiss', type: 'dismiss' },
      ],
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // Hydration reminder
  if (hour % 2 === 0) {
    alerts.push({
      id: `alert_${uuidv4()}`,
      userId: signals.userId,
      type: 'health',
      severity: 'info',
      title: 'Drink water',
      message: 'Stay hydrated — have you had water recently?',
      reason: '2-hour hydration check',
      actions: [
        { id: 'act_1', label: 'Dismiss', type: 'dismiss' },
      ],
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // End of day reflection
  if (hour === 18 || hour === 19) {
    alerts.push({
      id: `alert_${uuidv4()}`,
      userId: signals.userId,
      type: 'mindfulness',
      severity: 'gentle',
      title: 'End of day',
      message: 'How was your day? Take 2 minutes to reflect.',
      reason: 'Evening reflection',
      actions: [
        { id: 'act_1', label: 'Reflect', type: 'schedule' },
        { id: 'act_2', label: 'Dismiss', type: 'dismiss' },
      ],
      dismissed: false,
      createdAt: new Date(),
    });
  }

  return alerts;
}