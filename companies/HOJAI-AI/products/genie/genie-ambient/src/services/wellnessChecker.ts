/**
 * Wellness Checker — Detect wellness signals
 * Spec Part 25: Ambient Intelligence
 */

import { v4 as uuidv4 } from 'uuid';
import { AmbientSignals, AmbientAlert } from '../types/alert.js';

export async function checkWellness(signals: AmbientSignals): Promise<AmbientAlert[]> {
  const alerts: AmbientAlert[] = [];

  // Sleep-based alerts
  if (signals.sleep) {
    if (signals.sleep.hours < 6) {
      alerts.push({
        id: `alert_${uuidv4()}`,
        userId: signals.userId,
        type: 'wellness',
        severity: 'urgent',
        title: 'You look tired',
        message: `You slept only ${signals.sleep.hours} hours. Consider moving non-critical meetings.`,
        reason: `Sleep: ${signals.sleep.hours} hours, quality: ${signals.sleep.quality}`,
        actions: [
          { id: 'act_1', label: 'Move meetings', type: 'move' },
          { id: 'act_2', label: 'Take rest', type: 'rest' },
          { id: 'act_3', label: 'Dismiss', type: 'dismiss' },
        ],
        data: signals.sleep,
        dismissed: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      });
    } else if (signals.sleep.trend === 'declining') {
      alerts.push({
        id: `alert_${uuidv4()}`,
        userId: signals.userId,
        type: 'wellness',
        severity: 'gentle',
        title: 'Sleep pattern declining',
        message: 'Your sleep has been worse this week. Want to set a bedtime reminder?',
        reason: 'Sleep trend: declining',
        actions: [
          { id: 'act_1', label: 'Set bedtime', type: 'schedule' },
          { id: 'act_2', label: 'Dismiss', type: 'dismiss' },
        ],
        data: signals.sleep,
        dismissed: false,
        createdAt: new Date(),
      });
    }
  }

  // Calendar overload alerts
  if (signals.calendar) {
    if (signals.calendar.meetingsToday >= 8) {
      alerts.push({
        id: `alert_${uuidv4()}`,
        userId: signals.userId,
        type: 'work',
        severity: 'urgent',
        title: 'Meeting overload',
        message: `You have ${signals.calendar.meetingsToday} meetings today. No time for deep work.`,
        reason: `${signals.calendar.meetingsToday} meetings scheduled`,
        actions: [
          { id: 'act_1', label: 'Decline some', type: 'move' },
          { id: 'act_2', label: 'Block focus time', type: 'schedule' },
          { id: 'act_3', label: 'Dismiss', type: 'dismiss' },
        ],
        data: signals.calendar,
        dismissed: false,
        createdAt: new Date(),
      });
    }

    if (signals.calendar.overdueTasks >= 3) {
      alerts.push({
        id: `alert_${uuidv4()}`,
        userId: signals.userId,
        type: 'work',
        severity: 'gentle',
        title: `${signals.calendar.overdueTasks} overdue tasks`,
        message: 'You have pending tasks. Want to review them?',
        reason: `${signals.calendar.overdueTasks} tasks overdue`,
        actions: [
          { id: 'act_1', label: 'Review tasks', type: 'schedule' },
          { id: 'act_2', label: 'Dismiss', type: 'dismiss' },
        ],
        data: { overdueCount: signals.calendar.overdueTasks },
        dismissed: false,
        createdAt: new Date(),
      });
    }
  }

  // Work-blocked alerts
  if (signals.work && signals.work.blockedItems >= 3) {
    alerts.push({
      id: `alert_${uuidv4()}`,
      userId: signals.userId,
      type: 'work',
      severity: 'gentle',
      title: `${signals.work.blockedItems} items blocked`,
      message: 'Multiple items are blocked. Want to triage?',
      reason: `${signals.work.blockedItems} blocked items`,
      actions: [
        { id: 'act_1', label: 'Triage now', type: 'schedule' },
        { id: 'act_2', label: 'Dismiss', type: 'dismiss' },
      ],
      data: { blockedCount: signals.work.blockedItems },
      dismissed: false,
      createdAt: new Date(),
    });
  }

  return alerts;
}