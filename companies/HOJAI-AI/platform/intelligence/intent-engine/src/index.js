/**
 * Intent Engine
 *
 * Port: 4792
 *
 * Replaces the brittle keyword-based intent detection in
 * runtime/genie/src/index.js with an LLM-based intent extractor that:
 *   1. Reads recent conversation context (from memory-substrate)
 *   2. Asks the LLM to classify intent + extract entities + rank specialists
 *   3. Returns a structured routing decision with confidence + reasoning
 *
 * This is the FIRST LLM-dependent service in the runtime layer.
 * It uses the shared @rtmn/shared/lib/llm abstraction so the model can
 * be swapped (Anthropic → OpenAI → local Ollama) via env config.
 *
 * Why centralize intent?
 *   1. **Context-aware** — the LLM sees recent turns, not just keywords
 *   2. **Structured output** — JSON schema guarantees machine-readability
 *   3. **Confidence-aware** — callers can fall back to genie-gateway when
 *      confidence is low, instead of silently misrouting
 *   4. **Specialist registry** — adding a new specialist = update
 *      SPECIALIST_REGISTRY, not adding more `lower.includes(...)` branches
 *
 * Routes:
 *   POST /api/intent/extract  — Extract intent from a user message
 *   POST /api/intent/route    — Extract intent + return full routing plan
 *   GET  /api/intent/specialists — List known specialists + their capabilities
 *   GET  /health
 *   GET  /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { createLogger } from '@rtmn/shared/lib/logger';
import { createLLMClient, withStructuredOutput } from '@rtmn/shared/lib/llm';

const PORT = parseInt(process.env.PORT || '4792', 10);
const MEMORY_SUBSTRATE_URL = process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791';

const log = createLogger('intent-engine');

// ============================================================================
// SPECIALIST REGISTRY
// One source of truth for "what can Genie do and where does it live."
// Adding a specialist = add a row here, restart the engine. No code branches.
// ============================================================================
const SPECIALIST_REGISTRY = [
  {
    id: 'genie-shopping-agent',
    name: 'Shopping',
    url: process.env.GENIE_SHOPPING_URL || 'http://localhost:4728',
    intents: ['shop', 'buy', 'purchase', 'order', 'compare_prices', 'find_product'],
    description: 'Helps user shop, compare products, place orders, track deliveries',
    endpoint: { method: 'POST', path: '/api/shop', bodyFromUser: 'preferences' },
  },
  {
    id: 'genie-calendar-service',
    name: 'Calendar',
    url: process.env.GENIE_CALENDAR_URL || 'http://localhost:4709',
    intents: ['calendar', 'schedule', 'meeting', 'reminder', 'event', 'availability'],
    description: 'Manages calendar events, scheduling, conflicts, reminders',
    endpoint: { method: 'GET', path: '/api/events/today' },
  },
  {
    id: 'genie-money-os',
    name: 'Money',
    url: process.env.GENIE_MONEY_URL || 'http://localhost:4724',
    intents: ['budget', 'spend', 'finance', 'expense', 'save', 'invest', 'bills'],
    description: 'Tracks budget, expenses, bills, savings goals',
    endpoint: { method: 'GET', path: '/api/budget' },
  },
  {
    id: 'genie-wellness-os',
    name: 'Wellness',
    url: process.env.GENIE_WELLNESS_URL || 'http://localhost:4723',
    intents: ['wellness', 'health', 'sleep', 'workout', 'mood', 'exercise', 'diet'],
    description: 'Tracks sleep, workouts, mood, diet, health metrics',
    endpoint: { method: 'GET', path: '/api/wellness/today' },
  },
  {
    id: 'genie-relationship-os',
    name: 'Relationships',
    url: process.env.GENIE_RELATIONSHIP_URL || 'http://localhost:4747',
    intents: ['contact', 'relationship', 'birthday', 'reach_out', 'catch_up'],
    description: 'Tracks relationships, birthdays, last-contact, who-to-reach-out-to',
    endpoint: { method: 'GET', path: '/api/relationships/due' },
  },
  {
    id: 'genie-learning-os',
    name: 'Learning',
    url: process.env.GENIE_LEARNING_URL || 'http://localhost:4765',
    intents: ['learn', 'study', 'practice', 'skill', 'progress', 'review'],
    description: 'Tracks learning goals, study sessions, skill progress, spaced repetition',
    endpoint: { method: 'GET', path: '/api/learning/due' },
  },
  {
    id: 'genie-briefing-service',
    name: 'Briefing',
    url: process.env.GENIE_BRIEFING_URL || 'http://localhost:4712',
    intents: ['briefing', 'summary', 'today', 'recap', 'morning', 'evening'],
    description: 'Generates morning, evening, weekly briefings',
    endpoint: { method: 'POST', path: '/api/briefing/morning' },
  },
  {
    id: 'genie-life-gps',
    name: 'Life GPS',
    url: process.env.GENIE_LIFE_GPS_URL || 'http://localhost:4742',
    intents: ['direction', 'goal', 'purpose', 'meaning', 'priorities'],
    description: 'Tracks life direction, goals, priorities, values',
    endpoint: { method: 'GET', path: '/api/direction/current' },
  },
  {
    id: 'memory-substrate',
    name: 'Memory',
    url: MEMORY_SUBSTRATE_URL,
    intents: ['remember', 'forget', 'recall', 'search', 'memory', 'preference'],
    description: 'Persists and retrieves user memories, preferences, facts',
    endpoint: { method: 'POST', path: '/api/memory' },
  },
  {
    id: 'genie-conversation',
    name: 'Conversation',
    url: null,  // handled by runtime/genie itself
    intents: ['chat', 'talk', 'think', 'reflect', 'question', 'opine'],
    description: 'General conversation, reflection, opinion, thinking out loud',
    endpoint: null,
  },
];

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// === HEALTH ===
app.get('/health', (req, res) => send(res, 200, {
  status: 'healthy',
  service: 'intent-engine',
  port: PORT,
  specialists: SPECIALIST_REGISTRY.length,
  llm_provider: process.env.LLM_PROVIDER || 'anthropic',
  llm_model: process.env.LLM_MODEL || 'default',
}));
app.get('/ready', (req, res) => send(res, 200, { ready: true }));

// === SPECIALISTS LIST ===
app.get('/api/intent/specialists', (req, res) => send(res, 200, {
  specialists: SPECIALIST_REGISTRY.map(({ id, name, intents, description }) => ({ id, name, intents, description })),
}));

// === INTENT EXTRACTION (LLM) ===
async function extractIntent({ message, conversationHistory = [], userContext = '' }) {
  const llm = createLLMClient({
    provider: process.env.LLM_PROVIDER || 'anthropic',
    model: process.env.LLM_MODEL,  // provider default if unset
  });

  const specialistCatalog = SPECIALIST_REGISTRY
    .map(s => `- ${s.id}: ${s.description} [intents: ${s.intents.join(', ')}]`)
    .join('\n');

  const intentSchema = {
    type: 'object',
    properties: {
      primaryIntent: {
        type: 'string',
        enum: SPECIALIST_REGISTRY.flatMap(s => s.intents),
        description: 'The single best-matching intent tag from the specialist catalog',
      },
      targetSpecialist: {
        type: 'string',
        enum: SPECIALIST_REGISTRY.map(s => s.id),
        description: 'Which specialist should handle this?',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'How confident are you in this routing? 0=uncertain, 1=obvious',
      },
      entities: {
        type: 'object',
        description: 'Structured data extracted from the message (dates, names, amounts, items)',
      },
      needsContext: {
        type: 'boolean',
        description: 'True if this request would benefit from prior memories or goals',
      },
      reasoning: {
        type: 'string',
        description: 'One sentence: why this routing?',
      },
      alternativeSpecialists: {
        type: 'array',
        items: { type: 'string' },
        description: '1-3 backup specialists in priority order',
      },
    },
    required: ['primaryIntent', 'targetSpecialist', 'confidence', 'reasoning'],
  };

  const systemPrompt = `You are the intent router for a personal AI assistant called Genie.
Your job: classify each user message into ONE primary intent and pick the best specialist.

Available specialists:
${specialistCatalog}

Rules:
- Pick the SINGLE best specialist. The user shouldn't have to choose.
- If the message is general conversation/chat, use "genie-conversation".
- If unsure (confidence < 0.6), pick "genie-conversation" — better to chat than misroute.
- Extract entities (names, dates, amounts, products) when present.
- "needsContext" = true when the response would be better with prior memories (e.g. "how am I doing" needs history).
- Always provide a one-sentence reasoning.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContext ? `${userContext}\n\nUser: ${message}` : message },
  ];

  const result = await withStructuredOutput(llm, intentSchema, { messages });
  return result;
}

app.post('/api/intent/extract', requireAuth, async (req, res, next) => {
  try {
    const { message, conversationHistory = [], userContext = '' } = req.body;
    if (!message) return sendErr(res, 400, 'VALIDATION', 'message is required');

    const intent = await extractIntent({ message, conversationHistory, userContext });
    send(res, 200, intent);
  } catch (e) {
    log.error('Intent extraction failed', { error: e.message });
    // Fallback: route to conversation so the user gets SOMETHING
    send(res, 200, {
      primaryIntent: 'chat',
      targetSpecialist: 'genie-conversation',
      confidence: 0,
      reasoning: 'LLM unavailable — falling back to general conversation',
      fallback: true,
      error: e.message,
    });
  }
});

// === FULL ROUTING PLAN ===
app.post('/api/intent/route', requireAuth, async (req, res, next) => {
  try {
    const { message, conversationHistory = [], userId, userContext = '' } = req.body;
    if (!message) return sendErr(res, 400, 'VALIDATION', 'message is required');

    let intent;
    try {
      intent = await extractIntent({ message, conversationHistory, userContext });
    } catch (llmErr) {
      // LLM unavailable — fall back to conversation routing
      log.warn('LLM unavailable, falling back to conversation', { error: llmErr.message });
      intent = {
        primaryIntent: 'chat',
        targetSpecialist: 'genie-conversation',
        confidence: 0,
        reasoning: 'LLM unavailable — falling back to general conversation',
        fallback: true,
      };
    }

    const specialist = SPECIALIST_REGISTRY.find(s => s.id === intent.targetSpecialist);

    send(res, 200, {
      intent,
      routing: {
        targetSpecialist: intent.targetSpecialist,
        targetUrl: specialist?.url || null,
        endpoint: specialist?.endpoint || null,
        method: specialist?.endpoint?.method || null,
        path: specialist?.endpoint?.path || null,
        confidence: intent.confidence,
        shouldCall: intent.confidence >= 0.5 && specialist?.url !== null,
        fallbackSpecialists: (intent.alternativeSpecialists || []).map(id => {
          const alt = SPECIALIST_REGISTRY.find(s => s.id === id);
          return alt ? { id: alt.id, url: alt.url, endpoint: alt.endpoint } : null;
        }).filter(Boolean),
      },
    });
  } catch (e) {
    log.error('Routing failed', { error: e.message });
    send(res, 500, { error: 'routing_failed', message: e.message });
  }
});

requireEnv(['PORT'], { allowDev: true });

const server = app.listen(PORT, () => {
  log.info(`intent-engine listening on :${PORT}`);
  log.info(`specialists registered: ${SPECIALIST_REGISTRY.length}`);
});

installGracefulShutdown(server, 'intent-engine');

export default app;
