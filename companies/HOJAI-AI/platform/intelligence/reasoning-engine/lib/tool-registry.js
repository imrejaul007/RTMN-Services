/**
 * Tool Registry
 *
 * Wraps the 23 Genie specialists + 4 Phase 1 services into a uniform
 * metadata format the LLM can read. Each tool declares:
 *   - name (LLM-facing identifier, e.g. "get_today_calendar")
 *   - service (which Genie service actually handles it)
 *   - method + path (HTTP endpoint)
 *   - argsSchema (zod-style description of expected args)
 *   - description (natural-language description for the LLM prompt)
 *   - cost tier (cheap=1, medium=2, expensive=3) — for budget enforcement
 *   - latency tier (fast=1, slow=2) — for parallelism decisions
 *
 * The Reasoning Engine doesn't talk to specialists directly. It calls
 * executeTool() which uses this registry to translate an LLM tool call
 * into an HTTP request. This means:
 *   1. Adding a new tool = one row, not new code
 *   2. Specialists don't need to know about the reasoning engine
 *   3. The LLM sees a uniform tool surface
 *
 * Tools are grouped by category so the LLM can be told "you have access
 * to 27 tools in these categories" without seeing all 27 in one prompt.
 */

const TOOL_CATEGORIES = {
  commerce: 'Shopping, money, transactions',
  calendar: 'Schedule, events, time',
  people: 'Relationships, contacts, social',
  wellness: 'Sleep, mood, workouts, health',
  goals: 'Goals, progress, learning, plans',
  knowledge: 'Memory, search, facts, briefings',
  ambient: 'Briefings, reflection, proactive notifications',
  system: 'Internal: intent routing, status, debugging',
};

// ============================================================================
// TOOL DEFINITIONS
// One row per tool. The shape:
//   { name, category, description, service, method, path, args, costTier, latencyTier }
// ============================================================================
const TOOLS = [
  // ===== COMMERCE =====
  {
    name: 'shop_product',
    category: 'commerce',
    description: 'Start or continue a shopping session. Use when the user wants to buy, find, or compare products.',
    service: 'genie-shopping-agent',
    method: 'POST',
    path: '/api/shop',
    args: { item: 'string — what the user wants to shop for', preferences: 'object (optional) — user preferences' },
    costTier: 2,
    latencyTier: 2,
  },
  {
    name: 'get_budget_snapshot',
    category: 'commerce',
    description: "Get the user's current budget snapshot, spending, and bills.",
    service: 'genie-money-os',
    method: 'GET',
    path: '/api/budget',
    args: {},
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'add_expense',
    category: 'commerce',
    description: "Log a new expense. Use when the user mentions spending money.",
    service: 'genie-money-os',
    method: 'POST',
    path: '/api/expense',
    args: { amount: 'number', category: 'string', note: 'string (optional)' },
    costTier: 1,
    latencyTier: 1,
  },

  // ===== CALENDAR =====
  {
    name: 'get_today_calendar',
    category: 'calendar',
    description: "Get the user's calendar events for today.",
    service: 'genie-calendar-service',
    method: 'GET',
    path: '/api/events/today',
    args: {},
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'get_upcoming_events',
    category: 'calendar',
    description: "Get calendar events in the next N days.",
    service: 'genie-calendar-service',
    method: 'GET',
    path: '/api/events/upcoming',
    args: { days: 'number — how many days ahead (default 7)' },
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'create_event',
    category: 'calendar',
    description: "Create a new calendar event.",
    service: 'genie-calendar-service',
    method: 'POST',
    path: '/api/events',
    args: { title: 'string', startTime: 'ISO 8601 string', durationMinutes: 'number', notes: 'string (optional)' },
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'find_free_time',
    category: 'calendar',
    description: "Find open time slots in the user's calendar for a meeting.",
    service: 'genie-calendar-service',
    method: 'POST',
    path: '/api/events/find-free',
    args: { durationMinutes: 'number', windowDays: 'number (default 7)' },
    costTier: 1,
    latencyTier: 1,
  },

  // ===== PEOPLE =====
  {
    name: 'get_relationships_due',
    category: 'people',
    description: "Get people the user should reach out to (overdue contact).",
    service: 'genie-relationship-os',
    method: 'GET',
    path: '/api/relationships/due',
    args: {},
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'log_relationship_interaction',
    category: 'people',
    description: "Log that the user contacted or met with someone.",
    service: 'genie-relationship-os',
    method: 'POST',
    path: '/api/relationships/interaction',
    args: { personName: 'string', interactionType: 'string (call, text, met, etc.)', note: 'string (optional)' },
    costTier: 1,
    latencyTier: 1,
  },

  // ===== WELLNESS =====
  {
    name: 'get_wellness_today',
    category: 'people',
    description: "Get today's wellness snapshot: sleep, mood, workouts.",
    service: 'genie-wellness-os',
    method: 'GET',
    path: '/api/wellness/today',
    args: {},
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'log_wellness',
    category: 'wellness',
    description: "Log a wellness data point (mood, sleep hours, workout, etc.).",
    service: 'genie-wellness-os',
    method: 'POST',
    path: '/api/wellness/log',
    args: { type: 'string (mood, sleep, workout, energy, water)', value: 'number or string' },
    costTier: 1,
    latencyTier: 1,
  },

  // ===== GOALS =====
  {
    name: 'get_active_goals',
    category: 'goals',
    description: "Get the user's currently active goals.",
    service: 'genie-goal-os',
    method: 'GET',
    path: '/api/goals/active',
    args: {},
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'update_goal_progress',
    category: 'goals',
    description: "Update progress on a goal.",
    service: 'genie-goal-os',
    method: 'POST',
    path: '/api/goals/progress',
    args: { goalId: 'string', progress: 'number (0-100)', note: 'string (optional)' },
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'create_goal',
    category: 'goals',
    description: "Create a new goal for the user.",
    service: 'genie-goal-os',
    method: 'POST',
    path: '/api/goals',
    args: { title: 'string', targetDate: 'ISO 8601 string (optional)', description: 'string (optional)' },
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'get_learning_queue',
    category: 'goals',
    description: "Get items in the spaced-repetition review queue (people, goals, commitments the user should remember).",
    service: 'genie-learning-os',
    method: 'GET',
    path: '/api/learning/queue',
    args: {},
    costTier: 1,
    latencyTier: 1,
  },

  // ===== KNOWLEDGE / MEMORY (Phase 1) =====
  {
    name: 'remember_fact',
    category: 'knowledge',
    description: "Store a fact in long-term memory. Use whenever the user shares information worth remembering.",
    service: 'memory-substrate',
    method: 'POST',
    path: '/api/memory',
    args: { content: 'string — the fact to remember', importance: 'string (Low, Medium, High)', tags: 'array of strings (optional)' },
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'search_memories',
    category: 'knowledge',
    description: "Search the user's long-term memory for relevant facts.",
    service: 'memory-substrate',
    method: 'GET',
    path: '/api/memory/search',
    args: { query: 'string', limit: 'number (default 10)' },
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'get_user_context',
    category: 'knowledge',
    description: "Get the composed LLM context window for a user (the most relevant memories for the current moment).",
    service: 'memory-substrate',
    method: 'GET',
    path: '/api/context',
    args: { query: 'string (optional) — what to focus the context on', limit: 'number (default 20)' },
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'update_preferences',
    category: 'knowledge',
    description: "Update the user's preferences (communication style, defaults, etc.).",
    service: 'memory-substrate',
    method: 'PUT',
    path: '/api/twin/preferences',
    args: { preferences: 'object — key/value pairs to update' },
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'universal_search',
    category: 'knowledge',
    description: "Search across memories, twins, calendar — anything Genie knows about.",
    service: 'genie-universal-search',
    method: 'POST',
    path: '/api/search',
    args: { query: 'string', scope: 'string (optional) — all, memories, calendar, people' },
    costTier: 2,
    latencyTier: 2,
  },
  {
    name: 'serendipity_resurface',
    category: 'knowledge',
    description: "Surface an old memory the user might want to be reminded of (serendipity mode).",
    service: 'genie-serendipity-service',
    method: 'GET',
    path: '/api/serendipity',
    args: {},
    costTier: 1,
    latencyTier: 1,
  },

  // ===== AMBIENT (Phase 1 + Phase 2) =====
  {
    name: 'generate_morning_briefing',
    category: 'ambient',
    description: "Generate today's morning briefing. Composes calendar, goals, relationships, wellness into one message.",
    service: 'morning-briefing-v2',
    method: 'POST',
    path: '/api/briefing/morning',
    args: {},
    costTier: 2,
    latencyTier: 2,
  },
  {
    name: 'generate_evening_recap',
    category: 'ambient',
    description: "Generate an end-of-day recap. What got done, what slipped, prep for tomorrow.",
    service: 'morning-briefing-v2',
    method: 'POST',
    path: '/api/briefing/evening',
    args: {},
    costTier: 2,
    latencyTier: 2,
  },
  {
    name: 'generate_weekly_reflection',
    category: 'ambient',
    description: "Generate a weekly reflection. Patterns, insights, and questions for the user.",
    service: 'reflection-engine',
    method: 'POST',
    path: '/api/reflection/weekly',
    args: {},
    costTier: 3,
    latencyTier: 2,
  },
  {
    name: 'send_proactive_notification',
    category: 'ambient',
    description: "Send a proactive notification to the user. Use sparingly — only when there's something worth surfacing.",
    service: 'proactive-engine',
    method: 'POST',
    path: '/api/notify',
    args: { title: 'string', body: 'string', category: 'string (relationship, money, wellness, opportunity, milestone)' },
    costTier: 1,
    latencyTier: 1,
  },

  // ===== SYSTEM =====
  {
    name: 'classify_intent',
    category: 'system',
    description: "Re-classify a message's intent if the initial classification was wrong.",
    service: 'intent-engine',
    method: 'POST',
    path: '/api/intent/extract',
    args: { message: 'string' },
    costTier: 1,
    latencyTier: 1,
  },
  {
    name: 'ask_genie_conversation',
    category: 'system',
    description: "Fallback: just chat with the user using a single LLM call (no tools, no planning).",
    service: 'genie-conversation',
    method: 'POST',
    path: '/api/chat',
    args: { message: 'string', context: 'object (optional)' },
    costTier: 1,
    latencyTier: 1,
  },
];

// ============================================================================
// INDEXING HELPERS
// ============================================================================
const TOOLS_BY_NAME = Object.fromEntries(TOOLS.map(t => [t.name, t]));
const TOOLS_BY_CATEGORY = TOOLS.reduce((acc, t) => {
  (acc[t.category] = acc[t.category] || []).push(t);
  return acc;
}, {});
const TOOLS_BY_SERVICE = TOOLS.reduce((acc, t) => {
  (acc[t.service] = acc[t.service] || []).push(t);
  return acc;
}, {});

/**
 * Format the tool catalog for the LLM prompt.
 * Returns a compact, scannable string the model can reason about.
 */
function toolsForPrompt({ categories = null, maxTools = 30 } = {}) {
  const selected = categories
    ? categories.flatMap(c => TOOLS_BY_CATEGORY[c] || [])
    : TOOLS;

  return selected.slice(0, maxTools).map(t => {
    const args = Object.entries(t.args).map(([k, v]) => `${k}: ${v}`).join('; ');
    return `- ${t.name}(${args || 'no args'}) — ${t.description}`;
  }).join('\n');
}

function getTool(name) {
  return TOOLS_BY_NAME[name];
}

function listTools() {
  return TOOLS.map(({ name, category, description }) => ({ name, category, description }));
}

function listCategories() {
  return Object.entries(TOOL_CATEGORIES).map(([id, description]) => ({
    id,
    description,
    toolCount: (TOOLS_BY_CATEGORY[id] || []).length,
  }));
}

export {
  TOOLS,
  TOOLS_BY_NAME,
  TOOLS_BY_CATEGORY,
  TOOLS_BY_SERVICE,
  TOOL_CATEGORIES,
  toolsForPrompt,
  getTool,
  listTools,
  listCategories,
};
