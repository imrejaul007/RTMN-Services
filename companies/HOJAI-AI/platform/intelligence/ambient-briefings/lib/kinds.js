/**
 * Ambient Briefings — pure helpers for kind definitions, time math, and
 * message composition templates.
 *
 * Kinds:
 *   - mid-day      (1pm local): "What's left today?"
 *   - evening      (7pm local): "How did today go?"
 *   - weekend-prep (Fri 6pm):   "What does your weekend look like?"
 *   - weekly-recap (Sun 8pm):   "How was your week?"
 *   - monthly      (1st of month): "The month in review"
 *
 * Each kind has a default hour (local), a tone, and a default message template.
 */

/**
 * Determine which briefing kind should fire for a given local hour + weekday.
 * @param {number} hour    0-23 local hour
 * @param {number} weekday 0-6 (Sun=0)
 * @returns {string|null}  'mid-day' | 'evening' | 'weekend-prep' | 'weekly-recap' | null
 */
export function kindFor(hour, weekday) {
  // Fri 6pm-ish → weekend prep
  if (weekday === 5 && hour >= 17 && hour < 20) return 'weekend-prep';
  // Sun 7-9pm → weekly recap
  if (weekday === 0 && hour >= 19 && hour < 22) return 'weekly-recap';
  // 12-2pm → mid-day
  if (hour >= 12 && hour < 14) return 'mid-day';
  // 6-8pm → evening recap
  if (hour >= 18 && hour < 21) return 'evening';
  return null;
}

export const KINDS = {
  'mid-day': {
    label: 'Mid-day check-in',
    tone: 'casual',
    icon: '☀️',
    greeting: 'Quick check-in',
    promptHint: 'What does the rest of today look like for {userName}? Highlight anything time-sensitive.',
  },
  'evening': {
    label: 'Evening recap',
    tone: 'reflective',
    icon: '🌙',
    greeting: 'Wrapping up',
    promptHint: 'How did today go for {userName}? Acknowledge progress, note what carried over.',
  },
  'weekend-prep': {
    label: 'Weekend preview',
    tone: 'casual',
    icon: '🎉',
    greeting: 'Weekend is close',
    promptHint: "What's {userName}'s weekend looking like? Plans, errands, rest?",
  },
  'weekly-recap': {
    label: 'Weekly recap',
    tone: 'reflective',
    icon: '📅',
    greeting: 'Week in review',
    promptHint: 'How was {userName}\'s week? What got done, what got dropped?',
  },
  'monthly': {
    label: 'Monthly review',
    tone: 'reflective',
    icon: '🗓️',
    greeting: 'Month in review',
    promptHint: 'Reflect on {userName}\'s month. Patterns, growth, what to focus on next month.',
  },
};

export function describeKind(kind) {
  return KINDS[kind] || null;
}

/**
 * Determine if a brief has been sent today for a user+kind.
 * Looks at a small in-memory log; for production this would be a DB.
 */
export function alreadySentToday(log, userId, kind, todayIso) {
  const last = log[`${userId}:${kind}`];
  return last === todayIso;
}

export function markSent(log, userId, kind, todayIso) {
  log[`${userId}:${kind}`] = todayIso;
}

/**
 * Compose the fallback (non-LLM) message for a kind, given sections.
 * Sections may be partial; missing sections are skipped silently.
 */
export function fallbackMessage(kind, sections, userName = 'friend') {
  const meta = KINDS[kind];
  if (!meta) return '';
  const lines = [`${meta.icon} ${meta.greeting}, ${userName}.`];
  if (sections?.calendar?.summary) lines.push(`📅 ${sections.calendar.summary}`);
  if (sections?.goals?.summary)   lines.push(`🎯 ${sections.goals.summary}`);
  if (sections?.relationships?.summary) lines.push(`💌 ${sections.relationships.summary}`);
  if (sections?.piScore?.summary) lines.push(`🌱 ${sections.piScore.summary}`);
  if (sections?.learning?.summary) lines.push(`🧠 ${sections.learning.summary}`);
  return lines.join('\n');
}