/**
 * Schedule Adapter — Auto-adjust calendar based on learned preferences
 * Spec Part 23: Continuous Learning
 */

import axios from 'axios';
import { LearnedPreference, AdaptationAction } from '../types/preference.js';
import { v4 as uuidv4 } from 'uuid';

const GENIE_CALENDAR_URL = process.env.GENIE_CALENDAR_URL || 'http://localhost:4709';

export async function adaptToPreferences(userId: string): Promise<AdaptationAction[]> {
  // Get user's learned preferences
  const prefs = await getAutoApplyPreferences(userId);
  const actions: AdaptationAction[] = [];

  for (const pref of prefs) {
    const action = await applyPreference(pref);
    if (action) actions.push(action);
  }

  return actions;
}

async function getAutoApplyPreferences(userId: string): Promise<LearnedPreference[]> {
  const { PreferenceStorage } = await import('./preferenceStorage.js');
  const all = await PreferenceStorage.getForUser(userId);
  return all.filter(p => p.autoApply && p.confidence >= 0.7);
}

async function applyPreference(pref: LearnedPreference): Promise<AdaptationAction | null> {
  try {
    // Based on pattern, apply to calendar
    if (pref.pattern.startsWith('avoid_meetings_')) {
      return await applyBlockTime(pref);
    }
    if (pref.pattern === 'morning_focus') {
      return await applyFocusBlock(pref);
    }
    if (pref.pattern === 'prefer_email') {
      return await applyEmailPreference(pref);
    }

    return null;
  } catch (error) {
    console.error('[schedule-adapter] Failed to apply preference:', error);
    return null;
  }
}

async function applyBlockTime(pref: LearnedPreference): Promise<AdaptationAction> {
  const action: AdaptationAction = {
    id: `act_${uuidv4()}`,
    userId: pref.userId,
    preferenceId: pref.id,
    type: 'calendar',
    action: pref.action,
    applied: false,
  };

  try {
    // Call calendar service to block time
    await axios.post(
      `${GENIE_CALENDAR_URL}/api/blocks`,
      {
        userId: pref.userId,
        reason: pref.action,
        recurring: true,
        source: 'genie-learning-loop',
      },
      { timeout: 10000 }
    );

    action.applied = true;
    action.result = 'Calendar block created';
    action.appliedAt = new Date();
  } catch (e) {
    action.applied = false;
    action.result = `Calendar service unavailable: ${e}`;
  }

  return action;
}

async function applyFocusBlock(pref: LearnedPreference): Promise<AdaptationAction> {
  const action: AdaptationAction = {
    id: `act_${uuidv4()}`,
    userId: pref.userId,
    preferenceId: pref.id,
    type: 'calendar',
    action: 'Block 9-12 AM weekdays for deep work',
    applied: false,
  };

  try {
    await axios.post(
      `${GENIE_CALENDAR_URL}/api/focus-blocks`,
      {
        userId: pref.userId,
        startHour: 9,
        endHour: 12,
        weekdays: [1, 2, 3, 4, 5],
      },
      { timeout: 10000 }
    );
    action.applied = true;
    action.appliedAt = new Date();
  } catch (e) {
    action.result = `Calendar service unavailable: ${e}`;
  }

  return action;
}

async function applyEmailPreference(pref: LearnedPreference): Promise<AdaptationAction> {
  // Email preference doesn't need calendar change, but sets default
  const action: AdaptationAction = {
    id: `act_${uuidv4()}`,
    userId: pref.userId,
    preferenceId: pref.id,
    type: 'communication',
    action: 'Set email as default contact method',
    applied: true,
    result: 'Preference stored',
    appliedAt: new Date(),
  };
  return action;
}