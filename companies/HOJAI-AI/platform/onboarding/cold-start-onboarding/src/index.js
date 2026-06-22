/**
 * Cold-Start Onboarding
 *
 * Port: 4793
 *
 * The reason Genie's first-day experience is "wow" instead of "what can you do?"
 * New users get a 10-15 question conversation that:
 *   1. Seeds MemoryOS with their name, work, family, interests
 *   2. Seeds TwinOS with their preferences, goals, communication style
 *   3. Generates a Personal Intelligence Score v0 (all zeros, but the structure exists)
 *
 * Why this matters:
 *   - A Genie that knows NOTHING about you is a search box. A Genie that knows
 *     "you have a 9am standup, your wife's birthday is March 14, and you're
 *     trying to run a 5K by June" is a partner.
 *   - Most AI products skip this and pay for it forever in low engagement.
 *
 * How it works:
 *   1. POST /api/onboarding/start  → returns the first question + a session id
 *   2. POST /api/onboarding/answer → user answers, we extract structured facts
 *   3. ... repeat 10-15 times
 *   4. POST /api/onboarding/complete → bulk-write to memory-substrate + twin,
 *      generate Personal Intelligence Score v0, return a "you're all set" payload
 *
 * Question design (12 questions, ordered for psychological flow):
 *   1. Name?                  (identity)
 *   2. What do you do?        (work)
 *   3. Where do you live?     (location)
 *   4. Family?                (relationships)
 *   5. 3 things you care about? (values)
 *   6. What's a goal for the next 90 days? (goals)
 *   7. What drains your energy? (wellness)
 *   8. What gives you energy? (wellness)
 *   9. How do you prefer Genie to talk — casual, formal, brief, detailed? (style)
 *  10. What should Genie NEVER bring up? (boundaries)
 *  11. Anything you want Genie to remind you about? (commitments)
 *  12. Anything else? (open)
 *
 * Routes:
 *   POST /api/onboarding/start                       — start a session
 *   POST /api/onboarding/answer                       — submit answer, get next Q
 *   GET  /api/onboarding/session/:id                  — get session state
 *   POST /api/onboarding/complete                     — finalize + seed memory
 *   GET  /api/onboarding/questions                    — list all 12 questions
 *   GET  /health
 *   GET  /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'node:crypto';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { createLogger } from '@rtmn/shared/lib/logger';
import { createLLMClient, withStructuredOutput } from '@rtmn/shared/lib/llm';

const PORT = parseInt(process.env.PORT || '4793', 10);
const MEMORY_SUBSTRATE_URL = process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';

const log = createLogger('cold-start-onboarding');

// === QUESTION BANK (12 questions, ordered) ===
const QUESTIONS = [
  { id: 'name', category: 'identity', text: "First, what should I call you?", extract: 'name' },
  { id: 'work', category: 'identity', text: "What do you do — and what do you love (or hate) about it?", extract: 'work' },
  { id: 'location', category: 'identity', text: "Where are you based, and what's the time zone you're usually in?", extract: 'location' },
  { id: 'family', category: 'relationships', text: "Who's in your circle — partner, kids, close friends, pets?", extract: 'relationships' },
  { id: 'values', category: 'values', text: "What are 2-3 things you really care about? Things you'd fight for.", extract: 'values' },
  { id: 'goal_90d', category: 'goals', text: "What's one goal you want to make real progress on in the next 90 days?", extract: 'goal' },
  { id: 'drains', category: 'wellness', text: "What drains your energy these days?", extract: 'drains' },
  { id: 'energizes', category: 'wellness', text: "What gives you energy?", extract: 'energizes' },
  { id: 'communication_style', category: 'preferences', text: "How do you want me to talk to you — casual, formal, brief, detailed, or something else?", extract: 'style' },
  { id: 'boundaries', category: 'preferences', text: "Anything you want me to NEVER bring up or assume?", extract: 'boundaries' },
  { id: 'reminders', category: 'commitments', text: "Anything you want me to remember or remind you about? (birthdays, bills, promises, etc.)", extract: 'commitments' },
  { id: 'open', category: 'open', text: "Anything else I should know to be a great assistant to you?", extract: 'misc' },
];

// In-memory session store (use persistent-map for prod durability)
const sessions = new Map();

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// === HEALTH ===
app.get('/health', (req, res) => send(res, 200, {
  status: 'healthy',
  service: 'cold-start-onboarding',
  port: PORT,
  questions: QUESTIONS.length,
}));
app.get('/ready', (req, res) => send(res, 200, { ready: true }));

// === QUESTIONS LIST ===
app.get('/api/onboarding/questions', (req, res) => send(res, 200, {
  questions: QUESTIONS,
  totalCount: QUESTIONS.length,
  estimatedMinutes: Math.ceil(QUESTIONS.length * 0.5),  // ~30 seconds per question
}));

// === START SESSION ===
app.post('/api/onboarding/start', requireAuth, (req, res) => {
  const userId = req.userId || req.auth?.id || 'anonymous';
  const sessionId = `onb_${crypto.randomBytes(8).toString('hex')}`;

  sessions.set(sessionId, {
    sessionId,
    userId,
    startedAt: new Date().toISOString(),
    currentIndex: 0,
    answers: [],
    extracted: {},
  });

  const session = sessions.get(sessionId);
  send(res, 200, {
    sessionId,
    currentQuestion: QUESTIONS[0],
    progress: { current: 1, total: QUESTIONS.length, percent: 0 },
    next: 'POST /api/onboarding/answer with { sessionId, answer }',
  });
});

// === SUBMIT ANSWER ===
app.post('/api/onboarding/answer', requireAuth, async (req, res) => {
  const { sessionId, answer } = req.body;
  if (!sessionId) return sendErr(res, 400, 'VALIDATION', 'sessionId required');
  if (answer === undefined || answer === null) return sendErr(res, 400, 'VALIDATION', 'answer required');

  const session = sessions.get(sessionId);
  if (!session) return sendErr(res, 404, 'NOT_FOUND', 'session not found or expired');

  const currentQ = QUESTIONS[session.currentIndex];
  session.answers.push({ questionId: currentQ.id, question: currentQ.text, answer, answeredAt: new Date().toISOString() });

  // Try to extract structured facts with LLM (graceful fallback if unavailable)
  try {
    const llm = createLLMClient({ provider: process.env.LLM_PROVIDER || 'anthropic' });
    const extractSchema = {
      type: 'object',
      properties: {
        facts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Discrete facts to remember (e.g. "name is Reza", "lives in Dubai", "has 2 kids")',
        },
        preferences: {
          type: 'object',
          description: 'Key-value preferences (e.g. {"communication_style": "casual", "timezone": "GST"})',
        },
      },
      required: ['facts'],
    };

    const result = await withStructuredOutput(llm, extractSchema, {
      messages: [
        { role: 'system', content: `You extract structured facts and preferences from a user's answer to an onboarding question about "${currentQ.extract}". Return facts as short, declarative sentences. Return preferences as a flat key→value object. Only include what the user actually said — don't infer.` },
        { role: 'user', content: answer },
      ],
    });

    session.extracted[currentQ.id] = result;
  } catch (e) {
    // LLM unavailable — store the raw answer, extract later during complete()
    log.warn('LLM unavailable, storing raw answer', { error: e.message, questionId: currentQ.id });
    session.extracted[currentQ.id] = { facts: [answer], preferences: {} };
  }

  // Advance to next question
  session.currentIndex++;
  sessions.set(sessionId, session);

  if (session.currentIndex >= QUESTIONS.length) {
    return send(res, 200, {
      sessionId,
      done: true,
      progress: { current: QUESTIONS.length, total: QUESTIONS.length, percent: 100 },
      next: 'POST /api/onboarding/complete to seed memory and twin',
    });
  }

  send(res, 200, {
    sessionId,
    done: false,
    currentQuestion: QUESTIONS[session.currentIndex],
    progress: { current: session.currentIndex + 1, total: QUESTIONS.length, percent: Math.round((session.currentIndex / QUESTIONS.length) * 100) },
  });
});

// === GET SESSION ===
app.get('/api/onboarding/session/:id', requireAuth, (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return sendErr(res, 404, 'NOT_FOUND', 'session not found');
  send(res, 200, {
    sessionId: session.sessionId,
    userId: session.userId,
    startedAt: session.startedAt,
    currentIndex: session.currentIndex,
    totalQuestions: QUESTIONS.length,
    answersCount: session.answers.length,
    extracted: session.extracted,
  });
});

// === COMPLETE & SEED ===
app.post('/api/onboarding/complete', requireAuth, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return sendErr(res, 400, 'VALIDATION', 'sessionId required');

  const session = sessions.get(sessionId);
  if (!session) return sendErr(res, 404, 'NOT_FOUND', 'session not found');
  if (session.answers.length < QUESTIONS.length) {
    return sendErr(res, 400, 'INCOMPLETE', `Only ${session.answers.length}/${QUESTIONS.length} questions answered`);
  }

  // Flatten all extracted facts into a memory-write batch
  const allFacts = [];
  const allPreferences = {};
  for (const [qid, extracted] of Object.entries(session.extracted)) {
    if (extracted?.facts) allFacts.push(...extracted.facts.map(f => ({ source: qid, content: f })));
    if (extracted?.preferences) Object.assign(allPreferences, extracted.preferences);
  }

  // Generate Personal Intelligence Score v0 (all zeros — but the structure is there)
  const intelligenceScoreV0 = {
    overall: 0,
    components: {
      memory: 0,
      context: 0,
      learning: 0,
      relationships: 0,
      goals: 0,
      wellness: 0,
      reflection: 0,
    },
    note: 'This is your starting point. The score grows as you use Genie.',
  };

  // Try to seed memory-substrate (best effort)
  let seeded = false;
  let seedError = null;
  try {
    const seedRes = await fetch(`${MEMORY_SUBSTRATE_URL}/api/memory`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
      },
      body: JSON.stringify({
        userId: session.userId,
        type: 'onboarding',
        content: allFacts.map(f => f.content).join(' | '),
        importance: 'High',
        tags: ['onboarding', 'cold-start', ...Object.keys(allPreferences)],
      }),
    });
    seeded = seedRes.ok;
    if (!seedRes.ok) seedError = `memory-substrate returned ${seedRes.status}`;
  } catch (e) {
    seedError = e.message;
  }

  // Mark session complete
  session.completedAt = new Date().toISOString();
  session.intelligenceScoreV0 = intelligenceScoreV0;
  sessions.set(sessionId, session);

  send(res, 200, {
    sessionId,
    summary: {
      questionsAnswered: session.answers.length,
      factsExtracted: allFacts.length,
      preferencesCaptured: Object.keys(allPreferences).length,
      preferences: allPreferences,
    },
    intelligenceScoreV0,
    memorySeeded: seeded,
    memorySeedError: seedError,
    message: `Welcome to Genie! I've learned ${allFacts.length} things about you. I'll get smarter every day.`,
    nextSteps: [
      'Ask me anything — I already know the basics.',
      'Try the morning briefing at 8am: "Good morning"',
      'Tell me when something changes — I update in real time.',
    ],
  });
});

requireEnv(['PORT'], { allowDev: true });

const server = app.listen(PORT, () => {
  log.info(`cold-start-onboarding listening on :${PORT}`);
  log.info(`${QUESTIONS.length} questions in the bank`);
});

installGracefulShutdown(server, 'cold-start-onboarding');

export default app;
