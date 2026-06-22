/**
 * Genie Skills — pure functions
 *
 * A skill is a small package the LLM can call. Per the Phase 6 plan:
 *   - name + description (read by the LLM)
 *   - auth (OAuth scopes, API key, none)
 *   - tools (endpoints/parameters/schemas)
 *   - triggers (when should the LLM proactively consider this skill?)
 *   - cost (per-call USD so the budget agent can enforce it)
 *   - version + author + license
 *
 * The marketplace layer handles:
 *   - Curated registry (built-ins + third-party submissions)
 *   - Per-user install/uninstall (with opt-in flow)
 *   - Rate limits (per user, per skill, per day)
 *   - Revocation (one-click disable)
 */

export const SAFETY_REVIEW_STATES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

// ---------- built-in catalog ----------

export const BUILT_IN_SKILLS = Object.freeze([
  {
    id: 'opentable',
    name: 'OpenTable',
    description: 'Find and book restaurants. Reservation flow with confirmation.',
    category: 'restaurants',
    auth: { type: 'oauth', scopes: ['restaurants:read', 'reservations:write'] },
    tools: ['opentable.search', 'opentable.reserve'],
    triggers: ['book a table', 'restaurant reservation', 'make a reservation'],
    costPerCallUsd: 0,
    rateLimitPerDay: 20,
    version: '1.0.0',
    author: 'genie-built-in',
    license: 'MIT',
    safetyReview: 'approved',
    builtin: true,
  },
  {
    id: 'google-maps',
    name: 'Google Maps',
    description: 'Directions, places, traffic, geocoding.',
    category: 'maps',
    auth: { type: 'api_key' },
    tools: ['maps.directions', 'maps.places', 'maps.geocode'],
    triggers: ['directions to', 'how do I get to', 'where is'],
    costPerCallUsd: 0.005,
    rateLimitPerDay: 100,
    version: '1.0.0',
    author: 'genie-built-in',
    license: 'MIT',
    safetyReview: 'approved',
    builtin: true,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Play, queue, search music.',
    category: 'music',
    auth: { type: 'oauth', scopes: ['streaming', 'user-library-read'] },
    tools: ['spotify.play', 'spotify.queue', 'spotify.search'],
    triggers: ['play some music', 'queue', 'play the album'],
    costPerCallUsd: 0,
    rateLimitPerDay: 200,
    version: '1.0.0',
    author: 'genie-built-in',
    license: 'MIT',
    safetyReview: 'approved',
    builtin: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Send messages via WhatsApp (always requires user confirmation).',
    category: 'messaging',
    auth: { type: 'oauth', scopes: ['messages:write'] },
    tools: ['whatsapp.send'],
    triggers: ['whatsapp', 'message on whatsapp'],
    costPerCallUsd: 0,
    rateLimitPerDay: 50,
    version: '1.0.0',
    author: 'genie-built-in',
    license: 'MIT',
    safetyReview: 'approved',
    builtin: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Post messages to Slack channels.',
    category: 'messaging',
    auth: { type: 'oauth', scopes: ['chat:write'] },
    tools: ['slack.postMessage'],
    triggers: ['slack', 'post in slack', 'message the channel'],
    costPerCallUsd: 0,
    rateLimitPerDay: 100,
    version: '1.0.0',
    author: 'genie-built-in',
    license: 'MIT',
    safetyReview: 'approved',
    builtin: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Read/write pages and databases in Notion.',
    category: 'notes',
    auth: { type: 'oauth', scopes: ['read_content', 'update_content'] },
    tools: ['notion.search', 'notion.create', 'notion.update'],
    triggers: ['notion', 'save to notion', 'in my notion'],
    costPerCallUsd: 0,
    rateLimitPerDay: 100,
    version: '1.0.0',
    author: 'genie-built-in',
    license: 'MIT',
    safetyReview: 'approved',
    builtin: true,
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Create and update Linear issues.',
    category: 'productivity',
    auth: { type: 'oauth', scopes: ['issues:write'] },
    tools: ['linear.createIssue', 'linear.updateIssue'],
    triggers: ['linear', 'create a ticket', 'file an issue'],
    costPerCallUsd: 0,
    rateLimitPerDay: 100,
    version: '1.0.0',
    author: 'genie-built-in',
    license: 'MIT',
    safetyReview: 'approved',
    builtin: true,
  },
]);

// ---------- validation ----------

export function validateSkill(input) {
  if (!input || typeof input !== 'object') throw new Error('Skill must be an object');
  if (!input.name) throw new Error('name required');
  if (!input.tools || !Array.isArray(input.tools) || input.tools.length === 0) {
    throw new Error('tools (non-empty array) required');
  }
  if (!input.version) throw new Error('version required');
  return {
    id: input.id || `sk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: String(input.name).slice(0, 100),
    description: input.description ? String(input.description).slice(0, 1000) : '',
    category: input.category ? String(input.category).slice(0, 50) : 'general',
    auth: input.auth || { type: 'none' },
    tools: input.tools.map((t) => String(t).slice(0, 100)),
    triggers: Array.isArray(input.triggers) ? input.triggers.map((t) => String(t).slice(0, 200)) : [],
    costPerCallUsd: Math.max(0, Number.isFinite(Number(input.costPerCallUsd)) ? Number(input.costPerCallUsd) : 0),
    rateLimitPerDay: Math.max(1, Math.min(10000, Number.isFinite(Number(input.rateLimitPerDay)) ? Number(input.rateLimitPerDay) : 100)),
    version: String(input.version).slice(0, 20),
    author: input.author ? String(input.author).slice(0, 100) : 'unknown',
    license: input.license ? String(input.license).slice(0, 50) : 'unknown',
    safetyReview: SAFETY_REVIEW_STATES.PENDING,
    builtin: Boolean(input.builtin),
  };
}

// ---------- triggers / matching ----------

/**
 * Score a user message against a skill's triggers. 1.0 = exact match, lower
 * for partial substring matches. Used by the LLM router to pick which skills
 * to load into the prompt.
 */
export function scoreTriggerMatch(text, skill) {
  if (!text || !skill || !Array.isArray(skill.triggers)) return 0;
  const t = text.toLowerCase();
  let best = 0;
  for (const trig of skill.triggers) {
    const tr = trig.toLowerCase();
    if (t === tr) best = Math.max(best, 1.0);
    else if (t.includes(tr)) best = Math.max(best, 0.7);
    else if (tr.split(/\s+/).every((w) => t.includes(w))) best = Math.max(best, 0.5);
  }
  return best;
}

/**
 * Find skills that match the user's text. Returns [{ skill, score }] sorted
 * descending. The LLM picks from the top N.
 */
export function findMatchingSkills(text, skills, minScore = 0.5) {
  return (skills || [])
    .map((s) => ({ skill: s, score: scoreTriggerMatch(text, s) }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

// ---------- rate limiting ----------

/**
 * Is the user over their daily limit for this skill? `usage` is a map
 * { 'YYYY-MM-DD': count }. Returns { allowed, remaining, resetsAt }.
 */
export function checkRateLimit(skill, usage, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const used = (usage && usage[today]) || 0;
  const limit = skill.rateLimitPerDay || 100;
  const remaining = Math.max(0, limit - used);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return {
    allowed: remaining > 0,
    remaining,
    used,
    limit,
    resetsAt: tomorrow.toISOString(),
  };
}

export function recordUsage(usage, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const next = { ...(usage || {}) };
  next[today] = (next[today] || 0) + 1;
  // Keep only the last 7 days of usage data to avoid bloat
  const cutoff = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  for (const k of Object.keys(next)) if (k < cutoff) delete next[k];
  return next;
}