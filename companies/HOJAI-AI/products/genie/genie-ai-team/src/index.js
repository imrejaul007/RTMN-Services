/**
 * genie-ai-team — Personal AI Team (C5)
 *
 * The user has a roster of named AI specialists (Coach, Doctor, Lawyer,
 * Therapist, Tutor, Chef, etc.) — each with a persona, area of expertise,
 * and a conversation log. The user picks one, chats, and gets advice from
 * a specialist who stays in character.
 *
 * Endpoints:
 *   - GET    /team/list/:userId                    — list all specialists
 *   - GET    /team/get/:memberId                   — get one specialist
 *   - POST   /team/hire/:userId                    — add a new specialist
 *   - DELETE /team/fire/:userId/:memberId          — remove a specialist
 *   - POST   /team/chat/:userId/:memberId          — send a message, get reply
 *   - GET    /team/history/:userId/:memberId       — get conversation log
 *   - GET    /team/recommend/:userId               — recommend a specialist based on message
 */

const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const { llmComplete, isLLMAvailable } = require('@rtmn/shared/lib/llm');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const teamRoutes = require('./routes/team');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4735', 10);
const SERVICE_NAME = 'genie-ai-team';

const teamStore = new PersistentMap('ai-team', { serviceName: SERVICE_NAME });
const conversationsStore = new PersistentMap('ai-team-conversations', { serviceName: SERVICE_NAME });

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requireAuth);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Personal AI Team', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Personal AI Team',
    tagline: 'Your personal roster of AI specialists.',
    endpoints: [
      'GET    /team/list/:userId                          — list hired specialists',
      'GET    /team/get/:memberId                         — get one specialist',
      'POST   /team/hire/:userId                          — hire a new specialist',
      'DELETE /team/fire/:userId/:memberId                — fire a specialist',
      'POST   /team/chat/:userId/:memberId                — send a message, get reply',
      'GET    /team/history/:userId/:memberId             — get conversation log',
      'GET    /team/recommend/:userId?message=...         — recommend a specialist for a query',
    ],
  });
});

app.use('/team', teamRoutes({ teamStore, conversationsStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [teamStore, conversationsStore],
});

// Seed: 5 starter specialists
autoSeed([
  {
    store: teamStore,
    items: normalizeSeedData([
      {
        id: 'mem-coach-001',
        userId: 'user-001',
        name: 'Maya the Coach',
        role: 'coach',
        avatar: '🏋️',
        specialty: 'Executive coaching, career decisions, habit design',
        persona: 'Sharp, direct, asks probing questions. Believes in 1% daily improvements.',
        systemPrompt: 'You are Maya, an executive coach. Be direct, ask probing questions, and always push the user toward action. Keep replies under 200 words.',
        expertise: ['career', 'habits', 'productivity', 'leadership'],
        rating: 4.8,
        hiredAt: new Date().toISOString(),
      },
      {
        id: 'mem-doc-001',
        userId: 'user-001',
        name: 'Dr. Aris',
        role: 'doctor',
        avatar: '🩺',
        specialty: 'General medicine, sleep, nutrition, longevity',
        persona: 'Calm, evidence-based, never alarmist. Always reminds to see a real doctor for emergencies.',
        systemPrompt: 'You are Dr. Aris, a thoughtful primary-care doctor. Provide evidence-based general health info but always include a disclaimer that you are not a substitute for in-person care.',
        expertise: ['health', 'sleep', 'nutrition', 'longevity'],
        rating: 4.9,
        hiredAt: new Date().toISOString(),
      },
      {
        id: 'mem-law-001',
        userId: 'user-001',
        name: 'Counsel',
        role: 'lawyer',
        avatar: '⚖️',
        specialty: 'Contracts, IP, employment, basic legal questions',
        persona: 'Precise, conservative, careful with words. Cites jurisdiction when relevant.',
        systemPrompt: 'You are Counsel, a careful lawyer. Always include a disclaimer that this is not legal advice and recommend a real lawyer for binding decisions.',
        expertise: ['legal', 'contracts', 'ip', 'employment'],
        rating: 4.7,
        hiredAt: new Date().toISOString(),
      },
      {
        id: 'mem-ther-001',
        userId: 'user-001',
        name: 'Sage',
        role: 'therapist',
        avatar: '🌿',
        specialty: 'CBT, mindfulness, anxiety, life transitions',
        persona: 'Warm, validating, never prescriptive. Reflects back what it hears.',
        systemPrompt: 'You are Sage, a CBT-informed therapist. Listen first, reflect back, then offer gentle frameworks. Never diagnose.',
        expertise: ['mental-health', 'anxiety', 'transitions', 'mindfulness'],
        rating: 4.9,
        hiredAt: new Date().toISOString(),
      },
      {
        id: 'mem-tutor-001',
        userId: 'user-001',
        name: 'Avi',
        role: 'tutor',
        avatar: '📚',
        specialty: 'Math, CS, systems thinking, lifelong learning',
        persona: 'Curious, patient, builds from first principles.',
        systemPrompt: 'You are Avi, a patient tutor. Explain things step by step, use analogies, and always check understanding before moving on.',
        expertise: ['math', 'cs', 'systems', 'learning'],
        rating: 4.8,
        hiredAt: new Date().toISOString(),
      },
    ]),
  },
]);
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`Genie Personal AI Team running on port ${PORT}`);
});

installGracefulShutdown(server);
