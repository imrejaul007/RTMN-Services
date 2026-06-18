/**
 * RTMN Unified Hub - Genie AI Cross-Service Workflows
 *
 * Aggregates data from the 12 Genie AI personal companion services
 * to deliver unified, real-world workflows that span the entire personal
 * intelligence ecosystem.
 *
 * Endpoints are intentionally resilient: if a downstream Genie service
 * is offline, the workflow still returns what it can, tagged with the
 * availability of each source.
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Service URLs - all 12 Genie services + MemoryOS + CorpID
const SERVICES = {
  // Genie AI - Personal Companion Ecosystem
  genieCompanion: 'http://localhost:4716',
  genieMemoryGraph: 'http://localhost:4717',
  genieRelationshipOs: 'http://localhost:4718',
  genieThinkingEngine: 'http://localhost:4719',
  genieConsultant: 'http://localhost:4720',
  genieLifeGps: 'http://localhost:4721',
  genieLearningOs: 'http://localhost:4722',
  genieWellnessOs: 'http://localhost:4723',
  genieMoneyOs: 'http://localhost:4724',
  genieCreationOs: 'http://localhost:4725',
  genieExecutionEngine: 'http://localhost:4726',
  genieLifeUniversity: 'http://localhost:4727',
  genieShoppingAgent: 'http://localhost:4728',

  // Foundation
  memoryOs: 'http://localhost:4703',
  twinOs: 'http://localhost:4705',
};

/**
 * Resilient service caller - never throws, always returns a normalized result.
 */
async function callService(baseUrl, path, method = 'GET', data = null, timeout = 3000) {
  try {
    const config = {
      method,
      url: `${baseUrl}${path}`,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) config.data = data;
    const response = await axios(config);
    return { available: true, status: response.status, data: response.data };
  } catch (error) {
    return { available: false, error: error.code || error.message };
  }
}

/**
 * Build a parallel-fetch map and return all results, tagged with their source.
 */
async function parallelFetch(calls) {
  const entries = Object.entries(calls);
  const results = await Promise.all(
    entries.map(([_, call]) => callService(call.url, call.path, call.method || 'GET', call.data))
  );
  const out = {};
  entries.forEach(([key, _], i) => {
    out[key] = results[i];
  });
  return out;
}

// ============================================
// MORNING BRIEFING WORKFLOW
// ============================================
// Pulls mood trend, calendar, today's tasks, and any relationship reminders
// to assemble a personal "good morning" briefing.

router.get('/morning-briefing/:userId', async (req, res) => {
  const { userId } = req.params;

  const calls = {
    mood: {
      url: SERVICES.genieCompanion,
      path: `/mood/${userId}/recent`,
    },
    companionProfile: {
      url: SERVICES.genieCompanion,
      path: `/api/companion/${userId}/profile`,
    },
    todaysTasks: {
      url: SERVICES.genieExecutionEngine,
      path: `/api/tasks/${userId}/today`,
    },
    calendarToday: {
      url: SERVICES.genieExecutionEngine,
      path: `/api/calendar/${userId}/today`,
    },
    relationshipReminders: {
      url: SERVICES.genieRelationshipOs,
      path: `/reminders/${userId}/upcoming`,
    },
    lifeGpsFocus: {
      url: SERVICES.genieLifeGps,
      path: `/api/gps/${userId}/next-action`,
    },
    wellnessInsight: {
      url: SERVICES.genieWellnessOs,
      path: `/insights/${userId}`,
    },
  };

  const results = await parallelFetch(calls);

  const availableSources = Object.entries(results)
    .filter(([_, r]) => r.available)
    .map(([k]) => k);

  res.json({
    success: true,
    workflow: 'morning-briefing',
    userId,
    generatedAt: new Date().toISOString(),
    sources: { requested: Object.keys(calls).length, available: availableSources.length, availableSources },
    data: results,
  });
});

// ============================================
// DAY PLAN WORKFLOW
// ============================================
// Combines Life GPS goals with Execution Engine tasks and Calendar to
// produce a prioritized day plan.

router.get('/day-plan/:userId', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;

  const calls = {
    goals: { url: SERVICES.genieLifeGps, path: `/api/goals/${userId}/active` },
    nextBestAction: { url: SERVICES.genieLifeGps, path: `/api/gps/${userId}/next-action` },
    tasks: { url: SERVICES.genieExecutionEngine, path: `/api/tasks/${userId}${date ? `?date=${date}` : ''}` },
    calendar: { url: SERVICES.genieExecutionEngine, path: `/api/calendar/${userId}${date ? `?date=${date}` : ''}` },
    habits: { url: SERVICES.genieWellnessOs, path: `/mental/habits/${userId}` },
    moneyBudget: { url: SERVICES.genieMoneyOs, path: `/budget/${userId}/today` },
  };

  const results = await parallelFetch(calls);
  const availableSources = Object.entries(results).filter(([_, r]) => r.available).map(([k]) => k);

  res.json({
    success: true,
    workflow: 'day-plan',
    userId,
    date: date || new Date().toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    sources: { requested: Object.keys(calls).length, available: availableSources.length, availableSources },
    data: results,
  });
});

// ============================================
// HEALTH CHECK WORKFLOW
// ============================================
// Aggregates wellness, money, and learning streak into a holistic "how are
// you doing" snapshot.

router.get('/health-check/:userId', async (req, res) => {
  const { userId } = req.params;

  const calls = {
    wellnessInsights: { url: SERVICES.genieWellnessOs, path: `/insights/${userId}` },
    sleepLast7: { url: SERVICES.genieWellnessOs, path: `/sleep/${userId}/last-7-days` },
    fitnessProgress: { url: SERVICES.genieWellnessOs, path: `/fitness/progress/${userId}` },
    mentalHealth: { url: SERVICES.genieWellnessOs, path: `/mental/${userId}/summary` },
    budgetSummary: { url: SERVICES.genieMoneyOs, path: `/budget/${userId}/summary` },
    savingsGoals: { url: SERVICES.genieMoneyOs, path: `/savings/${userId}/goals` },
    learningStreak: { url: SERVICES.genieLearningOs, path: `/api/streak/${userId}` },
    skillProgress: { url: SERVICES.genieLearningOs, path: `/api/skills/${userId}` },
  };

  const results = await parallelFetch(calls);
  const availableSources = Object.entries(results).filter(([_, r]) => r.available).map(([k]) => k);

  res.json({
    success: true,
    workflow: 'health-check',
    userId,
    generatedAt: new Date().toISOString(),
    sources: { requested: Object.keys(calls).length, available: availableSources.length, availableSources },
    data: results,
  });
});

// ============================================
// LEARNING PATH WORKFLOW
// ============================================
// Combines Life University curriculum with Learning OS progress and Consultant
// recommendations to build a personalized learning path.

router.get('/learning-path/:userId', async (req, res) => {
  const { userId } = req.params;

  const calls = {
    universityCurriculum: { url: SERVICES.genieLifeUniversity, path: `/api/curriculum/${userId}` },
    activeCourses: { url: SERVICES.genieLifeUniversity, path: `/api/courses/${userId}/active` },
    achievements: { url: SERVICES.genieLifeUniversity, path: `/api/achievements/${userId}` },
    learningLanguages: { url: SERVICES.genieLearningOs, path: `/api/languages/${userId}` },
    learningSkills: { url: SERVICES.genieLearningOs, path: `/api/skills/${userId}` },
    consultantCareer: { url: SERVICES.genieConsultant, path: `/api/consult/career/${userId}` },
    consultantLearning: { url: SERVICES.genieConsultant, path: `/api/consult/learning/${userId}` },
    futureSelfVision: { url: SERVICES.genieLifeGps, path: `/api/future/${userId}` },
  };

  const results = await parallelFetch(calls);
  const availableSources = Object.entries(results).filter(([_, r]) => r.available).map(([k]) => k);

  res.json({
    success: true,
    workflow: 'learning-path',
    userId,
    generatedAt: new Date().toISOString(),
    sources: { requested: Object.keys(calls).length, available: availableSources.length, availableSources },
    data: results,
  });
});

// ============================================
// FINANCIAL WELLNESS WORKFLOW
// ============================================
// Combines money tracking with life goals and shopping agent spending.

router.get('/financial-wellness/:userId', async (req, res) => {
  const { userId } = req.params;

  const calls = {
    budgetSummary: { url: SERVICES.genieMoneyOs, path: `/budget/${userId}/summary` },
    expensesRecent: { url: SERVICES.genieMoneyOs, path: `/expenses/${userId}/recent` },
    savingsGoals: { url: SERVICES.genieMoneyOs, path: `/savings/${userId}/goals` },
    investments: { url: SERVICES.genieMoneyOs, path: `/investments/${userId}/portfolio` },
    insights: { url: SERVICES.genieMoneyOs, path: `/insights/${userId}` },
    lifeGoals: { url: SERVICES.genieLifeGps, path: `/api/goals/${userId}/financial` },
    shoppingHistory: { url: SERVICES.genieShoppingAgent, path: `/api/purchases/${userId}/recent` },
    wishlist: { url: SERVICES.genieShoppingAgent, path: `/api/wishlist/${userId}` },
  };

  const results = await parallelFetch(calls);
  const availableSources = Object.entries(results).filter(([_, r]) => r.available).map(([k]) => k);

  res.json({
    success: true,
    workflow: 'financial-wellness',
    userId,
    generatedAt: new Date().toISOString(),
    sources: { requested: Object.keys(calls).length, available: availableSources.length, availableSources },
    data: results,
  });
});

// ============================================
// RELATIONSHIP INTELLIGENCE WORKFLOW
// ============================================
// Combines relationship OS with companion emotion and consultant advice.

router.get('/relationship-intelligence/:userId', async (req, res) => {
  const { userId } = req.params;

  const calls = {
    people: { url: SERVICES.genieRelationshipOs, path: `/people/${userId}` },
    relationships: { url: SERVICES.genieRelationshipOs, path: `/interactions/${userId}/recent` },
    upcomingDates: { url: SERVICES.genieRelationshipOs, path: `/reminders/${userId}/upcoming` },
    healthScores: { url: SERVICES.genieRelationshipOs, path: `/health/${userId}/scores` },
    socialIntel: { url: SERVICES.genieRelationshipOs, path: `/intelligence/${userId}` },
    giftIdeas: { url: SERVICES.genieRelationshipOs, path: `/gifts/${userId}/suggestions` },
    moodTrend: { url: SERVICES.genieCompanion, path: `/mood/${userId}/recent` },
    consultantAdvice: { url: SERVICES.genieConsultant, path: `/api/consult/relationships/${userId}` },
  };

  const results = await parallelFetch(calls);
  const availableSources = Object.entries(results).filter(([_, r]) => r.available).map(([k]) => k);

  res.json({
    success: true,
    workflow: 'relationship-intelligence',
    userId,
    generatedAt: new Date().toISOString(),
    sources: { requested: Object.keys(calls).length, available: availableSources.length, availableSources },
    data: results,
  });
});

// ============================================
// CREATION STUDIO WORKFLOW
// ============================================
// Combines creation OS capabilities with execution engine scheduling and
// memory graph context.

router.get('/creation-studio/:userId', async (req, res) => {
  const { userId } = req.params;

  const calls = {
    creationProjects: { url: SERVICES.genieCreationOs, path: `/api/projects/${userId}` },
    recentContent: { url: SERVICES.genieCreationOs, path: `/api/content/${userId}/recent` },
    scheduledTasks: { url: SERVICES.genieExecutionEngine, path: `/api/tasks/${userId}/creation` },
    memoryContext: { url: SERVICES.genieMemoryGraph, path: `/api/memory/${userId}/recent` },
    thinkingInsights: { url: SERVICES.genieThinkingEngine, path: `/api/brainstorm/${userId}/recent` },
  };

  const results = await parallelFetch(calls);
  const availableSources = Object.entries(results).filter(([_, r]) => r.available).map(([k]) => k);

  res.json({
    success: true,
    workflow: 'creation-studio',
    userId,
    generatedAt: new Date().toISOString(),
    sources: { requested: Object.keys(calls).length, available: availableSources.length, availableSources },
    data: results,
  });
});

// ============================================
// WORKFLOW CATALOG
// ============================================

router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Genie AI Cross-Service Workflows',
    version: '1.0.0',
    description: 'Aggregated workflows that combine multiple Genie AI services',
    workflows: [
      {
        path: '/morning-briefing/:userId',
        description: 'Personalized morning briefing - mood, tasks, calendar, relationships',
        services: ['Companion', 'Execution', 'Relationship', 'Life GPS', 'Wellness'],
      },
      {
        path: '/day-plan/:userId',
        description: 'Prioritized day plan - goals, tasks, calendar, habits, budget',
        services: ['Life GPS', 'Execution', 'Wellness', 'Money'],
      },
      {
        path: '/health-check/:userId',
        description: 'Holistic health snapshot - wellness, finance, learning',
        services: ['Wellness', 'Money', 'Learning'],
      },
      {
        path: '/learning-path/:userId',
        description: 'Personalized learning path - university + skills + consultant',
        services: ['Life University', 'Learning', 'Consultant', 'Life GPS'],
      },
      {
        path: '/financial-wellness/:userId',
        description: 'Complete financial overview - budget, savings, investments, spending',
        services: ['Money', 'Life GPS', 'Shopping Agent'],
      },
      {
        path: '/relationship-intelligence/:userId',
        description: 'Relationship health & social intelligence',
        services: ['Relationship OS', 'Companion', 'Consultant'],
      },
      {
        path: '/creation-studio/:userId',
        description: 'Content creation context & scheduled work',
        services: ['Creation OS', 'Execution', 'Memory Graph', 'Thinking'],
      },
    ],
  });
});

module.exports = router;
