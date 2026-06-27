/**
 * genie-teacher — Teacher Agent (D1)
 *
 * Real LMS replacing the 73-LOC stub. Manages:
 *   - courses: catalog of courses (language, business, skill)
 *   - lessons: lessons within courses (text + key points + exercise)
 *   - enrollments: user enrollments in courses
 *   - progress: lesson-level progress (viewed / completed / score)
 *   - quizzes: simple in-lesson quizzes with answers
 *
 * Endpoints:
 *   GET    /health
 *   GET    /
 *   GET    /courses                                  — list courses (?category)
 *   GET    /courses/:courseId                        — course detail + lessons
 *   POST   /courses                                  — create course (admin)
 *   GET    /courses/:courseId/lessons                — lessons in order
 *   GET    /lessons/:lessonId                        — lesson detail
 *   POST   /lessons/:lessonId/complete/:userId       — mark lesson complete (with ?score=)
 *   POST   /courses/:courseId/enroll/:userId         — enroll user
 *   GET    /courses/:courseId/enroll/:userId         — check enrollment
 *   GET    /users/:userId/learning                   — user's enrollments + progress
 */

const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const { callLLM } = require('@rtmn/shared/lib/llm');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');

const teacherRoutes = require('./routes/teacher');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4739', 10);
const SERVICE_NAME = 'genie-teacher';

const coursesStore = new PersistentMap('teacher-courses', { serviceName: SERVICE_NAME });
const lessonsStore = new PersistentMap('teacher-lessons', { serviceName: SERVICE_NAME });
const enrollmentsStore = new PersistentMap('teacher-enrollments', { serviceName: SERVICE_NAME });
const progressStore = new PersistentMap('teacher-progress', { serviceName: SERVICE_NAME });

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

// Public health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Teacher Agent', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Teacher Agent',
    tagline: 'Your personal AI tutor. Real courses. Real lessons. Real progress.',
    endpoints: [
      'GET    /courses',
      'GET    /courses/:courseId',
      'POST   /courses',
      'GET    /courses/:courseId/lessons',
      'GET    /lessons/:lessonId',
      'POST   /lessons/:lessonId/complete/:userId',
      'POST   /courses/:courseId/enroll/:userId',
      'GET    /courses/:courseId/enroll/:userId',
      'GET    /users/:userId/learning',
    ],
  });
});

app.use(requireAuth);

app.use('/', teacherRoutes({ coursesStore, lessonsStore, enrollmentsStore, progressStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [coursesStore, lessonsStore, enrollmentsStore, progressStore],
});

// Seed: 3 courses (Spanish, Negotiation, Python) with 2-3 lessons each
autoSeed([
  {
    store: coursesStore,
    items: normalizeSeedData([
      {
        id: 'cr-spanish-101', title: 'Spanish for Travel', category: 'language',
        level: 'beginner', duration: '4 weeks', lessonsCount: 3,
        description: 'Greetings, directions, food, emergencies. Survive your next trip.',
        tags: ['travel', 'spanish', 'speaking'], createdAt: new Date().toISOString(),
      },
      {
        id: 'cr-negotiation', title: 'Negotiation Mastery', category: 'business',
        level: 'intermediate', duration: '6 weeks', lessonsCount: 3,
        description: 'BATNA, anchoring, principled negotiation. Win more without losing trust.',
        tags: ['business', 'negotiation', 'sales'], createdAt: new Date().toISOString(),
      },
      {
        id: 'cr-python-intro', title: 'Python for Non-Coders', category: 'skill',
        level: 'beginner', duration: '5 weeks', lessonsCount: 3,
        description: 'Variables, loops, functions, and shipping your first script.',
        tags: ['coding', 'python', 'automation'], createdAt: new Date().toISOString(),
      },
    ]),
  },
  {
    store: lessonsStore,
    items: normalizeSeedData([
      { id: 'ls-sp-1', courseId: 'cr-spanish-101', order: 1, title: 'Greetings & basics',
        body: 'Hola = hello. Buenos días = good morning. ¿Cómo estás? = how are you?\n\nKey phrases:\n- Mucho gusto (pleased to meet you)\n- Adiós (goodbye)\n- Por favor (please)\n- Gracias (thank you)',
        quiz: [{ q: 'How do you say "good morning"?', options: ['Hola', 'Buenos días', 'Adiós', 'Gracias'], answer: 1 }] },
      { id: 'ls-sp-2', courseId: 'cr-spanish-101', order: 2, title: 'Directions',
        body: '¿Dónde está…? = Where is…?\n- a la derecha (to the right)\n- a la izquierda (to the left)\n- recto (straight)\n- la esquina (the corner)',
        quiz: [{ q: '"A la derecha" means…', options: ['to the left', 'straight', 'to the right', 'behind'], answer: 2 }] },
      { id: 'ls-sp-3', courseId: 'cr-spanish-101', order: 3, title: 'Food & restaurants',
        body: 'La cuenta, por favor = the check, please.\n- el menú (the menu)\n- la comida (the food)\n- delicioso (delicious)\n- sin picante (not spicy)',
        quiz: [{ q: '"La cuenta" means…', options: ['the food', 'the menu', 'the bill', 'the tip'], answer: 2 }] },

      { id: 'ls-ng-1', courseId: 'cr-negotiation', order: 1, title: 'Know your BATNA',
        body: 'BATNA = Best Alternative To a Negotiated Agreement.\n\nBefore any negotiation, identify your walk-away. The party with the better BATNA has more power.\n\nExercise: write down your BATNA for your current biggest deal.',
        quiz: [{ q: 'BATNA stands for…', options: ['Best Alternative To Negotiated Agreement', 'Basic Agreement To Negotiate', 'Bottom-line Anchor To Negotiate', 'Best Aim To Negotiate'], answer: 0 }] },
      { id: 'ls-ng-2', courseId: 'cr-negotiation', order: 2, title: 'Anchoring',
        body: 'Whoever names a number first sets the anchor. The other party adjusts around it.\n\nTip: anchor high (when selling) or low (when buying) — but credibly.',
        quiz: [{ q: 'When selling, you should anchor…', options: ['low', 'high', 'in the middle', 'randomly'], answer: 1 }] },
      { id: 'ls-ng-3', courseId: 'cr-negotiation', order: 3, title: 'Principled negotiation',
        body: 'Fisher & Ury: Separate people from problem. Interests, not positions. Options for mutual gain. Objective criteria.',
        quiz: [{ q: '"Separate people from problem" comes from…', options: ['Chris Voss', 'Fisher & Ury', 'Robert Cialdini', 'Dale Carnegie'], answer: 1 }] },

      { id: 'ls-py-1', courseId: 'cr-python-intro', order: 1, title: 'Variables & print',
        body: 'name = "Alex"\nprint("Hello, " + name)\n\nPython is dynamically typed. No semicolons. Indentation matters.',
        quiz: [{ q: 'How do you print in Python?', options: ['echo', 'console.log', 'print', 'printf'], answer: 2 }] },
      { id: 'ls-py-2', courseId: 'cr-python-intro', order: 2, title: 'If statements',
        body: 'if x > 10:\n    print("big")\nelse:\n    print("small")\n\nIndentation (4 spaces) replaces braces.',
        quiz: [{ q: 'Python if-blocks use…', options: ['braces {}', 'indentation', 'end keywords', 'BEGIN/END'], answer: 1 }] },
      { id: 'ls-py-3', courseId: 'cr-python-intro', order: 3, title: 'Loops',
        body: 'for i in range(5):\n    print(i)\n\nwhile x < 100:\n    x += 1',
        quiz: [{ q: 'range(5) yields…', options: ['0 to 5', '1 to 5', '0 to 4', '5 numbers starting at 1'], answer: 2 }] },
    ]),
  },
  {
    store: enrollmentsStore,
    items: normalizeSeedData([
      { id: 'en-1', userId: 'user-001', courseId: 'cr-spanish-101', enrolledAt: new Date().toISOString() },
    ]),
  },
  {
    store: progressStore,
    items: normalizeSeedData([
      { id: 'pr-1', userId: 'user-001', lessonId: 'ls-sp-1', score: 100, completedAt: new Date().toISOString() },
    ]),
  },
]);

const server = app.listen(PORT, () => {
  console.log(`Genie Teacher Agent running on port ${PORT}`);
});

installGracefulShutdown(server);