/**
 * Life Timeline Intelligence — v1.0.0
 * ===================================
 * Tracks life chapters, milestones, and personal evolution:
 * - Life chapter detection
 * - Milestone tracking
 * - Identity evolution
 * - Anniversary detection
 * - Personal growth insights
 *
 * Port: 4883
 */

import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Services
import { ChapterDetector } from './services/chapterDetector.js';

// Types
import type {
  LifeEvent,
  LifeChapter,
  LifeChapterData,
  TimelineContext,
  Anniversary
} from './types/index.js';

// ── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Storage ─────────────────────────────────────────────────────────────────

// In-memory storage (would use MemoryOS in production)
const events = new Map<string, LifeEvent[]>();
const chapters = new Map<string, LifeChapterData[]>();
const userProfiles = new Map<string, UserProfile>();

interface UserProfile {
  userId: string;
  birthYear: number;
  currentChapter: LifeChapter;
  createdAt: string;
  updatedAt: string;
}

// ── Request Schemas ───────────────────────────────────────────────────────────

const AddEventSchema = z.object({
  userId: z.string().min(1),
  type: z.enum([
    'achievement', 'failure', 'relationship-start', 'relationship-end',
    'career-change', 'location-change', 'health-event', 'financial-event',
    'learning', 'travel', 'family-event', 'spiritual-event', 'personal-growth', 'milestone'
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string().optional(),
  category: z.enum([
    'personal', 'career', 'health', 'finance', 'relationship',
    'family', 'education', 'travel', 'spiritual', 'creative', 'social'
  ]).optional(),
  impact: z.enum(['low', 'moderate', 'high', 'transformative']).optional(),
  emotions: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
  location: z.string().optional(),
  isMilestone: z.boolean().optional(),
  milestoneType: z.enum([
    'birthday', 'anniversary', 'graduation', 'promotion', 'marriage',
    'child-birth', 'first-home', 'first-company', 'retirement', 'award', 'recovery'
  ]).optional()
});

const GetTimelineSchema = z.object({
  userId: z.string().min(1),
  startYear: z.number().optional(),
  endYear: z.number().optional(),
  chapter: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().optional()
});

const GenerateReflectionSchema = z.object({
  userId: z.string().min(1),
  timeRange: z.enum(['week', 'month', 'year', 'lifetime']).optional(),
  focus: z.enum(['growth', 'relationships', 'career', 'emotional']).optional()
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/event
 * Add a new life event
 */
app.post('/api/event', async (req, res) => {
  try {
    const data = AddEventSchema.parse(req.body);

    const userEvents = events.get(data.userId) || [];
    const currentYear = new Date().getFullYear();

    const event: LifeEvent = {
      id: uuidv4(),
      userId: data.userId,
      type: data.type,
      title: data.title,
      description: data.description || '',
      date: data.date || new Date().toISOString().split('T')[0],
      year: parseInt((data.date || new Date().toISOString()).substring(0, 4)),
      category: data.category || 'personal',
      impact: data.impact || 'moderate',
      emotions: data.emotions || [],
      people: data.people,
      location: data.location,
      milestone: data.isMilestone || false,
      milestoneType: data.milestoneType,
      importance: data.isMilestone ? 9 : 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    userEvents.push(event);
    events.set(data.userId, userEvents);

    // Check for chapter transition
    const profile = userProfiles.get(data.userId);
    let chapterUpdate: LifeChapterData | undefined;

    if (profile) {
      const careerEvents = userEvents.filter(e => e.category === 'career' || e.type === 'career-change');
      const newChapter = ChapterDetector.detectCurrentChapter(
        currentYear - profile.birthYear,
        userEvents.slice(-20),
        careerEvents
      );

      if (newChapter !== profile.currentChapter) {
        profile.currentChapter = newChapter;
        profile.updatedAt = new Date().toISOString();
        userProfiles.set(data.userId, profile);

        chapterUpdate = ChapterDetector.buildChapterData(
          newChapter,
          currentYear,
          userEvents
        );
      }
    }

    // Generate anniversaries for milestones
    const anniversaries = event.milestone ? detectAnniversaries(event, currentYear) : [];

    res.json({
      success: true,
      event,
      chapterUpdate,
      anniversaries
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[life-timeline]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/timeline/:userId
 * Get timeline with events, chapters, and stats
 */
app.get('/api/timeline/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startYear, endYear, chapter, category, limit } = req.query;

    let userEvents = events.get(userId) || [];

    // Apply filters
    if (startYear) {
      userEvents = userEvents.filter(e => e.year >= parseInt(startYear as string));
    }
    if (endYear) {
      userEvents = userEvents.filter(e => e.year <= parseInt(endYear as string));
    }
    if (category) {
      userEvents = userEvents.filter(e => e.category === category);
    }

    // Sort by date descending
    userEvents.sort((a, b) => new Date(b.date).localeCompare(new Date(a.date)));

    // Apply limit
    if (limit) {
      userEvents = userEvents.slice(0, parseInt(limit as string));
    }

    // Get chapters
    const userChapters = chapters.get(userId) || [];

    // Detect anniversaries
    const currentYear = new Date().getFullYear();
    const anniversaries = userEvents
      .filter(e => e.milestone)
      .flatMap(e => detectAnniversaries(e, currentYear));

    // Calculate stats
    const stats = calculateStats(userEvents);

    res.json({
      success: true,
      events: userEvents,
      chapters: userChapters,
      anniversaries,
      stats
    });
  } catch (error) {
    console.error('[life-timeline]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/profile
 * Create or update user profile
 */
app.post('/api/profile', async (req, res) => {
  try {
    const { userId, birthYear } = req.body;

    if (!userId || !birthYear) {
      return res.status(400).json({ success: false, error: 'userId and birthYear required' });
    }

    const currentYear = new Date().getFullYear();
    const userEvents = events.get(userId) || [];
    const careerEvents = userEvents.filter(e => e.category === 'career' || e.type === 'career-change');
    const currentChapter = ChapterDetector.detectCurrentChapter(
      currentYear - birthYear,
      userEvents.slice(-20),
      careerEvents
    );

    const profile: UserProfile = {
      userId,
      birthYear,
      currentChapter,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    userProfiles.set(userId, profile);

    // Generate initial chapters
    const chapterData = generateChapters(userId, userEvents, birthYear);
    chapters.set(userId, chapterData);

    res.json({
      success: true,
      profile,
      currentChapter: chapterData.find(c => c.status === 'current')
    });
  } catch (error) {
    console.error('[life-timeline]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/profile/:userId
 * Get user profile and current state
 */
app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;

  const profile = userProfiles.get(userId);
  if (!profile) {
    return res.status(404).json({ success: false, error: 'Profile not found' });
  }

  const userEvents = events.get(userId) || [];
  const currentYear = new Date().getFullYear();

  // Get current chapter
  const careerEvents = userEvents.filter(e => e.category === 'career' || e.type === 'career-change');
  const currentChapter = ChapterDetector.detectCurrentChapter(
    currentYear - profile.birthYear,
    userEvents.slice(-20),
    careerEvents
  );

  // Get recent events
  const recentEvents = userEvents
    .sort((a, b) => new Date(b.date).localeCompare(new Date(a.date)))
    .slice(0, 5);

  // Get upcoming anniversaries
  const upcomingAnniversaries = userEvents
    .filter(e => e.milestone)
    .flatMap(e => detectAnniversaries(e, currentYear))
    .filter(a => a.yearsSince > 0);

  res.json({
    success: true,
    profile,
    currentChapter,
    currentChapterTitle: ChapterDetector.generateChapterTitle(currentChapter, currentYear),
    recentEvents,
    upcomingAnniversaries,
    totalEvents: userEvents.length
  });
});

/**
 * POST /api/reflection
 * Generate AI reflection on life events
 */
app.post('/api/reflection', async (req, res) => {
  try {
    const { userId, timeRange, focus } = GenerateReflectionSchema.parse(req.body);

    const profile = userProfiles.get(userId);
    const userEvents = events.get(userId) || [];

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    // Calculate time range
    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }

    // Filter events by time range
    const relevantEvents = userEvents.filter(e => new Date(e.date) >= cutoffDate);

    // Generate reflection
    const reflection = generateReflection(profile, relevantEvents, focus);

    // Generate growth insights
    const insights = generateGrowthInsights(userEvents, focus);

    // Get milestones
    const milestones = userEvents
      .filter(e => e.milestone)
      .map(e => ({
        title: e.title,
        date: e.date,
        type: e.milestoneType,
        impact: e.importance
      }));

    res.json({
      success: true,
      reflection,
      insights,
      milestones,
      eventCount: relevantEvents.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[life-timeline]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/context/:userId
 * Get timeline context for voice conversations
 */
app.get('/api/context/:userId', async (req, res) => {
  const { userId } = req.params;

  const profile = userProfiles.get(userId);
  const userEvents = events.get(userId) || [];

  if (!profile) {
    return res.status(404).json({ success: false, error: 'Profile not found' });
  }

  const currentYear = new Date().getFullYear();

  // Build context
  const context: TimelineContext = {
    userId,
    currentChapter: profile.currentChapter,
    currentGoals: extractGoals(userEvents),
    recentEvents: userEvents
      .sort((a, b) => new Date(b.date).localeCompare(new Date(a.date)))
      .slice(0, 5),
    upcomingMilestones: userEvents
      .filter(e => e.milestone)
      .flatMap(e => detectAnniversaries(e, currentYear))
      .filter(a => a.yearsSince > 0),
    emotionalState: calculateEmotionalState(userEvents)
  };

  // Generate growth insight
  const insights = generateGrowthInsights(userEvents);
  if (insights.length > 0) {
    context.growthInsight = insights[0].insight;
  }

  res.json({
    success: true,
    context
  });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'life-timeline-intelligence',
    port: process.env.PORT || 4883,
    version: '1.0.0',
    capabilities: [
      'chapter-detection',
      'milestone-tracking',
      'anniversary-detection',
      'identity-evolution',
      'reflection-generation'
    ],
    totalUsers: userProfiles.size,
    totalEvents: Array.from(events.values()).reduce((sum, e) => sum + e.length, 0),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /ready
 */
app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      chapterDetector: true,
      eventStorage: true,
      reflectionGenerator: true
    },
    timestamp: new Date().toISOString()
  });
});

// ── Helper Functions ──────────────────────────────────────────────────────────

function detectAnniversaries(event: LifeEvent, currentYear: number): Anniversary[] {
  const eventYear = event.year;
  const anniversaries: Anniversary[] = [];

  // Yearly anniversaries
  const yearsSince = currentYear - eventYear;
  if (yearsSince >= 1) {
    let importance: 'low' | 'medium' | 'high' = 'low';
    if (yearsSince === 1) importance = 'medium';
    if ([5, 10, 15, 20, 25, 30, 40, 50].includes(yearsSince)) importance = 'high';

    anniversaries.push({
      eventId: event.id,
      title: event.title,
      date: event.date,
      yearsSince,
      type: yearsSince === 1 ? 'first' : [5, 10, 15, 20, 25, 30, 40, 50].includes(yearsSince) ? 'decade' : 'yearly',
      importance
    });
  }

  return anniversaries;
}

function calculateStats(userEvents: LifeEvent[]): {
  totalEvents: number;
  byCategory: Record<string, number>;
  byChapter: Record<string, number>;
  byYear: Record<string, number>;
  milestones: number;
  averageImpact: number;
} {
  const stats = {
    totalEvents: userEvents.length,
    byCategory: {} as Record<string, number>,
    byChapter: {} as Record<string, number>,
    byYear: {} as Record<string, number>,
    milestones: 0,
    averageImpact: 0
  };

  let totalImpact = 0;

  for (const event of userEvents) {
    stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1;
    stats.byYear[event.year.toString()] = (stats.byYear[event.year.toString()] || 0) + 1;
    if (event.milestone) stats.milestones++;
    totalImpact += event.impact === 'high' ? 3 : event.impact === 'moderate' ? 2 : 1;
  }

  stats.averageImpact = userEvents.length > 0 ? totalImpact / userEvents.length : 0;

  return stats;
}

function generateChapters(userId: string, userEvents: LifeEvent[], birthYear: number): LifeChapterData[] {
  const chapters: LifeChapterData[] = [];
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  // Detect current chapter
  const careerEvents = userEvents.filter(e => e.category === 'career' || e.type === 'career-change');
  const currentChapter = ChapterDetector.detectCurrentChapter(age, userEvents.slice(-20), careerEvents);

  // Build chapters based on detected current chapter
  const chapterStartYears: Record<LifeChapter, number> = {
    childhood: birthYear,
    education: birthYear + 12,
    'early-career': 22,
    career: 30,
    entrepreneurship: 25,
    relationships: 25,
    marriage: 28,
    parenthood: 30,
    midlife: 45,
    retirement: 60,
    legacy: 65
  };

  // Generate past chapters
  const pastChapters: LifeChapter[] = ['childhood', 'education', 'early-career'];
  let lastYear = birthYear;

  for (const chapter of pastChapters) {
    const startYear = chapterStartYears[chapter];
    if (startYear < currentYear - 5) {
      chapters.push(ChapterDetector.buildChapterData(chapter, startYear, userEvents, currentYear));
      lastYear = startYear;
    }
  }

  // Add current chapter
  chapters.push(ChapterDetector.buildChapterData(currentChapter, lastYear, userEvents, currentYear));

  return chapters;
}

function generateReflection(profile: UserProfile, events: LifeEvent[], focus?: string): string {
  if (events.length === 0) {
    return "This period has been quiet. Sometimes the most important growth happens in stillness.";
  }

  const achievements = events.filter(e => e.type === 'achievement');
  const milestones = events.filter(e => e.milestone);
  const highImpact = events.filter(e => e.impact === 'high' || e.impact === 'transformative');

  let reflection = "";

  if (highImpact.length > 0) {
    reflection += `This was a significant period. ${highImpact[0].title} stands out as a defining moment. `;
  }

  if (milestones.length > 0) {
    reflection += `You've reached ${milestones.length} milestone${milestones.length > 1 ? 's' : ''} during this time. `;
  }

  if (achievements.length > 0) {
    reflection += `Your achievements show continued growth and determination. `;
  }

  // Chapter-specific reflection
  switch (profile.currentChapter) {
    case 'entrepreneurship':
      reflection += "Your entrepreneurial journey continues to evolve.";
      break;
    case 'parenthood':
      reflection += "Family remains at the center of your world.";
      break;
    case 'career':
      reflection += "Your professional journey shows steady progress.";
      break;
    default:
      reflection += "Life continues to unfold with its unique patterns.";
  }

  return reflection;
}

function generateGrowthInsights(events: LifeEvent[], focus?: string): Array<{ type: string; insight: string; suggestion: string; date: string }> {
  const insights: Array<{ type: string; insight: string; suggestion: string; date: string }> = [];

  // Pattern detection
  const careerEvents = events.filter(e => e.category === 'career');
  if (careerEvents.length >= 3) {
    insights.push({
      type: 'pattern',
      insight: "You've shown consistent engagement with career growth",
      suggestion: "Consider reflecting on how these experiences have shaped your professional identity",
      date: new Date().toISOString()
    });
  }

  // Achievement tracking
  const achievements = events.filter(e => e.type === 'achievement');
  if (achievements.length > 0) {
    insights.push({
      type: 'achievement',
      insight: `${achievements.length} achievement${achievements.length > 1 ? 's' : ''} recorded`,
      suggestion: "Celebrate these wins - they're building a pattern of success",
      date: achievements[0].date
    });
  }

  // Emotional patterns
  const avgIntensity = events.reduce((a, e) => a + e.emotionIntensity, 0) / events.length;
  if (avgIntensity > 6) {
    insights.push({
      type: 'emotional',
      insight: "Your recent events have been emotionally intense",
      suggestion: "This might be a period of significant growth or change",
      date: new Date().toISOString()
    });
  }

  return insights.slice(0, 3);
}

function extractGoals(events: LifeEvent[]): string[] {
  const goals: string[] = [];

  const achievements = events.filter(e => e.type === 'achievement');
  for (const a of achievements.slice(0, 3)) {
    goals.push(a.title);
  }

  return goals;
}

function calculateEmotionalState(events: LifeEvent[]): { dominantEmotion: string; intensity: number } {
  const emotionCounts: Record<string, number> = {};

  for (const event of events.slice(0, 10)) {
    for (const emotion of event.emotions) {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    }
  }

  const dominant = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  const avgIntensity = events.length > 0
    ? events.reduce((a, e) => a + e.emotionIntensity, 0) / events.length
    : 5;

  return { dominantEmotion: dominant, intensity: avgIntensity };
}

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4883;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║       LIFE TIMELINE INTELLIGENCE v1.0.0                    ║
║                                                                ║
║  📖  Personal Evolution & Life Chapters                      ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Capabilities:                                                 ║
║  • Life chapter detection                                      ║
║  • Milestone & anniversary tracking                          ║
║  • Identity evolution                                         ║
║  • Growth insights                                            ║
║  • Personal reflection generation                             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[life-timeline] Shutting down...');
  server.close(() => {
    console.log('[life-timeline] Shutdown complete');
    process.exit(0);
  });
});

export default app;
