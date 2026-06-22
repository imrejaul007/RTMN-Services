/**
 * PI Score computation library
 *
 * Pure functions for computing the 7 sub-scores from raw counts.
 * No I/O — the service does that.
 */

// ============================================================================
// SUB-SCORE COMPUTATIONS
// Each function takes raw counts/stats and returns 0-100.
// ============================================================================

// Memory: how much Genie knows
// Factors: count of memories, weighted by importance + confidence
export function computeMemoryScore({ memoryCount = 0, avgConfidence = 0.5, highImportanceCount = 0 } = {}) {
  if (memoryCount === 0) return 0;
  // Target: 100 memories = 60 base; 50 high-importance = +30; high confidence = +10
  const countScore = Math.min(60, (memoryCount / 100) * 60);
  const qualityScore = Math.min(30, (highImportanceCount / 50) * 30);
  const confidenceScore = Math.min(10, avgConfidence * 10);
  return Math.round(countScore + qualityScore + confidenceScore);
}

// Context: how well Genie retrieves
// Factors: retrieval success rate, avg context quality
export function computeContextScore({ totalRetrievals = 0, usefulRetrievals = 0, avgContextItems = 0 } = {}) {
  if (totalRetrievals === 0) return 0;
  const successRate = usefulRetrievals / totalRetrievals;
  const successScore = Math.min(70, successRate * 70);
  const breadthScore = Math.min(30, (avgContextItems / 20) * 30);
  return Math.round(successScore + breadthScore);
}

// Learning: how much Genie has improved from feedback
// Factors: feedback events, corrections accepted
export function computeLearningScore({ feedbackCount = 0, positiveFeedback = 0, correctionsAccepted = 0 } = {}) {
  if (feedbackCount === 0) return 0;
  const engagementScore = Math.min(40, (feedbackCount / 50) * 40);
  const positiveRate = positiveFeedback / feedbackCount;
  const positiveScore = Math.min(40, positiveRate * 40);
  const correctionScore = Math.min(20, (correctionsAccepted / 20) * 20);
  return Math.round(engagementScore + positiveScore + correctionScore);
}

// Relationships: quality of relationship tracking
// Factors: people tracked, freshness, "who matters" accuracy
export function computeRelationshipsScore({ peopleTracked = 0, recentlyContacted = 0, accuracyScore = 0.5 } = {}) {
  if (peopleTracked === 0) return 0;
  const breadthScore = Math.min(40, (peopleTracked / 12) * 40);
  const freshnessScore = Math.min(40, (recentlyContacted / Math.max(peopleTracked, 1)) * 40);
  const accuracy = Math.min(20, accuracyScore * 20);
  return Math.round(breadthScore + freshnessScore + accuracy);
}

// Goals: goal-tracking depth
// Factors: active goals, progress updates, completions
export function computeGoalsScore({ activeGoals = 0, progressUpdates = 0, completedGoals = 0 } = {}) {
  if (activeGoals === 0 && completedGoals === 0) return 0;
  const activeScore = Math.min(30, (activeGoals / 5) * 30);
  const progressScore = Math.min(40, (progressUpdates / 20) * 40);
  const completionScore = Math.min(30, (completedGoals / 5) * 30);
  return Math.round(activeScore + progressScore + completionScore);
}

// Wellness: wellness data richness
// Factors: days tracked per category
export function computeWellnessScore({ sleepDays = 0, moodDays = 0, workoutDays = 0, waterDays = 0 } = {}) {
  const categories = [sleepDays, moodDays, workoutDays, waterDays];
  const totalDays = categories.reduce((a, b) => a + b, 0);
  if (totalDays === 0) return 0;
  // 30 days per category = full score
  const perCategory = categories.map(d => Math.min(25, (d / 30) * 25));
  return Math.round(perCategory.reduce((a, b) => a + b, 0));
}

// Reflection: self-awareness
// Factors: insights surfaced that the user acted on
export function computeReflectionScore({ insightsSurfaced = 0, insightsActedOn = 0, reflectionsRead = 0 } = {}) {
  if (insightsSurfaced === 0) return 0;
  const actionRate = insightsActedOn / insightsSurfaced;
  const surfacingScore = Math.min(30, (insightsSurfaced / 30) * 30);
  const actionScore = Math.min(40, actionRate * 40);
  const readScore = Math.min(30, (reflectionsRead / 8) * 30);
  return Math.round(surfacingScore + actionScore + readScore);
}

// ============================================================================
// OVERALL SCORE
// Weighted average of sub-scores
// ============================================================================
const WEIGHTS = {
  memory: 0.20,
  context: 0.15,
  learning: 0.15,
  relationships: 0.15,
  goals: 0.15,
  wellness: 0.10,
  reflection: 0.10,
};

export function computeOverall(subScores) {
  const total = Object.entries(WEIGHTS).reduce((acc, [key, weight]) => {
    return acc + (subScores[key] || 0) * weight;
  }, 0);
  return Math.round(total);
}

// ============================================================================
// LEVEL SYSTEM
// 6 levels with names + unlock descriptions
// ============================================================================
export const LEVELS = [
  { level: 1, minScore: 0,  maxScore: 9,   name: 'Newborn',    emoji: '🌱', unlocks: 'Basic Q&A, no memory' },
  { level: 2, minScore: 10, maxScore: 24,  name: 'Acquaintance', emoji: '👋', unlocks: 'Genie remembers your name + a few facts' },
  { level: 3, minScore: 25, maxScore: 49,  name: 'Friend',     emoji: '🤝', unlocks: 'Tracks goals, relationships, calendar' },
  { level: 4, minScore: 50, maxScore: 74,  name: 'Confidant',  emoji: '💬', unlocks: 'Proactive suggestions + reflection digest' },
  { level: 5, minScore: 75, maxScore: 89,  name: 'Partner',    emoji: '🧠', unlocks: 'Multi-step reasoning, agent execution' },
  { level: 6, minScore: 90, maxScore: 100, name: 'Soulmate',   emoji: '✨', unlocks: 'Genie knows you better than you know yourself' },
];

export function getLevel(score) {
  return LEVELS.find(l => score >= l.minScore && score <= l.maxScore) || LEVELS[0];
}

export function getNextLevel(score) {
  return LEVELS.find(l => l.minScore > score) || null;
}

// ============================================================================
// DELTA COMPUTATION
// What changed since the last score?
// ============================================================================
export function computeDelta(current, previous) {
  if (!previous) return null;
  const overall = (current.overall || 0) - (previous.overall || 0);
  const components = {};
  for (const key of Object.keys(WEIGHTS)) {
    components[key] = (current.components?.[key] || 0) - (previous.components?.[key] || 0);
  }
  // Top movers
  const movers = Object.entries(components)
    .filter(([k, v]) => v !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([k, v]) => ({ component: k, delta: v }));
  return { overall, components, topMovers: movers };
}
