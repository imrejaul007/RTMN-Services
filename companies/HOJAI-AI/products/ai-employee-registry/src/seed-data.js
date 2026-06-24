/**
 * Seed data: AI Employees registered at boot.
 *
 * 13 vision-genie agents from the Genie vision (per .claude/plans/hojai-vision-product-roadmap.md):
 *   - Companion, Memory, Planner, Teacher, Consultant, Research,
 *     Creator, Health, Finance, Travel, Shopping, Automation, Founder
 *
 * 3 missing/broken ones I'm building in this PR:
 *   - Research (legacy stub only)
 *   - Travel (legacy stub only)
 *   - Budgeting (different from Finance — track & forecast spend)
 *   - Legal (compliance + contracts)
 *   - Localization (multi-language)
 *
 * Each entry has the shape:
 *   { id, slug, name, description, category, capabilities, tags,
 *     serviceUrl, port, version, pricing, visionAgent, visionRole, status }
 *
 * serviceUrl = null means "not yet built"; status indicates availability.
 */

const BASE = 'http://localhost';

const SEED_EMPLOYEES = [
  // ─── The 13 vision-genie agents ────────────────────────────────────
  {
    id: 'emp_companion',
    slug: 'genie-companion',
    name: 'Genie Companion',
    description:
      'Your personal AI companion. Maintains long-term context across all conversations, remembers your preferences, and proactively reaches out with helpful nudges.',
    category: 'personal',
    capabilities: ['companionship', 'long-term-memory', 'proactive-nudges', 'context-awareness'],
    tags: ['genie', 'personal-ai', 'always-on'],
    serviceUrl: `${BASE}:4716`,
    port: 4716,
    version: '1.0.0',
    pricing: { model: 'subscription', perMonth: 19 },
    rating: { score: 4.8, reviews: 234 },
    installs: 1240,
    status: 'available',
    visionAgent: true,
    visionRole: 'companion',
    notes: 'Already running as genie-companion-service at port 4716'
  },
  {
    id: 'emp_memory',
    slug: 'genie-memory',
    name: 'Genie Memory',
    description:
      'Persistent memory graph. Captures everything you tell it, indexes people/places/preferences/things, and surfaces them contextually across every other Genie service.',
    category: 'personal',
    capabilities: ['knowledge-graph', 'entity-recognition', 'auto-tagging', 'context-recall'],
    tags: ['genie', 'memory', 'graph'],
    serviceUrl: `${BASE}:4723`,
    port: 4723,
    version: '1.0.0',
    pricing: { model: 'free' },
    rating: { score: 4.7, reviews: 412 },
    installs: 2180,
    status: 'available',
    visionAgent: true,
    visionRole: 'memory',
    notes: 'Already running as genie-memory-graph at port 4723'
  },
  {
    id: 'emp_planner',
    slug: 'genie-planner',
    name: 'Genie Planner',
    description:
      'AI calendar + scheduling assistant. Books meetings, detects conflicts, prepares agendas, and syncs across all your calendars (Google, Outlook, iCloud).',
    category: 'productivity',
    capabilities: ['calendar-sync', 'scheduling', 'conflict-detection', 'agenda-generation'],
    tags: ['genie', 'calendar', 'scheduling'],
    serviceUrl: `${BASE}:4709`,
    port: 4709,
    version: '1.0.0',
    pricing: { model: 'free' },
    rating: { score: 4.6, reviews: 891 },
    installs: 3420,
    status: 'available',
    visionAgent: true,
    visionRole: 'planner',
    notes: 'Already running as genie-calendar-service at port 4709'
  },
  {
    id: 'emp_teacher',
    slug: 'genie-teacher',
    name: 'Genie Teacher',
    description:
      'Personal tutor that adapts to your learning style. Generates courses, quizzes, certifications, and progress tracking. Spaced repetition built-in.',
    category: 'education',
    capabilities: ['course-generation', 'adaptive-quizzing', 'spaced-repetition', 'certifications'],
    tags: ['genie', 'learning', 'education'],
    serviceUrl: `${BASE}:4711`,
    port: 4711,
    version: '1.0.0',
    pricing: { model: 'subscription', perMonth: 29 },
    rating: { score: 4.5, reviews: 67 },
    installs: 480,
    status: 'available',
    visionAgent: true,
    visionRole: 'teacher',
    notes: 'genie-life-university service at port 4711 — minimal implementation'
  },
  {
    id: 'emp_consultant',
    slug: 'genie-consultant',
    name: 'Genie Consultant',
    description:
      'AI strategy consultant. Asks clarifying questions, applies mental models (Porter, Christensen, BCG matrix), produces structured analyses with citations.',
    category: 'business',
    capabilities: ['strategy-frameworks', 'multi-turn-discovery', 'structured-analysis', 'citation-tracking'],
    tags: ['genie', 'consulting', 'strategy'],
    serviceUrl: `${BASE}:4718`,
    port: 4718,
    version: '1.0.0',
    pricing: { model: 'usage', perCall: 2.0 },
    rating: { score: 4.6, reviews: 134 },
    installs: 670,
    status: 'available',
    visionAgent: true,
    visionRole: 'consultant',
    notes: 'genie-consultant-agent at port 4718'
  },
  {
    id: 'emp_research',
    slug: 'genie-research',
    name: 'Genie Research',
    description:
      'Deep research agent. Crawls the web, papers, and your own knowledge base to produce cited reports. Synthesizes across hundreds of sources.',
    category: 'knowledge',
    capabilities: ['web-search', 'pdf-parsing', 'citation-tracking', 'cross-source-synthesis'],
    tags: ['genie', 'research', 'knowledge'],
    serviceUrl: null,
    port: 4719,
    version: '1.0.0',
    pricing: { model: 'usage', perCall: 0.5 },
    rating: null,
    installs: 0,
    status: 'planned',
    visionAgent: true,
    visionRole: 'research',
    notes: 'NOT YET BUILT — building in this PR'
  },
  {
    id: 'emp_creator',
    slug: 'genie-creator',
    name: 'Genie Creator',
    description:
      'AI content creator. Writes blog posts, social media, videos, podcasts. Multi-modal output. Pluggable into your existing CMS.',
    category: 'creative',
    capabilities: ['text-generation', 'image-generation', 'video-scripts', 'multi-modal'],
    tags: ['genie', 'creator', 'content'],
    serviceUrl: `${BASE}:4712`,
    port: 4712,
    version: '1.0.0',
    pricing: { model: 'usage', perGeneration: 1.0 },
    rating: { score: 4.4, reviews: 234 },
    installs: 920,
    status: 'available',
    visionAgent: true,
    visionRole: 'creator',
    notes: 'genie-creation-os at port 4712'
  },
  {
    id: 'emp_health',
    slug: 'genie-health',
    name: 'Genie Health',
    description:
      'Personal wellness coach. Tracks sleep, activity, mood. Provides evidence-based recommendations. Connects to Apple Health, Fitbit, Oura.',
    category: 'wellness',
    capabilities: ['sleep-tracking', 'activity-tracking', 'mood-journal', 'evidence-based-recommendations'],
    tags: ['genie', 'health', 'wellness'],
    serviceUrl: `${BASE}:4717`,
    port: 4717,
    version: '1.0.0',
    pricing: { model: 'subscription', perMonth: 14 },
    rating: { score: 4.3, reviews: 89 },
    installs: 320,
    status: 'available',
    visionAgent: true,
    visionRole: 'health',
    notes: 'genie-wellness-os at port 4717'
  },
  {
    id: 'emp_finance',
    slug: 'genie-finance',
    name: 'Genie Finance',
    description:
      'Personal finance AI. Tracks accounts, budgets, investments. Provides tax optimization, savings suggestions. Bank-level encryption.',
    category: 'finance',
    capabilities: ['account-aggregation', 'budget-tracking', 'tax-optimization', 'investment-advice'],
    tags: ['genie', 'finance', 'money'],
    serviceUrl: `${BASE}:4715`,
    port: 4715,
    version: '1.0.0',
    pricing: { model: 'subscription', perMonth: 24 },
    rating: { score: 4.2, reviews: 156 },
    installs: 580,
    status: 'available',
    visionAgent: true,
    visionRole: 'finance',
    notes: 'genie-money-os at port 4715'
  },
  {
    id: 'emp_travel',
    slug: 'genie-travel',
    name: 'Genie Travel',
    description:
      'Travel planning agent. Books flights, hotels, cars. Finds deals across 100+ suppliers. Suggests itineraries based on your preferences. Handles rebooking.',
    category: 'travel',
    capabilities: ['flight-booking', 'hotel-booking', 'itinerary-planning', 'rebooking', 'price-comparison'],
    tags: ['genie', 'travel', 'booking'],
    serviceUrl: null,
    port: 4714,
    version: '1.0.0',
    pricing: { model: 'usage', perBooking: 5 },
    rating: null,
    installs: 0,
    status: 'planned',
    visionAgent: true,
    visionRole: 'travel',
    notes: 'NOT YET BUILT — building in this PR (or integrating nexha-autonomous-logistics)'
  },
  {
    id: 'emp_shopping',
    slug: 'genie-shopping',
    name: 'Genie Shopping',
    description:
      'Personal shopping AI agent. Searches across merchant agents, negotiates prices via ACP, places orders autonomously. Saves preferences for future shopping.',
    category: 'commerce',
    capabilities: ['product-search', 'price-negotiation', 'order-placement', 'preference-learning'],
    tags: ['genie', 'shopping', 'commerce', 'acp'],
    serviceUrl: `${BASE}:4716`,
    port: 4716,
    version: '1.0.0',
    pricing: { model: 'free',
      notes: 'Merchants pay transaction fees; consumer side is free' },
    rating: { score: 4.7, reviews: 567 },
    installs: 1890,
    status: 'available',
    visionAgent: true,
    visionRole: 'shopping',
    notes: 'genie-shopping-agent at port 4716 — fully wired to merchant-agents via ACP'
  },
  {
    id: 'emp_automation',
    slug: 'genie-automation',
    name: 'Genie Automation',
    description:
      'Task automation engine. If-this-then-that rules, scheduled jobs, multi-step workflows across services. Reads your email, fills forms, makes API calls.',
    category: 'productivity',
    capabilities: ['workflow-engine', 'scheduled-tasks', 'api-integration', 'rule-engine'],
    tags: ['genie', 'automation', 'zapier-alternative'],
    serviceUrl: `${BASE}:4720`,
    port: 4720,
    version: '1.0.0',
    pricing: { model: 'subscription', perMonth: 39 },
    rating: { score: 4.5, reviews: 312 },
    installs: 1450,
    status: 'available',
    visionAgent: true,
    visionRole: 'automation',
    notes: 'genie-execution-engine at port 4720'
  },
  {
    id: 'emp_founder',
    slug: 'genie-founder',
    name: 'Genie Founder',
    description:
      'Founder coach. Tracks OKRs, suggests next steps, connects to investor pipeline, fires off reminders, books meetings. The "AI cofounder".',
    category: 'business',
    capabilities: ['okr-tracking', 'next-step-suggestion', 'investor-pipeline', 'meeting-booking'],
    tags: ['genie', 'founder', 'startup'],
    serviceUrl: `${BASE}:4713`,
    port: 4713,
    version: '1.0.0',
    pricing: { model: 'subscription', perMonth: 99 },
    rating: { score: 4.4, reviews: 78 },
    installs: 240,
    status: 'available',
    visionAgent: true,
    visionRole: 'founder',
    notes: 'genie-life-gps at port 4713'
  },

  // ─── 3 new AI Employees (building in this PR) ───────────────────────
  {
    id: 'emp_budgeting',
    slug: 'genie-budgeting',
    name: 'Genie Budgeting',
    description:
      'Business budgeting AI. Tracks departmental spend, forecasts runway, suggests cuts, generates board-ready budget reports. Pairs with Finance (personal) for full money picture.',
    category: 'finance',
    capabilities: ['budget-tracking', 'runway-forecast', 'variance-analysis', 'board-reporting'],
    tags: ['genie', 'budgeting', 'business', 'finance'],
    serviceUrl: `${BASE}:4721`,
    port: 4721,
    version: '1.0.0',
    pricing: { model: 'subscription', perMonth: 79 },
    rating: null,
    installs: 0,
    status: 'available',
    visionAgent: false,
    notes: 'Built in this PR — see /products/genie-budgeting-agent'
  },
  {
    id: 'emp_legal',
    slug: 'genie-legal',
    name: 'Genie Legal',
    description:
      'AI legal assistant. Reviews contracts, flags risky clauses, drafts NDAs, tracks regulatory changes (GDPR, CCPA, India DPDP). Routes to human lawyers for sensitive matters.',
    category: 'legal',
    capabilities: ['contract-review', 'clause-extraction', 'risk-flagging', 'regulatory-tracking', 'human-handoff'],
    tags: ['genie', 'legal', 'compliance', 'contracts'],
    serviceUrl: `${BASE}:4722`,
    port: 4722,
    version: '1.0.0',
    pricing: { model: 'usage', perReview: 2.5 },
    rating: null,
    installs: 0,
    status: 'available',
    visionAgent: false,
    notes: 'Built in this PR — see /products/genie-legal-agent'
  },
  {
    id: 'emp_localization',
    slug: 'genie-localization',
    name: 'Genie Localization',
    description:
      'AI translation + cultural localization agent. 100+ languages, context-aware translations, preserves brand voice. Handles idioms, formality, and cultural nuances.',
    category: 'communication',
    capabilities: ['translation', 'cultural-localization', 'brand-voice-preservation', 'idiom-handling'],
    tags: ['genie', 'localization', 'translation', 'i18n'],
    serviceUrl: `${BASE}:4724`,
    port: 4724,
    version: '1.0.0',
    pricing: { model: 'usage', perChar: 0.00002 },
    rating: null,
    installs: 0,
    status: 'available',
    visionAgent: false,
    notes: 'Built in this PR — see /products/genie-localization-agent'
  }
];

module.exports = { SEED_EMPLOYEES };