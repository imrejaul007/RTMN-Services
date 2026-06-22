/**
 * Proactive Detectors
 *
 * Each detector is a pure function that takes user data and returns
 * zero or more potential notifications. Detectors NEVER send notifications
 * themselves — they just propose. The runtime decides whether to fire based
 * on the user's preferences (opt-in, categories, quiet hours, daily caps).
 *
 * Categories:
 *   - time:      "You haven't called mom in 23 days"
 *   - anomaly:   "Your spending is 40% higher this week"
 *   - opportunity: "You have 2 free hours tomorrow afternoon"
 *   - milestone: "You're 5 days from your 90-day fitness goal"
 *   - birthday:  "Sarah's birthday is in 3 days"
 *
 * Each detector returns an array of candidates:
 *   { category, title, body, urgency, evidence }
 *
 * urgency is 1-5:
 *   1 = ambient (just FYI)
 *   3 = noteworthy
 *   5 = important (urgent)
 */

// ============================================================================
// TIME-BASED DETECTORS
// "You haven't done X in a while"
// ============================================================================
export function detectTimeBased({ userId, relationships = [], commitments = [] }) {
  const candidates = [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  for (const person of relationships) {
    const lastContact = person.lastContact ? new Date(person.lastContact).getTime() : 0;
    const daysSince = Math.floor((now - lastContact) / DAY);

    // Only flag if > 7 days, but cap at 90 (older than that is just abandoned)
    if (daysSince > 7 && daysSince < 90) {
      const avgInterval = person.avgContactInterval || 14;
      if (daysSince > avgInterval * 2) {
        candidates.push({
          category: 'time',
          title: `Reach out to ${person.name}?`,
          body: `It's been ${daysSince} days since you last connected. You usually reach out every ${avgInterval} days.`,
          urgency: daysSince > 30 ? 4 : 2,
          evidence: { type: 'relationship_overdue', personId: person.id, daysSince, avgInterval },
        });
      }
    }
  }

  // Check commitments (e.g. "call mom every Sunday" — has it been more than 7 days?)
  for (const c of commitments) {
    if (c.frequency === 'weekly' && c.lastDone) {
      const daysSince = Math.floor((now - new Date(c.lastDone).getTime()) / DAY);
      if (daysSince > 8) {
        candidates.push({
          category: 'time',
          title: `Commitment: ${c.title}`,
          body: `You said you'd do "${c.title}" weekly. It's been ${daysSince} days.`,
          urgency: 3,
          evidence: { type: 'commitment_overdue', commitmentId: c.id, daysSince },
        });
      }
    }
  }

  return candidates;
}

// ============================================================================
// ANOMALY DETECTORS
// "This is different from your baseline"
// ============================================================================
export function detectAnomalies({ userId, recentActivity = [], baseline = {} }) {
  const candidates = [];

  // Spending anomaly
  if (recentActivity.expenses && baseline.avgWeeklyExpenses) {
    const recentTotal = recentActivity.expenses.reduce((a, e) => a + (e.amount || 0), 0);
    const ratio = recentTotal / baseline.avgWeeklyExpenses;
    if (ratio > 1.4) {
      candidates.push({
        category: 'anomaly',
        title: 'Spending is up this week',
        body: `You spent ${Math.round(ratio * 100)}% of your usual weekly amount (${baseline.avgWeeklyExpenses.toFixed(0)} → ${recentTotal.toFixed(0)}). Want to look at it together?`,
        urgency: ratio > 2 ? 3 : 1,
        evidence: { type: 'spending_anomaly', ratio, baseline: baseline.avgWeeklyExpenses, actual: recentTotal },
      });
    }
  }

  // Sleep anomaly
  if (recentActivity.sleep && baseline.avgSleepHours) {
    const avgSleep = recentActivity.sleep.reduce((a, s) => a + (s.hours || 0), 0) / recentActivity.sleep.length;
    const diff = avgSleep - baseline.avgSleepHours;
    if (diff < -1.5) {
      candidates.push({
        category: 'anomaly',
        title: 'Sleep is off this week',
        body: `You've averaged ${avgSleep.toFixed(1)}h of sleep, ${Math.abs(diff).toFixed(1)}h below your usual ${baseline.avgSleepHours.toFixed(1)}h.`,
        urgency: 2,
        evidence: { type: 'sleep_anomaly', avgSleep, baseline: baseline.avgSleepHours },
      });
    }
  }

  // Mood anomaly
  if (recentActivity.mood && baseline.avgMood) {
    const avgMood = recentActivity.mood.reduce((a, m) => a + (m.score || 0), 0) / recentActivity.mood.length;
    const diff = avgMood - baseline.avgMood;
    if (diff < -0.8) {
      candidates.push({
        category: 'anomaly',
        title: 'Mood has been lower this week',
        body: `Your mood score averaged ${avgMood.toFixed(1)}, down from your usual ${baseline.avgMood.toFixed(1)}. Anything going on?`,
        urgency: 3,
        evidence: { type: 'mood_anomaly', avgMood, baseline: baseline.avgMood },
      });
    }
  }

  return candidates;
}

// ============================================================================
// OPPORTUNITY DETECTORS
// "You have time/resources available, here's something to use them on"
// ============================================================================
export function detectOpportunities({ userId, calendar = [], activeGoals = [], learningQueue = [] }) {
  const candidates = [];
  const now = new Date();
  const TOMORROW = new Date(now);
  TOMORROW.setDate(now.getDate() + 1);

  // Free time tomorrow
  const tomorrowKey = TOMORROW.toISOString().slice(0, 10);
  const tomorrowEvents = calendar.filter(e => e.date === tomorrowKey || e.startTime?.startsWith(tomorrowKey));
  // Assume 8 working hours, subtract events
  const workHours = 8;
  const eventHours = tomorrowEvents.reduce((a, e) => a + ((e.durationMinutes || 60) / 60), 0);
  const freeHours = workHours - eventHours;

  if (freeHours >= 2) {
    const goalSuggestion = activeGoals[0]?.title || 'your most important goal';
    candidates.push({
      category: 'opportunity',
      title: `${freeHours.toFixed(0)} free hours tomorrow`,
      body: `Want to use it to work on "${goalSuggestion}"?`,
      urgency: 1,
      evidence: { type: 'free_time', hours: freeHours, suggestedGoalId: activeGoals[0]?.id },
    });
  }

  // Learning queue has items
  if (learningQueue.length > 0) {
    candidates.push({
      category: 'opportunity',
      title: `${learningQueue.length} review${learningQueue.length > 1 ? 's' : ''} waiting`,
      body: `You have items in your learning queue. A quick 2-min review would help lock them in.`,
      urgency: 1,
      evidence: { type: 'learning_queue', count: learningQueue.length },
    });
  }

  return candidates;
}

// ============================================================================
// MILESTONE DETECTORS
// "You're close to something"
// ============================================================================
export function detectMilestones({ userId, activeGoals = [], upcomingEvents = [] }) {
  const candidates = [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Goals close to target date
  for (const g of activeGoals) {
    if (g.targetDate) {
      const daysToTarget = Math.floor((new Date(g.targetDate).getTime() - now) / DAY);
      if (daysToTarget > 0 && daysToTarget <= 7) {
        candidates.push({
          category: 'milestone',
          title: `${daysToTarget} day${daysToTarget > 1 ? 's' : ''} until "${g.title}"`,
          body: `Final stretch on your goal. You're at ${g.progress || 0}% progress.`,
          urgency: daysToTarget <= 2 ? 4 : 2,
          evidence: { type: 'goal_milestone', goalId: g.id, daysToTarget, progress: g.progress },
        });
      }
    }
    // Progress milestone
    if (g.progress >= 80 && g.progress < 100) {
      candidates.push({
        category: 'milestone',
        title: `Almost there on "${g.title}"`,
        body: `You're at ${g.progress}%. The last 20% is often the hardest.`,
        urgency: 2,
        evidence: { type: 'goal_progress', goalId: g.id, progress: g.progress },
      });
    }
  }

  // Birthdays in next 7 days
  for (const p of upcomingEvents.filter(e => e.type === 'birthday')) {
    const daysUntil = Math.floor((new Date(p.date).getTime() - now) / DAY);
    if (daysUntil >= 0 && daysUntil <= 7) {
      candidates.push({
        category: 'birthday',
        title: `${p.personName}'s birthday in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
        body: daysUntil === 0 ? `Today! Don't forget.` : `Want to plan something?`,
        urgency: daysUntil <= 2 ? 4 : 3,
        evidence: { type: 'birthday', personId: p.personId, daysUntil },
      });
    }
  }

  return candidates;
}

// ============================================================================
// AGGREGATE: run all detectors
// ============================================================================
export function detectAll(userData) {
  return [
    ...detectTimeBased(userData),
    ...detectAnomalies(userData),
    ...detectOpportunities(userData),
    ...detectMilestones(userData),
  ];
}
