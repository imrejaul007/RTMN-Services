/**
 * Genie Life University — seed data
 *
 * The route modules own their in-memory Maps (`courses`, `enrollments`,
 * `userCurricula`, `curriculumTemplates`, `certificates`).  We don't want
 * to scatter store wiring across the route files, so this module:
 *
 *   1. Defines the seed datasets (idempotent, normalized).
 *   2. Provides `applySeeds(stores)` which takes a `{ name → Map }` map and
 *      inserts items only when each store is empty.
 *
 * The actual Map wiring happens in src/index.js, where each route module is
 * required for its side-effects and we read the Maps off `router._store`
 * (a tiny convention we set on the router).  If a route module hasn't
 * exposed its store, the corresponding seed plan is silently skipped.
 */

const { normalizeSeedData, autoSeed } = require('@rtmn/shared/lib/genie-readiness');

const courseCatalog = [
  {
    id: 'leadership-fundamentals',
    title: 'Leadership Fundamentals',
    description: 'Master the core principles of effective leadership',
    instructor: 'Dr. Sarah Chen',
    duration: '4 weeks',
    difficulty: 'beginner',
    lessons: 12,
    category: 'leadership',
    skills: ['Communication', 'Team Building', 'Decision Making'],
    rating: 4.8,
    students: 15420,
  },
  {
    id: 'professional-skills',
    title: 'Professional Skills Mastery',
    description: 'Essential skills for career success',
    instructor: 'Michael Torres',
    duration: '3 weeks',
    difficulty: 'beginner',
    lessons: 10,
    category: 'professional',
    skills: ['Presentation', 'Time Management', 'Networking'],
    rating: 4.7,
    students: 23150,
  },
  {
    id: 'data-science',
    title: 'Data Science Essentials',
    description: 'Learn data science from scratch',
    instructor: 'Prof. Lin Wei',
    duration: '8 weeks',
    difficulty: 'intermediate',
    lessons: 24,
    category: 'technology',
    skills: ['Python', 'Statistics', 'Machine Learning'],
    rating: 4.9,
    students: 31200,
  },
  {
    id: 'ai-fundamentals',
    title: 'AI Fundamentals for Business',
    description: 'Practical AI knowledge for managers',
    instructor: 'Dr. Anika Rao',
    duration: '6 weeks',
    difficulty: 'intermediate',
    lessons: 18,
    category: 'technology',
    skills: ['AI Concepts', 'Prompt Engineering', 'GenAI Strategy'],
    rating: 4.9,
    students: 12800,
  },
  {
    id: 'creative-mastery',
    title: 'Creative Mastery',
    description: 'Unleash your creative potential',
    instructor: 'Yara Mendes',
    duration: '4 weeks',
    difficulty: 'beginner',
    lessons: 12,
    category: 'creative',
    skills: ['Design Thinking', 'Storytelling', 'Visual Communication'],
    rating: 4.6,
    students: 9800,
  },
  {
    id: 'executive-presence',
    title: 'Executive Presence',
    description: 'Develop the gravitas of senior leaders',
    instructor: 'James Whitfield',
    duration: '5 weeks',
    difficulty: 'advanced',
    lessons: 15,
    category: 'leadership',
    skills: ['Communication', 'Stakeholder Management', 'Decision Making'],
    rating: 4.85,
    students: 7200,
  },
  {
    id: 'business-strategy',
    title: 'Business Strategy Essentials',
    description: 'Strategic thinking for executives',
    instructor: 'Dr. Maya Patel',
    duration: '7 weeks',
    difficulty: 'advanced',
    lessons: 21,
    category: 'business',
    skills: ['Strategy', 'Analytics', 'Frameworks'],
    rating: 4.75,
    students: 18500,
  },
];

const learningPaths = [
  {
    id: 'leadership-mastery',
    name: 'Leadership Mastery',
    description: 'Complete leadership development from beginner to executive',
    duration: '6 months',
    difficulty: 'intermediate',
    courses: ['leadership-fundamentals', 'professional-skills', 'executive-presence', 'business-strategy'],
    skills: ['Communication', 'Decision Making', 'Team Building', 'Strategic Thinking'],
    careerTracks: ['Manager', 'Director', 'VP', 'C-Suite'],
  },
  {
    id: 'entrepreneur-track',
    name: 'Entrepreneur Track',
    description: 'From idea to successful business launch',
    duration: '8 months',
    difficulty: 'advanced',
    courses: ['creative-mastery', 'business-strategy', 'professional-skills', 'leadership-fundamentals'],
    skills: ['Business Strategy', 'Finance', 'Marketing', 'Operations'],
    careerTracks: ['Founder', 'Co-Founder', 'Startup Executive'],
  },
  {
    id: 'tech-leader',
    name: 'Tech Leader Path',
    description: 'Bridge engineering and leadership',
    duration: '5 months',
    difficulty: 'intermediate',
    courses: ['ai-fundamentals', 'data-science', 'leadership-fundamentals', 'executive-presence'],
    skills: ['AI/ML', 'Communication', 'Strategy', 'Team Building'],
    careerTracks: ['Engineering Manager', 'Director of Engineering', 'CTO'],
  },
];

const enrollments = [
  {
    id: 'enr-demo-001',
    userId: 'user-demo-1',
    courseId: 'leadership-fundamentals',
    progress: 25,
    enrolledAt: '2026-06-01T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'enr-demo-002',
    userId: 'user-demo-2',
    courseId: 'data-science',
    progress: 60,
    enrolledAt: '2026-05-15T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'enr-demo-003',
    userId: 'user-demo-1',
    courseId: 'ai-fundamentals',
    progress: 100,
    enrolledAt: '2026-04-01T00:00:00.000Z',
    status: 'completed',
  },
];

const certificates = [
  {
    id: 'cert-demo-001',
    userId: 'user-demo-1',
    courseId: 'ai-fundamentals',
    title: 'AI Fundamentals Certified',
    issuedAt: '2026-05-30T00:00:00.000Z',
    score: 92,
    validUntil: '2028-05-30T00:00:00.000Z',
  },
];

/**
 * Apply seed data to the provided stores map.  `stores` is a flat map of
 * `{ name: Map }`.  Each Map will be filled only if currently empty.
 */
function applySeeds(stores, opts = {}) {
  const plans = [
    { store: stores.courses, items: normalizeSeedData(courseCatalog) },
    { store: stores.curriculumTemplates, items: normalizeSeedData(learningPaths) },
    { store: stores.enrollments, items: normalizeSeedData(enrollments) },
    { store: stores.certificates, items: normalizeSeedData(certificates) },
  ];
  return autoSeed(plans, opts);
}

module.exports = {
  applySeeds,
  courseCatalog,
  learningPaths,
  enrollments,
  certificates,
};