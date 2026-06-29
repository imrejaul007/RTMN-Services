/**
 * Relationship Checker — Detect relationship gaps
 * Spec Part 25: Ambient Intelligence
 */

import { v4 as uuidv4 } from 'uuid';
import { AmbientSignals, AmbientAlert } from '../types/alert.js';

const IMPORTANT_CONTACTS = ['mother', 'father', 'mom', 'dad', 'wife', 'husband', 'partner', 'best friend'];

export async function checkRelationships(signals: AmbientSignals): Promise<AmbientAlert[]> {
  const alerts: AmbientAlert[] = [];

  if (!signals.relationships) return alerts;

  // Long contact gap with important people
  const longest = signals.relationships.longestContactGap;
  if (longest && longest.days > 14) {
    const isImportant = IMPORTANT_CONTACTS.some(c =>
      longest.personName.toLowerCase().includes(c)
    );

    if (isImportant && longest.days > 14) {
      const severity = longest.days > 30 ? 'urgent' : 'gentle';

      alerts.push({
        id: `alert_${uuidv4()}`,
        userId: signals.userId,
        type: 'relationship',
        severity,
        title: `Haven't talked to ${longest.personName}`,
        message: `It's been ${longest.days} days. Want to call now?`,
        reason: `Contact gap: ${longest.days} days`,
        actions: [
          { id: 'act_1', label: 'Call now', type: 'call' },
          { id: 'act_2', label: 'Schedule call', type: 'schedule' },
          { id: 'act_3', label: 'Send message', type: 'call' },
          { id: 'act_4', label: 'Dismiss', type: 'dismiss' },
        ],
        data: longest,
        dismissed: false,
        createdAt: new Date(),
      });
    }
  }

  return alerts;
}